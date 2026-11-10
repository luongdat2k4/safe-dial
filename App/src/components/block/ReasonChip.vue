<script setup lang="ts">
import type { BlockReason } from '@/types'
import { t } from '@/composables/useT'
import AppIcon from '@/components/AppIcon.vue'
import { REASON_CLASS, REASON_ICON } from './ruleMeta'

defineProps<{ reason: BlockReason }>()
</script>

<template>
  <span class="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="REASON_CLASS[reason]">
    <AppIcon :name="REASON_ICON[reason]" :size="12" />
    <span class="truncate">{{ t(`common.blockReason.${reason}`) }}</span>
  </span>
</template>
