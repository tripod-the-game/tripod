import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GameService, GameData } from './game.service';

const BASE_URL = 'https://raw.githubusercontent.com/tripod-the-game/tripod-games/main';

describe('GameService', () => {
  let service: GameService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GameService],
    });
    service = TestBed.inject(GameService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ── URL helpers ─────────────────────────────────────────────────────────────

  describe('getTodayGame', () => {
    it('should fetch from a URL matching today\'s date', () => {
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      const yyyy = String(d.getFullYear());
      const expectedUrl = `${BASE_URL}/${yyyy}/${mm}/${mm}${dd}${yy}.json`;

      service.getTodayGame().subscribe();

      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('getGameForDate', () => {
    it('should fetch from the correct URL for the given date', () => {
      const date = new Date(2026, 0, 27); // Jan 27 2026
      service.getGameForDate(date).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/2026/01/012726.json`);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should build correct path for single-digit month and day', () => {
      const date = new Date(2026, 2, 1); // Mar 1 2026
      service.getGameForDate(date).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/2026/03/030126.json`);
      req.flush({});
    });
  });

  // ── 5-letter letter generation ───────────────────────────────────────────────

  describe('5-letter letter generation', () => {
    function getLetters(wordOne: string, wordTwo: string, wordThree: string): string[] {
      let letters: string[] = [];
      service.getGameForDate(new Date(2026, 0, 27)).subscribe(g => (letters = g.letters));
      httpMock.expectOne(req => req.url.endsWith('.json')).flush({ wordOne, wordTwo, wordThree });
      return letters;
    }

    // GRAPE / EARTH / GRAPH — valid 5-letter puzzle
    // pos 0: GRAPE[4]=E, pos 1: GRAPE[3]=P, pos 2: EARTH[1]=A
    // pos 3: GRAPE[2]=A, pos 4: EARTH[2]=R, pos 5: GRAPE[1]=R
    // pos 6: EARTH[3]=T, pos 7: GRAPE[0]=G, pos 8: GRAPH[1]=R
    // pos 9: GRAPH[2]=A, pos 10: GRAPH[3]=P, pos 11: EARTH[4]=H

    it('should produce 12 letters', () => {
      expect(getLetters('GRAPE', 'EARTH', 'GRAPH').length).toBe(12);
    });

    it('pos 0: last letter of wordOne (shared apex with wordTwo[0])', () => {
      expect(getLetters('GRAPE', 'EARTH', 'GRAPH')[0]).toBe('E');
    });

    it('pos 7: first letter of wordOne (shared bottom-left with wordThree[0])', () => {
      expect(getLetters('GRAPE', 'EARTH', 'GRAPH')[7]).toBe('G');
    });

    it('pos 11: last letter of wordTwo (shared bottom-right with wordThree[4])', () => {
      expect(getLetters('GRAPE', 'EARTH', 'GRAPH')[11]).toBe('H');
    });

    it('should produce the correct full 12-element array for GRAPE/EARTH/GRAPH', () => {
      const letters = getLetters('GRAPE', 'EARTH', 'GRAPH');
      expect(letters).toEqual(['E', 'P', 'A', 'A', 'R', 'R', 'T', 'G', 'R', 'A', 'P', 'H']);
    });

    it('should uppercase all letters', () => {
      const letters = getLetters('grape', 'earth', 'graph');
      expect(letters.every(l => l === l.toUpperCase())).toBe(true);
    });

    it('should infer size 5 when words are 5 letters and size not provided', () => {
      let result: GameData | undefined;
      service.getGameForDate(new Date(2026, 0, 27)).subscribe(g => (result = g));
      httpMock.expectOne(req => req.url.endsWith('.json')).flush({ wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' });
      expect(result!.size).toBe(5);
    });
  });

  // ── 4-letter letter generation ───────────────────────────────────────────────

  describe('4-letter letter generation', () => {
    function getLetters4(wordOne: string, wordTwo: string, wordThree: string): string[] {
      let letters: string[] = [];
      service.getGameForDate(new Date(2026, 0, 27)).subscribe(g => (letters = g.letters));
      httpMock.expectOne(req => req.url.endsWith('.json')).flush({ wordOne, wordTwo, wordThree, size: 4 });
      return letters;
    }

    // CAVE / ECHO / COOK — valid 4-letter puzzle
    // CAVE[0]=C = COOK[0]=C ✓, CAVE[3]=E = ECHO[0]=E ✓, ECHO[3]=O = COOK[3]=K ✗
    // Let's use CAVE / ECHO / CAVE for simplicity (wordThree matches wordOne)
    // pos 0: CAVE[3]=E, pos 1: CAVE[2]=V, pos 2: ECHO[1]=C
    // pos 3: CAVE[1]=A, pos 4: ECHO[2]=H, pos 5: CAVE[0]=C
    // pos 6: CAVE[1]=A, pos 7: CAVE[2]=V, pos 8: ECHO[3]=O

    it('should produce 9 letters for size 4', () => {
      expect(getLetters4('CAVE', 'ECHO', 'CAVE').length).toBe(9);
    });

    it('pos 0: last letter of wordOne (shared apex with wordTwo[0])', () => {
      // CAVE[3]=E, ECHO[0]=E
      expect(getLetters4('CAVE', 'ECHO', 'CAVE')[0]).toBe('E');
    });

    it('pos 5: first letter of wordOne (shared bottom-left with wordThree[0])', () => {
      // CAVE[0]=C
      expect(getLetters4('CAVE', 'ECHO', 'CAVE')[5]).toBe('C');
    });

    it('pos 8: last letter of wordTwo (shared bottom-right with wordThree[3])', () => {
      // ECHO[3]=O
      expect(getLetters4('CAVE', 'ECHO', 'CAVE')[8]).toBe('O');
    });

    it('should produce the correct full 9-element array for CAVE/ECHO/CAVE', () => {
      const letters = getLetters4('CAVE', 'ECHO', 'CAVE');
      expect(letters).toEqual(['E', 'V', 'C', 'A', 'H', 'C', 'A', 'V', 'O']);
    });

    it('should infer size 4 when all three words are 4 letters', () => {
      let result: GameData | undefined;
      service.getGameForDate(new Date(2026, 0, 27)).subscribe(g => (result = g));
      httpMock.expectOne(req => req.url.endsWith('.json')).flush({ wordOne: 'CAVE', wordTwo: 'ECHO', wordThree: 'CAVE' });
      expect(result!.size).toBe(4);
    });
  });

  // ── parseGameResponse ────────────────────────────────────────────────────────

  describe('parseGameResponse', () => {
    function fetch(body: any): GameData {
      let result!: GameData;
      service.getGameForDate(new Date(2026, 0, 27)).subscribe(g => (result = g));
      httpMock.expectOne(req => req.url.endsWith('.json')).flush(body);
      return result;
    }

    it('should return empty letters array when no words or gameArray provided', () => {
      const result = fetch({});
      expect(result.letters).toEqual([]);
    });

    it('should use provided gameArray when its length matches expected size', () => {
      const gameArray = Array(12).fill('A');
      const result = fetch({ gameArray });
      expect(result.letters).toEqual(Array(12).fill('A'));
    });

    it('should prefer gameArray over word-based generation', () => {
      const gameArray = Array(12).fill('Z');
      const result = fetch({ gameArray, wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' });
      expect(result.letters).toEqual(Array(12).fill('Z'));
    });

    it('should include category, wordOne, wordTwo, wordThree in result', () => {
      const result = fetch({ wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH', category: 'Nature' });
      expect(result.wordOne).toBe('GRAPE');
      expect(result.wordTwo).toBe('EARTH');
      expect(result.wordThree).toBe('GRAPH');
      expect(result.category).toBe('Nature');
    });

    it('should explicitly use provided size field', () => {
      const result = fetch({ wordOne: 'CAVE', wordTwo: 'ECHO', wordThree: 'CAVE', size: 4 });
      expect(result.size).toBe(4);
    });

    it('should handle gameArray via nested game object', () => {
      const gameArray = Array(12).fill('B');
      const result = fetch({ game: { gameArray, wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH', category: 'Nested' } });
      expect(result.letters).toEqual(Array(12).fill('B'));
      expect(result.category).toBe('Nested');
    });
  });

  // ── Cache behavior ───────────────────────────────────────────────────────────

  describe('caching', () => {
    const date = new Date(2026, 0, 27); // Jan 27 2026 → cacheKey: tripod_game_games_2026_01_012726

    it('should store response in localStorage after a successful fetch', () => {
      service.getGameForDate(date).subscribe();
      httpMock.expectOne(req => req.url.endsWith('.json')).flush({ wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' });

      let hasCacheEntry = false;
      for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i)!.startsWith('tripod_game_')) {
          hasCacheEntry = true;
        }
      }
      expect(hasCacheEntry).toBe(true);
    });

    it('should fall back to cached data when the HTTP request fails', () => {
      const cacheKey = 'tripod_game_games_2026_01_012726';
      localStorage.setItem(cacheKey, JSON.stringify({ wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH', category: 'Cached' }));

      let result: GameData | undefined;
      service.getGameForDate(date).subscribe(g => (result = g));
      httpMock.expectOne(req => req.url.endsWith('.json')).error(new ErrorEvent('Network error'));

      expect(result!.category).toBe('Cached');
    });

    it('should return empty game when HTTP fails and no cache exists', () => {
      let result: GameData | undefined;
      service.getGameForDate(date).subscribe(g => (result = g));
      httpMock.expectOne(req => req.url.endsWith('.json')).error(new ErrorEvent('Network error'));

      expect(result!.letters).toEqual([]);
    });
  });

  // ── getAvailableDates ────────────────────────────────────────────────────────

  describe('getAvailableDates', () => {
    const indexUrl = `${BASE_URL}/index.json`;

    it('should parse valid MMDDYY strings into Date objects', () => {
      let dates: Date[] = [];
      service.getAvailableDates().subscribe(d => (dates = d));
      httpMock.expectOne(indexUrl).flush(['010126', '020126']);

      expect(dates.length).toBe(2);
      expect(dates[0].getFullYear()).toBe(2026);
      expect(dates[0].getMonth()).toBe(0); // January
      expect(dates[0].getDate()).toBe(1);
      expect(dates[1].getMonth()).toBe(1); // February
      expect(dates[1].getDate()).toBe(1);
    });

    it('should filter out invalid entries (wrong length, null, empty)', () => {
      let dates: Date[] = [];
      service.getAvailableDates().subscribe(d => (dates = d));
      httpMock.expectOne(indexUrl).flush(['010126', 'short', '', '1234567', null]);

      expect(dates.length).toBe(1);
      expect(dates[0].getMonth()).toBe(0);
    });

    it('should fall back to cached index when HTTP fails', () => {
      localStorage.setItem('tripod_games_index', JSON.stringify(['030126']));

      let dates: Date[] = [];
      service.getAvailableDates().subscribe(d => (dates = d));
      httpMock.expectOne(indexUrl).error(new ErrorEvent('Network error'));

      expect(dates.length).toBe(1);
      expect(dates[0].getMonth()).toBe(2); // March
      expect(dates[0].getDate()).toBe(1);
    });

    it('should return empty array when HTTP fails and no cache', () => {
      let dates: Date[] = [];
      service.getAvailableDates().subscribe(d => (dates = d));
      httpMock.expectOne(indexUrl).error(new ErrorEvent('Network error'));

      expect(dates).toEqual([]);
    });

    it('should cache the index in localStorage after a successful fetch', () => {
      service.getAvailableDates().subscribe();
      httpMock.expectOne(indexUrl).flush(['010126']);

      expect(localStorage.getItem('tripod_games_index')).toBeTruthy();
    });
  });
});
