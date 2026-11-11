# 01. Khởi động: ngôn ngữ, giới thiệu, cấp quyền

**Màn hình:** `views/boot/SplashView.vue`, `LanguageView.vue`, `OnboardingView.vue`, `PermissionsView.vue`

## Chức năng trong UI

- Splash khi mở app.
- Chọn ngôn ngữ (Tiếng Việt; English đánh dấu "sắp có"). Mở lại được từ Cài đặt.
- 3 trang giới thiệu (nhận diện số lạ, cảnh báo lừa đảo, chặn spam + thống kê).
- Cấp quyền: Cuộc gọi & nhật ký, Danh bạ, Hiển thị trên ứng dụng khác, Thông báo.
- Đặt vai trò: Ứng dụng gọi điện mặc định, Ứng dụng nhận diện và lọc cuộc gọi.
- "Cho phép tất cả" / "Để sau" (cảnh báo bảo vệ bị hạn chế). Bắt buộc Cuộc gọi + Danh bạ để tiếp tục.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Ngôn ngữ | Ghi | `SharedPreferences` (`ui.*`) | ✅ |
| Đã xem giới thiệu | Ghi | `SharedPreferences` | ⚠️ chưa liệt kê key |
| Trạng thái quyền / vai trò | Đọc | Hệ thống (`checkSelfPermission`, `RoleManager`) | ✅ |

## Đánh giá: ✅ Đáp ứng

Chức năng này chỉ dùng cài đặt và trạng thái quyền của hệ thống, không cần bảng nào.

## Thiếu sót và đề xuất

- Bổ sung vào mục 3 của schema các key: `boot.onboardingDone`, `ui.language`.
- **Không lưu `permissionsDone`** như bản hiện tại (`AppSettings.permissionsDone`). Luôn hỏi trực tiếp hệ thống mỗi lần app quay về foreground, vì người dùng có thể thu hồi quyền trong Cài đặt Android.
- Mục 1.1 của schema nói `CallScreeningService` đi kèm `ROLE_DIALER`. Vì vậy UI **không cần xin riêng** vai trò "nhận diện và lọc cuộc gọi" khi đã là app gọi điện mặc định. Nên gộp hai vai trò thành một bước.
