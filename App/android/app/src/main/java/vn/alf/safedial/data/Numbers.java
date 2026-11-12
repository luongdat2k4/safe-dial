package vn.alf.safedial.data;

import android.content.Context;
import android.telephony.PhoneNumberUtils;
import android.text.TextUtils;

/**
 * Chuẩn hoá số điện thoại. Khoá trong DB là E.164 bỏ dấu '+' dạng long (84901234567); 0 = số ẩn.
 */
public final class Numbers {
    private Numbers() {}

    /** Số thô (từ danh bạ, CallLog, Telecom) → khoá. Trả 0 nếu ẩn số / không hợp lệ. */
    public static long toKey(Context ctx, String raw) {
        if (raw == null) return 0;
        String s = raw.trim();
        if (s.isEmpty()) return 0;
        Prefs p = Prefs.get(ctx);
        String e164 = null;
        try {
            e164 = PhoneNumberUtils.formatNumberToE164(s, p.homeCountryIso());
        } catch (Exception ignored) {
        }
        String digits;
        if (e164 != null) {
            digits = e164.substring(1);
        } else {
            // Không hợp lệ theo nước nhà: thử các cách hiểu khác, vẫn theo libphonenumber (đúng cho mọi nước).
            // Số trong nước gắn '+' nhầm ("+981294721" ở VN), số có mã nước nhưng thiếu '+' ("84981294721").
            String d = PhoneNumberUtils.stripSeparators(s);
            if (d == null) return 0;
            String iso = p.homeCountryIso();
            String home = p.homeDial();
            String alt = null;
            if (d.startsWith("+")) alt = e164(d.substring(1), iso);
            else if (!d.startsWith("00")) alt = e164("+" + d, iso);
            if (alt != null) digits = alt.substring(1);
            else if (d.startsWith("+")) digits = d.substring(1);
            else if (d.startsWith("00")) digits = d.substring(2);
            // Đầu số mới chưa có trong dữ liệu libphonenumber: số 0 đầu vẫn là tiền tố trong nước.
            else if (d.startsWith("0") && d.length() >= 8) digits = home + d.substring(1);
            else digits = d; // đầu số dịch vụ ngắn (113, 1800…)
        }
        if (!TextUtils.isDigitsOnly(digits) || digits.length() < 3 || digits.length() > 15) return 0;
        try {
            return Long.parseLong(digits);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** E.164 nếu số hợp lệ (libphonenumber của Android, theo nước `iso` cho số trong nước); không thì null. */
    private static String e164(String number, String iso) {
        try {
            return PhoneNumberUtils.formatNumberToE164(number, iso);
        } catch (Exception e) {
            return null;
        }
    }

    /** Khoá → "+84901234567"; 0 → "". */
    public static String toE164(long key) {
        return key == 0 ? "" : "+" + key;
    }

    /** "+84…" (từ JS) → khoá. */
    public static long fromE164(String e164) {
        if (e164 == null || e164.isEmpty()) return 0;
        String d = e164.startsWith("+") ? e164.substring(1) : e164;
        if (!TextUtils.isDigitsOnly(d) || d.isEmpty()) return 0;
        try {
            return Long.parseLong(d);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    public static boolean isInternational(long key, String homeDial) {
        return key != 0 && !String.valueOf(key).startsWith(homeDial);
    }

    /**
     * Dạng gọi trong nước (chỉ chữ số), theo quy tắc của nước nhà: VN 84901234567 → 0901234567,
     * US 12025550123 → 2025550123, RU 7912… → 8912…. Số nước ngoài giữ nguyên chữ số.
     */
    public static String nationalForm(long key, String homeDial, String homeIso) {
        String s = String.valueOf(key);
        if (!s.startsWith(homeDial)) return s;
        String f = null;
        try {
            f = PhoneNumberUtils.formatNumber("+" + s, homeIso);
        } catch (Exception ignored) {
        }
        String d = f != null ? f.replaceAll("[^0-9]", "") : "";
        if (!d.isEmpty() && !f.trim().startsWith("+")) return d;
        return "0" + s.substring(homeDial.length());
    }
}
