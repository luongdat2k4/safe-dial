# 09. Danh sách đen và quy tắc chặn

**Màn hình:** `views/home/BlockTab.vue` (tab "Danh sách đen"), `components/block/RuleList.vue`, `views/block/BlockRuleFormView.vue`, `components/block/CountryPicker.vue`

## Chức năng trong UI

- **Danh sách quy tắc đang áp dụng** (đếm số lượng), xoá quy tắc có xác nhận.
- **Chặn nhanh từ cuộc gọi gần đây**: liệt kê số lạ gần đây chưa bị chặn, có nút Chặn.
- **Thêm quy tắc** với 5 loại: số cụ thể, bắt đầu bằng, chứa, kết thúc bằng, quốc gia.
  - Kiểm tra: không để trống, số hợp lệ 8–15 chữ số, mẫu ít nhất 3 chữ số, phải chọn quốc gia, không trùng.
  - Ghi chú tuỳ chọn ("Đầu số vay tiền").
  - **Xem trước**: quy tắc khớp N cuộc gọi trong lịch sử (bỏ qua số trong danh bạ).
- Lối vào **Kiểm tra một số** (xem [12](12-block-test.md)).

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Chặn số cụ thể | Đọc/Ghi | `BlockedNumberContract` | ✅ |
| Ghi chú cho số bị chặn | Ghi | `number_marks.name` | ✅ |
| Quy tắc theo mẫu + ghi chú | Đọc/Ghi | `block_rules` (`kind`, `value`, `label`) | ✅ |
| Chặn theo quốc gia | Đọc/Ghi | `block_rules` (`kind = 4`) | ✅ |
| Kiểm tra trùng | Đọc | Unique index `(kind, value)` / `BlockedNumberContract.isBlocked` | ✅ |
| Số lạ gần đây chưa bị chặn | Đọc | `CallLog` (`CACHED_NAME` rỗng) loại trừ `BlockedNumberContract` | ✅ |
| Xem trước khớp lịch sử | Đọc | Các số khác nhau trong `CallLog`, so khớp trong bộ nhớ | ✅ |
| Bật/tắt quy tắc, số lần chặn | Đọc/Ghi | `block_rules.enabled`, `hit_count` | ✅ (UI chưa dùng) |

## Đánh giá: ✅ Đáp ứng

## Thiếu sót và đề xuất

- **Danh sách hiển thị lấy từ 2 nguồn**: số cụ thể từ `BlockedNumberContract`, quy tắc mẫu từ `block_rules`. UI gộp lại và sắp xếp theo thời gian:
  - `BlockedNumberContract` có cột `ORIGINAL_NUMBER` và `E164_NUMBER` nhưng **không có thời điểm thêm**. Nếu cần sắp xếp theo thời gian thì dùng `number_marks.updated_at`, hoặc chấp nhận thứ tự của hệ thống.
- **UI chưa tận dụng** `enabled`, `hit_count`, `last_hit_at`. Đề xuất: công tắc bật/tắt trên mỗi quy tắc, và dòng phụ "Đã chặn {n} cuộc · gần nhất {ngày}".
- **Số bị chặn bởi app khác** (hoặc bởi app Danh bạ) cũng hiện trong danh sách, vì dùng chung `BlockedNumberContract`. Đây là hành vi đúng của app Điện thoại mặc định.
- Quy tắc `startsWith` cần so khớp cả **dạng quốc gia** (`0899…`) lẫn **dạng E.164** (`84899…`), giống `ruleMatches` hiện tại. Schema lưu `value` dạng chữ số, nên native cũng phải so trên cả hai dạng.
- `BlockRule.kind = 'number'` của bản hiện tại chuyển sang `BlockedNumberContract` (schema mục 11).
