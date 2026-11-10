<script setup lang="ts">
import { ref } from 'vue'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { t } from '@/composables/useT'

const APP_VERSION = '0.1.0'

// Mục đang mở của accordion: 0..2 là câu hỏi quyền riêng tư, 'terms' là điều khoản.
const openItem = ref<number | 'terms' | null>(0)
const toggle = (k: number | 'terms') => (openItem.value = openItem.value === k ? null : k)
</script>

<template>
  <div class="flex flex-col bg-canvas">
    <AppBar :title="t('settings.about.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto pb-8">
      <div class="flex flex-col items-center px-6 pt-8 pb-4 text-center">
        <div class="grid size-20 place-items-center rounded-[24px] bg-gradient-to-b from-primary to-primary-dark text-white shadow-card">
          <AppIcon name="shield-check" :size="40" />
        </div>
        <h2 class="mt-4 text-xl font-bold">{{ t('common.appName') }}</h2>
        <p class="text-sm text-muted">{{ t('settings.about.version', { v: APP_VERSION }) }}</p>
        <p class="mt-1 text-[13px] text-muted">{{ t('common.tagline') }}</p>
      </div>

      <div class="mx-4 flex gap-3 rounded-card bg-spam-soft p-4">
        <AppIcon name="flask-conical" :size="20" class="mt-0.5 shrink-0 text-spam" />
        <p class="text-[13px] leading-snug text-ink/85">{{ t('settings.about.demo') }}</p>
      </div>

      <SectionHeader :title="t('settings.about.privacy')" />
      <div class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <div v-for="i in 3" :key="i">
          <button
            type="button"
            class="tap flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left"
            :aria-expanded="openItem === i - 1"
            @click="toggle(i - 1)"
          >
            <span class="flex-1 text-[15px] font-medium">{{ t(`settings.about.privacyItems.${i - 1}.q`) }}</span>
            <AppIcon name="chevron-down" :size="18" class="text-muted transition-transform" :class="openItem === i - 1 ? 'rotate-180' : ''" />
          </button>
          <p v-if="openItem === i - 1" class="px-4 pb-3 text-[13px] leading-relaxed text-muted">{{ t(`settings.about.privacyItems.${i - 1}.a`) }}</p>
        </div>
      </div>

      <SectionHeader :title="t('settings.about.terms')" />
      <div class="mx-4 overflow-hidden rounded-card bg-surface shadow-card">
        <button
          type="button"
          class="tap flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left"
          :aria-expanded="openItem === 'terms'"
          @click="toggle('terms')"
        >
          <span class="flex-1 text-[15px] font-medium">{{ t('settings.about.terms') }}</span>
          <AppIcon name="chevron-down" :size="18" class="text-muted transition-transform" :class="openItem === 'terms' ? 'rotate-180' : ''" />
        </button>
        <p v-if="openItem === 'terms'" class="px-4 pb-3 text-[13px] leading-relaxed text-muted">{{ t('settings.about.termsText') }}</p>
      </div>

      <SectionHeader :title="t('settings.about.libs')" />
      <ul class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <li v-for="i in 7" :key="i" class="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
          <span class="text-[15px] font-medium">{{ t(`settings.about.libList.${i - 1}.name`) }}</span>
          <span class="text-[13px] text-muted">{{ t(`settings.about.libList.${i - 1}.note`) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
