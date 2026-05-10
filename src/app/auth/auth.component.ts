import { Component, EventEmitter, Output, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { StateService } from '../../services/state.service';
import { StatsService } from '../../services/stats.service';

type AuthView = 'menu' | 'sign-in' | 'sign-up' | 'upgrade';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  view: AuthView = 'menu';
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    readonly authService: AuthService,
    private stateService: StateService,
    private statsService: StatsService,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAnonymous) {
      this.view = 'upgrade';
    }
  }

  switchTo(view: AuthView): void {
    this.view = view;
    this.errorMessage = '';
    this.email = '';
    this.password = '';
  }

  async onPlayAsGuest(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.authService.signInAnonymously();
      this.close.emit();
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Sign-in failed';
    } finally {
      this.loading = false;
    }
  }

  async onSignIn(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.authService.signInWithEmail(this.email, this.password);
      await this.syncAfterSignIn();
      this.close.emit();
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Sign-in failed';
    } finally {
      this.loading = false;
    }
  }

  async onSignUp(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.authService.signUpWithEmail(this.email, this.password);
      await this.syncAfterSignIn();
      this.close.emit();
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Sign-up failed';
    } finally {
      this.loading = false;
    }
  }

  async onSignInWithGoogle(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.authService.signInWithGoogle();
      // OAuth redirect — page will reload, sync happens in GameComponent.ngOnInit
    } catch (e: any) {
      this.loading = false;
      this.errorMessage = e?.message ?? 'Google sign-in failed';
    }
  }

  async onSignInWithApple(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.authService.signInWithApple();
      await this.syncAfterSignIn();
      this.close.emit();
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Apple sign-in failed';
    } finally {
      this.loading = false;
    }
  }

  async onLinkEmail(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.authService.linkEmail(this.email, this.password);
      await this.syncAfterSignIn();
      this.close.emit();
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Account upgrade failed';
    } finally {
      this.loading = false;
    }
  }

  async onSignOut(): Promise<void> {
    this.loading = true;
    try {
      await this.authService.signOut();
      this.close.emit();
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Sign-out failed';
    } finally {
      this.loading = false;
    }
  }

  private async syncAfterSignIn(): Promise<void> {
    await Promise.all([
      this.stateService.syncFromRemote(),
      this.statsService.syncFromRemote(),
    ]);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.close.emit();
  }
}
