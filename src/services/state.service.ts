import { Injectable } from '@angular/core';
import { ValidationState } from './game.service';
import type { EasierDifficulty } from './difficulty';

export interface Submission {
  date?: string;
  values: Record<number, string>;
  validation: Record<number, ValidationState>;
}

export interface DateState {
  hintsUsed: number;
  hintedPositions: number[];
  revealed: boolean;
  // Written only on an explicit move easier. Read through normalizeDifficulty.
  difficulty?: EasierDifficulty;
}

@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly SUBMISSIONS_KEY = 'tripod_submissions';

  private stateKey(date: string): string {
    return `tripod_state_${date}`;
  }

  private inputsKey(date: string): string {
    return `tripod_inputs_${date}`;
  }

  private readonly SUBMISSIONS_BACKUP_KEY = 'tripod_submissions_backup';

  // Unparseable or non-array values read as empty and are flagged so
  // saveSubmissions() backs up the raw value before overwriting it.
  private readSubmissions(): { items: unknown[]; raw: string | null; unreadable: boolean } {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(this.SUBMISSIONS_KEY);
      if (!raw) return { items: [], raw, unreadable: false };
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return { items: parsed, raw, unreadable: false };
    } catch { /* unparseable or storage unavailable */ }
    return { items: [], raw, unreadable: !!raw };
  }

  // Older submissions have no date, so only non-object entries (such as null) are skipped.
  loadSubmissions(): Submission[] {
    return this.readSubmissions().items.filter(
      (s): s is Submission => typeof s === 'object' && s !== null,
    );
  }

  saveSubmissions(submissions: Submission[]): void {
    try {
      const { raw, unreadable } = this.readSubmissions();
      if (unreadable && localStorage.getItem(this.SUBMISSIONS_BACKUP_KEY) === null) {
        try {
          localStorage.setItem(this.SUBMISSIONS_BACKUP_KEY, raw!);
        } catch {
          return; // keep the original as the only copy rather than overwrite it
        }
      }
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
}
