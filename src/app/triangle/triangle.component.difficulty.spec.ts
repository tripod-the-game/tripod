import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, Subject } from 'rxjs';

import { TriangleComponent } from './triangle.component';
import { GameData, GameService } from '../../services/game.service';
import { Difficulty, lockedPositionsFor } from '../../services/difficulty';
import {
  DifficultyPuzzleFixture,
  PUZZLE_4,
  PUZZLE_5,
  PUZZLE_5_DUP,
} from '../../testing/difficulty.fixtures';

const GREEN = 'rgb(76, 175, 80)';
const RED = 'rgb(239, 83, 80)';

function lockedLettersFor(puzzle: DifficultyPuzzleFixture, difficulty: Difficulty): Record<number, string> {
  const locked: Record<number, string> = {};
  for (const position of lockedPositionsFor(difficulty, puzzle.size)) {
    locked[position] = puzzle.letters[position - 1];
  }
  return locked;
}

function correctMap(positions: number[]): Record<number, boolean> {
  return Object.fromEntries(positions.map(p => [p, true]));
}

function toGameData(puzzle: DifficultyPuzzleFixture): GameData {
  return {
    letters: [...puzzle.letters],
    category: puzzle.category,
    wordOne: puzzle.wordOne,
    wordTwo: puzzle.wordTwo,
    wordThree: puzzle.wordThree,
    size: puzzle.size,
    available: true,
  };
}

