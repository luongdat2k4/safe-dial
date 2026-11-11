<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useStatsStore } from '@/stores/stats'
import { useContactsStore } from '@/stores/contacts'
import { useLookupStore } from '@/stores/lookup'
import { useBlockStore } from '@/stores/block'
import { t } from '@/composables/useT'
import {
  callsPerDay,
  dayToIso,
  fromDayOf,
  frequencyRanking,
  riskBreakdown,
  totals,
  type Period,
  type RankedNumber,
} from '@/utils/stats'
import { formatDuration } from '@/utils/format'
import type { RiskLevel } from '@/types'
import SegmentedTabs from '@/components/SegmentedTabs.vue'
import EmptyState from '@/components/EmptyState.vue'
import KpiCard from '@/components/charts/KpiCard.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import HBar from '@/components/charts/HBar.vue'
import FrequencyList from '@/components/charts/FrequencyList.vue'
import StrangerList from '@/components/charts/StrangerList.vue'

const stats = useStatsStore()
const contacts = useContactsStore()
const lookup = useLookupStore()
const block = useBlockStore()
const period = ref<Period>('30d')
onMounted(() => {
  stats.load()
  contacts.load()
  lookup.loadMarks()
  block.load()
})

const tabs = computed(() => [
  { key: '7d', label: t('stats.period.7d') },
  { key: '30d', label: t('stats.period.30d') },
  { key: 'all', label: t('stats.period.all') },
])

/** Dòng call_stats_daily trong khoảng đang chọn. */
const list = computed(() => {
  const from = fromDayOf(period.value, stats.today)
  return stats.rows.filter((r) => r.day >= from)
})
const sum = computed(() => totals(list.value))
const days = computed(() => callsPerDay(list.value, period.value === '7d' ? 7 : 14, stats.today))
const ranking = computed<RankedNumber[]>(() =>
  frequencyRanking(list.value).map((f) => {
    const c = contacts.findByNumber(f.number)
    const mark = f.number ? lookup.marks[f.number] : undefined
    return {
      ...f,
      name: c?.name ?? mark?.name,
      isContact: !!c,
      risk: lookup.riskOf({ isContact: !!c, mark }),
      category: mark?.category,
      lastAt: dayToIso(f.lastDay),
    }
  }),
)
const topContacts = computed(() => ranking.value.filter((r) => r.isContact && r.number).slice(0, 5))
const strangers = computed(() => ranking.value.filter((r) => !r.isContact).slice(0, 5))
const risks = computed(() => riskBreakdown(list.value))
const riskTotal = computed(() => Object.values(risks.value).reduce((a, b) => a + b, 0))

const segments = computed(() => [
  { label: t('common.callType.incoming'), value: sum.value.incoming, color: 'var(--color-incoming)' },
  { label: t('common.callType.outgoing'), value: sum.value.outgoing, color: 'var(--color-outgoing)' },
  { label: t('common.callType.missed'), value: sum.value.missed, color: 'var(--color-missed)' },
  { label: t('common.callType.blocked'), value: sum.value.blocked, color: 'var(--color-blocked)' },
])

const RISK_COLOR: Record<RiskLevel, string> = {
  safe: 'var(--color-safe)',
  unknown: 'var(--color-unknown)',
  spam: 'var(--color-spam)',
  scam: 'var(--color-scam)',
}
const RISK_ORDER: RiskLevel[] = ['safe', 'unknown', 'spam', 'scam']
const pct = (n: number) => (riskTotal.value ? Math.round((n / riskTotal.value) * 100) : 0)

const card = 'mx-4 mt-3 rounded-card bg-surface p-4 shadow-card'
const h2 = 'mb-3 text-[15px] font-bold'
</script>

<template>
  <div class="min-h-full bg-canvas pb-28">
    <div class="sticky top-0 z-10 bg-canvas"><SegmentedTabs v-model="period" :items="tabs" /></div>

    <EmptyState v-if="!sum.count" icon="chart-no-axes-combined" :title="t('stats.empty.title')" :description="t('stats.empty.desc')" />

    <template v-else>
      <div class="grid grid-cols-2 gap-3 px-4 pt-1">
        <KpiCard icon="phone" :label="t('stats.kpi.total')" :value="sum.count" />
        <KpiCard icon="clock" tone="blue" :label="t('stats.kpi.talk')" :value="formatDuration(sum.talkSec)" :sub="t('stats.kpi.avg', { d: formatDuration(sum.avgSec) })" />
        <KpiCard icon="phone-missed" tone="danger" :label="t('stats.kpi.missed')" :value="sum.missed" />
        <KpiCard icon="shield-alert" tone="violet" :label="t('stats.kpi.suspicious')" :value="`${sum.suspicious} / ${sum.blocked}`" :sub="t('stats.kpi.suspiciousSub')" />
      </div>

      <section :class="card">
        <h2 :class="h2">{{ t('stats.perDay.title', { n: period === '7d' ? 7 : 14 }) }}</h2>
        <BarChart :bars="days.map((d) => ({ label: d.label, value: d.count }))" :aria-label="t('stats.perDay.aria')" />
      </section>

      <section :class="card">
        <h2 :class="h2">{{ t('stats.types.title') }}</h2>
        <DonutChart :segments="segments" :center-value="sum.count" :center-label="t('stats.types.center')" />
      </section>

      <section :class="card">
        <h2 :class="h2">{{ t('stats.frequency.title') }}</h2>
        <p v-if="!topContacts.length" class="text-sm text-muted">{{ t('stats.frequency.none') }}</p>
        <FrequencyList v-else :items="topContacts" />
      </section>

      <section :class="card">
        <h2 class="text-[15px] font-bold">{{ t('stats.strangers.title') }}</h2>
        <p class="mb-2 text-[13px] text-muted">{{ t('stats.strangers.desc') }}</p>
        <p v-if="!strangers.length" class="text-sm text-muted">{{ t('stats.strangers.none') }}</p>
        <StrangerList v-else :items="strangers" />
      </section>

      <section :class="card">
        <h2 class="text-[15px] font-bold">{{ t('stats.risk.title') }}</h2>
        <p class="mb-3 text-[13px] text-muted">{{ t('stats.risk.desc', { n: riskTotal }) }}</p>
        <div class="space-y-3">
          <HBar
            v-for="r in RISK_ORDER"
            :key="r"
            :label="t(`common.risk.${r}`)"
            :value="risks[r]"
            :max="riskTotal"
            :value-text="`${risks[r]} (${pct(risks[r])}%)`"
            :color="RISK_COLOR[r]"
          />
        </div>
      </section>
    </template>
  </div>
</template>
