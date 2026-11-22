import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { PastDateSelectorComponent } from './past-date-selector.component';
import { GameService } from '../../services/game.service';

const MOVED = new Date(2026, 2, 7);
const UNTOUCHED = new Date(2026, 2, 8);
const TODAY = new Date(2026, 2, 9);

describe('PastDateSelectorComponent difficulty status', () => {
  let component: PastDateSelectorComponent;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PastDateSelectorComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: GameService,
          useValue: {
            getAvailableDates: () => of([MOVED, UNTOUCHED, TODAY]),
            getTodayEST: () => TODAY,
          },
        },
      ],
    }).compileComponents();
    component = TestBed.createComponent(PastDateSelectorComponent).componentInstance;
  });

  afterEach(() => localStorage.clear());

  const classFor = (date: Date) => component.dateClassFn(date, 'month');

  it('shows no status for an untouched date', () => {
    component.ngOnInit();

    expect(classFor(UNTOUCHED)).toBe('');
    expect(classFor(MOVED)).toBe('');
  });

  (['easy', 'medium'] as const).forEach((difficulty) => {
    it(`marks only the moved date as started after a move to ${difficulty}`, () => {
      localStorage.setItem(
        'tripod_state_030726',
        JSON.stringify({ hintsUsed: 0, hintedPositions: [], revealed: false, difficulty }),
      );

      component.ngOnInit();

      expect(classFor(MOVED)).toBe('date-started');
      expect(classFor(UNTOUCHED)).toBe('');
      expect(classFor(TODAY)).toBe('');
    });
  });

  it('picks up a move made after init when the picker opens', () => {
    component.ngOnInit();
    localStorage.setItem(
      'tripod_state_030726',
      '{"hintsUsed":0,"hintedPositions":[],"revealed":false,"difficulty":"medium"}',
    );

    component.onPickerOpened();

    expect(classFor(MOVED)).toBe('date-started');
  });

  it('shows completed and revealed for results with a difficulty', () => {
    localStorage.setItem(
      'tripod_stats',
      JSON.stringify([
        { date: '030726', solved: true, attempts: 2, hintsUsed: 0, revealed: false, difficulty: 'easy' },
        { date: '030826', solved: false, attempts: 1, hintsUsed: 0, revealed: true, difficulty: 'medium' },
      ]),
    );

    component.ngOnInit();

    expect(classFor(MOVED)).toBe('date-completed');
    expect(classFor(UNTOUCHED)).toBe('date-revealed');
  });
});
