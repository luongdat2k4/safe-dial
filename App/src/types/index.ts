/** Mức độ rủi ro của một số điện thoại. */
export type RiskLevel = 'safe' | 'unknown' | 'spam' | 'scam'

/** Nhóm báo cáo do cộng đồng gán cho số điện thoại. */
export type SpamCategory =
  | 'scam'
  | 'spam'
  | 'loan'
  | 'robocall'
  | 'fakeJob'
  | 'telemarketing'
  | 'impersonation'

export type CallType = 'incoming' | 'outgoing' | 'missed' | 'blocked'

/** Vì sao một cuộc gọi bị chặn / tắt chuông (thứ tự trùng với `decideCall`). */
export type BlockReason =
  | 'private'
  | 'international'
  | 'nonContact'
  | 'list'
  | 'rule'
  | 'country'
  | 'spammer'

export interface Contact {
  id: string
  name: string
  /** Số ở dạng E.164, ví dụ +84901234567 */
  numbers: string[]
  favorite: boolean
  note?: string
  group?: string
}

export interface CallLogEntry {
  id: string
  /** E.164. Chuỗi rỗng = số ẩn / private. */
  number: string
  name?: string
  contactId?: string
  type: CallType
  /** ISO 8601 */
  startedAt: string
  durationSec: number
  risk: RiskLevel
  category?: SpamCategory
  reportCount: number
  blockedReason?: BlockReason
  simSlot?: 1 | 2
}

/** Kết quả tra cứu một số (cơ sở dữ liệu cộng đồng giả lập). */
export interface NumberProfile {
  number: string
  name?: string
  risk: RiskLevel
  category?: SpamCategory
  reportCount: number
  location?: string
  carrier?: string
  /** Gợi ý tên do người dùng đóng góp. */
  suggestedNames?: string[]
}

export type BlockRuleKind = 'number' | 'startsWith' | 'contains' | 'endsWith' | 'country'

export interface BlockRule {
  id: string
  kind: BlockRuleKind
  /** Chỉ gồm chữ số và dấu +. Với `country` là mã quay số, ví dụ +234. */
  value: string
  label?: string
  createdAt: string
}

export type BlockMethod = 'hangup' | 'silent'

export interface BlockSettings {
  blockTopSpammers: boolean
  blockPrivate: boolean
  blockInternational: boolean
  blockNonContacts: boolean
  method: BlockMethod
  notifyOnBlock: boolean
}

export type PopupSize = 'classic' | 'full'
export type PopupPosition = 'top' | 'center' | 'bottom'
export type DialSound = 'silent' | 'vibrate' | 'sound' | 'both'
export type SimChoice = 'ask' | 'sim1' | 'sim2'

export interface AppSettings {
  onboardingDone: boolean
  permissionsDone: boolean
  language: 'vi' | 'en'
  homeCountryDial: string
  callerIdEnabled: boolean
  showForContacts: boolean
  showAfterCall: boolean
  scamWarning: boolean
  popupSize: PopupSize
  popupPosition: PopupPosition
  callAlertNotification: boolean
  missedCallNotification: boolean
  remindMissedCalls: boolean
  dialSound: DialSound
  ringtone: string
  defaultSim: SimChoice
}

export interface CallerInfo {
  number: string
  name?: string
  isContact: boolean
  profile?: NumberProfile
  risk: RiskLevel
}

/** Một kịch bản cuộc gọi đến dùng cho phần mô phỏng. */
export interface CallScenario {
  id: string
  title: string
  description: string
  number: string
  isPrivate?: boolean
}
