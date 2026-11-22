import {
  DIFFICULTY_LABELS,
  Difficulty,
  isEasierMove,
  lockedPositionsFor,
  normalizeDifficulty,
} from './difficulty';
import {
  DifficultyPuzzleFixture,
  PUZZLE_4,
  PUZZLE_5,
  PUZZLE_5_DUP,
  RAW_GAME_JSON_4,
  RAW_GAME_JSON_5,
  RAW_GAME_JSON_5_DUP,
} from '../testing/difficulty.fixtures';

describe('difficulty', () => {
  describe('normalizeDifficulty', () => {
    (['easy', 'medium', 'hard'] as const).forEach((value) => {
      it(`accepts '${value}'`, () => {
        expect(normalizeDifficulty(value)).toBe(value);
      });
    });

    const invalid: [string, unknown][] = [
      ['EASY', 'EASY'],
      ['1', 1],
      ['null', null],
      ['undefined', undefined],
      ['{}', {}],
      ['[]', []],
      ['true', true],
      ['constructor', 'constructor'],
      ['a padded string', ' easy '],
      ['an array holding a valid value', ['easy']],
      ['a String object', new String('easy')],
    ];
    invalid.forEach(([name, value]) => {
      it(`returns hard for ${name}`, () => {
        expect(normalizeDifficulty(value)).toBe('hard');
      });
    });
  });

  describe('lockedPositionsFor', () => {
    const cases: [Difficulty, 4 | 5, number[]][] = [
      ['hard', 5, []],
      ['medium', 5, [8]],
      ['easy', 5, [8, 1]],
      ['hard', 4, []],
      ['medium', 4, [6]],
      ['easy', 4, [6, 1]],
    ];
    cases.forEach(([difficulty, size, expected]) => {
      it(`${difficulty} on size ${size} locks [${expected}]`, () => {
        expect(lockedPositionsFor(difficulty, size)).toEqual(expected);
      });
    });

    it('returns a fresh array each call', () => {
      lockedPositionsFor('easy', 5).push(99);
      expect(lockedPositionsFor('easy', 5)).toEqual([8, 1]);
    });
  });

  describe('isEasierMove', () => {
    const cases: [Difficulty, Difficulty, boolean][] = [
      ['hard', 'hard', false],
      ['hard', 'medium', true],
      ['hard', 'easy', true],
      ['medium', 'hard', false],
      ['medium', 'medium', false],
      ['medium', 'easy', true],
      ['easy', 'hard', false],
      ['easy', 'medium', false],
      ['easy', 'easy', false],
    ];
    cases.forEach(([from, to, expected]) => {
      it(`${from} -> ${to} is ${expected}`, () => {
        expect(isEasierMove(from, to)).toBe(expected);
      });
    });

    it('rejects tampered values', () => {
      expect(isEasierMove('hard', 'constructor' as Difficulty)).toBe(false);
      expect(isEasierMove('constructor' as Difficulty, 'easy')).toBe(false);
    });
  });

  it('labels each mode', () => {
    expect(DIFFICULTY_LABELS).toEqual({ easy: 'Easy', medium: 'Medium', hard: 'Hard' });
  });

  describe('fixtures', () => {
    const paths = {
      5: { one: [8, 6, 4, 2, 1], two: [1, 3, 5, 7, 12], three: [8, 9, 10, 11, 12] },
      4: { one: [6, 4, 2, 1], two: [1, 3, 5, 9], three: [6, 7, 8, 9] },
    };
    const spell = (puzzle: DifficultyPuzzleFixture, positions: number[]) =>
      positions.map((p) => puzzle.letters[p - 1]).join('');

    const puzzles: [string, DifficultyPuzzleFixture, string][] = [
      ['PUZZLE_5', PUZZLE_5, RAW_GAME_JSON_5],
      ['PUZZLE_5_DUP', PUZZLE_5_DUP, RAW_GAME_JSON_5_DUP],
      ['PUZZLE_4', PUZZLE_4, RAW_GAME_JSON_4],
    ];
    puzzles.forEach(([name, puzzle, raw]) => {
      it(`${name} letters spell its words at the documented positions`, () => {
        const path = paths[puzzle.size];
        expect(puzzle.letters.length).toBe(puzzle.size === 5 ? 12 : 9);
        expect(spell(puzzle, path.one)).toBe(puzzle.wordOne);
        expect(spell(puzzle, path.two)).toBe(puzzle.wordTwo);
        expect(spell(puzzle, path.three)).toBe(puzzle.wordThree);
      });

      it(`${name} raw JSON matches and uses the published format`, () => {
        const parsed = JSON.parse(raw);
        expect(parsed.category).toBe(puzzle.category);
        expect(parsed.wordOne).toBe(puzzle.wordOne);
        expect(parsed.wordTwo).toBe(puzzle.wordTwo);
        expect(parsed.wordThree).toBe(puzzle.wordThree);
        expect(parsed.size).toBe(puzzle.size === 4 ? 4 : undefined);
      });
    });
  });
});
