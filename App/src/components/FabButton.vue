<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ icon: string; label: string }>()
</script>

<template>
  <button
    type="button"
    class="tap absolute right-4 bottom-4 z-10 grid size-14 place-items-center rounded-full bg-primary text-white shadow-sheet"
    :aria-label="label"
  >
    <AppIcon :name="icon" :size="26" />
  </button>
</template>
