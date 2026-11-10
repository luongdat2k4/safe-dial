<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ label: string; value: number; max: number; valueText?: string; color?: string; sub?: string }>(),
  { color: 'var(--color-primary)' },
)
const pct = computed(() => (props.max > 0 ? Math.min(100, Math.max(props.value > 0 ? 3 : 0, (props.value / props.max) * 100)) : 0))
</script>

<template>
  <div>
    <div class="mb-1 flex items-baseline gap-2 text-[13px]">
      <span class="min-w-0 flex-1 truncate font-medium">{{ label }}</span>
      <span class="shrink-0 font-semibold">{{ valueText ?? value }}</span>
    </div>
    <svg class="block h-2 w-full" role="progressbar" :aria-label="label" :aria-valuenow="value" aria-valuemin="0" :aria-valuemax="max">
      <title>{{ label }}: {{ valueText ?? value }}</title>
      <rect width="100%" height="8" rx="4" style="fill: var(--color-line)" />
      <rect :width="`${pct}%`" height="8" rx="4" :style="{ fill: color }" />
    </svg>
    <p v-if="sub" class="mt-0.5 text-xs text-muted">{{ sub }}</p>
  </div>
</template>
