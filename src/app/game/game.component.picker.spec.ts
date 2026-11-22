import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';

import { GameComponent } from './game.component';
import { TriangleComponent } from '../triangle/triangle.component';
import { GameData, GameService } from '../../services/game.service';
import { LoaderService } from '../../services/loader.service';
import { HapticService } from '../../services/haptic.service';
import { ShareService } from '../../services/share.service';
import { DateState, StateService, Submission } from '../../services/state.service';
import { GameResult, StatsService } from '../../services/stats.service';
import { Difficulty, EasierDifficulty } from '../../services/difficulty';
import { DifficultyPuzzleFixture, PUZZLE_4, PUZZLE_5 } from '../../testing/difficulty.fixtures';

const KEY = '030726';
const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const HAPTICS = ['tap', 'submit', 'success', 'warning', 'error', 'celebrate'] as const;

const toGame = (p: DifficultyPuzzleFixture): GameData => ({
  letters: [...p.letters],
  category: p.category,
  wordOne: p.wordOne,
  wordTwo: p.wordTwo,
  wordThree: p.wordThree,
  size: p.size,
  available: true,
});

const SIZES = [
  { puzzle: PUZZLE_5, bottomLeft: 8 },
  { puzzle: PUZZLE_4, bottomLeft: 6 },
];

