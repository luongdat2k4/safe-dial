package vn.alf.safedial;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

import vn.alf.safedial.telecom.CallManager;
import vn.alf.safedial.telecom.Notifs;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MainActivity extends BridgeActivity implements CallManager.Listener {
    // AppLovin giữ mọi creative đã tải trong files/al và không tự dọn, mỗi quảng cáo thêm vài MB.
    private static final long AD_CACHE_LIMIT_BYTES = 30L * 1024 * 1024;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Trước khi bridge chạy: SDK quảng cáo chưa khởi động nên không creative nào đang được dùng khi dọn.
        trimAdCache(new File(getFilesDir(), "al"), AD_CACHE_LIMIT_BYTES);
        registerPlugin(SafeDialPlugin.class);
        registerPlugin(AdFollowPlugin.class);
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

    // Xoá file cũ nhất tới khi thư mục nằm trong giới hạn, giữ lại các creative mới nhất.
    private static void trimAdCache(File dir, long limit) {
        if (!dir.isDirectory()) return;
        List<File> files = new ArrayList<>();
        collect(dir, files);
        long total = 0;
        for (File file : files) total += file.length();
        if (total <= limit) return;
        Collections.sort(files, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
        for (File file : files) {
            if (total <= limit) break;
            long size = file.length();
            if (file.delete()) total -= size;
        }
    }

    private static void collect(File dir, List<File> out) {
        File[] children = dir.listFiles();
        if (children == null) return;
        for (File child : children) {
            if (child.isDirectory()) collect(child, out);
            else out.add(child);
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
