package vn.alf.safedial.telecom;

import android.content.Context;
import android.provider.CallLog;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import vn.alf.safedial.data.Codes;
import vn.alf.safedial.data.Phone;
import vn.alf.safedial.data.Prefs;
import vn.alf.safedial.data.Repo;

/**
 * Ghi call_meta + call_stats_daily khi cuộc gọi bị chặn hoặc kết thúc, và ghép bản ghi
 * tạm (call_id âm) với dòng CallLog tương ứng (schema mục 2.1, 2.2, 7).
 */
public final class Recorder {

    /** Quyết định của screening, chờ InCallService dùng khi cuộc gọi kết thúc (sống 5 phút). */
    private static final Map<Long, CallDecider.Decision> pending = new ConcurrentHashMap<>();
    private static final Map<Long, Long> pendingAt = new ConcurrentHashMap<>();

    public static void remember(CallDecider.Decision d) {
        pending.put(d.number, d);
        pendingAt.put(d.number, System.currentTimeMillis());
    }

    public static CallDecider.Decision recall(long key) {
        Long at = pendingAt.get(key);
        if (at == null || System.currentTimeMillis() - at > 5 * 60_000L) return null;
        pendingAt.remove(key);
        return pending.remove(key);
    }

    private final Context ctx;
    private final Repo repo;

    public Recorder(Context ctx) {
        this.ctx = ctx.getApplicationContext();
        this.repo = new Repo(ctx);
    }

    /**
     * Lần đầu chạy: dựng call_stats_daily từ nhật ký cuộc gọi đã có trên máy, để tab Thống kê
     * không trống. Chỉ lấy cuộc gọi trước `cutoff`; sau mốc này thống kê được ghi khi cuộc gọi
     * kết thúc nên không bị đếm trùng. Rủi ro lúc gọi không biết được → số lạ tính là "unknown",
     * số đã đánh dấu tính theo loại.
     */
    public synchronized void backfillIfNeeded(long cutoff) {
        Prefs prefs = Prefs.get(ctx);
        if (prefs.bool("stats.backfilled", false)) return;
        long stored = prefs.num("stats.backfillCutoff", 0);
        if (stored > 0 && stored < cutoff) cutoff = stored;
        final long limit = cutoff;
        Phone phone = new Phone(ctx);
        if (!phone.has(android.Manifest.permission.READ_CALL_LOG)) return; // thử lại khi có quyền
        List<Phone.Call> all = phone.calls(10_000, 0, 0, 0);
        Map<Long, Boolean> isContact = new java.util.HashMap<>();
        repo.inTransaction(() -> {
            for (Phone.Call c : all) {
                if (c.date >= limit) continue;
                long[] inc = new long[Repo.STAT_COLS.length];
                switch (c.type) {
                    case CallLog.Calls.OUTGOING_TYPE:
                        inc[4] = 1;
                        if (c.duration > 0) { inc[5] = 1; inc[7] = c.duration; }
                        break;
                    case CallLog.Calls.INCOMING_TYPE:
                    case CallLog.Calls.ANSWERED_EXTERNALLY_TYPE:
                        inc[0] = 1;
                        inc[6] = c.duration;
                        break;
                    case CallLog.Calls.REJECTED_TYPE:
                        inc[2] = 1;
                        break;
                    case CallLog.Calls.BLOCKED_TYPE:
                        inc[3] = 1;
                        break;
                    default:
                        inc[1] = 1;
                }
                if (c.type != CallLog.Calls.OUTGOING_TYPE) {
                    Boolean known = isContact.get(c.key);
                    if (known == null) {
                        known = c.key != 0 && phone.lookup(c.key) != null;
                        isContact.put(c.key, known);
                    }
                    if (!known) {
                        Repo.Mark m = c.key != 0 ? repo.mark(c.key) : null;
                        int risk = m != null && m.trusted ? Codes.RISK_SAFE
                            : m != null && m.category > 0 ? Codes.riskOfCategory(m.category) : Codes.RISK_UNKNOWN;
                        if (risk == Codes.RISK_UNKNOWN) inc[8] = 1;
                        else if (risk == Codes.RISK_SPAM) inc[9] = 1;
                        else if (risk == Codes.RISK_SCAM) inc[10] = 1;
                    }
                }
                repo.addStats(Repo.dayOf(c.date), c.key, inc);
            }
        });
        prefs.put("stats.backfilled", true);
        if (prefs.num("sync.blockedScanAt", 0) == 0) prefs.put("sync.blockedScanAt", limit);
    }

    /** Cuộc gọi bị screening chặn hẳn: không tới InCallService nên ghi ngay. */
    public void recordBlocked(CallDecider.Decision d, long at) {
        // Chạy trên luồng của CallScreeningService (có giới hạn thời gian) → không nạp lại thống kê ở đây,
        // chỉ ghi mốc để lần nạp lại sau bỏ qua cuộc gọi này (tránh đếm trùng).
        Prefs prefs = Prefs.get(ctx);
        if (!prefs.bool("stats.backfilled", false) && prefs.num("stats.backfillCutoff", 0) == 0) prefs.put("stats.backfillCutoff", at);
        writeMeta(d, at);
        long[] inc = new long[Repo.STAT_COLS.length];
        inc[3] = 1; // blocked
        addRisk(inc, d);
        repo.addStats(Repo.dayOf(at), d.number, inc);
        if (d.ruleId != null) repo.hitRule(d.ruleId);
    }

