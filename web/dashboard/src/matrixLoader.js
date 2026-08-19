// ── Dashboard Matrix-style loading overlay ─────────────────────────────
//
// A cinematic full-screen loading overlay for the dashboard, styled after the
// invitation's MatrixLoader but adapted to the dashboard's "sharp & airy"
// design language. It draws Matrix digital rain on a canvas and shows a HUD
// with REAL loading metrics:
//   - chunk sizes    (bytes per collection)
//   - getDocs figures (documents fetched per collection)
//   - data size      (total bytes across all collections)
//   - record counts  (records per collection)
//
// The overlay is driven by a controller. Call `reportSource({ name, records,
// bytes })` as each data source loads, then `finish()` once all are done. The
// loader runs a short reveal sequence and hides itself.
//
// This module is vanilla JS (no React) to match the dashboard's architecture.
// It owns no Firestore access — it only renders and reports metrics.

const CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789$@#%&*+=<>";

// The dashboard's Matrix loader is RED (the invitation's stays green). The
// background image is a Cloudinary asset at the account root (like the
// invitation's `matrix_bbs1p1`), rendered as a full-screen backdrop behind the
// rain canvas.
const LOADER_BG_IMAGE =
  "https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,w_1600/matrixRed_dnatyn";

// The sources the dashboard loads. Order matters for the HUD list.
const DEFAULT_SOURCES = [
  { name: "guests", label: "Invitados" },
  { name: "invitation_groups", label: "Grupos" },
  { name: "thanks", label: "Gracias" },
  { name: "rooms", label: "Cuartos" },
  { name: "tables", label: "Mesas" },
  { name: "auth_users", label: "Cuentas" },
];

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Create a Matrix-style loading overlay controller.
 *
 * @param {object} [opts]
 * @param {number} [opts.minDisplayMs=2200] Minimum time the loader stays visible
 *   so it never flashes by in a stroboscopic blink when data loads very fast.
 * @param {Array<{name:string,label:string}>} [opts.sources] The data sources to
 *   track. Defaults to DEFAULT_SOURCES.
 * @returns {object} Controller with `mount`, `reportSource`, `finish`, `destroy`.
 */
