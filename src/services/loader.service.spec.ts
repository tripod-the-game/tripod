import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoaderService } from './loader.service';

describe('LoaderService', () => {
  let service: LoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LoaderService] });
    service = TestBed.inject(LoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('visible$', () => {
    it('should start as false', () => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      expect(visible).toBe(false);
    });
  });

  describe('show', () => {
    it('should emit true immediately when called', () => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.show(1000);
      expect(visible).toBe(true);
    });

    it('should emit false after the given duration', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.show(500);
      expect(visible).toBe(true);
      tick(500);
      expect(visible).toBe(false);
    }));

    it('should default to 500ms duration', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.show();
      tick(499);
      expect(visible).toBe(true);
      tick(1);
      expect(visible).toBe(false);
    }));

    it('should support custom durations', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.show(200);
      tick(200);
      expect(visible).toBe(false);
    }));

    it('should cancel a pending showUntilReady cycle', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.showUntilReady(500); // starts a cycle waiting for markReady + 500ms
      service.show(200);           // should take over and cancel the pending cycle
      tick(200);
      expect(visible).toBe(false); // show(200) resolves, not waiting for markReady
      // markReady should now be a no-op (no pending cycle)
      service.markReady();
      expect(visible).toBe(false);
    }));
  });

  describe('hide', () => {
    it('should emit false immediately even while a show timer is pending', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.show(1000);
      expect(visible).toBe(true);
      service.hide();
      expect(visible).toBe(false);
      tick(1000); // flush pending timer without side effects
    }));

    it('should be a no-op when already hidden', () => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.hide();
      expect(visible).toBe(false);
    });
  });

  describe('showUntilReady / markReady', () => {
    it('should emit true immediately on showUntilReady()', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.showUntilReady(500);
      expect(visible).toBe(true);
      service.markReady();
      tick(500);
    }));

    it('should stay true after only the timer fires (no markReady yet)', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.showUntilReady(500);
      tick(500); // timer fires, but markReady not called
      expect(visible).toBe(true);
      service.markReady(); // clean up
    }));

    it('should stay true after only markReady() is called (timer not yet fired)', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.showUntilReady(500);
      service.markReady(); // data ready, but timer hasn't fired
      expect(visible).toBe(true);
      tick(500); // clean up
    }));

    it('should emit false once BOTH timer has fired AND markReady() was called', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.showUntilReady(500);
      service.markReady();
      tick(499);
      expect(visible).toBe(true);
      tick(1);
      expect(visible).toBe(false);
    }));

    it('should emit false when markReady() is called after the timer already expired', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.showUntilReady(500);
      tick(500); // timer fires first
      expect(visible).toBe(true);
      service.markReady(); // data arrives late
      expect(visible).toBe(false);
    }));

    it('should emit false when timer expires after markReady() was already called', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.showUntilReady(500);
      service.markReady(); // data arrives before timer
      expect(visible).toBe(true);
      tick(500); // timer fires
      expect(visible).toBe(false);
    }));

    it('should emit false after 10s even if markReady() is never called (safety timeout)', fakeAsync(() => {
      let visible: boolean | undefined;
      service.visible$.subscribe(v => (visible = v));
      service.showUntilReady(500);
      tick(500); // min timer fires, but no markReady
      expect(visible).toBe(true);
      tick(9500); // safety timeout fires (10000ms total)
      expect(visible).toBe(false);
    }));

    it('should cancel previous cycle when showUntilReady is called again before first resolves', fakeAsync(() => {
      const values: boolean[] = [];
      service.visible$.subscribe(v => values.push(v));
      // values starts as [false] from BehaviorSubject initial emission
      service.showUntilReady(500);
      tick(250);
      service.showUntilReady(500); // second call cancels first
      service.markReady();
      tick(500);
      // Only one false→true→false transition after initial state (no spurious hide from cancelled cycle)
      const afterStart = values.slice(1); // drop initial BehaviorSubject false
      const falseCount = afterStart.filter(v => !v).length;
      expect(falseCount).toBe(1);
      expect(values[values.length - 1]).toBe(false);
    }));
  });
});
