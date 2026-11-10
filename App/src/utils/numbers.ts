import { countryOf } from './countries'

/** Giữ lại chữ số và dấu + (cách chuẩn hoá số khi so khớp quy tắc chặn). */
export function normalizeNumber(raw: string): string {
  return raw.replace(/[^+0-9]/g, '')
}

/** Chuyển số người dùng nhập về dạng E.164 (mặc định theo quốc gia của máy). */
export function toE164(raw: string, homeDial = '+84'): string {
  const n = normalizeNumber(raw)
  if (!n) return ''
  if (n.startsWith('+')) return n
  if (n.startsWith('00')) return '+' + n.slice(2)
  if (n.startsWith('0')) return homeDial + n.slice(1)
  return n
}

/** Dạng quốc gia (có số 0 đầu) nếu số thuộc nước của máy, ngược lại trả về E.164. */
export function nationalForm(e164: string, homeDial = '+84'): string {
  return e164.startsWith(homeDial) ? '0' + e164.slice(homeDial.length) : e164
}

function group(digits: string, sizes: number[]): string {
  const parts: string[] = []
  let i = 0
  for (const s of sizes) {
    if (i >= digits.length) break
    parts.push(digits.slice(i, i + s))
    i += s
  }
  if (i < digits.length) parts.push(digits.slice(i))
  return parts.join(' ')
}

/** Định dạng hiển thị: số trong nước 0901 234 567, số quốc tế +1 202 555 0101. */
export function formatNumber(e164: string, homeDial = '+84'): string {
  if (!e164) return 'Số ẩn'
  if (e164.startsWith(homeDial)) {
    const local = nationalForm(e164, homeDial)
    if (local.length === 10) return group(local, [4, 3, 3])
    if (local.length === 11) return group(local, [3, 4, 4])
    return group(local, [4, 3, 4])
  }
  const c = countryOf(e164)
  if (c) return `${c.dial} ${group(e164.slice(c.dial.length), [3, 3, 4])}`
  return e164
}

/** Kiểm tra thô độ dài số cho UI. */
export function isPlausibleNumber(raw: string): boolean {
  const d = normalizeNumber(raw).replace(/^\+/, '')
  return d.length >= 8 && d.length <= 15
}
