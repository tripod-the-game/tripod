import { TestBed } from '@angular/core/testing';
import { HapticService } from './haptic.service';
import { Capacitor } from '@capacitor/core';

describe('HapticService', () => {
  let service: HapticService;

  beforeEach(() => {
    // Always stub as non-native so Capacitor Haptics are never called for real
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    TestBed.configureTestingModule({ providers: [HapticService] });
    service = TestBed.inject(HapticService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // On a non-native platform every method should resolve cleanly without error.
  describe('non-native platform', () => {
    it('tap() resolves without throwing', async () => {
      await expectAsync(service.tap()).toBeResolved();
    });

    it('submit() resolves without throwing', async () => {
      await expectAsync(service.submit()).toBeResolved();
    });

    it('success() resolves without throwing', async () => {
      await expectAsync(service.success()).toBeResolved();
    });

    it('warning() resolves without throwing', async () => {
      await expectAsync(service.warning()).toBeResolved();
    });

    it('error() resolves without throwing', async () => {
      await expectAsync(service.error()).toBeResolved();
    });

    it('celebrate() resolves without throwing', async () => {
      await expectAsync(service.celebrate()).toBeResolved();
    });
  });
});
