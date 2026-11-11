/**
 * Định dạng ngày giờ, thời lượng, số theo ngôn ngữ giao diện đang chọn (Intl của trình duyệt):
 * vd. 16:38 / 4:38 PM, "Hôm nay" / "Today" / "今日", "2 giờ 41 phút" / "2 hr 41 min".
 * Đọc locale từ vue-i18n nên template tự cập nhật khi đổi ngôn ngữ.
 */
import { i18n } from '@/i18n'

const pad = (n: number) => String(n).padStart(2, '0')
const locale = () => i18n.global.locale.value

/** Bộ định dạng Intl được tạo một lần cho mỗi (loại, ngôn ngữ). */
const cache = new Map<string, unknown>()
function cached<T>(kind: string, make: (loc: string) => T): T {
  const loc = locale()
  const k = `${kind}|${loc}`
  let f = cache.get(k) as T | undefined
  if (!f) {
    f = make(loc)
    cache.set(k, f)
  }
  return f
}

const timeFmt = () => cached('time', (l) => new Intl.DateTimeFormat(l, { hour: 'numeric', minute: '2-digit' }))
const dateFmt = () => cached('date', (l) => new Intl.DateTimeFormat(l, { day: '2-digit', month: '2-digit', year: 'numeric' }))
const relDayFmt = () => cached('relday', (l) => new Intl.RelativeTimeFormat(l, { numeric: 'auto' }))
const unitFmt = (unit: 'hour' | 'minute' | 'second') =>
  cached(`unit-${unit}`, (l) => new Intl.NumberFormat(l, { style: 'unit', unit, unitDisplay: 'short' }))
const unitList = () => cached('unitlist', (l) => new Intl.ListFormat(l, { type: 'unit', style: 'narrow' }))
const compactFmt = () => cached('compact', (l) => new Intl.NumberFormat(l, { notation: 'compact', maximumFractionDigits: 1 }))

/** Giờ:phút theo thói quen của ngôn ngữ (24 giờ hoặc AM/PM). */
export function formatTime(iso: string): string {
  return timeFmt().format(new Date(iso))
}

/** Ngày dạng số theo thứ tự của ngôn ngữ (vd. 07/11/2026, 11/07/2026, 2026/11/07). */
export function formatDate(iso: string): string {
  return dateFmt().format(new Date(iso))
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Nhãn nhóm theo ngày: Hôm nay / Hôm qua (theo ngôn ngữ) hoặc ngày dạng số. */
export function dayLabel(iso: string, now = new Date()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)
  if (diff === 0 || diff === 1) {
    const s = relDayFmt().format(-diff, 'day')
    return s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1)
  }
  return formatDate(iso)
}

/** 125 → "2 phút 5 giây" / "2 min 5 sec"; từ 1 giờ trở lên chỉ hiện giờ và phút. */
export function formatDuration(sec: number): string {
  sec = Math.max(0, Math.round(sec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts: string[] = []
  if (h > 0) {
    parts.push(unitFmt('hour').format(h))
    if (m > 0) parts.push(unitFmt('minute').format(m))
  } else if (m > 0) {
    parts.push(unitFmt('minute').format(m))
    if (s > 0) parts.push(unitFmt('second').format(s))
  } else {
    parts.push(unitFmt('second').format(s))
  }
  return unitList().format(parts)
}

/** 125 -> "02:05" (đồng hồ trong cuộc gọi, giống nhau ở mọi ngôn ngữ). */
export function formatClock(sec: number): string {
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`
}

/** 1500 → "1,5K" / "1.5K" / "1500" tuỳ ngôn ngữ. */
export function formatCount(n: number): string {
  return compactFmt().format(n)
}

/** Thứ, ngày tháng dài (vd. "Thứ Ba, 10 tháng 11" / "Tuesday, November 10"). */
export function formatLongDay(d = new Date()): string {
  return cached('longday', (l) => new Intl.DateTimeFormat(l, { weekday: 'long', day: 'numeric', month: 'long' })).format(d)
}
