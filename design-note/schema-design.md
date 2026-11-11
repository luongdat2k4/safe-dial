# Thiết kế schema dữ liệu cục bộ — Safe Dial

## 0. Mục tiêu và phạm vi

Safe Dial là **ứng dụng Điện thoại mặc định** trên Android (`ROLE_DIALER`). App có đầy đủ chức năng của một app Điện thoại (gọi, nghe, lịch sử cuộc gọi, danh bạ, yêu thích, chặn số), và bổ sung thêm:

1. Phát hiện số lạ và cảnh báo lừa đảo.
2. Chặn số spam/quốc tế theo danh sách đen và quy tắc.
3. Thống kê tần suất liên lạc.

**Phạm vi:**

- Toàn bộ dữ liệu nằm **trên máy người dùng**. Không có server, không có cơ sở dữ liệu spam cộng đồng.
- Phát hiện lừa đảo dựa trên **danh sách đen do người dùng tạo trên máy**, cộng thêm các dấu hiệu nhận diện cục bộ (số lạ, quốc tế, ẩn số, gọi dồn dập).
- **Mục tiêu thiết kế: DB nhẹ nhất có thể.** Dữ liệu Android đã lưu thì không lưu lại.

> **Cập nhật:** đã bổ sung theo kết quả đối chiếu từng chức năng UI trong [`features/`](features/README.md): thêm cột cho `call_stats_daily` và `number_marks`, thêm bảng `call_notes`, thêm index và bit lý do cho `call_meta`, liệt kê đầy đủ key cài đặt.

## 1. Nguyên tắc

### 1.1. Android lưu gì thì để Android lưu

Khi là app Điện thoại mặc định, app được:

- Đọc **và ghi** nhật ký cuộc gọi (`READ_CALL_LOG`, `WRITE_CALL_LOG`).
- Đọc/ghi danh sách chặn của hệ thống (`BlockedNumberContract`).
- Có `InCallService`: biết trọn vòng đời mỗi cuộc gọi (đổ chuông, nghe, nhỡ, kết thúc, thời lượng).
- Có `CallScreeningService`: chặn/cảnh báo trước khi máy đổ chuông, không cần xin thêm role.
- Xin được `WRITE_CONTACTS` để quản lý danh bạ như app Điện thoại thật.

Vì vậy phần lớn dữ liệu **đã có chỗ lưu trong Android**. Copy sang DB riêng vừa nặng vừa phải đồng bộ hai chiều.

### 1.2. Phân chia dữ liệu

| Dữ liệu | Nơi lưu | Ghi chú |
|---|---|---|
| Danh bạ, số, ảnh | **Android** — `ContactsContract` | Tra số → tên bằng `PhoneLookup` (đã có index, gọi được từ native và plugin). |
| Yêu thích | **Android** — `Contacts.STARRED` | |
| Ghi chú contact | **Android** — `CommonDataKinds.Note` | |
| Nhật ký cuộc gọi | **Android** — `CallLog.Calls` | Xoá lịch sử = xoá thật trong `CallLog`. |
| Chặn số cụ thể | **Android** — `BlockedNumberContract` | Hệ thống tự chặn kể cả khi app crash; các app khác cũng thấy. |
| Rủi ro / lý do cảnh báo / quy tắc đã chặn của mỗi cuộc gọi | **App** — `call_meta` | Android không có. |
| Thống kê lâu dài | **App** — `call_stats_daily` | Android tự xoá nhật ký cũ (chỉ giữ ~500 cuộc). |
| Loại lừa đảo, tên tự đặt, ghi chú, danh sách tin cậy | **App** — `number_marks` | |
| Ghi chú trong cuộc gọi | **App** — `call_notes` | Không gắn với `CallLog` để không bị mất khi Android xoá nhật ký cũ. |
| Quy tắc chặn theo mẫu | **App** — `block_rules` | `BlockedNumberContract` chỉ hỗ trợ số chính xác. |
| Cài đặt | **App** — `SharedPreferences` | Native đọc trực tiếp, không cần bảng SQL. |

### 1.3. DB dùng chung giữa native và WebView

`CallScreeningService` và `InCallService` là **code Android thuần**, chạy cả khi app đang đóng, **không có WebView/JS**. Vì vậy:

