"use client";

/**
 * ActionGuide — shows a "YOUR TURN" card on the grant detail page.
 * Based on the grant's current status, tells each team member exactly what to do next.
 * Reads saved role from localStorage so it personalizes automatically.
 */

import { useEffect, useState } from "react";
import PixelIcon from "@/components/shared/PixelIcon";

const STORAGE_KEY = "ldu_help_role";

// ─── Status-driven action map ─────────────────────────────────────────────────
// For each status, define who acts and what they do

interface ActionStep {
  icon: string;
  text: string;
  bold?: boolean;
}

interface RoleAction {
  person: string;
  shortName: string;
  color: string;
  bg: string;
  shadow: string;
  headline: string;
  steps: ActionStep[];
  tip?: string;
}

type StatusMap = Record<string, RoleAction[]>;

const STATUS_ACTIONS: StatusMap = {

  Prospect: [
    {
      person: "kika-howze", shortName: "KIKA H", color: "#7c3aed", bg: "#e8d4ff", shadow: "#7c3aed",
      headline: "AGENTS ARE ON IT",
      steps: [
        { icon: "lightning", text: "Agents will screen and score this prospect in the next daily cycle (8 AM).", bold: true },
        { icon: "target",    text: "If you want to speed it up: run --mode daily from your terminal." },
        { icon: "check",     text: "No action needed from you until the score comes back." },
      ],
      tip: "Prospects with score ≥ 3.5 auto-advance to Writing. You'll see it move.",
    },
  ],

  Qualifying: [
    {
      person: "kika-howze", shortName: "KIKA H", color: "#7c3aed", bg: "#e8d4ff", shadow: "#7c3aed",
      headline: "SCREENING IN PROGRESS",
      steps: [
        { icon: "target",    text: "Eligibility Agent is running — this grant is being checked against LDU's requirements." },
        { icon: "check",     text: "No action needed. Check back after the daily cycle completes." },
        { icon: "search",    text: "If it's been stuck here for more than 2 days, re-run --mode daily." },
      ],
    },
  ],

  Writing: [
    {
      person: "kika-howze", shortName: "KIKA H", color: "#7c3aed", bg: "#e8d4ff", shadow: "#7c3aed",
      headline: "YOUR TURN — TRIGGER WRITING AGENTS",
      steps: [
        { icon: "lightning", text: "Step 1: Trigger writing agents from your terminal:", bold: true },
        { icon: "quill",     text: "python scripts/run_pipeline.py --mode write --id [record_id]" },
        { icon: "quill",     text: "Step 2: Open Google Drive → find the draft → refine it (1-2 hours).", bold: true },
        { icon: "check",     text: "Step 3: Come back here → change status to IN REVIEW.", bold: true },
        { icon: "bell",      text: "Step 4: Log a note in Comms Log: 'Draft ready for Kika K review.'" },
      ],
      tip: "Aim to have drafts in IN REVIEW at least 5 days before the deadline.",
    },
    {
      person: "sheila", shortName: "SHEILA", color: "#ffb800", bg: "#fff3a0", shadow: "#ffb800",
      headline: "CHECK IF GOVERNMENT PAPERWORK NEEDED",
      steps: [
        { icon: "building",  text: "Is this a government funder (USDA, NEA, CalRecycle, Grants.gov)?", bold: true },
        { icon: "check",     text: "If yes — verify SAM.gov registration is current before the deadline." },
        { icon: "quill",     text: "Log your check in the Comms Log below." },
      ],
    },
  ],

  "In Review": [
    {
      person: "kika-keith", shortName: "KIKA K", color: "#ff1e78", bg: "#ffe0e8", shadow: "#ff1e78",
      headline: "YOUR TURN — D-3 REVIEW",
      steps: [
        { icon: "quill",     text: "Step 1: Read the Grant Description section above.", bold: true },
        { icon: "lightning", text: "Step 2: Scroll to the WRITING PLAN section — review the narrative angle and sections.", bold: true },
        { icon: "star",      text: "Step 3: Check Why We Qualify — does LDU's case sound strong?", bold: true },
        { icon: "rocket",    text: "Step 4a: APPROVE → scroll to STATUS → change to Submitted.", bold: true },
        { icon: "quill",     text: "Step 4b: NEED CHANGES → tap Comms Log → log a Team Note with specific feedback." },
      ],
      tip: "This review should take 20-30 minutes. If you're short on time, focus on the narrative and budget sections.",
    },
    {
      person: "kika-howze", shortName: "KIKA H", color: "#7c3aed", bg: "#e8d4ff", shadow: "#7c3aed",
      headline: "WAITING ON KIKA KEITH",
      steps: [
        { icon: "clock",     text: "Package is ready and waiting for Kika Keith's D-3 review.", bold: true },
        { icon: "bell",      text: "If it's within 3 days of deadline and no review yet — send Kika Keith a reminder." },
        { icon: "check",     text: "Make sure all fields in this record are filled in — empty fields look unfinished." },
      ],
    },
  ],

  Submitted: [
    {
      person: "kika-keith", shortName: "KIKA K", color: "#ff1e78", bg: "#ffe0e8", shadow: "#ff1e78",
      headline: "YOUR TURN — MAKE THE FOLLOW-UP CALL",
      steps: [
        { icon: "pipeline",  text: "Call the program officer within 2 weeks of submitting.", bold: true },
        { icon: "star",      text: "What to say: Confirm receipt, introduce LDU's mission, ask about their timeline." },
        { icon: "quill",     text: "After the call: log it in Comms Log using the GRANTOR CALL button below." },
        { icon: "clock",     text: "If no response in 30 days — a second follow-up is appropriate." },
      ],
      tip: "This call is the single highest-ROI action in the entire grant process. Don't skip it.",
    },
    {
      person: "kika-howze", shortName: "KIKA H", color: "#7c3aed", bg: "#e8d4ff", shadow: "#7c3aed",
      headline: "MONITORING — AGENTS WATCHING",
      steps: [
        { icon: "lightning",  text: "Tracker Agent is monitoring Instrumentl for a decision update." },
        { icon: "bell",       text: "Make.com will send an SMS alert if a decision comes through." },
        { icon: "check",      text: "No action needed unless Kika Keith asks for research on the funder." },
      ],
    },
  ],

  Active: [
    {
      person: "kika-keith", shortName: "KIKA K", color: "#ff1e78", bg: "#ffe0e8", shadow: "#ff1e78",
      headline: "ACTIVE — KEEP THE RELATIONSHIP WARM",
      steps: [
        { icon: "pipeline",  text: "This grant is active/under review. Keep the relationship warm.", bold: true },
        { icon: "star",      text: "Check in with the program officer every 30 days if no decision yet." },
        { icon: "quill",     text: "Log all contact in the Comms Log below." },
      ],
    },
  ],

  Awarded: [
    {
      person: "sheila", shortName: "SHEILA", color: "#ffb800", bg: "#fff3a0", shadow: "#ffb800",
      headline: "YOUR TURN — COMPLIANCE SETUP",
      steps: [
        { icon: "check",     text: "Step 1: Read the award letter — find all reporting requirements and deadlines.", bold: true },
        { icon: "building",  text: "Step 2: Handle any government portal registrations or updates needed.", bold: true },
        { icon: "clock",     text: "Step 3: Create reporting tasks in Airtable Team Tasks for each deadline.", bold: true },
        { icon: "quill",     text: "Step 4: Log everything in the Comms Log — confirmation numbers, dates, contacts." },
      ],
      tip: "Missing a compliance deadline can affect future funding from this funder. Set calendar reminders.",
    },
    {
      person: "kika-howze", shortName: "KIKA H", color: "#7c3aed", bg: "#e8d4ff", shadow: "#7c3aed",
      headline: "SET UP BUDGET TRACKING",
      steps: [
        { icon: "dollar",    text: "Set up budget tracking in the project management system.", bold: true },
        { icon: "bell",      text: "Configure milestone reminders for mid-grant check-ins." },
        { icon: "chart",     text: "Update the WINS page with the final award amount." },
      ],
    },
    {
      person: "kika-keith", shortName: "KIKA K", color: "#ff1e78", bg: "#ffe0e8", shadow: "#ff1e78",
      headline: "CELEBRATE + THANK THE FUNDER",
      steps: [
        { icon: "trophy",    text: "Send a thank-you note to the program officer within 48 hours.", bold: true },
        { icon: "star",      text: "Share the win internally — this builds team momentum." },
        { icon: "rocket",    text: "Ask the program officer: what future opportunities should LDU watch for?" },
      ],
    },
  ],

  Declined: [
    {
      person: "kika-howze", shortName: "KIKA H", color: "#7c3aed", bg: "#e8d4ff", shadow: "#7c3aed",
      headline: "POST-DECLINE REVIEW",
      steps: [
        { icon: "search",    text: "Find out why it was declined if possible — call the program officer.", bold: true },
        { icon: "quill",     text: "Log the reason in the Comms Log and the Funder's profile page." },
        { icon: "target",    text: "Decide: re-queue for next cycle? Or move to archive?" },
        { icon: "star",      text: "Update the funder's relationship status in the Funders tab." },
      ],
      tip: "Declines are data. Understanding why helps the agent score future opportunities more accurately.",
    },
  ],

  Rejected: [
    {
      person: "kika-howze", shortName: "KIKA H", color: "#7c3aed", bg: "#e8d4ff", shadow: "#7c3aed",
      headline: "POST-REJECTION REVIEW",
      steps: [
        { icon: "search",    text: "If possible, request feedback from the funder.", bold: true },
        { icon: "quill",     text: "Log the rejection reason in the Comms Log and the Funder profile." },
        { icon: "target",    text: "Could this grant be improved and re-submitted next cycle?" },
      ],
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ActionGuideProps {
  status: string;
  grantName: string;
}

export default function ActionGuide({ status, grantName }: ActionGuideProps) {
  const [roleId,    setRoleId]    = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRoleId(saved);
    } catch {}
  }, []);

  const actions = STATUS_ACTIONS[status];
  if (!actions?.length) return null;

  // If we know the user's role, show only their action. Otherwise show all.
  const relevant = roleId
    ? (actions.filter(a => a.person === roleId).length > 0
        ? actions.filter(a => a.person === roleId)
        : actions)
    : actions;

  return (
    <div className="space-y-2">
      {/* Section header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 group"
      >
        <div className="w-2 h-2 rounded-full animate-ping"
          style={{ background: relevant[0]?.color ?? "#00a83a", animationDuration: "1.5s" }} />
        <div className="w-2 h-2 rounded-full -ml-4"
          style={{ background: relevant[0]?.color ?? "#00a83a" }} />
        <span className="text-[9px] font-black uppercase tracking-widest ml-1"
          style={{ fontFamily: "Orbitron, sans-serif",
            color: relevant[0]?.color ?? "#fffbf0" }}>
          ACTION NEEDED
        </span>
        <div className="flex-1 h-[2px] rounded opacity-30"
          style={{ background: relevant[0]?.color ?? "#fffbf0" }} />
        <PixelIcon
          name="arrow_right"
          size={10}
          color={relevant[0]?.color ?? "#fffbf0"}
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && relevant.map((action, idx) => (
        <div key={idx}
          className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
          style={{ boxShadow: `4px 4px 0 ${action.shadow}` }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2.5"
            style={{ background: action.bg, borderBottom: "2px solid #0a0a1a" }}>
            <div className="w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
              style={{ background: "#ffffff", boxShadow: `2px 2px 0 ${action.shadow}` }}>
              <PixelIcon name="person" size={14} color={action.color} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[8px] font-black block"
                style={{ fontFamily: "Orbitron, sans-serif", color: action.color }}>
                {action.shortName} — {action.headline}
              </span>
            </div>
            {!roleId && (
              <span className="text-[7px] px-2 py-0.5 rounded border border-[#0a0a1a] font-black shrink-0"
                style={{ fontFamily: "Orbitron, sans-serif",
                  background: "#ffffff", color: action.color }}>
                {idx === 0 ? "PRIMARY" : "SECONDARY"}
              </span>
            )}
          </div>

          {/* Steps */}
          <div className="divide-y-[1.5px] divide-dashed divide-[#0a0a1a]/10"
            style={{ background: "#fffbf0" }}>
            {action.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                <div className="w-6 h-6 rounded-lg border-[1.5px] border-[#0a0a1a] flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: action.bg, boxShadow: `1px 1px 0 ${action.shadow}` }}>
                  <PixelIcon name={step.icon as any} size={11} color={action.color} />
                </div>
                <p className={`text-sm leading-relaxed ${step.bold ? "font-bold text-[#0a0a1a]" : "text-[#555566]"}`}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          {/* Tip */}
          {action.tip && (
            <div className="px-4 py-2.5 flex items-start gap-2"
              style={{ background: "#fff3a0", borderTop: "2px solid #0a0a1a" }}>
              <PixelIcon name="star" size={10} color="#ffb800" />
              <p className="text-xs text-[#0a0a1a] leading-relaxed">
                <span className="font-black">TIP: </span>{action.tip}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* "Not your turn" message when role is set but no action for them */}
      {roleId && actions.length > 0 && actions.filter(a => a.person === roleId).length === 0 && (
        <div className="rounded-2xl border-[2.5px] border-dashed border-[#0a0a1a] px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.5)" }}>
          <PixelIcon name="check" size={14} color="#00a83a" />
          <div>
            <p className="text-[9px] font-black text-[#00a83a]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>NOT YOUR TURN</p>
            <p className="text-xs text-[#555566]">
              {actions.map(a => a.shortName).join(" + ")} will handle this stage.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
