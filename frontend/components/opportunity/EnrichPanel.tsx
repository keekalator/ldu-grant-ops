"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PixelIcon from "@/components/shared/PixelIcon";
import { getEntityProfile } from "@/lib/entityProfiles";

interface EntityScore {
  entity: string;
  score: number;
  eligible: boolean;
  rationale: string;
}

interface EnrichedData {
  description?:       string;
  eligibilityNotes?:  string;
  whyWeQualify?:      string;
  funderName?:        string;
  funderWebsite?:     string;
  verified?:          boolean;
  verificationNotes?: string;
  sourceFetched?:     boolean;
  // Entity analysis
  bestEntity?:        string;
  multiEntityAlert?:  boolean;
  entityScores?:      EntityScore[];
  error?:             string;
}

interface FieldRowProps {
  icon:          "search" | "check" | "star" | "building";
  label:         string;
  fieldName:     string;
  value:         string | undefined;
  placeholder:   string;
  opportunityId: string;
  isEditing:     boolean;
  onChange:      (v: string) => void;
  onSave:        (field: string, v: string) => void;
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

// ─── Score pip row for a single entity ────────────────────────────────────────

function EntityScoreRow({ es }: { es: EntityScore }) {
  const profile = getEntityProfile(es.entity);
  const barColor = es.score >= 4 ? "#00d94e" : es.score === 3 ? "#ffe100" : "#aaaacc";
  return (
    <div className="flex items-start gap-2 py-2 border-b-[2px] border-dashed border-[#0a0a1a]/10 last:border-0">
      {/* Entity chip */}
      <span
        className="shrink-0 text-[8px] font-black px-2 py-0.5 rounded-md border-[1.5px] border-[#0a0a1a]"
        style={{
          fontFamily: "Orbitron, sans-serif",
          background: profile?.chipBg ?? "#e8e8ee",
          color:      profile?.chipColor ?? "#0a0a1a",
          boxShadow:  "1px 1px 0 #0a0a1a",
          whiteSpace: "nowrap",
        }}
      >
        {es.entity}
      </span>
      {/* Score pips */}
      <div className="flex gap-0.5 pt-0.5 shrink-0">
        {[1,2,3,4,5].map(i => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-sm border-[1.5px] border-[#0a0a1a]"
            style={{ background: i <= es.score ? barColor : "#e8e8ee" }}
          />
        ))}
      </div>
      {/* Rationale */}
      <p className="text-[10px] text-[#0a0a1a]/70 leading-snug flex-1 min-w-0">{es.rationale}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  opportunityId:        string;
  initialDescription?:  string;
  initialEligibility?:  string;
  initialWhyQualify?:   string;
  initialFunder?:       string;
  initialEntity?:       string;
}

export default function EnrichPanel({
  opportunityId,
  initialDescription,
  initialEligibility,
  initialWhyQualify,
  initialFunder,
  initialEntity,
}: Props) {
  const router = useRouter();
  const [description,       setDescription]       = useState(initialDescription ?? "");
  const [eligibility,       setEligibility]        = useState(initialEligibility ?? "");
  const [whyQualify,        setWhyQualify]         = useState(initialWhyQualify  ?? "");
  const [isEditing,         setIsEditing]          = useState(false);
  const [aiState,           setAiState]            = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiError,           setAiError]            = useState("");
  const [verified,          setVerified]           = useState<boolean | null>(null);
  const [verificationNotes, setVerificationNotes]  = useState<string>("");
  const [sourceFetched,     setSourceFetched]      = useState<boolean>(false);
  // Entity analysis
  const [bestEntity,        setBestEntity]         = useState<string | null>(initialEntity ?? null);
  const [multiEntityAlert,  setMultiEntityAlert]   = useState<boolean>(false);
  const [entityScores,      setEntityScores]       = useState<EntityScore[]>([]);
  const [showScores,        setShowScores]         = useState<boolean>(false);
  const autoRan = useRef(false);

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
      if (data.verified          !== undefined) setVerified(data.verified);
      if (data.verificationNotes !== undefined) setVerificationNotes(data.verificationNotes);
      if (data.sourceFetched     !== undefined) setSourceFetched(data.sourceFetched);
      if (data.bestEntity)       setBestEntity(data.bestEntity);
      if (data.multiEntityAlert  !== undefined) setMultiEntityAlert(data.multiEntityAlert);
      if (data.entityScores)     setEntityScores(data.entityScores);
      if (data.multiEntityAlert) setShowScores(true);
      setAiState("done");
      setIsEditing(true);
      router.refresh();
      setTimeout(() => setAiState("idle"), 3000);
    } catch {
      setAiState("error");
      setAiError("Network error — try again");
      setTimeout(() => setAiState("idle"), 3000);
    }
  }

  const allEmpty = !description && !eligibility && !whyQualify;

  useEffect(() => {
    if (allEmpty && !autoRan.current) {
      autoRan.current = true;
      runAgent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Entity profile for the current best entity (for chip styling)
  const entityProfile = bestEntity ? getEntityProfile(bestEntity) : null;

  // Dynamic "why qualifies" label
  const whyLabel = bestEntity && bestEntity !== "LDU (501c3)"
    ? `WHY ${bestEntity.toUpperCase()} QUALIFIES`
    : "WHY WE QUALIFY";

  return (
    <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
      style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #7c3aed" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b-[2px] border-[#0a0a1a] flex items-center gap-2"
        style={{ background: "#e8d4ff" }}>
        <PixelIcon name="search" size={13} color="#7c3aed" />
        <span className="text-[11px] font-black uppercase tracking-widest text-[#7c3aed] flex-1"
          style={{ fontFamily: "Orbitron, sans-serif" }}>GRANT INTEL</span>

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
           : "REFRESH"}
        </button>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {aiError && (
        <div className="px-4 py-2 bg-[#ffe0e8] border-b-[2px] border-[#0a0a1a]">
          <p className="text-xs text-[#ff1e78] font-bold">{aiError}</p>
        </div>
      )}

      {/* ── Verification status banner ─────────────────────────────────── */}
      {verified === false && aiState !== "loading" && (
        <div className="px-4 py-3 flex items-start gap-3 border-b-[2px] border-[#ff1e78]"
          style={{ background: "#ffe0e8" }}>
          <div className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "#ff1e78", boxShadow: "1px 1px 0 #0a0a1a" }}>
            <PixelIcon name="alert" size={13} color="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-[#ff1e78] uppercase tracking-widest mb-1"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              GRANT NOT VERIFIED — DO NOT START WRITING
            </p>
            <p className="text-xs text-[#cc0033] leading-snug">{verificationNotes}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent((initialFunder ?? "") + " grant application")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[8px] font-black px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a] flex items-center gap-1"
                style={{ fontFamily: "Orbitron, sans-serif", background: "#ffffff", color: "#0066cc", boxShadow: "1px 1px 0 #0a0a1a" }}
              >
                <PixelIcon name="search" size={8} color="#0066cc" />
                SEARCH GOOGLE
              </a>
              <span className="text-[8px] font-bold text-[#cc0033] flex items-center gap-1"
                style={{ fontFamily: "Orbitron, sans-serif" }}>
                <PixelIcon name="alert" size={8} color="#cc0033" />
                If grant is fake → use DISQUALIFY below
              </span>
            </div>
          </div>
        </div>
      )}

      {verified === true && sourceFetched && aiState !== "loading" && (
        <div className="px-4 py-2 flex items-center gap-2 border-b-[2px] border-dashed border-[#00a83a]/30"
          style={{ background: "#f0fff8" }}>
          <PixelIcon name="check" size={10} color="#00a83a" />
          <p className="text-[9px] font-bold text-[#00a83a]" style={{ fontFamily: "Orbitron, sans-serif" }}>
            VERIFIED — {verificationNotes || "Found on funder's website"}
          </p>
          <span className="text-[8px] text-[#00a83a]/60 ml-auto" style={{ fontFamily: "Orbitron, sans-serif" }}>
            LIVE PAGE READ
          </span>
        </div>
      )}

      {/* ── Auto-research loading banner ───────────────────────────────── */}
      {aiState === "loading" && (
        <div className="px-4 py-3 flex items-center gap-3 border-b-[2px] border-dashed border-[#0a0a1a]/10"
          style={{ background: "#fffde8" }}>
          <div className="w-6 h-6 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0 animate-spin"
            style={{ background: "#ffe100", boxShadow: "1px 1px 0 #0a0a1a" }}>
            <PixelIcon name="search" size={10} color="#0a0a1a" />
          </div>
          <div>
            <p className="text-xs font-black text-[#0a0a1a]" style={{ fontFamily: "Orbitron, sans-serif" }}>
              AGENT RESEARCHING…
            </p>
            <p className="text-xs text-[#aaaacc]">Analyzing grant + evaluating best-fit entity for your team.</p>
          </div>
        </div>
      )}

      {/* ── MULTI-ENTITY ALERT ─────────────────────────────────────────── */}
      {multiEntityAlert && aiState !== "loading" && (
        <div className="px-4 py-3 border-b-[2px] border-[#7c3aed]"
          style={{ background: "#ede9fe" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
              style={{ background: "#7c3aed", boxShadow: "1px 1px 0 #0a0a1a" }}>
              <PixelIcon name="bell" size={11} color="white" />
            </div>
            <p className="text-[10px] font-black text-[#7c3aed] uppercase tracking-widest"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              MULTI-ENTITY ALERT — MULTIPLE STRONG CANDIDATES
            </p>
          </div>
          <p className="text-xs text-[#4c1d95] leading-snug mb-2">
            Two or more entities in your org can competitively apply for this grant.
            Review the scores below and confirm which entity should submit before writing begins.
          </p>
          <button
            onClick={() => setShowScores(s => !s)}
            className="text-[8px] font-black px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a]"
            style={{
              fontFamily: "Orbitron, sans-serif",
              background: "#ffffff",
              color: "#7c3aed",
              boxShadow: "1px 1px 0 #0a0a1a",
            }}
          >
            {showScores ? "HIDE SCORES" : "VIEW ENTITY SCORES"}
          </button>
        </div>
      )}

      {/* ── ENTITY SCORES ─────────────────────────────────────────────── */}
      {(showScores || (!multiEntityAlert && entityScores.length > 0 && aiState !== "loading")) && entityScores.length > 0 && (
        <div className="px-4 py-3 border-b-[2px] border-dashed border-[#0a0a1a]/20"
          style={{ background: "#f8f4ff" }}>
          <div className="flex items-center gap-2 mb-3">
            <PixelIcon name="trophy" size={10} color="#7c3aed" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#7c3aed]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>ENTITY WIN PROBABILITY</span>
          </div>
          <div>
            {entityScores
              .slice()
              .sort((a, b) => b.score - a.score)
              .map(es => <EntityScoreRow key={es.entity} es={es} />)
            }
          </div>
          <p className="text-[8px] text-[#aaaacc] mt-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
            Scores auto-generated by AI — review and confirm entity in Record Details below.
          </p>
        </div>
      )}

      {/* ── RECOMMENDED ENTITY chip ───────────────────────────────────── */}
      {bestEntity && aiState !== "loading" && (
        <div className="px-4 py-2.5 flex items-center gap-3 border-b-[2px] border-dashed border-[#0a0a1a]/10"
          style={{ background: "#fafaf8" }}>
          <PixelIcon name="target" size={10} color="#aaaacc" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#aaaacc]"
            style={{ fontFamily: "Orbitron, sans-serif" }}>BEST FIT ENTITY</span>
          <span
            className="text-[9px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a]"
            style={{
              fontFamily: "Orbitron, sans-serif",
              background: entityProfile?.chipBg ?? "#e8e8ee",
              color:      entityProfile?.chipColor ?? "#0a0a1a",
              boxShadow:  "2px 2px 0 #0a0a1a",
            }}
          >
            {bestEntity}
          </span>
          <span className="text-[8px] text-[#aaaacc] ml-auto" style={{ fontFamily: "Orbitron, sans-serif" }}>
            AI SELECTED · CONFIRM IN RECORD DETAILS
          </span>
        </div>
      )}

      {/* ── Fields ────────────────────────────────────────────────────── */}
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
          icon="star" label={whyLabel}
          fieldName="Why We Qualify"
          value={whyQualify} placeholder="Why does the submitting entity specifically qualify — mission fit, demographics, programs, geography?"
          opportunityId={opportunityId}
          isEditing={isEditing}
          onChange={setWhyQualify}
          onSave={(_, v) => setWhyQualify(v)}
        />
      </div>
    </div>
  );
}
