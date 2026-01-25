import { Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div class="app-loader" *ngIf="isLoading">
      <div class="app-loader-title">Tripod</div>
      <div class="app-loader-spinner"></div>
    </div>
    <router-outlet *ngIf="!isLoading"></router-outlet>
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
      background: #f5f5f5;
      z-index: 9999;
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
  `],
  styleUrl: "./app.component.scss",
})
export class AppComponent implements OnInit {
  isLoading = true;

  ngOnInit(): void {
    // Wait for both fonts to load AND minimum 500ms
    const minDelay = new Promise(resolve => setTimeout(resolve, 500));
    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    Promise.all([minDelay, fontsReady]).then(() => {
      this.isLoading = false;
    });
  }
}