- DB là **SQLite** do phía native làm chủ (khuyến nghị **Room**). Không dùng `localStorage`.
- Phía Vue truy cập qua plugin Capacitor tự viết (`SafeDialDb`), không truy cập file DB trực tiếp.
- Cài đặt nằm trong `SharedPreferences`, phía Vue đọc/ghi qua plugin hoặc `@capacitor/preferences` (cùng file `CapacitorStorage`).

### 1.4. Quy ước lưu trữ để DB nhẹ

| Quy ước | Thay vì | Lợi ích |
|---|---|---|
| Số điện thoại lưu **`INTEGER`**: E.164 bỏ dấu `+` (`84901234567`); số ẩn = `0` | `TEXT '+84901234567'` | ~8 byte thay vì 12–16 byte; so sánh và index nhanh hơn. Thêm `+` khi hiển thị. |
| Enum lưu **`INTEGER`** | `TEXT 'scam'` | Nhỏ hơn, không lỗi chính tả. |
| Nhiều lý do lưu **bitmask `INTEGER`** | JSON `["blacklist","international"]` | 1 cột số thay vì chuỗi JSON. |
| Ngày lưu **số ngày từ 1970-01-01** (`INTEGER`) | `TEXT 'YYYY-MM-DD'` | Nhỏ hơn, so sánh khoảng thời gian nhanh. |
| Thời điểm lưu **epoch ms** (`INTEGER`) | ISO 8601 | |
| Bảng có khoá tự nhiên dùng **`WITHOUT ROWID`** | Bảng thường | Không tốn thêm index ẩn. |

Chuẩn hoá số sang E.164 dùng **`libphonenumber`** ở native, với quốc gia mặc định lấy từ cài đặt (`home_country_dial`, mặc định VN). Phía Vue gọi qua plugin để kết quả luôn giống native.

## 2. Các bảng

Chỉ có **5 bảng**: 4 bảng chính (`call_meta`, `call_stats_daily`, `number_marks`, `block_rules`) và 1 bảng phụ (`call_notes`).

### 2.1. `call_meta`: thông tin bổ sung cho cuộc gọi

**Bảng thưa**: chỉ ghi khi cuộc gọi "có chuyện" (bị chặn, tắt chuông, cảnh báo, hoặc là số lạ). Cuộc gọi bình thường với người trong danh bạ **không tạo dòng nào**.

```sql
CREATE TABLE call_meta (
  call_id   INTEGER PRIMARY KEY,   -- CallLog.Calls._ID
  number    INTEGER NOT NULL,      -- E.164 không '+'; 0 = số ẩn
  at        INTEGER NOT NULL,      -- epoch ms, để ghép khi call_id chưa có
  risk      INTEGER NOT NULL,      -- xem bảng mã bên dưới
  reasons   INTEGER NOT NULL,      -- bitmask
  action    INTEGER NOT NULL,
  rule_id   INTEGER                -- block_rules.id nếu bị chặn bởi quy tắc
);
CREATE INDEX idx_call_meta_number ON call_meta(number);
CREATE INDEX idx_call_meta_at     ON call_meta(at);   -- lọc Spam/Đã chặn, tóm tắt 7 ngày
```

**Bảng mã:**

| `risk` | | `action` | | `reasons` (bit) | |
|---|---|---|---|---|---|
| 0 | safe | 0 | allowed | 1 | blacklist |
| 1 | unknown | 1 | warned | 2 | rule |
| 2 | spam | 2 | silenced | 4 | private |
| 3 | scam | 3 | blocked | 8 | international |
| | | | | 16 | nonContact |
| | | | | 32 | burst |
| | | | | 64 | rejectedBefore |
| | | | | 128 | country (quy tắc `kind = 4`) |

- `blacklist` = số nằm trong `BlockedNumberContract` (người dùng đã chặn). Không có lý do "spammer cộng đồng" vì không có dữ liệu cộng đồng.
- `rule` và `country` tách riêng để màn "Đã chặn" hiện đúng lý do, kể cả khi quy tắc đã bị xoá.

**Ghi `call_id`:** lúc `CallScreeningService` quyết định thì cuộc gọi chưa có trong `CallLog`. Cách làm:

