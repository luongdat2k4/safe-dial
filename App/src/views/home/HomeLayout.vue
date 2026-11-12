<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { t } from '@/composables/useT'
import AppIcon from '@/components/AppIcon.vue'
import BottomNav from '@/components/BottomNav.vue'
import FabButton from '@/components/FabButton.vue'
import appIcon from '@/assets/app-icon.webp'
// [ADS TẮT] import BannerAd from '@/features/ads/components/BannerAd.vue'
// [ADS TẮT] import { adsPossible, bannerHeight } from '@/features/ads/banner'
// [ADS TẮT] import { showInterstitial } from '@/features/ads/adRuntime'

const route = useRoute()
const router = useRouter()
const pageTitle = computed(() => {
  const labels: Record<string, string> = {
    '/home/calls': 'common.nav.calls',
    '/home/contacts': 'common.nav.contacts',
    '/home/block': 'common.nav.block',
    '/home/stats': 'common.nav.stats',
  }
  return t(labels[route.path] ?? 'common.appName')
})
const showFab = computed(() => route.path === '/home/calls' || route.path === '/home/contacts')
// Mở Cài đặt là một điểm dừng tự nhiên: interstitial nếu đã tải sẵn (cách quảng cáo toàn màn hình trước ≥ 30 giây).
function openSettings() {
  // [ADS TẮT] void showInterstitial('open_settings')
  router.push('/settings')
}
// Banner nằm ở đáy màn hình (view native); thanh điều hướng nổi và nút bàn phím được đẩy lên phía trên nó.
// [ADS TẮT] const adGap = computed(() => (adsPossible ? bannerHeight.value : 0))
const adGap = 0
</script>

<template>
  <div class="relative flex h-full flex-col">
    <header class="home-header pt-safe shrink-0 px-5 pt-6 pb-2">
      <div class="brand-row mb-5 flex items-center justify-between">
        <span class="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
          <img :src="appIcon" alt="" width="32" height="32" class="size-8 rounded-[10px]" />
          Safe Dial
        </span>
        <button class="tap icon-control grid size-10 place-items-center rounded-full text-muted" :aria-label="t('settings.title')" @click="openSettings">
          <AppIcon name="settings" :size="19" />
        </button>
      </div>
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-[28px] leading-tight font-semibold tracking-[-1px] text-ink">{{ pageTitle }}</h1>
        <button class="tap grid size-10 place-items-center rounded-full text-primary" :aria-label="t('dial.search.title')" @click="router.push('/search')">
          <AppIcon name="search" :size="21" />
        </button>
      </div>
    </header>
    <main data-ad-scroll-region class="relative min-h-0 flex-1 overflow-y-auto">
      <RouterView v-slot="{ Component }"><component :is="Component" /></RouterView>
    </main>
    <FabButton v-if="showFab" icon="grid-3x3" :label="t('dial.title')" :style="{ bottom: `${104 + adGap}px` }" @click="router.push('/dialpad')" />
    <BottomNav data-ad-bottom-edge :style="{ bottom: `${12 + adGap}px` }" />
    <!-- [ADS TẮT] <BannerAd /> -->
  </div>
</template>
