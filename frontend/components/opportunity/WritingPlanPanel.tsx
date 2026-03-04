"use client";

import { useState } from "react";
import PixelIcon from "@/components/shared/PixelIcon";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WritingPlan {
  angle: string;
  sections: string[];
  themes: string[];
  materials: string[];
  estimatedHours: number;
  winTips: string[];
}

interface Props {
  opportunityId: string;
  rawPlan?: string | null;          // JSON string from Airtable
  grantName?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanBlock({
  icon, label, color, bg, shadow, items,
}: {
  icon: string; label: string; color: string; bg: string; shadow: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border-[2px] border-[#0a0a1a] overflow-hidden"
      style={{ boxShadow: `3px 3px 0 ${shadow}` }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b-[2px] border-[#0a0a1a]"
        style={{ background: bg }}>
        <div className="w-5 h-5 rounded-md border-[1.5px] border-[#0a0a1a] flex items-center justify-center shrink-0"
          style={{ background: "#ffffff" }}>
          <PixelIcon name={icon as any} size={11} color={color} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest"
          style={{ fontFamily: "Orbitron, sans-serif", color }}>
          {label}
        </span>
      </div>
      {/* Items */}
      <div className="bg-[#fffbf0] divide-y-[1.5px] divide-dashed divide-[#0a0a1a]/10">
        {items.map((item, i) => {
          const [title, ...rest] = item.split(":");
          const hasTitle = rest.length > 0;
          return (
            <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
              <span className="text-[9px] font-black mt-0.5 shrink-0"
                style={{ fontFamily: "Orbitron, sans-serif", color }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                {hasTitle ? (
                  <>
                    <span className="text-[10px] font-black text-[#0a0a1a]">
                      {title.trim()}:{" "}
                    </span>
                    <span className="text-[10px] text-[#333344]">{rest.join(":").trim()}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-[#333344]">{item}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WritingPlanPanel({ opportunityId, rawPlan, grantName }: Props) {
  const [plan, setPlan]       = useState<WritingPlan | null>(() => {
    if (!rawPlan) return null;
    try { return JSON.parse(rawPlan) as WritingPlan; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function generatePlan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/writing-plan`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }
      const { plan: newPlan } = await res.json();
      setPlan(newPlan as WritingPlan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!plan && !loading) {
    return (
      <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
        style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #ffb800" }}>
        <div className="p-5 text-center">
          <div className="w-14 h-14 rounded-2xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center mx-auto mb-3"
            style={{ background: "#fff3a0", boxShadow: "3px 3px 0 #ffb800" }}>
            <PixelIcon name="quill" size={24} color="#0a0a1a" />
          </div>
          <p className="text-sm font-black text-[#0a0a1a] mb-1"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            NO PLAN YET
          </p>
          <p className="text-[10px] text-[#555566] mb-4 max-w-xs mx-auto">
            Claude will analyze this grant and build a custom writing plan — narrative angle, sections to write, materials checklist, and win tips.
          </p>
          {error && (
            <p className="text-[10px] text-[#ff1e78] mb-3 font-bold">{error}</p>
          )}
          <button
            onClick={generatePlan}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-[2.5px] border-[#0a0a1a] font-black text-sm text-white transition-all active:translate-y-[2px] active:shadow-none"
            style={{
              fontFamily: "Orbitron, sans-serif",
              background: "#ff6b00",
              boxShadow: "4px 4px 0 #0a0a1a",
            }}
          >
            <PixelIcon name="lightning" size={14} color="white" />
            GENERATE PLAN
          </button>
          <p className="text-[8px] text-[#aaaacc] mt-3 tracking-widest"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            POWERED BY CLAUDE AI · ~10 SECONDS
          </p>
        </div>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
        style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #ff6b00" }}>
        <div className="p-6 text-center">
          <div className="flex justify-center gap-1.5 mb-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}
                className="w-3 h-3 rounded-sm border-[1.5px] border-[#0a0a1a] animate-bounce"
                style={{
                  background: ["#ff6b00","#ffb800","#7c3aed","#00a83a"][i],
                  animationDelay: `${i * 0.12}s`,
                }} />
            ))}
          </div>
          <p className="text-[11px] font-black text-[#0a0a1a]"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            CLAUDE IS ANALYZING THIS GRANT…
          </p>
          <p className="text-[9px] text-[#555566] mt-1">
            Building your custom writing plan
          </p>
        </div>
      </div>
    );
  }

  // ── Plan display ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
      style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #ff6b00" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-[2.5px] border-[#0a0a1a]"
        style={{ background: "#fff3a0" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center"
            style={{ background: "#ff6b00", boxShadow: "2px 2px 0 #0a0a1a" }}>
            <PixelIcon name="lightning" size={13} color="white" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            AI WRITING PLAN
          </span>
        </div>
        {/* Regenerate */}
        <button
          onClick={generatePlan}
          className="text-[8px] font-black px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a] transition-all active:translate-y-[1px] active:shadow-none"
          style={{
            fontFamily: "Orbitron, sans-serif",
            background: "#ffffff",
            color: "#ff6b00",
            boxShadow: "2px 2px 0 #ff6b00",
          }}
          title="Regenerate plan"
        >
          ↺ REDO
        </button>
      </div>

      <div className="p-4 space-y-3">

        {/* Narrative angle — always first */}
        {plan!.angle && (
          <div className="rounded-xl border-[2px] border-[#0a0a1a] p-3"
            style={{ background: "#e8d4ff", boxShadow: "3px 3px 0 #7c3aed" }}>
            <p className="text-[8px] font-black uppercase tracking-widest text-[#7c3aed] mb-1"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              NARRATIVE ANGLE
            </p>
            <p className="text-[11px] text-[#0a0a1a] leading-relaxed font-medium">
              {plan!.angle}
            </p>
          </div>
        )}

        {/* Estimated hours badge */}
        {plan!.estimatedHours > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a]"
              style={{ background: "#b8f0ff", boxShadow: "2px 2px 0 #0066cc" }}>
              <PixelIcon name="clock" size={11} color="#0066cc" />
              <span className="text-[9px] font-black text-[#0066cc]"
                style={{ fontFamily: "Orbitron, sans-serif" }}>
                {plan!.estimatedHours}H TO WRITE
              </span>
            </div>
          </div>
        )}

        {/* Sections */}
        <PlanBlock
          icon="quill" label="SECTIONS TO WRITE"
          color="#7c3aed" bg="#e8d4ff" shadow="#7c3aed"
          items={plan!.sections ?? []}
        />

        {/* Themes */}
        {(plan!.themes ?? []).length > 0 && (
          <div className="rounded-xl border-[2px] border-[#0a0a1a] overflow-hidden"
            style={{ boxShadow: "3px 3px 0 #00a83a" }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b-[2px] border-[#0a0a1a]"
              style={{ background: "#b8ffda" }}>
              <div className="w-5 h-5 rounded-md border-[1.5px] border-[#0a0a1a] flex items-center justify-center shrink-0"
                style={{ background: "#ffffff" }}>
                <PixelIcon name="star" size={11} color="#00a83a" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#00a83a]"
                style={{ fontFamily: "Orbitron, sans-serif" }}>KEY THEMES</span>
            </div>
            <div className="bg-[#fffbf0] p-3 flex flex-wrap gap-2">
              {plan!.themes.map((theme, i) => (
                <span key={i}
                  className="text-[9px] font-bold px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a] text-[#0a0a1a]"
                  style={{ background: ["#b8ffda","#b8e0ff","#e8d4ff","#fff3a0","#ffd0a0"][i % 5] }}>
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Materials checklist */}
        <PlanBlock
          icon="check" label="MATERIALS CHECKLIST"
          color="#0066cc" bg="#b8e0ff" shadow="#0066cc"
          items={plan!.materials ?? []}
        />

        {/* Win tips */}
        <PlanBlock
          icon="target" label="WIN TIPS"
          color="#ff1e78" bg="#ffe0f0" shadow="#ff1e78"
          items={plan!.winTips ?? []}
        />

      </div>
    </div>
  );
}
