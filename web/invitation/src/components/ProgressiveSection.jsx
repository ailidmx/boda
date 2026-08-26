import React, { Suspense, useEffect, useRef, useState } from "react";

/**
 * Mount a section's heavy React subtree shortly before it approaches the
 * viewport. Pending shells reserve one viewport of space so all deferred
 * sections do not collapse onto the same coordinate and accidentally trigger
 * at once. The stable shell also keeps hash targets available immediately.
 */
export function ProgressiveSection({ id, children, rootMargin = "1400px 0px" }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) return undefined;
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setActive(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, rootMargin]);

  return (
    <section
      id={id}
      ref={ref}
      className="lazy-section"
      data-progressive-section
      data-progressive-state={active ? "active" : "pending"}
      style={active ? undefined : { minHeight: "100svh" }}
    >
      {active ? <Suspense fallback={null}>{children}</Suspense> : null}
    </section>
  );
}
