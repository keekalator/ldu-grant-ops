"use client";

import { useState } from "react";
import PixelIcon from "@/components/shared/PixelIcon";

interface Props { opportunityId: string; existingNotes: string; }

const AUTHORS = ["Kika Keith (CEO)", "Kika Howze (Impl.)", "Sheila (Ops)", "Agent Auto-Log"];

const AUTHOR_COLORS: Record<string, string> = {
  "Kika Keith (CEO)":   "linear-gradient(135deg,#ff1e78,#ff6b35)",
  "Kika Howze (Impl.)": "linear-gradient(135deg,#7c3aed,#00d4ff)",
  "Sheila (Ops)":       "linear-gradient(135deg,#ffb800,#ffe100)",
  "Agent Auto-Log":     "linear-gradient(135deg,#00a83a,#00d4ff)",
};

export default function NoteForm({ opportunityId, existingNotes }: Props) {
  const [author, setAuthor] = useState(AUTHORS[0]);
  const [text,   setText]   = useState("");
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);

    const now = new Date();
    const ts  = now.toLocaleString("en-US", { month:"short", day:"2-digit", year:"numeric",
      hour:"2-digit", minute:"2-digit", hour12:true });
    const separator = "────────────────────────────────";
    const logEntry  = `[${ts}] ${author}:\n${text.trim()}`;
    const updated   = existingNotes
      ? `${logEntry}\n${separator}\n${existingNotes}`
      : logEntry;

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ fields: { Notes: updated } }),
      });
      if (res.ok) { setDone(true); setText(""); setTimeout(() => setDone(false), 3000); }
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Author selector */}
      <div className="flex gap-2 flex-wrap">
        {AUTHORS.map(a => {
          const active = a === author;
          return (
            <button key={a} type="button" onClick={() => setAuthor(a)}
              className="text-[9px] font-black px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a] transition-all active:translate-y-[1px]"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: active ? AUTHOR_COLORS[a] : "#ffffff",
                color: active ? "#ffffff" : "#aaaacc",
                boxShadow: active ? "2px 2px 0 #0a0a1a, 0 0 10px rgba(0,0,0,0.12)" : "2px 2px 0 #e0e0ee",
              }}>
              {a.split(" ")[0].toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Note textarea */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Log a call, decision, or update…"
        rows={3}
        className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3 text-sm resize-none focus:outline-none placeholder-[#aaaacc]"
        style={{
          background: "#ffffff",
          color: "#0a0a1a",
          boxShadow: "3px 3px 0 #0a0a1a",
          fontFamily: "Inter, sans-serif",
        }}
      />

      {/* Submit row */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || !text.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border-[2.5px] border-[#0a0a1a] text-[10px] font-black uppercase tracking-wider text-[#0a0a1a] transition-all active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontFamily:"Orbitron,sans-serif", background:"#b8ffda", boxShadow:"3px 3px 0 #0a0a1a" }}>
          <PixelIcon name="quill" size={11} color="white" />
          {saving ? "LOGGING…" : "LOG NOTE"}
        </button>

        {done && (
          <div className="flex items-center gap-2">
            <PixelIcon name="check" size={12} color="#00a83a" />
            <span className="text-[10px] font-black text-[#00a83a]"
              style={{ fontFamily:"Orbitron,sans-serif" }}>LOGGED!</span>
          </div>
        )}
      </div>
    </form>
  );
}
