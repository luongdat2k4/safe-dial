package vn.alf.safedial;

import android.Manifest;
import android.app.Activity;
import android.app.role.RoleManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.CallLog;
import android.provider.Settings;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import vn.alf.safedial.data.Codes;
import vn.alf.safedial.data.Numbers;
import vn.alf.safedial.data.Phone;
import vn.alf.safedial.data.Prefs;
import vn.alf.safedial.data.Repo;
import vn.alf.safedial.telecom.CallDecider;
import vn.alf.safedial.telecom.CallManager;
import vn.alf.safedial.telecom.Recorder;

/**
 * Cầu nối WebView ↔ native. Mọi số điện thoại qua lại với JS ở dạng E.164 có '+' ("" = số ẩn).
 * Định nghĩa TypeScript tương ứng: src/services/native/definitions.ts
 */
@CapacitorPlugin(
    name = "SafeDial",
    permissions = {
        @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }),
        // Ghi danh bạ tách riêng: chỉ cần cho yêu thích (STARRED).
        @Permission(alias = "contactsWrite", strings = { Manifest.permission.WRITE_CONTACTS }),
        @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG, Manifest.permission.WRITE_CALL_LOG }),
        @Permission(alias = "phone", strings = { Manifest.permission.CALL_PHONE, Manifest.permission.READ_PHONE_STATE }),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" }),
    }
)
public class SafeDialPlugin extends Plugin implements CallManager.Listener {

    private static SafeDialPlugin instance;
    private static JSObject pendingLaunch;

    private Repo repo;
    private Phone phone;
    private Prefs prefs;

    @Override
    public void load() {
        instance = this;
        repo = new Repo(getContext());
        phone = new Phone(getContext());
        prefs = Prefs.get(getContext());
        CallManager.get().addListener(this);
    }

    @Override
    protected void handleOnDestroy() {
        CallManager.get().removeListener(this);
        if (instance == this) instance = null;
    }

    /** MainActivity gọi khi được mở bởi cuộc gọi / ACTION_DIAL. */
    static void deliverLaunch(String route, String number) {
        JSObject o = new JSObject();
        o.put("route", route);
        if (number != null) o.put("number", number);
        pendingLaunch = o;
        if (instance != null) instance.notifyListeners("launch", o, true);
    }

    // ================================================================ khởi động & quyền

    @PluginMethod
    public void getLaunchState(PluginCall call) {
        JSObject r = new JSObject();
        if (pendingLaunch != null) r.put("launch", pendingLaunch);
        pendingLaunch = null;
        CallManager.Snapshot s = CallManager.get().current();
        if (s != null) r.put("call", snapshot(s));
        call.resolve(r);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("contacts", state("contacts"));
        r.put("contactsWrite", state("contactsWrite"));
        r.put("callLog", state("callLog"));
        r.put("phone", state("phone"));
        r.put("notifications", Build.VERSION.SDK_INT >= 33 ? state("notifications") : "granted");
        r.put("dialerRole", isDefaultDialer());
        r.put("canBlock", phone.canBlock());
        call.resolve(r);
    }

    private String state(String alias) {
        PermissionState s = getPermissionState(alias);
        return s == null ? "prompt" : s.toString();
    }

    private boolean isDefaultDialer() {
        TelecomManager tm = (TelecomManager) getContext().getSystemService(Context.TELECOM_SERVICE);
        return tm != null && getContext().getPackageName().equals(tm.getDefaultDialerPackage());
    }

