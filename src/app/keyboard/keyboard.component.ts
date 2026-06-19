import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keyboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyboard.component.html',
  styleUrl: './keyboard.component.scss'
})
export class KeyboardComponent {
  @Input() eliminatedLetters: Set<string> = new Set();
  @Output() keyPressed = new EventEmitter<string>();

  readonly rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ];

  isDisabled(letter: string): boolean {
    return this.eliminatedLetters.has(letter);
  }

  onKey(letter: string): void {
    if (!this.isDisabled(letter)) {
      this.keyPressed.emit(letter);
    }
  }

  onBackspace(): void {
    this.keyPressed.emit('BACKSPACE');
  }
}
