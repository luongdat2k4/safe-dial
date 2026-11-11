package vn.alf.safedial.telecom;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.telecom.Call;
import android.telecom.CallAudioState;
import android.telecom.DisconnectCause;
import android.telecom.VideoProfile;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

import vn.alf.safedial.MainActivity;
import vn.alf.safedial.data.Codes;
import vn.alf.safedial.data.Numbers;
import vn.alf.safedial.data.Phone;

/**
 * Trạng thái các cuộc gọi, dùng chung giữa InCallService, thông báo và plugin.
 * Theo dõi MỌI cuộc gọi (cuộc gọi chờ, thêm cuộc gọi) để không cuộc nào bị "mồ côi";
 * UI hiển thị cuộc gọi chính (`primary`), cuộc đổ chuông thứ hai có thông báo riêng.
 */
public final class CallManager {

    public interface Listener {
        void onCallState(Snapshot s);

        /** Gọi khi cuộc gọi CUỐI CÙNG kết thúc (không còn cuộc nào). */
        void onCallEnded(Ended e);
    }

    public static final class Snapshot {
        public String state; // ringing | dialing | active | holding | disconnected
        public boolean incoming, muted, speaker, holding;
        public long number, startAt, activeAt;
        public String name;
        public CallDecider.Decision decision;
        /** Số cuộc gọi khác đang tồn tại song song. */
        public int others;
    }

    public static final class Ended {
        public long number, startAt;
        public String type; // incoming | outgoing | missed | rejected | blocked
        public int durationSec;
        public String name;
        public CallDecider.Decision decision;
    }

    private static final CallManager INSTANCE = new CallManager();

    public static CallManager get() {
        return INSTANCE;
    }

    private final CopyOnWriteArrayList<Listener> listeners = new CopyOnWriteArrayList<>();
    private final Map<Call, Snapshot> calls = new LinkedHashMap<>();
    private final Map<Call, Boolean> rejectedByUser = new LinkedHashMap<>();
    private SafeDialInCallService service;
    private Call primary;
    private boolean muted, speaker;
    private Ended lastEnded;

    private final Call.Callback callback = new Call.Callback() {
        @Override
        public void onStateChanged(Call c, int state) {
            synchronized (CallManager.this) {
                Snapshot s = calls.get(c);
                if (s == null) return;
                if (state == Call.STATE_ACTIVE && s.activeAt == 0) s.activeAt = System.currentTimeMillis();
                s.state = stateName(state);
                s.holding = state == Call.STATE_HOLDING;
                // Cuộc gọi phụ vừa được nghe → trở thành cuộc gọi chính.
                if (c != primary && state == Call.STATE_ACTIVE) primary = c;
                refreshUi();
            }
        }
    };

    private CallManager() {}

    public void addListener(Listener l) {
        listeners.addIfAbsent(l);
    }

    public void removeListener(Listener l) {
        listeners.remove(l);
    }

    public synchronized Snapshot current() {
        return primary != null ? withShared(calls.get(primary)) : null;
    }

    public Ended lastEnded() {
        return lastEnded;
    }

    // ------------------------------------------------------------ từ InCallService

    synchronized void onAdded(SafeDialInCallService svc, Call c) {
        service = svc;
        Snapshot s = snapshotOf(svc, c);
        calls.put(c, s);
        c.registerCallback(callback);
        if (primary == null) primary = c;
        refreshUi();
        // Mở màn hình cuộc gọi trực tiếp: InCallService do hệ thống bind nên được phép mở
        // Activity từ nền. Thông báo full-screen vẫn là đường dự phòng.
        if (c == primary) launchUi(svc, "ringing".equals(s.state) ? "/call/incoming" : "/call/active");
    }

    synchronized void onRemoved(SafeDialInCallService svc, Call c) {
        Snapshot s = calls.remove(c);
        boolean rejected = Boolean.TRUE.equals(rejectedByUser.remove(c));
        c.unregisterCallback(callback);
        if (s != null) record(svc, c, s, rejected);

        if (c == primary) {
            primary = null;
            // Ưu tiên cuộc đang nghe, sau đó tới cuộc bất kỳ còn lại.
            for (Map.Entry<Call, Snapshot> e : calls.entrySet()) {
                if (primary == null || "active".equals(e.getValue().state)) primary = e.getKey();
            }
        }
        if (calls.isEmpty()) {
            Notifs.cancel(svc);
            Notifs.cancelSecondary(svc);
            for (Listener l : listeners) l.onCallEnded(lastEnded);
        } else {
            refreshUi();
        }
    }

    synchronized void onAudioState(CallAudioState st) {
        if (st == null) return;
        muted = st.isMuted();
        speaker = st.getRoute() == CallAudioState.ROUTE_SPEAKER;
        refreshUi();
    }

    // ------------------------------------------------------------ điều khiển

    /** Cuộc gọi đang đổ chuông (ưu tiên cuộc gọi chính). */
    private Call ringing() {
        if (primary != null && primary.getState() == Call.STATE_RINGING) return primary;
        for (Call c : calls.keySet()) if (c.getState() == Call.STATE_RINGING) return c;
        return null;
    }

    public synchronized boolean answer() {
        Call c = ringing();
        if (c == null) return false;
        c.answer(VideoProfile.STATE_AUDIO_ONLY);
        return true;
    }

