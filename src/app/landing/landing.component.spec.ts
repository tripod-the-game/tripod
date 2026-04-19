import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { LandingComponent } from './landing.component';
import { GameService, GameData } from '../../services/game.service';
import { LoaderService } from '../../services/loader.service';

const MOCK_GAME: GameData = {
  letters: ['E','P','A','A','R','R','T','G','R','A','P','H'],
  category: 'Test',
  wordOne: 'GRAPE',
  wordTwo: 'EARTH',
  wordThree: 'GRAPH',
  size: 5,
};

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;
  let gameServiceSpy: jasmine.SpyObj<GameService>;
  let loaderServiceSpy: jasmine.SpyObj<LoaderService>;

  beforeEach(async () => {
    gameServiceSpy = jasmine.createSpyObj('GameService', ['getGameForDate']);
    gameServiceSpy.getGameForDate.and.returnValue(of(MOCK_GAME));

    loaderServiceSpy = jasmine.createSpyObj('LoaderService', ['markReady', 'showUntilReady', 'show', 'hide']);

    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        { provide: GameService, useValue: gameServiceSpy },
        { provide: LoaderService, useValue: loaderServiceSpy },
        provideRouter([]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LandingComponent, { set: { imports: [CommonModule], schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call markReady() after preview game data loads', () => {
    fixture.detectChanges();
    expect(loaderServiceSpy.markReady).toHaveBeenCalled();
  });

  it('should call markReady() even when game data is invalid (fallback path)', () => {
    gameServiceSpy.getGameForDate.and.returnValue(of({
      letters: [],
      size: 5 as const,
      category: undefined,
      wordOne: '',
      wordTwo: '',
      wordThree: '',
    }));
    fixture.detectChanges();
    expect(loaderServiceSpy.markReady).toHaveBeenCalled();
  });

  it('should populate previewDisplayValues when game data is valid', () => {
    fixture.detectChanges();
    expect(Object.keys(component.previewDisplayValues).length).toBe(12);
    expect(component.previewDisplayValues[1]).toBe('E');
  });

  it('should use hardcoded fallback when game letters are missing', () => {
    gameServiceSpy.getGameForDate.and.returnValue(of({
      letters: [],
      size: 5 as const,
      category: undefined,
      wordOne: '',
      wordTwo: '',
      wordThree: '',
    }));
    fixture.detectChanges();
    expect(component.previewDisplayValues[1]).toBe('A');
    expect(component.previewCategory).toBe('Example');
  });
});
