package vn.alf.safedial.telecom;

import android.telecom.Call;
import android.telecom.CallAudioState;
import android.telecom.InCallService;

/**
 * Hệ thống bind service này khi app là ứng dụng gọi điện mặc định. Màn hình cuộc gọi là
 * MainActivity (WebView); khi WebView chưa sẵn sàng, thông báo full-screen có nút
 * Trả lời / Từ chối để người dùng luôn xử lý được cuộc gọi.
 */
public class SafeDialInCallService extends InCallService {

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        CallManager.get().onAdded(this, call);
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        CallManager.get().onRemoved(this, call);
    }

    @Override
    public void onCallAudioStateChanged(CallAudioState audioState) {
        super.onCallAudioStateChanged(audioState);
        CallManager.get().onAudioState(audioState);
    }
}
