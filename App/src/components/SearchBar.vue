<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(defineProps<{ placeholder?: string; autofocus?: boolean; inputmode?: 'text' | 'tel' | 'search' }>(), {
  placeholder: 'Tìm kiếm',
  inputmode: 'text',
})
const model = defineModel<string>({ default: '' })
defineEmits<{ submit: [] }>()
</script>

<template>
  <label class="search-field flex h-14 items-center gap-3 rounded-full border px-5">
    <AppIcon name="search" :size="18" class="text-muted" />
    <input
      v-model="model"
      :placeholder="placeholder"
      :autofocus="autofocus"
      :inputmode="inputmode"
      type="search"
      class="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
      @keydown.enter="$emit('submit')"
    />
    <button v-if="model" type="button" class="tap grid size-6 place-items-center rounded-full bg-line" aria-label="Xoá" @click="model = ''">
      <AppIcon name="x" :size="14" />
    </button>
    <slot name="right" />
  </label>
</template>
