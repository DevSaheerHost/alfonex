import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'com.alfonex.app',
  appName: 'Alfonex',
  webDir:  'out',
  server: {
    url:           'https://alfonex.com',
    cleartext:     false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration:      2000,
      launchAutoHide:          true,
      backgroundColor:         '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner:             false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style:           'DEFAULT',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
