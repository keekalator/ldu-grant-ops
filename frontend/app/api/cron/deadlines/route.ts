/**
 * GET /api/cron/deadlines
 *
 * Daily deadline scanner — fires push notifications for upcoming grant deadlines.
 * Called automatically by:
 *   1. Vercel Cron (see vercel.json) — 8 AM PT daily
 *   2. GitHub Actions scheduled workflow (as a curl call after deployment)
 *
 * Alert thresholds:
 *   - 14 days out  → high priority (early warning)
 *   - 7 days out   → high priority
 *   - 3 days out   → urgent
 *   - 1 day out    → urgent
 *   - same day     → max (emergency)
 *
 * Secured with CRON_SECRET env var — pass as ?secret=... query param.
 */

import { NextRequest, NextResponse } from "next/server";
import { notifyDeadlineAlert }      from "@/lib/notify";

const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID;
const CRON_SECRET    = process.env.CRON_SECRET;

const ALERT_DAYS = [14, 7, 3, 1, 0];

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

async function getUpcomingDeadlines(): Promise<AirtableRecord[]> {
  // Fetch all active (non-closed) opportunities with deadlines
  const formula = encodeURIComponent(
    `AND(
      NOT({Status} = 'Declined'),
      NOT({Status} = 'Rejected'),
      NOT({Status} = 'Disqualified'),
      NOT({Status} = 'Awarded'),
      NOT({Deadline} = ''),
      {Deadline} != ''
    )`
  );
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/Opportunities?filterByFormula=${formula}&fields[]=Grant Name&fields[]=Deadline&fields[]=Status&fields[]=Submitting Entity&fields[]=Funder Name`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  const data = await res.json();
  return data.records ?? [];
}

function daysUntil(dateStr: string): number {
  const now      = new Date();
  const deadline = new Date(dateStr);
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  // Auth check
  if (CRON_SECRET) {
    const secret = req.nextUrl.searchParams.get("secret");
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });
  }

  let records: AirtableRecord[];
  try {
    records = await getUpcomingDeadlines();
  } catch (e) {
    return NextResponse.json({ error: `Failed to fetch deadlines: ${e}` }, { status: 500 });
  }

  const alerts: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const record of records) {
    const deadline = record.fields["Deadline"] as string | undefined;
    if (!deadline) continue;

    const days    = daysUntil(deadline);
    const name    = (record.fields["Grant Name"]    as string) ?? "Unknown Grant";
    const entity  = (record.fields["Submitting Entity"] as string) ?? "LDU";
    const status  = (record.fields["Status"]        as string) ?? "";

    // Send alert at defined thresholds
    if (ALERT_DAYS.includes(days)) {
      await notifyDeadlineAlert(name, days, entity, record.id);
      alerts.push(`${name}: ${days} days (${status})`);
    }
  }

  const summary = alerts.length > 0
    ? `Sent ${alerts.length} deadline alert(s): ${alerts.join("; ")}`
    : "No deadline alerts today";

  console.log(`[cron/deadlines] ${summary}`);
  return NextResponse.json({ ok: true, summary, alertCount: alerts.length });
}
