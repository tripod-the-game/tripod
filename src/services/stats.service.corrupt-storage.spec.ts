import { StatsService } from './stats.service';
import {
  MALFORMED_STATS_ENTRIES,
  NEW_WIN,
  NON_ARRAY_JSON,
  TRUNCATED_STATS_RAW,
  UNREADABLE_STATS_RAW,
  VALID_ENTRY,
  isPreservedElsewhere,
} from '../testing/corrupt-storage.fixtures';

// Issue #57: corrupted tripod_stats must never throw, block a win, or be destroyed unpreserved.
describe('StatsService with corrupted tripod_stats', () => {
  const KEY = 'tripod_stats';
  let service: StatsService;

  beforeEach(() => {
    localStorage.clear();
    service = new StatsService();
  });

  afterEach(() => localStorage.clear());

  NON_ARRAY_JSON.forEach((raw) => {
    describe(`holding valid non-array JSON ${raw}`, () => {
      beforeEach(() => localStorage.setItem(KEY, raw));

      it('reads as an empty list', () => {
        expect(service.getResults()).toEqual([]);
      });

      it('computes empty stats without throwing', () => {
        expect(() => service.getComputedStats()).not.toThrow();
        expect(service.getComputedStats().totalPlayed).toBe(0);
      });

      it('records a new win', () => {
        expect(() => service.recordResult(NEW_WIN)).not.toThrow();
        expect(service.getResults()).toEqual([NEW_WIN]);
      });
    });
  });

  UNREADABLE_STATS_RAW.forEach((raw) => {
    it(`preserves the unreadable value ${raw.slice(0, 20)}… before recording over it`, () => {
      localStorage.setItem(KEY, raw);

      service.recordResult(NEW_WIN);

      expect(service.getResults()).toEqual([NEW_WIN]);
      expect(isPreservedElsewhere(raw, KEY)).withContext('original value kept under another tripod_* key').toBeTrue();
    });

    it(`keeps the preserved copy of ${raw.slice(0, 20)}… after a second save`, () => {
      localStorage.setItem(KEY, raw);

      service.recordResult(NEW_WIN);
      service.recordResult({ ...NEW_WIN, attempts: 4 });

      expect(isPreservedElsewhere(raw, KEY)).toBeTrue();
    });
  });

  MALFORMED_STATS_ENTRIES.forEach(({ label, raw }) => {
    describe(`holding an array with ${label}`, () => {
      beforeEach(() => localStorage.setItem(KEY, raw));

      it('computes stats from the readable entries without throwing', () => {
        expect(() => service.getComputedStats()).not.toThrow();
        expect(service.getComputedStats().totalPlayed).toBe(1);
      });

      it('records a new win and keeps the readable entry', () => {
        expect(() => service.recordResult(NEW_WIN)).not.toThrow();
        const stored = JSON.parse(localStorage.getItem(KEY)!);
        expect(stored).toContain(jasmine.objectContaining(VALID_ENTRY));
        expect(stored).toContain(jasmine.objectContaining(NEW_WIN));
      });
    });
  });

  MALFORMED_STATS_ENTRIES.forEach(({ label, raw }) => {
    it(`writes back every original entry when recording over an array with ${label}`, () => {
      localStorage.setItem(KEY, raw);

      service.recordResult(NEW_WIN);

      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([...JSON.parse(raw), NEW_WIN]);
    });
  });

  // Approved at the risk gate: one-time backup under tripod_stats_backup.
  describe('backup of an unreadable value', () => {
    const BACKUP_KEY = 'tripod_stats_backup';

    UNREADABLE_STATS_RAW.forEach((raw) => {
      it(`copies ${raw.slice(0, 20)}… to ${BACKUP_KEY} before the first save`, () => {
        localStorage.setItem(KEY, raw);

        service.recordResult(NEW_WIN);

        expect(localStorage.getItem(BACKUP_KEY)).toBe(raw);
      });
    });

    it('does not replace an existing backup', () => {
      localStorage.setItem(BACKUP_KEY, 'earlier backup');
      localStorage.setItem(KEY, TRUNCATED_STATS_RAW);

      service.recordResult(NEW_WIN);

      expect(localStorage.getItem(BACKUP_KEY)).toBe('earlier backup');
      expect(service.getResults()).toEqual([NEW_WIN]);
    });

    it('never backs up a readable array', () => {
      localStorage.setItem(KEY, JSON.stringify([VALID_ENTRY]));

      service.recordResult(NEW_WIN);

      expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    });

    it('skips the save, without throwing, when the backup write fails', () => {
      localStorage.setItem(KEY, TRUNCATED_STATS_RAW);
      const realSetItem = localStorage.setItem.bind(localStorage);
      spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
        if (key === BACKUP_KEY) throw new DOMException('quota', 'QuotaExceededError');
        realSetItem(key, value);
      });

      expect(() => service.recordResult(NEW_WIN)).not.toThrow();
      expect(localStorage.getItem(KEY)).toBe(TRUNCATED_STATS_RAW);
    });

    it('backs up a whitespace-only value before the first save', () => {
      localStorage.setItem(KEY, '   ');

      service.recordResult(NEW_WIN);

      expect(localStorage.getItem(BACKUP_KEY)).toBe('   ');
      expect(service.getResults()).toEqual([NEW_WIN]);
    });

    it('treats an empty string as missing and does not back it up', () => {
      localStorage.setItem(KEY, '');

      service.recordResult(NEW_WIN);

      expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
      expect(service.getResults()).toEqual([NEW_WIN]);
    });

    it('keeps the original and the backup when the main write fails, and a later save keeps the backup', () => {
      localStorage.setItem(KEY, TRUNCATED_STATS_RAW);
      const realSetItem = localStorage.setItem.bind(localStorage);
      let failMain = true;
      spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
        if (key === KEY && failMain) throw new DOMException('quota', 'QuotaExceededError');
        realSetItem(key, value);
      });

      expect(() => service.recordResult(NEW_WIN)).not.toThrow();
      expect(localStorage.getItem(KEY)).toBe(TRUNCATED_STATS_RAW);
      expect(localStorage.getItem(BACKUP_KEY)).toBe(TRUNCATED_STATS_RAW);

      failMain = false;
      service.recordResult(NEW_WIN);

      expect(service.getResults()).toEqual([NEW_WIN]);
      expect(localStorage.getItem(BACKUP_KEY)).toBe(TRUNCATED_STATS_RAW);
    });
  });
});
