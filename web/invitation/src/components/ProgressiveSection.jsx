import React, { Component, Suspense, useEffect, useRef, useState } from "react";

const RESERVED_HEIGHT = { minHeight: "100svh" };

function SectionReady({ children, onReady }) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return children;
}

function SectionFallback() {
  return (
    <div
      className="progressive-section__fallback"
      role="status"
      aria-label="Loading section"
      style={RESERVED_HEIGHT}
    />
  );
}

class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("[ProgressiveSection] lazy chunk failed", error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="progressive-section__error" role="alert" style={RESERVED_HEIGHT}>
        <p>Cette section n’a pas pu être chargée.</p>
        <button type="button" className="button" onClick={() => window.location.reload()}>
          Recharger / Recargar / Reload
        </button>
      </div>
    );
  }
}

/**
 * Mount a heavy section shortly before it approaches the viewport.
 * The shell and its reserved height remain stable until the lazy subtree has
 * actually committed, preventing scroll jumps and observer cascades.
 */
export function ProgressiveSection({ id, children, rootMargin = "1400px 0px" }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const markReady = React.useCallback(() => setReady(true), []);

  useEffect(() => {
    if (active) return undefined;

    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setActive(true);
      return undefined;
    }

    const activate = () => setActive(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          activate();
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);

    const activateHashTarget = () => {
      if (window.location.hash === `#${id}`) activate();
    };
    activateHashTarget();
    window.addEventListener("hashchange", activateHashTarget);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", activateHashTarget);
    };
  }, [active, id, rootMargin]);

  const state = ready ? "ready" : active ? "loading" : "pending";

  return (
    <section
      id={id}
      ref={ref}
      className="lazy-section"
      data-progressive-section
      data-progressive-state={state}
      aria-busy={active && !ready}
      style={ready ? undefined : RESERVED_HEIGHT}
    >
      {active && (
        <ChunkErrorBoundary>
          <Suspense fallback={<SectionFallback />}>
            <SectionReady onReady={markReady}>{children}</SectionReady>
          </Suspense>
        </ChunkErrorBoundary>
      )}
    </section>
  );
}