1. Screening ghi quyết định vào bộ nhớ tạm (map `number → quyết định`, sống vài phút).
2. Khi cuộc gọi kết thúc, tìm bản ghi mới nhất trong `CallLog` có cùng số, rồi ghi `call_meta` với `call_id` đó.
3. Cuộc gọi bị chặn hoàn toàn: app là dialer nên **tự ghi** một dòng `CallLog` (`type = BLOCKED_TYPE`), rồi dùng `_ID` vừa tạo.

### 2.2. `call_stats_daily`: thống kê theo ngày

Mỗi cặp (ngày, số) có phát sinh cuộc gọi thì 1 dòng. **Ghi tăng dần** ngay khi cuộc gọi kết thúc (`InCallService` → `Call.Callback` khi chuyển sang `STATE_DISCONNECTED`), nên không phải quét lại nhật ký và vẫn đúng dù Android đã xoá bớt nhật ký cũ.

```sql
CREATE TABLE call_stats_daily (
  day           INTEGER NOT NULL,      -- số ngày từ 1970-01-01 (theo giờ máy)
  number        INTEGER NOT NULL,      -- 0 = gộp mọi số ẩn

  -- Cuộc gọi đến (mỗi cuộc rơi vào đúng 1 cột)
  incoming      INTEGER NOT NULL DEFAULT 0,  -- đến, ĐÃ NGHE
  missed        INTEGER NOT NULL DEFAULT 0,  -- đến, nhỡ
  rejected      INTEGER NOT NULL DEFAULT 0,  -- đến, người dùng từ chối
  blocked       INTEGER NOT NULL DEFAULT 0,  -- đến, bị chặn (cúp máy hoặc tắt chuông)

  -- Cuộc gọi đi
  outgoing      INTEGER NOT NULL DEFAULT 0,  -- tổng cuộc gọi đi
  answered_out  INTEGER NOT NULL DEFAULT 0,  -- cuộc gọi đi được nghe máy (thời lượng > 0)

  -- Thời lượng đàm thoại theo hướng
  talk_in_sec   INTEGER NOT NULL DEFAULT 0,
  talk_out_sec  INTEGER NOT NULL DEFAULT 0,

  -- Rủi ro của cuộc gọi ĐẾN, tại lúc gọi (an toàn = tổng đến − 3 cột này)
  risk_unknown  INTEGER NOT NULL DEFAULT 0,
  risk_spam     INTEGER NOT NULL DEFAULT 0,
  risk_scam     INTEGER NOT NULL DEFAULT 0,
  warned        INTEGER NOT NULL DEFAULT 0,  -- số cuộc bị cảnh báo (call_meta.action = 1)

  PRIMARY KEY (day, number)
) WITHOUT ROWID;
```

**Quy ước tính:**

| Chỉ số | Công thức |
|---|---|
| Tổng cuộc gọi đến | `incoming + missed + rejected + blocked` |
| Tổng cuộc gọi | tổng đến + `outgoing` |
| Tổng thời lượng | `talk_in_sec + talk_out_sec` |
| Trung bình mỗi cuộc có đàm thoại | tổng thời lượng / (`incoming + answered_out`) |
| Cuộc gọi đi không nghe máy | `outgoing − answered_out` |
| Đến an toàn | tổng đến − `risk_unknown − risk_spam − risk_scam` |
| Đáng ngờ | `risk_spam + risk_scam` |

Các cột rủi ro được lưu ở đây để thống kê "Tất cả" vẫn đúng khi `call_meta` đã bị dọn cùng `CallLog`.

Ghi bằng upsert, ví dụ một cuộc gọi đến đã nghe từ số lạ:

```sql
INSERT INTO call_stats_daily (day, number, incoming, talk_in_sec, risk_unknown)
VALUES (?, ?, 1, ?, 1)
ON CONFLICT(day, number) DO UPDATE SET
  incoming     = incoming + 1,
  talk_in_sec  = talk_in_sec + excluded.talk_in_sec,
  risk_unknown = risk_unknown + 1;
```

Ánh xạ từ `CallLog.TYPE`: `INCOMING_TYPE` → `incoming`, `MISSED_TYPE` → `missed`, `REJECTED_TYPE` → `rejected`, `BLOCKED_TYPE` → `blocked`, `OUTGOING_TYPE` → `outgoing` (+ `answered_out` nếu `DURATION > 0`). Cuộc gọi bị **tắt chuông** được tính vào `blocked`.

