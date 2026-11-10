<script setup lang="ts">
import { computed } from 'vue'
import type { RiskLevel, SpamCategory } from '@/types'
import { t } from '@/composables/useT'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{ risk: RiskLevel; category?: SpamCategory; size?: 'sm' | 'md'; hideSafe?: boolean }>(),
  { size: 'sm' },
)

const meta = computed(() => {
  switch (props.risk) {
    case 'scam':
      return { icon: 'shield-alert', cls: 'bg-scam-soft text-scam' }
    case 'spam':
      return { icon: 'shield-x', cls: 'bg-spam-soft text-spam' }
    case 'unknown':
      return { icon: 'circle-help', cls: 'bg-unknown-soft text-unknown' }
    default:
      return { icon: 'shield-check', cls: 'bg-primary-soft text-primary-dark' }
  }
})

const label = computed(() =>
  props.category && (props.risk === 'scam' || props.risk === 'spam')
    ? t(`common.category.${props.category}`)
    : t(`common.risk.${props.risk}`),
)
</script>

<template>
  <span
    v-if="!(hideSafe && risk === 'safe')"
    class="inline-flex max-w-full items-center gap-1 rounded-full font-semibold"
    :class="[meta.cls, size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-sm']"
  >
    <AppIcon :name="meta.icon" :size="size === 'sm' ? 12 : 16" />
    <span class="truncate">{{ label }}</span>
  </span>
</template>
