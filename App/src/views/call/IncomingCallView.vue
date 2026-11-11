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
import QuickActionSheets, { type SheetMode } from '@/components/call/QuickActionSheets.vue'

const router = useRouter()
const session = useCallSessionStore()
const settings = useSettingsStore()
const block = useBlockStore()
const ui = useUiStore()
const sheet = ref<SheetMode>(null)

onMounted(() => {
  if (session.phase !== 'ringing' || !session.info) router.replace('/call/simulate')
})

// Popup toàn màn hình có nền sáng; các cỡ khác nằm trên màn hình chính giả (nền tím đậm).
watchEffect(() => {
  void applyStatusBar(
    settings.state.popupSize === 'full' ? { style: 'light', color: '#f4edff' } : { style: 'dark', color: '#bbb1eb' },
  )
})

function afterEnd() {
  router.replace(settings.state.showAfterCall ? '/call/after' : '/home/calls')
}

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
  session.accept()
  router.replace('/call/active')
}

function reject(toast?: string) {
  session.reject()
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
  const r = block.addRule('number', info.number)
  reject(r ? t('call.incoming.blocked', { number: shown }) : t('block.form.duplicate'))
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
      @answer="answer"
      @reject="reject()"
      @more="sheet = 'more'"
      @message="sheet = 'message'"
      @remind="sheet = 'remind'"
      @block="blockNumber"
    />
    <QuickActionSheets
      v-model="sheet"
      @reply="(txt) => ((sheet = null), reject(t('call.incoming.replySent', { text: txt })))"
      @remind="(label) => ((sheet = null), reject(t('call.incoming.remindSet', { when: label })))"
      @block="blockNumber"
    />
  </div>
</template>
