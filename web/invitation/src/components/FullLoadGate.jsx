import React, { useEffect, useRef, useState } from "react";
import { MatrixLoader } from "./MatrixLoader.jsx";
import { cloudinaryImage } from "../cloudinary.js";
import { MEDIA } from "../media.js";

/**
 * Loading gate for the critical invitation shell.
 *
 * The Hero remains eager, while long-tail sections are now progressively
 * mounted by ProgressiveSection. The gate therefore waits only for a small
 * network-aware set of hero images instead of making first entry depend on
 * every piece of invitation content.
 */
const LOADER_IMAGE = cloudinaryImage("matrix_bbs1p1", { width: 1200 });

function heroImageUrls() {
  const media = MEDIA.hero;
  const list = Array.isArray(media) ? media : media ? [media] : [];
  const urls = list
    .map((item) => (typeof item === "string" ? item : item?.src))
    .filter(Boolean);

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "");
  const narrow = window.matchMedia?.("(max-width: 899px)")?.matches;
  const criticalCount = constrained ? 2 : narrow ? 3 : 5;
  return urls.slice(0, criticalCount);
}

export function FullLoadGate({ children }) {
  const [progress, setProgress] = useState(0);
  const [bytesLoaded, setBytesLoaded] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const loadedRef = useRef(0);
  const totalRef = useRef(0);
  const bytesRef = useRef(0);
  const mountedAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    mountedAtRef.current = performance.now();
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "");
    const narrow = window.matchMedia?.("(max-width: 899px)")?.matches;
    // Preserve the cinematic reveal, but do not impose a three-second tax on
    // every phone visit. Slower/data-saving connections get the shortest gate.
    const minDisplayMs = constrained ? 700 : narrow ? 1200 : 1800;

    const updateBytes = () => {
      if (cancelled) return;
      let total = 0;
      try {
        for (const e of performance.getEntriesByType("resource")) {
          if (typeof e.transferSize === "number" && e.transferSize > 0) total += e.transferSize;
        }
      } catch { /* ignore */ }
      bytesRef.current = total;
      setBytesLoaded(total);
    };

    const bytesTimer = window.setInterval(updateBytes, 250);
    const clampProgress = (raw) => {
      const elapsed = performance.now() - mountedAtRef.current;
      return elapsed < minDisplayMs ? Math.min(raw, 0.97) : raw;
    };

    const markLoaded = () => {
      loadedRef.current += 1;
      const raw = Math.min(1, loadedRef.current / totalRef.current);
      const p = clampProgress(raw);
      setProgress(p);
      updateBytes();
      if (p >= 1) window.clearInterval(bytesTimer);
    };

    const portrait = new Image();
    portrait.src = LOADER_IMAGE;

    const urls = heroImageUrls();
    totalRef.current = urls.length;
    const releaseTimer = window.setTimeout(() => {
      if (cancelled) return;
      if (loadedRef.current >= totalRef.current) {
        setProgress(1);
        window.clearInterval(bytesTimer);
      }
    }, minDisplayMs);

    if (urls.length === 0) {
      loadedRef.current = 0;
      totalRef.current = 1;
      setProgress(0.97);
    } else {
      urls.forEach((url) => {
        const img = new Image();
        img.src = url;
        img.onload = img.onerror = () => { if (!cancelled) markLoaded(); };
      });
    }

    return () => {
      cancelled = true;
      window.clearInterval(bytesTimer);
      window.clearTimeout(releaseTimer);
    };
  }, []);

  const handleRevealComplete = () => {
    setRevealed(true);
    window.setTimeout(() => setDone(true), 450);
  };

  return (
    <>
      {!done && (
        <MatrixLoader
          progress={progress}
          bytesLoaded={bytesLoaded}
          imageUrl={LOADER_IMAGE}
          onRevealComplete={handleRevealComplete}
        />
      )}
      <div className={`full-load-content${revealed ? " is-revealed" : ""}`} aria-hidden={!revealed}>
        {children}
      </div>
    </>
  );
}
