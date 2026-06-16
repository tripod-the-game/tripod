import { Injectable } from '@angular/core';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  private readonly SHARE_URL = 'https://playtripod.com';

  generateResultText(
    dateKey: string,
    attempts: number,
    wasRevealed: boolean,
    hintsUsed: number
  ): string {
    const dateStr = this.formatDateStr(dateKey);
    let result = `Tripod ${dateStr}\n`;

    if (wasRevealed) {
      result += `Revealed 👀`;
    } else {
      result += `Solved in ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}! `;
      if (attempts <= 3) {
        result += '⭐⭐⭐';
      } else if (attempts <= 5) {
        result += '⭐⭐';
      } else if (attempts <= 10) {
        result += '⭐';
      }
    }

    if (hintsUsed > 0) {
      result += `\n💡 ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used`;
    }

    return result;
  }

  private formatDateStr(dateKey: string): string {
    const month = dateKey.slice(0, 2);
    const day = dateKey.slice(2, 4);
    const year = '20' + dateKey.slice(4, 6);
    return `${month}/${day}/${year}`;
  }

  /**
   * Generates a PNG share card showing the solved triangle with the attempt
   * count (or 👀 for revealed) drawn at the centroid of the green triangle.
   */
  async generateShareImage(
    size: 4 | 5,
    dateKey: string,
    attempts: number,
    wasRevealed: boolean
  ): Promise<File | null> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const dpr = Math.max(window.devicePixelRatio ?? 1, 2); // at least 2x for crisp output
      const s = 60;                          // spacing between circle centres
      const r = 21;                          // circle radius
      const pad = 38;                        // outer horizontal/vertical padding
      const headerH = 68;                    // height reserved for title + date
      const footerH = 34;                    // height reserved for URL
      const sin60 = Math.sin(Math.PI / 3);  // ≈ 0.866
      const baseGaps = size - 1;            // 4 for size-5, 3 for size-4

      const triW = baseGaps * s;
      const triH = baseGaps * sin60 * s;

      const logicalW = Math.round(triW + pad * 2);
      const logicalH = Math.round(triH + pad * 2 + headerH + footerH);

      // Scale canvas backing store by dpr so strokes/text stay sharp on retina
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      ctx.scale(dpr, dpr);

      // Dark background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, logicalW, logicalH);

      // Triangle origin: bottom-left corner in canvas space
      const ox = pad;
      const oy = headerH + pad + triH;

      // --- Draw circles ---
      const positions = this.getCanvasCirclePositions(size, s, ox, oy, sin60);
      const circleColor = wasRevealed ? '#64748b' : '#4caf50';
      const borderColor = wasRevealed ? '#94a3b8' : '#357a38';

      for (const { x, y } of positions) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = circleColor;
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // --- Draw centroid label: large number + "attempts" below ---
      const centX = ox + (baseGaps / 2) * s;
      const centY = oy - (triH / 3);

      ctx.textAlign = 'center';
      if (wasRevealed) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText('👀', centX, centY - 8);
        ctx.font = `13px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
        ctx.fillText('revealed', centX, centY + 20);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(String(attempts), centX, centY - 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = `13px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
        ctx.fillText(attempts === 1 ? 'attempt' : 'attempts', centX, centY + 20);
      }

      // --- Header: title + date ---
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
      ctx.fillText('TRIPOD', logicalW / 2, headerH * 0.32);

      ctx.fillStyle = '#94a3b8';
      ctx.font = `15px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
      ctx.fillText(this.formatDateStr(dateKey), logicalW / 2, headerH * 0.68);

      // --- Footer: URL ---
      ctx.fillStyle = '#475569';
      ctx.font = `12px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
      ctx.fillText('playtripod.com', logicalW / 2, oy + pad * 0.5 + footerH * 0.4);

      return new Promise(resolve => {
        canvas.toBlob(blob => {
          resolve(blob ? new File([blob], 'tripod-result.png', { type: 'image/png' }) : null);
        }, 'image/png');
      });
    } catch {
      return null;
    }
  }

  /**
   * Returns canvas (x, y) coordinates for every circle in the triangle,
   * ordered circle 1 … 12 (or 1 … 9 for size-4).
   *
   * The triangle sits on an equilateral grid:
   *   - horizontal step: s
   *   - vertical step:   s * sin(60°)
   * with (ox, oy) as the bottom-left corner in canvas space.
   */
  private getCanvasCirclePositions(
    size: 4 | 5,
    s: number,
    ox: number,
    oy: number,
    sin60: number
  ): Array<{ x: number; y: number }> {
    const h = sin60 * s;

    if (size === 5) {
      return [
        { x: ox + 2 * s,   y: oy - 4 * h },  // 1  apex
        { x: ox + 1.5 * s, y: oy - 3 * h },  // 2
        { x: ox + 2.5 * s, y: oy - 3 * h },  // 3
        { x: ox + 1 * s,   y: oy - 2 * h },  // 4
        { x: ox + 3 * s,   y: oy - 2 * h },  // 5
        { x: ox + 0.5 * s, y: oy - 1 * h },  // 6
        { x: ox + 3.5 * s, y: oy - 1 * h },  // 7
        { x: ox + 0,       y: oy           },  // 8  bottom-left
        { x: ox + 1 * s,   y: oy           },  // 9
        { x: ox + 2 * s,   y: oy           },  // 10
        { x: ox + 3 * s,   y: oy           },  // 11
        { x: ox + 4 * s,   y: oy           },  // 12 bottom-right
      ];
    }

    // size === 4
    return [
      { x: ox + 1.5 * s, y: oy - 3 * h },  // 1  apex
      { x: ox + 1 * s,   y: oy - 2 * h },  // 2
      { x: ox + 2 * s,   y: oy - 2 * h },  // 3
      { x: ox + 0.5 * s, y: oy - 1 * h },  // 4
      { x: ox + 2.5 * s, y: oy - 1 * h },  // 5
      { x: ox + 0,       y: oy           },  // 6  bottom-left
      { x: ox + 1 * s,   y: oy           },  // 7
      { x: ox + 2 * s,   y: oy           },  // 8
      { x: ox + 3 * s,   y: oy           },  // 9  bottom-right
    ];
  }

  async shareResult(
    dateKey: string,
    attempts: number,
    size: 4 | 5,
    wasRevealed: boolean,
    hintsUsed: number
  ): Promise<boolean> {
    const text = this.generateResultText(dateKey, attempts, wasRevealed, hintsUsed);

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({ text, url: this.SHARE_URL });
        return true;
      } catch {
        return false;
      }
    }

    // Web: try image share first
    const imageFile = await this.generateShareImage(size, dateKey, attempts, wasRevealed);
    if (imageFile && typeof navigator.canShare === 'function' && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({ files: [imageFile], url: this.SHARE_URL });
        return true;
      } catch {
        // User cancelled or browser rejected — fall through to text
      }
    }

    // Web text share
    if (navigator.share) {
      try {
        await navigator.share({ text, url: this.SHARE_URL });
        return true;
      } catch {
        // Fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(text + '\n\n' + this.SHARE_URL);
      return true;
    } catch {
      return false;
    }
  }
}
