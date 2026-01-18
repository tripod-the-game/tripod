import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { TriangleComponent } from "../triangle/triangle.component";
import { SubmitButtonComponent } from "../submit-button/submit-button.component";
import { ResetButtonComponent } from "../reset-button/reset-button.component";
import { PastSubmissionsComponent } from "../past-submissions/past-submissions.component";
import { PastDateSelectorComponent } from "../past-date-selector/past-date-selector.component";
import { GameService, ValidationState } from "../../services/game.service";

@Component({
  selector: "app-game",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TriangleComponent,
    SubmitButtonComponent,
    ResetButtonComponent,
    PastSubmissionsComponent,
    PastDateSelectorComponent,
  ],
  templateUrl: "./game.component.html",
  styleUrls: ["./game.component.scss"],
})
export class GameComponent implements OnInit {
  // Word position mapping (fixed for all puzzles)
  private readonly WORD_POSITIONS = {
    wordOne: [8, 6 , 4, 2, 1],      // left edge
    wordTwo: [1, 3, 5, 7, 12],     // right edge
    wordThree: [8, 9, 10, 11, 12] // bottom row
  };

  submitted = false;
  // now store submissions with a date so we can filter per-game
  submissions: Array<{
    date?: string;
    values: Record<number, string>;
    validation: Record<number, ValidationState>;
  }> = [];
  resetCounter = 0;
  showPast = false;
  congratsOpen = false;
  allWrong = false;
  submitShake = false;

  // letters & category loaded for current game (today by default)
  currentLetters?: string[];
  currentCategory?: string;
  currentWords?: { wordOne: string; wordTwo: string; wordThree: string };
  // track current game id (MMDDYY) so we can associate submissions
  currentGameDate?: string;

