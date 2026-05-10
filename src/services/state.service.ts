import { Injectable } from '@angular/core';
import { ValidationState } from './game.service';
import { CloudSyncService } from './cloud-sync.service';

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

  constructor(private cloudSync: CloudSyncService) {}

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

    // Sync each date's submissions to cloud
    const dates = [...new Set(submissions.map(s => s.date).filter(Boolean))] as string[];
    for (const date of dates) {
      this.cloudSync.upsertSubmissions(date, submissions);
    }
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
    this.cloudSync.upsertGameState(date, state);
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
    this.cloudSync.upsertInputValues(date, values);
  }
}
