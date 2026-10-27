import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.futurecenter.platform',
  appName: 'Future Center',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