    /**
     * Cuộc gọi kết thúc (InCallService).
     *
     * @param incoming   cuộc gọi đến?
     * @param answered   đã chuyển sang ACTIVE?
     * @param rejected   người dùng từ chối (DisconnectCause.REJECTED)
     * @param d          quyết định screening (null với cuộc gọi đi / khi không có)
     */
    public void recordEnded(long key, boolean incoming, boolean answered, boolean rejected, long startAt, int durationSec, CallDecider.Decision d) {
        backfillIfNeeded(startAt - 1000);
        long[] inc = new long[Repo.STAT_COLS.length];
        if (incoming) {
            if (d != null && d.action == Codes.ACT_SILENCED) inc[3] = 1; // tắt chuông → tính là bị chặn
            else if (answered) { inc[0] = 1; inc[6] = durationSec; }
            else if (rejected) inc[2] = 1;
            else inc[1] = 1;
            if (d != null) addRisk(inc, d);
        } else {
            inc[4] = 1;
            if (answered) { inc[5] = 1; inc[7] = durationSec; }
        }
        repo.addStats(Repo.dayOf(startAt), key, inc);

        boolean interesting = d != null && (d.action != Codes.ACT_ALLOWED || d.risk != Codes.RISK_SAFE);
        if (interesting) {
            if (rejected && d.action == Codes.ACT_WARNED) {
                // Từ chối số bị cảnh báo → lần sau có dấu hiệu "rejectedBefore".
                d.action = Codes.ACT_SILENCED;
            }
            writeMeta(d, startAt);
            if (d.ruleId != null && d.action == Codes.ACT_SILENCED) repo.hitRule(d.ruleId);
        }
    }

    private void writeMeta(CallDecider.Decision d, long at) {
        Repo.Meta m = new Repo.Meta();
        m.callId = -at;
        m.number = d.number;
        m.at = at;
        m.risk = d.risk;
        m.reasons = d.reasons;
        m.action = d.action;
        m.ruleId = d.ruleId;
        repo.putMeta(m);
    }

    private static void addRisk(long[] inc, CallDecider.Decision d) {
        if (d.risk == Codes.RISK_UNKNOWN) inc[8] = 1;
        else if (d.risk == Codes.RISK_SPAM) inc[9] = 1;
        else if (d.risk == Codes.RISK_SCAM) inc[10] = 1;
        if (d.action == Codes.ACT_WARNED) inc[11] = 1;
    }

    /**
     * Ghép meta tạm với CallLog, bổ sung meta + thống kê cho cuộc gọi bị HỆ THỐNG chặn
     * (BlockedNumberContract, không đi qua app). Gọi khi mở lịch sử / khi cuộc gọi kết thúc.
     */
    public synchronized void reconcile() {
        backfillIfNeeded(System.currentTimeMillis());
        Phone phone = new Phone(ctx);
        Prefs prefs = Prefs.get(ctx);
        List<Phone.Call> recent = phone.calls(300, 0, 0, System.currentTimeMillis() - 7L * 86_400_000L);
        if (recent.isEmpty()) return;

        // 1. Ghép meta tạm (call_id < 0) theo số + thời điểm ±60 giây.
        Set<Long> used = new HashSet<>();
        for (Repo.Meta m : repo.unmatchedMeta()) {
            for (Phone.Call c : recent) {
                if (used.contains(c.id) || c.key != m.number) continue;
                if (Math.abs(c.date - m.at) <= 60_000L) {
                    repo.rekeyMeta(m.callId, c.id);
                    used.add(c.id);
                    break;
                }
            }
        }

        // 2. Cuộc gọi BLOCKED chưa có meta, mới hơn lần quét trước → hệ thống đã chặn.
        long scanAt = prefs.num("sync.blockedScanAt", 0);
        long now = System.currentTimeMillis();
        if (scanAt == 0) {
            prefs.put("sync.blockedScanAt", now);
            return;
        }
        List<Long> blockedIds = new ArrayList<>();
        for (Phone.Call c : recent) if (c.type == CallLog.Calls.BLOCKED_TYPE && c.date > scanAt) blockedIds.add(c.id);
        Map<Long, Repo.Meta> have = repo.metaByIds(blockedIds);
        for (Phone.Call c : recent) {
            if (c.type != CallLog.Calls.BLOCKED_TYPE || c.date <= scanAt || have.containsKey(c.id)) continue;
            Repo.Mark mark = c.key != 0 ? repo.mark(c.key) : null;
            Repo.Meta m = new Repo.Meta();
            m.callId = c.id;
            m.number = c.key;
            m.at = c.date;
            m.risk = mark != null && mark.category > 0 ? Codes.riskOfCategory(mark.category) : Codes.RISK_SPAM;
            m.reasons = Codes.R_BLACKLIST;
            m.action = Codes.ACT_BLOCKED;
            repo.putMeta(m);
            long[] inc = new long[Repo.STAT_COLS.length];
            inc[3] = 1;
            inc[m.risk == Codes.RISK_SCAM ? 10 : 9] = 1;
            repo.addStats(Repo.dayOf(c.date), c.key, inc);
        }
        prefs.put("sync.blockedScanAt", now);
    }

    /** Dọn meta mồ côi, tối đa 1 lần/ngày (schema mục 7). */
    public void cleanupIfDue() {
        Prefs prefs = Prefs.get(ctx);
        long last = prefs.num("cleanup.last_run_at", 0);
        if (System.currentTimeMillis() - last < 86_400_000L) return;
        Phone phone = new Phone(ctx);
        List<Long> ids = phone.allCallIds();
        if (!ids.isEmpty()) repo.deleteOrphanMeta(new HashSet<>(ids));
        prefs.put("cleanup.last_run_at", System.currentTimeMillis());
    }
}
