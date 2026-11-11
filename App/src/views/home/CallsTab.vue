<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CallLogEntry } from '@/types'
import { t } from '@/composables/useT'
import { useDialFlow, useNumberActions } from '@/composables/useDialFlow'
import { useCallsStore } from '@/stores/calls'
import { useContactsStore } from '@/stores/contacts'
import { useBlockStore } from '@/stores/block'
import { SafeDial } from '@/services'
import BaseButton from '@/components/BaseButton.vue'
import { useUiStore } from '@/stores/ui'
import { numberPath } from '@/utils/routes'
import SegmentedTabs from '@/components/SegmentedTabs.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppIcon from '@/components/AppIcon.vue'
import CallsSummary from '@/components/calls/CallsSummary.vue'
import CallDayList from '@/components/calls/CallDayList.vue'
import CallActionSheet, { type CallAction } from '@/components/calls/CallActionSheet.vue'
import SimSheet from '@/components/calls/SimSheet.vue'
import ReportSheet from '@/components/number/ReportSheet.vue'

const router = useRouter()
const calls = useCallsStore()
const block = useBlockStore()
const contacts = useContactsStore()
const ui = useUiStore()
const { startCall, chooseSim, simSheetOpen, pendingNumber } = useDialFlow()
const { toggleBlock, copyNumber, messageMock, saveMock } = useNumberActions()

type Filter = 'all' | 'missed' | 'incoming' | 'outgoing' | 'unknown' | 'spam' | 'blocked'
const filter = ref<Filter>('all')

onMounted(() => {
  calls.load()
  contacts.load()
  block.load()
})

/** Chưa có quyền đọc nhật ký: xin quyền rồi tải lại. */
async function grantCallLog() {
  await SafeDial.requestPermissions({ permissions: ['callLog', 'phone'] })
  await calls.load(true)
}

const isRisky = (e: CallLogEntry) => e.risk === 'spam' || e.risk === 'scam'
const matchers: Record<Filter, (e: CallLogEntry) => boolean> = {
  all: () => true,
  missed: (e) => e.type === 'missed',
  incoming: (e) => e.type === 'incoming',
  outgoing: (e) => e.type === 'outgoing',
  unknown: (e) => e.risk === 'unknown',
  spam: isRisky,
  blocked: (e) => e.type === 'blocked',
}
const filtered = computed(() => calls.entries.filter(matchers[filter.value]))
const count = (f: Filter) => calls.entries.filter(matchers[f]).length

const tabs = computed(() =>
  (['all', 'missed', 'incoming', 'outgoing', 'unknown', 'spam', 'blocked'] as Filter[]).map((k) => ({
    key: k,
    label: t(`home.calls.filters.${k}`),
    badge: k === 'unknown' || k === 'spam' || k === 'blocked' || k === 'missed' ? count(k) : undefined,
  })),
)

const weekAgo = () => Date.now() - 7 * 86_400_000
const recent = computed(() => calls.entries.filter((e) => new Date(e.startedAt).getTime() >= weekAgo()))
const suspicious = computed(() => recent.value.filter((e) => e.type !== 'outgoing' && (e.risk === 'spam' || e.risk === 'scam' || e.action === 'warned')).length)
const blockedRecent = computed(() => recent.value.filter((e) => e.type === 'blocked').length)

// Chọn nhiều
const selecting = ref(false)
const selected = ref<string[]>([])
function enterSelect(e: CallLogEntry) {
  selecting.value = true
  selected.value = [e.id]
}
function exitSelect() {
  selecting.value = false
  selected.value = []
}
function toggleSelect(e: CallLogEntry) {
  selected.value = selected.value.includes(e.id) ? selected.value.filter((x) => x !== e.id) : [...selected.value, e.id]
  if (!selected.value.length) exitSelect()
}
function selectAll() {
  selected.value = filtered.value.map((e) => e.id)
}
async function deleteSelected() {
  const ids = [...selected.value]
  const ok = await ui.confirm({
    title: t('home.calls.delete.title', { n: ids.length }),
    message: t('home.calls.delete.message'),
    confirmText: t('common.actions.delete'),
    danger: true,
    icon: 'trash-2',
  })
  if (!ok) return
  await calls.remove(ids)
  ui.showToast(t('home.calls.delete.done', { n: ids.length }), 'success')
  exitSelect()
}

