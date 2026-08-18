import React, { useEffect, useRef, useState } from "react";
import { MatrixLoader } from "./MatrixLoader.jsx";
import { cloudinaryImage } from "../cloudinary.js";
import { MEDIA } from "../media.js";

/**
 * FullLoadGate — the "load everything up front" architecture.
 *
 * Every section is statically imported and mounted up front (see App.jsx), so
 * once the guest is signed in the whole invitation is available instantly and
 * navigation is completely fluid. This gate masks the remaining wait (the
 * heavy hero/gallery images still streaming in) behind a cinematic Matrix
 * loader.
 *
 * Progress is real: it is driven by how many of the heavy hero images have
 * finished loading, and the "MB de amour" counter reflects the actual bytes
 * the browser has transferred (from `performance.getEntriesByType('resource')`).
 *
 * Once loading completes, the loader runs its reveal sequence and then the
 * full invitation fades in.
 */

// The base portrait used by the Matrix loader (Cloudinary account root).
const LOADER_IMAGE = cloudinaryImage("matrix_bbs1p1", { width: 1200 });

// Heavy images to preload behind the loader. The hero slideshow is the biggest
// set of eager images, so preloading it makes the reveal feel complete.
function heroImageUrls() {
  const media = MEDIA.hero;
  const list = Array.isArray(media) ? media : media ? [media] : [];
  return list
    .map((item) => (typeof item === "string" ? item : item?.src))
    .filter(Boolean);
}

export function FullLoadGate({ children }) {
  const [progress, setProgress] = useState(0);
  const [bytesLoaded, setBytesLoaded] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const loadedRef = useRef(0);
  const totalRef = useRef(0);
  const bytesRef = useRef(0);
  // The loader must stay visible for at least MIN_DISPLAY_MS so it never
  // flashes by in a stroboscopic blink when images load very fast.
  const mountedAtRef = useRef(0);
  const MIN_DISPLAY_MS = 3000;

  useEffect(() => {
    let cancelled = false;
    mountedAtRef.current = performance.now();

    const updateBytes = () => {
      if (cancelled) return;
      let total = 0;
      try {
        const entries = performance.getEntriesByType("resource");
        for (const e of entries) {
          if (typeof e.transferSize === "number" && e.transferSize > 0) {
            total += e.transferSize;
          }
        }
      } catch {
        /* ignore */
      }
      bytesRef.current = total;
      setBytesLoaded(total);
    };

    // Poll transferred bytes a few times a second for a live "MB de amour".
    const bytesTimer = window.setInterval(updateBytes, 250);

    // Clamp progress so it never reaches 1 (which triggers the reveal) before
    // the minimum display time has elapsed.
    const clampProgress = (raw) => {
      const elapsed = performance.now() - mountedAtRef.current;
      if (elapsed < MIN_DISPLAY_MS) {
        // Keep the bar near-full but not complete until the minimum time.
        return Math.min(raw, 0.97);
      }
      return raw;
    };

    const markLoaded = () => {
      loadedRef.current += 1;
      const raw = Math.min(1, loadedRef.current / totalRef.current);
      const p = clampProgress(raw);
      setProgress(p);
      updateBytes();
      if (p >= 1) {
        window.clearInterval(bytesTimer);
      }
    };

    // Preload the loader portrait so the reveal is instant.
    const portrait = new Image();
    portrait.src = LOADER_IMAGE;

    // Preload all hero images and track real progress.
    const urls = heroImageUrls();
    totalRef.current = urls.length;

    // Once the minimum display time has elapsed, release the final 3% so the
    // reveal can start (if everything is already loaded).
    const releaseTimer = window.setTimeout(() => {
      if (cancelled) return;
      if (loadedRef.current >= totalRef.current) {
        setProgress(1);
        window.clearInterval(bytesTimer);
      }
    }, MIN_DISPLAY_MS);

    if (urls.length === 0) {
      // Nothing to preload: still respect the minimum display time.
      loadedRef.current = 0;
      totalRef.current = 1;
      setProgress(0.97);
    } else {
      urls.forEach((url) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          if (!cancelled) markLoaded();
        };
        img.onerror = () => {
          if (!cancelled) markLoaded();
        };
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
    // Give the fade-out a moment before unmounting the loader.
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
      <div
        className={`full-load-content${revealed ? " is-revealed" : ""}`}
        aria-hidden={!revealed}
      >
        {children}
      </div>
    </>
  );
}
