import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reset-button.component.html',
  styleUrl: './reset-button.component.scss'
})
export class ResetButtonComponent {
  @Output() reset = new EventEmitter<void>();

  onClick(): void {
    this.reset.emit();
  }
}
