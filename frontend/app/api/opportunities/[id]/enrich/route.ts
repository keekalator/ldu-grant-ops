/**
 * POST /api/opportunities/[id]/enrich
 *
 * Fully automated grant research agent. Steps:
 *   1. Fetch the Airtable record
 *   2. Spider the funder's website — fetch homepage, discover grant sub-page
 *   3. Feed live page content + grant metadata to Claude
 *   4. Claude extracts grant intel AND evaluates which LDU entity has
 *      the highest win probability, using discernment from the guidelines
 *   5. Saves Description, Eligibility, Why [Entity] Qualifies,
 *      Funder Name, Funder Website, Submitting Entity back to Airtable
 *   6. Returns entity scores and multi-entity alert flag to the UI
 */

import { NextRequest, NextResponse }  from "next/server";
import { revalidatePath }             from "next/cache";
import { fetchBestGrantPage }         from "@/lib/fetchGrantPage";
import { ALL_ENTITIES_PROMPT }        from "@/lib/entityProfiles";
import { notifyMultiEntity }          from "@/lib/notify";

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
${pageText.slice(0, 7000)}
─────────────────────────────────────────
Use the content above as the PRIMARY source for eligibility, requirements, and deadlines.
`
    : `
NOTE: The funder's website could not be fetched. Use your training knowledge and flag
"Verify on funder's website" for any field you are not certain about.
`;

  return `
You are a grant analyst for the LDU family of organizations.
Read the live grant page content below and do TWO things:
  1. Extract key grant intel (description, eligibility, funder info, verification status)
  2. Evaluate which LDU entity has the highest win probability for THIS specific grant

═══ LDU ENTITY ROSTER ═══
${ALL_ENTITIES_PROMPT}
════════════════════════

GRANT RECORD:
- Name: ${name}
- Funder: ${funder}
- Pillars: ${pillars || "multiple"}
- Award Amount: ${amount ? `$${amount}` : "unknown"}
- Deadline: ${deadline || "unknown"}
- Source URL: ${source || "none"}
- Existing Notes: ${String(notes).slice(0, 300) || "none"}
${liveSection}

Return ONLY valid JSON (no markdown, no explanation) with EXACTLY these keys:

{
  "description": "2–3 sentences: what this grant funds, who the funder is, their priorities. Draw from the page content.",
  "eligibilityNotes": "Bullet list of every eligibility requirement. Start each bullet '• '. Flag requirements that might be a problem with '⚠️'.",
  "whyBestEntityQualifies": "2–3 sentences specifically why the BEST ENTITY you identified qualifies. Name the entity explicitly. Reference their specific programs, demographics, geography.",
  "funderName": "Official funder org name exactly as shown on the page",
  "funderWebsite": "Direct URL to this specific grant's guidelines or application page (most specific URL available)",
  "verified": true or false — true ONLY if the live page content explicitly mentions this grant OR your training data has clear specific knowledge of it,
  "verificationNotes": "One sentence: what evidence confirms this grant exists, or what is uncertain",
  "bestEntity": "Exact Airtable value of the winning entity — MUST be one of: LDU (501c3) | Studio WELEH | Gorilla Rx | Farm Entity | Kika Keith | Kika Howze | Weleh (Individual)",
  "multiEntityAlert": true or false — set true if 2 or more entities score 4 or above,
  "entityScores": [
    {
      "entity": "exact Airtable value",
      "score": 1-5,
      "eligible": true or false,
      "rationale": "one sentence explaining the score"
    }
  ]
}

ENTITY SCORING RULES:
- Score 5: This entity is THE target — explicitly eligible, demographics match exactly, mission is a perfect fit
- Score 4: Strong fit — clearly eligible, compelling alignment, competitive application
- Score 3: Eligible but not specifically targeted — could apply with a reasonable shot
- Score 2: Marginal — eligibility has caveats or significant gaps
- Score 1: Ineligible or mission mismatch — do not apply

