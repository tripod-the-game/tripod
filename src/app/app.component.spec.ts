import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { AppComponent } from './app.component';
import { LoaderService } from '../services/loader.service';

describe('AppComponent', () => {
  let loaderServiceSpy: jasmine.SpyObj<LoaderService>;

  beforeEach(async () => {
    loaderServiceSpy = jasmine.createSpyObj('LoaderService', ['show', 'hide']);
    // visible$ is an observable property, not a method — provide a simple BehaviorSubject
    const { BehaviorSubject } = await import('rxjs');
    const subject = new BehaviorSubject<boolean>(false);
    Object.defineProperty(loaderServiceSpy, 'visible$', {
      get: () => subject.asObservable(),
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

  it('should set isReady to true after ngAfterViewInit delay', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit + ngAfterViewInit
    expect(app.isReady).toBe(false);
    tick(800);
    expect(app.isReady).toBe(true);
    tick(200); // flush remaining timers
  }));
});
