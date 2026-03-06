import { NextRequest, NextResponse }  from "next/server";
import { fetchBestGrantPage }         from "@/lib/fetchGrantPage";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TOKEN   = process.env.AIRTABLE_API_TOKEN!;
const ANTHROPIC_KEY    = process.env.ANTHROPIC_API_KEY!;
const TABLE_NAME       = "Opportunities";

// ─── Fetch opportunity from Airtable ─────────────────────────────────────────

async function fetchRecord(id: string) {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${id}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

// ─── Save plan back to Airtable ───────────────────────────────────────────────

export interface SubmissionDoc {
  id: string;
  name: string;
  type: "narrative" | "form" | "attachment" | "letter" | "registration" | "other";
  required: boolean;
  notes: string;
  completed: boolean;
}

export interface SubmissionRequirements {
  applicationFormat: string;   // "LOI", "Full Application", "Online Portal + PDF", etc.
  submissionMethod: string;    // "Online portal", "Email", "Postal mail"
  portalUrl: string;           // direct application URL if known
  pageLimits: string;          // e.g. "Narrative: 5 pages, Budget: 2 pages"
  documents: SubmissionDoc[];
}

interface Plan {
  angle?: string;
  sections?: string[];
  themes?: string[];
  materials?: string[];
  estimatedHours?: number;
  winTips?: string[];
  approved?: boolean;
  draft?: string;
  submissionRequirements?: SubmissionRequirements;
}

function buildNextSteps(plan: Plan): string {
  const lines: string[] = [];
  if (plan.angle) {
    lines.push(`STRATEGY: ${plan.angle}`);
    lines.push("");
  }
  if (plan.sections?.length) {
    lines.push("SECTIONS TO WRITE:");
    plan.sections.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    lines.push("");
  }
  if (plan.materials?.length) {
    lines.push("MATERIALS TO PREPARE:");
    plan.materials.forEach(m => lines.push(`  • ${m}`));
    lines.push("");
  }
  if (plan.winTips?.length) {
    lines.push("WIN TIPS:");
    plan.winTips.forEach(t => lines.push(`  ★ ${t}`));
  }
  return lines.join("\n").trim();
}

async function saveplan(id: string, plan: Plan) {
  const nextSteps = buildNextSteps(plan);
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "Writing Plan": JSON.stringify(plan),
          "Next Steps": nextSteps,
        },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable PATCH ${res.status}: ${err}`);
  }
}

// ─── Build the Claude prompt ──────────────────────────────────────────────────

function buildPrompt(fields: Record<string, unknown>, pageText?: string | null, pageUrl?: string | null): string {
  const lines: string[] = [];
  if (fields["Grant Name"])          lines.push(`Grant Name: ${fields["Grant Name"]}`);
  const funder = fields["Funder Name"] ?? fields["Funder"];
  if (funder)                        lines.push(`Funder: ${funder}`);
  if (fields["Description"])         lines.push(`Description: ${fields["Description"]}`);
  if (fields["Pillar"])              lines.push(`LDU Pillars: ${(fields["Pillar"] as string[]).join(", ")}`);
  if (fields["Award Amount Range"])  lines.push(`Award Amount: $${Number(fields["Award Amount Range"]).toLocaleString()}`);
  if (fields["Deadline"])            lines.push(`Deadline: ${fields["Deadline"]}`);
  if (fields["Submitting Entity"])   lines.push(`Submitting Entity: ${fields["Submitting Entity"]}`);
  if (fields["Eligibility Notes"])   lines.push(`Eligibility (previously extracted): ${fields["Eligibility Notes"]}`);
  if (fields["Why We Qualify"])      lines.push(`Why LDU Qualifies (previously extracted): ${fields["Why We Qualify"]}`);
  if (fields["Source"])              lines.push(`Source: ${fields["Source"]}`);
  if (fields["Notes"])               lines.push(`Context: ${String(fields["Notes"]).slice(0, 400)}`);

  const grantDetails = lines.join("\n") || "No details available.";

  // Cap page content at 6 000 chars to leave plenty of output budget for the JSON
  const cappedPageText = pageText ? pageText.slice(0, 6_000) : null;
  const liveSection = cappedPageText
    ? `\nLIVE GRANT GUIDELINES (fetched from ${pageUrl ?? "funder website"}):\n─────────────────────────────────────────\n${cappedPageText}\n─────────────────────────────────────────\nUse the live content above as your PRIMARY source for required sections, page limits, and submission requirements.\n`
    : "";

  return `You are a senior grant writer for Life Development University (LDU), a 501(c)(3) nonprofit creative campus on Crenshaw Boulevard in Los Angeles.

Given the grant details and LIVE GUIDELINES below, generate a focused WRITING PLAN and SUBMISSION REQUIREMENTS checklist.
The live guidelines are the authoritative source — use them to extract real section names, page limits, and required documents.

GRANT DETAILS:
${grantDetails}
${liveSection}

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "angle": "The one strategic narrative angle that makes LDU the perfect fit — 2-3 sentences. Be specific to this funder's priorities.",
  "sections": [
    "Section Name: What to write here — be specific about content and tone"
  ],
  "themes": [
    "Theme to weave through the narrative — tied directly to this funder's language"
  ],
  "materials": [
    "Exact item to prepare or gather"
  ],
  "estimatedHours": 8,
  "winTips": [
    "Funder-specific tip that increases win probability"
  ],
  "submissionRequirements": {
    "applicationFormat": "What type of submission — e.g. 'Letter of Inquiry (LOI)', 'Full Application', 'Online Portal (Submittable)', 'Email to program officer', 'PDF via portal'",
    "submissionMethod": "How to submit — e.g. 'Online portal at [URL]', 'Email to grants@funder.org', 'Postal mail'",
    "portalUrl": "Direct URL to the application portal or guidelines page, or empty string if unknown",
    "pageLimits": "Page or word limits for narrative sections, e.g. '5-page narrative, 2-page budget narrative, 1-page org summary' — or 'Not specified' if unknown",
    "documents": [
      {
        "id": "1",
        "name": "Project Narrative",
        "type": "narrative",
        "required": true,
        "notes": "e.g. 5 pages max, double-spaced, 12pt font",
        "completed": false
      },
      {
        "id": "2",
        "name": "Itemized Budget",
        "type": "form",
        "required": true,
        "notes": "Use funder's budget template if provided",
        "completed": false
      },
      {
        "id": "3",
        "name": "IRS 501(c)(3) Determination Letter",
        "type": "attachment",
        "required": true,
        "notes": "LDU has this on file",
        "completed": false
      }
    ]
  }
}

