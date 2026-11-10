<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/BaseButton.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'

const open = defineModel<boolean>({ default: false })
const ui = useUiStore()
const stars = ref(0)

watch(open, (v) => {
  if (v) stars.value = 0
})

function send() {
  ui.showToast(t('settings.rate.thanks', { n: stars.value }), 'success')
  open.value = false
}
</script>

<template>
  <BottomSheet v-model="open" :title="t('settings.rate.title')">
    <p class="text-sm text-muted">{{ t('settings.rate.text') }}</p>
    <div class="mt-4 flex justify-center gap-1" role="radiogroup" :aria-label="t('settings.rate.title')">
      <button
        v-for="n in 5"
        :key="n"
        type="button"
        role="radio"
        :aria-checked="stars === n"
        :aria-label="t('settings.rate.star', { n })"
        class="tap grid size-12 place-items-center rounded-full"
        :class="n <= stars ? 'text-favorite' : 'text-line'"
        @click="stars = n"
      >
        <AppIcon name="star" :size="34" :class="n <= stars ? 'fill-current' : ''" />
      </button>
    </div>
    <p class="mt-1 h-5 text-center text-sm font-medium text-primary-dark">
      {{ stars ? t(`settings.rate.labels.${stars - 1}`) : '' }}
    </p>
    <BaseButton block class="mt-4" :disabled="!stars" @click="send">{{ t('settings.rate.send') }}</BaseButton>
  </BottomSheet>
</template>
