# Safe Dial — UI/UX

Ứng dụng quản lý cuộc gọi: **lịch sử cuộc gọi**, **nhận diện số lạ + cảnh báo lừa đảo**, **chặn spam / số quốc tế theo
danh sách đen và quy tắc**, **thống kê tần suất liên lạc**.

> Đây là bản **giao diện + luồng** chạy bằng **dữ liệu giả lập**. Mọi thứ liên quan đến điện thoại thật (vai trò
> dialer mặc định, call screening, đọc nhật ký cuộc gọi / danh bạ, popup caller-ID trên ứng dụng khác, chặn cuộc gọi
> thật) đều được mô phỏng, chưa có code native.

Thiết kế luồng dựa trên phân tích hai ứng dụng tham khảo trong `../data-scraping/` (Trust Call, CallApp). Giao diện,
tên gọi, hình ảnh và nội dung là của riêng Safe Dial; không dùng lại tài nguyên của hai ứng dụng đó.

## Công nghệ

Vue 3 + TypeScript (strict) · Vite · Tailwind CSS v4 · Pinia · Vue Router (hash) · `@iconify/vue` (bộ **lucide đóng
gói sẵn**, chạy offline) · Capacitor 8 (Android).

## Chạy thử

```bash
npm install
npm run dev          # http://localhost:5173 — mở bằng khung điện thoại (≤480px)
npm run typecheck    # kiểm tra kiểu (vue-tsc)
npm run build        # typecheck + build ra dist/
npm run check:icons  # báo tên icon lucide không tồn tại (icon sai sẽ render trống)
```

Chạy trên Android (cần Android Studio):

```bash
npm run cap:android  # build web → cap sync → mở Android Studio
```

`appId`: `vn.alf.safedial` (đổi trong `capacitor.config.ts` nếu cần). Thư mục `android/` đã được tạo sẵn; các file sinh
ra khi build (assets/public, build/, local.properties…) đã nằm trong `.gitignore`.

## Các màn hình và luồng

```
/                    Splash → (lần đầu) /language → /onboarding → /permissions → /home/calls
/home/calls          Lịch sử cuộc gọi: lọc Tất cả/Nhỡ/Đến/Đi/Số lạ/Spam–Lừa đảo/Đã chặn, chọn nhiều để xoá
/home/contacts       Danh bạ + Yêu thích
/home/block          Đã chặn · Danh sách đen (quy tắc) · Cài đặt chặn
/home/stats          Thống kê tần suất liên lạc, biểu đồ, người lạ gọi nhiều
/dialpad             Bàn phím + nhận diện số theo thời gian thực khi đang gõ
/search              Tra cứu một số trong cơ sở dữ liệu cộng đồng
/number/:n           Chi tiết số: cảnh báo, báo cáo spam, gợi ý tên, chặn, lịch sử
/number/:n/history   Lịch sử riêng của số
/number/:n/stats     Thống kê liên lạc riêng của số
/block/rule/new      Thêm quy tắc (số / bắt đầu bằng / chứa / kết thúc bằng / quốc gia) kèm xem trước số cuộc gọi khớp
/block/test          Kiểm tra một số sẽ bị xử lý thế nào (có bảng từng bước)
/call/simulate       Mô phỏng cuộc gọi đến (lừa đảo, số lạ, quốc tế, ẩn danh, người quen…)
/call/incoming       Cuộc gọi đến: popup caller-ID (trên/giữa/dưới) hoặc toàn màn hình, cảnh báo lừa đảo
/call/active         Đang gọi
/call/after          Sau cuộc gọi: "Đây là ai?" — báo cáo spam, gợi ý tên, chặn
/settings/*          Cài đặt: thông báo, âm thanh, hiển thị caller-ID, góp ý, giới thiệu
```

Muốn xem tính năng cảnh báo lừa đảo: **Cài đặt → Mô phỏng cuộc gọi đến**, hoặc mở trực tiếp `/#/call/simulate`.

## Bộ máy chặn cuộc gọi

`src/utils/blockEngine.ts` là hàm thuần, tách khỏi UI, thứ tự kiểm tra:

1. Số ẩn → 2. Cuộc gọi quốc tế (số trong danh bạ được miễn) → 3. Không có trong danh bạ →
4. Danh sách số chặn tường minh (áp dụng cả với số trong danh bạ) →
5. Quy tắc mẫu (bắt đầu / chứa / kết thúc / quốc gia; danh bạ được miễn) → 6. Spam từ cộng đồng.

Bước 6 chỉ tự chặn số có từ 50 báo cáo trở lên (`TOP_SPAMMER_MIN_REPORTS`); số mới nổi ít báo cáo hơn chỉ bị
**cảnh báo** (xem kịch bản "Lừa đảo mới nổi" trong phần mô phỏng).

Cách xử lý: *cúp máy* (`block`) hoặc *tắt chuông* (`silence`). Mọi cuộc gọi bị chặn lưu **lý do** vào lịch sử.

## Những chỗ cố ý khác với ứng dụng tham khảo

Phân tích hai ứng dụng gốc phát hiện một số lỗi; Safe Dial **không sao chép** chúng:

| Ứng dụng gốc | Safe Dial |
|---|---|
| Chặn theo đầu số / quốc gia được lưu nhưng **không bao giờ áp dụng** (Trust Call) | Áp dụng đầy đủ, có kiểm tra và xem trước số cuộc gọi khớp |
| Cờ "đã xem onboarding/ngôn ngữ" được ghi nhưng không đọc (Trust Call) | Splash đọc cờ và định tuyến đúng lần đầu / các lần sau |
| Màn hình quyền & ứng dụng mặc định tồn tại trong manifest nhưng không có chỗ mở (Trust Call) | Luồng quyền hoàn chỉnh ngay sau onboarding |
| Deep link `fragment="theme"` mở nhầm tab (Trust Call) | Điều hướng bằng route tên rõ ràng, không dùng chỉ số tab |
| Danh bạ làm "danh sách trắng ngầm" nhưng không có chỗ giải thích (cả hai) | Giải thích trong cài đặt chặn; số trong danh bạ chỉ bị chặn khi nằm trong danh sách số tường minh |
| Cuộc gọi bị chặn không vào nhật ký hệ thống, không rõ lý do (Trust Call) | Mỗi cuộc gọi bị chặn hiện trong lịch sử kèm lý do |
| Trust Call chỉ có "chặn", không có "tắt chuông" | Có hai cách xử lý: cúp máy / tắt chuông (như CallApp) |

## Cấu trúc

Xem [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md): thư mục, thành phần dùng chung, quy ước, và cách thay `services/`
bằng plugin native sau này.

## Việc còn lại để thành ứng dụng thật

- Plugin Capacitor/Android: `RoleManager` (dialer + call screening), `CallScreeningService`, đọc `CallLog`/`Contacts`,
  overlay caller-ID, `BlockedNumberContract` hoặc chặn tại tầng app.
- Backend tra cứu số / báo cáo spam (hiện là `SPAM_DB` trong `src/data/seed.ts`).
- Bản dịch tiếng Anh (`src/locales/`); hiện chỉ có tiếng Việt.
- Icon launcher và splash riêng (đang dùng mặc định của Capacitor).
