import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { t } from '@/composables/useT'
import { useBlockStore } from '@/stores/block'
import { useCallSessionStore } from '@/stores/callSession'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { formatNumber } from '@/utils/numbers'

/**
 * Luồng gọi đi dùng chung: nếu `defaultSim === 'ask'` mở sheet chọn SIM, ngược lại gọi ngay.
 * Gắn `<SimSheet v-model="simSheetOpen" :number="pendingNumber" @choose="chooseSim" />` vào view.
 */
export function useDialFlow() {
  const router = useRouter()
  const settings = useSettingsStore()
  const session = useCallSessionStore()
  const simSheetOpen = ref(false)
  const pendingNumber = ref('')
  const busy = ref(false)

  async function dialNow(e164: string, sim: 1 | 2) {
    if (busy.value) return
    busy.value = true
    try {
      await session.dial(e164, sim)
      await router.push('/call/active')
    } finally {
      busy.value = false
    }
  }

  async function startCall(e164: string) {
    if (!e164 || busy.value) return
    const pref = settings.state.defaultSim
    if (pref === 'ask') {
      pendingNumber.value = e164
      simSheetOpen.value = true
      return
    }
    await dialNow(e164, pref === 'sim2' ? 2 : 1)
  }

  async function chooseSim(sim: 1 | 2, remember: boolean) {
    if (remember) settings.patch({ defaultSim: sim === 2 ? 'sim2' : 'sim1' })
    simSheetOpen.value = false
    await dialNow(pendingNumber.value, sim)
  }

  return { startCall, chooseSim, simSheetOpen, pendingNumber, busy }
}

/** Các thao tác phụ dùng chung giữa danh sách cuộc gọi và màn chi tiết số. */
export function useNumberActions() {
  const ui = useUiStore()
  const block = useBlockStore()
  const settings = useSettingsStore()

  const pretty = (e164: string) => formatNumber(e164, settings.state.homeCountryDial)

  /** Chặn / bỏ chặn có xác nhận. Trả về true nếu trạng thái đã đổi. */
  async function toggleBlock(e164: string, name?: string): Promise<boolean> {
    if (!e164) return false
    const rule = block.isBlockedNumber(e164)
    const num = pretty(e164)
    if (rule) {
      const ok = await ui.confirm({
        title: t('number.block.unblockTitle'),
        message: t('number.block.unblockMessage', { number: num }),
        confirmText: t('common.actions.unblock'),
      })
      if (!ok) return false
      block.removeRule(rule.id)
      ui.showToast(t('number.block.unblockDone', { number: num }), 'success')
      return true
    }
    const ok = await ui.confirm({
      title: t('number.block.title'),
      message: t('number.block.message', { number: num }),
      confirmText: t('common.actions.block'),
      danger: true,
      icon: 'ban',
    })
    if (!ok) return false
    block.addRule('number', e164, name)
    ui.showToast(t('number.block.done', { number: num }), 'success')
    return true
  }

  async function copyNumber(e164: string) {
    try {
      await navigator.clipboard.writeText(e164 || '')
      ui.showToast(t('number.copied'), 'success')
    } catch {
      ui.showToast(t('number.copyFail'), 'warning')
    }
  }

  function messageMock(e164: string, name?: string) {
    ui.showToast(t('number.toast.message', { name: name ?? pretty(e164) }))
  }

  function saveMock() {
    ui.showToast(t('number.toast.save'))
  }

  return { toggleBlock, copyNumber, messageMock, saveMock, pretty }
}
