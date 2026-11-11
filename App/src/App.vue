<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import ToastHost from '@/components/ToastHost.vue'
import ConfirmHost from '@/components/ConfirmHost.vue'
import { useUiStore } from '@/stores/ui'
import { useCallSessionStore } from '@/stores/callSession'
import { useCallsStore } from '@/stores/calls'
import { useContactsStore } from '@/stores/contacts'
import { useBlockStore } from '@/stores/block'
import { SafeDial, type LaunchInfo } from '@/services'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const session = useCallSessionStore()
const calls = useCallsStore()
const contacts = useContactsStore()
const block = useBlockStore()
const handles: PluginListenerHandle[] = []

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

/** Mở màn hình theo yêu cầu từ native (thông báo cuộc gọi, ACTION_DIAL của app khác). */
function openLaunch(l: LaunchInfo) {
  const query = l.number ? { number: l.number } : undefined
  if (route.path !== l.route) router.push({ path: l.route, query })
}

// Màn hình theo trạng thái cuộc gọi (sự kiện callState / callEnded của InCallService).
watch(
  () => session.phase,
  (phase, prev) => {
    if (phase === 'ringing' && route.path !== '/call/incoming') router.push('/call/incoming')
    else if ((phase === 'dialing' || phase === 'active') && prev !== phase && !route.path.startsWith('/call/active') && route.path !== '/dialpad')
      router.push('/call/active')
    else if (phase === 'ended' && route.path.startsWith('/call/') && route.path !== '/call/after' && route.path !== '/call/simulate')
      router.replace(session.afterRoute())
  },
)

onMounted(async () => {
  await session.start()
  if (!Capacitor.isNativePlatform()) return
  handles.push(await CapApp.addListener('backButton', onBack))
  handles.push(await SafeDial.addListener('launch', openLaunch))
  // Quay lại app: dữ liệu Android (nhật ký, danh bạ, danh sách chặn) có thể đã đổi.
  handles.push(
    await CapApp.addListener('resume', () => {
      if (calls.loaded) void calls.load(true)
      if (contacts.loaded) void contacts.load(true)
      if (block.loaded) void block.load(true)
    }),
  )
  const st = await SafeDial.getLaunchState()
  if (st.launch) openLaunch(st.launch)
})
onBeforeUnmount(() => handles.forEach((h) => h.remove()))
</script>

<template>
  <!-- Khung điện thoại: trên desktop giới hạn 480px, trên máy thật chiếm toàn màn hình. -->
  <div class="flex h-full justify-center">
    <div class="app-shell relative flex h-full w-full max-w-[480px] flex-col overflow-hidden">
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