describe('GameComponent difficulty picker', () => {
  let fixture: ComponentFixture<GameComponent>;
  let component: GameComponent;
  let game: jasmine.SpyObj<GameService>;
  let haptic: jasmine.SpyObj<HapticService>;
  let state: jasmine.SpyObj<StateService>;
  let savedStates: Record<string, DateState>;
  let savedSubmissions: Submission[];
  let results: GameResult[];

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('tripod_seen_tutorial', '1');
    savedStates = {};
    savedSubmissions = [];
    results = [];

    game = jasmine.createSpyObj('GameService', ['getGameForDate', 'getTodayGame', 'getAvailableDates', 'getTodayEST']);
    game.getGameForDate.and.returnValue(of(toGame(PUZZLE_5)));
    game.getTodayGame.and.returnValue(of(toGame(PUZZLE_5)));
    game.getAvailableDates.and.returnValue(of([]));
    game.getTodayEST.and.returnValue(new Date(2026, 2, 7));

    haptic = jasmine.createSpyObj('HapticService', [...HAPTICS]);
    HAPTICS.forEach((m) => haptic[m].and.returnValue(Promise.resolve()));

    state = jasmine.createSpyObj('StateService', [
      'loadSubmissions', 'saveSubmissions', 'loadDateState', 'saveDateState', 'loadInputValues', 'saveInputValues',
    ]);
    state.loadSubmissions.and.callFake(() => JSON.parse(JSON.stringify(savedSubmissions)));
    state.loadDateState.and.callFake((d) => (savedStates[d] ? JSON.parse(JSON.stringify(savedStates[d])) : null));
    state.saveDateState.and.callFake((d, s) => { savedStates[d] = JSON.parse(JSON.stringify(s)); });
    state.loadInputValues.and.returnValue({});

    const stats = jasmine.createSpyObj('StatsService', ['recordResult', 'getResults', 'getComputedStats']);
    stats.getResults.and.callFake(() => results);

    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        { provide: GameService, useValue: game },
        { provide: LoaderService, useValue: jasmine.createSpyObj('LoaderService', ['show', 'hide', 'showUntilReady', 'markReady']) },
        { provide: HapticService, useValue: haptic },
        { provide: ShareService, useValue: jasmine.createSpyObj('ShareService', ['shareResult']) },
        { provide: StateService, useValue: state },
        { provide: StatsService, useValue: stats },
      ],
    })
      .overrideComponent(GameComponent, {
        set: { imports: [CommonModule, TriangleComponent], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.clear();
  });

  function open(p: DifficultyPuzzleFixture = PUZZLE_5, saved?: EasierDifficulty): void {
    if (saved) savedStates[KEY] = { hintsUsed: 0, hintedPositions: [], revealed: false, difficulty: saved };
    game.getGameForDate.and.returnValue(of(toGame(p)));
    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const root = (): HTMLElement => fixture.nativeElement;
  const link = () => root().querySelector<HTMLElement>('.difficulty-link');
  const linkButton = () => root().querySelector<HTMLButtonElement>('button.difficulty-link');
  const linkRow = () => root().querySelector<HTMLElement>('.difficulty-link-row');
  const linkText = () => link()!.textContent!.replace(/\s+/g, ' ').trim();
  const modal = () => root().querySelector<HTMLElement>('.difficulty-confirm');
  const options = () => Array.from(modal()!.querySelectorAll<HTMLButtonElement>('.reveal-option'));
  const option = (mode: EasierDifficulty) =>
    options().find((b) => b.querySelector('.option-label')!.textContent!.trim() === LABELS[mode])!;
  const cancelButton = () => modal()!.querySelector<HTMLButtonElement>('.cancel-btn')!;
  const lockedInputs = () => Array.from(root().querySelectorAll<HTMLInputElement>('.circle-input.locked input'));
  const insideTriangleGrid = () => !!document.activeElement?.closest('.triangle-container');

  function click(el: HTMLElement): void {
    el.click();
    fixture.detectChanges();
  }

  function pressTab(shiftKey = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(event);
    return event;
  }

  // NgModel applies `disabled` in a microtask.
  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function expectPlainLabel(mode: EasierDifficulty): void {
    expect(link()!.tagName).toBe('SPAN');
    expect(linkButton()).toBeNull();
    expect(linkText()).toBe(`${LABELS[mode]} mode`);
  }

  function reopen(p: DifficultyPuzzleFixture, saved?: EasierDifficulty): void {
    fixture.destroy();
    savedStates = {};
    state.saveDateState.calls.reset();
    open(p, saved);
  }

  describe('structure', () => {
    it('sits between the triangle and actions, with no banner control', () => {
      open();
      const row = linkRow()!;
      expect(row.previousElementSibling!.tagName).toBe('APP-TRIANGLE');
      expect(row.nextElementSibling!.classList).toContain('action-row');
      expect(root().querySelector('.category-banner button')).toBeNull();
      expect(root().querySelector('.difficulty-pill')).toBeNull();
    });

    it('is a named button that announces a dialog', () => {
      open();
      const button = linkButton()!;
      expect(button.type).toBe('button');
      expect(button.tabIndex).toBe(0);
      expect(button.getAttribute('aria-haspopup')).toBe('dialog');
      expect(linkText()).toBe('Need a head start?');
    });
  });

  describe('states (AC44)', () => {
    for (const { puzzle } of SIZES) {
      it(`${puzzle.size}-letter: shows the right text and opens only with a move`, () => {
        open(puzzle);
        expect(component.difficultyMoves).toEqual(['medium', 'easy']);
        expect(linkText()).toBe('Need a head start?');
        click(linkButton()!);
        expect(modal()).not.toBeNull();
        click(cancelButton());

        reopen(puzzle, 'medium');
        expect(component.difficultyMoves).toEqual(['easy']);
        expect(linkText()).toBe('Medium · Make easier');
        click(linkButton()!);
        expect(modal()).not.toBeNull();
        click(cancelButton());

        reopen(puzzle, 'easy');
        expect(component.difficultyMoves).toEqual([]);
        expectPlainLabel('easy');
        click(link()!);
        expect(modal()).toBeNull();
      });
    }

    it('locked by a submission: plain label that opens nothing', () => {
      savedSubmissions = [{ date: KEY, values: { 2: 'X' }, validation: { 2: 'none' } }];
      open(PUZZLE_5, 'medium');
      expectPlainLabel('medium');
      click(link()!);
      expect(modal()).toBeNull();
    });

    it('locked Hard shows nothing but keeps the row reserved', () => {
      results = [{ date: KEY, solved: false, attempts: 0, hintsUsed: 0, revealed: true }];
      open();
      expect(link()).toBeNull();
      expect(linkRow()!.textContent!.trim()).toBe('');
      expect(linkRow()!.getBoundingClientRect().height).toBe(44);
      click(linkRow()!);
      expect(modal()).toBeNull();
    });

    it('shows nothing and is not actionable while loading', () => {
      savedStates[KEY] = { hintsUsed: 0, hintedPositions: [], revealed: false, difficulty: 'medium' };
      const response = new Subject<GameData>();
      game.getGameForDate.and.returnValue(response as Observable<GameData>);
      fixture = TestBed.createComponent(GameComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(link()).toBeNull();
      expect(linkRow()!.getBoundingClientRect().height).toBe(44);
      click(linkRow()!);
      expect(modal()).toBeNull();

      response.next(toGame(PUZZLE_5));
      fixture.detectChanges();
      expect(linkText()).toBe('Medium · Make easier');
    });

    it('has no row when the puzzle is unavailable and returns on retry', () => {
      game.getGameForDate.and.returnValue(of({ letters: [], category: undefined, size: 5, available: false }));
      fixture = TestBed.createComponent(GameComponent);
      fixture.detectChanges();
      expect(linkRow()).toBeNull();
      expect(root().textContent).toContain("Couldn't load this puzzle");

      game.getGameForDate.and.returnValue(of(toGame(PUZZLE_5)));
      fixture.componentInstance.retryLoad();
      fixture.detectChanges();
      expect(linkButton()!.disabled).toBeFalse();
    });

    it('openDifficultyDialog is a no-op with no move', () => {
      open(PUZZLE_5, 'easy');
      component.openDifficultyDialog();
      fixture.detectChanges();
      expect(component.difficultyDialogOpen).toBeFalse();
      expect(modal()).toBeNull();
    });

    it('with an empty category keeps a usable link and no banner', () => {
      open({ ...PUZZLE_5, category: '' });
      expect(root().querySelector('.category-banner')).toBeNull();
      click(linkButton()!);
      expect(modal()).not.toBeNull();
    });
  });

  describe('dialog copy', () => {
    it('lists each available mode with only its newly revealed corners', () => {
      const CASES: Array<{ from?: EasierDifficulty; offered: Array<[string, string]> }> = [
        { offered: [['Medium', 'Reveals bottom-left'], ['Easy', 'Reveals bottom-left and top corners']] },
        { from: 'medium', offered: [['Easy', 'Reveals top corner']] },
      ];
      for (const { from, offered } of CASES) {
        reopenOrOpen(from);
        click(linkButton()!);
        const dialog = modal()!;
        expect(dialog.querySelector('h2')!.textContent).toBe('Make it easier?');
        expect(options().map((b) => [
          b.querySelector('.option-label')!.textContent!.trim(),
          b.querySelector('.option-detail')!.textContent!.trim(),
        ])).toEqual(offered);
        for (const b of options()) {
          expect(b.classList).not.toContain('hint-option');
          expect(b.querySelectorAll('svg circle').length).toBe(12);
          const green = b.querySelector('.option-label')!.textContent!.trim() === 'Easy' ? 2 : 1;
          expect(b.querySelectorAll('svg circle[fill="#4caf50"]').length).toBe(green);
        }
        expect(dialog.querySelector('p')!.textContent).toBe("You can't go back to a harder mode on this puzzle.");
        expect(cancelButton().textContent!.trim()).toBe('Cancel');
        expect(dialog.textContent!.includes('bottom-left')).withContext(from ?? 'hard').toBe(!from);
      }
    });

    it('is a labeled modal dialog', () => {
      open();
      click(linkButton()!);
      const dialog = modal()!;
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(root().querySelector(`#${dialog.getAttribute('aria-labelledby')}`)!.textContent).toBe('Make it easier?');
      expect(root().querySelector(`#${dialog.getAttribute('aria-describedby')}`)!.textContent).toContain("can't go back");
    });
  });

  function reopenOrOpen(saved?: EasierDifficulty): void {
    if (fixture) reopen(PUZZLE_5, saved);
    else open(PUZZLE_5, saved);
  }

  describe('cancel and select', () => {
    function expectCancelled(): void {
      expect(modal()).toBeNull();
      expect(component.difficulty).toBe('hard');
      expect(lockedInputs().length).toBe(0);
      expect(state.saveDateState).not.toHaveBeenCalled();
      expect(savedStates[KEY]).toBeUndefined();
    }

    it('Cancel changes nothing', () => {
      open();
      click(linkButton()!);
      click(cancelButton());
      expectCancelled();
    });

    it('clicking the backdrop cancels', () => {
      open();
      click(linkButton()!);
      click(root().querySelector<HTMLElement>('.confirm-modal:has(.difficulty-confirm)')!);
      expectCancelled();
    });

    it('clicking inside the dialog does not cancel', () => {
      open();
      click(linkButton()!);
      click(modal()!);
      expect(component.difficultyDialogOpen).toBeTrue();
    });

    it('Escape cancels', () => {
      open();
      click(linkButton()!);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expectCancelled();
    });

    it('Escape does nothing once the dialog is closed', () => {
      open();
      const cancel = spyOn(component, 'cancelDifficulty').and.callThrough();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(cancel).not.toHaveBeenCalled();
    });

    for (const { puzzle, bottomLeft } of SIZES) {
      it(`${puzzle.size}-letter: selecting a mode applies at once and locks its corners`, async () => {
        open(puzzle);
        click(linkButton()!);
        click(option('medium'));
        await settle();

        expect(modal()).toBeNull();
        expect(savedStates[KEY].difficulty).toBe('medium');
        expect(linkText()).toBe('Medium · Make easier');
        expect(component.lockedPositions).toEqual([bottomLeft]);
        expect(lockedInputs().map((i) => i.value)).toEqual([puzzle.letters[bottomLeft - 1]]);
        expect(lockedInputs().every((i) => i.disabled)).toBeTrue();

        reopen(puzzle);
        click(linkButton()!);
        click(option('easy'));
        await settle();

        expect(modal()).toBeNull();
        expect(savedStates[KEY].difficulty).toBe('easy');
        expectPlainLabel('easy');
        expect(lockedInputs().map((i) => i.value).sort()).toEqual(
          [puzzle.letters[bottomLeft - 1], puzzle.letters[0]].sort()
        );
        expect(lockedInputs().every((i) => i.disabled)).toBeTrue();
      });
    }

    describe('focus', () => {
      it('opens on Cancel and Tab cycles through 3 and 2 buttons', () => {
        const CASES: Array<{ from?: EasierDifficulty; modes: EasierDifficulty[] }> = [
          { modes: ['medium', 'easy'] },
          { from: 'medium', modes: ['easy'] },
        ];
        for (const { from, modes } of CASES) {
          reopenOrOpen(from);
          click(linkButton()!);
          expect(document.activeElement).toBe(cancelButton());

          const cycle = [...modes.map(option), cancelButton()];
          for (const expected of cycle) {
            expect(pressTab().defaultPrevented).toBeTrue();
            expect(document.activeElement).toBe(expected);
          }
          for (const expected of [...cycle].reverse().slice(1)) {
            pressTab(true);
            expect(document.activeElement).toBe(expected);
          }
          pressTab(true);
          expect(document.activeElement).toBe(cancelButton());

          // Focus that escaped the dialog is pulled back to Cancel.
          // The link is inert here, so blur is how focus actually leaves.
          (document.activeElement as HTMLElement).blur();
          expect(document.activeElement).toBe(document.body);
          pressTab();
          expect(document.activeElement).toBe(cancelButton());
        }
      });

      it('Cancel and Escape return focus to the link', () => {
        open();
        click(linkButton()!);
        click(cancelButton());
        expect(document.activeElement).toBe(linkButton());

        click(linkButton()!);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();
        expect(document.activeElement).toBe(linkButton());
      });

      it('Hard to Medium returns focus to the link', () => {
        open();
        click(linkButton()!);
        click(option('medium'));
        expect(document.activeElement).toBe(linkButton());
        expect(insideTriangleGrid()).toBeFalse();
      });

      it('falls back to the row when closing leaves no link', () => {
        open();
        click(linkButton()!);
        game.getGameForDate.and.returnValue(new Subject<GameData>() as Observable<GameData>);
        component.retryLoad();
        fixture.detectChanges();
        expect(link()).toBeNull();
        expect(document.activeElement).toBe(linkRow());
        expect(insideTriangleGrid()).toBeFalse();
      });

      it('any move to Easy focuses the plain label, outside the tab order', () => {
        for (const from of [undefined, 'medium'] as const) {
          reopenOrOpen(from);
          click(linkButton()!);
          click(option('easy'));
          expectPlainLabel('easy');
          expect(document.activeElement).toBe(link());
          expect(link()!.tabIndex).toBe(-1);
          expect(getComputedStyle(link()!).outlineStyle).toBe('none');
          expect(insideTriangleGrid()).toBeFalse();
        }
      });
    });

    it('makes the game inert only while the dialog is open', () => {
      open();
      const hero = root().querySelector('.game-hero')!;
      expect(hero.hasAttribute('inert')).toBeFalse();
      click(linkButton()!);
      expect(hero.hasAttribute('inert')).toBeTrue();
      click(cancelButton());
      expect(hero.hasAttribute('inert')).toBeFalse();
    });

    it('fires no haptic for any link action', () => {
      open();
      click(linkButton()!);
      click(cancelButton());
      click(linkButton()!);
      click(option('medium'));
      fixture.detectChanges();
      for (const m of HAPTICS) {
        expect(haptic[m]).withContext(m).not.toHaveBeenCalled();
      }
    });
  });
});
