<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '@/composables/useT'
import BottomSheet from '@/components/BottomSheet.vue'
import BaseButton from '@/components/BaseButton.vue'

const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ submit: [name: string] }>()
const name = ref('')
watch(open, (v) => v && (name.value = ''))

function submit() {
  const n = name.value.trim()
  if (n) emit('submit', n)
}
</script>

<template>
  <BottomSheet v-model="open" :title="t('call.after.suggestTitle')">
    <p class="mb-3 text-sm text-muted">{{ t('call.after.suggestDesc') }}</p>
    <input
      v-model="name"
      maxlength="40"
      :placeholder="t('call.after.suggestPlaceholder')"
      class="h-12 w-full rounded-xl border border-line bg-canvas px-4 text-[15px] outline-none focus:border-primary"
      @keydown.enter="submit"
    />
    <BaseButton block class="mt-4" :disabled="!name.trim()" @click="submit">{{ t('call.after.suggestSend') }}</BaseButton>
  </BottomSheet>
</template>
