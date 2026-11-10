<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import BottomSheet from './BottomSheet.vue'
import BaseButton from './BaseButton.vue'
import AppIcon from './AppIcon.vue'

const ui = useUiStore()
const open = computed({
  get: () => ui.confirmState.open,
  set: (v) => {
    if (!v) ui.answerConfirm(false)
  },
})
</script>

<template>
  <BottomSheet v-model="open" :closable="false">
    <div class="flex flex-col items-center pt-3 text-center">
      <span
        class="mb-3 grid size-14 place-items-center rounded-full"
        :class="ui.confirmState.danger ? 'bg-scam-soft text-scam' : 'bg-primary-soft text-primary-dark'"
      >
        <AppIcon :name="ui.confirmState.icon ?? (ui.confirmState.danger ? 'triangle-alert' : 'circle-help')" :size="28" />
      </span>
      <h3 class="text-lg font-bold">{{ ui.confirmState.title }}</h3>
      <p v-if="ui.confirmState.message" class="mt-1.5 text-sm leading-relaxed text-muted">{{ ui.confirmState.message }}</p>
    </div>
    <div class="mt-6 flex gap-3">
      <BaseButton variant="ghost" class="flex-1" @click="ui.answerConfirm(false)">{{ ui.confirmState.cancelText ?? 'Huỷ' }}</BaseButton>
      <BaseButton :variant="ui.confirmState.danger ? 'danger' : 'primary'" class="flex-1" @click="ui.answerConfirm(true)">
        {{ ui.confirmState.confirmText ?? 'Đồng ý' }}
      </BaseButton>
    </div>
  </BottomSheet>
</template>
