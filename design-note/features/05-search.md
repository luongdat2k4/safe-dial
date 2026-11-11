# 05. Tìm kiếm và tra cứu số

**Màn hình:** `views/dial/SearchView.vue`, `components/number/LookupResultCard.vue`

## Chức năng trong UI

- Tìm theo tên hoặc số trong **Danh bạ** và **Lịch sử cuộc gọi** (kèm số cuộc gọi của mỗi số).
- **Tra cứu số trong cộng đồng**: số báo cáo, vị trí, nhà mạng, tên do cộng đồng gợi ý, Chặn/Bỏ chặn, Xem chi tiết.
- **Tìm gần đây** (tối đa 8 mục): xoá từng mục, xoá tất cả.
- Danh sách số mẫu để thử cảnh báo (bản demo).

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Kết quả trong danh bạ | Đọc | `Phone.CONTENT_FILTER_URI` | ✅ |
| Kết quả trong lịch sử + số cuộc gọi | Đọc | `CallLog` (`NUMBER LIKE`, `CACHED_NAME LIKE`), nhóm theo số | ✅ |
| Tên tự đặt khớp từ khoá | Đọc | `number_marks.name` | ✅ (cần index nếu nhiều) |
| Chặn / bỏ chặn | Ghi | `BlockedNumberContract` | ✅ |
| Vị trí, nhà mạng | Đọc | — | ⚠️ tính offline được |
| Số báo cáo cộng đồng, tên cộng đồng gợi ý | Đọc | — | ❌ không có nguồn |
| Tìm gần đây | Đọc/Ghi | — (hiện ở `localStorage`) | ⚠️ chưa có trong schema |

## Đánh giá: ⚠️ Đáp ứng một phần

Tìm kiếm trong danh bạ và lịch sử đáp ứng đầy đủ. Phần **tra cứu cộng đồng** không có nguồn dữ liệu.

## Thiếu sót và đề xuất

- **Thay "Tra cứu cộng đồng" bằng "Thông tin số" offline:**
  - Vị trí: `libphonenumber` `PhoneNumberOfflineGeocoder` (theo đầu số).
  - Nhà mạng: `PhoneNumberToCarrierMapper`. Lưu ý: ở Việt Nam có chuyển mạng giữ số, nên chỉ mang tính tham khảo.
  - Quốc gia: đã có (`utils/countries.ts`).
  - Thông tin của người dùng: `number_marks` (loại, tên, tin cậy), có bị chặn không, số lần đã gọi.
- **Tìm gần đây**: lưu trong `SharedPreferences` (key `ui.search.recent`, mảng JSON tối đa 8 phần tử). Không cần bảng. Thêm key vào mục 3 của schema.
- **Tìm trong `CallLog` theo số**: dùng cột `CACHED_NORMALIZED_NUMBER` (E.164) thay vì `NUMBER` (dạng gốc), để `0901…` và `+84901…` khớp nhau.
- Bỏ danh sách "số mẫu" khi chạy thật (chỉ dành cho demo).
