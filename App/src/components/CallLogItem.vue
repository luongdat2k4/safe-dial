<script setup lang="ts">
import { computed } from 'vue'
import type { CallLogEntry } from '@/types'
import { useSettingsStore } from '@/stores/settings'
import { formatNumber } from '@/utils/numbers'
import { formatDuration, formatTime } from '@/utils/format'
import { t } from '@/composables/useT'
import Avatar from './Avatar.vue'
import AppIcon from './AppIcon.vue'
import RiskBadge from './RiskBadge.vue'

const props = defineProps<{ entry: CallLogEntry; selectable?: boolean; selected?: boolean; showCall?: boolean }>()
const emit = defineEmits<{ open: []; call: []; longpress: [] }>()
const settings = useSettingsStore()

const title = computed(() => props.entry.name ?? formatNumber(props.entry.number, settings.state.homeCountryDial))
const showNumber = computed(() => !!props.entry.name && !!props.entry.number)

const typeMeta = computed(() => {
  switch (props.entry.type) {
    case 'incoming':
      return { icon: 'phone-incoming', cls: 'text-incoming' }
    case 'outgoing':
      return { icon: 'phone-outgoing', cls: 'text-outgoing' }
    case 'missed':
      return { icon: 'phone-missed', cls: 'text-missed' }
    default:
      return { icon: 'phone-off', cls: 'text-blocked' }
  }
})

const subtitle = computed(() => {
  const e = props.entry
  const parts = [formatTime(e.startedAt)]
  if (e.type === 'blocked' && e.blockedReason) parts.push(t(`common.blockReason.${e.blockedReason}`))
  else if (e.durationSec > 0) parts.push(formatDuration(e.durationSec))
  if (e.simSlot) parts.push(`SIM ${e.simSlot}`)
  return parts.join(' · ')
})

// Nhấn giữ để chọn nhiều
let pressTimer: ReturnType<typeof setTimeout> | undefined
let pressed = false
function down() {
  pressed = false
  pressTimer = setTimeout(() => {
    pressed = true
    emit('longpress')
  }, 450)
}
function up() {
  clearTimeout(pressTimer)
}
function click() {
  if (pressed) return
  emit('open')
}
</script>

<template>
  <div
    class="tap flex items-center gap-3 px-4 py-2.5 active:bg-canvas"
    :class="selected ? 'bg-primary-soft' : ''"
    role="button"
    @pointerdown="down"
    @pointerup="up"
    @pointerleave="up"
    @pointercancel="up"
    @click="click"
  >
    <div class="relative">
      <Avatar :name="entry.name" :risk="entry.risk" :is-private="!entry.number" />
      <span v-if="selectable" class="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border-2 border-white" :class="selected ? 'bg-primary text-white' : 'bg-line text-transparent'">
        <AppIcon name="check" :size="12" />
      </span>
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <p class="truncate text-[15px] font-semibold" :class="entry.type === 'missed' ? 'text-missed' : entry.risk === 'scam' ? 'text-scam' : 'text-ink'">{{ title }}</p>
      </div>
      <div class="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
        <AppIcon :name="typeMeta.icon" :size="14" :class="typeMeta.cls" />
        <span class="truncate">{{ subtitle }}</span>
      </div>
      <p v-if="showNumber" class="truncate text-xs text-muted">{{ formatNumber(entry.number, settings.state.homeCountryDial) }}</p>
      <RiskBadge v-if="entry.risk !== 'safe'" class="mt-1" :risk="entry.risk" :category="entry.category" />
    </div>
    <div class="flex shrink-0 flex-col items-end gap-1">
      <button
        v-if="showCall && entry.number"
        type="button"
        class="tap grid size-9 place-items-center rounded-full bg-primary-soft text-primary-dark"
        aria-label="Gọi lại"
        @click.stop="emit('call')"
      >
        <AppIcon name="phone" :size="18" />
      </button>
    </div>
  </div>
</template>
