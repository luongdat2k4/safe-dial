# 10. Cuộc gọi đã chặn

**Màn hình:** `views/home/BlockTab.vue` (tab "Đã chặn"), `components/block/BlockedList.vue`, `ReasonChip.vue`

## Chức năng trong UI

- Tóm tắt: **số cuộc gọi bị chặn trong 7 ngày** và **lý do phổ biến nhất** ("Chủ yếu: Số ẩn danh (5)").
- Danh sách cuộc gọi bị chặn hoặc tắt chuông, nhóm theo ngày, mỗi dòng có **lý do** (số ẩn, quốc tế, số lạ, danh sách, quy tắc, quốc gia, spam).
- Chạm để mở chi tiết số.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Cuộc gọi bị chặn | Đọc | `CallLog.TYPE = BLOCKED` (app tự ghi khi chặn) | ✅ |
| Cuộc gọi bị tắt chuông | Đọc | `call_meta.action = 2` (silenced) | ✅ |
| Lý do chặn | Đọc | `call_meta.reasons` + `rule_id` | ✅ |
| Tên quy tắc đã chặn | Đọc | `block_rules.label` theo `rule_id` | ✅ |
| Đếm 7 ngày + lý do phổ biến nhất | Đọc | `call_meta WHERE at >= ? AND action >= 2`, đếm theo bit | ✅ |

## Đánh giá: ✅ Đáp ứng

## Thiếu sót và đề xuất

- **Cần index `call_meta(at)`** cho truy vấn 7 ngày. Schema hiện chỉ có index `number`.
- **Bảng mã `reasons` chưa có `country`.** UI tách "Chặn theo mã quốc gia" riêng với "Khớp quy tắc chặn". Đề xuất thêm bit `128 = country`, hoặc suy ra bằng cách đọc `block_rules.kind` theo `rule_id` (quy tắc đã bị xoá thì không còn biết).
- **Bit `spammer` không còn ý nghĩa**, vì không có dữ liệu cộng đồng. Lý do tương ứng là `blacklist` (người dùng đã đánh dấu và chặn).
- **Cuộc gọi bị hệ thống chặn** (số trong `BlockedNumberContract`): Android tự ghi `CallLog` với `TYPE = BLOCKED`, và app không được gọi `CallScreeningService` cho cuộc đó. Theo schema mục 4 (dòng "—"), app vẫn phải ghi `call_meta` với `reasons = blacklist`. Cần xác nhận trên máy thật rằng `InCallService` có nhận được sự kiện cho cuộc bị hệ thống chặn. Nếu không, khi sync, app phải tự thêm `call_meta` cho các dòng `BLOCKED` chưa có meta.
- Tóm tắt 7 ngày có thể đọc từ `call_stats_daily.blocked` (nhanh hơn), nhưng "lý do phổ biến nhất" vẫn cần `call_meta`.
