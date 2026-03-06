"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle cursor glow that follows the mouse on desktop.
 * Hidden automatically on touch devices via CSS `@media (hover: none)`.
 * Uses existing brand pink — no color changes.
 */
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let frameId: number;

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        if (!glow) return;
        glow.style.left = `${e.clientX}px`;
        glow.style.top  = `${e.clientY}px`;
        glow.style.opacity = "1";
      });
    };

    const onLeave = () => {
      if (glow) glow.style.opacity = "0";
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="cursor-glow"
      style={{ opacity: 0 }}
      aria-hidden="true"
    />
  );
}
