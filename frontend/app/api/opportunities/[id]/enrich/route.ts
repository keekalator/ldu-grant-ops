/**
 * POST /api/opportunities/[id]/enrich
 *
 * Claude agent that researches a grant and auto-fills:
 *   - Description       — what the grant funds and its purpose
 *   - Eligibility Notes — what LDU needs to meet + whether it qualifies
 *   - Why We Qualify    — LDU-specific qualification narrative
 *   - Funder            — confirmed funder name
 *
 * All fields are saved to Airtable and returned in the response.
 * The team can edit any field inline after generation.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY?.trim();
const AIRTABLE_TOKEN  = process.env.AIRTABLE_API_TOKEN?.trim();
const AIRTABLE_BASE   = process.env.AIRTABLE_BASE_ID?.trim();
const TABLE           = "Opportunities";

async function airtableFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── LDU context block injected into every prompt ────────────────────────────

const LDU_CONTEXT = `
ABOUT LDU (Life Development University):
- 501(c)(3) nonprofit on Crenshaw Blvd, South Los Angeles
- Co-founded by Kika Keith (CEO) and Kika Howze (Impl. Lead)
- Black women-owned and led
- Programs: AI/tech training, camera operating, music, vocational trades, youth development, re-entry workforce, entrepreneurship
- Studio WELEH: arts incubator, sustainable fashion/apparel, upcycling, content creation
- Agricultural Extension: Cultivation Campus in Yolo County (NorCal) — seasonal exchange, farming, clothing factory, trades
- Gorilla Rx Wellness: cannabis dispensary, social equity licensee
- Serves South LA, LA County, statewide CA; farm extends to Yolo County / Northern CA
- Revenue: early-stage nonprofit, scaling toward $10M annual pipeline
- Key narrative: "Culture as Cultivation" — growing food, people, and community as one act
`.trim();

// ─── Build Claude prompt ──────────────────────────────────────────────────────

function buildPrompt(fields: Record<string, unknown>): string {
  const name    = fields["Grant Name"]   ?? "Unknown";
  const funder  = fields["Funder"]       ?? fields["Funder Name"] ?? "Unknown";
  const notes   = fields["Notes"]        ?? "";
  const pillars = (fields["Pillar"] as string[] | undefined)?.join(", ") ?? "";
  const amount  = fields["Award Amount Range"] ?? "";
  const deadline = fields["Deadline"]    ?? "";

  return `
You are a grant researcher for Life Development University (LDU). Research this grant and return a JSON object.

${LDU_CONTEXT}

GRANT TO RESEARCH:
- Name: ${name}
- Funder: ${funder}
- Pillars: ${pillars}
- Award Amount: ${amount ? `$${amount}` : "unknown"}
- Deadline: ${deadline || "unknown"}
- Existing Notes: ${String(notes).slice(0, 600) || "none"}

Return ONLY valid JSON (no markdown fences) with exactly these keys:

{
  "description": "2–3 sentence description of what this grant funds, who the funder is, and what they prioritize. Be specific.",
  "eligibilityNotes": "Bullet list of key eligibility requirements (501c3 status, geography, org size, program focus). Start each bullet with '• '. Flag any requirements LDU might not meet.",
  "whyWeQualify": "2–3 sentences explaining specifically why LDU qualifies for this grant — reference our programs, demographics, geography, and mission alignment.",
  "funder": "The official funder organization name (confirm or correct if needed)"
}

Be factual and concise. If you don't know something, say "Research needed" rather than fabricating.
  `.trim();
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // 1. Fetch existing record
  let record: { id: string; fields: Record<string, unknown> };
  try {
    record = await airtableFetch(`${TABLE}/${id}`);
  } catch (e) {
    return NextResponse.json({ error: `Record not found: ${e}` }, { status: 404 });
  }

  // 2. Call Claude
  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 1200,
      messages:   [{ role: "user", content: buildPrompt(record.fields) }],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return NextResponse.json({ error: `Claude error: ${err}` }, { status: 500 });
  }

  const claudeData = await claudeRes.json();
  let raw: string = claudeData.content?.[0]?.text ?? "";
  raw = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let enriched: { description: string; eligibilityNotes: string; whyWeQualify: string; funder: string };
  try {
    enriched = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: `Claude returned unparseable response. Raw: ${raw.slice(0, 200)}` },
      { status: 500 }
    );
  }

  // 3. Save to Airtable
  const patchFields: Record<string, unknown> = {
    "Description":      enriched.description,
    "Eligibility Notes": enriched.eligibilityNotes,
    "Why We Qualify":   enriched.whyWeQualify,
  };
  if (enriched.funder && enriched.funder !== "Unknown") {
    patchFields["Funder"] = enriched.funder;
  }

  try {
    await airtableFetch(`${TABLE}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: patchFields }),
    });
  } catch (e) {
    console.error("[enrich] Airtable save failed:", e);
    return NextResponse.json({ error: `Airtable save failed: ${e}` }, { status: 500 });
  }

  revalidatePath(`/opportunity/${id}`);

  return NextResponse.json({
    description:      enriched.description,
    eligibilityNotes: enriched.eligibilityNotes,
    whyWeQualify:     enriched.whyWeQualify,
    funder:           enriched.funder,
  });
}
