<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { t } from '@/composables/useT'
import AppIcon from './AppIcon.vue'

const route = useRoute()
const router = useRouter()

const ITEMS = [
  { to: '/home/calls', icon: 'phone', label: 'common.nav.calls' },
  { to: '/home/contacts', icon: 'users', label: 'common.nav.contacts' },
  { to: '/home/block', icon: 'shield-ban', label: 'common.nav.block' },
  { to: '/home/stats', icon: 'chart-no-axes-combined', label: 'common.nav.stats' },
]
</script>

<template>
  <nav class="pb-safe shrink-0 border-t border-line bg-surface" aria-label="Điều hướng chính">
    <ul class="flex">
      <li v-for="it in ITEMS" :key="it.to" class="flex-1">
        <button
          type="button"
          class="tap flex w-full flex-col items-center gap-0.5 pt-2 pb-1.5"
          :class="route.path === it.to ? 'text-primary-dark' : 'text-muted'"
          :aria-current="route.path === it.to ? 'page' : undefined"
          @click="router.replace(it.to)"
        >
          <span class="grid h-7 w-14 place-items-center rounded-full transition-colors" :class="route.path === it.to ? 'bg-primary-soft' : ''">
            <AppIcon :name="it.icon" :size="22" />
          </span>
          <span class="text-[11px] font-semibold">{{ t(it.label) }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
