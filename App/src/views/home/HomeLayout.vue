<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { t } from '@/composables/useT'
import AppIcon from '@/components/AppIcon.vue'
import BottomNav from '@/components/BottomNav.vue'
import FabButton from '@/components/FabButton.vue'

const route = useRoute()
const router = useRouter()
const showFab = computed(() => route.path === '/home/calls' || route.path === '/home/contacts')
</script>

<template>
  <div class="relative flex h-full flex-col">
    <header class="pt-safe shrink-0 bg-primary-dark text-white">
      <div class="flex h-14 items-center gap-2 px-4">
        <span class="grid size-8 place-items-center rounded-lg bg-white/15"><AppIcon name="shield-check" :size="20" /></span>
        <h1 class="flex-1 text-lg font-bold tracking-tight">{{ t('common.appName') }}</h1>
        <button class="tap grid size-10 place-items-center rounded-full" aria-label="Tìm số" @click="router.push('/search')">
          <AppIcon name="search" :size="22" />
        </button>
        <button class="tap grid size-10 place-items-center rounded-full" aria-label="Cài đặt" @click="router.push('/settings')">
          <AppIcon name="settings" :size="22" />
        </button>
      </div>
    </header>

    <main class="relative min-h-0 flex-1 overflow-y-auto">
      <RouterView v-slot="{ Component }">
        <component :is="Component" />
      </RouterView>
    </main>
    <FabButton v-if="showFab" icon="grid-3x3" label="Bàn phím" class="!bottom-20" @click="router.push('/dialpad')" />
    <BottomNav />
  </div>
</template>
