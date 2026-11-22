import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';

import { GameComponent } from './game.component';
import { GameData, GameService, ValidationState } from '../../services/game.service';
import { LoaderService } from '../../services/loader.service';
import { HapticService } from '../../services/haptic.service';
import { ShareService } from '../../services/share.service';
import { DateState, StateService, Submission } from '../../services/state.service';
import { GameResult, StatsService } from '../../services/stats.service';
import { Difficulty, EasierDifficulty } from '../../services/difficulty';
import {
  DifficultyPuzzleFixture,
  PUZZLE_4,
  PUZZLE_5,
  PUZZLE_5_DUP,
} from '../../testing/difficulty.fixtures';

const DATE_A = new Date(2026, 2, 7);
const DATE_B = new Date(2026, 2, 8);
const KEY_A = '030726';
const KEY_B = '030826';

const toGame = (p: DifficultyPuzzleFixture): GameData => ({
  letters: [...p.letters],
  category: p.category,
  wordOne: p.wordOne,
  wordTwo: p.wordTwo,
  wordThree: p.wordThree,
  size: p.size,
  available: true,
});

const UNAVAILABLE: GameData = { letters: [], category: undefined, size: 5, available: false };

const SIZES: ReadonlyArray<{ puzzle: DifficultyPuzzleFixture; bottomLeft: number; total: number }> = [
  { puzzle: PUZZLE_5, bottomLeft: 8, total: 12 },
  { puzzle: PUZZLE_4, bottomLeft: 6, total: 9 },
];

const MODES: ReadonlyArray<EasierDifficulty> = ['medium', 'easy'];

const locksFor = (mode: Difficulty, bottomLeft: number): number[] =>
  mode === 'easy' ? [bottomLeft, 1] : mode === 'medium' ? [bottomLeft] : [];

const answers = (p: DifficultyPuzzleFixture): Record<number, string> =>
  Object.fromEntries(p.letters.map((l, i) => [i + 1, l]));

// Fills every position with a letter that is not in the puzzle.
const allWrong = (p: DifficultyPuzzleFixture): Record<number, string> =>
  Object.fromEntries(p.letters.map((_, i) => [i + 1, 'X']));

