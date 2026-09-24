// Cumulative request/failure counts from two real runs of the scenario 2
// comparison (300 users, spawn rate 100, 40s), one sample per second:
// [seconds since start, requests completed, of which failed].
//
// Source: locust/logs/<run>/locust_stats_history.csv. Locust only records
// aggregate rows there, so:
//  - the Kafka run is used as-is (its only request type is the Kafka produce);
//  - the direct-REST run also counts the 279 POST /auth/login calls each
//    simulated user makes on start - all of them successful and all completed
//    by t=7s (locust_stats.csv of the same run: /auth/login 279 requests, 0
//    failures; POST /accounts 78 requests, 66 failures) - so those 279 are
//    subtracted, and the series starts at t=7s, the first sample from which
//    the remaining count is unambiguous. What's left is POST /accounts alone,
//    ending at exactly the 78 / 66 that locust_stats.csv reports.
// A rate is undefined until the first request completes, so a series starts
// there rather than at zero.

// locust/logs/20260923_135153 - locustfile_http_overload.py, POST /accounts
export const restOverloadRun: [number, number, number][] = [
  [7, 4, 0],
  [8, 4, 0],
  [9, 4, 0],
  [10, 4, 0],
  [11, 4, 0],
  [12, 4, 0],
  [13, 4, 0],
  [14, 4, 0],
  [15, 4, 0],
  [16, 4, 0],
  [17, 4, 0],
  [18, 4, 0],
  [19, 4, 0],
  [20, 4, 0],
  [21, 4, 0],
  [22, 4, 0],
  [23, 4, 0],
  [24, 4, 0],
  [25, 4, 0],
  [26, 4, 0],
  [27, 4, 0],
  [28, 4, 0],
  [29, 4, 0],
  [30, 4, 0],
  [31, 4, 0],
  [32, 4, 0],
  [33, 4, 0],
  [34, 4, 0],
  [35, 4, 0],
  [36, 13, 9],
  [37, 13, 9],
  [38, 13, 9],
  [39, 78, 66],
  [40, 78, 66],
];

// locust/logs/20260922_093103 - locustfile_kafka.py, produce to Kafka
export const kafkaProduceRun: [number, number, number][] = [
  [3, 33243, 0],
  [4, 33243, 0],
  [5, 33243, 0],
  [6, 157886, 0],
  [7, 157886, 0],
  [8, 157886, 0],
  [9, 306886, 0],
  [10, 306886, 0],
  [11, 306886, 0],
  [12, 434986, 0],
  [13, 434986, 0],
  [14, 434986, 0],
  [15, 563186, 0],
  [16, 563186, 0],
  [17, 563186, 0],
  [18, 670286, 0],
  [19, 670286, 0],
  [20, 670286, 0],
  [21, 811686, 0],
  [22, 811686, 0],
  [23, 811686, 0],
  [24, 939386, 0],
  [25, 939386, 0],
  [26, 939386, 0],
  [27, 1083286, 0],
  [28, 1083286, 0],
  [29, 1083286, 0],
  [30, 1200086, 0],
  [31, 1200086, 0],
  [32, 1200086, 0],
  [33, 1322486, 0],
  [34, 1322486, 0],
  [35, 1322486, 0],
  [36, 1445286, 0],
  [37, 1445286, 0],
  [38, 1445286, 0],
  [39, 1576886, 0],
  [40, 1576886, 0],
];
