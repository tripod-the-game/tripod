import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { GameComponent } from './game.component';
import { GameService, GameData, ValidationState } from '../../services/game.service';
import { LoaderService } from '../../services/loader.service';
import { HapticService } from '../../services/haptic.service';
import { ShareService } from '../../services/share.service';

// GRAPE / EARTH / GRAPH — a valid 5-letter Tripod puzzle
// letters = ['E','P','A','A','R','R','T','G','R','A','P','H']
const MOCK_GAME_5: GameData = {
  letters: ['E', 'P', 'A', 'A', 'R', 'R', 'T', 'G', 'R', 'A', 'P', 'H'],
  category: 'Test',
  wordOne: 'GRAPE',
  wordTwo: 'EARTH',
  wordThree: 'GRAPH',
  size: 5,
};

// All-correct values for the 5-letter puzzle (position → letter, 1-indexed)
const ALL_CORRECT_VALUES: Record<number, string> = {
  1: 'E', 2: 'P', 3: 'A', 4: 'A', 5: 'R', 6: 'R',
  7: 'T', 8: 'G', 9: 'R', 10: 'A', 11: 'P', 12: 'H',
};

// All-wrong values
const ALL_WRONG_VALUES: Record<number, string> = {
  1: 'X', 2: 'X', 3: 'X', 4: 'X', 5: 'X', 6: 'X',
  7: 'X', 8: 'X', 9: 'X', 10: 'X', 11: 'X', 12: 'X',
};

