<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { PopupPosition, PopupSize } from '@/types'
import { t } from '@/composables/useT'
import { useCallWallpaper } from '@/composables/useCallWallpaper'

/** Mô hình điện thoại thu nhỏ: popup caller-ID đổi vị trí và hình dạng theo cài đặt. */
const props = withDefaults(defineProps<{ size: PopupSize; position: PopupPosition; mini?: boolean }>(), { mini: false })

const full = computed(() => props.size === 'full')
// Khung lớn ở kiểu Popup hiện đúng hình nền cuộc gọi đang chọn.
const wallpaper = useCallWallpaper()
const bg = computed(() => (!props.mini && !full.value ? wallpaper.style.value : undefined))
const place = computed(() => {
  if (full.value) return 'inset-1.5'
  return { top: 'top-6 inset-x-2', center: 'top-1/2 -translate-y-1/2 inset-x-2', bottom: 'bottom-6 inset-x-2' }[props.position]
})
</script>

<template>
  <div
    class="relative overflow-hidden border-ink/80 bg-canvas"
    :class="mini ? 'h-16 w-10 rounded-lg border-2' : 'h-[300px] w-[160px] rounded-[26px] border-[5px] shadow-card'"
    :style="bg"
    aria-hidden="true"
  >
    <div v-if="!mini" class="mx-auto mt-1.5 h-1.5 w-10 rounded-full bg-ink/20" />
    <div
      class="absolute overflow-hidden bg-surface shadow-sheet transition-all duration-300"
      :class="[place, full ? 'rounded-xl' : mini ? 'h-3 rounded-sm' : 'rounded-2xl']"
    >
      <template v-if="!mini">
        <div class="flex items-center gap-1.5 bg-spam px-2 py-1.5 text-white">
          <AppIcon name="phone-incoming" :size="12" />
          <span class="text-[10px] font-semibold">{{ t('settings.callerId.previewCaller') }}</span>
        </div>
        <div class="px-2 py-2">
          <div class="h-1.5 w-16 rounded-full bg-line" />
          <div class="mt-1.5 h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div v-if="full" class="flex flex-col items-center gap-2 pt-8 pb-10">
          <span class="grid size-12 place-items-center rounded-full bg-unknown-soft text-unknown"><AppIcon name="user-round" :size="24" /></span>
          <span class="flex gap-3">
            <span class="grid size-8 place-items-center rounded-full bg-scam text-white"><AppIcon name="phone-off" :size="14" /></span>
            <span class="grid size-8 place-items-center rounded-full bg-primary text-white"><AppIcon name="phone" :size="14" /></span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
