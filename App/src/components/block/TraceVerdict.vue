<script setup lang="ts">
import { computed } from 'vue'
import type { NativeDecision } from '@/services'
import { reasonFromBits, signalsFromBits } from '@/utils/blockEngine'
import { t } from '@/composables/useT'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{ decision: NativeDecision }>()

const meta = computed(() => {
  switch (props.decision.action) {
    case 'blocked':
      return { icon: 'shield-ban', cls: 'bg-scam text-white' }
    case 'silenced':
      return { icon: 'bell-off', cls: 'bg-spam text-white' }
    case 'warned':
      return { icon: 'shield-alert', cls: 'bg-spam text-white' }
    default:
      return { icon: 'shield-check', cls: 'bg-primary text-white' }
  }
})
const blocks = computed(() => props.decision.action === 'blocked' || props.decision.action === 'silenced')
const reason = computed(() => reasonFromBits(props.decision.reasons))
const signals = computed(() => signalsFromBits(props.decision.reasons).map((s) => t(`common.signal.${s}`)).join(', '))
</script>

<template>
  <div class="rounded-card p-4 shadow-card" :class="meta.cls" role="status">
    <div class="flex items-center gap-3">
      <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20"><AppIcon :name="meta.icon" :size="26" /></span>
      <div class="min-w-0">
        <p class="text-xs font-semibold tracking-wide uppercase opacity-85">{{ t('block.trace.verdict') }}</p>
        <p class="text-2xl leading-tight font-bold">{{ t(`block.trace.action.${decision.action}`) }}</p>
      </div>
    </div>
    <p class="mt-3 text-sm leading-snug opacity-95">
      <template v-if="blocks && reason">
        {{ t('block.trace.reasonLine', { reason: t(`common.blockReason.${reason}`) }) }}
        <span v-if="decision.ruleLabel" class="font-semibold"> ({{ decision.ruleLabel }})</span>
      </template>
      <template v-else-if="decision.action === 'warned'">{{ t('block.trace.warnLine', { list: signals || t(`common.risk.${decision.risk}`) }) }}</template>
      <template v-else>{{ t('block.trace.allowLine') }}</template>
    </p>
    <p v-if="decision.action === 'silenced'" class="mt-1 text-xs opacity-85">{{ t('block.trace.silenceNote') }}</p>
  </div>
</template>
