<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { CALL_THEMES, useCallTheme, type CallThemeId } from '@/composables/useCallTheme'

/** Chọn giao diện cho khung cuộc gọi đến: các giao diện có sẵn và ảnh trong máy. */
const ui = useUiStore()
const theme = useCallTheme()
const input = ref<HTMLInputElement | null>(null)

async function onFile(e: Event) {
  const el = e.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (!file) return
  if (!(await theme.setPhoto(file))) ui.showToast(t('settings.callerId.theme.failed'), 'warning')
}

/** Ô "Ảnh của bạn": chưa có ảnh hoặc đang dùng ảnh thì mở bộ chọn (đổi ảnh khác); có ảnh nhưng chưa dùng thì chọn ảnh đó. */
function pickPhoto() {
  if (theme.photo.value && theme.current.value !== 'photo') theme.select('photo')
  else input.value?.click()
}

const isOn = (id: CallThemeId) => theme.current.value === id
</script>

<template>
  <div role="radiogroup" :aria-label="t('settings.callerId.theme.title')" class="flex gap-3 overflow-x-auto px-4 pt-1 pb-2">
    <button
      v-for="th in CALL_THEMES"
      :key="th.id"
      type="button"
      role="radio"
      :aria-checked="isOn(th.id)"
      class="tap flex shrink-0 flex-col items-center gap-1.5"
      @click="theme.select(th.id)"
    >
      <span class="tile" :class="{ 'tile-on': isOn(th.id) }">
        <span class="card" :class="{ glass: th.id === 'glass' }" :style="{ background: th.card }">
          <span class="bar" />
          <span class="line" :class="th.light ? 'bg-white/80' : 'bg-ink/70'" />
          <span class="line short" :class="th.light ? 'bg-white/45' : 'bg-ink/25'" />
        </span>
        <AppIcon v-if="isOn(th.id)" name="check" :size="16" class="check" />
      </span>
      <span class="text-xs font-medium" :class="isOn(th.id) ? 'text-primary-dark' : 'text-muted'">{{ t(`settings.callerId.theme.${th.id}`) }}</span>
    </button>

    <!-- Ảnh trong máy -->
    <div class="relative flex shrink-0 flex-col items-center gap-1.5">
      <button
        type="button"
        role="radio"
        :aria-checked="isOn('photo')"
        :aria-label="t('settings.callerId.theme.photo')"
        class="tap tile"
        :class="{ 'tile-on': isOn('photo') }"
        @click="pickPhoto"
      >
        <span v-if="theme.photo.value" class="card" :style="theme.photoBg(theme.photo.value)">
          <span class="bar" />
          <span class="line bg-white/80" />
          <span class="line short bg-white/45" />
        </span>
        <span v-else class="card empty grid place-items-center"><AppIcon name="image-plus" :size="20" class="text-primary-dark" /></span>
        <AppIcon v-if="isOn('photo')" name="check" :size="16" class="check" />
      </button>
      <span class="text-xs font-medium" :class="isOn('photo') ? 'text-primary-dark' : 'text-muted'">{{ t('settings.callerId.theme.photo') }}</span>
      <button
        v-if="theme.photo.value"
        type="button"
        class="tap absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-ink text-white shadow-card"
        :aria-label="t('settings.callerId.theme.remove')"
        @click="theme.removePhoto()"
      >
        <AppIcon name="x" :size="14" />
      </button>
      <input ref="input" type="file" accept="image/*" class="hidden" @change="onFile" />
    </div>
  </div>
</template>

<style scoped>
/* Ô = một màn hình nhỏ (nền tím như màn hình chính) với thẻ popup theo giao diện. */
.tile { position: relative; display: grid; place-items: center; width: 74px; height: 96px; padding: 0 7px; border-radius: 18px; border: 3px solid #fff; background: linear-gradient(180deg, #bbb1eb, #a78bd6 55%, #64539b); box-shadow: 0 0 0 1px var(--color-line), 0 4px 12px #54358114; }
.tile-on { box-shadow: 0 0 0 2px var(--color-primary), 0 6px 16px #7540ed33; }
.card { display: block; width: 100%; height: 40px; overflow: hidden; border-radius: 9px; box-shadow: 0 4px 10px #1f143d33; }
.card.glass { border: 1px solid #ffffff59; backdrop-filter: blur(6px); }
.card.empty { background: var(--color-primary-soft); border: 1.5px dashed #cdb8f7; box-shadow: none; }
.bar { display: block; height: 9px; background: var(--color-primary); }
.line { display: block; height: 4px; width: 70%; margin: 6px 0 0 6px; border-radius: 4px; }
.line.short { width: 45%; margin-top: 4px; }
.check { position: absolute; right: 5px; bottom: 5px; color: #fff; filter: drop-shadow(0 1px 2px #0006); }
</style>
