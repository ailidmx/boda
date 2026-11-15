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
