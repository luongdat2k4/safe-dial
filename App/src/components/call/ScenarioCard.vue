<script setup lang="ts">
import { computed } from 'vue'
import type { CallerInfo } from '@/types'
import type { Decision } from '@/utils/blockEngine'
import { useSettingsStore } from '@/stores/settings'
import { t } from '@/composables/useT'
import { formatNumber } from '@/utils/numbers'
import Avatar from '@/components/Avatar.vue'
import AppIcon from '@/components/AppIcon.vue'
import RiskBadge from '@/components/RiskBadge.vue'

const props = defineProps<{
  title: string
  description: string
  number: string
  isPrivate?: boolean
  info?: CallerInfo
  decision?: Decision
  busy?: boolean
}>()
defineEmits<{ run: [] }>()
const settings = useSettingsStore()
const shown = computed(() => (props.isPrivate ? t('common.privateNumber') : formatNumber(props.number, settings.state.homeCountryDial)))
</script>

<template>
  <button
    type="button"
    class="tap flex w-full items-center gap-3 rounded-card bg-surface p-3.5 text-left shadow-card disabled:opacity-60"
    :disabled="busy"
    @click="$emit('run')"
  >
    <Avatar :name="info?.name" :risk="info?.risk ?? 'unknown'" :is-private="isPrivate" :size="44" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-[15px] font-semibold">{{ title }}</p>
      <p class="line-clamp-2 text-[13px] leading-snug text-muted">{{ description }}</p>
      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span class="text-xs font-medium text-ink">{{ shown }}</span>
        <RiskBadge v-if="info" :risk="info.risk" :category="info.profile?.category" />
        <span
          v-if="decision"
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          :class="decision.action === 'allow' ? 'bg-primary-soft text-primary-dark' : 'bg-[#efe8fd] text-blocked'"
        >
          <AppIcon :name="decision.action === 'allow' ? 'phone-incoming' : 'shield-ban'" :size="12" />
          {{ decision.action === 'allow' ? t('call.simulate.willRing') : t('call.simulate.willBlock') }}
        </span>
      </div>
    </div>
    <AppIcon name="play" :size="18" class="shrink-0 text-primary" />
  </button>
</template>
