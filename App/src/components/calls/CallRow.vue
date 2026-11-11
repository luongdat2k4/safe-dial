<script setup lang="ts">
import type { CallLogEntry } from '@/types'
import { t } from '@/composables/useT'
import CallLogItem from '@/components/CallLogItem.vue'
import AppIcon from '@/components/AppIcon.vue'

/** Một dòng nhật ký + nút `…` mở menu thao tác (nhấn giữ dành cho chọn nhiều). */
defineProps<{ entry: CallLogEntry; selectable?: boolean; selected?: boolean; showCall?: boolean; showMore?: boolean }>()
defineEmits<{ open: []; call: []; longpress: []; more: [] }>()
</script>

<template>
  <div class="call-row flex items-center border-b">
    <CallLogItem
      class="min-w-0 flex-1"
      :entry="entry"
      :selectable="selectable"
      :selected="selected"
      :show-call="showCall"
      @open="$emit('open')"
      @call="$emit('call')"
      @longpress="$emit('longpress')"
    />
    <button
      v-if="showMore && !selectable"
      type="button"
      class="tap mr-1 grid size-10 shrink-0 place-items-center rounded-full text-muted"
      :aria-label="t('home.calls.more')"
      @click="$emit('more')"
    >
      <AppIcon name="ellipsis-vertical" :size="20" />
    </button>
  </div>
</template>
