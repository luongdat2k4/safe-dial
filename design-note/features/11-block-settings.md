# 11. Cài đặt chặn tự động

**Màn hình:** `views/home/BlockTab.vue` (tab "Cài đặt"), `components/block/BlockSettingsPanel.vue`, `CountryPicker.vue`

## Chức năng trong UI

- Công tắc **tự động chặn**:
  - Chặn số spam, lừa đảo ("số bị cộng đồng báo cáo nhiều").
  - Chặn số ẩn danh.
  - Chặn cuộc gọi quốc tế (danh bạ được miễn).
  - Chặn số không có trong danh bạ (kèm cảnh báo có thể chặn nhầm).
  - Thông báo khi chặn.
- **Cách xử lý**: Tự động cúp máy, hoặc Tắt chuông (cuộc gọi vẫn hiện).
- **Chặn theo quốc gia**: chọn mã quốc gia (đã chặn N mã).
- Ghi chú về thứ tự ưu tiên và mã nước của người dùng.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Chặn số ẩn / quốc tế / số lạ | Đọc/Ghi | `SharedPreferences` `block.private`, `block.international`, `block.nonContacts` | ✅ |
| Thông báo khi chặn | Đọc/Ghi | `block.notify` | ✅ |
| Cách xử lý | Đọc/Ghi | `block.method` | ✅ |
| Mã nước của người dùng | Đọc | `home_country_dial` | ✅ |
| Chặn theo quốc gia | Đọc/Ghi | `block_rules` (`kind = 4`) | ✅ |
| **Chặn số spam, lừa đảo (cộng đồng)** | Đọc/Ghi | — | ❌ không có nguồn |

## Đánh giá: ⚠️ Đáp ứng một phần

## Thiếu sót và đề xuất

- **Công tắc "Chặn số spam, lừa đảo"** (`blockTopSpammers`, ngưỡng 50 báo cáo trong `blockEngine.ts`) không còn ý nghĩa khi không có dữ liệu cộng đồng. Hai hướng:
  1. **Bỏ** công tắc này, vì số người dùng đánh dấu lừa đảo đã nằm trong `BlockedNumberContract`.
  2. **Đổi nghĩa** thành "Tự chặn khi tôi đánh dấu lừa đảo": khi bật, mỗi lần báo cáo sẽ tự thêm số vào `BlockedNumberContract` mà không hỏi lại. Lưu bằng key `block.autoBlockReported`.
- **Thứ tự ưu tiên khác nhau giữa UI và schema:**
  - `blockEngine.ts`: ẩn số → quốc tế → số lạ → danh sách số → quy tắc → spam.
  - Schema mục 4: hệ thống chặn → tin cậy → danh bạ → quy tắc → ẩn số → quốc tế → số lạ.

  Kết quả cuối thường giống nhau, nhưng **lý do ghi lại khác nhau** (ví dụ: số lạ khớp cả quy tắc lẫn "chặn số lạ"). Cần chọn **một thứ tự** và dùng chung cho `blockEngine.ts`, `CallScreeningService` và ghi chú trên UI.
- **Ghi chú trên UI** ("Chỉ danh sách số cụ thể mới chặn được cả số trong danh bạ") vẫn đúng với schema: `BlockedNumberContract` chặn cả số trong danh bạ.
- **Chế độ Tắt chuông**: `CallScreeningService` dùng `CallResponse.setSilenceCall(true)` (Android 10+). Người gọi vẫn nghe đổ chuông, đúng như mô tả.
