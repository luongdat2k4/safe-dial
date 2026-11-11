import { createI18n } from 'vue-i18n'
import vi from '@/locales/vi.json'

/** Cấu trúc khoá lấy theo vi.json; mọi file ngôn ngữ khác phải có cùng cấu trúc. */
export type MessageSchema = typeof vi

/**
 * Ngôn ngữ hỗ trợ. `code` trùng tên file `src/locales/<code>.json` và cờ `public/assets/flag/<code>.svg`.
 * `native` là tên ngôn ngữ viết bằng chính ngôn ngữ đó (không dịch).
 */
export const LOCALES = [
  { code: 'vi', native: 'Tiếng Việt' },
  { code: 'en', native: 'English' },
  { code: 'zh', native: '中文' },
  { code: 'ja', native: '日本語' },
  { code: 'ko', native: '한국어' },
  { code: 'th', native: 'ไทย' },
  { code: 'id', native: 'Bahasa Indonesia' },
  { code: 'hi', native: 'हिन्दी' },
  { code: 'bn', native: 'বাংলা' },
  { code: 'ur', native: 'اردو', rtl: true },
  { code: 'ar', native: 'العربية', rtl: true },
  { code: 'ru', native: 'Русский' },
  { code: 'tr', native: 'Türkçe' },
  { code: 'fr', native: 'Français' },
  { code: 'de', native: 'Deutsch' },
  { code: 'es', native: 'Español' },
  { code: 'pt', native: 'Português' },
  { code: 'it', native: 'Italiano' },
  { code: 'nl', native: 'Nederlands' },
  { code: 'pl', native: 'Polski' },
] as const

export type Locale = (typeof LOCALES)[number]['code']

export const DEFAULT_LOCALE: Locale = 'vi'

export function isLocale(v: unknown): v is Locale {
  return LOCALES.some((l) => l.code === v)
}

export function flagUrl(code: Locale): string {
  return `${import.meta.env.BASE_URL}assets/flag/${code}.svg`
}

/**
 * Bản dịch nằm trong `src/locales/<locale>.json`, được @intlify/unplugin-vue-i18n biên dịch sẵn lúc build.
 * Tiếng Việt nạp sẵn (cũng là ngôn ngữ dự phòng); ngôn ngữ khác chỉ tải khi được chọn.
 * Cú pháp: tham số `{ten}`; các ký tự `@ | { } $` là cú pháp của vue-i18n, cần viết `{'@'}` nếu muốn hiện nguyên.
 */
export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { vi } as Record<Locale, MessageSchema>,
  // Thiếu khoá → hiện chính khoá (dễ phát hiện khi test); chỉ cảnh báo ở bản dev.
  missingWarn: import.meta.env.DEV,
  fallbackWarn: import.meta.env.DEV,
})

const loaders = import.meta.glob<{ default: MessageSchema }>(['./locales/*.json', '!./locales/vi.json'])

/** Đổi ngôn ngữ giao diện; tải file dịch nếu chưa có. */
export async function setLocale(code: Locale): Promise<void> {
  if (!isLocale(code)) code = DEFAULT_LOCALE
  if (!i18n.global.availableLocales.includes(code)) {
    const load = loaders[`./locales/${code}.json`]
    if (!load) code = DEFAULT_LOCALE
    else i18n.global.setLocaleMessage(code, (await load()).default)
  }
  i18n.global.locale.value = code
  const el = document.documentElement
  el.lang = code
  el.dir = LOCALES.find((l) => l.code === code && 'rtl' in l) ? 'rtl' : 'ltr'
}
