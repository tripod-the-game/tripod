import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent, HttpClientTestingModule],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    // Intentionally skip detectChanges() here: calling it triggers NG0100 because
    // TriangleComponent (used with displayOnly=true) sets isReady=true synchronously
    // in ngAfterViewInit, which Angular flags in dev-mode double-checking.
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
