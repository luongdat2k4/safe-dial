# 06. Chi tiết số

**Màn hình:** `views/number/NumberDetailView.vue`, `components/number/NumberInfoCard.vue`, `ScamWarning.vue`

## Chức năng trong UI

- Phần đầu: tên (hoặc "Chưa có tên"), số, huy hiệu rủi ro, "Có trong danh bạ". Riêng **số ẩn** thì báo không thể tra cứu hay gọi lại.
- **Cảnh báo lừa đảo/spam**: số người đã báo cáo + loại, kèm 3 mẹo tự bảo vệ.
- Banner "Số này đang nằm trong danh sách chặn".
- Hành động: Gọi, Nhắn tin, Yêu thích/Bỏ thích (với liên hệ), Chặn/Bỏ chặn, Lưu danh bạ, Báo cáo số này, Gợi ý tên.
- **Thông tin số**: vị trí, nhà mạng, số báo cáo, lần gọi gần nhất, quốc gia.
- **Cộng đồng**: tên do người dùng gợi ý.
- **Cuộc gọi gần đây** với số này; lối vào **Lịch sử** và **Thống kê liên lạc** của số.
- Menu: Sao chép số, Chia sẻ, Chặn/Bỏ chặn, **Xoá lịch sử số này**.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Tên, có trong danh bạ | Đọc | `PhoneLookup` → `number_marks.name` | ✅ |
| Loại lừa đảo / spam | Đọc | `number_marks.category` | ✅ |
| Đang bị chặn; chặn / bỏ chặn | Đọc/Ghi | `BlockedNumberContract` | ✅ |
| Yêu thích | Đọc/Ghi | `Contacts.STARRED` | ✅ |
| Lần gọi gần nhất, cuộc gọi gần đây | Đọc | `CallLog` theo `CACHED_NORMALIZED_NUMBER` | ✅ |
| Quốc gia | Đọc | Tính từ số (`utils/countries.ts`) | ✅ |
| Xoá lịch sử số này | Ghi | Xoá `CallLog` theo số + `call_meta WHERE number = ?` | ✅ |
| Báo cáo, gợi ý tên | Ghi | `number_marks` (xem [08](08-report-and-name.md)) | ⚠️ |
| Số người báo cáo, tên cộng đồng gợi ý | Đọc | — | ❌ không có nguồn |
| Vị trí, nhà mạng | Đọc | — | ⚠️ tính offline được |

## Đánh giá: ⚠️ Đáp ứng một phần

Mọi thao tác trên dữ liệu của người dùng đều đáp ứng. Phần **cộng đồng** (số người báo cáo, tên gợi ý từ người khác) không có nguồn.

## Thiếu sót và đề xuất

- **Thay khối "Cộng đồng"** bằng "Ghi chú của bạn": hiện `number_marks.name`, `category` và ghi chú báo cáo (cần thêm cột `note`, xem [08](08-report-and-name.md)).
- **Cảnh báo lừa đảo**: đổi "{n} người đã báo cáo" thành "Bạn đã đánh dấu: {loại}". Hiện thêm **dấu hiệu cục bộ** lấy từ lần gọi gần nhất trong `call_meta.reasons` (quốc tế, gọi dồn dập…).
- **Chưa có UI cho danh sách tin cậy** (`number_marks.trusted`), dù schema đã có. Đề xuất thêm hành động "Đánh dấu tin cậy" ở màn này (chỉ hiện với số lạ).
- Vị trí, nhà mạng: dùng `libphonenumber` offline (xem [05](05-search.md)).
- **Xoá lịch sử số này không trừ thống kê**. Hộp thoại xác nhận nên ghi rõ điều này.
