import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { ALF, ALFAppLovinMAX } from '@alf/app-sdk'
import { adsConfig } from '@/features/ads/adsConfig'

// The MAX banner is created and loaded as soon as the SDK is ready, then only shown and hidden. The SDK's own
// LoadBannerAd does not create a MAX banner (that happens inside ShowBannerAd, i.e. when it is first wanted), so
// going through it would start the request only once the banner is already due on screen.
const adUnitId = adsConfig.keys?.applovin?.android?.banner ?? ''
export const bannerEnabled = !!adUnitId && adsConfig.settings?.testAds !== true

// Native ads only exist on a device. Their space is reserved from the first frame, before any ad is known, so a
// banner or native ad that arrives (or never does) never moves the layout.
export const adsPossible = Capacitor.isNativePlatform()
// A phone banner is 50px (90 on a tablet, which is corrected as soon as the native side has answered).
export const bannerHeight = ref(adsPossible ? 50 : 0)

// idle/loading: no ad yet (the strip shows a loading shape) · slow: it is taking too long, so the loading shape
// stops but the strip stays and the banner fills it if it does load · failed: the request ended without an ad ·
// retry: a background retry after that, with no loading shape.
export type BannerState = 'idle' | 'loading' | 'slow' | 'retry' | 'ready' | 'failed'
export const bannerState = ref<BannerState>('idle')
// MAX retries an unfilled request for about a minute before it reports failure; nobody should stare at a loading
// shape that long.
const LOADING_MS = 10_000
// Whether the strip should still show its loading shape.
export const bannerLoading = () => bannerEnabled && (bannerState.value === 'idle' || bannerState.value === 'loading')
const MAX_RETRIES = 3
let retries = 0

let wanted = false
let shown = false
let queue: Promise<void> = Promise.resolve()
function run(job: () => Promise<unknown>) {
  queue = queue.then(job).then(() => {}, () => {})
}

// The banner's height is asked of the native side once and shared by everyone who needs it.
let heightRequest: Promise<number> | undefined
export function bannerHeightPx(): Promise<number> {
  return heightRequest ??= ALF.Instance.Ads.GetAdHeight('banner')
}
export function syncBannerHeight() {
  if (adsPossible) void bannerHeightPx().then(h => { bannerHeight.value = h })
}

// Creates the banner ahead of time. createBanner resolves once its first ad has loaded, so it is awaited outside
// the queue; hide/show calls stay free to run while the ad is still loading.
export function preloadBanner(silent = false) {
  if (!bannerEnabled || ['loading', 'slow', 'retry', 'ready'].includes(bannerState.value)) return
  bannerState.value = silent ? 'retry' : 'loading'
  if (!silent) setTimeout(() => { if (bannerState.value === 'loading') bannerState.value = 'slow' }, LOADING_MS)
  void bannerHeightPx()
  run(async () => {
    void ALFAppLovinMAX.createBanner({ adUnitId, position: 'BOTTOM_CENTER' }).then(onLoaded, onFailed)
    // Nothing should be on screen until a screen asks for it. A banner that is still loading draws nothing.
    if (!wanted) await ALFAppLovinMAX.hideBanner({ adUnitId }).catch(() => {})
  })
}

function onLoaded() {
  retries = 0
  bannerState.value = 'ready'
  run(async () => {
    if (wanted && !shown) { shown = true; await ALFAppLovinMAX.showBanner({ adUnitId }) }
    else if (!wanted) await ALFAppLovinMAX.hideBanner({ adUnitId })
  })
}

function onFailed() {
  bannerState.value = 'failed'
  if (retries++ >= MAX_RETRIES) return
  setTimeout(() => { if (bannerState.value === 'failed') preloadBanner(true) }, 30_000)
}

// Whether a screen wants the banner on show right now. Hiding keeps the loaded ad for the next time.
export function setBannerWanted(on: boolean) {
  if (!bannerEnabled || wanted === on) return
  wanted = on
  if (bannerState.value === 'idle') preloadBanner()
  if (bannerState.value !== 'ready') return
  run(async () => {
    if (wanted && !shown) { shown = true; await ALFAppLovinMAX.showBanner({ adUnitId }) }
    else if (!wanted && shown) { shown = false; await ALFAppLovinMAX.hideBanner({ adUnitId }) }
  })
}
