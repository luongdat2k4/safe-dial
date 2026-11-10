<script setup lang="ts">
import { computed } from 'vue'
import type { CallLogEntry } from '@/types'
import { t } from '@/composables/useT'
import { useBlockStore } from '@/stores/block'
import { useSettingsStore } from '@/stores/settings'
import { formatNumber } from '@/utils/numbers'
import BottomSheet from '@/components/BottomSheet.vue'
import ListRow from '@/components/ListRow.vue'

type Tone = 'danger' | 'warn' | 'brand' | 'blue' | 'gray'
export type CallAction = 'call' | 'message' | 'detail' | 'block' | 'report' | 'save' | 'copy' | 'delete'

const props = defineProps<{ entry: CallLogEntry | null }>()
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ action: [action: CallAction] }>()
const block = useBlockStore()
const settings = useSettingsStore()

const blocked = computed(() => !!props.entry?.number && !!block.isBlockedNumber(props.entry.number))
const title = computed(() =>
  props.entry ? (props.entry.name ?? formatNumber(props.entry.number, settings.state.homeCountryDial)) : t('home.calls.actions.title'),
)

const items = computed(() => {
  const hasNumber = !!props.entry?.number
  const list: Array<{ key: CallAction; icon: string; label: string; tone: Tone; danger?: boolean }> = []
  if (hasNumber) {
    list.push({ key: 'call', icon: 'phone', label: t('home.calls.actions.call'), tone: 'brand' })
    list.push({ key: 'message', icon: 'message-square', label: t('home.calls.actions.message'), tone: 'blue' })
  }
  list.push({ key: 'detail', icon: 'info', label: t('home.calls.actions.detail'), tone: 'gray' })
  if (hasNumber) {
    list.push({
      key: 'block',
      icon: blocked.value ? 'circle-check' : 'ban',
      label: blocked.value ? t('home.calls.actions.unblock') : t('home.calls.actions.block'),
      tone: 'danger',
    })
    list.push({ key: 'report', icon: 'flag', label: t('home.calls.actions.report'), tone: 'warn' })
    if (!props.entry?.contactId) list.push({ key: 'save', icon: 'user-plus', label: t('home.calls.actions.save'), tone: 'brand' })
    list.push({ key: 'copy', icon: 'copy', label: t('home.calls.actions.copy'), tone: 'gray' })
  }
  list.push({ key: 'delete', icon: 'trash-2', label: t('home.calls.actions.delete'), tone: 'danger', danger: true })
  return list
})

function pick(a: CallAction) {
  open.value = false
  emit('action', a)
}
</script>

<template>
  <BottomSheet v-model="open" :title="title">
    <div class="-mx-5">
      <ListRow v-for="it in items" :key="it.key" :title="it.label" :icon="it.icon" :icon-tone="it.tone" :danger="it.danger" clickable @click="pick(it.key)" />
    </div>
  </BottomSheet>
</template>
