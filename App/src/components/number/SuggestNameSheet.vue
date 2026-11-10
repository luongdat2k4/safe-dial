<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '@/composables/useT'
import { useLookupStore } from '@/stores/lookup'
import { useUiStore } from '@/stores/ui'
import BottomSheet from '@/components/BottomSheet.vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{ number: string }>()
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ done: [] }>()
const lookup = useLookupStore()
const ui = useUiStore()
const name = ref('')
const sending = ref(false)

watch(open, (v) => {
  if (v) name.value = ''
})

async function submit() {
  const v = name.value.trim()
  if (!v || sending.value) return
  sending.value = true
  try {
    await lookup.suggestName(props.number, v)
    open.value = false
    emit('done')
    ui.showToast(t('number.community.suggestDone'), 'success')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <BottomSheet v-model="open" :title="t('number.community.suggestTitle')">
    <input
      v-model="name"
      type="text"
      maxlength="40"
      :placeholder="t('number.community.suggestPlaceholder')"
      class="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[15px] outline-none focus:border-primary"
      @keydown.enter="submit"
    />
    <BaseButton class="mt-4" block :disabled="!name.trim() || sending" @click="submit">{{ t('number.community.suggestSend') }}</BaseButton>
  </BottomSheet>
</template>
