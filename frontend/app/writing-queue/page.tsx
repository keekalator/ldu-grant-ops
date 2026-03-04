import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";

export const dynamic = "force-dynamic";
import GrantCard from "@/components/shared/GrantCard";
import PixelIcon from "@/components/shared/PixelIcon";
import { daysUntilDeadline } from "@/lib/utils";
import { getWritingQueue as fetchWritingQueue } from "@/lib/airtable";
import type { Opportunity } from "@/types";

async function getWritingQueue(): Promise<Opportunity[]> {
  try {
    const records = await fetchWritingQueue();
    return (records as unknown as Opportunity[]).sort(
      (a, b) => daysUntilDeadline(a.fields.Deadline) - daysUntilDeadline(b.fields.Deadline)
    );
  } catch { return []; }
}

async function WritingQueueContent() {
  const opps = await getWritingQueue();
  const writing = opps.filter((o) => o.fields.Status === "Writing Queue");
  const review  = opps.filter((o) => o.fields.Status === "In Review"); // kept for legacy data
  const urgent  = opps.filter((o) => daysUntilDeadline(o.fields.Deadline) <= 7);

  if (opps.length === 0) {
    return (
      <div className="page-container">
        <div
          className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-10 text-center"
          style={{ background: "#ffffff", boxShadow: "4px 4px 0 #0a0a1a" }}
        >
          <PixelIcon name="quill" size={32} color="#aaaacc" className="mx-auto mb-3" />
          <p className="font-black text-[#aaaacc] text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>QUEUE EMPTY</p>
        </div>
      </div>
    );
  }

  const statBlocks = [
    { icon: "quill"  as const, label: "WRITING", value: writing.length, bg: "#fff3a0", shadow: "#ffb800",         href: "#active-drafts" },
    { icon: "search" as const, label: "REVIEW",  value: review.length,  bg: "#b8f0ff", shadow: "#0066cc",         href: "#pending-review" },
    { icon: "alert"  as const, label: "URGENT",  value: urgent.length,  bg: urgent.length > 0 ? "#ffe0e8" : "#f0f0f8", shadow: urgent.length > 0 ? "#ff1e78" : "#aaaacc", href: "/pipeline?stage=writing" },
  ];

  return (
    <div className="page-container space-y-5">
      {/* Stat blocks */}
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

      {/* Writing */}
      {writing.length > 0 && (
        <section id="active-drafts">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center" style={{ background: "#fff3a0", boxShadow: "2px 2px 0 #0a0a1a" }}>
              <PixelIcon name="quill" size={13} color="#0a0a1a" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]" style={{ fontFamily: "Orbitron, sans-serif" }}>ACTIVE DRAFTS</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md border-[2px] border-[#0a0a1a]" style={{ fontFamily: "Orbitron, sans-serif", background: "#fff3a0", boxShadow: "1px 1px 0 #0a0a1a" }}>{writing.length}</span>
          </div>
          <div className="space-y-2">{writing.map((opp) => <GrantCard key={opp.id} opportunity={opp} />)}</div>
        </section>
      )}

      {/* Review */}
      {review.length > 0 && (
        <section id="pending-review">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center" style={{ background: "#b8f0ff", boxShadow: "2px 2px 0 #0a0a1a" }}>
              <PixelIcon name="search" size={13} color="#0a0a1a" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]" style={{ fontFamily: "Orbitron, sans-serif" }}>PENDING REVIEW</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md border-[2px] border-[#0a0a1a]" style={{ fontFamily: "Orbitron, sans-serif", background: "#b8f0ff", boxShadow: "1px 1px 0 #0a0a1a" }}>{review.length}</span>
          </div>
          <div className="space-y-2">{review.map((opp) => <GrantCard key={opp.id} opportunity={opp} />)}</div>
        </section>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="page-container space-y-4">
      <div className="grid grid-cols-3 gap-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}

export default function WritingQueuePage() {
  return (
    <>
      <Header title="WRITING" subtitle="Active Missions" showRefresh />
      <Suspense fallback={<Skeleton />}><WritingQueueContent /></Suspense>
    </>
  );
}