describe('GameComponent', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let gameServiceSpy: jasmine.SpyObj<GameService>;
  let loaderServiceSpy: jasmine.SpyObj<LoaderService>;
  let hapticServiceSpy: jasmine.SpyObj<HapticService>;
  let shareServiceSpy: jasmine.SpyObj<ShareService>;

  beforeEach(async () => {
    gameServiceSpy = jasmine.createSpyObj('GameService', ['getGameForDate', 'getTodayGame', 'getAvailableDates']);
    gameServiceSpy.getGameForDate.and.returnValue(of(MOCK_GAME_5));
    gameServiceSpy.getTodayGame.and.returnValue(of(MOCK_GAME_5));
    gameServiceSpy.getAvailableDates.and.returnValue(of([]));

    loaderServiceSpy = jasmine.createSpyObj('LoaderService', ['show', 'hide']);
    hapticServiceSpy = jasmine.createSpyObj('HapticService', ['tap', 'submit', 'success', 'warning', 'error', 'celebrate']);
    hapticServiceSpy.tap.and.returnValue(Promise.resolve());
    hapticServiceSpy.submit.and.returnValue(Promise.resolve());
    hapticServiceSpy.success.and.returnValue(Promise.resolve());
    hapticServiceSpy.warning.and.returnValue(Promise.resolve());
    hapticServiceSpy.error.and.returnValue(Promise.resolve());
    hapticServiceSpy.celebrate.and.returnValue(Promise.resolve());

    shareServiceSpy = jasmine.createSpyObj('ShareService', ['shareResult', 'generateResultText']);
    shareServiceSpy.shareResult.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        { provide: GameService, useValue: gameServiceSpy },
        { provide: LoaderService, useValue: loaderServiceSpy },
        { provide: HapticService, useValue: hapticServiceSpy },
        { provide: ShareService, useValue: shareServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(GameComponent, { set: { imports: [CommonModule], schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── ngOnInit ─────────────────────────────────────────────────────────────────

  describe('ngOnInit', () => {
    it('should call getGameForDate for today', () => {
      expect(gameServiceSpy.getGameForDate).toHaveBeenCalled();
    });

    it('should set currentLetters, currentCategory, currentSize from loaded game', () => {
      expect(component.currentLetters).toEqual(MOCK_GAME_5.letters);
      expect(component.currentCategory).toBe('Test');
      expect(component.currentSize).toBe(5);
    });

    it('should set currentGameDate to today\'s MMDDYY key', () => {
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      expect(component.currentGameDate).toBe(`${mm}${dd}${yy}`);
    });
  });

  // ── totalCircles / WORD_POSITIONS ────────────────────────────────────────────

  describe('totalCircles', () => {
    it('should be 12 for size 5', () => {
      component.currentSize = 5;
      expect(component.totalCircles).toBe(12);
    });

    it('should be 9 for size 4', () => {
      component.currentSize = 4;
      expect(component.totalCircles).toBe(9);
    });
  });

  // ── onValuesSubmitted ─────────────────────────────────────────────────────────

  describe('onValuesSubmitted', () => {
    beforeEach(() => {
      component.currentLetters = MOCK_GAME_5.letters;
      component.currentWords = { wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' };
    });

    it('should push a submission with correct validation for exact matches', () => {
      component.onValuesSubmitted(ALL_CORRECT_VALUES);
      const sub = component.submissions[component.submissions.length - 1];
      Object.values(sub.validation).forEach(v => expect(v).toBe('correct'));
    });

    it('should push a submission with none for all-wrong values', () => {
      component.onValuesSubmitted(ALL_WRONG_VALUES);
      const sub = component.submissions[component.submissions.length - 1];
      Object.values(sub.validation).forEach(v => expect(v).toBe('none'));
    });

    it('should open congratsOpen when all 12 positions are correct', () => {
      component.onValuesSubmitted(ALL_CORRECT_VALUES);
      expect(component.congratsOpen).toBe(true);
    });

    it('should call hapticService.celebrate when all correct', () => {
      component.onValuesSubmitted(ALL_CORRECT_VALUES);
      expect(hapticServiceSpy.celebrate).toHaveBeenCalled();
    });

    it('should set allWrong and reset after 600ms when all positions are none', fakeAsync(() => {
      component.onValuesSubmitted(ALL_WRONG_VALUES);
      expect(component.allWrong).toBe(true);
      tick(600);
      expect(component.allWrong).toBe(false);
    }));

    it('should call hapticService.error for all-wrong submission', () => {
      component.onValuesSubmitted(ALL_WRONG_VALUES);
      expect(hapticServiceSpy.error).toHaveBeenCalled();
    });

    it('should call hapticService.success when some positions are correct', () => {
      const partialCorrect: Record<number, string> = { ...ALL_WRONG_VALUES, 1: 'E' };
      component.onValuesSubmitted(partialCorrect);
      expect(hapticServiceSpy.success).toHaveBeenCalled();
    });

    it('should not record a submission when the answer is already revealed', () => {
      component['gameStateByDate'][component.currentGameDate!] = { hintsUsed: 0, hintedPositions: [], revealed: true };
      const before = component.submissions.length;
      component.onValuesSubmitted({ 1: 'E' });
      expect(component.submissions.length).toBe(before);
    });

    it('should not record a submission when the game is already all-correct', () => {
      // Push an all-correct submission to make isAllCorrect true
      component.onValuesSubmitted(ALL_CORRECT_VALUES);
      const countAfterFirst = component.submissions.length;
      component.onValuesSubmitted({ 1: 'E' });
      expect(component.submissions.length).toBe(countAfterFirst);
    });

    it('should attach the currentGameDate to the pushed submission', () => {
      component.onValuesSubmitted(ALL_WRONG_VALUES);
      const sub = component.submissions[component.submissions.length - 1];
      expect(sub.date).toBe(component.currentGameDate);
    });
  });

  // ── wrong-position (yellow) detection ────────────────────────────────────────

  describe('wrong-position detection', () => {
    beforeEach(() => {
      component.currentLetters = MOCK_GAME_5.letters;
      component.currentWords = { wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' };
    });

    it('should mark wordTwo positions as wrong-position when wordOne is entered there', () => {
      // WORD_POSITIONS_5.wordTwo = [1, 3, 5, 7, 12]
      // Entering GRAPE (a valid word) in those positions
      const values: Record<number, string> = { 1: 'G', 3: 'R', 5: 'A', 7: 'P', 12: 'E' };
      component.onValuesSubmitted(values);
      const sub = component.submissions[component.submissions.length - 1];
      expect(sub.validation[1]).toBe('wrong-position');
      expect(sub.validation[3]).toBe('wrong-position');
      expect(sub.validation[5]).toBe('wrong-position');
      expect(sub.validation[7]).toBe('wrong-position');
      expect(sub.validation[12]).toBe('wrong-position');
    });

    it('should not mark correct positions as wrong-position', () => {
      // Enter EARTH correctly in wordTwo positions [1,3,5,7,12]
      // letters: pos1=E, pos3=A, pos5=R, pos7=T, pos12=H → EARTH ✓
      const values: Record<number, string> = { 1: 'E', 3: 'A', 5: 'R', 7: 'T', 12: 'H' };
      component.onValuesSubmitted(values);
      const sub = component.submissions[component.submissions.length - 1];
      expect(sub.validation[1]).toBe('correct');
      expect(sub.validation[3]).toBe('correct');
    });

    it('should not apply wrong-position when the word slot is partially filled', () => {
      // Only 4 of 5 positions filled for wordTwo — skip check
      const values: Record<number, string> = { 1: 'G', 3: 'R', 5: 'A', 7: 'P' }; // missing 12
      component.onValuesSubmitted(values);
      const sub = component.submissions[component.submissions.length - 1];
      // Should be 'none', not 'wrong-position'
      expect(sub.validation[1]).toBe('none');
    });

    it('should not mark wrong-position when entered word is not a valid puzzle word', () => {
      // Enter ZZZZZ in wordTwo positions — not a valid word
      const values: Record<number, string> = { 1: 'Z', 3: 'Z', 5: 'Z', 7: 'Z', 12: 'Z' };
      component.onValuesSubmitted(values);
      const sub = component.submissions[component.submissions.length - 1];
      expect(sub.validation[1]).toBe('none');
    });
  });

  // ── aggregatedValidation ──────────────────────────────────────────────────────

  describe('aggregatedValidation', () => {
    beforeEach(() => {
      // Ensure a predictable currentGameDate
      component['currentGameDate'] = '030126';
    });

    it('should return none for all positions when there are no submissions', () => {
      const v = component.aggregatedValidation;
      for (let i = 1; i <= 12; i++) {
        expect(v[i]).toBe('none');
      }
    });

    it('should persist "correct" state across subsequent submissions', () => {
      component.submissions = [
        { date: '030126', values: {}, validation: { 1: 'correct' } as Record<number, ValidationState> },
        { date: '030126', values: {}, validation: { 1: 'none' } as Record<number, ValidationState> },
      ];
      expect(component.aggregatedValidation[1]).toBe('correct');
    });

    it('should show wrong-position only from the latest submission', () => {
      component.submissions = [
        { date: '030126', values: {}, validation: { 1: 'wrong-position' } as Record<number, ValidationState> },
        { date: '030126', values: {}, validation: { 1: 'none' } as Record<number, ValidationState> },
      ];
      // Latest submission has 'none', so aggregated should also be 'none'
      expect(component.aggregatedValidation[1]).toBe('none');
    });

    it('should prefer correct over wrong-position', () => {
      component.submissions = [
        { date: '030126', values: {}, validation: { 2: 'correct' } as Record<number, ValidationState> },
        { date: '030126', values: {}, validation: { 2: 'wrong-position' } as Record<number, ValidationState> },
      ];
      expect(component.aggregatedValidation[2]).toBe('correct');
    });

    it('should only include submissions matching currentGameDate', () => {
      component.submissions = [
        { date: 'other', values: {}, validation: { 1: 'correct' } as Record<number, ValidationState> },
      ];
      expect(component.aggregatedValidation[1]).toBe('none');
    });
  });

  // ── aggregatedCorrectLetters ──────────────────────────────────────────────────

  describe('aggregatedCorrectLetters', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
    });

    it('should return all true when the game is revealed', () => {
      component['gameStateByDate']['030126'] = { hintsUsed: 0, hintedPositions: [], revealed: true };
      const cl = component.aggregatedCorrectLetters;
      for (let i = 1; i <= 12; i++) {
        expect(cl[i]).toBe(true);
      }
    });

    it('should return true for hinted positions', () => {
      component['gameStateByDate']['030126'] = { hintsUsed: 1, hintedPositions: [5], revealed: false };
      expect(component.aggregatedCorrectLetters[5]).toBe(true);
      expect(component.aggregatedCorrectLetters[6]).toBe(false);
    });

    it('should return true for positions marked correct in submissions', () => {
      component.submissions = [
        { date: '030126', values: {}, validation: { 3: 'correct' } as Record<number, ValidationState> },
      ];
      expect(component.aggregatedCorrectLetters[3]).toBe(true);
    });

    it('should return false for positions with no correct validation and no hint', () => {
      expect(component.aggregatedCorrectLetters[7]).toBe(false);
    });
  });

  // ── isAllCorrect ──────────────────────────────────────────────────────────────

  describe('isAllCorrect', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
    });

    it('should be false when there are no submissions', () => {
      expect(component.isAllCorrect).toBe(false);
    });

    it('should be true when all 12 positions are correct', () => {
      const allCorrect: Record<number, ValidationState> = {};
      for (let i = 1; i <= 12; i++) allCorrect[i] = 'correct';
      component.submissions = [{ date: '030126', values: {}, validation: allCorrect }];
      expect(component.isAllCorrect).toBe(true);
    });

    it('should be false when only some positions are correct', () => {
      component.submissions = [{
        date: '030126', values: {},
        validation: { 1: 'correct', 2: 'none' } as Record<number, ValidationState>,
      }];
      expect(component.isAllCorrect).toBe(false);
    });

    it('should be true when all positions are revealed (via setRevealed)', () => {
      component['gameStateByDate']['030126'] = { hintsUsed: 0, hintedPositions: [], revealed: true };
      expect(component.isAllCorrect).toBe(true);
    });
  });

  // ── hasNoNewInput ─────────────────────────────────────────────────────────────

  describe('hasNoNewInput', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
    });

    it('should be true when triangleInputValues is empty', () => {
      component.triangleInputValues = {};
      expect(component.hasNoNewInput).toBe(true);
    });

    it('should be false when a new letter is entered in a non-correct position', () => {
      component.triangleInputValues = { 1: 'X' };
      expect(component.hasNoNewInput).toBe(false);
    });

    it('should be true when all filled positions are already marked correct', () => {
      const allCorrect: Record<number, ValidationState> = {};
      for (let i = 1; i <= 12; i++) allCorrect[i] = 'correct';
      component.submissions = [{ date: '030126', values: {}, validation: allCorrect }];
      // All positions correct — any value there counts as "already correct"
      for (let i = 1; i <= 12; i++) {
        component.triangleInputValues[i] = 'A';
      }
      expect(component.hasNoNewInput).toBe(true);
    });
  });

  // ── onSubmit ──────────────────────────────────────────────────────────────────

  describe('onSubmit', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
    });

    it('should set submitted to true when there is new input', () => {
      component.triangleInputValues = { 1: 'E' };
      component.onSubmit();
      expect(component.submitted).toBe(true);
    });

    it('should shake and not submit when there is no new input', fakeAsync(() => {
      component.triangleInputValues = {};
      component.onSubmit();
      expect(component.submitted).toBe(false);
      expect(component.submitShake).toBe(true);
      tick(400);
      expect(component.submitShake).toBe(false);
    }));
  });

  // ── onReset ───────────────────────────────────────────────────────────────────

  describe('onReset', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
    });

    it('should clear submitted and increment resetCounter', () => {
      component.submitted = true;
      const before = component.resetCounter;
      component.onReset();
      expect(component.submitted).toBe(false);
      expect(component.resetCounter).toBe(before + 1);
    });

    it('should shake and not reset when the game is already all-correct', fakeAsync(() => {
      const allCorrect: Record<number, ValidationState> = {};
      for (let i = 1; i <= 12; i++) allCorrect[i] = 'correct';
      component.submissions = [{ date: '030126', values: {}, validation: allCorrect }];
      const before = component.resetCounter;
      component.onReset();
      expect(component.resetCounter).toBe(before); // unchanged
      expect(component.resetShake).toBe(true);
      tick(400);
      expect(component.resetShake).toBe(false);
    }));
  });

  // ── onRevealClick ─────────────────────────────────────────────────────────────

  describe('onRevealClick', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
    });

    it('should open the reveal confirm modal when not revealed', () => {
      component.onRevealClick();
      expect(component.showRevealConfirm).toBe(true);
    });

    it('should shake instead of opening modal when already revealed', fakeAsync(() => {
      component['gameStateByDate']['030126'] = { hintsUsed: 0, hintedPositions: [], revealed: true };
      component.onRevealClick();
      expect(component.showRevealConfirm).toBe(false);
      expect(component.revealShake).toBe(true);
      tick(400);
      expect(component.revealShake).toBe(false);
    }));

    it('should shake when game is already all-correct', fakeAsync(() => {
      const allCorrect: Record<number, ValidationState> = {};
      for (let i = 1; i <= 12; i++) allCorrect[i] = 'correct';
      component.submissions = [{ date: '030126', values: {}, validation: allCorrect }];
      component.onRevealClick();
      expect(component.revealShake).toBe(true);
      tick(400);
    }));
  });

  // ── onRevealAnswer ────────────────────────────────────────────────────────────

  describe('onRevealAnswer', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
      component.currentLetters = MOCK_GAME_5.letters;
    });

    it('should set revealed to true', () => {
      component.onRevealAnswer();
      expect(component.revealed).toBe(true);
    });

    it('should lock the puzzle (submitted = true)', () => {
      component.onRevealAnswer();
      expect(component.submitted).toBe(true);
    });

    it('should fill all 12 positions in triangleInputValues', () => {
      component.onRevealAnswer();
      for (let i = 1; i <= 12; i++) {
        expect(component.triangleInputValues[i]).toBeTruthy();
      }
    });

    it('should close the reveal confirm modal', () => {
      component.showRevealConfirm = true;
      component.onRevealAnswer();
      expect(component.showRevealConfirm).toBe(false);
    });
  });

  // ── onRevealHint ──────────────────────────────────────────────────────────────

  describe('onRevealHint', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
      component.currentLetters = MOCK_GAME_5.letters;
    });

    it('should reveal one letter and increment hintsUsed', () => {
      component.onRevealHint();
      expect(component.hintsUsed).toBe(1);
    });

    it('should fill the hinted position in triangleInputValues', () => {
      component.onRevealHint();
      const hintedPos = component['gameStateByDate']['030126'].hintedPositions[0];
      expect(component.triangleInputValues[hintedPos]).toBeTruthy();
    });

    it('should not reveal when max hints are reached', () => {
      component['gameStateByDate']['030126'] = { hintsUsed: 3, hintedPositions: [1, 2, 3], revealed: false };
      component.onRevealHint();
      expect(component.hintsUsed).toBe(3); // unchanged
    });

    it('should show last-hint confirmation when only 1 incorrect position remains', () => {
      // Make 11 positions "correct" via hintedPositions so only position 1 is left
      component['gameStateByDate']['030126'] = {
        hintsUsed: 2,
        hintedPositions: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        revealed: false,
      };
      component.onRevealHint();
      expect(component.showLastHintConfirm).toBe(true);
    });
  });

  // ── onConfirmLastHint ─────────────────────────────────────────────────────────

  describe('onConfirmLastHint', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
      component.currentLetters = MOCK_GAME_5.letters;
      component['gameStateByDate']['030126'] = {
        hintsUsed: 2,
        hintedPositions: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        revealed: false,
      };
      component['lastHintPosition'] = 1;
      component.showLastHintConfirm = true;
    });

    it('should reveal the last letter', () => {
      component.onConfirmLastHint();
      expect(component.triangleInputValues[1]).toBe('E'); // letters[0]
    });

    it('should mark the game as revealed', () => {
      component.onConfirmLastHint();
      expect(component.revealed).toBe(true);
    });

    it('should close the last-hint modal', () => {
      component.onConfirmLastHint();
      expect(component.showLastHintConfirm).toBe(false);
    });
  });

  // ── onCancelLastHint ──────────────────────────────────────────────────────────

  describe('onCancelLastHint', () => {
    it('should close the modal and clear lastHintPosition', () => {
      component.showLastHintConfirm = true;
      component['lastHintPosition'] = 5;
      component.onCancelLastHint();
      expect(component.showLastHintConfirm).toBe(false);
      expect(component['lastHintPosition']).toBeUndefined();
    });
  });

  // ── hintsRemaining ────────────────────────────────────────────────────────────

  describe('hintsRemaining', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
    });

    it('should equal maxHints (3) when no hints have been used', () => {
      expect(component.hintsRemaining).toBe(3);
    });

    it('should decrease as hints are used', () => {
      component['gameStateByDate']['030126'] = { hintsUsed: 2, hintedPositions: [1, 2], revealed: false };
      expect(component.hintsRemaining).toBe(1);
    });
  });

  // ── filteredSubmissions ───────────────────────────────────────────────────────

  describe('filteredSubmissions', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
    });

    it('should only include submissions for the current date', () => {
      component.submissions = [
        { date: '030126', values: {}, validation: {} },
        { date: 'other', values: {}, validation: {} },
        { date: '030126', values: {}, validation: {} },
      ];
      expect(component.filteredSubmissions.length).toBe(2);
    });

    it('should return empty array when no submissions match', () => {
      component.submissions = [{ date: 'other', values: {}, validation: {} }];
      expect(component.filteredSubmissions.length).toBe(0);
    });
  });

  // ── onDateChosen ──────────────────────────────────────────────────────────────

  describe('onDateChosen', () => {
    it('should call getGameForDate with the chosen date', () => {
      const date = new Date(2026, 0, 27);
      component.onDateChosen(date);
      expect(gameServiceSpy.getGameForDate).toHaveBeenCalledWith(date);
    });

    it('should update currentSize and currentLetters for a 5-letter game', () => {
      gameServiceSpy.getGameForDate.and.returnValue(of(MOCK_GAME_5));
      component.onDateChosen(new Date(2026, 0, 27));
      expect(component.currentSize).toBe(5);
      expect(component.currentLetters).toEqual(MOCK_GAME_5.letters);
    });

    it('should update currentSize to 4 for a 4-letter game', () => {
      const game4: GameData = {
        letters: Array(9).fill('A'),
        category: 'Small',
        wordOne: 'CAVE',
        wordTwo: 'ECHO',
        wordThree: 'CAVE',
        size: 4,
      };
      gameServiceSpy.getGameForDate.and.returnValue(of(game4));
      component.onDateChosen(new Date(2026, 0, 27));
      expect(component.currentSize).toBe(4);
    });

    it('should call loaderService.show', () => {
      component.onDateChosen(new Date(2026, 0, 27));
      expect(loaderServiceSpy.show).toHaveBeenCalled();
    });

    it('should reset triangleInputValues when switching dates', () => {
      component.triangleInputValues = { 1: 'A', 2: 'B' };
      component.onDateChosen(new Date(2026, 0, 27));
      expect(component.triangleInputValues).toEqual({});
    });
  });

  // ── revealed / hintedPositions getters ───────────────────────────────────────

  describe('revealed getter', () => {
    it('should return false when no state exists for currentGameDate', () => {
      component['currentGameDate'] = '030126';
      expect(component.revealed).toBe(false);
    });

    it('should return true after setRevealed is called', () => {
      component['currentGameDate'] = '030126';
      component['setRevealed'](true);
      expect(component.revealed).toBe(true);
    });
  });

  describe('hintedPositions getter', () => {
    it('should return an empty Set when no state exists', () => {
      component['currentGameDate'] = '030126';
      expect(component.hintedPositions.size).toBe(0);
    });

    it('should return a Set of hinted positions', () => {
      component['currentGameDate'] = '030126';
      component['gameStateByDate']['030126'] = { hintsUsed: 2, hintedPositions: [3, 7], revealed: false };
      expect(component.hintedPositions.has(3)).toBe(true);
      expect(component.hintedPositions.has(7)).toBe(true);
      expect(component.hintedPositions.has(1)).toBe(false);
    });
  });

  // ── onShare ───────────────────────────────────────────────────────────────────

  describe('onShare', () => {
    beforeEach(() => {
      component['currentGameDate'] = '030126';
    });

    it('should call shareService.shareResult', async () => {
      await component.onShare();
      expect(shareServiceSpy.shareResult).toHaveBeenCalled();
    });

    it('should temporarily change shareButtonText to "Copied!" on success', fakeAsync(() => {
      component.onShare();
      tick(0); // allow Promise microtask
      expect(component.shareButtonText).toBe('Copied!');
      tick(2000);
      expect(component.shareButtonText).toBe('Share');
    }));

    it('should not change shareButtonText when share fails', fakeAsync(() => {
      shareServiceSpy.shareResult.and.returnValue(Promise.resolve(false));
      component.onShare();
      tick(0);
      expect(component.shareButtonText).toBe('Share');
    }));
  });
});
