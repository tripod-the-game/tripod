import { Component, EventEmitter, Input, Output, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TriangleComponent } from "../triangle/triangle.component";
import { ValidationState } from "../../services/game.service";

@Component({
  selector: "app-past-submissions",
  standalone: true,
  imports: [CommonModule, TriangleComponent],
  templateUrl: "./past-submissions.component.html",
  styleUrls: ["./past-submissions.component.scss"],
})
export class PastSubmissionsComponent {
  // now receives only submissions relevant to the current game (from parent)
  @Input() submissions: Array<{
    date?: string;
    values: Record<number, string>;
    validation: Record<number, ValidationState>;
  }> = [];
  // optional: pass the game's letters so triangle shows the correct placeholders/letters
  @Input() letters?: string[];

  @Output() close = new EventEmitter<void>();

  currentIndex = 0;

  // keyboard navigation: left/right for prev/next, Esc to close
  @HostListener("window:keydown", ["$event"])
  handleKeydown(event: KeyboardEvent) {
    if (!this.submissions || this.submissions.length === 0) return;
    if (event.key === "ArrowRight") this.next();
    if (event.key === "ArrowLeft") this.prev();
    if (event.key === "Escape") this.onClose();
  }

  next() {
    if (this.submissions?.length) {
      this.currentIndex = (this.currentIndex + 1) % this.submissions.length;
    }
  }

  prev() {
    if (this.submissions?.length) {
      this.currentIndex =
        (this.currentIndex - 1 + this.submissions.length) %
        this.submissions.length;
    }
  }

  onClose() {
    this.close.emit();
  }

  // helper for template
  get currentSubmission(): Record<number, string> | undefined {
    // If submissions are objects with .values, return that
    const sub = this.submissions?.[this.currentIndex];
    return sub?.values ?? sub;
  }

  // helper for template - get current submission's validation
  get currentValidation(): Record<number, ValidationState> | undefined {
    const sub = this.submissions?.[this.currentIndex];
    return sub?.validation;
  }
}
