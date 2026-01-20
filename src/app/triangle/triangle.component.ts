import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges, OnInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClientModule } from '@angular/common/http';
import { GameService, ValidationState } from '../../services/game.service';
 
@Component({
  selector: 'app-triangle',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, FormsModule, CommonModule, HttpClientModule],
  templateUrl: './triangle.component.html',
  styleUrl: './triangle.component.scss'
})
export class TriangleComponent implements OnInit {
  @Input() submitted = false;
  @Output() valuesSubmitted = new EventEmitter<Record<number, string>>();
  @Output() valuesChanged = new EventEmitter<Record<number, string>>();

  @Input() displayOnly = false;
  @Input() displayValues?: Record<number, string>;
  @Input() letters?: string[];
  @Input() category?: string;
  @Input() resetCounter = 0;
  @Input() aggregatedCorrect?: Record<number, boolean>;
  @Input() aggregatedValidation?: Record<number, ValidationState>;
  @Input() allWrong = false;

  circles = Array.from({ length: 12 }, (_, i) => i + 1);
  letterValues = ["A","V","P","A","P","U","L","G","R","A","P","E"];
  inputValues: Record<number, string> = {};

  @ViewChildren('triangleInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  // Neighbor map for arrow key navigation
  // Follows word paths: left leg (1-2-4-6-8), right leg (1-3-5-7-12), bottom (8-9-10-11-12)
  private neighbors: Record<number, { up?: number; down?: number; left?: number; right?: number }> = {
    1:  { down: 2, left: 2, right: 3 },       // apex: down defaults to left leg
    2:  { up: 1, down: 4, right: 3 },         // left leg
    3:  { up: 1, down: 5, left: 2 },          // right leg
    4:  { up: 2, down: 6, right: 5 },         // left leg
    5:  { up: 3, down: 7, left: 4 },          // right leg
    6:  { up: 4, down: 8, right: 7 },         // left leg
    7:  { up: 5, down: 12, left: 6 },         // right leg
    8:  { up: 6, right: 9 },                  // bottom-left corner
    9:  { left: 8, right: 10 },               // bottom
    10: { left: 9, right: 11 },               // bottom
    11: { left: 10, right: 12 },              // bottom
    12: { up: 7, left: 11 }                   // bottom-right corner
  };

  // Linear order for auto-advance (top-to-bottom, left-to-right reading order)
  private readonly circleOrder = [8, 6, 4, 2, 1, 3, 5, 7, 12, 8, 9, 10, 11, 12];

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    // In displayOnly mode, always sync inputValues and answer key from props
    if (this.displayOnly) {
      this.syncDisplayValues();
      this.syncLetterValues();
      return;
    }

    // Normal mode: load today's game if no override
    if (Array.isArray(this.letters) && this.letters.length === 12) {
      this.letterValues = this.letters.map(l => (l ?? '').toString().toUpperCase());
      return;
    }

    this.gameService.getTodayGame().subscribe(game => {
      if (Array.isArray(game.letters) && game.letters.length === 12) {
        this.letterValues = game.letters;
        if (!this.category) this.category = game.category;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Always sync inputValues and answer key in displayOnly mode
    if (this.displayOnly) {
      if (changes['displayValues'] || changes['displayOnly']) {
        this.syncDisplayValues();
      }
      if (changes['letters'] || changes['displayOnly']) {
        this.syncLetterValues();
      }
    }

    // If parent provides category via input, prefer it (no-op otherwise)
    if (changes['category'] && typeof this.category === 'string') {
      // keep this.category as provided
    }

    // clear inputs when parent triggers a reset, but preserve correct letters
    if (changes['resetCounter'] && !this.displayOnly) {
      this.inputValues = {};
      // Re-sync any letters that are marked as correct (including hints)
      if (this.aggregatedCorrect && Array.isArray(this.letterValues)) {
        for (let i = 0; i < this.letterValues.length; i++) {
          const circle = i + 1;
          if (this.aggregatedCorrect[circle]) {
            this.inputValues[circle] = this.letterValues[i];
          }
        }
      }
    }

    // emit a snapshot only when submitted changes to true (live submissions)
    if (changes['submitted'] && this.submitted && !this.displayOnly) {
      this.valuesSubmitted.emit({ ...this.inputValues });
    }

    // If letters change in normal mode, update answer key
    if (!this.displayOnly && changes['letters'] && Array.isArray(this.letters) && this.letters.length === 12) {
      this.letterValues = this.letters.map(l => (l ?? '').toString().toUpperCase());
    }

    // Sync inputValues with aggregatedCorrect so correct letters persist
    if (
      changes['aggregatedCorrect'] &&
      this.aggregatedCorrect &&
      Array.isArray(this.letterValues)
    ) {
      for (let i = 0; i < this.letterValues.length; i++) {
        const circle = i + 1;
        if (this.aggregatedCorrect[circle]) {
          this.inputValues[circle] = this.letterValues[i];
        }
      }
    }
  }

  private syncDisplayValues() {
    this.inputValues = {};
    if (this.displayValues) {
      for (const k of Object.keys(this.displayValues)) {
        const key = Number(k);
        this.inputValues[key] = (this.displayValues[key] ?? '').toString().toUpperCase();
      }
    }
  }

  private syncLetterValues() {
    if (Array.isArray(this.letters) && this.letters.length === 12) {
      this.letterValues = this.letters.map(l => (l ?? '').toString().toUpperCase());
    }
  }

  // called from template to normalize user input to a single uppercase char
  onModelChange(value: string, circle: number) {
    const v = (value ?? '').toString().toUpperCase().slice(0, 1);
    this.inputValues[circle] = v;
    this.valuesChanged.emit({ ...this.inputValues });

    // Auto-advance to next circle if a letter was entered
    if (v.length === 1) {
      this.focusNextCircle(circle);
    }
  }

  // Check if a circle is available for input (not correct and not already filled)
  private isCircleAvailable(circle: number): boolean {
    // Skip if already marked correct
    if (this.aggregatedCorrect?.[circle]) {
      return false;
    }
    // Skip if already has a value typed
    const value = this.inputValues[circle] ?? '';
    if (value.trim() !== '') {
      return false;
    }
    return true;
  }

  // Focus the next available circle in reading order
  private focusNextCircle(currentCircle: number): void {
    const currentIndex = this.circleOrder.indexOf(currentCircle);
    if (currentIndex === -1) return;

    // Look for next circle that is available
    for (let i = currentIndex + 1; i < this.circleOrder.length; i++) {
      const nextCircle = this.circleOrder[i];
      if (this.isCircleAvailable(nextCircle)) {
        const idx = this.circles.indexOf(nextCircle);
        const input = this.inputs.get(idx);
        if (input) {
          input.nativeElement.focus();
        }
        return;
      }
    }
  }

  // Focus the previous available circle in reading order
  private focusPrevCircle(currentCircle: number): void {
    const currentIndex = this.circleOrder.indexOf(currentCircle);
    if (currentIndex === -1) return;

    // Look for previous circle that isn't already correct (allow filled circles for backspace)
    for (let i = currentIndex - 1; i >= 0; i--) {
      const prevCircle = this.circleOrder[i];
      if (!this.aggregatedCorrect?.[prevCircle]) {
        const idx = this.circles.indexOf(prevCircle);
        const input = this.inputs.get(idx);
        if (input) {
          input.nativeElement.focus();
        }
        return;
      }
    }
  }

  isCorrect(circle: number, index: number): boolean {
    // In displayOnly mode, always show correctness
    if (this.displayOnly || this.submitted) {
      return (
        this.valueFor(circle)?.trim().toUpperCase() ===
        this.letterValues[index]?.toUpperCase()
      );
    }
    return false;
  }

  isWrongPosition(circle: number): boolean {
    // Only show wrong-position when submitted or in displayOnly mode
    if (this.displayOnly || this.submitted) {
      if (this.aggregatedValidation) {
        return this.aggregatedValidation[circle] === 'wrong-position';
      }
    }
    return false;
  }

  private valueFor(circle: number): string {
    // Always prefer displayValues in displayOnly mode
    if (this.displayOnly && this.displayValues) {
      return (this.displayValues[circle] ?? '').toString();
    }
    return (this.inputValues[circle] ?? '').toString();
  }

  // Move focus based on arrow key using neighbor map
  onInputKeydown(event: KeyboardEvent, circle: number) {
    // Handle backspace on empty circle - move to previous
    if (event.key === 'Backspace') {
      const currentValue = this.inputValues[circle] ?? '';
      if (currentValue === '') {
        this.focusPrevCircle(circle);
        event.preventDefault();
      }
      return;
    }

    const circleNeighbors = this.neighbors[circle];
    if (!circleNeighbors) return;

    let targetCircle: number | undefined;

    switch (event.key) {
      case 'ArrowUp':
        targetCircle = circleNeighbors.up;
        break;
      case 'ArrowDown':
        targetCircle = circleNeighbors.down;
        break;
      case 'ArrowLeft':
        targetCircle = circleNeighbors.left;
        break;
      case 'ArrowRight':
        targetCircle = circleNeighbors.right;
        break;
    }

    if (targetCircle !== undefined) {
      const idx = this.circles.indexOf(targetCircle);
      const input = this.inputs.get(idx);
      if (input) {
        input.nativeElement.focus();
        event.preventDefault();
      }
    }
  }
}


