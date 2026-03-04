"use client";

import { useState } from "react";
import PixelIcon from "@/components/shared/PixelIcon";
import { useUser } from "@/lib/user-context";

const PIPELINE_STEPS = [
  { key: "Prospect",      label: "PROSPECT", color: "#7c3aed", bg: "#e8d4ff", icon: "search"  },
  { key: "Scoring",       label: "SCORING",  color: "#ff6b35", bg: "#ffe8d8", icon: "target"  },
  { key: "Writing Queue", label: "WRITING",  color: "#ffb800", bg: "#fff5c0", icon: "quill"   },
  { key: "Active",        label: "REVIEW",   color: "#0066cc", bg: "#c8e0ff", icon: "check"   },
  { key: "Submitted",     label: "SUBMIT",   color: "#00d4ff", bg: "#b8f0ff", icon: "rocket"  },
  { key: "Awarded",       label: "AWARDED",  color: "#00a83a", bg: "#b8ffda", icon: "trophy"  },
];

const ALL_STATUSES = [
  "Prospect", "Scoring", "Writing Queue", "Active",
  "Submitted", "Awarded", "Declined", "Rejected", "Disqualified",
];

interface Props { opportunityId: string; currentStatus: string; existingNotes?: string; }

const SEP = "────────────────────────────────";

export default function StatusUpdater({ opportunityId, currentStatus, existingNotes = "" }: Props) {
  const { user } = useUser();
  const [status, setStatus]   = useState(currentStatus);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);

  const activeIdx = PIPELINE_STEPS.findIndex(s => s.key === status);

  async function handleSelect(newStatus: string) {
    if (newStatus === status) return;
    setSaving(true);
    setSuccess(false);
    const prev = status;
    setStatus(newStatus); // optimistic
    try {
      // 1. Update status
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { Status: newStatus } }),
      });
      if (!res.ok) throw new Error("fail");

      // 2. Auto-log the status change to the Notes field
      const author = user?.id ?? "Team";
      const ts = new Date().toLocaleString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
      const logEntry = `[${ts}] ${author} · STATUS CHANGE:\nMoved from ${prev} → ${newStatus}`;

      // Fetch current notes first so we don't overwrite them
      let currentNotes = existingNotes;
      try {
        const noteRes = await fetch(`/api/opportunities/${opportunityId}`);
        if (noteRes.ok) {
          const data = await noteRes.json();
          currentNotes = (data.fields?.Notes as string) ?? existingNotes;
        }
      } catch {}

      const updatedNotes = currentNotes
        ? `${logEntry}\n${SEP}\n${currentNotes}`
        : logEntry;

      await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { Notes: updatedNotes } }),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch { setStatus(prev); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">

      {/* ── Segmented pipeline bar ────────────────────────── */}
      <div className="flex items-start gap-0 relative">
        {PIPELINE_STEPS.map((step, idx) => {
          const isPast   = idx < activeIdx;
          const isActive = step.key === status;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5 relative cursor-pointer"
              onClick={() => handleSelect(step.key)}>
              {/* Connector line */}
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="absolute left-1/2 top-[14px] w-full h-[3px] -z-0"
                  style={{ background: isPast || isActive ? step.color : "#e0e0ee" }} />
              )}
              {/* Node */}
              <div
                className="relative z-10 w-7 h-7 rounded-full border-[2.5px] border-[#0a0a1a] flex items-center justify-center transition-all"
                style={{
                  background: isActive ? step.color : isPast ? step.color : "#ffffff",
                  boxShadow: isActive ? `0 0 14px ${step.color}88, 2px 2px 0 #0a0a1a` : "2px 2px 0 #0a0a1a",
                  transform: isActive ? "scale(1.2)" : "scale(1)",
                }}>
                {isActive || isPast
                  ? <PixelIcon name={step.icon as any} size={12} color={isActive ? "#fff" : "#fff"} />
                  : <div className="w-2 h-2 rounded-full bg-[#d0d0e0]" />
                }
              </div>
              {/* Label */}
              <span className="text-[8px] font-black text-center leading-tight"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  color: isActive ? step.color : isPast ? step.color : "#aaaacc",
                  textShadow: isActive ? `0 0 6px ${step.color}88` : "none",
                }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Dropdown for all statuses ─────────────────────── */}
      <div className="relative">
        <select
          value={status}
          onChange={e => handleSelect(e.target.value)}
          disabled={saving}
          className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-2.5 text-sm font-bold appearance-none focus:outline-none transition-all"
          style={{
            fontFamily: "Orbitron, sans-serif",
            fontSize: "11px",
            background: "#fffbf0",
            color: "#0a0a1a",
            boxShadow: "3px 3px 0 #0a0a1a",
          }}>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <PixelIcon name="arrow_right" size={11} color="#0a0a1a" className="rotate-90" />
        </div>
      </div>

      {/* ── Save feedback ─────────────────────────────────── */}
      {(saving || success) && (
        <div
          className="rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-2.5 flex items-center gap-2"
          style={{
            background: success ? "#b8ffda" : "#fff5c0",
            boxShadow: success ? "3px 3px 0 #00a83a" : "3px 3px 0 #ffb800",
          }}>
          <div className="w-4 h-4 flex items-center justify-center">
            <PixelIcon name={success ? "check" : "refresh"} size={13}
              color={success ? "#00a83a" : "#ffb800"} />
          </div>
          <span className="text-[10px] font-black"
            style={{ fontFamily:"Orbitron,sans-serif", color: success ? "#00a83a" : "#ffb800" }}>
            {success ? "STATUS UPDATED!" : "SAVING…"}
          </span>
        </div>
      )}
    </div>
  );
}
