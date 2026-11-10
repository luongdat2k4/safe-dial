/**
 * Bộ máy quyết định chặn cuộc gọi — thuần TypeScript, không phụ thuộc UI.
 *
 * Thứ tự kiểm tra bám theo phân tích `BlockManager.f` của CallApp
 * (data-scraping/CallApp/logic/02-…): ẩn số → quốc tế → số lạ → danh sách số →
 * quy tắc tiền tố/chứa/đuôi → spam cộng đồng. Danh bạ là "danh sách trắng ngầm"
 * cho các bước quốc tế / số lạ / quy tắc.
 *
 * Khác với bản gốc (đã sửa có chủ đích):
 *  - Quy tắc `startsWith` / `country` được ÁP DỤNG (Trust Call chỉ lưu mà không áp dụng).
 *  - Cuộc gọi bị chặn luôn ghi lại lý do để hiển thị trong lịch sử.
 *  - Số trong danh bạ không bao giờ bị chặn bởi quy tắc mẫu; chỉ danh sách số tường minh
 *    mới chặn được cả số trong danh bạ.
 */
import type {
  BlockMethod,
  BlockReason,
  BlockRule,
  BlockSettings,
  NumberProfile,
  RiskLevel,
} from '@/types'
import { nationalForm, normalizeNumber } from './numbers'

/** Số báo cáo tối thiểu để một số spam/lừa đảo bị chặn tự động ("top spammer"). Dưới ngưỡng chỉ cảnh báo. */
export const TOP_SPAMMER_MIN_REPORTS = 50

export interface DecisionInput {
  /** E.164, chuỗi rỗng nếu số bị ẩn. */
  number: string
  isContact: boolean
  /** Hồ sơ cộng đồng nếu có. */
  profile?: NumberProfile
}

export interface DecisionContext {
  rules: BlockRule[]
  settings: BlockSettings
  /** Mã quay số của nước người dùng, ví dụ +84. */
  homeDial: string
}

export interface Decision {
  action: 'allow' | 'block' | 'silence'
  reason: BlockReason | null
  ruleId?: string
  /** Mô tả ngắn cho người dùng, ví dụ tên quy tắc đã khớp. */
  detail?: string
  /** Mức cảnh báo hiển thị dù cuộc gọi có bị chặn hay không. */
  risk: RiskLevel
}

/** Một quy tắc có khớp số này không (so khớp trên dạng E.164 và dạng quốc gia). */
export function ruleMatches(rule: BlockRule, number: string, homeDial: string): boolean {
  if (!number) return false
  const value = normalizeNumber(rule.value)
  if (!value) return false
  const forms = new Set([number, nationalForm(number, homeDial), number.replace(/^\+/, '')])
  const test = (fn: (f: string) => boolean) => [...forms].some(fn)
  switch (rule.kind) {
    case 'number':
      return test((f) => f === value)
    case 'startsWith':
    case 'country':
      return test((f) => f.startsWith(value))
    case 'contains':
      return test((f) => f.includes(value))
    case 'endsWith':
      return test((f) => f.endsWith(value))
  }
}

export function riskOf(input: DecisionInput): RiskLevel {
  if (input.isContact) return 'safe'
  if (input.profile) return input.profile.risk
  return input.number ? 'unknown' : 'unknown'
}

function isInternational(number: string, homeDial: string): boolean {
  return !!number && number.startsWith('+') && !number.startsWith(homeDial)
}

export function decideCall(input: DecisionInput, ctx: DecisionContext): Decision {
  const { settings, rules, homeDial } = ctx
  const risk = riskOf(input)
  const onBlock: 'block' | 'silence' = methodToAction(settings.method)
  const hit = (reason: BlockReason, extra: Partial<Decision> = {}): Decision => ({
    action: onBlock,
    reason,
    risk,
    ...extra,
  })

  // (1) Số ẩn / private
  if (settings.blockPrivate && !input.number) return hit('private')

  // (2) Quốc tế — danh bạ được miễn
  if (settings.blockInternational && isInternational(input.number, homeDial) && !input.isContact) {
    return hit('international')
  }

  // (3) Không có trong danh bạ (người gọi ẩn cũng tính là không có trong danh bạ)
  if (settings.blockNonContacts && !input.isContact) return hit('nonContact')

  // (4) Danh sách số chặn tường minh — áp dụng cả với số trong danh bạ
  const exact = rules.find((r) => r.kind === 'number' && ruleMatches(r, input.number, homeDial))
  if (exact) return hit('list', { ruleId: exact.id, detail: exact.label ?? exact.value })

  // (5) Quy tắc mẫu (tiền tố / chứa / đuôi / quốc gia) — danh bạ được miễn
  if (!input.isContact) {
    const rule = rules.find((r) => r.kind !== 'number' && ruleMatches(r, input.number, homeDial))
    if (rule) {
      return hit(rule.kind === 'country' ? 'country' : 'rule', {
        ruleId: rule.id,
        detail: rule.label ?? rule.value,
      })
    }
  }

  // (6) Spam cộng đồng
  if (
    settings.blockTopSpammers &&
    !input.isContact &&
    input.profile &&
    (input.profile.risk === 'spam' || input.profile.risk === 'scam') &&
    input.profile.reportCount >= TOP_SPAMMER_MIN_REPORTS
  ) {
    return hit('spammer', { detail: input.profile.category })
  }

  return { action: 'allow', reason: null, risk }
}

function methodToAction(m: BlockMethod): 'block' | 'silence' {
  return m === 'silent' ? 'silence' : 'block'
}

export const REASON_LABEL: Record<BlockReason, string> = {
  private: 'Số ẩn danh',
  international: 'Cuộc gọi quốc tế',
  nonContact: 'Không có trong danh bạ',
  list: 'Có trong danh sách chặn',
  rule: 'Khớp quy tắc chặn',
  country: 'Chặn theo mã quốc gia',
  spammer: 'Báo cáo spam từ cộng đồng',
}
