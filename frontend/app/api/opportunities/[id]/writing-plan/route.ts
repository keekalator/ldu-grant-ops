import { NextRequest, NextResponse } from "next/server";

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

interface Plan {
  angle?: string;
  sections?: string[];
  themes?: string[];
  materials?: string[];
  estimatedHours?: number;
  winTips?: string[];
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
  await fetch(
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
          "Next Steps": nextSteps,    // auto-populated from plan
        },
      }),
    }
  );
}

// ─── Build the Claude prompt ──────────────────────────────────────────────────

function buildPrompt(fields: Record<string, unknown>): string {
  const lines: string[] = [];
  if (fields["Grant Name"])          lines.push(`Grant Name: ${fields["Grant Name"]}`);
  if (fields["Funder Name"])         lines.push(`Funder: ${fields["Funder Name"]}`);
  if (fields["Description"])         lines.push(`Description: ${fields["Description"]}`);
  if (fields["Pillar"])              lines.push(`LDU Pillars: ${(fields["Pillar"] as string[]).join(", ")}`);
  if (fields["Award Amount Range"])  lines.push(`Award Amount: $${Number(fields["Award Amount Range"]).toLocaleString()}`);
  if (fields["Deadline"])            lines.push(`Deadline: ${fields["Deadline"]}`);
  if (fields["Submitting Entity"])   lines.push(`Submitting Entity: ${fields["Submitting Entity"]}`);
  if (fields["Eligibility Notes"])   lines.push(`Eligibility: ${fields["Eligibility Notes"]}`);
  if (fields["Why We Qualify"])      lines.push(`Why LDU Qualifies: ${fields["Why We Qualify"]}`);
  if (fields["Source"])              lines.push(`Source: ${fields["Source"]}`);
  if (fields["Notes"])               lines.push(`Context: ${String(fields["Notes"]).slice(0, 400)}`);

  const grantDetails = lines.join("\n") || "No details available.";

  return `You are a senior grant writer for Life Development University (LDU), a 501(c)(3) nonprofit creative campus on Crenshaw Boulevard in Los Angeles.

Given the grant details below, generate a focused WRITING PLAN that tells the team exactly how to win this grant. Be specific to this funder — not generic advice.

GRANT DETAILS:
${grantDetails}

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
  ]
}

Rules:
- sections: 3–6 items covering every required section of this application
- themes: 3–5 themes
- materials: everything needed (narratives, budget, letters, attachments, registrations)
- estimatedHours: realistic total writing hours (integer)
- winTips: 2–4 highly specific tips based on this funder's known preferences`;
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
  const prompt = buildPrompt(fields);

  // 2. Call Claude
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 500 });
  }

  const claudeData = await claudeRes.json();
  let raw: string = claudeData.content?.[0]?.text ?? "";

  // Strip accidental markdown fences
  raw = raw.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let plan: Plan;
  try {
    plan = JSON.parse(raw) as Plan;
  } catch {
    plan = {
      angle: raw.slice(0, 500),
      sections: [],
      themes: [],
      materials: [],
      estimatedHours: 0,
      winTips: [],
    };
  }

  // 3. Save back to Airtable
  await saveplan(id, plan);

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