export function createMatrixLoader({
  minDisplayMs = 2200,
  sources = DEFAULT_SOURCES,
} = {}) {
  const sourceMap = new Map(sources.map((s) => [s.name, { ...s, records: 0, bytes: 0, done: false }]));
  const mountedAt = performance.now();
  let root = null;
  let canvas = null;
  let ctx = null;
  let raf = 0;
  let last = 0;
  let visible = true;
  let finished = false;
  let revealStart = 0;
  let phase = "loading"; // "loading" | "reveal" | "done"
  let onDone = null;

  // ── Canvas rain state ──
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let drops = [];

  const CELL = 16;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(width / CELL);
    rows = Math.ceil(height / CELL);
    drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -rows));
  };

  const onVisibility = () => {
    visible = document.visibilityState === "visible";
  };

  const draw = (now) => {
    raf = requestAnimationFrame(draw);
    if (!visible) return;
    if (now - last < 33) return; // ~30fps
    last = now;

    const isReveal = phase === "reveal";
    const isDone = phase === "done";

    // Trail: semi-transparent black fade.
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(0, 0, width, height);

    // Reveal timing (~1.6s): accelerate rain, then collapse to a clean screen.
    let speedMul = 1;
    let collapse = 0;
    if (isReveal) {
      const t = (now - revealStart) / 1000;
      speedMul = 1 + Math.min(1, t / 0.4) * 5;
      if (t > 0.5) collapse = Math.min(1, (t - 0.5) / 1.1);
      if (t > 1.6) {
        phase = "done";
        if (onDone) onDone();
      }
    }

    // Matrix rain characters.
    ctx.font = `${CELL}px monospace`;
    ctx.textBaseline = "top";
    for (let c = 0; c < cols; c++) {
      const head = drops[c];
      for (let k = 0; k < 2; k++) {
        const y = head - k;
        if (y < 0 || y >= rows) continue;
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const isHead = k === 0;
        const alpha = isHead ? 0.95 : 0.55;
        // RED rain (dashboard side). The invitation's loader stays green.
        ctx.fillStyle = isHead
          ? `rgba(255, 220, 220, ${alpha})`
          : `rgba(${isDone ? 40 : 120}, 0, 20, ${alpha})`;
        ctx.fillText(char, c * CELL, y * CELL);
      }
      drops[c] = head + (0.5 + Math.random() * 0.6) * speedMul;
      if (drops[c] * CELL > height && Math.random() > 0.975) {
        drops[c] = Math.floor(Math.random() * -rows);
      }
    }

    // Collapse: fade the rain out to reveal the clean dashboard behind.
    if (collapse > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${collapse})`;
      ctx.fillRect(0, 0, width, height);
    }
  };

  // ── HUD rendering ──
  const renderHud = () => {
    if (!root) return;
    const stats = root.querySelector("[data-ml-stats]");
    if (!stats) return;

    const totalRecords = [...sourceMap.values()].reduce((a, s) => a + s.records, 0);
    const totalBytes = [...sourceMap.values()].reduce((a, s) => a + s.bytes, 0);
    const doneCount = [...sourceMap.values()].filter((s) => s.done).length;
    const pct = Math.round((doneCount / sourceMap.size) * 100);

    const rowsHtml = [...sourceMap.values()]
      .map((s) => {
        const status = s.done ? "OK" : "…";
        return `
          <div class="dashboard-ml-row">
            <span class="dashboard-ml-row__name">${s.label}</span>
            <span class="dashboard-ml-row__count">${s.records} docs</span>
            <span class="dashboard-ml-row__bytes">${formatBytes(s.bytes)}</span>
            <span class="dashboard-ml-row__status">${status}</span>
          </div>
        `;
      })
      .join("");

    stats.innerHTML = `
      <div class="dashboard-ml-summary">
        <span>${doneCount}/${sourceMap.size} fuentes</span>
        <span>${totalRecords} registros</span>
        <span>${formatBytes(totalBytes)}</span>
      </div>
      ${rowsHtml}
    `;

    const barFill = root.querySelector("[data-ml-bar]");
    if (barFill) barFill.style.width = `${pct}%`;
    const pctEl = root.querySelector("[data-ml-pct]");
    if (pctEl) pctEl.textContent = `${pct}%`;
  };

  // ── Public API ──
  return {
    /**
     * Mount the overlay into the DOM (appended to document.body).
     */
    mount() {
      if (root) return;
      root = document.createElement("div");
      root.className = "dashboard-ml";
      root.setAttribute("role", "status");
      root.setAttribute("aria-live", "polite");
      root.setAttribute("aria-label", "Cargando panel");
      root.innerHTML = `
        <div class="dashboard-ml__bg" style="background-image:url('${LOADER_BG_IMAGE}')" aria-hidden="true"></div>
        <canvas class="dashboard-ml__canvas"></canvas>
        <div class="dashboard-ml__scanlines" aria-hidden="true"></div>
        <div class="dashboard-ml__hud">
          <div class="dashboard-ml__label">INITIALISATION</div>
          <div class="dashboard-ml__bar" aria-hidden="true">
            <div class="dashboard-ml__bar-fill" data-ml-bar></div>
          </div>
          <div class="dashboard-ml__stats" data-ml-stats></div>
          <div class="dashboard-ml__pct" data-ml-pct>0%</div>
        </div>
      `;
      document.body.appendChild(root);

      canvas = root.querySelector(".dashboard-ml__canvas");
      ctx = canvas.getContext("2d");
      resize();
      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(draw);
      renderHud();
    },

    /**
     * Report a data source's loading status.
     * @param {object} src { name, records, bytes, done }
     */
    reportSource({ name, records = 0, bytes = 0, done = true }) {
      const s = sourceMap.get(name);
      if (!s) return;
      s.records = records;
      s.bytes = bytes;
      s.done = done;
      renderHud();
    },

    /**
     * Finish loading: run the reveal sequence and hide the overlay once all
     * sources are done (or after the minimum display time has elapsed).
     */
    finish() {
      if (finished) return;
      const allDone = [...sourceMap.values()].every((s) => s.done);
      const elapsed = performance.now() - mountedAt;
      if (!allDone || elapsed < minDisplayMs) {
        // Not ready yet — retry shortly.
        window.setTimeout(() => this.finish(), 150);
        return;
      }
      finished = true;
      phase = "reveal";
      revealStart = performance.now();
      onDone = () => {
        if (root) root.classList.add("is-done");
        window.setTimeout(() => this.destroy(), 450);
      };
    },

    /**
     * Remove the overlay from the DOM and stop the animation loop.
     */
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (root) root.remove();
      root = null;
    },
  };
}
