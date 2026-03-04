import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";

export const dynamic = "force-dynamic";
import GrantCard from "@/components/shared/GrantCard";
import PixelIcon from "@/components/shared/PixelIcon";
import { daysUntilDeadline } from "@/lib/utils";
import { listRecords } from "@/lib/airtable";
import type { Opportunity } from "@/types";

async function getWritingGrants(): Promise<Opportunity[]> {
  try {
    const records = await listRecords("Opportunities", {
      filterByFormula: `OR({Status}="Writing Queue",{Status}="Active",{Status}="Submitted")`,
      sort: [{ field: "Deadline", direction: "asc" }],
    });
    return records as unknown as Opportunity[];
  } catch { return []; }
}

// ─── Stage pill shown on each card in the list ────────────────────────────────

function StagePill({ status }: { status: string }) {
  const cfg =
    status === "Writing Queue" ? { label: "DRAFTING",    bg: "#fff5c0", color: "#ffb800", shadow: "#ffb800" } :
    status === "Active"        ? { label: "IN REVIEW",   bg: "#c8e0ff", color: "#0066cc", shadow: "#0066cc" } :
    status === "Submitted"     ? { label: "SUBMITTED",   bg: "#b8ffda", color: "#00a83a", shadow: "#00a83a" } :
    null;
  if (!cfg) return null;
  return (
    <span
      className="text-[9px] font-black px-2 py-0.5 rounded-md border-[2px] border-[#0a0a1a]"
      style={{ fontFamily: "Orbitron, sans-serif", background: cfg.bg, color: cfg.color, boxShadow: `1px 1px 0 ${cfg.shadow}` }}
    >{cfg.label}</span>
  );
}

// ─── Stage section heading ─────────────────────────────────────────────────────

