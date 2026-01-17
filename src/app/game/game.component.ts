import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TriangleComponent } from "../triangle/triangle.component";
import { SubmitButtonComponent } from "../submit-button/submit-button.component";
import { ResetButtonComponent } from "../reset-button/reset-button.component";
import { PastSubmissionsComponent } from "../past-submissions/past-submissions.component";
import { PastDateSelectorComponent } from "../past-date-selector/past-date-selector.component";
import { GameService } from "../../services/game.service";

@Component({
  selector: "app-game",
  standalone: true,
  imports: [
    CommonModule,
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
  submitted = false;
  // now store submissions with a date so we can filter per-game
  // { date: 'MMDDYY', values: Record<number,string> }
  submissions: Array<{
    date?: string;
    values: Record<number, string>;
    correct: Record<number, boolean>;
  }> = [];
  resetCounter = 0;
  showPast = false;
  congratsOpen = false;

  // letters & category loaded for current game (today by default)
  currentLetters?: string[];
  currentCategory?: string;
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
    });
  }

  onSubmit(): void {
    console.log("submissions: ", this.submissions);
    this.submitted = true;
  }

  onValuesSubmitted(values: Record<number, string>): void {
    this.triangleInputValues = { ...values };

    // Compute which letters are correct
    const correct: Record<number, boolean> = {};
    if (this.currentLetters) {
      Object.entries(values).forEach(([key, value]) => {
        correct[Number(key)] =
          value?.trim().toUpperCase() ===
          this.currentLetters?.[Number(key) - 1]?.toUpperCase();
      });
    }

    this.submissions.push({
      date: this.currentGameDate,
      values: { ...values },
      correct,
    });

    // Check for all correct here
    const isAllCorrect =
      this.currentLetters &&
      Object.values(values).length === 12 &&
      Object.entries(values).every(
        ([key, value], idx) =>
          value?.trim().toUpperCase() ===
          this.currentLetters?.[idx]?.toUpperCase()
      );

    if (isAllCorrect) {
      this.congratsOpen = true;
    }
  }

  onReset(): void {
    this.submitted = false;
    this.resetCounter++;
  }

  // called by the PastDateSelectorComponent (immediate load)
  onDateChosen(date: Date): void {
    this.gameService.getGameForDate(date).subscribe((game) => {
      if (Array.isArray(game.letters) && game.letters.length === 12) {
        this.currentLetters = game.letters;
        this.currentCategory = game.category;
        // set currentGameDate to the chosen MMDDYY identifier
        this.currentGameDate = this.formatDateKey(date);
        // reset UI so Triangle picks up new letters/category
        this.submitted = false;
        this.resetCounter++;
      } else {
        // no letters -> clear override (falls back to today)
        this.currentLetters = undefined;
        this.currentCategory = undefined;
        this.currentGameDate = this.formatDateKey(new Date());
      }
    });
  }

  // helper: return only submissions for the currently loaded game
  get filteredSubmissions() {
    return this.submissions
      .filter((s) => s.date === this.currentGameDate)
      .map((s) => ({ values: s.values, correct: s.correct }));
  }

  get aggregatedCorrectLetters(): Record<number, boolean> {
    // Only consider submissions for the current game
    const relevant = this.submissions.filter(
      (s) => s.date === this.currentGameDate
    );
    const result: Record<number, boolean> = {};
    for (let i = 1; i <= 12; i++) {
      // If any submission has this letter correct, mark as true
      result[i] = relevant.some((sub) => sub.correct[i]);
    }
    return result;
  }

  private formatDateKey(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}${dd}${yy}`;
  }
}
