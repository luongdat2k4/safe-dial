<script setup lang="ts">
import { computed } from 'vue'
import type { CallLogEntry } from '@/types'
import { dayLabel } from '@/utils/format'
import SectionHeader from '@/components/SectionHeader.vue'
import CallRow from './CallRow.vue'

/** Danh sách cuộc gọi gom theo ngày (dữ liệu đã sắp xếp mới → cũ). */
const props = defineProps<{
  entries: CallLogEntry[]
  selectable?: boolean
  selectedIds?: string[]
  showCall?: boolean
  showMore?: boolean
}>()
defineEmits<{ open: [e: CallLogEntry]; call: [e: CallLogEntry]; longpress: [e: CallLogEntry]; more: [e: CallLogEntry] }>()

const groups = computed(() => {
  const out: Array<{ label: string; items: CallLogEntry[] }> = []
  for (const e of props.entries) {
    const label = dayLabel(e.startedAt)
    const last = out[out.length - 1]
    if (last && last.label === label) last.items.push(e)
    else out.push({ label, items: [e] })
  }
  return out
})
</script>

<template>
  <div class="call-groups">
    <section v-for="g in groups" :key="g.label" class="call-group">
      <SectionHeader :title="g.label" />
      <CallRow
        v-for="e in g.items"
        :key="e.id"
        :entry="e"
        :selectable="selectable"
        :selected="selectedIds?.includes(e.id)"
        :show-call="showCall"
        :show-more="showMore"
        @open="$emit('open', e)"
        @call="$emit('call', e)"
        @longpress="$emit('longpress', e)"
        @more="$emit('more', e)"
      />
    </section>
  </div>
</template>
