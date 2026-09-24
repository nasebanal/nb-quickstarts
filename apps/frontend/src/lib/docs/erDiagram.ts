import type { Locale } from "@/lib/i18n";

// The MySQL schema (database demo), as the Overview page's ER diagram.
// Column names/types mirror what `DESCRIBE accounts` / `DESCRIBE users`
// print (app/models.py is the source) - keep this in step when a model changes.
export interface ErColumn {
  name: string;
  type: string;
  keys?: ("PK" | "UQ")[];
  nullable?: boolean;
  note: Record<Locale, string>;
}

export interface ErEntity {
  name: string;
  summary: Record<Locale, string>;
  columns: ErColumn[];
}

export const ER_ENTITIES: ErEntity[] = [
  {
    name: "accounts",
    summary: {
      en: "The ledger: one row per transaction (event)",
      ja: "台帳: 取引(イベント)1件につき1行",
    },
    columns: [
      { name: "id", type: "INT", keys: ["PK"], note: { en: "auto-increment", ja: "自動採番" } },
      { name: "name", type: "VARCHAR(128)", note: { en: "account name, e.g. Cash", ja: "勘定科目名(例: Cash)" } },
      {
        name: "quantity",
        type: "INT",
        note: { en: "signed amount of this event - a delta, not a balance", ja: "このイベントの増減額(残高ではなく差分)" },
      },
      { name: "source", type: "VARCHAR(16)", note: { en: "where it came from: seed or api", ja: "発生元: seed または api" } },
      { name: "created_at", type: "DATETIME", note: { en: "when it was recorded", ja: "記録日時" } },
    ],
  },
  {
    name: "users",
    summary: {
      en: "Who can log in, and their profile",
      ja: "ログインできる人と、そのプロフィール",
    },
    columns: [
      { name: "id", type: "INT", keys: ["PK"], note: { en: "auto-increment", ja: "自動採番" } },
      {
        name: "username",
        type: "VARCHAR(64)",
        keys: ["UQ"],
        note: { en: "login name (demo) or the Keycloak username", ja: "ログイン名(demo)、またはKeycloakのユーザー名" },
      },
      {
        name: "password_hash",
        type: "VARCHAR(255)",
        nullable: true,
        note: { en: "PBKDF2 hash; NULL for Keycloak users", ja: "PBKDF2ハッシュ。Keycloakのユーザーは NULL" },
      },
      {
        name: "email",
        type: "VARCHAR(255)",
        nullable: true,
        note: {
          en: "recorded, not editable (seed data / mirrored from Keycloak)",
          ja: "記録のみで編集不可(シードデータ、またはKeycloakから反映)",
        },
      },
      {
        name: "display_name",
        type: "VARCHAR(64)",
        nullable: true,
        note: { en: "shown in the header; edited on the profile page", ja: "ヘッダーに表示。プロフィール画面で編集" },
      },
      { name: "language", type: "VARCHAR(8)", note: { en: "ja or en; applied at login", ja: "ja または en。ログイン時に反映" } },
      { name: "provider", type: "VARCHAR(16)", note: { en: "demo or keycloak", ja: "demo または keycloak" } },
      { name: "created_at", type: "DATETIME", note: { en: "created (seed, or first Keycloak login)", ja: "作成日時(シード、または初回のKeycloakログイン)" } },
      { name: "updated_at", type: "DATETIME", note: { en: "last profile change", ja: "プロフィールの最終更新" } },
    ],
  },
];

export const ER_TEXT: Record<Locale, { caption: string; columns: [string, string, string]; legend: string; label: string }> = {
  en: {
    caption:
      "The MySQL schema (database demo). No foreign key between the two on purpose: an accounts row " +
      "is a ledger entry (a name's balance is the sum of its rows), not something a user owns; users " +
      "holds who can log in - seeded with the demo user, plus a row created on first login for each Keycloak user.",
    columns: ["Column", "Type", "Note"],
    legend: "PK primary key - UQ unique - NULL may be empty",
    label: "MySQL ER diagram",
  },
  ja: {
    caption:
      "MySQLのスキーマ(データベースdemo)です。2つのテーブルの間に外部キーはありません — これは意図的で、" +
      "accountsの行は台帳のエントリ(科目の残高はその行の合計)であり、ユーザーが所有するものではありません。" +
      "usersはログインできる人を持ち、demoユーザーがシードされ、Keycloakのユーザーは初回ログイン時に行が作られます。",
    columns: ["カラム", "型", "説明"],
    legend: "PK 主キー - UQ 一意 - NULL 空を許可",
    label: "MySQLのER図",
  },
};
