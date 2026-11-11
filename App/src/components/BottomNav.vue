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
  <nav class="bottom-navigation pb-safe absolute right-3 bottom-3 left-3 z-20" aria-label="Điều hướng chính">
    <ul class="nav-surface flex items-center rounded-[28px] px-2 py-2">
      <li v-for="it in ITEMS" :key="it.to" class="min-w-0 flex-1">
        <button type="button" class="tap flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 text-muted"
          :class="{ 'nav-active': route.path === it.to }"
          :aria-current="route.path === it.to ? 'page' : undefined" @click="router.replace(it.to)">
          <span class="nav-icon"><AppIcon :name="it.icon" :size="20" /></span>
          <span class="max-w-full truncate text-[11px] font-medium">{{ t(it.label) }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
