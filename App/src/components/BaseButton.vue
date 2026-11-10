<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    icon?: string
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md' },
)

const variants = {
  primary: 'bg-primary text-white shadow-card',
  secondary: 'bg-primary-soft text-primary-dark',
  danger: 'bg-scam text-white shadow-card',
  ghost: 'bg-transparent text-ink border border-line',
  dark: 'bg-ink text-white',
}
const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5 text-[15px]', lg: 'h-13 px-6 text-base' }
</script>

<template>
  <button
    class="tap inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:pointer-events-none disabled:opacity-45"
    :class="[variants[variant], sizes[size], block ? 'w-full' : '']"
    :disabled="disabled"
    type="button"
  >
    <AppIcon v-if="icon" :name="icon" :size="size === 'sm' ? 16 : 20" />
    <slot />
  </button>
</template>
