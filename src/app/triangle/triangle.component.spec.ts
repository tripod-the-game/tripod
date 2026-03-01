import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { TriangleComponent } from './triangle.component';
import { GameService, GameData } from '../../services/game.service';

const MOCK_GAME_5: GameData = {
  letters: ['E', 'P', 'A', 'A', 'R', 'R', 'T', 'G', 'R', 'A', 'P', 'H'],
  category: 'Test',
  wordOne: 'GRAPE',
  wordTwo: 'EARTH',
  wordThree: 'GRAPH',
  size: 5,
};

describe('TriangleComponent', () => {
  let component: TriangleComponent;
  let fixture: ComponentFixture<TriangleComponent>;
  let gameServiceSpy: jasmine.SpyObj<GameService>;

  beforeEach(async () => {
    gameServiceSpy = jasmine.createSpyObj('GameService', ['getTodayGame', 'getGameForDate']);
    gameServiceSpy.getTodayGame.and.returnValue(of(MOCK_GAME_5));
    gameServiceSpy.getGameForDate.and.returnValue(of(MOCK_GAME_5));

    await TestBed.configureTestingModule({
      imports: [TriangleComponent],
      providers: [{ provide: GameService, useValue: gameServiceSpy }],
    })
      .overrideComponent(TriangleComponent, {
        set: { imports: [CommonModule, FormsModule] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TriangleComponent);
    component = fixture.componentInstance;
    component.letters = MOCK_GAME_5.letters;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── circles / totalCircles ────────────────────────────────────────────────────

  describe('circles', () => {
    it('should return 12 items numbered 1–12 for size 5', () => {
      component.size = 5;
      expect(component.circles.length).toBe(12);
      expect(component.circles[0]).toBe(1);
      expect(component.circles[11]).toBe(12);
    });

    it('should return 9 items numbered 1–9 for size 4', () => {
      component.size = 4;
      expect(component.circles.length).toBe(9);
      expect(component.circles[0]).toBe(1);
      expect(component.circles[8]).toBe(9);
    });
  });

  describe('totalCircles', () => {
    it('should be 12 for size 5', () => {
      component.size = 5;
      expect(component.totalCircles).toBe(12);
    });

    it('should be 9 for size 4', () => {
      component.size = 4;
      expect(component.totalCircles).toBe(9);
    });
  });

  // ── isCorrect ─────────────────────────────────────────────────────────────────

  describe('isCorrect', () => {
    beforeEach(() => {
      component['letterValues'] = ['E', 'P', 'A', 'A', 'R', 'R', 'T', 'G', 'R', 'A', 'P', 'H'];
      component.submitted = true;
    });

    it('should return true when the entered value matches letterValues at that index', () => {
      component['inputValues'][1] = 'E'; // circle 1, letterValues[0]='E'
      expect(component.isCorrect(1, 0)).toBe(true);
    });

    it('should return false when the value does not match', () => {
      component['inputValues'][1] = 'X';
      expect(component.isCorrect(1, 0)).toBe(false);
    });

    it('should be case-insensitive', () => {
      component['inputValues'][1] = 'e';
      expect(component.isCorrect(1, 0)).toBe(true);
    });

    it('should return false when not submitted and not displayOnly', () => {
      component.submitted = false;
      component.displayOnly = false;
      component['inputValues'][1] = 'E';
      expect(component.isCorrect(1, 0)).toBe(false);
    });

    it('should return true in displayOnly mode even when not submitted', () => {
      component.submitted = false;
      component.displayOnly = true;
      component.displayValues = { 1: 'E' };
      expect(component.isCorrect(1, 0)).toBe(true);
    });
  });

  // ── isWrongPosition ───────────────────────────────────────────────────────────

  describe('isWrongPosition', () => {
    beforeEach(() => {
      component.submitted = true;
    });

    it('should return true when aggregatedValidation marks circle as wrong-position', () => {
      component.aggregatedValidation = { 3: 'wrong-position' } as any;
      expect(component.isWrongPosition(3)).toBe(true);
    });

    it('should return false when aggregatedValidation marks circle as correct', () => {
      component.aggregatedValidation = { 3: 'correct' } as any;
      expect(component.isWrongPosition(3)).toBe(false);
    });

    it('should return false when aggregatedValidation is undefined for the circle', () => {
      component.aggregatedValidation = {} as any;
      expect(component.isWrongPosition(3)).toBe(false);
    });

    it('should return false when not submitted', () => {
      component.submitted = false;
      component.aggregatedValidation = { 3: 'wrong-position' } as any;
      expect(component.isWrongPosition(3)).toBe(false);
    });
  });

  // ── onModelChange ─────────────────────────────────────────────────────────────

  describe('onModelChange', () => {
    it('should store the first character uppercased', () => {
      component.onModelChange('a', 1);
      expect(component.inputValues[1]).toBe('A');
    });

    it('should take only the first character from multi-character input', () => {
      component.onModelChange('xyz', 3);
      expect(component.inputValues[3]).toBe('X');
    });

    it('should store an empty string for empty input', () => {
      component.onModelChange('', 1);
      expect(component.inputValues[1]).toBe('');
    });

    it('should emit valuesChanged after updating', () => {
      const spy = spyOn(component.valuesChanged, 'emit');
      component.onModelChange('B', 2);
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ 2: 'B' }));
    });

    it('should emit valuesChanged even for empty input', () => {
      const spy = spyOn(component.valuesChanged, 'emit');
      component.onModelChange('', 2);
      expect(spy).toHaveBeenCalled();
    });
  });

  // ── ngOnChanges ───────────────────────────────────────────────────────────────

  describe('ngOnChanges', () => {
    it('should emit valuesSubmitted when submitted changes to true', () => {
      const spy = spyOn(component.valuesSubmitted, 'emit');
      component['inputValues'] = { 1: 'E', 2: 'P' };
      component.submitted = true;
      component.ngOnChanges({
        submitted: new SimpleChange(false, true, false),
      });
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ 1: 'E', 2: 'P' }));
    });

    it('should NOT emit valuesSubmitted when submitted changes to false', () => {
      const spy = spyOn(component.valuesSubmitted, 'emit');
      component.submitted = false;
      component.ngOnChanges({
        submitted: new SimpleChange(true, false, false),
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should clear inputValues when resetCounter changes', () => {
      component['inputValues'] = { 1: 'A', 2: 'B', 5: 'C' };
      component.ngOnChanges({
        resetCounter: new SimpleChange(0, 1, false),
      });
      expect(component.inputValues).toEqual({});
    });

    it('should preserve correct letters on reset', () => {
      component['letterValues'] = ['E', 'P', 'A'];
      component.aggregatedCorrect = { 1: true, 2: false };
      component['inputValues'] = { 1: 'E', 2: 'B' };
      component.ngOnChanges({
        resetCounter: new SimpleChange(0, 1, false),
      });
      // Correct position is preserved
      expect(component.inputValues[1]).toBe('E');
      // Non-correct position is cleared
      expect(component.inputValues[2]).toBeUndefined();
    });

    it('should emit valuesChanged with updated values after reset', () => {
      const spy = spyOn(component.valuesChanged, 'emit');
      component.ngOnChanges({
        resetCounter: new SimpleChange(0, 1, false),
      });
      expect(spy).toHaveBeenCalled();
    });

    it('should update letterValues when letters input changes', () => {
      const newLetters = Array(12).fill('Z');
      component.letters = newLetters;
      component.ngOnChanges({
        letters: new SimpleChange(undefined, newLetters, false),
      });
      expect(component['letterValues']).toEqual(newLetters.map(() => 'Z'));
    });

    it('should sync aggregatedCorrect to inputValues when aggregatedCorrect changes', () => {
      component['letterValues'] = ['E', 'P', 'A', 'A', 'R', 'R', 'T', 'G', 'R', 'A', 'P', 'H'];
      component.aggregatedCorrect = { 2: true };
      component.ngOnChanges({
        aggregatedCorrect: new SimpleChange(undefined, { 2: true }, false),
      });
      expect(component.inputValues[2]).toBe('P'); // letterValues[1] = 'P'
    });
  });

  // ── displayOnly mode ──────────────────────────────────────────────────────────

  describe('displayOnly mode', () => {
    it('should sync displayValues to inputValues in displayOnly mode', () => {
      component.displayOnly = true;
      component.displayValues = { 1: 'a', 3: 'B' };
      component.ngOnChanges({
        displayValues: new SimpleChange(undefined, { 1: 'a', 3: 'B' }, false),
        displayOnly: new SimpleChange(false, true, false),
      });
      expect(component.inputValues[1]).toBe('A');
      expect(component.inputValues[3]).toBe('B');
    });

    it('should set isReady immediately in displayOnly mode (via ngAfterViewInit)', () => {
      component.displayOnly = true;
      component.ngAfterViewInit();
      expect(component.isReady).toBe(true);
    });
  });

  // ── neighbors ─────────────────────────────────────────────────────────────────

  describe('neighbors', () => {
    it('should return 5-letter neighbor map for size 5', () => {
      component.size = 5;
      const n = component.neighbors;
      expect(n[1].down).toBe(2);
      expect(n[8].right).toBe(9);
      expect(n[12].left).toBe(11);
    });

    it('should return 4-letter neighbor map for size 4', () => {
      component.size = 4;
      const n = component.neighbors;
      expect(n[1].down).toBe(2);
      expect(n[6].right).toBe(7);
      expect(n[9].left).toBe(8);
    });
  });
});
