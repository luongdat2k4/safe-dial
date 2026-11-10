<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import ToastHost from '@/components/ToastHost.vue'
import ConfirmHost from '@/components/ConfirmHost.vue'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
let handle: PluginListenerHandle | undefined

const ROOT_TABS = ['/home/calls', '/home/contacts', '/home/block', '/home/stats']

/**
 * Nút Back của Android: ở tab khác thì về tab Cuộc gọi, ở tab Cuộc gọi hỏi thoát,
 * màn con thì lùi lại (chỉ chạy khi chạy native; trên web trình duyệt tự xử lý).
 */
async function onBack() {
  const path = route.path
  if (path === '/home/calls') {
    const ok = await ui.confirm({
      title: 'Thoát Safe Dial?',
      message: 'Bạn có chắc muốn đóng ứng dụng không?',
      confirmText: 'Thoát',
      cancelText: 'Ở lại',
      icon: 'log-out',
    })
    if (ok) await CapApp.exitApp()
  } else if (ROOT_TABS.includes(path)) {
    router.replace('/home/calls')
  } else if (route.meta.noBack) {
    return
  } else if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/home/calls')
  }
}

onMounted(async () => {
  if (Capacitor.isNativePlatform()) handle = await CapApp.addListener('backButton', onBack)
})
onBeforeUnmount(() => handle?.remove())
</script>

<template>
  <!-- Khung điện thoại: trên desktop giới hạn 480px, trên máy thật chiếm toàn màn hình. -->
  <div class="flex h-full justify-center">
    <div class="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-canvas shadow-2xl">
      <!-- Phải nằm TRƯỚC RouterView và các host dùng Teleport để target đã tồn tại khi chúng mount. -->
      <div id="overlay-root" class="pointer-events-none absolute inset-0 z-30 [&>*]:pointer-events-auto" />
      <RouterView v-slot="{ Component, route: r }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="r.meta.layoutKey ?? r.path" class="min-h-0 flex-1" />
        </Transition>
      </RouterView>
      <ToastHost />
      <ConfirmHost />
    </div>
  </div>
</template>
