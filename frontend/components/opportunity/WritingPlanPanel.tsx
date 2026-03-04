"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  rawPlan?: string | null;
  grantName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildNextSteps(plan: WritingPlan): string {
  const lines: string[] = [];
  if (plan.angle) { lines.push(`STRATEGY: ${plan.angle}`, ""); }
  if (plan.sections?.length) {
    lines.push("SECTIONS TO WRITE:");
    plan.sections.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    lines.push("");
  }
  if (plan.materials?.length) {
    lines.push("MATERIALS TO PREPARE:");
    plan.materials.forEach(m => lines.push(`  • ${m}`));
    lines.push("");
  }
  if (plan.winTips?.length) {
    lines.push("WIN TIPS:");
    plan.winTips.forEach(t => lines.push(`  ★ ${t}`));
  }
  return lines.join("\n").trim();
}

// ─── Auto-growing textarea ────────────────────────────────────────────────────

function AutoTextarea({
  value, onChange, placeholder, className, style, minRows = 2,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; className?: string;
  style?: React.CSSProperties; minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={{ resize: "none", overflow: "hidden", ...style }}
    />
  );
}

// ─── Editable list section ────────────────────────────────────────────────────

function EditableList({
  items, onUpdate, accent, bg, shadow, icon, label,
  addLabel, placeholder, isEditing,
}: {
  items: string[];
  onUpdate: (items: string[]) => void;
  accent: string; bg: string; shadow: string;
  icon: string; label: string; addLabel: string;
  placeholder: string; isEditing: boolean;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function update(i: number, val: string) {
    const next = [...items];
    next[i] = val;
    onUpdate(next);
  }
  function remove(i: number) {
    onUpdate(items.filter((_, idx) => idx !== i));
    setEditingIdx(null);
  }
  function add() {
    onUpdate([...items, ""]);
    setEditingIdx(items.length);
  }

  if (!items.length && !isEditing) return null;

  return (
    <div className="rounded-xl border-[2px] border-[#0a0a1a] overflow-hidden"
      style={{ boxShadow: `3px 3px 0 ${shadow}` }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b-[2px] border-[#0a0a1a]"
        style={{ background: bg }}>
        <div className="w-5 h-5 rounded-md border-[1.5px] border-[#0a0a1a] flex items-center justify-center shrink-0"
          style={{ background: "#ffffff" }}>
          <PixelIcon name={icon as any} size={11} color={accent} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest flex-1"
          style={{ fontFamily: "Orbitron, sans-serif", color: accent }}>
          {label}
        </span>
        {isEditing && (
          <span className="text-[8px] font-bold opacity-50"
            style={{ fontFamily: "Orbitron, sans-serif", color: accent }}>
            TAP TO EDIT
          </span>
        )}
      </div>

      {/* Items */}
      <div className="bg-[#fffbf0] divide-y-[1.5px] divide-dashed divide-[#0a0a1a]/10">
        {items.map((item, i) => {
          const isItemEditing = isEditing && editingIdx === i;
          const [title, ...rest] = item.split(":");
          const hasTitle = rest.length > 0;
          return (
            <div key={i}
              className="flex items-start gap-2.5 px-3 py-2.5"
              onClick={() => isEditing && setEditingIdx(i)}
            >
              <span className="text-[9px] font-black mt-0.5 shrink-0"
                style={{ fontFamily: "Orbitron, sans-serif", color: accent }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                {isItemEditing ? (
                  <AutoTextarea
                    value={item}
                    onChange={v => update(i, v)}
                    placeholder={placeholder}
                    minRows={2}
                    className="w-full text-[10px] text-[#0a0a1a] bg-white rounded-lg border-[2px] border-[#0a0a1a] px-2 py-1.5 focus:outline-none"
                    style={{ fontFamily: "Inter, sans-serif", boxShadow: `2px 2px 0 ${accent}` }}
                  />
                ) : (
                  <div className={isEditing ? "cursor-pointer" : ""}>
                    {hasTitle ? (
                      <>
                        <span className="text-[10px] font-black text-[#0a0a1a]">{title.trim()}: </span>
                        <span className="text-[10px] text-[#333344]">{rest.join(":").trim()}</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#333344]">{item || <span className="opacity-40 italic">empty — tap to fill in</span>}</span>
                    )}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={e => { e.stopPropagation(); remove(i); }}
                  className="shrink-0 w-5 h-5 rounded-md border-[1.5px] border-[#0a0a1a] flex items-center justify-center mt-0.5 transition-all active:scale-90"
                  style={{ background: "#ffe0e8" }}
                  title="Remove"
                >
                  <span className="text-[10px] font-black text-[#ff1e78] leading-none">×</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add button */}
      {isEditing && (
        <button
          onClick={add}
          className="w-full py-2 px-3 flex items-center justify-center gap-1.5 border-t-[2px] border-dashed border-[#0a0a1a] transition-all active:opacity-70"
          style={{ background: bg }}
        >
          <span className="text-[9px] font-black" style={{ fontFamily: "Orbitron, sans-serif", color: accent }}>
            + {addLabel}
          </span>
        </button>
      )}
    </div>
  );
}

// ─── Editable themes ──────────────────────────────────────────────────────────

function EditableThemes({
  themes, onUpdate, isEditing,
}: {
  themes: string[]; onUpdate: (t: string[]) => void; isEditing: boolean;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const COLORS = ["#b8ffda","#b8e0ff","#e8d4ff","#fff3a0","#ffd0a0"];

  if (!themes.length && !isEditing) return null;

  return (
    <div className="rounded-xl border-[2px] border-[#0a0a1a] overflow-hidden"
      style={{ boxShadow: "3px 3px 0 #00a83a" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b-[2px] border-[#0a0a1a]"
        style={{ background: "#b8ffda" }}>
        <div className="w-5 h-5 rounded-md border-[1.5px] border-[#0a0a1a] flex items-center justify-center shrink-0"
          style={{ background: "#ffffff" }}>
          <PixelIcon name="star" size={11} color="#00a83a" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest flex-1"
          style={{ fontFamily: "Orbitron, sans-serif", color: "#00a83a" }}>
          KEY THEMES
        </span>
        {isEditing && (
          <span className="text-[8px] font-bold opacity-50"
            style={{ fontFamily: "Orbitron, sans-serif", color: "#00a83a" }}>
            TAP TO EDIT
          </span>
        )}
      </div>
      <div className="bg-[#fffbf0] p-3 flex flex-wrap gap-2">
        {themes.map((theme, i) => (
          editingIdx === i && isEditing ? (
            <input
              key={i}
              autoFocus
              value={theme}
              onChange={e => {
                const next = [...themes]; next[i] = e.target.value; onUpdate(next);
              }}
              onBlur={() => setEditingIdx(null)}
              className="text-[9px] font-bold px-2 py-1 rounded-lg border-[2px] border-[#0a0a1a] focus:outline-none"
              style={{ background: COLORS[i % 5], minWidth: 60, maxWidth: 160 }}
            />
          ) : (
            <div key={i} className="flex items-center gap-1">
              <span
                onClick={() => isEditing && setEditingIdx(i)}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a] text-[#0a0a1a] ${isEditing ? "cursor-pointer" : ""}`}
                style={{ background: COLORS[i % 5] }}
              >
                {theme}
              </span>
              {isEditing && (
                <button
                  onClick={() => onUpdate(themes.filter((_, idx) => idx !== i))}
                  className="w-4 h-4 rounded-full border border-[#0a0a1a] flex items-center justify-center"
                  style={{ background: "#ffe0e8" }}
                >
                  <span className="text-[9px] font-black text-[#ff1e78] leading-none">×</span>
                </button>
              )}
            </div>
          )
        ))}
        {isEditing && (
          <button
            onClick={() => { onUpdate([...themes, "New theme"]); setEditingIdx(themes.length); }}
            className="text-[9px] font-bold px-2.5 py-1 rounded-lg border-[1.5px] border-dashed border-[#00a83a] text-[#00a83a]"
            style={{ background: "transparent" }}
          >
            + ADD
          </button>
        )}
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
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Save to Airtable ────────────────────────────────────────────────────────

  const savePlan = useCallback(async (updated: WritingPlan) => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            "Writing Plan": JSON.stringify(updated),
            "Next Steps": buildNextSteps(updated),
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }, [opportunityId]);

  // Debounced save — fires 800ms after last change
  const debouncedSave = useCallback((updated: WritingPlan) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => savePlan(updated), 800);
  }, [savePlan]);

  function updatePlan(patch: Partial<WritingPlan>) {
    if (!plan) return;
    const updated = { ...plan, ...patch };
    setPlan(updated);
    debouncedSave(updated);
  }

  // ── Generate plan ───────────────────────────────────────────────────────────

  async function generatePlan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/writing-plan`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }
      const { plan: newPlan } = await res.json();
      setPlan(newPlan as WritingPlan);
      setSaveState("idle");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ── Save state label ────────────────────────────────────────────────────────

  const saveLabel =
    saveState === "saving" ? "SAVING…" :
    saveState === "saved"  ? "✓ SAVED" :
    saveState === "error"  ? "! ERROR" : null;

  const saveLabelColor =
    saveState === "saving" ? "#aaaacc" :
    saveState === "saved"  ? "#00a83a" : "#ff1e78";

  // ── Empty state ─────────────────────────────────────────────────────────────

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
            style={{ fontFamily: "Orbitron, sans-serif" }}>NO PLAN YET</p>
          <p className="text-[10px] text-[#555566] mb-4 max-w-xs mx-auto">
            Claude will analyze this grant and build a custom writing plan — narrative angle, sections to write, materials checklist, and win tips.
          </p>
          {error && <p className="text-[10px] text-[#ff1e78] mb-3 font-bold">{error}</p>}
          <button
            onClick={generatePlan}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-[2.5px] border-[#0a0a1a] font-black text-sm text-white transition-all active:translate-y-[2px] active:shadow-none"
            style={{ fontFamily: "Orbitron, sans-serif", background: "#ff6b00", boxShadow: "4px 4px 0 #0a0a1a" }}
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

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
        style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #ff6b00" }}>
        <div className="p-6 text-center">
          <div className="flex justify-center gap-1.5 mb-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-3 h-3 rounded-sm border-[1.5px] border-[#0a0a1a] animate-bounce"
                style={{ background: ["#ff6b00","#ffb800","#7c3aed","#00a83a"][i], animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <p className="text-[11px] font-black text-[#0a0a1a]"
            style={{ fontFamily: "Orbitron, sans-serif" }}>CLAUDE IS ANALYZING…</p>
          <p className="text-[9px] text-[#555566] mt-1">Building your custom writing plan</p>
        </div>
      </div>
    );
  }

  // ── Plan display + edit ─────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
      style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #ff6b00" }}>

      {/* Header row */}
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

        <div className="flex items-center gap-2">
          {/* Save indicator */}
          {saveLabel && (
            <span className="text-[8px] font-black"
              style={{ fontFamily: "Orbitron, sans-serif", color: saveLabelColor }}>
              {saveLabel}
            </span>
          )}

          {/* Edit toggle */}
          <button
            onClick={() => setIsEditing(e => !e)}
            className="text-[8px] font-black px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a] transition-all active:translate-y-[1px] active:shadow-none"
            style={{
              fontFamily: "Orbitron, sans-serif",
              background: isEditing ? "#0a0a1a" : "#ffffff",
              color: isEditing ? "#ffe100" : "#7c3aed",
              boxShadow: isEditing ? "none" : "2px 2px 0 #7c3aed",
            }}
          >
            {isEditing ? "✓ DONE" : "✏ EDIT"}
          </button>

          {/* Regenerate */}
          <button
            onClick={generatePlan}
            className="text-[8px] font-black px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a] transition-all active:translate-y-[1px] active:shadow-none"
            style={{ fontFamily: "Orbitron, sans-serif", background: "#ffffff", color: "#ff6b00", boxShadow: "2px 2px 0 #ff6b00" }}
            title="Regenerate plan from Claude"
          >
            ↺ REDO
          </button>
        </div>
      </div>

      {/* Edit mode banner */}
      {isEditing && (
        <div className="px-4 py-2 border-b-[2px] border-dashed border-[#0a0a1a]"
          style={{ background: "#e8d4ff" }}>
          <p className="text-[9px] font-bold text-[#7c3aed] text-center"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            EDIT MODE — changes save automatically
          </p>
        </div>
      )}

      <div className="p-4 space-y-3">

        {/* ── Narrative Angle ── */}
        <div className="rounded-xl border-[2px] border-[#0a0a1a] p-3"
          style={{ background: "#e8d4ff", boxShadow: "3px 3px 0 #7c3aed" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[8px] font-black uppercase tracking-widest text-[#7c3aed]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              NARRATIVE ANGLE
            </p>
            {isEditing && (
              <span className="text-[7px] font-bold text-[#7c3aed] opacity-60"
                style={{ fontFamily: "Orbitron, sans-serif" }}>TAP TO EDIT</span>
            )}
          </div>
          {isEditing ? (
            <AutoTextarea
              value={plan!.angle}
              onChange={v => updatePlan({ angle: v })}
              placeholder="The strategic narrative angle for this grant…"
              minRows={3}
              className="w-full text-[11px] text-[#0a0a1a] bg-white rounded-lg border-[2px] border-[#7c3aed] px-2.5 py-2 focus:outline-none leading-relaxed"
              style={{ fontFamily: "Inter, sans-serif", boxShadow: "2px 2px 0 #7c3aed" }}
            />
          ) : (
            <p className="text-[11px] text-[#0a0a1a] leading-relaxed font-medium">
              {plan!.angle}
            </p>
          )}
        </div>

        {/* ── Estimated hours ── */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a]"
            style={{ background: "#b8f0ff", boxShadow: "2px 2px 0 #0066cc" }}
          >
            <PixelIcon name="clock" size={11} color="#0066cc" />
            {isEditing ? (
              <input
                type="number"
                min={1} max={99}
                value={plan!.estimatedHours}
                onChange={e => updatePlan({ estimatedHours: parseInt(e.target.value) || 0 })}
                className="w-10 text-[9px] font-black text-[#0066cc] bg-transparent focus:outline-none text-center"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              />
            ) : (
              <span className="text-[9px] font-black text-[#0066cc]"
                style={{ fontFamily: "Orbitron, sans-serif" }}>
                {plan!.estimatedHours}
              </span>
            )}
            <span className="text-[9px] font-black text-[#0066cc]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              H TO WRITE
            </span>
          </div>
        </div>

        {/* ── Sections ── */}
        <EditableList
          items={plan!.sections ?? []}
          onUpdate={sections => updatePlan({ sections })}
          accent="#7c3aed" bg="#e8d4ff" shadow="#7c3aed"
          icon="quill" label="SECTIONS TO WRITE"
          addLabel="ADD SECTION"
          placeholder="Section name: What to write here…"
          isEditing={isEditing}
        />

        {/* ── Themes ── */}
        <EditableThemes
          themes={plan!.themes ?? []}
          onUpdate={themes => updatePlan({ themes })}
          isEditing={isEditing}
        />

        {/* ── Materials ── */}
        <EditableList
          items={plan!.materials ?? []}
          onUpdate={materials => updatePlan({ materials })}
          accent="#0066cc" bg="#b8e0ff" shadow="#0066cc"
          icon="check" label="MATERIALS CHECKLIST"
          addLabel="ADD MATERIAL"
          placeholder="Item to prepare or gather…"
          isEditing={isEditing}
        />

        {/* ── Win Tips ── */}
        <EditableList
          items={plan!.winTips ?? []}
          onUpdate={winTips => updatePlan({ winTips })}
          accent="#ff1e78" bg="#ffe0f0" shadow="#ff1e78"
          icon="target" label="WIN TIPS"
          addLabel="ADD TIP"
          placeholder="Funder-specific tip to increase win probability…"
          isEditing={isEditing}
        />

      </div>
    </div>
  );
}
