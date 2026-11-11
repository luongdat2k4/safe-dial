import { i18n } from '@/i18n'

type Params = Record<string, string | number>

/**
 * Dịch chuỗi theo khoá dạng `khu_vuc.nhom.khoa` (xem src/locales/vi.json), hỗ trợ tham số `{ten}`.
 * Dùng được cả ngoài component (store, utils). Trong component có thể dùng `useI18n()` / `$t`.
 * Khoá thiếu trả về chính khoá để dễ phát hiện khi test.
 */
export function t(key: string, params?: Params): string {
  return params ? i18n.global.t(key, params) : i18n.global.t(key)
}

export function useT() {
  return { t }
}
