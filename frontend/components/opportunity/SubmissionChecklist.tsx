"use client";

/**
 * SubmissionChecklist
 *
 * Displays every document required to submit this grant application.
 * Requirements are extracted by Claude when the writing plan is generated —
 * they are specific to each funder (LOI vs full app, required attachments,
 * page limits, portal URL, etc.).
 *
 * Users can upload files in-app. PDFs can be previewed before submission.
 * Check-off + file state persisted in Writing Plan JSON in Airtable.
 */

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import PixelIcon from "@/components/shared/PixelIcon";
import PDFPreviewModal from "@/components/opportunity/PDFPreviewModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubmissionDoc {
  id: string;
  name: string;
  type: "narrative" | "form" | "attachment" | "letter" | "registration" | "other";
  required: boolean;
  notes: string;
  completed: boolean;
  fileUrl?: string;
  fileName?: string;
}

export interface SubmissionRequirements {
  applicationFormat: string;
  submissionMethod: string;
  portalUrl: string;
  pageLimits: string;
  documents: SubmissionDoc[];
}

interface Props {
  opportunityId: string;
  requirements: SubmissionRequirements;
  rawPlan: string;           // full writing plan JSON string — we update it in-place
}

// ─── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<SubmissionDoc["type"], { label: string; color: string; bg: string; icon: string }> = {
  narrative:    { label: "NARRATIVE",    color: "#7c3aed", bg: "#e8d4ff", icon: "quill"    },
  form:         { label: "FORM",         color: "#0066cc", bg: "#c8e0ff", icon: "filter"   },
  attachment:   { label: "ATTACHMENT",   color: "#ff6b00", bg: "#ffe4c4", icon: "check"    },
  letter:       { label: "LETTER",       color: "#ff1e78", bg: "#ffe0f0", icon: "star"     },
  registration: { label: "REGISTRATION", color: "#ffb800", bg: "#fff3a0", icon: "building" },
  other:        { label: "OTHER",        color: "#aaaacc", bg: "#f0f0f8", icon: "search"   },
};

// ─── Component ────────────────────────────────────────────────────────────────

const ACCEPT_FILES = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif";

