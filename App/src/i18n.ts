import { createI18n } from 'vue-i18n'
import vi from '@/locales/vi.json'

/** Cấu trúc khoá lấy theo vi.json; ngôn ngữ thêm sau (en.json, ...) phải có cùng cấu trúc. */
export type MessageSchema = typeof vi
export type Locale = 'vi'

/**
 * Bản dịch nằm trong `src/locales/<locale>.json`, được @intlify/unplugin-vue-i18n biên dịch sẵn lúc build.
 * Cú pháp: tham số `{ten}`; các ký tự `@ | { } $` là cú pháp của vue-i18n, cần viết `{'@'}` nếu muốn hiện nguyên.
 */
export const i18n = createI18n<[MessageSchema], Locale>({
  legacy: false,
  locale: 'vi',
  fallbackLocale: 'vi',
  messages: { vi },
  // Thiếu khoá → hiện chính khoá (dễ phát hiện khi test); chỉ cảnh báo ở bản dev.
  missingWarn: import.meta.env.DEV,
  fallbackWarn: import.meta.env.DEV,
})
