<script lang="ts">
let owner: symbol | null = null
let operation = Promise.resolve()
function enqueue(action: () => Promise<void>) {
  operation = operation.then(action).catch(error => console.warn('[ads] banner failed', error))
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { ALF, ALFAppLovinMAX, type BannerInitOptions } from '@alf/app-sdk'
import { adsBlocked, bannerReserved, safeAreaBottom } from '@/features/ads/adRuntime'
import { adsConfig } from '@/features/ads/adsConfig'
import { bannerEnabled, bannerHeight, bannerLoading, setBannerWanted } from '@/features/ads/banner'

// AdMob draws the banner over the WebView, anchored to the screen edge, so this
// element only reserves that strip of the page — it must touch the same edge.
// `visible` hides the banner instead of destroying it, so its loaded ad survives a full-screen ad, the player
// or the keyboard and comes back at once instead of being requested again.
const props = withDefaults(defineProps<{ position?: BannerInitOptions['position']; size?: BannerInitOptions['size']; visible?: boolean }>(), { position: 'BOTTOM_CENTER', visible: true })

const native = Capacitor.isNativePlatform()
// Known from the first frame, so the strip is never added to the layout after the fact.
const height = computed(() => props.size === 'BANNER' ? 50 : bannerHeight.value)
const id = Symbol('banner-host')
// Đang gọi thì banner ẩn dù màn hình vẫn muốn hiện (nó là view native nằm đè lên WebView).
const wantVisible = computed(() => props.visible && !adsBlocked.value)
const bannerUnit = adsConfig.keys?.applovin?.android?.banner ?? ''
let shown = false

onMounted(async () => {
  if (!native) return
  owner = id
  if (owner === id && wantVisible.value) bannerReserved.value = height.value + safeAreaBottom()
  // The banner was created when the SDK became ready; this screen only asks for it to be shown.
  if (bannerEnabled) { setBannerWanted(wantVisible.value); return }
  enqueue(async () => {
    if (owner !== id) return
    // Created even while hidden so the first ad is already loaded when the banner is first wanted.
    await ALF.Instance.Ads.LoadBannerAd({ position: props.position, size: props.size })
    shown = false
    if (owner !== id) return
    // A MAX banner may come up visible as soon as it is created, so a hidden one is hidden again here.
    if (wantVisible.value) await showBanner()
    else await ALF.Instance.Ads.HideBannerAd()
  })
})

async function showBanner() {
  if (shown) return
  shown = true
  // Re-showing the same MAX banner does not reload it; the SDK's ShowBannerAd (with its AdMob fallback) is the backup.
  try { await ALFAppLovinMAX.showBanner({ adUnitId: bannerUnit }) } catch { await ALF.Instance.Ads.ShowBannerAd() }
}

watch(wantVisible, visible => {
  if (!native || owner !== id) return
  bannerReserved.value = visible ? height.value + safeAreaBottom() : 0
  if (bannerEnabled) { setBannerWanted(visible); return }
  enqueue(async () => {
    if (owner !== id) return
    if (visible) await showBanner()
    else if (shown) { shown = false; await ALF.Instance.Ads.HideBannerAd() }
  })
})

onBeforeUnmount(() => {
  if (!native) return
  if (owner !== id) return
  owner = null
  bannerReserved.value = 0
  // The loaded banner outlives this screen: it is only hidden, so the next screen gets it straight away.
  if (bannerEnabled) { setBannerWanted(false); return }
  enqueue(() => ALF.Instance.Ads.DestroyBannerAd())
})
</script>

<template>
  <div v-if="native" class="w-full shrink-0" :class="bannerLoading() ? 'skeleton' : ''" :style="{ height: `${height}px` }" aria-hidden="true" />
</template>
