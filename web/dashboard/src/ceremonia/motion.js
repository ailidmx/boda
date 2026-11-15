/**
 * Ceremonia Player — motion math.
 *
 * Pure module: no DOM, no audio element, no storage. The panel asks this module
 * "where is each dancer at audio time t?" so the visual can never drift from
 * the audio clock: the clock is always the caller's `t` (an audio `currentTime`).
 *
 * Geometry is identical to the prototype spiral (180,172 / radius 110 / 18px
 * lateral offset) so the drawing keeps the same look.
 */

const STAGE = { cx: 180, cy: 172, radius: 110, offset: 18 };

/** Outer radius of the caracol in viewBox units (110). */
export const STAGE_RADIUS_PX = STAGE.radius;

export const EASING_FNS = {
  linear: (u) => u,
  easeIn: (u) => u * u,
  easeOut: (u) => 1 - (1 - u) * (1 - u),
  easeInOut: (u) => (u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2),
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** Copy + sort so a caller's array is never mutated. */
export function sortKeyframes(keyframes) {
  return [...(keyframes || [])]
    .filter((kf) => Number.isFinite(kf?.t) && Number.isFinite(kf?.p))
    .sort((a, b) => a.t - b.t);
}

/**
 * Normalized progress (0..1) of one dancer at audio time `timeSec`.
 *
 * Before the first keyframe the progress holds; after the last one it holds
 * too. The easing of the SEGMENT END keyframe shapes the interpolation, so a
 * keyframe can be used as an accent ("arrive here fast") without extra state.
 */
export function progressAt(keyframes, timeSec) {
  const list = sortKeyframes(keyframes);
  if (!list.length) return 0;
  const t = Number.isFinite(timeSec) ? timeSec : 0;
  if (t <= list[0].t) return clamp(list[0].p, 0, 1);
  const last = list[list.length - 1];
  if (t >= last.t) return clamp(last.p, 0, 1);

  for (let i = 1; i < list.length; i += 1) {
    const b = list[i];
    if (t > b.t) continue;
    const a = list[i - 1];
    const span = b.t - a.t;
    if (span <= 0) return clamp(b.p, 0, 1);
    const raw = (t - a.t) / span;
    const ease = EASING_FNS[b.ease] || EASING_FNS.linear;
    return clamp(a.p + (b.p - a.p) * ease(raw), 0, 1);
  }
  return clamp(last.p, 0, 1);
}

/**
 * Position on the spiral for `progress` (0 = outer start, 1 = center).
 * `personIndex` 0 = David (left, blue), 1 = Aydé (right, orange).
 */
export function spiralPoint(personIndex, progress, turns, stage = STAGE) {
  const p = clamp(progress, 0, 1);
  const direction = personIndex === 0 ? 1 : -1;
  const startAngle = personIndex === 0 ? Math.PI : 0;
  const angle = startAngle + direction * Math.PI * 2 * turns * p;
  const radius = stage.radius * (1 - p) ** 0.9;
  const cx = stage.cx + (personIndex === 0 ? -stage.offset : stage.offset) * (1 - p);
  return {
    x: cx + radius * Math.cos(angle),
    y: stage.cy + radius * Math.sin(angle),
  };
}

/** Both dancers' positions at audio time `timeSec`. */
export function dancersAt(state, timeSec) {
  const turns = Number.isFinite(state?.turns) ? state.turns : 0;
  const david = spiralPoint(0, progressAt(state?.dancers?.david?.keyframes, timeSec), turns);
  const ayde = spiralPoint(1, progressAt(state?.dancers?.ayde?.keyframes, timeSec), turns);
  return { david, ayde };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Provisional meeting detection: two dancers MEET when they are within
 * `tolerancePx` AT THE SAME TIME. A visual crossing of the two spiral paths is
 * not a meeting — if the paths cross but the dancers are not there together,
 * nothing is reported. Results are suggestions for rehearsal, never musical or
 * choreographic truth.
 *
 * @returns {{t:number,start:number,end:number,duration:number,distance:number}[]}
 */
export function detectMeetings(state, options = {}) {
  const duration = Number.isFinite(state?.duration) ? state.duration : 0;
  if (duration <= 0) return [];
  const tolerancePx = Number.isFinite(options.tolerancePx)
    ? options.tolerancePx
    : state?.settings?.tolerancePx ?? 14;
  const step = Number.isFinite(options.step) ? Math.max(0.05, options.step) : 0.25;
  const minDuration = Number.isFinite(options.minDuration)
    ? options.minDuration
    : 0.5;

  const hits = [];
  for (let t = 0; t <= duration + 1e-9; t += step) {
    const { david, ayde } = dancersAt(state, t);
    const d = distance(david, ayde);
    if (d <= tolerancePx) hits.push({ t: Math.min(t, duration), d });
  }

  const meetings = [];
  let run = null;
  for (const hit of hits) {
    if (!run) {
      run = { start: hit.t, end: hit.t, distance: hit.d };
      continue;
    }
    if (hit.t - run.end <= step + 1e-9) {
      run.end = hit.t;
      run.distance = Math.min(run.distance, hit.d);
      continue;
    }
    if (run) meetings.push(run);
    run = { start: hit.t, end: hit.t, distance: hit.d };
  }
  if (run) meetings.push(run);

  return meetings
    .filter((m) => m.end - m.start + step >= minDuration)
    .map((m) => ({
      t: Math.round(((m.start + m.end) / 2) * 100) / 100,
      start: Math.round(m.start * 100) / 100,
      end: Math.round(m.end * 100) / 100,
      duration: Math.round((m.end - m.start + step) * 100) / 100,
      distance: Math.round(m.distance * 10) / 10,
    }));
}

/** Polyline `d` attribute for the full spiral of one dancer. */
export function spiralPath(personIndex, turns, samples = 480) {
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    const { x, y } = spiralPoint(personIndex, i / samples, turns);
    points.push(`${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(" ");
}

// ── Arc length: the humans walk at a CONSTANT linear speed ────────────────
//
// The spiral gets smaller, so a constant angular speed makes the dancer crawl
// near the center (v = ω·r → 0). We parametrize by arc length instead: equal
// time = equal distance walked, like a planet on an eccentric orbit whose
// angular speed rises as the radius shrinks.

const ARC_SAMPLES = 720;
const arcCache = new Map();

function arcTable(turns) {
  const key = String(turns);
  const cached = arcCache.get(key);
  if (cached) return cached;

  const cumulative = new Float64Array(ARC_SAMPLES + 1);
  let total = 0;
  let previous = spiralPoint(0, 0, turns);
  for (let i = 1; i <= ARC_SAMPLES; i += 1) {
    const point = spiralPoint(0, i / ARC_SAMPLES, turns);
    total += Math.hypot(point.x - previous.x, point.y - previous.y);
    cumulative[i] = total;
    previous = point;
  }

  const table = { cumulative, total };
  arcCache.set(key, table);
  // Keep the cache tiny: turns change from the UI, not every frame.
  if (arcCache.size > 6) arcCache.delete(arcCache.keys().next().value);
  return table;
}

/** Distance walked (viewBox px) from the outer start to `progress`. */
export function arcLengthPx(progress, turns) {
  const { cumulative } = arcTable(turns);
  const n = cumulative.length - 1;
  const p = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const x = p * n;
  const lower = Math.min(n - 1, Math.floor(x));
  const upper = Math.min(n, lower + 1);
  const ratio = x - lower;
  return cumulative[lower] + (cumulative[upper] - cumulative[lower]) * ratio;
}

/** Full spiral length (viewBox px) for a given number of turns. */
export function pathLengthPx(turns) {
  return arcTable(turns).total;
}

/** Inverse of `arcLengthPx`: which progress is at `fraction` of the path. */
export function progressForArcFraction(fraction, turns) {
  const { cumulative } = arcTable(turns);
  const n = cumulative.length - 1;
  const total = cumulative[n] || 1;
  const target = clamp(fraction, 0, 1) * total;

  let low = 0;
  let high = n;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulative[mid] < target) low = mid + 1;
    else high = mid;
  }
  if (low === 0) return 0;
  const before = cumulative[low - 1];
  const after = cumulative[low];
  const span = after - before || 1;
  return (low - 1 + (target - before) / span) / n;
}

/**
 * Keyframes that produce a constant linear speed: equal time slices cover
 * equal arc length. The panel stores them like any other timeline, so the
 * couple can still edit (and lose the uniformity on purpose).
 */
export function uniformSpeedKeyframes(duration, turns, count = 20) {
  const end = Math.max(1, Number(duration) || 1);
  const steps = Math.max(4, Math.min(80, Math.round(count)));
  const frames = [];
  for (let k = 0; k <= steps; k += 1) {
    frames.push({
      t: Math.round(((end * k) / steps) * 100) / 100,
      p: Math.round(progressForArcFraction(k / steps, turns) * 10000) / 10000,
      ease: "linear",
    });
  }
  return frames;
}

/** Distance walked in real meters, given the real outer radius. */
export function pathMetersAt(progress, turns, radiusMeters) {
  const radius = Number(radiusMeters);
  if (!Number.isFinite(radius) || radius <= 0) return 0;
  return (arcLengthPx(progress, turns) * radius) / STAGE.radius;
}

/** Total walk in real meters (progress 0 → 1). */
export function pathMetersTotal(turns, radiusMeters) {
  return pathMetersAt(1, turns, radiusMeters);
}

/**
 * Self-rotation "like a planet": a body of radius `bodyRadiusMeters` that
 * rolls without slipping spins one full turn per body circumference walked.
 * Returns degrees (can exceed 360; the caller can take the remainder).
 */
export function spinDegrees(progress, turns, radiusMeters, bodyRadiusMeters) {
  const bodyRadius = Number(bodyRadiusMeters);
  if (!Number.isFinite(bodyRadius) || bodyRadius <= 0) return 0;
  const distance = pathMetersAt(progress, turns, radiusMeters);
  return (distance / (2 * Math.PI * bodyRadius)) * 360;
}

/** Which number of turns makes the walk last `duration` at `targetSpeedMps`. */
export function solveTurnsForSpeed({
  duration,
  radiusMeters,
  targetSpeedMps,
  min = 1,
  max = 20,
}) {
  const seconds = Number(duration);
  const radius = Number(radiusMeters);
  const target = Number(targetSpeedMps);
  if (!(seconds > 0) || !(radius > 0) || !(target > 0)) return null;

  const speedAt = (turns) =>
    (pathLengthPx(turns) * radius) / STAGE.radius / seconds;

  let low = min;
  let high = max;
  if (speedAt(high) < target) return high;
  if (speedAt(low) > target) return low;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (speedAt(mid) < target) low = mid;
    else high = mid;
  }
  return Math.round(((low + high) / 2) * 10) / 10;
}

