import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tripod.app',
  appName: 'Tripod',
  webDir: 'dist/tripod',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#111111',
      launchFadeOutDuration: 300,
    },
  },
  ios: {
    contentInset: 'never',
  },
};

export default config;
