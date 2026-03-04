"use client";

import { useState } from "react";
import PixelIcon from "@/components/shared/PixelIcon";

interface EnrichedData {
  description?:      string;
  eligibilityNotes?: string;
  whyWeQualify?:     string;
  funder?:           string;
  error?:            string;
}

interface Props {
  opportunityId: string;
  onEnriched: (data: EnrichedData) => void;
}

export default function EnrichButton({ opportunityId, onEnriched }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function run() {
    if (state === "loading") return;
    setState("loading");
    try {
      const res  = await fetch(`/api/opportunities/${opportunityId}/enrich`, { method: "POST" });
      const data = await res.json() as EnrichedData;
      if (data.error) {
        console.error("[enrich]", data.error);
        setState("error");
        setTimeout(() => setState("idle"), 3000);
      } else {
        onEnriched(data);
        setState("done");
        setTimeout(() => setState("idle"), 3000);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const label =
    state === "loading" ? "RESEARCHING…" :
    state === "done"    ? "✓ FILLED IN"  :
    state === "error"   ? "! ERROR"      :
    "AGENT FILL";

  const bg =
    state === "loading" ? "#fff5c0" :
    state === "done"    ? "#b8ffda" :
    state === "error"   ? "#ffe0e8" :
    "#e8d4ff";

  const color =
    state === "loading" ? "#ffb800" :
    state === "done"    ? "#00a83a" :
    state === "error"   ? "#ff1e78" :
    "#7c3aed";

  return (
    <button
      onClick={run}
      disabled={state === "loading"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a] text-[9px] font-black uppercase tracking-widest transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60 shrink-0"
      style={{
        fontFamily: "Orbitron, sans-serif",
        background: bg,
        color,
        boxShadow: `2px 2px 0 ${color}`,
      }}
    >
      <PixelIcon
        name={state === "done" ? "check" : state === "error" ? "alert" : "rocket"}
        size={10}
        color={color}
      />
      {label}
    </button>
  );
}
