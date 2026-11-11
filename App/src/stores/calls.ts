import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CallLogEntry, CallType } from '@/types'
import { SafeDial, type NativeCall } from '@/services'
import { reasonFromBits } from '@/utils/blockEngine'
import { useLookupStore } from './lookup'

/** Số cuộc gọi mỗi lần đọc qua cầu native. */
const PAGE = 100
/** Giới hạn số cuộc gọi giữ trong bộ nhớ (Android thường chỉ giữ ~500 / tài khoản). */
const MAX_CALLS = 1000

const idle = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 50)

/**
 * Lịch sử cuộc gọi = CallLog của Android + call_meta của app. Rủi ro hiển thị ưu tiên
 * đánh dấu hiện tại của người dùng (number_marks), sau đó tới rủi ro tại lúc gọi.
 *
 * Đọc theo trang: trang đầu hiện ngay, các trang sau tải dần lúc rảnh (tối đa MAX_CALLS)
 * để bộ lọc, đếm và tìm kiếm có đủ dữ liệu. Làm mới (sau cuộc gọi, khi mở lại app) chỉ đọc
 * lại trang đầu rồi ghép với phần cũ hơn đã có.
 */
export const useCallsStore = defineStore('calls', () => {
  const raw = ref<NativeCall[]>([])
  const loaded = ref(false)
  /** Có quyền đọc nhật ký cuộc gọi không (false → hiện nút cấp quyền). */
  const granted = ref(true)
  /** Còn cuộc gọi cũ hơn chưa tải. */
  const hasMore = ref(false)
  let loadingMore: Promise<void> | null = null
  let generation = 0
  const lookup = useLookupStore()

  const entries = computed<CallLogEntry[]>(() => raw.value.map(toEntry))
  const blocked = computed(() => entries.value.filter((e) => e.type === 'blocked'))

  function toEntry(c: NativeCall): CallLogEntry {
    const mark = c.number ? lookup.marks[c.number] : undefined
    const isContact = !!c.name
    const type: CallType = c.type === 'rejected' ? 'missed' : c.type
    let risk: CallLogEntry['risk']
    if (mark?.trusted) risk = 'safe'
    else if (mark?.category) risk = lookup.riskOf({ isContact, mark })
    else if (c.meta) risk = c.meta.risk
    else risk = isContact ? 'safe' : 'unknown'
    return {
      id: c.id,
      number: c.number,
      name: c.name ?? mark?.name,
      isContact,
      type,
      startedAt: new Date(c.startedAt).toISOString(),
      durationSec: c.durationSec,
      risk,
      category: mark?.category,
      action: c.meta?.action,
      reasons: c.meta?.reasons,
      blockedReason: c.type === 'blocked' && c.meta ? reasonFromBits(c.meta.reasons) : undefined,
      simSlot: c.simSlot,
    }
  }

  async function load(force = false) {
    if (loaded.value && !force) return
    const gen = ++generation
    await lookup.loadMarks(force)
    const r = await SafeDial.getCallLog({ limit: PAGE })
    if (gen !== generation) return
    granted.value = r.granted
    const head = r.calls
    const oldest = head[head.length - 1]?.startedAt
    if (!loaded.value || head.length < PAGE || oldest === undefined) {
      raw.value = head
      hasMore.value = head.length === PAGE
    } else {
      // Giữ phần cũ hơn trang đầu đã tải trước đó.
      const ids = new Set(head.map((c) => c.id))
      raw.value = head.concat(raw.value.filter((c) => c.startedAt < oldest && !ids.has(c.id)))
    }
    loaded.value = true
    prefetch(gen)
  }

  /** Tải trang kế tiếp (cũ hơn). Gọi nhiều lần cùng lúc chỉ chạy một. */
  function loadMore(): Promise<void> {
    if (!hasMore.value || raw.value.length >= MAX_CALLS) return Promise.resolve()
    loadingMore ??= (async () => {
      const gen = generation
      try {
        const r = await SafeDial.getCallLog({ limit: PAGE, offset: raw.value.length })
        if (gen !== generation) return
        const ids = new Set(raw.value.map((c) => c.id))
        const more = r.calls.filter((c) => !ids.has(c.id))
        if (more.length) raw.value = raw.value.concat(more)
        hasMore.value = r.calls.length === PAGE && raw.value.length < MAX_CALLS
      } catch {
        hasMore.value = false
      } finally {
        loadingMore = null
      }
    })()
    return loadingMore
  }

  /** Tải dần các trang còn lại khi trình duyệt rảnh, không chặn lần vẽ đầu. */
  function prefetch(gen: number) {
    if (!hasMore.value || gen !== generation) return
    idle(() => {
      if (gen !== generation) return
      void loadMore().then(() => prefetch(gen))
    })
  }

  function forNumber(e164: string): CallLogEntry[] {
    return entries.value.filter((e) => e.number === e164)
  }

  /** Xoá khỏi nhật ký (CallLog + call_meta). Thống kê không bị trừ. */
  async function remove(ids: string[]) {
    await SafeDial.deleteCalls({ ids })
    raw.value = raw.value.filter((e) => !ids.includes(e.id))
  }

  async function removeNumber(e164: string) {
    await SafeDial.deleteCallsOf({ number: e164 })
    raw.value = raw.value.filter((e) => e.number !== e164)
  }

  async function clear() {
    await SafeDial.clearCallLog()
    generation++
    raw.value = []
    hasMore.value = false
  }

  return { entries, loaded, granted, hasMore, blocked, load, loadMore, forNumber, remove, removeNumber, clear }
})
