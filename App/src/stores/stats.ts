import { ref } from 'vue'
import { defineStore } from 'pinia'
import { SafeDial, type StatsRow } from '@/services'

/** Thống kê từ bảng call_stats_daily (không phụ thuộc nhật ký cuộc gọi). */
export const useStatsStore = defineStore('stats', () => {
  const rows = ref<StatsRow[]>([])
  const today = ref(0)
  const loaded = ref(false)

  async function load() {
    const r = await SafeDial.getStats({ fromDay: 0 })
    rows.value = r.rows
    today.value = r.today
    loaded.value = true
  }

  async function forNumber(e164: string): Promise<{ rows: StatsRow[]; today: number }> {
    return SafeDial.getStats({ fromDay: 0, number: e164 })
  }

  async function clear() {
    await SafeDial.clearStats()
    rows.value = []
  }

  return { rows, today, loaded, load, forNumber, clear }
})
