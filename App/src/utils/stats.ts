/** Hàm thuần tính thống kê trên nhật ký cuộc gọi (không phụ thuộc UI / store). */
import type { CallLogEntry, CallType, RiskLevel } from '@/types'

export type Period = '7d' | '30d' | 'all'

const DAY = 86_400_000

export function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Lọc theo khoảng thời gian tính ngược từ `now`. */
export function filterPeriod(entries: CallLogEntry[], period: Period, now = new Date()): CallLogEntry[] {
  if (period === 'all') return entries
  const days = period === '7d' ? 7 : 30
  const from = now.getTime() - days * DAY
  return entries.filter((e) => new Date(e.startedAt).getTime() >= from)
}

/** Số có trong danh bạ (hoặc đã có tên xác minh)? */
export function isKnown(e: CallLogEntry): boolean {
  return !!e.contactId || !!e.name
}

export interface Totals {
  count: number
  talkSec: number
  incoming: number
  outgoing: number
  missed: number
  blocked: number
  /** Cuộc gọi không phải gọi đi, từ số spam / lừa đảo. */
  suspicious: number
  avgSec: number
}

export function totals(entries: CallLogEntry[]): Totals {
  const t: Totals = { count: entries.length, talkSec: 0, incoming: 0, outgoing: 0, missed: 0, blocked: 0, suspicious: 0, avgSec: 0 }
  let talked = 0
  for (const e of entries) {
    t[e.type] += 1
    t.talkSec += e.durationSec
    if (e.durationSec > 0) talked += 1
    if (e.type !== 'outgoing' && (e.risk === 'spam' || e.risk === 'scam')) t.suspicious += 1
  }
  t.avgSec = talked ? Math.round(t.talkSec / talked) : 0
  return t
}

export interface NumberFreq {
  number: string
  name?: string
  count: number
  totalSec: number
  incoming: number
  outgoing: number
  missed: number
  blocked: number
  lastAt: string
  firstAt: string
  isContact: boolean
  risk: RiskLevel
  reportCount: number
  category?: CallLogEntry['category']
}

/** Xếp hạng theo số lần liên lạc (giảm dần, hoà thì theo thời lượng). */
export function frequencyRanking(entries: CallLogEntry[]): NumberFreq[] {
  const map = new Map<string, NumberFreq>()
  for (const e of entries) {
    let f = map.get(e.number)
    if (!f) {
      f = {
        number: e.number,
        name: e.name,
        count: 0,
        totalSec: 0,
        incoming: 0,
        outgoing: 0,
        missed: 0,
        blocked: 0,
        lastAt: e.startedAt,
        firstAt: e.startedAt,
        isContact: isKnown(e),
        risk: e.risk,
        reportCount: e.reportCount,
        category: e.category,
      }
      map.set(e.number, f)
    }
    f.count += 1
    f.totalSec += e.durationSec
    f[e.type] += 1
    if (e.startedAt > f.lastAt) {
      f.lastAt = e.startedAt
      f.risk = e.risk
      f.reportCount = e.reportCount
      f.category = e.category
    }
    if (e.startedAt < f.firstAt) f.firstAt = e.startedAt
    if (e.name) f.name = e.name
    if (isKnown(e)) f.isContact = true
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.totalSec - a.totalSec)
}

export interface DayBucket {
  /** yyyy-m-d theo giờ địa phương */
  key: string
  /** Thứ viết tắt (<= 7 ngày) hoặc ngày/tháng */
  label: string
  count: number
}

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** Số cuộc gọi mỗi ngày trong `days` ngày gần nhất (cũ → mới). */
export function callsPerDay(entries: CallLogEntry[], days: number, now = new Date()): DayBucket[] {
  const buckets: DayBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    buckets.push({
      key: dayKey(day),
      label: days <= 7 ? (WEEKDAY_SHORT[day.getDay()] ?? '') : `${day.getDate()}/${day.getMonth() + 1}`,
      count: 0,
    })
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]))
  for (const e of entries) {
    const i = idx.get(dayKey(new Date(e.startedAt)))
    if (i !== undefined) buckets[i]!.count += 1
  }
  return buckets
}

export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Số cuộc gọi theo thứ trong tuần, chỉ số 0 = Thứ 2 … 6 = Chủ nhật. */
export function weekdayHistogram(entries: CallLogEntry[]): number[] {
  const h = [0, 0, 0, 0, 0, 0, 0]
  for (const e of entries) {
    const wd = (new Date(e.startedAt).getDay() + 6) % 7
    h[wd]! += 1
  }
  return h
}

export interface WeekBucket {
  label: string
  byType: Record<CallType, number>
  total: number
}

/** `weeks` tuần gần nhất (cũ → mới); tuần cuối kết thúc tại `now`. */
export function weeklyCounts(entries: CallLogEntry[], weeks: number, now = new Date()): WeekBucket[] {
  const out: WeekBucket[] = Array.from({ length: weeks }, (_, i) => ({
    label: i === weeks - 1 ? 'Nay' : `-${weeks - 1 - i}t`,
    byType: { incoming: 0, outgoing: 0, missed: 0, blocked: 0 },
    total: 0,
  }))
  for (const e of entries) {
    const age = Math.floor((now.getTime() - new Date(e.startedAt).getTime()) / (7 * DAY))
    const i = weeks - 1 - age
    if (age < 0 || i < 0) continue
    out[i]!.byType[e.type] += 1
    out[i]!.total += 1
  }
  return out
}

/** Phân bổ mức rủi ro của các cuộc gọi đến (không tính cuộc gọi đi). */
export function riskBreakdown(entries: CallLogEntry[]): Record<RiskLevel, number> {
  const r: Record<RiskLevel, number> = { safe: 0, unknown: 0, spam: 0, scam: 0 }
  for (const e of entries) if (e.type !== 'outgoing') r[e.risk] += 1
  return r
}

/** Tổng thời lượng theo hướng gọi. */
export function durationByDirection(entries: CallLogEntry[]): { total: number; incoming: number; outgoing: number } {
  let incoming = 0
  let outgoing = 0
  for (const e of entries) {
    if (e.type === 'incoming') incoming += e.durationSec
    else if (e.type === 'outgoing') outgoing += e.durationSec
  }
  return { total: incoming + outgoing, incoming, outgoing }
}
