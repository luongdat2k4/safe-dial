const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Nhãn nhóm theo ngày: Hôm nay / Hôm qua / dd/MM/yyyy. */
export function dayLabel(iso: string, now = new Date()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)
  if (diff === 0) return 'Hôm nay'
  if (diff === 1) return 'Hôm qua'
  return formatDate(iso)
}

/** 125 -> "2 phút 05 giây". */
export function formatDuration(sec: number): string {
  if (sec <= 0) return '0 giây'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h} giờ ${pad(m)} phút`
  if (m > 0) return `${m} phút ${pad(s)} giây`
  return `${s} giây`
}

/** 125 -> "02:05" (đồng hồ trong cuộc gọi). */
export function formatClock(sec: number): string {
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`
}

export function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n)
}
