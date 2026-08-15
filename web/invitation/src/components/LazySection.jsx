import React, { useEffect, useRef, useState } from "react";
import { useSectionTime } from "../hooks/useSectionTime.js";
import { useApp } from "../context/AppContext.jsx";


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

  // Whether the guest is currently active (from the inactivity tracker). When
  // false, section-time accumulation pauses so idle time is not counted.
  const { isActive } = useApp();

  // Track how long this section stays in view (Analytics `section_time`).
  useSectionTime(id, ref, isActive);


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

  return (

    <div ref={ref} id={id} className={className}>
      {visible ? children : placeholder}
    </div>
  );
}
