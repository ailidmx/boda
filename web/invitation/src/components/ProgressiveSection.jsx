import React, { Suspense, useEffect, useRef, useState } from "react";

/**
 * Mount a section's heavy React subtree shortly before it approaches the
 * viewport. The section shell itself always exists, so hash navigation and
 * analytics can still resolve stable section ids immediately after sign-in.
 *
 * `rootMargin` deliberately starts loading well before the guest reaches the
 * section. On browsers without IntersectionObserver we fail open and mount
 * immediately rather than risking missing content.
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
    <section id={id} ref={ref} className="lazy-section" data-progressive-section>
      {active ? <Suspense fallback={null}>{children}</Suspense> : null}
    </section>
  );
}
