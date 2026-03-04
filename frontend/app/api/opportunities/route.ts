import { NextRequest, NextResponse } from "next/server";
import { getOpportunities } from "@/lib/airtable";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const pillar = searchParams.get("pillar");
    const priority = searchParams.get("priority");

    const filterParts: string[] = [];
    if (status) filterParts.push(`{Status} = "${status}"`);
    if (pillar) filterParts.push(`FIND("${pillar}", ARRAYJOIN({Pillar}, ",")) > 0`);
    if (priority) filterParts.push(`{Priority} = "${priority}"`);

    const filterByFormula =
      filterParts.length > 1
        ? `AND(${filterParts.join(", ")})`
        : filterParts[0];

    const records = await getOpportunities(
      filterByFormula ? { filterByFormula } : undefined
    );

    return NextResponse.json({ records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
