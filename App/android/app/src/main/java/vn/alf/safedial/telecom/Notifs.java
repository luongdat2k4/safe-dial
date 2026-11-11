package vn.alf.safedial.telecom;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import vn.alf.safedial.MainActivity;
import vn.alf.safedial.data.Codes;
import vn.alf.safedial.data.Numbers;

/** Thông báo cuộc gọi (đến / đang gọi) và thông báo cuộc gọi bị chặn. */
public final class Notifs {
    private Notifs() {}

    public static final String CH_INCOMING = "incoming_call";
    public static final String CH_ONGOING = "ongoing_call";
    public static final String CH_BLOCKED = "blocked_call";
    public static final int ID_CALL = 1001;
    public static final int ID_WAITING = 1002;
    private static int blockedId = 2000;

    public static final String EXTRA_ROUTE = "safedial.route";
    public static final String EXTRA_ACTION = "safedial.action";

    static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel in = new NotificationChannel(CH_INCOMING, "Cuộc gọi đến", NotificationManager.IMPORTANCE_HIGH);
        in.setSound(null, null); // Telecom tự phát nhạc chuông
        nm.createNotificationChannel(in);
        nm.createNotificationChannel(new NotificationChannel(CH_ONGOING, "Cuộc gọi đang diễn ra", NotificationManager.IMPORTANCE_LOW));
        nm.createNotificationChannel(new NotificationChannel(CH_BLOCKED, "Cuộc gọi bị chặn", NotificationManager.IMPORTANCE_DEFAULT));
    }

    private static PendingIntent activity(Context ctx, int req, String route, String action) {
        Intent i = new Intent(ctx, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(EXTRA_ROUTE, route);
        if (action != null) i.putExtra(EXTRA_ACTION, action);
        return PendingIntent.getActivity(ctx, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent broadcast(Context ctx, int req, String action) {
        Intent i = new Intent(ctx, CallActionReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(ctx, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static String title(CallManager.Snapshot s) {
        if (s.name != null) return s.name;
        return s.number == 0 ? "Số ẩn" : Numbers.toE164(s.number);
    }

    private static String riskText(CallDecider.Decision d) {
        if (d == null) return null;
        if (d.risk == Codes.RISK_SCAM) return "Cảnh báo: nghi lừa đảo";
        if (d.risk == Codes.RISK_SPAM) return "Cảnh báo: nghi spam";
        if (d.action == Codes.ACT_WARNED) return "Số lạ có dấu hiệu đáng ngờ";
        if (!d.isContact) return "Số lạ";
        return null;
    }

    static void show(Context ctx, CallManager.Snapshot s) {
        ensureChannels(ctx);
        NotificationCompat.Builder b;
        if ("ringing".equals(s.state)) {
            String risk = riskText(s.decision);
            b = new NotificationCompat.Builder(ctx, CH_INCOMING)
                .setSmallIcon(android.R.drawable.sym_action_call)
                .setContentTitle(title(s))
                .setContentText(risk != null ? risk : "Cuộc gọi đến")
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setOngoing(true)
                .setFullScreenIntent(activity(ctx, 1, "/call/incoming", null), true)
                .setContentIntent(activity(ctx, 2, "/call/incoming", null))
                .addAction(0, "Từ chối", broadcast(ctx, 3, CallActionReceiver.DECLINE))
                .addAction(0, "Trả lời", activity(ctx, 4, "/call/active", "answer"));
        } else {
            b = new NotificationCompat.Builder(ctx, CH_ONGOING)
                .setSmallIcon(android.R.drawable.sym_action_call)
                .setContentTitle(title(s))
                .setContentText("dialing".equals(s.state) ? "Đang gọi…" : "holding".equals(s.state) ? "Đang giữ máy" : "Đang trong cuộc gọi")
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setOngoing(true)
                .setUsesChronometer(s.activeAt > 0)
                .setWhen(s.activeAt > 0 ? s.activeAt : System.currentTimeMillis())
                .setContentIntent(activity(ctx, 5, "/call/active", null))
                .addAction(0, "Kết thúc", broadcast(ctx, 6, CallActionReceiver.HANGUP));
        }
        try {
            NotificationManagerCompat.from(ctx).notify(ID_CALL, b.build());
        } catch (SecurityException ignored) {
            // Chưa có quyền POST_NOTIFICATIONS: màn hình cuộc gọi vẫn mở được từ app.
        }
    }

    static void update(Context ctx, CallManager.Snapshot s) {
        show(ctx, s);
    }

    static void cancel(Context ctx) {
        NotificationManagerCompat.from(ctx).cancel(ID_CALL);
    }

    /** Cuộc gọi chờ (đổ chuông khi đang có cuộc gọi khác): Nghe / Từ chối. */
    static void showSecondary(Context ctx, CallManager.Snapshot s) {
        ensureChannels(ctx);
        String risk = riskText(s.decision);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CH_INCOMING)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setContentTitle(title(s))
            .setContentText(risk != null ? "Cuộc gọi chờ · " + risk : "Cuộc gọi chờ")
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true)
            .addAction(0, "Từ chối", broadcast(ctx, 8, CallActionReceiver.DECLINE))
            .addAction(0, "Nghe", activity(ctx, 9, "/call/active", "answer"));
        try {
            NotificationManagerCompat.from(ctx).notify(ID_WAITING, b.build());
        } catch (SecurityException ignored) {
        }
    }

    static void cancelSecondary(Context ctx) {
        NotificationManagerCompat.from(ctx).cancel(ID_WAITING);
    }

    static void blocked(Context ctx, CallDecider.Decision d) {
        ensureChannels(ctx);
        String who = d.name != null ? d.name : d.number == 0 ? "Số ẩn" : Numbers.toE164(d.number);
        String what = d.action == Codes.ACT_SILENCED ? "Đã tắt chuông" : "Đã chặn";
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CH_BLOCKED)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setContentTitle(what + ": " + who)
            .setContentText(reasonText(d))
            .setAutoCancel(true)
            .setContentIntent(activity(ctx, 7, "/home/block", null));
        try {
            NotificationManagerCompat.from(ctx).notify(blockedId++, b.build());
        } catch (SecurityException ignored) {
        }
    }

    private static String reasonText(CallDecider.Decision d) {
        int r = d.reasons;
        if ((r & Codes.R_BLACKLIST) != 0) return "Có trong danh sách chặn";
        if ((r & Codes.R_COUNTRY) != 0) return "Chặn theo mã quốc gia";
        if ((r & Codes.R_RULE) != 0) return "Khớp quy tắc " + (d.ruleLabel != null ? d.ruleLabel : "");
        if ((r & Codes.R_PRIVATE) != 0) return "Số ẩn danh";
        if ((r & Codes.R_INTERNATIONAL) != 0) return "Cuộc gọi quốc tế";
        return "Không có trong danh bạ";
    }
}