    public synchronized boolean reject(String message) {
        Call c = ringing();
        if (c == null) return false;
        rejectedByUser.put(c, true);
        if (message != null && !message.isEmpty()) c.reject(true, message);
        else c.reject(false, null);
        return true;
    }

    public synchronized boolean hangup() {
        if (primary == null) return false;
        if (primary.getState() == Call.STATE_RINGING) return reject(null);
        primary.disconnect();
        return true;
    }

    public synchronized boolean setHold(boolean hold) {
        if (primary == null) return false;
        if (hold) primary.hold(); else primary.unhold();
        return true;
    }

    public synchronized boolean setMuted(boolean m) {
        if (service == null) return false;
        service.setMuted(m);
        return true;
    }

    public synchronized boolean setSpeaker(boolean on) {
        if (service == null) return false;
        service.setAudioRoute(on ? CallAudioState.ROUTE_SPEAKER : CallAudioState.ROUTE_WIRED_OR_EARPIECE);
        return true;
    }

    public synchronized boolean dtmf(char digit) {
        if (primary == null) return false;
        primary.playDtmfTone(digit);
        primary.stopDtmfTone();
        return true;
    }

    // ------------------------------------------------------------ nội bộ

    private Snapshot snapshotOf(Context ctx, Call c) {
        Snapshot s = new Snapshot();
        Uri handle = c.getDetails().getHandle();
        s.number = handle != null ? Numbers.toKey(ctx, handle.getSchemeSpecificPart()) : 0;
        int state = c.getState();
        s.incoming = state == Call.STATE_RINGING
            || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && c.getDetails().getCallDirection() == Call.Details.DIRECTION_INCOMING);
        s.state = stateName(state);
        s.startAt = System.currentTimeMillis();
        if (state == Call.STATE_ACTIVE) s.activeAt = s.startAt;
        if (s.incoming) {
            s.decision = Recorder.recall(s.number);
            if (s.decision == null) {
                try {
                    s.decision = new CallDecider(ctx).decide(s.number);
                } catch (Exception ignored) {
                }
            }
        }
        if (s.decision != null && s.decision.name != null) s.name = s.decision.name;
        if (s.name == null) {
            Phone.Contact ct = new Phone(ctx).lookup(s.number);
            if (ct != null) s.name = ct.name;
        }
        return s;
    }

    /** Bản sao snapshot kèm trạng thái âm thanh chung và số cuộc gọi khác. */
    private Snapshot withShared(Snapshot s) {
        if (s == null) return null;
        s.muted = muted;
        s.speaker = speaker;
        s.others = calls.size() - 1;
        return s;
    }

    private void refreshUi() {
        Snapshot main = primary != null ? withShared(calls.get(primary)) : null;
        if (main == null || service == null) return;
        Notifs.show(service, main);
        // Cuộc gọi phụ đang đổ chuông (cuộc gọi chờ) có thông báo riêng để nghe / từ chối.
        Snapshot waiting = null;
        for (Map.Entry<Call, Snapshot> e : calls.entrySet()) {
            if (e.getKey() != primary && "ringing".equals(e.getValue().state)) waiting = e.getValue();
        }
        if (waiting != null) Notifs.showSecondary(service, waiting);
        else Notifs.cancelSecondary(service);
        for (Listener l : listeners) l.onCallState(main);
    }

    private void record(Context ctx, Call c, Snapshot s, boolean rejectedFlag) {
        boolean answered = s.activeAt > 0;
        int dur = answered ? (int) ((System.currentTimeMillis() - s.activeAt) / 1000) : 0;
        DisconnectCause cause = c.getDetails().getDisconnectCause();
        boolean rejected = rejectedFlag || (cause != null && cause.getCode() == DisconnectCause.REJECTED);

        Ended e = new Ended();
        e.number = s.number;
        e.startAt = s.startAt;
        e.durationSec = dur;
        e.name = s.name;
        e.decision = s.decision;
        if (!s.incoming) e.type = "outgoing";
        else if (s.decision != null && s.decision.action == Codes.ACT_SILENCED) e.type = "blocked";
        else if (answered) e.type = "incoming";
        else e.type = rejected ? "rejected" : "missed";
        lastEnded = e;

        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            Recorder rec = new Recorder(app);
            rec.recordEnded(s.number, s.incoming, answered, rejected, s.startAt, dur, s.decision);
            try {
                Thread.sleep(1500); // chờ hệ thống ghi CallLog rồi mới ghép
            } catch (InterruptedException ignored) {
            }
            rec.reconcile();
        }).start();
    }

    private static void launchUi(Context ctx, String route) {
        try {
            Intent i = new Intent(ctx, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(Notifs.EXTRA_ROUTE, route);
            ctx.startActivity(i);
        } catch (Exception ignored) {
            // Bị chặn mở từ nền: người dùng vẫn có thông báo full-screen.
        }
    }

    private static String stateName(int state) {
        switch (state) {
            case Call.STATE_RINGING:
                return "ringing";
            case Call.STATE_DIALING:
            case Call.STATE_CONNECTING:
            case Call.STATE_NEW:
            case Call.STATE_SELECT_PHONE_ACCOUNT:
                return "dialing";
            case Call.STATE_ACTIVE:
                return "active";
            case Call.STATE_HOLDING:
                return "holding";
            default:
                return "disconnected";
        }
    }
}
