import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface GameData {
  letters: string[]; // length 12
  category?: string;
  wordOne?: string;
  wordTwo?: string;
  wordThree?: string;
}

export type ValidationState = 'none' | 'correct' | 'wrong-position';

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private http: HttpClient) {}

  private formatFileNameForDate(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}${dd}${yy}`;
  }

  /**
   * Generate the 12-letter array from the three words based on fixed position mapping.
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
  private generateLettersFromWords(wordOne: string, wordTwo: string, wordThree: string): string[] {
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

  private getByFileName(name: string): Observable<GameData> {
    const url = `games/${name}.json`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const category = res?.category ?? res?.game?.category ?? undefined;

        // Extract word metadata
        const wordOne = (res?.wordOne ?? res?.game?.wordOne ?? '').toString().toUpperCase();
        const wordTwo = (res?.wordTwo ?? res?.game?.wordTwo ?? '').toString().toUpperCase();
        const wordThree = (res?.wordThree ?? res?.game?.wordThree ?? '').toString().toUpperCase();

        // Check if gameArray is provided, otherwise generate from words
        const arr = res?.gameArray ?? res?.game?.gameArray ?? res?.letters ?? null;

        let letters: string[];
        if (arr && arr.length === 12) {
          // Use provided array
          letters = arr.map((c: any) => (c ?? '').toString().toUpperCase());
        } else if (wordOne.length >= 5 && wordTwo.length >= 5 && wordThree.length >= 5) {
          // Generate from words
          letters = this.generateLettersFromWords(wordOne, wordTwo, wordThree);
        } else {
          letters = [];
        }

        return { letters, category, wordOne, wordTwo, wordThree };
      }),
      catchError(() => of({ letters: [], category: undefined }))
    );
  }

  getTodayGame(): Observable<GameData> {
    const name = this.formatFileNameForDate(new Date());
    return this.getByFileName(name);
  }

  getGameForDate(date: Date): Observable<GameData> {
    const name = this.formatFileNameForDate(date);
    return this.getByFileName(name);
  }

  // index.json should be an array of MMDDYY strings, e.g. ["122625","122725"]
  getAvailableDates(): Observable<Date[]> {
    const url = `games/index.json`; 
    return this.http.get<string[]>(url).pipe(
      map(list => (list || [])
        .map(s => {
          if (!s || typeof s !== 'string' || s.length !== 6) return null;
          const mm = Number(s.slice(0,2));
          const dd = Number(s.slice(2,4));
          const yy = Number(s.slice(4,6));
          const fullYear = yy + (yy < 50 ? 2000 : 1900);
          return new Date(fullYear, mm - 1, dd);
        })
        .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
      ),
      catchError(() => of([]))
    );
  }
}