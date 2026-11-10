<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import AppIcon from './AppIcon.vue'

const ui = useUiStore()
const meta = computed(
  () =>
    ({
      info: { icon: 'info', cls: 'bg-ink' },
      success: { icon: 'circle-check', cls: 'bg-primary-dark' },
      warning: { icon: 'triangle-alert', cls: 'bg-spam' },
      danger: { icon: 'circle-alert', cls: 'bg-scam' },
    })[ui.toast.kind],
)
</script>

<template>
  <Transition name="sheet">
    <div v-if="ui.toast.open" class="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center px-4 pt-safe">
      <div class="sheet-panel mt-3 flex max-w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-sheet" :class="meta.cls" role="status">
        <AppIcon :name="meta.icon" :size="18" />
        <span>{{ ui.toast.message }}</span>
      </div>
    </div>
  </Transition>
</template>
