import assert from "node:assert/strict";
import test from "node:test";

import {
  addMinutes,
  languageSplit,
  simulateReception,
} from "../src/venue/flow.js";

// ── Language split ───────────────────────────────────────────────────────
test("the guest list splits left (FR) and right (ES)", () => {
  assert.deepEqual(languageSplit({ people: 150, frenchPercent: 40 }), {
    total: 150,
    french: 60,
    spanish: 90,
  });
  assert.deepEqual(languageSplit({ people: 150, frenchPercent: 0 }), {
    total: 150,
    french: 0,
    spanish: 150,
  });
  assert.deepEqual(languageSplit({ people: 150, frenchPercent: 100 }), {
    total: 150,
    french: 150,
    spanish: 0,
  });
  assert.deepEqual(languageSplit({ people: 0, frenchPercent: 40 }), {
    total: 0,
    french: 0,
    spanish: 0,
  });
});

test("clock arithmetic wraps past midnight", () => {
  assert.equal(addMinutes("18:30", 12.5), "18:43");
  assert.equal(addMinutes("18:30", 0), "18:30");
  assert.equal(addMinutes("23:50", 20), "00:10");
  assert.equal(addMinutes("nope", 20), "");
});

// ── Reception simulation ─────────────────────────────────────────────────
test("if arrivals are slower than the greeting, nobody queues", () => {
  const plan = simulateReception({
    people: 150,
    greeters: 1,
    secondsPerGroup: 8,
    abreast: 1,
    windowMinutes: 30,
  });
  assert.equal(plan.groups, 150);
  assert.equal(plan.maxQueue, 0);
  assert.equal(plan.maxWaitSeconds, 0);
  // Last guest leaves just before the 30 min window closes.
  assert.ok(plan.lastEndMinutes > 29 && plan.lastEndMinutes < 30);
  assert.equal(plan.endClock, addMinutes("18:30", plan.lastEndMinutes));
});

test("a short arrival window builds a queue and the greeter sets the pace", () => {
  const plan = simulateReception({
    people: 150,
    greeters: 1,
    secondsPerGroup: 8,
    abreast: 1,
    windowMinutes: 10,
  });
  // 150 guests × 8 s = 1200 s: the door, not the arrivals, decides the end.
  assert.ok(Math.abs(plan.lastEndSeconds - 1200) <= 8);
  assert.ok(plan.maxQueue > 0, `queue ${plan.maxQueue}`);
  assert.ok(plan.maxWaitSeconds > 500, `wait ${plan.maxWaitSeconds}`);
  assert.ok(plan.perMinute > 7 && plan.perMinute < 8);
});

test("two greeters halve the time; pairs halve the groups", () => {
  const one = simulateReception({
    people: 150,
    greeters: 1,
    secondsPerGroup: 8,
    windowMinutes: 10,
  });
  const two = simulateReception({
    people: 150,
    greeters: 2,
    secondsPerGroup: 8,
    windowMinutes: 10,
  });
  const pairs = simulateReception({
    people: 150,
    greeters: 1,
    secondsPerGroup: 8,
    abreast: 2,
    windowMinutes: 10,
  });
  assert.ok(Math.abs(two.lastEndSeconds * 2 - one.lastEndSeconds) < 20);
  assert.equal(pairs.groups, 75);
  assert.ok(Math.abs(pairs.lastEndSeconds - 75 * 8) < 20);
});

test("the reception is deterministic and keeps the language split", () => {
  const input = { people: 150, frenchPercent: 40, secondsPerGroup: 8 };
  const a = simulateReception(input);
  const b = simulateReception(input);
  assert.deepEqual(a, b);
  assert.equal(a.split.french + a.split.spanish, 150);
  assert.equal(a.timeline.length, a.groups);
});

test("zero guests is a no-op, not a crash", () => {
  const plan = simulateReception({ people: 0 });
  assert.equal(plan.groups, 0);
  assert.equal(plan.lastEndSeconds, 0);
  assert.equal(plan.maxQueue, 0);
  assert.deepEqual(plan.split, { total: 0, french: 0, spanish: 0 });
});
