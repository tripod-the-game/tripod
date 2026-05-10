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

@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly SUBMISSIONS_KEY = 'tripod_submissions';

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
}
