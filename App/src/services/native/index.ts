import { Capacitor, registerPlugin } from '@capacitor/core'
import type { NativeDecision, SafeDialPlugin } from './definitions'

/** Phương thức chỉ có ở bản web (giả lập cuộc gọi đến). */
export interface SafeDialWebExtras {
  simulateIncoming(opts: { number: string }): Promise<{ decision: NativeDecision; rang: boolean }>
  resetDemo(): Promise<void>
}

/**
 * Plugin SafeDial: trên Android là code native (SQLite, CallLog, ContactsContract,
 * BlockedNumberContract, Telecom); trên trình duyệt là bản giả lập dùng dữ liệu mẫu.
 */
// Capacitor gọi loader mỗi lần có lời gọi đồng thời trước khi nạp xong → phải dùng một instance duy nhất,
// nếu không listener (callState…) sẽ gắn vào instance khác với instance phát sự kiện.
let webImpl: Promise<import('./web').SafeDialWeb> | undefined
export const SafeDial = registerPlugin<SafeDialPlugin & Partial<SafeDialWebExtras>>('SafeDial', {
  web: () => (webImpl ??= import('./web').then((m) => new m.SafeDialWeb())),
})

/** Đang chạy trên máy thật (dữ liệu thật) hay bản giả lập trên trình duyệt. */
export const isNative = Capacitor.isNativePlatform()

export * from './definitions'