describe('TriangleComponent difficulty', () => {
  let fixture: ComponentFixture<TriangleComponent>;
  let component: TriangleComponent;
  let gameServiceSpy: jasmine.SpyObj<GameService>;

  beforeEach(async () => {
    gameServiceSpy = jasmine.createSpyObj('GameService', ['getTodayGame', 'getGameForDate']);
    gameServiceSpy.getTodayGame.and.returnValue(of(toGameData(PUZZLE_5)));

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
  });

  // NgModel applies values and disabled state in a microtask.
  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(
    puzzle: DifficultyPuzzleFixture,
    difficulty: Difficulty,
    extraCorrect: number[] = [],
  ): Promise<void> {
    const locked = lockedLettersFor(puzzle, difficulty);
    fixture.componentRef.setInput('size', puzzle.size);
    fixture.componentRef.setInput('letters', [...puzzle.letters]);
    fixture.componentRef.setInput('category', puzzle.category);
    fixture.componentRef.setInput('lockedLetters', locked);
    fixture.componentRef.setInput(
      'aggregatedCorrect',
      correctMap([...Object.keys(locked).map(Number), ...extraCorrect]),
    );
    await settle();
  }

  function circleEl(position: number): HTMLElement {
    return fixture.nativeElement.querySelector(`.circle-input[data-index="${position - 1}"]`);
  }

  function inputEl(position: number): HTMLInputElement {
    return circleEl(position).querySelector('input') as HTMLInputElement;
  }

  function press(position: number, key: string): void {
    inputEl(position).focus();
    inputEl(position).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  }

  function typeInto(position: number, value: string): void {
    const input = inputEl(position);
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const CORNER_CASES: { puzzle: DifficultyPuzzleFixture; difficulty: Difficulty; labels: Record<number, string> }[] = [
    { puzzle: PUZZLE_5, difficulty: 'medium', labels: { 8: 'Locked bottom-left corner, letter G' } },
    {
      puzzle: PUZZLE_5,
      difficulty: 'easy',
      labels: { 8: 'Locked bottom-left corner, letter G', 1: 'Locked top corner, letter E' },
    },
    { puzzle: PUZZLE_4, difficulty: 'medium', labels: { 6: 'Locked bottom-left corner, letter C' } },
    {
      puzzle: PUZZLE_4,
      difficulty: 'easy',
      labels: { 6: 'Locked bottom-left corner, letter C', 1: 'Locked top corner, letter E' },
    },
  ];

  describe('locked rendering', () => {
    for (const { puzzle, difficulty, labels } of CORNER_CASES) {
      const name = `${puzzle.size}-letter ${difficulty}`;

      it(`${name}: corners are green before submit, show the letter, disabled, and labeled`, async () => {
        await render(puzzle, difficulty);
        expect(component.submitted).toBe(false);
        for (const key of Object.keys(labels)) {
          const position = Number(key);
          expect(circleEl(position).classList).toContain('correct');
          expect(circleEl(position).classList).toContain('locked');
          expect(inputEl(position).value).toBe(puzzle.letters[position - 1]);
          expect(inputEl(position).disabled).toBe(true);
          expect(inputEl(position).getAttribute('aria-label')).toBe(labels[position]);
        }
      });

      it(`${name}: non-locked circles have no label or locked class`, async () => {
        await render(puzzle, difficulty);
        for (const position of component.circles) {
          if (labels[position]) continue;
          expect(circleEl(position).classList).not.toContain('locked');
          expect(circleEl(position).classList).not.toContain('correct');
          expect(inputEl(position).hasAttribute('aria-label')).toBe(false);
          expect(inputEl(position).disabled).toBe(false);
        }
      });

      it(`${name}: corners stay locked and green after a reset`, async () => {
        await render(puzzle, difficulty);
        fixture.componentRef.setInput('resetCounter', 1);
        await settle();
        for (const key of Object.keys(labels)) {
          const position = Number(key);
          expect(circleEl(position).classList).toContain('correct');
          expect(inputEl(position).value).toBe(puzzle.letters[position - 1]);
        }
      });

      it(`${name}: a saved input never replaces a locked letter`, async () => {
        const stale = Object.fromEntries(Object.keys(labels).map(k => [k, 'Z']));
        fixture.componentRef.setInput('initialValues', stale);
        await render(puzzle, difficulty);
        for (const key of Object.keys(labels)) {
          const position = Number(key);
          expect(component.inputValues[position]).toBe(puzzle.letters[position - 1]);
          expect(inputEl(position).value).toBe(puzzle.letters[position - 1]);
        }
      });
    }

    for (const puzzle of [PUZZLE_5, PUZZLE_4]) {
      it(`${puzzle.size}-letter hard: no circle is locked, labeled, or green`, async () => {
        await render(puzzle, 'hard');
        for (const position of component.circles) {
          expect(component.isLocked(position)).toBe(false);
          expect(circleEl(position).classList).not.toContain('locked');
          expect(circleEl(position).classList).not.toContain('correct');
          expect(inputEl(position).hasAttribute('aria-label')).toBe(false);
        }
      });
    }
  });

  describe('stale letters on a puzzle change', () => {
    const CHANGES: { from: DifficultyPuzzleFixture; to: DifficultyPuzzleFixture }[] = [
      { from: PUZZLE_5, to: PUZZLE_5_DUP },
      { from: PUZZLE_5, to: PUZZLE_4 },
      { from: PUZZLE_4, to: PUZZLE_5 },
    ];

    for (const { from, to } of CHANGES) {
      it(`${from.wordOne} to ${to.wordOne}: emits and displays the current puzzle's locked letters`, async () => {
        await render(from, 'hard');
        const emitted = spyOn(component.valuesChanged, 'emit');
        const locked = lockedLettersFor(to, 'easy');

        fixture.componentRef.setInput('size', to.size);
        fixture.componentRef.setInput('letters', [...to.letters]);
        fixture.componentRef.setInput('lockedLetters', locked);
        fixture.componentRef.setInput('aggregatedCorrect', correctMap(Object.keys(locked).map(Number)));
        fixture.componentRef.setInput('resetCounter', 1);
        await settle();

        expect(emitted).toHaveBeenCalledTimes(1);
        const values = emitted.calls.mostRecent().args[0] as Record<number, string>;
        for (const key of Object.keys(locked)) {
          const position = Number(key);
          expect(values[position]).toBe(to.letters[position - 1]);
          expect(inputEl(position).value).toBe(to.letters[position - 1]);
        }
      });
    }
  });

  describe('arrow keys', () => {
    const ROWS: { puzzle: DifficultyPuzzleFixture; from: number; key: string; to: number }[] = [
      { puzzle: PUZZLE_5, from: 6, key: 'ArrowDown', to: 9 },
      { puzzle: PUZZLE_5, from: 9, key: 'ArrowLeft', to: 6 },
      { puzzle: PUZZLE_5, from: 2, key: 'ArrowUp', to: 3 },
      { puzzle: PUZZLE_5, from: 3, key: 'ArrowUp', to: 2 },
      { puzzle: PUZZLE_4, from: 4, key: 'ArrowDown', to: 7 },
      { puzzle: PUZZLE_4, from: 7, key: 'ArrowLeft', to: 4 },
      { puzzle: PUZZLE_4, from: 2, key: 'ArrowUp', to: 3 },
      { puzzle: PUZZLE_4, from: 3, key: 'ArrowUp', to: 2 },
    ];

    for (const { puzzle, from, key, to } of ROWS) {
      const name = `${puzzle.size}-letter ${from} ${key}`;

      it(`${name} skips the locked corner to ${to}`, async () => {
        await render(puzzle, 'easy');
        press(from, key);
        expect(document.activeElement).toBe(inputEl(to));
      });

      it(`${name}: focus stays when ${to} is disabled`, async () => {
        await render(puzzle, 'easy', [to]);
        press(from, key);
        expect(document.activeElement).toBe(inputEl(from));
      });

      it(`${name}: hard keeps focus at a disabled correct target`, async () => {
        const corner = key === 'ArrowUp' ? 1 : puzzle.size === 4 ? 6 : 8;
        await render(puzzle, 'hard', [corner]);
        press(from, key);
        expect(document.activeElement).toBe(inputEl(from));
      });
    }

    it('moves normally when the target is not locked', async () => {
      await render(PUZZLE_5, 'easy');
      press(4, 'ArrowUp');
      expect(document.activeElement).toBe(inputEl(2));
    });
  });

  describe('auto-advance and Backspace', () => {
    const CASES: {
      puzzle: DifficultyPuzzleFixture;
      advanceFrom: number;
      advanceTo: number;
      backFrom: number;
      backTo: number;
    }[] = [
      { puzzle: PUZZLE_5, advanceFrom: 2, advanceTo: 3, backFrom: 3, backTo: 2 },
      { puzzle: PUZZLE_4, advanceFrom: 2, advanceTo: 3, backFrom: 3, backTo: 2 },
    ];

    for (const { puzzle, advanceFrom, advanceTo, backFrom, backTo } of CASES) {
      it(`${puzzle.size}-letter: auto-advance skips the locked apex`, async () => {
        await render(puzzle, 'easy');
        typeInto(advanceFrom, 'X');
        expect(document.activeElement).toBe(inputEl(advanceTo));
      });

      it(`${puzzle.size}-letter: Backspace skips the locked apex`, async () => {
        await render(puzzle, 'easy');
        press(backFrom, 'Backspace');
        expect(document.activeElement).toBe(inputEl(backTo));
      });
    }

    it('5-letter: auto-advance from 12 skips locked 8', async () => {
      await render(PUZZLE_5, 'medium');
      typeInto(12, 'X');
      expect(document.activeElement).toBe(inputEl(9));
    });

    it('4-letter: auto-advance from 9 skips locked 6', async () => {
      await render(PUZZLE_4, 'medium');
      typeInto(9, 'X');
      expect(document.activeElement).toBe(inputEl(7));
    });

    it('5-letter: Backspace from 9 skips locked 8', async () => {
      await render(PUZZLE_5, 'medium');
      press(9, 'Backspace');
      expect(document.activeElement).toBe(inputEl(12));
    });

    it('4-letter: Backspace from 7 skips locked 6', async () => {
      await render(PUZZLE_4, 'medium');
      press(7, 'Backspace');
      expect(document.activeElement).toBe(inputEl(9));
    });

    for (const puzzle of [PUZZLE_5, PUZZLE_4]) {
      it(`${puzzle.size}-letter: locked inputs are out of the tab order because they are disabled`, async () => {
        await render(puzzle, 'easy');
        const enabled = Array.from(
          fixture.nativeElement.querySelectorAll('input:not(:disabled)') as NodeListOf<HTMLInputElement>,
        );
        for (const position of lockedPositionsFor('easy', puzzle.size)) {
          expect(enabled).not.toContain(inputEl(position));
        }
        expect(enabled.length).toBe(component.totalCircles - 2);
      });
    }
  });

  describe('all-wrong flash', () => {
    for (const puzzle of [PUZZLE_5, PUZZLE_4]) {
      it(`${puzzle.size}-letter: locked corners stay green and others turn red`, async () => {
        await render(puzzle, 'easy');
        fixture.componentRef.setInput('allWrong', true);
        fixture.detectChanges();

        const [corner, apex] = lockedPositionsFor('easy', puzzle.size);
        for (const position of [corner, apex, 2]) {
          circleEl(position).style.transition = 'none';
        }
        expect(getComputedStyle(circleEl(corner)).backgroundColor).toBe(GREEN);
        expect(getComputedStyle(circleEl(apex)).backgroundColor).toBe(GREEN);
        expect(getComputedStyle(circleEl(2)).backgroundColor).toBe(RED);
      });
    }
  });

  describe('fallback fetch', () => {
    for (const puzzle of [PUZZLE_5_DUP, PUZZLE_4]) {
      it(`a late today response leaves the ${puzzle.size}-letter parent puzzle unchanged`, async () => {
        const today = new Subject<GameData>();
        gameServiceSpy.getTodayGame.and.returnValue(today.asObservable());
        fixture.detectChanges();
        expect(gameServiceSpy.getTodayGame).toHaveBeenCalledTimes(1);

        await render(puzzle, 'easy');
        const lettersBefore = [...component.letterValues];
        const inputsBefore = { ...component.inputValues };

        today.next({ ...toGameData(PUZZLE_5), category: 'Late Today' });
        await settle();

        expect(component.letterValues).toEqual(lettersBefore);
        expect(component.category).toBe(puzzle.category);
        expect(component.inputValues).toEqual(inputsBefore);
      });
    }

    it('still applies the response when the parent has not supplied letters', async () => {
      const today = new Subject<GameData>();
      gameServiceSpy.getTodayGame.and.returnValue(today.asObservable());
      fixture.detectChanges();

      today.next(toGameData(PUZZLE_5));

      expect(component.letterValues).toEqual([...PUZZLE_5.letters]);
      expect(component.category).toBe(PUZZLE_5.category);
      // checkReadyState polls until letters exist, so end it for later tests.
      component.letters = [...PUZZLE_5.letters];
    });
  });

  describe('banner', () => {
    it('hides an empty banner and has no difficulty control', () => {
      fixture.componentRef.setInput('letters', [...PUZZLE_5.letters]);
      fixture.componentRef.setInput('category', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.category-banner')).toBeNull();

      fixture.componentRef.setInput('category', PUZZLE_5.category);
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector('.category-banner');
      expect(banner.querySelector('.banner-label').textContent).toBe('Category');
      expect(banner.querySelector('button')).toBeNull();
    });
  });
});
