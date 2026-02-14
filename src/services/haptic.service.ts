import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class HapticService {
  private isNative = Capacitor.isNativePlatform();

  // Light tap for button presses
  async tap(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.impact({ style: ImpactStyle.Light });
  }

  // Medium impact for submissions
  async submit(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
  }

  // Success notification for correct answers
  async success(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.notification({ type: NotificationType.Success });
  }

  // Warning notification for wrong position (yellow)
  async warning(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.notification({ type: NotificationType.Warning });
  }

  // Error notification for wrong answers
  async error(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.notification({ type: NotificationType.Error });
  }

  // Heavy impact for win/celebration
  async celebrate(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.impact({ style: ImpactStyle.Heavy });
    // Double tap for celebration
    setTimeout(async () => {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }, 100);
  }
}
