import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, forkJoin, timer, race } from 'rxjs';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private showLoader$ = new BehaviorSubject<boolean>(false);
  private pendingDone$: Subject<void> | null = null;
  private readonly SAFE_MAX_MS = 10000;

  get visible$() {
    return this.showLoader$.asObservable();
  }

  show(durationMs: number = 500): void {
    this.pendingDone$?.complete(); // cancel any pending showUntilReady cycle
    this.pendingDone$ = null;
    this.showLoader$.next(true);
    setTimeout(() => {
      this.showLoader$.next(false);
    }, durationMs);
  }

  hide(): void {
    this.showLoader$.next(false);
  }

  showUntilReady(minMs: number): void {
    this.pendingDone$?.complete(); // cancel any previous pending cycle
    this.pendingDone$ = new Subject<void>();
    this.showLoader$.next(true);

    forkJoin([
      race(this.pendingDone$.pipe(take(1)), timer(this.SAFE_MAX_MS)),
      timer(minMs)
    ]).subscribe(() => {
      this.showLoader$.next(false);
      this.pendingDone$ = null;
    });
  }

  markReady(): void {
    this.pendingDone$?.next();
  }
}
