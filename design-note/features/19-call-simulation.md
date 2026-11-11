# 19. Mô phỏng cuộc gọi đến (DEMO)

**Màn hình:** `views/call/SimulateView.vue`, `components/call/ScenarioCard.vue`, `services/mockDialer.ts`, `data/seed.ts`

## Chức năng trong UI

- Chọn kiểu hiển thị: popup / toàn màn hình, vị trí popup.
- Danh sách **kịch bản** cuộc gọi (số an toàn, số lạ, spam, lừa đảo, số ẩn, quốc tế…), mỗi kịch bản báo trước "Sẽ đổ chuông" hoặc "Sẽ bị chặn".
- Nhập **số tuỳ chọn** để gọi thử.
- Kết quả: đổ chuông (sang màn cuộc gọi đến) hoặc thông báo "Đã chặn / Đã tắt chuông", kèm lối sang mục Đã chặn.
- Cuộc gọi mô phỏng được **ghi vào lịch sử**.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Quyết định chặn | Đọc | Như [12](12-block-test.md) | ✅ |
| Ghi cuộc gọi mô phỏng vào lịch sử | Ghi | `CallLog` + `call_meta` + `call_stats_daily` | ⚠️ không nên |

## Đánh giá: ✅ Đáp ứng (nhưng không nên đưa vào bản phát hành)

## Thiếu sót và đề xuất

- Đây là **chức năng demo**. Khi chạy thật thì có cuộc gọi thật, nên màn này **nên ẩn** trong bản phát hành (chỉ bật ở bản debug).
- **Không ghi cuộc gọi giả vào `CallLog` và `call_stats_daily`** của máy thật, vì sẽ làm sai lịch sử và thống kê. Nếu giữ chức năng này cho mục đích hướng dẫn, chỉ chạy quyết định ở chế độ thử (dry-run) như [12](12-block-test.md) và hiện màn cuộc gọi đến giả, **không ghi** gì.
- Cài đặt kiểu popup và vị trí popup ở đây dùng chung key với [18](18-settings.md) (`popup.*`).