export default function SubmissionChecklist({ opportunityId, requirements, rawPlan }: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState<SubmissionDoc[]>(requirements.documents ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<SubmissionDoc | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const completed = docs.filter(d => d.completed || d.fileUrl).length;
  const required  = docs.filter(d => d.required).length;
  const allRequired = docs.filter(d => d.required).every(d => d.completed || !!d.fileUrl);

  // ── Save updated docs into the plan JSON in Airtable ────────────────────────
  const saveDocs = useCallback(async (updated: SubmissionDoc[]) => {
    setSaving(true);
    try {
      let plan: Record<string, unknown> = {};
      try { plan = JSON.parse(rawPlan); } catch { /* use empty */ }
      const updatedPlan = {
        ...plan,
        submissionRequirements: { ...requirements, documents: updated },
      };
      await fetch(`/api/opportunities/${opportunityId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fields: { "Writing Plan": JSON.stringify(updatedPlan) } }),
      });
    } catch { /* silent */ }
    setSaving(false);
  }, [opportunityId, rawPlan, requirements]);

  function toggle(id: string) {
    const updated = docs.map(d => d.id === id ? { ...d, completed: !d.completed } : d);
    setDocs(updated);
    saveDocs(updated);
  }

  async function handleUpload(docId: string, file: File) {
    setUploading(docId);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("docId", docId);
      const res = await fetch(`/api/opportunities/${opportunityId}/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url, fileName } = await res.json();
      const updated = docs.map(d =>
        d.id === docId
          ? { ...d, fileUrl: url, fileName: fileName ?? file.name, completed: true }
          : d
      );
      setDocs(updated);
      router.refresh();
    } catch { /* show error toast could be added */ }
    setUploading(null);
  }

  function handleRemove(docId: string) {
    const updated = docs.map(d =>
      d.id === docId ? { ...d, fileUrl: undefined, fileName: undefined, completed: false } : d
    );
    setDocs(updated);
    saveDocs(updated);
  }

  function isPdf(fileName?: string) {
    return fileName?.toLowerCase().endsWith(".pdf");
  }

  if (!docs.length) return null;

  // Group by type for visual organization
  const grouped: Partial<Record<SubmissionDoc["type"], SubmissionDoc[]>> = {};
  for (const doc of docs) {
    if (!grouped[doc.type]) grouped[doc.type] = [];
    grouped[doc.type]!.push(doc);
  }

  return (
    <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
      style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #ff6b00" }}>

      {/* Header */}
      <div className="px-4 py-3 border-b-[2.5px] border-[#0a0a1a] flex items-center justify-between"
        style={{ background: allRequired ? "#b8ffda" : "#fff3a0" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center"
            style={{ background: allRequired ? "#00a83a" : "#ff6b00", boxShadow: "2px 2px 0 #0a0a1a" }}>
            <PixelIcon name={allRequired ? "check" : "filter"} size={13} color="white" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]"
            style={{ fontFamily: "Orbitron, sans-serif" }}>
            SUBMISSION PACKAGE
          </span>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-[8px] font-black text-[#aaaacc]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>SAVING…</span>
          )}
          {/* Progress badge */}
          <span className="text-[9px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a]"
            style={{
              fontFamily: "Orbitron, sans-serif",
              background: allRequired ? "#00d94e" : "#ffffff",
              color: allRequired ? "#0a0a1a" : "#555566",
              boxShadow: `1px 1px 0 ${allRequired ? "#00a83a" : "#0a0a1a"}`,
            }}>
            {completed}/{docs.length} READY
          </span>
        </div>
      </div>

      {/* Submission method info */}
      <div className="px-4 py-3 border-b-[2px] border-dashed border-[#0a0a1a]/20 space-y-2"
        style={{ background: "#fef9f0" }}>

        {/* Format + method row */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a]"
            style={{ background: "#e8d4ff", boxShadow: "1px 1px 0 #7c3aed" }}>
            <PixelIcon name="quill" size={10} color="#7c3aed" />
            <span className="text-[9px] font-black text-[#7c3aed]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              {requirements.applicationFormat}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-[1.5px] border-[#0a0a1a]"
            style={{ background: "#b8e0ff", boxShadow: "1px 1px 0 #0066cc" }}>
            <PixelIcon name="rocket" size={10} color="#0066cc" />
            <span className="text-[9px] font-black text-[#0066cc]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              {requirements.submissionMethod}
            </span>
          </div>
        </div>

        {/* Page limits */}
        {requirements.pageLimits && requirements.pageLimits !== "Not specified" && (
          <div className="flex items-start gap-2">
            <PixelIcon name="filter" size={10} color="#ff6b00" className="mt-0.5 shrink-0" />
            <p className="text-[10px] text-[#555566]">
              <span className="font-black text-[#ff6b00]" style={{ fontFamily: "Orbitron, sans-serif" }}>PAGE LIMITS: </span>
              {requirements.pageLimits}
            </p>
          </div>
        )}

        {/* Portal link */}
        {requirements.portalUrl && requirements.portalUrl.startsWith("http") && (
          <a
            href={requirements.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-[2px] border-[#0a0a1a] transition-all active:translate-y-[1px] active:shadow-none"
            style={{ background: "#0066cc", boxShadow: "2px 2px 0 #0a0a1a" }}
          >
            <PixelIcon name="rocket" size={11} color="white" />
            <span className="text-[9px] font-black text-white flex-1 truncate"
              style={{ fontFamily: "Orbitron, sans-serif" }}>
              OPEN APPLICATION PORTAL
            </span>
            <PixelIcon name="arrow_right" size={10} color="white" />
          </a>
        )}
      </div>

      {/* Document checklist — grouped by type */}
      <div className="divide-y-[2px] divide-dashed divide-[#0a0a1a]/10">
        {(Object.keys(grouped) as SubmissionDoc["type"][]).map(type => {
          const cfg = TYPE_CONFIG[type];
          const items = grouped[type]!;
          return (
            <div key={type}>
              {/* Type group header */}
              <div className="px-4 py-1.5 flex items-center gap-2"
                style={{ background: cfg.bg }}>
                <PixelIcon name={cfg.icon as any} size={9} color={cfg.color} />
                <span className="text-[8px] font-black uppercase tracking-widest"
                  style={{ fontFamily: "Orbitron, sans-serif", color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-[8px] font-bold ml-auto"
                  style={{ fontFamily: "Orbitron, sans-serif", color: cfg.color, opacity: 0.6 }}>
                  {items.filter(d => d.completed).length}/{items.length}
                </span>
              </div>
              {/* Items */}
              {items.map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  opportunityId={opportunityId}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                  onToggle={toggle}
                  onPreview={setPreviewDoc}
                  uploadingId={uploadingId}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* All-required-complete CTA */}
      {allRequired && (
        <div className="px-4 py-3 border-t-[2px] border-[#00a83a] flex items-center gap-3"
          style={{ background: "#e8fff2" }}>
          <PixelIcon name="check" size={14} color="#00a83a" />
          <div className="flex-1">
            <p className="text-[10px] font-black text-[#00a83a]" style={{ fontFamily: "Orbitron, sans-serif" }}>
              ALL REQUIRED DOCS READY
            </p>
            <p className="text-xs text-[#555566]">Package is complete — send to Kika Keith for final review.</p>
          </div>
        </div>
      )}
    </div>
  );
}
