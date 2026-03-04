/**
 * POST /api/ingest
 *
 * Webhook endpoint for ingesting new grant prospects from:
 *   - Make.com (Instrumentl email alert → webhook)
 *   - Manual quick-add form in the app
 *   - Future: direct Instrumentl API
 *
 * Body shape (all fields optional except `name`):
 * {
 *   name:        string   — Grant / program name
 *   funder?:     string   — Funder organization
 *   description?: string  — Grant description
 *   deadline?:   string   — ISO date (YYYY-MM-DD)
 *   amount?:     number   — Award amount (use max if range)
 *   pillars?:    string[] — ["P1","P3"] (auto-detected if omitted)
 *   sourceUrl?:  string   — Link to funder page / Instrumentl listing
 *   source?:     string   — e.g. "Instrumentl", "Manual", "Make"
 *   secret?:     string   — Webhook secret (optional hardening)
 * }
 *
 * Returns: { id, fields, score, alreadyExists }
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { autoScore, PILLAR_NAMES } from "@/lib/scoring";

const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN?.trim();
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID?.trim();
const WEBHOOK_SECRET = process.env.INGEST_WEBHOOK_SECRET?.trim(); // optional

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function airtableFetch(path: string, options?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable ${res.status}: ${err}`);
  }
  return res.json();
}

async function isDuplicate(name: string, funder: string): Promise<boolean> {
  // Case-insensitive name match (Airtable formula)
  const formula = encodeURIComponent(
    `AND(LOWER({Grant Name})="${name.toLowerCase().replace(/"/g, '\\"')}")`
  );
  const data = await airtableFetch(
    `Opportunities?filterByFormula=${formula}&fields[]=Grant Name&maxRecords=1`
  );
  return data.records?.length > 0;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Optional webhook secret check
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-webhook-secret") ?? req.headers.get("authorization");
    if (provided !== WEBHOOK_SECRET && provided !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 2. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name    = String(body.name ?? "").trim();
  const funder  = String(body.funder ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "\"name\" is required" }, { status: 400 });
  }

  // 3. Deduplicate
  try {
    const exists = await isDuplicate(name, funder);
    if (exists) {
      return NextResponse.json(
        { alreadyExists: true, message: `"${name}" is already in the pipeline` },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("[ingest] Dedup check failed:", err);
    // Non-fatal — continue with insert
  }

  // 4. Auto-score
  const prospect = {
    name,
    funder:      funder || undefined,
    description: body.description ? String(body.description) : undefined,
    deadline:    body.deadline    ? String(body.deadline)    : undefined,
    amount:      body.amount      ? Number(body.amount)      : undefined,
    pillars:     Array.isArray(body.pillars) ? body.pillars as string[] : undefined,
    sourceUrl:   body.sourceUrl   ? String(body.sourceUrl)   : undefined,
    source:      body.source      ? String(body.source)      : "Manual",
  };

  const scored = autoScore(prospect);
  const today  = new Date().toISOString().slice(0, 10);

  // 5. Build Airtable fields
  const pillarNames = scored.pillarsMatched
    .map(id => PILLAR_NAMES[id] ?? id)
    .join(", ");

  const notes = [
    `Source: ${scored.source}`,
    scored.sourceUrl  ? `URL: ${scored.sourceUrl}`                       : null,
    funder            ? `Funder: ${funder}`                              : null,
    scored.description ? `\nDescription:\n${scored.description.slice(0, 800)}` : null,
    pillarNames       ? `\nPillar Match: ${pillarNames}`                 : null,
    `\nScore Breakdown:`,
    `  Mission Fit:     ${scored.scores.missionFit}/5`,
    `  Award Size:      ${scored.scores.awardSize}/5`,
    `  Win Probability: ${scored.scores.winProbability}/5 (default)`,
    `  Timeline Fit:    ${scored.scores.timelineFit}/5`,
    `  Strategic Value: ${scored.scores.strategicValue}/5 (default)`,
    `  Weighted Score:  ${scored.weightedScore}`,
    `\nAuto-ingested: ${today}`,
  ].filter(Boolean).join("\n");

  const fields: Record<string, unknown> = {
    "Grant Name":        name.slice(0, 255),
    "Status":            "Prospect",
    "Source":            `${scored.source}-Ingest`,
    "Priority":          scored.priority,
    "Notes":             notes,
    "Submitting Entity": scored.entity,
    "Weighted Score":    scored.weightedScore,
    "Mission Fit":       scored.scores.missionFit,
    "Win Probability":   scored.scores.winProbability,
    "Timeline Fit":      scored.scores.timelineFit,
    "Strategic Value":   scored.scores.strategicValue,
    "Award Size":        scored.scores.awardSize,
  };

  if (scored.pillarsMatched.length > 0) {
    fields["Pillar"] = scored.pillarsMatched.slice(0, 1); // Airtable single-select array
  }
  if (prospect.amount && prospect.amount > 0) {
    fields["Award Amount Range"] = prospect.amount;
  }
  if (prospect.deadline) {
    fields["Deadline"] = prospect.deadline;
  }
  if (funder) {
    fields["Funder"] = funder;
  }
  if (prospect.sourceUrl) {
    fields["Funder Website"] = prospect.sourceUrl;
  }

  // 6. Create Airtable record
  let record: { id: string; fields: Record<string, unknown> };
  try {
    record = await airtableFetch("Opportunities", {
      method: "POST",
      body: JSON.stringify({ fields, typecast: true }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ingest] Airtable create failed:", msg);
    return NextResponse.json({ error: `Airtable error: ${msg}` }, { status: 500 });
  }

  // 7. Revalidate pipeline pages
  revalidatePath("/pipeline");
  revalidatePath("/");

  return NextResponse.json({
    id:           record.id,
    name,
    weightedScore: scored.weightedScore,
    priority:     scored.priority,
    pillars:      scored.pillarsMatched,
    alreadyExists: false,
  }, { status: 201 });
}

// ─── GET — health check / webhook info ───────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    endpoint:  "/api/ingest",
    method:    "POST",
    auth:      WEBHOOK_SECRET ? "x-webhook-secret header required" : "open (no secret set)",
    fields: {
      required: ["name"],
      optional: ["funder","description","deadline","amount","pillars","sourceUrl","source"],
    },
    scoring: {
      weights: { missionFit: "30%", awardSize: "20%", winProbability: "25%", timelineFit: "15%", strategicValue: "10%" },
      threshold: "3.5 (3.0 for P5 Founder grants)",
    },
  });
}
