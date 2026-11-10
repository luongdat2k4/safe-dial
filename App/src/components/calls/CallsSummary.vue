<script setup lang="ts">
import { t } from '@/composables/useT'
import AppIcon from '@/components/AppIcon.vue'

defineProps<{ suspicious: number; blocked: number }>()
defineEmits<{ showBlocked: [] }>()
</script>

<template>
  <section class="mx-4 mt-1 mb-2 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card">
    <span class="grid size-11 shrink-0 place-items-center rounded-xl" :class="suspicious ? 'bg-spam-soft text-spam' : 'bg-primary-soft text-primary-dark'">
      <AppIcon :name="suspicious ? 'shield-alert' : 'shield-check'" :size="24" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-xs font-semibold tracking-wide text-muted uppercase">{{ t('home.calls.summary.title') }}</p>
      <p v-if="suspicious" class="text-[15px] font-semibold">
        <span class="text-spam">{{ suspicious }}</span> {{ t('home.calls.summary.suspicious') }}
      </p>
      <p v-else class="text-[15px] font-semibold text-primary-dark">{{ t('home.calls.summary.clean') }}</p>
    </div>
    <button
      type="button"
      class="tap flex shrink-0 flex-col items-center rounded-xl bg-[#efe8fd] px-3 py-1.5 text-blocked"
      :aria-label="t('home.calls.summary.viewBlocked')"
      @click="$emit('showBlocked')"
    >
      <span class="text-lg leading-tight font-bold">{{ blocked }}</span>
      <span class="text-[11px] font-semibold">{{ t('home.calls.summary.blocked') }}</span>
    </button>
  </section>
</template>
