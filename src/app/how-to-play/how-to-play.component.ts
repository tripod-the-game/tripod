import { Component, EventEmitter, Output, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TriangleComponent } from "../triangle/triangle.component";
import { ValidationState } from "../../services/game.service";

// Tutorial puzzle: GUAVA / APPLE / GRAPE (Fruit)
// 5-letter layout positions: wordOne=[8,6,4,2,1], wordTwo=[1,3,5,7,12], wordThree=[8,9,10,11,12]
const TUTORIAL_LETTERS = ['A', 'V', 'P', 'A', 'P', 'U', 'L', 'G', 'R', 'A', 'P', 'E'];

@Component({
  selector: "app-how-to-play",
  standalone: true,
  imports: [CommonModule, FormsModule, TriangleComponent],
  templateUrl: "./how-to-play.component.html",
  styleUrls: ["./how-to-play.component.scss"],
})
export class HowToPlayComponent {
  @Output() close = new EventEmitter<void>();

  step = 1;
  totalSteps = 2;

  // Step 1: static example (all-green solved display)
  exampleLetters = TUTORIAL_LETTERS;
  exampleValues: Record<number, string> = {
    1: 'A', 2: 'V', 3: 'P', 4: 'A', 5: 'P',
    6: 'U', 7: 'L', 8: 'G', 9: 'R', 10: 'A',
    11: 'P', 12: 'E'
  };
  exampleValidation: Record<number, ValidationState> = {
    1: 'correct', 2: 'correct', 3: 'correct', 4: 'correct', 5: 'correct',
    6: 'correct', 7: 'correct', 8: 'correct', 9: 'correct', 10: 'correct',
    11: 'correct', 12: 'correct'
  };

  // Step 2: interactive try-it triangle
  tutorialLetters = TUTORIAL_LETTERS;
  tutorialValues: Record<number, string> = {};
  tutorialValidation: Record<number, ValidationState> = {};
  tutorialCorrect: Record<number, boolean> = {};
  tutorialSubmitted = false;
  tutorialChecked = false;
  tutorialReset = 0;

  onTutorialValuesChanged(values: Record<number, string>): void {
    this.tutorialValues = { ...values };
  }

  onTutorialValuesSubmitted(values: Record<number, string>): void {
    this.tutorialValues = { ...values };
    const validation: Record<number, ValidationState> = {};
    for (let i = 1; i <= 12; i++) {
      const entered = (values[i] ?? '').toUpperCase();
      const correct = TUTORIAL_LETTERS[i - 1].toUpperCase();
      validation[i] = entered === correct ? 'correct' : 'none';
    }
    this.tutorialValidation = validation;
    this.tutorialCorrect = {};
    for (let i = 1; i <= 12; i++) {
      this.tutorialCorrect[i] = validation[i] === 'correct';
    }
    this.tutorialChecked = true;
  }

  get tutorialSolved(): boolean {
    return Object.values(this.tutorialCorrect).length === 12 &&
      Object.values(this.tutorialCorrect).every(v => v);
  }

  onTutorialReset(): void {
    this.tutorialValues = {};
    this.tutorialValidation = {};
    this.tutorialCorrect = {};
    this.tutorialChecked = false;
    this.tutorialSubmitted = false;
    this.tutorialReset++;
  }

  onCheckTutorial(): void {
    this.tutorialSubmitted = true;
    // valuesSubmitted will fire from triangle change, triggering onTutorialValuesSubmitted
  }

  nextStep(): void {
    if (this.step < this.totalSteps) {
      this.step++;
      // Reset tutorial state when entering step 2
      if (this.step === 2) this.onTutorialReset();
    }
  }

  prevStep(): void {
    if (this.step > 1) this.step--;
  }

  @HostListener("window:keydown", ["$event"])
  handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") this.onClose();
  }

  onClose() {
    this.close.emit();
  }
}
