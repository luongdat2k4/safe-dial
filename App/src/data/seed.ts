/**
 * Dữ liệu giả lập cho bản web / test UI (không dùng trên máy thật).
 * Tất cả số điện thoại đều là số hư cấu.
 */
import type { CallScenario, Contact, SpamCategory } from '@/types'

export const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Mẹ', numbers: ['+84901000001'], favorite: true, group: 'Gia đình' },
  { id: 'c2', name: 'Ba', numbers: ['+84901000002'], favorite: true, group: 'Gia đình' },
  { id: 'c3', name: 'Anh Hùng (công ty)', numbers: ['+84902000003'], favorite: false, group: 'Công việc' },
  { id: 'c4', name: 'Chị Lan Kế toán', numbers: ['+84903000004'], favorite: false, group: 'Công việc' },
  { id: 'c5', name: 'Bác sĩ Minh', numbers: ['+84904000005'], favorite: true, group: 'Sức khoẻ' },
  { id: 'c6', name: 'Cô Thảo', numbers: ['+84905000006', '+842838000006'], favorite: false },
  { id: 'c7', name: 'Dũng bạn thân', numbers: ['+84906000007'], favorite: true, group: 'Bạn bè' },
  { id: 'c8', name: 'Giao hàng Khoa', numbers: ['+84907000008'], favorite: false },
  { id: 'c9', name: 'Hà Linh', numbers: ['+84908000009'], favorite: false, group: 'Bạn bè' },
  { id: 'c10', name: 'Khách sạn Biển Xanh', numbers: ['+842583000010'], favorite: false },
  { id: 'c11', name: 'Ngân hàng (CSKH)', numbers: ['+841900545415'], favorite: false },
  { id: 'c12', name: 'Phúc xe ôm', numbers: ['+84909000012'], favorite: false },
  { id: 'c13', name: 'Quang IT', numbers: ['+84912000013'], favorite: false, group: 'Công việc' },
  { id: 'c14', name: 'Thầy Bình', numbers: ['+84913000014'], favorite: false },
]

/** Số người dùng đã đánh dấu (number_marks). */
export const SEED_MARKS: Array<{ number: string; category?: SpamCategory; name?: string; note?: string; trusted?: boolean }> = [
  { number: '+84900000111', category: 'impersonation', name: 'Giả danh công an' },
  { number: '+84900000222', category: 'fakeJob', name: 'Việc nhẹ lương cao' },
  { number: '+84899999000', category: 'loan', name: 'Vay tiền nhanh' },
  { number: '+841900123456', category: 'telemarketing', name: 'Quảng cáo bảo hiểm' },
  { number: '+84283000999', category: 'robocall' },
  { number: '+84908777666', category: 'telemarketing', name: 'Số quảng cáo hay gọi' },
  { number: '+12025550142', category: 'scam', name: 'Thông báo trúng thưởng' },
  { number: '+2348012345678', category: 'scam' },
  { number: '+85512345678', category: 'impersonation', name: 'Giả danh cơ quan nhà nước' },
  { number: '+84977000333', category: 'impersonation', name: 'Giả danh nhân viên ngân hàng', note: 'Đòi mã OTP' },
  { number: '+84909555777', name: 'Shipper giao hàng', trusted: true },
]

/** Danh sách chặn của hệ thống (BlockedNumberContract). */
export const SEED_BLOCKED: string[] = ['+84908777666', '+84900000111', '+12025550142']

/** Quy tắc chặn mẫu (block_rules). */
export const SEED_RULES: Array<{ kind: 'startsWith' | 'contains' | 'endsWith' | 'country'; value: string; label?: string }> = [
  { kind: 'startsWith', value: '0899', label: 'Đầu số vay tiền' },
  { kind: 'country', value: '234', label: 'Nigeria' },
  { kind: 'endsWith', value: '0000', label: 'Đuôi số giả' },
]

/** Kịch bản mô phỏng cuộc gọi đến (chỉ bản web). */
export const SCENARIOS: CallScenario[] = [
  { id: 'scam-police', title: 'Giả danh công an', description: 'Số bạn đã chặn và đánh dấu lừa đảo', number: '+84900000111' },
  { id: 'scam-marked', title: 'Số đã đánh dấu lừa đảo', description: 'Đã đánh dấu nhưng chưa chặn — chỉ cảnh báo', number: '+84977000333' },
  { id: 'unknown-vn', title: 'Số lạ trong nước', description: 'Không có trong danh bạ, chưa đánh dấu', number: '+84977123456' },
  { id: 'loan-spam', title: 'Quảng cáo vay tiền', description: 'Khớp quy tắc đầu số 0899', number: '+84899999000' },
  { id: 'intl-scam', title: 'Cuộc gọi quốc tế', description: 'Số Nigeria, khớp quy tắc chặn quốc gia', number: '+2348012345678' },
  { id: 'intl-unknown', title: 'Số quốc tế lạ', description: 'Không bị chặn nhưng có dấu hiệu cảnh báo', number: '+6591234567' },
  { id: 'private', title: 'Số ẩn danh', description: 'Người gọi giấu số', number: '', isPrivate: true },
  { id: 'contact', title: 'Người quen (Mẹ)', description: 'Có trong danh bạ, an toàn', number: '+84901000001' },
  { id: 'trusted', title: 'Số tin cậy', description: 'Shipper bạn đã đánh dấu tin cậy', number: '+84909555777' },
]
