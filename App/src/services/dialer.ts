/**
 * Cổng giao tiếp với "phần cứng" điện thoại.
 *
 * Toàn bộ app chỉ nói chuyện qua interface `DialerService`. Bản hiện tại là
 * `mockDialerService` (bộ nhớ trong + localStorage). Khi nối với native, viết thêm
 * một implementation dùng plugin Capacitor tự viết (call log, contacts, call screening,
 * default dialer role) rồi thay trong `services/index.ts`.
 */
import type { CallLogEntry, Contact, NumberProfile, SpamCategory } from '@/types'

export interface ReportInput {
  number: string
  category: SpamCategory
  note?: string
}

export interface DialerService {
  getCallLog(): Promise<CallLogEntry[]>
  deleteCallLogs(ids: string[]): Promise<void>
  clearCallLog(): Promise<void>
  getContacts(): Promise<Contact[]>
  setFavorite(contactId: string, favorite: boolean): Promise<void>
  /** Tra cứu số trong cơ sở dữ liệu cộng đồng. */
  lookupNumber(e164: string): Promise<NumberProfile | undefined>
  reportNumber(input: ReportInput): Promise<NumberProfile>
  suggestName(e164: string, name: string): Promise<void>
}
