import { Injectable } from '@angular/core';
import { ValidationState } from './game.service';

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

// Outcome of a finished pack puzzle. Kept apart from tripod_stats so packs
// never affect daily win % or streaks.
export interface PackResult {
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  revealed: boolean;
}

@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly SUBMISSIONS_KEY = 'tripod_submissions';
  private readonly PACK_RESULTS_KEY = 'tripod_pack_results';

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
  }

  loadPackResults(): Record<string, PackResult> {
    try {
      const raw = localStorage.getItem(this.PACK_RESULTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  savePackResult(gameKey: string, result: PackResult): void {
    const results = this.loadPackResults();
    results[gameKey] = result;
    try {
      localStorage.setItem(this.PACK_RESULTS_KEY, JSON.stringify(results));
    } catch { /* storage full or unavailable */ }
  }

  // Wipes everything stored for the given game keys (results, hints,
  // in-progress inputs, submissions) so a pack can be replayed from scratch.
  clearGames(gameKeys: string[]): void {
    const keys = new Set(gameKeys);
    const results = this.loadPackResults();
    keys.forEach(k => delete results[k]);
    try {
      localStorage.setItem(this.PACK_RESULTS_KEY, JSON.stringify(results));
      keys.forEach(k => {
        localStorage.removeItem(this.stateKey(k));
        localStorage.removeItem(this.inputsKey(k));
      });
    } catch { /* storage unavailable */ }
    this.saveSubmissions(this.loadSubmissions().filter(s => !s.date || !keys.has(s.date)));
  }
}