SCORING GUIDANCE:
- If grant requires 501(c)(3): LDU scores 5, all non-nonprofit entities score 1-2
- If grant is for individual artists: Weleh (Individual) or Kika Keith likely scores highest
- If grant is for for-profit women/Black business: Gorilla Rx scores highest
- If grant is for agricultural/farm: Farm Entity scores highest
- If grant is for visual arts / textiles / sustainable fashion: Studio WELEH scores highest
- If grant is for founders (women, Black women): Kika Keith likely scores highest
- If grant targets young women in tech/innovation: Kika Howze likely scores highest
- Only list entities scoring 2+ in entityScores — skip clearly ineligible ones
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
  const funderWebsiteRaw = fields["Funder Website"] as string | undefined;
  const sourceUrlRaw     = fields["Source"]         as string | undefined;
  const pageResult = await fetchBestGrantPage(funderWebsiteRaw, sourceUrlRaw);

  console.log(
    `[enrich] ${id} — web fetch: ${pageResult?.success ? `✓ ${pageResult.finalUrl} (${pageResult.text.length} chars)` : "failed"}`
  );

  // ── 3. Call Claude ────────────────────────────────────────────────────────
  const prompt = buildPrompt(fields, pageResult?.text ?? null, pageResult?.finalUrl ?? null);

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 2500,
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

  interface EntityScore {
    entity: string;
    score: number;
    eligible: boolean;
    rationale: string;
  }

  let enriched: {
    description:            string;
    eligibilityNotes:       string;
    whyBestEntityQualifies: string;
    funderName:             string;
    funderWebsite:          string;
    verified:               boolean;
    verificationNotes:      string;
    bestEntity:             string;
    multiEntityAlert:       boolean;
    entityScores:           EntityScore[];
  };

  try {
    enriched = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: `Claude returned unparseable response. Raw: ${raw.slice(0, 300)}` },
      { status: 500 }
    );
  }

  // ── 4. Build Airtable patch ───────────────────────────────────────────────
  const bestWebsiteUrl =
    (pageResult?.discoveredGrantPage ? pageResult.finalUrl : null) ??
    (enriched.funderWebsite?.startsWith("http") ? enriched.funderWebsite : null) ??
    funderWebsiteRaw ??
    null;

  const verifiedFlag = enriched.verified !== false;

  // Prepend an unverified warning to eligibility notes when needed
  const eligibilityWithFlag = !verifiedFlag
    ? `⚠️ UNVERIFIED GRANT — ${enriched.verificationNotes}\n\n${enriched.eligibilityNotes}`
    : enriched.eligibilityNotes;

  // "Why We Qualify" copy is now entity-specific
  const whyQualifyText = enriched.whyBestEntityQualifies ?? "";

  // Multi-entity alert appended to Notes
  const existingNotes = String(fields["Notes"] ?? "").trim();
  let updatedNotes = existingNotes;
  if (enriched.multiEntityAlert) {
    const alertBlock = [
      "",
      "🔔 MULTI-ENTITY ALERT — Multiple entities are strong candidates for this grant:",
      ...(enriched.entityScores ?? [])
        .filter(s => s.score >= 4)
        .map(s => `  • ${s.entity} (${s.score}/5): ${s.rationale}`),
      "Review entity scores in Grant Intel before submitting.",
    ].join("\n");
    // Only append once — don't re-append if already present
    if (!existingNotes.includes("MULTI-ENTITY ALERT")) {
      updatedNotes = existingNotes + alertBlock;
    }
  }

  const patchFields: Record<string, unknown> = {
    "Description":       enriched.description,
    "Eligibility Notes": eligibilityWithFlag,
    "Why We Qualify":    whyQualifyText,
    "Notes":             updatedNotes || existingNotes,
  };

  // Only set Submitting Entity if Claude returned a valid value
  const validEntities = [
    "LDU (501c3)", "Studio WELEH", "Gorilla Rx", "Farm Entity",
    "Kika Keith", "Kika Howze", "Weleh (Individual)", "Life Development Group",
  ];
  if (enriched.bestEntity && validEntities.includes(enriched.bestEntity)) {
    patchFields["Submitting Entity"] = enriched.bestEntity;
  }
  if (enriched.funderName && enriched.funderName !== "Unknown") {
    patchFields["Funder Name"] = enriched.funderName;
  }
  if (bestWebsiteUrl) {
    patchFields["Funder Website"] = bestWebsiteUrl;
  }

  try {
    await airtableFetch(`${TABLE}/${id}`, {
      method: "PATCH",
      body:   JSON.stringify({ fields: patchFields, typecast: true }),
    });
  } catch (e) {
    console.error("[enrich] Airtable save failed:", e);
    return NextResponse.json({ error: `Airtable save failed: ${e}` }, { status: 500 });
  }

  // ── 5. Fire multi-entity push notification ───────────────────────────────
  if (enriched.multiEntityAlert && enriched.entityScores?.length) {
    const topEntities = enriched.entityScores
      .filter(s => s.score >= 4)
      .map(s => s.entity);
    if (topEntities.length >= 2) {
      const grantName = String(fields["Grant Name"] ?? "Grant");
      notifyMultiEntity(grantName, topEntities, id).catch(() => {});
    }
  }

  revalidatePath(`/opportunity/${id}`);

  return NextResponse.json({
    description:       enriched.description,
    eligibilityNotes:  eligibilityWithFlag,
    whyWeQualify:      whyQualifyText,
    funderName:        enriched.funderName,
    funderWebsite:     bestWebsiteUrl ?? enriched.funderWebsite,
    verified:          verifiedFlag,
    verificationNotes: enriched.verificationNotes ?? "",
    sourceFetched:     pageResult?.success ?? false,
    sourceUrl:         pageResult?.finalUrl ?? null,
    // Entity analysis
    bestEntity:        enriched.bestEntity ?? null,
    multiEntityAlert:  enriched.multiEntityAlert ?? false,
    entityScores:      enriched.entityScores ?? [],
  });
}
