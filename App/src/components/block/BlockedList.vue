<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCallsStore } from '@/stores/calls'
import { useSettingsStore } from '@/stores/settings'
import { t } from '@/composables/useT'
import { dayLabel, formatTime } from '@/utils/format'
import { formatNumber } from '@/utils/numbers'
import { numberPath } from '@/utils/routes'
import type { BlockReason, CallLogEntry } from '@/types'
import Avatar from '@/components/Avatar.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppIcon from '@/components/AppIcon.vue'
import ReasonChip from './ReasonChip.vue'
import { REASON_ICON } from './ruleMeta'

const calls = useCallsStore()
const settings = useSettingsStore()
const router = useRouter()

const WEEK = 7 * 86_400_000

const week = computed(() => {
  const from = Date.now() - WEEK
  const list = calls.blocked.filter((e) => new Date(e.startedAt).getTime() >= from)
  const counts = new Map<BlockReason, number>()
  for (const e of list) if (e.blockedReason) counts.set(e.blockedReason, (counts.get(e.blockedReason) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return { count: list.length, top: top?.[0], topCount: top?.[1] ?? 0 }
})

const groups = computed(() => {
  const out: Array<{ label: string; items: CallLogEntry[] }> = []
  for (const e of calls.blocked) {
    const label = dayLabel(e.startedAt)
    const last = out[out.length - 1]
    if (last && last.label === label) last.items.push(e)
    else out.push({ label, items: [e] })
  }
  return out
})
</script>

<template>
  <div>
    <div class="mx-4 mt-1 mb-2 flex items-center gap-3 rounded-card bg-blocked p-4 text-white shadow-card">
      <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20"><AppIcon name="shield-ban" :size="26" /></span>
      <div class="min-w-0">
        <p class="text-3xl leading-none font-bold">{{ week.count }}</p>
        <p class="mt-1 text-sm opacity-90">{{ t('block.blocked.weekSummary') }}</p>
        <p v-if="week.top" class="mt-0.5 flex items-center gap-1 truncate text-xs opacity-85">
          <AppIcon :name="REASON_ICON[week.top]" :size="13" />
          {{ t('block.blocked.topReason', { reason: t(`common.blockReason.${week.top}`), n: week.topCount }) }}
        </p>
      </div>
    </div>

    <EmptyState
      v-if="!groups.length"
      icon="shield-check"
      :title="t('block.blocked.emptyTitle')"
      :description="t('block.blocked.emptyDesc')"
    />

    <section v-for="g in groups" :key="g.label">
      <h3 class="px-4 pt-3 pb-1 text-xs font-bold tracking-wide text-muted uppercase">{{ g.label }}</h3>
      <ul class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <li v-for="e in g.items" :key="e.id">
          <button
            type="button"
            class="tap flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-canvas"
            @click="router.push(numberPath(e.number))"
          >
            <Avatar :name="e.name" :risk="e.risk" :is-private="!e.number" :size="40" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-semibold">{{ e.name ?? formatNumber(e.number, settings.state.homeCountryDial) }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                <span class="text-xs text-muted">{{ formatTime(e.startedAt) }}</span>
                <ReasonChip v-if="e.blockedReason" :reason="e.blockedReason" />
              </div>
            </div>
            <RiskBadge v-if="e.risk !== 'safe'" :risk="e.risk" :category="e.category" />
          </button>
        </li>
      </ul>
    </section>
    <div class="h-4" />
  </div>
</template>