- Xoá lịch sử cuộc gọi **không** trừ thống kê: thống kê là số liệu về hành vi, độc lập với việc hiển thị lịch sử. Có nút "Xoá thống kê" riêng nếu cần.
- **Gộp dữ liệu cũ (tuỳ chọn):** sau 12 tháng, gộp thành `call_stats_monthly` (cùng cấu trúc, `month` thay cho `day`).

### 2.3. `number_marks`: thông tin riêng của app về một số

```sql
CREATE TABLE number_marks (
  number      INTEGER PRIMARY KEY,
  trusted     INTEGER NOT NULL DEFAULT 0,  -- 1 = danh sách tin cậy
  category    INTEGER,                     -- loại lừa đảo/spam (bảng mã bên dưới)
  name        TEXT,                        -- tên tự đặt cho số lạ
  note        TEXT,                        -- ghi chú khi đánh dấu/báo cáo
  updated_at  INTEGER NOT NULL
) WITHOUT ROWID;
```

| `category` | |
|---|---|
| 1 | scam |
| 2 | spam |
| 3 | loan |
| 4 | robocall |
| 5 | fakeJob |
| 6 | telemarketing |
| 7 | impersonation |

- **Cờ "bị chặn" không lưu ở đây**, mà nằm trong `BlockedNumberContract`. Bảng này chỉ lưu *vì sao* chặn (`category`) và *tên* đặt cho số.
- Dòng chỉ tồn tại khi có ít nhất một thông tin (`trusted`, `category`, `name` hoặc `note`). Khi người dùng xoá hết thì xoá dòng.
- "Báo cáo" trong app là **đánh dấu cho chính người dùng** (không có server): ghi `category` (+ `note`) vào đây, rồi hỏi có thêm số vào `BlockedNumberContract` không. Nếu bật `block.autoBlockReported` thì thêm luôn, không hỏi lại.
- "Không phải spam" / "Đánh dấu tin cậy" = `trusted = 1`, xoá `category`, và gỡ số khỏi `BlockedNumberContract` nếu đang bị chặn.
- **Rủi ro hiển thị** của một số = `number_marks.category` hiện tại (nếu có), nếu không thì lấy `call_meta.risk` của cuộc gọi. Không cập nhật lại `call_meta` cũ khi người dùng đánh dấu, vì `call_meta.risk` là ảnh chụp tại lúc gọi.

### 2.4. `block_rules`: quy tắc chặn theo mẫu

```sql
CREATE TABLE block_rules (
  id          INTEGER PRIMARY KEY,
  kind        INTEGER NOT NULL,     -- 1 startsWith, 2 contains, 3 endsWith, 4 country
  value       TEXT NOT NULL,        -- chữ số; country = mã quay số không '+', ví dụ '234'
  label       TEXT,
  enabled     INTEGER NOT NULL DEFAULT 1,
  hit_count   INTEGER NOT NULL DEFAULT 0,
  last_hit_at INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_block_rules_kind_value ON block_rules(kind, value);
```

Số lượng quy tắc nhỏ (vài chục), nên `CallScreeningService` **nạp toàn bộ quy tắc đang bật vào bộ nhớ** và chỉ nạp lại khi có thay đổi. Không phải truy vấn DB mỗi cuộc gọi.

- So khớp trên **cả hai dạng** của số: dạng quốc gia (`0899…`) và dạng E.164 không `+` (`84899…`), giống `ruleMatches` trong `utils/blockEngine.ts`.
- UI dùng `enabled` cho công tắc trên từng quy tắc, và `hit_count` / `last_hit_at` cho dòng phụ "Đã chặn N cuộc · gần nhất {ngày}".

### 2.5. `call_notes`: ghi chú cuộc gọi

Ghi chú người dùng viết trong lúc gọi (nút "Ghi chú" ở màn đang gọi). **Không gắn với `call_id`**, vì đây là dữ liệu người dùng tự viết và không được mất khi Android xoá nhật ký cũ.

```sql
CREATE TABLE call_notes (
  id      INTEGER PRIMARY KEY,
  number  INTEGER NOT NULL,      -- 0 = số ẩn
  at      INTEGER NOT NULL,      -- thời điểm bắt đầu cuộc gọi, epoch ms
  note    TEXT NOT NULL
);
CREATE INDEX idx_call_notes_number ON call_notes(number, at);
```

