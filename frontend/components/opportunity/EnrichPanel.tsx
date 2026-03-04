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

interface FieldRowProps {
  icon:         "search" | "check" | "star" | "building";
  label:        string;
  fieldName:    string;
  value:        string | undefined;
  placeholder:  string;
  opportunityId: string;
  isEditing:    boolean;
  onChange:     (v: string) => void;
  onSave:       (field: string, v: string) => void;
}

function EditableField({ icon, label, fieldName, value, placeholder, opportunityId, isEditing, onChange, onSave }: FieldRowProps) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function save(v: string) {
    setSaving(true);
    await fetch(`/api/opportunities/${opportunityId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ fields: { [fieldName]: v } }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSave(fieldName, v);
  }

  return (
    <div className="border-b-[2px] border-dashed border-[#0a0a1a]/10 last:border-0 py-3">
      <div className="flex items-center gap-2 mb-2">
        <PixelIcon name={icon} size={10} color="#aaaacc" />
        <span className="text-[9px] font-black uppercase tracking-widest text-[#aaaacc]"
          style={{ fontFamily: "Orbitron, sans-serif" }}>{label}</span>
        {saving && <span className="text-[9px] text-[#ffb800] font-bold ml-auto" style={{ fontFamily: "Orbitron, sans-serif" }}>SAVING…</span>}
        {saved  && <span className="text-[9px] text-[#00a83a] font-bold ml-auto" style={{ fontFamily: "Orbitron, sans-serif" }}>✓ SAVED</span>}
      </div>
      {isEditing ? (
        <textarea
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          onBlur={e  => save(e.target.value)}
          rows={3}
          className="w-full rounded-xl border-[2px] border-[#0a0a1a] px-3 py-2 text-sm focus:outline-none resize-none"
          style={{ background: "#fffff8", boxShadow: "2px 2px 0 #0a0a1a" }}
          placeholder={placeholder}
        />
      ) : (
        value
          ? <p className="text-sm text-[#0a0a1a] leading-relaxed whitespace-pre-wrap">{value}</p>
          : <p className="text-sm text-[#aaaacc] italic">{placeholder}</p>
      )}
    </div>
  );
}

interface Props {
  opportunityId:        string;
  initialDescription?:  string;
  initialEligibility?:  string;
  initialWhyQualify?:   string;
  initialFunder?:       string;
}

export default function EnrichPanel({
  opportunityId,
  initialDescription,
  initialEligibility,
  initialWhyQualify,
  initialFunder,
}: Props) {
  const [description,  setDescription]  = useState(initialDescription  ?? "");
  const [eligibility,  setEligibility]  = useState(initialEligibility  ?? "");
  const [whyQualify,   setWhyQualify]   = useState(initialWhyQualify   ?? "");
  const [isEditing,    setIsEditing]    = useState(false);
  const [aiState,      setAiState]      = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiError,      setAiError]      = useState("");

  async function runAgent() {
    if (aiState === "loading") return;
    setAiState("loading");
    setAiError("");
    try {
      const res  = await fetch(`/api/opportunities/${opportunityId}/enrich`, { method: "POST" });
      const data = await res.json() as EnrichedData;
      if (data.error) { setAiError(data.error); setAiState("error"); return; }
      if (data.description)      setDescription(data.description);
      if (data.eligibilityNotes) setEligibility(data.eligibilityNotes);
      if (data.whyWeQualify)     setWhyQualify(data.whyWeQualify);
      setAiState("done");
      setIsEditing(true);  // drop into edit mode so team can review/refine
      setTimeout(() => setAiState("idle"), 3000);
    } catch {
      setAiState("error");
      setAiError("Network error — try again");
      setTimeout(() => setAiState("idle"), 3000);
    }
  }

  const allEmpty = !description && !eligibility && !whyQualify;

  return (
    <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
      style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #7c3aed" }}>

      {/* Header row */}
      <div className="px-4 py-3 border-b-[2px] border-[#0a0a1a] flex items-center gap-2"
        style={{ background: "#e8d4ff" }}>
        <PixelIcon name="search" size={13} color="#7c3aed" />
        <span className="text-[11px] font-black uppercase tracking-widest text-[#7c3aed] flex-1"
          style={{ fontFamily: "Orbitron, sans-serif" }}>GRANT INTEL</span>

        {/* Edit toggle */}
        <button
          onClick={() => setIsEditing(e => !e)}
          className="text-[9px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a] transition-all"
          style={{
            fontFamily: "Orbitron, sans-serif",
            background: isEditing ? "#0a0a1a" : "#ffffff",
            color:      isEditing ? "#ffe100" : "#0a0a1a",
            boxShadow:  "1px 1px 0 #0a0a1a",
          }}
        >{isEditing ? "✓ DONE" : "✏ EDIT"}</button>

        {/* Agent fill button */}
        <button
          onClick={runAgent}
          disabled={aiState === "loading"}
          className="flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a] transition-all disabled:opacity-60"
          style={{
            fontFamily: "Orbitron, sans-serif",
            background: aiState === "done"    ? "#b8ffda"
                      : aiState === "error"   ? "#ffe0e8"
                      : aiState === "loading" ? "#fff5c0"
                      : "#ffffff",
            color:      aiState === "done"    ? "#00a83a"
                      : aiState === "error"   ? "#ff1e78"
                      : aiState === "loading" ? "#ffb800"
                      : "#7c3aed",
            boxShadow: "1px 1px 0 #0a0a1a",
          }}
        >
          <PixelIcon
            name={aiState === "done" ? "check" : aiState === "error" ? "alert" : "rocket"}
            size={9}
            color={aiState === "done" ? "#00a83a" : aiState === "error" ? "#ff1e78" : aiState === "loading" ? "#ffb800" : "#7c3aed"}
          />
          {aiState === "loading" ? "RESEARCHING…"
           : aiState === "done"  ? "✓ FILLED"
           : aiState === "error" ? "! ERROR"
           : allEmpty ? "AGENT FILL"
           : "REFRESH"}
        </button>
      </div>

      {/* Error */}
      {aiError && (
        <div className="px-4 py-2 bg-[#ffe0e8] border-b-[2px] border-[#0a0a1a]">
          <p className="text-xs text-[#ff1e78] font-bold">{aiError}</p>
        </div>
      )}

      {/* Empty state hint */}
      {allEmpty && aiState === "idle" && (
        <div className="px-4 py-4 flex items-center gap-3 border-b-[2px] border-dashed border-[#0a0a1a]/10">
          <PixelIcon name="rocket" size={16} color="#aaaacc" />
          <div>
            <p className="text-xs font-bold text-[#0a0a1a]">No intel yet — let the agent research this grant</p>
            <p className="text-xs text-[#aaaacc]">Hit AGENT FILL to auto-generate description, eligibility, and LDU qualification.</p>
          </div>
        </div>
      )}

      {/* Fields */}
      <div className="px-4">
        <EditableField
          icon="search" label="DESCRIPTION"
          fieldName="Description"
          value={description} placeholder="What does this grant fund? Who is the funder? What do they prioritize?"
          opportunityId={opportunityId}
          isEditing={isEditing}
          onChange={setDescription}
          onSave={(_, v) => setDescription(v)}
        />
        <EditableField
          icon="check" label="ELIGIBILITY REQUIREMENTS"
          fieldName="Eligibility Notes"
          value={eligibility} placeholder="• 501(c)(3) required\n• Geographic restrictions\n• Revenue thresholds…"
          opportunityId={opportunityId}
          isEditing={isEditing}
          onChange={setEligibility}
          onSave={(_, v) => setEligibility(v)}
        />
        <EditableField
          icon="star" label="WHY LDU QUALIFIES"
          fieldName="Why We Qualify"
          value={whyQualify} placeholder="Why does LDU specifically qualify — mission fit, demographics, programs, geography?"
          opportunityId={opportunityId}
          isEditing={isEditing}
          onChange={setWhyQualify}
          onSave={(_, v) => setWhyQualify(v)}
        />
      </div>
    </div>
  );
}
