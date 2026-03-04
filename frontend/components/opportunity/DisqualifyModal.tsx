"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PixelIcon from "@/components/shared/PixelIcon";
import { useUser } from "@/lib/user-context";

const PRESET_REASONS = [
  "Geographic restriction — outside LDU's service area",
  "Requires certification LDU doesn't hold (FQHC, accredited university, etc.)",
  "Award amount too small (under $5K)",
  "Deadline too close — under 14 days, complex application",
  "Requires matching funds we can't currently meet",
  "Mission doesn't align with any LDU pillar",
  "Nonprofit ineligible — for-profit or individual only",
  "Already funded by same funder this cycle",
  "Team decision — not pursuing at this time",
  "Other (enter below)",
];

interface Props {
  opportunityId: string;
  grantName:     string;
  onClose:       () => void;
  onDisqualified?: (reason: string) => void;
}

const SEP = "────────────────────────────────";

export default function DisqualifyModal({ opportunityId, grantName, onClose, onDisqualified }: Props) {
  const { user } = useUser();
  const router   = useRouter();
  const [selected, setSelected]   = useState("");
  const [custom, setCustom]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const reason = selected === "Other (enter below)" ? custom.trim() : selected;

  async function confirm() {
    if (!reason) return;
    setSaving(true);
    setError("");

    try {
      // 1. Update status + save reason
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            Status:                   "Disqualified",
            "Disqualification Reason": reason,
          },
        }),
      });
      if (!res.ok) throw new Error("Status update failed");

      // 2. Auto-log to Notes
      const author = user?.id ?? "Team";
      const ts = new Date().toLocaleString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
      const entry = `[${ts}] ${author} · DISQUALIFIED:\n${reason}`;
      const noteRes = await fetch(`/api/opportunities/${opportunityId}`);
      let existingNotes = "";
      if (noteRes.ok) {
        const data = await noteRes.json();
        existingNotes = (data.fields?.Notes as string) ?? "";
      }
      await fetch(`/api/opportunities/${opportunityId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: { Notes: existingNotes ? `${entry}\n${SEP}\n${existingNotes}` : entry },
        }),
      });

      onDisqualified?.(reason);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{ background: "rgba(10,10,26,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl border-t-[3px] border-x-[3px] border-[#0a0a1a] overflow-hidden"
        style={{ background: "#fffbf0", boxShadow: "0 -6px 0 #ff1e78" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b-[2.5px] border-[#0a0a1a] flex items-center justify-between"
          style={{ background: "#ffe0e8" }}
        >
          <div className="flex items-center gap-2">
            <PixelIcon name="cross" size={13} color="#ff1e78" />
            <span
              className="text-[12px] font-black uppercase tracking-widest text-[#ff1e78]"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >DISQUALIFY GRANT</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center"
            style={{ background: "#ffffff", boxShadow: "2px 2px 0 #0a0a1a" }}
          >
            <span className="text-[14px] font-black">×</span>
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: "70dvh" }}>
          <p className="text-sm text-[#0a0a1a]/70 leading-snug">
            Select a reason for disqualifying <strong>&ldquo;{grantName}&rdquo;</strong>.
            This will be logged and displayed on the grant card.
          </p>

          {/* Preset reasons */}
          <div className="space-y-1.5">
            {PRESET_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setSelected(r)}
                className="w-full text-left rounded-xl border-[2px] border-[#0a0a1a] px-3.5 py-2.5 text-sm transition-all"
                style={{
                  background:  selected === r ? "#ffe0e8" : "#ffffff",
                  boxShadow:   selected === r ? "2px 2px 0 #ff1e78" : "2px 2px 0 #0a0a1a",
                  color:       selected === r ? "#ff1e78" : "#0a0a1a",
                  fontWeight:  selected === r ? 700 : 400,
                }}
              >
                {selected === r && "✓ "}{r}
              </button>
            ))}
          </div>

          {/* Custom reason textarea */}
          {selected === "Other (enter below)" && (
            <textarea
              value={custom}
              onChange={e => setCustom(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Describe why this grant is being disqualified…"
              className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2.5 text-sm focus:outline-none resize-none"
              style={{ background: "#fff5f5", boxShadow: "3px 3px 0 #ff1e78" }}
            />
          )}

          {/* Error */}
          {error && (
            <p className="text-xs font-bold text-[#ff1e78]">{error}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1 pb-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border-[2.5px] border-[#0a0a1a] py-3 text-[11px] font-black uppercase tracking-widest"
              style={{ fontFamily: "Orbitron, sans-serif", background: "#fffbf0", boxShadow: "3px 3px 0 #0a0a1a" }}
            >CANCEL</button>
            <button
              onClick={confirm}
              disabled={!reason || saving}
              className="flex-1 rounded-xl border-[2.5px] border-[#0a0a1a] py-3 text-[11px] font-black uppercase tracking-widest transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-40"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: saving ? "#fff5c0" : "#ffe0e8",
                color: saving ? "#ffb800" : "#ff1e78",
                boxShadow: saving ? "3px 3px 0 #ffb800" : "3px 3px 0 #ff1e78",
              }}
            >
              {saving ? "SAVING…" : "DISQUALIFY"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
