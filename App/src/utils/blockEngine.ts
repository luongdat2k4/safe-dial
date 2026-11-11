/**
 * Bộ quyết định chặn / cảnh báo — bản TypeScript của `CallDecider.java`, chỉ dùng cho
 * bản web/mock. Trên máy thật, quyết định luôn do native thực hiện (plugin `evaluate`).
 * Thứ tự kiểm tra theo schema mục 4: hệ thống chặn → tin cậy → danh bạ → quy tắc →
 * số ẩn → quốc tế → số lạ → dấu hiệu cảnh báo.
 */
import type { BlockReason, RiskLevel, SpamCategory } from '@/types'
import {
  REASON,
  type ActionName,
  type DecisionStep,
  type NativeDecision,
  type NativeMark,
  type NativeRule,
} from '@/services/native/definitions'
import { nationalForm } from './numbers'

export interface DecideSettings {
  blockPrivate: boolean
  blockInternational: boolean
  blockNonContacts: boolean
  method: 'hangup' | 'silent'
  warnInternational: boolean
  warnPrivate: boolean
  burstCount: number
  burstWindowMin: number
}

export interface DecideContext {
  /** Mã quay số có '+', ví dụ '+84'. */
  homeDial: string
  settings: DecideSettings
  rules: NativeRule[]
  isBlocked(e164: string): boolean
  mark(e164: string): NativeMark | undefined
  contactName(e164: string): string | undefined
  callsFrom(e164: string, sinceMs: number): number
  rejectedBefore(e164: string): boolean
}

export function riskOfCategory(c?: SpamCategory | null): RiskLevel {
  if (!c) return 'unknown'
  return c === 'scam' || c === 'fakeJob' || c === 'impersonation' ? 'scam' : 'spam'
}

/** So khớp trên dạng trong nước (0899…) và dạng quốc tế không '+' (84899…). */
export function ruleMatches(rule: Pick<NativeRule, 'kind' | 'value'>, e164: string, homeDial: string): boolean {
  if (!e164) return false
  const v = rule.value.replace(/\D/g, '')
  if (!v) return false
  const digits = e164.replace(/^\+/, '')
  const national = nationalForm(e164, homeDial)
  switch (rule.kind) {
    case 'startsWith':
      return digits.startsWith(v) || national.startsWith(v)
    case 'country':
      return digits.startsWith(v)
    case 'contains':
      return digits.includes(v) || national.includes(v)
    case 'endsWith':
      return digits.endsWith(v)
  }
}

export function decide(e164: string, ctx: DecideContext): NativeDecision {
  const s = ctx.settings
  const steps: DecisionStep[] = []
  const mark = e164 ? ctx.mark(e164) : undefined
  const onBlock: ActionName = s.method === 'silent' ? 'silenced' : 'blocked'
  const base = {
    number: e164,
    category: mark?.category ?? null,
    trusted: !!mark?.trusted,
    isContact: false,
    systemBlocked: false,
    name: mark?.name ?? null,
    steps,
  }
  const done = (action: ActionName, risk: RiskLevel, reasons: number, extra: Partial<NativeDecision> = {}): NativeDecision => ({
    ...base,
    action,
    risk,
    reasons,
    ...extra,
  })

  if (ctx.isBlocked(e164)) {
    steps.push({ id: 'system', state: 'match' })
    return done('blocked', mark?.category ? riskOfCategory(mark.category) : 'spam', REASON.blacklist, { systemBlocked: true })
  }
  steps.push({ id: 'system', state: 'pass' })

  if (mark?.trusted) {
    steps.push({ id: 'trusted', state: 'match' })
    return done('allowed', 'safe', 0)
  }
  steps.push({ id: 'trusted', state: 'pass' })

  const contact = e164 ? ctx.contactName(e164) : undefined
  if (contact) {
    steps.push({ id: 'contact', state: 'match', detail: contact })
    return done('allowed', 'safe', 0, { isContact: true, name: contact })
  }
  steps.push({ id: 'contact', state: 'pass' })

  const rule = e164 ? ctx.rules.find((r) => r.enabled && ruleMatches(r, e164, ctx.homeDial)) : undefined
  if (rule) {
    const label = rule.label ?? rule.value
    steps.push({ id: 'rule', state: 'match', detail: label })
    return done(onBlock, 'spam', rule.kind === 'country' ? REASON.country : REASON.rule, { ruleId: rule.id, ruleLabel: label })
  }
  steps.push({ id: 'rule', state: 'pass' })

  const hidden = !e164
  if (hidden && s.blockPrivate) {
    steps.push({ id: 'private', state: 'match' })
    return done(onBlock, 'unknown', REASON.private | REASON.nonContact)
  }
  steps.push({ id: 'private', state: s.blockPrivate ? 'pass' : 'off' })

  const intl = !!e164 && !e164.startsWith(ctx.homeDial)
  if (intl && s.blockInternational) {
    steps.push({ id: 'international', state: 'match' })
    return done(onBlock, 'unknown', REASON.international | REASON.nonContact)
  }
  steps.push({ id: 'international', state: s.blockInternational ? 'pass' : 'off' })

  if (s.blockNonContacts) {
    steps.push({ id: 'nonContact', state: 'match' })
    return done(onBlock, 'unknown', REASON.nonContact)
  }
  steps.push({ id: 'nonContact', state: 'off' })

  let reasons: number = REASON.nonContact
  if (intl && s.warnInternational) reasons |= REASON.international
  if (hidden && s.warnPrivate) reasons |= REASON.private
  if (e164) {
    if (ctx.callsFrom(e164, Date.now() - s.burstWindowMin * 60_000) + 1 >= s.burstCount) reasons |= REASON.burst
    if (ctx.rejectedBefore(e164)) reasons |= REASON.rejectedBefore
  }
  const risk = mark?.category ? riskOfCategory(mark.category) : 'unknown'
  const warn = (reasons & ~REASON.nonContact) !== 0 || risk === 'spam' || risk === 'scam'
  steps.push({ id: 'signals', state: warn ? 'match' : 'pass' })
  return done(warn ? 'warned' : 'allowed', risk, reasons)
}

/** Lý do hiển thị cho cuộc gọi bị chặn (từ bitmask `reasons`). */
export function reasonFromBits(bits: number): BlockReason | undefined {
  if (bits & REASON.blacklist) return 'list'
  if (bits & REASON.country) return 'country'
  if (bits & REASON.rule) return 'rule'
  if (bits & REASON.private) return 'private'
  if (bits & REASON.international) return 'international'
  if (bits & REASON.nonContact) return 'nonContact'
  return undefined
}

/** Các dấu hiệu cảnh báo (để hiển thị), không gồm "không có trong danh bạ". */
export function signalsFromBits(bits: number): Array<'international' | 'private' | 'burst' | 'rejectedBefore'> {
  const out: Array<'international' | 'private' | 'burst' | 'rejectedBefore'> = []
  if (bits & REASON.international) out.push('international')
  if (bits & REASON.private) out.push('private')
  if (bits & REASON.burst) out.push('burst')
  if (bits & REASON.rejectedBefore) out.push('rejectedBefore')
  return out
}

export const REASON_LABEL: Record<BlockReason, string> = {
  private: 'Số ẩn danh',
  international: 'Cuộc gọi quốc tế',
  nonContact: 'Không có trong danh bạ',
  list: 'Có trong danh sách chặn',
  rule: 'Khớp quy tắc chặn',
  country: 'Chặn theo mã quốc gia',
}
