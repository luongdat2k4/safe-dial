<script setup lang="ts">
import { computed } from 'vue'

export interface DonutSegment {
  label: string
  value: number
  /** Màu CSS, ví dụ var(--color-incoming) */
  color: string
}

const props = withDefaults(
  defineProps<{ segments: DonutSegment[]; centerValue?: string | number; centerLabel?: string; size?: number; ariaLabel?: string }>(),
  { size: 150 },
)

const R = 42
const C = 2 * Math.PI * R
const total = computed(() => props.segments.reduce((s, x) => s + x.value, 0))

const arcs = computed(() => {
  let offset = 0
  return props.segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = (s.value / total.value) * C
      const arc = { ...s, dash: `${len} ${C - len}`, offset: -offset }
      offset += len
      return arc
    })
})

const summary = computed(() => props.ariaLabel ?? props.segments.map((s) => `${s.label}: ${s.value}`).join(', '))
const pct = (v: number) => (total.value ? Math.round((v / total.value) * 100) : 0)
</script>

<template>
  <div class="flex items-center gap-4">
    <svg :width="size" :height="size" viewBox="0 0 100 100" class="shrink-0" role="img" :aria-label="summary">
      <title>{{ summary }}</title>
      <circle cx="50" cy="50" :r="R" fill="none" stroke="var(--color-line)" stroke-width="12" />
      <g transform="rotate(-90 50 50)">
        <circle
          v-for="a in arcs"
          :key="a.label"
          cx="50"
          cy="50"
          :r="R"
          fill="none"
          stroke-width="12"
          :style="{ stroke: a.color }"
          :stroke-dasharray="a.dash"
          :stroke-dashoffset="a.offset"
        />
      </g>
      <text x="50" y="50" text-anchor="middle" dominant-baseline="central" class="fill-ink" style="font-size: 17px; font-weight: 700">
        {{ centerValue ?? total }}
      </text>
      <text v-if="centerLabel" x="50" y="64" text-anchor="middle" class="fill-muted" style="font-size: 7px">{{ centerLabel }}</text>
    </svg>
    <ul class="min-w-0 flex-1 space-y-1.5">
      <li v-for="s in segments" :key="s.label" class="flex items-center gap-2 text-[13px]">
        <span class="size-2.5 shrink-0 rounded-full" :style="{ background: s.color }" />
        <span class="min-w-0 flex-1 truncate text-muted">{{ s.label }}</span>
        <span class="font-semibold">{{ s.value }}</span>
        <span class="w-9 text-right text-xs text-muted">{{ pct(s.value) }}%</span>
      </li>
    </ul>
  </div>
</template>
