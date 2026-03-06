/**
 * POST /api/opportunities/[id]/enrich
 *
 * Fully automated grant research agent. Steps:
 *   1. Fetch the Airtable record
 *   2. Spider the funder's actual website — fetches the homepage, discovers
 *      the grant sub-page, and returns clean text from both
 *   3. Feed the live page content + grant metadata to Claude
 *   4. Claude extracts: Description, Eligibility Notes, Why We Qualify,
 *      Funder Name, Funder Website URL
 *   5. Save all fields back to Airtable
 *
 * No manual input required from the team.
 */

import { NextRequest, NextResponse }  from "next/server";
import { revalidatePath }             from "next/cache";
import { fetchBestGrantPage }         from "@/lib/fetchGrantPage";

const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY?.trim();
const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN?.trim();
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID?.trim();
const TABLE          = "Opportunities";

async function airtableFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${path}`, {
    ...opts,
    headers: {
      Authorization:  `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── LDU context ─────────────────────────────────────────────────────────────

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

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  fields: Record<string, unknown>,
  pageText: string | null,
  pageUrl: string | null,
): string {
  const name     = fields["Grant Name"]         ?? "Unknown";
  const funder   = fields["Funder Name"] ?? fields["Funder"] ?? "Unknown";
  const notes    = fields["Notes"]               ?? "";
  const pillars  = (fields["Pillar"] as string[] | undefined)?.join(", ") ?? "";
  const amount   = fields["Award Amount Range"]  ?? "";
  const deadline = fields["Deadline"]            ?? "";
  const source   = fields["Source"]              ?? "";

  const liveSection = pageText
    ? `
LIVE CONTENT FETCHED FROM FUNDER'S WEBSITE (${pageUrl ?? "unknown URL"}):
─────────────────────────────────────────
${pageText}
─────────────────────────────────────────
Use the content above as the PRIMARY source for eligibility, requirements, and deadlines.
`
    : `
NOTE: The funder's website could not be fetched automatically. Use your training knowledge
about this funder to fill in as much as possible, and flag "Verify on funder's website"
for any field you are not certain about.
`;

  return `
You are a grant researcher for Life Development University (LDU).
Your job is to read the live grant page content below and extract key information.

${LDU_CONTEXT}

GRANT RECORD:
- Name: ${name}
- Funder: ${funder}
- Pillars: ${pillars || "multiple"}
- Award Amount: ${amount ? `$${amount}` : "unknown"}
- Deadline: ${deadline || "unknown"}
- Source URL: ${source || "none"}
- Existing Notes: ${String(notes).slice(0, 400) || "none"}
${liveSection}

Return ONLY valid JSON (no markdown fences, no explanation) with exactly these keys:

{
  "description": "2–3 sentences describing what this grant funds, who the funder is, and their stated priorities. Draw directly from the page content above if available.",
  "eligibilityNotes": "Bullet list of EVERY eligibility requirement found on the page. Start each bullet with '• '. Include: 501c3 status, geographic limits, org size/revenue limits, program focus requirements, exclusions. Flag any requirements LDU might not meet with '⚠️'.",
  "whyWeQualify": "2–3 sentences explaining specifically why LDU qualifies. Reference our programs, demographics, geography, and mission. Be honest about any gaps.",
  "funderName": "Official funder organization name exactly as it appears on the page",
  "funderWebsite": "The direct URL to this specific grant's application page or guidelines (from the page content above). Use the most specific URL available.",
  "verified": true or false — set true ONLY if the live page content above explicitly mentions this grant program by name OR your training data includes clear, specific knowledge of this grant's existence. Set false if you cannot confirm this grant program is real.",
  "verificationNotes": "One sentence: what evidence confirms this grant exists (e.g. 'Found on lacounty.gov/grants page'), OR what is uncertain (e.g. 'Could not find this grant program by name on the fetched page — verify at funder website before investing writing time')."
}
`.trim();
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  // ── 1. Fetch the Airtable record ─────────────────────────────────────────
  let record: { id: string; fields: Record<string, unknown> };
  try {
    record = await airtableFetch(`${TABLE}/${id}`);
  } catch (e) {
    return NextResponse.json({ error: `Record not found: ${e}` }, { status: 404 });
  }

  const fields = record.fields;

  // ── 2. Fetch the actual funder website ───────────────────────────────────
  // Run in parallel — don't let a slow/failing website block the whole route
  const funderWebsiteRaw = fields["Funder Website"] as string | undefined;
  const sourceUrlRaw     = fields["Source"]         as string | undefined;

  const pageResult = await fetchBestGrantPage(funderWebsiteRaw, sourceUrlRaw);

  console.log(
    `[enrich] ${id} — web fetch: ${pageResult?.success ? `✓ ${pageResult.finalUrl} (${pageResult.text.length} chars)` : "failed, using training data"}`
  );

  // ── 3. Call Claude with live page content ────────────────────────────────
  const prompt = buildPrompt(
    fields,
    pageResult?.text ?? null,
    pageResult?.finalUrl ?? null,
  );

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 1600,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return NextResponse.json({ error: `Claude error: ${err}` }, { status: 500 });
  }

  const claudeData = await claudeRes.json();
  let raw: string = claudeData.content?.[0]?.text ?? "";
  raw = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let enriched: {
    description:       string;
    eligibilityNotes:  string;
    whyWeQualify:      string;
    funderName:        string;
    funderWebsite:     string;
    verified:          boolean;
    verificationNotes: string;
  };
  try {
    enriched = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: `Claude returned unparseable response. Raw: ${raw.slice(0, 300)}` },
      { status: 500 }
    );
  }

  // ── 4. Save to Airtable ─────────────────────────────────────────────────
  // Prefer the discovered grant sub-page URL over Claude's suggestion
  const bestWebsiteUrl =
    (pageResult?.discoveredGrantPage ? pageResult.finalUrl : null) ??
    (enriched.funderWebsite?.startsWith("http") ? enriched.funderWebsite : null) ??
    funderWebsiteRaw ??
    null;

  // Prepend a verification warning to eligibility notes when unverified
  const verifiedFlag = enriched.verified !== false; // default true if Claude didn't return the field
  const eligibilityWithFlag = !verifiedFlag
    ? `⚠️ UNVERIFIED GRANT — ${enriched.verificationNotes}\n\n${enriched.eligibilityNotes}`
    : enriched.eligibilityNotes;

  const patchFields: Record<string, unknown> = {
    "Description":       enriched.description,
    "Eligibility Notes": eligibilityWithFlag,
    "Why We Qualify":    enriched.whyWeQualify,
  };
  if (enriched.funderName && enriched.funderName !== "Unknown") {
    patchFields["Funder Name"] = enriched.funderName;
  }
  if (bestWebsiteUrl) {
    patchFields["Funder Website"] = bestWebsiteUrl;
  }

  try {
    await airtableFetch(`${TABLE}/${id}`, {
      method: "PATCH",
      body:   JSON.stringify({ fields: patchFields }),
    });
  } catch (e) {
    console.error("[enrich] Airtable save failed:", e);
    return NextResponse.json({ error: `Airtable save failed: ${e}` }, { status: 500 });
  }

  revalidatePath(`/opportunity/${id}`);

  return NextResponse.json({
    description:       enriched.description,
    eligibilityNotes:  eligibilityWithFlag,
    whyWeQualify:      enriched.whyWeQualify,
    funderName:        enriched.funderName,
    funderWebsite:     bestWebsiteUrl ?? enriched.funderWebsite,
    verified:          verifiedFlag,
    verificationNotes: enriched.verificationNotes ?? "",
    sourceFetched:     pageResult?.success ?? false,
    sourceUrl:         pageResult?.finalUrl ?? null,
  });
}
