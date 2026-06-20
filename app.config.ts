import { ExpoConfig, getDefaultConfig } from '@expo/config';

const config: ExpoConfig = {
  ...getDefaultConfig(__dirname),
  name: 'passkey-bindings-sorobansdk',
  slug: 'passkey-bindings-sorobansdk',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './public/icon.png',
  userInterfaceStyle: 'automatic',
  
  // Splash screen configuration
  splash: {
    image: './public/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },

  // Async storage and plugins
  plugins: [
    'react-native-nfc-manager'
  ],

  // iOS configuration
  ios: {
    supportsTabletMode: true,
    bundleIdentifier: 'com.oppia.passkeybindings',
    infoPlist: {
      NFCReaderUsageDescription: 'Permite leer etiquetas NFC para pruebas de spike de pago.',
      // Enable NFC technologies support
      'com.apple.developer.nfc.readersession.formats': [
        'NDEF',
        'TAG'
      ]
    },
    // Entitlements for NFC
    entitlements: {
      'com.apple.developer.nfc.readersession.formats': [
        'NDEF',
        'TAG'
      ]
    }
  },

  // Android configuration
  android: {
    adaptiveIcon: {
      foregroundImage: './public/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.oppia.passkeybindings',
    permissions: [
      'android.permission.NFC'
    ],
    intentFilters: [
      {
        action: 'android.nfc.action.NDEF_DISCOVERED',
        category: [
          'android.intent.category.DEFAULT'
        ]
      }
    ],
    compileSdkVersion: 31
  },

  // Web configuration
  web: {
    bundler: 'metro',
    output: 'server',
    favicon: './public/favicon.ico'
  },

  // Scheme for deep linking
  scheme: 'passkeybindings',

  // Platform-specific configuration
  platforms: ['ios', 'android', 'web'],

  // Experiments
  experiments: {
    typedRoutes: true
  }
};

export default config;
