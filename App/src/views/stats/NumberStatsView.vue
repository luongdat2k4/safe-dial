<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCallsStore } from '@/stores/calls'
import { useSettingsStore } from '@/stores/settings'
import { t } from '@/composables/useT'
import { numberPath, parseNumberParam } from '@/utils/routes'
import { formatNumber } from '@/utils/numbers'
import { formatDate, formatDuration, formatTime } from '@/utils/format'
import { durationByDirection, totals, weekdayHistogram, weeklyCounts, WEEKDAY_LABELS } from '@/utils/stats'
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
const settings = useSettingsStore()
const now = ref(new Date())

const number = computed(() => parseNumberParam(route.params.number))
onMounted(() => {
  now.value = new Date()
  calls.load()
})

const entries = computed(() => calls.forNumber(number.value))
const sum = computed(() => totals(entries.value))
const dur = computed(() => durationByDirection(entries.value))
const name = computed(() => entries.value.find((e) => e.name)?.name)
const display = computed(() => formatNumber(number.value, settings.state.homeCountryDial))

const inTotal = computed(() => sum.value.incoming + sum.value.missed + sum.value.blocked)
const outAnswered = computed(() => entries.value.filter((e) => e.type === 'outgoing' && e.durationSec > 0).length)
const outNot = computed(() => sum.value.outgoing - outAnswered.value)

const weeks = computed(() => weeklyCounts(entries.value, 8, now.value))
const inWeekly = computed(() => weeks.value.map((w) => w.byType.incoming + w.byType.missed + w.byType.blocked))
const outWeekly = computed(() => weeks.value.map((w) => w.byType.outgoing))
const weekday = computed(() => weekdayHistogram(entries.value).map((v, i) => ({ label: WEEKDAY_LABELS[i] ?? '', value: v })))

const sorted = computed(() => [...entries.value].sort((a, b) => a.startedAt.localeCompare(b.startedAt)))
const first = computed(() => sorted.value[0])
const last = computed(() => sorted.value[sorted.value.length - 1])

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
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.inTotal') }}</dt><dd class="font-semibold">{{ inTotal }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.inAnswered') }}</dt><dd class="font-semibold">{{ sum.incoming }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.inMissed') }}</dt><dd class="font-semibold text-missed">{{ sum.missed }}</dd></div>
            <div v-if="sum.blocked" :class="stat"><dt class="text-muted">{{ t('stats.number.inBlocked') }}</dt><dd class="font-semibold text-blocked">{{ sum.blocked }}</dd></div>
          </dl>
          <p class="mt-2 mb-1 text-xs text-muted">{{ t('stats.number.weeks') }}</p>
          <Sparkline :values="inWeekly" color="var(--color-incoming)" :aria-label="t('stats.number.weeksAria', { v: inWeekly.join(', ') })" />
        </section>

        <section :class="card">
          <h2 class="flex items-center gap-2 text-[15px] font-bold"><AppIcon name="phone-outgoing" :size="18" class="text-outgoing" />{{ t('stats.number.outgoingTitle') }}</h2>
          <dl class="mt-1 divide-y divide-line">
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.outTotal') }}</dt><dd class="font-semibold">{{ sum.outgoing }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.outAnswered') }}</dt><dd class="font-semibold">{{ outAnswered }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.outNot') }}</dt><dd class="font-semibold">{{ outNot }}</dd></div>
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
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.first') }}</dt><dd class="font-semibold">{{ first ? `${formatDate(first.startedAt)} ${formatTime(first.startedAt)}` : '-' }}</dd></div>
            <div :class="stat"><dt class="text-muted">{{ t('stats.number.last') }}</dt><dd class="font-semibold">{{ last ? `${formatDate(last.startedAt)} ${formatTime(last.startedAt)}` : '-' }}</dd></div>
          </dl>
        </section>

        <div class="mt-4 px-4">
          <BaseButton block variant="secondary" icon="history" @click="router.push(numberPath(number, 'history'))">{{ t('stats.number.viewHistory') }}</BaseButton>
        </div>
      </template>
    </div>
  </div>
</template>
