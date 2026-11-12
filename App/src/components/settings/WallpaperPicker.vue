<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { WALLPAPERS, useCallWallpaper } from '@/composables/useCallWallpaper'

/** Chọn hình nền màn hình cuộc gọi: các hình có sẵn và ảnh trong máy. */
defineProps<{ disabled?: boolean }>()
const ui = useUiStore()
const wallpaper = useCallWallpaper()
const input = ref<HTMLInputElement | null>(null)
const photoStyle = computed(() =>
  wallpaper.photo.value ? { backgroundImage: `url("${wallpaper.photo.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined,
)

async function onFile(e: Event) {
  const el = e.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (!file) return
  if (!(await wallpaper.setPhoto(file))) ui.showToast(t('settings.callerId.wallpaper.failed'), 'warning')
}

/** Ô "Ảnh của bạn": chưa có ảnh hoặc đang dùng ảnh thì mở bộ chọn (đổi ảnh khác); có ảnh nhưng chưa dùng thì chọn ảnh đó. */
function pickPhoto() {
  if (wallpaper.photo.value && wallpaper.current.value !== 'photo') wallpaper.select('photo')
  else input.value?.click()
}
</script>

<template>
  <div class="transition-opacity" :class="{ 'pointer-events-none opacity-45': disabled }">
    <div role="radiogroup" :aria-label="t('settings.callerId.wallpaper.title')" class="flex gap-3 overflow-x-auto px-4 pt-1 pb-2">
      <button
        v-for="w in WALLPAPERS"
        :key="w.id"
        type="button"
        role="radio"
        :aria-checked="wallpaper.current.value === w.id"
        class="tap flex shrink-0 flex-col items-center gap-1.5"
        @click="wallpaper.select(w.id)"
      >
        <span
          class="tile grid place-items-center"
          :class="{ 'tile-on': wallpaper.current.value === w.id }"
          :style="{ background: w.bg }"
        >
          <AppIcon v-if="wallpaper.current.value === w.id" name="check" :size="20" class="text-white drop-shadow" />
        </span>
        <span class="text-xs font-medium" :class="wallpaper.current.value === w.id ? 'text-primary-dark' : 'text-muted'">
          {{ t(`settings.callerId.wallpaper.${w.id}`) }}
        </span>
      </button>

      <!-- Ảnh trong máy -->
      <div class="relative flex shrink-0 flex-col items-center gap-1.5">
        <button
          type="button"
          role="radio"
          :aria-checked="wallpaper.current.value === 'photo'"
          :aria-label="t('settings.callerId.wallpaper.photo')"
          class="tap tile grid place-items-center"
          :class="[wallpaper.current.value === 'photo' ? 'tile-on' : '', wallpaper.photo.value ? '' : 'tile-empty']"
          :style="photoStyle"
          @click="pickPhoto"
        >
          <AppIcon v-if="!wallpaper.photo.value" name="image-plus" :size="22" class="text-primary-dark" />
          <AppIcon v-else-if="wallpaper.current.value === 'photo'" name="check" :size="20" class="text-white drop-shadow" />
        </button>
        <span class="text-xs font-medium" :class="wallpaper.current.value === 'photo' ? 'text-primary-dark' : 'text-muted'">
          {{ t('settings.callerId.wallpaper.photo') }}
        </span>
        <button
          v-if="wallpaper.photo.value"
          type="button"
          class="tap absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-ink text-white shadow-card"
          :aria-label="t('settings.callerId.wallpaper.remove')"
          @click="wallpaper.removePhoto()"
        >
          <AppIcon name="x" :size="14" />
        </button>
        <input ref="input" type="file" accept="image/*" class="hidden" @change="onFile" />
      </div>

    </div>
    <p v-if="disabled" class="px-4 text-xs text-muted">{{ t('settings.callerId.wallpaper.fullHint') }}</p>
  </div>
</template>

<style scoped>
.tile { width: 58px; height: 100px; border-radius: 16px; border: 3px solid #fff; box-shadow: 0 0 0 1px var(--color-line), 0 4px 12px #54358114; }
.tile-on { box-shadow: 0 0 0 2px var(--color-primary), 0 6px 16px #7540ed33; }
.tile-empty { background: var(--color-primary-soft); border-style: dashed; border-color: #cdb8f7; }
</style>
