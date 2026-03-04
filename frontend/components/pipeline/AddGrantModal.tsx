"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import PixelIcon from "@/components/shared/PixelIcon";

const PILLAR_OPTIONS = [
  { id: "P1",           label: "P1 — Capital Campaign",          color: "#7c3aed" },
  { id: "P2",           label: "P2 — Programming & Operations",  color: "#0066cc" },
  { id: "P3",           label: "P3 — Studio WELEH",             color: "#ff1e78" },
  { id: "P4",           label: "P4 — Agricultural Extension",    color: "#00a83a" },
  { id: "P5",           label: "P5 — Founder & Enterprise",      color: "#ff6b00" },
  { id: "CROSS_TEXTILE",label: "CROSS — Textile Sustainability", color: "#0099aa" },
];

const SOURCE_OPTIONS = ["Instrumentl", "Grants.gov", "Manual Research", "Email Alert", "Funder Website", "Referral", "Other"];

interface IngestResult {
  id?: string;
  name?: string;
  weightedScore?: number;
  priority?: string;
  pillars?: string[];
  alreadyExists?: boolean;
  message?: string;
  error?: string;
}

interface Props {
  onClose: () => void;
}

export default function AddGrantModal({ onClose }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name:        "",
    funder:      "",
    description: "",
    deadline:    "",
    amount:      "",
    pillar:      "",
    sourceUrl:   "",
    source:      "Instrumentl",
  });
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState<IngestResult | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setResult(null);

    try {
      const payload: Record<string, unknown> = {
        name:   form.name.trim(),
        source: form.source,
      };
      if (form.funder.trim())      payload.funder      = form.funder.trim();
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.deadline)           payload.deadline    = form.deadline;
      if (form.amount)             payload.amount      = Number(form.amount);
      if (form.pillar)             payload.pillars     = [form.pillar];
      if (form.sourceUrl.trim())   payload.sourceUrl   = form.sourceUrl.trim();

      const res = await fetch("/api/ingest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data: IngestResult = await res.json();
      setResult(data);
      if (data.id) {
        router.refresh();
      }
    } catch {
      setResult({ error: "Network error — please try again" });
    } finally {
      setSaving(false);
    }
  }

  const scoreColor =
    !result?.weightedScore ? "#0a0a1a" :
    result.weightedScore >= 4.0 ? "#00a83a" :
    result.weightedScore >= 3.5 ? "#ffb800" :
    "#ff6b00";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{ background: "rgba(10,10,26,0.7)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl border-t-[3px] border-x-[3px] border-[#0a0a1a] overflow-hidden"
        style={{ background: "#fffbf0", boxShadow: "0 -6px 0 #0a0a1a", maxHeight: "92dvh" }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div
          className="px-5 py-4 border-b-[2.5px] border-[#0a0a1a] flex items-center justify-between"
          style={{ background: "#e8d4ff" }}
        >
          <div className="flex items-center gap-2">
            <PixelIcon name="rocket" size={14} color="#7c3aed" />
            <span
              className="text-[12px] font-black uppercase tracking-widest text-[#7c3aed]"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >ADD GRANT</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center transition-all active:scale-95"
            style={{ background: "#ffffff", boxShadow: "2px 2px 0 #0a0a1a" }}
          >
            <span className="text-[14px] font-black text-[#0a0a1a]">×</span>
          </button>
        </div>

        {/* ── Success / Duplicate result ────────────────────── */}
        {result && (
          <div className="px-5 pt-4">
            {result.error ? (
              <div
                className="rounded-xl border-[2px] border-[#0a0a1a] px-4 py-3 flex items-center gap-2"
                style={{ background: "#ffe0e8", boxShadow: "3px 3px 0 #ff1e78" }}
              >
                <PixelIcon name="alert" size={13} color="#ff1e78" />
                <span className="text-[11px] font-black text-[#ff1e78]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  {result.error}
                </span>
              </div>
            ) : result.alreadyExists ? (
              <div
                className="rounded-xl border-[2px] border-[#0a0a1a] px-4 py-3 flex items-center gap-2"
                style={{ background: "#fff5c0", boxShadow: "3px 3px 0 #ffb800" }}
              >
                <PixelIcon name="alert" size={13} color="#ffb800" />
                <span className="text-[11px] font-black text-[#ffb800]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  ALREADY IN PIPELINE — duplicate skipped
                </span>
              </div>
            ) : result.id ? (
              <div
                className="rounded-xl border-[2px] border-[#0a0a1a] p-4 space-y-2"
                style={{ background: "#b8ffda", boxShadow: "3px 3px 0 #00a83a" }}
              >
                <div className="flex items-center gap-2">
                  <PixelIcon name="check" size={13} color="#00a83a" />
                  <span className="text-[11px] font-black text-[#00a83a]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    PROSPECT ADDED TO PIPELINE
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="text-[10px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a]"
                    style={{
                      fontFamily: "Orbitron, sans-serif",
                      background: "#fffbf0",
                      color: scoreColor,
                      boxShadow: `2px 2px 0 ${scoreColor}`,
                    }}
                  >SCORE: {result.weightedScore?.toFixed(2)}</span>
                  <span
                    className="text-[10px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a]"
                    style={{ fontFamily: "Orbitron, sans-serif", background: "#fffbf0", boxShadow: "2px 2px 0 #0a0a1a" }}
                  >{result.priority} PRIORITY</span>
                  {result.pillars?.map(p => (
                    <span key={p}
                      className="text-[10px] font-black px-2 py-0.5 rounded-md border-[2px] border-[#0a0a1a]"
                      style={{ fontFamily: "Orbitron, sans-serif", background: "#e8d4ff", color: "#7c3aed", boxShadow: "1px 1px 0 #7c3aed" }}
                    >{p}</span>
                  ))}
                </div>
                <button
                  onClick={onClose}
                  className="text-[10px] font-black text-[#00a83a] underline"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >View in Pipeline →</button>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Form ────────────────────────────────────────────── */}
        {!result?.id && !result?.alreadyExists && (
          <form onSubmit={submit} className="overflow-y-auto px-5 pb-8 pt-4 space-y-3" style={{ maxHeight: "70dvh" }}>

            {/* Grant Name */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-1"
                style={{ fontFamily: "Orbitron, sans-serif" }}>GRANT NAME *</label>
              <input
                ref={nameRef}
                value={form.name}
                onChange={e => set("name", e.target.value)}
                required
                className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2.5 text-sm font-semibold focus:outline-none"
                style={{ background: "#ffffff", boxShadow: "3px 3px 0 #0a0a1a" }}
                placeholder="e.g. NEA Art Works FY2027"
              />
            </div>

            {/* Funder + Amount row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-1"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>FUNDER</label>
                <input
                  value={form.funder}
                  onChange={e => set("funder", e.target.value)}
                  className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: "#ffffff", boxShadow: "3px 3px 0 #0a0a1a" }}
                  placeholder="NEA"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-1"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>MAX AMOUNT ($)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => set("amount", e.target.value)}
                  className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: "#ffffff", boxShadow: "3px 3px 0 #0a0a1a" }}
                  placeholder="100000"
                  min={0}
                />
              </div>
            </div>

            {/* Deadline + Pillar row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-1"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>DEADLINE</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => set("deadline", e.target.value)}
                  className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: "#ffffff", boxShadow: "3px 3px 0 #0a0a1a" }}
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-1"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>PILLAR</label>
                <select
                  value={form.pillar}
                  onChange={e => set("pillar", e.target.value)}
                  className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2.5 text-sm focus:outline-none appearance-none"
                  style={{ background: "#ffffff", boxShadow: "3px 3px 0 #0a0a1a" }}
                >
                  <option value="">Auto-detect</option>
                  {PILLAR_OPTIONS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Source row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-1"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>SOURCE</label>
                <select
                  value={form.source}
                  onChange={e => set("source", e.target.value)}
                  className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2.5 text-sm focus:outline-none appearance-none"
                  style={{ background: "#ffffff", boxShadow: "3px 3px 0 #0a0a1a" }}
                >
                  {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-1"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>FUNDER URL</label>
                <input
                  type="url"
                  value={form.sourceUrl}
                  onChange={e => set("sourceUrl", e.target.value)}
                  className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: "#ffffff", boxShadow: "3px 3px 0 #0a0a1a" }}
                  placeholder="https://…"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-1"
                style={{ fontFamily: "Orbitron, sans-serif" }}>DESCRIPTION (used for pillar auto-detection + scoring)</label>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                rows={3}
                className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-3 py-2.5 text-sm focus:outline-none resize-none"
                style={{ background: "#ffffff", boxShadow: "3px 3px 0 #0a0a1a" }}
                placeholder="Paste the grant description, eligibility requirements, or any relevant text…"
              />
            </div>

            {/* Score preview hint */}
            <div
              className="rounded-xl border-[2px] border-[#0a0a1a] px-3 py-2.5 flex items-start gap-2"
              style={{ background: "#f0f0ff", boxShadow: "2px 2px 0 #7c3aed" }}
            >
              <PixelIcon name="star" size={11} color="#7c3aed" className="mt-0.5 shrink-0" />
              <p className="text-[10px] text-[#0a0a1a]/60 leading-snug">
                Claude will auto-score this prospect on Mission Fit, Award Size, Timeline, and more.
                Threshold is <strong>3.5</strong> to enter Writing Queue (3.0 for Founder grants).
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3.5 text-[12px] font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: saving ? "#fff5c0" : "#e8d4ff",
                color: saving ? "#ffb800" : "#7c3aed",
                boxShadow: saving ? "3px 3px 0 #ffb800" : "3px 3px 0 #7c3aed",
              }}
            >
              {saving ? "SCORING + ADDING…" : "ADD TO PIPELINE"}
            </button>

          </form>
        )}

        {/* After success: close or add another */}
        {(result?.id || result?.alreadyExists) && (
          <div className="px-5 pb-8 pt-3 flex gap-3">
            <button
              onClick={() => { setResult(null); setForm({ name:"",funder:"",description:"",deadline:"",amount:"",pillar:"",sourceUrl:"",source:"Instrumentl" }); }}
              className="flex-1 rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all active:translate-y-[2px] active:shadow-none"
              style={{ fontFamily:"Orbitron,sans-serif", background:"#e8d4ff", color:"#7c3aed", boxShadow:"3px 3px 0 #7c3aed" }}
            >+ ADD ANOTHER</button>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all active:translate-y-[2px] active:shadow-none"
              style={{ fontFamily:"Orbitron,sans-serif", background:"#fffbf0", color:"#0a0a1a", boxShadow:"3px 3px 0 #0a0a1a" }}
            >DONE</button>
          </div>
        )}

      </div>
    </div>
  );
}
