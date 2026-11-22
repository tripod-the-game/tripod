export type Difficulty = 'easy' | 'medium' | 'hard';
export type EasierDifficulty = Exclude<Difficulty, 'hard'>;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const APEX_POSITION = 1;
const BOTTOM_LEFT_POSITION: Record<4 | 5, number> = { 4: 6, 5: 8 };

// Saved values are untrusted, so only the three exact strings are accepted.
export function normalizeDifficulty(raw: unknown): Difficulty {
  return raw === 'easy' || raw === 'medium' || raw === 'hard' ? raw : 'hard';
}

export function lockedPositionsFor(difficulty: Difficulty, size: 4 | 5): number[] {
  if (difficulty === 'medium') return [BOTTOM_LEFT_POSITION[size]];
  if (difficulty === 'easy') return [BOTTOM_LEFT_POSITION[size], APEX_POSITION];
  return [];
}

// True only when `to` is strictly easier than `from` (hard < medium < easy).
export function isEasierMove(from: Difficulty, to: Difficulty): boolean {
  return (from === 'hard' && (to === 'medium' || to === 'easy')) || (from === 'medium' && to === 'easy');
}
