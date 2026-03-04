"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PixelIcon from "@/components/shared/PixelIcon";
import { useUser } from "@/lib/user-context";

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  {
    status:  "Writing Queue",
    label:   "DRAFTING",
    icon:    "quill",
    color:   "#ffb800",
    bg:      "#fff5c0",
    shadow:  "#ffb800",
    desc:    "Active draft in progress. Build the narrative using your writing plan.",
  },
  {
    status:  "Active",
    label:   "IN REVIEW",
    icon:    "search",
    color:   "#0066cc",
    bg:      "#c8e0ff",
    shadow:  "#0066cc",
    desc:    "Draft complete. Kika reviews, approves, and gives final sign-off.",
  },
  {
    status:  "Submitted",
    label:   "SUBMITTED",
    icon:    "rocket",
    color:   "#00a83a",
    bg:      "#b8ffda",
    shadow:  "#00a83a",
    desc:    "Submitted to funder. Log confirmation and track response.",
  },
] as const;

type WorkflowStatus = "Writing Queue" | "Active" | "Submitted";

const TRANSITIONS: Record<WorkflowStatus, { next: string; label: string; color: string; bg: string; shadow: string; confirm: string }> = {
  "Writing Queue": {
    next:    "Active",
    label:   "SEND TO REVIEW",
    color:   "#0066cc",
    bg:      "#c8e0ff",
    shadow:  "#0066cc",
    confirm: "Mark draft complete and send to Kika for final review?",
  },
  "Active": {
    next:    "Submitted",
    label:   "MARK SUBMITTED",
    color:   "#00a83a",
    bg:      "#b8ffda",
    shadow:  "#00a83a",
    confirm: "Confirm this application has been submitted to the funder?",
  },
  "Submitted": {
    next:    "Submitted",
    label:   "SUBMITTED",
    color:   "#00a83a",
    bg:      "#b8ffda",
    shadow:  "#00a83a",
    confirm: "",
  },
};

const SEP = "────────────────────────────────";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  opportunityId: string;
  currentStatus: string;
  grantName:     string;
  hasWritingPlan: boolean;
}

