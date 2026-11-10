<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/BaseButton.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'

const router = useRouter()
const ui = useUiStore()

const easy = ref<boolean | null>(null)
const features = ref<number[]>([])
const message = ref('')
const featureCount = 6

const canSubmit = computed(() => message.value.trim().length > 0)

function toggle(i: number) {
  features.value = features.value.includes(i) ? features.value.filter((x) => x !== i) : [...features.value, i]
}

function submit() {
  if (!canSubmit.value) return
  ui.showToast(t('settings.feedback.thanks'), 'success')
  router.back()
}
</script>

<template>
  <div class="flex flex-col bg-canvas">
    <AppBar :title="t('settings.feedback.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto pb-6">
      <SectionHeader :title="t('settings.feedback.easy')" />
      <div role="radiogroup" :aria-label="t('settings.feedback.easy')" class="mx-4 grid grid-cols-2 gap-3">
        <button
          v-for="v in [true, false]"
          :key="String(v)"
          type="button"
          role="radio"
          :aria-checked="easy === v"
          class="tap flex min-h-12 items-center justify-center gap-2 rounded-card border-2 bg-surface font-semibold shadow-card"
          :class="easy === v ? 'border-primary bg-primary-soft text-primary-dark' : 'border-transparent'"
          @click="easy = v"
        >
          <AppIcon :name="v ? 'thumbs-up' : 'thumbs-down'" :size="20" />
          {{ v ? t('settings.feedback.yes') : t('settings.feedback.no') }}
        </button>
      </div>

      <SectionHeader :title="t('settings.feedback.features')" />
      <div class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <button
          v-for="i in featureCount"
          :key="i"
          type="button"
          role="checkbox"
          :aria-checked="features.includes(i - 1)"
          class="tap flex min-h-12 w-full items-center gap-3 px-4 text-left"
          @click="toggle(i - 1)"
        >
          <span
            class="grid size-6 shrink-0 place-items-center rounded-md border-2"
            :class="features.includes(i - 1) ? 'border-primary bg-primary text-white' : 'border-line'"
          >
            <AppIcon v-if="features.includes(i - 1)" name="check" :size="14" />
          </span>
          <span class="text-[15px]">{{ t(`settings.feedback.featureList.${i - 1}`) }}</span>
        </button>
      </div>

      <SectionHeader :title="t('settings.feedback.message')" />
      <div class="mx-4">
        <textarea
          v-model="message"
          rows="5"
          maxlength="500"
          :aria-label="t('settings.feedback.message')"
          :placeholder="t('settings.feedback.placeholder')"
          class="w-full resize-none rounded-card border border-line bg-surface p-3 text-[15px] shadow-card outline-none focus:border-primary"
        />
        <p class="mt-1 text-right text-xs text-muted">{{ t('settings.feedback.counter', { n: message.length }) }}</p>
      </div>
    </div>
    <div class="pb-safe shrink-0 border-t border-line bg-surface px-4 pt-3 pb-3">
      <BaseButton block size="lg" :disabled="!canSubmit" @click="submit">{{ t('settings.feedback.submit') }}</BaseButton>
    </div>
  </div>
</template>
