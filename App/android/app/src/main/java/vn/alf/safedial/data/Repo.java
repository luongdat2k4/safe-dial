package vn.alf.safedial.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

/** Truy cập 5 bảng của app. Mọi hàm đều đồng bộ — gọi ngoài main thread khi có thể. */
public final class Repo {

    private final SQLiteDatabase db;

    public Repo(Context ctx) {
        this.db = Db.get(ctx).getWritableDatabase();
    }

    // ---------------------------------------------------------------- call_meta

    public static final class Meta {
        public long callId, number, at;
        public int risk, reasons, action;
        public Long ruleId;
    }

    public void putMeta(Meta m) {
        ContentValues v = new ContentValues();
        v.put("call_id", m.callId);
        v.put("number", m.number);
        v.put("at", m.at);
        v.put("risk", m.risk);
        v.put("reasons", m.reasons);
        v.put("action", m.action);
        if (m.ruleId != null) v.put("rule_id", m.ruleId); else v.putNull("rule_id");
        db.insertWithOnConflict("call_meta", null, v, SQLiteDatabase.CONFLICT_REPLACE);
    }

    public Map<Long, Meta> metaByIds(Collection<Long> ids) {
        Map<Long, Meta> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        StringBuilder in = new StringBuilder();
        for (Long id : ids) {
            if (in.length() > 0) in.append(',');
            in.append(id);
        }
        try (Cursor c = db.rawQuery("SELECT * FROM call_meta WHERE call_id IN (" + in + ")", null)) {
            while (c.moveToNext()) {
                Meta m = readMeta(c);
                out.put(m.callId, m);
            }
        }
        return out;
    }

    /** Bản ghi chưa ghép với CallLog (call_id < 0). */
    public List<Meta> unmatchedMeta() {
        List<Meta> out = new ArrayList<>();
        try (Cursor c = db.rawQuery("SELECT * FROM call_meta WHERE call_id < 0", null)) {
            while (c.moveToNext()) out.add(readMeta(c));
        }
        return out;
    }

    public void rekeyMeta(long tempId, long callId) {
        ContentValues v = new ContentValues();
        v.put("call_id", callId);
        db.updateWithOnConflict("call_meta", v, "call_id = ?", new String[] { String.valueOf(tempId) }, SQLiteDatabase.CONFLICT_REPLACE);
    }

    public List<Meta> metaSince(long fromAt, int minAction) {
        List<Meta> out = new ArrayList<>();
        try (Cursor c = db.rawQuery(
            "SELECT * FROM call_meta WHERE at >= ? AND action >= ? ORDER BY at DESC",
            new String[] { String.valueOf(fromAt), String.valueOf(minAction) })) {
            while (c.moveToNext()) out.add(readMeta(c));
        }
        return out;
    }

    /** Số này từng bị chặn / tắt chuông / từ chối trước đó chưa (dấu hiệu rejectedBefore). */
    public boolean wasRejectedBefore(long number) {
        try (Cursor c = db.rawQuery("SELECT 1 FROM call_meta WHERE number = ? AND action >= 2 LIMIT 1",
            new String[] { String.valueOf(number) })) {
            return c.moveToFirst();
        }
    }

    public void deleteMeta(Collection<Long> callIds) {
        for (Long id : callIds) db.delete("call_meta", "call_id = ?", new String[] { String.valueOf(id) });
    }

    public void deleteMetaByNumber(long number) {
        db.delete("call_meta", "number = ?", new String[] { String.valueOf(number) });
    }

    public void deleteAllMeta() {
        db.delete("call_meta", null, null);
    }

    /** Xoá meta mồ côi: call_id > 0 nhưng không còn trong CallLog. */
    public int deleteOrphanMeta(Collection<Long> existingCallIds) {
        List<Long> stale = new ArrayList<>();
        try (Cursor c = db.rawQuery("SELECT call_id FROM call_meta WHERE call_id > 0", null)) {
            while (c.moveToNext()) {
                long id = c.getLong(0);
                if (!existingCallIds.contains(id)) stale.add(id);
            }
        }
        deleteMeta(stale);
        return stale.size();
    }

    private static Meta readMeta(Cursor c) {
        Meta m = new Meta();
        m.callId = c.getLong(c.getColumnIndexOrThrow("call_id"));
        m.number = c.getLong(c.getColumnIndexOrThrow("number"));
        m.at = c.getLong(c.getColumnIndexOrThrow("at"));
        m.risk = c.getInt(c.getColumnIndexOrThrow("risk"));
        m.reasons = c.getInt(c.getColumnIndexOrThrow("reasons"));
        m.action = c.getInt(c.getColumnIndexOrThrow("action"));
        int ri = c.getColumnIndexOrThrow("rule_id");
        m.ruleId = c.isNull(ri) ? null : c.getLong(ri);
        return m;
    }

