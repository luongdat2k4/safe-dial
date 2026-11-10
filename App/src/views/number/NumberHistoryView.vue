<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { CallLogEntry } from '@/types'
import { t } from '@/composables/useT'
import { useDialFlow } from '@/composables/useDialFlow'
import { useCallsStore } from '@/stores/calls'
import { useContactsStore } from '@/stores/contacts'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { formatNumber } from '@/utils/numbers'
import { parseNumberParam } from '@/utils/routes'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import CallDayList from '@/components/calls/CallDayList.vue'
import SimSheet from '@/components/calls/SimSheet.vue'

const route = useRoute()
const calls = useCallsStore()
const contacts = useContactsStore()
const settings = useSettingsStore()
const ui = useUiStore()
const { startCall, chooseSim, simSheetOpen, pendingNumber } = useDialFlow()

const e164 = computed(() => parseNumberParam(route.params.number))
const entries = computed(() => calls.forNumber(e164.value))
const title = computed(
  () => contacts.findByNumber(e164.value)?.name ?? entries.value.find((e) => e.name)?.name ?? formatNumber(e164.value, settings.state.homeCountryDial),
)

onMounted(() => {
  calls.load()
  contacts.load()
})

const selecting = ref(false)
const selected = ref<string[]>([])
function exitSelect() {
  selecting.value = false
  selected.value = []
}
function toggle(e: CallLogEntry) {
  selected.value = selected.value.includes(e.id) ? selected.value.filter((x) => x !== e.id) : [...selected.value, e.id]
  if (!selected.value.length) exitSelect()
}
function longpress(e: CallLogEntry) {
  if (selecting.value) return toggle(e)
  selecting.value = true
  selected.value = [e.id]
}
async function removeSelected() {
  const ids = [...selected.value]
  const ok = await ui.confirm({
    title: t('number.history.deleteTitle', { n: ids.length }),
    message: t('number.history.deleteMessage'),
    confirmText: t('number.history.delete'),
    danger: true,
    icon: 'trash-2',
  })
  if (!ok) return
  await calls.remove(ids)
  ui.showToast(t('number.history.deleted', { n: ids.length }), 'success')
  exitSelect()
}
</script>

<template>
  <div class="flex h-full flex-col bg-canvas">
    <AppBar :title="title" :subtitle="t('number.history.count', { n: entries.length })" back>
      <template #right>
        <button
          v-if="selecting"
          class="tap flex h-9 items-center gap-1 rounded-full bg-scam-soft px-3 text-sm font-semibold text-scam"
          @click="removeSelected"
        >
          <AppIcon name="trash-2" :size="16" /> {{ t('number.history.delete') }} ({{ selected.length }})
        </button>
      </template>
    </AppBar>

    <div v-if="selecting" class="flex items-center border-b border-line bg-surface px-2 py-1.5">
      <button class="tap rounded-full px-3 py-2 text-sm font-semibold text-muted" @click="exitSelect">{{ t('number.history.cancel') }}</button>
      <p class="flex-1 text-center text-sm font-semibold">{{ t('number.history.selected', { n: selected.length }) }}</p>
      <button class="tap rounded-full px-3 py-2 text-sm font-semibold text-primary-dark" @click="selected = entries.map((e) => e.id)">
        {{ t('number.history.selectAll') }}
      </button>
    </div>

    <main class="min-h-0 flex-1 overflow-y-auto pb-8">
      <CallDayList
        v-if="entries.length"
        :entries="entries"
        :selectable="selecting"
        :selected-ids="selected"
        :show-call="!selecting"
        @open="(e) => selecting && toggle(e)"
        @call="() => startCall(e164)"
        @longpress="longpress"
      />
      <EmptyState v-else icon="history" :title="t('number.history.empty.title')" :description="t('number.history.empty.description')" />
    </main>
    <SimSheet v-model="simSheetOpen" :number="pendingNumber" @choose="chooseSim" />
  </div>
</template>
