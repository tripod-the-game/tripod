import { Component, EventEmitter, Output, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TriangleComponent } from "../triangle/triangle.component";
import { ValidationState } from "../../services/game.service";

// Tutorial puzzle: GUAVA / APPLE / GRAPE (Fruit)
// 5-letter layout positions: wordOne=[8,6,4,2,1], wordTwo=[1,3,5,7,12], wordThree=[8,9,10,11,12]
const TUTORIAL_LETTERS = ['A', 'V', 'P', 'A', 'P', 'U', 'L', 'G', 'R', 'A', 'P', 'E'];

const TUTORIAL_WORDS = { wordOne: 'GUAVA', wordTwo: 'APPLE', wordThree: 'GRAPE' };
const TUTORIAL_POSITIONS = {
  wordOne: [8, 6, 4, 2, 1],
  wordTwo: [1, 3, 5, 7, 12],
  wordThree: [8, 9, 10, 11, 12],
};

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
  tutorialAllWrong = false;
  tutorialSubmitted = false;
  tutorialChecked = false;
  tutorialReset = 0;

  onTutorialValuesChanged(values: Record<number, string>): void {
    this.tutorialValues = { ...values };
  }

  onTutorialValuesSubmitted(values: Record<number, string>): void {
    this.tutorialValues = { ...values };
    const validation: Record<number, ValidationState> = {};

    // First pass: exact position matches (green)
    for (let i = 1; i <= 12; i++) {
      const entered = (values[i] ?? '').toUpperCase();
      validation[i] = entered === TUTORIAL_LETTERS[i - 1] ? 'correct' : 'none';
    }

    // Second pass: word in wrong slot (yellow)
    for (const wordKey of ['wordOne', 'wordTwo', 'wordThree'] as const) {
      const positions = TUTORIAL_POSITIONS[wordKey];
      const enteredWord = positions.map(p => (values[p] ?? '').trim().toUpperCase()).join('');
      if (enteredWord.length === positions.length) {
        const validWords = [TUTORIAL_WORDS.wordOne, TUTORIAL_WORDS.wordTwo, TUTORIAL_WORDS.wordThree];
        if (validWords.includes(enteredWord) && enteredWord !== TUTORIAL_WORDS[wordKey]) {
          positions.forEach(p => { if (validation[p] !== 'correct') validation[p] = 'wrong-position'; });
        }
      }
    }

    // Accumulate locked-in correct positions across submissions
    const newCorrect = { ...this.tutorialCorrect };
    for (let i = 1; i <= 12; i++) {
      if (validation[i] === 'correct') newCorrect[i] = true;
    }
    this.tutorialCorrect = newCorrect;
    this.tutorialValidation = validation;
    this.tutorialChecked = true;

    // Red flash when nothing is right
    const isAllWrong = Object.keys(validation).length > 0 &&
      Object.values(validation).every(v => v === 'none');
    if (isAllWrong) {
      this.tutorialAllWrong = true;
      setTimeout(() => { this.tutorialAllWrong = false; }, 600);
    }

    // Reset flag so the next Check click fires ngOnChanges again
    setTimeout(() => { this.tutorialSubmitted = false; }, 0);
  }

  get tutorialSolved(): boolean {
    return Object.values(this.tutorialCorrect).length === 12 &&
      Object.values(this.tutorialCorrect).every(v => v);
  }

  onTutorialReset(): void {
    this.tutorialValues = {};
    this.tutorialValidation = {};
    this.tutorialCorrect = {};
    this.tutorialAllWrong = false;
    this.tutorialChecked = false;
    this.tutorialSubmitted = false;
    this.tutorialReset++;
  }

  onCheckTutorial(): void {
    this.tutorialSubmitted = true;
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