Rules:
- sections: 3–6 items covering every required section of this application
- themes: 3–5 themes
- materials: everything needed (narratives, budget, letters, attachments, registrations)
- estimatedHours: realistic total writing hours (integer)
- winTips: 2–4 highly specific tips based on this funder's known preferences
- submissionRequirements.documents: list EVERY document this funder requires — narratives, forms, attachments, letters of support, reference letters, board lists, financials, registrations. Use type: "narrative" | "form" | "attachment" | "letter" | "registration" | "other"
- If you don't know something for certain, note "Verify on funder's website" rather than fabricating`;
}

// ─── POST — generate a new writing plan ──────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // 1. Fetch the opportunity
  const record = await fetchRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const fields = record.fields as Record<string, unknown>;

  // 2. Fetch the actual grant guidelines page
  const funderWebsite = fields["Funder Website"] as string | undefined;
  const sourceUrl     = fields["Source"]         as string | undefined;
  const pageResult    = await fetchBestGrantPage(funderWebsite, sourceUrl);

  console.log(
    `[writing-plan] ${id} — web fetch: ${pageResult?.success ? `✓ ${pageResult.finalUrl}` : "failed, using training data"}`
  );

  const prompt = buildPrompt(fields, pageResult?.text ?? null, pageResult?.finalUrl ?? null);

  // ── Claude call helper ────────────────────────────────────────────────────
  async function callClaude(messages: { role: string; content: string }[]) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 6000,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`Claude API error: ${await res.text()}`);
    return res.json();
  }

  // 3. Call Claude — with continuation if response is truncated
  let raw: string;
  try {
    const data1 = await callClaude([{ role: "user", content: prompt }]);
    raw = (data1.content?.[0]?.text ?? "").trim();
    const stopReason = data1.stop_reason;

    // Strip accidental markdown fences
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    // If truncated (hit max_tokens before closing the JSON), ask Claude to finish
    if (stopReason === "max_tokens" && raw.startsWith("{")) {
      const data2 = await callClaude([
        { role: "user",      content: prompt },
        { role: "assistant", content: raw },
        {
          role: "user",
          content:
            "Your JSON was cut off. Continue from exactly where you stopped — " +
            "output ONLY the remaining JSON text needed to complete and close the object. " +
            "Do not repeat what you already wrote. Do not add any explanation.",
        },
      ]);
      const continuation = (data2.content?.[0]?.text ?? "").trim();
      raw = raw + continuation;
      // Strip any fences that snuck into the continuation
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }
  } catch (e) {
    return NextResponse.json({ error: `Claude API error: ${e}` }, { status: 500 });
  }

  let plan: Plan;
  try {
    plan = JSON.parse(raw) as Plan;
    // Sanitize — ensure all array fields exist
    plan.sections  = Array.isArray(plan.sections)  ? plan.sections  : [];
    plan.themes    = Array.isArray(plan.themes)    ? plan.themes    : [];
    plan.materials = Array.isArray(plan.materials) ? plan.materials : [];
    plan.winTips   = Array.isArray(plan.winTips)   ? plan.winTips   : [];
    plan.estimatedHours = Number(plan.estimatedHours) || 4;
    plan.angle     = plan.angle ?? "";
    // Sanitize submission requirements
    if (plan.submissionRequirements) {
      const sr = plan.submissionRequirements as SubmissionRequirements;
      sr.applicationFormat = sr.applicationFormat ?? "Full Application";
      sr.submissionMethod  = sr.submissionMethod  ?? "See funder website";
      sr.portalUrl         = sr.portalUrl         ?? "";
      sr.pageLimits        = sr.pageLimits        ?? "Not specified";
      sr.documents = Array.isArray(sr.documents)
        ? sr.documents.map((d, i) => ({ ...d, id: d.id ?? String(i + 1), completed: false }))
        : [];
    }
  } catch {
    return NextResponse.json(
      { error: `Claude returned unparseable JSON. Try regenerating. Raw: ${raw.slice(0, 200)}` },
      { status: 500 }
    );
  }

  // 4. Save back to Airtable — log errors but don't fail the request
  try {
    await saveplan(id, plan);
  } catch (saveErr) {
    console.error("[writing-plan] Airtable save failed:", saveErr);
  }

  return NextResponse.json({ plan });
}

// ─── GET — return existing plan ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const record = await fetchRecord(params.id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = record.fields?.["Writing Plan"];
  if (!raw) return NextResponse.json({ plan: null });

  try {
    return NextResponse.json({ plan: JSON.parse(raw as string) });
  } catch {
    return NextResponse.json({ plan: null });
  }
}
