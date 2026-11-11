# 16. Thống kê cuộc gọi (tab Thống kê)

**Màn hình:** `views/home/StatsTab.vue`, `components/charts/*` (`KpiCard`, `BarChart`, `DonutChart`, `FrequencyList`, `StrangerList`, `HBar`), `utils/stats.ts`

## Chức năng trong UI

- Chọn khoảng thời gian: **7 ngày / 30 ngày / Tất cả**.
- **KPI**: Tổng cuộc gọi, Thời gian đàm thoại (+ trung bình mỗi cuộc), Cuộc gọi nhỡ, **Đáng ngờ / Đã chặn**.
- **Cuộc gọi mỗi ngày** (biểu đồ cột).
- **Loại cuộc gọi** (biểu đồ tròn: đến / đi / nhỡ / chặn).
- **Tần suất liên lạc**: xếp hạng liên hệ trong danh bạ theo số lần, kèm thời lượng.
- **Người lạ gọi nhiều nhất**: số không có trong danh bạ, số lần, lần gần nhất, nút chặn / đã chặn.
- **Mức độ an toàn của cuộc gọi đến**: phân bổ an toàn / số lạ / spam / lừa đảo.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Tổng, đến, đi, nhỡ, chặn theo khoảng thời gian | Đọc | `call_stats_daily` | ✅ |
| Tổng thời lượng | Đọc | `call_stats_daily.talk_sec` | ✅ |
| Trung bình mỗi cuộc **có đàm thoại** | Đọc | — | ⚠️ thiếu số cuộc có đàm thoại |
| Cuộc gọi mỗi ngày | Đọc | `call_stats_daily` nhóm theo `day` | ✅ |
| Tần suất theo liên hệ | Đọc | `call_stats_daily` nhóm theo `number`, map qua `PhoneLookup` | ✅ |
| Người lạ gọi nhiều nhất + lần gần nhất | Đọc | `call_stats_daily` (số không có trong danh bạ), `MAX(day)` | ✅ (lần gần nhất chỉ theo ngày) |
| Đã chặn chưa | Đọc | `BlockedNumberContract` | ✅ |
| **Đáng ngờ** (đến từ spam/lừa đảo) | Đọc | `call_meta` | ⚠️ mất dữ liệu cũ |
| **Phân bổ rủi ro cuộc gọi đến** | Đọc | `call_meta` | ⚠️ mất dữ liệu cũ |

## Đánh giá: ⚠️ Đáp ứng một phần

Khoảng **7 ngày / 30 ngày** đáp ứng đầy đủ. Khoảng **"Tất cả"** bị sai ở các chỉ số rủi ro, vì `call_meta` bị dọn cùng `CallLog` (Android chỉ giữ khoảng 500 cuộc).

## Thiếu sót và đề xuất

Bổ sung cột vào `call_stats_daily`:

| Cột mới | Dùng cho |
|---|---|
| `answered_in` | Số cuộc gọi đến **đã nghe** (tính trung bình thời lượng, "Đã nghe" ở thống kê số) |
| `answered_out` | Số cuộc gọi đi **được nghe máy** (thống kê số: "Được nghe máy / Không nghe") |
| `talk_in_sec`, `talk_out_sec` | Thay `talk_sec`: thời lượng theo hướng (thống kê số) |
| `risk_unknown`, `risk_spam`, `risk_scam` | Số cuộc gọi **đến** theo rủi ro tại lúc gọi. "An toàn" = tổng đến − 3 cột này |
| `warned` | Số cuộc bị cảnh báo (KPI "Đáng ngờ") |

- Mỗi dòng tăng thêm khoảng 10–20 byte. Ước lượng vẫn **dưới 200 KB/năm**.
- `call_stats_daily` **không có giờ trong ngày**. UI hiện chưa cần, dù phụ đề "Thống kê liên lạc" có nhắc "khung giờ gọi". Nếu sau này cần biểu đồ theo giờ thì thêm bảng `call_stats_hourly(hour 0–23, weekday 0–6, count)` gộp toàn thời gian, chỉ 168 dòng.
- Danh sách tần suất gộp **theo người** (một liên hệ nhiều số) ở phía app sau khi map qua `PhoneLookup`, như schema mục 6.
