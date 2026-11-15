import assert from "node:assert/strict";
import test from "node:test";

import {
  SCHEMA_VERSION,
  USER_REFERENCE_SEC,
  createDefaults,
  formatClock,
  migrateV1Meetings,
  sanitizeChoreography,
  serializeChoreography,
} from "../src/ceremonia/schema.js";

import {
  dancersAt,
  detectMeetings,
  progressAt,
  sortKeyframes,
  spiralPoint,
} from "../src/ceremonia/motion.js";

const flat = (p) => [
  { t: 0, p, ease: "linear" },
  { t: 100, p, ease: "linear" },
];

// ── Schema ───────────────────────────────────────────────────────────────
test("garbage input still produces a valid v2 choreography", () => {
  for (const raw of [null, undefined, 42, "nope", [], { duration: "x" }]) {
    const state = sanitizeChoreography(raw);
    assert.equal(state.version, SCHEMA_VERSION);
    assert.ok(state.duration > 0);
    assert.ok(state.cues.length >= 1);
    assert.ok(state.dancers.david.keyframes.length >= 2);
    assert.ok(state.dancers.ayde.keyframes.length >= 2);
  }
});

test("the default choreography keeps the user-provided 01:44 reference", () => {
  const state = sanitizeChoreography(createDefaults());
  const reference = state.cues.find((cue) => cue.kind === "user-reference");
  assert.ok(reference, "expected a user-reference cue");
  assert.equal(reference.t, USER_REFERENCE_SEC);
  assert.match(reference.label, /01:44/);
});

test("v1 meetings (progress fractions) migrate to cues in seconds", () => {
  const migrated = migrateV1Meetings({ duration: 600, meetings: [0.25, 0.5] });
  assert.deepEqual(
    migrated.map((cue) => cue.t),
    [150, 300],
  );
  assert.ok(migrated.every((cue) => cue.kind === "cue"));

  const state = sanitizeChoreography({
    duration: 600,
    turns: 4,
    meetings: [0.25, 0.5],
  });
  assert.equal(state.version, SCHEMA_VERSION);
  assert.equal(state.cues.length, 2);
  assert.equal(state.cues[0].t, 150);
  assert.equal(state.meetings, undefined);
});

test("out-of-range values are clamped, not trusted", () => {
  const state = sanitizeChoreography({
    duration: -5,
    turns: 999,
    cues: [{ id: "a", t: -40, label: "x" }, { id: "a", t: 10, label: "dup" }],
    settings: { rate: 99, tolerancePx: 999 },
  });
  assert.ok(state.duration >= 1);
  assert.ok(state.turns <= 20);
  assert.equal(state.settings.rate, 1.5);
  assert.equal(state.settings.tolerancePx, 60);
  assert.equal(state.cues.filter((cue) => cue.id === "a").length, 1);
  assert.ok(state.cues.every((cue) => cue.t >= 0 && cue.t <= state.duration));
});

test("export → import roundtrip is lossless", () => {
  const state = sanitizeChoreography({
    duration: 500,
    turns: 6.2,
    dancers: {
      david: { keyframes: [{ t: 0, p: 0 }, { t: 250, p: 0.4, ease: "easeIn" }] },
      ayde: { keyframes: [{ t: 30, p: 0.1 }, { t: 500, p: 1 }] },
    },
    cues: [{ id: "cue-1", t: 104, label: "Intro", kind: "cue" }],
    settings: { rate: 1.25, loop: true, tolerancePx: 18 },
  });
  const json = serializeChoreography(state);
  assert.deepEqual(JSON.parse(json), state);
  assert.deepEqual(sanitizeChoreography(JSON.parse(json)), state);
  assert.ok(!/blob|audio\//iu.test(json), "exported JSON must not include audio");
});

test("formatClock renders mm:ss", () => {
  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(75), "01:15");
  assert.equal(formatClock(USER_REFERENCE_SEC), "01:44");
  assert.equal(formatClock(-9), "00:00");
});

