import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { ALF, ALFAdMob } from '@alf/app-sdk'
import { adMobReady, adsConfig, initAds } from './adsConfig'
import { preloadMrec } from './mrec'
import { preloadBanner, syncBannerHeight } from './banner'

const initialized = ref(false)
const consentReady = ref(false)
export const adsSuppressed = ref(false)
// Ứng dụng gọi điện: đang ở màn cuộc gọi hoặc có cuộc gọi → không quảng cáo nào được hiện (kể cả banner đang có),
// không quảng cáo toàn màn hình nào được mở. App.vue bật / tắt cờ này đồng bộ theo route và phiên gọi.
export const adsBlocked = ref(false)
// Native ads are views above the WebView, so CSS z-index cannot keep them from drawing over each other or over
// a sheet. These two refs are how the rest of the app keeps them apart.
// Height of the bottom strip the banner occupies right now (0 while no banner is up); native ads stay clear of it.
export const bannerReserved = ref(0)
// Number of sheets or popups currently open; page ads hide while any is.
export const openModals = ref(0)
export function holdAdsWhile(open: Ref<boolean>) {
  let held = false
  const hold = (on: boolean) => {
    if (on === held) return
    held = on
    openModals.value += on ? 1 : -1
  }
  watch(open, hold, { immediate: true, flush: 'sync' })
  onBeforeUnmount(() => hold(false))
}
// The safe-area inset below the banner (the system navigation bar), which only CSS exposes (--sai-bottom).
let safeBottom: number | undefined
export function safeAreaBottom(): number {
  if (safeBottom === undefined) {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:var(--sai-bottom)'
    document.body.appendChild(probe)
    safeBottom = parseFloat(getComputedStyle(probe).paddingBottom) || 0
    probe.remove()
  }
  return safeBottom
}
export const fullScreenShowing = ref(false)
export const adsAvailable = computed(() => Capacitor.isNativePlatform() && initialized.value && !adsBlocked.value && (adsConfig.settings?.testAds === true || consentReady.value))

// Production callers must set this only after their consent flow says ads may be requested.
export function setAdConsentReady(ready: boolean) { consentReady.value = ready }
export function setAdsInitialized(ready: boolean) { initialized.value = ready }
export const launchFinished = ref(false)

let initialization: Promise<void> | undefined
export function initializeAds(): Promise<void> {
  return initialization ??= initAds()
    // No consent platform is wired up yet (ALF SDK has no consent API), so ads are allowed once the SDKs are ready.
    // Replace this with the result of a real consent flow before shipping to the EU/UK.
    .then(() => { setAdConsentReady(true); setAdsInitialized(true); void preloadInterstitial(); preloadMrec(); preloadBanner(); syncBannerHeight() })
    .catch(error => console.warn('[ads] init failed', error))
}

let appOpenAttempted = false
// When the last full-screen ad was closed (not when it opened): the spacing between ads counts from here.
let lastFullScreenAt = 0
let interstitialLoaded = false
let showing = false

