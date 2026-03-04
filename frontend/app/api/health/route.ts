import { NextResponse } from "next/server";
import { getOpportunities } from "@/lib/airtable";

/**
 * GET /api/health — Diagnose why CONNECTION FAILED appears.
 * Visit this URL to see the actual Airtable error.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const token = process.env.AIRTABLE_API_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!token) {
    return NextResponse.json({
      ok: false,
      error: "AIRTABLE_API_TOKEN is missing. Add it in Vercel → Settings → Environment Variables.",
    });
  }
  if (!baseId) {
    return NextResponse.json({
      ok: false,
      error: "AIRTABLE_BASE_ID is missing. Add it in Vercel → Settings → Environment Variables.",
    });
  }

  try {
    const records = await getOpportunities({ maxRecords: 1 });
    return NextResponse.json({
      ok: true,
      message: `Connected. Found ${records.length} record(s) in sample.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error: msg,
      hint: "Check token scopes (need data.records:read on the base) and that BASE_ID matches your Airtable base.",
    });
  }
}
