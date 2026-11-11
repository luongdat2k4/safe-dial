# 04. Bàn phím quay số

**Màn hình:** `views/dial/DialPadView.vue`, `components/Keypad.vue`, `components/number/RecognitionStrip.vue`, `components/calls/SimSheet.vue`

## Chức năng trong UI

- Bàn phím số, xoá từng số, âm/rung khi bấm phím.
- Gợi ý liên hệ khớp với số đang gõ.
- **Dải nhận diện số** khi gõ đủ số: có trong danh bạ / số lạ / số bị báo cáo lừa đảo hoặc spam (kèm cảnh báo) / số đang bị chặn (nút Bỏ chặn) / nút Chi tiết.
- Gọi (chọn SIM nếu đặt "Luôn hỏi"; có "Luôn dùng SIM này"), Lưu vào danh bạ, Nhắn tin.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Gợi ý liên hệ theo số đang gõ | Đọc | `Phone.CONTENT_FILTER_URI` | ✅ |
| Có trong danh bạ không | Đọc | `PhoneLookup` | ✅ |
| Loại lừa đảo / tên tự đặt | Đọc | `number_marks` | ✅ |
| Đang bị chặn / bỏ chặn | Đọc/Ghi | `BlockedNumberContract` | ✅ |
| "N người báo cáo", "Số đã được xác minh" | Đọc | — | ❌ không có nguồn |
| Âm bàn phím | Đọc | `SharedPreferences` | ⚠️ chưa liệt kê key |
| SIM mặc định | Đọc/Ghi | `SharedPreferences` | ⚠️ chưa liệt kê key |

## Đánh giá: ⚠️ Đáp ứng một phần

Phần nhận diện từ danh bạ, danh sách đen và tên tự đặt đáp ứng đầy đủ. Phần dữ liệu **cộng đồng** (số người báo cáo, số đã xác minh) không có nguồn vì schema chỉ dùng dữ liệu trên máy.

## Thiếu sót và đề xuất

- **Đổi nội dung UI**: "N người báo cáo" → "Bạn đã báo cáo: {loại}" (lấy từ `number_marks.category`). Bỏ trạng thái "Số đã được xác minh", hoặc thay bằng "Số tin cậy" (`number_marks.trusted = 1`).
- Có thể bổ sung **dấu hiệu cục bộ** ngay khi gõ: số quốc tế, đầu số trùng một `block_rules`. Đọc `block_rules` đã nạp sẵn trong bộ nhớ.
- Thêm key `ui.dialSound` và `ui.defaultSim` vào mục 3 của schema.
- "Lưu vào danh bạ" và "Nhắn tin" mở `Intent` của Android, không cần schema.
