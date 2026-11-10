<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

withDefaults(defineProps<{ icon: string; label: string; value: string | number; sub?: string; tone?: 'brand' | 'blue' | 'danger' | 'violet' | 'warn' }>(), {
  tone: 'brand',
})
const tones = {
  brand: 'bg-primary-soft text-primary-dark',
  blue: 'bg-[#e7f0fd] text-outgoing',
  danger: 'bg-scam-soft text-scam',
  violet: 'bg-[#efe8fd] text-blocked',
  warn: 'bg-spam-soft text-spam',
}
</script>

<template>
  <div class="rounded-card bg-surface p-3.5 shadow-card">
    <span class="grid size-9 place-items-center rounded-xl" :class="tones[tone]"><AppIcon :name="icon" :size="18" /></span>
    <p class="mt-2 text-2xl leading-none font-bold">{{ value }}</p>
    <p class="mt-1 text-[13px] text-muted">{{ label }}</p>
    <p v-if="sub" class="mt-0.5 text-xs text-muted">{{ sub }}</p>
  </div>
</template>
