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
            String d = PhoneNumberUtils.stripSeparators(s);
            if (d == null) return 0;
            if (d.startsWith("+")) digits = d.substring(1);
            else if (d.startsWith("00")) digits = d.substring(2);
            else if (d.startsWith("0")) digits = p.homeDial() + d.substring(1);
            else digits = d;
        }
        if (!TextUtils.isDigitsOnly(digits) || digits.length() < 3 || digits.length() > 15) return 0;
        try {
            return Long.parseLong(digits);
        } catch (NumberFormatException e) {
            return 0;
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

    /** Dạng trong nước: 84901234567 → 0901234567. Số quốc tế giữ nguyên chữ số. */
    public static String nationalForm(long key, String homeDial) {
        String s = String.valueOf(key);
        return s.startsWith(homeDial) ? "0" + s.substring(homeDial.length()) : s;
    }
}
