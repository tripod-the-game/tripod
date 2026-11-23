import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { GameComponent } from './game.component';
import { GameService } from '../../services/game.service';
import { HapticService } from '../../services/haptic.service';
import { LoaderService } from '../../services/loader.service';
import { ShareService } from '../../services/share.service';

const TODAY = new Date(2026, 2, 9);
const DATE_KEY = '030926';
const RAW_5 = { category: 'Test', wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' };
const RAW_4 = { category: 'Test', wordOne: 'SLAT', wordTwo: 'TOES', wordThree: 'SIPS', size: 4 };
const PRIOR_STATS = JSON.stringify([
  { date: '030726', solved: true, attempts: 2, hintsUsed: 0, revealed: false },
  { date: '030826', solved: true, attempts: 3, hintsUsed: 1, revealed: false },
]);

describe('GameComponent on the failed puzzle load screen', () => {
  let fixture: ComponentFixture<GameComponent>;
  let component: GameComponent;
  let http: HttpTestingController;

  const el = (): HTMLElement => fixture.nativeElement;
  const click = (selector: string): void => {
    el().querySelector<HTMLElement>(selector)?.click();
    fixture.detectChanges();
  };
  const gameRequest = () => http.expectOne((r) => r.url.endsWith(`/${DATE_KEY}.json`));
  const failLoad = (): void => {
    gameRequest().flush('', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
  };
  const storedRevealed = (): boolean =>
    !!JSON.parse(localStorage.getItem(`tripod_state_${DATE_KEY}`) ?? '{}').revealed;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('tripod_seen_tutorial', '1');
    localStorage.setItem('tripod_stats', PRIOR_STATS);

    const haptics = jasmine.createSpyObj('HapticService', ['tap', 'submit', 'success', 'warning', 'error', 'celebrate']);
    await TestBed.configureTestingModule({
      imports: [GameComponent, HttpClientTestingModule],
      providers: [
        { provide: HapticService, useValue: haptics },
        { provide: LoaderService, useValue: jasmine.createSpyObj('LoaderService', ['show', 'hide', 'showUntilReady', 'markReady']) },
        { provide: ShareService, useValue: jasmine.createSpyObj('ShareService', ['shareResult']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(GameComponent, { set: { imports: [CommonModule], schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    spyOn(TestBed.inject(GameService), 'getTodayEST').and.returnValue(TODAY);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    failLoad();
    expect(el().textContent).toContain("Couldn't load this puzzle");
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('shakes the Reveal button and opens no modal', () => {
    click('[aria-label="Reveal answer"]');

    expect(component.showRevealConfirm).withContext('modal state').toBeFalse();
    expect(el().querySelector('.reveal-all-option')).withContext('modal in the DOM').toBeNull();
    expect(component.revealShake).withContext('shake state').toBeTrue();
    expect(el().querySelector('[aria-label="Reveal answer"]')!.classList.contains('shake'))
      .withContext('shake class').toBeTrue();
  });

  it('records no false loss when the load fails with the modal already open', () => {
    const FAILED_DATE_KEY = '030826'; // already holds a stored win
    click('.retry-btn');
    gameRequest().flush(RAW_5);
    fixture.detectChanges();
    click('[aria-label="Reveal answer"]');
    expect(el().querySelector('.reveal-all-option')).withContext('modal open before the load').not.toBeNull();

    component.onDateChosen(new Date(2026, 2, 8));
    http.expectOne((r) => r.url.endsWith(`/${FAILED_DATE_KEY}.json`))
      .flush('', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(component.puzzleUnavailable).withContext('load failed').toBeTrue();
    const revealAll = el().querySelector<HTMLElement>('.reveal-all-option');
    expect(revealAll).withContext('modal still open after the failed load').not.toBeNull();
    revealAll!.click();
    fixture.detectChanges();

    expect(localStorage.getItem('tripod_stats')).withContext('tripod_stats').toBe(PRIOR_STATS);
    expect(localStorage.getItem(`tripod_state_${FAILED_DATE_KEY}`)).withContext('stored date state').toBeNull();
    expect(component.revealed).withContext('in-memory revealed flag').toBeFalse();
  });

  it('records no result and no reveal when Reveal All is attempted', () => {
    click('[aria-label="Reveal answer"]');
    click('.reveal-all-option');

    expect(localStorage.getItem('tripod_stats')).withContext('tripod_stats').toBe(PRIOR_STATS);
    expect(storedRevealed()).withContext('persisted revealed flag').toBeFalse();
    expect(component.revealed).withContext('in-memory revealed flag').toBeFalse();
  });

  for (const [name, raw] of [['5-letter', RAW_5], ['4-letter', RAW_4]] as const) {
    it(`leaves the ${name} puzzle playable after Reveal All is attempted and Retry succeeds`, () => {
      click('[aria-label="Reveal answer"]');
      click('.reveal-all-option');
      // A modal left open would cover Retry, so dismiss it the way a player would.
      click('.cancel-btn');

      click('.retry-btn');
      gameRequest().flush(raw);
      fixture.detectChanges();

      expect(component.puzzleUnavailable).toBeFalse();
      expect(component.revealed).withContext('revealed after Retry').toBeFalse();
      expect(component.submitted).withContext('submitted after Retry').toBeFalse();
      expect(component.isAllCorrect).withContext('board complete after Retry').toBeFalse();
    });
  }

  it('does not spend a hint when Reveal Letter is attempted', () => {
    click('[aria-label="Reveal answer"]');
    click('.hint-option');

    expect(component.hintsUsed).toBe(0);
    expect(localStorage.getItem('tripod_stats')).toBe(PRIOR_STATS);
    expect(localStorage.getItem(`tripod_state_${DATE_KEY}`)).toBeNull();
  });
});
