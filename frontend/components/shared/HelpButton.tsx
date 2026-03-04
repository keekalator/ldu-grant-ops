"use client";

/**
 * HelpButton — floating "?" button that shows role-based SOP for the current page.
 * Uses UserContext for identity — always shows the right playbook automatically.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import PixelIcon from "@/components/shared/PixelIcon";
import { useUser, TEAM_MEMBERS, type TeamMember } from "@/lib/user-context";

// Map team member IDs to the helpId key used in ROLE_SOPS
function toHelpId(id: string): string {
  if (id.includes("Keith"))  return "kika-keith";
  if (id.includes("Howze"))  return "kika-howze";
  if (id.includes("Sheila")) return "sheila";
  return "kika-howze";
}

// ─── Page-specific SOPs per role ──────────────────────────────────────────────

type PageSOPs = Record<string, {
  title: string;
  steps: Array<{ icon: string; text: string }>;
  tip?: string;
}>;

const ROLE_SOPS: Record<string, PageSOPs> = {

  "kika-keith": {
    "/": {
      title: "YOUR HQ CHECKLIST",
      steps: [
        { icon: "alert",    text: "Check the red URGENT section at the top — act on anything overdue." },
        { icon: "pipeline", text: "Look at the Pipeline count — are grants moving forward?" },
        { icon: "quill",    text: "If Writing count is high, check with Kika Howze on drafts ready for your review." },
        { icon: "star",     text: "Check WINS — celebrate what's been awarded this cycle." },
      ],
      tip: "You only need to check this once a day. It takes 2 minutes.",
    },
    "/pipeline": {
      title: "PIPELINE — YOUR ROLE",
      steps: [
        { icon: "search",   text: "Look for grants in the IN REVIEW column — those need your approval." },
        { icon: "quill",    text: "Tap any IN REVIEW grant → read the draft → approve or leave a note." },
        { icon: "rocket",   text: "Grants in SENT means you should follow up with the funder. Check if you've called them." },
      ],
      tip: "Your main job here is approving packages in IN REVIEW and tracking your submitted grants.",
    },
    "/writing-queue": {
      title: "WRITING QUEUE — YOUR ROLE",
      steps: [
        { icon: "clock",    text: "Check the deadline column — anything due in 3 days or less needs immediate review." },
        { icon: "quill",    text: "Tap a grant → scroll to the writing plan → read the draft → leave approval in Comms Log." },
        { icon: "check",    text: "Once you approve, change the status to 'Submitted' in the detail page." },
      ],
      tip: "D-3 means 3 days before deadline. That's your window to review and approve.",
    },
    "/workflow": {
      title: "HOW THE SYSTEM WORKS",
      steps: [
        { icon: "lightning", text: "Agents run automatically every morning — they find and score grants without you." },
        { icon: "quill",     text: "Kika Howze reviews agent work and refines drafts. You only see finished packages." },
        { icon: "rocket",    text: "Your job: approve packages at D-3 and make relationship calls after submission." },
        { icon: "trophy",    text: "Everything here is automated. You're the strategic closer, not the researcher." },
      ],
    },
    "/funders": {
      title: "FUNDERS — YOUR ROLE",
      steps: [
        { icon: "building", text: "Use this page to look up a funder before you call them — check giving history and notes." },
        { icon: "star",     text: "After a call: log it in the funder's record so the relationship history stays current." },
        { icon: "rocket",   text: "If a funder shows strong interest → ask Kika Howze to prioritize that grant in the queue." },
      ],
      tip: "A warm funder relationship is worth 2× on the scoring model.",
    },
    "/awards": {
      title: "WINS — YOUR ROLE",
      steps: [
        { icon: "trophy",   text: "Send a thank-you to the program officer within 48 hours of any award." },
        { icon: "star",     text: "Share the win with the team — momentum matters." },
        { icon: "pipeline", text: "Ask the funder: what future opportunities should LDU be watching for?" },
        { icon: "rocket",   text: "Tap any awarded grant → check compliance notes from Sheila." },
      ],
    },
  },

  "kika-howze": {
    "/": {
      title: "YOUR DAILY HQ CHECKLIST",
      steps: [
        { icon: "alert",    text: "Check Urgent Alerts — anything overdue needs immediate attention." },
        { icon: "target",   text: "Check the Writing count — high numbers mean grants are waiting to be drafted." },
        { icon: "lightning", text: "Did you run the daily pipeline cycle today? (python scripts/run_pipeline.py --mode daily)" },
        { icon: "quill",    text: "Any grants in IN REVIEW that Kika Keith hasn't approved yet?" },
      ],
      tip: "Run the scrape cycle Mon/Thu. Run daily cycle every day. Takes 15 min total.",
    },
    "/pipeline": {
      title: "PIPELINE — YOUR ROLE",
      steps: [
        { icon: "search",   text: "SCOUT column: new grants agents found. Verify they're correctly categorized." },
        { icon: "target",   text: "QUALIFY column: check agent scoring decisions. Override if something looks wrong." },
        { icon: "quill",    text: "DRAFT column: trigger writing agents for anything in Writing status. Then refine drafts." },
        { icon: "check",    text: "After refining a draft → change status to IN REVIEW → Kika Keith takes it from there." },
      ],
      tip: "Your bottleneck is usually the DRAFT stage. Keep that queue moving.",
    },
    "/writing-queue": {
      title: "WRITING QUEUE — YOUR ROLE",
      steps: [
        { icon: "lightning", text: "For each grant here, trigger the writing agent: python scripts/run_pipeline.py --mode write" },
        { icon: "quill",    text: "Open Google Drive → find the draft → refine it (1-2 hrs per grant)." },
        { icon: "check",    text: "Done refining → go to the grant detail page → change status to IN REVIEW." },
        { icon: "bell",     text: "Tag Kika Keith in the Comms Log: 'Draft ready for D-3 review.'" },
      ],
      tip: "Don't wait until deadline day. Aim to have everything in IN REVIEW 5+ days out.",
    },
    "/workflow": {
      title: "AGENT MANAGEMENT CHECKLIST",
      steps: [
        { icon: "lightning", text: "MON + THU: Run --mode scrape to add new prospects." },
        { icon: "target",    text: "DAILY: Run --mode daily to screen and score new Prospects." },
        { icon: "quill",     text: "PER GRANT: Trigger writing agents, refine, move to IN REVIEW." },
        { icon: "chart",     text: "MONDAY: Run --mode weekly to check pipeline health." },
      ],
      tip: "If agents aren't running, the pipeline stops. Check the schedule on this page.",
    },
    "/funders": {
      title: "FUNDERS — YOUR ROLE",
      steps: [
        { icon: "building", text: "Keep funder profiles updated — relationship status, last contact, giving history." },
        { icon: "star",     text: "After Kika Keith makes a call → log it here. Update relationship status if it changed." },
        { icon: "search",   text: "Use this page to research funders before writing — understand their priorities." },
      ],
    },
    "/awards": {
      title: "WINS — YOUR ROLE",
      steps: [
        { icon: "trophy",   text: "Each win here may have compliance tasks. Tap the grant → check Notes." },
        { icon: "lightning", text: "Run writing agents on any grant needing a final report: --mode write --id [id]" },
        { icon: "quill",    text: "Update the grant description with actual program impact — useful for future applications." },
        { icon: "bell",     text: "Set up milestone reminders in Airtable Team Tasks for each award." },
      ],
    },
  },

  "sheila": {
    "/": {
      title: "YOUR HQ CHECKLIST",
      steps: [
        { icon: "bell",     text: "Check for any notes from Kika Howze tagging you in grant Comms Logs." },
        { icon: "building", text: "Check Team Tasks in Airtable — any compliance deadlines coming up?" },
        { icon: "check",    text: "For any government grants in progress — confirm registrations are current." },
      ],
      tip: "You're usually triggered by notes from Kika Howze. Check your tags daily.",
    },
    "/pipeline": {
      title: "PIPELINE — YOUR ROLE",
      steps: [
        { icon: "search",   text: "Look for grants with government funders (USDA, NEA, CalRecycle, Grants.gov)." },
        { icon: "building", text: "For government grants entering DRAFT stage — check if SAM.gov registration is current." },
        { icon: "check",    text: "When a government grant moves to SENT — note any compliance requirements for post-award." },
      ],
      tip: "You don't need to watch this every day — Kika Howze will tag you when action is needed.",
    },
    "/awards": {
      title: "WINS — YOUR ROLE",
      steps: [
        { icon: "trophy",   text: "Each win here may have compliance requirements. Tap the grant → check Notes section." },
        { icon: "check",    text: "Set up reporting schedules in Airtable Team Tasks for each award." },
        { icon: "clock",    text: "Log every compliance action in the grant's Comms Log with a timestamp." },
        { icon: "building", text: "For government awards — confirm registration status (SAM.gov, etc.) is current." },
      ],
      tip: "Post-award compliance is your highest priority. Missing a report deadline can cost future funding.",
    },
    "/workflow": {
      title: "YOUR ROLE IN THE SYSTEM",
      steps: [
        { icon: "bell",     text: "You are triggered by Kika Howze — she tags you when government paperwork is needed." },
        { icon: "building", text: "GOVERNMENT GRANTS: Handle SAM.gov, Grants.gov portal, state agency registrations." },
        { icon: "check",    text: "POST-AWARD: Complete compliance filings before each deadline. Log everything." },
        { icon: "quill",    text: "Always log your actions in the grant's Comms Log so the team has full visibility." },
      ],
    },
  },
};

// Fallback SOP if no page-specific one exists
function getSOPForPage(roleId: string, pathname: string) {
  const roleSops = ROLE_SOPS[roleId] ?? {};
  // Exact match first
  if (roleSops[pathname]) return roleSops[pathname];
  // Prefix match (e.g. /opportunity/recXXX → treat as grant detail)
  if (pathname.startsWith("/opportunity/")) {
    return {
      title: "GRANT DETAIL — YOUR ROLE",
      steps: roleId === "kika-keith" ? [
        { icon: "quill",    text: "Scroll to the WRITING PLAN section — Claude has already drafted a strategy. Review the narrative angle." },
        { icon: "check",    text: "If status is IN REVIEW → approve by moving status to Submitted." },
        { icon: "pipeline", text: "If submitted → log any funder calls in the Comms Log below." },
        { icon: "star",     text: "If awarded → celebrate, then let Sheila and Kika Howze handle compliance setup." },
      ] : roleId === "kika-howze" ? [
        { icon: "lightning", text: "Open the WRITING PLAN section — hit 'GENERATE PLAN' if it's empty. Claude will analyze and build a custom strategy." },
        { icon: "quill",     text: "Use the plan's Sections list to write each part. Fill in Description, Eligibility, and Why We Qualify fields above." },
        { icon: "check",     text: "When draft is done, move status to IN REVIEW and log a note tagging Kika Keith." },
        { icon: "target",    text: "Check the score — if Win Probability is low, flag it before investing writing hours." },
      ] : [
        { icon: "building",  text: "Check if this is a government grant — if yes, verify registration status in the Funder Intel section." },
        { icon: "check",     text: "If awarded, look for compliance requirements in the Notes and Writing Plan sections." },
        { icon: "quill",     text: "Log any actions you take in the Comms Log below so the team stays in sync." },
      ],
    };
  }
  // Generic fallback
  return {
    title: "QUICK REFERENCE",
    steps: [
      { icon: "home",   text: "HQ: Your daily dashboard. Check Urgent Alerts first." },
      { icon: "target", text: "Pipeline: All grants organized by stage. Tap any card for full details." },
      { icon: "quill",  text: "Writing: Grants being drafted right now." },
      { icon: "trophy", text: "Wins: Awarded and submitted grants." },
    ],
    tip: "Tap any grant card anywhere in the app to see full details and take action.",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpButton() {
  const pathname = usePathname();
  const { user, setUser } = useUser();
  const [open, setOpen] = useState(false);

  const roleId     = user ? toHelpId(user.id) : null;
  const selectedTeam = user
    ? { name: user.short, color: user.color, bg: user.bg, shadow: user.shadow }
    : null;
  const sop = roleId ? getSOPForPage(roleId, pathname) : null;

  return (
    <>
      {/* Floating help button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-2xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center transition-all active:translate-y-[2px] active:shadow-none"
        style={{ background: "#fff3a0", boxShadow: "4px 4px 0 #0a0a1a" }}
        aria-label="Help"
      >
        <span className="text-lg font-black text-[#0a0a1a]" style={{ fontFamily: "Orbitron, sans-serif" }}>?</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          style={{ background: "rgba(10,10,26,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl border-t-[3px] border-x-[3px] border-[#0a0a1a] overflow-hidden"
            style={{ background: "#fffbf0", maxHeight: "88vh", overflowY: "auto",
              boxShadow: "0 -6px 0 #0a0a1a" }}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2"
              style={{ background: "#fff3a0", borderBottom: "2px solid #0a0a1a" }}>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-[#0a0a1a]"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>?</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>WHAT DO I DO HERE?</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center"
                style={{ background: "#ffffff", boxShadow: "2px 2px 0 #0a0a1a" }}
              >
                <PixelIcon name="cross" size={12} color="#ff1e78" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">

              {/* Identity + switch */}
              <div>
                {user ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border-[2px] border-[#0a0a1a]"
                    style={{ background: user.bg, boxShadow: `2px 2px 0 ${user.shadow}` }}>
                    <div className="w-8 h-8 rounded-lg border-[1.5px] border-[#0a0a1a] flex items-center justify-center"
                      style={{ background: "#ffffff" }}>
                      <PixelIcon name="person" size={14} color={user.color} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black"
                        style={{ fontFamily: "Orbitron, sans-serif", color: user.color }}>
                        {user.id}
                      </p>
                      <p className="text-[9px] text-[#555566]">{user.role}</p>
                    </div>
                    {/* Switch user */}
                    <div className="flex gap-1.5">
                      {TEAM_MEMBERS.filter(m => m.id !== user.id).map(m => (
                        <button key={m.id}
                          onClick={() => setUser(m as TeamMember)}
                          className="text-[7px] font-black px-2 py-1 rounded-lg border-[1.5px] border-[#0a0a1a] transition-all active:translate-y-[1px]"
                          style={{ fontFamily: "Orbitron, sans-serif",
                            background: m.bg, color: m.color,
                            boxShadow: `1px 1px 0 ${m.shadow}` }}>
                          {m.short.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] font-black text-[#aaaacc] text-center"
                    style={{ fontFamily: "Orbitron, sans-serif" }}>
                    SELECT YOUR NAME TO SEE YOUR PLAYBOOK
                  </p>
                )}
              </div>

              {/* SOP steps */}
              {sop && (
                <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
                  style={{ boxShadow: `4px 4px 0 ${selectedTeam?.shadow ?? "#0a0a1a"}` }}>

                  {/* Title */}
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ background: selectedTeam?.bg ?? "#e8e8ee",
                      borderBottom: "2px solid #0a0a1a" }}>
                    <PixelIcon name="star" size={13} color={selectedTeam?.color ?? "#aaaacc"} />
                    <span className="text-[10px] font-black uppercase tracking-widest"
                      style={{ fontFamily: "Orbitron, sans-serif",
                        color: selectedTeam?.color ?? "#aaaacc" }}>
                      {sop.title}
                    </span>
                  </div>

                  {/* Steps */}
                  <div className="divide-y-[1.5px] divide-dashed divide-[#0a0a1a]/10"
                    style={{ background: "#fffbf0" }}>
                    {sop.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        <div className="w-7 h-7 rounded-lg border-[1.5px] border-[#0a0a1a] flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: selectedTeam?.bg ?? "#e8e8ee",
                            boxShadow: `1px 1px 0 ${selectedTeam?.shadow ?? "#0a0a1a"}` }}>
                          <PixelIcon name={step.icon as any} size={12}
                            color={selectedTeam?.color ?? "#aaaacc"} />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-black text-[#aaaacc] shrink-0"
                            style={{ fontFamily: "Orbitron, sans-serif" }}>{i + 1}.</span>
                          <p className="text-sm text-[#0a0a1a] leading-relaxed">{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tip */}
                  {sop.tip && (
                    <div className="px-4 py-3 flex items-start gap-2.5"
                      style={{ background: "#fff3a0", borderTop: "2px solid #0a0a1a" }}>
                      <PixelIcon name="star" size={11} color="#ffb800" />
                      <p className="text-xs text-[#0a0a1a] font-semibold leading-relaxed">
                        <span className="font-black">PRO TIP: </span>{sop.tip}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Full SOP link */}
              <a
                href="/workflow"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-[2.5px] border-[#0a0a1a] text-[10px] font-black uppercase tracking-wider transition-all active:translate-y-[1px]"
                style={{ fontFamily: "Orbitron, sans-serif",
                  background: "#e8d4ff", color: "#7c3aed",
                  boxShadow: "3px 3px 0 #7c3aed" }}
              >
                <PixelIcon name="lightning" size={11} color="#7c3aed" />
                SEE FULL WORKFLOW + ALL PLAYBOOKS
              </a>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
