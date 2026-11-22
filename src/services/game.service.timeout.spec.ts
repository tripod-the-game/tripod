import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { GameData, GameService } from './game.service';

const DATE = new Date(2026, 2, 7);
const CACHE_KEY = 'tripod_game_games_2026_03_030726';
const RAW = { category: 'Ordinals', wordOne: 'FIRST', wordTwo: 'TENTH', wordThree: 'FIFTH' };

describe('GameService request timeout', () => {
  let service: GameService;
  let http: HttpTestingController;
  let result: GameData | undefined;

  beforeEach(() => {
    localStorage.clear();
    result = undefined;
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GameService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function request() {
    service.getGameForDate(DATE).subscribe((game) => (result = game));
    return http.expectOne((r) => r.url.endsWith('/030726.json'));
  }

  it('falls back to the cached game when the request hangs', fakeAsync(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(RAW));
    const req = request();

    tick(9_999);
    expect(result).toBeUndefined();
    tick(1);

    expect(req.cancelled).toBeTrue();
    expect(result!.available).toBeTrue();
    expect(result!.wordOne).toBe('FIRST');
  }));

  it('becomes unavailable when the request hangs with no cache', fakeAsync(() => {
    request();
    tick(10_000);
    expect(result!.available).toBeFalse();
    expect(result!.letters).toEqual([]);
  }));

  it('leaves a normal response unaffected', fakeAsync(() => {
    const req = request();
    tick(9_999);
    req.flush(RAW);
    tick(1);

    expect(result!.available).toBeTrue();
    expect(result!.category).toBe('Ordinals');
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!)).toEqual(RAW);
  }));
});