- Hiện trong Chi tiết số (danh sách ghi chú theo thời gian) và trên dòng lịch sử nếu khớp `number` + `at` (±60 giây).
- Không bị job dọn dẹp ở mục 7 xoá. Chỉ xoá khi người dùng xoá ghi chú.

## 3. Cài đặt (`SharedPreferences`)

**Hệ thống và chặn**

| Key | Ví dụ | Native đọc |
|---|---|---|
| `schema_version` | `1` | ✔ |
| `home_country_dial` | `"84"` | ✔ |
| `block.method` | `"hangup"` \| `"silent"` | ✔ |
| `block.private` | `true` | ✔ |
| `block.international` | `false` | ✔ |
| `block.nonContacts` | `false` | ✔ |
| `block.notify` | `true` | ✔ |
| `block.autoBlockReported` | `false` | ✘ |
| `detect.warnInternational` | `true` | ✔ |
| `detect.warnPrivate` | `true` | ✔ |
| `detect.burstCount` / `detect.burstWindowMin` | `3` / `10` | ✔ |

**Hiển thị người gọi và thông báo**

| Key | Ví dụ | Native đọc |
|---|---|---|
| `callerId.enabled` | `true` | ✔ |
| `callerId.showForContacts` | `false` | ✔ |
| `callerId.showAfterCall` | `true` | ✔ |
| `callerId.scamWarning` | `true` | ✔ |
| `callerId.quickReplies` | `["Tôi đang bận…", …]` | ✔ |
| `popup.size` | `"classic"` \| `"full"` | ✔ |
| `popup.position` | `"top"` \| `"center"` \| `"bottom"` | ✔ |
| `notify.suspiciousCall` | `true` | ✔ |
| `notify.missedCall` | `true` | ✔ |
| `notify.remindMissed` | `false` | ✔ |

**Giao diện**

| Key | Ví dụ | Native đọc |
|---|---|---|
| `boot.onboardingDone` | `true` | ✘ |
| `ui.language` | `"vi"` | ✘ |
| `ui.defaultSim` | `"ask"` hoặc id của `PhoneAccountHandle` | ✘ |
| `ui.dialSound` | `"silent"` \| `"vibrate"` \| `"sound"` \| `"both"` | ✘ |
| `ui.search.recent` | mảng JSON, tối đa 8 từ khoá | ✘ |
| `cleanup.last_run_at` | epoch ms | ✘ |

**Không lưu:**

- Trạng thái quyền: luôn hỏi hệ thống mỗi lần app quay về foreground.
- Nhạc chuông: dùng nhạc chuông của hệ thống (`RingtoneManager`) và nhạc chuông theo liên hệ (`Contacts.CUSTOM_RINGTONE`).
- Chỉ có **một** công tắc "Thông báo khi chặn" (`block.notify`), dùng chung cho tab Chặn và Cài đặt → Thông báo.

## 4. Quy trình quyết định khi có cuộc gọi đến

`CallScreeningService` xét theo thứ tự, **dừng ở bước đầu tiên khớp**:

| # | Điều kiện | Nguồn dữ liệu | `action` | `risk` | `reasons` |
|---|---|---|---|---|---|
| — | Số trong danh sách chặn hệ thống | `BlockedNumberContract` | blocked | theo `number_marks.category` | blacklist |
| 1 | `number_marks.trusted = 1` | `number_marks` | allowed | safe | — |
| 2 | Có trong danh bạ | `PhoneLookup` | allowed | safe | — |
| 3 | Khớp quy tắc đang bật | `block_rules` (bộ nhớ) | blocked / silenced | spam | rule (hoặc country nếu `kind = 4`) |
| 4 | Số ẩn + `block.private` | settings | blocked / silenced | unknown | private |
| 5 | Số quốc tế + `block.international` | settings | blocked / silenced | unknown | international |
| 6 | Số lạ + `block.nonContacts` | settings | blocked / silenced | unknown | nonContact |
| 7 | Số lạ, không bị chặn | xem dưới | warned / allowed | unknown | các dấu hiệu |

