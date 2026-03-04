import { getBaseUrl } from "@/lib/base-url";
import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import PixelIcon from "@/components/shared/PixelIcon";
import { formatCurrency, formatDeadline, abbreviatePillar } from "@/lib/utils";
import type { Opportunity } from "@/types";

async function getAwardedGrants(): Promise<Opportunity[]> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/opportunities?status=Awarded`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.records ?? []) as Opportunity[];
  } catch { return []; }
}

async function getSubmittedGrants(): Promise<Opportunity[]> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/opportunities?status=Submitted`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.records ?? []) as Opportunity[];
  } catch { return []; }
}

function AwardCard({ opp }: { opp: Opportunity }) {
  const name   = opp.fields["Grant Name"] ?? "Unknown";
  const amount = opp.fields["Award Amount Range"];
  const pillar = opp.fields.Pillar?.[0];
  const entity = opp.fields["Submitting Entity"];

  return (
    <Link href={`/opportunity/${opp.id}`}
      className="block rounded-2xl border-[2.5px] border-[#0a0a1a] p-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      style={{ background: "#e8fff0", boxShadow: "4px 4px 0 #00a83a" }}>
      <div className="flex items-start gap-3">
        {/* Trophy icon */}
        <div className="w-9 h-9 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#00a83a,#00d4ff)", boxShadow: "2px 2px 0 #0a0a1a" }}>
          <PixelIcon name="trophy" size={16} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#0a0a1a] leading-snug">{name}</h3>
          {pillar && (
            <span className="inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded border-[1.5px] border-[#0a0a1a]"
              style={{ fontFamily:"Orbitron,sans-serif",
                background:"linear-gradient(135deg,#00a83a,#00d4ff)", color:"white",
                boxShadow:"1px 1px 0 #0a0a1a" }}>
              {abbreviatePillar(pillar)}
            </span>
          )}
          {entity && <p className="text-xs text-[#555566] mt-1">{entity}</p>}
        </div>
        {amount && (
          <div className="shrink-0 text-right">
            <p className="text-lg font-black text-[#00a83a]"
              style={{ fontFamily:"Orbitron,sans-serif" }}>
              {formatCurrency(amount)}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

function SubmittedCard({ opp }: { opp: Opportunity }) {
  const name     = opp.fields["Grant Name"] ?? "Unknown";
  const amount   = opp.fields["Award Amount Range"];
  const pillar   = opp.fields.Pillar?.[0];
  const deadline = opp.fields.Deadline;

  return (
    <Link href={`/opportunity/${opp.id}`}
      className="block rounded-2xl border-[2.5px] border-[#0a0a1a] p-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      style={{ background: "#e0f4ff", boxShadow: "4px 4px 0 #0066cc" }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#0066cc,#00d4ff)", boxShadow: "2px 2px 0 #0a0a1a" }}>
          <PixelIcon name="rocket" size={15} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#0a0a1a] leading-snug">{name}</h3>
          {pillar && <p className="text-[10px] font-bold text-[#0066cc] mt-0.5">{abbreviatePillar(pillar)}</p>}
          {deadline && (
            <div className="flex items-center gap-1 mt-1">
              <PixelIcon name="clock" size={10} color="#aaaacc" />
              <span className="text-xs text-[#aaaacc]">{formatDeadline(deadline)}</span>
            </div>
          )}
        </div>
        {amount && (
          <span className="text-sm font-black text-[#0066cc] shrink-0"
            style={{ fontFamily:"Orbitron,sans-serif" }}>
            {formatCurrency(amount)}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ icon, label, iconBg, count }: {
  icon: string; label: string; iconBg: string; count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center"
        style={{ background: iconBg, boxShadow: "2px 2px 0 #0a0a1a" }}>
        <PixelIcon name={icon as any} size={13} color="#0a0a1a" />
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]"
        style={{ fontFamily:"Orbitron,sans-serif" }}>
        {label}
      </span>
      <span className="text-[10px] font-black px-2 py-0.5 rounded-md border-[2px] border-[#0a0a1a] text-[#0a0a1a]"
        style={{ fontFamily:"Orbitron,sans-serif", background: iconBg, boxShadow:"1px 1px 0 #0a0a1a" }}>
        {count}
      </span>
    </div>
  );
}

async function AwardsContent() {
  const [awarded, submitted] = await Promise.all([getAwardedGrants(), getSubmittedGrants()]);

  const totalAwarded = awarded.reduce((s, o) => s + (o.fields["Award Amount Range"] ?? 0), 0);
  const totalPending = submitted.reduce((s, o) => s + (o.fields["Award Amount Range"] ?? 0), 0);

  return (
    <div className="page-container space-y-5">

      {/* ── Stat row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4"
          style={{ background: "#e8fff0", boxShadow: "4px 4px 0 #00a83a" }}>
          <div className="flex items-center gap-2 mb-1">
            <PixelIcon name="trophy" size={14} color="#00a83a" />
            <span className="text-[9px] font-black text-[#aaaacc] uppercase tracking-widest"
              style={{ fontFamily:"Orbitron,sans-serif" }}>AWARDED</span>
          </div>
          <p className="text-2xl font-black text-[#00a83a]"
            style={{ fontFamily:"Orbitron,sans-serif" }}>
            {awarded.length > 0 ? formatCurrency(totalAwarded) : "—"}
          </p>
          <p className="text-xs text-[#555566] mt-0.5">{awarded.length} grant{awarded.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4"
          style={{ background: "#e0f4ff", boxShadow: "4px 4px 0 #0066cc" }}>
          <div className="flex items-center gap-2 mb-1">
            <PixelIcon name="rocket" size={14} color="#0066cc" />
            <span className="text-[9px] font-black text-[#aaaacc] uppercase tracking-widest"
              style={{ fontFamily:"Orbitron,sans-serif" }}>PENDING</span>
          </div>
          <p className="text-2xl font-black text-[#0066cc]"
            style={{ fontFamily:"Orbitron,sans-serif" }}>
            {submitted.length > 0 ? formatCurrency(totalPending) : "—"}
          </p>
          <p className="text-xs text-[#555566] mt-0.5">{submitted.length} submitted</p>
        </div>
      </div>

      {/* ── Awarded grants ─────────────────────────────────── */}
      {awarded.length > 0 && (
        <section>
          <SectionHeader icon="trophy" label="AWARDED GRANTS" iconBg="#b8ffda" count={awarded.length} />
          <div className="space-y-2">
            {awarded.map(opp => <AwardCard key={opp.id} opp={opp} />)}
          </div>
        </section>
      )}

      {/* ── Awaiting decision ─────────────────────────────── */}
      {submitted.length > 0 && (
        <section>
          <SectionHeader icon="rocket" label="AWAITING DECISION" iconBg="#c8e0ff" count={submitted.length} />
          <div className="space-y-2">
            {submitted.map(opp => <SubmittedCard key={opp.id} opp={opp} />)}
          </div>
        </section>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {awarded.length === 0 && submitted.length === 0 && (
        <div className="rounded-2xl border-[2.5px] border-dashed border-[#0a0a1a] p-10 flex flex-col items-center gap-3"
          style={{ background: "rgba(255,255,255,0.4)" }}>
          <PixelIcon name="trophy" size={36} color="#d0d0e0" />
          <p className="text-[11px] font-black text-[#aaaacc] uppercase tracking-widest"
            style={{ fontFamily:"Orbitron,sans-serif" }}>No wins yet</p>
          <p className="text-xs text-[#ccccdd] text-center">Grants appear here once submitted or awarded</p>
        </div>
      )}

    </div>
  );
}

function AwardsSkeleton() {
  return (
    <div className="page-container space-y-3 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}

export default function AwardsPage() {
  return (
    <>
      <Header title="WINS" subtitle="Awarded & Submitted" showRefresh />
      <Suspense fallback={<AwardsSkeleton />}>
        <AwardsContent />
      </Suspense>
    </>
  );
}
