<script setup lang="ts">
import type { Contact } from '@/types'
import { useSettingsStore } from '@/stores/settings'
import { formatNumber } from '@/utils/numbers'
import Avatar from './Avatar.vue'
import AppIcon from './AppIcon.vue'

defineProps<{ contact: Contact; showFavorite?: boolean }>()
defineEmits<{ open: []; call: []; favorite: [] }>()
const settings = useSettingsStore()
</script>

<template>
  <div class="tap flex items-center gap-3 px-4 py-2.5 active:bg-canvas" role="button" @click="$emit('open')">
    <Avatar :name="contact.name" risk="safe" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-[15px] font-semibold">{{ contact.name }}</p>
      <p class="truncate text-[13px] text-muted">{{ formatNumber(contact.numbers[0] ?? '', settings.state.homeCountryDial) }}</p>
    </div>
    <button
      v-if="showFavorite"
      type="button"
      class="tap grid size-9 place-items-center rounded-full"
      :class="contact.favorite ? 'text-favorite' : 'text-line'"
      aria-label="Yêu thích"
      @click.stop="$emit('favorite')"
    >
      <AppIcon name="star" :size="20" :style="contact.favorite ? 'fill: currentColor' : ''" />
    </button>
    <button type="button" class="tap grid size-9 place-items-center rounded-full bg-primary-soft text-primary-dark" aria-label="Gọi" @click.stop="$emit('call')">
      <AppIcon name="phone" :size="18" />
    </button>
  </div>
</template>
