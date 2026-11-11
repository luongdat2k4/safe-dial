# 03. Danh bạ và Yêu thích

**Màn hình:** `views/home/ContactsTab.vue`, `components/ContactItem.vue`

## Chức năng trong UI

- Tab **Danh bạ**: danh sách nhóm theo chữ cái đầu, tìm theo tên hoặc số, số lượng liên hệ.
- Tab **Yêu thích**: liên hệ đã gắn sao.
- Gọi nhanh từ danh sách; bật/tắt yêu thích bằng biểu tượng ngôi sao.
- Mở chi tiết số khi chạm vào liên hệ.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Danh sách liên hệ, ảnh, số | Đọc | `ContactsContract` (Android), đọc theo trang | ✅ |
| Tìm theo tên/số | Đọc | `Phone.CONTENT_FILTER_URI` | ✅ |
| Yêu thích | Đọc/Ghi | `Contacts.STARRED` (cần `WRITE_CONTACTS`) | ✅ |
| Đếm số liên hệ | Đọc | `COUNT` trên `ContactsContract` | ✅ |

## Đánh giá: ✅ Đáp ứng

Toàn bộ dữ liệu nằm trong Android. Không cần bảng nào của app.

## Thiếu sót và đề xuất

- Store `contacts` hiện **nạp toàn bộ danh bạ vào Pinia** (`dialer.getContacts()`). Với danh bạ vài nghìn liên hệ nên đổi sang đọc theo trang hoặc danh sách ảo (virtual list), đúng như mục 8 của schema.
- Danh sách yêu thích của app sẽ **giống** danh sách yêu thích trong app Danh bạ của Google, vì dùng chung `STARRED`. Đây là hành vi đúng của một app Điện thoại.
- Kiểu `Contact.favorite` / `Contact.note` trong `src/types` cần ánh xạ sang `STARRED` / `CommonDataKinds.Note` (schema mục 11).
- Chưa có màn **thêm/sửa liên hệ**. App Điện thoại thường mở `Intent.ACTION_INSERT` / `ACTION_EDIT` của Android, nên không cần schema.
