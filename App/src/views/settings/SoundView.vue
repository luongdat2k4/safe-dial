<script setup lang="ts">
import { ref } from 'vue'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import ListRow from '@/components/ListRow.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import RadioSheet from '@/components/settings/RadioSheet.vue'
import { useSettingsStore } from '@/stores/settings'
import type { DialSound } from '@/types'
import { t } from '@/composables/useT'

const settings = useSettingsStore()
const sheet = ref(false)

const ringtoneOptions = [0, 1, 2, 3, 4, 5].map((i) => {
  const label = t(`settings.sound.ringtones.${i}`)
  return { value: label, label }
})

const dialOptions: { value: DialSound; icon: string }[] = [
  { value: 'silent', icon: 'volume-x' },
  { value: 'vibrate', icon: 'vibrate' },
  { value: 'sound', icon: 'volume-2' },
  { value: 'both', icon: 'audio-lines' },
]
</script>

<template>
  <div class="flex flex-col bg-canvas">
    <AppBar :title="t('settings.sound.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto pb-6">
      <div class="mx-4 mt-4 overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow :title="t('settings.sound.ringtone')" icon="music" chevron @click="sheet = true">
          <template #right><span class="max-w-28 truncate text-sm text-muted">{{ settings.state.ringtone }}</span></template>
        </ListRow>
      </div>

      <SectionHeader :title="t('settings.sound.dial')" />
      <p class="px-4 pb-2 text-[13px] text-muted">{{ t('settings.sound.dialSub') }}</p>
      <div role="radiogroup" :aria-label="t('settings.sound.dial')" class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <button
          v-for="o in dialOptions"
          :key="o.value"
          type="button"
          role="radio"
          :aria-checked="settings.state.dialSound === o.value"
          class="tap flex min-h-14 w-full items-center gap-3 px-4 text-left"
          @click="settings.patch({ dialSound: o.value })"
        >
          <span
            class="grid size-10 shrink-0 place-items-center rounded-xl"
            :class="settings.state.dialSound === o.value ? 'bg-primary text-white' : 'bg-primary-soft text-primary-dark'"
          >
            <AppIcon :name="o.icon" :size="20" />
          </span>
          <span class="flex-1 text-[15px] font-medium">{{ t(`settings.sound.dialOptions.${o.value}`) }}</span>
          <span
            class="grid size-6 place-items-center rounded-full border-2"
            :class="settings.state.dialSound === o.value ? 'border-primary bg-primary text-white' : 'border-line'"
          >
            <AppIcon v-if="settings.state.dialSound === o.value" name="check" :size="14" />
          </span>
        </button>
      </div>
      <p class="mt-4 px-5 text-center text-xs text-muted">{{ t('settings.sound.demo') }}</p>
    </div>

    <RadioSheet
      :model-value="settings.state.ringtone"
      v-model:open="sheet"
      :title="t('settings.sound.ringtoneSheet')"
      :options="ringtoneOptions"
      @update:model-value="(v: string) => settings.patch({ ringtone: v })"
    />
  </div>
</template>
