<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BrandOrb from '@/components/BrandOrb.vue'
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
  <div class="flex flex-col items-center justify-center px-8 text-ink">
    <BrandOrb />
    <h1 class="mt-6 text-3xl font-bold tracking-tight">{{ t('common.appName') }}</h1>
    <p class="mt-2 text-center text-[15px] text-muted">{{ t('common.tagline') }}</p>
    <div class="mt-10 size-7 animate-spin rounded-full border-[3px] border-primary/10 border-t-primary" role="status" aria-label="Đang tải" />
  </div>
</template>
