/** Mức độ rủi ro của một số điện thoại. */
export type RiskLevel = 'safe' | 'unknown' | 'spam' | 'scam'

/** Loại mà người dùng đánh dấu cho một số (lưu trong `number_marks.category`). */
export type SpamCategory =
  | 'scam'
  | 'spam'
  | 'loan'
  | 'robocall'
  | 'fakeJob'
  | 'telemarketing'
  | 'impersonation'

/** Loại cuộc gọi hiển thị. Cuộc gọi bị từ chối (`rejected` của Android) hiển thị như cuộc gọi nhỡ. */
export type CallType = 'incoming' | 'outgoing' | 'missed' | 'blocked'

/** Vì sao một cuộc gọi bị chặn / tắt chuông (suy ra từ bitmask `call_meta.reasons`). */
export type BlockReason = 'private' | 'international' | 'nonContact' | 'list' | 'rule' | 'country'

/** Hành động đã áp dụng cho cuộc gọi đến (`call_meta.action`). */
export type CallAction = 'allowed' | 'warned' | 'silenced' | 'blocked'

export interface Contact {
  /** ContactsContract._ID (dạng chuỗi). */
  id: string
  name: string
  /** Số ở dạng E.164, ví dụ +84901234567 */
  numbers: string[]
  /** Contacts.STARRED */
  favorite: boolean
  photoUri?: string
  group?: string
}

export interface CallLogEntry {
  id: string
  /** E.164. Chuỗi rỗng = số ẩn / private. */
  number: string
  /** Tên trong danh bạ (CACHED_NAME) hoặc tên tự đặt. */
  name?: string
  isContact: boolean
  type: CallType
  /** ISO 8601 */
  startedAt: string
  durationSec: number
  /** Rủi ro hiển thị: đánh dấu hiện tại của người dùng, nếu không có thì rủi ro lúc gọi. */
  risk: RiskLevel
  category?: SpamCategory
  /** Có bản ghi `call_meta`. */
  action?: CallAction
  reasons?: number
  blockedReason?: BlockReason
  simSlot?: number
}

/** Thông tin riêng của người dùng về một số (`number_marks`). */
export interface NumberMark {
  number: string
  trusted: boolean
  category?: SpamCategory
  name?: string
  note?: string
  updatedAt: number
}

export type BlockRuleKind = 'startsWith' | 'contains' | 'endsWith' | 'country'

export interface BlockRule {
  id: string
  kind: BlockRuleKind
  /** Chỉ chữ số. Với `country` là mã quay số không '+', ví dụ 234. */
  value: string
  label?: string
  enabled: boolean
  hitCount: number
  lastHitAt?: number
  createdAt: number
}

export type BlockMethod = 'hangup' | 'silent'

export interface BlockSettings {
  blockPrivate: boolean
  blockInternational: boolean
  blockNonContacts: boolean
  method: BlockMethod
  notifyOnBlock: boolean
  /** Đánh dấu lừa đảo/spam thì thêm luôn vào danh sách chặn, không hỏi lại. */
  autoBlockReported: boolean
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

/** Mọi thứ app biết về một số tại thời điểm hiện tại. */
export interface CallerInfo {
  number: string
  name?: string
  isContact: boolean
  contactId?: string
  starred?: boolean
  blocked: boolean
  mark?: NumberMark
  risk: RiskLevel
}

/** Một kịch bản cuộc gọi đến dùng cho phần mô phỏng (chỉ bản web/demo). */
export interface CallScenario {
  id: string
  title: string
  description: string
  number: string
  isPrivate?: boolean
}