    // ---------------------------------------------------------------- call_stats_daily

    public static final String[] STAT_COLS = {
        "incoming", "missed", "rejected", "blocked", "outgoing", "answered_out",
        "talk_in_sec", "talk_out_sec", "risk_unknown", "risk_spam", "risk_scam", "warned",
    };

    /** Số ngày từ 1970-01-01 theo giờ máy. */
    public static long dayOf(long epochMs) {
        long offset = TimeZone.getDefault().getOffset(epochMs);
        return Math.floorDiv(epochMs + offset, 86_400_000L);
    }

    /** Cộng dồn vào một dòng (day, number). `inc` theo thứ tự STAT_COLS. */
    public void addStats(long day, long number, long[] inc) {
        StringBuilder cols = new StringBuilder("day, number");
        StringBuilder vals = new StringBuilder("?, ?");
        StringBuilder upd = new StringBuilder();
        List<String> args = new ArrayList<>();
        args.add(String.valueOf(day));
        args.add(String.valueOf(number));
        for (int i = 0; i < STAT_COLS.length; i++) {
            cols.append(", ").append(STAT_COLS[i]);
            vals.append(", ?");
            args.add(String.valueOf(inc[i]));
            if (upd.length() > 0) upd.append(", ");
            upd.append(STAT_COLS[i]).append(" = ").append(STAT_COLS[i]).append(" + excluded.").append(STAT_COLS[i]);
        }
        db.execSQL("INSERT INTO call_stats_daily (" + cols + ") VALUES (" + vals + ") ON CONFLICT(day, number) DO UPDATE SET " + upd,
            args.toArray());
    }

    /** Các dòng thống kê từ ngày `fromDay`; `number` = null là mọi số. */
    public List<long[]> statsRows(long fromDay, Long number) {
        List<long[]> out = new ArrayList<>();
        String sql = "SELECT day, number, " + String.join(", ", STAT_COLS) + " FROM call_stats_daily WHERE day >= ?" +
            (number != null ? " AND number = ?" : "") + " ORDER BY day";
        String[] args = number != null ? new String[] { String.valueOf(fromDay), String.valueOf(number) } : new String[] { String.valueOf(fromDay) };
        try (Cursor c = db.rawQuery(sql, args)) {
            int n = c.getColumnCount();
            while (c.moveToNext()) {
                long[] row = new long[n];
                for (int i = 0; i < n; i++) row[i] = c.getLong(i);
                out.add(row);
            }
        }
        return out;
    }

