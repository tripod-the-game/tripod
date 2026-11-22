import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Difficulty } from './difficulty';
import { ShareService } from './share.service';

interface DrawnText {
  text: string;
  x: number;
  y: number;
  font: string;
  width: number;
}

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
const CARD_SIDE_PADDING = 38;
const CARD_WIDTH: Record<4 | 5, number> = { 4: 256, 5: 316 };
const DATE_LINE_Y = 68 * 0.68;
const NAVIGATOR_KEYS = ['share', 'canShare', 'clipboard'] as const;

// Frozen from the output of the code before difficulty labels were added.
const HARD_PNG_SEQUENCE: Record<4 | 5, Array<[string, number, number]>> = {
  5: [
    ['3', 158, 234.56],
    ['attempts', 158, 264.56],
    ['TRIPOD', 158, 21.76],
    ['03/01/2026', 158, 46.24],
    ['playtripod.com', 158, 373.85],
  ],
  4: [
    ['3', 128, 199.92],
    ['attempts', 128, 229.92],
    ['TRIPOD', 128, 21.76],
    ['03/01/2026', 128, 46.24],
    ['playtripod.com', 128, 321.88],
  ],
};

describe('ShareService difficulty labels', () => {
  let service: ShareService;
  let nativeSpy: jasmine.Spy;
  let shareSpy: jasmine.Spy;
  let clipboardSpy: jasmine.Spy;
  let drawn: DrawnText[];
  let savedNavigator: Array<[string, PropertyDescriptor | undefined]>;

  function setNavigator(key: (typeof NAVIGATOR_KEYS)[number], value: unknown): void {
    Object.defineProperty(navigator, key, { value, writable: true, configurable: true });
  }

  function pngFile(): File {
    return new File([new Uint8Array([1, 2, 3])], 'tripod-result.png', { type: 'image/png' });
  }

  beforeEach(() => {
    savedNavigator = NAVIGATOR_KEYS.map(key => [key, Object.getOwnPropertyDescriptor(navigator, key)]);

    nativeSpy = spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    shareSpy = jasmine.createSpy('share').and.resolveTo();
    clipboardSpy = jasmine.createSpy('writeText').and.resolveTo();
    setNavigator('share', shareSpy);
    setNavigator('canShare', jasmine.createSpy('canShare').and.returnValue(false));
    setNavigator('clipboard', { writeText: clipboardSpy });

    drawn = [];
    const realFillText = CanvasRenderingContext2D.prototype.fillText;
    spyOn(CanvasRenderingContext2D.prototype, 'fillText').and.callFake(function (
      this: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number
    ) {
      drawn.push({ text, x, y, font: this.font, width: this.measureText(text).width });
      realFillText.call(this, text, x, y);
    });

    TestBed.configureTestingModule({ providers: [ShareService] });
    service = TestBed.inject(ShareService);
  });

  afterEach(() => {
    for (const [key, descriptor] of savedNavigator) {
      if (descriptor) {
        Object.defineProperty(navigator, key, descriptor);
      } else {
        delete (navigator as unknown as Record<string, unknown>)[key];
      }
    }
  });

  describe('Hard output is unchanged', () => {
    const cases: Array<[string, number, boolean, number, string]> = [
      ['win', 3, false, 0, 'Tripod 03/01/2026\nSolved in 3 attempts! ⭐⭐⭐'],
      ['single-attempt win', 1, false, 0, 'Tripod 03/01/2026\nSolved in 1 attempt! ⭐⭐⭐'],
      ['win with one hint', 4, false, 1, 'Tripod 03/01/2026\nSolved in 4 attempts! ⭐⭐\n💡 1 hint used'],
      ['win with hints', 6, false, 2, 'Tripod 03/01/2026\nSolved in 6 attempts! ⭐\n💡 2 hints used'],
      ['win with no stars', 11, false, 0, 'Tripod 03/01/2026\nSolved in 11 attempts! '],
      ['revealed', 5, true, 0, 'Tripod 03/01/2026\nRevealed 👀'],
      ['revealed with hints', 5, true, 3, 'Tripod 03/01/2026\nRevealed 👀\n💡 3 hints used'],
    ];

    for (const [name, attempts, revealed, hints, expected] of cases) {
      it(`matches the exact text for ${name}, with and without an explicit difficulty`, () => {
        expect(service.generateResultText('030126', attempts, revealed, hints)).toBe(expected);
        expect(service.generateResultText('030126', attempts, revealed, hints, 'hard')).toBe(expected);
      });
    }

    for (const size of [5, 4] as const) {
      it(`draws the exact PNG text sequence on the ${size}-letter card`, async () => {
        await service.generateShareImage(size, '030126', 3, false);
        const omitted = drawn.map(d => [d.text, d.x, Number(d.y.toFixed(2))]);
        const omittedFonts = drawn.map(d => d.font);
        drawn = [];

        await service.generateShareImage(size, '030126', 3, false, 'hard');
        expect(omitted).toEqual(HARD_PNG_SEQUENCE[size]);
        expect(drawn.map(d => [d.text, d.x, Number(d.y.toFixed(2))])).toEqual(HARD_PNG_SEQUENCE[size]);
        expect(drawn.map(d => d.font)).toEqual(omittedFonts);
        expect(omittedFonts[3]).toContain('15px');
      });
    }

    it('treats an invalid runtime value as Hard', () => {
      const text = service.generateResultText('030126', 3, false, 0, 'EASY' as unknown as Difficulty);
      expect(text).toBe('Tripod 03/01/2026\nSolved in 3 attempts! ⭐⭐⭐');
    });
  });

  for (const [difficulty, label] of [['easy', 'Easy'], ['medium', 'Medium']] as const) {
    describe(`${label} label`, () => {
      it('labels only the first text line', () => {
        expect(service.generateResultText('030126', 3, false, 0, difficulty))
          .toBe(`Tripod 03/01/2026 (${label})\nSolved in 3 attempts! ⭐⭐⭐`);
      });

      it('labels revealed output and keeps the hint line unchanged', () => {
        expect(service.generateResultText('030126', 5, true, 2, difficulty))
          .toBe(`Tripod 03/01/2026 (${label})\nRevealed 👀\n💡 2 hints used`);
      });

      it('keeps stars and the hint line the same as Hard', () => {
        const hard = service.generateResultText('030126', 4, false, 1);
        const labeled = service.generateResultText('030126', 4, false, 1, difficulty);
        expect(labeled.split('\n').slice(1)).toEqual(hard.split('\n').slice(1));
      });

      for (const size of [5, 4] as const) {
        it(`labels the PNG date line on the ${size}-letter card`, async () => {
          await service.generateShareImage(size, '030126', 3, false, difficulty);
          const dateLine = drawn[3];
          expect(dateLine.text).toBe(`03/01/2026 (${label})`);
          expect(dateLine.x).toBe(CARD_WIDTH[size] / 2);
          expect(dateLine.y).toBeCloseTo(DATE_LINE_Y, 5);
          expect(drawn.map(d => d.text)).toEqual(['3', 'attempts', 'TRIPOD', `03/01/2026 (${label})`, 'playtripod.com']);
        });

        it(`labels revealed PNG output on the ${size}-letter card`, async () => {
          await service.generateShareImage(size, '030126', 3, true, difficulty);
          expect(drawn.map(d => d.text)).toContain(`03/01/2026 (${label})`);
        });
      }
    });
  }

  describe('PNG width', () => {
    for (const size of [4, 5] as const) {
      it(`fits the longest label inside the side padding on the ${size}-letter card`, async () => {
        await service.generateShareImage(size, '123126', 3, false, 'medium');
        const dateLine = drawn.find(d => d.text === '12/31/2026 (Medium)');

        expect(dateLine).toBeDefined();
        expect(dateLine!.font).toContain('15px');
        expect(dateLine!.width).toBeGreaterThan(0);
        expect(dateLine!.x - dateLine!.width / 2).toBeGreaterThanOrEqual(CARD_SIDE_PADDING);
        expect(dateLine!.x + dateLine!.width / 2).toBeLessThanOrEqual(CARD_WIDTH[size] - CARD_SIDE_PADDING);
      });
    }

    it('uses the header font expected by the width check', async () => {
      await service.generateShareImage(4, '123126', 3, false, 'medium');
      const probe = document.createElement('canvas').getContext('2d')!;
      probe.font = `15px ${FONT_STACK}`;
      expect(drawn[3].font).toBe(probe.font);
    });
  });

  describe('all five share paths', () => {
    for (const [difficulty, label] of [['easy', 'Easy'], ['medium', 'Medium']] as const) {
      const expectedText = `Tripod 03/01/2026 (${label})\nSolved in 3 attempts! ⭐⭐⭐`;

      it(`native image carries ${label} in the image and sends no text`, async () => {
        nativeSpy.and.returnValue(true);
        const imageSpy = spyOn(service, 'generateShareImage').and.resolveTo(pngFile());

        try {
          await expectAsync(service.shareResult('030126', 3, 4, false, 0, difficulty)).toBeResolvedTo(true);
        } finally {
          await Filesystem.deleteFile({ path: 'tripod-result.png', directory: Directory.Cache }).catch(() => undefined);
        }

        expect(imageSpy).toHaveBeenCalledOnceWith(4, '030126', 3, false, difficulty);
        expect(shareSpy).toHaveBeenCalledTimes(1);
        expect(shareSpy.calls.mostRecent().args[0].text).toBeUndefined();
        expect(clipboardSpy).not.toHaveBeenCalled();
      });

      it(`native text fallback carries ${label}`, async () => {
        nativeSpy.and.returnValue(true);
        const imageSpy = spyOn(service, 'generateShareImage').and.resolveTo(null);

        await expectAsync(service.shareResult('030126', 3, 5, false, 0, difficulty)).toBeResolvedTo(true);

        expect(imageSpy).toHaveBeenCalledOnceWith(5, '030126', 3, false, difficulty);
        expect(shareSpy).toHaveBeenCalledTimes(1);
        expect(shareSpy.calls.mostRecent().args[0].text).toBe(expectedText);
      });

      it(`Web Share image carries ${label} in the drawn header`, async () => {
        const imageSpy = spyOn(service, 'generateShareImage').and.callThrough();
        (navigator.canShare as jasmine.Spy).and.returnValue(true);

        await expectAsync(service.shareResult('030126', 3, 4, false, 0, difficulty)).toBeResolvedTo(true);

        expect(imageSpy).toHaveBeenCalledOnceWith(4, '030126', 3, false, difficulty);
        expect(drawn.map(d => d.text)).toContain(`03/01/2026 (${label})`);
        expect(shareSpy).toHaveBeenCalledTimes(1);
        const payload = shareSpy.calls.mostRecent().args[0];
        expect(payload.files.length).toBe(1);
        expect(payload.text).toBeUndefined();
      });

      it(`Web Share text carries ${label}`, async () => {
        await expectAsync(service.shareResult('030126', 3, 5, false, 0, difficulty)).toBeResolvedTo(true);

        expect(shareSpy).toHaveBeenCalledOnceWith({ text: expectedText });
        expect(clipboardSpy).not.toHaveBeenCalled();
      });

      it(`clipboard carries ${label}`, async () => {
        setNavigator('share', undefined);

        await expectAsync(service.shareResult('030126', 3, 5, false, 0, difficulty)).toBeResolvedTo(true);

        expect(clipboardSpy).toHaveBeenCalledOnceWith(expectedText);
      });
    }

    it('keeps existing callers on Hard when no difficulty is passed', async () => {
      setNavigator('share', undefined);

      await service.shareResult('030126', 3, 5, false, 0);

      expect(clipboardSpy).toHaveBeenCalledOnceWith('Tripod 03/01/2026\nSolved in 3 attempts! ⭐⭐⭐');
      expect(drawn.map(d => d.text)).toContain('03/01/2026');
    });
  });
});
