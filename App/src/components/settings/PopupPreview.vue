<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { PopupPosition, PopupSize } from '@/types'
import { t } from '@/composables/useT'
import { useCallTheme } from '@/composables/useCallTheme'

/** Mô hình điện thoại thu nhỏ: popup caller-ID đổi vị trí và hình dạng theo cài đặt. */
const props = withDefaults(defineProps<{ size: PopupSize; position: PopupPosition; mini?: boolean }>(), { mini: false })

const full = computed(() => props.size === 'full')
// Khung lớn: nền tím như màn hình chính, khung cuộc gọi theo giao diện đang chọn.
const theme = useCallTheme()
const themed = computed(() => !props.mini)
const cardStyle = computed(() => {
  if (!themed.value) return undefined
  return full.value ? (theme.fullStyle.value ?? { background: '#f4edff' }) : theme.cardStyle.value
})
const light = computed(() => themed.value && theme.light.value)
const place = computed(() => {
  if (full.value) return 'inset-1.5'
  return { top: 'top-6 inset-x-2', center: 'top-1/2 -translate-y-1/2 inset-x-2', bottom: 'bottom-6 inset-x-2' }[props.position]
})
</script>

<template>
  <div
    class="relative overflow-hidden border-ink/80"
    :class="mini ? 'h-16 w-10 rounded-lg border-2 bg-canvas' : 'preview-home h-[300px] w-[160px] rounded-[26px] border-[5px] shadow-card'"
    aria-hidden="true"
  >
    <div v-if="!mini" class="mx-auto mt-1.5 h-1.5 w-10 rounded-full bg-ink/20" />
    <div
      class="absolute overflow-hidden shadow-sheet transition-all duration-300"
      :class="[place, full ? 'rounded-xl' : mini ? 'h-3 rounded-sm bg-surface' : 'rounded-2xl', theme.glass.value && themed ? 'border border-white/35 backdrop-blur-md' : '']"
      :style="cardStyle"
    >
      <template v-if="!mini">
        <div class="flex items-center gap-1.5 bg-spam px-2 py-1.5 text-white">
          <AppIcon name="phone-incoming" :size="12" />
          <span class="text-[10px] font-semibold">{{ t('settings.callerId.previewCaller') }}</span>
        </div>
        <div class="px-2 py-2">
          <div class="h-1.5 w-16 rounded-full" :class="light ? 'bg-white/70' : 'bg-line'" />
          <div class="mt-1.5 h-1.5 w-10 rounded-full" :class="light ? 'bg-white/40' : 'bg-line'" />
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

<style scoped>
.preview-home { background: linear-gradient(180deg, #bbb1eb, #a78bd6 55%, #64539b); }
</style>
