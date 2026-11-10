<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBlockStore } from '@/stores/block'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import type { NumberFreq } from '@/utils/stats'
import { formatNumber } from '@/utils/numbers'
import { numberPath } from '@/utils/routes'
import { formatDate } from '@/utils/format'
import Avatar from '@/components/Avatar.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import BaseButton from '@/components/BaseButton.vue'

defineProps<{ items: NumberFreq[] }>()
const router = useRouter()
const block = useBlockStore()
const settings = useSettingsStore()
const ui = useUiStore()

function quickBlock(number: string) {
  const r = block.addRule('number', number)
  if (r) ui.showToast(t('stats.strangers.blocked'), 'success')
  else ui.showToast(t('block.form.duplicate'), 'warning')
}
</script>

<template>
  <ul class="divide-y divide-line">
    <li v-for="it in items" :key="it.number" class="flex items-center gap-3 py-2.5">
      <button type="button" class="tap flex min-w-0 flex-1 items-center gap-3 text-left" @click="router.push(numberPath(it.number))">
        <Avatar :name="it.name" :risk="it.risk" :is-private="!it.number" :size="38" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-semibold">{{ it.name ?? formatNumber(it.number, settings.state.homeCountryDial) }}</p>
          <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
            <RiskBadge :risk="it.risk" :category="it.category" />
            <span class="text-xs text-muted">{{ t('stats.strangers.meta', { n: it.count, date: formatDate(it.lastAt) }) }}</span>
          </div>
        </div>
      </button>
      <span v-if="!it.number" class="text-xs text-muted">{{ t('stats.strangers.hidden') }}</span>
      <span v-else-if="block.isBlockedNumber(it.number)" class="rounded-full bg-scam-soft px-2.5 py-1 text-xs font-semibold text-scam">{{ t('stats.strangers.alreadyBlocked') }}</span>
      <BaseButton v-else size="sm" variant="danger" @click="quickBlock(it.number)">{{ t('common.actions.block') }}</BaseButton>
    </li>
  </ul>
</template>
