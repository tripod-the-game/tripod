import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private _client: SupabaseClient | null = null;
  private _userId: string | null = null;

  get client(): SupabaseClient | null {
    return this._client;
  }

  get userId(): string | null {
    return this._userId;
  }

  get isReady(): boolean {
    return this._client !== null && this._userId !== null;
  }

  async initialize(): Promise<void> {
    if (environment.supabaseAnonKey === 'SUPABASE_ANON_KEY_PLACEHOLDER') {
      return;
    }

    try {
      this._client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });

      const { data: { session } } = await this._client.auth.getSession();
      if (session?.user) {
        this._userId = session.user.id;
        return;
      }

      const { data, error } = await this._client.auth.signInAnonymously();
      if (!error && data.user) {
        this._userId = data.user.id;
      }
    } catch {
      // Supabase unavailable — app continues with localStorage only
      this._client = null;
      this._userId = null;
    }
  }
}
