package vn.alf.safedial.telecom;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Nút Từ chối / Kết thúc trên thông báo cuộc gọi — hoạt động cả khi WebView chưa mở. */
public class CallActionReceiver extends BroadcastReceiver {
    public static final String DECLINE = "vn.alf.safedial.DECLINE";
    public static final String HANGUP = "vn.alf.safedial.HANGUP";

    @Override
    public void onReceive(Context context, Intent intent) {
        String a = intent.getAction();
        if (DECLINE.equals(a)) CallManager.get().reject(null);
        else if (HANGUP.equals(a)) CallManager.get().hangup();
    }
}
