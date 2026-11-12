<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BrandOrb from '@/components/BrandOrb.vue'
import { useSettingsStore } from '@/stores/settings'
import { SafeDial, isNative } from '@/services'
import { t } from '@/composables/useT'
import { tryAppOpenOnLaunch } from '@/features/ads/adRuntime'

const router = useRouter()
const settings = useSettingsStore()
let timer: ReturnType<typeof setTimeout> | undefined
// Huỷ quảng cáo mở app khi splash bị thay (cuộc gọi đến, tel: của app khác mở thẳng màn khác).
const controller = new AbortController()

onMounted(async () => {
  const s = settings.state
  // Quảng cáo lúc mở app chỉ trên đường vào Trang chủ; lần đầu (chọn ngôn ngữ, cấp quyền) không có.
  const toHome = s.onboardingDone && s.permissionsDone
  const delay = new Promise<void>((resolve) => { timer = setTimeout(resolve, 1200) })
  await Promise.all([delay, toHome ? tryAppOpenOnLaunch(controller.signal) : undefined])
  if (controller.signal.aborted) return
  if (!s.onboardingDone) router.replace('/language')
  else if (!s.permissionsDone || !(await hasRequired())) router.replace('/permissions')
  else router.replace('/home/calls')
})
onBeforeUnmount(() => {
  controller.abort()
  clearTimeout(timer)
})

/** Điều kiện để dùng app trên máy thật: có quyền danh bạ và là ứng dụng gọi điện mặc định. */
async function hasRequired(): Promise<boolean> {
  if (!isNative) return true
  const st = await SafeDial.getStatus().catch(() => null)
  return !st || (st.dialerRole && st.contacts === 'granted')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center px-8 text-ink">
    <BrandOrb logo />
    <h1 class="mt-6 text-3xl font-bold tracking-tight">{{ t('common.appName') }}</h1>
    <p class="mt-2 text-center text-[15px] text-muted">{{ t('common.tagline') }}</p>
    <div class="mt-10 size-7 animate-spin rounded-full border-[3px] border-primary/10 border-t-primary" role="status" aria-label="Đang tải" />
  </div>
</template>
