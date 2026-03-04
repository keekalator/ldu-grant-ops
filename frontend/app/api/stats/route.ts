import { NextResponse } from "next/server";
import { getOpportunities } from "@/lib/airtable";
import { buildUrgentAlerts } from "@/lib/utils";
import type { Opportunity, PipelineStats } from "@/types";

export const revalidate = 60;

export async function GET() {
  try {
    const records = await getOpportunities({ maxRecords: 300 });
    const opportunities = records as unknown as Opportunity[];

    const byStatus: Record<string, number> = {};
    const byPillar: Record<string, number> = {};
    let totalRequested = 0;
    let totalAwarded = 0;

    const upcomingDeadlines: Opportunity[] = [];
    const writingQueue: Opportunity[] = [];

    for (const opp of opportunities) {
      const status = opp.fields.Status ?? "Prospect";
      byStatus[status] = (byStatus[status] ?? 0) + 1;

      const pillars = opp.fields.Pillar ?? [];
      for (const p of pillars) {
        byPillar[p] = (byPillar[p] ?? 0) + 1;
      }

      const amount = opp.fields["Award Amount Range"] ?? 0;
      if (status === "Awarded") totalAwarded += amount;
      if (!["Declined", "Rejected"].includes(status)) totalRequested += amount;

      if (opp.fields.Deadline) {
        const days = Math.floor(
          (new Date(opp.fields.Deadline).getTime() - Date.now()) / 86400000
        );
        if (days >= 0 && days <= 30 && !["Awarded", "Declined", "Rejected"].includes(status)) {
          upcomingDeadlines.push(opp);
        }
      }

      if (["Writing", "In Review"].includes(status)) {
        writingQueue.push(opp);
      }
    }

    const urgentAlerts = buildUrgentAlerts(opportunities);

    const stats: PipelineStats = {
      total: opportunities.length,
      byStatus,
      byPillar,
      totalRequested,
      totalAwarded,
      upcomingDeadlines: upcomingDeadlines.slice(0, 5),
      writingQueue: writingQueue.slice(0, 5),
      urgentAlerts: urgentAlerts.slice(0, 8),
    };

    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
