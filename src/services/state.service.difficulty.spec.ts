import { TestBed } from '@angular/core/testing';
import { DateState, StateService } from './state.service';
import { normalizeDifficulty } from './difficulty';
import {
  OLD_STATE,
  OLD_STATE_DATE,
  OLD_STATE_RAW,
  OLD_SUBMISSIONS,
  OLD_SUBMISSIONS_RAW,
} from '../testing/difficulty.fixtures';

describe('StateService difficulty compatibility', () => {
  const stateKey = `tripod_state_${OLD_STATE_DATE}`;
  let service: StateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [StateService] });
    service = TestBed.inject(StateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads old-format date state as Hard with its fields intact', () => {
    localStorage.setItem(stateKey, OLD_STATE_RAW);
    const loaded = service.loadDateState(OLD_STATE_DATE);
    expect(loaded).toEqual(OLD_STATE);
    expect(normalizeDifficulty(loaded?.difficulty)).toBe('hard');
  });

  it('does not rewrite old-format date state on load', () => {
    localStorage.setItem(stateKey, OLD_STATE_RAW);
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    service.loadDateState(OLD_STATE_DATE);
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(stateKey)).toBe(OLD_STATE_RAW);
  });

  it('re-saves old-format date state with the same content and no difficulty', () => {
    localStorage.setItem(stateKey, OLD_STATE_RAW);
    service.saveDateState(OLD_STATE_DATE, service.loadDateState(OLD_STATE_DATE)!);
    expect(localStorage.getItem(stateKey)).toBe(OLD_STATE_RAW);
  });

  it('loads and re-saves old-format submissions with the same content', () => {
    localStorage.setItem('tripod_submissions', OLD_SUBMISSIONS_RAW);
    const loaded = service.loadSubmissions();
    expect(loaded).toEqual([...OLD_SUBMISSIONS]);
    service.saveSubmissions(loaded);
    expect(localStorage.getItem('tripod_submissions')).toBe(OLD_SUBMISSIONS_RAW);
  });

  it('round-trips a valid saved difficulty', () => {
    const state: DateState = { hintsUsed: 0, hintedPositions: [], revealed: false, difficulty: 'medium' };
    service.saveDateState(OLD_STATE_DATE, state);
    expect(service.loadDateState(OLD_STATE_DATE)?.difficulty).toBe('medium');
  });

  const invalidRawValues = ['"EASY"', '1', 'null', '{}', '[]', 'true', '"constructor"', '"hard"'];
  invalidRawValues.forEach((rawValue) => {
    it(`reads stored difficulty ${rawValue} as Hard and keeps it through a normal save`, () => {
      const raw = `{"hintsUsed":2,"hintedPositions":[3,5],"revealed":false,"difficulty":${rawValue}}`;
      localStorage.setItem(stateKey, raw);

      const loaded = service.loadDateState(OLD_STATE_DATE)!;
      expect(normalizeDifficulty(loaded.difficulty)).toBe('hard');

      service.saveDateState(OLD_STATE_DATE, loaded);
      expect(localStorage.getItem(stateKey)).toBe(raw);
    });
  });
});
