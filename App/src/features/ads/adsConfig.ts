import { ALF, type Config } from '@alf/app-sdk'

// Google's official test app IDs. `settings.testAds` (1.9.0+) makes AdController
// request Google's test ad units for every format, so ads fill without a real
// AdMob account. Replace both app IDs and the ad units, then set
// `testAds: false` and `dev: false`, before shipping.
const TEST_APP_ID = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
}

export const adsConfig: Config = {
  settings: {
    dev: true,
    testAds: true,
    isGame: false,
    isApp: true,
    appName: 'Safe Dial',
    appVersion: '1.0',
    environment: 'dev',
  },
  keys: {
    applovin: {
      android: {
        // Key của tài khoản AppLovin (dùng chung cho các app ALF).
        sdkKey: 'eQt0q3679KmUyKeNcSzqC01eB-lILmfTnJoufGxpSn__n1NVhHLeMgxZOaICke451El4ZBfuZum9Qw4WxzpW52',
        // TODO: ad unit MAX riêng của Safe Dial (vn.alf.safedial). Còn trống thì banner / interstitial chạy bằng
        // quảng cáo test của AdMob, còn ô native (MREC) không hiện.
        banner: '',
        mrec: '',
        interstitial: '',
        rewarded: '',
        appOpen: '',
      },
      // iOS ad units are not created yet.
      ios: { sdkKey: '', banner: '', mrec: '', interstitial: '', rewarded: '', appOpen: '' },
    },
    admob: {
      android: { appId: TEST_APP_ID.android, banner: '', interstitial: '', rewarded: '', openApp: '', native: '' },
      ios: { appId: TEST_APP_ID.ios, banner: '', interstitial: '', rewarded: '', openApp: '', native: '' },
    },
  },
}

// Ads only: the rest of the framework (analytics, push, i18n, IAP) is not
// initialised, so booting it cannot prompt or log anything the app didn't ask for.
export async function initAds(): Promise<void> {
  const alf = ALF.Instance
  await alf.initControllers()
  alf.Config.set(adsConfig)
  // MAX serves the banner, MREC and interstitials, so only it is waited for. AdMob starts alongside and is only
  // awaited when the AdMob test units are in use (testAds) or an app-open unit is loaded.
  adMobReady = alf.Ads.initAdMob()
  adMobReady.catch(() => {})
  await alf.Ads.init()
  if (adsConfig.settings?.testAds === true) await adMobReady
}

export let adMobReady: Promise<void> = Promise.resolve()
