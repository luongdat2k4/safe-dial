<script setup lang="ts">
import { computed } from 'vue'

export interface BarItem {
  label: string
  value: number
}

const props = withDefaults(
  defineProps<{ bars: BarItem[]; height?: number; color?: string; ariaLabel?: string; unit?: string }>(),
  { height: 130, color: 'var(--color-primary)', unit: '' },
)

const W = 320
const TOP = 16
const BOTTOM = 18

const max = computed(() => Math.max(1, ...props.bars.map((b) => b.value)))
const step = computed(() => W / Math.max(1, props.bars.length))
const barW = computed(() => Math.min(30, step.value * 0.62))
const plotH = computed(() => props.height - TOP - BOTTOM)
const labelEvery = computed(() => (props.bars.length > 16 ? 3 : props.bars.length > 9 ? 2 : 1))
const maxIdx = computed(() => {
  const m = Math.max(...props.bars.map((b) => b.value))
  return m > 0 ? props.bars.findIndex((b) => b.value === m) : -1
})

const rects = computed(() =>
  props.bars.map((b, i) => {
    const h = b.value > 0 ? Math.max(3, (b.value / max.value) * plotH.value) : 2
    return {
      ...b,
      x: i * step.value + (step.value - barW.value) / 2,
      cx: i * step.value + step.value / 2,
      y: TOP + plotH.value - h,
      h,
      hot: i === maxIdx.value,
    }
  }),
)

const summary = computed(() => props.ariaLabel ?? props.bars.map((b) => `${b.label}: ${b.value}${props.unit}`).join(', '))
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${height}`" class="block w-full" role="img" :aria-label="summary">
    <title>{{ summary }}</title>
    <line x1="0" :x2="W" :y1="TOP + plotH" :y2="TOP + plotH" stroke="var(--color-line)" stroke-width="1" />
    <g v-for="(r, i) in rects" :key="i">
      <rect :x="r.x" :y="r.y" :width="barW" :height="r.h" rx="4" :style="{ fill: color }" :opacity="r.hot ? 1 : 0.45" />
      <text v-if="r.hot" :x="r.cx" :y="r.y - 4" text-anchor="middle" class="fill-ink" style="font-size: 11px; font-weight: 700">{{ r.value }}{{ unit }}</text>
      <text
        v-if="i % labelEvery === 0"
        :x="r.cx"
        :y="height - 4"
        text-anchor="middle"
        class="fill-muted"
        style="font-size: 10px"
      >{{ r.label }}</text>
    </g>
  </svg>
</template>
