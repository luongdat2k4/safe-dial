# 07. Lịch sử cuộc gọi của một số

**Màn hình:** `views/number/NumberHistoryView.vue`

## Chức năng trong UI

- Toàn bộ cuộc gọi với một số, kèm tổng số cuộc.
- Chọn nhiều, chọn tất cả, xoá các cuộc đã chọn.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Cuộc gọi của số | Đọc | `CallLog WHERE CACHED_NORMALIZED_NUMBER = ?`, theo trang | ✅ |
| Rủi ro / lý do chặn từng cuộc | Đọc | `call_meta` theo `call_id` | ✅ |
| Xoá các cuộc đã chọn | Ghi | `CallLog` + `call_meta` | ✅ |

## Đánh giá: ✅ Đáp ứng

## Thiếu sót và đề xuất

- Android chỉ giữ khoảng 500 cuộc gọi gần nhất trong `CallLog`, nên lịch sử của một số **có thể ngắn hơn** con số trong màn Thống kê của số đó, vì thống kê đọc từ `call_stats_daily` và không bị cắt. Nên hiện ghi chú nhỏ: "Chỉ hiển thị các cuộc gọi còn trong nhật ký của máy."
- Khớp số: dùng `CACHED_NORMALIZED_NUMBER`. Cột này có thể rỗng với bản ghi cũ hoặc do app khác ghi; khi đó dùng `PhoneNumberUtils.compare` trên cột `NUMBER` làm dự phòng.
