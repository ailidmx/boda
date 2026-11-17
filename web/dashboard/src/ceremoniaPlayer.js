/**
 * Ceremonia Player — private dashboard panel (admin only).
 *
 * The AUDIO is the clock. Every dancer position is a pure function of
 * `audio.currentTime`, so seeking, pausing, changing the playback rate or
 * backgrounding the tab can never desynchronize the drawing from the music.
 *
 * The track is a lawfully obtained local file chosen by the admin and kept in
 * IndexedDB (browser-local, never committed, never hosted). Cues, keyframes and
 * settings are the only things exported as JSON.
 *
 * Nothing here downloads audio, and every detected meeting is a provisional
 * rehearsal suggestion, not a verified choreographic truth.
 */
import {
  clearAudio,
  isSupportedAudioFile,
  loadAudio,
  saveAudio,
} from "./ceremonia/audioStore.js";
import {
  EASINGS,
  formatClock,
  rescaleChoreography,
  sanitizeChoreography,
  serializeChoreography,
  walkingKeyframes,
} from "./ceremonia/schema.js";
import {
  detectMeetings,
  pathMetersTotal,
  progressAt,
  ringMetrics,
  signedSpinDegrees,
  solveTurnsForSpeed,
  solveWalkSeconds,
  spiralPath,
  spiralPoint,
} from "./ceremonia/motion.js";
import {
  MAPS_AREA_M2,
  MAPS_PERIMETER_M,
  TERRACE_POLYGON,
  TOWER_DIAMETER_M,
  fitTransform,
  polygonCentroid,
} from "./ceremonia/space.js";


const STORAGE_KEY = "boda:ceremonia-player:v4";
const PREVIOUS_KEYS = [
  "boda:ceremonia-player:v3",
  "boda:ceremonia-player:v2",
  "boda:ceremonia-player:v1",
];

// The couple's own copy of the ceremony track, shipped with the dashboard so
// the panel already has the real audio (and the real duration) on first open.
// An imported file always wins and is stored per browser in IndexedDB.
const DEFAULT_AUDIO = {
  src: "audio/ceremonia.mp3",
  name: "CEREMONIA.mp3 · incluido",
};

const SAMPLES = 360;
const DANCERS = [
  { key: "david", label: "David", color: "#3b82f6", emoji: "🤵🏽" },
  { key: "ayde", label: "Aydé", color: "#d97706", emoji: "👰🏽" },
];

const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );

let needsMigration = false;

function readStoredState() {
  needsMigration = false;
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (current) return sanitizeChoreography(current);
  } catch {
    /* ignore corrupt storage */
  }
  for (const key of PREVIOUS_KEYS) {
    try {
      const previous = JSON.parse(localStorage.getItem(key));
      if (!previous) continue;
      needsMigration = true;
      return sanitizeChoreography(
        key.endsWith(":v1") ? { ...previous, version: 1 } : previous,
      );
    } catch {
      /* ignore corrupt previous storage */
    }
  }
  return sanitizeChoreography(null);
}

