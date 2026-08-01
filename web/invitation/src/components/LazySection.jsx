import React, { useEffect, useRef, useState } from "react";

/**
 * LazySection renders its children only once the element scrolls into view.
 *
 * It uses an IntersectionObserver with a generous rootMargin so sections are
 * mounted (and their lazy-loaded JS chunk fetched) just before they enter the
 * viewport, avoiding a visible flash while scrolling.
 *
 * Once a section has been revealed it stays mounted, so scrolling back up does
 * not unmount it (preserving form state, scroll position inside the section,
 * and avoiding re-fetching images).
 */
export function LazySection({
  children,
  id,
  className,
  rootMargin = "600px 0px",
  placeholder = <div className="lazy-section-placeholder" aria-hidden="true" />,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    // Fallback for very old browsers without IntersectionObserver.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  // Once the section is mounted, reveal its `.reveal` children (the scroll-in
  // animation). This also fixes the reveal animation for lazy sections, which
  // would otherwise stay at opacity 0.
  useEffect(() => {
    if (!visible) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    const revealEls = node.querySelectorAll(".reveal");
    revealEls.forEach((el, index) => {
      window.setTimeout(() => el.classList.add("is-visible"), index * 60);
    });

    return () => {
      revealEls.forEach((el) => el.classList.remove("is-visible"));
    };
  }, [visible]);


  return (
    <div ref={ref} id={id} className={className}>
      {visible ? children : placeholder}
    </div>
  );
}
