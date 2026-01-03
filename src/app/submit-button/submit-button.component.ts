import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-submit-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './submit-button.component.html',
  styleUrl: './submit-button.component.scss'
})
export class SubmitButtonComponent {
  @Output() submit = new EventEmitter<void>();

  onClick(): void {
    this.submit.emit();
  }
}
