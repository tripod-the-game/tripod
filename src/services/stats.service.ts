import { Injectable } from '@angular/core';
import type { Difficulty } from './difficulty';

export interface GameResult {
  date: string;     // MMDDYY
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  revealed: boolean;
  // Absent on older results. Read through normalizeDifficulty.
  difficulty?: Difficulty;
}

export interface ComputedStats {
  totalPlayed: number;
  winPct: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<string, number>; // '1'–'6','7+' → count
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly KEY = 'tripod_stats';

  private readonly BACKUP_KEY = 'tripod_stats_backup';

  // Every stored entry, readable or not. Unparseable or non-array values read as
  // empty and are flagged so save() backs up the raw value before overwriting it.
  private read(): { items: unknown[]; raw: string | null; unreadable: boolean } {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(this.KEY);
      if (!raw) return { items: [], raw, unreadable: false };
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return { items: parsed, raw, unreadable: false };
    } catch { /* unparseable or storage unavailable */ }
    return { items: [], raw, unreadable: !!raw };
  }

  private isResult(entry: unknown): entry is GameResult {
    if (typeof entry !== 'object' || entry === null) return false;
    const date = (entry as { date?: unknown }).date;
    return typeof date === 'string' && date.length === 6;
  }

  private save(results: unknown[]): void {
    try {
      const { raw, unreadable } = this.read();
      if (unreadable && localStorage.getItem(this.BACKUP_KEY) === null) {
        try {
          localStorage.setItem(this.BACKUP_KEY, raw!);
        } catch {
          return; // keep the original as the only copy rather than overwrite it
        }
      }
      localStorage.setItem(this.KEY, JSON.stringify(results));
    } catch { /* storage full or unavailable */ }
  }

  getResults(): GameResult[] {
    return this.read().items.filter((r) => this.isResult(r));
  }

  // Writes back every stored entry, including ones it cannot read, so a save never deletes data.
  recordResult(result: GameResult): void {
    const results = this.read().items;
    const existing = results.findIndex(r => this.isResult(r) && r.date === result.date);
    if (existing !== -1) {
      results[existing] = result;
    } else {
      results.push(result);
    }
    this.save(results);
  }

  getComputedStats(): ComputedStats {
    const results = this.getResults();
    const totalPlayed = results.length;
    const won = results.filter(r => r.solved).length;
    const winPct = totalPlayed > 0 ? Math.round((won / totalPlayed) * 100) : 0;

    // Sort by date ascending (MMDDYY → parse to comparable value)
    const sorted = [...results].sort((a, b) => this.dateToSortKey(a.date) - this.dateToSortKey(b.date));

    let maxStreak = 0;
    let currentStreak = 0;
    let streak = 0;
    let prevKey: number | null = null;

    for (const r of sorted) {
      const key = this.dateToSortKey(r.date);
      if (r.solved) {
        if (prevKey !== null && key - prevKey === 1) {
          streak++;
        } else {
          streak = 1;
        }
        if (streak > maxStreak) maxStreak = streak;
      } else {
        streak = 0;
      }
      prevKey = key;
    }

    // Current streak: count backward from the most recent result
    currentStreak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const r = sorted[i];
      if (!r.solved) break;
      if (i < sorted.length - 1) {
        const prevSortKey = this.dateToSortKey(sorted[i + 1].date);
        const thisSortKey = this.dateToSortKey(r.date);
        if (prevSortKey - thisSortKey !== 1) break;
      }
      currentStreak++;
    }

    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7+': 0 };
    for (const r of results) {
      if (!r.solved) continue;
      const bucket = r.attempts <= 6 ? String(r.attempts) : '7+';
      distribution[bucket] = (distribution[bucket] ?? 0) + 1;
    }

    return { totalPlayed, winPct, currentStreak, maxStreak, distribution };
  }

  // Convert MMDDYY to a numeric day-index for consecutive-day arithmetic
  private dateToSortKey(mmddyy: string): number {
    const mm = parseInt(mmddyy.slice(0, 2), 10) - 1;
    const dd = parseInt(mmddyy.slice(2, 4), 10);
    const yy = 2000 + parseInt(mmddyy.slice(4, 6), 10);
    return Date.UTC(yy, mm, dd) / 86_400_000;
  }
}
