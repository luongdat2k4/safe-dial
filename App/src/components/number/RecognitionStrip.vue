<script setup lang="ts">
import { computed } from 'vue'
import type { CallerInfo, Contact } from '@/types'
import { t } from '@/composables/useT'
import { useBlockStore } from '@/stores/block'
import { formatNumber } from '@/utils/numbers'
import { useSettingsStore } from '@/stores/settings'
import RiskBadge from '@/components/RiskBadge.vue'
import AppIcon from '@/components/AppIcon.vue'

/** Dải nhận diện số ngay khi gõ: gợi ý danh bạ + thẻ cảnh báo rủi ro. */
const props = defineProps<{ number: string; info: CallerInfo | null; loading: boolean; contacts: Contact[] }>()
defineEmits<{ pick: [c: Contact]; unblock: []; detail: [] }>()
const block = useBlockStore()
const settings = useSettingsStore()

const blocked = computed(() => !!props.number && !!block.isBlockedNumber(props.number))
const risk = computed(() => props.info?.risk ?? 'unknown')
const profile = computed(() => props.info?.profile)
const danger = computed(() => risk.value === 'scam' || risk.value === 'spam')

const tone = computed(() => {
  if (risk.value === 'scam') return 'border-scam/40 bg-scam-soft'
  if (risk.value === 'spam') return 'border-spam/40 bg-spam-soft'
  if (risk.value === 'safe') return 'border-primary/30 bg-primary-soft'
  return 'border-line bg-surface'
})
const warn = computed(() => (risk.value === 'scam' ? t('dial.recognition.scamWarn') : t('dial.recognition.spamWarn')))
</script>

<template>
  <div class="min-h-[88px] space-y-2 px-4">
    <div v-if="contacts.length" class="flex gap-2 overflow-x-auto pb-0.5" role="list" :aria-label="t('dial.suggestions')">
      <button
        v-for="c in contacts"
        :key="c.id"
        type="button"
        role="listitem"
        class="tap flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm shadow-card"
        @click="$emit('pick', c)"
      >
        <AppIcon name="user-round" :size="16" class="text-primary-dark" />
        <span class="font-semibold">{{ c.name }}</span>
        <span class="text-muted">{{ formatNumber(c.numbers[0] ?? '', settings.state.homeCountryDial) }}</span>
      </button>
    </div>

    <div v-if="loading" class="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-3 text-sm text-muted">
      <AppIcon name="loader-circle" :size="18" class="animate-spin" /> {{ t('dial.recognition.checking') }}
    </div>

    <div v-else-if="info" class="rounded-2xl border p-3" :class="tone" :role="danger ? 'alert' : 'status'">
      <div class="flex items-center gap-2">
        <RiskBadge :risk="risk" :category="profile?.category" size="md" />
        <p class="min-w-0 flex-1 truncate text-sm font-bold">{{ info.name ?? '' }}</p>
        <button type="button" class="tap shrink-0 text-sm font-semibold text-primary-dark" @click="$emit('detail')">{{ t('dial.recognition.detail') }}</button>
      </div>
      <p v-if="danger" class="mt-1.5 text-[13px] leading-snug font-medium" :class="risk === 'scam' ? 'text-scam' : 'text-spam'">{{ warn }}</p>
      <p v-else-if="info.isContact" class="mt-1 text-[13px] text-muted">{{ t('dial.recognition.contact') }}</p>
      <p v-else-if="!profile" class="mt-1 text-[13px] text-muted">{{ t('dial.recognition.unknownDesc') }}</p>
      <p v-if="profile && (profile.reportCount > 0 || profile.location)" class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
        <span v-if="profile.reportCount > 0">{{ t('dial.recognition.reports', { n: profile.reportCount.toLocaleString('vi-VN') }) }}</span>
        <span v-if="profile.location" class="flex items-center gap-1"><AppIcon name="map-pin" :size="12" />{{ profile.location }}</span>
      </p>
      <p v-if="blocked" class="mt-2 flex items-center gap-2 rounded-xl bg-white/70 px-2.5 py-1.5 text-[13px] font-semibold text-blocked">
        <AppIcon name="ban" :size="16" />
        <span class="flex-1">{{ t('dial.recognition.blocked') }}</span>
        <button type="button" class="tap font-bold underline" @click="$emit('unblock')">{{ t('dial.recognition.unblock') }}</button>
      </p>
    </div>
  </div>
</template>
