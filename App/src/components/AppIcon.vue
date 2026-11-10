<script setup lang="ts">
import { Icon } from '@iconify/vue'

/** Icon lucide đã được đóng gói sẵn (xem main.ts), không gọi mạng. `name` không cần tiền tố. */
defineProps<{ name: string; size?: number | string }>()
</script>

<template>
  <Icon :icon="`lucide:${name}`" :width="size ?? 22" :height="size ?? 22" aria-hidden="true" />
</template>
