<script setup lang="ts">
import { computed } from 'vue'
import type { CallLogEntry } from '@/types'
import { dayLabel } from '@/utils/format'
import SectionHeader from '@/components/SectionHeader.vue'
import VirtualList from '@/components/VirtualList.vue'
import CallRow from './CallRow.vue'

/**
 * Danh sách cuộc gọi gom theo ngày (dữ liệu đã sắp xếp mới → cũ).
 * Ảo hoá: tiêu đề ngày và từng cuộc gọi là các dòng phẳng, chỉ dòng gần vùng nhìn thấy được render.
 */
const props = defineProps<{
  entries: CallLogEntry[]
  selectable?: boolean
  selectedIds?: string[]
  showCall?: boolean
  showMore?: boolean
}>()
defineEmits<{
  open: [e: CallLogEntry]
  call: [e: CallLogEntry]
  longpress: [e: CallLogEntry]
  more: [e: CallLogEntry]
  /** Sắp cuộn tới cuối danh sách. */
  end: []
}>()

type Row =
  | { key: string; kind: 'day'; label: string }
  | { key: string; kind: 'call'; entry: CallLogEntry; last: boolean }

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  let label = ''
  for (const e of props.entries) {
    const l = dayLabel(e.startedAt)
    if (l !== label) {
      const prev = out[out.length - 1]
      if (prev?.kind === 'call') prev.last = true
      out.push({ key: `day:${l}`, kind: 'day', label: l })
      label = l
    }
    out.push({ key: e.id, kind: 'call', entry: e, last: false })
  }
  const prev = out[out.length - 1]
  if (prev?.kind === 'call') prev.last = true
  return out
})

const selected = computed(() => new Set(props.selectedIds ?? []))
const estimate = (r: Row) => (r.kind === 'day' ? 48 : 112)
</script>

<template>
  <VirtualList class="call-groups" :items="rows" :estimate="estimate" @end="$emit('end')">
    <template #default="{ item: r }">
      <div v-if="r.kind === 'day'" class="call-day-header"><SectionHeader :title="r.label" /></div>
      <CallRow
        v-else
        :entry="r.entry"
        :class="{ 'call-row-last': r.last }"
        :selectable="selectable"
        :selected="selected.has(r.entry.id)"
        :show-call="showCall"
        :show-more="showMore"
        @open="$emit('open', r.entry)"
        @call="$emit('call', r.entry)"
        @longpress="$emit('longpress', r.entry)"
        @more="$emit('more', r.entry)"
      />
    </template>
  </VirtualList>
</template>
