import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CallLogEntry, CallType } from '@/types'
import { SafeDial, type NativeCall } from '@/services'
import { reasonFromBits } from '@/utils/blockEngine'
import { useLookupStore } from './lookup'

/**
 * Lịch sử cuộc gọi = CallLog của Android + call_meta của app. Rủi ro hiển thị ưu tiên
 * đánh dấu hiện tại của người dùng (number_marks), sau đó tới rủi ro tại lúc gọi.
 */
export const useCallsStore = defineStore('calls', () => {
  const raw = ref<NativeCall[]>([])
  const loaded = ref(false)
  /** Có quyền đọc nhật ký cuộc gọi không (false → hiện nút cấp quyền). */
  const granted = ref(true)
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
    await lookup.loadMarks(force)
    const r = await SafeDial.getCallLog({ limit: 500 })
    raw.value = r.calls
    granted.value = r.granted
    loaded.value = true
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
    raw.value = []
  }

  return { entries, loaded, granted, blocked, load, forNumber, remove, removeNumber, clear }
})
