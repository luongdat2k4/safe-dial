import { vi } from '@/locales/vi'

type Params = Record<string, string | number>

function lookup(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Dịch chuỗi theo khoá dạng `khu_vuc.nhom.khoa`, hỗ trợ tham số `{ten}`.
 * Khoá thiếu trả về chính khoá để dễ phát hiện khi test.
 */
export function t(key: string, params?: Params): string {
  const raw = lookup(vi, key)
  if (typeof raw !== 'string') return key
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
}

export function useT() {
  return { t }
}