- Dòng "—": **Android tự chặn** số trong `BlockedNumberContract` trước khi gọi `CallScreeningService`. App chỉ ghi `call_meta` và thống kê cho cuộc gọi đó.
- `blocked` hay `silenced` tuỳ `block.method`.
- Số tin cậy (bước 1) được ưu tiên trên quy tắc. Khi người dùng đánh dấu tin cậy một số đang bị chặn thì app **gỡ số khỏi `BlockedNumberContract`**.
- **Một nguồn logic duy nhất:** thứ tự này là chuẩn chung. `utils/blockEngine.ts` (đang xét theo thứ tự ẩn số → quốc tế → số lạ → danh sách → quy tắc → spam) cần sửa cho khớp. Tốt nhất là màn "Kiểm tra một số" gọi chính hàm quyết định ở native qua plugin, ở chế độ thử (dry-run), thay vì giữ một bản TypeScript riêng.
- Công tắc cũ "Chặn số spam cộng đồng" (`blockTopSpammers`) bị bỏ vì không có dữ liệu cộng đồng.

**Dấu hiệu cảnh báo ở bước 7** (có ít nhất một dấu hiệu thì `action = warned`):

| Dấu hiệu | Cách phát hiện | Bật/tắt |
|---|---|---|
| `international` | Mã quốc gia khác `home_country_dial` | `detect.warnInternational` |
| `private` | Số ẩn | `detect.warnPrivate` |
| `burst` | ≥ `burstCount` cuộc từ cùng số trong `burstWindowMin` phút (đếm trong `CallLog`) | luôn bật |
| `rejectedBefore` | Số có `call_meta.action` ≥ silenced trước đó | luôn bật |

## 5. Ai ghi gì

| Thành phần | Đọc | Ghi |
|---|---|---|
| `CallScreeningService` | `BlockedNumberContract`, `number_marks`, `PhoneLookup`, `block_rules`, settings, `CallLog` (burst) | Bộ nhớ tạm (quyết định), `block_rules.hit_count` |
| `InCallService` (khi cuộc gọi kết thúc) | Bộ nhớ tạm, `CallLog` | `call_meta`, `call_stats_daily`, `CallLog` (cuộc gọi bị chặn); truyền dữ liệu cuộc gọi sang màn Sau cuộc gọi |
| UI (Vue qua plugin) | Tất cả | `number_marks`, `block_rules`, `call_notes`, `BlockedNumberContract`, `ContactsContract`, `CallLog` (xoá), settings |

Màn **cuộc gọi đến** nên viết bằng native (hoặc dùng Activity WebView được khởi động sẵn) để kịp hiện khi máy khoá và app đang đóng. Dữ liệu vẫn đọc từ SQLite và `SharedPreferences`, schema không đổi.

## 6. Truy vấn chính

**Lịch sử cuộc gọi.** Đọc `CallLog` theo trang (`LIMIT`/`OFFSET` hoặc theo `date`), rồi lấy `call_meta` cho các `call_id` của trang đó:

```sql
SELECT * FROM call_meta WHERE call_id IN (?, ?, ...);   -- tối đa ~50 id mỗi trang
```

Tên hiển thị: lấy `CallLog.CACHED_NAME`; nếu trống thì lấy `number_marks.name`.

**Số lạ gọi nhiều nhất trong 30 ngày:**

```sql
SELECT number, COUNT(*) AS calls
FROM call_meta
WHERE number <> 0 AND at >= ? AND (reasons & 16) <> 0   -- nonContact
GROUP BY number ORDER BY calls DESC LIMIT 10;
```

**Tần suất liên lạc trong một khoảng thời gian:**

```sql
SELECT number,
       SUM(incoming + missed + rejected + blocked + outgoing) AS total,
       SUM(missed)                                           AS missed,
       SUM(talk_in_sec + talk_out_sec)                       AS talk_sec
FROM call_stats_daily
WHERE day BETWEEN ? AND ?
GROUP BY number ORDER BY total DESC LIMIT 20;
```

**KPI và phân bổ rủi ro cuộc gọi đến (cả khoảng "Tất cả"):**

```sql
SELECT SUM(incoming + missed + rejected + blocked)                 AS in_total,
       SUM(outgoing)                                               AS out_total,
       SUM(missed)                                                 AS missed,
       SUM(blocked)                                                AS blocked,
       SUM(talk_in_sec + talk_out_sec)                             AS talk_sec,
       SUM(incoming + answered_out)                                AS talked_calls,
       SUM(risk_unknown) AS r_unknown, SUM(risk_spam) AS r_spam, SUM(risk_scam) AS r_scam
FROM call_stats_daily
WHERE day >= ?;
```

