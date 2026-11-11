<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCallsStore } from '@/stores/calls'
import { useContactsStore } from '@/stores/contacts'
import { useLookupStore } from '@/stores/lookup'
import { useSettingsStore } from '@/stores/settings'
import { useStatsStore } from '@/stores/stats'
import { t } from '@/composables/useT'
import { numberPath, parseNumberParam } from '@/utils/routes'
import { formatNumber } from '@/utils/numbers'
import { formatDate, formatDuration, formatTime } from '@/utils/format'
import {
  dayToIso,
  durationByDirection,
  incomingBreakdown,
  outgoingAnswered,
  totals,
  weekdayHistogram,
  weeklyCounts,
  WEEKDAY_LABELS,
} from '@/utils/stats'
import type { StatsRow } from '@/services'
import AppBar from '@/components/AppBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import BaseButton from '@/components/BaseButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import HBar from '@/components/charts/HBar.vue'
import BarChart from '@/components/charts/BarChart.vue'
import Sparkline from '@/components/charts/Sparkline.vue'

const route = useRoute()
const router = useRouter()
const calls = useCallsStore()
const contacts = useContactsStore()
const lookup = useLookupStore()
const settings = useSettingsStore()
const stats = useStatsStore()

const number = computed(() => parseNumberParam(route.params.number))
/** Thống kê của số này, đọc từ call_stats_daily (không bị mất khi nhật ký cũ bị xoá). */
const rows = ref<StatsRow[]>([])
const today = ref(0)

watch(
  number,
  async (n) => {
    calls.load()
    contacts.load()
    const r = await stats.forNumber(n)
    rows.value = r.rows
    today.value = r.today
  },
  { immediate: true },
)

const sum = computed(() => totals(rows.value))
const dur = computed(() => durationByDirection(rows.value))
const incoming = computed(() => incomingBreakdown(rows.value))
const out = computed(() => outgoingAnswered(rows.value))
const name = computed(() => contacts.findByNumber(number.value)?.name ?? lookup.marks[number.value]?.name)
const display = computed(() => formatNumber(number.value, settings.state.homeCountryDial))

const weeks = computed(() => weeklyCounts(rows.value, 8, today.value))
const inWeekly = computed(() => weeks.value.map((w) => w.incoming))
const outWeekly = computed(() => weeks.value.map((w) => w.outgoing))
const weekday = computed(() => weekdayHistogram(rows.value).map((v, i) => ({ label: WEEKDAY_LABELS[i] ?? '', value: v })))

/** Cuộc gọi đầu tiên: theo ngày (call_stats_daily). Gần nhất: giờ chính xác từ nhật ký nếu còn. */
const firstText = computed(() => (rows.value.length ? formatDate(dayToIso(rows.value[0]!.day)) : '-'))
const lastText = computed(() => {
  const e = calls.forNumber(number.value)[0]
  if (e) return formatDate(e.startedAt) + ' ' + formatTime(e.startedAt)
  const last = rows.value[rows.value.length - 1]
  return last ? formatDate(dayToIso(last.day)) : '-'
})

const segments = computed(() => [
  { label: t('common.callType.incoming'), value: sum.value.incoming, color: 'var(--color-incoming)' },
  { label: t('common.callType.outgoing'), value: sum.value.outgoing, color: 'var(--color-outgoing)' },
  { label: t('common.callType.missed'), value: sum.value.missed, color: 'var(--color-missed)' },
  { label: t('common.callType.blocked'), value: sum.value.blocked, color: 'var(--color-blocked)' },
])

const card = 'mx-4 mt-3 rounded-card bg-surface p-4 shadow-card'
const h2 = 'mb-3 text-[15px] font-bold'
const stat = 'flex items-center justify-between py-2 text-[15px]'
</script>

