/**
 * Kịch bản cho màn "Mô phỏng cuộc gọi đến": dữ liệu giả, kết quả định sẵn, không phụ thuộc
 * danh bạ / danh sách chặn / quy tắc của người dùng. Chỉ để xem giao diện cuộc gọi đến.
 */
import type { CallerInfo, RiskLevel, SpamCategory } from '@/types'
import { REASON, type ActionName, type NativeDecision } from '@/services/native/definitions'
import { t } from '@/composables/useT'

export interface FakeScenario {
  id: string
  title: string
  description: string
  number: string
  isPrivate: boolean
  info: CallerInfo
  decision: NativeDecision
}

interface Spec {
  id: 'blocked' | 'marked' | 'rule' | 'contact' | 'trusted' | 'unknown' | 'intl' | 'hidden'
  number: string
  name?: string
  isContact?: boolean
  trusted?: boolean
  blocked?: boolean
  category?: SpamCategory
  risk: RiskLevel
  action: ActionName
  reasons: number
  ruleLabel?: string
  params?: Record<string, string>
}

const SPECS: Spec[] = [
  { id: 'blocked', number: '+84900000111', blocked: true, category: 'impersonation', risk: 'scam', action: 'blocked', reasons: REASON.blacklist },
  { id: 'marked', number: '+84977000333', category: 'scam', risk: 'scam', action: 'warned', reasons: REASON.nonContact },
  { id: 'rule', number: '+84899123456', category: 'loan', risk: 'spam', action: 'blocked', reasons: REASON.rule, ruleLabel: '0899', params: { rule: '0899' } },
  { id: 'contact', number: '+84901000001', name: 'Minh Anh', isContact: true, risk: 'safe', action: 'allowed', reasons: 0, params: { name: 'Minh Anh' } },
  { id: 'trusted', number: '+84909555777', name: 'Shipper', trusted: true, risk: 'safe', action: 'allowed', reasons: 0 },
  { id: 'unknown', number: '+84977123456', risk: 'unknown', action: 'allowed', reasons: REASON.nonContact },
  { id: 'intl', number: '+6591234567', risk: 'unknown', action: 'warned', reasons: REASON.international | REASON.nonContact },
  { id: 'hidden', number: '', risk: 'unknown', action: 'warned', reasons: REASON.private },
]

/** Tạo danh sách kịch bản (tiêu đề / mô tả theo ngôn ngữ hiện tại). */
export function fakeScenarios(): FakeScenario[] {
  return SPECS.map((s) => {
    const mark =
      s.category || s.trusted
        ? { number: s.number, trusted: !!s.trusted, category: s.category, name: s.isContact ? undefined : s.name, updatedAt: 0 }
        : undefined
    return {
      id: s.id,
      title: t(`call.simulate.live.${s.id}.title`),
      description: t(`call.simulate.live.${s.id}.desc`, s.params),
      number: s.number,
      isPrivate: !s.number,
      info: {
        number: s.number,
        name: s.name,
        isContact: !!s.isContact,
        blocked: !!s.blocked,
        mark,
        risk: s.risk,
      },
      decision: {
        number: s.number,
        action: s.action,
        risk: s.risk,
        reasons: s.reasons,
        ruleLabel: s.ruleLabel ?? null,
        category: s.category ?? null,
        isContact: !!s.isContact,
        trusted: !!s.trusted,
        systemBlocked: !!s.blocked,
        name: s.name ?? null,
        steps: [],
      },
    }
  })
}
