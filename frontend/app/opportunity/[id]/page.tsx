import { getBaseUrl } from "@/lib/base-url";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatusUpdater     from "@/components/opportunity/StatusUpdater";
import CommsLog          from "@/components/opportunity/CommsLog";
import FieldEditor       from "@/components/opportunity/FieldEditor";
import ActionGuide       from "@/components/opportunity/ActionGuide";
import WritingPlanPanel  from "@/components/opportunity/WritingPlanPanel";
import PixelIcon      from "@/components/shared/PixelIcon";
import { formatCurrency, formatDeadline, daysUntilDeadline, abbreviatePillar } from "@/lib/utils";
import { getEntityStyle } from "@/lib/entities";
import type { Opportunity, Priority } from "@/types";

async function getOpportunity(id: string): Promise<Opportunity | null> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/opportunities/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<Opportunity>;
  } catch { return null; }
}

// ─── Section Header ───────────────────────────────────────────────────────────

function Section({ icon, label, iconBg, children }: {
  icon: string; label: string; iconBg: string; children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center"
          style={{ background: iconBg, boxShadow: "2px 2px 0 #0a0a1a" }}>
          <PixelIcon name={icon as any} size={13} color="#0a0a1a" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]"
          style={{ fontFamily: "Orbitron, sans-serif" }}>{label}</span>
      </div>
      {children}
    </section>
  );
}

// ─── Editable field row ───────────────────────────────────────────────────────

function EditRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b-[2px] border-dashed border-[#0a0a1a]/10 last:border-0">
      <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
        <PixelIcon name={icon as any} size={11} color="#aaaacc" />
        <span className="text-[9px] font-black uppercase tracking-wider text-[#aaaacc]"
          style={{ fontFamily: "Orbitron, sans-serif" }}>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-black text-[#0a0a1a] w-8 shrink-0"
        style={{ fontFamily: "Orbitron, sans-serif" }}>{value}/{max}</span>
      <div className="flex-1 xp-track max-w-[80px]">
        <div className="xp-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Deadline banner ──────────────────────────────────────────────────────────

function DeadlineBanner({ deadline, status }: { deadline?: string; status: string }) {
  if (!deadline || ["Awarded","Declined","Rejected"].includes(status)) return null;
  const days = daysUntilDeadline(deadline);
  if (days >= 8) return null;

  const isOverdue = days < 0;
  return (
    <div className="rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3 flex items-center gap-3"
      style={{
        background: isOverdue ? "#ffe0e8" : "#fff8d0",
        boxShadow: isOverdue ? "4px 4px 0 #ff1e78" : "4px 4px 0 #ffe100",
      }}>
      <span className="relative flex h-3.5 w-3.5 shrink-0">
        <span className="animate-ping absolute h-full w-full rounded-full opacity-75"
          style={{ background: isOverdue ? "#ff1e78" : "#ffa500" }} />
        <span className="relative rounded-full h-3.5 w-3.5 border-[2px] border-[#0a0a1a]"
          style={{ background: isOverdue ? "#ff1e78" : "#ffe100" }} />
      </span>
      <div>
        <p className="text-sm font-black text-[#0a0a1a]" style={{ fontFamily: "Orbitron, sans-serif" }}>
          {isOverdue ? `${Math.abs(days)}D OVERDUE` : days === 0 ? "DUE TODAY" : `${days} DAYS LEFT`}
        </p>
        <p className="text-xs text-[#0a0a1a] opacity-60">{formatDeadline(deadline)}</p>
      </div>
    </div>
  );
}

// ─── Main detail page ─────────────────────────────────────────────────────────

async function OpportunityDetail({ id }: { id: string }) {
  const opp = await getOpportunity(id);
  if (!opp) notFound();

  const { fields } = opp;
  const name        = fields["Grant Name"] ?? "Unnamed Grant";
  const status      = fields.Status ?? "Prospect";
  const amount      = fields["Award Amount Range"];
  const deadline    = fields.Deadline;
  const pillars     = fields.Pillar ?? [];
  const entity      = fields["Submitting Entity"];
  const priority    = fields.Priority as Priority | undefined;
  const source      = fields.Source;
  const notes       = (fields.Notes as string) ?? "";
  const writingPlan = (fields["Writing Plan"] as string | undefined) ?? null;
  const score       = fields.Score;
  const missionFit  = fields["Mission Fit"];
  const winProb     = fields["Win Probability"];
  const entCfg      = getEntityStyle(entity);

  const ENTITY_OPTIONS = ["LDU (501c3)","Life Development Group","Studio WELEH","Gorilla Rx","Farm Entity","Kika Keith"];
  const PRIORITY_OPTIONS = ["High","Medium","Low"];
  const PILLAR_OPTIONS = ["Capital Campaign","Programming & Operations","Studio WELEH","Agricultural Extension","Founder & Enterprise","Textile Sustainability"];

  return (
    <div className="min-h-screen pb-32" style={{ background: "#1565e8" }}>

      {/* ── Sticky header ───────────────────────────────── */}
      <div className="sticky top-0 z-40 px-4 py-3 max-w-2xl mx-auto"
        style={{ background: "#fffbf0", borderBottom: "3px solid #0a0a1a" }}>
        <div className="flex items-center gap-3">
          <Link href="/"
            className="w-9 h-9 rounded-xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center transition-all active:translate-y-[2px] shrink-0"
            style={{ background: "#ffffff", boxShadow: "2px 2px 0 #0a0a1a" }}>
            <PixelIcon name="arrow_left" size={15} color="#0a0a1a" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#aaaacc]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>MISSION BRIEF</p>
            <h1 className="text-sm font-bold text-[#0a0a1a] truncate leading-tight">{name}</h1>
          </div>
          {/* Entity chip */}
          <span className="text-[9px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a] shrink-0"
            style={{ fontFamily:"Orbitron,sans-serif",
              background: entCfg.bg, color: entCfg.color,
              boxShadow: `2px 2px 0 ${entCfg.shadow}` }}>
            {entCfg.label}
          </span>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">

        {/* ── Hero card ───────────────────────────────────── */}
        <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
          style={{ background: "#fffbf0", boxShadow: "5px 5px 0 #0a0a1a" }}>
          {/* Entity top stripe */}
          <div className="h-2" style={{ background: entCfg.color }} />
          <div className="p-5">
            <h2 className="text-lg font-black text-[#0a0a1a] leading-snug mb-3">{name}</h2>

            {/* Pillar + priority tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {pillars.map((p, i) => {
                const grads = ["#7c3aed","#ff1e78","#00a83a","#0066cc","#ff6b00","#0099aa"];
                return (
                  <span key={p}
                    className="text-[10px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a] text-white"
                    style={{ fontFamily:"Orbitron,sans-serif",
                      background: grads[i % grads.length], boxShadow: "2px 2px 0 #0a0a1a" }}>
                    {abbreviatePillar(p)}
                  </span>
                );
              })}
              {priority && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a]"
                  style={{ fontFamily:"Orbitron,sans-serif",
                    background: priority === "High" ? "#ffe0e8" : priority === "Medium" ? "#fff8d0" : "#e8e8ee",
                    color: priority === "High" ? "#ff1e78" : priority === "Medium" ? "#ffa500" : "#aaaacc",
                    boxShadow: "2px 2px 0 #0a0a1a" }}>
                  {priority === "High" ? "!! HIGH" : priority === "Medium" ? "! MED" : "LOW"}
                </span>
              )}
            </div>

            {/* Key stats */}
            <div className="flex items-start gap-6 flex-wrap">
              {amount && (
                <div>
                  <p className="text-[9px] font-bold text-[#aaaacc] uppercase tracking-widest mb-0.5"
                    style={{ fontFamily:"Orbitron,sans-serif" }}>AWARD</p>
                  <p className="text-2xl font-black text-[#00a83a]"
                    style={{ fontFamily:"Orbitron,sans-serif" }}>
                    {formatCurrency(amount)}
                  </p>
                </div>
              )}
              {deadline && (
                <div>
                  <p className="text-[9px] font-bold text-[#aaaacc] uppercase tracking-widest mb-0.5"
                    style={{ fontFamily:"Orbitron,sans-serif" }}>DEADLINE</p>
                  <p className="text-xl font-black"
                    style={{ fontFamily:"Orbitron,sans-serif",
                      color: daysUntilDeadline(deadline) < 0 ? "#ff1e78" :
                             daysUntilDeadline(deadline) <= 7 ? "#ffa500" : "#0a0a1a" }}>
                    {formatDeadline(deadline)}
                  </p>
                </div>
              )}
              {score && (
                <div className="ml-auto">
                  <p className="text-[9px] font-bold text-[#aaaacc] uppercase tracking-widest mb-0.5"
                    style={{ fontFamily:"Orbitron,sans-serif" }}>SCORE</p>
                  <p className="text-2xl font-black text-[#ffb800]"
                    style={{ fontFamily:"Orbitron,sans-serif" }}>
                    {Number(score).toFixed(1)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Deadline alert ────────────────────────────────── */}
        <DeadlineBanner deadline={deadline} status={status} />

        {/* ── Action guide — who needs to do what right now ── */}
        <ActionGuide status={status} grantName={name} />

        {/* ── Status ───────────────────────────────────────── */}
        <Section icon="pipeline" label="STATUS" iconBg="#b8f0ff">
          <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4"
            style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #0066cc" }}>
            <StatusUpdater opportunityId={opp.id} currentStatus={status} existingNotes={notes} />
          </div>
        </Section>

        {/* ── Description ──────────────────────────────────── */}
        <Section icon="search" label="GRANT DESCRIPTION" iconBg="#e8d4ff">
          <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4"
            style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #7c3aed" }}>
            <FieldEditor
              opportunityId={opp.id}
              fieldName="Description"
              value={fields.Description}
              type="textarea"
              placeholder="Describe the grant, its purpose, and key requirements…"
              emptyLabel="Tap to add a grant description"
            />
          </div>
        </Section>

        {/* ── Eligibility + Qualification ───────────────────── */}
        <Section icon="check" label="ELIGIBILITY & QUALIFICATION" iconBg="#b8ffda">
          <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] px-4 py-1"
            style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #00a83a" }}>
            <EditRow icon="check" label="ELIGIBLE">
              <FieldEditor
                opportunityId={opp.id}
                fieldName="Eligibility Notes"
                value={fields["Eligibility Notes"]}
                type="textarea"
                placeholder="List key eligibility criteria (501c3, geographic, revenue thresholds…)"
                emptyLabel="Tap to add eligibility notes"
              />
            </EditRow>
            <EditRow icon="star" label="WHY LDU">
              <FieldEditor
                opportunityId={opp.id}
                fieldName="Why We Qualify"
                value={fields["Why We Qualify"]}
                type="textarea"
                placeholder="Explain why LDU qualifies — mission fit, prior work, demographics…"
                emptyLabel="Tap to explain why LDU qualifies"
              />
            </EditRow>
          </div>
        </Section>

        {/* ── Funder intel ─────────────────────────────────── */}
        <Section icon="building" label="FUNDER INTEL" iconBg="#fff3a0">
          <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] px-4 py-1"
            style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #ffb800" }}>
            <EditRow icon="building" label="FUNDER">
              <FieldEditor
                opportunityId={opp.id}
                fieldName="Funder Name"
                value={fields["Funder Name"]}
                type="text"
                placeholder="Funder organization name"
                emptyLabel="Tap to add funder name"
              />
            </EditRow>
            <EditRow icon="search" label="SOURCE">
              <FieldEditor
                opportunityId={opp.id}
                fieldName="Funder Website"
                value={fields["Funder Website"]}
                type="url"
                placeholder="https://…"
                emptyLabel="Tap to add source URL"
              />
            </EditRow>
            {source && source !== fields["Funder Website"] && (
              <EditRow icon="rocket" label="ORIGIN">
                <a href={source.startsWith("http") ? source : `https://${source}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm text-[#1565e8] underline break-all">
                  {source}
                </a>
              </EditRow>
            )}
          </div>
        </Section>

        {/* ── AI Writing Plan ───────────────────────────────── */}
        <Section icon="quill" label="WRITING PLAN" iconBg="#fff3a0">
          <WritingPlanPanel
            opportunityId={opp.id}
            rawPlan={writingPlan}
            grantName={name}
          />
        </Section>


        {/* ── Record details ────────────────────────────────── */}
        <Section icon="filter" label="RECORD DETAILS" iconBg="#e8d4ff">
          <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] px-4 py-1"
            style={{ background: "#fffbf0", boxShadow: "4px 4px 0 #7c3aed" }}>
            <EditRow icon="building" label="ENTITY">
              <FieldEditor
                opportunityId={opp.id}
                fieldName="Submitting Entity"
                value={entity}
                type="select"
                options={ENTITY_OPTIONS}
                emptyLabel="Select entity"
              />
            </EditRow>
            <EditRow icon="dollar" label="AMOUNT">
              <FieldEditor
                opportunityId={opp.id}
                fieldName="Award Amount Range"
                value={amount}
                type="number"
                placeholder="e.g. 100000"
                displayAs="currency"
                emptyLabel="Tap to set amount"
              />
            </EditRow>
            <EditRow icon="clock" label="DEADLINE">
              <FieldEditor
                opportunityId={opp.id}
                fieldName="Deadline"
                value={deadline}
                type="date"
                emptyLabel="Tap to set deadline"
              />
            </EditRow>
            <EditRow icon="alert" label="PRIORITY">
              <FieldEditor
                opportunityId={opp.id}
                fieldName="Priority"
                value={priority}
                type="select"
                options={PRIORITY_OPTIONS}
                emptyLabel="Set priority"
              />
            </EditRow>
            {missionFit && (
              <EditRow icon="star" label="FIT">
                <ScoreBar value={Number(missionFit)} color="#7c3aed" />
              </EditRow>
            )}
            {winProb && (
              <EditRow icon="trophy" label="WIN %">
                <ScoreBar value={Number(winProb)} color="#ffb800" />
              </EditRow>
            )}
          </div>
        </Section>

        {/* ── Communications Log ───────────────────────────── */}
        <Section icon="quill" label="COMMS LOG" iconBg="#b8ffda">
          <CommsLog opportunityId={opp.id} initialNotes={notes} />
        </Section>

      </div>
    </div>
  );
}

export default function OpportunityPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div style={{ background: "#1565e8" }} className="page-container space-y-4">
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
    }>
      <OpportunityDetail id={params.id} />
    </Suspense>
  );
}
