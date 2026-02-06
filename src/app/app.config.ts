import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";

import { routes } from "./app.routes";

// Factory to wait for fonts before Angular renders
function waitForFonts(): () => Promise<void> {
  return () => (document.fonts?.ready ?? Promise.resolve()).then(() => {});
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    // register animations for Angular Material components (datepicker panel)
    provideAnimations(),
    // Block app bootstrap until fonts are loaded
    {
      provide: APP_INITIALIZER,
      useFactory: waitForFonts,
      multi: true,
    },
  ],
};
