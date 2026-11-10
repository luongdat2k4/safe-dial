import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'vn.alf.safedial',
  appName: 'Safe Dial',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#0B6E4F' },
    StatusBar: { style: 'DARK', backgroundColor: '#0B6E4F' },
  },
}

export default config
