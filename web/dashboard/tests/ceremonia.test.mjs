import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_DURATION,
  SCHEMA_VERSION,
  USER_REFERENCE_SEC,
  createDefaults,
  formatClock,
  migrateV1Meetings,
  rescaleChoreography,
  sanitizeChoreography,
  serializeChoreography,
} from "../src/ceremonia/schema.js";

import {
  dancersAt,
  detectMeetings,
  pathMetersTotal,
  progressAt,
  progressForArcFraction,
  arcLengthPx,
  solveTurnsForSpeed,
  sortKeyframes,
  spiralPoint,
  spinDegrees,
  uniformSpeedKeyframes,
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

test("the default timeline is the real track length (11:44)", () => {
  const state = sanitizeChoreography(null);
  assert.equal(state.duration, DEFAULT_DURATION);
  assert.equal(DEFAULT_DURATION, 704);
  assert.equal(formatClock(state.duration), "11:44");
});

test("a stored v2 state with the 10:30 placeholder is migrated to 11:44", () => {
  const storedV2 = {
    version: 2,
    duration: 630,
    cues: [{ id: "user-reference-104", t: 104, label: "ref", kind: "user-reference" }],
    dancers: {
      david: { keyframes: [{ t: 0, p: 0 }, { t: 630, p: 1 }] },
      ayde: {
        keyframes: [
          { t: 0, p: 0, ease: "linear" },
          { t: 50.4, p: 0, ease: "easeInOut" },
          { t: 630, p: 1, ease: "easeOut" },
        ],
      },
    },
  };
  const state = sanitizeChoreography(storedV2);
  assert.equal(state.version, SCHEMA_VERSION);
  assert.equal(state.duration, 704);
  assert.equal(formatClock(state.duration), "11:44");
  assert.equal(state.dancers.david.keyframes.at(-1).t, 704);
  assert.ok(state.dancers.ayde.keyframes.length >= 20);
  assert.equal(state.dancers.ayde.keyframes.at(-1).t, 704);
  assert.equal(state.cues[0].t, 104);
});

test("a v3 state keeps a duration the human chose on purpose", () => {
  const state = sanitizeChoreography({
    version: 3,
    duration: 630,
    dancers: {
      david: { keyframes: [{ t: 0, p: 0 }, { t: 630, p: 1 }] },
      ayde: {
        keyframes: [
          { t: 0, p: 0, ease: "linear" },
          { t: 50.4, p: 0, ease: "easeInOut" },
          { t: 630, p: 1, ease: "easeOut" },
        ],
      },
    },
  });
  assert.equal(state.duration, 630, "v3 duration is respected");
  assert.ok(state.dancers.ayde.keyframes.length >= 20, "motion upgraded to uniform");
});

test("both dancers start moving from the first seconds", () => {
  const state = sanitizeChoreography(null);
  const david = (t) => progressAt(state.dancers.david.keyframes, t);
  const ayde = (t) => progressAt(state.dancers.ayde.keyframes, t);
  for (const at of [david, ayde]) {
    assert.ok(at(10) > 0, "must move within the first 10 s");
    assert.ok(at(60) > at(10), "progress must keep growing");
    assert.ok(at(704) === 1, "must reach the center at the end");
  }
});

test("the v2 artificial 8% hold on Aydé is repaired", () => {
  const legacy = {
    version: 2,
    duration: 703,
    dancers: {
      david: { keyframes: [{ t: 0, p: 0 }, { t: 703, p: 1 }] },
      ayde: {
        keyframes: [
          { t: 0, p: 0, ease: "linear" },
          { t: 56.24, p: 0, ease: "easeInOut" },
          { t: 703, p: 1, ease: "easeOut" },
        ],
      },
    },
  };
  const state = sanitizeChoreography(legacy);
  assert.ok(state.dancers.ayde.keyframes.length >= 20, "uniform walk replaces it");
  assert.ok(progressAt(state.dancers.ayde.keyframes, 10) > 0);
});

test("rescale keeps the shape and clamps cues to the new end", () => {
  const base = sanitizeChoreography({
    duration: 630,
    dancers: {
      david: { keyframes: [{ t: 0, p: 0 }, { t: 630, p: 1 }] },
      ayde: { keyframes: [{ t: 0, p: 0 }, { t: 315, p: 0.5 }] },
    },
  });

  const longer = rescaleChoreography(base, 703);
  assert.equal(longer.duration, 703);
  assert.equal(longer.dancers.david.keyframes.at(-1).t, 703);
  assert.equal(longer.dancers.ayde.keyframes.at(-1).t, 351.5);
  assert.equal(longer.cues.find((cue) => cue.kind === "user-reference").t, 104);

  const shorter = rescaleChoreography(longer, 90);
  assert.equal(shorter.duration, 90);
  assert.ok(shorter.cues.every((cue) => cue.t <= 90));
  assert.equal(shorter.track.referenceSec, 90);
  assert.equal(shorter.dancers.david.keyframes.at(-1).t, 90);
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

// ── Constant linear speed (arc length) ───────────────────────────────────
const TURNS = 5.8;

test("arc length is monotonic and its inverse round-trips", () => {
  let previous = -1;
  for (let i = 0; i <= 20; i += 1) {
    const length = arcLengthPx(i / 20, TURNS);
    assert.ok(length >= previous, "arc length must not decrease");
    previous = length;
  }
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    const p = progressForArcFraction(fraction, TURNS);
    const back = arcLengthPx(p, TURNS) / arcLengthPx(1, TURNS);
    assert.ok(Math.abs(back - fraction) < 1e-3, `${fraction} → ${back}`);
  }
});

test("the default walk covers equal distance in equal time", () => {
  const keyframes = uniformSpeedKeyframes(704, TURNS, 20);
  const total = arcLengthPx(1, TURNS);
  const steps = [];
  for (let i = 1; i < keyframes.length; i += 1) {
    steps.push(arcLengthPx(keyframes[i].p, TURNS) - arcLengthPx(keyframes[i - 1].p, TURNS));
  }
  const expected = total / (keyframes.length - 1);
  for (const step of steps) {
    assert.ok(
      Math.abs(step - expected) / expected < 0.02,
      `step ${step.toFixed(2)} vs ${expected.toFixed(2)}`,
    );
  }
});

test("near the center the angular speed rises while the linear speed holds", () => {
  const keyframes = uniformSpeedKeyframes(704, TURNS, 20);
  const at = (t) => progressAt(keyframes, t);
  const speed = (t1, t2) => arcLengthPx(at(t2), TURNS) - arcLengthPx(at(t1), TURNS);
  const outer = speed(0, 35.2);
  const inner = speed(668.8, 704);
  // Equal distance in equal time, even though the radius collapsed.
  assert.ok(Math.abs(outer - inner) / outer < 0.03, `${outer} vs ${inner}`);
});

test("real scale: meters scale linearly with the radius", () => {
  const four = pathMetersTotal(TURNS, 4);
  const eight = pathMetersTotal(TURNS, 8);
  assert.ok(Math.abs(eight - 2 * four) < 1e-6);
  const speed = four / 704;
  assert.ok(speed > 0 && speed < 1, `speed ${speed}`);
});

test("self-rotation: one full turn per body circumference walked", () => {
  const bodyRadius = 0.28;
  const circumference = 2 * Math.PI * bodyRadius;
  // Find the progress whose walked distance equals one circumference.
  const totalPx = arcLengthPx(1, TURNS);
  const pxPerMeter = totalPx / pathMetersTotal(TURNS, 4);
  const targetPx = circumference * pxPerMeter;
  const p = progressForArcFraction(targetPx / totalPx, TURNS);
  const degrees = spinDegrees(p, TURNS, 4, bodyRadius);
  assert.ok(Math.abs(degrees - 360) < 2, `spin ${degrees}`);
});

test("solving turns for a target speed lands within 5%", () => {
  const turns = solveTurnsForSpeed({
    duration: 704,
    radiusMeters: 4,
    targetSpeedMps: 0.35,
  });
  assert.ok(turns >= 1 && turns <= 20, `turns ${turns}`);
  const speed = pathMetersTotal(turns, 4) / 704;
  assert.ok(Math.abs(speed - 0.35) / 0.35 < 0.05, `speed ${speed}`);
});


