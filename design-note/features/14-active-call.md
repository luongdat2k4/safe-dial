# 14. Đang trong cuộc gọi

**Màn hình:** `views/call/ActiveCallView.vue`, `stores/callSession.ts`

## Chức năng trong UI

- Hiện tên, số, trạng thái (Đang gọi… / thời gian đàm thoại / Đang giữ máy).
- **Banner cảnh báo** khi số bị báo cáo lừa đảo/spam (khi bật Cảnh báo lừa đảo).
- Nút điều khiển: Tắt tiếng, Bàn phím (gửi DTMF), Loa ngoài, Giữ máy, Thêm cuộc gọi, **Ghi chú**.
- Kết thúc cuộc gọi → chuyển sang Sau cuộc gọi (nếu bật) hoặc về tab Cuộc gọi.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Trạng thái cuộc gọi, tắt tiếng, loa, giữ máy, DTMF | Đọc/Ghi | `InCallService` / `Call` (Telecom), không lưu | ✅ |
| Tên, rủi ro | Đọc | `PhoneLookup`, `number_marks`, quyết định screening | ✅ |
| Ghi thống kê khi kết thúc | Ghi | `call_stats_daily`, `call_meta` | ✅ |
| **Ghi chú cuộc gọi** | Ghi | — | ❌ chưa có chỗ lưu |
| Hiện màn Sau cuộc gọi | Đọc | `SharedPreferences` `callerId.showAfterCall` | ⚠️ chưa liệt kê key |

## Đánh giá: ⚠️ Đáp ứng một phần

## Thiếu sót và đề xuất

- **Ghi chú cuộc gọi** (hiện là "bản demo"). Hai lựa chọn:
  1. Thêm cột `note TEXT` vào `call_meta`. Khi người dùng ghi chú, tạo dòng `call_meta` (kể cả với cuộc gọi bình thường), nên bảng vẫn thưa. **Nhược điểm:** ghi chú mất khi Android xoá cuộc gọi cũ khỏi `CallLog` (job dọn dẹp xoá `call_meta` mồ côi).
  2. Bảng riêng `call_notes(id, number, at, note)` **không gắn với `call_id`**, nên ghi chú tồn tại lâu dài và hiện được trong Chi tiết số.

  → **Đề xuất cách 2**, vì ghi chú là dữ liệu người dùng tự viết và không nên tự mất.
- **Thêm cuộc gọi / gộp cuộc gọi (hội nghị)**: do Telecom xử lý, không cần schema. Thống kê ghi **từng cuộc riêng**.
- Thời lượng tính từ lúc `STATE_ACTIVE` đến `STATE_DISCONNECTED`; phần giữ máy vẫn tính vào thời lượng, giống `CallLog.DURATION`.
