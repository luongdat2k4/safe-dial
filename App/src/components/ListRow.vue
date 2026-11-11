<script setup lang="ts">
import AppIcon from './AppIcon.vue'

/** Dòng danh sách chung: icon/leading, tiêu đề, phụ đề, slot bên phải. */
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    icon?: string
    iconTone?: 'brand' | 'danger' | 'warn' | 'blue' | 'violet' | 'gray'
    chevron?: boolean
    clickable?: boolean
    danger?: boolean
  }>(),
  { iconTone: 'brand' },
)

const tones = {
  brand: 'bg-primary-soft text-primary-dark',
  danger: 'bg-scam-soft text-scam',
  warn: 'bg-spam-soft text-spam',
  blue: 'bg-primary-soft text-outgoing',
  violet: 'bg-primary-soft text-blocked',
  gray: 'bg-unknown-soft text-unknown',
}
</script>

<template>
  <div
    class="flex min-h-14 items-center gap-3 px-4 py-4"
    :class="clickable || chevron ? 'tap cursor-pointer active:bg-canvas' : ''"
    :role="clickable || chevron ? 'button' : undefined"
  >
    <slot name="leading">
      <span v-if="icon" class="grid size-10 shrink-0 place-items-center rounded-full" :class="tones[iconTone]">
        <AppIcon :name="icon" :size="20" />
      </span>
    </slot>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[15px] font-medium" :class="danger ? 'text-scam' : 'text-ink'">{{ title }}</p>
      <p v-if="subtitle" class="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">{{ subtitle }}</p>
    </div>
    <slot name="right" />
    <AppIcon v-if="chevron" name="chevron-right" :size="18" class="shrink-0 text-muted" />
  </div>
</template>
