import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import UrgentAlerts from "@/components/dashboard/UrgentAlerts";
import PipelineSnapshot from "@/components/dashboard/PipelineSnapshot";
import GrantCard from "@/components/shared/GrantCard";
import PixelIcon from "@/components/shared/PixelIcon";
import { formatCurrency, computePipelineStats } from "@/lib/utils";
import { getOpportunities } from "@/lib/airtable";
import type { PixelIconName } from "@/components/shared/PixelIcon";
import type { PipelineStats, Opportunity } from "@/types";

/** Fetches stats directly from Airtable (no self-fetch) — works on Vercel. */
async function getDashboardStats(): Promise<PipelineStats | null> {
  try {
    const records = await getOpportunities({ maxRecords: 300 });
    return computePipelineStats(records as unknown as Opportunity[]);
  } catch {
    return null;
  }
}

// ─── Stat Block ───────────────────────────────────────────────────────────────

function StatBlock({
  icon, label, value, sub, bg, shadowColor, iconColor = "#0a0a1a", href,
}: {
  icon: PixelIconName; label: string; value: string | number; sub?: string;
  bg: string; shadowColor: string; iconColor?: string; href?: string;
}) {
  const inner = (
    <div
      className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4 flex flex-col gap-1.5 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      style={{ background: bg, boxShadow: `4px 4px 0 ${shadowColor}` }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.5)" }}
        >
          <PixelIcon name={icon} size={16} color={iconColor} />
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ fontFamily: "Orbitron, sans-serif", color: "#0a0a1a", opacity: 0.6 }}
        >
          {label}
        </span>
      </div>
      <p
        className="text-3xl font-black text-[#0a0a1a] leading-none"
        style={{ fontFamily: "Orbitron, sans-serif" }}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-[#0a0a1a] opacity-60 font-medium">{sub}</p>}
    </div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon, label, iconBg, labelColor = "#0a0a1a", href, count,
}: {
  icon: PixelIconName; label: string; iconBg: string; labelColor?: string; href?: string; count?: number;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center"
          style={{ background: iconBg, boxShadow: "2px 2px 0 #0a0a1a" }}
        >
          <PixelIcon name={icon} size={13} color="#0a0a1a" />
        </div>
        <span
          className="text-[11px] font-black uppercase tracking-widest"
          style={{ fontFamily: "Orbitron, sans-serif", color: labelColor }}
        >
          {label}
        </span>
        {count !== undefined && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-md border-[2px] border-[#0a0a1a]"
            style={{ fontFamily: "Orbitron, sans-serif", background: iconBg, color: "#0a0a1a", boxShadow: "1px 1px 0 #0a0a1a" }}
          >
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a] text-[10px] font-black uppercase tracking-wider transition-all active:translate-y-[1px]"
          style={{ fontFamily: "Orbitron, sans-serif", background: "#ffffff", boxShadow: "2px 2px 0 #0a0a1a" }}
        >
          ALL
          <PixelIcon name="arrow_right" size={10} color="#0a0a1a" />
        </Link>
      )}
    </div>
  );
}

// ─── Pixel Divider ────────────────────────────────────────────────────────────

