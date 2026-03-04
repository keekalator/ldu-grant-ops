import { Suspense } from "react";
import Header from "@/components/layout/Header";
import PixelIcon from "@/components/shared/PixelIcon";
import { formatCurrency } from "@/lib/utils";
import type { Funder } from "@/types";

async function getFunders(): Promise<Funder[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/funders`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.records ?? []) as Funder[];
  } catch { return []; }
}

const TYPE_CONFIG: Record<string, { grad: string; iconBg: string }> = {
  Foundation:  { grad: "linear-gradient(135deg,#7c3aed,#ff1e78)", iconBg: "#e8d4ff" },
  Government:  { grad: "linear-gradient(135deg,#0066cc,#00d4ff)", iconBg: "#c8e0ff" },
  Corporate:   { grad: "linear-gradient(135deg,#ffb800,#ff6b35)", iconBg: "#fff5c0" },
  Individual:  { grad: "linear-gradient(135deg,#ff1e78,#ff6b35)", iconBg: "#ffe0e8" },
  Other:       { grad: "linear-gradient(135deg,#00a83a,#00d4ff)", iconBg: "#b8ffda" },
};

const FOCUS_COLORS = [
  "linear-gradient(135deg,#7c3aed,#ff1e78)",
  "linear-gradient(135deg,#ff1e78,#ff6b35)",
  "linear-gradient(135deg,#0066cc,#00d4ff)",
  "linear-gradient(135deg,#00a83a,#00d4ff)",
  "linear-gradient(135deg,#ffb800,#ffe100)",
];

function FunderCard({ funder }: { funder: Funder }) {
  const name     = funder.fields["Funder Name"] ?? "Unknown Funder";
  const type     = funder.fields["Funder Type"] ?? "Other";
  const website  = funder.fields["Website"];
  const avgAward = funder.fields["Average Award"];
  const focus    = funder.fields["Focus Areas"];
  const geo      = funder.fields["Geographic Focus"];

  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.Other;

  return (
    <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4"
      style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #0a0a1a" }}>

      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
          style={{ background: cfg.grad, boxShadow: "2px 2px 0 #0a0a1a" }}>
          <PixelIcon name="building" size={17} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#0a0a1a] leading-snug">{name}</h3>
          <span className="inline-block mt-0.5 text-[9px] font-black px-2 py-0.5 rounded border-[1.5px] border-[#0a0a1a]"
            style={{ fontFamily:"Orbitron,sans-serif", background: cfg.iconBg, color:"#0a0a1a",
              boxShadow:"1px 1px 0 #0a0a1a" }}>
            {type.toUpperCase()}
          </span>
        </div>
        {avgAward && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-black text-[#0a0a1a]"
              style={{ fontFamily:"Orbitron,sans-serif" }}>
              {formatCurrency(avgAward)}
            </p>
            <p className="text-[9px] text-[#aaaacc]">avg award</p>
          </div>
        )}
      </div>

      {/* Focus area pills */}
      {focus && focus.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {focus.slice(0, 4).map((f, i) => (
            <span key={f}
              className="text-[9px] font-bold px-2 py-0.5 rounded-lg border-[1.5px] border-[#0a0a1a] text-white"
              style={{ background: FOCUS_COLORS[i % FOCUS_COLORS.length], boxShadow:"1px 1px 0 #0a0a1a" }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center gap-3 mt-1">
        {geo && (
          <div className="flex items-center gap-1">
            <PixelIcon name="target" size={10} color="#aaaacc" />
            <span className="text-[10px] text-[#aaaacc] font-medium">{geo}</span>
          </div>
        )}
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg border-[2px] border-[#0a0a1a] text-[9px] font-black text-[#0a0a1a] transition-all active:translate-y-[1px]"
            style={{ fontFamily:"Orbitron,sans-serif",
              background:"#ffffff",
              boxShadow:"2px 2px 0 #0a0a1a" }}>
            <PixelIcon name="search" size={9} color="#0a0a1a" />
            VISIT
          </a>
        )}
      </div>
    </div>
  );
}

async function FundersContent() {
  const funders = await getFunders();

  if (funders.length === 0) {
    return (
      <div className="page-container">
        <div className="rounded-2xl border-[2.5px] border-dashed border-[#0a0a1a] p-10 flex flex-col items-center gap-3"
          style={{ background: "rgba(255,255,255,0.4)" }}>
          <PixelIcon name="building" size={36} color="#d0d0e0" />
          <p className="text-[11px] font-black text-[#aaaacc] uppercase tracking-widest"
            style={{ fontFamily:"Orbitron,sans-serif" }}>No funders yet</p>
          <p className="text-xs text-[#ccccdd] text-center">Add funders to your Airtable Funders table</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-3">

      {/* Count bar */}
      <div className="rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-2.5 flex items-center gap-2"
        style={{ background: "#e8d4ff", boxShadow: "3px 3px 0 #7c3aed" }}>
        <PixelIcon name="building" size={14} color="#7c3aed" />
        <span className="text-[11px] font-black text-[#0a0a1a]"
          style={{ fontFamily:"Orbitron,sans-serif" }}>
          {funders.length} FUNDERS IN DATABASE
        </span>
      </div>

      {funders.map(funder => <FunderCard key={funder.id} funder={funder} />)}
    </div>
  );
}

function FundersSkeleton() {
  return (
    <div className="page-container space-y-2 animate-pulse">
      {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  );
}

export default function FundersPage() {
  return (
    <>
      <Header title="FUNDERS" subtitle="Intelligence Database" showRefresh />
      <Suspense fallback={<FundersSkeleton />}>
        <FundersContent />
      </Suspense>
    </>
  );
}
