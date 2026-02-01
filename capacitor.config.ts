import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tripod.app',
  appName: 'Tripod',
  webDir: 'dist/tripod',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#111111',
      launchFadeOutDuration: 300,
    },
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
