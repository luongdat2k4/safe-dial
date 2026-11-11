package vn.alf.safedial;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

import vn.alf.safedial.telecom.CallManager;
import vn.alf.safedial.telecom.Notifs;

public class MainActivity extends BridgeActivity implements CallManager.Listener {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafeDialPlugin.class);
        super.onCreate(savedInstanceState);
        CallManager.get().addListener(this);
        handle(getIntent());
    }

    @Override
    public void onDestroy() {
        CallManager.get().removeListener(this);
        super.onDestroy();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handle(intent);
    }

    private void handle(Intent intent) {
        if (intent == null) return;
        String route = intent.getStringExtra(Notifs.EXTRA_ROUTE);
        String action = intent.getStringExtra(Notifs.EXTRA_ACTION);
        String number = null;

        String a = intent.getAction();
        if (route == null && (Intent.ACTION_DIAL.equals(a) || Intent.ACTION_VIEW.equals(a))) {
            Uri data = intent.getData();
            if (data != null && "tel".equals(data.getScheme())) number = data.getSchemeSpecificPart();
            route = "/dialpad";
        }
        CallManager.Snapshot cur = CallManager.get().current();
        if (route == null && cur != null) route = "ringing".equals(cur.state) ? "/call/incoming" : "/call/active";
        if (route == null) return;

        // Chỉ hiện trên màn hình khoá khi thật sự có cuộc gọi; tắt lại khi cuộc gọi kết thúc.
        if (route.startsWith("/call") && cur != null) setLockScreenMode(true);
        if ("answer".equals(action)) CallManager.get().answer();
        SafeDialPlugin.deliverLaunch(route, number);
    }

    private void setLockScreenMode(boolean on) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(on);
            setTurnScreenOn(on);
        } else {
            int flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON;
            if (on) getWindow().addFlags(flags); else getWindow().clearFlags(flags);
        }
    }

    // ------------------------------------------------------------ CallManager.Listener

    @Override
    public void onCallState(CallManager.Snapshot s) {}

    @Override
    public void onCallEnded(CallManager.Ended e) {
        // Không để danh bạ / nhật ký lộ ra trên màn hình khoá sau khi cuộc gọi kết thúc.
        runOnUiThread(() -> setLockScreenMode(false));
    }
}
