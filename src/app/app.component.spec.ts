import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { AppComponent } from './app.component';
import { LoaderService } from '../services/loader.service';

describe('AppComponent', () => {
  let loaderServiceSpy: jasmine.SpyObj<LoaderService>;
  let visibleSubject: import('rxjs').BehaviorSubject<boolean>;

  beforeEach(async () => {
    loaderServiceSpy = jasmine.createSpyObj('LoaderService', ['show', 'hide', 'showUntilReady', 'markReady']);
    // visible$ is an observable property, not a method — provide a simple BehaviorSubject
    const { BehaviorSubject } = await import('rxjs');
    visibleSubject = new BehaviorSubject<boolean>(false);
    Object.defineProperty(loaderServiceSpy, 'visible$', {
      get: () => visibleSubject.asObservable(),
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent, CommonModule],
      providers: [
        { provide: LoaderService, useValue: loaderServiceSpy },
        provideRouter([]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should start with showLoader true', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.showLoader).toBe(true);
  });

  it('should call showUntilReady(800) in ngAfterViewInit', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges(); // triggers ngOnInit + ngAfterViewInit
    expect(loaderServiceSpy.showUntilReady).toHaveBeenCalledWith(800);
  });

  it('should keep isFirstLoad true (guarding router events) until loader resolves', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    // isFirstLoad should still be true — ngAfterViewInit no longer sets it to false eagerly
    expect((app as any).isFirstLoad).toBe(true);
  });

  it('should set isReady to true when loader service emits false (initial load)', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    expect(app.isReady).toBe(false);
    visibleSubject.next(false); // simulate service resolving (data + timer done)
    expect(app.isReady).toBe(true);
    expect((app as any).isFirstLoad).toBe(false); // cleared after first hide
    tick(200); // flush showLoader fade timer
  }));

  it('should hide showLoader 200ms after loader service emits false', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    visibleSubject.next(false);
    expect(app.showLoader).toBe(true); // not yet
    tick(200);
    expect(app.showLoader).toBe(false);
  }));

  it('should show and hide content on subsequent visible$ emissions after initial load', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    visibleSubject.next(false); // complete initial load
    tick(200);

    // Simulate a date change: show then hide
    visibleSubject.next(true);
    expect(app.isReady).toBe(false);
    expect(app.showLoader).toBe(true);
    visibleSubject.next(false);
    expect(app.isReady).toBe(true);
    tick(200);
    expect(app.showLoader).toBe(false);
  }));
});
