import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DateState, Submission } from './state.service';
import { GameResult } from './stats.service';

@Injectable({ providedIn: 'root' })
export class CloudSyncService {
  constructor(private supabase: SupabaseService) {}

  private get db() {
    return this.supabase.client;
  }

  private get uid() {
    return this.supabase.userId;
  }

  upsertGameState(gameDate: string, state: DateState): void {
    if (!this.db || !this.uid) return;
    this.db.from('game_state').upsert({
      user_id: this.uid,
      game_date: gameDate,
      hints_used: state.hintsUsed,
      hinted_positions: state.hintedPositions,
      revealed: state.revealed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,game_date' }).then();
  }

  upsertInputValues(gameDate: string, values: Record<number, string>): void {
    if (!this.db || !this.uid) return;
    this.db.from('input_values').upsert({
      user_id: this.uid,
      game_date: gameDate,
      values,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,game_date' }).then();
  }

  upsertSubmissions(gameDate: string, submissions: Submission[]): void {
    if (!this.db || !this.uid) return;
    const dateSubmissions = submissions.filter(s => s.date === gameDate);
    if (dateSubmissions.length === 0) return;

    const rows = dateSubmissions.map(s => ({
      user_id: this.uid!,
      game_date: gameDate,
      values: s.values,
      validation: s.validation,
    }));

    // Replace all submissions for this date by deleting then inserting
    this.db.from('submissions')
      .delete()
      .eq('user_id', this.uid)
      .eq('game_date', gameDate)
      .then(() => {
        this.db!.from('submissions').insert(rows).then();
      });
  }

  upsertGameResult(result: GameResult): void {
    if (!this.db || !this.uid) return;
    this.db.from('game_results').upsert({
      user_id: this.uid,
      game_date: result.date,
      solved: result.solved,
      attempts: result.attempts,
      hints_used: result.hintsUsed,
      revealed: result.revealed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,game_date' }).then();
  }
}
