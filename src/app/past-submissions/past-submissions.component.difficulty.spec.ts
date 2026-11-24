import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PastSubmissionsComponent } from './past-submissions.component';
import { GameService, ValidationState } from '../../services/game.service';
import {
  DifficultyPuzzleFixture,
  OLD_SUBMISSIONS,
  PUZZLE_4,
  PUZZLE_5,
} from '../../testing/difficulty.fixtures';

type StoredSubmission = {
  date?: string;
  values: Record<number, string>;
  validation: Record<number, ValidationState>;
};

const FEEDBACK_CLASSES = ['correct', 'wrong-position', 'present'] as const;

describe('PastSubmissionsComponent difficulty', () => {
  let fixture: ComponentFixture<PastSubmissionsComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PastSubmissionsComponent],
      providers: [
        {
          provide: GameService,
          useValue: { getTodayGame: () => of({ letters: [], size: 5, available: false }) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PastSubmissionsComponent);
  });

  afterEach(() => localStorage.clear());

  function render(puzzle: DifficultyPuzzleFixture, submissions: StoredSubmission[]): void {
    fixture.componentRef.setInput('letters', [...puzzle.letters]);
    fixture.componentRef.setInput('size', puzzle.size);
    fixture.componentRef.setInput('submissions', submissions);
    // Includes the development-mode no-changes pass, which guards against NG0100 (#62).
    fixture.detectChanges();
  }

  function feedbackFor(position: number): string[] {
    const circle: HTMLElement = fixture.nativeElement.querySelector(
      `.circle-input[data-index="${position - 1}"]`,
    );
    return FEEDBACK_CLASSES.filter((name) => circle.classList.contains(name));
  }

  const CASES = [
    { label: '5-letter Medium', puzzle: PUZZLE_5, locked: [8], guess: 2 },
    { label: '5-letter Easy', puzzle: PUZZLE_5, locked: [8, 1], guess: 2 },
    { label: '4-letter Medium', puzzle: PUZZLE_4, locked: [6], guess: 2 },
    { label: '4-letter Easy', puzzle: PUZZLE_4, locked: [6, 1], guess: 2 },
  ];

  CASES.forEach(({ label, puzzle, locked, guess }) => {
    it(`shows saved locked corners green on a ${label} submission`, () => {
      const values: Record<number, string> = { [guess]: 'Z' };
      const validation: Record<number, ValidationState> = { [guess]: 'none' };
      for (const pos of locked) {
        values[pos] = puzzle.letters[pos - 1];
        validation[pos] = 'correct';
      }

      render(puzzle, [{ date: '030826', values, validation }]);

      for (const pos of locked) {
        expect(feedbackFor(pos)).withContext(`locked position ${pos}`).toEqual(['correct']);
      }
      expect(feedbackFor(guess)).toEqual([]);
    });
  });

  it('renders an old-format submission with the same classes', () => {
    render(PUZZLE_5, [OLD_SUBMISSIONS[0] as StoredSubmission]);

    expect(feedbackFor(1)).toEqual(['correct']);
    expect(feedbackFor(8)).toEqual(['correct']);
    expect(feedbackFor(2)).toEqual([]);
    expect(fixture.nativeElement.querySelectorAll('.circle-input.locked').length).toBe(0);
  });

  it('keeps purple and yellow distinct on an old-format submission', () => {
    render(PUZZLE_5, [
      {
        date: '030826',
        values: { 1: 'E', 2: 'Q', 3: 'R' },
        validation: { 1: 'correct', 2: 'wrong-position', 3: 'present' },
      },
    ]);

    expect(feedbackFor(1)).toEqual(['correct']);
    expect(feedbackFor(2)).toEqual(['wrong-position']);
    expect(feedbackFor(3)).toEqual(['present']);
  });
});