// ── Motion math ──────────────────────────────────────────────────────────
test("progress holds before the first and after the last keyframe", () => {
  const keyframes = [
    { t: 10, p: 0.2, ease: "linear" },
    { t: 20, p: 0.8, ease: "linear" },
  ];
  assert.equal(progressAt(keyframes, 0), 0.2);
  assert.equal(progressAt(keyframes, 15), 0.5);
  assert.equal(progressAt(keyframes, 99), 0.8);
});

test("keyframe easing shapes the segment", () => {
  const linear = [{ t: 0, p: 0 }, { t: 10, p: 1, ease: "linear" }];
  const easeIn = [{ t: 0, p: 0 }, { t: 10, p: 1, ease: "easeIn" }];
  assert.equal(progressAt(linear, 5), 0.5);
  assert.equal(progressAt(easeIn, 5), 0.25);
});

test("unsorted keyframes are sorted by time (input is not mutated)", () => {
  const keyframes = [
    { t: 10, p: 1, ease: "linear" },
    { t: 0, p: 0, ease: "linear" },
  ];
  const copy = [...keyframes];
  assert.equal(progressAt(keyframes, 5), 0.5);
  assert.deepEqual(keyframes, copy);
  assert.deepEqual(
    sortKeyframes(keyframes).map((kf) => kf.t),
    [0, 10],
  );
});

test("both dancers converge on the center at progress 1", () => {
  const david = spiralPoint(0, 1, 5.8);
  const ayde = spiralPoint(1, 1, 5.8);
  assert.equal(Math.round(david.x), 180);
  assert.equal(Math.round(david.y), 172);
  assert.deepEqual(david, ayde);
});

test("a meeting requires both dancers at the same place at the same time", () => {
  const state = {
    duration: 100,
    turns: 5.8,
    settings: { tolerancePx: 14 },
    dancers: { david: { keyframes: flat(1) }, ayde: { keyframes: flat(1) } },
  };
  const meetings = detectMeetings(state);
  assert.equal(meetings.length, 1);
  assert.ok(meetings[0].t > 0);
  assert.ok(meetings[0].duration > 90);
});

test("a path crossing without simultaneity is NOT a meeting", () => {
  const state = {
    duration: 100,
    turns: 5.8,
    settings: { tolerancePx: 14 },
    dancers: { david: { keyframes: flat(0) }, ayde: { keyframes: flat(1) } },
  };
  assert.deepEqual(detectMeetings(state), []);
});

test("meeting detection respects the configured tolerance", () => {
  const state = {
    duration: 100,
    turns: 5.8,
    settings: { tolerancePx: 14 },
    dancers: {
      david: { keyframes: flat(1) },
      ayde: {
        keyframes: [
          { t: 0, p: 0, ease: "linear" },
          { t: 40, p: 1, ease: "linear" },
          { t: 60, p: 1, ease: "linear" },
          { t: 100, p: 0, ease: "linear" },
        ],
      },
    },
  };
  const meetings = detectMeetings(state);
  assert.equal(meetings.length, 1);
  assert.ok(meetings[0].t >= 42 && meetings[0].t <= 58, `t=${meetings[0].t}`);
  assert.ok(meetings[0].duration >= 18);
  assert.ok(detectMeetings(state, { tolerancePx: 2 }).length <= 1);
});

test("dancersAt follows only the audio time it is given", () => {
  const state = {
    duration: 100,
    turns: 5.8,
    dancers: {
      david: { keyframes: [{ t: 0, p: 0 }, { t: 100, p: 1 }] },
      ayde: { keyframes: flat(1) },
    },
  };
  assert.deepEqual(dancersAt(state, 0), dancersAt(state, 0));
  const mid = dancersAt(state, 50);
  const end = dancersAt(state, 100);
  assert.notDeepEqual(mid.david, end.david);
  assert.deepEqual(mid.ayde, end.ayde);
});

test("meeting detection is a no-op without a duration", () => {
  assert.deepEqual(detectMeetings({ duration: 0 }), []);
});

