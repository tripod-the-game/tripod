import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface GameData {
  letters: string[]; // length 12
  category?: string;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private http: HttpClient) {}

  private formatFileNameForDate(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}${dd}${yy}`;
  }

  private getByFileName(name: string): Observable<GameData> {
    const url = `/games/${name}.json`;
    return this.http.get<any>(url).pipe(
      map(res => {
        // support either { gameArray: [...] } or { game: { gameArray, category } } or { letters, category }
        const arr =
          res?.gameArray ??
          res?.game?.gameArray ??
          res?.letters ??
          [];
        const category =
          res?.category ?? res?.game?.category ?? undefined;
        const letters = (arr || []).map((c: any) => (c ?? '').toString().toUpperCase());
        return { letters, category };
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
    const url = `/games/index.json`;
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