describe('GameComponent difficulty', () => {
  let fixture: ComponentFixture<GameComponent>;
  let component: GameComponent;
  let game: jasmine.SpyObj<GameService>;
  let loader: jasmine.SpyObj<LoaderService>;
  let haptic: jasmine.SpyObj<HapticService>;
  let share: jasmine.SpyObj<ShareService>;
  let state: jasmine.SpyObj<StateService>;
  let stats: jasmine.SpyObj<StatsService>;
  let savedStates: Record<string, DateState>;
  let savedInputs: Record<string, Record<number, string>>;
  let savedSubmissions: Submission[];
  let results: GameResult[];

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('tripod_seen_tutorial', '1');
    savedStates = {};
    savedInputs = {};
    savedSubmissions = [];
    results = [];

    game = jasmine.createSpyObj('GameService', ['getGameForDate', 'getTodayGame', 'getAvailableDates', 'getTodayEST']);
    game.getGameForDate.and.returnValue(of(toGame(PUZZLE_5)));
    game.getTodayGame.and.returnValue(of(toGame(PUZZLE_5)));
    game.getAvailableDates.and.returnValue(of([]));
    game.getTodayEST.and.returnValue(DATE_A);

    loader = jasmine.createSpyObj('LoaderService', ['show', 'hide', 'showUntilReady', 'markReady']);
    haptic = jasmine.createSpyObj('HapticService', ['tap', 'submit', 'success', 'warning', 'error', 'celebrate']);
    for (const m of ['tap', 'submit', 'success', 'warning', 'error', 'celebrate'] as const) {
      haptic[m].and.returnValue(Promise.resolve());
    }
    share = jasmine.createSpyObj('ShareService', ['shareResult', 'generateResultText']);
    share.shareResult.and.returnValue(Promise.resolve(true));

    state = jasmine.createSpyObj('StateService', [
      'loadSubmissions', 'saveSubmissions', 'loadDateState', 'saveDateState', 'loadInputValues', 'saveInputValues',
    ]);
    state.loadSubmissions.and.callFake(() => JSON.parse(JSON.stringify(savedSubmissions)));
    state.saveSubmissions.and.callFake((s) => { savedSubmissions = JSON.parse(JSON.stringify(s)); });
    state.loadDateState.and.callFake((d) => (savedStates[d] ? JSON.parse(JSON.stringify(savedStates[d])) : null));
    state.saveDateState.and.callFake((d, s) => { savedStates[d] = JSON.parse(JSON.stringify(s)); });
    state.loadInputValues.and.callFake((d) => ({ ...(savedInputs[d] ?? {}) }));
    state.saveInputValues.and.callFake((d, v) => { savedInputs[d] = { ...v }; });

    stats = jasmine.createSpyObj('StatsService', ['recordResult', 'getResults', 'getComputedStats']);
    stats.getResults.and.callFake(() => results);
    stats.recordResult.and.callFake((r) => { results = [...results.filter((x) => x.date !== r.date), r]; });

    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        { provide: GameService, useValue: game },
        { provide: LoaderService, useValue: loader },
        { provide: HapticService, useValue: haptic },
        { provide: ShareService, useValue: share },
        { provide: StateService, useValue: state },
        { provide: StatsService, useValue: stats },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(GameComponent, { set: { imports: [CommonModule], schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();
  });

  afterEach(() => localStorage.clear());

  function open(p: DifficultyPuzzleFixture = PUZZLE_5): void {
    game.getGameForDate.and.returnValue(of(toGame(p)));
    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  }

  function move(target: Difficulty): void {
    component.openDifficultyDialog();
    component.selectDifficulty(target);
  }

  function goTo(date: Date, p: DifficultyPuzzleFixture): void {
    game.getGameForDate.and.returnValue(of(toGame(p)));
    component.onDateChosen(date);
  }

  // Starts a load whose response the test releases by hand.
  function holdLoad(date: Date): Subject<GameData> {
    const response = new Subject<GameData>();
    game.getGameForDate.and.returnValue(response as Observable<GameData>);
    component.onDateChosen(date);
    return response;
  }

  const lastSubmission = () => component.submissions[component.submissions.length - 1];

  function resetSaveSpies(): void {
    state.saveDateState.calls.reset();
    state.saveInputValues.calls.reset();
    state.saveSubmissions.calls.reset();
    stats.recordResult.calls.reset();
  }

  for (const { puzzle, bottomLeft, total } of SIZES) {
    describe(`${puzzle.size}-letter puzzle`, () => {
      describe('modes', () => {
        it('opens on Hard with nothing locked (AC1)', () => {
          open(puzzle);
          expect(component.difficulty).toBe('hard');
          expect(component.lockedPositions).toEqual([]);
          expect(component.lockedLetters).toEqual({});
        });

        it('Medium locks the bottom-left corner with the puzzle letter (AC2, AC3)', () => {
          open(puzzle);
          move('medium');
          expect(component.lockedPositions).toEqual([bottomLeft]);
          expect(component.lockedLetters).toEqual({ [bottomLeft]: puzzle.letters[bottomLeft - 1] });
        });

        it('Easy locks the bottom-left and top corners (AC2, AC3)', () => {
          open(puzzle);
          move('easy');
          expect(component.lockedPositions).toEqual([bottomLeft, 1]);
          expect(component.lockedLetters).toEqual({
            [bottomLeft]: puzzle.letters[bottomLeft - 1],
            1: puzzle.letters[0],
          });
        });

        it('returns the same lockedLetters object until the locks change', () => {
          open(puzzle);
          const hardLocks = component.lockedLetters;
          expect(component.lockedLetters).toBe(hardLocks);
          move('medium');
          const mediumLocks = component.lockedLetters;
          expect(mediumLocks).not.toBe(hardLocks);
          expect(component.lockedLetters).toBe(mediumLocks);
        });
      });

      describe('moves (AC5, AC6)', () => {
        it('request and cancel change nothing and write nothing', () => {
          open(puzzle);
          component.triangleInputValues = { [bottomLeft]: 'Z', 2: 'Q' };
          resetSaveSpies();
          component.openDifficultyDialog();
          expect(component.difficulty).toBe('hard');
          component.cancelDifficulty();
          expect(component.difficultyDialogOpen).toBeFalse();
          expect(component.difficulty).toBe('hard');
          expect(component.triangleInputValues).toEqual({ [bottomLeft]: 'Z', 2: 'Q' });
          expect(state.saveDateState).not.toHaveBeenCalled();
          expect(state.saveInputValues).not.toHaveBeenCalled();
          expect(state.saveSubmissions).not.toHaveBeenCalled();
        });

        it('confirm saves state and inputs once and never saves submissions', () => {
          open(puzzle);
          resetSaveSpies();
          move('medium');
          expect(state.saveDateState).toHaveBeenCalledTimes(1);
          expect(state.saveInputValues).toHaveBeenCalledTimes(1);
          expect(state.saveSubmissions).not.toHaveBeenCalled();
          expect(stats.recordResult).not.toHaveBeenCalled();
          expect(savedStates[KEY_A]).toEqual({ hintsUsed: 0, hintedPositions: [], revealed: false, difficulty: 'medium' });
        });

        it('preserves every other saved state field on a move', () => {
          savedStates[KEY_A] = {
            hintsUsed: 2, hintedPositions: [2, 3], revealed: false, futureField: 'keep',
          } as unknown as DateState;
          open(puzzle);
          move('easy');
          expect(savedStates[KEY_A]).toEqual({
            hintsUsed: 2, hintedPositions: [2, 3], revealed: false, futureField: 'keep', difficulty: 'easy',
          } as unknown as DateState);
        });
      });

      describe('when the picker locks (spec 2.3)', () => {
        it('is available on a new puzzle', () => {
          open(puzzle);
          expect(component.canChangeDifficulty).toBe(true);
        });

        it('is available with typed letters (AC9)', () => {
          open(puzzle);
          component.onValuesChanged({ 2: 'Q' });
          expect(component.canChangeDifficulty).toBe(true);
        });

        it('is available with hints used and nothing submitted (AC9)', () => {
          open(puzzle);
          component.onRevealHint();
          expect(component.hintsUsed).toBe(1);
          expect(component.canChangeDifficulty).toBe(true);
        });

        it('is available after Reset with nothing submitted (AC9)', () => {
          open(puzzle);
          component.onValuesChanged({ 2: 'Q' });
          component.onReset();
          expect(component.canChangeDifficulty).toBe(true);
        });

        it('is available for an old saved game with inputs and hints, starting from Hard', () => {
          savedStates[KEY_A] = { hintsUsed: 1, hintedPositions: [2], revealed: false };
          savedInputs[KEY_A] = { 3: 'Q' };
          open(puzzle);
          expect(component.difficulty).toBe('hard');
          expect(component.canChangeDifficulty).toBe(true);
        });

        it('is available after a rejected no-new-input Submit (AC9)', () => {
          open(puzzle);
          component.onSubmit();
          expect(component.submitted).toBe(false);
          expect(component.canChangeDifficulty).toBe(true);
        });

        it('locks between Submit and the submission being recorded', () => {
          open(puzzle);
          component.onValuesChanged({ 2: 'Q' });
          component.onSubmit();
          expect(component.submissions.length).toBe(0);
          expect(component.canChangeDifficulty).toBe(false);
        });

        it('locks after a partial submission and stays locked after Reset (AC10)', () => {
          open(puzzle);
          component.onValuesSubmitted({ 2: puzzle.letters[1] });
          expect(component.canChangeDifficulty).toBe(false);
          component.onReset();
          expect(component.submitted).toBe(false);
          expect(component.canChangeDifficulty).toBe(false);
        });

        it('locks after an all-wrong submission and stays locked on reload (AC10)', () => {
          open(puzzle);
          component.onValuesSubmitted(allWrong(puzzle));
          expect(component.canChangeDifficulty).toBe(false);
          open(puzzle);
          expect(component.submitted).toBe(false);
          expect(component.canChangeDifficulty).toBe(false);
        });

        it('locks when returning to a date with submissions', () => {
          open(puzzle);
          component.onValuesSubmitted({ 2: 'X' });
          goTo(DATE_B, puzzle);
          expect(component.canChangeDifficulty).toBe(true);
          goTo(DATE_A, puzzle);
          expect(component.canChangeDifficulty).toBe(false);
        });

        it('locks when solved (AC11)', () => {
          open(puzzle);
          component.onValuesSubmitted(answers(puzzle));
          expect(component.canChangeDifficulty).toBe(false);
        });

        it('locks after Reveal All with zero submissions (AC11)', () => {
          open(puzzle);
          component.onRevealAnswer();
          expect(component.submissions.length).toBe(0);
          expect(component.canChangeDifficulty).toBe(false);
        });

        it('locks after a last-hint end with zero submissions (AC11)', () => {
          open(puzzle);
          component.lastHintPosition = 2;
          component.onConfirmLastHint();
          expect(component.submissions.length).toBe(0);
          expect(component.canChangeDifficulty).toBe(false);
        });

        it('locks for a result with no submissions (AC11)', () => {
          results = [{ date: KEY_A, solved: false, attempts: 0, hintsUsed: 0, revealed: false }];
          open(puzzle);
          expect(component.canChangeDifficulty).toBe(false);
        });

        it('allows an unplayed past date and locks a played one (AC12)', () => {
          open(puzzle);
          goTo(new Date(2026, 0, 15), puzzle);
          expect(component.canChangeDifficulty).toBe(true);
          component.onValuesSubmitted({ 2: 'X' });
          expect(component.canChangeDifficulty).toBe(false);
        });

        it('is unavailable while loading and when the puzzle is unavailable (AC13)', () => {
          open(puzzle);
          const response = holdLoad(DATE_B);
          expect(component.canChangeDifficulty).toBe(false);
          response.next(UNAVAILABLE);
          expect(component.puzzleUnavailable).toBe(true);
          expect(component.canChangeDifficulty).toBe(false);
          expect(component.canMoveTo('easy')).toBe(false);
        });
      });

      describe('persistence', () => {
        it('survives a reload (AC7)', () => {
          open(puzzle);
          move('easy');
          open(puzzle);
          expect(component.difficulty).toBe('easy');
          expect(component.lockedPositions).toEqual([bottomLeft, 1]);
        });

        it('survives Reset (AC7, AC18)', () => {
          open(puzzle);
          component.onRevealHint();
          move('medium');
          component.onValuesChanged({ ...component.triangleInputValues, 3: 'Q' });
          const hints = component.hintsUsed;
          component.onReset();
          expect(component.difficulty).toBe('medium');
          expect(component.hintsUsed).toBe(hints);
          expect(component.lockedLetters).toEqual({ [bottomLeft]: puzzle.letters[bottomLeft - 1] });
          expect(component.aggregatedCorrectLetters[bottomLeft]).toBe(true);
          expect(component.triangleInputValues[3]).toBeUndefined();
        });

        it('survives navigating away and back, and does not leak to another date (AC7, AC8)', () => {
          open(puzzle);
          move('medium');
          goTo(DATE_B, puzzle);
          expect(component.difficulty).toBe('hard');
          expect(component.lockedPositions).toEqual([]);
          expect(savedStates[KEY_B]).toBeUndefined();
          goTo(DATE_A, puzzle);
          expect(component.difficulty).toBe('medium');
          expect(component.lockedPositions).toEqual([bottomLeft]);
        });

        it('opening a puzzle writes no state (AC35)', () => {
          open(puzzle);
          goTo(DATE_B, puzzle);
          expect(state.saveDateState).not.toHaveBeenCalled();
          expect(savedStates).toEqual({});
        });

        it('keeps the saved mode through unavailable and retry', () => {
          savedStates[KEY_B] = { hintsUsed: 0, hintedPositions: [], revealed: false, difficulty: 'easy' };
          open(puzzle);
          game.getGameForDate.and.returnValue(of(UNAVAILABLE));
          component.onDateChosen(DATE_B);
          expect(component.puzzleUnavailable).toBe(true);
          expect(component.lockedLetters).toEqual({});
          expect(savedStates[KEY_B].difficulty).toBe('easy');
          game.getGameForDate.and.returnValue(of(toGame(puzzle)));
          component.retryLoad();
          expect(component.difficulty).toBe('easy');
          expect(component.lockedPositions).toEqual([bottomLeft, 1]);
        });
      });

      describe('moving with a game in progress', () => {
        it('replaces a conflicting corner and keeps other letters (AC14)', () => {
          open(puzzle);
          component.onValuesChanged({ [bottomLeft]: 'Z', 1: 'Z', 2: 'Q', 3: 'W' });
          move('easy');
          expect(component.triangleInputValues).toEqual({
            [bottomLeft]: puzzle.letters[bottomLeft - 1],
            1: puzzle.letters[0],
            2: 'Q',
            3: 'W',
          });
          expect(savedInputs[KEY_A]).toEqual(component.triangleInputValues);
        });

        it('does not refund or change hints, including a hinted corner (AC15)', () => {
          savedStates[KEY_A] = { hintsUsed: 2, hintedPositions: [bottomLeft, 3], revealed: false };
          open(puzzle);
          move('easy');
          expect(component.hintsUsed).toBe(2);
          expect(component.hintsRemaining).toBe(1);
          expect([...component.hintedPositions]).toEqual([bottomLeft, 3]);
          expect(savedStates[KEY_A].hintedPositions).toEqual([bottomLeft, 3]);
        });
      });

      for (const mode of MODES) {
        const locked = locksFor(mode, bottomLeft);

        describe(`${mode} play`, () => {
          it('uses no hints and can hint every open position but never a locked corner (AC16)', () => {
            open(puzzle);
            move(mode);
            expect(component.hintsUsed).toBe(0);
            expect(component.hintsRemaining).toBe(3);

            const candidates = Array.from({ length: total }, (_, i) => i + 1).filter((p) => !locked.includes(p));
            const random = spyOn(Math, 'random');
            const picks: number[] = [];
            // One run per candidate, aimed at the middle of its slot in the random range.
            candidates.forEach((_, index) => {
              random.and.returnValue((index + 0.5) / candidates.length);
              component['gameStateByDate'][KEY_A].hintsUsed = 0;
              component['gameStateByDate'][KEY_A].hintedPositions = [];
              component.onRevealHint();
              picks.push(component['gameStateByDate'][KEY_A].hintedPositions[0]);
            });
            expect(picks).toEqual(candidates);
          });

          it('warns on the last non-locked letter and records a loss with difficulty (AC17)', () => {
            open(puzzle);
            move(mode);
            const open_positions = Array.from({ length: total }, (_, i) => i + 1).filter((p) => !locked.includes(p));
            const last = open_positions[open_positions.length - 1];
            const values = answers(puzzle);
            values[last] = 'X';
            component.onValuesSubmitted(values);
            component.onRevealHint();
            expect(component.showLastHintConfirm).toBe(true);
            expect(component.lastHintPosition).toBe(last);
            component.onConfirmLastHint();
            expect(stats.recordResult).toHaveBeenCalledTimes(1);
            const result = stats.recordResult.calls.mostRecent().args[0];
            expect(result.solved).toBe(false);
            expect(result.difficulty).toBe(mode);
          });

          it('Reveal All records a loss with difficulty (AC19)', () => {
            open(puzzle);
            move(mode);
            component.onRevealAnswer();
            expect(component.triangleInputValues).toEqual(answers(puzzle));
            const result = stats.recordResult.calls.mostRecent().args[0];
            expect(result.solved).toBe(false);
            expect(result.revealed).toBe(true);
            expect(result.difficulty).toBe(mode);
          });

          it('Submit with only locked letters shakes and records nothing (AC20)', fakeAsync(() => {
            open(puzzle);
            move(mode);
            component.onSubmit();
            expect(component.submitShake).toBe(true);
            expect(component.submitted).toBe(false);
            expect(haptic.error).toHaveBeenCalledTimes(1);
            component.onValuesSubmitted({ ...component.lockedLetters });
            expect(component.submissions.length).toBe(0);
            tick(400);
          }));

          it('stores locked letters as correct even if the triangle sent stale ones (AC21)', () => {
            open(puzzle);
            move(mode);
            const stale: Record<number, string> = { 2: 'X' };
            for (const pos of locked) stale[pos] = 'Z';
            component.onValuesSubmitted(stale);
            const sub = lastSubmission();
            for (const pos of locked) {
              expect(sub.values[pos]).toBe(puzzle.letters[pos - 1]);
              expect(sub.validation[pos]).toBe('correct');
            }
          });

          it('a full correct solve records a win with difficulty (AC21, AC32)', () => {
            open(puzzle);
            move(mode);
            component.onValuesSubmitted(answers(puzzle));
            expect(component.congratsOpen).toBe(true);
            expect(haptic.celebrate).toHaveBeenCalledTimes(1);
            const result = stats.recordResult.calls.mostRecent().args[0];
            expect(result.solved).toBe(true);
            expect(result.attempts).toBe(1);
            expect(result.hintsUsed).toBe(0);
            expect(result.difficulty).toBe(mode);
          });

          it('fires red flash and error haptic when every non-locked letter is wrong (AC24)', fakeAsync(() => {
            open(puzzle);
            move(mode);
            component.onValuesSubmitted(allWrong(puzzle));
            for (const pos of locked) expect(lastSubmission().validation[pos]).toBe('correct');
            expect(component.allWrong).toBe(true);
            expect(haptic.error).toHaveBeenCalledTimes(1);
            expect(haptic.success).not.toHaveBeenCalled();
            tick(600);
            expect(component.allWrong).toBe(false);
          }));

          it('gives no success haptic when only locked corners are correct (AC25)', fakeAsync(() => {
            open(puzzle);
            move(mode);
            component.onValuesSubmitted({ 2: 'X' });
            expect(haptic.success).not.toHaveBeenCalled();
            tick(600);
          }));

          it('gives the success haptic for a correct non-locked letter', () => {
            open(puzzle);
            move(mode);
            component.onValuesSubmitted({ 2: puzzle.letters[1], 3: 'X' });
            expect(haptic.success).toHaveBeenCalledTimes(1);
            expect(component.allWrong).toBe(false);
          });

          it('passes the difficulty to share', async () => {
            open(puzzle);
            move(mode);
            component.onValuesSubmitted(answers(puzzle));
            await component.onShare();
            expect(share.shareResult).toHaveBeenCalledOnceWith(KEY_A, 1, puzzle.size, false, 0, mode);
          });
        });
      }

      describe('loading (AC30)', () => {
        const other = puzzle === PUZZLE_5 ? PUZZLE_4 : PUZZLE_5;
        const otherBottomLeft = other === PUZZLE_5 ? 8 : 6;

        it('ignores A when B resolves first, across puzzle sizes', () => {
          savedStates[KEY_B] = { hintsUsed: 0, hintedPositions: [], revealed: false, difficulty: 'easy' };
          open(puzzle);
          const a = holdLoad(new Date(2026, 0, 15));
          const b = holdLoad(DATE_B);
          b.next(toGame(other));
          a.next(toGame(puzzle));
          expect(component.currentGameDate).toBe(KEY_B);
          expect(component.currentSize).toBe(other.size);
          expect(component.currentLetters).toEqual([...other.letters]);
          expect(component.lockedLetters).toEqual({
            [otherBottomLeft]: other.letters[otherBottomLeft - 1],
            1: other.letters[0],
          });
        });

        it('ignores A when A resolves first, and applies only B', () => {
          open(puzzle);
          const a = holdLoad(new Date(2026, 0, 15));
          const b = holdLoad(DATE_B);
          loader.markReady.calls.reset();
          a.next(toGame(other));
          expect(component.currentLetters).toEqual([...puzzle.letters]);
          expect(loader.markReady).not.toHaveBeenCalled();
          expect(component.canChangeDifficulty).toBe(false);
          b.next(toGame(other));
          expect(component.currentLetters).toEqual([...other.letters]);
          expect(loader.markReady).toHaveBeenCalledTimes(1);
        });

        it('ignores the first A response in A -> B -> A', () => {
          open(puzzle);
          const firstA = holdLoad(DATE_B);
          const b = holdLoad(new Date(2026, 0, 15));
          const secondA = holdLoad(DATE_B);
          secondA.next(toGame(puzzle));
          b.next(toGame(other));
          firstA.next(toGame(other));
          expect(component.currentGameDate).toBe(KEY_B);
          expect(component.currentLetters).toEqual([...puzzle.letters]);
          expect(loader.markReady).toHaveBeenCalledTimes(2);
        });

        it('applies no lock from the previous puzzle while the next loads', () => {
          savedStates[KEY_B] = { hintsUsed: 0, hintedPositions: [], revealed: false, difficulty: 'easy' };
          open(puzzle);
          move('easy');
          const response = holdLoad(DATE_B);
          expect(component.difficulty).toBe('easy');
          expect(component.lockedPositions).toEqual([]);
          expect(component.lockedLetters).toEqual({});
          expect(component.aggregatedCorrectLetters[bottomLeft]).toBe(false);
          expect(component.aggregatedCorrectLetters[1]).toBe(false);
          response.next(toGame(other));
          expect(component.lockedLetters).toEqual({
            [otherBottomLeft]: other.letters[otherBottomLeft - 1],
            1: other.letters[0],
          });
        });

        it('keeps lockedLetters an object in every load state', () => {
          game.getGameForDate.and.returnValue(new Subject<GameData>());
          fixture = TestBed.createComponent(GameComponent);
          component = fixture.componentInstance;
          expect(component.lockedLetters).toEqual({});
          component.ngOnInit();
          expect(component.lockedLetters).toEqual({});
        });

        describe('while the next date is loading', () => {
          let response: Subject<GameData>;
          let staleValues: Record<number, string>;

          beforeEach(() => {
            open(puzzle);
            move('easy');
            staleValues = { ...component.lockedLetters, 2: 'Q' };
            component.onValuesChanged(staleValues);
            response = holdLoad(DATE_B);
            resetSaveSpies();
            haptic.error.calls.reset();
            haptic.submit.calls.reset();
          });

          it('rejects Submit', fakeAsync(() => {
            component.onValuesChanged(staleValues);
            component.onSubmit();
            expect(component.submitted).toBe(false);
            expect(component.submitShake).toBe(true);
            expect(haptic.submit).not.toHaveBeenCalled();
            expect(haptic.error).toHaveBeenCalledTimes(1);
            tick(400);
          }));

          it('records nothing from a triangle submission', () => {
            const before = component.submissions.length;
            component.onValuesSubmitted(answers(puzzle));
            expect(component.submissions.length).toBe(before);
            expect(component.congratsOpen).toBe(false);
            expect(state.saveSubmissions).not.toHaveBeenCalled();
            expect(state.saveDateState).not.toHaveBeenCalled();
            expect(stats.recordResult).not.toHaveBeenCalled();
          });

          it('records nothing from reveal or hint actions', () => {
            component.onRevealClick();
            expect(component.showRevealConfirm).toBe(false);
            component.onRevealAnswer();
            component.onRevealHint();
            component.lastHintPosition = 2;
            component.onConfirmLastHint();
            expect(component.revealed).toBe(false);
            expect(component.hintsUsed).toBe(0);
            expect(state.saveDateState).not.toHaveBeenCalled();
            expect(state.saveSubmissions).not.toHaveBeenCalled();
            expect(stats.recordResult).not.toHaveBeenCalled();
          });

          it('applies no easier move, and drops a move pending from the previous date', () => {
            expect(component.canMoveTo('medium')).toBe(false);
            component.openDifficultyDialog();
            expect(component.difficultyDialogOpen).toBeFalse();
            component.difficultyDialogOpen = true;
            component.selectDifficulty('easy');
            expect(component.difficulty).toBe('hard');
            expect(state.saveDateState).not.toHaveBeenCalled();
            expect(savedStates[KEY_B]).toBeUndefined();
          });

          it('does not save the previous puzzle corner as a typed letter on the next date', () => {
            component.onValuesChanged(staleValues);
            expect(savedInputs[KEY_B]).toBeUndefined();
            response.next(toGame(other));
            expect(component.triangleInputValues[1]).toBeUndefined();
          });

          it('still drops those corners after a second navigation', () => {
            holdLoad(new Date(2026, 0, 15));
            component.onValuesChanged(staleValues);
            expect(savedInputs['011526']).toBeUndefined();
            expect(component.triangleInputValues).toEqual({ 2: 'Q' });
          });

          it('allows play again once the puzzle arrives', () => {
            response.next(toGame(other));
            expect(component.canChangeDifficulty).toBe(true);
            component.onValuesChanged({ 2: 'Q' });
            component.onSubmit();
            expect(component.submitted).toBe(true);
          });
        });

        it('clears a pending move when navigating', () => {
          open(puzzle);
          component.openDifficultyDialog();
          goTo(DATE_B, puzzle);
          expect(component.difficultyDialogOpen).toBeFalse();
          component.selectDifficulty('easy');
          expect(component.difficulty).toBe('hard');
          expect(savedStates[KEY_B]).toBeUndefined();
        });
      });

      describe('malformed and failing storage', () => {
        for (const raw of ['EASY', 1, null, {}, [], true, 'constructor']) {
          it(`treats raw difficulty ${JSON.stringify(raw)} as Hard and keeps it through a hint save (AC34)`, () => {
            savedStates[KEY_A] = { hintsUsed: 0, hintedPositions: [], revealed: false, difficulty: raw } as unknown as DateState;
            open(puzzle);
            expect(component.difficulty).toBe('hard');
            expect(component.lockedLetters).toEqual({});
            expect(state.saveDateState).not.toHaveBeenCalled();
            component.onRevealHint();
            expect((savedStates[KEY_A] as unknown as { difficulty: unknown }).difficulty).toEqual(raw);
          });
        }

        it('records hard for a result played on an invalid raw value', () => {
          savedStates[KEY_A] = { hintsUsed: 0, hintedPositions: [], revealed: false, difficulty: 'EASY' } as unknown as DateState;
          open(puzzle);
          component.onValuesSubmitted(answers(puzzle));
          expect(stats.recordResult.calls.mostRecent().args[0].difficulty).toBe('hard');
        });

        it('an explicit move replaces an invalid raw value', () => {
          savedStates[KEY_A] = { hintsUsed: 1, hintedPositions: [2], revealed: false, difficulty: 'EASY' } as unknown as DateState;
          open(puzzle);
          move('medium');
          expect(savedStates[KEY_A]).toEqual({ hintsUsed: 1, hintedPositions: [2], revealed: false, difficulty: 'medium' });
        });

        it('applies the mode when the state write throws, with no saved state', () => {
          open(puzzle);
          state.saveDateState.and.throwError('quota');
          expect(() => move('medium')).not.toThrow();
          expect(component.lockedPositions).toEqual([bottomLeft]);
          goTo(DATE_B, puzzle);
          goTo(DATE_A, puzzle);
          expect(component.difficulty).toBe('medium');
        });

        it('keeps the session mode over older saved state after a failed write', () => {
          savedStates[KEY_A] = { hintsUsed: 1, hintedPositions: [2], revealed: false };
          open(puzzle);
          state.saveDateState.and.throwError('quota');
          move('easy');
          goTo(DATE_B, puzzle);
          goTo(DATE_A, puzzle);
          expect(component.difficulty).toBe('easy');
          expect(component.hintsUsed).toBe(1);
          expect(savedStates[KEY_A].difficulty).toBeUndefined();
        });

        it('applies the mode when the inputs write throws', () => {
          open(puzzle);
          state.saveInputValues.and.throwError('quota');
          expect(() => move('easy')).not.toThrow();
          expect(component.difficulty).toBe('easy');
        });

        for (const value of [{ date: KEY_A }, 'text', 7, null]) {
          it(`loads with non-array tripod_stats ${JSON.stringify(value)}`, () => {
            stats.getResults.and.returnValue(value as unknown as GameResult[]);
            expect(() => open(puzzle)).not.toThrow();
            expect(component.currentLetters).toEqual([...puzzle.letters]);
            expect(component.canChangeDifficulty).toBe(true);
          });
        }

        it('tolerates null entries in tripod_stats', () => {
          stats.getResults.and.returnValue([null] as unknown as GameResult[]);
          expect(() => open(puzzle)).not.toThrow();
          expect(component.canChangeDifficulty).toBe(true);
        });
      });

      describe('Hard characterization (AC26, AC32)', () => {
        it('records hard on a win', () => {
          open(puzzle);
          component.onValuesSubmitted(answers(puzzle));
          expect(stats.recordResult.calls.mostRecent().args[0].difficulty).toBe('hard');
        });

        it('records hard on a loss', () => {
          open(puzzle);
          component.onRevealAnswer();
          expect(stats.recordResult.calls.mostRecent().args[0].difficulty).toBe('hard');
        });

        it('passes hard to share', async () => {
          open(puzzle);
          component.onValuesSubmitted(answers(puzzle));
          await component.onShare();
          expect(share.shareResult).toHaveBeenCalledOnceWith(KEY_A, 1, puzzle.size, false, 0, 'hard');
        });

        it('all wrong: every position none, red flash, error haptic', fakeAsync(() => {
          open(puzzle);
          component.onValuesSubmitted(allWrong(puzzle));
          expect(Object.values(lastSubmission().validation).every((v) => v === 'none')).toBe(true);
          expect(component.allWrong).toBe(true);
          expect(haptic.error).toHaveBeenCalledTimes(1);
          expect(haptic.success).not.toHaveBeenCalled();
          tick(600);
        }));

        it('a correct corner still counts as correct for feedback', () => {
          open(puzzle);
          component.onValuesSubmitted({ [bottomLeft]: puzzle.letters[bottomLeft - 1], 2: 'X' });
          expect(component.allWrong).toBe(false);
          expect(haptic.success).toHaveBeenCalledTimes(1);
        });

        it('a hinted position that is resubmitted still counts as correct for feedback', () => {
          savedStates[KEY_A] = { hintsUsed: 1, hintedPositions: [2], revealed: false };
          open(puzzle);
          component.onValuesSubmitted({ 2: puzzle.letters[1], 3: 'X' });
          expect(component.allWrong).toBe(false);
          expect(haptic.success).toHaveBeenCalledTimes(1);
        });

        it('an empty submission is still recorded as before', () => {
          open(puzzle);
          component.onValuesSubmitted({});
          expect(component.submissions.length).toBe(1);
        });
      });
    });
  }

  describe('hung load', () => {
    it('reaches Retry when the request gives up, and play recovers', () => {
      open();
      const response = holdLoad(DATE_B);
      expect(component.difficultyLoading).toBe(true);

      // GameService emits this once its timeout finds no cached copy.
      response.next(UNAVAILABLE);
      expect(component.puzzleUnavailable).toBe(true);
      expect(component.difficultyLoading).toBe(false);

      game.getGameForDate.and.returnValue(of(toGame(PUZZLE_4)));
      component.retryLoad();
      expect(component.puzzleUnavailable).toBe(false);
      expect(component.canChangeDifficulty).toBe(true);
      component.onValuesChanged({ 2: 'Q' });
      expect(savedInputs[KEY_B]).toEqual({ 2: 'Q' });
      component.onSubmit();
      expect(component.submitted).toBe(true);
    });

    it('Reset and typing during a load leave the saved inputs byte-identical', fakeAsync(() => {
      savedInputs[KEY_B] = { 2: 'A', 3: 'B' };
      const before = JSON.stringify(savedInputs[KEY_B]);
      open();
      const response = holdLoad(DATE_B);
      resetSaveSpies();
      const resets = component.resetCounter;

      component.onReset();
      component.onValuesChanged({ 2: 'Z' });
      tick(400);

      expect(state.saveInputValues).not.toHaveBeenCalled();
      expect(JSON.stringify(savedInputs[KEY_B])).toBe(before);
      expect(component.resetCounter).toBe(resets);

      response.next(toGame(PUZZLE_5));
      expect(component.triangleInputValues).toEqual({ 2: 'A', 3: 'B' });
    }));
  });

  describe('move rules, independent of puzzle size (AC5)', () => {
    const pairs: Array<[Difficulty, Difficulty, boolean]> = [
      ['hard', 'hard', false], ['hard', 'medium', true], ['hard', 'easy', true],
      ['medium', 'hard', false], ['medium', 'medium', false], ['medium', 'easy', true],
      ['easy', 'hard', false], ['easy', 'medium', false], ['easy', 'easy', false],
    ];

    for (const [from, to, allowed] of pairs) {
      it(`${from} -> ${to} is ${allowed ? 'allowed' : 'rejected'}`, () => {
        open(PUZZLE_5);
        if (from !== 'hard') move(from);
        expect(component.canMoveTo(to)).toBe(allowed);
        component.openDifficultyDialog();
        expect(component.difficultyMoves.includes(to as EasierDifficulty)).toBe(allowed);
        component.selectDifficulty(to);
        expect(component.difficulty).toBe(allowed ? to : from);
      });
    }

    it('rejects a tampered target that is harder', () => {
      open(PUZZLE_5);
      move('easy');
      resetSaveSpies();
      component.difficultyDialogOpen = true;
      component.selectDifficulty('medium');
      expect(component.difficulty).toBe('easy');
      expect(component.difficultyDialogOpen).toBeFalse();
      expect(state.saveDateState).not.toHaveBeenCalled();
    });

    it('rejects a tampered target that is not a valid mode', () => {
      open(PUZZLE_5);
      resetSaveSpies();
      component.openDifficultyDialog();
      component.selectDifficulty('EASY' as unknown as EasierDifficulty);
      expect(component.difficulty).toBe('hard');
      expect(state.saveDateState).not.toHaveBeenCalled();
    });

    it('rejects a tampered target after a submission', () => {
      open(PUZZLE_5);
      component.onValuesSubmitted({ 2: 'X' });
      component.difficultyDialogOpen = true;
      component.selectDifficulty('easy');
      expect(component.difficulty).toBe('hard');
    });
  });

  describe('yellow is letter-level (AC22)', () => {
    it('5-letter: a letter only at a locked corner is not yellow', () => {
      open(PUZZLE_5);
      move('easy');
      component.onValuesSubmitted({ 2: 'G', 3: 'E' });
      expect(lastSubmission().validation[2]).toBe('none');
      expect(lastSubmission().validation[3]).toBe('none');
    });

    it('5-letter Hard control: the same letters are yellow', () => {
      open(PUZZLE_5);
      component.onValuesSubmitted({ 2: 'G', 3: 'E' });
      expect(lastSubmission().validation[2]).toBe('present');
      expect(lastSubmission().validation[3]).toBe('present');
    });

    it('5-letter: a locked letter that also belongs at an unsolved position is yellow', () => {
      open(PUZZLE_5_DUP);
      move('easy');
      // A is locked at the apex and still unsolved at 4 and 10.
      component.onValuesSubmitted({ 2: 'A' });
      expect(lastSubmission().validation[2]).toBe('present');
    });

    it('4-letter: a letter only at the locked apex is not yellow', () => {
      open(PUZZLE_4);
      move('easy');
      component.onValuesSubmitted({ 2: 'E' });
      expect(lastSubmission().validation[2]).toBe('none');
    });

    it('4-letter: a locked letter that also belongs at an unsolved position is yellow', () => {
      open(PUZZLE_4);
      move('medium');
      // C is locked at 6 and still unsolved at 3.
      component.onValuesSubmitted({ 2: 'C' });
      expect(lastSubmission().validation[2]).toBe('present');
    });
  });

  describe('purple is word-level (AC23)', () => {
    const expectValidation = (expected: Record<number, ValidationState>) => {
      for (const [pos, v] of Object.entries(expected)) {
        expect(lastSubmission().validation[Number(pos)]).withContext(`position ${pos}`).toBe(v);
      }
    };

    it('5-letter: GRAPE in slot 3 is purple on non-correct positions with a green corner', () => {
      open(PUZZLE_5);
      move('medium');
      // GRAPH is the answer, so only the last letter differs.
      component.onValuesSubmitted({ 9: 'R', 10: 'A', 11: 'P', 12: 'E' });
      expectValidation({ 8: 'correct', 9: 'correct', 10: 'correct', 11: 'correct', 12: 'wrong-position' });
    });

    it('4-letter: CAVE in slot 3 is purple on non-correct positions with a green corner', () => {
      open(PUZZLE_4);
      move('medium');
      component.onValuesSubmitted({ 7: 'A', 8: 'V', 9: 'E' });
      expectValidation({ 6: 'correct', 7: 'correct', 8: 'wrong-position', 9: 'wrong-position' });
    });

    it('4-letter: a non-word through the locked apex is not purple', () => {
      open(PUZZLE_4);
      move('easy');
      // Slot 2 is ECHO. E + AVE is not a puzzle word.
      component.onValuesSubmitted({ 3: 'A', 5: 'V', 9: 'E' });
      expect(lastSubmission().validation[3]).not.toBe('wrong-position');
      expect(lastSubmission().validation[5]).not.toBe('wrong-position');
    });

    it('does not mark purple for a non-word sharing the locked corner', () => {
      open(PUZZLE_5);
      move('medium');
      component.onValuesSubmitted({ 9: 'R', 10: 'A', 11: 'P', 12: 'X' });
      expect(lastSubmission().validation[12]).toBe('none');
    });
  });
});
