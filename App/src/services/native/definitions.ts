/**
 * API của plugin native `SafeDial` (android/.../SafeDialPlugin.java).
 * Số điện thoại luôn ở dạng E.164 có dấu '+'; chuỗi rỗng = số ẩn.
 */
import type { PluginListenerHandle } from '@capacitor/core'
import type { SpamCategory } from '@/types'

export type PermState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
export type PermAlias = 'contacts' | 'callLog' | 'phone' | 'notifications'
export type RiskName = 'safe' | 'unknown' | 'spam' | 'scam'
export type ActionName = 'allowed' | 'warned' | 'silenced' | 'blocked'
export type RuleKindName = 'startsWith' | 'contains' | 'endsWith' | 'country'
export type NativeCallType = 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'blocked'

/** Bit của `reasons` (schema mục 2.1). */
export const REASON = {
  blacklist: 1,
  rule: 2,
  private: 4,
  international: 8,
  nonContact: 16,
  burst: 32,
  rejectedBefore: 64,
  country: 128,
} as const

export interface Status {
  contacts: PermState
  callLog: PermState
  phone: PermState
  notifications: PermState
  dialerRole: boolean
  canBlock: boolean
}

export interface NativeContact {
  id: string
  lookupKey: string
  name: string
  photoUri?: string
  starred: boolean
  numbers: Array<{ raw: string; e164: string; label?: string }>
}

export interface NativeMark {
  number: string
  trusted: boolean
  category?: SpamCategory | null
  name?: string | null
  note?: string | null
  updatedAt: number
}

export interface NumberInfo {
  number: string
  isContact: boolean
  name?: string
  contactId?: number
  starred?: boolean
  photoUri?: string
  blocked: boolean
  mark?: NativeMark
}

export interface CallMeta {
  risk: RiskName
  reasons: number
  action: ActionName
  ruleId?: string
}

export interface NativeCall {
  id: string
  number: string
  name?: string
  type: NativeCallType
  startedAt: number
  durationSec: number
  simSlot?: number
  meta?: CallMeta
}

export interface NativeRule {
  id: string
  kind: RuleKindName
  value: string
  label?: string | null
  enabled: boolean
  hitCount: number
  lastHitAt?: number
  createdAt: number
}

export interface StatsRow {
  day: number
  number: string
  incoming: number
  missed: number
  rejected: number
  blocked: number
  outgoing: number
  answeredOut: number
  talkInSec: number
  talkOutSec: number
  riskUnknown: number
  riskSpam: number
  riskScam: number
  warned: number
}

export interface CallNote {
  id: string
  number: string
  at: number
  note: string
}

export interface DecisionStep {
  id: 'system' | 'trusted' | 'contact' | 'rule' | 'private' | 'international' | 'nonContact' | 'signals'
  state: 'off' | 'pass' | 'match' | 'stopped'
  detail?: string | null
}

export interface NativeDecision {
  number: string
  action: ActionName
  risk: RiskName
  reasons: number
  ruleId?: string
  ruleLabel?: string | null
  category?: SpamCategory | null
  isContact: boolean
  trusted: boolean
  systemBlocked: boolean
  name?: string | null
  steps: DecisionStep[]
}

export interface Sim {
  id: string
  label: string
  slot: number
}

export interface CallSnapshot {
  state: 'ringing' | 'dialing' | 'active' | 'holding' | 'disconnected'
  incoming: boolean
  number: string
  name?: string | null
  muted: boolean
  speaker: boolean
  holding: boolean
  startAt: number
  activeAt?: number
  decision?: NativeDecision
}

export interface EndedCall {
  number: string
  name?: string | null
  type: NativeCallType
  startedAt: number
  durationSec: number
  decision?: NativeDecision
}

export interface LaunchInfo {
  route: string
  number?: string
}

export interface SafeDialPlugin {
  getLaunchState(): Promise<{ launch?: LaunchInfo; call?: CallSnapshot }>
  getStatus(): Promise<Status>
  requestPermissions(opts: { permissions: PermAlias[] }): Promise<Record<PermAlias, PermState>>
  requestDialerRole(): Promise<{ granted: boolean }>

  getSettings(): Promise<{ values: Record<string, unknown> }>
  setSettings(opts: { values: Record<string, unknown> }): Promise<void>

  getContacts(opts?: { query?: string }): Promise<{ contacts: NativeContact[] }>
  setStarred(opts: { contactId: number; starred: boolean }): Promise<void>
  lookupNumber(opts: { number: string }): Promise<NumberInfo>

  getCallLog(opts?: { limit?: number; offset?: number; number?: string; since?: number }): Promise<{ calls: NativeCall[]; granted: boolean }>
  deleteCalls(opts: { ids: string[] }): Promise<void>
  deleteCallsOf(opts: { number: string }): Promise<void>
  clearCallLog(): Promise<void>

  listBlocked(): Promise<{ numbers: string[]; canBlock: boolean }>
  block(opts: { number: string }): Promise<void>
  unblock(opts: { number: string }): Promise<void>

  listMarks(): Promise<{ marks: NativeMark[] }>
  setMark(opts: { number: string; trusted?: boolean; category?: SpamCategory | null; name?: string | null; note?: string | null }): Promise<{ mark?: NativeMark }>

  listRules(): Promise<{ rules: NativeRule[] }>
  addRule(opts: { kind: RuleKindName; value: string; label?: string }): Promise<{ rule: NativeRule }>
  setRuleEnabled(opts: { id: string; enabled: boolean }): Promise<void>
  deleteRule(opts: { id: string }): Promise<void>

  getStats(opts: { fromDay: number; number?: string }): Promise<{ rows: StatsRow[]; today: number }>
  clearStats(): Promise<void>

  listNotes(opts?: { number?: string }): Promise<{ notes: CallNote[] }>
  addNote(opts: { number: string; at: number; note: string }): Promise<{ id: string }>
  deleteNote(opts: { id: string }): Promise<void>

  evaluate(opts: { number: string }): Promise<NativeDecision>

  openSms(opts: { number: string }): Promise<void>
  addContact(opts: { number: string }): Promise<void>

  getSims(): Promise<{ sims: Sim[] }>
  placeCall(opts: { number: string; simId?: string }): Promise<void>
  getCallState(): Promise<{ call?: CallSnapshot; lastEnded?: EndedCall }>
  answer(): Promise<void>
  reject(opts?: { message?: string }): Promise<void>
  hangup(): Promise<void>
  setMuted(opts: { muted: boolean }): Promise<void>
  setSpeaker(opts: { on: boolean }): Promise<void>
  setHold(opts: { hold: boolean }): Promise<void>
  dtmf(opts: { digit: string }): Promise<void>

  addListener(event: 'callState', fn: (s: CallSnapshot) => void): Promise<PluginListenerHandle>
  addListener(event: 'callEnded', fn: (e: EndedCall) => void): Promise<PluginListenerHandle>
  addListener(event: 'launch', fn: (l: LaunchInfo) => void): Promise<PluginListenerHandle>
}
