import { kafkaProduceRun, restOverloadRun } from "./locustSeries";
import type { LocalizedDocsPage } from "./types";

const EN_CHART_LABELS = {
  success: "Success",
  failure: "Failure",
  time: "Elapsed (s)",
  requests: "Requests",
  failures: "Failed",
  summary: "Success rate and failure rate over time",
  showTable: "Show data as a table",
};

const JA_CHART_LABELS = {
  success: "成功",
  failure: "失敗",
  time: "経過時間(秒)",
  requests: "リクエスト数",
  failures: "失敗数",
  summary: "成功率と失敗率の時系列推移",
  showTable: "データを表で表示",
};

export const scenarioKafka: LocalizedDocsPage = {
  en: {
    title: "Scenario 2: Switch to Kafka",
    description:
      "kafka-bridge is a small standalone consumer that reads events off a Kafka topic and forwards " +
      "each one to the real backend via POST /accounts - the same write every other client uses. This " +
      "scenario measures why that indirection is worth it: the same Locust load, sent down two " +
      "different paths into the same backend.",
    sections: [
      {
        heading: "Why Kafka",
        bullets: [
          "Absorbs bursts: producers write to a durable log at their own pace while the consumer drains it at a steady rate, so a traffic spike doesn't overwhelm the backend.",
          "No lost events: messages are retained until consumed, so a backend outage only delays processing instead of dropping data.",
          "Decoupled: producers and consumers don't know about each other, so either side can be added, scaled or replaced independently.",
        ],
      },
      {
        heading: "1. Start the target and both paths in",
        code: [
          {
            code: "make apps:up\nmake kafka:up && make kafka:bridge-up",
          },
        ],
      },
      {
        heading: "2. Direct REST - this is the one that errors",
        body: [
          "locustfile_http_overload.py hammers POST /accounts directly. At this repo's own default " +
            "limits (SQLAlchemy's default connection pool, a single uvicorn worker in --reload mode), " +
            "it starts failing once the load is heavy enough.",
        ],
        code: [
          {
            code: "make locust:test LOCUST_FILE=locustfile_http_overload.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s",
          },
        ],
        note:
          "Or with the UI: make locust:up LOCUST_FILE=locustfile_http_overload.py, then enter 300 / 100 " +
          "at http://localhost:8089. A fresh run of this exact command, in this environment: 78 " +
          "requests, 66 failed (84.62%) - HTTPError 500s and ConnectionResetError, median 32s. Exact " +
          "numbers move with your own hardware; a high failure rate and a median near the 30s DB-pool " +
          "timeout is the part that should reproduce.",
      },
      {
        heading: "3. Wait for the backend to recover",
        body: [
          "After a run this heavy it stays unresponsive for roughly 90 seconds, until the DB-pool " +
            "waits queued up behind it time out.",
        ],
        code: [{ code: "until curl -sf -m 5 http://localhost:8080/health >/dev/null; do sleep 10; done" }],
      },
      {
        heading: "4. The same load through Kafka",
        code: [
          {
            code: "make locust:test LOCUST_FILE=locustfile_kafka.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s",
          },
        ],
        note:
          "make locust:up LOCUST_FILE=locustfile_kafka.py with the same 300 / 100 in the UI works too. " +
          "Use make locust:restart to switch cleanly between the two in UI mode.",
      },
      {
        heading: "Measured results",
        body: [
          "Same event, same volume, two paths in - use the same users/spawn rate for both. These are " +
            "the settings where direct REST fails on a single laptop with this repo's default limits.",
        ],
        table: {
          headers: ["Users / spawn rate", "Run time", "Direct REST", "Via Kafka"],
          rows: [
            ["100 / 20", "30s", "0% failures, but median already ~220ms - too light to show errors", "-"],
            [
              "300 / 100",
              "40s",
              "66 of 78 POST /accounts failed (84.6%) in the run charted below, median at the 30s DB-pool timeout - earlier runs landed nearer ~30%, so expect it to vary",
              "1.66M events, 0% failures, ~4ms median",
            ],
            [
              "600 / 200",
              "60s",
              "~79% failures (500s, connection resets, 30s+ latency)",
              "1.24M events, 0% failures, ~24ms median",
            ],
          ],
        },
        charts: [
          {
            title: "Direct REST - POST /accounts",
            subtitle: "300 users / 100 spawn rate / 40s. A request counts once it completes, so failures only show up as the 30s timeouts land.",
            points: restOverloadRun,
            xMax: 40,
            labels: EN_CHART_LABELS,
          },
          {
            title: "Via Kafka - produce",
            subtitle: "Same load. A request is the producer's write being acknowledged by Kafka; the backend is fed afterwards by kafka-bridge.",
            points: kafkaProduceRun,
            xMax: 40,
            labels: EN_CHART_LABELS,
          },
        ],
        note:
          "Success rate and failure rate are cumulative (failed / completed requests so far), from " +
          "Locust's own per-second stats history. Direct REST sits at 100% until the first timeouts land " +
          "at ~35s - the 300 users are stuck waiting on the exhausted DB pool the whole time (only " +
          "~4 writes completed in the first 35s) - then collapses to 15% success. Via Kafka the producer " +
          "is never refused: 1.58M writes by 40s, 0 failures.",
      },
      {
        heading: "Why the gap",
        body: [
          "kafka-bridge drains the topic at its own steady, sequential pace and never forwards a burst " +
            "to the backend - the backend never sees more concurrent writes than one consumer, one " +
            "request at a time can generate, no matter how fast the load test produces onto the topic.",
          "That also means the topic keeps draining into the backend long after the Locust run itself " +
            "ends - right after a 300 / 100 run, the bridge's own consumer lag was still around 1.6M " +
            "events.",
        ],
        terminal: {
          lines: [
            {
              text: "$ docker exec nb-kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:29092 --describe --all-groups",
              tone: "muted",
            },
            { text: "GROUP                  TOPIC              PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG" },
            { text: "nb-quickstarts-bridge  quickstart-events  0          745429          1660486         915057", tone: "info" },
            { text: "  ^ real capture, mid-drain: 915,057 events still queued for the bridge to forward" },
          ],
        },
        note:
          "Scenario 3 (Observability) shows this same overload run live in Grafana - 5xx ratio, p95 " +
          "latency and DB connections in use spike during the direct-REST step and stay flat during the " +
          "Kafka one.",
      },
      {
        heading: "Clear the backlog before a fresh comparison",
        code: [{ code: "make kafka:reset" }],
        body: [
          "Confirmed directly: after this, the same consumer-groups --describe command above shows a " +
            "fresh, empty topic - LAG back to 0, ready for another run without last time's backlog still " +
            "draining in the background and skewing the numbers.",
        ],
      },
      {
        heading: "Cleanup",
        code: [{ code: "make kafka:down" }],
      },
    ],
  },
  ja: {
    title: "シナリオ2: Kafka経由への切り替え",
    description:
      "kafka-bridgeは、Kafkaトピックからイベントを読み取り、1件ずつ実際のbackendへPOST /accountsとして" +
      "転送する、小さな独立したconsumerです — 他のどのクライアントとも同じ書き込みです。このシナリオでは、" +
      "その間接化がなぜ価値を持つのかを、同じLocust負荷を2つの異なる経路で同じbackendに流し込んで実測" +
      "します。",
    sections: [
      {
        heading: "Kafkaを使うメリット",
        bullets: [
          "バーストを吸収: 書き込み側は永続化されたログに自分のペースで書き込み、消費側が一定のペースで処理するため、急なトラフィック増でもbackendが溢れません。",
          "イベントを失わない: メッセージは消費されるまで保持されるので、backendが止まっても処理が遅れるだけでデータは失われません。",
          "疎結合: 送る側と受ける側が互いを知らなくてよいため、どちらも独立して追加・スケール・差し替えができます。",
        ],
      },
      {
        heading: "1. テスト対象と両方の経路を起動",
        code: [
          {
            code: "make apps:up\nmake kafka:up && make kafka:bridge-up",
          },
        ],
      },
      {
        heading: "2. REST直叩き — これがエラーになる側",
        body: [
          "locustfile_http_overload.pyはPOST /accountsを直接叩きます。このリポジトリのデフォルト制限" +
            "(SQLAlchemyのデフォルト接続プール、--reloadモードのuvicornワーカー1つ)では、負荷が一定を" +
            "超えると失敗し始めます。",
        ],
        code: [
          {
            code: "make locust:test LOCUST_FILE=locustfile_http_overload.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s",
          },
        ],
        note:
          "UIを使う場合: make locust:up LOCUST_FILE=locustfile_http_overload.pyのうえで、" +
          "http://localhost:8089で300 / 100を入力。このコマンドをそのまま今回の環境で実行した結果: " +
          "78リクエスト中66件失敗(84.62%)— HTTPError 500とConnectionResetError、median 32秒。正確な" +
          "数値は手元のハードウェアによって変わりますが、高い失敗率と30秒のDBプールタイムアウト付近の" +
          "medianという部分は再現するはずです。",
      },
      {
        heading: "3. backendの回復を待つ",
        body: [
          "これだけ重い実行の後は、その背後に溜まったDBプール待ちがタイムアウトするまでの約90秒間、" +
            "backendが応答しなくなります。",
        ],
        code: [{ code: "until curl -sf -m 5 http://localhost:8080/health >/dev/null; do sleep 10; done" }],
      },
      {
        heading: "4. 同じ負荷をKafka経由で",
        code: [
          {
            code: "make locust:test LOCUST_FILE=locustfile_kafka.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s",
          },
        ],
        note:
          "UIでも同様: make locust:up LOCUST_FILE=locustfile_kafka.pyで同じ300 / 100を入力。UIモードで" +
          "両者をきれいに切り替えるにはmake locust:restartを使います。",
      },
      {
        heading: "実測結果",
        body: [
          "同じイベント、同じ量を2つの経路で — 両方とも同じUsers/spawn rateを使います。以下は、1台の" +
            "ノートPC・このリポジトリのデフォルト制限のもとで、REST直叩きが実際に失敗する設定です。",
        ],
        table: {
          headers: ["Users / spawn rate", "実行時間", "REST直叩き", "Kafka経由"],
          rows: [
            ["100 / 20", "30s", "失敗0%、ただし既にmedian ~220ms — エラーを出すには軽すぎる", "-"],
            [
              "300 / 100",
              "40s",
              "下のグラフの実行ではPOST /accounts 78件中66件が失敗(84.6%)、medianは30秒のDBプールタイムアウトに張り付く — 以前の実行では約30%で、ばらつきます",
              "166万件、失敗0%、median約4ms",
            ],
            [
              "600 / 200",
              "60s",
              "失敗率約79%(500エラー・接続リセット・30秒以上のレイテンシ)",
              "124万件、失敗0%、median約24ms",
            ],
          ],
        },
        charts: [
          {
            title: "REST直叩き — POST /accounts",
            subtitle: "300ユーザー / spawn rate 100 / 40秒。リクエストは完了した時点で数えるため、失敗は30秒タイムアウトが返ってくる時点で初めて現れます。",
            points: restOverloadRun,
            xMax: 40,
            labels: JA_CHART_LABELS,
          },
          {
            title: "Kafka経由 — produce",
            subtitle: "同じ負荷。リクエストは「Kafkaがproducerの書き込みを受理したこと」で、backendへはその後kafka-bridgeが流します。",
            points: kafkaProduceRun,
            xMax: 40,
            labels: JA_CHART_LABELS,
          },
        ],
        note:
          "成功率・失敗率は累積(それまでに完了したリクエストのうち成功/失敗した割合)で、Locust自身が" +
          "1秒ごとに記録する統計履歴から作っています。REST直叩きは最初のタイムアウトが返る約35秒まで" +
          "100%のままですが、これは300ユーザーが枯渇したDBプールを待って止まっているためで(最初の35秒間に" +
          "完了した書き込みは約4件だけ)、その後成功率15%まで急落します。Kafka経由ではproducerが拒否されることが" +
          "なく、40秒で158万件を失敗0で書き込めています。",
      },
      {
        heading: "この差が出る理由",
        body: [
          "kafka-bridgeは自分自身の一定で逐次的なペースでトピックを消費し、バーストをbackendに転送する" +
            "ことがありません — 負荷テストがどれだけ速くトピックにproduceしても、backend側は「consumerが" +
            "1件ずつ発行するリクエスト」以上の同時書き込みを一切見ることがありません。",
          "そのため、Locustの実行自体が終わった後も、トピックはしばらくbackendに流れ込み続けます — " +
            "300 / 100の実行直後、bridge自身のconsumer lagはまだ約160万件残っていました。",
        ],
        terminal: {
          lines: [
            {
              text: "$ docker exec nb-kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:29092 --describe --all-groups",
              tone: "muted",
            },
            { text: "GROUP                  TOPIC              PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG" },
            { text: "nb-quickstarts-bridge  quickstart-events  0          745429          1660486         915057", tone: "info" },
            { text: "  ^ 実際のキャプチャ(drain中): bridgeがまだ転送していないイベントが915,057件残っている" },
          ],
        },
        note:
          "シナリオ3(オブザーバビリティ)では、この同じoverload実行をGrafana上でライブに見ます — " +
          "REST直叩きのステップでは5xx比率・p95レイテンシ・使用中のDB接続数が跳ね上がり、Kafka経由の" +
          "ステップでは平坦なままになります。",
      },
      {
        heading: "新しく比較する前に溜まった分をクリア",
        code: [{ code: "make kafka:reset" }],
        body: [
          "実際に確認済み: この後、同じconsumer-groups --describeコマンドを実行すると、トピックが" +
            "まっさらな状態(LAGが0)に戻っていることがわかります — 前回の分がバックグラウンドで" +
            "まだ流れ込み続けて数値を歪めることなく、新しい比較を始められます。",
        ],
      },
      {
        heading: "片付け",
        code: [{ code: "make kafka:down" }],
      },
    ],
  },
};
