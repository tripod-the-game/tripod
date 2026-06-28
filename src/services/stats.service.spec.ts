import { TestBed } from '@angular/core/testing';
import { StatsService, GameResult } from './stats.service';

// Helper to build a GameResult with sensible defaults
function result(overrides: Partial<GameResult> & { date: string }): GameResult {
  return { solved: true, attempts: 1, hintsUsed: 0, revealed: false, ...overrides };
}

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [StatsService] });
    service = TestBed.inject(StatsService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── recordResult ─────────────────────────────────────────────────────────────

  describe('recordResult', () => {
    it('should persist a new result', () => {
      service.recordResult(result({ date: '010126' }));
      expect(service.getResults().length).toBe(1);
    });

    it('should overwrite an existing result for the same date', () => {
      service.recordResult(result({ date: '010126', attempts: 2 }));
      service.recordResult(result({ date: '010126', attempts: 5 }));
      const results = service.getResults();
      expect(results.length).toBe(1);
      expect(results[0].attempts).toBe(5);
    });

    it('should persist multiple results for different dates', () => {
      service.recordResult(result({ date: '010126' }));
      service.recordResult(result({ date: '010226' }));
      expect(service.getResults().length).toBe(2);
    });
  });

  // ── getComputedStats — totals ─────────────────────────────────────────────────

  describe('getComputedStats — totals', () => {
    it('should return zeros when no games played', () => {
      const stats = service.getComputedStats();
      expect(stats.totalPlayed).toBe(0);
      expect(stats.winPct).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.maxStreak).toBe(0);
    });

    it('should count all results in totalPlayed regardless of solved status', () => {
      service.recordResult(result({ date: '010126', solved: true }));
      service.recordResult(result({ date: '010226', solved: false }));
      expect(service.getComputedStats().totalPlayed).toBe(2);
    });

    it('should calculate win percentage correctly', () => {
      service.recordResult(result({ date: '010126', solved: true }));
      service.recordResult(result({ date: '010226', solved: true }));
      service.recordResult(result({ date: '010326', solved: false }));
      expect(service.getComputedStats().winPct).toBe(67);
    });

    it('should return 100% win rate when all games solved', () => {
      service.recordResult(result({ date: '010126', solved: true }));
      service.recordResult(result({ date: '010226', solved: true }));
      expect(service.getComputedStats().winPct).toBe(100);
    });

    it('should return 0% win rate when no games solved', () => {
      service.recordResult(result({ date: '010126', solved: false }));
      expect(service.getComputedStats().winPct).toBe(0);
    });
  });

  // ── getComputedStats — distribution ──────────────────────────────────────────

  describe('getComputedStats — distribution', () => {
    it('should initialise all buckets to 0 with no results', () => {
      const { distribution } = service.getComputedStats();
      expect(distribution).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7+': 0 });
    });

    it('should bucket attempts 1 through 6 individually', () => {
      ['010126', '010226', '010326', '010426', '010526', '010626'].forEach((date, i) => {
        service.recordResult(result({ date, attempts: i + 1 }));
      });
      const { distribution } = service.getComputedStats();
      expect(distribution['1']).toBe(1);
      expect(distribution['2']).toBe(1);
      expect(distribution['3']).toBe(1);
      expect(distribution['4']).toBe(1);
      expect(distribution['5']).toBe(1);
      expect(distribution['6']).toBe(1);
      expect(distribution['7+']).toBe(0);
    });

    it('should place attempts of exactly 7 into the 7+ bucket', () => {
      service.recordResult(result({ date: '010126', attempts: 7 }));
      expect(service.getComputedStats().distribution['7+']).toBe(1);
    });

    it('should place attempts greater than 7 into the 7+ bucket', () => {
      service.recordResult(result({ date: '010126', attempts: 15 }));
      expect(service.getComputedStats().distribution['7+']).toBe(1);
    });

    it('should not count losses in the distribution', () => {
      service.recordResult(result({ date: '010126', solved: false, attempts: 2 }));
      const { distribution } = service.getComputedStats();
      expect(Object.values(distribution).every(v => v === 0)).toBe(true);
    });

    it('should accumulate multiple results in the same bucket', () => {
      service.recordResult(result({ date: '010126', attempts: 3 }));
      service.recordResult(result({ date: '010226', attempts: 3 }));
      expect(service.getComputedStats().distribution['3']).toBe(2);
    });
  });

  // ── getComputedStats — streaks ────────────────────────────────────────────────

  describe('getComputedStats — streaks', () => {
    it('should count a single win as a streak of 1', () => {
      service.recordResult(result({ date: '010126' }));
      const { currentStreak, maxStreak } = service.getComputedStats();
      expect(currentStreak).toBe(1);
      expect(maxStreak).toBe(1);
    });

    it('should count consecutive daily wins as a streak', () => {
      service.recordResult(result({ date: '010126' }));
      service.recordResult(result({ date: '010226' }));
      service.recordResult(result({ date: '010326' }));
      expect(service.getComputedStats().currentStreak).toBe(3);
      expect(service.getComputedStats().maxStreak).toBe(3);
    });

    it('should break the streak on a loss', () => {
      service.recordResult(result({ date: '010126', solved: true }));
      service.recordResult(result({ date: '010226', solved: false }));
      service.recordResult(result({ date: '010326', solved: true }));
      expect(service.getComputedStats().currentStreak).toBe(1);
    });

    it('should break the streak when days are non-consecutive', () => {
      service.recordResult(result({ date: '010126' }));
      service.recordResult(result({ date: '010326' })); // skipped Jan 2
      expect(service.getComputedStats().currentStreak).toBe(1);
    });

    it('should return currentStreak of 0 when the most recent game was a loss', () => {
      service.recordResult(result({ date: '010126', solved: true }));
      service.recordResult(result({ date: '010226', solved: false }));
      expect(service.getComputedStats().currentStreak).toBe(0);
    });

    it('should track maxStreak independently of currentStreak', () => {
      // Win 3 days, then lose, then win 1
      service.recordResult(result({ date: '010126', solved: true }));
      service.recordResult(result({ date: '010226', solved: true }));
      service.recordResult(result({ date: '010326', solved: true }));
      service.recordResult(result({ date: '010426', solved: false }));
      service.recordResult(result({ date: '010526', solved: true }));
      const { currentStreak, maxStreak } = service.getComputedStats();
      expect(currentStreak).toBe(1);
      expect(maxStreak).toBe(3);
    });

    it('should handle results recorded out of date order', () => {
      service.recordResult(result({ date: '010326' }));
      service.recordResult(result({ date: '010126' }));
      service.recordResult(result({ date: '010226' }));
      expect(service.getComputedStats().currentStreak).toBe(3);
    });
  });
});
