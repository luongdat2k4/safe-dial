<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    /** Hiện nút quay lại. */
    back?: boolean
    /** Nền xanh thương hiệu (chữ trắng) hoặc nền sáng. */
    tone?: 'light' | 'brand' | 'transparent'
  }>(),
  { tone: 'light' },
)
const emit = defineEmits<{ back: [] }>()
const router = useRouter()

function goBack() {
  emit('back')
  if (!props.back) return
  if (window.history.length > 1) router.back()
  else router.replace('/home/calls')
}

const toneClass = {
  light: 'bg-surface text-ink border-b border-line',
  brand: 'bg-primary-dark text-white',
  transparent: 'bg-transparent text-white',
}
</script>

<template>
  <header class="pt-safe shrink-0" :class="toneClass[tone]">
    <div class="flex h-14 items-center gap-1 px-2">
      <button v-if="back" class="tap grid size-10 place-items-center rounded-full" aria-label="Quay lại" @click="goBack">
        <AppIcon name="arrow-left" :size="22" />
      </button>
      <div class="min-w-0 flex-1" :class="back ? '' : 'pl-3'">
        <h1 class="truncate text-[17px] font-semibold leading-tight">{{ title }}</h1>
        <p v-if="subtitle" class="truncate text-xs opacity-70">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-1"><slot name="right" /></div>
    </div>
    <slot />
  </header>
</template>
