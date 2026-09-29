import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService, PackInfo } from '../../services/game.service';
import { LoaderService } from '../../services/loader.service';
import { StateService } from '../../services/state.service';

export type PackPuzzleStatus = 'solved' | 'revealed' | 'started' | 'new';

interface PackPuzzleTile {
  n: number;
  status: PackPuzzleStatus;
}

@Component({
  selector: 'app-pack',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pack.component.html',
  styleUrl: './pack.component.scss'
})
export class PackComponent implements OnInit, OnDestroy {
  packId = '';
  pack?: PackInfo;
  loaded = false;
  tiles: PackPuzzleTile[] = [];
  streamerMode = false;
  showResetConfirm = false;
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private stateService: StateService,
    private loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.streamerMode = this.route.snapshot.queryParamMap.get('streamer') === '1';
    this.sub = this.route.paramMap.subscribe(params => {
      this.packId = params.get('packId') ?? '';
      this.loaded = false;
      this.gameService.getPack(this.packId).subscribe(pack => {
        this.pack = pack;
        this.loaded = true;
        this.refreshTiles();
        this.loaderService.markReady();
      });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get solvedCount(): number {
    return this.tiles.filter(t => t.status === 'solved').length;
  }

  get queryParams(): Record<string, string> {
    return this.streamerMode ? { streamer: '1' } : {};
  }

  // First puzzle that hasn't been finished yet, so "Play" resumes the pack
  get nextUp(): number {
    const tile = this.tiles.find(t => t.status === 'new' || t.status === 'started');
    return tile?.n ?? 1;
  }

  toggleStreamerMode(): void {
    this.streamerMode = !this.streamerMode;
    this.router.navigate([], { relativeTo: this.route, queryParams: { streamer: this.streamerMode ? '1' : null }, replaceUrl: true });
  }

  confirmReset(): void {
    if (!this.pack) return;
    const keys = this.tiles.map(t => GameService.packGameKey(this.packId, t.n));
    this.stateService.clearGames(keys);
    this.showResetConfirm = false;
    this.refreshTiles();
  }

  private refreshTiles(): void {
    if (!this.pack) {
      this.tiles = [];
      return;
    }
    const results = this.stateService.loadPackResults();
    const submittedKeys = new Set(this.stateService.loadSubmissions().map(s => s.date));
    this.tiles = Array.from({ length: this.pack.count }, (_, i) => {
      const n = i + 1;
      const key = GameService.packGameKey(this.packId, n);
      const result = results[key];
      let status: PackPuzzleStatus = 'new';
      if (result) {
        status = result.solved ? 'solved' : 'revealed';
      } else if (
        submittedKeys.has(key) ||
        this.stateService.loadDateState(key) !== null ||
        Object.keys(this.stateService.loadInputValues(key)).length > 0
      ) {
        status = 'started';
      }
      return { n, status };
    });
  }
}
