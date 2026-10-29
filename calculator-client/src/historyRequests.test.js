import assert from "node:assert/strict";
import test from "node:test";

const historyRequests = await import("./historyRequests.js").catch(() => ({}));

test("only the latest history request may update state", () => {
  assert.equal(typeof historyRequests.createLatestRequestGate, "function");

  const gate = historyRequests.createLatestRequestGate();
  const firstRequest = gate.begin();
  const secondRequest = gate.begin();

  assert.equal(gate.isLatest(firstRequest), false);
  assert.equal(gate.isLatest(secondRequest), true);

  gate.invalidate();

  assert.equal(gate.isLatest(secondRequest), false);
});
