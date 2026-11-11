import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CallerInfo, NumberMark, SpamCategory } from '@/types'
import { SafeDial, type NativeMark } from '@/services'
import { riskOfCategory } from '@/utils/blockEngine'

export function toMark(m: NativeMark): NumberMark {
  return {
    number: m.number,
    trusted: m.trusted,
    category: m.category ?? undefined,
    name: m.name ?? undefined,
    note: m.note ?? undefined,
    updatedAt: m.updatedAt,
  }
}

/**
 * Thông tin về số: danh bạ (Android) + đánh dấu của người dùng (number_marks) +
 * danh sách chặn hệ thống. Không còn dữ liệu cộng đồng.
 */
export const useLookupStore = defineStore('lookup', () => {
  /** Đánh dấu theo số, nạp một lần và cập nhật khi người dùng thay đổi. */
  const marks = reactive<Record<string, NumberMark>>({})
  const marksLoaded = ref(false)
  const cache = reactive<Record<string, CallerInfo>>({})

  async function loadMarks(force = false) {
    if (marksLoaded.value && !force) return
    const { marks: list } = await SafeDial.listMarks()
    for (const k of Object.keys(marks)) delete marks[k]
    for (const m of list) marks[m.number] = toMark(m)
    marksLoaded.value = true
  }

  function riskOf(info: Pick<CallerInfo, 'isContact' | 'mark'>): CallerInfo['risk'] {
    if (info.mark?.trusted) return 'safe'
    if (info.mark?.category) return riskOfCategory(info.mark.category)
    return info.isContact ? 'safe' : 'unknown'
  }

  async function identify(e164: string): Promise<CallerInfo> {
    if (!e164) return { number: '', isContact: false, blocked: false, risk: 'unknown' }
    const r = await SafeDial.lookupNumber({ number: e164 })
    const mark = r.mark ? toMark(r.mark) : undefined
    if (mark) marks[e164] = mark
    else delete marks[e164]
    const info: CallerInfo = {
      number: e164,
      name: r.name ?? mark?.name,
      isContact: r.isContact,
      contactId: r.contactId !== undefined ? String(r.contactId) : undefined,
      starred: r.starred,
      blocked: r.blocked,
      mark,
      risk: 'unknown',
    }
    info.risk = riskOf(info)
    cache[e164] = info
    return info
  }

  /** Ghi một phần đánh dấu rồi trả về đánh dấu mới (undefined nếu đã xoá hết). */
  async function setMark(e164: string, patch: Partial<Pick<NumberMark, 'trusted' | 'category' | 'name' | 'note'>>) {
    const { mark } = await SafeDial.setMark({
      number: e164,
      ...('trusted' in patch ? { trusted: patch.trusted } : {}),
      ...('category' in patch ? { category: patch.category ?? null } : {}),
      ...('name' in patch ? { name: patch.name ?? null } : {}),
      ...('note' in patch ? { note: patch.note ?? null } : {}),
    })
    if (mark) marks[e164] = toMark(mark)
    else delete marks[e164]
    if (cache[e164]) {
      cache[e164].mark = marks[e164]
      cache[e164].risk = riskOf(cache[e164])
    }
    return marks[e164]
  }

  /** "Báo cáo" = đánh dấu loại (+ ghi chú) cho chính người dùng; bỏ trạng thái tin cậy. */
  function report(e164: string, category: SpamCategory, note?: string) {
    return setMark(e164, { category, trusted: false, ...(note !== undefined ? { note } : {}) })
  }

  function rename(e164: string, name: string) {
    return setMark(e164, { name })
  }

  /** Đánh dấu tin cậy / "Không phải spam": xoá loại lừa đảo. */
  function trust(e164: string, trusted: boolean) {
    return setMark(e164, trusted ? { trusted: true, category: undefined } : { trusted: false })
  }

  return { marks, cache, loadMarks, identify, setMark, report, rename, trust, riskOf }
})
