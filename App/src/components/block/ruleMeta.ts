import type { BlockReason, BlockRule, BlockRuleKind } from '@/types'
import { COUNTRIES } from '@/utils/countries'
import { formatNumber } from '@/utils/numbers'

export type Tone = 'brand' | 'danger' | 'warn' | 'blue' | 'violet' | 'gray'

export const RULE_KINDS: BlockRuleKind[] = ['number', 'startsWith', 'contains', 'endsWith', 'country']

export const RULE_META: Record<BlockRuleKind, { icon: string; tone: Tone }> = {
  number: { icon: 'phone-off', tone: 'danger' },
  startsWith: { icon: 'arrow-right-to-line', tone: 'warn' },
  contains: { icon: 'asterisk', tone: 'violet' },
  endsWith: { icon: 'arrow-left-to-line', tone: 'blue' },
  country: { icon: 'globe', tone: 'gray' },
}

export const REASON_ICON: Record<BlockReason, string> = {
  private: 'eye-off',
  international: 'globe',
  nonContact: 'user-round-x',
  list: 'ban',
  rule: 'list-filter',
  country: 'flag',
  spammer: 'shield-x',
}

/** Chip màu cho lý do chặn. */
export const REASON_CLASS: Record<BlockReason, string> = {
  private: 'bg-unknown-soft text-unknown',
  international: 'bg-[#e7f0fd] text-outgoing',
  nonContact: 'bg-spam-soft text-spam',
  list: 'bg-scam-soft text-scam',
  rule: 'bg-[#efe8fd] text-blocked',
  country: 'bg-[#efe8fd] text-blocked',
  spammer: 'bg-scam-soft text-scam',
}

/** Giá trị quy tắc để hiển thị: số cụ thể được định dạng, mã quốc gia kèm cờ. */
export function ruleValueText(rule: Pick<BlockRule, 'kind' | 'value'>, homeDial: string): string {
  if (rule.kind === 'number') return formatNumber(rule.value, homeDial)
  if (rule.kind === 'country') {
    const c = COUNTRIES.find((x) => x.dial === rule.value)
    return c ? `${c.flag} ${c.name} (${c.dial})` : rule.value
  }
  return rule.value
}
