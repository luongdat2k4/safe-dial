package vn.alf.safedial.telecom;

import android.net.Uri;
import android.os.Build;
import android.telecom.Call;
import android.telecom.CallScreeningService;

import vn.alf.safedial.data.Codes;
import vn.alf.safedial.data.Numbers;
import vn.alf.safedial.data.Prefs;

/**
 * Sàng lọc cuộc gọi đến trước khi đổ chuông. Được hệ thống gọi vì app là ứng dụng gọi
 * điện mặc định (ROLE_DIALER). Không có WebView: chỉ đọc SQLite + SharedPreferences.
 */
public class SafeDialScreeningService extends CallScreeningService {

    @Override
    public void onScreenCall(Call.Details details) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            && details.getCallDirection() != Call.Details.DIRECTION_INCOMING) {
            respondToCall(details, new CallResponse.Builder().build());
            return;
        }

        CallDecider.Decision d;
        try {
            Uri handle = details.getHandle();
            long key = handle != null ? Numbers.toKey(this, handle.getSchemeSpecificPart()) : 0;
            d = new CallDecider(this).decide(key);
        } catch (Exception e) {
            // Lỗi bất ngờ: luôn cho cuộc gọi qua, không được làm mất cuộc gọi của người dùng.
            respondToCall(details, new CallResponse.Builder().build());
            return;
        }

        CallResponse.Builder b = new CallResponse.Builder();
        long now = System.currentTimeMillis();
        // Android < 10 không có "tắt chuông": chặn hẳn thay vào đó.
        if (d.action == Codes.ACT_SILENCED && Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) d.action = Codes.ACT_BLOCKED;
        if (d.action == Codes.ACT_BLOCKED) {
            b.setDisallowCall(true).setRejectCall(true).setSkipNotification(true).setSkipCallLog(false);
            new Recorder(this).recordBlocked(d, now);
            if (Prefs.get(this).blockNotify()) Notifs.blocked(this, d);
        } else if (d.action == Codes.ACT_SILENCED) {
            b.setSilenceCall(true);
            Recorder.remember(d);
            if (Prefs.get(this).blockNotify()) Notifs.blocked(this, d);
        } else {
            Recorder.remember(d);
        }
        respondToCall(details, b.build());
    }
}
