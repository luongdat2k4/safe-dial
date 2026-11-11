<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/composables/useT'
import AppIcon from '@/components/AppIcon.vue'

export interface TraceRow {
  id: string
  state: 'off' | 'pass' | 'match' | 'stopped'
  detail: string
}

const props = defineProps<{ step: TraceRow; index: number }>()

const look = computed(() => {
  switch (props.step.state) {
    case 'stopped':
      return { icon: 'minus', box: 'bg-canvas text-muted', pill: 'bg-canvas text-muted' }
    case 'off':
      return { icon: 'power-off', box: 'bg-unknown-soft text-unknown', pill: 'bg-unknown-soft text-unknown' }
    case 'match':
      return { icon: 'octagon-x', box: 'bg-scam-soft text-scam', pill: 'bg-scam text-white' }
    default:
      return { icon: 'check', box: 'bg-primary-soft text-primary-dark', pill: 'bg-primary-soft text-primary-dark' }
  }
})
</script>

<template>
  <li class="flex items-start gap-3 px-4 py-3" :class="{ 'opacity-55': step.state === 'stopped' }">
    <span class="grid size-9 shrink-0 place-items-center rounded-xl" :class="look.box"><AppIcon :name="look.icon" :size="18" /></span>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <p class="min-w-0 flex-1 text-[15px] font-semibold">{{ index + 1 }}. {{ t(`block.trace.steps.${step.id}`) }}</p>
        <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" :class="look.pill">{{ t(`block.trace.state.${step.state}`) }}</span>
      </div>
      <p class="mt-0.5 text-[13px] leading-snug text-muted">{{ step.detail }}</p>
    </div>
  </li>
</template>
