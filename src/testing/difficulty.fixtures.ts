// Shared difficulty test data. Pure data with type-only imports, so Karma and
// Playwright can both load it. Not reachable from src/main.ts.
import type { DateState, Submission } from '../services/state.service';

export interface DifficultyPuzzleFixture {
  readonly size: 4 | 5;
  readonly category: string;
  readonly wordOne: string;
  readonly wordTwo: string;
  readonly wordThree: string;
  // Index 0 is position 1.
  readonly letters: readonly string[];
}

// G and E appear only at corners.
export const PUZZLE_5: DifficultyPuzzleFixture = {
  size: 5,
  category: 'Test Five',
  wordOne: 'GRAPE',
  wordTwo: 'EARTH',
  wordThree: 'GRAPH',
  letters: ['E', 'P', 'A', 'A', 'R', 'R', 'T', 'G', 'R', 'A', 'P', 'H'],
};

// Apex A also appears at positions 4 and 10.
export const PUZZLE_5_DUP: DifficultyPuzzleFixture = {
  size: 5,
  category: 'Test Fruit',
  wordOne: 'GUAVA',
  wordTwo: 'APPLE',
  wordThree: 'GRAPE',
  letters: ['A', 'V', 'P', 'A', 'P', 'U', 'L', 'G', 'R', 'A', 'P', 'E'],
};

// C also appears at position 3, E only at the apex. CAVE in slot 3 gives purple.
export const PUZZLE_4: DifficultyPuzzleFixture = {
  size: 4,
  category: 'Test Four',
  wordOne: 'CAVE',
  wordTwo: 'ECHO',
  wordThree: 'CAMO',
  letters: ['E', 'V', 'C', 'A', 'H', 'C', 'A', 'M', 'O'],
};

// Raw game files in the existing published format. 5-letter files omit `size`.
export const RAW_GAME_JSON_5 =
  '{"category":"Test Five","wordOne":"GRAPE","wordTwo":"EARTH","wordThree":"GRAPH"}';
export const RAW_GAME_JSON_5_DUP =
  '{"category":"Test Fruit","wordOne":"GUAVA","wordTwo":"APPLE","wordThree":"GRAPE"}';
export const RAW_GAME_JSON_4 =
  '{"category":"Test Four","wordOne":"CAVE","wordTwo":"ECHO","wordThree":"CAMO","size":4}';

// Frozen pre-difficulty storage. Do not reformat: tests compare these byte for byte.
// Dates stay within the DST-safe ranges in plan section 4. 110226 is left free
// so tests can record a new result that extends the streak.
export const OLD_STATS_ENTRIES_RAW: readonly string[] = [
  '{"date":"030726","solved":true,"attempts":2,"hintsUsed":0,"revealed":false}',
  '{"date":"030826","solved":true,"attempts":3,"hintsUsed":1,"revealed":false}',
  '{"date":"030926","solved":true,"attempts":1,"hintsUsed":0,"revealed":false}',
  '{"date":"103126","solved":false,"attempts":4,"hintsUsed":3,"revealed":true}',
  '{"date":"110126","solved":true,"attempts":8,"hintsUsed":2,"revealed":false}',
];
export const OLD_STATS_RAW = `[${OLD_STATS_ENTRIES_RAW.join(',')}]`;
export const OLD_STATS_NEW_RESULT_DATE = '110226';

export const OLD_STATS_COMPUTED = {
  totalPlayed: 5,
  winPct: 80,
  currentStreak: 1,
  maxStreak: 3,
  distribution: { '1': 1, '2': 1, '3': 1, '4': 0, '5': 0, '6': 0, '7+': 1 },
} as const;

export const OLD_STATE_DATE = '030826';
export const OLD_STATE_RAW = '{"hintsUsed":1,"hintedPositions":[8],"revealed":false}';
export const OLD_STATE: DateState = { hintsUsed: 1, hintedPositions: [8], revealed: false };

// The second entry has no `date`, which the Submission type allows.
export const OLD_SUBMISSIONS_RAW =
  '[{"date":"030826","values":{"1":"E","2":"X","8":"G"},"validation":{"1":"correct","2":"none","8":"correct"}},' +
  '{"values":{"1":"A"},"validation":{"1":"present"}}]';
export const OLD_SUBMISSIONS: readonly Submission[] = [
  {
    date: '030826',
    values: { 1: 'E', 2: 'X', 8: 'G' },
    validation: { 1: 'correct', 2: 'none', 8: 'correct' },
  },
  { values: { 1: 'A' }, validation: { 1: 'present' } },
];
