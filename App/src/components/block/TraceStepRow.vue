<script setup lang="ts">
import { computed } from 'vue'
import type { TraceStep } from '@/utils/blockTrace'
import { t } from '@/composables/useT'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{ step: TraceStep; index: number }>()

const state = computed(() => {
  const s = props.step
  if (!s.reached) return { key: 'stopped', icon: 'minus', box: 'bg-canvas text-muted', pill: 'bg-canvas text-muted' }
  if (!s.enabled) return { key: 'off', icon: 'power-off', box: 'bg-unknown-soft text-unknown', pill: 'bg-unknown-soft text-unknown' }
  if (s.matched) return { key: 'match', icon: 'octagon-x', box: 'bg-scam-soft text-scam', pill: 'bg-scam text-white' }
  return { key: 'pass', icon: 'check', box: 'bg-primary-soft text-primary-dark', pill: 'bg-primary-soft text-primary-dark' }
})
</script>

<template>
  <li class="flex items-start gap-3 px-4 py-3" :class="{ 'opacity-55': !step.reached }">
    <span class="grid size-9 shrink-0 place-items-center rounded-xl" :class="state.box"><AppIcon :name="state.icon" :size="18" /></span>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <p class="min-w-0 flex-1 text-[15px] font-semibold">{{ index + 1 }}. {{ step.label }}</p>
        <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" :class="state.pill">{{ t(`block.trace.state.${state.key}`) }}</span>
      </div>
      <p v-if="step.reached && step.enabled" class="mt-0.5 text-[13px] leading-snug text-muted">{{ step.detail }}</p>
      <p v-else-if="step.reached" class="mt-0.5 text-[13px] leading-snug text-muted">{{ t('block.trace.offHint') }}</p>
    </div>
  </li>
</template>
