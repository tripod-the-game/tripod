// Corrupted values for tripod_stats and tripod_submissions (issue #57).
// Shared by the unit specs and e2e/corrupt-storage.spec.ts.

// Valid JSON that is not an array. Each one is returned as-is by load() on origin/main.
export const NON_ARRAY_JSON: readonly string[] = ['{}', '42', 'null', '"text"', 'true'];

// Valid JSON, not an array, and distinctive enough that finding it under another key
// proves it was preserved (a bare '{}' can collide with tripod_inputs_<date>).
export const NON_ARRAY_STATS_RAW =
  '{"version":2,"results":[{"date":"030726","solved":true,"attempts":3,"hintsUsed":0,"revealed":false}]}';
export const NON_ARRAY_SUBMISSIONS_RAW =
  '{"version":2,"submissions":[{"date":"030726","values":{"1":"E"},"validation":{"1":"correct"}}]}';

// Invalid JSON: a real stats/submissions array cut off mid-write.
export const TRUNCATED_STATS_RAW =
  '[{"date":"030626","solved":true,"attempts":2,"hintsUsed":0,"revealed":false},{"date":"0307';
export const TRUNCATED_SUBMISSIONS_RAW =
  '[{"date":"030626","values":{"1":"E","2":"P"},"validation":{"1":"correct","2":"no';

export const UNREADABLE_STATS_RAW: readonly string[] = [NON_ARRAY_STATS_RAW, TRUNCATED_STATS_RAW];
export const UNREADABLE_SUBMISSIONS_RAW: readonly string[] = [NON_ARRAY_SUBMISSIONS_RAW, TRUNCATED_SUBMISSIONS_RAW];

// One readable result next to entries no result can have.
export const VALID_ENTRY = { date: '030826', solved: true, attempts: 2, hintsUsed: 0, revealed: false };
export const MALFORMED_STATS_ENTRIES: readonly { label: string; raw: string }[] = [
  { label: 'a null entry', raw: `[${JSON.stringify(VALID_ENTRY)},null]` },
  { label: 'an entry missing date', raw: `[${JSON.stringify(VALID_ENTRY)},{"solved":true,"attempts":1}]` },
  { label: 'an entry with a numeric date', raw: `[${JSON.stringify(VALID_ENTRY)},{"date":42,"solved":true,"attempts":1}]` },
  { label: 'a number entry', raw: `[${JSON.stringify(VALID_ENTRY)},1]` },
];

// Today in the specs, so a new win never collides with a stored date.
export const NEW_WIN = { date: '030926', solved: true, attempts: 1, hintsUsed: 0, revealed: false };

// True when the raw value survives under any tripod_* key except `rewrittenKey`.
export function isPreservedElsewhere(raw: string, rewrittenKey: string, storage: Storage = localStorage): boolean {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)!;
    if (key !== rewrittenKey && key.startsWith('tripod_') && storage.getItem(key) === raw) return true;
  }
  return false;
}
