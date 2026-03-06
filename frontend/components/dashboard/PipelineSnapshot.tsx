"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PixelIcon from "@/components/shared/PixelIcon";
import { formatCurrency } from "@/lib/utils";
import type { PipelineStats } from "@/types";
import type { PixelIconName } from "@/components/shared/PixelIcon";

// ─── Pillar definitions ───────────────────────────────────────────────────────
// Handles BOTH raw Airtable values: short IDs ("P1","P3") AND full names.

interface PillarDef {
  color: string;
  bg: string;
  shadow: string;
  icon: PixelIconName;
  name: string;          // plain-English short name
  what: string;          // one-sentence for a novice
  target: string;
  pillarKey: string;     // URL param value
}

const PILLARS: PillarDef[] = [
  {
    color: "#7c3aed", bg: "#e8d4ff", shadow: "#5500cc",
    icon: "building",
    name: "Build the Campus",
    what: "Buy land, build our Crenshaw home & NorCal farm",
    target: "$3.5M–$9M",
    pillarKey: "Capital Campaign",
  },
  {
    color: "#0066cc", bg: "#b8e0ff", shadow: "#003d99",
    icon: "pipeline",
    name: "Programs & Jobs",
    what: "Tech training, music, trades, youth & re-entry programs",
    target: "$750K–$2M",
    pillarKey: "Programming & Operations",
  },
  {
    color: "#ff1e78", bg: "#ffe0f0", shadow: "#cc0055",
    icon: "star",
    name: "Studio WELEH",
    what: "Arts studio, fashion design & sustainable apparel",
    target: "$400K–$1.2M",
    pillarKey: "Studio WELEH",
  },
  {
    color: "#00a83a", bg: "#b8ffda", shadow: "#007a2a",
    icon: "check",
    name: "The Farm",
    what: "NorCal agricultural campus, clothing factory & trades",
    target: "$2M–$5M",
    pillarKey: "Agricultural Extension",
  },
  {
    color: "#ff6b00", bg: "#ffd0a0", shadow: "#cc5500",
    icon: "trophy",
    name: "Founder Grants",
    what: "Grants for Black women founders — Kika Keith & team",
    target: "$50K–$200K",
    pillarKey: "Founder & Enterprise",
  },
  {
    color: "#0099aa", bg: "#b8f0ff", shadow: "#006677",
    icon: "refresh",
    name: "Textile / SB 707",
    what: "CalRecycle, circular fashion & textile recycling grants",
    target: "$500K–$2M",
    pillarKey: "Textile Sustainability",
  },
];

// Maps every possible value Airtable might store → index in PILLARS array
const PILLAR_ALIAS: Record<string, number> = {
  // Short IDs
  "P1": 0, "p1": 0,
  "P2": 1, "p2": 1,
  "P3": 2, "p3": 2,
  "P4": 3, "p4": 3,
  "P5": 4, "p5": 4,
  "P6": 5, "p6": 5,
  "CROSS_TEXTILE": 5, "cross_textile": 5, "CROSS": 5,
  // Full names
  "Capital Campaign": 0,
  "Programming & Operations": 1,
  "Programming and Operations": 1,
  "Studio WELEH": 2,
  "Agricultural Extension": 3,
  "Agricultural Extension & Manufacturing": 3,
  "Founder & Enterprise": 4,
  "Founder and Enterprise": 4,
  "Textile Sustainability": 5,
  "Textile Sustainability & SB 707": 5,
};

