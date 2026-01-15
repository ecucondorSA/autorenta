

const config = {
  appId: 'com.autorentar.app',
  appName: 'Autorentar',
  webDir: 'apps/web/dist/web/browser',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    url: 'https://autorentar.com',
    allowNavigation: ['autorentar.com', '*.autorentar.com']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#4F46E5',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#4F46E5',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'native',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    FacebookLogin: {
      appId: '4435998730015502',
    },
  },
};

module.exports = config;
