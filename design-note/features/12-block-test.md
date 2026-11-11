# 12. Kiểm tra một số (mô phỏng bộ máy chặn)

**Màn hình:** `views/block/BlockTestView.vue`, `components/block/TraceStepRow.vue`, `TraceVerdict.vue`, `utils/blockTrace.ts`

## Chức năng trong UI

- Nhập số (hoặc bật "Số ẩn"), điền nhanh bằng số mẫu.
- Hiện **từng bước kiểm tra** với trạng thái: Đang tắt / Không khớp / KHỚP / Không chạy, kèm giải thích (có trong danh bạ, khớp quy tắc nào, mã nước…).
- **Kết luận**: Cho qua / Chặn / Tắt chuông, kèm lý do.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Có trong danh bạ | Đọc | `PhoneLookup` | ✅ |
| Danh sách chặn số cụ thể | Đọc | `BlockedNumberContract` | ✅ |
| Tin cậy, loại lừa đảo | Đọc | `number_marks` | ✅ |
| Quy tắc mẫu | Đọc | `block_rules` | ✅ |
| Cài đặt chặn | Đọc | `SharedPreferences` `block.*` | ✅ |
| Báo cáo cộng đồng (bước "spammer") | Đọc | — | ❌ không có nguồn |
| Gọi dồn dập (dấu hiệu `burst`) | Đọc | `CallLog` | ✅ |

## Đánh giá: ✅ Đáp ứng (sau khi sửa các bước)

Màn này chỉ đọc, và mọi nguồn dữ liệu đều có trong schema.

## Thiếu sót và đề xuất

- **Các bước phải khớp với schema mục 4**, nếu không màn kiểm tra sẽ cho kết quả khác với khi có cuộc gọi thật:
  - Thêm bước **"Danh sách chặn của hệ thống"** (đầu tiên) và **"Số tin cậy"**.
  - Bỏ bước **"Cộng đồng báo cáo spam"**.
  - Thêm phần **dấu hiệu cảnh báo** (quốc tế, ẩn số, gọi dồn dập, từng bị từ chối) cho trường hợp cuối "số lạ, không bị chặn".
- **Nên dùng chung một bộ quyết định**: logic chặn chạy ở native (`CallScreeningService`). Màn này nên **gọi plugin native** để chạy đúng hàm đó ở chế độ thử (dry-run), thay vì giữ một bản TypeScript riêng (`blockEngine.ts`), để hai bên không bị lệch nhau.
