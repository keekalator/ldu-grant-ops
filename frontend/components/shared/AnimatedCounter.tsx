"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

/**
 * Counts up from 0 to `value` using an ease-out cubic curve.
 * Triggers when the element scrolls into view (IntersectionObserver).
 * Only fires once per mount.
 */
export default function AnimatedCounter({
  value,
  duration = 1100,
  className = "",
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const spanRef     = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();

          const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            // Ease-out cubic — fast at start, slows to final value
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={spanRef} className={className}>
      {display}
    </span>
  );
}
