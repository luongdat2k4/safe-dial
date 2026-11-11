/**
 * Hàm thuần tính thống kê trên các dòng `call_stats_daily` (schema mục 2.2, 6).
 * Không đọc nhật ký cuộc gọi, nên thống kê vẫn đúng khi Android đã xoá nhật ký cũ.
 */
import type { RiskLevel } from '@/types'
import type { StatsRow } from '@/services/native/definitions'

export type Period = '7d' | '30d' | 'all'

const DAY = 86_400_000

/** Ngày bắt đầu của khoảng (số ngày từ 1970-01-01). */
export function fromDayOf(period: Period, today: number): number {
  if (period === 'all') return 0
  return today - (period === '7d' ? 6 : 29)
}

/** Tổng cuộc gọi đến trong một dòng. */
export const inTotal = (r: StatsRow) => r.incoming + r.missed + r.rejected + r.blocked
const callsOf = (r: StatsRow) => inTotal(r) + r.outgoing

export interface Totals {
  count: number
  talkSec: number
  /** Cuộc gọi đến đã nghe. */
  incoming: number
  outgoing: number
  /** Nhỡ + từ chối. */
  missed: number
  blocked: number
  /** Cuộc gọi đến từ số spam / lừa đảo (rủi ro lúc gọi). */
  suspicious: number
  warned: number
  avgSec: number
}

export function totals(rows: StatsRow[]): Totals {
  const t: Totals = { count: 0, talkSec: 0, incoming: 0, outgoing: 0, missed: 0, blocked: 0, suspicious: 0, warned: 0, avgSec: 0 }
  let talked = 0
  for (const r of rows) {
    t.count += callsOf(r)
    t.talkSec += r.talkInSec + r.talkOutSec
    t.incoming += r.incoming
    t.outgoing += r.outgoing
    t.missed += r.missed + r.rejected
    t.blocked += r.blocked
    t.suspicious += r.riskSpam + r.riskScam
    t.warned += r.warned
    talked += r.incoming + r.answeredOut
  }
  t.avgSec = talked ? Math.round(t.talkSec / talked) : 0
  return t
}

export interface NumberFreq {
  number: string
  count: number
  totalSec: number
  incoming: number
  outgoing: number
  missed: number
  blocked: number
  firstDay: number
  lastDay: number
}

/** Xếp hạng theo số lần liên lạc (giảm dần, hoà thì theo thời lượng). */
export function frequencyRanking(rows: StatsRow[]): NumberFreq[] {
  const map = new Map<string, NumberFreq>()
  for (const r of rows) {
    let f = map.get(r.number)
    if (!f) {
      f = { number: r.number, count: 0, totalSec: 0, incoming: 0, outgoing: 0, missed: 0, blocked: 0, firstDay: r.day, lastDay: r.day }
      map.set(r.number, f)
    }
    f.count += callsOf(r)
    f.totalSec += r.talkInSec + r.talkOutSec
    f.incoming += r.incoming
    f.outgoing += r.outgoing
    f.missed += r.missed + r.rejected
    f.blocked += r.blocked
    f.firstDay = Math.min(f.firstDay, r.day)
    f.lastDay = Math.max(f.lastDay, r.day)
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.totalSec - a.totalSec)
}

/** Ngày (số ngày từ 1970) → ISO lúc 12:00 trưa giờ máy, để định dạng ngày. */
export function dayToIso(day: number): string {
  const utc = new Date(day * DAY)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), 12).toISOString()
}

export interface DayBucket {
  label: string
  count: number
}

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/** Số cuộc gọi mỗi ngày trong `days` ngày gần nhất (cũ → mới). */
export function callsPerDay(rows: StatsRow[], days: number, today: number): DayBucket[] {
  const counts = new Map<number, number>()
  for (const r of rows) counts.set(r.day, (counts.get(r.day) ?? 0) + callsOf(r))
  const out: DayBucket[] = []
  for (let d = today - days + 1; d <= today; d++) {
    const utc = new Date(d * DAY)
    const label = days <= 7 ? (WEEKDAY_SHORT[utc.getUTCDay()] ?? '') : `${utc.getUTCDate()}/${utc.getUTCMonth() + 1}`
    out.push({ label, count: counts.get(d) ?? 0 })
  }
  return out
}

export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Số cuộc gọi theo thứ trong tuần, chỉ số 0 = Thứ 2 … 6 = Chủ nhật (1970-01-01 là Thứ 5). */
export function weekdayHistogram(rows: StatsRow[]): number[] {
  const h = [0, 0, 0, 0, 0, 0, 0]
  for (const r of rows) h[(((r.day + 3) % 7) + 7) % 7]! += callsOf(r)
  return h
}

export interface WeekBucket {
  incoming: number
  outgoing: number
  total: number
}

/** `weeks` tuần gần nhất (cũ → mới); tuần cuối kết thúc hôm nay. */
export function weeklyCounts(rows: StatsRow[], weeks: number, today: number): WeekBucket[] {
  const out: WeekBucket[] = Array.from({ length: weeks }, () => ({ incoming: 0, outgoing: 0, total: 0 }))
  for (const r of rows) {
    const age = Math.floor((today - r.day) / 7)
    const i = weeks - 1 - age
    if (age < 0 || i < 0) continue
    out[i]!.incoming += inTotal(r)
    out[i]!.outgoing += r.outgoing
    out[i]!.total += callsOf(r)
  }
  return out
}

/** Phân bổ rủi ro (tại lúc gọi) của các cuộc gọi đến. */
export function riskBreakdown(rows: StatsRow[]): Record<RiskLevel, number> {
  const r: Record<RiskLevel, number> = { safe: 0, unknown: 0, spam: 0, scam: 0 }
  for (const x of rows) {
    r.unknown += x.riskUnknown
    r.spam += x.riskSpam
    r.scam += x.riskScam
    r.safe += Math.max(0, inTotal(x) - x.riskUnknown - x.riskSpam - x.riskScam)
  }
  return r
}

/** Tổng thời lượng theo hướng gọi. */
export function durationByDirection(rows: StatsRow[]): { total: number; incoming: number; outgoing: number } {
  let incoming = 0
  let outgoing = 0
  for (const r of rows) {
    incoming += r.talkInSec
    outgoing += r.talkOutSec
  }
  return { total: incoming + outgoing, incoming, outgoing }
}

/** Cuộc gọi đi: được nghe máy / không nghe. */
export function outgoingAnswered(rows: StatsRow[]): { answered: number; not: number } {
  let answered = 0
  let total = 0
  for (const r of rows) {
    answered += r.answeredOut
    total += r.outgoing
  }
  return { answered, not: total - answered }
}

/** Cuộc gọi đến: tổng / đã nghe / nhỡ (+từ chối) / bị chặn. */
export function incomingBreakdown(rows: StatsRow[]): { total: number; answered: number; missed: number; blocked: number } {
  const o = { total: 0, answered: 0, missed: 0, blocked: 0 }
  for (const r of rows) {
    o.total += inTotal(r)
    o.answered += r.incoming
    o.missed += r.missed + r.rejected
    o.blocked += r.blocked
  }
  return o
}

/** Một dòng xếp hạng đã gắn tên / rủi ro hiện tại (để hiển thị). */
export interface RankedNumber extends NumberFreq {
  name?: string
  isContact: boolean
  risk: RiskLevel
  category?: import('@/types').SpamCategory
  /** ISO của ngày gọi gần nhất. */
  lastAt: string
}
