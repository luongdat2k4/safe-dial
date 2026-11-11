# 17. Thống kê liên lạc của một số

**Màn hình:** `views/stats/NumberStatsView.vue`

## Chức năng trong UI

- **Thời lượng đàm thoại**: tổng, cuộc gọi đến, cuộc gọi đi, trung bình mỗi cuộc.
- **Cuộc gọi đến**: tổng, đã nghe, nhỡ, đã chặn.
- **Cuộc gọi đi**: tổng, được nghe máy, không nghe.
- **8 tuần gần nhất**: số cuộc gọi mỗi tuần, chia theo loại.
- **Thường gọi vào thứ mấy**: phân bổ theo thứ trong tuần.
- **Mốc thời gian**: cuộc gọi đầu tiên, cuộc gọi gần nhất, nút Xem lịch sử.

## Dữ liệu cần

| Dữ liệu | Đọc/Ghi | Nơi lưu theo schema | Đáp ứng |
|---|---|---|---|
| Tổng thời lượng | Đọc | `call_stats_daily.talk_sec` | ✅ |
| Thời lượng **đến / đi** riêng | Đọc | — | ❌ chỉ có `talk_sec` gộp |
| Đến: tổng, nhỡ, chặn | Đọc | `incoming`, `missed`, `blocked` | ✅ |
| Đến: **đã nghe** | Đọc | — | ⚠️ suy ra được nếu `incoming` chỉ là cuộc đã nghe |
| Đi: **được nghe máy / không nghe** | Đọc | — | ❌ thiếu cột |
| 8 tuần theo loại | Đọc | `call_stats_daily` nhóm theo `day / 7` | ✅ |
| Theo thứ trong tuần | Đọc | Tính từ `day` | ✅ |
| Cuộc gọi đầu tiên | Đọc | `MIN(day)` | ✅ (chỉ theo ngày) |
| Cuộc gọi gần nhất | Đọc | `CallLog` (chính xác đến giờ) hoặc `MAX(day)` | ✅ |

## Đánh giá: ⚠️ Đáp ứng một phần

## Thiếu sót và đề xuất

- Cần các cột đã đề xuất ở [16](16-statistics.md): `talk_in_sec`, `talk_out_sec`, `answered_out`, và làm rõ ý nghĩa `incoming`.
- **Làm rõ ý nghĩa cột trong schema:** `incoming` = cuộc đến **đã nghe**, `missed` = nhỡ, `rejected` = từ chối, `blocked` = bị chặn. Như vậy "Tổng đến" = `incoming + missed + rejected + blocked`. Cách hiểu này khớp với `CallLog.TYPE`.
- **Cuộc gọi đầu tiên** chỉ chính xác đến ngày. Nếu muốn hiện cả giờ, thêm bảng nhỏ `number_first_seen(number, first_at)`. Thường không cần: chỉ hiện ngày là đủ.
- Thống kê của một số **dài hơn** lịch sử trong [07](07-number-history.md), vì `CallLog` bị cắt còn thống kê thì không. Đây là hành vi mong muốn, nhưng nên giải thích trên UI.
