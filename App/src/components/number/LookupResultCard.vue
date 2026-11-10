<script setup lang="ts">
import { computed } from 'vue'
import type { CallerInfo } from '@/types'
import { t } from '@/composables/useT'
import { useBlockStore } from '@/stores/block'
import { useSettingsStore } from '@/stores/settings'
import { formatNumber } from '@/utils/numbers'
import Avatar from '@/components/Avatar.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import BaseButton from '@/components/BaseButton.vue'
import AppIcon from '@/components/AppIcon.vue'

/** Kết quả tra cứu một số trong cộng đồng (màn Tìm kiếm). */
const props = defineProps<{ info: CallerInfo | null; loading: boolean; number: string }>()
defineEmits<{ detail: []; block: [] }>()
const block = useBlockStore()
const settings = useSettingsStore()

const blocked = computed(() => !!block.isBlockedNumber(props.number))
const profile = computed(() => props.info?.profile)
const dangerous = computed(() => props.info?.risk === 'scam' || props.info?.risk === 'spam')
</script>

<template>
  <section
    class="rounded-2xl border p-4 shadow-card"
    :class="info?.risk === 'scam' ? 'border-scam/40 bg-scam-soft' : info?.risk === 'spam' ? 'border-spam/40 bg-spam-soft' : 'border-line bg-surface'"
  >
    <p class="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase">
      <AppIcon name="radar" :size="14" /> {{ t('dial.search.lookupTitle') }}
    </p>
    <div v-if="loading || !info" class="flex items-center gap-3 py-4 text-muted">
      <AppIcon name="loader-circle" :size="22" class="animate-spin" />
      <span class="text-sm">{{ t('dial.search.lookingUp') }}</span>
    </div>
    <template v-else>
      <div class="flex items-center gap-3">
        <Avatar :name="info.name" :risk="info.risk" :size="52" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-base font-bold">{{ info.name ?? t('dial.search.noInfo') }}</p>
          <p class="truncate text-sm text-muted">{{ formatNumber(number, settings.state.homeCountryDial) }}</p>
          <RiskBadge class="mt-1" :risk="info.risk" :category="profile?.category" size="md" />
        </div>
      </div>
      <p v-if="!profile && !info.isContact" class="mt-3 text-sm text-muted">{{ t('dial.search.noInfoDesc') }}</p>
      <dl v-if="profile" class="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div class="rounded-xl bg-white/70 px-3 py-2">
          <dt class="text-xs text-muted">{{ t('dial.search.reportsLabel') }}</dt>
          <dd class="font-bold" :class="dangerous ? 'text-scam' : ''">{{ profile.reportCount.toLocaleString('vi-VN') }}</dd>
        </div>
        <div class="rounded-xl bg-white/70 px-3 py-2">
          <dt class="text-xs text-muted">{{ t('dial.search.location') }}</dt>
          <dd class="truncate font-bold">{{ profile.location ?? '—' }}</dd>
        </div>
        <div class="col-span-2 rounded-xl bg-white/70 px-3 py-2">
          <dt class="text-xs text-muted">{{ t('dial.search.carrier') }}</dt>
          <dd class="font-bold">{{ profile.carrier ?? '—' }}</dd>
        </div>
      </dl>
      <div v-if="profile?.suggestedNames?.length" class="mt-3">
        <p class="text-xs text-muted">{{ t('dial.search.suggested') }}</p>
        <div class="mt-1 flex flex-wrap gap-1.5">
          <span v-for="n in profile.suggestedNames" :key="n" class="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium">{{ n }}</span>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <BaseButton class="flex-1" icon="info" @click="$emit('detail')">{{ t('dial.search.detail') }}</BaseButton>
        <BaseButton class="flex-1" variant="ghost" :icon="blocked ? 'circle-check' : 'ban'" @click="$emit('block')">
          {{ blocked ? t('dial.search.unblock') : t('dial.search.block') }}
        </BaseButton>
      </div>
    </template>
  </section>
</template>
