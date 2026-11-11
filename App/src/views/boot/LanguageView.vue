<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/BaseButton.vue'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const ui = useUiStore()

const fromSettings = computed(() => route.query.from === 'settings')
const selected = ref<'vi' | 'en'>(settings.state.language)

const options = [
  { code: 'vi' as const, flag: '🇻🇳', title: t('boot.language.vi'), sub: t('boot.language.viNative') },
  { code: 'en' as const, flag: '🇬🇧', title: t('boot.language.en'), sub: t('boot.language.enNative'), note: t('boot.language.enSoon') },
]

function confirm() {
  settings.patch({ language: selected.value })
  if (fromSettings.value) {
    ui.showToast(t('boot.language.saved'), 'success')
    router.back()
  } else {
    router.push('/onboarding')
  }
}
</script>

<template>
  <div class="flex flex-col bg-canvas">
    <AppBar v-if="fromSettings" :title="t('boot.language.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <div v-if="!fromSettings" class="pt-safe px-1 pt-12 pb-6">
        <span class="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
          <AppIcon name="languages" :size="28" />
        </span>
        <h1 class="mt-5 text-[30px] font-semibold tracking-tight">{{ t('boot.language.title') }}</h1>
        <p class="mt-1 text-[15px] text-muted">{{ t('boot.language.subtitle') }}</p>
      </div>
      <div v-else class="px-1 pt-4 pb-3 text-sm text-muted">{{ t('boot.language.subtitle') }}</div>

      <div role="radiogroup" :aria-label="t('boot.language.title')" class="flex flex-col gap-3">
        <button
          v-for="o in options"
          :key="o.code"
          type="button"
          role="radio"
          :aria-checked="selected === o.code"
          class="tap flex min-h-16 items-center gap-3 rounded-card border-2 bg-surface px-4 py-3 text-left shadow-card"
          :class="selected === o.code ? 'border-primary/40 bg-primary-soft' : 'border-white'"
          @click="selected = o.code"
        >
          <span class="text-3xl leading-none" aria-hidden="true">{{ o.flag }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-base font-semibold">{{ o.title }}</span>
            <span class="block text-[13px] text-muted">{{ o.sub }}</span>
            <span v-if="o.note" class="mt-0.5 block text-xs text-spam">{{ o.note }}</span>
          </span>
          <span
            class="grid size-6 shrink-0 place-items-center rounded-full border-2"
            :class="selected === o.code ? 'border-primary bg-primary text-white' : 'border-line'"
          >
            <AppIcon v-if="selected === o.code" name="check" :size="14" />
          </span>
        </button>
      </div>
    </div>
    <div class="pb-safe shrink-0 px-4 pt-2 pb-4">
      <BaseButton block size="lg" @click="confirm">{{ t('boot.language.confirm') }}</BaseButton>
    </div>
  </div>
</template>
