/**
 * Giải thích từng bước của bộ máy chặn. Quyết định cuối cùng LUÔN là `decideCall`;
 * các bước chỉ là bản diễn giải để hiển thị nên không thể lệch với bộ máy thật.
 */
import type { BlockReason } from '@/types'
import { TOP_SPAMMER_MIN_REPORTS, decideCall, ruleMatches, type Decision, type DecisionContext, type DecisionInput } from './blockEngine'
import { t } from '@/composables/useT'

export type TraceStepId = 'private' | 'international' | 'nonContact' | 'list' | 'rule' | 'spammer'

export interface TraceStep {
  id: TraceStepId
  label: string
  /** Công tắc của bước này đang bật (bước danh sách / quy tắc luôn bật). */
  enabled: boolean
  /** Điều kiện của bước khớp với số này. */
  matched: boolean
  /** Bước này chính là bước quyết định (bộ máy dừng tại đây). */
  decisive: boolean
  /** Bộ máy có chạy tới bước này không (false = đã dừng ở bước trước). */
  reached: boolean
  detail: string
}

export interface Trace {
  steps: TraceStep[]
  decision: Decision
}

const ORDER: TraceStepId[] = ['private', 'international', 'nonContact', 'list', 'rule', 'spammer']

const REASON_TO_STEP: Record<BlockReason, TraceStepId> = {
  private: 'private',
  international: 'international',
  nonContact: 'nonContact',
  list: 'list',
  rule: 'rule',
  country: 'rule',
  spammer: 'spammer',
}

export function traceCall(input: DecisionInput, ctx: DecisionContext): Trace {
  const { settings, rules, homeDial } = ctx
  const decision = decideCall(input, ctx)
  const intl = !!input.number && input.number.startsWith('+') && !input.number.startsWith(homeDial)
  const numberRules = rules.filter((r) => r.kind === 'number')
  const patternRules = rules.filter((r) => r.kind !== 'number')
  const exact = numberRules.find((r) => ruleMatches(r, input.number, homeDial))
  const pattern = patternRules.find((r) => ruleMatches(r, input.number, homeDial))
  const risky =
    !!input.profile &&
    (input.profile.risk === 'spam' || input.profile.risk === 'scam') &&
    input.profile.reportCount >= TOP_SPAMMER_MIN_REPORTS

  const raw: Record<TraceStepId, { enabled: boolean; matched: boolean; detail: string }> = {
    private: {
      enabled: settings.blockPrivate,
      matched: settings.blockPrivate && !input.number,
      detail: !input.number ? t('block.trace.detail.privateYes') : t('block.trace.detail.privateNo'),
    },
    international: {
      enabled: settings.blockInternational,
      matched: settings.blockInternational && intl && !input.isContact,
      detail: !intl
        ? t('block.trace.detail.intlNo', { dial: homeDial })
        : input.isContact
          ? t('block.trace.detail.intlContact')
          : t('block.trace.detail.intlYes'),
    },
    nonContact: {
      enabled: settings.blockNonContacts,
      matched: settings.blockNonContacts && !input.isContact,
      detail: input.isContact ? t('block.trace.detail.contactYes') : t('block.trace.detail.contactNo'),
    },
    list: {
      enabled: true,
      matched: !!exact,
      detail: exact
        ? t('block.trace.detail.listYes', { name: exact.label ?? exact.value })
        : t('block.trace.detail.listNo', { n: numberRules.length }),
    },
    rule: {
      enabled: true,
      matched: !input.isContact && !!pattern,
      detail: input.isContact
        ? t('block.trace.detail.ruleContact')
        : pattern
          ? t('block.trace.detail.ruleYes', { kind: t(`common.ruleKind.${pattern.kind}`), value: pattern.value })
          : t('block.trace.detail.ruleNo', { n: patternRules.length }),
    },
    spammer: {
      enabled: settings.blockTopSpammers,
      matched: settings.blockTopSpammers && !input.isContact && risky,
      detail: risky
        ? t('block.trace.detail.spamYes', { n: input.profile?.reportCount ?? 0 })
        : t('block.trace.detail.spamNo'),
    },
  }

  const decisiveId = decision.reason ? REASON_TO_STEP[decision.reason] : null
  const decisiveIdx = decisiveId ? ORDER.indexOf(decisiveId) : -1

  const steps = ORDER.map(
    (id, i): TraceStep => ({
      id,
      label: t(`block.trace.steps.${id}`),
      ...raw[id],
      decisive: i === decisiveIdx,
      reached: decisiveIdx === -1 || i <= decisiveIdx,
    }),
  )
  return { steps, decision }
}
