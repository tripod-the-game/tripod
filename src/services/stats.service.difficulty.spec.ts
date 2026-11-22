import { TestBed } from '@angular/core/testing';
import { GameResult, StatsService } from './stats.service';
import { Difficulty, normalizeDifficulty } from './difficulty';
import {
  OLD_STATS_COMPUTED,
  OLD_STATS_ENTRIES_RAW,
  OLD_STATS_NEW_RESULT_DATE,
  OLD_STATS_RAW,
} from '../testing/difficulty.fixtures';

describe('StatsService difficulty compatibility', () => {
  const KEY = 'tripod_stats';
  let service: StatsService;

  const rawEntries = (): unknown[] => JSON.parse(localStorage.getItem(KEY)!);
  const win = (date: string, attempts: number, difficulty?: Difficulty): GameResult => ({
    date,
    solved: true,
    attempts,
    hintsUsed: 0,
    revealed: false,
    ...(difficulty ? { difficulty } : {}),
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [StatsService] });
    service = TestBed.inject(StatsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('old-format results', () => {
    beforeEach(() => localStorage.setItem(KEY, OLD_STATS_RAW));

    it('computes the same stats', () => {
      expect(service.getComputedStats()).toEqual({
        ...OLD_STATS_COMPUTED,
        distribution: { ...OLD_STATS_COMPUTED.distribution },
      });
    });

    it('reads every entry as Hard', () => {
      service.getResults().forEach((r) => expect(normalizeDifficulty(r.difficulty)).toBe('hard'));
    });

    it('does not write when read', () => {
      const setItem = spyOn(localStorage, 'setItem').and.callThrough();
      service.getResults();
      service.getComputedStats();
      expect(setItem).not.toHaveBeenCalled();
      expect(localStorage.getItem(KEY)).toBe(OLD_STATS_RAW);
    });

    it('keeps each old entry byte-equal after a new result', () => {
      service.recordResult(win(OLD_STATS_NEW_RESULT_DATE, 4, 'easy'));

      const entries = rawEntries();
      expect(entries.length).toBe(OLD_STATS_ENTRIES_RAW.length + 1);
      OLD_STATS_ENTRIES_RAW.forEach((expected, i) => {
        expect(JSON.stringify(entries[i])).toBe(expected);
      });
      expect((entries[entries.length - 1] as GameResult).difficulty).toBe('easy');
    });
  });

  describe('invalid stored difficulty', () => {
    const invalidValues: unknown[] = ['EASY', 1, null, {}, [], true, 'constructor'];

    invalidValues.forEach((value) => {
      it(`reads ${JSON.stringify(value)} as Hard and keeps it through another date's result`, () => {
        const entry = JSON.stringify({ ...win('030726', 2), difficulty: value });
        localStorage.setItem(KEY, `[${entry}]`);

        expect(() => service.getComputedStats()).not.toThrow();
        expect(normalizeDifficulty(service.getResults()[0].difficulty)).toBe('hard');

        service.recordResult(win('030826', 1, 'medium'));

        expect(JSON.stringify(rawEntries()[0])).toBe(entry);
        expect(service.getComputedStats().currentStreak).toBe(2);
      });
    });
  });

  it('stores the exact difficulty on new wins and losses, including hard', () => {
    service.recordResult(win('030726', 1, 'hard'));
    service.recordResult(win('030826', 1, 'medium'));
    service.recordResult({ ...win('030926', 2, 'easy'), solved: false, revealed: true });

    expect(service.getResults().map((r) => r.difficulty)).toEqual(['hard', 'medium', 'easy']);
  });

  describe('Easy and Medium wins match an identical Hard history', () => {
    const ranges: [string, string[]][] = [
      ['DST start', ['030726', '030826', '030926']],
      ['DST end', ['103126', '110126', '110226']],
    ];
    const attempts = [1, 6, 9];

    const statsFor = (dates: string[], difficulty: Difficulty) => {
      localStorage.clear();
      dates.forEach((date, i) => service.recordResult(win(date, attempts[i], difficulty)));
      return service.getComputedStats();
    };

    ranges.forEach(([name, dates]) => {
      (['easy', 'medium'] as const).forEach((difficulty) => {
        it(`${difficulty} across ${name}`, () => {
          const hard = statsFor(dates, 'hard');
          const easier = statsFor(dates, difficulty);

          expect(easier).toEqual(hard);
          expect(easier.totalPlayed).toBe(3);
          expect(easier.winPct).toBe(100);
          expect(easier.currentStreak).toBe(3);
          expect(easier.maxStreak).toBe(3);
          expect(easier.distribution['1']).toBe(1);
          expect(easier.distribution['6']).toBe(1);
          expect(easier.distribution['7+']).toBe(1);
        });
      });
    });

    it('counts a streak across mixed modes and old entries', () => {
      service.recordResult(win('030726', 2));
      service.recordResult(win('030826', 2, 'medium'));
      service.recordResult(win('030926', 2, 'easy'));

      const stats = service.getComputedStats();
      expect(stats.currentStreak).toBe(3);
      expect(stats.maxStreak).toBe(3);
      expect(stats.distribution['2']).toBe(3);
    });
  });
});
