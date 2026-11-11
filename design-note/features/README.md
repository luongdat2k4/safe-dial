# Đối chiếu chức năng UI với schema

Mỗi file trong thư mục này mô tả một chức năng đang có trong UI (`App/src`) và đánh giá xem [schema hiện tại](../schema-design.md) có đáp ứng được không.

**Ký hiệu:** ✅ đáp ứng · ⚠️ đáp ứng một phần / cần bổ sung nhỏ · ❌ không có nguồn dữ liệu

## Tổng hợp

| # | Chức năng | Đánh giá | Vấn đề chính |
|---|---|---|---|
| 01 | [Khởi động, ngôn ngữ, cấp quyền](01-onboarding-permissions.md) | ✅ | Bỏ `permissionsDone`; gộp hai vai trò thành một |
| 02 | [Lịch sử cuộc gọi](02-call-history.md) | ✅ | Thêm index `call_meta(at)` |
| 03 | [Danh bạ và Yêu thích](03-contacts-favorites.md) | ✅ | Đọc theo trang thay vì nạp hết |
| 04 | [Bàn phím quay số](04-dialpad.md) | ⚠️ | "N người báo cáo", "đã xác minh" không có nguồn |
| 05 | [Tìm kiếm và tra cứu số](05-search.md) | ⚠️ | Tra cứu cộng đồng → thông tin offline; "tìm gần đây" chưa có chỗ lưu |
| 06 | [Chi tiết số](06-number-detail.md) | ⚠️ | Khối "Cộng đồng"; chưa có UI cho số tin cậy |
| 07 | [Lịch sử của một số](07-number-history.md) | ✅ | Lịch sử ngắn hơn thống kê (do Android giới hạn ~500 cuộc) |
| 08 | [Báo cáo và đặt tên](08-report-and-name.md) | ⚠️ | Thiếu cột `note`; "báo cáo" thành "đánh dấu cho mình" |
| 09 | [Danh sách đen và quy tắc](09-blacklist-rules.md) | ✅ | UI chưa dùng `enabled` / `hit_count` |
| 10 | [Cuộc gọi đã chặn](10-blocked-calls.md) | ✅ | Thiếu bit `country` trong `reasons` |
| 11 | [Cài đặt chặn tự động](11-block-settings.md) | ⚠️ | "Chặn spam cộng đồng" không có nguồn; thứ tự ưu tiên lệch với schema |
| 12 | [Kiểm tra một số](12-block-test.md) | ✅ | Các bước phải khớp schema mục 4; nên gọi native ở chế độ thử |
| 13 | [Cuộc gọi đến](13-incoming-call.md) | ✅ | Màn cuộc gọi đến nên làm native; bỏ "N người báo cáo" |
| 14 | [Đang trong cuộc gọi](14-active-call.md) | ⚠️ | **Ghi chú cuộc gọi** chưa có chỗ lưu |
| 15 | [Sau cuộc gọi](15-after-call.md) | ✅ | Lấy dữ liệu từ `InCallService`, không đọc lại `CallLog` |
| 16 | [Thống kê](16-statistics.md) | ⚠️ | Thiếu cột rủi ro, đã nghe, thời lượng theo hướng |
| 17 | [Thống kê của một số](17-number-stats.md) | ⚠️ | Thiếu thời lượng đến/đi, được nghe máy |
| 18 | [Cài đặt](18-settings.md) | ✅ | Bổ sung danh sách key; nhạc chuông dùng của hệ thống |
| 19 | [Mô phỏng cuộc gọi](19-call-simulation.md) | ✅ | Chỉ dùng cho demo; không ghi vào dữ liệu thật |

**Kết quả:** 11 ✅ · 8 ⚠️ · 0 chức năng hoàn toàn không đáp ứng được.

Các điểm ⚠️ chia làm hai nhóm:

1. **Thiếu cột hoặc key** trong schema → bổ sung nhỏ (bên dưới).
2. **Dữ liệu cộng đồng** (số người báo cáo, tên cộng đồng gợi ý, số đã xác minh, chặn top spammer) → không có nguồn vì schema chỉ dùng dữ liệu trên máy. Đây là **thay đổi UI**, không phải thay đổi schema.

## Đề xuất thay đổi schema

