/**
 * Venue planner — admin-only panel: seating, standing capacity, wall seats and
 * gate flow, all at real scale (meters), plus a to-scale SVG diagram.
 *
 * The math lives in `venue/capacity.js` (pure, tested). This module only wires
 * inputs, persistence and the drawing. Nothing is sent anywhere.
 */
import {
  DEFAULTS,
  DENSITIES,
  formatDuration,
  metersFromPixels,
  planVenue,
} from "./venue/capacity.js";
import { simulateReception } from "./venue/flow.js";

const STORAGE_KEY = "boda:venue-plan:v1";
const MAP_REFERENCE_METERS = 15.24; // 50 ft, the bar in the satellite capture.
const MAP_REFERENCE_PIXELS = 210; // measured on that capture, adjustable.

const FIELDS = [
  { key: "people", label: "Personas", min: 1, max: 2000, step: 1 },
  { key: "widthM", label: "Ancho (m)", min: 1, max: 200, step: 0.5 },
  { key: "depthM", label: "Fondo (m)", min: 1, max: 200, step: 0.5 },
  { key: "seatWidthM", label: "Silla (m)", min: 0.4, max: 0.9, step: 0.01 },
  { key: "rowPitchM", label: "Paso fila (m)", min: 0.6, max: 1.4, step: 0.01 },
  { key: "aisleM", label: "Pasillo (m)", min: 0, max: 5, step: 0.1 },
  { key: "wallLengthM", label: "Muret (m)", min: 0, max: 200, step: 0.5 },
  { key: "gateWidthM", label: "Portón (m)", min: 0.6, max: 6, step: 0.05 },
  { key: "secondsPerGroup", label: "Segundos por grupo", min: 1, max: 60, step: 1 },
  { key: "arrivalWindowMin", label: "Llegada en (min)", min: 1, max: 240, step: 1 },
  { key: "greeters", label: "Kikis en el portón", min: 1, max: 4, step: 1 },
  { key: "secondsPerGuest", label: "Segundos por grupo (recepción)", min: 2, max: 30, step: 1 },
  { key: "frenchPercent", label: "% francés (izquierda)", min: 0, max: 100, step: 1 },
];

function readSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && typeof raw === "object") return { ...DEFAULTS, view: "people", ...raw };
  } catch {
    /* ignore corrupt storage */
  }
  return { ...DEFAULTS, view: "people", calibrationPixels: 100 };
}

const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );

