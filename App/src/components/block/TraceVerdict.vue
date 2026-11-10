<script setup lang="ts">
import { computed } from 'vue'
import type { Decision } from '@/utils/blockEngine'
import { t } from '@/composables/useT'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{ decision: Decision }>()

const meta = computed(() => {
  switch (props.decision.action) {
    case 'block':
      return { key: 'block', icon: 'shield-ban', cls: 'bg-scam text-white' }
    case 'silence':
      return { key: 'silence', icon: 'bell-off', cls: 'bg-spam text-white' }
    default:
      return { key: 'allow', icon: 'shield-check', cls: 'bg-primary text-white' }
  }
})
</script>

<template>
  <div class="rounded-card p-4 shadow-card" :class="meta.cls" role="status">
    <div class="flex items-center gap-3">
      <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20"><AppIcon :name="meta.icon" :size="26" /></span>
      <div class="min-w-0">
        <p class="text-xs font-semibold tracking-wide uppercase opacity-85">{{ t('block.trace.verdict') }}</p>
        <p class="text-2xl leading-tight font-bold">{{ t(`block.trace.action.${meta.key}`) }}</p>
      </div>
    </div>
    <p class="mt-3 text-sm leading-snug opacity-95">
      <template v-if="decision.reason">
        {{ t('block.trace.reasonLine', { reason: t(`common.blockReason.${decision.reason}`) }) }}
        <span v-if="decision.detail" class="font-semibold"> ({{ decision.detail }})</span>
      </template>
      <template v-else>{{ t('block.trace.allowLine') }}</template>
    </p>
    <p v-if="decision.action === 'silence'" class="mt-1 text-xs opacity-85">{{ t('block.trace.silenceNote') }}</p>
  </div>
</template>