> ✅ **Đã áp dụng** vào [schema-design.md](../schema-design.md). Các đánh giá ⚠️ do thiếu cột/key ở trên giờ đã được đáp ứng; chỉ còn các điểm cần sửa UI/logic ở mục tiếp theo.

### Bảng

| Bảng | Thay đổi | Lý do (file) |
|---|---|---|
| `call_stats_daily` | Thay `talk_sec` bằng `talk_in_sec`, `talk_out_sec` | 16, 17 |
| `call_stats_daily` | Thêm `answered_out` (cuộc gọi đi được nghe máy) | 16, 17 |
| `call_stats_daily` | Thêm `risk_unknown`, `risk_spam`, `risk_scam`, `warned` (cuộc gọi đến) | 16 |
| `call_stats_daily` | Ghi rõ: `incoming` = cuộc đến **đã nghe**; tổng đến = `incoming + missed + rejected + blocked` | 17 |
| `call_meta` | Thêm index `(at)` | 02, 10 |
| `call_meta.reasons` | Thêm bit `128 = country`; bỏ ý nghĩa "spammer cộng đồng" | 10 |
| `number_marks` | Thêm cột `note TEXT` (ghi chú khi báo cáo) | 08 |
| **Mới** `call_notes` | `(id, number, at, note)`, không gắn `call_id` để không bị dọn theo `CallLog` | 14 |

### Key `SharedPreferences` cần liệt kê thêm

`boot.onboardingDone`, `ui.language`, `ui.defaultSim`, `ui.dialSound`, `ui.search.recent`, `callerId.enabled`, `callerId.showForContacts`, `callerId.showAfterCall`, `callerId.scamWarning`, `callerId.quickReplies`, `popup.size`, `popup.position`, `notify.suspiciousCall`, `notify.missedCall`, `notify.remindMissed`, (tuỳ chọn) `block.autoBlockReported`.

## Đề xuất thay đổi UI / logic

1. **Bỏ hoặc đổi các chỗ nhắc "cộng đồng"**: số người báo cáo → "Bạn đã đánh dấu: {loại}"; "Gợi ý tên" → "Đặt tên"; "Tra cứu cộng đồng" → "Thông tin số" (vị trí và nhà mạng offline bằng `libphonenumber`); bỏ công tắc "Chặn số spam cộng đồng" hoặc đổi nghĩa. (04, 05, 06, 08, 11, 13, 15)
2. **Thống nhất thứ tự quyết định chặn** giữa `utils/blockEngine.ts`, màn Kiểm tra một số và `CallScreeningService` theo schema mục 4. Nên để logic ở native và màn kiểm tra gọi qua plugin. (11, 12)
3. **Thêm UI cho số tin cậy** (`number_marks.trusted`): "Đánh dấu tin cậy" ở Chi tiết số; "Không phải spam" ở Sau cuộc gọi. (06, 08, 15)
4. **Tận dụng `block_rules.enabled` / `hit_count`**: công tắc trên từng quy tắc và dòng "Đã chặn N cuộc". (09)
5. **Xoá lịch sử không xoá thống kê**: ghi rõ trên hộp thoại xác nhận; thêm mục "Xoá dữ liệu thống kê" riêng. (02, 06, 18)
6. **Đọc dữ liệu theo trang** thay vì nạp toàn bộ danh bạ và lịch sử vào Pinia. (02, 03)
7. **Màn cuộc gọi đến làm native** (hoặc khởi động WebView sẵn) để kịp hiện khi máy khoá. (13)
8. **Ẩn chức năng Mô phỏng** trong bản phát hành. (19)
9. **Gộp hai công tắc "Thông báo khi chặn"** (tab Chặn và Cài đặt → Thông báo). (18)

## Cần kiểm tra trên máy thật

- Cuộc gọi bị **hệ thống** chặn (số trong `BlockedNumberContract`) có đi qua `InCallService` không, để ghi `call_meta` và thống kê. (10)
- Ghép quyết định của screening với dòng `CallLog` khi **cùng một số gọi liên tiếp**. (schema mục 2.1)
- `CACHED_NORMALIZED_NUMBER` có được điền đầy đủ trên các dòng máy phổ biến ở Việt Nam không. (05, 07)
