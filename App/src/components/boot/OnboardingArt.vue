<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { t } from '@/composables/useT'

/** Hình minh hoạ onboarding dựng từ icon lucide và các khối CSS (không dùng ảnh). */
defineProps<{ kind: 0 | 1 | 2 }>()
</script>

<template>
  <div class="relative mx-auto grid size-64 place-items-center" aria-hidden="true">
    <div class="absolute inset-0 rounded-full bg-primary-soft" />
    <div class="absolute inset-8 rounded-full bg-white/70" />

    <!-- 1: nhận diện số lạ -->
    <template v-if="kind === 0">
      <div class="relative w-40 rounded-3xl bg-surface p-4 shadow-sheet">
        <div class="mx-auto grid size-16 place-items-center rounded-full bg-unknown-soft text-unknown">
          <AppIcon name="user-round-search" :size="34" />
        </div>
        <div class="mx-auto mt-3 h-2.5 w-24 rounded-full bg-line" />
        <div class="mx-auto mt-2 h-2 w-16 rounded-full bg-line" />
        <div class="mt-3 flex justify-center">
          <span class="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-dark">{{ t('common.risk.unknown') }}</span>
        </div>
      </div>
      <span class="absolute top-6 right-6 grid size-11 place-items-center rounded-full bg-primary text-white shadow-card">
        <AppIcon name="phone-incoming" :size="22" />
      </span>
    </template>

    <!-- 2: cảnh báo lừa đảo -->
    <template v-else-if="kind === 1">
      <div class="relative w-44 overflow-hidden rounded-3xl bg-surface shadow-sheet">
        <div class="flex items-center gap-2 bg-scam px-3 py-2.5 text-white">
          <AppIcon name="triangle-alert" :size="20" class="warn-blink" />
          <span class="text-sm font-bold">{{ t('common.risk.scam') }}</span>
        </div>
        <div class="p-3">
          <div class="h-2.5 w-28 rounded-full bg-line" />
          <div class="mt-2 h-2 w-20 rounded-full bg-line" />
          <div class="mt-3 inline-flex items-center gap-1 rounded-full bg-scam-soft px-2.5 py-1 text-xs font-semibold text-scam">
            <AppIcon name="shield-alert" :size="14" /> {{ t('common.risk.scam') }}
          </div>
        </div>
      </div>
      <span class="ring-pulse absolute bottom-8 left-6 grid size-11 place-items-center rounded-full bg-primary text-white shadow-card">
        <AppIcon name="radio" :size="22" />
      </span>
    </template>

    <!-- 3: chặn + thống kê -->
    <template v-else>
      <div class="relative flex w-44 flex-col gap-3 rounded-3xl bg-surface p-4 shadow-sheet">
        <div class="flex items-center gap-2">
          <span class="grid size-9 place-items-center rounded-xl bg-[#efe8fd] text-blocked"><AppIcon name="ban" :size="20" /></span>
          <div class="h-2.5 flex-1 rounded-full bg-line" />
        </div>
        <div class="flex h-16 items-end gap-2">
          <div class="h-6 flex-1 rounded-t-md bg-primary/40" />
          <div class="h-12 flex-1 rounded-t-md bg-primary" />
          <div class="h-9 flex-1 rounded-t-md bg-primary/60" />
          <div class="h-14 flex-1 rounded-t-md bg-primary-dark" />
        </div>
      </div>
      <span class="absolute top-7 left-6 grid size-11 place-items-center rounded-full bg-spam text-white shadow-card">
        <AppIcon name="phone-off" :size="22" />
      </span>
    </template>
  </div>
</template>
