import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateExpression,
  clearHistory,
  fetchHistory,
} from "./api.js";
import * as calculatorApi from "./api.js";

function jsonResponse(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

test("fetchHistory requests the latest 50 calculations", async () => {
  const calls = [];
  const history = [{ expr: "2 + 3", result: 5 }];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return jsonResponse(history);
  };

  const result = await fetchHistory(fetchImpl);

  assert.deepEqual(result, history);
  assert.deepEqual(calls, [["http://localhost:8000/history?limit=50"]]);
});

test("calculateExpression sends the displayed expression as JSON", async () => {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return jsonResponse({ ok: true, expr: "8 × 7", result: 56, error: "" });
  };

  const result = await calculateExpression("8 × 7", fetchImpl);

  assert.equal(result.result, 56);
  assert.deepEqual(calls, [
    [
      "http://localhost:8000/calculate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expr: "8 × 7" }),
      },
    ],
  ]);
});

test("calculateExpression rejects an unsuccessful calculation", async () => {
  const fetchImpl = async () =>
    jsonResponse({ ok: false, error: "Invalid expression" });

  await assert.rejects(
    calculateExpression("2 +", fetchImpl),
    /Invalid expression/,
  );
});

test("clearHistory deletes server history", async () => {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return jsonResponse({ ok: true, cleared: true });
  };

  await clearHistory(fetchImpl);

  assert.deepEqual(calls, [
    ["http://localhost:8000/history", { method: "DELETE" }],
  ]);
});

test("calculateAndFetchHistory calculates before refreshing history", async () => {
  assert.equal(typeof calculatorApi.calculateAndFetchHistory, "function");

  const calls = [];
  const history = [{ expr: "8 × 7", result: 56 }];
  const fetchImpl = async (url, options) => {
    calls.push([url, options]);

    if (url.endsWith("/calculate")) {
      return jsonResponse({
        ok: true,
        expr: "8 × 7",
        result: 56,
        error: "",
      });
    }

    return jsonResponse(history);
  };

  const result = await calculatorApi.calculateAndFetchHistory(
    "8 × 7",
    fetchImpl,
  );

  assert.deepEqual(result, {
    calculation: { ok: true, expr: "8 × 7", result: 56, error: "" },
    history,
    historyError: null,
  });
  assert.deepEqual(
    calls.map(([url]) => url),
    [
      "http://localhost:8000/calculate",
      "http://localhost:8000/history?limit=50",
    ],
  );
});

test("calculateAndFetchHistory preserves a successful result when history refresh fails", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/calculate")) {
      return jsonResponse({
        ok: true,
        expr: "2 + 2",
        result: 4,
        error: "",
      });
    }

    throw new Error("History is offline");
  };

  const result = await calculatorApi.calculateAndFetchHistory(
    "2 + 2",
    fetchImpl,
  );

  assert.equal(result.calculation.result, 4);
  assert.equal(result.history, null);
  assert.match(result.historyError.message, /History is offline/);
});

test("clearAndFetchHistory clears before refreshing history", async () => {
  assert.equal(typeof calculatorApi.clearAndFetchHistory, "function");

  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push([url, options]);

    return url.endsWith("/history") && options?.method === "DELETE"
      ? jsonResponse({ ok: true, cleared: true })
      : jsonResponse([]);
  };

  const result = await calculatorApi.clearAndFetchHistory(fetchImpl);

  assert.deepEqual(result, { history: [], historyError: null });
  assert.deepEqual(calls, [
    ["http://localhost:8000/history", { method: "DELETE" }],
    ["http://localhost:8000/history?limit=50", undefined],
  ]);
});

test("clearAndFetchHistory preserves a successful clear when refresh fails", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push([url, options]);

    if (options?.method === "DELETE") {
      return jsonResponse({ ok: true, cleared: true });
    }

    throw new Error("History is offline");
  };

  const result = await calculatorApi.clearAndFetchHistory(fetchImpl);

  assert.deepEqual(result.history, []);
  assert.match(result.historyError.message, /History is offline/);
  assert.equal(calls.length, 2);
});
