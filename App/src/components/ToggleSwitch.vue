<script setup lang="ts">
defineProps<{ label?: string; disabled?: boolean }>()
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    :disabled="disabled"
    class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-40"
    :class="model ? 'accent-gradient' : 'bg-[#e5e0ee]'"
    @click.stop="model = !model"
  >
    <span
      class="absolute left-0.5 size-6 rounded-full bg-white shadow transition-transform"
      :class="model ? 'translate-x-5' : 'translate-x-0'"
    />
  </button>
</template>
