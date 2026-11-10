/** Số ẩn không có E.164 nên dùng từ khoá `hidden` trên URL. */
const HIDDEN = 'hidden'

export const numberPath = (e164: string, sub: '' | 'history' | 'stats' = ''): string =>
  `/number/${encodeURIComponent(e164 || HIDDEN)}${sub ? `/${sub}` : ''}`

/** Đọc tham số `:number` của route về E.164 (chuỗi rỗng = số ẩn). */
export const parseNumberParam = (p: unknown): string => {
  const s = decodeURIComponent(String(p ?? ''))
  return s === HIDDEN ? '' : s
}
