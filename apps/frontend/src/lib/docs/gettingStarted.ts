import type { LocalizedDocsPage } from "./types";

export const gettingStarted: LocalizedDocsPage = {
  en: {
    title: "Getting Started",
    description:
      "Every command below is a plain make target, run from the repository root. Each module also " +
      "prints its own help - run make apps, make kong, and so on with no action - so this page only " +
      "covers the commands you need before touching any scenario.",
    sections: [
      {
        heading: "Start / stop the apps stack",
        body: [
          "apps:up starts MySQL (seeded with a small chart of accounts), the backend and this " +
            "frontend, all on the shared apps-network. apps:down stops and removes them, but leaves " +
            "the MySQL data volume alone - a normal restart doesn't lose anything you've recorded.",
        ],
        code: [
          {
            code: "make apps:up      # start MySQL + backend + frontend\nmake apps:down    # stop and remove the containers",
          },
          {
            label: "After changing a compose env var (KEYCLOAK_ISSUER, VAULT_ADDR, ...):",
            code: "make apps:restart # down then up - picks up new env vars, keeps MySQL data",
          },
          {
            label: "For a genuinely clean slate (wipes the MySQL volume too):",
            code: "make apps:reset",
          },
        ],
      },
      {
        heading: "Where things end up",
        table: {
          headers: ["Service", "URL"],
          rows: [
            ["Frontend", "http://localhost:5173"],
            ["API docs (Scalar)", "http://localhost:5173/api-specs"],
            ["This documentation", "http://localhost:5173/docs"],
            ["Backend REST", "http://localhost:8080"],
            ["Backend GraphQL", "http://localhost:8080/graphql"],
            ["MCP server", "http://localhost:8080/mcp"],
            ["MySQL", "localhost:3306 (database testdb)"],
          ],
        },
      },
      {
        heading: "One-shot test tools",
        body: [
          "pytest and vitest are self-contained (no apps:up needed - they swap in an in-memory " +
            "database / mock fetch respectively). playwright and specmatic:test exercise the real, " +
            "running apps, so start it first.",
        ],
        code: [
          {
            code:
              "make apps:up                # needed by playwright/specmatic, not pytest/vitest\n\n" +
              "make pytest:test             # backend unit tests\n" +
              "make vitest:test             # frontend unit tests\n" +
              "make playwright:test         # E2E against the running frontend\n" +
              "make specmatic:test          # provider contract test against openapi.yaml",
          },
        ],
        note:
          "Every make <module>:test run leaves a browsable HTML report behind under <module>/report/ " +
          "(or locust/logs/<timestamp>/ for Locust) - all gitignored, regenerated on every run.",
      },
      {
        heading: "What each report actually looks like",
        body: [
          "Every report below is a real, freshly-generated capture from this exact environment - open " +
            "<module>/report/<file> directly in a browser (no server needed) to see the live version " +
            "any of these commands leaves behind.",
        ],
        table: {
          headers: ["Tool", "Report file"],
          rows: [
            ["pytest", "pytest/report/report.html"],
            ["vitest", "vitest/report/index.html"],
            ["playwright", "playwright/report/index.html"],
            ["specmatic", "specmatic/report/html/index.html"],
          ],
        },
        images: [
          {
            src: "/docs/screenshots/report-pytest.png",
            alt: "pytest-html report: Environment table (Python 3.12.14, pytest 9.1.1) and a Summary listing all 6 backend tests as Passed",
            caption: "pytest - a single self-contained report.html, environment metadata plus a per-test pass/fail table.",
          },
          {
            src: "/docs/screenshots/report-vitest.png",
            alt: "Vitest HTML report dashboard: 5 Pass, 0 Fail, 5 Total, with the test tree on the left showing each api client test by name",
            caption: "vitest - a dashboard summary plus a browsable test tree (this is api.test.ts, not the Specmatic-stub-backed consumer contract test).",
          },
          {
            src: "/docs/screenshots/report-playwright.png",
            alt: "Playwright HTML report listing all 5 E2E tests from login-and-register.spec.ts as passed, with per-test duration",
            caption: "playwright - one row per test, with duration; click through any of them for the full trace (screenshots, network, console) on a failure.",
          },
          {
            src: "/docs/screenshots/report-specmatic.png",
            alt: "Specmatic Contract Test Results: 100% API coverage, 12/12 successes, a per-path/method/response coverage table all marked Covered",
            caption: "specmatic - 100% API coverage against openapi.yaml, broken down by path, method and response code.",
          },
        ],
      },
      {
        heading: "Next: the six scenarios",
        body: [
          "Each scenario below builds on apps:up and is independent of the others - run them in any " +
            "order, or skip straight to the one you're interested in. Every scenario ends the same way: " +
            "make <module>:down to tear its own piece back down, leaving apps itself running.",
        ],
      },
    ],
  },
  ja: {
    title: "Getting Started",
    description:
      "以下のコマンドはすべてリポジトリルートで実行する、普通のmakeターゲットです。各モジュールは" +
      "アクションなしで(make apps、make kongのように)実行すると自分自身のヘルプも表示するので、この" +
      "ページではどのシナリオに入る前にも必要になる最低限のコマンドだけを扱います。",
    sections: [
      {
        heading: "appsスタックの起動・停止",
        body: [
          "apps:upはMySQL(勘定科目のサンプルデータ入り)・backend・このfrontendを、共有の" +
            "apps-network上にまとめて起動します。apps:downはそれらを停止・削除しますが、MySQLの" +
            "データボリュームはそのまま残すため、通常の再起動で記帳した内容が消えることはありません。",
        ],
        code: [
          {
            code: "make apps:up      # MySQL + backend + frontendを起動\nmake apps:down    # コンテナを停止・削除",
          },
          {
            label: "compose環境変数(KEYCLOAK_ISSUER・VAULT_ADDRなど)を変更した後は:",
            code: "make apps:restart # down してから up — 新しい環境変数を反映し、MySQLデータは維持",
          },
          {
            label: "本当にまっさらな状態にしたい場合(MySQLボリュームも削除):",
            code: "make apps:reset",
          },
        ],
      },
      {
        heading: "起動後の各エンドポイント",
        table: {
          headers: ["サービス", "URL"],
          rows: [
            ["Frontend", "http://localhost:5173"],
            ["APIドキュメント(Scalar)", "http://localhost:5173/api-specs"],
            ["このドキュメント", "http://localhost:5173/docs"],
            ["Backend REST", "http://localhost:8080"],
            ["Backend GraphQL", "http://localhost:8080/graphql"],
            ["MCPサーバー", "http://localhost:8080/mcp"],
            ["MySQL", "localhost:3306(データベース testdb)"],
          ],
        },
      },
      {
        heading: "一発実行のテストツール",
        body: [
          "pytestとvitestは自己完結しています(それぞれインメモリDB・モックfetchに差し替えるため、" +
            "apps:up不要)。playwrightとspecmatic:testは実際に稼働中のappsを対象にするため、先に" +
            "起動してください。",
        ],
        code: [
          {
            code:
              "make apps:up                # playwright/specmaticに必要(pytest/vitestは不要)\n\n" +
              "make pytest:test             # backendの単体テスト\n" +
              "make vitest:test             # frontendの単体テスト\n" +
              "make playwright:test         # 稼働中のfrontendに対するE2Eテスト\n" +
              "make specmatic:test          # openapi.yamlに対するProvider契約テスト",
          },
        ],
        note:
          "make <module>:testを実行するたびに、<module>/report/以下(Locustはlocust/logs/<timestamp>/以下)に" +
          "ブラウザで見られるHTMLレポートが残ります — すべて.gitignore対象で、実行のたびに新しく生成されます。",
      },
      {
        heading: "各レポートの実際の見た目",
        body: [
          "以下はすべて、この環境で実際に生成した本物のキャプチャです — <module>/report/<file>を" +
            "ブラウザで直接開けば(サーバー不要)、これらのコマンドが残すのと同じ内容がそのまま見られます。",
        ],
        table: {
          headers: ["ツール", "レポートファイル"],
          rows: [
            ["pytest", "pytest/report/report.html"],
            ["vitest", "vitest/report/index.html"],
            ["playwright", "playwright/report/index.html"],
            ["specmatic", "specmatic/report/html/index.html"],
          ],
        },
        images: [
          {
            src: "/docs/screenshots/report-pytest.png",
            alt: "pytest-htmlのレポート。Environment表(Python 3.12.14、pytest 9.1.1)と、backendの6テストすべてがPassedと表示されたSummary",
            caption: "pytest — 単一の自己完結型report.html。環境メタデータと、テストごとのpass/fail表。",
          },
          {
            src: "/docs/screenshots/report-vitest.png",
            alt: "VitestのHTMLレポートダッシュボード。5 Pass、0 Fail、5 Total。左側のテストツリーにapi clientの各テスト名が表示されている",
            caption: "vitest — ダッシュボードのサマリーと、ブラウズ可能なテストツリー(これはapi.test.tsで、Specmaticスタブを使うConsumer契約テストとは別物)。",
          },
          {
            src: "/docs/screenshots/report-playwright.png",
            alt: "PlaywrightのHTMLレポート。login-and-register.spec.tsの5テストすべてがpassedとして、テストごとの実行時間とともに一覧表示されている",
            caption: "playwright — テストごとに1行、実行時間つき。失敗時はクリックすればスクリーンショット・ネットワーク・コンソールを含む完全なトレースを確認できる。",
          },
          {
            src: "/docs/screenshots/report-specmatic.png",
            alt: "SpecmaticのContract Test Results。API Coverage 100%、12件中12件成功、パス/メソッド/レスポンスごとのカバレッジ表がすべてCoveredと表示",
            caption: "specmatic — openapi.yamlに対するAPI Coverage 100%。パス・メソッド・レスポンスコードごとの内訳。",
          },
        ],
      },
      {
        heading: "次は6つのシナリオ",
        body: [
          "以下の各シナリオはapps:upの上に成り立ち、互いに独立しています — どの順で試しても、興味のある" +
            "ものだけ試してもかまいません。どのシナリオも最後はmake <module>:downでそのモジュールだけを" +
            "片付け、apps自体は動いたままにする、という同じ終わり方をします。",
        ],
      },
    ],
  },
};
