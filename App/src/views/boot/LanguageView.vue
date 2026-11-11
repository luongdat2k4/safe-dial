<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/BaseButton.vue'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { LOCALES, flagUrl, setLocale, type Locale } from '@/i18n'

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const ui = useUiStore()

const fromSettings = computed(() => route.query.from === 'settings')
const selected = ref<Locale>(settings.state.language)
let confirmed = false


/** Xem trước ngay: giao diện đổi theo ngôn ngữ vừa chọn. */
async function pick(code: Locale) {
  selected.value = code
  await setLocale(code)
}

function confirm() {
  confirmed = true
  settings.patch({ language: selected.value })
  if (fromSettings.value) {
    ui.showToast(t('boot.language.saved'), 'success')
    router.back()
  } else {
    router.push('/onboarding')
  }
}

// Rời màn mà không xác nhận → trả lại ngôn ngữ đang lưu.
onBeforeUnmount(() => {
  if (!confirmed && selected.value !== settings.state.language) void setLocale(settings.state.language)
})
</script>

<template>
  <div class="flex flex-col bg-canvas">
    <AppBar v-if="fromSettings" :title="t('boot.language.title')" back />
    <!-- Phần đầu cố định; chỉ danh sách ngôn ngữ cuộn. -->
    <div v-if="!fromSettings" class="pt-safe shrink-0 px-5 pt-12 pb-5">
      <span class="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
        <AppIcon name="languages" :size="28" />
      </span>
      <h1 class="mt-5 text-[30px] font-semibold tracking-tight">{{ t('boot.language.title') }}</h1>
    </div>
    <div v-else class="shrink-0 pt-3" />

    <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
      <div role="radiogroup" :aria-label="t('boot.language.title')" class="flex flex-col gap-3">
        <button
          v-for="o in LOCALES"
          :key="o.code"
          type="button"
          role="radio"
          :aria-checked="selected === o.code"
          :lang="o.code"
          class="tap flex min-h-16 items-center gap-3 rounded-card border-2 bg-surface px-4 py-3 text-start shadow-card"
          :class="selected === o.code ? 'border-primary/40 bg-primary-soft' : 'border-white'"
          @click="pick(o.code)"
        >
          <img :src="flagUrl(o.code)" alt="" width="32" height="32" class="size-8 shrink-0 rounded-full" loading="lazy" />
          <span class="min-w-0 flex-1">
            <span class="block text-base font-semibold">{{ o.native }}</span>
          </span>
          <span
            class="grid size-6 shrink-0 place-items-center rounded-full border-2"
            :class="selected === o.code ? 'border-primary bg-primary text-white' : 'border-line'"
          >
            <AppIcon v-if="selected === o.code" name="check" :size="14" />
          </span>
        </button>
      </div>
    </div>
    <div class="pb-safe shrink-0 px-4 pt-2 pb-4">
      <BaseButton block size="lg" @click="confirm">{{ t('boot.language.confirm') }}</BaseButton>
    </div>
  </div>
</template>
