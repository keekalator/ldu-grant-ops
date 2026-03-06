import Link from "next/link";
import PixelIcon from "@/components/shared/PixelIcon";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { getOpportunities } from "@/lib/airtable";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  {
    id: "scout",
    num: "01",
    name: "SCOUT",
    tagline: "Agents find grants",
    desc: "Every morning, AI agents scrape government databases, arts councils, and recycling agencies — plus Instrumentl pushes matches automatically. New grants land here with no human involvement.",
    icon: "search" as const,
    bg: "#e8d4ff",
    color: "#7c3aed",
    shadow: "#7c3aed",
    humanLevel: 0,
    agentLevel: 100,
    statuses: ["Prospect"],
    agents: [
      { name: "Grant Scraper",    desc: "Grants.gov · CA Arts · CalRecycle · LA County Arts",  icon: "search"    as const, schedule: "6 AM daily" },
      { name: "Instrumentl Sync", desc: "Matching alerts pushed via Make.com webhook",           icon: "lightning" as const, schedule: "Ongoing"   },
      { name: "Dupe Detector",    desc: "MD5 fingerprint check — skips grants already seen",     icon: "filter"    as const, schedule: "On receipt" },
    ],
    humanSOP: null,
    nextStage: "QUALIFY",
  },
  {
    id: "qualify",
    num: "02",
    name: "QUALIFY",
    tagline: "Agents screen + score",
    desc: "Agents check every prospect against LDU's eligibility rules, then score it on 5 weighted criteria. Grants that score 3.5+ automatically enter the writing queue. Everything else is parked or disqualified.",
    icon: "target" as const,
    bg: "#b8f0ff",
    color: "#0066cc",
    shadow: "#0066cc",
    humanLevel: 10,
    agentLevel: 90,
    statuses: ["Qualifying", "Scoring", "Scored — Parked", "Disqualified"],
    agents: [
      { name: "Eligibility Agent",  desc: "Checks 501c3 status, geography, certifications, size",    icon: "check"     as const, schedule: "8 AM daily" },
      { name: "Scoring Agent",      desc: "5-criteria weighted score (Mission Fit, Win Prob, etc.)",  icon: "chart"     as const, schedule: "8 AM daily" },
      { name: "Funder Intel Agent", desc: "Pulls giving history, relationship status, grant sizes",   icon: "building"  as const, schedule: "8 AM daily" },
    ],
    humanSOP: {
      person: "KIKA HOWZE",
      color: "#7c3aed",
      bg: "#e8d4ff",
      action: "Glance at Writing Queue after agents run — confirm scoring decisions make sense. Takes ~5 min.",
      frequency: "Weekly",
    },
    nextStage: "DRAFT",
  },
  {
    id: "draft",
    num: "03",
    name: "DRAFT",
    tagline: "Agents write · Humans refine · CEO approves",
    desc: "Claude AI writes the full application — narrative, budget, cover letter — in about 5 minutes. Kika Howze refines it (1-2 hrs). Kika Keith reviews and approves at D-3. Sheila handles any government portal submissions.",
    icon: "quill" as const,
    bg: "#fff3a0",
    color: "#ffb800",
    shadow: "#ffb800",
    humanLevel: 60,
    agentLevel: 40,
    statuses: ["Writing", "In Review"],
    agents: [
      { name: "Narrative Agent",  desc: "Writes program narrative using LDU boilerplate + grant prompts", icon: "quill"    as const, schedule: "On trigger" },
      { name: "Budget Agent",     desc: "Writes budget narrative aligned to award ask amount",            icon: "dollar"   as const, schedule: "On trigger" },
      { name: "QA Editor Agent",  desc: "Self-critique pass — catches gaps, weak claims, misalignment",  icon: "search"   as const, schedule: "On trigger" },
    ],
    humanSOP: {
      person: "KIKA HOWZE + KIKA KEITH",
      color: "#ff1e78",
      bg: "#ffe0e8",
      action: "Kika Howze refines the Claude draft in Google Drive → moves to 'In Review'. Kika Keith reads + approves at D-3 → moves to 'Submitted'. Sheila handles any government portal registration.",
      frequency: "Per grant",
    },
    nextStage: "SENT",
  },
  {
    id: "sent",
    num: "04",
    name: "SENT",
    tagline: "Agents track · Kika Keith calls",
    desc: "Once submitted, agents track the decision timeline and auto-schedule follow-up reminders. Make.com sends Kika Keith a text with the funder's contact info. The relationship call is the highest-ROI action in the whole process.",
    icon: "rocket" as const,
    bg: "#b8ffda",
    color: "#00a83a",
    shadow: "#00a83a",
    humanLevel: 40,
    agentLevel: 60,
    statuses: ["Submitted", "Active"],
    agents: [
      { name: "Tracker Agent",      desc: "Monitors Instrumentl + email for decision status updates",        icon: "search"   as const, schedule: "Ongoing"    },
      { name: "Relationship Agent", desc: "Schedules 30-day and 60-day follow-up reminders automatically",   icon: "bell"     as const, schedule: "Post-submit" },
      { name: "Make.com SMS",       desc: "Texts Kika Keith: funder name, contact, key talking points",      icon: "lightning" as const, schedule: "Post-submit" },
    ],
    humanSOP: {
      person: "KIKA KEITH",
      color: "#00a83a",
      bg: "#b8ffda",
      action: "Make strategic follow-up call to program officer within 2 weeks. Log the call in the grant's Comms Log in the dashboard using the GRANTOR CALL button.",
      frequency: "Per submission",
    },
    nextStage: "AWARDED",
  },
  {
    id: "done",
    num: "05",
    name: "AWARDED",
    tagline: "Agents handle compliance setup · Sheila executes",
    desc: "When a grant is awarded, the Compliance Agent reads the award letter, extracts all reporting deadlines and conditions, and auto-creates tasks. Sheila handles the filings. The team manages budget tracking.",
    icon: "trophy" as const,
    bg: "#ffd970",
    color: "#ff6b00",
    shadow: "#ffb800",
    humanLevel: 50,
    agentLevel: 50,
    statuses: ["Awarded"],
    agents: [
      { name: "Compliance Agent", desc: "Parses award letter → extracts deadlines, conditions, restrictions", icon: "check"    as const, schedule: "On award"  },
      { name: "Task Creator",     desc: "Auto-creates compliance tasks in Airtable Team Tasks table",         icon: "target"   as const, schedule: "On award"  },
      { name: "Make.com Webhook", desc: "Award onboarding trigger → team SMS + task setup",                  icon: "lightning" as const, schedule: "On award"  },
    ],
    humanSOP: {
      person: "SHEILA + KIKA HOWZE",
      color: "#ffb800",
      bg: "#fff3a0",
      action: "Sheila handles government compliance filings + reporting setup. Kika Howze configures budget tracking and milestone reminders in the dashboard.",
      frequency: "Per award",
    },
    nextStage: null,
  },
];

