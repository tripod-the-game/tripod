import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface GameResult {
  date: string;     // MMDDYY
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  revealed: boolean;
}

export interface ComputedStats {
  totalPlayed: number;
  winPct: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<string, number>; // '1','2','3','4','5+' → count
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly KEY = 'tripod_stats';

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
  ) {}

  private load(): GameResult[] {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(results: GameResult[]): void {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(results));
    } catch { /* storage full or unavailable */ }
  }

  getResults(): GameResult[] {
    return this.load();
  }

  recordResult(result: GameResult): void {
    const results = this.load();
    const existing = results.findIndex(r => r.date === result.date);
    if (existing !== -1) {
      results[existing] = result;
    } else {
      results.push(result);
    }
    this.save(results);
    this.pushResult(result);
  }

  getComputedStats(): ComputedStats {
    const results = this.load();
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

    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 };
    for (const r of results) {
      if (!r.solved) continue;
      const bucket = r.attempts <= 4 ? String(r.attempts) : '5+';
      distribution[bucket] = (distribution[bucket] ?? 0) + 1;
    }

    return { totalPlayed, winPct, currentStreak, maxStreak, distribution };
  }

  async syncFromRemote(): Promise<void> {
    const userId = this.auth.currentUser?.id;
    if (!userId) return;

    const { data } = await this.supabase.client
      .from('game_results')
      .select('*')
      .eq('user_id', userId);

    if (!data) return;

    const local = this.load();
    const localByDate = new Map(local.map(r => [r.date, r]));

    for (const row of data as any[]) {
      localByDate.set(row.date, {
        date: row.date,
        solved: row.solved,
        attempts: row.attempts,
        hintsUsed: row.hints_used,
        revealed: row.revealed,
      });
    }

    this.save(Array.from(localByDate.values()));
  }

  private pushResult(result: GameResult): void {
    const userId = this.auth.currentUser?.id;
    if (!userId) return;
    this.supabase.client.from('game_results').upsert({
      user_id: userId,
      date: result.date,
      solved: result.solved,
      attempts: result.attempts,
      hints_used: result.hintsUsed,
      revealed: result.revealed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' }).then();
  }

  // Convert MMDDYY to a numeric day-index for consecutive-day arithmetic
  private dateToSortKey(mmddyy: string): number {
    const mm = parseInt(mmddyy.slice(0, 2), 10) - 1;
    const dd = parseInt(mmddyy.slice(2, 4), 10);
    const yy = 2000 + parseInt(mmddyy.slice(4, 6), 10);
    return Math.floor(new Date(yy, mm, dd).getTime() / 86_400_000);
  }
}
