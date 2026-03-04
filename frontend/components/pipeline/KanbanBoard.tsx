"use client";

import { useState, useMemo } from "react";
import GrantCard from "@/components/shared/GrantCard";
import PixelIcon from "@/components/shared/PixelIcon";
// Stage → Airtable status mapping (replaces old KANBAN_COLUMNS)
const STAGE_STATUSES: Record<string, string[]> = {
  research:  ["Prospect", "Qualifying"],
  writing:   ["Writing", "In Review"],
  submitted: ["Submitted", "Active"],
  closed:    ["Awarded", "Declined", "Rejected"],
};
import { ALL_ENTITIES } from "@/lib/entities";
import type { Opportunity } from "@/types";
import type { PixelIconName } from "@/components/shared/PixelIcon";

// ─── Stage definitions ────────────────────────────────────────────────────────

const STAGES: {
  id: string; label: string; emoji: string; desc: string; tip: string;
  icon: PixelIconName; color: string; bg: string; shadow: string;
}[] = [
  {
    id: "research",  label: "SCOUT",    emoji: "🔍",
    desc: "New leads",
    tip:  "Grants we're researching & deciding if LDU qualifies",
    icon: "search",  color: "#7c3aed", bg: "#e8d4ff", shadow: "#5500cc",
  },
  {
    id: "writing",   label: "DRAFT",    emoji: "✏️",
    desc: "Being written",
    tip:  "Applications actively being written or in review",
    icon: "quill",   color: "#ff6b00", bg: "#ffd0a0", shadow: "#cc5500",
  },
  {
    id: "submitted", label: "SENT",     emoji: "🚀",
    desc: "Waiting on answer",
    tip:  "Submitted! Now we wait for a decision",
    icon: "rocket",  color: "#00a83a", bg: "#b8ffda", shadow: "#007a2a",
  },
  {
    id: "closed",    label: "DONE",     emoji: "🏆",
    desc: "Won or closed",
    tip:  "Awarded wins + declined grants we've closed out",
    icon: "trophy",  color: "#ffb800", bg: "#ffd970", shadow: "#ffa500",
  },
];

// ─── Pillar filters — short labels so they never truncate ─────────────────────

