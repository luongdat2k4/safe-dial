import { AsYouType, parsePhoneNumberFromString, type PhoneNumber } from 'libphonenumber-js/max'
import { t } from '@/composables/useT'

/**
 * Số điện thoại theo quy tắc của từng nước (libphonenumber của Google), không giả định nước nào.
 * `homeDial` là mã quốc gia của máy ("+84", "+81", "+1"…), lấy theo SIM (xem stores/settings).
 */

/** Giữ lại chữ số và dấu + (cách chuẩn hoá số khi so khớp quy tắc chặn). */
export function normalizeNumber(raw: string): string {
  return raw.replace(/[^+0-9]/g, '')
}

const cc = (homeDial: string) => homeDial.replace('+', '')

function valid(p: PhoneNumber | undefined): PhoneNumber | undefined {
  return p && p.isValid() ? p : undefined
}

/** Số hợp lệ (đã có hoặc chưa có mã nước) theo nước của máy; undefined nếu không phải số hợp lệ. */
function parse(n: string, homeDial: string): PhoneNumber | undefined {
  const defaultCallingCode = cc(homeDial)
  if (n.startsWith('+')) {
    // Số quốc tế hợp lệ; không thì có thể là số trong nước bị gắn '+' nhầm ("+981294721", "+0981…").
    return valid(parsePhoneNumberFromString(n)) ?? valid(parsePhoneNumberFromString(n.slice(1), { defaultCallingCode }))
  }
  if (n.startsWith('00')) return valid(parsePhoneNumberFromString('+' + n.slice(2)))
  // Số trong nước (có hoặc thiếu số 0 / tiền tố trung kế), rồi số đã có mã nước nhưng thiếu '+' (84981294721).
  return valid(parsePhoneNumberFromString(n, { defaultCallingCode })) ?? valid(parsePhoneNumberFromString('+' + n))
}

/**
 * Chuyển số về dạng E.164 theo nước của máy. Số không hợp lệ ở mọi nước (đầu số dịch vụ 113, 1800…)
 * giữ nguyên chữ số để vẫn gọi được.
 */
export function toE164(raw: string, homeDial = '+84'): string {
  const n = normalizeNumber(raw)
  if (!n) return ''
  const p = parse(n, homeDial)
  if (p) return p.number
  if (n.startsWith('+')) return n
  if (n.startsWith('00')) return '+' + n.slice(2)
  // Đầu số mới chưa có trong dữ liệu libphonenumber: số 0 đầu vẫn là tiền tố trong nước.
  if (n.startsWith('0') && n.length >= 8) return homeDial + n.slice(1)
  return n
}

/** Số để gõ / gọi trong nước (có tiền tố trung kế như 0) nếu thuộc nước của máy, ngược lại E.164. */
export function nationalForm(e164: string, homeDial = '+84'): string {
  const p = valid(parsePhoneNumberFromString(e164))
  if (p && p.countryCallingCode === cc(homeDial)) return p.format('NATIONAL').replace(/[^0-9]/g, '')
  return e164
}

/** Định dạng hiển thị theo từng nước: số trong nước "0901 234 567", "090-1234-5678"; số nước ngoài "+1 202 555 0101". */
export function formatNumber(e164: string, homeDial = '+84'): string {
  if (!e164) return t('common.privateNumber')
  const p = parsePhoneNumberFromString(e164)
  if (!p || !p.isValid()) return e164
  return p.countryCallingCode === cc(homeDial) ? p.formatNational() : p.formatInternational()
}

/** Số có thể gọi được (độ dài hợp lý theo nước của số / nước của máy). */
export function isPlausibleNumber(raw: string, homeDial = '+84'): boolean {
  const n = normalizeNumber(raw)
  if (!n) return false
  if (parse(n, homeDial)) return true
  const d = n.replace(/^\+/, '')
  return d.length >= 8 && d.length <= 15
}

/** Định dạng trong lúc gõ ở bàn phím số, theo quy tắc của nước của máy ("0981 294 7", "090-1234"). */
export function formatTyping(raw: string, homeDial = '+84'): string {
  if (!raw || /[*#]/.test(raw)) return raw
  return new AsYouType({ defaultCallingCode: cc(homeDial) }).input(raw)
}
