package vn.alf.safedial.data;

import android.content.Context;
import android.content.SharedPreferences;
import android.telephony.TelephonyManager;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;
import java.util.Locale;

/**
 * Cài đặt dùng chung native ↔ WebView (schema mục 3). Mọi giá trị lưu dạng JSON string
 * để JS đọc/ghi tự do; native có getter có kiểu cho các key cần dùng.
 */
public final class Prefs {
    public static final String FILE = "safedial.settings";

    private static volatile Prefs instance;
    private final SharedPreferences sp;
    private final Context ctx;

    public static Prefs get(Context ctx) {
        if (instance == null) {
            synchronized (Prefs.class) {
                if (instance == null) instance = new Prefs(ctx.getApplicationContext());
            }
        }
        return instance;
    }

    private Prefs(Context ctx) {
        this.ctx = ctx;
        this.sp = ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    /** Toàn bộ cài đặt dạng JSON (giá trị đã parse). */
    public JSONObject all() {
        JSONObject o = new JSONObject();
        for (String k : sp.getAll().keySet()) {
            Object v = parse(sp.getString(k, null));
            try {
                o.put(k, v == null ? JSONObject.NULL : v);
            } catch (JSONException ignored) {
            }
        }
        return o;
    }

    /** Ghi nhiều key; giá trị null xoá key. */
    public void putAll(JSONObject values) {
        SharedPreferences.Editor e = sp.edit();
        Iterator<String> it = values.keys();
        while (it.hasNext()) {
            String k = it.next();
            Object v = values.opt(k);
            if (v == null || v == JSONObject.NULL) e.remove(k);
            else e.putString(k, stringify(v));
        }
        e.apply();
    }

    public void put(String key, Object value) {
        sp.edit().putString(key, stringify(value)).apply();
    }

    public boolean bool(String key, boolean def) {
        Object v = parse(sp.getString(key, null));
        return v instanceof Boolean ? (Boolean) v : def;
    }

    public long num(String key, long def) {
        Object v = parse(sp.getString(key, null));
        return v instanceof Number ? ((Number) v).longValue() : def;
    }

    public String str(String key, String def) {
        Object v = parse(sp.getString(key, null));
        return v instanceof String ? (String) v : def;
    }

    // --- Key có kiểu ---

    /** Mã quay số của nước nhà, không '+' ("84", "81", "1"…), theo nước của SIM. */
    public String homeDial() {
        String dial = CountryCodes.dialOf(homeCountryIso());
        return dial != null ? dial : str("home_country_dial", "84").replace("+", "");
    }

    /** Nước nhà (mã ISO): SIM → mạng di động → ngôn ngữ của máy → VN. */
    public String homeCountryIso() {
        String iso = str("home_country_iso", null);
        if (iso != null && CountryCodes.dialOf(iso) != null) return iso.toUpperCase(Locale.ROOT);
        try {
            TelephonyManager tm = (TelephonyManager) ctx.getSystemService(Context.TELEPHONY_SERVICE);
            if (tm != null) {
                String sim = tm.getSimCountryIso();
                if (sim != null && CountryCodes.dialOf(sim) != null) return sim.toUpperCase(Locale.ROOT);
                String net = tm.getNetworkCountryIso();
                if (net != null && CountryCodes.dialOf(net) != null) return net.toUpperCase(Locale.ROOT);
            }
        } catch (Exception ignored) {
        }
        String loc = Locale.getDefault().getCountry();
        if (CountryCodes.dialOf(loc) != null) return loc.toUpperCase(Locale.ROOT);
        return "VN";
    }

    public boolean blockPrivate() { return bool("block.private", true); }
    public boolean blockInternational() { return bool("block.international", false); }
    public boolean blockNonContacts() { return bool("block.nonContacts", false); }
    public boolean blockNotify() { return bool("block.notify", true); }
    public boolean blockSilent() { return "silent".equals(str("block.method", "hangup")); }
    public boolean warnInternational() { return bool("detect.warnInternational", true); }
    public boolean warnPrivate() { return bool("detect.warnPrivate", true); }
    public int burstCount() { return (int) num("detect.burstCount", 3); }
    public int burstWindowMin() { return (int) num("detect.burstWindowMin", 10); }
    public boolean notifyMissed() { return bool("notify.missedCall", true); }

    private static String stringify(Object v) {
        if (v instanceof String) return JSONObject.quote((String) v);
        return String.valueOf(v);
    }

    private static Object parse(String raw) {
        if (raw == null) return null;
        try {
            return new JSONArray("[" + raw + "]").get(0);
        } catch (JSONException e) {
            return raw;
        }
    }
}