function StageSection({
  icon, label, count, accentBg, accentShadow, id, children,
}: {
  icon: "quill" | "search" | "rocket";
  label: string;
  count: number;
  accentBg: string;
  accentShadow: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center"
          style={{ background: accentBg, boxShadow: "2px 2px 0 #0a0a1a" }}
        >
          <PixelIcon name={icon} size={13} color="#0a0a1a" />
        </div>
        <span
          className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]"
          style={{ fontFamily: "Orbitron, sans-serif" }}
        >{label}</span>
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-md border-[2px] border-[#0a0a1a]"
          style={{ fontFamily: "Orbitron, sans-serif", background: accentBg, boxShadow: `1px 1px 0 ${accentShadow}` }}
        >{count}</span>
      </div>
      {children}
    </section>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

async function WritingQueueContent() {
  const opps = await getWritingGrants();

  const drafting  = opps.filter(o => o.fields.Status === "Writing Queue");
  const inReview  = opps.filter(o => o.fields.Status === "Active");
  const submitted = opps.filter(o => o.fields.Status === "Submitted");
  const urgent    = opps.filter(o =>
    ["Writing Queue", "Active"].includes(o.fields.Status as string) &&
    daysUntilDeadline(o.fields.Deadline) <= 7
  );

  if (opps.length === 0) {
    return (
      <div className="page-container">
        <div
          className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-10 text-center"
          style={{ background: "#ffffff", boxShadow: "4px 4px 0 #0a0a1a" }}
        >
          <PixelIcon name="quill" size={32} color="#aaaacc" className="mx-auto mb-3" />
          <p className="font-black text-[#aaaacc] text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>
            QUEUE EMPTY
          </p>
        </div>
      </div>
    );
  }

  const statBlocks = [
    {
      icon:   "quill"  as const,
      label:  "DRAFTING",
      value:  drafting.length,
      bg:     "#fff5c0",
      shadow: "#ffb800",
      href:   "#drafting",
    },
    {
      icon:   "search" as const,
      label:  "REVIEW",
      value:  inReview.length,
      bg:     inReview.length > 0 ? "#c8e0ff" : "#f0f0f8",
      shadow: inReview.length > 0 ? "#0066cc" : "#aaaacc",
      href:   "#in-review",
    },
    {
      icon:   "alert"  as const,
      label:  "URGENT",
      value:  urgent.length,
      bg:     urgent.length > 0 ? "#ffe0e8" : "#f0f0f8",
      shadow: urgent.length > 0 ? "#ff1e78" : "#aaaacc",
      href:   "#drafting",
    },
  ];

  return (
    <div className="page-container space-y-5">

      {/* ── Stat blocks ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {statBlocks.map(({ icon, label, value, bg, shadow, href }) => (
          <Link
            key={label}
            href={href}
            className="block rounded-2xl border-[2.5px] border-[#0a0a1a] p-3 text-center transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{ background: bg, boxShadow: `3px 3px 0 ${shadow}` }}
          >
            <div
              className="w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center mx-auto mb-2"
              style={{ background: "rgba(255,255,255,0.6)", boxShadow: "1px 1px 0 #0a0a1a" }}
            >
              <PixelIcon name={icon} size={16} color="#0a0a1a" />
            </div>
            <p className="text-2xl font-black text-[#0a0a1a] leading-none" style={{ fontFamily: "Orbitron, sans-serif" }}>{value}</p>
            <p className="text-[9px] font-black mt-1 text-[#0a0a1a] opacity-60 uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Pipeline mini-map ────────────────────────────────── */}
      <div
        className="rounded-2xl border-[2.5px] border-[#0a0a1a] px-4 py-3 flex items-center gap-3"
        style={{ background: "#fffbf0", boxShadow: "3px 3px 0 #0a0a1a" }}
      >
        {[
          { label: "DRAFTING", count: drafting.length, color: "#ffb800" },
          { label: "REVIEW",   count: inReview.length,  color: "#0066cc" },
          { label: "SUBMITTED",count: submitted.length,  color: "#00a83a" },
        ].map((s, i, arr) => (
          <div key={s.label} className="flex items-center gap-3 flex-1">
            <div className="flex-1 text-center">
              <p className="text-lg font-black leading-none" style={{ fontFamily: "Orbitron, sans-serif", color: s.color }}>
                {s.count}
              </p>
              <p className="text-[8px] font-black uppercase tracking-wider text-[#aaaacc] mt-0.5"
                style={{ fontFamily: "Orbitron, sans-serif" }}>{s.label}</p>
            </div>
            {i < arr.length - 1 && (
              <PixelIcon name="arrow_right" size={10} color="#aaaacc" />
            )}
          </div>
        ))}
      </div>

      {/* ── DRAFTING section ─────────────────────────────────── */}
      {drafting.length > 0 && (
        <StageSection
          id="drafting"
          icon="quill"
          label="ACTIVE DRAFTS"
          count={drafting.length}
          accentBg="#fff5c0"
          accentShadow="#ffb800"
        >
          <div className="space-y-2">
            {drafting.map(opp => (
              <div key={opp.id} className="relative">
                <GrantCard opportunity={opp} />
                <div className="absolute top-3 right-3">
                  <StagePill status={opp.fields.Status as string} />
                </div>
              </div>
            ))}
          </div>
        </StageSection>
      )}

      {/* ── IN REVIEW section ────────────────────────────────── */}
      {inReview.length > 0 && (
        <StageSection
          id="in-review"
          icon="search"
          label="READY FOR KIKA — PENDING APPROVAL"
          count={inReview.length}
          accentBg="#c8e0ff"
          accentShadow="#0066cc"
        >
          <div className="space-y-2">
            {inReview.map(opp => (
              <div key={opp.id} className="relative">
                <GrantCard opportunity={opp} />
                <div className="absolute top-3 right-3">
                  <StagePill status={opp.fields.Status as string} />
                </div>
              </div>
            ))}
          </div>
        </StageSection>
      )}

      {/* ── SUBMITTED section ────────────────────────────────── */}
      {submitted.length > 0 && (
        <StageSection
          id="submitted"
          icon="rocket"
          label="SUBMITTED"
          count={submitted.length}
          accentBg="#b8ffda"
          accentShadow="#00a83a"
        >
          <div className="space-y-2">
            {submitted.map(opp => (
              <div key={opp.id} className="relative">
                <GrantCard opportunity={opp} />
                <div className="absolute top-3 right-3">
                  <StagePill status={opp.fields.Status as string} />
                </div>
              </div>
            ))}
          </div>
        </StageSection>
      )}

    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="page-container space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-16 rounded-2xl" />
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WritingQueuePage() {
  return (
    <>
      <Header title="WRITING" subtitle="Active Missions" showRefresh />
      <Suspense fallback={<Skeleton />}><WritingQueueContent /></Suspense>
    </>
  );
}
