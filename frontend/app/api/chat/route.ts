/**
 * POST /api/chat
 *
 * LDU Grant Operations AI Assistant.
 * Fetches live pipeline data from Airtable, injects it as context,
 * and returns a Claude response to the team's question.
 *
 * Body: {
 *   messages: { role: "user" | "assistant"; content: string }[]
 *   grantId?: string   — if on a specific grant page, include full context
 * }
 */

import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY?.trim();
const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN?.trim();
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID?.trim();

// ─── Airtable helpers ─────────────────────────────────────────────────────────

async function airtableFetch(path: string) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

// ─── Build live pipeline context ─────────────────────────────────────────────

async function buildPipelineContext(): Promise<string> {
  try {
    const fields = [
      "Grant Name","Status","Deadline","Priority","Pillar",
      "Award Amount Range","Weighted Score","Submitting Entity","Funder",
    ].map(f => `fields[]=${encodeURIComponent(f)}`).join("&");

    const data = await airtableFetch(`Opportunities?${fields}&maxRecords=200`);
    const records: Array<{ id: string; fields: Record<string, unknown> }> = data.records ?? [];

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Group by status
    const byStatus: Record<string, number> = {};
    const upcoming: string[] = [];
    const writingQueue: string[] = [];
    const highPriority: string[] = [];
    const inReview: string[] = [];

    for (const r of records) {
      const f        = r.fields;
      const status   = String(f.Status ?? "Unknown");
      const name     = String(f["Grant Name"] ?? "?");
      const deadline = f.Deadline ? String(f.Deadline) : null;
      const priority = String(f.Priority ?? "");
      const amount   = f["Award Amount Range"] ? `$${Number(f["Award Amount Range"]).toLocaleString()}` : "unknown";
      const score    = f["Weighted Score"] ? Number(f["Weighted Score"]).toFixed(1) : "?";
      const pillar   = Array.isArray(f.Pillar) ? f.Pillar.join(", ") : String(f.Pillar ?? "");
      const funder   = String(f.Funder ?? "");

      byStatus[status] = (byStatus[status] ?? 0) + 1;

      const daysLeft = deadline
        ? Math.floor((new Date(deadline).getTime() - today.getTime()) / 86400000)
        : null;

      const summary = `"${name}" | ${funder ? funder + " | " : ""}${pillar} | ${amount} | Score: ${score} | Deadline: ${deadline ?? "none"} (${daysLeft !== null ? daysLeft + "d" : "no deadline"}) | ${status}`;

      if (status === "Writing Queue")  writingQueue.push(summary);
      if (status === "Active")         inReview.push(summary);
      if (priority === "HIGH" && !["Awarded","Declined","Submitted","Disqualified"].includes(status)) {
        highPriority.push(summary);
      }
      if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 14 && !["Awarded","Declined","Submitted","Disqualified"].includes(status)) {
        upcoming.push(summary);
      }
    }

    const lines: string[] = [
      `TODAY: ${todayStr}`,
      `TOTAL GRANTS IN PIPELINE: ${records.length}`,
      ``,
      `STATUS BREAKDOWN:`,
      ...Object.entries(byStatus).map(([k, v]) => `  ${k}: ${v}`),
      ``,
    ];

    if (upcoming.length) {
      lines.push(`UPCOMING DEADLINES (next 14 days):`);
      upcoming.slice(0, 10).forEach(s => lines.push(`  • ${s}`));
      lines.push(``);
    }

    if (writingQueue.length) {
      lines.push(`WRITING QUEUE (${writingQueue.length} active drafts):`);
      writingQueue.forEach(s => lines.push(`  • ${s}`));
      lines.push(``);
    }

    if (inReview.length) {
      lines.push(`IN REVIEW / READY FOR KIKA (${inReview.length}):`);
      inReview.forEach(s => lines.push(`  • ${s}`));
      lines.push(``);
    }

    if (highPriority.length) {
      lines.push(`HIGH PRIORITY GRANTS:`);
      highPriority.slice(0, 15).forEach(s => lines.push(`  • ${s}`));
    }

    return lines.join("\n");
  } catch (e) {
    return `[Pipeline data unavailable: ${e}]`;
  }
}

