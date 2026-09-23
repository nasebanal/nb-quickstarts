import type { LocalizedDocsPage } from "./types";

export const scenarioVault: LocalizedDocsPage = {
  en: {
    title: "Scenario 5: Use Vault",
    description:
      "app/config.py builds the backend's database connection string from MYSQL_USER/MYSQL_PASSWORD - " +
      "normally plain env vars from .env. This scenario has the backend fetch that same credential " +
      "from Vault's KV v2 store at startup instead, and proves it actually did.",
    sections: [
      {
        heading: "1. Start Vault and hand the real backend its credential from there",
        code: [{ code: "make apps:up\nmake vault:up\nmake vault:verify-apps" }],
        body: [
          "vault:verify-apps writes apps' current MySQL credential into Vault (secret/apps/mysql), " +
            "recreates the real backend container with VAULT_ADDR/VAULT_TOKEN pointed at it - just for " +
            "that one recreate, .env itself is untouched - and then proves the credential actually came " +
            "from Vault two ways.",
        ],
      },
      {
        heading: "What verify-apps proves",
        bullets: [
          "A [vault] loaded MySQL credentials from http://vault:8200/... line in docker logs nb-backend.",
          "A real GET /accounts/balances query against the connection opened with it - an actual " +
            "MySQL round-trip, not just \"the container started\".",
        ],
        terminal: {
          lines: [
            { text: "$ make vault:verify-apps", tone: "muted" },
            { text: "Writing apps' MySQL credential into Vault (secret/apps/mysql)..." },
            { text: "Written. Check with: make vault:get-mysql-secret" },
            { text: "" },
            { text: "Recreating apps/backend with VAULT_ADDR/VAULT_TOKEN set..." },
            { text: " Container nb-backend Recreated" },
            { text: " Container nb-backend Started" },
            { text: "" },
            { text: "Checking apps/backend's own startup log for proof it actually loaded the credential from Vault..." },
            { text: "[vault] loaded MySQL credentials from http://vault:8200/v1/secret/data/apps/mysql", tone: "success" },
            { text: "" },
            { text: "Proving the connection it opened with that credential actually works..." },
            { text: '[{"name":"Cash","balance":120000,"eventCount":3}, ...]', tone: "success" },
          ],
        },
      },
      {
        heading: "Read the secret back directly",
        code: [{ code: "make vault:get-mysql-secret" }],
      },
      {
        heading: "Why this credential, not a different one",
        body: [
          "The value written to Vault is deliberately the same credential apps' MySQL already accepts " +
            "(from LOCUST_MYSQL_USER/LOCUST_MYSQL_PASSWORD, what apps/docker-compose.yml itself uses). " +
            "This scenario is about proving the real backend genuinely sources it from Vault at " +
            "startup, not about handing out a different, unusable one - the MySQL server's own " +
            "credential never changes.",
        ],
      },
      {
        heading: "Returning to env-var-only",
        code: [{ code: "make apps:restart" }],
        note:
          "This alone returns the backend to reading MYSQL_PASSWORD from .env directly - " +
          "VAULT_ADDR/VAULT_TOKEN only ever applied to the one --force-recreate verify-apps did, never " +
          "to .env itself.",
      },
      {
        heading: "Cleanup",
        code: [{ code: "make vault:down" }],
        note:
          "Vault's dev server is in-memory only - everything written to it is gone on vault:down / " +
          "vault:restart, by design.",
      },
    ],
  },
  ja: {
    title: "シナリオ5: Vaultの利用",
    description:
      "app/config.pyは、backendのデータベース接続文字列をMYSQL_USER/MYSQL_PASSWORDから組み立てています" +
      " — 通常は.envの素の環境変数です。このシナリオでは、backendが起動時に同じ認証情報をVaultのKV v2" +
      "ストアから取得するようにし、実際にそうなっていることを確認します。",
    sections: [
      {
        heading: "1. Vaultを起動し、実際のbackendに認証情報をそこから渡す",
        code: [{ code: "make apps:up\nmake vault:up\nmake vault:verify-apps" }],
        body: [
          "vault:verify-appsは、appsの現在のMySQL認証情報をVault(secret/apps/mysql)に書き込み、実際の" +
            "backendコンテナをVAULT_ADDR/VAULT_TOKENを設定した状態で再作成します — この1回の再作成だけに" +
            "適用され、.env自体は変更されません — そのうえで、認証情報が実際にVaultから来たことを2通りの" +
            "方法で証明します。",
        ],
      },
      {
        heading: "verify-appsが証明すること",
        bullets: [
          "docker logs nb-backendに現れる[vault] loaded MySQL credentials from http://vault:8200/...の行。",
          "その接続で実際に発行されるGET /accounts/balancesクエリ — 「コンテナが起動した」だけでなく、" +
            "本物のMySQLとの往復。",
        ],
        terminal: {
          lines: [
            { text: "$ make vault:verify-apps", tone: "muted" },
            { text: "Writing apps' MySQL credential into Vault (secret/apps/mysql)..." },
            { text: "Written. Check with: make vault:get-mysql-secret" },
            { text: "" },
            { text: "Recreating apps/backend with VAULT_ADDR/VAULT_TOKEN set..." },
            { text: " Container nb-backend Recreated" },
            { text: " Container nb-backend Started" },
            { text: "" },
            { text: "Checking apps/backend's own startup log for proof it actually loaded the credential from Vault..." },
            { text: "[vault] loaded MySQL credentials from http://vault:8200/v1/secret/data/apps/mysql", tone: "success" },
            { text: "" },
            { text: "Proving the connection it opened with that credential actually works..." },
            { text: '[{"name":"Cash","balance":120000,"eventCount":3}, ...]', tone: "success" },
          ],
        },
      },
      {
        heading: "シークレットを直接読み返す",
        code: [{ code: "make vault:get-mysql-secret" }],
      },
      {
        heading: "なぜこの認証情報なのか",
        body: [
          "Vaultに書き込む値は、意図的にappsのMySQLが既に受け入れている認証情報と同じもの" +
            "(LOCUST_MYSQL_USER/LOCUST_MYSQL_PASSWORD、apps/docker-compose.yml自身が使っている値)です。" +
            "このシナリオの目的は、実際のbackendが起動時に本当にVaultからそれを取得しているかを証明する" +
            "ことであり、別の使えない値を配ることではありません — MySQLサーバー自身の認証情報は変わり" +
            "ません。",
        ],
      },
      {
        heading: "env変数のみに戻す",
        code: [{ code: "make apps:restart" }],
        note:
          "これだけで、backendは.envのMYSQL_PASSWORDを直接読む状態に戻ります — " +
          "VAULT_ADDR/VAULT_TOKENはvault:verify-appsが行ったその1回の--force-recreateにしか適用されて" +
          "おらず、.env自体には反映されていません。",
      },
      {
        heading: "片付け",
        code: [{ code: "make vault:down" }],
        note:
          "Vaultのdevサーバーはインメモリのみです — 書き込んだものはすべて、vault:down / vault:restartで" +
          "意図的に消えます。",
      },
    ],
  },
};
