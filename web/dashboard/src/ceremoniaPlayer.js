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
  signedSpinDegrees,
  solveTurnsForSpeed,
  spiralPath,
  spiralPoint,
} from "./ceremonia/motion.js";

const STORAGE_KEY = "boda:ceremonia-player:v4";
const PREVIOUS_KEYS = [
  "boda:ceremonia-player:v3",
  "boda:ceremonia-player:v2",
  "boda:ceremonia-player:v1",
];
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
        Quitar audio
      </button>
      <span class="ceremonia__badge" data-mode>Sin audio · reloj de ensayo</span>
      <span data-audio-name></span>
    </div>
    <p class="ceremonia__note">
      Usa un archivo que ya tengas legalmente (MP3/WAV/M4A). No se descarga de Spotify
      ni de YouTube y no se sube a Firebase: se guarda solo en este navegador.
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
      <text x="180" y="328" text-anchor="middle" fill="#64748b" font-size="10">
        Invitados alrededor · Pierre en el sector FR
      </text>
    </svg>

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
          El radio real del caracol convierte el recorrido a metros. Dime el
          espacio del venue y lo ajusto.
        </p>
        <div class="ceremonia__bar">
          <label>Radio (m)
            <input data-radius type="number" min="0.5" max="60" step="0.1" style="width:74px">
          </label>
          <label>Objetivo (m/s)
            <input data-target-speed type="number" min="0.02" max="2" step="0.01" style="width:74px">
          </label>
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
    modeBadge.textContent = withAudio
      ? "Audio local · reloj real"
      : "Sin audio · reloj de ensayo";
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

  /** Distancia total, velocidad media y giros sobre sí, con la escala real. */
  function updateScaleInfo() {
    const { radiusMeters, bodyRadiusMeters } = state.stage;
    const totalMeters = pathMetersTotal(state.turns, radiusMeters);
    const speed = state.duration > 0 ? totalMeters / state.duration : 0;
    const spins = bodyRadiusMeters > 0 ? totalMeters / (2 * Math.PI * bodyRadiusMeters) : 0;
    q("[data-scale-info]").textContent =
      `Recorrido ${totalMeters.toFixed(1)} m · ${speed.toFixed(2)} m/s · ` +
      `${spins.toFixed(0)} giros sobre sí (${state.turns.toFixed(1)} vueltas al caracol).`;
  }

  /** Both dancers walk the spiral at constant linear speed. */
  function resetWalking(announce = true) {
    state.dancers.david.keyframes = walkingKeyframes(state.duration, state.turns);
    state.dancers.ayde.keyframes = walkingKeyframes(state.duration, state.turns);
    saveState();
    renderKeyframes("david");
    renderKeyframes("ayde");
    updateScaleInfo();
    draw();
    if (announce) {
      setStatus("Caminata uniforme recalculada: velocidad lineal constante.");
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
    updateDurationControl();
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
    audio.src = objectUrl;
    audio.playbackRate = state.settings.rate;
    audio.loop = state.settings.loop;
    audioNameEl.textContent = `${record.name} · ${formatClock(record.duration || 0)}`;
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
    audio.removeAttribute("src");
    audio.load();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    await clearAudio();
    audioNameEl.textContent = "";
    setMode();
    updateDurationControl();
    draw();
    setStatus("Audio quitado de este navegador. Los cues y keyframes se conservan.");
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
        duration: state.duration,
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
      setStatus("No se pudo cargar el archivo de audio importado.");
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

  loadAudio()
    .then(async (record) => {
      if (!record?.blob) return;
      await attachAudio(record);
      if (record.duration) applyAudioDuration(record.duration);
      draw();
      setStatus(`Audio restaurado en este navegador: ${record.name}.`);
    })
    .catch(() => {
      setStatus("No se pudo restaurar el audio guardado en este navegador.");
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






