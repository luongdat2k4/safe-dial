# 15. Màn hình sau cuộc gọi

**Màn hình:** `views/call/AfterCallView.vue`

## Chức năng trong UI

- Tóm tắt cuộc gọi vừa kết thúc: loại, thời lượng, thời điểm, tên/số, rủi ro.
- **"Đây là ai?"** (với số lạ): Báo cáo spam, Không phải spam, Gợi ý tên. Hiện trạng thái Đã chặn / Đã báo cáo.
- Gọi lại, Nhắn tin, Lưu vào danh bạ, Chặn.
- Số ẩn: giải thích không thể báo cáo hay chặn riêng.
- Chỉ hiện khi bật "Hiện sau cuộc gọi".

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Loại, thời lượng, thời điểm | Đọc | Từ `InCallService` lúc kết thúc (chưa cần `CallLog`) | ✅ |
| Rủi ro, lý do | Đọc | Quyết định screening trong bộ nhớ tạm / `call_meta` | ✅ |
| Báo cáo spam | Ghi | `number_marks.category` (+ `BlockedNumberContract` nếu chặn) | ✅ |
| Không phải spam | Ghi | `number_marks.trusted = 1` | ✅ |
| Đặt tên | Ghi | `number_marks.name` | ✅ |
| Chặn | Ghi | `BlockedNumberContract` | ✅ |
| Bật/tắt màn này | Đọc | `SharedPreferences` `callerId.showAfterCall` | ⚠️ chưa liệt kê key |

## Đánh giá: ✅ Đáp ứng

## Thiếu sót và đề xuất

- Màn này mở **ngay khi cuộc gọi kết thúc**, có thể trước khi Android ghi dòng `CallLog`. Vì vậy nên truyền dữ liệu cuộc gọi trực tiếp từ `InCallService` qua plugin/Intent, không đọc lại `CallLog`.
- Đổi chữ "Giúp cộng đồng nhận diện số này" → "Đánh dấu để nhận ra số này lần sau" (xem [08](08-report-and-name.md)).
- Thêm key `callerId.showAfterCall` vào mục 3 của schema. Native cần đọc key này để quyết định có mở màn sau cuộc gọi hay không.
- Nếu app không mở (cuộc gọi kết thúc khi máy khoá), có thể dùng **thông báo** "Cuộc gọi từ số lạ vừa kết thúc, đánh dấu?" thay cho màn này.
