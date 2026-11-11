# 08. Báo cáo số và đặt tên cho số

**Màn hình / thành phần:** `components/number/ReportSheet.vue`, `components/number/SuggestNameSheet.vue`, `components/call/ReportSheet.vue`, `components/call/SuggestNameSheet.vue`; được mở từ Chi tiết số, Lịch sử cuộc gọi, Sau cuộc gọi.

## Chức năng trong UI

- **Báo cáo số**: chọn loại (lừa đảo, spam, vay tiền, robocall, việc làm giả, tiếp thị, giả danh) + ghi chú tuỳ chọn → "Cảm ơn bạn đã báo cáo" → đề nghị **"Chặn số này luôn?"**.
- **Gợi ý tên** cho số lạ ("Ví dụ: Giao hàng nhanh").
- **"Không phải spam"** (ở màn Sau cuộc gọi).
- Sau khi báo cáo, mọi dòng lịch sử của số đó được cập nhật rủi ro (`calls.applyRisk`).

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Loại báo cáo | Ghi | `number_marks.category` | ✅ |
| Ghi chú báo cáo | Ghi | — | ❌ `number_marks` chưa có cột `note` |
| Thời điểm báo cáo | Ghi | `number_marks.updated_at` | ⚠️ dùng tạm được |
| Chặn luôn | Ghi | `BlockedNumberContract` | ✅ |
| Tên đặt cho số | Ghi | `number_marks.name` | ✅ |
| "Không phải spam" | Ghi | `number_marks.trusted = 1` (+ xoá `category`) | ✅ |
| Cập nhật rủi ro cho lịch sử cũ | Ghi | — | ⚠️ xem dưới |

## Đánh giá: ⚠️ Đáp ứng một phần

## Thiếu sót và đề xuất

- **Thêm cột `note TEXT`** vào `number_marks` để lưu ghi chú báo cáo.
- **Ý nghĩa thay đổi**: không có server nên "báo cáo" chỉ là **đánh dấu cho chính mình**. Nên đổi chữ trên UI: "Báo cáo" → "Đánh dấu là…"; "Giúp cộng đồng nhận diện" → "Giúp bạn nhận ra số này lần sau"; "Gợi ý tên" → "Đặt tên".
- **Rủi ro trong lịch sử cũ**: không cần cập nhật `call_meta`. `call_meta.risk` là ảnh chụp *tại lúc gọi*. Khi hiển thị, UI lấy rủi ro **hiện tại** từ `number_marks.category` (nếu có), nếu không thì lấy `call_meta.risk`. Như vậy bỏ được hàm `calls.applyRisk`.
- **Số ẩn**: không báo cáo hay đặt tên được (`number = 0`). UI đã xử lý đúng.
- **Thống nhất "Không phải spam"**: đặt `trusted = 1` và gỡ số khỏi `BlockedNumberContract` nếu đang bị chặn (theo schema mục 4).
