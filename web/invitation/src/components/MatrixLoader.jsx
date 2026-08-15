import React, { useEffect, useRef, useState } from "react";

/**
 * MatrixLoader — a cinematic, full-screen loading overlay.
 *
 * It renders the couple's base portrait underneath a canvas that draws Matrix
 * digital rain. The rain characters are modulated by the portrait's luminance
 * (sampled once at grid resolution), so as loading progresses the face is
 * "reconstructed" out of streaming code.
 *
 * When `progress` reaches 1 the loader runs a short reveal sequence:
 *   rain accelerates → brief glitch → green effect collapses → full-color
 *   portrait revealed — then calls `onRevealComplete`.
 *
 * Performance: ~30fps, pauses when the tab is hidden, respects
 * `prefers-reduced-motion`, and samples the image luminance only once.
 */
export function MatrixLoader({
  progress = 0,
  bytesLoaded = 0,
  imageUrl,
  onRevealComplete,
}) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null); // preloaded base portrait
  const lumRef = useRef(null); // { cols, rows, data: Uint8ClampedArray } luminance map
  const phaseRef = useRef("loading"); // "loading" | "reveal" | "done"
  const revealStartRef = useRef(0);
  const [phase, setPhase] = useState("loading");

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Preload the base portrait and sample its luminance once.
  useEffect(() => {
    if (!imageUrl) return undefined;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      imgRef.current = img;
      // Sample luminance at a low resolution matching the character grid.
      const cell = 16;
      const cols = Math.max(1, Math.ceil(img.naturalWidth / cell));
      const rows = Math.max(1, Math.ceil(img.naturalHeight / cell));
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d", { willReadFrequently: true });
      octx.drawImage(img, 0, 0, cols, rows);
      const data = octx.getImageData(0, 0, cols, rows).data;
      const lum = new Uint8ClampedArray(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        lum[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
      lumRef.current = { cols, rows, data: lum };
    };
    return () => {
      img.onload = null;
    };
  }, [imageUrl]);

  // Trigger the reveal sequence once loading completes.
  useEffect(() => {
    if (progress >= 1 && phaseRef.current === "loading") {
      phaseRef.current = "reveal";
      revealStartRef.current = performance.now();
      setPhase("reveal");
    }
  }, [progress]);


  // Main animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");

    const CELL = 16;
    const FONT = `${CELL}px monospace`;
    const CHARS =
      "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789$@#%&*+=<>";

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let drops = []; // per-column head y (in cells)
    let raf = 0;
    let last = 0;
    let visible = true;

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

    // Draw the portrait preserving its aspect ratio (object-fit: cover
    // semantics): scale to fill the viewport and crop the overflow, so the
    // face is never stretched or squashed.
    const drawImageCover = (img) => {
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) {
        ctx.drawImage(img, 0, 0, width, height);
        return;
      }
      const scale = Math.max(width / iw, height / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const draw = (now) => {

      raf = requestAnimationFrame(draw);
      if (!visible) return;
      // Throttle to ~30fps.
      if (now - last < 33) return;
      last = now;

      const p = Math.min(1, Math.max(0, progress));
      const isReveal = phaseRef.current === "reveal";
      const isDone = phaseRef.current === "done";

      // Trail: semi-transparent black fade.
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, width, height);

      // Reveal timing. The whole sequence is ~3s so it never feels like a
      // stroboscopic flash: 0–0.6s gentle acceleration, 0.6–1.1s a soft,
      // low-frequency glitch, 1.1–3.0s the green effect collapses to reveal
      // the full-color portrait.
      let speedMul = 1;
      let glitch = 0;
      let collapse = 0;
      if (isReveal) {
        const t = (now - revealStartRef.current) / 1000;
        speedMul = 1 + Math.min(1, t / 0.6) * 5;
        if (t > 0.6 && t < 1.1) glitch = 1;
        if (t > 1.1) collapse = Math.min(1, (t - 1.1) / 1.9);
        if (t > 3.0) {
          phaseRef.current = "done";
          setPhase("done");
          if (onRevealComplete) onRevealComplete();
        }
      }

      const lum = lumRef.current;
      const img = imgRef.current;

      // Draw the portrait underneath, revealed by progress (and fully during
      // the collapse phase of the reveal). Always preserve the image's aspect
      // ratio (cover semantics) so the face is never stretched.
      if (img) {
        const revealAmount = isDone ? 1 : isReveal ? collapse : p * 0.85;
        if (revealAmount > 0) {
          ctx.globalAlpha = revealAmount;
          drawImageCover(img);
          ctx.globalAlpha = 1;
        }
      }


      // Matrix rain characters.
      ctx.font = FONT;
      ctx.textBaseline = "top";
      for (let c = 0; c < cols; c++) {
        const head = drops[c];
        // Draw a short vertical streak of characters.
        for (let k = 0; k < 2; k++) {
          const y = head - k;
          if (y < 0 || y >= rows) continue;
          const idx = c + y * cols;
          const char = CHARS[Math.floor(Math.random() * CHARS.length)];
          // Brightness from the portrait luminance (0–255).
          const lumVal = lum ? lum.data[idx] : 128;
          const isHead = k === 0;
          // Head character is bright white-green; trail is green.
          const base = isHead ? 220 : 120;
          // Modulate by luminance: bright portrait areas → brighter characters.
          const intensity = base * (0.35 + (lumVal / 255) * 0.65);
          const alpha = isHead ? 0.95 : 0.55;
          ctx.fillStyle = isHead
            ? `rgba(220, 255, 220, ${alpha})`
            : `rgba(0, ${Math.round(intensity)}, 70, ${alpha})`;
          ctx.fillText(char, c * CELL, y * CELL);
        }
        // Advance the head.
        drops[c] = head + (0.5 + Math.random() * 0.6) * speedMul;
        if (drops[c] * CELL > height && Math.random() > 0.975) {
          drops[c] = Math.floor(Math.random() * -rows);
        }
      }

      // Glitch: a soft, occasional horizontal slice shift during the glitch
      // phase. It fires only ~25% of frames (not every frame) and uses a small
      // shift with reduced opacity, so it reads as a subtle "tear" rather than
      // a stroboscopic flash.
      if (glitch && img && Math.random() < 0.25) {
        const sliceH = 6 + Math.random() * 14;
        const gy = Math.random() * height;
        const shift = (Math.random() - 0.5) * 18;
        ctx.globalAlpha = 0.35;
        ctx.drawImage(
          canvas,
          0,
          gy,
          width,
          sliceH,
          shift,
          gy,
          width,
          sliceH,
        );
        ctx.globalAlpha = 1;
      }


      // Scanlines overlay.
      ctx.fillStyle = "rgba(0, 255, 70, 0.03)";
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const mb = (bytesLoaded / (1024 * 1024)).toFixed(1);

  return (
    <div
      className={`matrix-loader${phase === "done" ? " is-done" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <img
        className="matrix-loader__portrait"
        src={imageUrl}
        alt=""
        aria-hidden="true"
      />
      <canvas className="matrix-loader__canvas" ref={canvasRef} />

      <div className="matrix-loader__scanlines" aria-hidden="true" />

      <div className="matrix-loader__hud">
        <div className="matrix-loader__label">
          {phase === "reveal" || phase === "done" ? "INITIALISATION" : "CHARGEMENT"}
        </div>
        <div className="matrix-loader__bar" aria-hidden="true">
          <div
            className="matrix-loader__bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="matrix-loader__stats">
          <span className="matrix-loader__pct">{pct}%</span>
          <span className="matrix-loader__mb">
            {mb} MB de amour
          </span>
        </div>
      </div>
    </div>
  );
}