export default function WritingWorkflow({ opportunityId, currentStatus, grantName, hasWritingPlan }: Props) {
  const { user } = useUser();
  const router   = useRouter();
  const [status, setStatus]   = useState<string>(currentStatus);
  const [saving, setSaving]   = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "done" | "error">("idle");

  const activeIdx  = STAGES.findIndex(s => s.status === status);
  const activeStage = STAGES[activeIdx];
  const transition  = TRANSITIONS[status as WorkflowStatus];

  async function advance() {
    if (!transition || transition.next === status) return;
    if (transition.confirm && !window.confirm(transition.confirm)) return;

    const prev = status;
    const next = transition.next;
    setSaving(true);
    setSaveState("saving");
    setStatus(next); // optimistic

    try {
      // 1. Update status in Airtable
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fields: { Status: next } }),
      });
      if (!res.ok) throw new Error("status update failed");

      // 2. Auto-log the workflow move to Notes
      const author = user?.id ?? "Team";
      const ts = new Date().toLocaleString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
      const nextLabel = STAGES.find(s => s.status === next)?.label ?? next;
      const prevLabel = STAGES.find(s => s.status === prev)?.label ?? prev;
      const entry = `[${ts}] ${author} · WORKFLOW:\n${prevLabel} → ${nextLabel}\n"${grantName}"`;

      const noteRes = await fetch(`/api/opportunities/${opportunityId}`);
      let currentNotes = "";
      if (noteRes.ok) {
        const data = await noteRes.json();
        currentNotes = (data.fields?.Notes as string) ?? "";
      }
      await fetch(`/api/opportunities/${opportunityId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fields: { Notes: currentNotes ? `${entry}\n${SEP}\n${currentNotes}` : entry },
        }),
      });

      setSaveState("done");
      setTimeout(() => {
        setSaveState("idle");
        router.refresh();
      }, 1500);
    } catch {
      setStatus(prev);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2500);
    } finally {
      setSaving(false);
    }
  }

  // Only render for grants in the writing workflow
  if (!["Writing Queue", "Active", "Submitted"].includes(status)) return null;

  return (
    <div
      className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
      style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #ffb800" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b-[2px] border-[#0a0a1a] flex items-center justify-between"
        style={{ background: "#fff5c0" }}
      >
        <div className="flex items-center gap-2">
          <PixelIcon name="quill" size={13} color="#0a0a1a" />
          <span
            className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >WRITING WORKFLOW</span>
        </div>
        {/* Live status chip */}
        {activeStage && (
          <span
            className="text-[9px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a]"
            style={{
              fontFamily: "Orbitron, sans-serif",
              background: activeStage.bg,
              color: activeStage.color,
              boxShadow: `1px 1px 0 ${activeStage.shadow}`,
            }}
          >{activeStage.label}</span>
        )}
      </div>

      <div className="p-4 space-y-4">

        {/* 3-step progress bar */}
        <div className="flex items-start gap-0 relative">
          {STAGES.map((stage, idx) => {
            const isPast   = idx < activeIdx;
            const isActive = stage.status === status;
            return (
              <div key={stage.status} className="flex-1 flex flex-col items-center gap-1.5 relative">
                {/* Connector */}
                {idx < STAGES.length - 1 && (
                  <div
                    className="absolute left-1/2 top-[14px] w-full h-[3px] -z-0"
                    style={{ background: isPast || isActive ? stage.color : "#e0e0ee" }}
                  />
                )}
                {/* Node */}
                <div
                  className="relative z-10 w-7 h-7 rounded-full border-[2.5px] border-[#0a0a1a] flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isActive ? stage.color : isPast ? stage.color : "#ffffff",
                    boxShadow:  isActive
                      ? `0 0 12px ${stage.color}80, 2px 2px 0 #0a0a1a`
                      : "2px 2px 0 #0a0a1a",
                    transform: isActive ? "scale(1.2)" : "scale(1)",
                  }}
                >
                  {isActive || isPast
                    ? <PixelIcon name={stage.icon} size={12} color="#fff" />
                    : <div className="w-2 h-2 rounded-full bg-[#d0d0e0]" />
                  }
                </div>
                {/* Step label */}
                <span
                  className="text-[8px] font-black text-center leading-tight"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    color: isActive ? stage.color : isPast ? stage.color : "#aaaacc",
                    textShadow: isActive ? `0 0 8px ${stage.color}60` : "none",
                  }}
                >{stage.label}</span>
              </div>
            );
          })}
        </div>

        {/* Current stage description */}
        {activeStage && (
          <p className="text-xs text-[#0a0a1a]/60 leading-snug">{activeStage.desc}</p>
        )}

        {/* No writing plan warning */}
        {status === "Writing Queue" && !hasWritingPlan && (
          <div
            className="rounded-xl border-[2px] border-[#0a0a1a] px-3 py-2.5 flex items-center gap-2"
            style={{ background: "#fff0e0", boxShadow: "2px 2px 0 #ff6b00" }}
          >
            <PixelIcon name="alert" size={12} color="#ff6b00" />
            <span
              className="text-[10px] font-black text-[#ff6b00]"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >NO WRITING PLAN — scroll down to generate one</span>
          </div>
        )}

        {/* ── CTA: advance to next stage ──────────────────────── */}
        {status !== "Submitted" && transition && (
          <button
            onClick={advance}
            disabled={saving || saveState === "done"}
            className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
            style={{
              fontFamily: "Orbitron, sans-serif",
              background: saveState === "done"  ? "#b8ffda" : transition.bg,
              color:      saveState === "done"  ? "#00a83a" : transition.color,
              boxShadow:  saveState === "done"
                ? "3px 3px 0 #00a83a"
                : saveState === "error"
                ? "3px 3px 0 #ff1e78"
                : `3px 3px 0 ${transition.shadow}`,
            }}
          >
            {saveState === "done"    ? "✓ DONE"
             : saveState === "saving" ? "SAVING..."
             : saveState === "error"  ? "! ERROR — TRY AGAIN"
             : transition.label}
          </button>
        )}

        {/* ── Submitted confirmation ──────────────────────────── */}
        {status === "Submitted" && (
          <div
            className="rounded-xl border-[2px] border-[#0a0a1a] px-4 py-3 flex items-center gap-3"
            style={{ background: "#b8ffda", boxShadow: "3px 3px 0 #00a83a" }}
          >
            <PixelIcon name="check" size={14} color="#00a83a" />
            <div>
              <p
                className="text-[11px] font-black text-[#00a83a] uppercase tracking-widest"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >SUBMITTED TO FUNDER</p>
              <p className="text-xs text-[#0a0a1a]/50 mt-0.5">Track the response in the Comms Log below</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
