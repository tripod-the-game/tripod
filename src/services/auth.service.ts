import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Session, User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session$ = new BehaviorSubject<Session | null>(null);
  readonly user$ = this.session$.pipe(map(s => s?.user ?? null));

  constructor(private supabase: SupabaseService) {
    this.supabase.client.auth.getSession().then(({ data }) => {
      this.session$.next(data.session);
    });
    this.supabase.client.auth.onAuthStateChange((_, session) => {
      this.session$.next(session);
    });
  }

  get currentUser(): User | null {
    return this.session$.value?.user ?? null;
  }

  get isAnonymous(): boolean {
    const user = this.currentUser;
    return user?.is_anonymous === true;
  }

  async signInAnonymously(): Promise<void> {
    const { error } = await this.supabase.client.auth.signInAnonymously();
    if (error) throw error;
  }

  async signUpWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signUp({ email, password });
    if (error) throw error;
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async signInWithApple(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const options: SignInWithAppleOptions = {
        clientId: 'com.tripod.app',
        redirectURI: window.location.origin,
        scopes: 'email name',
      };
      const { response } = await SignInWithApple.authorize(options);
      const { error } = await this.supabase.client.auth.signInWithIdToken({
        provider: 'apple',
        token: response.identityToken,
      });
      if (error) throw error;
    } else {
      const { error } = await this.supabase.client.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
  }

  async linkEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.updateUser({ email, password });
    if (error) throw error;
  }
}
