/**
 * Dữ liệu giả lập (mock). Tất cả số điện thoại đều là số hư cấu.
 * Số trong danh bạ: +84 90x… ; số lừa đảo / spam: dải 0900 000 xxx, 1900 …, +1 202 555 01xx.
 */
import type { BlockRule, Contact, NumberProfile } from '@/types'

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
  { id: 'c11', name: 'Ngân hàng (CSKH)', numbers: ['+841900545415'], favorite: false, note: 'Số tổng đài chính thức' },
  { id: 'c12', name: 'Phúc xe ôm', numbers: ['+84909000012'], favorite: false },
  { id: 'c13', name: 'Quang IT', numbers: ['+84912000013'], favorite: false, group: 'Công việc' },
  { id: 'c14', name: 'Thầy Bình', numbers: ['+84913000014'], favorite: false },
]

/** Cơ sở dữ liệu spam cộng đồng giả lập, khoá là số E.164. */
export const SPAM_DB: Record<string, NumberProfile> = {
  '+84900000111': {
    number: '+84900000111',
    risk: 'scam',
    category: 'impersonation',
    reportCount: 1842,
    location: 'Hà Nội',
    carrier: 'Di động',
    suggestedNames: ['Giả danh công an', 'Lừa đảo'],
  },
  '+84900000222': {
    number: '+84900000222',
    risk: 'scam',
    category: 'fakeJob',
    reportCount: 967,
    location: 'TP. Hồ Chí Minh',
    carrier: 'Di động',
    suggestedNames: ['Việc nhẹ lương cao'],
  },
  '+84899999000': {
    number: '+84899999000',
    risk: 'spam',
    category: 'loan',
    reportCount: 412,
    location: 'Việt Nam',
    carrier: 'Di động',
    suggestedNames: ['Vay tiền nhanh'],
  },
  '+841900123456': {
    number: '+841900123456',
    risk: 'spam',
    category: 'telemarketing',
    reportCount: 233,
    location: 'Việt Nam',
    carrier: 'Tổng đài',
    suggestedNames: ['Quảng cáo bảo hiểm'],
  },
  '+84283000999': {
    number: '+84283000999',
    risk: 'spam',
    category: 'robocall',
    reportCount: 128,
    location: 'TP. Hồ Chí Minh',
    carrier: 'Cố định',
  },
  '+84908777666': {
    number: '+84908777666',
    risk: 'spam',
    category: 'telemarketing',
    reportCount: 86,
    location: 'Việt Nam',
    carrier: 'Di động',
  },
  '+12025550142': {
    number: '+12025550142',
    risk: 'scam',
    category: 'scam',
    reportCount: 604,
    location: 'Hoa Kỳ',
    carrier: 'VoIP',
    suggestedNames: ['Thông báo trúng thưởng'],
  },
  '+2348012345678': {
    number: '+2348012345678',
    risk: 'scam',
    category: 'scam',
    reportCount: 351,
    location: 'Nigeria',
    carrier: 'Di động',
  },
  '+85512345678': {
    number: '+85512345678',
    risk: 'scam',
    category: 'impersonation',
    reportCount: 289,
    location: 'Campuchia',
    carrier: 'Di động',
    suggestedNames: ['Giả danh cơ quan nhà nước'],
  },
  // Số lừa đảo mới nổi: ít báo cáo nên chỉ cảnh báo, chưa bị chặn tự động
  '+84977000333': {
    number: '+84977000333',
    risk: 'scam',
    category: 'impersonation',
    reportCount: 18,
    location: 'Việt Nam',
    carrier: 'Di động',
    suggestedNames: ['Giả danh nhân viên ngân hàng'],
  },
  // Số hợp pháp đã được cộng đồng xác minh
  '+841900545415': {
    number: '+841900545415',
    name: 'Ngân hàng (CSKH)',
    risk: 'safe',
    reportCount: 0,
    location: 'Việt Nam',
    carrier: 'Tổng đài',
  },
  '+84909555777': {
    number: '+84909555777',
    name: 'Shipper giao hàng',
    risk: 'safe',
    reportCount: 5,
    location: 'Việt Nam',
    carrier: 'Di động',
  },
}

const iso = (d = new Date()) => d.toISOString()

/** Quy tắc chặn khởi tạo (minh hoạ đủ 5 loại). */
export const DEFAULT_RULES: BlockRule[] = [
  { id: 'r1', kind: 'number', value: '+84908777666', label: 'Số quảng cáo hay gọi', createdAt: iso() },
  { id: 'r2', kind: 'startsWith', value: '0899', label: 'Đầu số vay tiền', createdAt: iso() },
  { id: 'r3', kind: 'country', value: '+234', label: 'Nigeria', createdAt: iso() },
  { id: 'r4', kind: 'endsWith', value: '0000', label: 'Đuôi số giả', createdAt: iso() },
]

/** Kịch bản mô phỏng cuộc gọi đến. */
export const SCENARIOS = [
  {
    id: 'scam-police',
    title: 'Giả danh công an',
    description: 'Số trong cơ sở dữ liệu lừa đảo, hơn 1.800 báo cáo',
    number: '+84900000111',
  },
  {
    id: 'scam-new',
    title: 'Lừa đảo mới nổi',
    description: 'Mới có 18 báo cáo nên chưa bị chặn tự động — chỉ cảnh báo',
    number: '+84977000333',
  },
  {
    id: 'unknown-vn',
    title: 'Số lạ trong nước',
    description: 'Chưa có báo cáo nào, không có trong danh bạ',
    number: '+84977123456',
  },
  {
    id: 'loan-spam',
    title: 'Quảng cáo vay tiền',
    description: 'Số spam đã bị chặn theo quy tắc đầu số 0899',
    number: '+84899999000',
  },
  {
    id: 'intl-scam',
    title: 'Cuộc gọi quốc tế đáng ngờ',
    description: 'Số Nigeria, khớp quy tắc chặn quốc gia',
    number: '+2348012345678',
  },
  {
    id: 'private',
    title: 'Số ẩn danh',
    description: 'Người gọi giấu số',
    number: '',
    isPrivate: true,
  },
  {
    id: 'contact',
    title: 'Người quen (Mẹ)',
    description: 'Có trong danh bạ, an toàn',
    number: '+84901000001',
  },
  {
    id: 'verified',
    title: 'Tổng đài ngân hàng',
    description: 'Số đã được cộng đồng xác minh',
    number: '+841900545415',
  },
] satisfies Array<{ id: string; title: string; description: string; number: string; isPrivate?: boolean }>
