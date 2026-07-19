import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';

import { PrivacyComponent } from './privacy.component';
import { LoaderService } from '../../services/loader.service';

describe('PrivacyComponent', () => {
  let component: PrivacyComponent;
  let fixture: ComponentFixture<PrivacyComponent>;
  let loaderServiceSpy: jasmine.SpyObj<LoaderService>;

  beforeEach(async () => {
    loaderServiceSpy = jasmine.createSpyObj('LoaderService', ['markReady']);

    await TestBed.configureTestingModule({
      imports: [PrivacyComponent],
      providers: [
        { provide: LoaderService, useValue: loaderServiceSpy },
        provideRouter([]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call markReady() immediately in ngOnInit', () => {
    fixture.detectChanges();
    expect(loaderServiceSpy.markReady).toHaveBeenCalled();
  });
});
