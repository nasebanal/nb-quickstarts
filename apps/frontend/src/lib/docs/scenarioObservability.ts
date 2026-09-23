import type { LocalizedDocsPage } from "./types";

export const scenarioObservability: LocalizedDocsPage = {
  en: {
    title: "Scenario 3: Observability",
    description:
      "The backend can export OpenTelemetry traces (FastAPI requests + SQLAlchemy queries) and HTTP " +
      "server metrics over OTLP - off by default, so apps:up behaves exactly as before unless it's " +
      "explicitly turned on. This scenario turns it on, then watches an HTTP overload run happen live " +
      "in Grafana.",
    sections: [
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
            { text: "Prometheus scrape targets:" },
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
          ],
        },
        note:
          "Real, freshly-captured output. Tempo can briefly report NOT ready right after " +
          "observability:up (still starting) even though traces are already landing - re-run " +
          "observability:verify a few seconds later if you see that.",
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
        ],
        note:
          "5xx ratio showed No data on the same real run this screenshot is from - its query needs more " +
          "sustained 5xx volume in its rate window than a single 40s burst reliably produces. Latency " +
          "and DB connections in use are the two panels that reliably move on this exact scenario; try " +
          "the heavier 600/200 run from Scenario 2 if you want to see 5xx ratio move too. Run the same " +
          "load through Kafka afterward (Scenario 2, step 4) with Grafana still open, and every one of " +
          "these panels stays flat instead.",
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
          "you're done - otherwise the backend keeps retrying an export target that's no longer there.",
      },
    ],
  },
  ja: {
    title: "シナリオ3: オブザーバビリティ",
    description:
      "backendはOpenTelemetryのトレース(FastAPIのリクエスト + SQLAlchemyのクエリ)とHTTPサーバー" +
      "メトリクスをOTLPで送信できます — デフォルトはオフなので、明示的に有効化しない限りapps:upの挙動は" +
      "従来と変わりません。このシナリオではそれを有効化したうえで、HTTP overload実行の様子をGrafana上で" +
      "ライブに観察します。",
    sections: [
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
            { text: "Prometheus scrape targets:" },
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
          ],
        },
        note:
          "実際に取得した出力です。observability:up直後はTempoがまだ起動中でNOT readyと出ることが" +
          "ありますが、その状態でもトレース自体はすでに届いていることがあります — その場合は数秒待って" +
          "observability:verifyを再実行してください。",
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
        ],
        note:
          "この画面の元になった実際の実行では、5xx比率はNo dataのままでした — そのクエリのrate windowが" +
          "必要とする継続的な5xx量を、40秒程度の単発バーストでは安定して出せないためです。今回の設定で" +
          "確実に動くのはレイテンシと使用中のDB接続数の2パネルです。5xx比率も動かしたい場合は、シナリオ2の" +
          "より重い600/200実行を試してください。この後、Grafanaを開いたままシナリオ2のstep 4(Kafka経由)で" +
          "同じ負荷を流すと、これらのパネルはすべて平坦なまま推移します。",
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
          "と、backendはもう存在しない送信先へのエクスポートをリトライし続けます。",
      },
    ],
  },
};
