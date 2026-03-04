import { Suspense } from "react";
import Header from "@/components/layout/Header";
import KanbanBoard from "@/components/pipeline/KanbanBoard";
import PixelIcon from "@/components/shared/PixelIcon";
import type { Opportunity } from "@/types";

async function getOpportunities(): Promise<Opportunity[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/opportunities`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.records ?? []) as Opportunity[];
  } catch { return []; }
}

async function PipelineContent({ initialStage, initialPillar }: { initialStage?: string; initialPillar?: string }) {
  const opportunities = await getOpportunities();

  return (
    <div className="page-container space-y-4">
      {/* Summary bar — bright theme */}
      <div
        className="rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-2.5 flex items-center gap-3"
        style={{ background: "#e8d4ff", boxShadow: "3px 3px 0 #7c3aed" }}
      >
        <PixelIcon name="pipeline" size={16} color="#7c3aed" />
        <p className="text-[10px] font-black text-[#0a0a1a] uppercase tracking-widest flex-1"
          style={{ fontFamily: "Orbitron, sans-serif" }}>
          TOTAL MISSIONS
        </p>
        <p className="text-xl font-black text-[#7c3aed]"
          style={{ fontFamily: "Orbitron, sans-serif" }}>
          {opportunities.length}
        </p>
      </div>

      <KanbanBoard
        opportunities={opportunities}
        initialStage={initialStage}
        initialPillar={initialPillar}
      />
    </div>
  );
}

function PipelineSkeleton() {
  return (
    <div className="page-container space-y-4 animate-pulse">
      <div className="skeleton h-12 rounded-xl" />
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}

export default function PipelinePage({
  searchParams,
}: {
  searchParams?: { stage?: string; pillar?: string };
}) {
  return (
    <>
      <Header title="PIPELINE" subtitle="Mission Tracker" showRefresh />
      <Suspense fallback={<PipelineSkeleton />}>
        <PipelineContent
          initialStage={searchParams?.stage}
          initialPillar={searchParams?.pillar}
        />
      </Suspense>
    </>
  );
}
