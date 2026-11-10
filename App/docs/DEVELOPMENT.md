# Safe Dial — quy ước phát triển

Ứng dụng quản lý cuộc gọi: lịch sử cuộc gọi, nhận diện số lạ + cảnh báo lừa đảo, chặn spam/quốc tế theo
danh sách đen và quy tắc, thống kê tần suất liên lạc. Đây là **bản UI/UX chạy bằng dữ liệu giả lập**.

## Công nghệ

Vue 3 (`<script setup lang="ts">`) · TypeScript strict · Vite · Tailwind CSS v4 (token trong `src/assets/main.css`)
· Pinia · Vue Router (hash history) · `@iconify/vue` + bộ icon `lucide` đóng gói sẵn · Capacitor 8.

## Cấu trúc `src/`

| Thư mục | Vai trò |
|---|---|
| `types/` | Kiểu dữ liệu dùng chung (`CallLogEntry`, `BlockRule`, `NumberProfile`, …) |
| `utils/` | Hàm thuần: `numbers.ts` (chuẩn hoá/định dạng số), `format.ts` (giờ/thời lượng), `blockEngine.ts` (**quyết định chặn**), `countries.ts`, `routes.ts` |
| `data/` | Dữ liệu giả lập (`seed.ts`, `callLog.ts`) và giá trị mặc định |
| `services/` | `DialerService` (interface) + `mockDialer.ts`. Nơi duy nhất sau này thay bằng plugin native |
| `stores/` | Pinia: `settings`, `contacts`, `lookup`, `calls`, `block`, `callSession`, `ui` |
| `components/` | Thành phần dùng chung (xem bảng dưới) |
| `views/<khu vực>/` | Mỗi route một file view |
| `locales/vi/<khu vực>.ts` | **Toàn bộ chữ tiếng Việt**, gom theo khu vực; truy cập bằng `t('khuvuc.nhom.khoa')` |

## Thành phần dùng chung (`src/components`)

`AppIcon` (`<AppIcon name="phone" />`, tên lucide không cần tiền tố) · `AppBar` (title, back, tone, slot `right`) ·
`Avatar` · `RiskBadge` · `BaseButton` (variant primary/secondary/danger/ghost/dark) · `ToggleSwitch` (v-model) ·
`ListRow` (icon/title/subtitle, slot `right`/`leading`) · `BottomSheet` (v-model, title) · `EmptyState` ·
`SegmentedTabs` (v-model + items) · `SearchBar` · `FabButton` · `SectionHeader` · `Keypad` (emit `press`) ·
`CallLogItem` · `ContactItem` · `ToastHost` / `ConfirmHost` (gắn sẵn trong `App.vue`).

Thông báo và xác nhận dùng store `ui`: `ui.showToast('...', 'success')`, `await ui.confirm({ title, message, danger })`.

## Quy ước

- Không viết chữ tiếng Việt trực tiếp trong view dài; đưa vào `locales/vi/<khu vực>.ts` rồi `t()`. Nhãn rất ngắn dùng chung đã có trong `common.*`.
- Giao diện mobile trước (khung 390–430px). Dùng `pt-safe` / `pb-safe` cho vùng sát mép màn hình. Vùng chạm tối thiểu 40px.
- Màu dùng token (`bg-primary`, `text-muted`, `text-scam`, `bg-scam-soft`, …); màu rủi ro: `safe` xanh, `unknown` xám, `spam` cam, `scam` đỏ.
- View không gọi trực tiếp dữ liệu giả: đi qua store → service. Logic chặn nằm ở `utils/blockEngine.ts`, view chỉ hiển thị.
- Route tới chi tiết số: `router.push(numberPath(e164))`; đọc tham số bằng `parseNumberParam(route.params.number)`. Số ẩn là chuỗi rỗng.
- Tên icon sai sẽ render trống: chạy `npm run check:icons`.
- Trước khi xong: `npm run typecheck` phải sạch.

## Phần native (chưa làm)

Vai trò dialer mặc định, call screening, đọc nhật ký cuộc gọi, danh bạ, overlay caller-ID, chặn thật cuộc gọi đều
**được giả lập** qua `services/` và màn hình `/call/simulate`. Khi làm native, viết plugin Capacitor và một
implementation mới của `DialerService`.
