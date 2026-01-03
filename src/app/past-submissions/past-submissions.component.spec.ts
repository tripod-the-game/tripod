import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastSubmissionsComponent } from './past-submissions.component';

describe('PastSubmissionsComponent', () => {
  let component: PastSubmissionsComponent;
  let fixture: ComponentFixture<PastSubmissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastSubmissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastSubmissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
