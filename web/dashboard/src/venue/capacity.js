/**
 * Venue planning — capacity, seating, wall seats and gate flow.
 *
 * Pure module: no DOM, no storage. The dashboard panel feeds it numbers the
 * couple measured on site (or on a satellite map) and it returns what fits and
 * how long the door takes. Every assumption is a parameter so nothing is
 * presented as a magic number.
 */

/** Standing densities in m² per person (lower = more packed). */
export const DENSITIES = [
  { id: "cocktail", label: "Cóctel cómodo", sqm: 1.0 },
  { id: "standing", label: "De pie, cómodo", sqm: 0.7 },
  { id: "dense", label: "Concentrado", sqm: 0.5 },
];

export const DEFAULTS = {
  widthM: 16,
  depthM: 17,
  densityId: "standing",
  seatWidthM: 0.55,
  rowPitchM: 0.85,
  aisleM: 1.2,
  wallLengthM: 20,
  wallBothSides: false,
  gateWidthM: 1.2,
  abreast: 1,
  secondsPerGroup: 5,
  people: 150,
  arrivalWindowMin: 30,
  // Reception flow (Kiki at the gate)
  greeters: 1,
  secondsPerGuest: 8,
  receptionAbreast: 1,
  frenchPercent: 40,
  startClock: "18:30",
};

const positive = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** m² per person for a density id (falls back to comfortable standing). */
export function densitySqm(id) {
  const found = DENSITIES.find((item) => item.id === id);
  return found ? found.sqm : 0.7;
}

/** How many people fit standing in `areaSqm` at the given density. */
export function areaCapacity(areaSqm, sqmPerPerson) {
  const area = positive(areaSqm);
  const perPerson = positive(sqmPerPerson, 0.7);
  return Math.floor(area / perPerson);
}

/**
 * Seats that fit in a rectangle: chairs side by side minus the aisle, rows with
 * a walking pitch. Returns the used block so it can be drawn to scale.
 */
export function seatingLayout({
  widthM,
  depthM,
  seatWidthM = DEFAULTS.seatWidthM,
  rowPitchM = DEFAULTS.rowPitchM,
  aisleM = DEFAULTS.aisleM,
} = {}) {
  const width = positive(widthM);
  const depth = positive(depthM);
  const seat = positive(seatWidthM, DEFAULTS.seatWidthM);
  const pitch = positive(rowPitchM, DEFAULTS.rowPitchM);
  const aisle = Math.max(0, Number(aisleM) || 0);

  const usableWidth = Math.max(0, width - aisle);
  // Epsilon so exact fits (e.g. 8.25 / 0.55) are not lost to floating point.
  const seatsPerRow = Math.floor(usableWidth / seat + 1e-9);
  const rows = Math.floor(depth / pitch + 1e-9);
  return {
    seatsPerRow,
    rows,
    seats: seatsPerRow * rows,
    usedWidthM: seatsPerRow * seat,
    usedDepthM: rows * pitch,
  };
}

/** People who can sit on a low wall (one side, or both). */
export function wallSeats({
  lengthM,
  seatWidthM = DEFAULTS.seatWidthM,
  bothSides = false,
} = {}) {
  const length = positive(lengthM);
  const seat = positive(seatWidthM, DEFAULTS.seatWidthM);
  const perSide = Math.floor(length / seat);
  return { perSide, total: bothSides ? perSide * 2 : perSide };
}

/** A 0.45 m shoulder plus 0.1 m clearance per extra person abreast. */
export const SHOULDER_M = 0.45;
export const CLEARANCE_M = 0.1;

export function gateFitsAbreast({ clearWidthM, abreast = 1 } = {}) {
  const width = positive(clearWidthM);
  const count = Math.max(1, Math.floor(Number(abreast) || 1));
  return width >= count * SHOULDER_M + CLEARANCE_M;
}

/**
 * Deterministic door plan: `mode` people enter together and each group takes
 * `secondsPerGroup` (greeting, check-in, photo). With 2 abreast the pair
 * greeting is usually slower than a single one — that is a parameter.
 */
export function entryPlan({ people, mode = 1, secondsPerGroup = 5 } = {}) {
  const total = Math.max(0, Math.round(Number(people) || 0));
  const abreast = Math.max(1, Math.floor(Number(mode) || 1));
  const seconds = positive(secondsPerGroup, 5);
  const groups = Math.ceil(total / abreast);
  const totalSeconds = groups * seconds;
  return {
    groups,
    totalSeconds,
    totalMinutes: totalSeconds / 60,
    perMinute: totalSeconds > 0 ? (total / totalSeconds) * 60 : 0,
  };
}

/** Can the door keep up with the arrivals, or is there a queue? */
export function arrivalComparison({ people, windowMinutes, perMinute } = {}) {
  const total = Math.max(0, Math.round(Number(people) || 0));
  const window = positive(windowMinutes);
  const arrivalRate = window > 0 ? total / window : 0;
  const doorRate = positive(perMinute);
  return {
    arrivalRate,
    doorRate,
    surplusPerMinute: doorRate - arrivalRate,
    clears: doorRate >= arrivalRate,
  };
}

/** `12.5 min` / `1 h 05 min` for humans. */
export function formatDuration(minutes) {
  const value = Math.max(0, Number(minutes) || 0);
  if (value < 60) return `${value.toFixed(1)} min`;
  const hours = Math.floor(value / 60);
  const rest = Math.round(value - hours * 60);
  return `${hours} h ${String(rest).padStart(2, "0")} min`;
}

/** Pixels → meters using a calibration measured on the map. */
export function metersFromPixels({ pixels, referencePixels, referenceMeters } = {}) {
  if (!positive(pixels) || !positive(referencePixels) || !positive(referenceMeters)) {
    return 0;
  }
  return (positive(pixels) / positive(referencePixels)) * positive(referenceMeters);
}

/**
 * The whole plan in one call, so the panel and the tests share one source of
 * truth. `people` is what the couple expects; the result says whether it fits.
 */
export function planVenue(input = {}) {
  const config = { ...DEFAULTS, ...input };
  const areaSqm = positive(config.widthM) * positive(config.depthM);
  const sqm = densitySqm(config.densityId);

  const standing = areaCapacity(areaSqm, sqm);
  const seating = seatingLayout(config);
  const wall = wallSeats({
    lengthM: config.wallLengthM,
    seatWidthM: config.seatWidthM,
    bothSides: config.wallBothSides,
  });
  const seatsTotal = seating.seats + wall.total;

  const oneByOne = entryPlan({
    people: config.people,
    mode: 1,
    secondsPerGroup: config.secondsPerGroup,
  });
  const pairs = entryPlan({
    people: config.people,
    mode: 2,
    // A couple greeting takes ~40% longer than a single one.
    secondsPerGroup: config.secondsPerGroup * 1.4,
  });

  const arrivalOne = arrivalComparison({
    people: config.people,
    windowMinutes: config.arrivalWindowMin,
    perMinute: oneByOne.perMinute,
  });

  return {
    areaSqm,
    sqmPerPerson: sqm,
    standing,
    seating,
    wall,
    seatsTotal,
    people: Math.max(0, Math.round(Number(config.people) || 0)),
    fitsSeated: seatsTotal >= Math.round(Number(config.people) || 0),
    fitsStanding: standing >= Math.round(Number(config.people) || 0),
    gate: {
      oneFits: gateFitsAbreast({ clearWidthM: config.gateWidthM, abreast: 1 }),
      twoFits: gateFitsAbreast({ clearWidthM: config.gateWidthM, abreast: 2 }),
    },
    entry: { oneByOne, pairs, arrivalOne },
  };
}