const PILLAR_FILTERS: { id: string; label: string; color: string; bg: string }[] = [
  { id: "all",                        label: "All Areas",  color: "#0a0a1a", bg: "#ffe100" },
  { id: "Capital Campaign",           label: "🏛 Campus",  color: "#7c3aed", bg: "#e8d4ff" },
  { id: "Programming & Operations",   label: "💻 Programs", color: "#0066cc", bg: "#b8e0ff" },
  { id: "Studio WELEH",               label: "🎨 WELEH",   color: "#ff1e78", bg: "#ffe0f0" },
  { id: "Agricultural Extension",     label: "🌱 The Farm", color: "#00a83a", bg: "#b8ffda" },
  { id: "Founder & Enterprise",       label: "⭐ Founders", color: "#ff6b00", bg: "#ffd0a0" },
  { id: "Textile Sustainability",     label: "♻️ Textile",  color: "#0099aa", bg: "#b8f0ff" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  opportunities: Opportunity[];
  initialStage?: string;
  initialPillar?: string;
}

export default function KanbanBoard({ opportunities, initialStage, initialPillar }: Props) {
  const [activeCol, setActiveCol] = useState(initialStage ?? "research");
  const [pillar,    setPillar]    = useState(initialPillar ?? "all");
  const [entity,    setEntity]    = useState("all");
  const [search,    setSearch]    = useState("");

  const activeStage = STAGES.find((s) => s.id === activeCol) ?? STAGES[0];
  const activeStatuses = STAGE_STATUSES[activeCol] ?? [];

  const filtered = useMemo(() => {
    let list = opportunities;
    if (pillar !== "all") list = list.filter((o) => o.fields.Pillar?.some(
      p => p === pillar || p.toLowerCase().includes(pillar.toLowerCase().split(" ")[0].toLowerCase())
    ));
    if (entity !== "all") list = list.filter((o) => {
      const e = o.fields["Submitting Entity"] ?? "";
      return e === entity || e.toLowerCase().includes(entity.toLowerCase().split(" ")[0].toLowerCase());
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        (o.fields["Grant Name"] ?? "").toLowerCase().includes(q) ||
        (o.fields["Funder Name"] ?? "").toLowerCase().includes(q) ||
        (o.fields["Submitting Entity"] ?? "").toLowerCase().includes(q)
      );
    }
    return list.filter((o) => activeStatuses.includes(o.fields.Status ?? "Prospect"));
  }, [opportunities, pillar, entity, search, activeCol, activeStatuses]);

  function colCount(id: string) {
    const statuses = STAGE_STATUSES[id] ?? [];
    let list = opportunities;
    if (pillar !== "all") list = list.filter((o) => o.fields.Pillar?.some(
      p => p === pillar || p.toLowerCase().includes(pillar.toLowerCase().split(" ")[0].toLowerCase())
    ));
    if (entity !== "all") list = list.filter((o) => {
      const e = o.fields["Submitting Entity"] ?? "";
      return e === entity || e.toLowerCase().includes(entity.toLowerCase().split(" ")[0].toLowerCase());
    });
    return list.filter((o) => statuses.includes(o.fields.Status ?? "Prospect")).length;
  }

  return (
    <div className="space-y-4">

      {/* ── Stage cards — 2×2 grid ───────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {STAGES.map((stage) => {
          const isActive = activeCol === stage.id;
          const count    = colCount(stage.id);
          return (
            <button
              key={stage.id}
              onClick={() => setActiveCol(stage.id)}
              className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden text-left transition-all duration-150 active:translate-y-[2px] active:shadow-none"
              style={{
                background: isActive ? stage.bg : "#ffffff",
                boxShadow: isActive ? `4px 4px 0 ${stage.shadow}` : "3px 3px 0 #0a0a1a",
              }}
            >
              {/* Colored top strip — thick when active */}
              <div
                className="transition-all duration-200"
                style={{
                  height: isActive ? 6 : 3,
                  background: stage.color,
                }}
              />
              <div className="p-3">
                {/* Icon + label row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className="w-8 h-8 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center"
                    style={{ background: isActive ? "rgba(255,255,255,0.7)" : "#f0f0f8",
                      boxShadow: `1px 1px 0 ${isActive ? stage.shadow : "#aaaacc"}` }}
                  >
                    <PixelIcon name={stage.icon} size={16} color={isActive ? stage.color : "#aaaacc"} />
                  </div>
                  {isActive && (
                    <span
                      className="text-[8px] font-black px-2 py-0.5 rounded-md border-[1.5px] border-[#0a0a1a] text-white"
                      style={{ fontFamily: "Orbitron, sans-serif", background: stage.color,
                        boxShadow: "1px 1px 0 #0a0a1a" }}>
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* Stage name */}
                <p
                  className="text-[11px] font-black uppercase tracking-wider"
                  style={{ fontFamily: "Orbitron, sans-serif",
                    color: isActive ? stage.color : "#0a0a1a" }}
                >
                  {stage.label}
                </p>

                {/* Plain English description */}
                <p className="text-[10px] text-[#555566] leading-snug mt-0.5">
                  {stage.desc}
                </p>

                {/* Big count */}
                <p
                  className="text-3xl font-black leading-none mt-2"
                  style={{ fontFamily: "Orbitron, sans-serif",
                    color: isActive ? stage.color : count > 0 ? "#0a0a1a" : "#ccccdd" }}
                >
                  {count}
                </p>
                <p className="text-[9px] font-semibold text-[#aaaacc] mt-0.5">
                  {count === 1 ? "grant" : "grants"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search bar ────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2"
        style={{ background: "#ffffff", boxShadow: "3px 3px 0 #0a0a1a" }}
      >
        <PixelIcon name="search" size={14} color="#aaaacc" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by grant name, funder, or entity…"
          className="flex-1 text-sm text-[#0a0a1a] placeholder-[#aaaacc] focus:outline-none bg-transparent"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: "#ffe0e8" }}>
            <PixelIcon name="cross" size={9} color="#ff1e78" />
          </button>
        )}
      </div>

      {/* ── Pillar filters — wrapped, no truncation ────────── */}
      <div>
        <p className="text-[8px] font-black uppercase tracking-widest text-[#aaaacc] mb-1.5"
          style={{ fontFamily: "Orbitron, sans-serif" }}>FILTER BY FUNDING AREA</p>
        <div className="flex flex-wrap gap-1.5">
          {PILLAR_FILTERS.map((f) => {
            const isActive = pillar === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setPillar(f.id)}
                className="px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a] text-[10px] font-black whitespace-nowrap transition-all active:translate-y-[1px]"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  background: isActive ? f.bg : "#ffffff",
                  color: isActive ? f.color : "#aaaacc",
                  boxShadow: isActive ? `2px 2px 0 ${f.color}` : "1px 1px 0 #aaaacc",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Entity filters ────────────────────────────────── */}
      <div>
        <p className="text-[8px] font-black uppercase tracking-widest text-[#aaaacc] mb-1.5"
          style={{ fontFamily: "Orbitron, sans-serif" }}>FILTER BY WHO'S APPLYING</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_ENTITIES.map((e) => {
            const isActive = entity === e.id;
            return (
              <button
                key={e.id}
                onClick={() => setEntity(e.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a] text-[10px] font-black whitespace-nowrap transition-all active:translate-y-[1px]"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  background: isActive ? e.style.bg : "#ffffff",
                  color: isActive ? e.style.color : "#aaaacc",
                  boxShadow: isActive ? `2px 2px 0 ${e.style.dot}` : "1px 1px 0 #aaaacc",
                }}
              >
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: e.id === "all" ? "#0a0a1a" : e.style.dot }}
                />
                {e.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active stage banner ───────────────────────────── */}
      <div
        className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
        style={{ boxShadow: `4px 4px 0 ${activeStage.shadow}` }}
      >
        {/* Colored header */}
        <div className="px-4 py-2.5 flex items-center gap-3"
          style={{ background: activeStage.color }}>
          <PixelIcon name={activeStage.icon} size={18} color="white" />
          <div className="flex-1">
            <p className="text-sm font-black text-white"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              {activeStage.label} STAGE
            </p>
            <p className="text-[10px] text-white opacity-80">{activeStage.tip}</p>
          </div>
          <span className="text-2xl font-black text-white"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            {filtered.length}
          </span>
        </div>
        {/* Filter summary */}
        {(pillar !== "all" || entity !== "all" || search) && (
          <div className="px-4 py-2 flex items-center gap-2 flex-wrap border-t-[2px] border-[#0a0a1a]"
            style={{ background: activeStage.bg }}>
            <PixelIcon name="filter" size={11} color={activeStage.color} />
            <span className="text-[9px] font-bold text-[#0a0a1a]">
              Filtered:
              {pillar !== "all" && ` ${PILLAR_FILTERS.find(f => f.id === pillar)?.label}`}
              {entity !== "all" && ` · ${ALL_ENTITIES.find(e => e.id === entity)?.label}`}
              {search && ` · "${search}"`}
            </span>
            <button
              onClick={() => { setPillar("all"); setEntity("all"); setSearch(""); }}
              className="ml-auto text-[9px] font-black px-2 py-0.5 rounded border-[1.5px] border-[#0a0a1a] text-[#ff1e78]"
              style={{ background: "#ffe0e8", fontFamily: "Orbitron, sans-serif",
                boxShadow: "1px 1px 0 #0a0a1a" }}>
              CLEAR ALL
            </button>
          </div>
        )}
      </div>

      {/* ── Grant list ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-8 text-center"
          style={{ background: activeStage.bg, boxShadow: `4px 4px 0 ${activeStage.shadow}` }}
        >
          <div
            className="w-16 h-16 rounded-2xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center mx-auto mb-4"
            style={{ background: "#ffffff", boxShadow: `3px 3px 0 ${activeStage.shadow}` }}
          >
            <PixelIcon name={activeStage.icon} size={28} color={activeStage.color} />
          </div>
          <p className="text-sm font-black text-[#0a0a1a] mb-1"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            {activeStage.id === "writing" ? "NOTHING BEING WRITTEN YET" :
             activeStage.id === "submitted" ? "NOTHING SENT YET" :
             activeStage.id === "closed" ? "NO CLOSED GRANTS" : "NO GRANTS HERE"}
          </p>
          <p className="text-xs text-[#555566]">
            {activeStage.id === "research" ? "Add grants from your Airtable to start scouting" :
             activeStage.id === "writing"  ? "Move a grant to Writing status to see it here" :
             activeStage.id === "submitted"? "Submit a grant application to track it here" :
                                             "Awarded and declined grants will appear here"}
          </p>
          {(pillar !== "all" || entity !== "all" || search) && (
            <button
              onClick={() => { setPillar("all"); setEntity("all"); setSearch(""); }}
              className="mt-4 px-4 py-2 rounded-xl border-[2.5px] border-[#0a0a1a] text-[10px] font-black"
              style={{ fontFamily: "Orbitron, sans-serif",
                background: "#ffe100", boxShadow: "2px 2px 0 #0a0a1a" }}>
              CLEAR FILTERS
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((opp) => (
            <GrantCard key={opp.id} opportunity={opp} />
          ))}
          {/* Bottom count */}
          <div className="text-center pt-2">
            <span className="text-[9px] font-bold text-[#aaaacc]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              SHOWING {filtered.length} OF {opportunities.length} TOTAL GRANTS
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
