import type { CallLogEntry, Contact, NumberProfile } from '@/types'
import type { DialerService, ReportInput } from './dialer'
import { CONTACTS, SPAM_DB } from '@/data/seed'

/**
 * Triển khai giả lập. Danh sách cuộc gọi ban đầu do store dựng (cần luật chặn), nên
 * service chỉ giữ bản sao đã được store nạp qua `seedCallLog`.
 */
export function createMockDialerService(initialLog: CallLogEntry[]): DialerService & {
  appendCall(entry: CallLogEntry): void
} {
  let log = [...initialLog]
  let contacts: Contact[] = CONTACTS.map((c) => ({ ...c }))
  const profiles: Record<string, NumberProfile> = { ...SPAM_DB }

  return {
    async getCallLog() {
      return [...log].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    },
    async deleteCallLogs(ids) {
      log = log.filter((e) => !ids.includes(e.id))
    },
    async clearCallLog() {
      log = []
    },
    async getContacts() {
      return contacts.map((c) => ({ ...c }))
    },
    async setFavorite(id, favorite) {
      contacts = contacts.map((c) => (c.id === id ? { ...c, favorite } : c))
    },
    async lookupNumber(e164) {
      return profiles[e164]
    },
    async reportNumber(input: ReportInput) {
      const prev = profiles[input.number]
      const risk = input.category === 'scam' || input.category === 'impersonation' || input.category === 'fakeJob' ? 'scam' : 'spam'
      const next: NumberProfile = {
        ...prev,
        number: input.number,
        risk,
        category: input.category,
        reportCount: (prev?.reportCount ?? 0) + 1,
      }
      profiles[input.number] = next
      return next
    },
    async suggestName(e164, name) {
      const prev = profiles[e164]
      if (prev) prev.suggestedNames = [...(prev.suggestedNames ?? []), name]
    },
    appendCall(entry) {
      log = [entry, ...log]
    },
  }
}