function PixelDivider({ color }: { color: string }) {
  return (
    <div className="py-1">
      <div
        className="h-[3px] w-full rounded-sm"
        style={{
          background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 6px, transparent 6px, transparent 10px)`,
        }}
      />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="page-container space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-16 rounded-2xl" />
      <div className="skeleton h-44 rounded-2xl" />
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}

// ─── Dashboard Content ────────────────────────────────────────────────────────

async function DashboardContent() {
  const stats = await getDashboardStats();

  if (!stats) {
    return (
      <div className="page-container">
        <div className="retro-card-pink p-6 text-center">
          <PixelIcon name="alert" size={32} color="#ff1e78" className="mx-auto mb-3" />
          <p className="font-black text-[#ff1e78]" style={{ fontFamily: "Orbitron, sans-serif" }}>CONNECTION FAILED</p>
          <p className="text-xs text-[#0a0a1a] opacity-60 mt-1">
            Add AIRTABLE_API_TOKEN & AIRTABLE_BASE_ID in Vercel → Settings → Environment Variables
          </p>
          <Link
            href="/api/health"
            className="inline-block mt-3 text-[10px] font-bold px-3 py-2 rounded-lg border-[2px] border-[#ff1e78] text-[#ff1e78]"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            Check /api/health for error details →
          </Link>
        </div>
      </div>
    );
  }

  const writingCount = (stats.byStatus["Writing"] ?? 0) + (stats.byStatus["In Review"] ?? 0);
  const submittedCount = stats.byStatus["Submitted"] ?? 0;
  const awardedCount = stats.byStatus["Awarded"] ?? 0;

  return (
    <div className="page-container space-y-4">

      {/* ── Hero Banner ───────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl border-[2.5px] border-[#0a0a1a] p-5"
        style={{ background: "#fffbf0", boxShadow: "5px 5px 0 #0a0a1a" }}
      >
        {/* Color stripe top */}
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ background: "linear-gradient(90deg, #ff1e78 0%,#ffe100 33%,#00d94e 66%,#00d4ff 100%)" }}
        />
        <div className="pt-2">
          <p
            className="text-[9px] font-black uppercase tracking-[0.25em] text-[#aaaacc] mb-1"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            Life Development University
          </p>
          <h2
            className="text-2xl font-black text-[#0a0a1a] leading-tight mb-3"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            MISSION HQ
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            {stats.urgentAlerts.length > 0 ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a]"
                style={{ background: "#ff1e78", boxShadow: "2px 2px 0 #0a0a1a" }}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
                <span
                  className="text-[10px] font-black text-white uppercase tracking-wider"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  {stats.urgentAlerts.length} ALERT{stats.urgentAlerts.length > 1 ? "S" : ""}
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-[2px] border-[#0a0a1a]"
                style={{ background: "#00d94e", boxShadow: "2px 2px 0 #0a0a1a" }}
              >
                <PixelIcon name="check" size={12} color="#0a0a1a" />
                <span className="text-[10px] font-black text-[#0a0a1a] uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  ALL CLEAR
                </span>
              </div>
            )}
            <span className="text-xs font-bold text-[#0a0a1a] opacity-50">{stats.total} MISSIONS TRACKED</span>
          </div>
        </div>
      </div>

      {/* ── Stat Blocks ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatBlock icon="pipeline" label="Pipeline"  value={stats.total}       sub="total missions"    bg="#e8d4ff" shadowColor="#7c3aed" href="/pipeline" />
        <StatBlock icon="quill"    label="Writing"   value={writingCount}       sub="active drafts"     bg="#fff3a0" shadowColor="#0a0a1a" href="/writing-queue" />
        <StatBlock icon="rocket"   label="Submitted" value={submittedCount}     sub="awaiting decision" bg="#b8ffda" shadowColor="#00a83a" href="/pipeline?stage=submitted" />
        <StatBlock
          icon="trophy" label="Awarded"
          value={awardedCount > 0 ? formatCurrency(stats.totalAwarded) : "0"}
          sub={awardedCount > 0 ? `${awardedCount} wins` : "keep going!"}
          bg="#ffd970" shadowColor="#ffa500"
          href="/awards"
        />
      </div>

      <PixelDivider color="#ff1e78" />

      {/* ── Urgent Alerts ─────────────────────────────────── */}
      {stats.urgentAlerts.length > 0 && (
        <section>
          <SectionHeader icon="alert" label="NEEDS ATTENTION" iconBg="#ff1e78" count={stats.urgentAlerts.length} />
          <UrgentAlerts alerts={stats.urgentAlerts} />
        </section>
      )}

      {/* ── Pipeline Breakdown ────────────────────────────── */}
      <section>
        <SectionHeader icon="chart" label="POWER BREAKDOWN" iconBg="#e8d4ff" href="/pipeline" />
        <div className="retro-card p-4">
          <PipelineSnapshot stats={stats} />
        </div>
      </section>

      <PixelDivider color="#ffe100" />

      {/* ── Upcoming Deadlines ────────────────────────────── */}
      {stats.upcomingDeadlines.length > 0 && (
        <section>
          <SectionHeader icon="clock" label="DEADLINES" iconBg="#ffe100" href="/pipeline" count={stats.upcomingDeadlines.length} />
          <div className="space-y-2">
            {stats.upcomingDeadlines.map((opp) => (
              <GrantCard key={opp.id} opportunity={opp as unknown as Opportunity} compact />
            ))}
          </div>
        </section>
      )}

      <PixelDivider color="#00d94e" />

      {/* ── Writing Queue ──────────────────────────────────── */}
      {stats.writingQueue.length > 0 && (
        <section>
          <SectionHeader icon="quill" label="ACTIVE MISSIONS" iconBg="#fff3a0" href="/writing-queue" count={stats.writingQueue.length} />
          <div className="space-y-2">
            {stats.writingQueue.map((opp) => (
              <GrantCard key={opp.id} opportunity={opp as unknown as Opportunity} compact />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Header title="LDU GRANTS" subtitle="Grant Operations" showRefresh />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}
