<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { t } from '@/composables/useT'
import type { RankedNumber } from '@/utils/stats'
import { formatDuration } from '@/utils/format'
import { formatNumber } from '@/utils/numbers'
import { numberPath } from '@/utils/routes'
import Avatar from '@/components/Avatar.vue'
import AppIcon from '@/components/AppIcon.vue'
import HBar from './HBar.vue'

const props = defineProps<{ items: RankedNumber[] }>()
const router = useRouter()
const settings = useSettingsStore()
const max = computed(() => Math.max(1, ...props.items.map((i) => i.count)))
</script>

<template>
  <ul class="divide-y divide-line">
    <li v-for="(it, i) in items" :key="it.number">
      <button
        type="button"
        class="tap flex w-full items-center gap-3 py-2.5 text-left"
        @click="router.push(numberPath(it.number, 'stats'))"
      >
        <span class="w-4 text-center text-sm font-bold text-muted">{{ i + 1 }}</span>
        <Avatar :name="it.name" risk="safe" :size="38" />
        <div class="min-w-0 flex-1">
          <HBar
            :label="it.name ?? formatNumber(it.number, settings.state.homeCountryDial)"
            :value="it.count"
            :max="max"
            :value-text="t('stats.frequency.times', { n: it.count })"
            :sub="it.totalSec ? formatDuration(it.totalSec) : t('stats.frequency.noTalk')"
          />
        </div>
        <AppIcon name="chevron-right" :size="16" class="shrink-0 text-muted" />
      </button>
    </li>
  </ul>
</template>
