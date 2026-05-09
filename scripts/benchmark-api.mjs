#!/usr/bin/env node

import { performance } from "node:perf_hooks";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const prefixed = `--${name}=`;
  const found = args.find((item) => item.startsWith(prefixed));
  if (!found) {
    return fallback;
  }
  return found.slice(prefixed.length);
};

const baseUrl = getArg("base-url", process.env.BENCH_BASE_URL ?? "http://localhost:3000");
const appId = getArg("app-id", process.env.BENCH_APP_ID ?? "demo-app");
const requests = Number(getArg("requests", process.env.BENCH_REQUESTS ?? "1000"));
const concurrency = Number(getArg("concurrency", process.env.BENCH_CONCURRENCY ?? "30"));
const batchSize = Number(getArg("batch-size", process.env.BENCH_BATCH_SIZE ?? "20"));

const adminEmail = process.env.BENCH_ADMIN_EMAIL ?? "admin@local.test";
const adminPassword = process.env.BENCH_ADMIN_PASSWORD ?? "admin123";

const percentile = (sortedValues, p) => {
  if (!sortedValues.length) {
    return 0;
  }
  const rank = Math.ceil((p / 100) * sortedValues.length) - 1;
  const index = Math.max(0, Math.min(rank, sortedValues.length - 1));
  return sortedValues[index];
};

const formatMs = (value) => `${value.toFixed(2)} ms`;

const buildSummary = (name, latenciesMs, statuses, totalMs) => {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const avg = latenciesMs.reduce((sum, item) => sum + item, 0) / Math.max(latenciesMs.length, 1);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const rps = latenciesMs.length / (totalMs / 1000);

  return {
    name,
    requests: latenciesMs.length,
    statuses,
    avg,
    p50,
    p95,
    p99,
    rps
  };
};

const printSummary = (summary) => {
  console.log(`\n=== ${summary.name} ===`);
  console.log(`requests: ${summary.requests}`);
  console.log(`statuses: ${JSON.stringify(summary.statuses)}`);
  console.log(`avg: ${formatMs(summary.avg)}`);
  console.log(`p50: ${formatMs(summary.p50)}`);
  console.log(`p95: ${formatMs(summary.p95)}`);
  console.log(`p99: ${formatMs(summary.p99)}`);
  console.log(`throughput: ${summary.rps.toFixed(2)} req/s`);
};

const runBenchmark = async (name, makeRequest, totalRequests, workersCount) => {
  const latenciesMs = [];
  const statuses = {};
  let next = 0;

  const startedAt = performance.now();

  const workers = Array.from({ length: workersCount }, async () => {
    while (true) {
      const id = next;
      next += 1;
      if (id >= totalRequests) {
        return;
      }

      const requestStarted = performance.now();
      try {
        const response = await makeRequest(id);
        const elapsed = performance.now() - requestStarted;
        latenciesMs.push(elapsed);
        statuses[response.status] = (statuses[response.status] ?? 0) + 1;
      } catch {
        const elapsed = performance.now() - requestStarted;
        latenciesMs.push(elapsed);
        statuses.error = (statuses.error ?? 0) + 1;
      }
    }
  });

  await Promise.all(workers);
  const totalMs = performance.now() - startedAt;
  return buildSummary(name, latenciesMs, statuses, totalMs);
};

const makeEventBatch = (size, app, experimentKey, subjectPrefix) => {
  const nowIso = new Date().toISOString();
  return {
    events: Array.from({ length: size }, (_, index) => ({
      event_id: `bench-${subjectPrefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      app_id: app,
      subject_key: `${subjectPrefix}-${index}`,
      experiment_key: experimentKey,
      variant_key: "A",
      type: "impression",
      ts: nowIso,
      meta: { source: "benchmark" }
    }))
  };
};

const loginAdmin = async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });

  if (!response.ok) {
    return "";
  }

  const data = await response.json();
  return typeof data.accessToken === "string" ? data.accessToken : "";
};

const pickExperimentKey = async () => {
  const response = await fetch(
    `${baseUrl}/sdk/experiments/active?appId=${encodeURIComponent(appId)}`
  );
  if (!response.ok) {
    return "__benchmark_missing_experiment__";
  }

  const data = await response.json();
  const experiments = Array.isArray(data?.experiments) ? data.experiments : [];
  const first = experiments[0];
  return typeof first?.key === "string"
    ? first.key
    : "__benchmark_missing_experiment__";
};

const main = async () => {
  console.log("AB Platform API benchmark");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        appId,
        requests,
        concurrency,
        batchSize
      },
      null,
      2
    )
  );

  const getActiveSummary = await runBenchmark(
    "GET /sdk/experiments/active",
    () =>
      fetch(
        `${baseUrl}/sdk/experiments/active?appId=${encodeURIComponent(appId)}`
      ),
    requests,
    concurrency
  );
  printSummary(getActiveSummary);

  const experimentKey = await pickExperimentKey();
  const postEventsSummary = await runBenchmark(
    `POST /sdk/events/batch (batchSize=${batchSize})`,
    (id) =>
      fetch(`${baseUrl}/sdk/events/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          makeEventBatch(batchSize, appId, experimentKey, `subject-${id}`)
        )
      }),
    requests,
    concurrency
  );
  printSummary(postEventsSummary);

  const token = await loginAdmin();
  if (!token) {
    console.log("\n=== GET /admin/analytics/... skipped (no admin token) ===");
    return;
  }

  const analyticsSummary = await runBenchmark(
    "GET /admin/analytics/feature-toggles/:experimentKey",
    () =>
      fetch(
        `${baseUrl}/admin/analytics/feature-toggles/${encodeURIComponent(
          experimentKey
        )}?appId=${encodeURIComponent(appId)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ),
    requests,
    concurrency
  );
  printSummary(analyticsSummary);
};

void main();

