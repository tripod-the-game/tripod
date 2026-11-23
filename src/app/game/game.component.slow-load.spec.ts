import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';

import { GameComponent } from './game.component';
import { GameService } from '../../services/game.service';
import { HapticService } from '../../services/haptic.service';
import { LoaderService } from '../../services/loader.service';
import { ShareService } from '../../services/share.service';

const TODAY = new Date(2026, 2, 9);
const DATE_KEY = '030926';
const CACHE_KEY = 'tripod_game_games_2026_03_030926';
const RAW = { category: 'Test', wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' };
const FIRST_ATTEMPT_MS = 10_000;
// Slower than the first attempt's limit, within any reasonable longer Retry limit.
const SLOW_RESPONSE_MS = 15_000;
// A hung Retry must have given up by this point, whatever limit the fix picks.
const HUNG_BOUND_MS = 60_000;

describe('GameComponent loading an uncached puzzle on a slow connection', () => {
  let fixture: ComponentFixture<GameComponent>;
  let component: GameComponent;
  let http: HttpTestingController;
  let loaderVisible: boolean;

  const gameRequest = (): TestRequest => http.expectOne((r) => r.url.endsWith(`/${DATE_KEY}.json`));
  const clickRetry = (): void => {
    fixture.nativeElement.querySelector('.retry-btn').click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('tripod_seen_tutorial', '1');

    const haptics = jasmine.createSpyObj('HapticService', ['tap', 'submit', 'success', 'warning', 'error', 'celebrate']);
    await TestBed.configureTestingModule({
      imports: [GameComponent, HttpClientTestingModule],
      providers: [
        { provide: HapticService, useValue: haptics },
        { provide: ShareService, useValue: jasmine.createSpyObj('ShareService', ['shareResult']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(GameComponent, { set: { imports: [CommonModule], schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    spyOn(TestBed.inject(GameService), 'getTodayEST').and.returnValue(TODAY);
    TestBed.inject(LoaderService).visible$.subscribe((visible) => (loaderVisible = visible));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function reachRetryScreen(): void {
    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    gameRequest();
    tick(FIRST_ATTEMPT_MS);
    fixture.detectChanges();
    expect(component.puzzleUnavailable).withContext('first attempt reaches Retry').toBeTrue();
  }

  it('loads a valid response that arrives after the first attempt limit on Retry', fakeAsync(() => {
    reachRetryScreen();
    clickRetry();
    const retry = gameRequest();

    tick(SLOW_RESPONSE_MS);
    expect(retry.cancelled).withContext(`Retry request cancelled before ${SLOW_RESPONSE_MS}ms`).toBeFalse();
    expect(loaderVisible).withContext('loading indicator while Retry is in flight').toBeTrue();

    if (!retry.cancelled) retry.flush(RAW);
    fixture.detectChanges();
    flush();

    expect(component.puzzleUnavailable).withContext('puzzle unavailable after slow response').toBeFalse();
    expect(component.currentLetters?.length).toBe(12);
    expect(JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')).toEqual(RAW);
  }));

  it('ignores a second Retry while the first is in flight', fakeAsync(() => {
    reachRetryScreen();
    clickRetry();
    tick(5_000);
    clickRetry();

    const requests = http.match((r) => r.url.endsWith(`/${DATE_KEY}.json`));
    expect(requests.length).withContext('requests after a second Retry').toBe(1);
    expect(requests[0].cancelled).withContext('first Retry request cancelled').toBeFalse();
    expect(loaderVisible).withContext('loading indicator while Retry is in flight').toBeTrue();

    requests[0].flush(RAW);
    fixture.detectChanges();
    flush();

    expect(component.puzzleUnavailable).withContext('puzzle unavailable after response').toBeFalse();
    expect(component.currentLetters?.length).toBe(12);
    expect(JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')).toEqual(RAW);
    expect(loaderVisible).withContext('loading indicator after response').toBeFalse();
  }));

  it('still returns to Retry when the Retry request hangs', fakeAsync(() => {
    reachRetryScreen();
    clickRetry();
    const retry = gameRequest();

    tick(HUNG_BOUND_MS);
    fixture.detectChanges();
    flush();

    expect(retry.cancelled).withContext('hung Retry request cancelled').toBeTrue();
    expect(component.puzzleUnavailable).toBeTrue();
    expect(fixture.nativeElement.querySelector('.retry-btn')).not.toBeNull();
  }));
});