**Thống kê một số theo tuần và theo thứ** (tính ở phía app từ các dòng của số đó):

```sql
SELECT day, incoming, missed, rejected, blocked, outgoing, answered_out, talk_in_sec, talk_out_sec
FROM call_stats_daily
WHERE number = ? ORDER BY day;
```

- Tuần: `(today − day) / 7`. Thứ trong tuần: `(day + 3) % 7` (0 = Thứ 2, vì 1970-01-01 là Thứ 5).
- Cuộc gọi đầu tiên: `MIN(day)` (chính xác đến ngày). Cuộc gọi gần nhất: lấy từ `CallLog` (chính xác đến giờ), nếu không còn thì `MAX(day)`.

**Tra cứu theo số trong `CallLog`:** dùng cột `CACHED_NORMALIZED_NUMBER` (E.164). Nếu cột này trống thì dùng `PhoneNumberUtils.compare` trên cột `NUMBER`.

Gộp theo **người** (một contact nhiều số): sau khi có kết quả theo số, dùng `PhoneLookup` để map số → contact rồi cộng lại ở phía app. Danh sách kết quả ngắn nên việc này nhẹ.

**Hiệu quả quy tắc chặn:**

```sql
SELECT * FROM block_rules ORDER BY hit_count DESC;
```

## 7. Dọn dẹp

`call_meta` có thể bị **mồ côi** khi Android tự xoá nhật ký cũ hoặc người dùng xoá lịch sử.

- Khi người dùng xoá lịch sử trong app: xoá luôn các dòng `call_meta` tương ứng.
- Job định kỳ (khi mở app, tối đa 1 lần/ngày theo `cleanup.last_run_at`): xoá các dòng `call_meta` có `call_id` không còn trong `CallLog`.
- `call_stats_daily` và `call_notes` **không** bị ảnh hưởng.
- Xoá lịch sử (một cuộc, một số, hay toàn bộ) **không trừ thống kê**. Hộp thoại xác nhận phải ghi rõ "Thống kê vẫn được giữ". Cài đặt có mục riêng **"Xoá dữ liệu thống kê"** (`DELETE FROM call_stats_daily`).
- Cuộc gọi bị **hệ thống** chặn (số trong `BlockedNumberContract`) có thể không đi qua `InCallService`. Khi sync, nếu thấy dòng `CallLog` `BLOCKED_TYPE` chưa có `call_meta`, thì thêm `call_meta` (`reasons = blacklist`) và cộng `call_stats_daily.blocked`. *(Cần xác nhận trên máy thật.)*

## 8. UI không nạp toàn bộ dữ liệu

- Lịch sử cuộc gọi và danh bạ **đọc từ provider của Android theo trang**, không nạp hết vào Pinia như bản mock hiện tại.
- Tìm kiếm danh bạ dùng `ContactsContract.CommonDataKinds.Phone.CONTENT_FILTER_URI` (Android tự tìm theo tên và số).
- Store chỉ giữ trang đang hiển thị cộng với cache nhỏ `number → tên`.

## 9. Ước lượng dung lượng

Giả sử người dùng có khoảng 20 cuộc gọi/ngày với khoảng 10 số khác nhau:

| Bảng | Dòng/năm | Dung lượng/năm |
|---|---|---|
| `call_stats_daily` (~15 cột số nguyên nhỏ) | ~3.650 | ~150–200 KB |
| `call_meta` (~20% cuộc gọi là số lạ/bị chặn) | ~1.500 | ~50 KB |
| `number_marks` | vài trăm (tổng) | không đáng kể |
| `block_rules` | vài chục (tổng) | không đáng kể |
| `call_notes` | tuỳ người dùng | không đáng kể |

→ Toàn bộ DB **dưới 1 MB sau nhiều năm sử dụng**.

## 10. Quyền

