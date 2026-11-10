<script setup lang="ts">
import { computed } from 'vue'
import type { NumberProfile } from '@/types'
import { t } from '@/composables/useT'
import { countryOf } from '@/utils/countries'
import { formatDate, formatTime } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{ e164: string; profile?: NumberProfile; lastCall?: string }>()

const none = t('number.info.none')
const rows = computed(() => {
  const c = countryOf(props.e164)
  return [
    { icon: 'map-pin', label: t('number.info.location'), value: props.profile?.location ?? none },
    { icon: 'radio-tower', label: t('number.info.carrier'), value: props.profile?.carrier ?? none },
    { icon: 'flag', label: t('number.info.reports'), value: (props.profile?.reportCount ?? 0).toLocaleString('vi-VN') },
    {
      icon: 'clock',
      label: t('number.info.lastCall'),
      value: props.lastCall ? `${formatTime(props.lastCall)} · ${formatDate(props.lastCall)}` : t('number.info.never'),
    },
    { icon: 'globe', label: t('number.info.country'), value: c ? `${c.flag} ${c.name}` : none },
  ]
})
</script>

<template>
  <section class="mx-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
    <h2 class="mb-2 text-sm font-bold">{{ t('number.info.title') }}</h2>
    <dl class="divide-y divide-line/70">
      <div v-for="r in rows" :key="r.label" class="flex items-center gap-3 py-2.5">
        <AppIcon :name="r.icon" :size="18" class="shrink-0 text-muted" />
        <dt class="flex-1 text-sm text-muted">{{ r.label }}</dt>
        <dd class="text-right text-sm font-semibold">{{ r.value }}</dd>
      </div>
    </dl>
  </section>
</template>
