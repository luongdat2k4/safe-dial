import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CallLogEntry, RiskLevel } from '@/types'
import { dialer } from '@/services'

export const useCallsStore = defineStore('calls', () => {
  const entries = ref<CallLogEntry[]>([])
  const loaded = ref(false)

  const blocked = computed(() => entries.value.filter((e) => e.type === 'blocked'))

  async function load(force = false) {
    if (loaded.value && !force) return
    entries.value = await dialer.getCallLog()
    loaded.value = true
  }

  function forNumber(e164: string): CallLogEntry[] {
    return entries.value.filter((e) => e.number === e164)
  }

  async function remove(ids: string[]) {
    await dialer.deleteCallLogs(ids)
    entries.value = entries.value.filter((e) => !ids.includes(e.id))
  }

  async function clear() {
    await dialer.clearCallLog()
    entries.value = []
  }

  /** Thêm cuộc gọi mới (từ phần mô phỏng) lên đầu danh sách. */
  function add(entry: CallLogEntry) {
    dialer.appendCall(entry)
    entries.value = [entry, ...entries.value]
  }

  /** Sau khi người dùng báo cáo, cập nhật mức rủi ro của mọi dòng cùng số. */
  function applyRisk(e164: string, risk: RiskLevel, reportCount: number, category?: CallLogEntry['category']) {
    entries.value = entries.value.map((e) =>
      e.number === e164 && !e.contactId ? { ...e, risk, reportCount, category } : e,
    )
  }

  return { entries, loaded, blocked, load, forNumber, remove, clear, add, applyRisk }
})
