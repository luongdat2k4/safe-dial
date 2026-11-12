import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'vn.alf.safedial',
  appName: 'Safe Dial',
  webDir: 'dist',
  // Dev: load the app from the Vite dev server on the LAN (live reload).
  // Remove/comment this block before building a release APK.
  // server: {
  //   androidScheme: 'http',
  //   url: 'http://192.168.179.209:5173',
  //   cleartext: true,
  // },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#0B6E4F' },
    // Giá trị lúc khởi động; sau đó đổi theo từng màn (src/utils/statusBar.ts).
    StatusBar: { style: 'LIGHT', backgroundColor: '#f7f3ff' },
  },
}

export default config
