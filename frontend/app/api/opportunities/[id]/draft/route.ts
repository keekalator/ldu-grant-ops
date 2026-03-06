/**
 * POST /api/opportunities/[id]/draft
 *
 * Triggered when a writing plan is approved.
 * Claude reads the full grant context + approved writing plan and writes
 * each section of the actual grant application narrative.
 *
 * Saves the draft back into the Writing Plan JSON (plan.draft) and
 * sets plan.approved = true in Airtable.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath }            from "next/cache";
import { fetchBestGrantPage }        from "@/lib/fetchGrantPage";
import { buildEntityContext }        from "@/lib/entityProfiles";

const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY?.trim();
const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN?.trim();
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID?.trim();
const TABLE          = "Opportunities";

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

// ─── Draft prompt ─────────────────────────────────────────────────────────────

function buildDraftPrompt(
  fields: Record<string, unknown>,
  plan: Record<string, unknown>,
  pageText?: string | null,
  pageUrl?: string | null,
): string {
  const name        = fields["Grant Name"]          ?? "Unnamed Grant";
  const funder      = fields["Funder Name"] ?? fields["Funder"] ?? "Unknown Funder";
  const description = fields["Description"]          ?? "";
  const eligibility = fields["Eligibility Notes"]    ?? "";
  const whyQualify  = fields["Why We Qualify"]       ?? "";
  const pillars     = (fields["Pillar"] as string[] | undefined)?.join(", ") ?? "";
  const amount      = fields["Award Amount Range"]   ?? "";
  const deadline    = fields["Deadline"]             ?? "";
  const entity      = (fields["Submitting Entity"] as string | undefined) ?? "LDU (501c3)";
  const notes       = String(fields["Notes"] ?? "").slice(0, 500);

  // Use the actual submitting entity's context, not a generic LDU description
  const entityContext = buildEntityContext(entity);

  const angle    = plan.angle    ?? "";
  const sections = (plan.sections as string[] | undefined) ?? [];
  const themes   = (plan.themes  as string[] | undefined)  ?? [];
  const winTips  = (plan.winTips as string[] | undefined)  ?? [];

  return `
You are a senior grant writer working on behalf of ${entity}. Write the complete grant application narrative for the grant below.

${entityContext}

GRANT DETAILS:
- Grant Name: ${name}
- Funder: ${funder}
- Submitting Entity: ${entity}
- Award Amount: ${amount ? `$${Number(amount).toLocaleString()}` : "see application"}
- Deadline: ${deadline || "see application"}
- LDU Pillars: ${pillars || "multiple"}

RESEARCH ALREADY COMPLETED:
Description: ${description || "See grant name"}
Eligibility: ${eligibility || "501(c)(3) required"}
Why LDU Qualifies: ${whyQualify || "Strong mission alignment"}
Additional Context: ${notes || "none"}

APPROVED WRITING PLAN:
Narrative Angle: ${angle}

Sections to write:
${sections.map((s, i) => `  ${i + 1}. ${s}`).join("\n") || "  1. Organization Overview\n  2. Project Description\n  3. Goals & Outcomes\n  4. Budget Narrative"}

Key themes to weave throughout:
${themes.map(t => `  • ${t}`).join("\n") || "  • Community impact\n  • Workforce development"}

Win tips from the approved plan:
${winTips.map(t => `  ★ ${t}`).join("\n") || "  ★ Be specific and mission-aligned"}

${pageText ? `LIVE GRANT GUIDELINES (fetched from ${pageUrl ?? "funder website"}):\n─────────────────────────────────────────\n${pageText}\n─────────────────────────────────────────\nUse the guidelines above to match the funder's exact section names, tone, and stated priorities.\n` : ""}

INSTRUCTIONS:
Write the complete grant narrative following the approved plan exactly. For each section in the plan:
- Use the section name as a bold header (e.g., **Organization Overview**)
- Write 2–4 substantive paragraphs per section
- Follow the narrative angle throughout — every section should reinforce it
- Weave in the key themes naturally
- Be specific to THIS funder's priorities, not generic
- Write entirely from the perspective of ${entity} — use "we" / "our organization" / the entity's name
- Write in a confident, professional grant writing voice
- Ground claims in the entity's real programs, demographics, and geography
- Do NOT invent statistics — use phrases like "participants served" or "community members" without fabricating numbers
- End with a strong closing paragraph

Write the full draft now. Do not add preamble, explanations, or instructions — output only the grant narrative text.
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

  // 1. Fetch opportunity record
  let record: { id: string; fields: Record<string, unknown> };
  try {
    record = await airtableFetch(`${TABLE}/${id}`);
  } catch (e) {
    return NextResponse.json({ error: `Record not found: ${e}` }, { status: 404 });
  }

  const fields = record.fields;

  // 2. Parse existing writing plan
  let plan: Record<string, unknown> = {};
  const rawPlan = fields["Writing Plan"] as string | undefined;
  if (rawPlan) {
    try { plan = JSON.parse(rawPlan); } catch { /* use empty plan */ }
  }

  // 3. Fetch live grant guidelines
  const funderWebsite = fields["Funder Website"] as string | undefined;
  const sourceUrl     = fields["Source"]         as string | undefined;
  const pageResult    = await fetchBestGrantPage(funderWebsite, sourceUrl);

  console.log(
    `[draft] ${id} — web fetch: ${pageResult?.success ? `✓ ${pageResult.finalUrl}` : "failed"}`
  );

  // 4. Call Claude to write the draft
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-opus-4-5",
      max_tokens: 4096,
      messages:   [{ role: "user", content: buildDraftPrompt(fields, plan, pageResult?.text, pageResult?.finalUrl) }],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return NextResponse.json({ error: `Claude error: ${err}` }, { status: 500 });
  }

  const claudeData = await claudeRes.json();
  const draft: string = claudeData.content?.[0]?.text?.trim() ?? "";

  if (!draft) {
    return NextResponse.json({ error: "Claude returned an empty draft" }, { status: 500 });
  }

  // 5. Save approved plan + draft back to Airtable
  const updatedPlan = { ...plan, approved: true, draft };

  try {
    await airtableFetch(`${TABLE}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          "Writing Plan": JSON.stringify(updatedPlan),
          "Status": "Writing Queue",
        },
      }),
    });
  } catch (e) {
    console.error("[draft] Airtable save failed:", e);
    // Still return the draft to the client even if save failed
  }

  revalidatePath(`/opportunity/${id}`);

  return NextResponse.json({ draft, approved: true });
}
