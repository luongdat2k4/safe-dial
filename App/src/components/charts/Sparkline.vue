<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ values: number[]; color?: string; height?: number; ariaLabel?: string }>(), {
  color: 'var(--color-primary)',
  height: 36,
})
const W = 120
const pts = computed(() => {
  const max = Math.max(1, ...props.values)
  const n = Math.max(1, props.values.length - 1)
  return props.values.map((v, i) => [(i / n) * W, props.height - 4 - (v / max) * (props.height - 8)] as const)
})
const line = computed(() => pts.value.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '))
const area = computed(() => (pts.value.length ? `0,${props.height} ${line.value} ${W},${props.height}` : ''))
const summary = computed(() => props.ariaLabel ?? props.values.join(', '))
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" class="block w-full" :style="{ height: `${height}px` }" role="img" :aria-label="summary">
    <title>{{ summary }}</title>
    <polygon :points="area" :style="{ fill: color }" opacity="0.15" />
    <polyline :points="line" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" :style="{ stroke: color }" />
  </svg>
</template>
