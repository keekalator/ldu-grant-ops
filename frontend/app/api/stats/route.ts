import { NextResponse } from "next/server";
import { getOpportunities } from "@/lib/airtable";
import { computePipelineStats } from "@/lib/utils";
import type { Opportunity } from "@/types";

export const revalidate = 60;

export async function GET() {
  try {
    const records = await getOpportunities({ maxRecords: 300 });
    const stats = computePipelineStats(records as unknown as Opportunity[]);
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