function open(e: CallLogEntry) {
  if (selecting.value) toggleSelect(e)
  else router.push(numberPath(e.number))
}

// Menu thao tác từng dòng
const actionOpen = ref(false)
const actionEntry = ref<CallLogEntry | null>(null)
const reportOpen = ref(false)
function openActions(e: CallLogEntry) {
  actionEntry.value = e
  actionOpen.value = true
}

async function onAction(a: CallAction) {
  const e = actionEntry.value
  if (!e) return
  switch (a) {
    case 'call':
      return startCall(e.number)
    case 'message':
      return messageMock(e.number, e.name)
    case 'detail':
      return router.push(numberPath(e.number))
    case 'block':
      return void (await toggleBlock(e.number, e.name))
    case 'report':
      reportOpen.value = true
      return
    case 'save':
      return saveMock(e.number)
    case 'copy':
      return copyNumber(e.number)
    case 'delete': {
      const ok = await ui.confirm({
        title: t('home.calls.deleteOne.title'),
        message: t('home.calls.deleteOne.message'),
        confirmText: t('common.actions.delete'),
        danger: true,
        icon: 'trash-2',
      })
      if (ok) await calls.remove([e.id])
    }
  }
}
</script>

<template>
  <div class="pb-28">
    <div v-if="selecting" class="sticky top-0 z-10 flex items-center gap-1 border-b border-line bg-surface px-2 py-2">
      <button class="tap grid size-10 place-items-center rounded-full" :aria-label="t('home.calls.select.cancel')" @click="exitSelect">
        <AppIcon name="x" :size="22" />
      </button>
      <p class="flex-1 text-base font-semibold">{{ t('home.calls.select.count', { n: selected.length }) }}</p>
      <button class="tap rounded-full px-3 py-2 text-sm font-semibold text-primary-dark" @click="selectAll">{{ t('home.calls.select.all') }}</button>
      <button class="tap flex items-center gap-1 rounded-full bg-scam-soft px-3 py-2 text-sm font-semibold text-scam" @click="deleteSelected">
        <AppIcon name="trash-2" :size="16" /> {{ t('home.calls.select.delete') }}
      </button>
    </div>
    <template v-else>
      <SegmentedTabs v-model="filter" :items="tabs" class="sticky top-0 z-10 bg-canvas" />
      <CallsSummary :suspicious="suspicious" :blocked="blockedRecent" @show-blocked="filter = 'blocked'" />
    </template>

    <CallDayList
      v-if="filtered.length"
      :entries="filtered"
      :selectable="selecting"
      :selected-ids="selected"
      show-call
      show-more
      @open="open"
      @call="(e) => startCall(e.number)"
      @longpress="(e) => (selecting ? toggleSelect(e) : enterSelect(e))"
      @more="openActions"
    />
    <div v-else-if="!calls.granted" class="px-6 pt-10 text-center">
      <EmptyState icon="phone-off" :title="t('home.calls.noPermission.title')" :description="t('home.calls.noPermission.description')" />
      <BaseButton icon="shield-check" @click="grantCallLog">{{ t('home.calls.noPermission.grant') }}</BaseButton>
    </div>
    <EmptyState
      v-else
      :icon="filter === 'blocked' ? 'ban' : filter === 'spam' ? 'shield-check' : 'phone'"
      :title="t(`home.calls.empty.${filter}.title`)"
      :description="t(`home.calls.empty.${filter}.description`)"
    />

    <CallActionSheet v-model="actionOpen" :entry="actionEntry" @action="onAction" />
    <ReportSheet v-model="reportOpen" :number="actionEntry?.number ?? ''" />
    <SimSheet v-model="simSheetOpen" :number="pendingNumber" @choose="chooseSim" />
  </div>
</template>
