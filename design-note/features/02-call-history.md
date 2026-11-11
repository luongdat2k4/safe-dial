# 02. Lịch sử cuộc gọi (tab Cuộc gọi)

**Màn hình:** `views/home/CallsTab.vue`, `components/calls/*` (`CallDayList`, `CallRow`, `CallsSummary`, `CallActionSheet`, `SimSheet`)

## Chức năng trong UI

- Danh sách cuộc gọi nhóm theo ngày: tên/số, loại cuộc gọi, giờ, thời lượng, huy hiệu rủi ro, lý do chặn, SIM.
- Bộ lọc: Tất cả, Nhỡ, Đến, Đi, **Số lạ**, **Spam/Lừa đảo**, **Đã chặn** (kèm số đếm).
- Tóm tắt 7 ngày: số cuộc **đáng ngờ** và **đã chặn**, nút "Xem cuộc gọi đã chặn".
- Chọn nhiều và xoá; xoá một cuộc gọi.
- Sheet tuỳ chọn cho từng cuộc gọi: Gọi, Nhắn tin, Xem chi tiết, Chặn/Bỏ chặn, Báo cáo spam, Lưu vào danh bạ, Sao chép số, Xoá khỏi nhật ký.
- Gọi lại: chọn SIM (hoặc dùng SIM mặc định).

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Danh sách cuộc gọi (số, loại, giờ, thời lượng, SIM) | Đọc | `CallLog.Calls` theo trang | ✅ |
| Tên người gọi | Đọc | `CallLog.CACHED_NAME` → `number_marks.name` | ✅ |
| Rủi ro, lý do chặn của từng cuộc | Đọc | `call_meta` (theo `call_id` của trang) | ✅ |
| Lọc Nhỡ / Đến / Đi / Đã chặn | Đọc | `CallLog.TYPE` (`MISSED`, `INCOMING`, `OUTGOING`, `BLOCKED`) | ✅ |
| Lọc **Số lạ** | Đọc | `CallLog` với `CACHED_NAME` rỗng (hoặc `call_meta.reasons & nonContact`) | ✅ |
| Lọc **Spam/Lừa đảo** | Đọc | `call_meta.risk >= 2`, rồi lấy dòng `CallLog` theo `call_id` | ✅ |
| Đếm số cuộc cho từng bộ lọc | Đọc | `COUNT` trên `CallLog` / `call_meta` | ✅ |
| Tóm tắt 7 ngày (đáng ngờ, đã chặn) | Đọc | `call_meta` 7 ngày gần nhất | ✅ |
| Xoá cuộc gọi | Ghi | Xoá trong `CallLog` + xoá `call_meta` tương ứng | ✅ |
| Chặn / bỏ chặn | Ghi | `BlockedNumberContract` | ✅ |
| Trạng thái "đang bị chặn" của số | Đọc | `BlockedNumberContract.isBlocked` | ✅ |
| SIM mặc định | Đọc/Ghi | `SharedPreferences` | ⚠️ chưa liệt kê key |

## Đánh giá: ✅ Đáp ứng

## Thiếu sót và đề xuất

- **Bộ lọc Spam/Lừa đảo đi ngược:** truy vấn `call_meta` trước (có index theo thời gian), rồi mới lấy dòng `CallLog`. Cần thêm index `call_meta(at)`; schema hiện chỉ có index `number`.
- **Đồng nhất định nghĩa "Số lạ":** UI hiện lọc theo `risk === 'unknown'`. Theo schema, nên định nghĩa là "không có trong danh bạ lúc gọi" (`CACHED_NAME` rỗng). Với cuộc gọi đến thì `call_meta` có bit `nonContact`. Cuộc gọi **đi** tới số lạ không có `call_meta`, nên chỉ dựa vào `CACHED_NAME`.
- **Xoá lịch sử không trừ thống kê** (schema mục 2.2). UI nên ghi rõ trong hộp thoại xác nhận: "Thống kê không bị ảnh hưởng".
- **Bỏ `reportCount`** khỏi dòng lịch sử, vì không còn dữ liệu cộng đồng.
- Thêm key `ui.defaultSim` vào mục 3 của schema.
