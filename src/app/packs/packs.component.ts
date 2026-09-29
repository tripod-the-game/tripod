import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameService, PackInfo } from '../../services/game.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-packs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './packs.component.html',
  styleUrl: './packs.component.scss'
})
export class PacksComponent implements OnInit {
  packs: PackInfo[] = [];
  loaded = false;

  constructor(private gameService: GameService, private loaderService: LoaderService) {}

  ngOnInit(): void {
    this.gameService.getPacks().subscribe(packs => {
      this.packs = packs;
      this.loaded = true;
      this.loaderService.markReady();
    });
  }
}
