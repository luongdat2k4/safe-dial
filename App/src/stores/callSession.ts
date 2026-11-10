import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CallerInfo, CallLogEntry, CallScenario } from '@/types'
import type { Decision } from '@/utils/blockEngine'
import { REASON_LABEL } from '@/utils/blockEngine'
import { useBlockStore } from './block'
import { useCallsStore } from './calls'
import { useUiStore } from './ui'

export type CallPhase = 'idle' | 'ringing' | 'dialing' | 'active' | 'ended'
export type CallDirection = 'incoming' | 'outgoing'

/**
 * Phiên cuộc gọi giả lập. `simulate()` chạy bộ máy chặn: bị chặn thì chỉ ghi nhật ký,
 * cho qua thì chuyển sang `ringing` để màn hình cuộc gọi đến / popup caller-ID hiển thị.
 */
export const useCallSessionStore = defineStore('callSession', () => {
  const phase = ref<CallPhase>('idle')
  const direction = ref<CallDirection>('incoming')
  const info = ref<CallerInfo | null>(null)
  const decision = ref<Decision | null>(null)
  const seconds = ref(0)
  const controls = reactive({ muted: false, speaker: false, hold: false, keypad: false })
  /** Cuộc gọi vừa kết thúc, dùng cho màn hình sau cuộc gọi. */
  const lastEnded = ref<CallLogEntry | null>(null)
  let timer: ReturnType<typeof setInterval> | undefined
  let startedAt = new Date()
  let simSlot: 1 | 2 | undefined

  const calls = useCallsStore()
  const block = useBlockStore()
  const ui = useUiStore()

  const isLive = computed(() => phase.value === 'ringing' || phase.value === 'dialing' || phase.value === 'active')

  function startTimer() {
    clearInterval(timer)
    seconds.value = 0
    timer = setInterval(() => (seconds.value += 1), 1000)
  }

  function resetControls() {
    Object.assign(controls, { muted: false, speaker: false, hold: false, keypad: false })
  }

  function makeEntry(type: CallLogEntry['type'], durationSec: number, blockedReason?: CallLogEntry['blockedReason']): CallLogEntry {
    const i = info.value!
    return {
      id: `log-${Date.now().toString(36)}`,
      number: i.number,
      name: i.name,
      contactId: undefined,
      type,
      startedAt: startedAt.toISOString(),
      durationSec,
      risk: i.risk,
      category: i.profile?.category,
      reportCount: i.profile?.reportCount ?? 0,
      blockedReason,
      simSlot,
    }
  }

  /** Mô phỏng cuộc gọi đến. Trả về `blocked: true` nếu bị chặn (không có UI cuộc gọi). */
  async function simulate(s: Pick<CallScenario, 'number' | 'isPrivate'>): Promise<{ blocked: boolean; decision: Decision }> {
    await calls.load()
    const { decision: d, info: i } = await block.evaluate(s.isPrivate ? '' : s.number)
    info.value = i
    decision.value = d
    direction.value = 'incoming'
    startedAt = new Date()
    simSlot = 1
    resetControls()
    lastEnded.value = null

    if (d.action !== 'allow') {
      const silent = d.action === 'silence'
      calls.add(makeEntry('blocked', 0, d.reason ?? undefined))
      if (block.settings.notifyOnBlock) {
        ui.showToast(`${silent ? 'Đã tắt chuông' : 'Đã chặn'}: ${REASON_LABEL[d.reason!]}`, 'success')
      }
      phase.value = 'idle'
      return { blocked: true, decision: d }
    }
    phase.value = 'ringing'
    return { blocked: false, decision: d }
  }

  function accept() {
    if (phase.value !== 'ringing') return
    phase.value = 'active'
    startTimer()
  }

  /** Từ chối khi đang đổ chuông (có thể kèm tin nhắn nhanh ở UI). */
  function reject() {
    if (!info.value) return
    finish('missed', 0)
  }

  function hangup() {
    if (!info.value) return
    const dur = seconds.value
    finish(direction.value === 'outgoing' ? 'outgoing' : 'incoming', dur)
  }

  function finish(type: CallLogEntry['type'], dur: number) {
    clearInterval(timer)
    const entry = makeEntry(type, dur)
    calls.add(entry)
    lastEnded.value = entry
    phase.value = 'ended'
  }

  /** Gọi đi từ bàn phím / danh bạ (giả lập: kết nối sau ~1,5 giây). */
  async function dial(e164: string, sim?: 1 | 2) {
    const { info: i } = await block.evaluate(e164)
    info.value = i
    decision.value = null
    direction.value = 'outgoing'
    startedAt = new Date()
    simSlot = sim ?? 1
    resetControls()
    lastEnded.value = null
    phase.value = 'dialing'
    startTimer()
    setTimeout(() => {
      if (phase.value === 'dialing') {
        phase.value = 'active'
        startTimer()
      }
    }, 1500)
  }

  function reset() {
    clearInterval(timer)
    phase.value = 'idle'
    info.value = null
    decision.value = null
    seconds.value = 0
    lastEnded.value = null
    resetControls()
  }

  return { phase, direction, info, decision, seconds, controls, lastEnded, isLive, simulate, accept, reject, hangup, dial, reset }
})