async function getGrantContext(grantId: string): Promise<string> {
  try {
    const r = await airtableFetch(`Opportunities/${grantId}`);
    const f = r.fields ?? {};
    const lines = [
      `CURRENT GRANT CONTEXT:`,
      `Name: ${f["Grant Name"] ?? "?"}`,
      `Status: ${f.Status ?? "?"}`,
      `Funder: ${f.Funder ?? f["Funder Name"] ?? "?"}`,
      `Pillar: ${Array.isArray(f.Pillar) ? f.Pillar.join(", ") : f.Pillar ?? "?"}`,
      `Amount: ${f["Award Amount Range"] ? `$${Number(f["Award Amount Range"]).toLocaleString()}` : "unknown"}`,
      `Deadline: ${f.Deadline ?? "none"}`,
      `Priority: ${f.Priority ?? "?"}`,
      `Score: ${f["Weighted Score"] ?? f.Score ?? "not scored"}`,
      `Entity: ${f["Submitting Entity"] ?? "?"}`,
      f.Description        ? `Description: ${String(f.Description).slice(0, 400)}` : null,
      f["Eligibility Notes"] ? `Eligibility: ${String(f["Eligibility Notes"]).slice(0, 400)}` : null,
      f["Why We Qualify"]   ? `Why We Qualify: ${String(f["Why We Qualify"]).slice(0, 400)}` : null,
      f["Writing Plan"]     ? `Has Writing Plan: YES` : `Has Writing Plan: NO`,
      f["Disqualification Reason"] ? `DQ Reason: ${f["Disqualification Reason"]}` : null,
      f.Notes               ? `Notes (excerpt): ${String(f.Notes).slice(0, 300)}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  } catch {
    return "[Grant context unavailable]";
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

const LDU_SYSTEM = `
You are the LDU Grant Operations AI Assistant — an expert grant strategist embedded in the team's live dashboard.

ABOUT LDU (Life Development University):
- 501(c)(3) nonprofit, Crenshaw Blvd, South Los Angeles
- Co-founded by Kika Keith (CEO/Founder) and Kika Howze (Implementation Lead)
- Black women-owned and led nonprofit
- Programs: AI/tech training, camera operating, music, vocational trades, entrepreneurship, re-entry workforce, youth dev
- Studio WELEH: arts incubator, sustainable fashion/apparel, textile upcycling, content creation
- Agricultural Extension: Cultivation Campus in Yolo County, NorCal — seasonal exchange, farming, clothing factory, trades
- Gorilla Rx Wellness: cannabis dispensary, social equity licensee, women-owned
- Serves: South LA, LA County, California statewide; farm extends to Yolo County / NorCal

FUNDING PILLARS:
- P1: Capital Campaign — facility buildout (4241 Crenshaw) + farm land. Target $3.5M–$9M
- P2: Programming & Operations — AI/tech, music, vocational, re-entry, youth. Target $750K–$2M/yr
- P3: Studio WELEH — arts, apparel, sustainability. Target $400K–$1.2M/yr
- P4: Agricultural Extension & Manufacturing — farm, factory, trades. Target $2M–$5M
- P5: Founder & Enterprise — women/Black women/BIPOC/social equity founder grants. Target $50K–$200K/yr
- CROSS: Textile Sustainability / SB 707 — CalRecycle, circular economy. Target $500K–$2M over 3 years

SCORING MATRIX (weighted):
- Mission Fit: 30% (1–5, how well aligned with LDU pillars)
- Award Size: 20% (5 = $100K+, 4 = $50–100K, 3 = $25–50K, 2 = $10–25K, 1 = under $10K)
- Win Probability: 25% (5 = existing relationship, 3 = competitive, 1 = long shot)
- Timeline Fit: 15% (5 = 6+ weeks, 4 = 4–6wks, 3 = 2–4wks, 2 = 1–2wks, 1 = under 1wk)
- Strategic Value: 10% (5 = opens new pipeline, 3 = one-time)
- Threshold: 3.5+ enters Writing Queue (3.0+ for P5 Founder grants)

PRODUCTION CYCLE: 28-day rolling cycle. D-28 = scouting, D-21 = qualifying, D-14 = writing, D-3 = CEO review, D-0 = submit.

TEAM:
- Kika Keith (CEO): approves final packages, makes funder calls, D-3 review
- Kika Howze (Impl Lead): runs the system, manages pipeline, delivers packages
- Sheila: government paperwork and registrations
- Agents: AI automation for research, writing, follow-up

DISQUALIFICATION RULES (auto-DQ):
- Requires certification LDU doesn't have
- Geographic restriction outside LA County / California / national / Yolo County
- Award under $5K (unless P5 with strategic value)
- Deadline under 14 days AND complex application
- Requires unattainable matching funds

YOUR ROLE:
- Answer questions about grants, deadlines, strategy, and pipeline status
- Use the live pipeline data provided to give accurate, specific answers
- Help the team prioritize, qualify, and strategize
- Be concise and direct — this is an ops tool, not a research paper
- Use bullet points for lists, bold for grant names
- If asked about a specific grant not in the context, acknowledge you'd need to look it up
`.trim();

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json();
  const messages: { role: string; content: string }[] = body.messages ?? [];
  const grantId: string | undefined = body.grantId;

  if (!messages.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  // Build context (parallel fetch)
  const [pipelineCtx, grantCtx] = await Promise.all([
    buildPipelineContext(),
    grantId ? getGrantContext(grantId) : Promise.resolve(""),
  ]);

  const systemWithData = `${LDU_SYSTEM}\n\n--- LIVE PIPELINE DATA ---\n${pipelineCtx}${grantCtx ? `\n\n--- ${grantCtx}` : ""}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      system:     systemWithData,
      messages:   messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Claude error: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const data = await res.json();
  const reply = data.content?.[0]?.text ?? "No response";

  return NextResponse.json({ message: reply });
}
