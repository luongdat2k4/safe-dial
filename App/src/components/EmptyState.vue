<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ icon: string; title: string; description?: string }>()
</script>

<template>
  <div class="flex flex-col items-center px-8 py-14 text-center">
    <span class="mb-4 grid size-20 place-items-center rounded-full bg-primary-soft text-primary-dark">
      <AppIcon :name="icon" :size="38" />
    </span>
    <h3 class="text-base font-semibold">{{ title }}</h3>
    <p v-if="description" class="mt-1.5 max-w-64 text-sm leading-relaxed text-muted">{{ description }}</p>
    <div class="mt-5"><slot /></div>
  </div>
</template>
