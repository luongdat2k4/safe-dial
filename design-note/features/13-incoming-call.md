# 13. Cuộc gọi đến và hiển thị người gọi

**Màn hình:** `views/call/IncomingCallView.vue`, `components/call/CallerIdOverlay.vue`, `QuickActionSheets.vue`, `FakeHomeScreen.vue`

## Chức năng trong UI

- **Hộp thông tin người gọi**: popup nhỏ (trên/giữa/dưới) hoặc toàn màn hình. Có tiêu đề theo rủi ro (An toàn / Số lạ / Nghi spam / Nghi lừa đảo), tên, số, quốc gia, "{n} người đã báo cáo", cảnh báo lừa đảo.
- **Trả lời**: với số lừa đảo/spam (khi bật Cảnh báo lừa đảo) thì hỏi lại "Vẫn nghe máy?".
- **Từ chối**.
- **Hành động nhanh**:
  - Nhắn tin nhanh: từ chối + gửi 1 trong 4 câu trả lời mẫu.
  - Nhắc tôi sau: từ chối + nhắc sau 10 giây đến 30 phút.
  - Chặn số này (số ẩn thì không chặn được).

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Quyết định chặn / cảnh báo, rủi ro, lý do | Đọc | `CallScreeningService` → bộ nhớ tạm (schema mục 2.1) | ✅ |
| Tên, có trong danh bạ | Đọc | `PhoneLookup` → `number_marks.name` | ✅ |
| Loại lừa đảo | Đọc | `number_marks.category` | ✅ |
| Cài đặt popup (bật, kiểu, vị trí, hiện với danh bạ) | Đọc | `SharedPreferences` `callerId.*`, `popup.*` | ✅ |
| Bật cảnh báo lừa đảo (hỏi lại khi nghe) | Đọc | `SharedPreferences` | ⚠️ chưa liệt kê key |
| Chặn số này | Ghi | `BlockedNumberContract` | ✅ |
| Ghi kết quả cuộc gọi | Ghi | `call_meta` + `call_stats_daily` khi kết thúc | ✅ |
| "{n} người đã báo cáo" | Đọc | — | ❌ không có nguồn |
| Nhắc gọi lại | Ghi | — (WorkManager / AlarmManager) | ✅ không cần bảng |
| Câu trả lời mẫu | Đọc | Cố định trong app | ✅ |

## Đánh giá: ✅ Đáp ứng (trừ số người báo cáo)

## Thiếu sót và đề xuất

- **Màn cuộc gọi đến là màn native**: khi app là app gọi điện mặc định, `InCallService` phải hiện màn cuộc gọi đến **cả khi máy khoá và app đang đóng**. Mở WebView lúc đó có thể chậm. Hai hướng:
  1. Màn cuộc gọi đến viết bằng **native** (Kotlin/Compose). WebView chỉ dùng cho các màn còn lại.
  2. Dùng một Activity WebView được khởi động sẵn (rủi ro chậm, máy yếu dễ lỡ cuộc gọi).

  Dù chọn hướng nào, dữ liệu cũng đọc từ SQLite và `SharedPreferences`, nên schema không phải đổi. Đây chính là lý do schema để native làm chủ DB.
- **Nhãn "{n} người đã báo cáo"** → "Bạn đã đánh dấu: {loại}", hoặc hiện các dấu hiệu cục bộ (quốc tế, gọi dồn dập…).
- **Thêm key** `callerId.scamWarning` (hỏi lại trước khi nghe số lừa đảo) vào mục 3 của schema; key này native cần đọc.
- **Nhắn tin nhanh**: dùng `Call.reject(true, text)` của Telecom, không cần quyền SMS riêng. Có thể cho người dùng sửa các câu mẫu (thêm key `callerId.quickReplies`).
- **Nhắc tôi sau**: WorkManager tự lưu lịch, không cần bảng.
- **Từ chối** cần được tính vào `call_stats_daily.rejected`. Schema đã có cột này, nhưng `CallLog` ghi cuộc bị từ chối là `REJECTED_TYPE` (Android 7+); cần ánh xạ đúng khi cộng thống kê.
