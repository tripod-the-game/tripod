import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges, OnInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClientModule } from '@angular/common/http';
import { GameService } from '../../services/game.service';
 
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

  @Input() displayOnly = false;
  @Input() displayValues?: Record<number, string>;
  @Input() letters?: string[];
  @Input() category?: string;
  @Input() resetCounter = 0;
  @Input() aggregatedCorrect?: Record<number, boolean>;

  circles = Array.from({ length: 12 }, (_, i) => i + 1);
  letterValues = ["A","V","P","A","P","U","L","G","R","A","P","E"];
  inputValues: Record<number, string> = {};

  @ViewChildren('triangleInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  // Logical layout: each row is an array of circle numbers (1-based)
  triangleRows = [
    [1],
    [2, 3],
    [4, 5],
    [6, 7],
    [8, 9, 10, 11, 12]
  ];

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

    // clear inputs when parent triggers a reset
    if (changes['resetCounter'] && !this.displayOnly) {
      this.inputValues = {};
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

  private valueFor(circle: number): string {
    // Always prefer displayValues in displayOnly mode
    if (this.displayOnly && this.displayValues) {
      return (this.displayValues[circle] ?? '').toString();
    }
    return (this.inputValues[circle] ?? '').toString();
  }

  // Move focus based on arrow key
  onInputKeydown(event: KeyboardEvent, circle: number) {
    const pos = this.findPosition(circle);
    if (!pos) return;
    let targetCircle: number | undefined;

    switch (event.key) {
      case 'ArrowUp':
        if (pos.row > 0 && this.triangleRows[pos.row - 1][pos.col - (pos.row > 1 ? 1 : 0)] !== undefined) {
          targetCircle = this.triangleRows[pos.row - 1][pos.col - (pos.row > 1 ? 1 : 0)];
        }
        break;
      case 'ArrowDown':
        if (pos.row < this.triangleRows.length - 1 && this.triangleRows[pos.row + 1][pos.col + (pos.row > 0 ? 1 : 0)] !== undefined) {
          targetCircle = this.triangleRows[pos.row + 1][pos.col + (pos.row > 0 ? 1 : 0)];
        }
        break;
      case 'ArrowLeft':
        if (pos.col > 0) {
          targetCircle = this.triangleRows[pos.row][pos.col - 1];
        }
        break;
      case 'ArrowRight':
        if (pos.col < this.triangleRows[pos.row].length - 1) {
          targetCircle = this.triangleRows[pos.row][pos.col + 1];
        }
        break;
    }

    if (targetCircle !== undefined) {
      // Focus the target input
      const idx = this.circles.indexOf(targetCircle);
      const input = this.inputs.get(idx);
      if (input) {
        input.nativeElement.focus();
        event.preventDefault();
      }
    }
  }

  // Helper to find row/col for a given circle number
  private findPosition(circle: number): { row: number; col: number } | null {
    for (let row = 0; row < this.triangleRows.length; row++) {
      const col = this.triangleRows[row].indexOf(circle);
      if (col !== -1) return { row, col };
    }
    return null;
  }
}


