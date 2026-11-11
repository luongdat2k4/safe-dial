import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CallerInfo, CallLogEntry } from '@/types'
import { SafeDial, isNative, type CallSnapshot, type EndedCall, type NativeDecision } from '@/services'
import { reasonFromBits } from '@/utils/blockEngine'
import { useCallsStore } from './calls'
import { useLookupStore } from './lookup'
import { useSettingsStore } from './settings'
import { useStatsStore } from './stats'

export type CallPhase = 'idle' | 'ringing' | 'dialing' | 'active' | 'ended'
export type CallDirection = 'incoming' | 'outgoing'

/**
 * Phiên cuộc gọi hiện tại. Trạng thái đến từ sự kiện `callState` / `callEnded` của plugin:
 * trên máy thật là InCallService (Telecom), trên web là bản giả lập.
 */
export const useCallSessionStore = defineStore('callSession', () => {
  const phase = ref<CallPhase>('idle')
  const direction = ref<CallDirection>('incoming')
  const info = ref<CallerInfo | null>(null)
  const decision = ref<NativeDecision | null>(null)
  const seconds = ref(0)
  const controls = reactive({ muted: false, speaker: false, hold: false, keypad: false })
  /** Cuộc gọi vừa kết thúc, dùng cho màn hình sau cuộc gọi. */
  const lastEnded = ref<CallLogEntry | null>(null)
  let activeAt = 0
  let startAt = 0
  let timer: ReturnType<typeof setInterval> | undefined
  let started = false

  const lookup = useLookupStore()
  const calls = useCallsStore()
  const stats = useStatsStore()
  const settings = useSettingsStore()

  const isLive = computed(() => phase.value === 'ringing' || phase.value === 'dialing' || phase.value === 'active')

  function tick() {
    seconds.value = activeAt ? Math.max(0, Math.round((Date.now() - activeAt) / 1000)) : 0
  }

  async function apply(s: CallSnapshot) {
    if (s.state === 'disconnected') return
    const changedNumber = !info.value || info.value.number !== s.number
    direction.value = s.incoming ? 'incoming' : 'outgoing'
    phase.value = s.state === 'ringing' ? 'ringing' : s.state === 'dialing' ? 'dialing' : 'active'
    decision.value = s.decision ?? null
    controls.muted = s.muted
    controls.speaker = s.speaker
    controls.hold = s.holding
    startAt = s.startAt
    activeAt = s.activeAt ?? 0
    clearInterval(timer)
    if (activeAt) {
      tick()
      timer = setInterval(tick, 1000)
    }
    if (changedNumber) {
      const i = await lookup.identify(s.number)
      if (s.decision && !i.isContact && s.decision.risk !== 'unknown') i.risk = s.decision.risk
      if (!i.name && s.name) i.name = s.name
      info.value = i
    }
  }

  function onEnded(e: EndedCall) {
    clearInterval(timer)
    const d = e.decision
    lastEnded.value = {
      id: `ended-${e.startedAt}`,
      number: e.number,
      name: e.name ?? info.value?.name,
      isContact: info.value?.isContact ?? false,
      type: e.type === 'rejected' ? 'missed' : e.type,
      startedAt: new Date(e.startedAt).toISOString(),
      durationSec: e.durationSec,
      risk: info.value?.risk ?? d?.risk ?? 'unknown',
      action: d?.action,
      reasons: d?.reasons,
      blockedReason: e.type === 'blocked' && d ? reasonFromBits(d.reasons) : undefined,
    }
    phase.value = 'ended'
    void calls.load(true)
    void stats.load()
  }

  /** Đăng ký sự kiện plugin một lần; trả về cuộc gọi đang diễn ra nếu có. */
  let starting: Promise<void> | null = null
  function start(): Promise<void> {
    if (started) return Promise.resolve()
    starting ??= (async () => {
      await SafeDial.addListener('callState', (s) => void apply(s))
      await SafeDial.addListener('callEnded', onEnded)
      started = true
      const st = await SafeDial.getCallState()
      if (st.call) await apply(st.call)
    })().catch((e) => {
      starting = null
      console.error('[callSession] không đăng ký được sự kiện cuộc gọi', e)
    })
    return starting
  }

  /** Chỉ bản web: giả lập cuộc gọi đến. Trả `blocked: true` nếu bị chặn / tắt chuông. */
  async function simulate(number: string): Promise<{ blocked: boolean; decision: NativeDecision }> {
    await start()
    if (!SafeDial.simulateIncoming) throw new Error('Chỉ có trên bản web')
    lastEnded.value = null
    const r = await SafeDial.simulateIncoming({ number })
    if (!r.rang) {
      void calls.load(true)
      void stats.load()
      return { blocked: true, decision: r.decision }
    }
    return { blocked: false, decision: r.decision }
  }

  async function accept() {
    await SafeDial.answer()
  }

  /** Từ chối khi đang đổ chuông, có thể kèm tin nhắn trả lời nhanh. */
  async function reject(message?: string) {
    await SafeDial.reject(message ? { message } : undefined)
  }

  async function hangup() {
    await SafeDial.hangup()
  }

  /**
   * Gọi đi qua Telecom (máy thật) hoặc giả lập (web). Trả về true nếu màn hình cuộc gọi của app
   * xử lý cuộc gọi; false nếu app chưa là ứng dụng gọi điện mặc định (Android tự hiện màn gọi).
   */
  async function dial(e164: string, sim?: 1 | 2): Promise<boolean> {
    await start()
    lastEnded.value = null
    let simId: string | undefined
    if (sim) {
      const { sims } = await SafeDial.getSims()
      simId = sims.find((s) => s.slot === sim)?.id
    }
    await SafeDial.placeCall({ number: e164, simId })
    if (!isNative) return true
    if (!(await SafeDial.getStatus()).dialerRole) return false
    // Trên máy thật, trạng thái sẽ tới qua sự kiện callState; điền trước để màn hình có dữ liệu.
    if (!info.value || info.value.number !== e164) info.value = await lookup.identify(e164)
    direction.value = 'outgoing'
    if (phase.value === 'idle' || phase.value === 'ended') phase.value = 'dialing'
    return true
  }

  async function toggle(key: 'muted' | 'speaker' | 'hold' | 'keypad') {
    if (key === 'keypad') {
      controls.keypad = !controls.keypad
      return
    }
    const next = !controls[key]
    controls[key] = next
    if (key === 'muted') await SafeDial.setMuted({ muted: next })
    else if (key === 'speaker') await SafeDial.setSpeaker({ on: next })
    else await SafeDial.setHold({ hold: next })
  }

  function dtmf(digit: string) {
    void SafeDial.dtmf({ digit })
  }

  /** Ghi chú cho cuộc gọi hiện tại (bảng call_notes). */
  async function addNote(note: string) {
    const number = info.value?.number ?? ''
    await SafeDial.addNote({ number, at: startAt || Date.now(), note })
  }

  function reset() {
    clearInterval(timer)
    phase.value = 'idle'
    info.value = null
    decision.value = null
    seconds.value = 0
    lastEnded.value = null
    Object.assign(controls, { muted: false, speaker: false, hold: false, keypad: false })
  }

  /** Màn hình nên mở sau khi cuộc gọi kết thúc. */
  function afterRoute() {
    return settings.state.showAfterCall && lastEnded.value ? '/call/after' : '/home/calls'
  }

  return {
    phase, direction, info, decision, seconds, controls, lastEnded, isLive,
    start, simulate, accept, reject, hangup, dial, toggle, dtmf, addNote, reset, afterRoute,
  }
})
