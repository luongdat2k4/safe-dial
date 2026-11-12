import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CallerInfo, CallLogEntry } from '@/types'
import { SafeDial, isNative, type CallSnapshot, type EndedCall, type NativeDecision } from '@/services'
import { reasonFromBits } from '@/utils/blockEngine'
import { nationalForm } from '@/utils/numbers'
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
  /**
   * Cuộc gọi hiện tại là giả lập cục bộ (màn "Mô phỏng cuộc gọi đến" trên máy thật): không qua Telecom,
   * không ghi nhật ký / thống kê / ghi chú, không chặn số thật.
   */
  const simulated = ref(false)
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
    // Cuộc gọi thật luôn được ưu tiên hơn cuộc gọi giả lập.
    simulated.value = false
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
    simulated.value = false
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

  /**
   * Mô phỏng cuộc gọi đến (web và máy thật): chỉ hiển thị giao diện. Chạy bộ quyết định (chỉ đọc)
   * để biết số sẽ đổ chuông, bị cảnh báo hay bị chặn, rồi hiện màn hình cuộc gọi đến của app.
   * Không có cuộc gọi thật, không ghi nhật ký / thống kê / ghi chú. Trả `blocked: true` nếu bị chặn.
   * Một lần mô phỏng mới thay cho lần mô phỏng cũ; chỉ từ chối khi đang có cuộc gọi thật.
   */
  async function simulate(
    number: string,
    /** Kết quả định sẵn (kịch bản giả); không có thì chạy bộ quyết định thật cho số đó. */
    preset?: { info: CallerInfo; decision: NativeDecision },
  ): Promise<{ blocked: boolean; decision: NativeDecision }> {
    if (isLive.value && !simulated.value) throw new Error('busy')
    const d = preset ? { ...preset.decision } : await SafeDial.evaluate({ number })
    if (d.action === 'blocked' || d.action === 'silenced') return { blocked: true, decision: d }
    lastEnded.value = null
    clearInterval(timer)
    activeAt = 0
    seconds.value = 0
    startAt = Date.now()
    Object.assign(controls, { muted: false, speaker: false, hold: false, keypad: false })
    const i = preset ? { ...preset.info } : await lookup.identify(number)
    if (!i.isContact && d.risk !== 'unknown') i.risk = d.risk
    if (!i.name && d.name) i.name = d.name
    info.value = i
    decision.value = d
    direction.value = 'incoming'
    simulated.value = true
    phase.value = 'ringing'
    return { blocked: false, decision: d }
  }

  /** Kết thúc cuộc gọi giả lập: dựng dữ liệu cho màn sau cuộc gọi, không ghi nhật ký. */
  function endLocal(kind: 'hangup' | 'reject') {
    clearInterval(timer)
    const answered = !!activeAt
    const d = decision.value
    const type: CallLogEntry['type'] = answered ? 'incoming' : 'missed'
    lastEnded.value = {
      id: `sim-${startAt}`,
      number: info.value?.number ?? '',
      name: info.value?.name,
      isContact: info.value?.isContact ?? false,
      type,
      startedAt: new Date(startAt).toISOString(),
      durationSec: answered ? Math.round((Date.now() - activeAt) / 1000) : 0,
      risk: info.value?.risk ?? d?.risk ?? 'unknown',
      action: d ? (kind === 'reject' && d.action === 'warned' ? 'silenced' : d.action) : undefined,
      reasons: d?.reasons,
    }
    phase.value = 'ended'
  }

  async function accept() {
    if (simulated.value) {
      activeAt = Date.now()
      phase.value = 'active'
      tick()
      clearInterval(timer)
      timer = setInterval(tick, 1000)
      return
    }
    await SafeDial.answer()
  }

  /** Từ chối khi đang đổ chuông, có thể kèm tin nhắn trả lời nhanh. */
  async function reject(message?: string) {
    if (simulated.value) return endLocal('reject')
    await SafeDial.reject(message ? { message } : undefined)
  }

  async function hangup() {
    if (simulated.value) return endLocal(phase.value === 'ringing' ? 'reject' : 'hangup')
    await SafeDial.hangup()
  }

  /**
   * Gọi đi qua Telecom (máy thật) hoặc giả lập (web). Trả về true nếu màn hình cuộc gọi của app
   * xử lý cuộc gọi; false nếu app chưa là ứng dụng gọi điện mặc định (Android tự hiện màn gọi).
   */
  async function dial(e164: string, sim?: 1 | 2): Promise<boolean> {
    await start()
    lastEnded.value = null
    simulated.value = false
    let simId: string | undefined
    if (sim) {
      const { sims } = await SafeDial.getSims()
      simId = sims.find((s) => s.slot === sim)?.id
    }
    // Số trong nước quay theo dạng trong nước (0981294721, 18001090) như khi tự bấm: đầu số dịch vụ / miễn cước
    // không phải lúc nào cũng gọi được ở dạng quốc tế. Số nước ngoài giữ dạng E.164.
    await SafeDial.placeCall({ number: nationalForm(e164, settings.state.homeCountryDial), simId })
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
    if (simulated.value) return
    if (key === 'muted') await SafeDial.setMuted({ muted: next })
    else if (key === 'speaker') await SafeDial.setSpeaker({ on: next })
    else await SafeDial.setHold({ hold: next })
  }

  function dtmf(digit: string) {
    if (simulated.value) return
    void SafeDial.dtmf({ digit })
  }

  /** Ghi chú cho cuộc gọi hiện tại (bảng call_notes). */
  async function addNote(note: string) {
    if (simulated.value) return
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
    simulated.value = false
    Object.assign(controls, { muted: false, speaker: false, hold: false, keypad: false })
  }

  /** Màn hình nên mở sau khi cuộc gọi kết thúc. */
  function afterRoute() {
    // Giả lập: vẫn có màn sau cuộc gọi (các thao tác ở đó không đụng dữ liệu thật), không thì về màn mô phỏng.
    if (simulated.value) return settings.state.showAfterCall && lastEnded.value ? '/call/after' : '/call/simulate'
    return settings.state.showAfterCall && lastEnded.value ? '/call/after' : '/home/calls'
  }

  return {
    phase, direction, info, decision, seconds, controls, lastEnded, isLive, simulated,
    start, simulate, accept, reject, hangup, dial, toggle, dtmf, addNote, reset, afterRoute,
  }
})
