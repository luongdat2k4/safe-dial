<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppBar from '@/components/AppBar.vue'
import BaseButton from '@/components/BaseButton.vue'
import ListRow from '@/components/ListRow.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import PopupPreview from '@/components/settings/PopupPreview.vue'
import CallThemePicker from '@/components/settings/CallThemePicker.vue'
import { useSettingsStore } from '@/stores/settings'
import type { PopupPosition, PopupSize } from '@/types'
import { t } from '@/composables/useT'

const router = useRouter()
const settings = useSettingsStore()

const sizes: PopupSize[] = ['classic', 'full']
const positions: PopupPosition[] = ['top', 'center', 'bottom']
</script>

<template>
  <div class="flex flex-col bg-canvas">
    <AppBar :title="t('settings.callerId.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto pb-8">
      <div class="mx-4 mt-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow :title="t('settings.callerId.enabled')" :subtitle="t('settings.callerId.enabledSub')" icon="contact-round">
          <template #right><ToggleSwitch v-model="settings.state.callerIdEnabled" :label="t('settings.callerId.enabled')" /></template>
        </ListRow>
        <ListRow :title="t('settings.callerId.contacts')" :subtitle="t('settings.callerId.contactsSub')" icon="users" icon-tone="blue">
          <template #right><ToggleSwitch v-model="settings.state.showForContacts" :label="t('settings.callerId.contacts')" /></template>
        </ListRow>
        <ListRow :title="t('settings.callerId.after')" :subtitle="t('settings.callerId.afterSub')" icon="phone-off" icon-tone="violet">
          <template #right><ToggleSwitch v-model="settings.state.showAfterCall" :label="t('settings.callerId.after')" /></template>
        </ListRow>
      </div>

      <SectionHeader :title="t('settings.callerId.style')" />
      <div role="radiogroup" :aria-label="t('settings.callerId.style')" class="mx-4 grid grid-cols-2 gap-3">
        <button
          v-for="s in sizes"
          :key="s"
          type="button"
          role="radio"
          :aria-checked="settings.state.popupSize === s"
          class="tap flex flex-col items-center gap-2 rounded-card border-2 bg-surface px-3 py-4 shadow-card"
          :class="settings.state.popupSize === s ? 'border-primary bg-primary-soft' : 'border-transparent'"
          @click="settings.patch({ popupSize: s })"
        >
          <PopupPreview mini :size="s" position="center" />
          <span class="text-[15px] font-semibold">{{ t(`settings.callerId.${s}`) }}</span>
          <span class="text-center text-xs text-muted">{{ t(`settings.callerId.${s}Sub`) }}</span>
        </button>
      </div>

      <SectionHeader :title="t('settings.callerId.theme.title')" />
      <CallThemePicker />

      <SectionHeader :title="t('settings.callerId.position')" />
      <div role="radiogroup" :aria-label="t('settings.callerId.position')" class="mx-4 flex gap-2">
        <button
          v-for="p in positions"
          :key="p"
          type="button"
          role="radio"
          :aria-checked="settings.state.popupPosition === p"
          :disabled="settings.state.popupSize === 'full'"
          class="tap min-h-11 flex-1 rounded-full border text-sm font-semibold disabled:opacity-45"
          :class="settings.state.popupPosition === p ? 'border-primary bg-primary text-white' : 'border-line bg-surface'"
          @click="settings.patch({ popupPosition: p })"
        >
          {{ t(`settings.callerId.${p}`) }}
        </button>
      </div>

      <SectionHeader :title="t('settings.callerId.preview')" />
      <div class="flex justify-center py-2">
        <PopupPreview :size="settings.state.popupSize" :position="settings.state.popupPosition" />
      </div>

      <div class="px-4 pt-4">
        <BaseButton block icon="play" @click="router.push('/call/simulate')">{{ t('settings.callerId.tryIt') }}</BaseButton>
      </div>
    </div>
  </div>
</template>
