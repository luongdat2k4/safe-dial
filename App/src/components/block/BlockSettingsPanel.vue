<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBlockStore } from '@/stores/block'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import type { BlockMethod, BlockSettings } from '@/types'
import type { Country } from '@/utils/countries'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import ListRow from '@/components/ListRow.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import AppIcon from '@/components/AppIcon.vue'
import CountryPicker from './CountryPicker.vue'

const block = useBlockStore()
const app = useSettingsStore()
const ui = useUiStore()
const sheet = ref(false)

type ToggleKey = keyof Pick<BlockSettings, 'blockTopSpammers' | 'blockPrivate' | 'blockInternational' | 'blockNonContacts' | 'notifyOnBlock'>
const toggles: Array<{ key: ToggleKey; icon: string; tone: 'danger' | 'gray' | 'blue' | 'warn' | 'brand'; warn?: boolean }> = [
  { key: 'blockTopSpammers', icon: 'shield-x', tone: 'danger' },
  { key: 'blockPrivate', icon: 'eye-off', tone: 'gray' },
  { key: 'blockInternational', icon: 'globe', tone: 'blue' },
  { key: 'blockNonContacts', icon: 'user-round-x', tone: 'warn', warn: true },
  { key: 'notifyOnBlock', icon: 'bell', tone: 'brand' },
]

const methods: Array<{ key: BlockMethod; icon: string }> = [
  { key: 'hangup', icon: 'phone-off' },
  { key: 'silent', icon: 'bell-off' },
]

const taken = computed(() => block.rules.filter((r) => r.kind === 'country').map((r) => r.value))

function pickCountry(c: Country) {
  if (taken.value.includes(c.dial)) {
    ui.showToast(t('block.form.duplicate'), 'warning')
    return
  }
  block.addRule('country', c.dial, c.name)
  ui.showToast(t('block.settings.countryAdded', { name: c.name }), 'success')
  sheet.value = false
}
</script>

<template>
  <div class="pb-6">
    <SectionHeader :title="t('block.settings.header')" />
    <ul class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
      <li v-for="s in toggles" :key="s.key">
        <ListRow :icon="s.icon" :icon-tone="s.tone" :title="t(`block.settings.${s.key}.title`)" :subtitle="t(`block.settings.${s.key}.desc`)">
          <template #right><ToggleSwitch v-model="block.settings[s.key]" :label="t(`block.settings.${s.key}.title`)" /></template>
        </ListRow>
        <p
          v-if="s.warn && block.settings[s.key]"
          class="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-spam-soft px-3 py-2 text-[13px] leading-snug text-spam"
        >
          <AppIcon name="triangle-alert" :size="16" class="mt-0.5 shrink-0" />
          {{ t('block.settings.blockNonContacts.warn') }}
        </p>
      </li>
    </ul>

    <SectionHeader :title="t('block.settings.methodHeader')" />
    <div class="mx-4 space-y-2" role="radiogroup" :aria-label="t('block.settings.methodHeader')">
      <button
        v-for="m in methods"
        :key="m.key"
        type="button"
        role="radio"
        :aria-checked="block.settings.method === m.key"
        class="tap flex w-full items-start gap-3 rounded-card border-2 bg-surface p-3.5 text-left shadow-card"
        :class="block.settings.method === m.key ? 'border-primary' : 'border-transparent'"
        @click="block.patchSettings({ method: m.key })"
      >
        <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2" :class="block.settings.method === m.key ? 'border-primary' : 'border-line'">
          <span v-if="block.settings.method === m.key" class="size-2.5 rounded-full bg-primary" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1.5 text-[15px] font-semibold"><AppIcon :name="m.icon" :size="16" />{{ t(`block.settings.method.${m.key}.title`) }}</span>
          <span class="mt-0.5 block text-[13px] leading-snug text-muted">{{ t(`block.settings.method.${m.key}.desc`) }}</span>
        </span>
      </button>
    </div>

    <SectionHeader :title="t('block.settings.countryHeader')" />
    <div class="mx-4 overflow-hidden rounded-card bg-surface shadow-card">
      <ListRow icon="globe" icon-tone="violet" chevron :title="t('block.settings.country.title')" :subtitle="t('block.settings.country.desc', { n: taken.length })" @click="sheet = true" />
    </div>
    <p class="mx-4 mt-3 text-xs leading-relaxed text-muted">{{ t('block.settings.note', { dial: app.state.homeCountryDial }) }}</p>

    <BottomSheet v-model="sheet" :title="t('block.settings.country.title')" tall>
      <CountryPicker :taken="taken" :hide-home="app.state.homeCountryDial" @pick="pickCountry" />
    </BottomSheet>
  </div>
</template>
