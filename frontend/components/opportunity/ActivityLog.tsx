import PixelIcon from "@/components/shared/PixelIcon";

interface LogEntry { timestamp: string; author: string; message: string; }

function parseLogEntries(raw: string): LogEntry[] {
  if (!raw?.trim()) return [];
  const blocks = raw.split(/────+/);
  return blocks
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const headerMatch = block.match(/^\[([^\]]+)\]\s+(.+?):\s*\n([\s\S]*)$/);
      if (headerMatch) {
        return { timestamp: headerMatch[1].trim(), author: headerMatch[2].trim(), message: headerMatch[3].trim() };
      }
      return { timestamp: "", author: "System", message: block.trim() };
    })
    .filter(e => e.message);
}

const AUTHOR_CONFIG: Record<string, { grad: string; shadow: string }> = {
  "Kika Keith (CEO)":   { grad: "linear-gradient(135deg,#ff1e78,#ff6b35)", shadow: "rgba(255,30,120,0.3)" },
  "Kika Howze (Impl.)": { grad: "linear-gradient(135deg,#7c3aed,#00d4ff)", shadow: "rgba(124,58,237,0.3)" },
  "Sheila (Ops)":       { grad: "linear-gradient(135deg,#ffb800,#ffe100)", shadow: "rgba(255,184,0,0.3)" },
  "Agent Auto-Log":     { grad: "linear-gradient(135deg,#00a83a,#00d4ff)", shadow: "rgba(0,168,58,0.3)" },
  System:               { grad: "linear-gradient(135deg,#aaaacc,#ccccdd)", shadow: "rgba(170,170,204,0.3)" },
};

function getAuthorConfig(author: string) {
  for (const [key, cfg] of Object.entries(AUTHOR_CONFIG)) {
    if (author.toLowerCase().includes(key.split(" ")[0].toLowerCase())) return cfg;
  }
  return AUTHOR_CONFIG.System;
}

function getAuthorInitials(author: string) {
  return author.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function ActivityLog({ notes }: { notes: string }) {
  const entries = parseLogEntries(notes);

  if (!entries.length) {
    return (
      <div className="rounded-2xl border-[2.5px] border-dashed border-[#0a0a1a] p-8 flex flex-col items-center gap-3"
        style={{ background: "rgba(255,255,255,0.4)" }}>
        <PixelIcon name="quill" size={28} color="#d0d0e0" />
        <p className="text-[10px] font-black text-[#aaaacc] uppercase tracking-widest"
          style={{ fontFamily:"Orbitron,sans-serif" }}>No activity yet</p>
        <p className="text-xs text-[#ccccdd] text-center">Log a call, decision, or update above</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, idx) => {
        const cfg = getAuthorConfig(entry.author);
        return (
          <div key={idx}
            className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4 flex gap-3"
            style={{ background: "#fffbf0", boxShadow: `3px 3px 0 ${cfg.shadow}` }}>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
              style={{ background: cfg.grad, boxShadow: "2px 2px 0 #0a0a1a" }}>
              <span className="text-[9px] font-black text-white" style={{ fontFamily:"Orbitron,sans-serif" }}>
                {getAuthorInitials(entry.author)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-[10px] font-black text-[#0a0a1a]"
                  style={{ fontFamily:"Orbitron,sans-serif" }}>
                  {entry.author}
                </span>
                {entry.timestamp && (
                  <span className="flex items-center gap-1">
                    <PixelIcon name="clock" size={9} color="#aaaacc" />
                    <span className="text-[9px] text-[#aaaacc] font-medium">{entry.timestamp}</span>
                  </span>
                )}
              </div>

              {/* Message */}
              <p className="text-sm text-[#0a0a1a] leading-relaxed whitespace-pre-wrap">{entry.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
