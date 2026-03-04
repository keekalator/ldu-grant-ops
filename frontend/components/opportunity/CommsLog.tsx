"use client";

/**
 * CommsLog — unified communication logger + activity feed.
 * Team members can log calls, emails, meetings, and internal notes.
 * Entries appear instantly (optimistic update) and sync to Airtable Notes field.
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import PixelIcon from "@/components/shared/PixelIcon";
import { useUser } from "@/lib/user-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteType = "internal" | "call" | "email" | "meeting" | "followup";

interface LogEntry {
  timestamp: string;
  author: string;
  type: NoteType;
  message: string;
  pending?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const NOTE_TYPES: Array<{
  id: NoteType; label: string; icon: string;
  bg: string; color: string; shadow: string; desc: string;
}> = [
  { id: "internal", label: "TEAM NOTE",    icon: "quill",    bg: "#e8d4ff", color: "#7c3aed", shadow: "#7c3aed", desc: "Internal team update" },
  { id: "call",     label: "GRANTOR CALL", icon: "pipeline", bg: "#b8ffda", color: "#00a83a", shadow: "#00a83a", desc: "Phone/video with funder" },
  { id: "email",    label: "EMAIL",        icon: "rocket",   bg: "#b8f0ff", color: "#0066cc", shadow: "#0066cc", desc: "Email correspondence" },
  { id: "meeting",  label: "MEETING",      icon: "building", bg: "#fff3a0", color: "#ffb800", shadow: "#ffb800", desc: "In-person or virtual" },
  { id: "followup", label: "FOLLOW-UP",    icon: "clock",    bg: "#ffe0e8", color: "#ff1e78", shadow: "#ff1e78", desc: "Action item or reminder" },
];

const AUTHORS = [
  { id: "Kika Keith (CEO)",   short: "KIKA K",  bg: "#ffe0e8", color: "#ff1e78" },
  { id: "Kika Howze (Impl.)", short: "KIKA H",  bg: "#e8d4ff", color: "#7c3aed" },
  { id: "Sheila (Ops)",       short: "SHEILA",  bg: "#fff3a0", color: "#ffb800" },
  { id: "Agent Auto-Log",     short: "AGENT",   bg: "#b8ffda", color: "#00a83a" },
];

const QUICK_LOGS: Array<{ label: string; type: NoteType }> = [
  { label: "Called – no answer",      type: "call"     },
  { label: "Left voicemail",           type: "call"     },
  { label: "Email sent",               type: "email"    },
  { label: "Email received",           type: "email"    },
  { label: "Meeting scheduled",        type: "meeting"  },
  { label: "Docs submitted",           type: "followup" },
  { label: "Awaiting response",        type: "followup" },
  { label: "Acknowledgment received",  type: "email"    },
  { label: "Application viewed",       type: "call"     },
  { label: "Decision expected soon",   type: "followup" },
];

const SEP = "────────────────────────────────";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseEntries(raw: string): LogEntry[] {
  if (!raw?.trim()) return [];
  const blocks = raw.split(/────+/);
  return blocks
    .map(b => b.trim())
    .filter(Boolean)
    .map(block => {
      // New format: [ts] Author · TYPE LABEL:\nmessage
      const newFmt = block.match(/^\[([^\]]+)\]\s+(.+?)\s+·\s+([A-Z -]+):\s*\n([\s\S]*)$/);
      if (newFmt) {
        const rawType = newFmt[3].trim().toLowerCase().replace(/[- ]/g, "");
        const typeMap: Record<string, NoteType> = {
          teamnote: "internal", internal: "internal",
          grantorcall: "call", call: "call",
          email: "email",
          meeting: "meeting",
          followup: "followup", "follow-up": "followup",
        };
        return {
          timestamp: newFmt[1].trim(),
          author:    newFmt[2].trim(),
          type:      typeMap[rawType] ?? "internal",
          message:   newFmt[4].trim(),
        };
      }
      // Legacy format: [ts] Author:\nmessage
      const oldFmt = block.match(/^\[([^\]]+)\]\s+(.+?):\s*\n([\s\S]*)$/);
      if (oldFmt) {
        return {
          timestamp: oldFmt[1].trim(),
          author:    oldFmt[2].trim(),
          type:      "internal" as NoteType,
          message:   oldFmt[3].trim(),
        };
      }
      return { timestamp: "", author: "System", type: "internal" as NoteType, message: block.trim() };
    })
    .filter(e => e.message);
}

function getTypeCfg(type: NoteType) {
  return NOTE_TYPES.find(t => t.id === type) ?? NOTE_TYPES[0];
}

function getAuthorCfg(author: string) {
  return (
    AUTHORS.find(a => author.toLowerCase().includes(a.id.split(" ")[0].toLowerCase()))
    ?? AUTHORS[3]
  );
}

function getInitials(author: string) {
  return author.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function now() {
  return new Date().toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CommsLogProps {
  opportunityId: string;
  initialNotes: string;
}

export default function CommsLog({ opportunityId, initialNotes }: CommsLogProps) {
  const router = useRouter();
  const { user } = useUser();

  // rawNotes drives everything — updating it instantly reflects in the parsed feed
  const [rawNotes, setRawNotes] = useState(initialNotes);
  const entries = useMemo(() => parseEntries(rawNotes), [rawNotes]);

  // Sync when server-side data refreshes (e.g. another team member posted)
  useEffect(() => { setRawNotes(initialNotes); }, [initialNotes]);

  const [noteType,   setNoteType]   = useState<NoteType>("internal");
  // Author: use logged-in user, fall back to first team member
  const [author, setAuthor] = useState(user?.id ?? AUTHORS[0].id);

  // Sync author when user context loads or changes
  useEffect(() => {
    if (user?.id) setAuthor(user.id);
  }, [user?.id]);
  const [text,       setText]       = useState("");
  const [saving,     setSaving]     = useState(false);
  const [lastSaved,  setLastSaved]  = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [expanded,   setExpanded]   = useState(true);

  async function submit(message: string) {
    const msg = message.trim();
    if (!msg || saving) return;
    setSaving(true);
    setErrorMsg("");

    const typeCfg  = getTypeCfg(noteType);
    const ts       = now();
    const logLine  = `[${ts}] ${author} · ${typeCfg.label}:\n${msg}`;
    const updated  = rawNotes ? `${logLine}\n${SEP}\n${rawNotes}` : logLine;

    // Optimistic: update raw string immediately so parsed feed updates
    setRawNotes(updated);
    setText("");

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fields: { Notes: updated } }),
      });
      if (res.ok) {
        setLastSaved(true);
        setTimeout(() => setLastSaved(false), 3000);
        router.refresh(); // Re-sync server state in background
      } else {
        setRawNotes(rawNotes); // Revert on failure
        setErrorMsg("Save failed — tap to retry");
      }
    } catch {
      setRawNotes(rawNotes);
      setErrorMsg("Network error — tap to retry");
    } finally {
      setSaving(false);
    }
  }

  const activeCfg = getTypeCfg(noteType);

  return (
    <div className="space-y-3">

      {/* ═══ FORM CARD ═════════════════════════════════════════════ */}
      <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
        style={{ background: "#fffbf0", boxShadow: `4px 4px 0 ${activeCfg.shadow}` }}>

        {/* Header — tap to collapse on mobile */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2.5 px-4 py-3 border-b-[2px] border-[#0a0a1a] transition-colors active:opacity-80"
          style={{ background: activeCfg.bg }}
        >
          <PixelIcon name={activeCfg.icon as any} size={14} color={activeCfg.color} />
          <span className="flex-1 text-left text-[10px] font-black uppercase tracking-widest"
            style={{ fontFamily: "Orbitron, sans-serif", color: activeCfg.color }}>
            LOG COMMUNICATION
          </span>
          <span className="text-[9px] text-[#0a0a1a] opacity-50">
            {activeCfg.desc}
          </span>
          <PixelIcon
            name={expanded ? "arrow_right" : "arrow_right"}
            size={10} color={activeCfg.color}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>

        {expanded && (
          <div className="p-4 space-y-3">

            {/* ── Note type strip ─────────────────────────────── */}
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <div className="flex gap-1.5 w-max">
                {NOTE_TYPES.map(t => (
                  <button key={t.id} type="button"
                    onClick={() => setNoteType(t.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2px] border-[#0a0a1a] whitespace-nowrap transition-all active:translate-y-[1px]"
                    style={{
                      fontFamily: "Orbitron, sans-serif", fontSize: 8, fontWeight: 900,
                      background:  noteType === t.id ? t.bg : "#ffffff",
                      color:       noteType === t.id ? t.color : "#aaaacc",
                      boxShadow:   noteType === t.id ? `2px 2px 0 ${t.shadow}` : "1px 1px 0 #e0e0ee",
                    }}
                  >
                    <PixelIcon name={t.icon as any} size={10}
                      color={noteType === t.id ? t.color : "#aaaacc"} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Author selector ──────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[8px] font-black text-[#aaaacc]"
                style={{ fontFamily: "Orbitron, sans-serif" }}>LOGGING AS:</span>
              {AUTHORS.map(a => {
                const isSelected = author === a.id;
                return (
                  <button key={a.id} type="button" onClick={() => setAuthor(a.id)}
                    className="text-[8px] font-black px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a] transition-all active:translate-y-[1px]"
                    style={{
                      fontFamily: "Orbitron, sans-serif",
                      background: isSelected ? a.bg   : "#ffffff",
                      color:      isSelected ? a.color : "#aaaacc",
                      boxShadow:  isSelected ? `2px 2px 0 ${a.color}` : "1px 1px 0 #e0e0ee",
                    }}>
                    {a.short}
                    {isSelected && user?.id === a.id && (
                      <span className="ml-1 opacity-60">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Free-text area ───────────────────────────────── */}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={
                noteType === "call"     ? "What did you discuss? Any decisions made?" :
                noteType === "email"    ? "Subject / summary of email thread…"        :
                noteType === "meeting"  ? "Who was there? What was decided?"           :
                noteType === "followup" ? "What needs to happen and by when?"          :
                "Internal update, decision, or context for the team…"
              }
              rows={3}
              className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3 text-sm resize-none focus:outline-none placeholder-[#aaaacc]"
              style={{
                background: "#ffffff", color: "#0a0a1a",
                boxShadow: `3px 3px 0 ${activeCfg.shadow}`,
                fontFamily: "Inter, sans-serif",
              }}
            />

            {/* ── Quick-log chips ──────────────────────────────── */}
            <div>
              <p className="text-[8px] font-black text-[#aaaacc] uppercase tracking-widest mb-1.5"
                style={{ fontFamily: "Orbitron, sans-serif" }}>QUICK LOG:</p>
              <div className="flex gap-2 flex-wrap">
                {QUICK_LOGS.map((q, i) => {
                  const qCfg = getTypeCfg(q.type);
                  return (
                    <button key={i} type="button"
                      onClick={() => {
                        setNoteType(q.type);
                        submit(q.label);
                      }}
                      className="text-[8px] font-semibold px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a] transition-all active:translate-y-[1px] hover:opacity-90"
                      style={{
                        fontFamily: "Orbitron, sans-serif",
                        background: qCfg.bg, color: qCfg.color,
                        boxShadow:  `1px 1px 0 ${qCfg.shadow}`,
                      }}>
                      {q.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Submit row ───────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => submit(text)}
                disabled={saving || !text.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-[2.5px] border-[#0a0a1a] text-[10px] font-black uppercase tracking-wider text-[#0a0a1a] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: "Orbitron, sans-serif", background: "#b8ffda", boxShadow: "3px 3px 0 #0a0a1a" }}>
                <PixelIcon name="quill" size={12} color="#00a83a" />
                {saving ? "LOGGING…" : `LOG ${activeCfg.label}`}
              </button>

              {lastSaved && (
                <div className="flex items-center gap-1.5">
                  <PixelIcon name="check" size={12} color="#00a83a" />
                  <span className="text-[9px] font-black text-[#00a83a]"
                    style={{ fontFamily: "Orbitron, sans-serif" }}>SAVED!</span>
                </div>
              )}

              {errorMsg && (
                <p className="text-[9px] text-[#ff1e78] font-bold"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>{errorMsg}</p>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ═══ FEED ══════════════════════════════════════════════════ */}

      {/* Entry count header */}
      {entries.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <PixelIcon name="pipeline" size={11} color="#aaaacc" />
          <span className="text-[9px] font-black text-[#aaaacc] uppercase tracking-widest"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            {entries.length} COMM{entries.length !== 1 ? "S" : ""} LOGGED
          </span>
          <div className="flex-1 h-[2px]" style={{ background: "#0a0a1a", opacity: 0.08 }} />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border-[2.5px] border-dashed border-[#0a0a1a] p-8 flex flex-col items-center gap-3"
          style={{ background: "rgba(255,255,255,0.4)" }}>
          <PixelIcon name="quill" size={28} color="#d0d0e0" />
          <p className="text-[10px] font-black text-[#aaaacc] uppercase tracking-widest"
            style={{ fontFamily: "Orbitron, sans-serif" }}>NO COMMS LOGGED YET</p>
          <p className="text-xs text-[#ccccdd] text-center max-w-[200px]">
            Use the form above to log calls, emails, meetings, and team notes
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const typeCfg   = getTypeCfg(entry.type);
            const authorCfg = getAuthorCfg(entry.author);
            const isExternal = entry.type !== "internal";

            return (
              <div key={idx}
                className={`rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden ${entry.pending ? "opacity-60" : ""}`}
                style={{ boxShadow: `3px 3px 0 ${typeCfg.shadow}` }}
              >
                {/* Type header stripe */}
                <div className="flex items-center gap-2 px-3 py-2 border-b-[2px] border-[#0a0a1a]"
                  style={{ background: typeCfg.bg }}>
                  <PixelIcon name={typeCfg.icon as any} size={10} color={typeCfg.color} />
                  <span className="text-[8px] font-black uppercase tracking-wider"
                    style={{ fontFamily: "Orbitron, sans-serif", color: typeCfg.color }}>
                    {typeCfg.label}
                  </span>
                  {isExternal && (
                    <span className="text-[7px] px-1.5 py-0.5 rounded-md border border-[#0a0a1a] font-black"
                      style={{ fontFamily: "Orbitron, sans-serif",
                        background: "#ffffff", color: typeCfg.color }}>
                      EXTERNAL
                    </span>
                  )}
                  {entry.pending && (
                    <span className="text-[8px] text-[#aaaacc] italic"
                      style={{ fontFamily: "Orbitron, sans-serif" }}>saving…</span>
                  )}
                  {entry.timestamp && (
                    <span className="ml-auto text-[8px] text-[#0a0a1a] opacity-50 flex items-center gap-1">
                      <PixelIcon name="clock" size={8} color="#aaaacc" />
                      {entry.timestamp}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="px-4 py-3 flex items-start gap-3"
                  style={{ background: isExternal ? "#fefff8" : "#fffbf0" }}>

                  {/* Author avatar */}
                  <div className="w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
                    style={{ background: authorCfg.bg, boxShadow: `2px 2px 0 ${authorCfg.color}` }}>
                    <span className="text-[9px] font-black"
                      style={{ fontFamily: "Orbitron, sans-serif", color: authorCfg.color }}>
                      {getInitials(entry.author)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-[#0a0a1a] mb-1"
                      style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {entry.author}
                    </p>
                    <p className="text-sm text-[#0a0a1a] leading-relaxed whitespace-pre-wrap">
                      {entry.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
