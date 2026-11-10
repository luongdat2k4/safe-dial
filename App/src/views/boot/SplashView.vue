<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useSettingsStore } from '@/stores/settings'
import { t } from '@/composables/useT'

const router = useRouter()
const settings = useSettingsStore()
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  timer = setTimeout(() => {
    const s = settings.state
    if (!s.onboardingDone) router.replace('/language')
    else if (!s.permissionsDone) router.replace('/permissions')
    else router.replace('/home/calls')
  }, 1200)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="flex flex-col items-center justify-center bg-gradient-to-b from-primary to-primary-dark px-8 text-white">
    <div class="grid size-24 place-items-center rounded-[28px] bg-white/15 shadow-sheet ring-1 ring-white/30">
      <div class="grid size-16 place-items-center rounded-2xl bg-white text-primary-dark">
        <AppIcon name="shield-check" :size="38" />
      </div>
    </div>
    <h1 class="mt-6 text-3xl font-bold tracking-tight">{{ t('common.appName') }}</h1>
    <p class="mt-2 text-center text-[15px] text-white/80">{{ t('common.tagline') }}</p>
    <div class="mt-10 size-7 animate-spin rounded-full border-[3px] border-white/30 border-t-white" role="status" aria-label="Đang tải" />
  </div>
</template>
