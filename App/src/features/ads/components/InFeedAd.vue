<script setup lang="ts">
import type { NativeAdTemplate } from '@alf/app-sdk'
import { adsPossible } from '@/features/ads/banner'
import { mrecEnabled } from '@/features/ads/mrec'
import NativeAd from './NativeAd.vue'

// In-feed ad: a native ad placed between feed items. The "Ad" label sits outside
// the ad view so the placement stays identifiable even before the creative
// loads; the SDK's own badge and AdChoices stay inside and are never covered.
// The space is reserved up front, so the feed does not shift when the ad fills.
const props = withDefaults(defineProps<{ template?: NativeAdTemplate }>(), { template: 'mrec' })
</script>

<template>
  <div v-if="adsPossible && mrecEnabled" class="w-full">
    <p class="mb-2 flex items-center gap-2">
      <span class="rounded-[5px] bg-ink px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">Ad</span>
    </p>
    <NativeAd :template="props.template" />
  </div>
</template>
