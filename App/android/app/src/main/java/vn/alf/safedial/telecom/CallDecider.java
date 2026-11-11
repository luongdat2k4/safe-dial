package vn.alf.safedial.telecom;

import android.content.Context;

import java.util.ArrayList;
import java.util.List;

import vn.alf.safedial.data.Codes;
import vn.alf.safedial.data.Numbers;
import vn.alf.safedial.data.Phone;
import vn.alf.safedial.data.Prefs;
import vn.alf.safedial.data.Repo;

/**
 * Quyết định chặn / cảnh báo cho một cuộc gọi đến (schema mục 4). Dùng chung cho
 * CallScreeningService và màn "Kiểm tra một số" (dry-run qua plugin).
 */
public final class CallDecider {

    public static final class Step {
        public final String id, state, detail;

        Step(String id, String state, String detail) {
            this.id = id;
            this.state = state;
            this.detail = detail;
        }
    }

    public static final class Decision {
        public long number;
        public int action = Codes.ACT_ALLOWED;
        public int risk = Codes.RISK_UNKNOWN;
        public int reasons;
        public Long ruleId;
        public String ruleLabel;
        public int category;
        public boolean isContact, trusted, systemBlocked;
        public String name;
        public final List<Step> steps = new ArrayList<>();

        public boolean blocks() {
            return action == Codes.ACT_BLOCKED || action == Codes.ACT_SILENCED;
        }
    }

    private final Context ctx;
    private final Prefs prefs;
    private final Repo repo;
    private final Phone phone;

    public CallDecider(Context ctx) {
        this.ctx = ctx.getApplicationContext();
        this.prefs = Prefs.get(ctx);
        this.repo = new Repo(ctx);
        this.phone = new Phone(ctx);
    }

    public Decision decide(long key) {
        Decision d = new Decision();
        d.number = key;
        String home = prefs.homeDial();
        int onBlock = prefs.blockSilent() ? Codes.ACT_SILENCED : Codes.ACT_BLOCKED;

        Repo.Mark mark = key != 0 ? repo.mark(key) : null;
        if (mark != null) {
            d.category = mark.category;
            d.trusted = mark.trusted;
            d.name = mark.name;
        }

        // (—) Danh sách chặn của hệ thống
        if (phone.isBlocked(key)) {
            d.systemBlocked = true;
            d.steps.add(new Step("system", "match", null));
            return finish(d, Codes.ACT_BLOCKED, mark != null && mark.category > 0 ? Codes.riskOfCategory(mark.category) : Codes.RISK_SPAM, Codes.R_BLACKLIST);
        }
        d.steps.add(new Step("system", "pass", null));

        // (1) Số tin cậy
        if (mark != null && mark.trusted) {
            d.steps.add(new Step("trusted", "match", null));
            return finish(d, Codes.ACT_ALLOWED, Codes.RISK_SAFE, 0);
        }
        d.steps.add(new Step("trusted", "pass", null));

        // (2) Danh bạ
        Phone.Contact contact = phone.lookup(key);
        if (contact != null) {
            d.isContact = true;
            d.name = contact.name;
            d.steps.add(new Step("contact", "match", contact.name));
            return finish(d, Codes.ACT_ALLOWED, Codes.RISK_SAFE, 0);
        }
        d.steps.add(new Step("contact", "pass", null));

        // (3) Quy tắc mẫu
        if (key != 0) {
            for (Repo.Rule r : repo.enabledRulesCached()) {
                if (matches(r, key, home)) {
                    d.ruleId = r.id;
                    d.ruleLabel = r.label != null ? r.label : r.value;
                    d.steps.add(new Step("rule", "match", d.ruleLabel));
                    return finish(d, onBlock, Codes.RISK_SPAM, r.kind == Codes.K_COUNTRY ? Codes.R_COUNTRY : Codes.R_RULE);
                }
            }
        }
        d.steps.add(new Step("rule", "pass", null));

        // (4) Số ẩn
        boolean hidden = key == 0;
        if (hidden && prefs.blockPrivate()) {
            d.steps.add(new Step("private", "match", null));
            return finish(d, onBlock, Codes.RISK_UNKNOWN, Codes.R_PRIVATE | Codes.R_NON_CONTACT);
        }
        d.steps.add(new Step("private", prefs.blockPrivate() ? "pass" : "off", null));

        // (5) Quốc tế
        boolean intl = Numbers.isInternational(key, home);
        if (intl && prefs.blockInternational()) {
            d.steps.add(new Step("international", "match", null));
            return finish(d, onBlock, Codes.RISK_UNKNOWN, Codes.R_INTERNATIONAL | Codes.R_NON_CONTACT);
        }
        d.steps.add(new Step("international", prefs.blockInternational() ? "pass" : "off", null));

        // (6) Số lạ
        if (prefs.blockNonContacts()) {
            d.steps.add(new Step("nonContact", "match", null));
            return finish(d, onBlock, Codes.RISK_UNKNOWN, Codes.R_NON_CONTACT);
        }
        d.steps.add(new Step("nonContact", "off", null));

        // (7) Số lạ không bị chặn: dấu hiệu cảnh báo
        int reasons = Codes.R_NON_CONTACT;
        if (intl && prefs.warnInternational()) reasons |= Codes.R_INTERNATIONAL;
        if (hidden && prefs.warnPrivate()) reasons |= Codes.R_PRIVATE;
        if (key != 0) {
            long since = System.currentTimeMillis() - prefs.burstWindowMin() * 60_000L;
            if (phone.countCallsFrom(key, since) + 1 >= prefs.burstCount()) reasons |= Codes.R_BURST;
            if (repo.wasRejectedBefore(key)) reasons |= Codes.R_REJECTED_BEFORE;
        }
        int risk = mark != null && mark.category > 0 ? Codes.riskOfCategory(mark.category) : Codes.RISK_UNKNOWN;
        boolean warn = (reasons & ~Codes.R_NON_CONTACT) != 0 || risk >= Codes.RISK_SPAM;
        d.steps.add(new Step("signals", warn ? "match" : "pass", null));
        return finish(d, warn ? Codes.ACT_WARNED : Codes.ACT_ALLOWED, risk, reasons);
    }

    private static Decision finish(Decision d, int action, int risk, int reasons) {
        d.action = action;
        d.risk = risk;
        d.reasons = reasons;
        return d;
    }

    /** So khớp trên dạng trong nước (0899…) và dạng quốc tế không '+' (84899…). */
    public static boolean matches(Repo.Rule r, long key, String homeDial) {
        if (key == 0 || r.value == null || r.value.isEmpty()) return false;
        String digits = String.valueOf(key);
        String national = Numbers.nationalForm(key, homeDial);
        String v = r.value.replace("+", "");
        switch (r.kind) {
            case Codes.K_STARTS:
                return digits.startsWith(v) || national.startsWith(v);
            case Codes.K_COUNTRY:
                return digits.startsWith(v);
            case Codes.K_CONTAINS:
                return digits.contains(v) || national.contains(v);
            case Codes.K_ENDS:
                return digits.endsWith(v);
            default:
                return false;
        }
    }
}
