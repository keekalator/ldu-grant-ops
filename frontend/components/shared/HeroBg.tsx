"use client";

/**
 * Decorative floating pixel particles for the hero banner.
 * Uses the existing brand palette — absolutely positioned, pointer-events-none.
 * Placed inside the hero div (which is `overflow-hidden`).
 */

const FLOATERS: {
  x: string; y: string; size: number; color: string;
  delay: string; duration: string;
}[] = [
  { x: "76%", y: "18%", size: 6,  color: "#ff1e78", delay: "0s",    duration: "3.2s" },
  { x: "84%", y: "58%", size: 4,  color: "#ffe100", delay: "0.7s",  duration: "4.1s" },
  { x: "91%", y: "30%", size: 7,  color: "#00d94e", delay: "0.3s",  duration: "3.7s" },
  { x: "70%", y: "72%", size: 4,  color: "#7c3aed", delay: "1.1s",  duration: "5.0s" },
  { x: "87%", y: "12%", size: 3,  color: "#00d4ff", delay: "1.5s",  duration: "3.4s" },
  { x: "94%", y: "62%", size: 5,  color: "#ff1e78", delay: "0.5s",  duration: "4.6s" },
  { x: "73%", y: "42%", size: 3,  color: "#ffe100", delay: "0.9s",  duration: "3.9s" },
  { x: "79%", y: "85%", size: 5,  color: "#00d94e", delay: "1.3s",  duration: "4.3s" },
];

export default function HeroBg() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {FLOATERS.map((f, i) => (
        <div
          key={i}
          className="absolute float-pixel"
          style={{
            left: f.x,
            top: f.y,
            width: f.size,
            height: f.size,
            background: f.color,
            opacity: 0.22,
            animationDelay: f.delay,
            animationDuration: f.duration,
            borderRadius: "1px",
          }}
        />
      ))}
    </div>
  );
}
