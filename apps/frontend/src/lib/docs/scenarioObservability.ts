import type { LocalizedDocsPage } from "./types";

export const scenarioObservability: LocalizedDocsPage = {
  en: {
    title: "Scenario 4: Observability",
    description:
      "The backend can export OpenTelemetry traces (FastAPI requests + SQLAlchemy queries), HTTP " +
      "server metrics and application logs over OTLP - off by default, so apps:up behaves exactly as " +
      "before unless it's explicitly turned on. This scenario turns it on, watches an HTTP overload " +
      "run happen live in Grafana, and sees the same run trip alerts that Alertmanager routes.",
    sections: [
      {
        heading: "Why OpenTelemetry, Prometheus, Alertmanager, Tempo, Loki and Grafana",
        bullets: [
          "OpenTelemetry: a vendor-neutral standard for traces and metrics - instrument once, and switch the backend that receives them (here a local stack, in production e.g. New Relic) without touching app code.",
          "Prometheus, Tempo and Loki: purpose-built stores for metrics, traces and logs, all open source with no license cost.",
          "Alertmanager: turns Prometheus alert rules into notifications - grouping, de-duplicating and routing them, and muting the redundant ones - so nobody has to be watching a dashboard when the overload hits.",
          "Grafana: one place to see metrics, traces and logs together (a log line links to its trace by trace_id), so you can watch what a load test does to the system as it happens.",
        ],
      },
      {
        heading: "1. Turn on export and start the stack",
        code: [
          {
            code:
              "# .env\nOTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318\n\n" +
              "make observability:up\n" +
              "make apps:restart          # backend reads the endpoint at startup\n" +
              "make observability:verify  # each component ready + nb-backend metrics/traces arrived\n" +
              'make observability:open    # Grafana -> NASEBANAL -> "Apps backend (OpenTelemetry)"',
          },
        ],
        body: [
          "The dashboard shows request rate per path, 5xx ratio, p50/p95/p99 latency, active " +
            "requests / DB connections in use, and recent traces - click through to the span waterfall, " +
            "including each SQL query. /health is excluded from instrumentation, since Consul and " +
            "healthchecks would otherwise dominate every panel.",
        ],
        terminal: {
          lines: [
            { text: "$ make observability:verify", tone: "muted" },
            { text: "Components:" },
            { text: "  Grafana: ready", tone: "success" },
            { text: "  Prometheus: ready", tone: "success" },
            { text: "  Tempo: ready", tone: "success" },
            { text: "  Loki: ready", tone: "success" },
            { text: "  Alertmanager: ready", tone: "success" },
            { text: "Alert rules loaded in Prometheus:" },
            { text: "  BackendHighErrorRatio: inactive" },
            { text: "  BackendHighLatencyP95: inactive" },
            { text: "  BackendDbPoolSaturated: inactive" },
            { text: "Prometheus scrape targets:" },
            { text: "  alertmanager: up", tone: "success" },
            { text: "  loki: up", tone: "success" },
            { text: "  otel-collector: up", tone: "success" },
            { text: "  prometheus: up", tone: "success" },
            { text: "apps/backend telemetry:" },
            {
              text: "  metrics: nb-backend series present in Prometheus",
              tone: "success",
            },
            {
              text: "  traces:  nb-backend traces present in Tempo",
              tone: "success",
            },
            {
              text: "  logs:    nb-backend logs present in Loki",
              tone: "success",
            },
          ],
        },
        note:
          "Real output (shown once everything was up). Tempo and Loki both report NOT ready for " +
          "their first ~15 seconds after observability:up (Loki: \"waiting for 15s after being ready\") " +
          "even though data is already landing - re-run observability:verify a few seconds later if you " +
          "see that. Logs are deliberately limited to failed requests (status >= 400) and application " +
          "log lines, not one line per request, so a healthy backend may show none yet.",
      },
      {
        heading: "2. Watch an overload happen live",
        body: [
          "This reuses Scenario 2's direct-REST run - same command, same numbers - but this time with " +
            "Grafana open to watch it instead of only reading Locust's own report afterward.",
        ],
        code: [
          {
            code: "make locust:test LOCUST_FILE=locustfile_http_overload.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s",
          },
        ],
        images: [
          {
            src: "/docs/screenshots/grafana-overload.png",
            alt: "Grafana 'Apps backend (OpenTelemetry)' dashboard during a real 300/100 overload run: request rate spiking, p50/p95/p99 latency jumping from under a second to 10s+, active requests and DB connections in use pinned near 300, and a table of recent slow /auth/login traces",
            caption:
              "A real capture from this exact run - latency and DB connections in use spike and stay pinned for the duration.",
          },
          {
            src: "/docs/screenshots/grafana-alerts-logs.png",
            alt: "The same dashboard after the run, now with the 5xx error ratio near 100%, a firing-alerts panel showing BackendHighLatencyP95, BackendDbPoolSaturated and BackendHighErrorRatio, a Loki log panel full of 'Exception in ASGI application' lines, and the recent traces table",
            caption:
              "A later run on the full stack: the firing-alerts panel, Loki's backend logs and the 5xx ratio panel, all populated by the same overload.",
          },
        ],
      },
      {
        heading: "What to look for",
        bullets: [
          "Request rate by path shows the burst arriving - /auth/login first, then /accounts as the " +
            "queue behind the DB pool builds.",
          "p95/p99 latency spikes toward the 30s DB-pool timeout - the same number Scenario 2's report " +
            "shows after the fact, but visible rising in real time here.",
          "Active requests / DB connections in use pins near the pool's ceiling for the duration of the " +
            "run, then drains back to zero as the backlog clears.",
          "Click into a slow trace from this window: the span waterfall shows exactly where the time " +
            "went - almost entirely waiting on a DB connection, not the request handler itself.",
          "5xx error ratio jumps toward 100% once the 30s pool timeouts start landing - a second or " +
            "so after latency, since a request only counts as a 5xx when it finally fails.",
        ],
        note:
          "The first screenshot above (from an earlier version of this dashboard) shows 5xx ratio as " +
          "No data: its query had a malformed selector, since fixed - the second screenshot has it " +
          "working. Run the same load through Kafka afterward (Scenario 2, step 4) with Grafana still " +
          "open, and every one of these panels stays flat instead.",
      },
      {
        heading: "3. Alerts: from a rule to a notification",
        body: [
          "observability/alert-rules.yml holds three Prometheus alert rules over the same signals the " +
            "dashboard graphs: BackendHighErrorRatio (5xx > 5%, critical), BackendHighLatencyP95 (p95 > " +
            "1s, warning) and BackendDbPoolSaturated (15 of SQLAlchemy's default 5+10 connections in " +
            "use, warning), each with for: 30s so one noisy sample doesn't fire. Prometheus sends " +
            "firing alerts to Alertmanager, which groups them, applies routing and inhibition rules " +
            "(alertmanager.yml), and posts to a webhook receiver - alert-sink, a tiny container that just " +
            "prints what it gets, standing in for Slack, email or PagerDuty so the whole path is visible " +
            "with no external account.",
          "Run the overload from step 2 and check afterward (or during, in a second terminal):",
        ],
        code: [{ code: "make observability:alerts" }],
        terminal: {
          lines: [
            { text: "$ make observability:alerts", tone: "muted" },
            { text: "Alerts in Alertmanager (active):" },
            {
              text: "  [critical] BackendHighErrorRatio - nb-backend: more than 5% of requests are failing with 5xx",
              tone: "error",
            },
            { text: "Inhibited (suppressed by a higher-severity alert):" },
            { text: "  [warning] BackendHighLatencyP95", tone: "info" },
            { text: "  [warning] BackendDbPoolSaturated", tone: "info" },
            { text: "Notifications received by the webhook sink (last 20):" },
            { text: "  [FIRING] BackendHighLatencyP95 (warning) - nb-backend: p95 latency is above 1s" },
            { text: "  [FIRING] BackendDbPoolSaturated (warning) - nb-backend: DB connection pool is exhausted" },
            { text: "  [RESOLVED] BackendHighLatencyP95 (warning) - nb-backend: p95 latency is above 1s" },
            { text: "  [FIRING] BackendHighErrorRatio (critical) - nb-backend: more than 5% of requests are failing with 5xx" },
          ],
        },
        images: [
          {
            src: "/docs/screenshots/alertmanager-ui.png",
            alt: "Alertmanager's own UI at localhost:9095 with the Inhibited box ticked, listing three alert groups: BackendDbPoolSaturated, BackendHighErrorRatio and BackendHighLatencyP95, each routed to the alert-sink receiver",
            caption:
              "Alertmanager's UI (http://localhost:9095) during the overload. Untick \"Inhibited\" and only BackendHighErrorRatio (critical) stays - the two warnings are muted by the inhibit rule; ticked, they are listed too.",
          },
        ],
        note:
          "Real output from a 300 / 100 / 40s direct-REST run, abridged (the lines for a manual " +
          "test alert were removed). The order is the point: the two warnings fire first, the critical " +
          "5xx alert a minute or so later - once it does, the inhibit rule mutes the warnings for the " +
          "same service, so the on-call sees one critical alert instead of three. The same load through " +
          "Kafka (Scenario 2, step 4) never puts that concurrency on the backend, so these rules " +
          "should stay quiet - not re-run against the alert rules yet, so check for yourself. " +
          "Alertmanager's own UI is at http://localhost:9095, and Grafana's " +
          "Alerting page lists the same alerts through the Alertmanager data source.",
      },
      {
        heading: "4. Logs, and jumping from a log line to its trace",
        body: [
          "The backend also ships application logs over OTLP, through the same Collector, into Loki " +
            "(its native OTLP endpoint) - the dashboard's logs panel, or Grafana's Explore with the Loki " +
            "data source and {service_name=\"nb-backend\"}. Only failed requests (status >= 400) and " +
            "application log lines are shipped, not one line per request: a Kafka-fed run would " +
            "otherwise put millions of lines into Loki. The overload shows up as \"Exception in ASGI " +
            "application\" entries (the DB-pool timeouts, with their tracebacks).",
          "Each log record carries the trace_id and span_id of the request that produced it, so a " +
            "log line links straight to its trace in Tempo (and a trace's \"logs for this span\" button " +
            "goes the other way) - from a red spike in the 5xx panel to the exact request and the " +
            "exact wait that caused it, without copying an ID by hand.",
        ],
        images: [
          {
            src: "/docs/screenshots/loki-explore.png",
            alt: "Grafana Explore on the Loki data source with the query {service_name=\"nb-backend\"} |= \"Exception\": a logs-volume chart of error lines, and an expanded 'Exception in ASGI application' entry whose exception_message reads 'QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00' followed by the traceback",
            caption:
              "Grafana Explore on Loki during the overload run: the exception behind the 5xx spike, in full - \"QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00\" - i.e. the DB pool from step 2, with its traceback.",
          },
        ],
      },
      {
        heading: "5. Gateways send traces too: Kong and agentgateway",
        body: [
          "Kong and agentgateway can export their own traces to the same Collector, so a request that " +
            "goes through a gateway shows up as one trace: the gateway's span with the backend's spans " +
            "underneath. Both are on apps-network, so they reach the Collector at otel-collector:4318.",
          "Kong: the opentelemetry plugin on the apps_backend service (kong/conf/declarative.yml) plus " +
            "KONG_TRACING_INSTRUMENTATIONS=request (kong/docker-compose.yml). Kong runs in DB mode by " +
            "default, so re-import the declarative config with make kong:reset. agentgateway: a tracing " +
            "block in agentgateway/config.yaml with otlpEndpoint, otlpProtocol: http and randomSampling: " +
            "true - sampling defaults to false, and with it nothing is exported unless the request already " +
            "carries a trace. In this run agentgateway picked the tracing block up after a container " +
            "restart, not on the config file's live reload. The dashboard's Gateway traces panel (bottom) lists " +
            "them; click a trace ID to open it.",
        ],
        code: [
          {
            code:
              "make kong:reset            # re-import the config with the opentelemetry plugin\n" +
              "make agentgateway:up       # (docker restart nb-agentgateway after editing config.yaml)\n" +
              "curl localhost:8000/api/accounts/balances   # through Kong\n" +
              "make agentgateway:tools                     # MCP initialize + tools/list",
          },
        ],
        images: [
          {
            src: "/docs/screenshots/grafana-gateway-traces.png",
            alt: "The Grafana dashboard's Gateway traces panel: a table of recent traces, each row a Kong ('kong') or agentgateway ('initialize', 'tools/list') root span with its start time and duration",
            caption:
              "The dashboard's Gateway traces panel (bottom of the Apps backend dashboard): every Kong and agentgateway request, newest first. Click a trace ID to open it.",
          },
          {
            src: "/docs/screenshots/tempo-kong-trace.png",
            alt: "Grafana Explore on Tempo showing one trace: an nb-kong span 'kong' of 60 ms with the nb-backend span GET /accounts/balances and its connect, SELECT demo and http send spans nested underneath",
            caption:
              "A request through Kong: Kong's span on top, the backend's request and its SQL query inside it - one trace across two services.",
          },
          {
            src: "/docs/screenshots/tempo-agentgateway-trace.png",
            alt: "Grafana Explore on Tempo showing one trace: an agentgateway span tools/call, then tools/call apps-backend_list_balances_accounts_balances_get, with the nb-backend span GET /accounts/balances and its SQL query underneath",
            caption:
              "An MCP tool call through agentgateway: tools/call, the tool it resolved to, then the backend's REST request and query - the MCP call and the REST call in one trace.",
          },
        ],
        note:
          "Real runs. Every Kong trace of /api/accounts/balances that was checked contained both nb-kong " +
          "and nb-backend spans, so the trace context is passed on to the backend (the plugin's " +
          "header_type is preserve, the default). Kong here exports traces only: metrics would come from " +
          "its prometheus plugin, scraped by Prometheus, which is not set up. Sampling every request is " +
          "fine for a demo, not for production.",
      },
      {
        heading: "Beyond the local stack",
        body: [
          "The instrumentation itself is standard OTel SDK code (app/telemetry.py) that honors the " +
            "usual OTEL_* env vars, so pointing OTEL_EXPORTER_OTLP_ENDPOINT (plus " +
            "OTEL_EXPORTER_OTLP_HEADERS) at another OTLP backend - NewRelic, which the real NASEBANAL " +
            "apps use - works without code changes. Only the Collector's own config " +
            "(observability/otel-collector.yaml) is specific to this local stack.",
        ],
      },
      {
        heading: "Cleanup",
        code: [{ code: "make observability:down" }],
        note:
          "Turn export back off with OTEL_EXPORTER_OTLP_ENDPOINT= in .env, then apps:restart, once " +
          "you're done - otherwise the backend keeps retrying an export target that's no longer there. " +
          "observability:reset additionally wipes stored metrics, traces, logs and Grafana state.",
      },
    ],
  },
  ja: {
    title: "シナリオ4: オブザーバビリティ",
    description:
      "backendはOpenTelemetryのトレース(FastAPIのリクエスト + SQLAlchemyのクエリ)・HTTPサーバー" +
      "メトリクス・アプリケーションログをOTLPで送信できます — デフォルトはオフなので、明示的に有効化" +
      "しない限りapps:upの挙動は従来と変わりません。このシナリオではそれを有効化したうえで、HTTP overload" +
      "実行の様子をGrafana上でライブに観察し、同じ実行でAlertmanager経由のアラートが発火するところまで見ます。",
    sections: [
      {
        heading: "OpenTelemetry・Prometheus・Alertmanager・Tempo・Loki・Grafanaを使うメリット",
        bullets: [
          "OpenTelemetry: トレースとメトリクスのベンダー中立な標準規格で、一度計装すればアプリのコードを変えずに送信先を切り替えられます(ここではローカル構成、本番ではNew Relicなど)。",
          "Prometheus・Tempo・Loki: それぞれメトリクス・トレース・ログに特化した保存先で、いずれもOSSのためライセンス費用がかかりません。",
          "Alertmanager: Prometheusのアラートルールを通知に変える仕組みで、グルーピング・重複排除・ルーティング・冗長なアラートの抑制を行うため、過負荷が起きたときにダッシュボードを見張っている人がいなくても気づけます。",
          "Grafana: メトリクス・トレース・ログを1か所で見られ(ログ行はtrace_idでトレースへ飛べる)、負荷試験がシステムに与える影響をリアルタイムで確認できます。",
        ],
      },
      {
        heading: "1. 送信を有効化してスタックを起動",
        code: [
          {
            code:
              "# .env\nOTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318\n\n" +
              "make observability:up\n" +
              "make apps:restart          # backendが起動時にエンドポイントを読み込む\n" +
              "make observability:verify  # 各コンポーネントの準備 + nb-backendのメトリクス/トレース到達を確認\n" +
              'make observability:open    # Grafana -> NASEBANAL -> "Apps backend (OpenTelemetry)"',
          },
        ],
        body: [
          "ダッシュボードには、パスごとのリクエストレート・5xx比率・p50/p95/p99レイテンシ・アクティブな" +
            "リクエスト数/使用中のDB接続数、そして直近のトレース(クリックするとスパンのウォーターフォール、" +
            "各SQLクエリまで確認可)が表示されます。/healthは計装から除外されているため、Consulなどの" +
            "ヘルスチェックがすべてのパネルを占領することはありません。",
        ],
        terminal: {
          lines: [
            { text: "$ make observability:verify", tone: "muted" },
            { text: "Components:" },
            { text: "  Grafana: ready", tone: "success" },
            { text: "  Prometheus: ready", tone: "success" },
            { text: "  Tempo: ready", tone: "success" },
            { text: "  Loki: ready", tone: "success" },
            { text: "  Alertmanager: ready", tone: "success" },
            { text: "Alert rules loaded in Prometheus:" },
            { text: "  BackendHighErrorRatio: inactive" },
            { text: "  BackendHighLatencyP95: inactive" },
            { text: "  BackendDbPoolSaturated: inactive" },
            { text: "Prometheus scrape targets:" },
            { text: "  alertmanager: up", tone: "success" },
            { text: "  loki: up", tone: "success" },
            { text: "  otel-collector: up", tone: "success" },
            { text: "  prometheus: up", tone: "success" },
            { text: "apps/backend telemetry:" },
            {
              text: "  metrics: nb-backend series present in Prometheus",
              tone: "success",
            },
            {
              text: "  traces:  nb-backend traces present in Tempo",
              tone: "success",
            },
            {
              text: "  logs:    nb-backend logs present in Loki",
              tone: "success",
            },
          ],
        },
        note:
          "実際の出力です(すべて起動した後の状態)。observability:up直後の約15秒間は、TempoとLokiが" +
          "NOT readyと出ます(Lokiは\"waiting for 15s after being ready\") — その状態でもデータ自体は" +
          "すでに届いていることがあるので、数秒待ってobservability:verifyを再実行してください。ログは、" +
          "リクエストごとに1行ではなく、失敗したリクエスト(status >= 400)とアプリケーションのログ行だけを" +
          "送る設計のため、正常なbackendではまだ何も出ないことがあります。",
      },
      {
        heading: "2. overloadの様子をライブに観察する",
        body: [
          "シナリオ2のREST直叩き実行をそのまま再利用します — 同じコマンド、同じ数値ですが、今回は事後に" +
            "Locust自身のレポートを読むのではなく、Grafanaを開いた状態でライブに観察します。",
        ],
        code: [
          {
            code: "make locust:test LOCUST_FILE=locustfile_http_overload.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s",
          },
        ],
        images: [
          {
            src: "/docs/screenshots/grafana-overload.png",
            alt: "Grafanaの「Apps backend (OpenTelemetry)」ダッシュボード。実際の300/100 overload実行中の様子 — リクエストレートの急増、p50/p95/p99レイテンシが1秒未満から10秒以上へ跳ね上がる様子、アクティブなリクエスト数と使用中のDB接続数が300近くに張り付く様子、直近の遅い/auth/loginトレース一覧",
            caption:
              "この実行そのものの実際のキャプチャ — レイテンシと使用中のDB接続数が実行中ずっと跳ね上がったまま。",
          },
          {
            src: "/docs/screenshots/grafana-alerts-logs.png",
            alt: "実行後の同じダッシュボード。5xx比率が100%近くまで上がり、発火中アラート(BackendHighLatencyP95・BackendDbPoolSaturated・BackendHighErrorRatio)のパネル、「Exception in ASGI application」が並ぶLokiのログパネル、直近のトレース一覧が表示されている",
            caption:
              "スタック全体を起動した後の別の実行: 発火中アラートのパネル、Lokiのbackendログ、5xx比率のパネルが、同じoverloadですべて埋まる。",
          },
        ],
      },
      {
        heading: "確認するポイント",
        bullets: [
          "Request rate by pathで、バーストが到達する様子 — まず/auth/login、続いてDBプール背後の" +
            "キューが積み上がるにつれて/accountsが増えていく。",
          "p95/p99レイテンシが30秒のDBプールタイムアウトに向かって急上昇する様子 — シナリオ2のレポートで" +
            "事後に見る同じ数字が、ここではリアルタイムに立ち上がっていくのが見える。",
          "Active requests / DB connections in useが、実行中ずっとプールの上限近くに張り付き、その後" +
            "バックログが片付くにつれてゼロまで下がっていく様子。",
          "この時間帯の遅いトレースをクリックすると、スパンのウォーターフォールで時間の内訳がわかる — " +
            "ほぼすべてがリクエストハンドラ自体ではなく、DB接続待ちに費やされている。",
          "5xx error ratioが、30秒のプールタイムアウトが返り始めた時点で100%近くまで跳ね上がる — " +
            "リクエストは最終的に失敗して初めて5xxとして数えられるため、レイテンシより数秒遅れて動きます。",
        ],
        note:
          "上の1枚目のスクリーンショット(このダッシュボードの旧版のもの)では5xx比率がNo dataになって" +
          "います — クエリのセレクタが不正だったためで、現在は修正済みです(2枚目では動いています)。" +
          "この後、Grafanaを開いたままシナリオ2のstep 4(Kafka経由)で同じ負荷を流すと、これらのパネルは" +
          "すべて平坦なまま推移します。",
      },
      {
        heading: "3. アラート: ルールから通知まで",
        body: [
          "observability/alert-rules.ymlには、ダッシュボードが描いているのと同じ指標に対する3つのPrometheus" +
            "アラートルールがあります: BackendHighErrorRatio(5xxが5%超、critical)、BackendHighLatencyP95" +
            "(p95が1秒超、warning)、BackendDbPoolSaturated(SQLAlchemyのデフォルト5+10接続のうち15を使用、" +
            "warning)。いずれもfor: 30sで、単発のノイズでは発火しません。Prometheusは発火したアラートを" +
            "Alertmanagerへ送り、Alertmanagerがグルーピング・ルーティング・抑制ルール(alertmanager.yml)を" +
            "適用したうえでwebhook受信先に通知します — 受信先のalert-sinkは、受け取った内容を表示するだけの" +
            "小さなコンテナで、Slackやメール、PagerDutyの代わりに、外部アカウントなしで経路全体を見られる" +
            "ようにしています。",
          "step 2のoverloadを流し、終わった後(または実行中に別ターミナルで)確認します:",
        ],
        code: [{ code: "make observability:alerts" }],
        terminal: {
          lines: [
            { text: "$ make observability:alerts", tone: "muted" },
            { text: "Alerts in Alertmanager (active):" },
            {
              text: "  [critical] BackendHighErrorRatio - nb-backend: more than 5% of requests are failing with 5xx",
              tone: "error",
            },
            { text: "Inhibited (suppressed by a higher-severity alert):" },
            { text: "  [warning] BackendHighLatencyP95", tone: "info" },
            { text: "  [warning] BackendDbPoolSaturated", tone: "info" },
            { text: "Notifications received by the webhook sink (last 20):" },
            { text: "  [FIRING] BackendHighLatencyP95 (warning) - nb-backend: p95 latency is above 1s" },
            { text: "  [FIRING] BackendDbPoolSaturated (warning) - nb-backend: DB connection pool is exhausted" },
            { text: "  [RESOLVED] BackendHighLatencyP95 (warning) - nb-backend: p95 latency is above 1s" },
            { text: "  [FIRING] BackendHighErrorRatio (critical) - nb-backend: more than 5% of requests are failing with 5xx" },
          ],
        },
        images: [
          {
            src: "/docs/screenshots/alertmanager-ui.png",
            alt: "localhost:9095のAlertmanager自身のUI。Inhibitedにチェックを入れた状態で、BackendDbPoolSaturated・BackendHighErrorRatio・BackendHighLatencyP95の3つのアラートグループが、alert-sinkの受信先に振り分けられて並んでいる",
            caption:
              "過負荷の最中のAlertmanagerのUI(http://localhost:9095)。「Inhibited」のチェックを外すとBackendHighErrorRatio(critical)だけが残ります — 2つのwarningは抑制ルールで黙らされているためで、チェックを入れると一覧に現れます。",
          },
        ],
        note:
          "300 / 100 / 40sのREST直叩き実行での実際の出力を省略したものです(手動のテスト用アラートの行は" +
          "除いています)。順序が重要です: まず2つのwarningが発火し、1分ほど後にcriticalの5xxアラートが" +
          "発火します — そうなると抑制ルールが同じサービスのwarningを黙らせるため、当番には3件ではなく" +
          "critical 1件だけが届きます。同じ負荷をKafka経由(シナリオ2のstep 4)で流してもbackendにはその同時実行数が" +
          "かからないため、これらのルールは静かなままのはずですが、アラートルールに対しては未確認なので、" +
          "ご自身で確かめてください。AlertmanagerのUIは" +
          "http://localhost:9095、GrafanaのAlertingページでもAlertmanagerデータソース経由で同じアラートが" +
          "見られます。",
      },
      {
        heading: "4. ログと、ログ行からトレースへのジャンプ",
        body: [
          "backendはアプリケーションログも同じCollector経由のOTLPでLoki(そのネイティブOTLPエンドポイント)へ" +
            "送ります — ダッシュボードのログパネル、またはGrafanaのExploreでLokiデータソースに" +
            "{service_name=\"nb-backend\"}を指定して見られます。送るのは失敗したリクエスト(status >= 400)と" +
            "アプリケーションのログ行だけで、リクエストごとに1行ではありません — Kafka経由の実行では、" +
            "そうでないとLokiに何百万行も入ってしまうためです。overloadは「Exception in ASGI application」" +
            "(DBプールのタイムアウトとそのトレースバック)として現れます。",
          "各ログレコードには、それを出したリクエストのtrace_idとspan_idが付くので、ログ行からTempoの" +
            "トレースへ直接リンクでき(逆にトレース側の「logs for this span」ボタンからログへも飛べます)、" +
            "5xxパネルの赤いスパイクから、その原因となった具体的なリクエストと待ち時間まで、IDを手でコピー" +
            "せずにたどれます。",
        ],
        images: [
          {
            src: "/docs/screenshots/loki-explore.png",
            alt: "LokiデータソースでのGrafana Explore。クエリは{service_name=\"nb-backend\"} |= \"Exception\"で、エラー行のログ量のグラフと、展開された「Exception in ASGI application」のエントリが表示されている。exception_messageは「QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00」で、その後にトレースバックが続く",
            caption:
              "過負荷実行中のLokiでのGrafana Explore: 5xxのスパイクの原因となった例外の全文 — 「QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00」、つまりステップ2のDBプールの枯渇が、トレースバック付きで見えます。",
          },
        ],
      },
      {
        heading: "5. ゲートウェイからもトレースを送る: Kong と agentgateway",
        body: [
          "KongとagentgatewayもCollectorへ自分のトレースを送れるので、ゲートウェイを通ったリクエストは、" +
            "ゲートウェイのスパンの下にbackendのスパンが連なる1本のトレースとして見えます。どちらもapps-networkに" +
            "参加しているので、otel-collector:4318でCollectorに届きます。",
          "Kong: apps_backendサービスへのopentelemetryプラグイン(kong/conf/declarative.yml)と、" +
            "KONG_TRACING_INSTRUMENTATIONS=request(kong/docker-compose.yml)です。KongはデフォルトでDBモード" +
            "なので、declarativeの設定はmake kong:resetで再インポートします。agentgateway: " +
            "agentgateway/config.yamlのtracingブロックに、otlpEndpoint・otlpProtocol: http・randomSampling: true" +
            "を指定します — サンプリングのデフォルトはfalseで、リクエストがすでにトレースを持っていない限り何も" +
            "送られません。今回の実行では、agentgatewayはtracingブロックを、設定ファイルのライブリロードでは" +
            "なく、コンテナの再起動後に読み込みました。ダッシュボード最下部の「Gateway traces」パネルに一覧されるので、" +
            "トレースIDをクリックすると開きます。",
        ],
        code: [
          {
            code:
              "make kong:reset            # opentelemetryプラグイン入りの設定を再インポート\n" +
              "make agentgateway:up       # (config.yamlを編集した後はdocker restart nb-agentgateway)\n" +
              "curl localhost:8000/api/accounts/balances   # Kong経由\n" +
              "make agentgateway:tools                     # MCPのinitialize + tools/list",
          },
        ],
        images: [
          {
            src: "/docs/screenshots/grafana-gateway-traces.png",
            alt: "Grafanaダッシュボードの「Gateway traces」パネル。最近のトレースの表で、各行がKong(kong)またはagentgateway(initialize、tools/list)のルートスパンと、その開始時刻・所要時間を示している",
            caption:
              "ダッシュボードの「Gateway traces」パネル(Apps backendダッシュボードの最下部): KongとagentgatewayのリクエストとMCP呼び出しを新しい順に一覧します。トレースIDをクリックすると開きます。",
          },
          {
            src: "/docs/screenshots/tempo-kong-trace.png",
            alt: "GrafanaのExploreでTempoの1本のトレースを表示。60msのnb-kongのスパン「kong」の下に、nb-backendのスパンGET /accounts/balancesと、そのconnect・SELECT demo・http sendが入れ子で並んでいる",
            caption:
              "Kong経由のリクエスト: 一番上がKongのスパンで、その中にbackendのリクエストとSQLクエリが入る — 2つのサービスにまたがる1本のトレース。",
          },
          {
            src: "/docs/screenshots/tempo-agentgateway-trace.png",
            alt: "GrafanaのExploreでTempoの1本のトレースを表示。agentgatewayのスパンtools/call、続いてtools/call apps-backend_list_balances_accounts_balances_get、その下にnb-backendのスパンGET /accounts/balancesとSQLクエリが並んでいる",
            caption:
              "agentgateway経由のMCPツール呼び出し: tools/call、解決されたツール、そしてbackendのRESTリクエストとクエリ — MCP呼び出しとREST呼び出しが1本のトレースに入る。",
          },
        ],
        note:
          "実際の実行結果です。確認したKong経由の/api/accounts/balancesのトレースはすべて、nb-kongとnb-backendの" +
          "両方のスパンを含んでいたので、トレースコンテキストはbackendへ引き継がれています(プラグインの" +
          "header_typeはデフォルトのpreserve)。ここではKongはトレースだけを送ります: メトリクスはprometheusプラグインを" +
          "Prometheusにスクレイプさせる形になりますが、設定していません。全リクエストをサンプリングするのはデモ用で、" +
          "本番向けではありません。",
      },
      {
        heading: "ローカルスタックの先へ",
        body: [
          "計装自体は標準的なOTel SDKのコード(app/telemetry.py)で、通常のOTEL_*環境変数に従います。" +
            "そのためOTEL_EXPORTER_OTLP_ENDPOINT(および必要ならOTEL_EXPORTER_OTLP_HEADERS)を別の" +
            "OTLPバックエンド — 実際のNASEBANALのアプリ群が使っているNewRelicなど — に向けても、コード" +
            "変更なしで動作します。ローカルスタック固有なのはCollector自体の設定" +
            "(observability/otel-collector.yaml)だけです。",
        ],
      },
      {
        heading: "片付け",
        code: [{ code: "make observability:down" }],
        note:
          "終わったら.envのOTEL_EXPORTER_OTLP_ENDPOINT=を空に戻し、apps:restartしてください — そうしない" +
          "と、backendはもう存在しない送信先へのエクスポートをリトライし続けます。observability:resetは" +
          "さらに、保存済みのメトリクス・トレース・ログとGrafanaの状態も消します。",
      },
    ],
  },
};
