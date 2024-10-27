import { Component } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatFormFieldModule, MatInputModule, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'throuple-of-words';
  circles = Array.from({ length: 12 }, (_, i) => i + 1); // Create an array of 15 circles
  inputValues: { [key: number]: string } = {}; // Store input values
}