function resolvePillar(raw: string): PillarDef | null {
  const idx = PILLAR_ALIAS[raw] ?? PILLAR_ALIAS[raw.trim()];
  if (idx !== undefined) return PILLARS[idx];
  // Fuzzy fallback
  const lower = raw.toLowerCase();
  if (lower.includes("capital"))    return PILLARS[0];
  if (lower.includes("program"))    return PILLARS[1];
  if (lower.includes("weleh"))      return PILLARS[2];
  if (lower.includes("ag") || lower.includes("farm") || lower.includes("agri")) return PILLARS[3];
  if (lower.includes("founder"))    return PILLARS[4];
  if (lower.includes("textile") || lower.includes("sb 707") || lower.includes("cross")) return PILLARS[5];
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PipelineSnapshot({ stats }: { stats: PipelineStats }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [barsVisible, setBarsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Small delay so the card reveal animation completes first
          setTimeout(() => setBarsVisible(true), 150);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Merge raw Airtable keys into PILLARS
  const counts: number[] = new Array(PILLARS.length).fill(0);
  for (const [rawKey, count] of Object.entries(stats.byPillar)) {
    const def = resolvePillar(rawKey);
    if (def) {
      const idx = PILLARS.indexOf(def);
      if (idx >= 0) counts[idx] += count;
    }
  }

  const total = Math.max(counts.reduce((a, b) => a + b, 0), 1);

  return (
    <div className="space-y-3" ref={containerRef}>

      {/* ── Overview bar — each segment colored ──────────── */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-1.5"
          style={{ fontFamily: "Orbitron, sans-serif" }}>
          ALL 6 FUNDING AREAS — {stats.total} TOTAL GRANTS
        </p>
        <div
          className="flex h-5 rounded-xl overflow-hidden border-[2px] border-[#0a0a1a]"
          style={{ boxShadow: "2px 2px 0 #0a0a1a" }}
        >
          {PILLARS.map((p, i) => {
            const pct = (counts[i] / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={p.pillarKey}
                className="h-full flex items-center justify-center text-white font-black shrink-0 bar-fill"
                style={{
                  width: barsVisible ? `${pct}%` : "0%",
                  background: p.color, fontSize: 7,
                  fontFamily: "Orbitron, sans-serif",
                  minWidth: barsVisible && pct > 0 ? 6 : 0,
                  transitionDelay: `${i * 60}ms`,
                }}
                title={`${p.name}: ${counts[i]} grants`}
              >
                {pct > 8 ? counts[i] : ""}
              </div>
            );
          })}
        </div>
        {/* Color key strip */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {PILLARS.map((p, i) => counts[i] > 0 && (
            <div key={p.pillarKey} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm border border-[#0a0a1a]" style={{ background: p.color }} />
              <span className="text-[8px] text-[#555566]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pillar cards ──────────────────────────────────── */}
      <div className="space-y-2">
        {PILLARS.map((p, i) => {
          const count = counts[i];
          const pct   = Math.round((count / total) * 100);
          return (
            <Link
              key={p.pillarKey}
              href={`/pipeline?pillar=${encodeURIComponent(p.pillarKey)}`}
              className="block rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden transition-all active:translate-y-[2px] active:shadow-none group"
              style={{ background: "#fffbf0", boxShadow: `4px 4px 0 ${p.shadow}` }}
            >
              {/* Colored header band */}
              <div
                className="px-4 py-2 flex items-center justify-between"
                style={{ background: p.color }}
              >
                <div className="flex items-center gap-2">
                  <PixelIcon name={p.icon} size={14} color="white" glow />
                  <span
                    className="text-[11px] font-black text-white uppercase tracking-wider"
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: "8px",
                      textShadow: "0 0 6px rgba(255,255,255,0.6), 0 0 14px rgba(255,255,255,0.3)",
                    }}
                  >
                    {p.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-black text-white opacity-80"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    TARGET: {p.target}
                  </span>
                  <PixelIcon name="arrow_right" size={11} color="white" />
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3">
                <p className="text-[11px] text-[#555566] mb-2">{p.what}</p>

                <div className="flex items-center gap-3">
                  {/* Colored progress bar — animates when scrolled into view */}
                  <div
                    className="flex-1 h-3 rounded-full border-[2px] border-[#0a0a1a] overflow-hidden"
                    style={{ background: "#e8e8ee" }}
                  >
                    <div
                      className="h-full rounded-full bar-fill"
                      style={{
                        width: barsVisible ? `${pct}%` : "0%",
                        background: p.color,
                        minWidth: barsVisible && count > 0 ? 8 : 0,
                        transitionDelay: `${i * 80 + 200}ms`,
                      }}
                    />
                  </div>

                  {/* Count badge */}
                  <div
                    className="w-10 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
                    style={{ background: p.bg, boxShadow: `2px 2px 0 ${p.shadow}` }}
                  >
                    <span
                      className="text-sm font-black"
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: "10px",
                        color: p.color,
                        textShadow: `0 0 4px ${p.color}, 0 0 10px ${p.color}60`,
                      }}
                    >
                      {count}
                    </span>
                  </div>

                  {/* Label */}
                  <span
                    className="text-[9px] font-bold text-[#aaaacc] shrink-0"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    {count === 1 ? "GRANT" : "GRANTS"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Totals ────────────────────────────────────────── */}
      {stats.totalRequested > 0 && (
        <div className="flex items-center justify-between pt-3 border-t-[2px] border-dashed border-[#0a0a1a]">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#aaaacc]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>TOTAL PIPELINE VALUE</p>
            <p className="text-base font-black text-[#0a0a1a]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              {formatCurrency(stats.totalRequested)}
            </p>
          </div>
          {stats.totalAwarded > 0 && (
            <div className="text-right px-3 py-1.5 rounded-xl border-[2px] border-[#0a0a1a]"
              style={{ background: "#ffd970", boxShadow: "2px 2px 0 #ffa500" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#0a0a1a]"
                style={{ fontFamily: "Orbitron, sans-serif" }}>WON SO FAR</p>
              <p className="text-base font-black text-[#0a0a1a]"
                style={{ fontFamily: "Orbitron, sans-serif" }}>
                {formatCurrency(stats.totalAwarded)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
