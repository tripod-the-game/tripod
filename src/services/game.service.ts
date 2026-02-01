import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';

export interface GameData {
  letters: string[]; // length 12 for 5-letter words, 9 for 4-letter words
  category?: string;
  wordOne?: string;
  wordTwo?: string;
  wordThree?: string;
  size: 4 | 5; // word length (4 or 5 letters)
}

export type ValidationState = 'none' | 'correct' | 'wrong-position';

// Remote URL for game data (GitHub raw content from public tripod-games repo)
const GAMES_BASE_URL = 'https://raw.githubusercontent.com/tripod-the-game/tripod-games/main';

@Injectable({ providedIn: 'root' })
export class GameService {
  // Cache key prefix for localStorage
  private readonly CACHE_PREFIX = 'tripod_game_';
  private readonly INDEX_CACHE_KEY = 'tripod_games_index';

  constructor(private http: HttpClient) {}

  private formatFileNameForDate(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}${dd}${yy}`;
  }

  private formatPathForDate(d: Date): string {
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const fileName = this.formatFileNameForDate(d);
    return `games/${yyyy}/${mm}/${fileName}`;
  }

  /**
   * Generate the 12-letter array from three 5-letter words based on fixed position mapping.
   * Position mapping:
   *   0: wordOne[4] / wordTwo[0]  (shared)
   *   1: wordOne[3]
   *   2: wordTwo[1]
   *   3: wordOne[2]
   *   4: wordTwo[2]
   *   5: wordOne[1]
   *   6: wordTwo[3]
   *   7: wordOne[0] / wordThree[0]  (shared)
   *   8: wordThree[1]
   *   9: wordThree[2]
   *  10: wordThree[3]
   *  11: wordTwo[4] / wordThree[4]  (shared)
   */
  private generateLettersFromWords5(wordOne: string, wordTwo: string, wordThree: string): string[] {
    return [
      wordOne[4],    // position 0: last letter of wordOne (also first of wordTwo)
      wordOne[3],    // position 1: 4th letter of wordOne
      wordTwo[1],    // position 2: 2nd letter of wordTwo
      wordOne[2],    // position 3: 3rd letter of wordOne
      wordTwo[2],    // position 4: 3rd letter of wordTwo
      wordOne[1],    // position 5: 2nd letter of wordOne
      wordTwo[3],    // position 6: 4th letter of wordTwo
      wordOne[0],    // position 7: 1st letter of wordOne (also first of wordThree)
      wordThree[1],  // position 8: 2nd letter of wordThree
      wordThree[2],  // position 9: 3rd letter of wordThree
      wordThree[3],  // position 10: 4th letter of wordThree
      wordTwo[4],    // position 11: 5th letter of wordTwo (also 5th of wordThree)
    ].map(c => (c ?? '').toUpperCase());
  }

  /**
   * Generate the 9-letter array from three 4-letter words based on fixed position mapping.
   * Triangle layout for 4-letter words:
   *        1          (apex - shared by wordOne and wordTwo)
   *       2 3
   *      4   5
   *     6 7 8 9       (bottom row)
   *
   * Position mapping:
   *   0: wordOne[3] / wordTwo[0]  (shared - apex)
   *   1: wordOne[2]
   *   2: wordTwo[1]
   *   3: wordOne[1]
   *   4: wordTwo[2]
   *   5: wordOne[0] / wordThree[0]  (shared - bottom left)
   *   6: wordThree[1]
   *   7: wordThree[2]
   *   8: wordTwo[3] / wordThree[3]  (shared - bottom right)
   */
  private generateLettersFromWords4(wordOne: string, wordTwo: string, wordThree: string): string[] {
    return [
      wordOne[3],    // position 0: last letter of wordOne (also first of wordTwo)
      wordOne[2],    // position 1: 3rd letter of wordOne
      wordTwo[1],    // position 2: 2nd letter of wordTwo
      wordOne[1],    // position 3: 2nd letter of wordOne
      wordTwo[2],    // position 4: 3rd letter of wordTwo
      wordOne[0],    // position 5: 1st letter of wordOne (also first of wordThree)
      wordThree[1],  // position 6: 2nd letter of wordThree
      wordThree[2],  // position 7: 3rd letter of wordThree
      wordTwo[3],    // position 8: 4th letter of wordTwo (also 4th of wordThree)
    ].map(c => (c ?? '').toUpperCase());
  }

  private getByPath(path: string): Observable<GameData> {
    const remoteUrl = `${GAMES_BASE_URL}/${path.replace('games/', '')}.json`;
    const cacheKey = this.CACHE_PREFIX + path.replace(/\//g, '_');

    return this.http.get<any>(remoteUrl).pipe(
      tap(res => {
        // Cache the raw response
        try {
          localStorage.setItem(cacheKey, JSON.stringify(res));
        } catch (e) {
          // localStorage might be full or unavailable
        }
      }),
      map(res => this.parseGameResponse(res)),
      catchError(() => {
        // Try to load from cache
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return of(this.parseGameResponse(JSON.parse(cached)));
          } catch (e) {
            // Invalid cache
          }
        }
        return of({ letters: [], category: undefined, size: 5 as const });
      })
    );
  }

  private parseGameResponse(res: any): GameData {
    const category = res?.category ?? res?.game?.category ?? undefined;

    // Extract word metadata
    const wordOne = (res?.wordOne ?? res?.game?.wordOne ?? '').toString().toUpperCase();
    const wordTwo = (res?.wordTwo ?? res?.game?.wordTwo ?? '').toString().toUpperCase();
    const wordThree = (res?.wordThree ?? res?.game?.wordThree ?? '').toString().toUpperCase();

    // Determine size from explicit field or word lengths
    let size: 4 | 5 = res?.size ?? 5;
    if (!res?.size && wordOne.length === 4 && wordTwo.length === 4 && wordThree.length === 4) {
      size = 4;
    }

    // Check if gameArray is provided, otherwise generate from words
    const arr = res?.gameArray ?? res?.game?.gameArray ?? res?.letters ?? null;
    const expectedLength = size === 4 ? 9 : 12;

    let letters: string[];
    if (arr && arr.length === expectedLength) {
      // Use provided array
      letters = arr.map((c: any) => (c ?? '').toString().toUpperCase());
    } else if (size === 4 && wordOne.length >= 4 && wordTwo.length >= 4 && wordThree.length >= 4) {
      // Generate from 4-letter words
      letters = this.generateLettersFromWords4(wordOne, wordTwo, wordThree);
    } else if (size === 5 && wordOne.length >= 5 && wordTwo.length >= 5 && wordThree.length >= 5) {
      // Generate from 5-letter words
      letters = this.generateLettersFromWords5(wordOne, wordTwo, wordThree);
    } else {
      letters = [];
    }

    return { letters, category, wordOne, wordTwo, wordThree, size };
  }

  getTodayGame(): Observable<GameData> {
    const path = this.formatPathForDate(new Date());
    return this.getByPath(path);
  }

  getGameForDate(date: Date): Observable<GameData> {
    const path = this.formatPathForDate(date);
    return this.getByPath(path);
  }

  // index.json should be an array of MMDDYY strings, e.g. ["122625","122725"]
  getAvailableDates(): Observable<Date[]> {
    const remoteUrl = `${GAMES_BASE_URL}/index.json`;

    return this.http.get<string[]>(remoteUrl).pipe(
      tap(list => {
        // Cache the index
        try {
          localStorage.setItem(this.INDEX_CACHE_KEY, JSON.stringify(list));
        } catch (e) {
          // localStorage might be full or unavailable
        }
      }),
      map(list => this.parseIndexResponse(list)),
      catchError(() => {
        // Try to load from cache
        const cached = localStorage.getItem(this.INDEX_CACHE_KEY);
        if (cached) {
          try {
            return of(this.parseIndexResponse(JSON.parse(cached)));
          } catch (e) {
            // Invalid cache
          }
        }
        return of([]);
      })
    );
  }

  private parseIndexResponse(list: string[]): Date[] {
    return (list || [])
      .map(s => {
        if (!s || typeof s !== 'string' || s.length !== 6) return null;
        const mm = Number(s.slice(0, 2));
        const dd = Number(s.slice(2, 4));
        const yy = Number(s.slice(4, 6));
        const fullYear = yy + (yy < 50 ? 2000 : 1900);
        return new Date(fullYear, mm - 1, dd);
      })
      .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));
  }
}