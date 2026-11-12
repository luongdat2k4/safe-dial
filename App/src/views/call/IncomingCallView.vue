<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import { applyStatusBar } from '@/utils/statusBar'
import { useRouter } from 'vue-router'
import { useBlockStore } from '@/stores/block'
import { useCallSessionStore } from '@/stores/callSession'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { formatNumber } from '@/utils/numbers'
import CallerIdOverlay from '@/components/call/CallerIdOverlay.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useCallWallpaper } from '@/composables/useCallWallpaper'
import QuickActionSheets, { type SheetMode } from '@/components/call/QuickActionSheets.vue'

const router = useRouter()
const session = useCallSessionStore()
const settings = useSettingsStore()
const block = useBlockStore()
const ui = useUiStore()
const sheet = ref<SheetMode>(null)
const wallpaper = useCallWallpaper()

onMounted(() => {
  if (session.phase === 'idle') router.replace('/home/calls')
})

// Popup toàn màn hình có nền sáng; kiểu Popup nằm trên màn hình chính giả (màu theo hình nền đang chọn).
watchEffect(() => {
  void applyStatusBar(
    settings.state.popupSize === 'full' ? { style: 'light', color: '#f4edff' } : { style: 'dark', color: wallpaper.barColor.value },
  )
})

/** Xem thử (cuộc gọi giả lập): thoát về màn chọn kịch bản, không qua màn sau cuộc gọi. */
function exitPreview() {
  session.reset()
  if (window.history.state?.back === '/call/simulate') router.back()
  else router.replace('/call/simulate')
}

/** Điều hướng sau khi kết thúc do App.vue xử lý (theo sự kiện callEnded). */
function afterEnd() {}

async function answer() {
  const info = session.info
  if (!info) return
  if ((info.risk === 'scam' || info.risk === 'spam') && settings.state.scamWarning) {
    const ok = await ui.confirm({
      title: t('call.incoming.confirmTitle'),
      message: t('call.incoming.confirmMsg'),
      confirmText: t('call.incoming.confirmOk'),
      cancelText: t('call.incoming.confirmCancel'),
      danger: true,
    })
    if (!ok) return
  }
  await session.accept()
  router.replace('/call/active')
}

async function reject(toast?: string, message?: string) {
  await session.reject(message)
  if (toast) ui.showToast(toast, 'success')
  afterEnd()
}

async function blockNumber() {
  const info = session.info
  if (!info) return
  if (!info.number) {
    ui.showToast(t('call.incoming.cannotBlockHidden'), 'warning')
    return
  }
  const shown = formatNumber(info.number, settings.state.homeCountryDial)
  const ok = await ui.confirm({
    title: t('call.incoming.blockTitle'),
    message: t('call.incoming.blockMsg', { number: shown }),
    confirmText: t('common.actions.block'),
    danger: true,
    icon: 'ban',
  })
  if (!ok) return
  // Cuộc gọi giả lập: không chặn số thật trong danh sách chặn của Android.
  const ok2 = session.simulated ? true : await block.blockNumber(info.number)
  await reject(ok2 ? t('call.incoming.blocked', { number: shown }) : t('number.block.failed'))
}
</script>

<template>
  <div class="relative h-full overflow-hidden bg-ink">
    <CallerIdOverlay
      v-if="session.info"
      :info="session.info"
      :decision="session.decision"
      :size="settings.state.popupSize"
      :position="settings.state.popupPosition"
      :preview="session.simulated"
      @answer="answer"
      @reject="reject()"
      @more="sheet = 'more'"
      @message="sheet = 'message'"
      @remind="sheet = 'remind'"
      @block="blockNumber"
    />
    <!-- Chỉ khi xem thử: cuộc gọi thật không có nút thoát. -->
    <div v-if="session.simulated" class="pt-safe pointer-events-none absolute inset-x-0 top-0 z-10 px-3">
      <button
        type="button"
        class="tap pointer-events-auto mt-3 grid size-10 place-items-center rounded-full backdrop-blur"
        :class="settings.state.popupSize === 'full' ? 'bg-white/80 text-ink shadow-card' : 'bg-white/25 text-white'"
        :aria-label="t('common.actions.back')"
        @click="exitPreview"
      >
        <AppIcon name="arrow-left" :size="22" />
      </button>
    </div>
    <QuickActionSheets
      v-model="sheet"
      @reply="(txt) => ((sheet = null), reject(t('call.incoming.replySent', { text: txt }), txt))"
      @remind="(label) => ((sheet = null), reject(t('call.incoming.remindSet', { when: label })))"
      @block="blockNumber"
    />
  </div>
</template>
