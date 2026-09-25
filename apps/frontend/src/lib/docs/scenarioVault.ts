import type { LocalizedDocsPage } from "./types";

export const scenarioVault: LocalizedDocsPage = {
  en: {
    title: "Scenario 5: Use Vault",
    description:
      "The backend logs in to MySQL with a password from .env. This scenario takes that password out " +
      "of the backend's configuration altogether: the backend asks Vault for a database credential " +
      "when it starts, and Vault creates a brand-new, short-lived MySQL user for it on the spot. You " +
      "first see the backend fail without Vault, then work with it, then look at the users Vault made.",
    sections: [
      {
        heading: "Why Vault",
        body: [
          "Every write - including the ones the Kafka bridge (Scenario 2) makes - reaches MySQL through the backend's own connection, so all of them use the credential Vault issued.",
        ],
        bullets: [
          "Secrets live in one audited store instead of scattered across .env files, images and CI settings.",
          "Access is controlled by policy and token, and every read can be logged.",
          "Credentials can be rotated or issued dynamically without editing or redeploying each app's config - here, a fresh MySQL user per backend start that Vault deletes again when its lease runs out.",
        ],
      },
      {
        heading: "How it works: a credential issued on demand",
        body: [
          "Vault's database secrets engine holds one privileged MySQL connection (root, configured once " +
            "in Vault). When the backend asks for a credential, Vault uses that connection to create a new " +
            "MySQL user with a random name and password, limited to the demo database, and hands it back " +
            "with a lease. The backend never has a password in its config - only a Vault token that is " +
            "allowed to ask for one - and when the lease ends, Vault drops the user.",
        ],
        sequence: {
          summary:
            "Sequence diagram: the Backend asks Vault for a database credential, Vault creates a new MySQL user and returns it with a lease, and the Backend connects to MySQL as that user",
          participants: [
            { id: "app", label: "Backend", sub: "no MySQL password" },
            { id: "vault", label: "Vault", sub: "database secrets engine" },
            { id: "db", label: "MySQL" },
          ],
          steps: [
            {
              kind: "message",
              from: "app",
              to: "vault",
              text: "Ask for a database credential",
              detail: "GET /v1/database/creds/apps-backend  (X-Vault-Token)",
            },
            {
              kind: "message",
              from: "vault",
              to: "db",
              text: "Create a user (as root, held only in Vault)",
              detail: "CREATE USER 'v-token-...' ... GRANT ALL ON demo.*",
            },
            { kind: "message", from: "db", to: "vault", text: "OK", dashed: true },
            {
              kind: "message",
              from: "vault",
              to: "app",
              text: "Username, password and a lease (1h)",
              detail: "v-token-apps-backe-...  /  random password",
              dashed: true,
            },
            {
              kind: "message",
              from: "app",
              to: "db",
              text: "Connect as that user",
              detail: "SQL queries",
            },
            { kind: "note", at: "vault", text: "Lease ends or is revoked: DROP USER" },
            { kind: "message", from: "vault", to: "db", text: "Drop the user", detail: "DROP USER 'v-token-...'" },
          ],
          frames: [{ from: 5, to: 6, label: "when the lease ends" }],
        },
        note:
          "The backend renews its lease at half the TTL (app/config.py) up to the role's 24h ceiling; " +
          "renewal is implemented but this scenario doesn't wait an hour to watch it happen. Past the " +
          "ceiling the backend needs a restart to be issued a fresh credential.",
      },
      {
        heading: "1. Start Vault and let it issue MySQL users",
        code: [{ code: "make apps:up\nmake vault:up\nmake vault:setup-mysql" }],
        body: [
          "vault:setup-mysql enables the database secrets engine, points it at apps' MySQL (as root), " +
            "and defines the apps-backend role: what a credential may do (everything in demo) and how " +
            "long it lives (1h, up to 24h). It is idempotent.",
        ],
      },
      {
        heading: "2. Take the password out of the backend - it can't log in",
        code: [
          {
            label: ".env (set but empty - the backend now has no MySQL password of its own):",
            code: "BACKEND_MYSQL_PASSWORD=",
          },
          { code: "make apps:restart" },
        ],
        body: [
          "Same effect without editing .env: make vault:prove-needs-vault. The backend keeps retrying " +
            "and says why:",
        ],
        terminal: {
          lines: [
            { text: "$ make vault:prove-needs-vault", tone: "muted" },
            {
              text: "[db] attempt 1/30 failed: (pymysql.err.OperationalError) (1045, \"Access denied for user 'demo'@'172.20.0.3' (using password: NO)\")",
              tone: "error",
            },
            { text: "[db] attempt 2/30 failed: ... Access denied for user 'demo' ... (using password: NO)", tone: "error" },
            { text: "" },
            { text: "  GET /accounts/balances -> HTTP 000", tone: "error" },
            { text: "  (no answer - the backend never came up)" },
          ],
        },
        note:
          "Real output. This is the point of the step: with no password in its config and no Vault, the " +
          "backend is locked out - so whatever gets it in next can only be coming from Vault.",
      },
      {
        heading: "3. Give the backend Vault - it logs in with a Vault-issued user",
        code: [
          {
            label: ".env (keep BACKEND_MYSQL_PASSWORD empty):",
            code: "VAULT_ADDR=http://vault:8200\nVAULT_TOKEN=nb-vault-root-token",
          },
          { code: "make apps:restart" },
        ],
        body: [
          "Same effect without editing .env, and with the proof printed: make vault:verify-apps.",
        ],
        terminal: {
          lines: [
            { text: "$ make vault:verify-apps", tone: "muted" },
            { text: "database secrets engine ready: role apps-backend (default_ttl 1h, max_ttl 24h)" },
            { text: "Recreating apps/backend with NO MySQL password of its own, but WITH Vault..." },
            { text: "" },
            { text: "Password in the backend's environment: '' (empty on purpose)" },
            { text: "" },
            { text: "The backend's own startup log:" },
            {
              text: "[vault] issued a dynamic MySQL user v-token-apps-backe-c9wybUj5oXeKe (lease 3600s) from http://vault:8200/v1/database/creds/apps-backend",
              tone: "success",
            },
            { text: "" },
            { text: "A real request over that connection (a MySQL round-trip, not just 'container is up')..." },
            { text: '[{"name":"","balance":7,"eventCount":1},{"name":"Cash","balance":120034,"eventCount":15}]', tone: "success" },
            { text: "" },
            { text: "MySQL users Vault has created (each is a separate, short-lived credential):" },
            { text: "| v-token-apps-backe-c9wybUj5oXeKe | %    |", tone: "info" },
          ],
        },
        note:
          "Real output. Right after a full apps:restart, MySQL is still starting and Vault can't create the " +
          "user yet (it answers 500), so the backend logs \"dynamic credential not ready (HTTP 500), " +
          "attempt N/30\" a couple of times before the [vault] issued line - it retries rather than " +
          "falling back to a password it doesn't have.",
      },
      {
        heading: "4. Look at what Vault did",
        code: [{ code: "make vault:db-users\nmake vault:leases" }],
        bullets: [
          "vault:db-users lists the v-token-apps-backe-... users in MySQL itself (mysql.user). Nobody typed " +
            "that name or password - Vault generated both.",
          "Restart the backend again (apps:restart with the same .env) and run it once more: a second, " +
            "different user appears. Every backend start gets its own credential.",
          "vault:leases lists the live leases - each one is a promise Vault will honor by dropping that " +
            "user when it ends. The Vault UI (make vault:open, token nb-vault-root-token) shows the same " +
            "under Secrets -> database.",
        ],
        terminal: {
          lines: [
            { text: "$ make vault:db-users", tone: "muted" },
            { text: "+----------------------------------+------+" },
            { text: "| user                             | host |" },
            { text: "+----------------------------------+------+" },
            { text: "| v-token-apps-backe-XmOV6JegVOM60 | %    |", tone: "info" },
            { text: "| v-token-apps-backe-c9wybUj5oXeKe | %    |", tone: "info" },
            { text: "+----------------------------------+------+" },
          ],
        },
        note:
          "Real output after two backend starts. The static way still works too: vault:put-mysql-secret " +
          "writes a fixed credential to secret/apps/mysql, which the backend falls back to when no dynamic " +
          "one is available - but it is the same password every time, which is exactly what the dynamic " +
          "credentials avoid.",
      },
      {
        heading: "Returning to the normal configuration",
        code: [
          { label: ".env:", code: "VAULT_ADDR=\nVAULT_TOKEN=\n# and remove the BACKEND_MYSQL_PASSWORD= line" },
          { code: "make apps:restart" },
        ],
      },
      {
        heading: "Cleanup",
        code: [{ code: "make vault:down" }],
        note:
          "Vault's dev server is in-memory only - everything written to it, including its record of the " +
          "leases, is gone on vault:down / vault:restart, by design. The v-token-... users already created " +
          "stay in MySQL (nothing is left to drop them) until make apps:reset wipes the database.",
      },
    ],
  },
  ja: {
    title: "シナリオ5: Vaultの利用",
    description:
      "backendは、.envのパスワードでMySQLにログインしています。このシナリオでは、そのパスワードをbackendの" +
      "設定から完全に取り除きます: backendは起動時にVaultへデータベースの認証情報を要求し、Vaultがその場で" +
      "新しい短命のMySQLユーザーを作って渡します。まずVaultなしではbackendが動かないことを見て、次に" +
      "Vaultありで動くことを確かめ、最後にVaultが作ったユーザーを確認します。",
    sections: [
      {
        heading: "Vaultを使うメリット",
        body: [
          "すべての書き込み — Kafkaブリッジ(シナリオ2)が行うものも含む — は、backend自身の接続を通してMySQLに届くので、すべてがVaultの発行した認証情報を使います。",
        ],
        bullets: [
          "シークレットを.envやイメージ、CI設定に散らさず、監査可能な1か所のストアに集約できます。",
          "アクセスはポリシーとトークンで制御され、読み取りごとにログを残せます。",
          "認証情報のローテーションや動的発行を、各アプリの設定編集や再デプロイなしで行えます — ここでは、backendの起動ごとに新しいMySQLユーザーを作り、リースが切れるとVaultが削除します。",
        ],
      },
      {
        heading: "仕組み: 必要なときに発行される認証情報",
        body: [
          "Vaultのデータベースシークレットエンジンは、権限の高いMySQL接続(root、Vaultに一度だけ設定)を1つ" +
            "持ちます。backendが認証情報を要求すると、Vaultはその接続を使って、ランダムな名前とパスワードを" +
            "持ち、demoデータベースに限定された新しいMySQLユーザーを作り、リース付きで返します。" +
            "backendの設定にパスワードはなく、あるのは「要求してよいVaultトークン」だけで、リースが切れると" +
            "Vaultがそのユーザーを削除します。",
        ],
        sequence: {
          summary:
            "シーケンス図: BackendがVaultにデータベース認証情報を要求し、Vaultが新しいMySQLユーザーを作ってリース付きで返し、Backendがそのユーザーとして接続する流れ",
          participants: [
            { id: "app", label: "Backend", sub: "MySQLパスワードなし" },
            { id: "vault", label: "Vault", sub: "データベースシークレットエンジン" },
            { id: "db", label: "MySQL" },
          ],
          steps: [
            {
              kind: "message",
              from: "app",
              to: "vault",
              text: "データベース認証情報を要求",
              detail: "GET /v1/database/creds/apps-backend  (X-Vault-Token)",
            },
            {
              kind: "message",
              from: "vault",
              to: "db",
              text: "ユーザーを作成(Vaultだけが持つrootで)",
              detail: "CREATE USER 'v-token-...' ... GRANT ALL ON demo.*",
            },
            { kind: "message", from: "db", to: "vault", text: "OK", dashed: true },
            {
              kind: "message",
              from: "vault",
              to: "app",
              text: "ユーザー名・パスワード・リース(1時間)",
              detail: "v-token-apps-backe-...  /  ランダムなパスワード",
              dashed: true,
            },
            {
              kind: "message",
              from: "app",
              to: "db",
              text: "そのユーザーとして接続",
              detail: "SQLクエリ",
            },
            { kind: "note", at: "vault", text: "リース満了または失効: DROP USER" },
            { kind: "message", from: "vault", to: "db", text: "ユーザーを削除", detail: "DROP USER 'v-token-...'" },
          ],
          frames: [{ from: 5, to: 6, label: "リースが切れたとき" }],
        },
        note:
          "backendはリースをTTLの半分の時点で更新し(app/config.py)、ロールの上限である24時間まで延ばします。" +
          "更新は実装済みですが、このシナリオでは1時間待って動作を確かめることはしていません。上限を過ぎると、" +
          "新しい認証情報を発行してもらうためにbackendの再起動が必要です。",
      },
      {
        heading: "1. Vaultを起動し、MySQLユーザーを発行できるようにする",
        code: [{ code: "make apps:up\nmake vault:up\nmake vault:setup-mysql" }],
        body: [
          "vault:setup-mysqlは、データベースシークレットエンジンを有効にし、appsのMySQLに(rootで)接続させ、" +
            "apps-backendロールを定義します: 認証情報に許すこと(demo内のすべて)と、その寿命(1時間、最大" +
            "24時間)です。何度実行しても安全です。",
        ],
      },
      {
        heading: "2. backendからパスワードを取り除く — ログインできなくなる",
        code: [
          {
            label: ".env(設定するが空にする — backendは自前のMySQLパスワードを持たなくなる):",
            code: "BACKEND_MYSQL_PASSWORD=",
          },
          { code: "make apps:restart" },
        ],
        body: [
          ".envを編集しなくても同じ状態にできます: make vault:prove-needs-vault。backendは再試行を続け、" +
            "理由を出力します:",
        ],
        terminal: {
          lines: [
            { text: "$ make vault:prove-needs-vault", tone: "muted" },
            {
              text: "[db] attempt 1/30 failed: (pymysql.err.OperationalError) (1045, \"Access denied for user 'demo'@'172.20.0.3' (using password: NO)\")",
              tone: "error",
            },
            { text: "[db] attempt 2/30 failed: ... Access denied for user 'demo' ... (using password: NO)", tone: "error" },
            { text: "" },
            { text: "  GET /accounts/balances -> HTTP 000", tone: "error" },
            { text: "  (no answer - the backend never came up)" },
          ],
        },
        note:
          "実際の出力です。この手順のポイントはここです: 設定にパスワードがなく、Vaultもないと、backendは" +
          "締め出されます — つまり、この次にbackendを通すものは、Vaultから来ているとしか言えません。",
      },
      {
        heading: "3. backendにVaultを渡す — Vaultが発行したユーザーでログインする",
        code: [
          {
            label: ".env(BACKEND_MYSQL_PASSWORDは空のまま):",
            code: "VAULT_ADDR=http://vault:8200\nVAULT_TOKEN=nb-vault-root-token",
          },
          { code: "make apps:restart" },
        ],
        body: ["これも.envを編集せずに、証拠を表示しながら行えます: make vault:verify-apps。"],
        terminal: {
          lines: [
            { text: "$ make vault:verify-apps", tone: "muted" },
            { text: "database secrets engine ready: role apps-backend (default_ttl 1h, max_ttl 24h)" },
            { text: "Recreating apps/backend with NO MySQL password of its own, but WITH Vault..." },
            { text: "" },
            { text: "Password in the backend's environment: '' (empty on purpose)" },
            { text: "" },
            { text: "The backend's own startup log:" },
            {
              text: "[vault] issued a dynamic MySQL user v-token-apps-backe-c9wybUj5oXeKe (lease 3600s) from http://vault:8200/v1/database/creds/apps-backend",
              tone: "success",
            },
            { text: "" },
            { text: "A real request over that connection (a MySQL round-trip, not just 'container is up')..." },
            { text: '[{"name":"","balance":7,"eventCount":1},{"name":"Cash","balance":120034,"eventCount":15}]', tone: "success" },
            { text: "" },
            { text: "MySQL users Vault has created (each is a separate, short-lived credential):" },
            { text: "| v-token-apps-backe-c9wybUj5oXeKe | %    |", tone: "info" },
          ],
        },
        note:
          "実際の出力です。apps:restartの直後はMySQLがまだ起動中で、Vaultはユーザーをまだ作れず(500を返す)、" +
          "そのためbackendは[vault] issuedの行の前に「dynamic credential not ready (HTTP 500), attempt N/30」を" +
          "数回出します — 持っていないパスワードにフォールバックするのではなく、再試行します。",
      },
      {
        heading: "4. Vaultが何をしたか見る",
        code: [{ code: "make vault:db-users\nmake vault:leases" }],
        bullets: [
          "vault:db-usersは、MySQL自身(mysql.user)にあるv-token-apps-backe-...のユーザーを一覧します。" +
            "その名前もパスワードも誰も入力しておらず、両方ともVaultが生成しました。",
          "backendをもう一度再起動して(同じ.envでapps:restart)、再実行してみてください: 2つ目の別の" +
            "ユーザーが現れます。backendの起動ごとに、専用の認証情報が発行されます。",
          "vault:leasesは有効なリースを一覧します — 各リースは、満了時にそのユーザーを削除するというVaultの" +
            "約束です。Vault UI(make vault:open、トークンはnb-vault-root-token)でも、Secrets -> databaseで" +
            "同じものが見られます。",
        ],
        terminal: {
          lines: [
            { text: "$ make vault:db-users", tone: "muted" },
            { text: "+----------------------------------+------+" },
            { text: "| user                             | host |" },
            { text: "+----------------------------------+------+" },
            { text: "| v-token-apps-backe-XmOV6JegVOM60 | %    |", tone: "info" },
            { text: "| v-token-apps-backe-c9wybUj5oXeKe | %    |", tone: "info" },
            { text: "+----------------------------------+------+" },
          ],
        },
        note:
          "backendを2回起動した後の実際の出力です。静的なやり方も引き続き使えます: vault:put-mysql-secretは" +
          "固定の認証情報をsecret/apps/mysqlに書き込み、動的な認証情報が得られないときbackendはそれに" +
          "フォールバックします — ただし毎回同じパスワードで、それこそ動的な認証情報が避けているものです。",
      },
      {
        heading: "通常の構成に戻す",
        code: [
          { label: ".env:", code: "VAULT_ADDR=\nVAULT_TOKEN=\n# BACKEND_MYSQL_PASSWORD=の行は削除" },
          { code: "make apps:restart" },
        ],
      },
      {
        heading: "片付け",
        code: [{ code: "make vault:down" }],
        note:
          "Vaultのdevサーバーはインメモリのみです — 書き込んだものは、リースの記録を含めて、vault:down / " +
          "vault:restartで意図的に消えます。すでに作られたv-token-...のユーザーは、削除するものが" +
          "なくなるため、make apps:resetでデータベースを消すまでMySQLに残ります。",
      },
    ],
  },
};
