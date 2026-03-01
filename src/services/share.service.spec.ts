import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';
import { Capacitor } from '@capacitor/core';

describe('ShareService', () => {
  let service: ShareService;

  beforeEach(() => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    TestBed.configureTestingModule({ providers: [ShareService] });
    service = TestBed.inject(ShareService);

    // Ensure navigator.share is unavailable so tests use the clipboard fallback
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── generateResultText ───────────────────────────────────────────────────────

  describe('generateResultText', () => {
    it('should include "Tripod" in the output', () => {
      expect(service.generateResultText('030126', 3, false, 0)).toContain('Tripod');
    });

    it('should format the date from MMDDYY correctly', () => {
      const text = service.generateResultText('030126', 3, false, 0);
      expect(text).toContain('03/01/2026');
    });

    it('should show "Revealed" and not attempts when wasRevealed is true', () => {
      const text = service.generateResultText('030126', 5, true, 0);
      expect(text).toContain('Revealed');
      expect(text).not.toContain('Solved');
    });

    it('should include attempt count when not revealed', () => {
      const text = service.generateResultText('030126', 5, false, 0);
      expect(text).toContain('5 attempts');
    });

    it('should use singular "attempt" for exactly 1 attempt', () => {
      const text = service.generateResultText('030126', 1, false, 0);
      expect(text).toContain('1 attempt');
      expect(text).not.toContain('1 attempts');
    });

    it('should award 3 stars for 1 attempt', () => {
      const text = service.generateResultText('030126', 1, false, 0);
      expect((text.match(/⭐/g) || []).length).toBe(3);
    });

    it('should award 3 stars for exactly 3 attempts', () => {
      const text = service.generateResultText('030126', 3, false, 0);
      expect((text.match(/⭐/g) || []).length).toBe(3);
    });

    it('should award 2 stars for 4 attempts', () => {
      const text = service.generateResultText('030126', 4, false, 0);
      expect((text.match(/⭐/g) || []).length).toBe(2);
    });

    it('should award 2 stars for exactly 5 attempts', () => {
      const text = service.generateResultText('030126', 5, false, 0);
      expect((text.match(/⭐/g) || []).length).toBe(2);
    });

    it('should award 1 star for 6 attempts', () => {
      const text = service.generateResultText('030126', 6, false, 0);
      expect((text.match(/⭐/g) || []).length).toBe(1);
    });

    it('should award 1 star for exactly 10 attempts', () => {
      const text = service.generateResultText('030126', 10, false, 0);
      expect((text.match(/⭐/g) || []).length).toBe(1);
    });

    it('should award no stars for 11+ attempts', () => {
      const text = service.generateResultText('030126', 11, false, 0);
      expect(text).not.toContain('⭐');
    });

    it('should include hint count when hints were used', () => {
      const text = service.generateResultText('030126', 3, false, 2);
      expect(text).toContain('2 hints used');
    });

    it('should use singular "hint" for exactly 1 hint', () => {
      const text = service.generateResultText('030126', 3, false, 1);
      expect(text).toContain('1 hint used');
      expect(text).not.toContain('1 hints');
    });

    it('should omit the hint line when hintsUsed is 0', () => {
      const text = service.generateResultText('030126', 3, false, 0);
      expect(text).not.toContain('hint');
    });
  });

  // ── shareResult (web / clipboard fallback) ───────────────────────────────────

  describe('shareResult', () => {
    let clipboardSpy: jasmine.Spy;

    beforeEach(() => {
      clipboardSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: clipboardSpy },
        writable: true,
        configurable: true,
      });
    });

    it('should return true when clipboard write succeeds', async () => {
      const result = await service.shareResult('030126', 3, 5, false, 0);
      expect(result).toBe(true);
    });

    it('should include the result text and URL in the clipboard content', async () => {
      await service.shareResult('030126', 3, 5, false, 0);
      const written: string = clipboardSpy.calls.mostRecent().args[0];
      expect(written).toContain('Tripod');
      expect(written).toContain('playtripod.com');
    });

    it('should return false when clipboard write fails', async () => {
      clipboardSpy.and.returnValue(Promise.reject(new Error('Permission denied')));
      const result = await service.shareResult('030126', 3, 5, false, 0);
      expect(result).toBe(false);
    });

    it('should use Web Share API when navigator.share is available', async () => {
      const shareSpy = jasmine.createSpy('share').and.returnValue(Promise.resolve());
      Object.defineProperty(navigator, 'share', {
        value: shareSpy,
        writable: true,
        configurable: true,
      });
      const result = await service.shareResult('030126', 3, 5, false, 0);
      expect(shareSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should fall back to clipboard when Web Share API rejects', async () => {
      const shareSpy = jasmine.createSpy('share').and.returnValue(Promise.reject(new Error('cancelled')));
      Object.defineProperty(navigator, 'share', {
        value: shareSpy,
        writable: true,
        configurable: true,
      });
      const result = await service.shareResult('030126', 3, 5, false, 0);
      // Fell through to clipboard
      expect(clipboardSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
