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
});