| Quyền / role | Dùng cho |
|---|---|
| `ROLE_DIALER` | Làm app Điện thoại mặc định; kèm `CallScreeningService`, `InCallService`, `BlockedNumberContract` |
| `READ_CALL_LOG`, `WRITE_CALL_LOG` | Lịch sử cuộc gọi, ghi cuộc gọi bị chặn, xoá lịch sử |
| `READ_CONTACTS`, `WRITE_CONTACTS` | Danh bạ, yêu thích, ghi chú |
| `CALL_PHONE`, `READ_PHONE_STATE`, `READ_PHONE_NUMBERS` | Gọi đi, thông tin SIM |
| `POST_NOTIFICATIONS` | Thông báo cuộc gọi nhỡ, cuộc gọi bị chặn |

- Google Play chỉ cho phép quyền nhật ký cuộc gọi khi app **thật sự là app Điện thoại mặc định** (có `InCallService`, màn gọi, bàn phím, xử lý cuộc gọi đến).
- Khi người dùng **chưa** đặt app làm mặc định: app chỉ hiện màn hướng dẫn đặt làm mặc định; các tab hiện trạng thái "cần cấp quyền".

## 11. Migration từ bản hiện tại

- `schema_version` (trong settings) tăng khi đổi schema. Với Room, dùng `Migration` của Room.
- Dữ liệu cũ trong `localStorage` (bản mock) **không cần chuyển**: danh bạ và lịch sử lấy từ Android. Chỉ chuyển quy tắc chặn và cài đặt nếu có.

| Hiện tại (`src/types/index.ts`) | Sau khi chuyển |
|---|---|
| `Contact` | `ContactsContract` (Android) |
| `Contact.favorite` | `Contacts.STARRED` |
| `Contact.note` | `CommonDataKinds.Note` |
| `CallLogEntry` | `CallLog.Calls` (Android) + `call_meta` |
| `CallLogEntry.risk`, `blockedReason` | `call_meta.risk`, `reasons`, `action` |
| `CallLogEntry.reportCount` | Bỏ (không có dữ liệu cộng đồng) |
| `BlockRule` với `kind = 'number'` | `BlockedNumberContract` (+ `number_marks` nếu có loại/tên) |
| `BlockRule` các kind khác | `block_rules` |
| `NumberProfile`, `reportNumber`, `suggestName` | `number_marks` (`category`, `note`, `name`) |
| `NumberProfile.location`, `carrier` | Tính offline bằng `libphonenumber` (`PhoneNumberOfflineGeocoder`, `PhoneNumberToCarrierMapper`) |
| `BlockSettings.blockTopSpammers` | Bỏ (có thể thay bằng `block.autoBlockReported`) |
| `BlockSettings`, `AppSettings` | `SharedPreferences` (danh sách key ở mục 3) |
| `AppSettings.permissionsDone` | Bỏ; hỏi trạng thái quyền từ hệ thống |
| `AppSettings.ringtone` | Bỏ; dùng nhạc chuông của hệ thống |
| Tìm gần đây (`safedial.search.recent.v1` trong `localStorage`) | `ui.search.recent` |
| Ghi chú cuộc gọi (bản demo) | `call_notes` |

## 12. Quyền riêng tư

- Toàn bộ dữ liệu chỉ nằm trên máy. Không upload danh bạ, lịch sử cuộc gọi hay danh sách đen.
- `android:allowBackup="false"` đã được đặt, nên DB không bị sao lưu lên Google Drive. Nếu muốn cho người dùng sao lưu danh sách đen/quy tắc, làm tính năng xuất/nhập file riêng.

## 13. Hướng mở rộng

- **Dữ liệu spam cộng đồng hoặc danh sách đóng gói sẵn:** thêm bảng `spam_numbers` (`number`, `category`, `score`, `dataset_version`) và chèn một bước sau bước 3 của quy trình ở mục 4. Các bảng hiện tại không cần đổi.
- **Thống kê dài hạn:** thêm `call_stats_monthly` khi cần gộp dữ liệu cũ hơn 12 tháng.
- **Thống kê theo giờ trong ngày:** thêm `call_stats_hourly(hour 0–23, weekday 0–6, count)` gộp toàn thời gian (chỉ 168 dòng).
- **Giờ chính xác của cuộc gọi đầu tiên với một số:** thêm `number_first_seen(number, first_at)` nếu cần hiện cả giờ.
- **Xuất/Nhập danh sách chặn và quy tắc** ra file, thay cho sao lưu tự động (vì `allowBackup="false"`).
