<script setup lang="ts">
import AppIcon from './AppIcon.vue'

/**
 * Bottom sheet dựng trong `#overlay-root` (nằm trong khung điện thoại), nên không tràn ra
 * ngoài khi xem trên desktop. Dùng `v-model` để đóng/mở.
 */
withDefaults(defineProps<{ title?: string; closable?: boolean; tall?: boolean }>(), { closable: true })
const open = defineModel<boolean>({ default: false })
</script>

<template>
  <Teleport to="#overlay-root" defer>
    <Transition name="sheet">
      <div v-if="open" class="absolute inset-0 z-40 flex items-end bg-black/45" @click.self="closable && (open = false)">
        <div
          class="sheet-panel pb-safe w-full rounded-t-3xl bg-surface shadow-sheet"
          :class="tall ? 'max-h-[88%]' : 'max-h-[80%]'"
          style="display: flex; flex-direction: column"
          role="dialog"
          aria-modal="true"
        >
          <div class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
          <div v-if="title || closable" class="flex shrink-0 items-center gap-2 px-5 pt-3 pb-1">
            <h2 class="flex-1 text-lg font-bold">{{ title }}</h2>
            <button v-if="closable" class="tap grid size-8 place-items-center rounded-full bg-canvas" aria-label="Đóng" @click="open = false">
              <AppIcon name="x" :size="18" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-5"><slot /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
