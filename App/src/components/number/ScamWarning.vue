<script setup lang="ts">
import { computed } from 'vue'
import type { NumberProfile } from '@/types'
import { t } from '@/composables/useT'
import AppIcon from '@/components/AppIcon.vue'

/** Banner cảnh báo cho số spam / lừa đảo, kèm 3 mẹo an toàn. */
const props = defineProps<{ profile: Pick<NumberProfile, 'risk' | 'category' | 'reportCount'> }>()

const isScam = computed(() => props.profile.risk === 'scam')
const category = computed(() => t(`common.category.${props.profile.category ?? (isScam.value ? 'scam' : 'spam')}`))
</script>

<template>
  <section
    class="mx-4 rounded-2xl border p-4"
    :class="isScam ? 'border-scam/30 bg-scam-soft text-scam' : 'border-spam/30 bg-spam-soft text-spam'"
    role="alert"
  >
    <div class="flex items-start gap-3">
      <AppIcon :name="isScam ? 'shield-alert' : 'triangle-alert'" :size="28" class="warn-blink mt-0.5 shrink-0" />
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-bold">{{ isScam ? t('number.warning.scamTitle') : t('number.warning.spamTitle') }}</h2>
        <p class="text-sm font-medium">{{ t('number.warning.reports', { n: profile.reportCount.toLocaleString('vi-VN'), category }) }}</p>
      </div>
    </div>
    <p class="mt-3 text-xs font-bold tracking-wide uppercase">{{ t('number.warning.tipsTitle') }}</p>
    <ul class="mt-1.5 space-y-1.5 text-sm text-ink">
      <li v-for="k in ['tip1', 'tip2', 'tip3']" :key="k" class="flex gap-2">
        <AppIcon name="circle-check" :size="16" class="mt-0.5 shrink-0" />
        <span>{{ t(`number.warning.${k}`) }}</span>
      </li>
    </ul>
  </section>
</template>
