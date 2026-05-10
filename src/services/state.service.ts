import { Injectable } from '@angular/core';
import { ValidationState } from './game.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface Submission {
  date?: string;
  values: Record<number, string>;
  validation: Record<number, ValidationState>;
}

export interface DateState {
  hintsUsed: number;
  hintedPositions: number[];
  revealed: boolean;
}

@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly SUBMISSIONS_KEY = 'tripod_submissions';

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
  ) {}

  private stateKey(date: string): string {
    return `tripod_state_${date}`;
  }

  private inputsKey(date: string): string {
    return `tripod_inputs_${date}`;
  }

  loadSubmissions(): Submission[] {
    try {
      const raw = localStorage.getItem(this.SUBMISSIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveSubmissions(submissions: Submission[]): void {
    try {
      localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch { /* storage full or unavailable */ }
    this.pushLatestSubmission(submissions);
  }

  loadDateState(date: string): DateState | null {
    try {
      const raw = localStorage.getItem(this.stateKey(date));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveDateState(date: string, state: DateState): void {
    try {
      localStorage.setItem(this.stateKey(date), JSON.stringify(state));
    } catch { /* storage full or unavailable */ }
    this.pushDateState(date, state);
  }

  loadInputValues(date: string): Record<number, string> {
    try {
      const raw = localStorage.getItem(this.inputsKey(date));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveInputValues(date: string, values: Record<number, string>): void {
    try {
      localStorage.setItem(this.inputsKey(date), JSON.stringify(values));
    } catch { /* storage full or unavailable */ }
    this.pushInputValues(date, values);
  }

  async syncFromRemote(): Promise<void> {
    const userId = this.auth.currentUser?.id;
    if (!userId) return;

    const [subResult, stateResult, inputResult] = await Promise.all([
      this.supabase.client.from('submissions').select('*').eq('user_id', userId),
      this.supabase.client.from('game_state').select('*').eq('user_id', userId),
      this.supabase.client.from('input_values').select('*').eq('user_id', userId),
    ]);

    if (subResult.data) {
      const remote: Submission[] = subResult.data.map((row: any) => ({
        date: row.date,
        values: row.values,
        validation: row.validation,
      }));
      const local = this.loadSubmissions();
      const merged = this.mergeSubmissions(local, remote);
      try {
        localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(merged));
      } catch { /* storage full */ }
    }

    if (stateResult.data) {
      for (const row of stateResult.data as any[]) {
        const state: DateState = {
          hintsUsed: row.hints_used,
          hintedPositions: row.hinted_positions,
          revealed: row.revealed,
        };
        try {
          localStorage.setItem(this.stateKey(row.date), JSON.stringify(state));
        } catch { /* storage full */ }
      }
    }

    if (inputResult.data) {
      for (const row of inputResult.data as any[]) {
        try {
          localStorage.setItem(this.inputsKey(row.date), JSON.stringify(row.values));
        } catch { /* storage full */ }
      }
    }
  }

  private mergeSubmissions(local: Submission[], remote: Submission[]): Submission[] {
    const merged = [...local];
    for (const r of remote) {
      const exists = merged.some(
        l => l.date === r.date && JSON.stringify(l.values) === JSON.stringify(r.values)
      );
      if (!exists) merged.push(r);
    }
    return merged;
  }

  private pushLatestSubmission(submissions: Submission[]): void {
    const userId = this.auth.currentUser?.id;
    if (!userId || submissions.length === 0) return;
    const s = submissions[submissions.length - 1];
    this.supabase.client.from('submissions').insert({
      user_id: userId,
      date: s.date ?? '',
      values: s.values,
      validation: s.validation,
    }).then();
  }

  private pushDateState(date: string, state: DateState): void {
    const userId = this.auth.currentUser?.id;
    if (!userId) return;
    this.supabase.client.from('game_state').upsert({
      user_id: userId,
      date,
      hints_used: state.hintsUsed,
      hinted_positions: state.hintedPositions,
      revealed: state.revealed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' }).then();
  }

  private pushInputValues(date: string, values: Record<number, string>): void {
    const userId = this.auth.currentUser?.id;
    if (!userId) return;
    this.supabase.client.from('input_values').upsert({
      user_id: userId,
      date,
      values,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' }).then();
  }
}