export function renderCeremoniaPlayer(host) {
  if (!host || host.dataset.mounted === "yes") return;
  host.dataset.mounted = "yes";

  let state = readStoredState();
  let objectUrl = null;
  let importedAudio = false;
  let syntheticTime = 0;
  let syntheticLast = 0;
  let playing = false;
  let scrubbing = false;
  let rafId = 0;
  let meetings = [];
  const abort = new AbortController();
  const listens = { signal: abort.signal };

  host.innerHTML = `
  <div class="ceremonia">
    <div class="dashboard-section-heading">
      <div>
        <p class="dashboard-eyebrow">Ceremonia · ensayo privado</p>
        <h2>🐚 Ceremonia Player</h2>
      </div>
    </div>
    <p class="ceremonia__note">
      Dos caracoles independientes sincronizados al audio real. Las trayectorias son
      provisionales: los "encuentros" son sugerencias de ensayo, no cruces verificados.
      <br>
      Orientación: <strong>la torre apunta al este</strong>, así que arriba en el
      dibujo es ESTE (N a la izquierda, S a la derecha, O abajo).
    </p>

    <div class="ceremonia__bar">
      <label class="dashboard-button">
        ↑ Importar audio local
        <input data-file type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" hidden>
      </label>
      <button type="button" class="dashboard-button ceremonia__danger" data-remove-audio>
        Quitar audio importado
      </button>
      <span class="ceremonia__badge" data-mode>Sin audio · reloj de ensayo</span>
      <span data-audio-name></span>
    </div>
    <p class="ceremonia__note">
      El panel abre con el <strong>audio de la ceremonia incluido</strong>. Si quieres
      usar otro archivo (o el mismo en tu teléfono), impórtalo: se guarda solo en ese
      navegador y tiene prioridad sobre el incluido. No se sube a Firebase.
    </p>

    <svg class="ceremonia__stage" data-stage viewBox="0 0 360 340" role="img"
         aria-label="Trayectorias animadas de David y Aydé. La torre apunta al este: arriba es este, derecha sur, abajo oeste, izquierda norte.">
      <text x="180" y="23" text-anchor="middle" fill="#475569" font-size="12">TORRE · LAGO DE CHAPALA · apunta al ESTE ↑</text>
      <path d="M73 49 Q5 102 20 252" stroke="#3b82f6" stroke-width="29" opacity=".2" fill="none"/>
      <path d="M287 49 Q355 102 340 252" stroke="#16a34a" stroke-width="29" opacity=".2" fill="none"/>
      <text x="26" y="65" fill="#2563eb" font-size="12">FR</text>
      <text x="320" y="65" fill="#15803d" font-size="12">ES</text>
      <circle cx="180" cy="172" r="125" stroke="#94a3b8" stroke-dasharray="4 5" fill="none"/>
      <g data-compass transform="translate(30 296)" fill="#64748b" font-size="9" text-anchor="middle">
        <circle r="11" fill="none" stroke="#cbd5e1" stroke-dasharray="2 3"/>
        <path d="M0 -7 L2.6 0 L0 7 L-2.6 0 Z" fill="#0f766e"/>
        <text x="0" y="-15" fill="#0f766e" font-weight="bold">E</text>
        <text x="18" y="3">S</text>
        <text x="0" y="22">O</text>
        <text x="-18" y="3">N</text>
      </g>
      <g data-paths></g>
      <g data-traces></g>
      <g data-people></g>
      <line x1="70" y1="172" x2="290" y2="172" stroke="#0f766e" stroke-width="1"
            stroke-dasharray="3 3" aria-hidden="true"/>
      <line x1="70" y1="168" x2="70" y2="176" stroke="#0f766e" stroke-width="1" aria-hidden="true"/>
      <line x1="290" y1="168" x2="290" y2="176" stroke="#0f766e" stroke-width="1" aria-hidden="true"/>
      <text x="180" y="60" text-anchor="middle" fill="#0f766e" font-size="9">Ø 10 m</text>
      <g data-stage-scale transform="translate(228 320)" fill="#334155" font-size="8">
        <line x1="0" y1="0" x2="110" y2="0" stroke="#334155" stroke-width="1.4"/>
        <line x1="0" y1="-3" x2="0" y2="3" stroke="#334155" stroke-width="1.4"/>
        <line x1="110" y1="-3" x2="110" y2="3" stroke="#334155" stroke-width="1.4"/>
        <text x="55" y="-4" text-anchor="middle">5 m</text>
      </g>
      <text x="8" y="328" text-anchor="start" fill="#64748b" font-size="10">
        Invitados alrededor · Pierre en el sector FR
      </text>
    </svg>

    <h3>Plano del espacio · medido en Google Maps</h3>
    <p class="ceremonia__note">
      Polígono real de la terraza: <strong>182.8 m²</strong> y <strong>51.2 m</strong> de
      perímetro. El círculo de baile mide <strong>10 m de diámetro</strong> (radio 5 m);
      su centro es provisional hasta que marquemos el punto exacto en el suelo.
    </p>
    <svg class="ceremonia__stage" data-space viewBox="0 0 360 300" role="img"
         aria-label="Plano a escala de la terraza de El Faro, el círculo de baile de 10 metros y la torre"></svg>

    <h3>Vueltas del caracol · metros por vuelta</h3>
    <p class="ceremonia__note">
      Cada vuelta es más corta que la anterior. El <strong>paso</strong> es la
      diferencia de radio con la vuelta siguiente.
    </p>
    <div data-rings class="ceremonia__rings"></div>

    <div class="ceremonia__bar ceremonia__bar--between">
      <span>🔵 David · 🟠 Aydé</span>
      <span class="ceremonia__clock"><strong data-clock>00:00</strong> / <span data-total>00:00</span></span>
    </div>
    <input class="ceremonia__scrub" data-scrub type="range" min="0" max="630" value="0" step="0.05"
           aria-label="Tiempo del audio">

    <div class="ceremonia__bar">
      <button type="button" class="dashboard-button" data-play>▶ Reproducir</button>
      <button type="button" class="dashboard-button" data-back>−10 s</button>
      <button type="button" class="dashboard-button" data-next>+10 s</button>
      <label>Velocidad
        <select data-rate>
          <option value="0.5">×0.5</option>
          <option value="0.75">×0.75</option>
          <option value="1">×1</option>
          <option value="1.25">×1.25</option>
          <option value="1.5">×1.5</option>
        </select>
      </label>
      <label><input data-loop type="checkbox"> Repetir</label>
      <label>Vueltas <input data-turns type="number" min="1" max="20" step="0.1" style="width:70px"></label>
      <label>Duración total
        <input data-duration type="number" min="1" step="1" style="width:80px"
               aria-label="Duración total en segundos">
        <span class="ceremonia__cue-kind" data-duration-hint></span>
      </label>
    </div>

    <div class="ceremonia__grid">
      <div class="ceremonia__card">
        <h4>Referencia del usuario (01:44)</h4>
        <p class="ceremonia__note">
          Tiempo dado por el usuario. Su significado musical está pendiente de
          interpretación: no es un corte ni una duración de canción.
        </p>
        <div class="ceremonia__bar">
          <input data-ref type="number" min="0" step="0.5" style="width:90px" aria-label="Segundos de referencia">
          <button type="button" class="dashboard-button" data-ref-go>Ir</button>
          <span class="ceremonia__cue-kind" data-ref-label></span>
        </div>
      </div>
      <div class="ceremonia__card">
        <h4>Encuentros provisionales</h4>
        <p class="ceremonia__note">
          Un encuentro exige que ambos estén en el mismo punto al mismo tiempo.
          Que las trayectorias se crucen no cuenta.
        </p>
        <div class="ceremonia__bar">
          <button type="button" class="dashboard-button" data-meet-detect>Detectar</button>
          <span class="ceremonia__cue-kind" data-meet-count></span>
        </div>
        <div data-meetings></div>
      </div>
      <div class="ceremonia__card">
        <h4>Escala real</h4>
        <p class="ceremonia__note">
          Diámetro medido en el mapa: <strong>10 m → radio 5 m</strong>. Con 11:44 de
          música el caracol no se puede recorrer a paso humano: la caminata dura una
          ventana y después se quedan en el centro.
        </p>
        <div class="ceremonia__bar">
          <label>Radio (m)
            <input data-radius type="number" min="0.5" max="60" step="0.1" style="width:74px">
          </label>
          <label>Objetivo (m/s)
            <input data-target-speed type="number" min="0.02" max="2" step="0.01" style="width:74px">
          </label>
          <label>Caminata (s)
            <input data-walk type="number" min="10" max="3600" step="5" style="width:80px">
          </label>
          <label>Inicio (s)
            <input data-start type="number" min="0" max="3600" step="5" style="width:80px">
          </label>
          <span class="ceremonia__cue-kind" data-walk-hint></span>
        </div>
        <div class="ceremonia__bar">
          <button type="button" class="dashboard-button" data-fit-walk>Ajustar caminata a la velocidad</button>
          <button type="button" class="dashboard-button" data-solve-turns>Ajustar vueltas</button>
        </div>
        <p class="ceremonia__note" data-scale-info></p>
      </div>
    </div>

    <h3>Cues</h3>
    <div class="ceremonia__bar">
      <input data-cue-label type="text" maxlength="80" placeholder="Nombre del cue" style="flex:1;min-width:160px">
      <button type="button" class="dashboard-button" data-cue-add>Añadir en el tiempo actual</button>
    </div>
    <div data-cues></div>

    <details class="ceremonia__advanced">
      <summary>Timelines de movimiento (avanzado)</summary>
      <p class="ceremonia__note">
        Por defecto la caminata es de <strong>velocidad lineal constante</strong>:
        cada tramo de tiempo cubre la misma distancia, así que el caracol “gira
        más” al acercarse al centro. Editar los keyframes cambia esa coreografía.
      </p>
      <div class="ceremonia__grid">
        <div class="ceremonia__card">
          <h4>🔵 David · ahora <span data-david-now>0%</span> · <span data-hand-label="david"></span></h4>
          <label>Mano
            <select data-hand="david">
              <option value="sinistral">Zurdo · levógiro</option>
              <option value="dextral">Diestro · dextrógiro</option>
            </select>
          </label>
          <div data-kf-david></div>
          <button type="button" class="dashboard-button" data-kf-add="david">+ Keyframe aquí</button>
        </div>
        <div class="ceremonia__card">
          <h4>🟠 Aydé · ahora <span data-ayde-now>0%</span> · <span data-hand-label="ayde"></span></h4>
          <label>Mano
            <select data-hand="ayde">
              <option value="sinistral">Zurdo · levógiro</option>
              <option value="dextral">Diestro · dextrógiro</option>
            </select>
          </label>
          <div data-kf-ayde></div>
          <button type="button" class="dashboard-button" data-kf-add="ayde">+ Keyframe aquí</button>
        </div>
      </div>
      <button type="button" class="dashboard-button" data-reset-walk>
        ↺ Recalcular caminata uniforme
      </button>
    </details>

    <div class="ceremonia__bar">
      <button type="button" class="dashboard-button" data-export>↓ Exportar JSON</button>
      <label class="dashboard-button">
        ↑ Importar JSON
        <input data-import type="file" accept="application/json,.json" hidden>
      </label>
    </div>
    <p class="ceremonia__status" data-status role="status">
      Configuración guardada en este navegador. Exporta JSON para conservarla.
    </p>
  </div>
  <audio data-audio preload="metadata"></audio>
  `;

  const q = (selector) => host.querySelector(selector);
  const audio = q("[data-audio]");
  const scrub = q("[data-scrub]");
  const clockEl = q("[data-clock]");
  const totalEl = q("[data-total]");
  const playBtn = q("[data-play]");
  const statusEl = q("[data-status]");
  const modeBadge = q("[data-mode]");
  const audioNameEl = q("[data-audio-name]");
  const pathsLayer = q("[data-paths]");
  const tracesLayer = q("[data-traces]");
  const peopleLayer = q("[data-people]");
  const davidNow = q("[data-david-now]");
  const aydeNow = q("[data-ayde-now]");

  let dots = [];
  let traceEls = [];
  let spiralPoints = [[], []];

  const hasAudio = () => Boolean(audio.getAttribute("src"));
  const handednessOf = (person) => state.dancers[DANCERS[person].key].handedness;
  const durationSec = () =>
    Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : state.duration;
  const timeNow = () => (hasAudio() ? audio.currentTime : syntheticTime);

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, serializeChoreography(state));
    } catch {
      setStatus("No se pudo guardar: almacenamiento del navegador lleno o bloqueado.");
    }
  }

  function setMode() {
    const withAudio = hasAudio();
    modeBadge.textContent = !withAudio
      ? "Sin audio · reloj de ensayo"
      : importedAudio
        ? "Audio importado · reloj real"
        : "Audio de la ceremonia · reloj real";
    modeBadge.classList.toggle("ceremonia__badge--warn", !withAudio);
  }

  function buildStage() {
    const ns = "http://www.w3.org/2000/svg";
    const make = (tag, attrs, parent) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      parent.appendChild(node);
      return node;
    };

    pathsLayer.replaceChildren();
    tracesLayer.replaceChildren();
    peopleLayer.replaceChildren();
    traceEls = [];
    dots = [];
    spiralPoints = [0, 1].map((person) =>
      Array.from({ length: SAMPLES + 1 }, (_, index) =>
        spiralPoint(person, index / SAMPLES, state.turns, undefined, handednessOf(person)),
      ),
    );

    DANCERS.forEach((dancer, person) => {
      make(
        "path",
        {
          d: spiralPath(person, state.turns, 480, handednessOf(person)),
          fill: "none",
          stroke: dancer.color,
          "stroke-width": "1.6",
          "stroke-opacity": ".36",
        },
        pathsLayer,
      );
      traceEls.push(
        make(
          "path",
          { d: "", fill: "none", stroke: dancer.color, "stroke-width": "3" },
          tracesLayer,
        ),
      );
      const group = make("g", { transform: "translate(180 172)" }, peopleLayer);
      // The head (emoji) lives inside a spinning group, plus a small "nose"
      // marker so the rotation is readable even with a symmetric face.
      const spin = make("g", { "data-spin": "" }, group);
      make("circle", { r: "12", fill: dancer.color, "fill-opacity": ".18" }, spin);
      const head = make(
        "text",
        {
          x: "0",
          y: "1",
          "text-anchor": "middle",
          "dominant-baseline": "central",
          "font-size": "16",
        },
        spin,
      );
      head.textContent = dancer.emoji;
      make(
        "circle",
        {
          cx: "0",
          cy: "-14",
          r: "2.4",
          fill: dancer.color,
          stroke: "white",
          "stroke-width": ".8",
        },
        spin,
      );
      const label = make(
        "text",
        {
          x: "0",
          y: "25",
          "text-anchor": "middle",
          fill: dancer.color,
          "font-size": "9",
          "font-weight": "bold",
        },
        group,
      );
      label.textContent = dancer.label;
      dots.push({ group, spin });
    });

    drawSpacePlan();
    renderRings();
  }

  /** To-scale plan of the measured terrace, the dance circle and the tower. */
  function drawSpacePlan() {
    const svg = q("[data-space]");
    if (!svg) return;
    const W = 360;
    const H = 300;
    const pad = 34;
    const fit = fitTransform(TERRACE_POLYGON, W, H, pad);
    const toX = (u) => u * fit.scale + fit.offsetX;
    const toY = (v) => v * fit.scale + fit.offsetY;
    const center = polygonCentroid(TERRACE_POLYGON);
    const cx = toX(center.x);
    const cy = toY(center.y);
    const radiusPx = state.stage.radiusMeters * fit.scale;

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

    // Measured terrace.
    make("polygon", {
      points: TERRACE_POLYGON.map(
        ([u, v]) => `${toX(u).toFixed(1)},${toY(v).toFixed(1)}`,
      ).join(" "),
      fill: "#f3efe7",
      stroke: "#94a3b8",
      "stroke-width": "1.4",
    });

    // Dance circle (the radius actually configured in the panel).
    make("circle", {
      cx,
      cy,
      r: radiusPx,
      fill: "#ffffff",
      "fill-opacity": "0.4",
      stroke: "#0f766e",
      "stroke-width": "1.2",
      "stroke-dasharray": "4 4",
    });

    // The real spiral, scaled to the circle.
    const spiralScale = radiusPx / 110;
    const spiral = make("g", {
      transform:
        `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) ` +
        `scale(${spiralScale.toFixed(4)}) translate(-180 -172)`,
      fill: "none",
    });
    DANCERS.forEach((dancer, person) => {
      make(
        "path",
        {
          d: spiralPath(person, state.turns, 240, state.dancers[dancer.key].handedness),
          stroke: dancer.color,
          "stroke-width": (1.3 / spiralScale).toFixed(2),
          "stroke-opacity": "0.5",
        },
        spiral,
      );
    });

    // Tower at its measured position (0, 0) → up = east.
    const towerX = toX(0);
    const towerY = toY(0);
    make("circle", {
      cx: towerX,
      cy: towerY,
      r: (TOWER_DIAMETER_M / 2) * fit.scale,
      fill: "#1f2937",
    });
    label(towerX + (TOWER_DIAMETER_M / 2) * fit.scale + 4, towerY + 3, "TORRE", {
      "font-size": "9",
      fill: "#1f2937",
      "font-weight": "bold",
    });

    // FR / ES sectors around the circle.
    label(cx - radiusPx - 5, cy + 3, "FR", {
      "text-anchor": "end",
      "font-size": "10",
      fill: "#2563eb",
      "font-weight": "bold",
    });
    label(cx + radiusPx + 5, cy + 3, "ES", {
      "font-size": "10",
      fill: "#15803d",
      "font-weight": "bold",
    });

    // Width dimension (top).
    const xs = TERRACE_POLYGON.map(([u]) => u);
    const ys = TERRACE_POLYGON.map(([, v]) => v);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const dimY = toY(minY) - 10;
    make("line", {
      x1: toX(minX),
      y1: dimY,
      x2: toX(maxX),
      y2: dimY,
      stroke: "#94a3b8",
      "stroke-width": "0.8",
    });
    make("line", { x1: toX(minX), y1: dimY - 3, x2: toX(minX), y2: dimY + 3, stroke: "#94a3b8" });
    make("line", { x1: toX(maxX), y1: dimY - 3, x2: toX(maxX), y2: dimY + 3, stroke: "#94a3b8" });
    label((toX(minX) + toX(maxX)) / 2, dimY - 3, `${(maxX - minX).toFixed(1)} m`, {
      "text-anchor": "middle",
    });

    // Height dimension (right).
    const dimX = toX(maxX) + 10;
    make("line", {
      x1: dimX,
      y1: toY(minY),
      x2: dimX,
      y2: toY(maxY),
      stroke: "#94a3b8",
      "stroke-width": "0.8",
    });
    const heightLabel = label(dimX + 2, (toY(minY) + toY(maxY)) / 2, `${(maxY - minY).toFixed(1)} m`, {
      "font-size": "8",
    });
    heightLabel.setAttribute("transform", `rotate(-90 ${dimX + 8} ${(toY(minY) + toY(maxY)) / 2})`);

    // Metrics + scale bar.
    label(
      8,
      16,
      `${MAPS_AREA_M2.toFixed(1)} m² · perímetro ${MAPS_PERIMETER_M.toFixed(1)} m`,
      { "font-size": "9", fill: "#334155" },
    );
    label(cx, cy + radiusPx + 14, `círculo Ø ${(state.stage.radiusMeters * 2).toFixed(1)} m`, {
      "text-anchor": "middle",
      "font-size": "8",
      fill: "#0f766e",
    });

    const bar = make("g", { transform: `translate(20 ${H - 16})`, fill: "#334155" });
    make("line", { x1: 0, y1: 0, x2: 5 * fit.scale, y2: 0, stroke: "#334155", "stroke-width": "1.4" }, bar);
    make("line", { x1: 0, y1: -3, x2: 0, y2: 3, stroke: "#334155", "stroke-width": "1.4" }, bar);
    make(
      "line",
      { x1: 5 * fit.scale, y1: -3, x2: 5 * fit.scale, y2: 3, stroke: "#334155", "stroke-width": "1.4" },
      bar,
    );
    const barLabel = make("text", { x: (5 * fit.scale) / 2, y: -4, "font-size": "8", fill: "#334155", "text-anchor": "middle" }, bar);
    barLabel.textContent = "5 m";
    label(W - 8, H - 16, "E ↑", { "text-anchor": "end", "font-size": "9" });
  }

  /** Table: meters walked on each lap and the radial gap to the next ring. */
  function renderRings() {
    const rows = ringMetrics(state.turns, state.stage.radiusMeters);
    const box = q("[data-rings]");
    if (!box) return;
    const total = rows.reduce((sum, row) => sum + row.meters, 0);
    box.innerHTML = `
      <table class="ceremonia__table">
        <thead>
          <tr><th>Vuelta</th><th>Radio (m)</th><th>Metros a caminar</th><th>Paso (m)</th></tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `<tr>
                <td>${row.lap}</td>
                <td>${row.fromM.toFixed(1)} → ${row.toM.toFixed(1)}</td>
                <td>${row.meters.toFixed(1)}</td>
                <td>${row.stepM.toFixed(2)}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr><td colspan="2">Total del caracol</td><td>${total.toFixed(1)} m</td><td></td></tr>
        </tfoot>
      </table>
    `;
  }

  function traceFor(person, progress) {
    const points = spiralPoints[person];
    if (!points.length) return "";
    const index = Math.min(SAMPLES, Math.max(0, Math.round(progress * SAMPLES)));
    let d = "";
    for (let i = 0; i <= index; i += 1) {
      d += `${i ? "L" : "M"}${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
    }
    return d;
  }

  function draw() {
    const limit = durationSec();
    const t = Math.max(0, Math.min(timeNow(), limit));
    const progress = {
      david: progressAt(state.dancers.david.keyframes, t),
      ayde: progressAt(state.dancers.ayde.keyframes, t),
    };
    const { radiusMeters, bodyRadiusMeters } = state.stage;

    DANCERS.forEach((dancer, person) => {
      const p = progress[dancer.key];
      const handedness = state.dancers[dancer.key].handedness;
      const point = spiralPoint(person, p, state.turns, undefined, handedness);
      const dot = dots[person];
      dot?.group.setAttribute(
        "transform",
        `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`,
      );
      // Signed self-rotation: dextral and sinistral shells roll opposite ways.
      const spin =
        signedSpinDegrees(p, state.turns, radiusMeters, bodyRadiusMeters, handedness) % 360;
      dot?.spin.setAttribute("transform", `rotate(${spin.toFixed(1)})`);
      traceEls[person]?.setAttribute("d", traceFor(person, p));
    });

    clockEl.textContent = formatClock(t);
    totalEl.textContent = formatClock(limit);
    if (!scrubbing) scrub.value = String(Math.min(t, Number(scrub.max) || 0));
    davidNow.textContent = `${Math.round(progress.david * 100)}%`;
    aydeNow.textContent = `${Math.round(progress.ayde * 100)}%`;
  }

  function updateHandLabels() {
    DANCERS.forEach((dancer) => {
      const hand = state.dancers[dancer.key].handedness;
      q(`[data-hand-label="${dancer.key}"]`).textContent =
        hand === "sinistral" ? "zurdo · levógiro" : "diestro · dextrógiro";
    });
  }

  /** Distancia, velocidad media y giros sobre sí, dentro de la ventana de caminata. */
  function updateScaleInfo() {
    const { radiusMeters, bodyRadiusMeters } = state.stage;
    const start = Math.max(0, Math.min(state.stage.startSeconds, state.duration - 1));
    const windowSeconds = Math.max(1, Math.min(state.stage.walkSeconds, state.duration - start));
    const totalMeters = pathMetersTotal(state.turns, radiusMeters);
    const speed = totalMeters / windowSeconds;
    const spins = bodyRadiusMeters > 0 ? totalMeters / (2 * Math.PI * bodyRadiusMeters) : 0;
    const verdict =
      speed < 0.2
        ? " · demasiado lento: acorta la caminata"
        : speed > 0.6
          ? " · demasiado rápido: alarga la caminata"
          : " · paso humano";
    q("[data-scale-info]").textContent =
      `Recorrido ${totalMeters.toFixed(1)} m de ${formatClock(start)} a ` +
      `${formatClock(start + windowSeconds)} · ${speed.toFixed(2)} m/s · ` +
      `${spins.toFixed(0)} giros sobre sí (${state.turns.toFixed(1)} vueltas)${verdict}`;
  }

  function updateWalkControl() {
    const start = Math.max(0, Math.min(state.stage.startSeconds, state.duration - 1));
    const walk = Math.max(1, Math.min(state.stage.walkSeconds, state.duration - start));
    q("[data-walk]").value = String(Math.round(walk));
    q("[data-start]").value = String(Math.round(start));
    q("[data-walk-hint]").textContent =
      `${formatClock(start)} → ${formatClock(start + walk)} de ${formatClock(state.duration)}`;
  }

  /** Both dancers walk the spiral at constant linear speed, inside the window. */
  function resetWalking(announce = true) {
    state.dancers.david.keyframes = walkingKeyframes(
      state.duration,
      state.turns,
      state.stage.walkSeconds,
      state.stage.startSeconds,
    );
    state.dancers.ayde.keyframes = walkingKeyframes(
      state.duration,
      state.turns,
      state.stage.walkSeconds,
      state.stage.startSeconds,
    );
    saveState();
    renderKeyframes("david");
    renderKeyframes("ayde");
    updateScaleInfo();
    updateWalkControl();
    draw();
    if (announce) {
      setStatus(
        `Caminata recalculada: ${formatClock(state.stage.walkSeconds)} a velocidad lineal constante.`,
      );
    }
  }

  function setPlayLabel() {
    playBtn.textContent = playing ? "Ⅱ Pausa" : "▶ Reproducir";
  }

  function stop() {
    playing = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    if (hasAudio()) audio.pause();
    setPlayLabel();
  }

  /**
   * Seek is applied to the AUDIO only; the drawing is derived on the next
   * frame, so both dancers land exactly where the audio landed.
   */
  function seekTo(seconds) {
    const target = Math.max(0, Math.min(Number(seconds) || 0, durationSec()));
    if (hasAudio()) {
      audio.currentTime = target;
    } else {
      syntheticTime = target;
    }
    draw();
  }

  function frame() {
    if (!playing) return;
    if (!hasAudio()) {
      const now = performance.now();
      syntheticTime += ((now - syntheticLast) / 1000) * state.settings.rate;
      syntheticLast = now;
      if (syntheticTime >= durationSec()) {
        syntheticTime = durationSec();
        draw();
        stop();
        return;
      }
    }
    draw();
    rafId = requestAnimationFrame(frame);
  }

  async function play() {
    if (playing) {
      stop();
      return;
    }
    if (hasAudio()) {
      if (audio.currentTime >= durationSec() - 0.01) audio.currentTime = 0;
      try {
        await audio.play();
      } catch (error) {
        setStatus(`El navegador no permitió reproducir el audio: ${error.message}`);
        return;
      }
      // The "play" event may have already started the loop; avoid two loops.
      if (playing) return;
    } else {
      syntheticLast = performance.now();
      if (syntheticTime >= durationSec() - 0.01) syntheticTime = 0;
    }
    playing = true;
    setPlayLabel();
    rafId = requestAnimationFrame(frame);
  }

  // ── Audio: the imported file is the only clock ──────────────────────────
  function readAudioDuration(file) {
    return new Promise((resolve) => {
      const probe = new Audio();
      const url = URL.createObjectURL(file);
      let done = false;
      let timer = 0;
      const finish = (value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        probe.removeAttribute("src");
        resolve(value);
      };
      timer = setTimeout(() => finish(0), 1500);
      probe.preload = "metadata";
      probe.addEventListener(
        "loadedmetadata",
        () => finish(Number.isFinite(probe.duration) ? probe.duration : 0),
        { once: true },
      );
      probe.addEventListener("error", () => finish(0), { once: true });
      probe.src = url;
    });
  }

  /** Keep the choreography proportional when the real audio is longer/shorter. */
  function applyAudioDuration(seconds) {
    const next = Math.round(seconds * 100) / 100;
    if (Math.abs(next - state.duration) > 0.5) {
      state = rescaleChoreography(state, next);
      saveState();
      renderCues();
      renderKeyframes("david");
      renderKeyframes("ayde");
      setStatus(
        `Duración real del audio: ${formatClock(state.duration)}. La timeline se reescaló proporcionalmente.`,
      );
    }
    state.stage.startSeconds = Math.min(state.stage.startSeconds, state.duration - 1);
    state.stage.walkSeconds = Math.min(
      state.stage.walkSeconds,
      state.duration - state.stage.startSeconds,
    );
    updateDurationControl();
    updateWalkControl();
    q("[data-total]").textContent = formatClock(state.duration);
    draw();
  }

  /**
   * The duration field is only editable without audio: once a file is loaded,
   * its real length is the timeline (the audio is the clock).
   */
  function updateDurationControl() {
    const input = q("[data-duration]");
    input.value = String(Math.round(state.duration * 100) / 100);
    input.disabled = hasAudio();
    input.title = hasAudio()
      ? "La duración la marca el audio importado"
      : "Segundos de la timeline de ensayo";
    q("[data-duration-hint]").textContent = formatClock(state.duration);
    scrub.max = String(Math.round(state.duration * 100) / 100);
    updateScaleInfo();
  }

  async function attachAudio(record) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(record.blob);
    importedAudio = true;
    audio.src = objectUrl;
    audio.playbackRate = state.settings.rate;
    audio.loop = state.settings.loop;
    audioNameEl.textContent = `${record.name} · ${formatClock(record.duration || 0)}`;
    setMode();
    updateDurationControl();
  }

  /** Fall back to the track shipped with the dashboard (no IndexedDB needed). */
  function attachDefaultAudio() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    importedAudio = false;
    audio.src = DEFAULT_AUDIO.src;
    audio.playbackRate = state.settings.rate;
    audio.loop = state.settings.loop;
    audioNameEl.textContent = DEFAULT_AUDIO.name;
    setMode();
    updateDurationControl();
  }

  async function importAudio(file) {
    if (!isSupportedAudioFile(file)) {
      setStatus(
        "Archivo no admitido: usa MP3, WAV, M4A, AAC, OGG o WebM de menos de 48 MB.",
      );
      return;
    }
    stop();
    const duration = await readAudioDuration(file);
    const record = {
      blob: file,
      name: file.name,
      type: file.type,
      size: file.size,
      duration,
      savedAt: Date.now(),
    };
    const stored = await saveAudio(record);
    await attachAudio(record);
    if (duration > 0) applyAudioDuration(duration);
    draw();
    if (stored) {
      setStatus(`Audio cargado: ${file.name} · ${formatClock(duration)}. Solo en este navegador.`);
    } else {
      setStatus(
        "Audio cargado para esta sesión, pero el navegador no permite recordarlo (IndexedDB no disponible).",
      );
    }
  }

  async function removeAudio() {
    stop();
    audio.pause();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    await clearAudio();
    // Revert to the track that ships with the dashboard instead of silence.
    attachDefaultAudio();
    draw();
    setStatus(
      "Audio importado quitado. Se usa el audio de la ceremonia incluido; los cues y keyframes se conservan.",
    );
  }

  // ── Cues ────────────────────────────────────────────────────────────────
  function renderCues() {
    const box = q("[data-cues]");
    box.replaceChildren();
    [...state.cues]
      .sort((a, b) => a.t - b.t)
      .forEach((cue) => {
        const row = document.createElement("div");
        row.className = "ceremonia__cue";

        const go = document.createElement("button");
        go.type = "button";
        go.className = "dashboard-button";
        go.textContent = formatClock(cue.t);
        go.setAttribute("aria-label", `Ir a ${formatClock(cue.t)}`);
        go.addEventListener("click", () => seekTo(cue.t), listens);

        const label = document.createElement("span");
        label.className = "ceremonia__cue-label";
        label.textContent = cue.label;

        const kind = document.createElement("span");
        kind.className = "ceremonia__cue-kind";
        kind.textContent =
          cue.kind === "user-reference"
            ? "referencia"
            : cue.kind === "suggested"
              ? "sugerida"
              : "cue";

        const del = document.createElement("button");
        del.type = "button";
        del.className = "dashboard-button ceremonia__danger";
        del.textContent = "×";
        del.setAttribute("aria-label", `Eliminar ${cue.label}`);
        del.addEventListener(
          "click",
          () => {
            state.cues = state.cues.filter((item) => item.id !== cue.id);
            saveState();
            renderCues();
          },
          listens,
        );

        row.append(go, label, kind, del);
        box.append(row);
      });

    q("[data-ref]").value = String(Math.round(state.track.referenceSec * 10) / 10);
    q("[data-ref-label]").textContent = formatClock(state.track.referenceSec);
  }

  // ── Motion timelines ────────────────────────────────────────────────────
  function renderKeyframes(dancerKey) {
    const box = q(`[data-kf-${dancerKey}]`);
    box.replaceChildren();
    state.dancers[dancerKey].keyframes.forEach((keyframe, index) => {
      const row = document.createElement("div");
      row.className = "ceremonia__row";

      const time = document.createElement("input");
      time.type = "number";
      time.min = "0";
      time.step = "0.1";
      time.value = String(keyframe.t);
      time.setAttribute("aria-label", `Tiempo del keyframe ${index + 1}`);
      time.addEventListener(
        "change",
        () => {
          keyframe.t = Math.max(0, Math.min(Number(time.value) || 0, state.duration));
          state.dancers[dancerKey].keyframes.sort((a, b) => a.t - b.t);
          saveState();
          renderKeyframes(dancerKey);
          draw();
        },
        listens,
      );

      const progress = document.createElement("input");
      progress.type = "number";
      progress.min = "0";
      progress.max = "1";
      progress.step = "0.01";
      progress.value = String(keyframe.p);
      progress.setAttribute("aria-label", `Progreso del keyframe ${index + 1}`);
      progress.addEventListener(
        "change",
        () => {
          keyframe.p = Math.max(0, Math.min(Number(progress.value) || 0, 1));
          saveState();
          draw();
        },
        listens,
      );

      const ease = document.createElement("select");
      ease.setAttribute("aria-label", `Curva del keyframe ${index + 1}`);
      EASINGS.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        ease.append(option);
      });
      ease.value = keyframe.ease;
      ease.addEventListener(
        "change",
        () => {
          keyframe.ease = ease.value;
          saveState();
          draw();
        },
        listens,
      );

      const del = document.createElement("button");
      del.type = "button";
      del.className = "dashboard-button ceremonia__danger";
      del.textContent = "×";
      del.setAttribute("aria-label", `Eliminar keyframe ${index + 1}`);
      del.addEventListener(
        "click",
        () => {
          if (state.dancers[dancerKey].keyframes.length <= 1) {
            setStatus("Cada bailarín necesita al menos un keyframe.");
            return;
          }
          state.dancers[dancerKey].keyframes.splice(index, 1);
          saveState();
          renderKeyframes(dancerKey);
          draw();
        },
        listens,
      );

      row.append(time, progress, ease, del);
      box.append(row);
    });
  }

  // ── Provisional meetings ────────────────────────────────────────────────
  function renderMeetings() {
    const box = q("[data-meetings]");
    const count = q("[data-meet-count]");
    box.replaceChildren();
    count.textContent = meetings.length
      ? `${meetings.length} sugerencia(s) · revisar antes de usar`
      : "sin detección";

    meetings.forEach((meeting) => {
      const row = document.createElement("div");
      row.className = "ceremonia__cue";

      const go = document.createElement("button");
      go.type = "button";
      go.className = "dashboard-button";
      go.textContent = formatClock(meeting.t);
      go.addEventListener("click", () => seekTo(meeting.t), listens);

      const info = document.createElement("span");
      info.className = "ceremonia__cue-label";
      info.textContent = `${meeting.duration.toFixed(1)} s · ${meeting.distance} px`;

      const add = document.createElement("button");
      add.type = "button";
      add.className = "dashboard-button";
      add.textContent = "→ cue";
      add.setAttribute("aria-label", `Añadir cue en ${formatClock(meeting.t)}`);
      add.addEventListener(
        "click",
        () => {
          state.cues.push({
            id: `meeting-${Date.now()}`,
            t: meeting.t,
            label: `Encuentro provisional ${formatClock(meeting.t)}`,
            kind: "suggested",
          });
          saveState();
          renderCues();
          setStatus("Cue añadido como SUGERENCIA. Revísalo antes de darlo por bueno.");
        },
        listens,
      );

      row.append(go, info, add);
      box.append(row);
    });
  }

  function syncControls() {
    const rateSelect = q("[data-rate]");
    const options = [...rateSelect.options].map((option) => Number(option.value));
    const nearest = options.reduce(
      (best, value) =>
        Math.abs(value - state.settings.rate) < Math.abs(best - state.settings.rate)
          ? value
          : best,
      options[0],
    );
    rateSelect.value = String(nearest);
    q("[data-loop]").checked = state.settings.loop;
    q("[data-turns]").value = String(state.turns);
    q("[data-radius]").value = String(state.stage.radiusMeters);
    q("[data-target-speed]").value = String(state.stage.targetSpeedMps);
    DANCERS.forEach((dancer) => {
      q(`[data-hand="${dancer.key}"]`).value = state.dancers[dancer.key].handedness;
    });
    updateHandLabels();
    updateDurationControl();
    updateWalkControl();
    updateScaleInfo();
    if (hasAudio()) audio.playbackRate = state.settings.rate;
    audio.loop = state.settings.loop;
    renderCues();
    renderKeyframes("david");
    renderKeyframes("ayde");
    renderMeetings();
    draw();
  }

  // ── Export / import (JSON only, never audio) ────────────────────────────
  function exportJson() {
    const blob = new Blob([serializeChoreography(state)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ceremonia-player.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("JSON exportado: cues, keyframes y ajustes. No contiene audio.");
  }

  async function importJson(file) {
    try {
      const parsed = JSON.parse(await file.text());
      stop();
      state = sanitizeChoreography(parsed);
      saveState();
      syncControls();
      setStatus("JSON importado y validado contra el esquema v2.");
    } catch (error) {
      setStatus(`No se pudo importar: ${esc(error.message)}`);
    }
  }

  // ── Wiring ──────────────────────────────────────────────────────────────
  playBtn.addEventListener("click", play, listens);
  q("[data-back]").addEventListener("click", () => seekTo(timeNow() - 10), listens);
  q("[data-next]").addEventListener("click", () => seekTo(timeNow() + 10), listens);

  scrub.addEventListener(
    "input",
    () => {
      scrubbing = true;
      seekTo(Number(scrub.value));
    },
    listens,
  );
  scrub.addEventListener(
    "change",
    () => {
      scrubbing = false;
      draw();
    },
    listens,
  );

  q("[data-rate]").addEventListener(
    "change",
    (event) => {
      state.settings.rate = Number(event.target.value);
      if (hasAudio()) audio.playbackRate = state.settings.rate;
      saveState();
    },
    listens,
  );

  q("[data-loop]").addEventListener(
    "change",
    (event) => {
      state.settings.loop = event.target.checked;
      audio.loop = state.settings.loop;
      saveState();
    },
    listens,
  );

  q("[data-turns]").addEventListener(
    "change",
    (event) => {
      state.turns = Math.max(1, Math.min(Number(event.target.value) || 1, 20));
      event.target.value = String(state.turns);
      buildStage();
      resetWalking(false);
      setStatus(
        `Vueltas ajustadas a ${state.turns}. Caminata recalculada a velocidad lineal constante.`,
      );
    },
    listens,
  );

  q("[data-radius]").addEventListener(
    "change",
    (event) => {
      state.stage.radiusMeters = Math.min(
        60,
        Math.max(0.5, Number(event.target.value) || 4),
      );
      event.target.value = String(state.stage.radiusMeters);
      saveState();
      updateScaleInfo();
      drawSpacePlan();
      renderRings();
      draw();
    },
    listens,
  );

  q("[data-target-speed]").addEventListener(
    "change",
    (event) => {
      state.stage.targetSpeedMps = Math.min(
        2,
        Math.max(0.02, Number(event.target.value) || 0.35),
      );
      event.target.value = String(state.stage.targetSpeedMps);
      saveState();
    },
    listens,
  );

  q("[data-solve-turns]").addEventListener(
    "click",
    () => {
      const turns = solveTurnsForSpeed({
        duration: Math.min(state.stage.walkSeconds, state.duration),
        radiusMeters: state.stage.radiusMeters,
        targetSpeedMps: state.stage.targetSpeedMps,
      });
      if (!turns) {
        setStatus("No se pudo calcular: revisa el radio y la velocidad objetivo.");
        return;
      }
      state.turns = turns;
      q("[data-turns]").value = String(turns);
      buildStage();
      resetWalking(false);
      setStatus(
        `Vueltas ajustadas a ${turns} para caminar a ${state.stage.targetSpeedMps} m/s.`,
      );
    },
    listens,
  );

  q("[data-reset-walk]").addEventListener("click", () => resetWalking(true), listens);

  q("[data-walk]").addEventListener(
    "change",
    (event) => {
      const value = Number(event.target.value);
      state.stage.walkSeconds = Math.max(
        10,
        Math.min(
          Number.isFinite(value) ? value : 270,
          state.duration - state.stage.startSeconds,
        ),
      );
      resetWalking(false);
      setStatus(
        `Ventana de caminata: ${formatClock(state.stage.walkSeconds)} ` +
          `desde ${formatClock(state.stage.startSeconds)}.`,
      );
    },
    listens,
  );

  q("[data-start]").addEventListener(
    "change",
    (event) => {
      const value = Number(event.target.value);
      state.stage.startSeconds = Math.max(
        0,
        Math.min(Number.isFinite(value) ? value : 255, state.duration - 10),
      );
      state.stage.walkSeconds = Math.min(
        state.stage.walkSeconds,
        state.duration - state.stage.startSeconds,
      );
      resetWalking(false);
      setStatus(
        `Empiezan a caminar a las ${formatClock(state.stage.startSeconds)} ` +
          `(quietos antes).`,
      );
    },
    listens,
  );

  q("[data-fit-walk]").addEventListener(
    "click",
    () => {
      const seconds = solveWalkSeconds({
        turns: state.turns,
        radiusMeters: state.stage.radiusMeters,
        targetSpeedMps: state.stage.targetSpeedMps,
      });
      if (!seconds) {
        setStatus("No se pudo calcular: revisa radio y velocidad objetivo.");
        return;
      }
      state.stage.walkSeconds = Math.max(
        10,
        Math.min(seconds, state.duration - state.stage.startSeconds),
      );
      resetWalking(false);
      setStatus(
        `Caminata ajustada a ${formatClock(state.stage.walkSeconds)} para ${state.stage.targetSpeedMps} m/s.`,
      );
    },
    listens,
  );

  host.querySelectorAll("[data-hand]").forEach((select) => {
    select.addEventListener(
      "change",
      () => {
        const key = select.dataset.hand;
        state.dancers[key].handedness = select.value;
        saveState();
        buildStage();
        updateHandLabels();
        draw();
        setStatus(
          `${key === "david" ? "David" : "Aydé"}: ${
            select.value === "sinistral" ? "zurdo (levógiro)" : "diestro (dextrógiro)"
          }.`,
        );
      },
      listens,
    );
  });

  q("[data-duration]").addEventListener(
    "change",
    (event) => {
      const next = Number(event.target.value);
      if (!Number.isFinite(next) || next <= 0) {
        updateDurationControl();
        return;
      }
      state = rescaleChoreography(state, next);
      saveState();
      renderCues();
      renderKeyframes("david");
      renderKeyframes("ayde");
      updateDurationControl();
      seekTo(Math.min(timeNow(), state.duration));
      setStatus(`Duración total ajustada a ${formatClock(state.duration)}.`);
    },
    listens,
  );


  q("[data-file]").addEventListener(
    "change",
    async (event) => {
      const file = event.target.files?.[0];
      if (file) await importAudio(file);
      event.target.value = "";
    },
    listens,
  );

  q("[data-remove-audio]").addEventListener("click", removeAudio, listens);
  q("[data-ref-go]").addEventListener(
    "click",
    () => seekTo(Number(q("[data-ref]").value)),
    listens,
  );

  q("[data-ref]").addEventListener(
    "change",
    (event) => {
      state.track.referenceSec = Math.max(
        0,
        Math.min(Number(event.target.value) || 0, state.duration),
      );
      saveState();
      renderCues();
    },
    listens,
  );

  q("[data-cue-add]").addEventListener(
    "click",
    () => {
      const input = q("[data-cue-label]");
      const t = Math.round(timeNow() * 100) / 100;
      const label = (input.value || "").trim() || `Cue ${formatClock(t)}`;
      state.cues.push({ id: `cue-${Date.now()}`, t, label: label.slice(0, 80), kind: "cue" });
      input.value = "";
      saveState();
      renderCues();
      setStatus(`Cue añadido en ${formatClock(t)}.`);
    },
    listens,
  );

  host.querySelectorAll("[data-kf-add]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const dancerKey = button.dataset.kfAdd;
        if (!state.dancers[dancerKey]) return;
        const t = Math.round(timeNow() * 100) / 100;
        const list = state.dancers[dancerKey].keyframes;
        const existing = list.find((keyframe) => Math.abs(keyframe.t - t) < 0.05);
        if (existing) {
          existing.p = progressAt(list, t);
        } else {
          list.push({ t, p: progressAt(list, t), ease: "linear" });
        }
        saveState();
        renderKeyframes(dancerKey);
        draw();
        setStatus(
          `Keyframe de ${dancerKey === "david" ? "David" : "Aydé"} en ${formatClock(t)}.`,
        );
      },
      listens,
    );
  });

  q("[data-meet-detect]").addEventListener(
    "click",
    () => {
      meetings = detectMeetings(state);
      renderMeetings();
      setStatus(
        meetings.length
          ? "Encuentros sugeridos: son cruces simultáneos detectados, no coreografía verificada."
          : "No hay encuentros simultáneos con la tolerancia actual.",
      );
    },
    listens,
  );

  q("[data-export]").addEventListener("click", exportJson, listens);
  q("[data-import]").addEventListener(
    "change",
    async (event) => {
      const file = event.target.files?.[0];
      if (file) await importJson(file);
      event.target.value = "";
    },
    listens,
  );

  // ── Audio events: the element drives every redraw ───────────────────────
  audio.addEventListener(
    "loadedmetadata",
    () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        applyAudioDuration(audio.duration);
      }
      draw();
    },
    listens,
  );
  audio.addEventListener(
    "timeupdate",
    () => {
      if (!playing) draw();
    },
    listens,
  );
  audio.addEventListener("seeked", draw, listens);
  audio.addEventListener(
    "play",
    () => {
      if (playing) return;
      playing = true;
      setPlayLabel();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(frame);
    },
    listens,
  );
  audio.addEventListener(
    "pause",
    () => {
      if (playing) {
        playing = false;
        cancelAnimationFrame(rafId);
        rafId = 0;
        setPlayLabel();
      }
      draw();
    },
    listens,
  );
  audio.addEventListener(
    "ended",
    () => {
      stop();
      draw();
    },
    listens,
  );
  audio.addEventListener(
    "error",
    () => {
      if (!hasAudio()) return;
      if (importedAudio) {
        setStatus("No se pudo cargar el audio importado.");
      } else {
        audioNameEl.textContent = "";
        audio.removeAttribute("src");
        setStatus("No se pudo cargar el audio incluido de la ceremonia.");
        setMode();
        updateDurationControl();
      }
      stop();
    },
    listens,
  );

  // Playing while another dashboard tab is visible is confusing: pause it.
  window.addEventListener(
    "dashboard:tabchange",
    (event) => {
      if (event.detail?.tab !== "ceremonia") stop();
    },
    listens,
  );

  // ── Init ────────────────────────────────────────────────────────────────
  if (needsMigration) {
    // Persist the migrated state under the current key so the next load does
    // not need to migrate again, and drop the stale copies.
    saveState();
    try {
      PREVIOUS_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      /* storage may be blocked; the state is still migrated in memory */
    }
  }
  buildStage();
  syncControls();
  setMode();
  setPlayLabel();

  // Attach the bundled track immediately so the panel never opens silent; an
  // imported file (IndexedDB) replaces it if this browser has one.
  attachDefaultAudio();
  loadAudio()
    .then(async (record) => {
      if (!record?.blob) return;
      await attachAudio(record);
      if (record.duration) applyAudioDuration(record.duration);
      draw();
      setStatus(`Audio restaurado en este navegador: ${record.name}.`);
    })
    .catch(() => {
      /* no imported file available: the bundled track stays */
    });

  host._ceremoniaCleanup = () => {
    stop();
    abort.abort();
    audio.pause();
    audio.removeAttribute("src");
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    host.dataset.mounted = "no";
  };
}






