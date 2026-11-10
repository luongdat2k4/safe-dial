<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="flex items-center px-4 pt-4 pb-1.5">
    <h3 class="flex-1 text-xs font-bold tracking-wide text-muted uppercase">{{ title }}</h3>
    <slot />
  </div>
</template>
