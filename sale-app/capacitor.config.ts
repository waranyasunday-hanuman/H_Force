import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hforce.saleapp',
  appName: 'H-Force Sale App',
  webDir: 'out',
  server: {
    url: 'https://h-force-k8s9cnspp-waranyasunday-hanumans-projects.vercel.app',
    cleartext: true
  }
};

export default config;
