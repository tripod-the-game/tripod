import { Component, OnInit, AfterViewInit, OnDestroy } from "@angular/core";
import { Router, RouterOutlet, NavigationStart, NavigationEnd } from "@angular/router";
import { CommonModule } from "@angular/common";
import { Capacitor } from "@capacitor/core";
import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { LoaderService } from "../services/loader.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div class="app-loader" [class.hidden]="!showLoader">
      <div class="app-loader-title">Tripod</div>
      <div class="app-loader-spinner"></div>
    </div>
    <div class="app-content" [class.ready]="isReady">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fff;
      z-index: 9999;
      opacity: 1;
      transition: opacity 0.2s ease-out;
    }
    .app-loader.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .app-loader-title {
      font-family: 'Baloo 2', sans-serif;
      font-size: 32px;
      font-weight: 700;
      color: #222;
      margin-bottom: 24px;
    }
    .app-loader-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #ddd;
      border-top-color: #333;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .app-content {
      opacity: 0;
    }
    .app-content.ready {
      opacity: 1;
      transition: opacity 0.2s ease-out;
    }
  `],
  styleUrl: "./app.component.scss",
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  showLoader = true;
  isReady = false;
  private isIOS = false;
  private isFirstLoad = true;
  private routerSub?: Subscription;
  private loaderSub?: Subscription;

  constructor(private router: Router, private loaderService: LoaderService) {}

  ngOnInit(): void {
    this.isIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

    // Add iOS-native class for platform-specific styles
    if (this.isIOS) {
      document.documentElement.classList.add('ios-native');
      // iOS: skip loader (splash screen handles it), show content immediately
      this.showLoader = false;
      this.isReady = true;
    }

    // Listen for loader service (used by game component for date changes)
    this.loaderSub = this.loaderService.visible$.subscribe(visible => {
      if (this.isFirstLoad) return;
      if (visible) {
        this.isReady = false;
        this.showLoader = true;
      } else {
        this.isReady = true;
        setTimeout(() => {
          this.showLoader = false;
        }, 200);
      }
    });

    // Listen for route changes to show loader during navigation
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationStart || event instanceof NavigationEnd)
    ).subscribe(event => {
      if (this.isFirstLoad) return; // Skip first load, handled separately

      if (event instanceof NavigationStart) {
        // Show loader and hide content during navigation
        this.isReady = false;
        this.showLoader = true;
      } else if (event instanceof NavigationEnd) {
        // After navigation completes, wait 500ms then reveal
        setTimeout(() => {
          this.isReady = true;
          setTimeout(() => {
            this.showLoader = false;
          }, 200);
        }, 500);
      }
    });
  }

  ngAfterViewInit(): void {
    // Fonts are already loaded via APP_INITIALIZER
    // For web: show content after a brief delay for loader visibility
    if (!this.isIOS) {
      setTimeout(() => {
        this.isReady = true;
        this.isFirstLoad = false;
        // Fade out loader after content is visible
        setTimeout(() => {
          this.showLoader = false;
        }, 200);
      }, 800);
    } else {
      this.isFirstLoad = false;
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.loaderSub?.unsubscribe();
  }
}
