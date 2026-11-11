# 18. Cài đặt

**Màn hình:** `views/settings/*` (`SettingsView`, `NotificationsView`, `SoundView`, `CallerIdPrefsView`, `FeedbackView`, `AboutView`), `components/settings/*`

## Chức năng trong UI

| Nhóm | Mục |
|---|---|
| Chung | Thông báo, Âm thanh và rung, Ngôn ngữ |
| Cuộc gọi | SIM gọi đi (Luôn hỏi / SIM 1 / SIM 2), Hiển thị thông tin người gọi |
| Bảo vệ | Cảnh báo lừa đảo (công tắc), Quy tắc chặn (lối tắt sang tab Chặn) |
| Dữ liệu | **Xoá toàn bộ lịch sử cuộc gọi** |
| Thử nghiệm | Mô phỏng cuộc gọi đến (DEMO) |
| Hỗ trợ | Đánh giá, Góp ý, Chia sẻ ứng dụng, Giới thiệu và quyền riêng tư |

- **Thông báo**: cuộc gọi đáng ngờ, cuộc gọi nhỡ, nhắc cuộc gọi nhỡ, thông báo khi chặn.
- **Âm thanh**: nhạc chuông (danh sách cố định), âm bàn phím (im lặng / rung / âm thanh / cả hai).
- **Hiển thị người gọi**: bật popup, hiện cả với danh bạ, hiện sau cuộc gọi, kiểu (popup / toàn màn hình), vị trí, xem trước, xem thử.
- **Góp ý**: dễ dùng không, tính năng dùng nhiều nhất, nội dung (tối đa 500 ký tự).

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Các công tắc và lựa chọn | Đọc/Ghi | `SharedPreferences` | ⚠️ nhiều key chưa liệt kê |
| Xoá toàn bộ lịch sử | Ghi | Xoá `CallLog` + `DELETE FROM call_meta` | ✅ |
| Đánh giá, góp ý, chia sẻ | Ghi | — (mở Play Store / email / bảng chia sẻ) | ✅ không cần lưu |

## Đánh giá: ✅ Đáp ứng (cần bổ sung danh sách key)

## Thiếu sót và đề xuất

**Bổ sung các key vào mục 3 của schema:**

| Key | Native đọc | Ghi chú |
|---|---|---|
| `ui.language` | ✘ | |
| `ui.defaultSim` | ✘ | `ask` \| `sim1` \| `sim2`; nên lưu theo `PhoneAccountHandle` thay vì số thứ tự SIM |
| `ui.dialSound` | ✘ | |
| `callerId.enabled` | ✔ | |
| `callerId.showForContacts` | ✔ | |
| `callerId.showAfterCall` | ✔ | |
| `callerId.scamWarning` | ✔ | Công tắc "Cảnh báo lừa đảo" |
| `popup.size`, `popup.position` | ✔ | |
| `notify.suspiciousCall` | ✔ | |
| `notify.missedCall` | ✔ | |
| `notify.remindMissed` | ✔ | |
| `block.notify` | ✔ | Đã có. UI đang có **2 công tắc** cho cùng ý nghĩa: "Thông báo khi chặn" (tab Chặn) và "Thông báo khi chặn cuộc gọi" (Thông báo). Nên gộp thành một. |

**Các điểm khác:**

- **Nhạc chuông**: app Điện thoại mặc định thường dùng nhạc chuông của hệ thống (`RingtoneManager`) và nhạc chuông riêng theo liên hệ (`Contacts.CUSTOM_RINGTONE`). Danh sách cố định "Chuông 1–4" nên thay bằng bộ chọn nhạc chuông của Android. Khi đó không cần lưu gì.
- **Xoá toàn bộ lịch sử**: **không xoá** `call_stats_daily` (schema mục 2.2). Hộp thoại hiện ghi "Danh sách chặn và danh bạ không bị ảnh hưởng", nên ghi thêm "Thống kê vẫn được giữ". Nên có mục riêng **"Xoá dữ liệu thống kê"** trong nhóm Dữ liệu.
- **Góp ý / Đánh giá**: không có server, nên Góp ý mở email (`ACTION_SENDTO`), Đánh giá mở Play Store (In-App Review API). Không cần lưu.
- **Giới thiệu và quyền riêng tư**: cập nhật nội dung, bỏ các câu nhắc "cộng đồng" và "bản demo".
- **Chưa có** mục **Xuất/Nhập danh sách chặn** (schema mục 12 có đề xuất). Có thể thêm vào nhóm Dữ liệu.
