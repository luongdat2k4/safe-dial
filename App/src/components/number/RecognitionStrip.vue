<script setup lang="ts">
import { computed } from 'vue'
import type { CallerInfo } from '@/types'
import { t } from '@/composables/useT'
import { countryOf } from '@/utils/countries'
import { useSettingsStore } from '@/stores/settings'
import RiskBadge from '@/components/RiskBadge.vue'
import AppIcon from '@/components/AppIcon.vue'

/** Thẻ nhận diện số ngay khi gõ: cảnh báo theo đánh dấu của người dùng. */
const props = defineProps<{ number: string; info: CallerInfo | null; loading: boolean }>()
defineEmits<{ unblock: []; detail: [] }>()
const settings = useSettingsStore()

const risk = computed(() => props.info?.risk ?? 'unknown')
const mark = computed(() => props.info?.mark)
const danger = computed(() => risk.value === 'scam' || risk.value === 'spam')
const intl = computed(() => !!props.number && !props.number.startsWith(settings.state.homeCountryDial))
const country = computed(() => (intl.value ? countryOf(props.number) : undefined))

const tone = computed(() => {
  if (risk.value === 'scam') return 'border-scam/40 bg-scam-soft'
  if (risk.value === 'spam') return 'border-spam/40 bg-spam-soft'
  if (risk.value === 'safe') return 'border-primary/30 bg-primary-soft'
  return 'border-line bg-surface'
})
const warn = computed(() => (risk.value === 'scam' ? t('dial.recognition.scamWarn') : t('dial.recognition.spamWarn')))
</script>

<template>
  <div class="space-y-2 px-4">
    <div v-if="loading" class="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-3 text-sm text-muted">
      <AppIcon name="loader-circle" :size="18" class="animate-spin" /> {{ t('dial.recognition.checking') }}
    </div>

    <div v-else-if="info" class="rounded-2xl border p-3" :class="tone" :role="danger ? 'alert' : 'status'">
      <div class="flex items-center gap-2">
        <RiskBadge :risk="risk" :category="mark?.category" size="md" />
        <p class="min-w-0 flex-1 truncate text-sm font-bold">{{ info.name ?? '' }}</p>
        <button type="button" class="tap shrink-0 text-sm font-semibold text-primary-dark" @click="$emit('detail')">{{ t('dial.recognition.detail') }}</button>
      </div>
      <p v-if="danger" class="mt-1.5 text-[13px] leading-snug font-medium" :class="risk === 'scam' ? 'text-scam' : 'text-spam'">{{ warn }}</p>
      <p v-else-if="info.isContact" class="mt-1 text-[13px] text-muted">{{ t('dial.recognition.contact') }}</p>
      <p v-else-if="mark?.trusted" class="mt-1 text-[13px] text-muted">{{ t('dial.recognition.trusted') }}</p>
      <p v-else class="mt-1 text-[13px] text-muted">{{ t('dial.recognition.unknownDesc') }}</p>
      <p v-if="country || mark?.note" class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
        <span v-if="country" class="flex items-center gap-1"><AppIcon name="globe" :size="12" />{{ t('dial.recognition.international') }} · {{ country.flag }} {{ country.name }}</span>
        <span v-if="mark?.note" class="flex items-center gap-1"><AppIcon name="notebook-pen" :size="12" />{{ mark.note }}</span>
      </p>
      <p v-if="info.blocked" class="mt-2 flex items-center gap-2 rounded-xl bg-white/70 px-2.5 py-1.5 text-[13px] font-semibold text-blocked">
        <AppIcon name="ban" :size="16" />
        <span class="flex-1">{{ t('dial.recognition.blocked') }}</span>
        <button type="button" class="tap font-bold underline" @click="$emit('unblock')">{{ t('dial.recognition.unblock') }}</button>
      </p>
    </div>
  </div>
</template>
