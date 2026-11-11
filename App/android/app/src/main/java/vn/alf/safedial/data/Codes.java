package vn.alf.safedial.data;

/** Bảng mã số nguyên dùng trong DB (schema mục 2.1, 2.3, 2.4). */
public final class Codes {
    private Codes() {}

    // risk
    public static final int RISK_SAFE = 0, RISK_UNKNOWN = 1, RISK_SPAM = 2, RISK_SCAM = 3;
    // action
    public static final int ACT_ALLOWED = 0, ACT_WARNED = 1, ACT_SILENCED = 2, ACT_BLOCKED = 3;
    // reasons (bitmask)
    public static final int R_BLACKLIST = 1, R_RULE = 2, R_PRIVATE = 4, R_INTERNATIONAL = 8,
        R_NON_CONTACT = 16, R_BURST = 32, R_REJECTED_BEFORE = 64, R_COUNTRY = 128;
    // block_rules.kind
    public static final int K_STARTS = 1, K_CONTAINS = 2, K_ENDS = 3, K_COUNTRY = 4;

    public static final String[] RISK = { "safe", "unknown", "spam", "scam" };
    public static final String[] ACTION = { "allowed", "warned", "silenced", "blocked" };
    public static final String[] CATEGORY = { null, "scam", "spam", "loan", "robocall", "fakeJob", "telemarketing", "impersonation" };
    public static final String[] KIND = { null, "startsWith", "contains", "endsWith", "country" };

    public static int categoryCode(String name) {
        if (name == null) return 0;
        for (int i = 1; i < CATEGORY.length; i++) if (name.equals(CATEGORY[i])) return i;
        return 0;
    }

    public static String categoryName(int code) {
        return code > 0 && code < CATEGORY.length ? CATEGORY[code] : null;
    }

    public static int kindCode(String name) {
        for (int i = 1; i < KIND.length; i++) if (KIND[i].equals(name)) return i;
        return 0;
    }

    /** Loại lừa đảo → mức rủi ro hiển thị. */
    public static int riskOfCategory(int category) {
        if (category == 1 || category == 5 || category == 7) return RISK_SCAM;
        return category > 0 ? RISK_SPAM : RISK_UNKNOWN;
    }
}