<template>
  <div class="flex h-full flex-col bg-canvas">
    <AppBar :title="name ?? display" :subtitle="name ? display : t('stats.number.subtitle')" back />
    <div class="min-h-0 flex-1 overflow-y-auto pb-6">
      <EmptyState v-if="!sum.count" icon="chart-no-axes-combined" :title="t('stats.number.emptyTitle')" :description="t('stats.number.emptyDesc')" />
      <template v-else>
        <section :class="card">
          <h2 :class="h2">{{ t('stats.types.title') }}</h2>
          <DonutChart :segments="segments" :center-value="sum.count" :center-label="t('stats.types.center')" />
        </section>

        <section :class="card">
          <h2 :class="h2">{{ t('stats.number.durationTitle') }}</h2>
          <div class="space-y-3">
            <HBar :label="t('stats.number.durTotal')" :value="dur.total" :max="dur.total" :value-text="formatDuration(dur.total)" />
            <HBar :label="t('stats.number.durIncoming')" :value="dur.incoming" :max="dur.total" :value-text="formatDuration(dur.incoming)" color="var(--color-incoming)" />
            <HBar :label="t('stats.number.durOutgoing')" :value="dur.outgoing" :max="dur.total" :value-text="formatDuration(dur.outgoing)" color="var(--color-outgoing)" />
          </div>
          <p class="mt-3 text-xs text-muted">{{ t('stats.number.avg', { d: formatDuration(sum.avgSec) }) }}</p>
        </section>

        <section :class="card">
          <h2 class="flex items-center gap-2 text-[15px] font-bold"><AppIcon name="phone-incoming" :size="18" class="text-incoming" />{{ t('stats.number.incomingTitle') }}</h2>
          <dl class="mt-1 divide-y divide-line">
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.inTotal') }}</dt><dd class="font-semibold">{{ incoming.total }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.inAnswered') }}</dt><dd class="font-semibold">{{ incoming.answered }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.inMissed') }}</dt><dd class="font-semibold text-missed">{{ incoming.missed }}</dd></div>
            <div v-if="incoming.blocked" :class="stat"><dt class="text-muted">{{ t('stats.number.inBlocked') }}</dt><dd class="font-semibold text-blocked">{{ incoming.blocked }}</dd></div>
          </dl>
          <p class="mt-2 mb-1 text-xs text-muted">{{ t('stats.number.weeks') }}</p>
          <Sparkline :values="inWeekly" color="var(--color-incoming)" :aria-label="t('stats.number.weeksAria', { v: inWeekly.join(', ') })" />
        </section>

        <section :class="card">
          <h2 class="flex items-center gap-2 text-[15px] font-bold"><AppIcon name="phone-outgoing" :size="18" class="text-outgoing" />{{ t('stats.number.outgoingTitle') }}</h2>
          <dl class="mt-1 divide-y divide-line">
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.outTotal') }}</dt><dd class="font-semibold">{{ sum.outgoing }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.outAnswered') }}</dt><dd class="font-semibold">{{ out.answered }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.outNot') }}</dt><dd class="font-semibold">{{ out.not }}</dd></div>
          </dl>
          <p class="mt-2 mb-1 text-xs text-muted">{{ t('stats.number.weeks') }}</p>
          <Sparkline :values="outWeekly" color="var(--color-outgoing)" :aria-label="t('stats.number.weeksAria', { v: outWeekly.join(', ') })" />
        </section>

        <section :class="card">
          <h2 :class="h2">{{ t('stats.number.weekdayTitle') }}</h2>
          <BarChart :bars="weekday" :height="120" :aria-label="t('stats.number.weekdayAria')" />
        </section>

        <section :class="card">
          <h2 :class="h2">{{ t('stats.number.firstLast') }}</h2>
          <dl class="divide-y divide-line">
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.first') }}</dt><dd class="font-semibold">{{ firstText }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.last') }}</dt><dd class="font-semibold">{{ lastText }}</dd></div>
          </dl>
        </section>

        <div class="mt-4 px-4">
          <BaseButton block variant="secondary" icon="history" @click="router.push(numberPath(number, 'history'))">{{ t('stats.number.viewHistory') }}</BaseButton>
        </div>
      </template>
    </div>
  </div>
</template>