    /** Chạy nhiều lệnh ghi trong một transaction (nhanh hơn khi nạp lại thống kê). */
    public void inTransaction(Runnable r) {
        db.beginTransaction();
        try {
            r.run();
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    public void clearStats() {
        db.delete("call_stats_daily", null, null);
    }

    // ---------------------------------------------------------------- number_marks

    public static final class Mark {
        public long number;
        public boolean trusted;
        public int category;
        public String name, note;
        public long updatedAt;
    }

    public Mark mark(long number) {
        try (Cursor c = db.rawQuery("SELECT * FROM number_marks WHERE number = ?", new String[] { String.valueOf(number) })) {
            return c.moveToFirst() ? readMark(c) : null;
        }
    }

    public List<Mark> marks() {
        List<Mark> out = new ArrayList<>();
        try (Cursor c = db.rawQuery("SELECT * FROM number_marks ORDER BY updated_at DESC", null)) {
            while (c.moveToNext()) out.add(readMark(c));
        }
        return out;
    }

    /** Ghi đè; xoá dòng nếu không còn thông tin nào. */
    public void putMark(Mark m) {
        boolean empty = !m.trusted && m.category == 0 && isBlank(m.name) && isBlank(m.note);
        if (empty) {
            db.delete("number_marks", "number = ?", new String[] { String.valueOf(m.number) });
            return;
        }
        ContentValues v = new ContentValues();
        v.put("number", m.number);
        v.put("trusted", m.trusted ? 1 : 0);
        if (m.category > 0) v.put("category", m.category); else v.putNull("category");
        v.put("name", isBlank(m.name) ? null : m.name.trim());
        v.put("note", isBlank(m.note) ? null : m.note.trim());
        v.put("updated_at", System.currentTimeMillis());
        db.insertWithOnConflict("number_marks", null, v, SQLiteDatabase.CONFLICT_REPLACE);
    }

    private static Mark readMark(Cursor c) {
        Mark m = new Mark();
        m.number = c.getLong(c.getColumnIndexOrThrow("number"));
        m.trusted = c.getInt(c.getColumnIndexOrThrow("trusted")) == 1;
        int ci = c.getColumnIndexOrThrow("category");
        m.category = c.isNull(ci) ? 0 : c.getInt(ci);
        m.name = c.getString(c.getColumnIndexOrThrow("name"));
        m.note = c.getString(c.getColumnIndexOrThrow("note"));
        m.updatedAt = c.getLong(c.getColumnIndexOrThrow("updated_at"));
        return m;
    }

    // ---------------------------------------------------------------- block_rules

    public static final class Rule {
        public long id;
        public int kind;
        public String value, label;
        public boolean enabled;
        public long hitCount;
        public Long lastHitAt;
        public long createdAt;
    }

    private static volatile List<Rule> ruleCache;

    public List<Rule> rules() {
        List<Rule> out = new ArrayList<>();
        try (Cursor c = db.rawQuery("SELECT * FROM block_rules ORDER BY created_at DESC", null)) {
            while (c.moveToNext()) {
                Rule r = new Rule();
                r.id = c.getLong(c.getColumnIndexOrThrow("id"));
                r.kind = c.getInt(c.getColumnIndexOrThrow("kind"));
                r.value = c.getString(c.getColumnIndexOrThrow("value"));
                r.label = c.getString(c.getColumnIndexOrThrow("label"));
                r.enabled = c.getInt(c.getColumnIndexOrThrow("enabled")) == 1;
                r.hitCount = c.getLong(c.getColumnIndexOrThrow("hit_count"));
                int li = c.getColumnIndexOrThrow("last_hit_at");
                r.lastHitAt = c.isNull(li) ? null : c.getLong(li);
                r.createdAt = c.getLong(c.getColumnIndexOrThrow("created_at"));
                out.add(r);
            }
        }
        return out;
    }

    /** Quy tắc đang bật, giữ trong bộ nhớ cho CallScreeningService (schema mục 2.4). */
    public List<Rule> enabledRulesCached() {
        List<Rule> cached = ruleCache;
        if (cached == null) {
            cached = new ArrayList<>();
            for (Rule r : rules()) if (r.enabled) cached.add(r);
            ruleCache = cached;
        }
        return cached;
    }

    /** Trả id mới, hoặc −1 nếu trùng. */
    public long addRule(int kind, String value, String label) {
        ContentValues v = new ContentValues();
        v.put("kind", kind);
        v.put("value", value);
        v.put("label", isBlank(label) ? null : label.trim());
        v.put("enabled", 1);
        v.put("created_at", System.currentTimeMillis());
        long id = db.insertWithOnConflict("block_rules", null, v, SQLiteDatabase.CONFLICT_IGNORE);
        ruleCache = null;
        return id;
    }

    public void setRuleEnabled(long id, boolean enabled) {
        ContentValues v = new ContentValues();
        v.put("enabled", enabled ? 1 : 0);
        db.update("block_rules", v, "id = ?", new String[] { String.valueOf(id) });
        ruleCache = null;
    }

    public void deleteRule(long id) {
        db.delete("block_rules", "id = ?", new String[] { String.valueOf(id) });
        ruleCache = null;
    }

    public void hitRule(long id) {
        db.execSQL("UPDATE block_rules SET hit_count = hit_count + 1, last_hit_at = ? WHERE id = ?",
            new Object[] { System.currentTimeMillis(), id });
        ruleCache = null;
    }

    // ---------------------------------------------------------------- call_notes

    public static final class Note {
        public long id, number, at;
        public String note;
    }

    public long addNote(long number, long at, String note) {
        ContentValues v = new ContentValues();
        v.put("number", number);
        v.put("at", at);
        v.put("note", note);
        return db.insert("call_notes", null, v);
    }

    public List<Note> notes(Long number) {
        List<Note> out = new ArrayList<>();
        String sql = "SELECT * FROM call_notes" + (number != null ? " WHERE number = ?" : "") + " ORDER BY at DESC";
        try (Cursor c = db.rawQuery(sql, number != null ? new String[] { String.valueOf(number) } : null)) {
            while (c.moveToNext()) {
                Note n = new Note();
                n.id = c.getLong(c.getColumnIndexOrThrow("id"));
                n.number = c.getLong(c.getColumnIndexOrThrow("number"));
                n.at = c.getLong(c.getColumnIndexOrThrow("at"));
                n.note = c.getString(c.getColumnIndexOrThrow("note"));
                out.add(n);
            }
        }
        return out;
    }

    public void deleteNote(long id) {
        db.delete("call_notes", "id = ?", new String[] { String.valueOf(id) });
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