export async function tryAppOpenOnLaunch(signal: AbortSignal): Promise<void> {
  if (appOpenAttempted || !Capacitor.isNativePlatform() || document.hidden || signal.aborted) return
  appOpenAttempted = true
  // One deadline covers SDK initialization, loading, readiness and listener setup.
  // A late load may finish in the cache, but must never show over the next screen.
  const deadline = Date.now() + 5000
  const withinDeadline = <T>(operation: Promise<T>) => waitFor(operation, Math.max(0, deadline - Date.now()), signal)
  let listener: Awaited<ReturnType<typeof ALFAdMob.addListener>> | undefined
  let ownsFullScreen = false
  try {
    await withinDeadline(initializeAds())
    if (!adsAvailable.value || await withinDeadline(ALF.Instance.Ads.IsAdsRemoved())) return
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
    const adUnitId = adsConfig.settings?.testAds === true
      ? (platform === 'ios' ? 'ca-app-pub-3940256099942544/5575463023' : 'ca-app-pub-3940256099942544/9257395921')
      : adsConfig.keys?.admob?.[platform]?.openApp
    // No app-open unit: the launch moment is a full-screen MAX interstitial instead.
    if (!adUnitId) { await launchInterstitial(signal, deadline, withinDeadline); return }
    await withinDeadline(adMobReady)
    await withinDeadline(ALFAdMob.loadOpenAppAd({ adUnitId }))
    const { ready } = await withinDeadline(ALFAdMob.isOpenAppAdReady({ adUnitId }))
    if (!ready) return
    let closed!: () => void
    const dismissed = new Promise<void>(resolve => { closed = resolve })
    // SDK 1.9.0's ShowAdMobAppOpenAd does not forward dismissal to its
    // controller close handlers. Subscribe to the native event directly.
    const pendingListener = ALFAdMob.addListener('OnOpenAppAdDismissedEvent', event => {
      if (event.adUnitId === adUnitId) closed()
    })
    void pendingListener.then(handle => {
      if (signal.aborted || Date.now() >= deadline) handle.remove()
    }, () => {})
    listener = await withinDeadline(pendingListener)
    if (signal.aborted || document.hidden || !adsAvailable.value || showing || Date.now() >= deadline) return
    showing = true
    ownsFullScreen = true
    fullScreenShowing.value = true
    await withinDeadline(ALFAdMob.showOpenAppAd({ adUnitId }))
    // Showing resolves when the ad opens. Navigation must wait for dismissal.
    // The watchdog also releases the launch if the native callback is lost.
    await waitFor(dismissed, 120_000, signal)
  } catch (error) {
    if (!signal.aborted) console.warn('[ads] launch ad skipped', error)
  } finally {
    listener?.remove()
    if (ownsFullScreen) {
      lastFullScreenAt = Date.now()
      showing = false
      fullScreenShowing.value = false
    }
  }
}

// Shows the MAX interstitial on launch, but only one that is already loaded inside the launch deadline,
// so a late load can never appear over the next screen. Resolves once the ad has been closed.
async function launchInterstitial(signal: AbortSignal, deadline: number, withinDeadline: <T>(operation: Promise<T>) => Promise<T>): Promise<void> {
  await withinDeadline(preloadInterstitial())
  if (!interstitialLoaded || signal.aborted || document.hidden || Date.now() >= deadline) return
  await showInterstitial('app_launch', true)
  if (!fullScreenShowing.value) return
  await waitFor(new Promise<void>(resolve => {
    const stop = watch(fullScreenShowing, showingNow => { if (!showingNow) { stop(); resolve() } })
  }), 120_000, signal)
}

async function waitFor<T>(operation: Promise<T>, timeout: number, signal: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort = () => {}
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      abort = () => reject(new Error('Launch ad cancelled'))
      timer = setTimeout(() => reject(new Error('Launch ad timed out')), timeout)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
    })])
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

// Full-screen ads are spaced out so the triggers (launch, screens) can never stack into back-to-back ads.
const FULL_SCREEN_GAP_MS = 30_000

export async function preloadInterstitial(): Promise<void> {
  if (!adsAvailable.value || interstitialLoaded || showing) return
  // This SDK exposes MAX interstitials (and an AdMob test fallback); with real ads only the MAX unit can load.
  if (adsConfig.settings?.testAds !== true && !adsConfig.keys?.applovin?.android?.interstitial) return
  try { await ALF.Instance.Ads.LoadInterstitial(); interstitialLoaded = true } catch { /* no fill */ }
}

// Shows a loaded interstitial for the placement, or silently does nothing; the next one is preloaded either way.
// A milestone ignores the spacing and waits for the ad to load instead of skipping it.
export async function showInterstitial(placement: string, milestone = false): Promise<void> {
  // While any full-screen ad is up nothing else may open; the spacing starts once it has been closed.
  if (!adsAvailable.value || showing || document.hidden || (!milestone && Date.now() - lastFullScreenAt < FULL_SCREEN_GAP_MS)) return
  if (!interstitialLoaded && milestone) await preloadInterstitial()
  if (!interstitialLoaded) { void preloadInterstitial(); return }
  interstitialLoaded = false
  showing = true
  fullScreenShowing.value = true
  try {
    await ALF.Instance.Ads.ShowInterstitial(() => { showing = false; fullScreenShowing.value = false; lastFullScreenAt = Date.now(); void preloadInterstitial() }, placement)
  } catch { showing = false; fullScreenShowing.value = false }
}