  // added property to store triangle input values
  triangleInputValues: Record<number, string> = {};

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    // On initial load, fetch today's game and set all relevant state
    const today = new Date();
    this.currentGameDate = this.formatDateKey(today);
    this.gameService.getGameForDate(today).subscribe((game) => {
      this.currentLetters = game.letters;
      this.currentCategory = game.category;
      this.currentWords = {
        wordOne: game.wordOne || '',
        wordTwo: game.wordTwo || '',
        wordThree: game.wordThree || ''
      };
    });
  }

  onSubmit(): void {
    if (this.isAllEmpty || this.submitted) {
      this.submitShake = true;
      setTimeout(() => {
        this.submitShake = false;
      }, 400);
      return;
    }
    console.log("submissions: ", this.submissions);
    this.submitted = true;
  }

  onValuesChanged(values: Record<number, string>): void {
    this.triangleInputValues = { ...values };
  }

  onValuesSubmitted(values: Record<number, string>): void {
    this.triangleInputValues = { ...values };

    const validation: Record<number, ValidationState> = {};

    if (this.currentLetters) {
      // First pass: check for exact position matches (green)
      Object.entries(values).forEach(([key, value]) => {
        const pos = Number(key);
        const isExactMatch =
          value?.trim().toUpperCase() ===
          this.currentLetters?.[pos - 1]?.toUpperCase();
        validation[pos] = isExactMatch ? 'correct' : 'none';
      });

      // Second pass: check for word-in-wrong-position (yellow)
      if (this.currentWords) {
        this.checkWordWrongPosition(values, validation, 'wordOne');
        this.checkWordWrongPosition(values, validation, 'wordTwo');
        this.checkWordWrongPosition(values, validation, 'wordThree');
      }
    }

    this.submissions.push({
      date: this.currentGameDate,
      values: { ...values },
      validation,
    });

    // Check for all correct
    const isAllCorrect =
      this.currentLetters &&
      Object.values(values).length === 12 &&
      Object.values(validation).every((v) => v === 'correct');

    if (isAllCorrect) {
      this.congratsOpen = true;
    }

    // Check for all wrong (no correct and no wrong-position, including partial submissions)
    const isAllWrong =
      Object.keys(validation).length > 0 &&
      Object.values(validation).every((v) => v === 'none');

    if (isAllWrong) {
      this.allWrong = true;
      setTimeout(() => {
        this.allWrong = false;
      }, 600);
    }
  }

  /**
   * Check if the letters at a word's positions form a different valid word.
   * If so, mark those positions as 'wrong-position' (yellow) unless already 'correct'.
   */
  private checkWordWrongPosition(
    values: Record<number, string>,
    validation: Record<number, ValidationState>,
    wordKey: 'wordOne' | 'wordTwo' | 'wordThree'
  ): void {

    const positions = this.WORD_POSITIONS[wordKey];
    const enteredWord = positions
      .map((pos) => (values[pos] ?? '').trim().toUpperCase())
      .join('');

    // Skip if not all positions are filled
    if (enteredWord.length !== positions.length) {
      return;
    }

    // Get all valid words for this puzzle
    const validWords = [
      this.currentWords!.wordOne,
      this.currentWords!.wordTwo,
      this.currentWords!.wordThree
    ].filter((w) => w);

    // Check if entered word matches ANY valid puzzle word
    // but is NOT the correct word for these positions
    const correctWordForPosition = this.currentWords![wordKey];

    if (
      validWords.includes(enteredWord) &&
      enteredWord !== correctWordForPosition
    ) {
      // Mark positions as yellow (wrong-position) if not already green
      positions.forEach((pos) => {
        if (validation[pos] !== 'correct') {
          validation[pos] = 'wrong-position';
        }
      });
    }
  }

  onReset(): void {
    this.submitted = false;
    this.resetCounter++;
    this.triangleInputValues = {};
  }

  // called by the PastDateSelectorComponent (immediate load)
  onDateChosen(date: Date): void {
    this.gameService.getGameForDate(date).subscribe((game) => {
      if (Array.isArray(game.letters) && game.letters.length === 12) {
        this.currentLetters = game.letters;
        this.currentCategory = game.category;
        this.currentWords = {
          wordOne: game.wordOne || '',
          wordTwo: game.wordTwo || '',
          wordThree: game.wordThree || ''
        };
        // set currentGameDate to the chosen MMDDYY identifier
        this.currentGameDate = this.formatDateKey(date);
        // reset UI so Triangle picks up new letters/category
        this.submitted = false;
        this.resetCounter++;
      } else {
        // no letters -> clear override (falls back to today)
        this.currentLetters = undefined;
        this.currentCategory = undefined;
        this.currentWords = undefined;
        this.currentGameDate = this.formatDateKey(new Date());
      }
    });
  }

  // helper: return only submissions for the currently loaded game
  get filteredSubmissions() {
    return this.submissions
      .filter((s) => s.date === this.currentGameDate)
      .map((s) => ({ values: s.values, validation: s.validation }));
  }

  get aggregatedValidation(): Record<number, ValidationState> {
    const relevant = this.submissions.filter(
      (s) => s.date === this.currentGameDate
    );
    const latestSubmission = relevant.length > 0 ? relevant[relevant.length - 1] : null;
    const result: Record<number, ValidationState> = {};

    for (let i = 1; i <= 12; i++) {
      // 'correct' persists across all submissions (once correct, always correct)
      const hasCorrect = relevant.some((sub) => sub.validation[i] === 'correct');
      // 'wrong-position' only applies to the latest submission (not aggregated)
      const hasWrongPosition = latestSubmission?.validation[i] === 'wrong-position';

      if (hasCorrect) {
        result[i] = 'correct';
      } else if (hasWrongPosition) {
        result[i] = 'wrong-position';
      } else {
        result[i] = 'none';
      }
    }
    return result;
  }

  get aggregatedCorrectLetters(): Record<number, boolean> {
    const validation = this.aggregatedValidation;
    const result: Record<number, boolean> = {};
    for (let i = 1; i <= 12; i++) {
      result[i] = validation[i] === 'correct';
    }
    return result;
  }

  get isAllEmpty(): boolean {
    const values = Object.values(this.triangleInputValues);
    return values.length === 0 || values.every((v) => !v || v.trim() === '');
  }

  private formatDateKey(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}${dd}${yy}`;
  }
}
