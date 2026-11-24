import { StateService, Submission } from './state.service';
import {
  NON_ARRAY_JSON,
  TRUNCATED_SUBMISSIONS_RAW,
  UNREADABLE_SUBMISSIONS_RAW,
  isPreservedElsewhere,
} from '../testing/corrupt-storage.fixtures';

const SUBMISSION: Submission = { date: '030926', values: { 1: 'E' }, validation: { 1: 'correct' } };

// Issue #57: corrupted tripod_submissions must load as a list and never be destroyed unpreserved.
describe('StateService with corrupted tripod_submissions', () => {
  const KEY = 'tripod_submissions';
  let service: StateService;

  beforeEach(() => {
    localStorage.clear();
    service = new StateService();
  });

  afterEach(() => localStorage.clear());

  NON_ARRAY_JSON.forEach((raw) => {
    it(`reads valid non-array JSON ${raw} as an empty list`, () => {
      localStorage.setItem(KEY, raw);
      expect(service.loadSubmissions()).toEqual([]);
    });
  });

  it('skips null entries so callers can read s.date', () => {
    localStorage.setItem(KEY, `[null,${JSON.stringify(SUBMISSION)}]`);
    expect(service.loadSubmissions()).toEqual([SUBMISSION]);
  });

  UNREADABLE_SUBMISSIONS_RAW.forEach((raw) => {
    it(`preserves the unreadable value ${raw.slice(0, 20)}… before saving over it`, () => {
      localStorage.setItem(KEY, raw);

      const submissions = service.loadSubmissions();
      service.saveSubmissions([...submissions, SUBMISSION]);

      expect(service.loadSubmissions()).toEqual([SUBMISSION]);
      expect(isPreservedElsewhere(raw, KEY)).withContext('original value kept under another tripod_* key').toBeTrue();
    });
  });

  it('keeps older submissions that have no date', () => {
    const undated = { values: { 1: 'E' }, validation: { 1: 'correct' } };
    localStorage.setItem(KEY, JSON.stringify([undated, null]));
    expect(service.loadSubmissions()).toEqual([undated as Submission]);
  });

  // Approved at the risk gate: one-time backup under tripod_submissions_backup.
  describe('backup of an unreadable value', () => {
    const BACKUP_KEY = 'tripod_submissions_backup';

    UNREADABLE_SUBMISSIONS_RAW.forEach((raw) => {
      it(`copies ${raw.slice(0, 20)}… to ${BACKUP_KEY} before the first save`, () => {
        localStorage.setItem(KEY, raw);

        service.saveSubmissions([SUBMISSION]);

        expect(localStorage.getItem(BACKUP_KEY)).toBe(raw);
      });

      it(`keeps the backup of ${raw.slice(0, 20)}… after a second save`, () => {
        localStorage.setItem(KEY, raw);

        service.saveSubmissions([SUBMISSION]);
        service.saveSubmissions([SUBMISSION, SUBMISSION]);

        expect(localStorage.getItem(BACKUP_KEY)).toBe(raw);
      });
    });

    it('does not replace an existing backup', () => {
      localStorage.setItem(BACKUP_KEY, 'earlier backup');
      localStorage.setItem(KEY, TRUNCATED_SUBMISSIONS_RAW);

      service.saveSubmissions([SUBMISSION]);

      expect(localStorage.getItem(BACKUP_KEY)).toBe('earlier backup');
      expect(service.loadSubmissions()).toEqual([SUBMISSION]);
    });

    it('never backs up a readable array', () => {
      localStorage.setItem(KEY, JSON.stringify([SUBMISSION]));

      service.saveSubmissions([SUBMISSION, SUBMISSION]);

      expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    });

    it('skips the save, without throwing, when the backup write fails', () => {
      localStorage.setItem(KEY, TRUNCATED_SUBMISSIONS_RAW);
      const realSetItem = localStorage.setItem.bind(localStorage);
      spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
        if (key === BACKUP_KEY) throw new DOMException('quota', 'QuotaExceededError');
        realSetItem(key, value);
      });

      expect(() => service.saveSubmissions([SUBMISSION])).not.toThrow();
      expect(localStorage.getItem(KEY)).toBe(TRUNCATED_SUBMISSIONS_RAW);
    });

    it('backs up a whitespace-only value before the first save', () => {
      localStorage.setItem(KEY, '   ');

      service.saveSubmissions([SUBMISSION]);

      expect(localStorage.getItem(BACKUP_KEY)).toBe('   ');
      expect(service.loadSubmissions()).toEqual([SUBMISSION]);
    });

    it('treats an empty string as missing and does not back it up', () => {
      localStorage.setItem(KEY, '');

      service.saveSubmissions([SUBMISSION]);

      expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
      expect(service.loadSubmissions()).toEqual([SUBMISSION]);
    });

    it('keeps the original and the backup when the main write fails, and a later save keeps the backup', () => {
      localStorage.setItem(KEY, TRUNCATED_SUBMISSIONS_RAW);
      const realSetItem = localStorage.setItem.bind(localStorage);
      let failMain = true;
      spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
        if (key === KEY && failMain) throw new DOMException('quota', 'QuotaExceededError');
        realSetItem(key, value);
      });

      expect(() => service.saveSubmissions([SUBMISSION])).not.toThrow();
      expect(localStorage.getItem(KEY)).toBe(TRUNCATED_SUBMISSIONS_RAW);
      expect(localStorage.getItem(BACKUP_KEY)).toBe(TRUNCATED_SUBMISSIONS_RAW);

      failMain = false;
      service.saveSubmissions([SUBMISSION]);

      expect(service.loadSubmissions()).toEqual([SUBMISSION]);
      expect(localStorage.getItem(BACKUP_KEY)).toBe(TRUNCATED_SUBMISSIONS_RAW);
    });
  });
});
