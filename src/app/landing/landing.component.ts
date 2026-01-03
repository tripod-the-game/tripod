import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TriangleComponent } from '../triangle/triangle.component';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, TriangleComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
  // preview data for the triangle (display-only)
  previewDisplayValues: Record<number, string> = {};
  previewCategory?: string;

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    // load the 12/26/25 game (MMDDYY = 122625)
    const previewDate = new Date(2025, 11, 26); // month is 0-indexed
    this.gameService.getGameForDate(previewDate).subscribe(game => {
      if (Array.isArray(game.letters) && game.letters.length === 12) {
        // map letters into circle keys 1..12 for displayValues
        const map: Record<number, string> = {};
        for (let i = 0; i < 12; i++) {
          map[i + 1] = (game.letters[i] ?? '').toString().toUpperCase();
        }
        this.previewDisplayValues = map;
        this.previewCategory = game.category;
      } else {
        // fallback hard-coded example if file not present
        this.previewDisplayValues = {
          1: 'A',2:'V',3:'P',4:'A',5:'P',6:'U',7:'L',8:'G',9:'R',10:'A',11:'P',12:'E'
        };
        this.previewCategory = 'Example';
      }
    });
  }
}