export function renderVenuePanel(host) {
  if (!host || host.dataset.mounted === "yes") return;
  host.dataset.mounted = "yes";

  const settings = readSettings();
  const abort = new AbortController();
  const listens = { signal: abort.signal };

  host.innerHTML = `
  <div class="venue">
    <div class="dashboard-section-heading">
      <div>
        <p class="dashboard-eyebrow">Espacio · aforo y flujo</p>
        <h2>📐 Plaza y portón</h2>
      </div>
    </div>
    <p class="venue__note">
      Todo en metros y a escala. Ajusta las medidas reales del lugar y la app dice
      cuántos caben de pie, cuántas sillas entran, cuántos se sientan en el muret y
      cuánto tarda el portón. Son estimaciones con supuestos explícitos, no una
      medición oficial.
    </p>

    <div class="venue__grid">
      <div class="venue__card">
        <h3>Espacio</h3>
        <div class="venue__fields">
          <label class="venue__field">Personas esperadas
            <input data-field="people" type="number" min="1" max="2000" step="1">
          </label>
          <label class="venue__field">Ancho (m)
            <input data-field="widthM" type="number" min="1" max="200" step="0.5">
          </label>
          <label class="venue__field">Fondo (m)
            <input data-field="depthM" type="number" min="1" max="200" step="0.5">
          </label>
          <label class="venue__field">Densidad de pie
            <select data-density>
              ${DENSITIES.map(
                (density) =>
                  `<option value="${density.id}">${esc(density.label)} · ${density.sqm} m²/p</option>`,
              ).join("")}
            </select>
          </label>
        </div>
      </div>

      <div class="venue__card">
        <h3>Sillas y muret</h3>
        <div class="venue__fields">
          <label class="venue__field">Ancho de silla (m)
            <input data-field="seatWidthM" type="number" min="0.4" max="0.9" step="0.01">
          </label>
          <label class="venue__field">Paso entre filas (m)
            <input data-field="rowPitchM" type="number" min="0.6" max="1.4" step="0.01">
          </label>
          <label class="venue__field">Pasillo (m)
            <input data-field="aisleM" type="number" min="0" max="5" step="0.1">
          </label>
          <label class="venue__field">Largo del muret (m)
            <input data-field="wallLengthM" type="number" min="0" max="200" step="0.5">
          </label>
          <label class="venue__check">
            <input data-wall-both type="checkbox"> Muret por ambos lados
          </label>
        </div>
      </div>
      <div class="venue__card">
        <h3>Portón</h3>
        <div class="venue__fields">
          <label class="venue__field">Ancho libre (m)
            <input data-field="gateWidthM" type="number" min="0.6" max="6" step="0.05">
          </label>
          <label class="venue__field">Entrada
            <select data-abreast>
              <option value="1">De uno en uno</option>
              <option value="2">De dos en dos</option>
            </select>
          </label>
          <label class="venue__field">Segundos por grupo
            <input data-field="secondsPerGroup" type="number" min="1" max="60" step="1">
          </label>
          <label class="venue__field">Llegada en (min)
            <input data-field="arrivalWindowMin" type="number" min="1" max="240" step="1">
          </label>
        </div>
      </div>

      <div class="venue__card">
        <h3>Recepción · Kiki</h3>
        <p class="venue__note">
          Kiki saluda en el portón y manda a cada invitado a la <strong>izquierda
          (francés)</strong> o a la <strong>derecha (español)</strong>.
        </p>
        <div class="venue__fields">
          <label class="venue__field">Kikis
            <input data-field="greeters" type="number" min="1" max="4" step="1">
          </label>
          <label class="venue__field">Segundos por grupo
            <input data-field="secondsPerGuest" type="number" min="2" max="30" step="1">
          </label>
          <label class="venue__field">% francés (izquierda)
            <input data-field="frenchPercent" type="number" min="0" max="100" step="1">
          </label>
          <label class="venue__field">Entrada
            <select data-reception-abreast>
              <option value="1">De uno en uno</option>
              <option value="2">De dos en dos</option>
            </select>
          </label>
          <label class="venue__field">Empieza a las
            <input data-field="startClock" type="time">
          </label>
        </div>
      </div>

      <div class="venue__card">
        <h3>Escala del mapa</h3>
        <p class="venue__note">
          En tu captura, <strong>50 ft = 15.24 m</strong> ≈ ${MAP_REFERENCE_PIXELS} px.
          Mide un tramo en la captura y conviértelo:
        </p>
        <div class="venue__fields">
          <label class="venue__field">Píxeles del tramo
            <input data-calibration type="number" min="1" max="4000" step="1">
          </label>
          <p class="venue__result-inline" data-calibration-result></p>
        </div>
      </div>
    </div>

    <div class="venue__results" data-results></div>

    <div class="venue__bar">
      <label class="venue__field">Dibujar
        <select data-view>
          <option value="people">Las personas, a escala</option>
          <option value="seats">Las sillas, a escala</option>
        </select>
      </label>
      <button type="button" class="dashboard-button" data-reset>↺ Valores por defecto</button>
    </div>

    <svg class="venue__plan" data-plan viewBox="0 0 340 240" role="img"
         aria-label="Plano a escala del área, las sillas, el muret y el portón"></svg>

    <h3>Flujo de recepción</h3>
    <div class="venue__results" data-reception></div>
    <svg class="venue__plan" data-queue viewBox="0 0 340 90" role="img"
         aria-label="Cola de invitados en el portón a lo largo del tiempo"></svg>

    <p class="venue__status" data-status role="status"></p>
  </div>
  `;

  const q = (selector) => host.querySelector(selector);

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      setStatus("No se pudo guardar en este navegador.");
    }
  }

  function setStatus(message) {
    q("[data-status]").textContent = message;
  }

  function syncInputs() {
    host.querySelectorAll("[data-field]").forEach((input) => {
      const value = settings[input.dataset.field];
      if (value !== undefined) input.value = String(value);
    });
    q("[data-density]").value = settings.densityId;
    q("[data-wall-both]").checked = Boolean(settings.wallBothSides);
    q("[data-abreast]").value = String(settings.abreast);
    q("[data-view]").value = settings.view;
    q("[data-reception-abreast]").value = String(settings.receptionAbreast);
    q("[data-calibration]").value = String(settings.calibrationPixels ?? 100);
  }

  function updateCalibration() {
    const meters = metersFromPixels({
      pixels: settings.calibrationPixels,
      referencePixels: MAP_REFERENCE_PIXELS,
      referenceMeters: MAP_REFERENCE_METERS,
    });
    q("[data-calibration-result]").textContent = meters
      ? `${Math.round(settings.calibrationPixels)} px ≈ ${meters.toFixed(2)} m`
      : "—";
  }

  function renderResults() {
    const plan = planVenue(settings);
    const badge = (flag) => (flag ? "✅" : "❌");
    const gateLine = plan.gate.twoFits
      ? `De dos en dos: ${formatDuration(plan.entry.pairs.totalMinutes)} (${plan.entry.pairs.perMinute.toFixed(0)}/min)`
      : "De dos en dos: no cabe (portón demasiado estrecho)";

    q("[data-results]").innerHTML = `
      <div class="venue__card">
        <h3>De pie</h3>
        <p class="venue__big">${plan.standing}</p>
        <p class="venue__note">personas en ${plan.areaSqm.toFixed(0)} m² · ${plan.sqmPerPerson} m²/persona
          ${badge(plan.fitsStanding)} para ${plan.people}</p>
      </div>
      <div class="venue__card">
        <h3>Sentados</h3>
        <p class="venue__big">${plan.seatsTotal}</p>
        <p class="venue__note">
          ${plan.seating.seats} sillas (${plan.seating.rows} filas × ${plan.seating.seatsPerRow}) +
          ${plan.wall.total} en el muret ${badge(plan.fitsSeated)} para ${plan.people}
        </p>
      </div>
      <div class="venue__card">
        <h3>Portón</h3>
        <p class="venue__big">${formatDuration(
          settings.abreast === 2 && plan.gate.twoFits
            ? plan.entry.pairs.totalMinutes
            : plan.entry.oneByOne.totalMinutes,
        )}</p>
        <p class="venue__note">
          De uno en uno: ${formatDuration(plan.entry.oneByOne.totalMinutes)}
          (${plan.entry.oneByOne.perMinute.toFixed(0)}/min)<br>
          ${gateLine}
        </p>
      </div>
      <div class="venue__card">
        <h3>¿Se forma cola?</h3>
        <p class="venue__big">${plan.entry.arrivalOne.clears ? "No" : "Sí"}</p>
        <p class="venue__note">
          Llegadas: ${plan.entry.arrivalOne.arrivalRate.toFixed(1)}/min ·
          portón: ${plan.entry.arrivalOne.doorRate.toFixed(1)}/min
          ${badge(plan.entry.arrivalOne.clears)}
        </p>
      </div>
    `;
  }

  function receptionPlan() {
    return simulateReception({
      people: settings.people,
      greeters: settings.greeters,
      secondsPerGroup: settings.secondsPerGuest,
      abreast: settings.receptionAbreast,
      windowMinutes: settings.arrivalWindowMin,
      frenchPercent: settings.frenchPercent,
      startClock: settings.startClock,
    });
  }

  function renderReception() {
    const plan = receptionPlan();
    q("[data-reception]").innerHTML = `
      <div class="venue__card">
        <h3>Izquierda · francés</h3>
        <p class="venue__big">${plan.split.french}</p>
        <p class="venue__note">${settings.frenchPercent}% de ${plan.total} · sector FR</p>
      </div>
      <div class="venue__card">
        <h3>Derecha · español</h3>
        <p class="venue__big">${plan.split.spanish}</p>
        <p class="venue__note">${100 - settings.frenchPercent}% de ${plan.total} · sector ES</p>
      </div>
      <div class="venue__card">
        <h3>Último invitado</h3>
        <p class="venue__big">${plan.endClock || "—"}</p>
        <p class="venue__note">${formatDuration(plan.lastEndMinutes)} desde las ${settings.startClock} · ${plan.perMinute.toFixed(1)}/min</p>
      </div>
      <div class="venue__card">
        <h3>Cola y espera</h3>
        <p class="venue__big">${plan.maxQueue}</p>
        <p class="venue__note">grupos en cola · espera máx ${formatDuration(plan.maxWaitSeconds / 60)} · media ${formatDuration(plan.averageWaitSeconds / 60)}</p>
      </div>
    `;
    drawQueue(plan);
  }

  function drawQueue(plan) {
    const svg = q("[data-queue]");
    const W = 340;
    const H = 90;
    const pad = 12;
    const maxT = Math.max(1, plan.lastEndSeconds);
    const maxQ = Math.max(1, plan.maxQueue);

    svg.replaceChildren();
    const ns = "http://www.w3.org/2000/svg";
    const make = (tag, attrs) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      svg.appendChild(node);
      return node;
    };
    const label = (x, y, value, attrs = {}) => {
      const node = make("text", { x, y, "font-size": "8", fill: "#475569", ...attrs });
      node.textContent = value;
    };

    make("line", {
      x1: pad,
      y1: H - pad,
      x2: W - pad,
      y2: H - pad,
      stroke: "#cbd5e1",
      "stroke-width": "1",
    });
    make("line", {
      x1: pad,
      y1: pad,
      x2: pad,
      y2: H - pad,
      stroke: "#cbd5e1",
      "stroke-width": "1",
    });

    if (!plan.timeline.length) {
      label(W / 2, H / 2, "sin invitados", { "text-anchor": "middle" });
      return;
    }

    const scaleX = (seconds) => pad + (seconds / maxT) * (W - pad * 2);
    const scaleY = (queue) => H - pad - (queue / maxQ) * (H - pad * 2);
    const points = plan.timeline
      .map((point) => `${scaleX(point.arrival).toFixed(2)},${scaleY(point.queue).toFixed(2)}`)
      .join(" ");
    make("polyline", {
      points,
      fill: "none",
      stroke: "#0f766e",
      "stroke-width": "1.6",
    });
    label(pad, pad - 3, `cola máx ${plan.maxQueue}`, { fill: "#0f766e" });
    label(W - pad, H - 3, `${formatDuration(maxT / 60)}`, { "text-anchor": "end" });
    label(pad, H - 3, settings.startClock, {});
  }

  function drawPlan() {
    const plan = planVenue(settings);
    const svg = q("[data-plan]");
    const W = 340;
    const H = 240;
    const pad = 18;
    const width = Math.max(1, Number(settings.widthM) || 1);
    const depth = Math.max(1, Number(settings.depthM) || 1);
    const scale = Math.min((W - pad * 2) / width, (H - pad * 2) / depth);
    const w = width * scale;
    const h = depth * scale;
    const x0 = (W - w) / 2;
    const y0 = (H - h) / 2;

    const ns = "http://www.w3.org/2000/svg";
    const make = (tag, attrs, parent = svg) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      parent.appendChild(node);
      return node;
    };
    const label = (x, y, value, attrs = {}) => {
      const node = make("text", { x, y, "font-size": "8", fill: "#475569", ...attrs });
      node.textContent = value;
      return node;
    };

    svg.replaceChildren();
    make("rect", {
      x: x0,
      y: y0,
      width: w,
      height: h,
      rx: 4,
      fill: "#f8f5ef",
      stroke: "#cbd5e1",
      "stroke-width": "1.2",
    });

    if (settings.view === "seats") {
      const seatW = Number(settings.seatWidthM) * scale;
      const rowH = Number(settings.rowPitchM) * scale;
      const blockW = plan.seating.seatsPerRow * seatW;
      for (let row = 0; row < plan.seating.rows; row += 1) {
        for (let seat = 0; seat < plan.seating.seatsPerRow; seat += 1) {
          make("rect", {
            x: (x0 + (w - blockW) / 2 + seat * seatW).toFixed(2),
            y: (y0 + 6 + row * rowH).toFixed(2),
            width: Math.max(1.2, seatW - 0.6).toFixed(2),
            height: Math.max(1.2, rowH * 0.45).toFixed(2),
            rx: 0.8,
            fill: "#bfdbfe",
            stroke: "#60a5fa",
            "stroke-width": "0.3",
          });
        }
      }
      label(x0 + w / 2, y0 - 6, `${plan.seating.rows} filas × ${plan.seating.seatsPerRow} sillas`, {
        "text-anchor": "middle",
        "font-size": "9",
      });
    } else {
      const step = 0.7; // 0.7 m between people: comfortable standing
      const cols = Math.max(1, Math.floor(width / step));
      const rows = Math.max(1, Math.floor(depth / step));
      const count = Math.min(plan.people, cols * rows);
      for (let i = 0; i < count; i += 1) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        make("circle", {
          cx: (x0 + (col + 0.5) * step * scale).toFixed(2),
          cy: (y0 + (row + 0.5) * step * scale).toFixed(2),
          r: Math.max(1.1, 0.22 * scale).toFixed(2),
          fill: "#0f766e",
          "fill-opacity": "0.55",
        });
      }
      label(x0 + w / 2, y0 - 6, `${count} personas a escala · 0.7 m entre hombros`, {
        "text-anchor": "middle",
        "font-size": "9",
      });
    }

    // Low wall (muret) along the bottom edge, inside the area.
    if (plan.wall.perSide > 0) {
      const seatSpan = Number(settings.seatWidthM) * scale;
      const rowsOfWall = settings.wallBothSides ? 2 : 1;
      for (let rowIndex = 0; rowIndex < rowsOfWall; rowIndex += 1) {
        for (let seat = 0; seat < plan.wall.perSide; seat += 1) {
          make("rect", {
            x: (x0 + seat * seatSpan).toFixed(2),
            y: (y0 + h - 5 - rowIndex * 5).toFixed(2),
            width: Math.max(1, seatSpan - 0.6).toFixed(2),
            height: "3.2",
            rx: 0.8,
            fill: "#fde68a",
            stroke: "#d97706",
            "stroke-width": "0.3",
          });
        }
      }
      label(
        x0 + 4,
        y0 + h - 12 - (settings.wallBothSides ? 5 : 0),
        `muret ${settings.wallLengthM} m · ${plan.wall.total} asientos`,
        { "font-size": "8", fill: "#92400e" },
      );
    }

    // Gate: gap + arrow at the bottom centre.
    const gateWidth = Number(settings.gateWidthM) * scale;
    const gateX = x0 + w / 2;
    make("rect", {
      x: (gateX - gateWidth / 2).toFixed(2),
      y: (y0 + h - 2).toFixed(2),
      width: gateWidth.toFixed(2),
      height: 3,
      fill: "#ffffff",
    });
    make("path", {
      d: `M${(gateX - 3).toFixed(2)} ${(y0 + h + 10).toFixed(2)} L${gateX.toFixed(2)} ${(y0 + h + 3).toFixed(2)} L${(gateX + 3).toFixed(2)} ${(y0 + h + 10).toFixed(2)}`,
      stroke: "#334155",
      "stroke-width": "1.2",
      fill: "none",
    });
    label(gateX, y0 + h + 19, `portón ${settings.gateWidthM} m`, {
      "text-anchor": "middle",
    });

    // 5 m scale bar, bottom-left.
    const barPx = 5 * scale;
    make("line", {
      x1: x0,
      y1: y0 + h + 19,
      x2: x0 + barPx,
      y2: y0 + h + 19,
      stroke: "#334155",
      "stroke-width": "1.4",
    });
    label(x0 + barPx / 2, y0 + h + 15, "5 m", { "text-anchor": "middle" });
    label(x0, y0 - 16, `${width} m × ${depth} m`, {
      "font-size": "9",
      fill: "#334155",
    });
  }

  function commit({ persist = true } = {}) {
    if (persist) save();
    renderResults();
    renderReception();
    drawPlan();
    updateCalibration();
  }

  // ── Wiring ──────────────────────────────────────────────────────────────
  host.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener(
      "change",
      () => {
        const key = input.dataset.field;
        if (key === "startClock") {
          settings.startClock = input.value || "18:30";
          commit();
          return;
        }
        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        settings[key] = value;
        commit();
      },
      listens,
    );
  });

  q("[data-density]").addEventListener(
    "change",
    (event) => {
      settings.densityId = event.target.value;
      commit();
    },
    listens,
  );

  q("[data-wall-both]").addEventListener(
    "change",
    (event) => {
      settings.wallBothSides = event.target.checked;
      commit();
    },
    listens,
  );

  q("[data-abreast]").addEventListener(
    "change",
    (event) => {
      settings.abreast = Number(event.target.value);
      commit();
    },
    listens,
  );

  q("[data-view]").addEventListener(
    "change",
    (event) => {
      settings.view = event.target.value;
      commit();
    },
    listens,
  );

  q("[data-reception-abreast]").addEventListener(
    "change",
    (event) => {
      settings.receptionAbreast = Number(event.target.value);
      commit();
    },
    listens,
  );

  q("[data-calibration]").addEventListener(
    "change",
    (event) => {
      const value = Number(event.target.value);
      settings.calibrationPixels = Number.isFinite(value) && value > 0 ? value : 100;
      event.target.value = String(settings.calibrationPixels);
      commit();
    },
    listens,
  );

  q("[data-reset]").addEventListener(
    "click",
    () => {
      Object.assign(settings, DEFAULTS, { view: "people", calibrationPixels: 100 });
      syncInputs();
      commit();
      setStatus("Valores por defecto restaurados.");
    },
    listens,
  );

  syncInputs();
  commit({ persist: false });

  host._venueCleanup = () => {
    abort.abort();
    host.dataset.mounted = "no";
  };
}
