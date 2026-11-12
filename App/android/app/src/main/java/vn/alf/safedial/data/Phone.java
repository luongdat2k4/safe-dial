package vn.alf.safedial.data;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.BlockedNumberContract;
import android.provider.CallLog;
import android.provider.ContactsContract;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.text.TextUtils;

import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Dữ liệu Android sở hữu: danh bạ, nhật ký cuộc gọi, danh sách chặn, SIM. */
public final class Phone {

    private final Context ctx;
    private final ContentResolver cr;

    public Phone(Context ctx) {
        this.ctx = ctx.getApplicationContext();
        this.cr = this.ctx.getContentResolver();
    }

    public boolean has(String permission) {
        return ContextCompat.checkSelfPermission(ctx, permission) == PackageManager.PERMISSION_GRANTED;
    }

    // ---------------------------------------------------------------- Danh bạ

    public static final class ContactNumber {
        public String raw, e164, label;
    }

    public static final class Contact {
        public long id;
        public String lookupKey, name, photoUri;
        public boolean starred;
        public final List<ContactNumber> numbers = new ArrayList<>();
    }

    /** Toàn bộ liên hệ có số điện thoại, sắp theo tên. `query` lọc theo tên/số (dùng bộ lọc của Android). */
    public List<Contact> contacts(String query) {
        if (!has(Manifest.permission.READ_CONTACTS)) return new ArrayList<>();
        Uri uri = TextUtils.isEmpty(query)
            ? ContactsContract.CommonDataKinds.Phone.CONTENT_URI
            : Uri.withAppendedPath(ContactsContract.CommonDataKinds.Phone.CONTENT_FILTER_URI, Uri.encode(query));
        String[] proj = {
            ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
            ContactsContract.CommonDataKinds.Phone.LOOKUP_KEY,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME_PRIMARY,
            ContactsContract.CommonDataKinds.Phone.PHOTO_THUMBNAIL_URI,
            ContactsContract.CommonDataKinds.Phone.STARRED,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.NORMALIZED_NUMBER,
            ContactsContract.CommonDataKinds.Phone.TYPE,
            ContactsContract.CommonDataKinds.Phone.LABEL,
        };
        Map<Long, Contact> byId = new LinkedHashMap<>();
        try (Cursor c = cr.query(uri, proj, null, null, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME_PRIMARY + " COLLATE LOCALIZED ASC")) {
            if (c == null) return new ArrayList<>();
            while (c.moveToNext()) {
                long id = c.getLong(0);
                Contact ct = byId.get(id);
                if (ct == null) {
                    ct = new Contact();
                    ct.id = id;
                    ct.lookupKey = c.getString(1);
                    ct.name = c.getString(2);
                    ct.photoUri = c.getString(3);
                    ct.starred = c.getInt(4) == 1;
                    byId.put(id, ct);
                }
                String raw = c.getString(5);
                String norm = c.getString(6);
                long key = norm != null ? Numbers.fromE164(norm) : Numbers.toKey(ctx, raw);
                if (key == 0) key = Numbers.toKey(ctx, raw);
                String e164 = Numbers.toE164(key);
                boolean dup = false;
                for (ContactNumber n : ct.numbers) if (n.e164.equals(e164)) dup = true;
                if (dup || key == 0) continue;
                ContactNumber n = new ContactNumber();
                n.raw = raw;
                n.e164 = e164;
                n.label = ContactsContract.CommonDataKinds.Phone.getTypeLabel(ctx.getResources(), c.getInt(7), c.getString(8)).toString();
                ct.numbers.add(n);
            }
        }
        return new ArrayList<>(byId.values());
    }

    public boolean setStarred(long contactId, boolean starred) {
        if (!has(Manifest.permission.WRITE_CONTACTS)) return false;
        ContentValues v = new ContentValues();
        v.put(ContactsContract.Contacts.STARRED, starred ? 1 : 0);
        if (contactId <= 0) return false;
        Uri uri = ContentUris.withAppendedId(ContactsContract.Contacts.CONTENT_URI, contactId);
        return cr.update(uri, v, null, null) > 0;
    }

