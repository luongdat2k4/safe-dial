<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBlockStore } from '@/stores/block'
import { useCallsStore } from '@/stores/calls'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { formatDate } from '@/utils/format'
import { formatNumber } from '@/utils/numbers'
import { ruleMatches } from '@/utils/blockEngine'
import { isKnown } from '@/utils/stats'
import BaseButton from '@/components/BaseButton.vue'
import ListRow from '@/components/ListRow.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppIcon from '@/components/AppIcon.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import { RULE_META, ruleValueText } from './ruleMeta'

const block = useBlockStore()
const calls = useCallsStore()
const settings = useSettingsStore()
const ui = useUiStore()
const router = useRouter()
const home = computed(() => settings.state.homeCountryDial)

async function remove(id: string, name: string) {
  const ok = await ui.confirm({
    title: t('block.rules.deleteTitle'),
    message: t('block.rules.deleteMsg', { name }),
    confirmText: t('common.actions.delete'),
    danger: true,
    icon: 'trash-2',
  })
  if (!ok) return
  block.removeRule(id)
  ui.showToast(t('block.rules.deleted'), 'success')
}

/** 5 số lạ gần đây nhất mà chưa bị chặn. */
const recent = computed(() => {
  const seen = new Set<string>()
  const out = []
  for (const e of calls.entries) {
    if (!e.number || e.type === 'blocked' || e.type === 'outgoing' || isKnown(e) || seen.has(e.number)) continue
    seen.add(e.number)
    if (block.rules.some((r) => ruleMatches(r, e.number, home.value))) continue
    out.push(e)
    if (out.length === 5) break
  }
  return out
})

function quickBlock(number: string) {
  const r = block.addRule('number', number)
  if (r) ui.showToast(t('block.quick.done', { number: formatNumber(number, home.value) }), 'success')
  else ui.showToast(t('block.form.duplicate'), 'warning')
}
</script>

<template>
  <div>
    <div class="flex gap-2 px-4 pt-1">
      <BaseButton class="flex-1" icon="plus" @click="router.push('/block/rule/new')">{{ t('block.rules.add') }}</BaseButton>
      <BaseButton class="flex-1" variant="secondary" icon="flask-conical" @click="router.push('/block/test')">{{ t('block.rules.test') }}</BaseButton>
    </div>

    <SectionHeader :title="t('block.rules.header', { n: block.rules.length })" />
    <EmptyState v-if="!block.rules.length" icon="list-x" :title="t('block.rules.emptyTitle')" :description="t('block.rules.emptyDesc')" />
    <ul v-else class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
      <li v-for="r in block.rules" :key="r.id">
        <ListRow
          :icon="RULE_META[r.kind].icon"
          :icon-tone="RULE_META[r.kind].tone"
          :title="ruleValueText(r, home)"
          :subtitle="`${t(`common.ruleKind.${r.kind}`)}${r.label ? ' · ' + r.label : ''} · ${formatDate(r.createdAt)}`"
        >
          <template #right>
            <button
              type="button"
              class="tap grid size-10 place-items-center rounded-full text-scam active:bg-scam-soft"
              :aria-label="t('block.rules.deleteAria', { name: ruleValueText(r, home) })"
              @click="remove(r.id, ruleValueText(r, home))"
            >
              <AppIcon name="trash-2" :size="19" />
            </button>
          </template>
        </ListRow>
      </li>
    </ul>

    <SectionHeader :title="t('block.quick.header')" />
    <p v-if="!recent.length" class="mx-4 rounded-card bg-surface px-4 py-3 text-sm text-muted shadow-card">{{ t('block.quick.none') }}</p>
    <ul v-else class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
      <li v-for="e in recent" :key="e.number">
        <ListRow :title="formatNumber(e.number, home)" :subtitle="t(`common.callType.${e.type}`)" icon="phone-incoming" icon-tone="gray">
          <template #right>
            <RiskBadge v-if="e.risk !== 'unknown'" :risk="e.risk" :category="e.category" class="mr-1" />
            <BaseButton size="sm" variant="danger" @click="quickBlock(e.number)">{{ t('common.actions.block') }}</BaseButton>
          </template>
        </ListRow>
      </li>
    </ul>
    <div class="h-6" />
  </div>
</template>
