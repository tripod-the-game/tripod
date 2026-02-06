import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private showLoader$ = new BehaviorSubject<boolean>(false);

  get visible$() {
    return this.showLoader$.asObservable();
  }

  show(durationMs: number = 500): void {
    this.showLoader$.next(true);
    setTimeout(() => {
      this.showLoader$.next(false);
    }, durationMs);
  }

  hide(): void {
    this.showLoader$.next(false);
  }
}
