package vn.alf.safedial.data;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

/**
 * SQLite dùng chung giữa plugin (WebView) và các service native (screening, in-call).
 * Schema: design-note/schema-design.md, mục 2.
 */
public final class Db extends SQLiteOpenHelper {

    public static final String NAME = "safedial.db";
    public static final int VERSION = 1;

    private static volatile Db instance;

    public static Db get(Context ctx) {
        if (instance == null) {
            synchronized (Db.class) {
                if (instance == null) instance = new Db(ctx.getApplicationContext());
            }
        }
        return instance;
    }

    private Db(Context ctx) {
        super(ctx, NAME, null, VERSION);
        setWriteAheadLoggingEnabled(true);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(
            "CREATE TABLE call_meta (" +
            "  call_id INTEGER PRIMARY KEY," + // CallLog._ID; số âm = chưa ghép (−at)
            "  number  INTEGER NOT NULL," +
            "  at      INTEGER NOT NULL," +
            "  risk    INTEGER NOT NULL," +
            "  reasons INTEGER NOT NULL," +
            "  action  INTEGER NOT NULL," +
            "  rule_id INTEGER)"
        );
        db.execSQL("CREATE INDEX idx_call_meta_number ON call_meta(number)");
        db.execSQL("CREATE INDEX idx_call_meta_at ON call_meta(at)");

        db.execSQL(
            "CREATE TABLE call_stats_daily (" +
            "  day INTEGER NOT NULL, number INTEGER NOT NULL," +
            "  incoming INTEGER NOT NULL DEFAULT 0, missed INTEGER NOT NULL DEFAULT 0," +
            "  rejected INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0," +
            "  outgoing INTEGER NOT NULL DEFAULT 0, answered_out INTEGER NOT NULL DEFAULT 0," +
            "  talk_in_sec INTEGER NOT NULL DEFAULT 0, talk_out_sec INTEGER NOT NULL DEFAULT 0," +
            "  risk_unknown INTEGER NOT NULL DEFAULT 0, risk_spam INTEGER NOT NULL DEFAULT 0," +
            "  risk_scam INTEGER NOT NULL DEFAULT 0, warned INTEGER NOT NULL DEFAULT 0," +
            "  PRIMARY KEY (day, number)) WITHOUT ROWID"
        );

        db.execSQL(
            "CREATE TABLE number_marks (" +
            "  number INTEGER PRIMARY KEY," +
            "  trusted INTEGER NOT NULL DEFAULT 0," +
            "  category INTEGER, name TEXT, note TEXT," +
            "  updated_at INTEGER NOT NULL) WITHOUT ROWID"
        );

        db.execSQL(
            "CREATE TABLE block_rules (" +
            "  id INTEGER PRIMARY KEY," +
            "  kind INTEGER NOT NULL, value TEXT NOT NULL, label TEXT," +
            "  enabled INTEGER NOT NULL DEFAULT 1," +
            "  hit_count INTEGER NOT NULL DEFAULT 0, last_hit_at INTEGER," +
            "  created_at INTEGER NOT NULL)"
        );
        db.execSQL("CREATE UNIQUE INDEX idx_block_rules_kind_value ON block_rules(kind, value)");

        db.execSQL(
            "CREATE TABLE call_notes (" +
            "  id INTEGER PRIMARY KEY," +
            "  number INTEGER NOT NULL, at INTEGER NOT NULL, note TEXT NOT NULL)"
        );
        db.execSQL("CREATE INDEX idx_call_notes_number ON call_notes(number, at)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Chưa có migration: bản đầu tiên.
    }
}
