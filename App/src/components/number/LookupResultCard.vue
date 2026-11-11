<script setup lang="ts">
import { computed } from 'vue'
import type { CallerInfo } from '@/types'
import { t } from '@/composables/useT'
import { useCallsStore } from '@/stores/calls'
import { useSettingsStore } from '@/stores/settings'
import { formatNumber } from '@/utils/numbers'
import { countryOf } from '@/utils/countries'
import Avatar from '@/components/Avatar.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import BaseButton from '@/components/BaseButton.vue'
import AppIcon from '@/components/AppIcon.vue'

/** Thông tin app biết về một số (màn Tìm kiếm): danh bạ, đánh dấu, chặn, số cuộc gọi. */
const props = defineProps<{ info: CallerInfo | null; loading: boolean; number: string }>()
defineEmits<{ detail: []; block: [] }>()
const calls = useCallsStore()
const settings = useSettingsStore()

const mark = computed(() => props.info?.mark)
const country = computed(() => countryOf(props.number))
const callCount = computed(() => calls.forNumber(props.number).length)
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
          <RiskBadge class="mt-1" :risk="info.risk" :category="mark?.category" size="md" />
        </div>
      </div>
      <p v-if="!mark && !info.isContact" class="mt-3 text-sm text-muted">{{ t('dial.search.noInfoDesc') }}</p>
      <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div class="rounded-xl bg-white/70 px-3 py-2">
          <dt class="text-xs text-muted">{{ t('dial.search.calls') }}</dt>
          <dd class="font-bold">{{ t('dial.search.callsValue', { n: callCount }) }}</dd>
        </div>
        <div class="rounded-xl bg-white/70 px-3 py-2">
          <dt class="text-xs text-muted">{{ t('dial.search.country') }}</dt>
          <dd class="truncate font-bold">{{ country ? `${country.flag} ${country.name}` : '—' }}</dd>
        </div>
        <div v-if="mark?.category || mark?.trusted" class="col-span-2 rounded-xl bg-white/70 px-3 py-2">
          <dt class="text-xs text-muted">{{ t('dial.search.mark') }}</dt>
          <dd class="font-bold" :class="dangerous ? 'text-scam' : ''">
            {{ mark.trusted ? t('number.trusted') : t(`common.category.${mark.category}`) }}
          </dd>
        </div>
        <div v-if="mark?.note" class="col-span-2 rounded-xl bg-white/70 px-3 py-2">
          <dt class="text-xs text-muted">{{ t('dial.search.note') }}</dt>
          <dd class="font-medium">{{ mark.note }}</dd>
        </div>
      </dl>
      <div class="mt-4 flex gap-2">
        <BaseButton class="flex-1" icon="info" @click="$emit('detail')">{{ t('dial.search.detail') }}</BaseButton>
        <BaseButton class="flex-1" variant="ghost" :icon="info.blocked ? 'circle-check' : 'ban'" @click="$emit('block')">
          {{ info.blocked ? t('dial.search.unblock') : t('dial.search.block') }}
        </BaseButton>
      </div>
    </template>
  </section>
</template>
