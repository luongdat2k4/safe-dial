<script setup lang="ts">
import { computed } from 'vue'
import type { RiskLevel } from '@/types'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{ name?: string; risk?: RiskLevel; size?: number; isPrivate?: boolean }>(),
  { size: 44 },
)

const PALETTE = ['#0e9f6e', '#2f80ed', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#4f46e5', '#65a30d']

const initial = computed(() => {
  const n = (props.name ?? '').trim()
  if (!n) return ''
  const parts = n.split(/\s+/)
  const last = parts[parts.length - 1] ?? ''
  return (last[0] ?? '').toUpperCase()
})

const bg = computed(() => {
  if (props.risk === 'scam') return 'var(--color-scam-soft)'
  if (props.risk === 'spam') return 'var(--color-spam-soft)'
  if (!props.name) return 'var(--color-unknown-soft)'
  let h = 0
  for (const ch of props.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
})

const fg = computed(() => {
  if (props.risk === 'scam') return 'var(--color-scam)'
  if (props.risk === 'spam') return 'var(--color-spam)'
  if (!props.name) return 'var(--color-unknown)'
  return '#fff'
})

const icon = computed(() => {
  if (props.isPrivate) return 'eye-off'
  if (props.risk === 'scam') return 'shield-alert'
  if (props.risk === 'spam') return 'shield-x'
  return 'user-round'
})
</script>

<template>
  <div
    class="grid shrink-0 place-items-center rounded-full font-semibold select-none"
    :style="{ width: `${size}px`, height: `${size}px`, background: bg, color: fg, fontSize: `${size * 0.4}px` }"
  >
    <template v-if="initial && risk !== 'scam' && risk !== 'spam'">{{ initial }}</template>
    <AppIcon v-else :name="icon" :size="size * 0.5" />
  </div>
</template>