const AGENT_SCHEDULE = [
  { time: "6 AM daily",    name: "Scrape Cycle",       desc: "Grants.gov, CA Arts, CalRecycle, LA County Arts", color: "#7c3aed", bg: "#e8d4ff", icon: "search"   as const },
  { time: "8 AM daily",    name: "Daily Pipeline",     desc: "Screen + score all new Prospects",                color: "#0066cc", bg: "#b8f0ff", icon: "target"   as const },
  { time: "Friday 4 PM",   name: "CEO Summary",        desc: "Claude generates + texts weekly brief",            color: "#ff1e78", bg: "#ffe0e8", icon: "star"     as const },
  { time: "Ongoing",       name: "Make.com Watch",     desc: "7 automations — deadline alerts, SMS, webhooks",  color: "#00a83a", bg: "#b8ffda", icon: "lightning" as const },
  { time: "Ongoing",       name: "Tracker Agent",      desc: "Monitors Instrumentl for decision updates",       color: "#ffb800", bg: "#fff3a0", icon: "bell"     as const },
];

const TEAM_SOPS = [
  {
    name: "KIKA KEITH",
    role: "CEO / Founder",
    color: "#ff1e78",
    bg: "#ffe0e8",
    shadow: "#ff1e78",
    tagline: "Strategic approvals + funder relationships",
    weekly: "~35 min/week + calls",
    steps: [
      { icon: "alert"   as const, when: "Daily (2 min)",          action: "Open HQ → check red Urgent Alerts → act on anything overdue" },
      { icon: "quill"   as const, when: "D-3 review (~30 min)",   action: "Receive SMS → open dashboard → read In Review grant → approve or leave revision note → move to Submitted" },
      { icon: "pipeline" as const, when: "Within 2 weeks of submit", action: "Call program officer — confirm receipt, introduce LDU, ask about timeline → log in Comms Log" },
      { icon: "star"    as const, when: "Friday (5 min)",          action: "Read the Claude weekly summary SMS → no action needed unless flagged red" },
    ],
  },
  {
    name: "KIKA HOWZE",
    role: "Implementation Lead",
    color: "#7c3aed",
    bg: "#e8d4ff",
    shadow: "#7c3aed",
    tagline: "Runs the system. Keeps agents moving.",
    weekly: "~4-6 hrs/week",
    steps: [
      { icon: "lightning" as const, when: "Mon + Thu (15 min)",    action: "Run scrape cycle → check dashboard SCOUT column → confirm new prospects landed" },
      { icon: "target"    as const, when: "Daily (15 min)",        action: "Run daily pipeline → check Writing Queue → confirm agent scoring decisions" },
      { icon: "quill"     as const, when: "Per grant (1-2 hrs)",   action: "Trigger writing agents → open Google Drive draft → refine → move to In Review → tag Kika Keith" },
      { icon: "chart"     as const, when: "Monday (30 min)",       action: "Run weekly review → check pipeline health → look for bottlenecks → update funder intel if needed" },
    ],
  },
  {
    name: "SHEILA",
    role: "Ops",
    color: "#ffb800",
    bg: "#fff3a0",
    shadow: "#ffb800",
    tagline: "Government paperwork + post-award compliance",
    weekly: "As needed",
    steps: [
      { icon: "bell"    as const, when: "Trigger: Comms Log note", action: "Check dashboard for notes from Kika Howze saying 'SHEILA — action needed'" },
      { icon: "building" as const, when: "Government grants",      action: "Handle SAM.gov, Grants.gov, or state agency portal registration → log confirmation number in Comms Log" },
      { icon: "check"   as const, when: "Post-award",              action: "Check Team Tasks in Airtable → complete compliance filings before each deadline → log in Comms Log" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function XpBar({ human, agent }: { human: number; agent: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[7px] font-black w-12 text-right"
          style={{ fontFamily: "Orbitron, sans-serif", color: "#7c3aed" }}>AGENTS</span>
        <div className="flex-1 h-3 rounded-full border-[1.5px] border-[#0a0a1a] overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${agent}%`, background: "#7c3aed" }} />
        </div>
        <span className="text-[8px] font-black w-6"
          style={{ fontFamily: "Orbitron, sans-serif", color: "#7c3aed" }}>{agent}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[7px] font-black w-12 text-right"
          style={{ fontFamily: "Orbitron, sans-serif", color: "#ff1e78" }}>HUMANS</span>
        <div className="flex-1 h-3 rounded-full border-[1.5px] border-[#0a0a1a] overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${human}%`, background: "#ff1e78" }} />
        </div>
        <span className="text-[8px] font-black w-6"
          style={{ fontFamily: "Orbitron, sans-serif", color: "#ff1e78" }}>{human}%</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WorkflowPage() {
  // Pull live counts per stage
  let stageCounts: Record<string, number> = {};
  try {
    const records = await getOpportunities({ maxRecords: 500 });
    for (const r of records) {
      const s = (r.fields.Status as string) ?? "Prospect";
      stageCounts[s] = (stageCounts[s] ?? 0) + 1;
    }
  } catch { /* show zeros if Airtable unavailable */ }

  function countForStage(statuses: string[]) {
    return statuses.reduce((sum, s) => sum + (stageCounts[s] ?? 0), 0);
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#1565e8" }}>

      {/* ── Header ─────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 scanlines"
        style={{ background: "#fffbf0", borderBottom: "3px solid #0a0a1a" }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center float-pixel"
            style={{ background: "#e8d4ff", boxShadow: "3px 3px 0 #7c3aed" }}>
            <PixelIcon name="lightning" size={20} color="#7c3aed" glow />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#aaaacc]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>HOW IT WORKS</p>
            <h1 className="text-xl font-black text-[#0a0a1a] leading-none glitch-text"
              style={{ fontFamily: "Orbitron, sans-serif" }}>WORKFLOW</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl border-[2px] border-[#0a0a1a] btn-glow-lime"
            style={{ background: "#b8ffda", boxShadow: "2px 2px 0 #00a83a" }}>
            <PixelIcon name="lightning" size={10} color="#00a83a" glow />
            <span className="text-[8px] font-black neon-lime neon-flicker"
              style={{ fontFamily: "Orbitron, sans-serif" }}>AGENTS ACTIVE</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-2xl mx-auto space-y-6">

        {/* ── Intro banner ───────────────────────────── */}
        <ScrollReveal delay={0}>
        <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-5"
          style={{ background: "#fffbf0", boxShadow: "5px 5px 0 #0a0a1a" }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
              style={{ background: "#b8ffda", boxShadow: "2px 2px 0 #00a83a" }}>
              <PixelIcon name="rocket" size={18} color="#00a83a" glow />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] mb-1"
                style={{ fontFamily: "Orbitron, sans-serif" }}>THE MISSION</p>
              <p className="text-sm font-semibold text-[#0a0a1a] leading-relaxed">
                AI agents handle <span className="font-black">discovery, screening, scoring, and first drafts</span>. 
                The team focuses only on what requires human judgment — refining drafts, building relationships, and closing awards.
              </p>
              <p className="text-xs text-[#555566] mt-2">
                Target: <strong>50–65 applications/year</strong> · <strong>$6M–$10M</strong> in annual requests
              </p>
            </div>
          </div>
        </div>
        </ScrollReveal>

        {/* ── Pipeline stages ────────────────────────── */}
        <ScrollReveal delay={60}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PixelIcon name="pipeline" size={13} color="#fffbf0" glow />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#fffbf0]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>THE 5 STAGES</span>
          </div>

          <div className="space-y-4">
            {PIPELINE_STAGES.map((stage, idx) => {
              const count = countForStage(stage.statuses);
              return (
                <div key={stage.id}>
                  {/* Stage card */}
                  <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
                    style={{ boxShadow: `5px 5px 0 ${stage.shadow}` }}>

                    {/* Stage header */}
                    <div className="px-4 py-3 flex items-center gap-3"
                      style={{ background: stage.bg, borderBottom: "2.5px solid #0a0a1a" }}>
                      <div className="w-9 h-9 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
                        style={{ background: "#ffffff", boxShadow: `2px 2px 0 ${stage.shadow}` }}>
                        <PixelIcon name={stage.icon} size={16} color={stage.color} glow />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-[#0a0a1a] opacity-50"
                            style={{ fontFamily: "Orbitron, sans-serif" }}>{stage.num}</span>
                          <span className="text-sm font-black"
                            style={{
                              fontFamily: "'Press Start 2P', monospace",
                              fontSize: "10px",
                              color: stage.color,
                              textShadow: `0 0 5px ${stage.color}, 0 0 12px ${stage.color}60`,
                            }}>{stage.name}</span>
                        </div>
                        <p className="text-[10px] font-semibold text-[#0a0a1a] opacity-70">
                          {stage.tagline}
                        </p>
                      </div>
                      {/* Live count badge — links to the matching pipeline stage */}
                      <Link
                        href={`/pipeline?stage=${
                          stage.id === "scout"   ? "research"  :
                          stage.id === "qualify" ? "research"  :
                          stage.id === "draft"   ? "writing"   :
                          stage.id === "sent"    ? "submitted" : "closed"
                        }`}
                        className="flex flex-col items-center px-3 py-1.5 rounded-xl border-[2px] border-[#0a0a1a] shrink-0 transition-all active:translate-y-[1px]"
                        style={{ background: "#ffffff", boxShadow: `2px 2px 0 ${stage.shadow}` }}
                      >
                        <span className="text-lg font-black leading-none"
                          style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: "14px",
                            color: stage.color,
                            textShadow: `0 0 5px ${stage.color}, 0 0 12px ${stage.color}60`,
                          }}>
                          {count}
                        </span>
                        <span className="text-[6px] font-black text-[#aaaacc]"
                          style={{ fontFamily: "Orbitron, sans-serif" }}>ACTIVE</span>
                      </Link>
                    </div>

                    {/* Description + automation bar */}
                    <div className="px-4 py-3 space-y-3" style={{ background: "#fffbf0" }}>
                      <p className="text-xs text-[#555566] leading-relaxed">{stage.desc}</p>

                      {/* Automation level */}
                      <XpBar human={stage.humanLevel} agent={stage.agentLevel} />

                      {/* Agents list */}
                      <div className="space-y-2">
                        {stage.agents.map((a, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl border-[1.5px] border-[#0a0a1a]"
                            style={{ background: stage.bg, boxShadow: "1px 1px 0 #0a0a1a" }}>
                            <div className="w-6 h-6 rounded-lg border border-[#0a0a1a] flex items-center justify-center shrink-0"
                              style={{ background: "#ffffff" }}>
                              <PixelIcon name={a.icon} size={11} color={stage.color} glow />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] font-black text-[#0a0a1a]"
                                  style={{ fontFamily: "Orbitron, sans-serif" }}>{a.name}</span>
                                <span className="text-[7px] px-1.5 py-0.5 rounded border border-[#0a0a1a] font-black"
                                  style={{ fontFamily: "Orbitron, sans-serif",
                                    background: "#ffffff", color: stage.color }}>
                                  {a.schedule}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#555566] mt-0.5">{a.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Human SOP block */}
                      {stage.humanSOP && (
                        <div className="p-3 rounded-xl border-[2px] border-[#0a0a1a]"
                          style={{ background: stage.humanSOP.bg,
                            boxShadow: `2px 2px 0 ${stage.humanSOP.color}` }}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <PixelIcon name="person" size={11} color={stage.humanSOP.color} />
                            <span className="text-[9px] font-black uppercase tracking-wider"
                              style={{ fontFamily: "Orbitron, sans-serif",
                                color: stage.humanSOP.color }}>{stage.humanSOP.person}</span>
                            <span className="ml-auto text-[7px] px-2 py-0.5 rounded border border-[#0a0a1a] font-black"
                              style={{ fontFamily: "Orbitron, sans-serif",
                                background: "#ffffff", color: stage.humanSOP.color }}>
                              {stage.humanSOP.frequency}
                            </span>
                          </div>
                          <p className="text-xs text-[#0a0a1a] leading-relaxed">
                            {stage.humanSOP.action}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Connector arrow */}
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className="flex items-center justify-center py-1">
                      <div className="w-0.5 h-4" style={{ background: "#fffbf0", opacity: 0.5 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </ScrollReveal>

        {/* ── Agent schedule ──────────────────────────── */}
        <ScrollReveal delay={80}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PixelIcon name="clock" size={13} color="#fffbf0" glow />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#fffbf0]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>AGENT SCHEDULE</span>
          </div>

          <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
            style={{ background: "#fffbf0", boxShadow: "5px 5px 0 #0a0a1a" }}>
            <div className="px-4 py-3 border-b-[2px] border-[#0a0a1a]"
              style={{ background: "#e8d4ff" }}>
              <div className="flex items-center gap-2">
                <PixelIcon name="lightning" size={13} color="#7c3aed" glow />
                <span className="text-[10px] font-black neon-purple uppercase tracking-widest"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>RUNS AUTOMATICALLY — NO HUMAN TRIGGER</span>
              </div>
            </div>
            <div className="divide-y-[2px] divide-dashed divide-[#0a0a1a]/10">
              {AGENT_SCHEDULE.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
                    style={{ background: item.bg, boxShadow: `2px 2px 0 ${item.color}` }}>
                    <PixelIcon name={item.icon} size={14} color={item.color} glow />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-black text-[#0a0a1a]"
                        style={{ fontFamily: "Orbitron, sans-serif" }}>{item.name}</span>
                    </div>
                    <p className="text-[10px] text-[#555566]">{item.desc}</p>
                  </div>
                  <span className="text-[8px] font-black px-2 py-1 rounded-lg border-[1.5px] border-[#0a0a1a] shrink-0"
                    style={{ fontFamily: "Orbitron, sans-serif",
                      background: item.bg, color: item.color,
                      boxShadow: `1px 1px 0 ${item.color}` }}>
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </ScrollReveal>

        {/* ── Team SOPs ───────────────────────────────── */}
        <ScrollReveal delay={100}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PixelIcon name="person" size={13} color="#fffbf0" glow />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#fffbf0]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>TEAM PLAYBOOKS</span>
          </div>

          <div className="space-y-4">
            {TEAM_SOPS.map((member) => (
              <div key={member.name} className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
                style={{ boxShadow: `5px 5px 0 ${member.shadow}` }}>

                {/* Member header */}
                <div className="px-4 py-3 flex items-center gap-3"
                  style={{ background: member.bg, borderBottom: "2.5px solid #0a0a1a" }}>
                  <div className="w-10 h-10 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
                    style={{ background: "#ffffff", boxShadow: `2px 2px 0 ${member.shadow}` }}>
                    <PixelIcon name="person" size={16} color={member.color} glow />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black"
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: "9px",
                        color: member.color,
                        textShadow: `0 0 5px ${member.color}, 0 0 12px ${member.color}60`,
                      }}>{member.name}</p>
                    <p className="text-[10px] text-[#0a0a1a] opacity-60">{member.role} · {member.tagline}</p>
                  </div>
                  <span className="text-[8px] font-black px-2.5 py-1 rounded-xl border-[1.5px] border-[#0a0a1a] shrink-0"
                    style={{ fontFamily: "Orbitron, sans-serif",
                      background: "#ffffff", color: member.color,
                      boxShadow: `1px 1px 0 ${member.shadow}` }}>
                    {member.weekly}
                  </span>
                </div>

                {/* Steps */}
                <div className="px-4 py-2" style={{ background: "#fffbf0" }}>
                  {member.steps.map((step, i) => (
                    <div key={i}
                      className="flex items-start gap-3 py-3 border-b-[1.5px] border-dashed border-[#0a0a1a]/10 last:border-0">
                      <div className="w-7 h-7 rounded-lg border-[1.5px] border-[#0a0a1a] flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: member.bg, boxShadow: `1px 1px 0 ${member.shadow}` }}>
                        <PixelIcon name={step.icon} size={12} color={member.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[8px] font-black uppercase tracking-wider block mb-0.5"
                          style={{ fontFamily: "Orbitron, sans-serif", color: member.color }}>
                          {step.when}
                        </span>
                        <p className="text-xs text-[#0a0a1a] leading-relaxed">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        </ScrollReveal>

        {/* ── Run agents (Kika Howze) ─────────────────── */}
        <ScrollReveal delay={120}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PixelIcon name="play" size={13} color="#fffbf0" glow />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#fffbf0]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>RUN AGENTS</span>
            <span className="text-[8px] font-black px-2 py-0.5 rounded border border-[#fffbf0] text-[#fffbf0] opacity-60"
              style={{ fontFamily: "Orbitron, sans-serif" }}>IMPL. LEAD ONLY</span>
          </div>

          <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
            style={{ background: "#fffbf0", boxShadow: "5px 5px 0 #7c3aed" }}>
            <div className="px-4 py-3 border-b-[2px] border-[#0a0a1a]"
              style={{ background: "#e8d4ff" }}>
              <p className="text-[9px] font-black text-[#7c3aed] uppercase tracking-widest"
                style={{ fontFamily: "Orbitron, sans-serif" }}>
                MANUAL TRIGGERS — run these from a terminal or schedule via cron
              </p>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: "SCRAPE",   cmd: "python scripts/run_pipeline.py --mode scrape",  desc: "Add new prospects from public sources",        color: "#7c3aed", bg: "#e8d4ff" },
                { label: "QUALIFY",  cmd: "python scripts/run_pipeline.py --mode daily",   desc: "Screen + score all Prospect records",           color: "#0066cc", bg: "#b8f0ff" },
                { label: "REVIEW",   cmd: "python scripts/run_pipeline.py --mode weekly",  desc: "Pipeline health + upcoming deadlines summary",  color: "#ffb800", bg: "#fff3a0" },
                { label: "BRIEF",    cmd: "python scripts/run_pipeline.py --mode summary", desc: "Generate + text CEO the weekly brief",          color: "#ff1e78", bg: "#ffe0e8" },
              ].map((cmd) => (
                <div key={cmd.label} className="rounded-xl border-[2px] border-[#0a0a1a] overflow-hidden"
                  style={{ boxShadow: `2px 2px 0 ${cmd.color}` }}>
                  <div className="flex items-center gap-2 px-3 py-2"
                    style={{ background: cmd.bg, borderBottom: "1.5px solid #0a0a1a" }}>
                    <PixelIcon name="play" size={10} color={cmd.color} />
                    <span className="text-[9px] font-black"
                      style={{ fontFamily: "Orbitron, sans-serif", color: cmd.color }}>
                      RUN {cmd.label}
                    </span>
                    <span className="ml-auto text-[8px] text-[#0a0a1a] opacity-50">{cmd.desc}</span>
                  </div>
                  <div className="px-3 py-2" style={{ background: "#ffffff" }}>
                    <code className="text-[10px] text-[#0a0a1a] font-mono break-all">{cmd.cmd}</code>
                  </div>
                </div>
              ))}

              <p className="text-[9px] text-[#aaaacc] text-center"
                style={{ fontFamily: "Orbitron, sans-serif" }}>
                COMING SOON: One-tap run buttons directly from this screen
              </p>
            </div>
          </div>
        </div>
        </ScrollReveal>

      </div>
    </div>
  );
}
