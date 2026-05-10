import { Injectable } from '@angular/core';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { ValidationState } from './game.service';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  private buildEmojiGrid(validation: Record<number, ValidationState>, size: 4 | 5): string {
    const e = (pos: number): string => {
      const v = validation[pos];
      return v === 'correct' ? '🟩' : v === 'wrong-position' ? '🟨' : '⬜';
    };

    if (size === 5) {
      return [
        `    ${e(1)}`,
        `   ${e(2)} ${e(3)}`,
        `  ${e(4)}   ${e(5)}`,
        ` ${e(6)}     ${e(7)}`,
        `${e(8)}${e(9)}${e(10)}${e(11)}${e(12)}`,
      ].join('\n');
    } else {
      return [
        `   ${e(1)}`,
        `  ${e(2)} ${e(3)}`,
        ` ${e(4)}   ${e(5)}`,
        `${e(6)}${e(7)}${e(8)}${e(9)}`,
      ].join('\n');
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
