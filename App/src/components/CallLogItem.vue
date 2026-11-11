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
  const label = e.type === 'blocked' && e.blockedReason
    ? t('common.blockReason.' + e.blockedReason)
    : t('common.callType.' + e.type)
  return e.simSlot ? label + ' · SIM ' + e.simSlot : label
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
  <div class="tap flex items-center gap-3 px-4 py-4 active:bg-primary-soft/40"
    :class="selected ? 'bg-primary-soft' : ''" role="button" tabindex="0"
    @pointerdown="down" @pointerup="up" @pointerleave="up" @pointercancel="up" @click="click"
    @keydown.enter.self="click" @keydown.space.prevent.self="click">
    <div class="relative">
      <Avatar :name="entry.name" :risk="entry.risk" :is-private="!entry.number" :size="48" />
      <span v-if="selectable" class="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border-2 border-white" :class="selected ? 'bg-primary text-white' : 'bg-line text-transparent'">
        <AppIcon name="check" :size="12" />
      </span>
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[15px] font-semibold tracking-[-.2px]" :class="entry.risk === 'scam' ? 'text-scam' : 'text-ink'">{{ title }}</p>
      <p v-if="showNumber" class="mt-0.5 truncate text-xs text-muted">{{ formatNumber(entry.number, settings.state.homeCountryDial) }}</p>
      <div class="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
        <span class="grid size-5 shrink-0 place-items-center rounded-full" :class="typeMeta.cls" :style="{ background: 'color-mix(in srgb, currentColor 9%, transparent)' }"><AppIcon :name="typeMeta.icon" :size="11" /></span>
        <span class="truncate">{{ subtitle }}</span>
      </div>
      <RiskBadge v-if="entry.risk !== 'safe'" class="mt-1" :risk="entry.risk" :category="entry.category" />
    </div>
    <div class="flex shrink-0 flex-col items-end gap-1.5">
      <span class="text-[11px] text-muted tabular-nums">{{ formatTime(entry.startedAt) }}</span>
      <span v-if="entry.durationSec > 0" class="text-[10px] text-muted tabular-nums">{{ formatDuration(entry.durationSec) }}</span>
      <button v-if="showCall && entry.number" type="button" class="tap grid size-8 place-items-center rounded-full text-primary hover:bg-primary-soft"
        :aria-label="t('home.calls.actions.call')" @click.stop="emit('call')" @pointerdown.stop @keydown.stop>
        <AppIcon name="phone" :size="16" />
      </button>
    </div>
  </div>
</template>