    /** Tra tên theo số (PhoneLookup, Android tự đánh index). Null nếu không có trong danh bạ. */
    public Contact lookup(long key) {
        if (key == 0 || !has(Manifest.permission.READ_CONTACTS)) return null;
        Uri uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(Numbers.toE164(key)));
        String[] proj = {
            ContactsContract.PhoneLookup._ID,
            ContactsContract.PhoneLookup.LOOKUP_KEY,
            ContactsContract.PhoneLookup.DISPLAY_NAME,
            ContactsContract.PhoneLookup.PHOTO_THUMBNAIL_URI,
            ContactsContract.PhoneLookup.STARRED,
        };
        try (Cursor c = cr.query(uri, proj, null, null, null)) {
            if (c == null || !c.moveToFirst()) return null;
            Contact ct = new Contact();
            ct.id = c.getLong(0);
            ct.lookupKey = c.getString(1);
            ct.name = c.getString(2);
            ct.photoUri = c.getString(3);
            ct.starred = c.getInt(4) == 1;
            return ct;
        } catch (Exception e) {
            return null;
        }
    }

    // ---------------------------------------------------------------- Nhật ký cuộc gọi

    public static final class Call {
        public long id, key, date;
        public String raw, cachedName, accountId;
        public int type, duration;
    }

    private static final String[] CALL_PROJ = {
        CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.CACHED_NORMALIZED_NUMBER,
        CallLog.Calls.CACHED_NAME, CallLog.Calls.TYPE, CallLog.Calls.DATE, CallLog.Calls.DURATION,
        CallLog.Calls.PHONE_ACCOUNT_ID,
    };

    /** Cuộc gọi mới nhất trước; `key` khác 0 thì chỉ lấy của số đó. */
    public List<Call> calls(int limit, int offset, long key, long sinceMs) {
        List<Call> out = new ArrayList<>();
        if (!has(Manifest.permission.READ_CALL_LOG)) return out;
        StringBuilder sel = new StringBuilder();
        List<String> args = new ArrayList<>();
        if (sinceMs > 0) {
            sel.append(CallLog.Calls.DATE).append(" >= ?");
            args.add(String.valueOf(sinceMs));
        }
        Uri uri = CallLog.Calls.CONTENT_URI.buildUpon()
            .appendQueryParameter(CallLog.Calls.LIMIT_PARAM_KEY, String.valueOf(key != 0 ? 1000 : limit + offset))
            .build();
        try (Cursor c = cr.query(uri, CALL_PROJ, sel.length() > 0 ? sel.toString() : null, args.toArray(new String[0]),
            CallLog.Calls.DATE + " DESC")) {
            if (c == null) return out;
            int skipped = 0;
            while (c.moveToNext()) {
                Call call = readCall(c);
                if (key != 0 && call.key != key) continue;
                if (skipped < offset) {
                    skipped++;
                    continue;
                }
                out.add(call);
                if (out.size() >= limit) break;
            }
        }
        return out;
    }

    public Call callById(long id) {
        if (!has(Manifest.permission.READ_CALL_LOG)) return null;
        try (Cursor c = cr.query(CallLog.Calls.CONTENT_URI, CALL_PROJ, CallLog.Calls._ID + " = ?", new String[] { String.valueOf(id) }, null)) {
            return c != null && c.moveToFirst() ? readCall(c) : null;
        }
    }

    public List<Long> allCallIds() {
        List<Long> out = new ArrayList<>();
        if (!has(Manifest.permission.READ_CALL_LOG)) return out;
        try (Cursor c = cr.query(CallLog.Calls.CONTENT_URI, new String[] { CallLog.Calls._ID }, null, null, null)) {
            if (c != null) while (c.moveToNext()) out.add(c.getLong(0));
        }
        return out;
    }

    /** Số cuộc gọi đến từ `key` kể từ `sinceMs` (dấu hiệu gọi dồn dập). */
    public int countCallsFrom(long key, long sinceMs) {
        int n = 0;
        for (Call c : calls(200, 0, 0, sinceMs)) if (c.key == key && c.type != CallLog.Calls.OUTGOING_TYPE) n++;
        return n;
    }

    public int deleteCalls(Collection<Long> ids) {
        if (!has(Manifest.permission.WRITE_CALL_LOG) || ids.isEmpty()) return 0;
        StringBuilder in = new StringBuilder();
        for (Long id : ids) {
            if (in.length() > 0) in.append(',');
            in.append(id);
        }
        return cr.delete(CallLog.Calls.CONTENT_URI, CallLog.Calls._ID + " IN (" + in + ")", null);
    }

    public int deleteCallsOf(long key) {
        List<Long> ids = new ArrayList<>();
        for (Call c : calls(1000, 0, key, 0)) ids.add(c.id);
        return deleteCalls(ids);
    }

    public int clearCalls() {
        if (!has(Manifest.permission.WRITE_CALL_LOG)) return 0;
        return cr.delete(CallLog.Calls.CONTENT_URI, null, null);
    }

    private Call readCall(Cursor c) {
        Call call = new Call();
        call.id = c.getLong(0);
        call.raw = c.getString(1);
        String norm = c.getString(2);
        call.key = !TextUtils.isEmpty(norm) ? Numbers.fromE164(norm) : 0;
        if (call.key == 0) call.key = Numbers.toKey(ctx, call.raw);
        call.cachedName = c.getString(3);
        call.type = c.getInt(4);
        call.date = c.getLong(5);
        call.duration = c.getInt(6);
        call.accountId = c.getString(7);
        return call;
    }

    // ---------------------------------------------------------------- Danh sách chặn hệ thống

    public boolean canBlock() {
        try {
            return BlockedNumberContract.canCurrentUserBlockNumbers(ctx);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isBlocked(long key) {
        if (key == 0 || !canBlock()) return false;
        try {
            return BlockedNumberContract.isBlocked(ctx, Numbers.toE164(key));
        } catch (Exception e) {
            return false;
        }
    }

    public boolean block(long key) {
        if (key == 0 || !canBlock()) return false;
        if (isBlocked(key)) return true;
        ContentValues v = new ContentValues();
        v.put(BlockedNumberContract.BlockedNumbers.COLUMN_ORIGINAL_NUMBER, Numbers.toE164(key));
        try {
            return cr.insert(BlockedNumberContract.BlockedNumbers.CONTENT_URI, v) != null;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean unblock(long key) {
        if (key == 0 || !canBlock()) return false;
        try {
            return BlockedNumberContract.unblock(ctx, Numbers.toE164(key)) > 0;
        } catch (Exception e) {
            return false;
        }
    }

    public List<Long> blockedNumbers() {
        List<Long> out = new ArrayList<>();
        if (!canBlock()) return out;
        String[] proj = { BlockedNumberContract.BlockedNumbers.COLUMN_ORIGINAL_NUMBER, BlockedNumberContract.BlockedNumbers.COLUMN_E164_NUMBER };
        try (Cursor c = cr.query(BlockedNumberContract.BlockedNumbers.CONTENT_URI, proj, null, null, null)) {
            if (c == null) return out;
            while (c.moveToNext()) {
                String e164 = c.getString(1);
                long key = !TextUtils.isEmpty(e164) ? Numbers.fromE164(e164) : Numbers.toKey(ctx, c.getString(0));
                if (key != 0) out.add(key);
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    // ---------------------------------------------------------------- SIM

    public static final class Sim {
        public String id, label;
        public int slot;
    }

    public List<Sim> sims() {
        List<Sim> out = new ArrayList<>();
        if (!has(Manifest.permission.READ_PHONE_STATE)) return out;
        TelecomManager tm = (TelecomManager) ctx.getSystemService(Context.TELECOM_SERVICE);
        if (tm == null) return out;
        try {
            int slot = 1;
            for (PhoneAccountHandle h : tm.getCallCapablePhoneAccounts()) {
                PhoneAccount a = tm.getPhoneAccount(h);
                Sim s = new Sim();
                s.id = h.getId();
                s.label = a != null && a.getLabel() != null ? a.getLabel().toString() : "SIM " + slot;
                s.slot = slot++;
                out.add(s);
            }
        } catch (SecurityException ignored) {
        }
        return out;
    }

    public PhoneAccountHandle simHandle(String id) {
        if (id == null) return null;
        TelecomManager tm = (TelecomManager) ctx.getSystemService(Context.TELECOM_SERVICE);
        try {
            for (PhoneAccountHandle h : tm.getCallCapablePhoneAccounts()) if (id.equals(h.getId())) return h;
        } catch (SecurityException ignored) {
        }
        return null;
    }
}
