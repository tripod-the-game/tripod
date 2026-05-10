import { Injectable } from '@angular/core';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { ValidationState } from './game.service';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  private buildEmojiGrid(validation: Record<number, ValidationState>, size: 4 | 5): string {
    const c = (pos: number): string => {
      const v = validation[pos];
      return v === 'correct' ? '🟢' : v === 'wrong-position' ? '🟡' : '⚪';
    };
    const _ = '⬜';

    if (size === 5) {
      // 9-column grid; each row is a fixed-width emoji sequence (no spaces)
      return [
        [_, _, _, _, c(1),  _, _, _, _   ],
        [_, _, _, c(2), _, c(3),  _, _, _],
        [_, _, c(4), _, _, _, c(5),  _, _],
        [_, c(6), _, _, _, _, _, c(7),  _],
        [c(8), _, c(9), _, c(10), _, c(11), _, c(12)],
      ].map(r => r.join('')).join('\n');
    } else {
      // 7-column grid
      return [
        [_, _, _, c(1),  _, _, _],
        [_, _, c(2), _, c(3),  _, _],
        [_, c(4), _, _, _, c(5),  _],
        [c(6), _, c(7), _, c(8), _, c(9)],
      ].map(r => r.join('')).join('\n');
    }
  }

  /**
   * Generate a shareable result string for a completed puzzle
   * Similar to Wordle's emoji grid
   */
  generateResultText(
    dateKey: string,
    attempts: number,
    size: 4 | 5,
    wasRevealed: boolean,
    hintsUsed: number,
    validation?: Record<number, ValidationState>
  ): string {
    // Format date from MMDDYY to readable format
    const month = dateKey.slice(0, 2);
    const day = dateKey.slice(2, 4);
    const year = '20' + dateKey.slice(4, 6);
    const dateStr = `${month}/${day}/${year}`;

    // Build the result string
    let result = `Tripod ${dateStr}\n`;

    if (wasRevealed) {
      result += `Revealed 👀`;
    } else {
      result += `Solved in ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}! `;
      // Add stars based on performance
      if (attempts <= 3) {
        result += '⭐⭐⭐';
      } else if (attempts <= 5) {
        result += '⭐⭐';
      } else if (attempts <= 10) {
        result += '⭐';
      }
    }

    if (validation) {
      result += '\n\n' + this.buildEmojiGrid(validation, size);
    }

    if (hintsUsed > 0) {
      result += `\n💡 ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used`;
    }

    return result;
  }

  private readonly SHARE_URL = 'https://playtripod.com';

  /**
   * Share the result using native share sheet or fallback to clipboard
   */
  async shareResult(
    dateKey: string,
    attempts: number,
    size: 4 | 5,
    wasRevealed: boolean,
    hintsUsed: number,
    validation?: Record<number, ValidationState>
  ): Promise<boolean> {
    const text = this.generateResultText(dateKey, attempts, size, wasRevealed, hintsUsed, validation);

    if (Capacitor.isNativePlatform()) {
      try {
        // Pass URL separately so iOS fetches OG metadata for share sheet preview
        await Share.share({
          text: text,
          url: this.SHARE_URL,
        });
        return true;
      } catch (e) {
        // User cancelled or error
        return false;
      }
    } else {
      // Try Web Share API first, then clipboard
      if (navigator.share) {
        try {
          await navigator.share({
            text: text,
            url: this.SHARE_URL,
          });
          return true;
        } catch (e) {
          // User cancelled or error, try clipboard
        }
      }

      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(text + '\n\n' + this.SHARE_URL);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
}
