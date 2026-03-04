"use client";

import { useState, useRef, useEffect } from "react";
import PixelIcon from "@/components/shared/PixelIcon";

type FieldType = "text" | "textarea" | "number" | "date" | "url" | "select";

// displayAs lets server components control display format without passing a function
type DisplayAs = "currency" | "plain";

interface FieldEditorProps {
  opportunityId: string;
  fieldName: string;
  value: string | number | undefined;
  type?: FieldType;
  options?: string[];
  placeholder?: string;
  displayAs?: DisplayAs;
  onSaved?: (newValue: string | number) => void;
  emptyLabel?: string;
}

function formatCurrencyInternal(val: string | number): string {
  const n = Number(val);
  if (isNaN(n)) return String(val);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

export default function FieldEditor({
  opportunityId, fieldName, value, type = "text",
  options, placeholder, displayAs, onSaved, emptyLabel = "—",
}: FieldEditorProps) {
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState(String(value ?? ""));
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // When opening editor, reset draft to current value
  useEffect(() => {
    if (editing) {
      setDraft(String(value ?? ""));
      setTimeout(() => (inputRef.current as HTMLElement)?.focus(), 50);
    }
  }, [editing, value]);

  const displayValue = value
    ? (displayAs === "currency" ? formatCurrencyInternal(value) : String(value))
    : null;

  async function handleSave() {
    if (draft === String(value ?? "")) { setEditing(false); return; }
    setSaving(true);
    try {
      const parsedValue = type === "number" ? Number(draft) : draft;
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { [fieldName]: parsedValue } }),
      });
      if (res.ok) {
        setSaved(true);
        onSaved?.(parsedValue);
        setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
      }
    } catch {}
    finally { setSaving(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && type !== "textarea") handleSave();
    if (e.key === "Escape") { setEditing(false); setDraft(String(value ?? "")); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-1">
        {type === "textarea" ? (
          <textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="flex-1 rounded-xl border-[2.5px] border-[#1565e8] px-3 py-2 text-sm resize-none focus:outline-none"
            style={{ background: "#fff", color: "#0a0a1a", boxShadow: "3px 3px 0 #1565e8" }}
          />
        ) : type === "select" && options ? (
          <select
            ref={inputRef as React.Ref<HTMLSelectElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="flex-1 rounded-xl border-[2.5px] border-[#1565e8] px-3 py-2 text-sm focus:outline-none appearance-none"
            style={{ background: "#fff", color: "#0a0a1a", boxShadow: "3px 3px 0 #1565e8",
              fontFamily: "Orbitron, sans-serif", fontSize: 11 }}
          >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            ref={inputRef as React.Ref<HTMLInputElement>}
            type={type === "url" ? "url" : type === "number" ? "number" : type === "date" ? "date" : "text"}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 rounded-xl border-[2.5px] border-[#1565e8] px-3 py-1.5 text-sm focus:outline-none"
            style={{ background: "#fff", color: "#0a0a1a", boxShadow: "3px 3px 0 #1565e8" }}
          />
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-8 h-8 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0 transition-all active:translate-y-[1px]"
          style={{ background: saved ? "#b8ffda" : "#ffe100", boxShadow: "2px 2px 0 #0a0a1a" }}
        >
          <PixelIcon name={saved ? "check" : saving ? "refresh" : "check"} size={13} color="#0a0a1a" />
        </button>

        {/* Cancel */}
        <button
          onClick={() => { setEditing(false); setDraft(String(value ?? "")); }}
          className="w-8 h-8 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0 transition-all active:translate-y-[1px]"
          style={{ background: "#ffe0e8", boxShadow: "2px 2px 0 #0a0a1a" }}
        >
          <PixelIcon name="cross" size={11} color="#ff1e78" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 group w-full text-left"
      title={`Edit ${fieldName}`}
    >
      <span className={`flex-1 text-sm leading-relaxed ${displayValue ? "text-[#0a0a1a] font-medium" : "text-[#aaaacc] italic"}`}>
        {type === "url" && displayValue ? (
          <a href={displayValue} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="underline text-[#1565e8] hover:text-[#0044aa] break-all">
            {displayValue}
          </a>
        ) : (displayValue ?? emptyLabel)}
      </span>
      <div
        className="w-6 h-6 rounded-md border-[1.5px] border-[#0a0a1a] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ background: "#e8d4ff", boxShadow: "1px 1px 0 #0a0a1a" }}
      >
        <PixelIcon name="pencil" size={10} color="#7c3aed" />
      </div>
    </button>
  );
}