    @PluginMethod
    public void requestDialerRole(PluginCall call) {
        if (isDefaultDialer()) {
            call.resolve(new JSObject().put("granted", true));
            return;
        }
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            RoleManager rm = getContext().getSystemService(RoleManager.class);
            if (rm == null || !rm.isRoleAvailable(RoleManager.ROLE_DIALER)) {
                call.reject("ROLE_DIALER không khả dụng trên máy này");
                return;
            }
            intent = rm.createRequestRoleIntent(RoleManager.ROLE_DIALER);
        } else {
            intent = new Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER)
                .putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getContext().getPackageName());
        }
        startActivityForResult(call, intent, "onDialerRoleResult");
    }

    @ActivityCallback
    private void onDialerRoleResult(PluginCall call, ActivityResult result) {
        call.resolve(new JSObject().put("granted", isDefaultDialer() || result.getResultCode() == Activity.RESULT_OK));
    }

    // ================================================================ cài đặt

    @PluginMethod
    public void getSettings(PluginCall call) {
        try {
            call.resolve(new JSObject().put("values", JSObject.fromJSONObject(prefs.all())));
        } catch (JSONException e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void setSettings(PluginCall call) {
        JSObject values = call.getObject("values", new JSObject());
        prefs.putAll(values);
        call.resolve();
    }

    // ================================================================ danh bạ

    @PluginMethod
    public void getContacts(PluginCall call) {
        JSArray arr = new JSArray();
        for (Phone.Contact c : phone.contacts(call.getString("query"))) arr.put(contact(c));
        call.resolve(new JSObject().put("contacts", arr));
    }

    /**
     * PluginCall.getLong() chỉ nhận Long: số nhỏ từ JS (vd. id danh bạ 42) được JSON đọc thành Integer
     * nên getLong() lặng lẽ trả về mặc định. Đọc mọi kiểu số (và chuỗi số) về long.
     */
    private static long longArg(PluginCall call, String name, long def) {
        Object v = call.getData().opt(name);
        if (v instanceof Number) return ((Number) v).longValue();
        if (v instanceof String) {
            try { return Long.parseLong(((String) v).trim()); } catch (NumberFormatException ignored) { }
        }
        return def;
    }

    @PluginMethod
    public void setStarred(PluginCall call) {
        long id = longArg(call, "contactId", 0L);
        boolean ok = phone.setStarred(id, Boolean.TRUE.equals(call.getBoolean("starred", false)));
        if (ok) call.resolve(); else call.reject("Không cập nhật được (thiếu quyền ghi danh bạ?)");
    }

    /** Mọi thông tin app biết về một số. */
    @PluginMethod
    public void lookupNumber(PluginCall call) {
        long key = Numbers.fromE164(call.getString("number", ""));
        call.resolve(numberInfo(key));
    }

    private JSObject numberInfo(long key) {
        JSObject r = new JSObject();
        r.put("number", Numbers.toE164(key));
        Phone.Contact c = phone.lookup(key);
        r.put("isContact", c != null);
        if (c != null) {
            r.put("name", c.name);
            r.put("contactId", c.id);
            r.put("starred", c.starred);
            r.put("photoUri", c.photoUri);
        }
        r.put("blocked", phone.isBlocked(key));
        Repo.Mark m = key != 0 ? repo.mark(key) : null;
        if (m != null) {
            r.put("mark", mark(m));
            if (c == null && m.name != null) r.put("name", m.name);
        }
        return r;
    }

    // ================================================================ nhật ký cuộc gọi

    @PluginMethod
    public void getCallLog(PluginCall call) {
        int limit = call.getInt("limit", 300);
        int offset = call.getInt("offset", 0);
        long key = Numbers.fromE164(call.getString("number", ""));
        long since = longArg(call, "since", 0L);
        Recorder rec = new Recorder(getContext());
        if (offset == 0) {
            rec.reconcile();
            rec.cleanupIfDue();
        }
        List<Phone.Call> calls = phone.calls(limit, offset, key, since);
        List<Long> ids = new ArrayList<>();
        for (Phone.Call c : calls) ids.add(c.id);
        Map<Long, Repo.Meta> metas = repo.metaByIds(ids);
        Map<String, Integer> simSlots = new java.util.HashMap<>();
        for (Phone.Sim s : phone.sims()) simSlots.put(s.id, s.slot);

        JSArray arr = new JSArray();
        for (Phone.Call c : calls) {
            JSObject o = new JSObject();
            o.put("id", String.valueOf(c.id));
            o.put("number", Numbers.toE164(c.key));
            if (c.cachedName != null && !c.cachedName.isEmpty()) o.put("name", c.cachedName);
            o.put("type", typeName(c.type));
            o.put("startedAt", c.date);
            o.put("durationSec", c.duration);
            Integer slot = c.accountId != null ? simSlots.get(c.accountId) : null;
            if (slot != null) o.put("simSlot", slot);
            Repo.Meta m = metas.get(c.id);
            if (m != null) o.put("meta", meta(m));
            arr.put(o);
        }
        call.resolve(new JSObject().put("calls", arr).put("granted", phone.has(Manifest.permission.READ_CALL_LOG)));
    }

    private static String typeName(int t) {
        switch (t) {
            case CallLog.Calls.INCOMING_TYPE:
            case CallLog.Calls.ANSWERED_EXTERNALLY_TYPE:
                return "incoming";
            case CallLog.Calls.OUTGOING_TYPE:
                return "outgoing";
            case CallLog.Calls.REJECTED_TYPE:
                return "rejected";
            case CallLog.Calls.BLOCKED_TYPE:
                return "blocked";
            default:
                return "missed";
        }
    }

    @PluginMethod
    public void deleteCalls(PluginCall call) {
        List<Long> ids = longs(call.getArray("ids"));
        phone.deleteCalls(ids);
        repo.deleteMeta(ids);
        call.resolve();
    }

    @PluginMethod
    public void deleteCallsOf(PluginCall call) {
        long key = Numbers.fromE164(call.getString("number", ""));
        phone.deleteCallsOf(key);
        repo.deleteMetaByNumber(key);
        call.resolve();
    }

    @PluginMethod
    public void clearCallLog(PluginCall call) {
        phone.clearCalls();
        repo.deleteAllMeta();
        call.resolve();
    }

    // ================================================================ chặn

    @PluginMethod
    public void listBlocked(PluginCall call) {
        JSArray arr = new JSArray();
        for (long k : phone.blockedNumbers()) arr.put(Numbers.toE164(k));
        call.resolve(new JSObject().put("numbers", arr).put("canBlock", phone.canBlock()));
    }

    @PluginMethod
    public void block(PluginCall call) {
        long key = Numbers.fromE164(call.getString("number", ""));
        if (phone.block(key)) call.resolve();
        else call.reject("Không chặn được: cần đặt Safe Dial làm ứng dụng gọi điện mặc định");
    }

    @PluginMethod
    public void unblock(PluginCall call) {
        long key = Numbers.fromE164(call.getString("number", ""));
        phone.unblock(key);
        call.resolve();
    }

    // ================================================================ number_marks

    @PluginMethod
    public void listMarks(PluginCall call) {
        JSArray arr = new JSArray();
        for (Repo.Mark m : repo.marks()) arr.put(mark(m));
        call.resolve(new JSObject().put("marks", arr));
    }

    /** Ghi một phần: chỉ các trường có trong lời gọi bị thay đổi. */
    @PluginMethod
    public void setMark(PluginCall call) {
        long key = Numbers.fromE164(call.getString("number", ""));
        if (key == 0) {
            call.reject("Không thể đánh dấu số ẩn");
            return;
        }
        Repo.Mark m = repo.mark(key);
        if (m == null) {
            m = new Repo.Mark();
            m.number = key;
        }
        JSObject d = call.getData();
        if (d.has("trusted")) m.trusted = d.optBoolean("trusted");
        if (d.has("category")) m.category = d.isNull("category") ? 0 : Codes.categoryCode(d.optString("category"));
        if (d.has("name")) m.name = d.isNull("name") ? null : d.optString("name");
        if (d.has("note")) m.note = d.isNull("note") ? null : d.optString("note");
        repo.putMark(m);
        Repo.Mark saved = repo.mark(key);
        JSObject r = new JSObject();
        if (saved != null) r.put("mark", mark(saved));
        call.resolve(r);
    }

    // ================================================================ block_rules

    @PluginMethod
    public void listRules(PluginCall call) {
        JSArray arr = new JSArray();
        for (Repo.Rule r : repo.rules()) arr.put(rule(r));
        call.resolve(new JSObject().put("rules", arr));
    }

    @PluginMethod
    public void addRule(PluginCall call) {
        int kind = Codes.kindCode(call.getString("kind", ""));
        String value = call.getString("value", "").replaceAll("[^0-9]", "");
        if (kind == 0 || value.isEmpty()) {
            call.reject("Quy tắc không hợp lệ");
            return;
        }
        long id = repo.addRule(kind, value, call.getString("label"));
        if (id < 0) {
            call.reject("duplicate");
            return;
        }
        for (Repo.Rule r : repo.rules()) {
            if (r.id == id) {
                call.resolve(new JSObject().put("rule", rule(r)));
                return;
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void setRuleEnabled(PluginCall call) {
        repo.setRuleEnabled(Long.parseLong(call.getString("id", "0")), Boolean.TRUE.equals(call.getBoolean("enabled", true)));
        call.resolve();
    }

    @PluginMethod
    public void deleteRule(PluginCall call) {
        repo.deleteRule(Long.parseLong(call.getString("id", "0")));
        call.resolve();
    }

    // ================================================================ thống kê

    @PluginMethod
    public void getStats(PluginCall call) {
        long fromDay = longArg(call, "fromDay", 0L);
        String num = call.getString("number");
        Long key = num != null ? Numbers.fromE164(num) : null;
        JSArray arr = new JSArray();
        for (long[] row : repo.statsRows(fromDay, key)) {
            JSObject o = new JSObject();
            o.put("day", row[0]);
            o.put("number", Numbers.toE164(row[1]));
            for (int i = 0; i < Repo.STAT_COLS.length; i++) o.put(camel(Repo.STAT_COLS[i]), row[i + 2]);
            arr.put(o);
        }
        call.resolve(new JSObject().put("rows", arr).put("today", Repo.dayOf(System.currentTimeMillis())));
    }

    @PluginMethod
    public void clearStats(PluginCall call) {
        repo.clearStats();
        call.resolve();
    }

    private static String camel(String snake) {
        StringBuilder b = new StringBuilder();
        boolean up = false;
        for (char ch : snake.toCharArray()) {
            if (ch == '_') up = true;
            else {
                b.append(up ? Character.toUpperCase(ch) : ch);
                up = false;
            }
        }
        return b.toString();
    }

    // ================================================================ ghi chú cuộc gọi

    @PluginMethod
    public void listNotes(PluginCall call) {
        String num = call.getString("number");
        JSArray arr = new JSArray();
        for (Repo.Note n : repo.notes(num != null ? Numbers.fromE164(num) : null)) {
            JSObject o = new JSObject();
            o.put("id", String.valueOf(n.id));
            o.put("number", Numbers.toE164(n.number));
            o.put("at", n.at);
            o.put("note", n.note);
            arr.put(o);
        }
        call.resolve(new JSObject().put("notes", arr));
    }

    @PluginMethod
    public void addNote(PluginCall call) {
        String text = call.getString("note", "").trim();
        if (text.isEmpty()) {
            call.reject("Ghi chú trống");
            return;
        }
        long id = repo.addNote(Numbers.fromE164(call.getString("number", "")), longArg(call, "at", System.currentTimeMillis()), text);
        call.resolve(new JSObject().put("id", String.valueOf(id)));
    }

    @PluginMethod
    public void deleteNote(PluginCall call) {
        repo.deleteNote(Long.parseLong(call.getString("id", "0")));
        call.resolve();
    }

    // ================================================================ kiểm tra một số

    @PluginMethod
    public void evaluate(PluginCall call) {
        long key = Numbers.fromE164(call.getString("number", ""));
        call.resolve(decision(new CallDecider(getContext()).decide(key)));
    }

    // ================================================================ gọi điện

    /** Mở trang thông tin ứng dụng trong Cài đặt Android (bật lại quyền đã bị từ chối hẳn). */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Không mở được Cài đặt");
        }
    }

    /** Popup cuộc gọi đến: cửa sổ trong suốt để hiện đè lên màn hình thật của điện thoại. */
    @PluginMethod
    public void setSeeThrough(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        Activity a = getActivity();
        if (!(a instanceof MainActivity)) {
            call.resolve();
            return;
        }
        a.runOnUiThread(() -> {
            ((MainActivity) a).setSeeThrough(on);
            call.resolve();
        });
    }

    @PluginMethod
    public void openSms(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_SENDTO, Uri.fromParts("smsto", call.getString("number", ""), null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Không có ứng dụng tin nhắn");
        }
    }

    @PluginMethod
    public void addContact(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_INSERT, android.provider.ContactsContract.Contacts.CONTENT_URI)
            .putExtra(android.provider.ContactsContract.Intents.Insert.PHONE, call.getString("number", ""))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Không mở được danh bạ");
        }
    }

    @PluginMethod
    public void getSims(PluginCall call) {
        JSArray arr = new JSArray();
        for (Phone.Sim s : phone.sims()) {
            arr.put(new JSObject().put("id", s.id).put("label", s.label).put("slot", s.slot));
        }
        call.resolve(new JSObject().put("sims", arr));
    }

    @PluginMethod
    public void placeCall(PluginCall call) {
        String number = call.getString("number", "");
        if (number.isEmpty()) {
            call.reject("Thiếu số");
            return;
        }
        // Chốt chặn cuối: số "+…" không hợp lệ (vd. "+981294721" = số trong nước bị gắn '+') được chuẩn hoá lại
        // trước khi gọi, để không gọi nhầm ra nước ngoài. Mã dịch vụ (113, *101#…) giữ nguyên.
        if (number.startsWith("+")) {
            long key = Numbers.toKey(getContext(), number);
            if (key != 0) number = Numbers.toE164(key);
        }
        if (!phone.has(Manifest.permission.CALL_PHONE)) {
            call.reject("Thiếu quyền gọi điện");
            return;
        }
        TelecomManager tm = (TelecomManager) getContext().getSystemService(Context.TELECOM_SERVICE);
        Bundle extras = new Bundle();
        PhoneAccountHandle h = phone.simHandle(call.getString("simId"));
        if (h != null) extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, h);
        try {
            tm.placeCall(Uri.fromParts("tel", number, null), extras);
            call.resolve();
        } catch (SecurityException e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void getCallState(PluginCall call) {
        JSObject r = new JSObject();
        CallManager.Snapshot s = CallManager.get().current();
        if (s != null) r.put("call", snapshot(s));
        CallManager.Ended e = CallManager.get().lastEnded();
        if (e != null) r.put("lastEnded", ended(e));
        call.resolve(r);
    }

    @PluginMethod
    public void answer(PluginCall call) {
        resolveIf(call, CallManager.get().answer());
    }

    @PluginMethod
    public void reject(PluginCall call) {
        resolveIf(call, CallManager.get().reject(call.getString("message")));
    }

    @PluginMethod
    public void hangup(PluginCall call) {
        resolveIf(call, CallManager.get().hangup());
    }

    @PluginMethod
    public void setMuted(PluginCall call) {
        resolveIf(call, CallManager.get().setMuted(Boolean.TRUE.equals(call.getBoolean("muted", false))));
    }

    @PluginMethod
    public void setSpeaker(PluginCall call) {
        resolveIf(call, CallManager.get().setSpeaker(Boolean.TRUE.equals(call.getBoolean("on", false))));
    }

    @PluginMethod
    public void setHold(PluginCall call) {
        resolveIf(call, CallManager.get().setHold(Boolean.TRUE.equals(call.getBoolean("hold", false))));
    }

    @PluginMethod
    public void dtmf(PluginCall call) {
        String d = call.getString("digit", "");
        resolveIf(call, !d.isEmpty() && CallManager.get().dtmf(d.charAt(0)));
    }

    private static void resolveIf(PluginCall call, boolean ok) {
        if (ok) call.resolve(); else call.reject("Không có cuộc gọi");
    }

    // ================================================================ CallManager.Listener

    @Override
    public void onCallState(CallManager.Snapshot s) {
        notifyListeners("callState", snapshot(s));
    }

    @Override
    public void onCallEnded(CallManager.Ended e) {
        notifyListeners("callEnded", ended(e), true);
    }

    // ================================================================ chuyển đổi JSON

    private static JSObject contact(Phone.Contact c) {
        JSObject o = new JSObject();
        o.put("id", String.valueOf(c.id));
        o.put("lookupKey", c.lookupKey);
        o.put("name", c.name);
        o.put("photoUri", c.photoUri);
        o.put("starred", c.starred);
        JSArray nums = new JSArray();
        for (Phone.ContactNumber n : c.numbers) {
            nums.put(new JSObject().put("raw", n.raw).put("e164", n.e164).put("label", n.label));
        }
        o.put("numbers", nums);
        return o;
    }

    private static JSObject mark(Repo.Mark m) {
        JSObject o = new JSObject();
        o.put("number", Numbers.toE164(m.number));
        o.put("trusted", m.trusted);
        o.put("category", Codes.categoryName(m.category));
        o.put("name", m.name);
        o.put("note", m.note);
        o.put("updatedAt", m.updatedAt);
        return o;
    }

    private static JSObject meta(Repo.Meta m) {
        JSObject o = new JSObject();
        o.put("risk", Codes.RISK[m.risk]);
        o.put("reasons", m.reasons);
        o.put("action", Codes.ACTION[m.action]);
        if (m.ruleId != null) o.put("ruleId", String.valueOf(m.ruleId));
        return o;
    }

    private static JSObject rule(Repo.Rule r) {
        JSObject o = new JSObject();
        o.put("id", String.valueOf(r.id));
        o.put("kind", Codes.KIND[r.kind]);
        o.put("value", r.value);
        o.put("label", r.label);
        o.put("enabled", r.enabled);
        o.put("hitCount", r.hitCount);
        if (r.lastHitAt != null) o.put("lastHitAt", r.lastHitAt);
        o.put("createdAt", r.createdAt);
        return o;
    }

    private static JSObject decision(CallDecider.Decision d) {
        JSObject o = new JSObject();
        o.put("number", Numbers.toE164(d.number));
        o.put("action", Codes.ACTION[d.action]);
        o.put("risk", Codes.RISK[d.risk]);
        o.put("reasons", d.reasons);
        if (d.ruleId != null) o.put("ruleId", String.valueOf(d.ruleId));
        o.put("ruleLabel", d.ruleLabel);
        o.put("category", Codes.categoryName(d.category));
        o.put("isContact", d.isContact);
        o.put("trusted", d.trusted);
        o.put("systemBlocked", d.systemBlocked);
        o.put("name", d.name);
        JSArray steps = new JSArray();
        for (CallDecider.Step s : d.steps) steps.put(new JSObject().put("id", s.id).put("state", s.state).put("detail", s.detail));
        o.put("steps", steps);
        return o;
    }

    private static JSObject snapshot(CallManager.Snapshot s) {
        JSObject o = new JSObject();
        o.put("state", s.state);
        o.put("incoming", s.incoming);
        o.put("number", Numbers.toE164(s.number));
        o.put("name", s.name);
        o.put("muted", s.muted);
        o.put("speaker", s.speaker);
        o.put("holding", s.holding);
        o.put("others", s.others);
        o.put("startAt", s.startAt);
        if (s.activeAt > 0) o.put("activeAt", s.activeAt);
        if (s.decision != null) o.put("decision", decision(s.decision));
        return o;
    }

    private static JSObject ended(CallManager.Ended e) {
        JSObject o = new JSObject();
        o.put("number", Numbers.toE164(e.number));
        o.put("name", e.name);
        o.put("type", e.type);
        o.put("startedAt", e.startAt);
        o.put("durationSec", e.durationSec);
        if (e.decision != null) o.put("decision", decision(e.decision));
        return o;
    }

    private static List<Long> longs(JSArray arr) {
        List<Long> out = new ArrayList<>();
        if (arr == null) return out;
        for (int i = 0; i < arr.length(); i++) {
            try {
                out.add(Long.parseLong(arr.getString(i)));
            } catch (JSONException | NumberFormatException ignored) {
            }
        }
        return out;
    }
}
