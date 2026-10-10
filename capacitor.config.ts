import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.commons.union',
  appName: 'Commons',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
