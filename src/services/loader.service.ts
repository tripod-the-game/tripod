import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, forkJoin, timer, race } from 'rxjs';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private showLoader$ = new BehaviorSubject<boolean>(false);
  private pendingDone$: Subject<void> | null = null;
  private cycle: Subscription | null = null;
  private readonly SAFE_MAX_MS = 10000;

  get visible$() {
    return this.showLoader$.asObservable();
  }

  show(durationMs: number = 500): void {
    this.cancelCycle();
    this.showLoader$.next(true);
    setTimeout(() => {
      this.showLoader$.next(false);
    }, durationMs);
  }

  hide(): void {
    this.showLoader$.next(false);
  }

  showUntilReady(minMs: number, maxMs: number = this.SAFE_MAX_MS): void {
    this.cancelCycle();
    this.pendingDone$ = new Subject<void>();
    this.showLoader$.next(true);

    this.cycle = forkJoin([
      race(this.pendingDone$.pipe(take(1)), timer(maxMs)),
      timer(minMs)
    ]).subscribe(() => {
      this.showLoader$.next(false);
      this.pendingDone$ = null;
      this.cycle = null;
    });
  }

  // Completing the subject alone cannot stop a cycle already waiting on its minimum timer.
  private cancelCycle(): void {
    this.cycle?.unsubscribe();
    this.cycle = null;
    this.pendingDone$?.complete();
    this.pendingDone$ = null;
  }

  markReady(): void {
    this.pendingDone$?.next();
  }
}
