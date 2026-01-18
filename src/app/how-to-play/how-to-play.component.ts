import { Component, EventEmitter, Output, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TriangleComponent } from "../triangle/triangle.component";

@Component({
  selector: "app-how-to-play",
  standalone: true,
  imports: [CommonModule, TriangleComponent],
  templateUrl: "./how-to-play.component.html",
  styleUrls: ["./how-to-play.component.scss"],
})
export class HowToPlayComponent {
  @Output() close = new EventEmitter<void>();

  // Example puzzle for demonstration
  // Letters array maps to circles 1-12 (index 0 = circle 1, etc.)
  // For circles to show green, displayValues[circle] must equal letters[circle-1]
  exampleLetters = ['A', 'V', 'P', 'A', 'P', 'U', 'L', 'G', 'R', 'A', 'P', 'E'];
  exampleValues: Record<number, string> = {
    1: 'A', 2: 'V', 3: 'P', 4: 'A', 5: 'P',
    6: 'U', 7: 'L', 8: 'G', 9: 'R', 10: 'A',
    11: 'P', 12: 'E'
  };
  exampleValidation: Record<number, 'none' | 'correct' | 'wrong-position'> = {
    1: 'correct', 2: 'correct', 3: 'correct', 4: 'correct', 5: 'correct',
    6: 'correct', 7: 'correct', 8: 'correct', 9: 'correct', 10: 'correct',
    11: 'correct', 12: 'correct'
  };

  @HostListener("window:keydown", ["$event"])
  handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") this.onClose();
  }

  onClose() {
    this.close.emit();
  }
}
