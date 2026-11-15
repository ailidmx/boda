/**
 * Reception flow — Kiki at the gate: greet, check the language and send each
 * guest to the LEFT (francés) or RIGHT (español) sector.
 *
 * Pure module: no DOM. Deterministic queue model (uniform arrivals, greeters in
 * parallel, constant service time), so the couple can compare "one Kiki vs two",
 * "one by one vs pairs" and "arrive over 20 or 40 minutes" without guessing.
 */

export const FLOW_DEFAULTS = {
  greeters: 1,
  secondsPerGroup: 8,
  abreast: 1,
  windowMinutes: 30,
  frenchPercent: 40,
  startClock: "18:30",
};

const positive = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** How many guests go left (FR) and right (ES). Rounded so the total holds. */
export function languageSplit({ people, frenchPercent = 40 } = {}) {
  const total = Math.max(0, Math.round(Number(people) || 0));
  const percent = Math.min(100, Math.max(0, Number(frenchPercent) || 0));
  const french = Math.round((total * percent) / 100);
  return { total, french, spanish: total - french };
}

/** `"18:30"` + 12.5 min → `"18:43"`. */
export function addMinutes(clock, minutes) {
  const match = /^(\d{1,2}):(\d{2})$/u.exec(String(clock || "").trim());
  if (!match) return "";
  const base = Number(match[1]) * 60 + Number(match[2]);
  const total = (base + Math.round(Number(minutes) || 0) + 24 * 60) % (24 * 60);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/**
 * Deterministic reception simulation.
 *
 * - Guests arrive in groups of `abreast` (a pair arrives together), uniformly
 *   spread over `windowMinutes`.
 * - `greeters` people can serve in parallel; each group takes
 *   `secondsPerGroup` (hello, language, left/right, photo).
 * - The queue for a group is `ceil(wait / service)`: how many groups are ahead.
 */
export function simulateReception({
  people = 150,
  greeters = FLOW_DEFAULTS.greeters,
  secondsPerGroup = FLOW_DEFAULTS.secondsPerGroup,
  abreast = FLOW_DEFAULTS.abreast,
  windowMinutes = FLOW_DEFAULTS.windowMinutes,
  frenchPercent = FLOW_DEFAULTS.frenchPercent,
  startClock = FLOW_DEFAULTS.startClock,
} = {}) {
  const total = Math.max(0, Math.round(Number(people) || 0));
  const servers = Math.max(1, Math.floor(Number(greeters) || 1));
  const service = positive(secondsPerGroup, FLOW_DEFAULTS.secondsPerGroup);
  const groupSize = Math.max(1, Math.floor(Number(abreast) || 1));
  const window = positive(windowMinutes, FLOW_DEFAULTS.windowMinutes);
  const groups = Math.ceil(total / groupSize);
  const gap = groups > 0 ? (window * 60) / groups : 0;

  const freeAt = new Array(servers).fill(0);
  const timeline = [];
  let maxWait = 0;
  let totalWait = 0;
  let maxQueue = 0;
  let lastEnd = 0;

  for (let i = 0; i < groups; i += 1) {
    const arrival = i * gap;
    let server = 0;
    for (let s = 1; s < servers; s += 1) {
      if (freeAt[s] < freeAt[server]) server = s;
    }
    const start = Math.max(arrival, freeAt[server]);
    const end = start + service;
    freeAt[server] = end;

    const wait = start - arrival;
    const queue = Math.ceil(wait / service);
    maxWait = Math.max(maxWait, wait);
    maxQueue = Math.max(maxQueue, queue);
    totalWait += wait;
    lastEnd = Math.max(lastEnd, end);
    timeline.push({
      arrival: Math.round(arrival),
      start: Math.round(start),
      end: Math.round(end),
      wait: Math.round(wait),
      queue,
    });
  }

  return {
    total,
    groups,
    servers,
    groupSize,
    serviceSeconds: service,
    windowMinutes: window,
    split: languageSplit({ people: total, frenchPercent }),
    lastEndSeconds: lastEnd,
    lastEndMinutes: lastEnd / 60,
    endClock: addMinutes(startClock, lastEnd / 60),
    maxWaitSeconds: maxWait,
    averageWaitSeconds: groups ? totalWait / groups : 0,
    maxQueue,
    perMinute: lastEnd > 0 ? (total / lastEnd) * 60 : 0,
    timeline,
  };
}
