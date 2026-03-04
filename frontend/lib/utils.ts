import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, parseISO, differenceInDays, format } from "date-fns";
import type { GrantStatus, Priority, Opportunity, UrgentAlert } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatCurrency(amount: number | undefined): string {
  if (!amount) return "—";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export function formatDeadline(dateStr: string | undefined): string {
  if (!dateStr) return "No deadline";
  try {
    const date = parseISO(dateStr);
    const days = differenceInDays(date, new Date());
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    if (days <= 14) return `${days}d left`;
    return format(date, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function daysUntilDeadline(dateStr: string | undefined): number {
  if (!dateStr) return 999;
  try {
    return differenceInDays(parseISO(dateStr), new Date());
  } catch {
    return 999;
  }
}

export function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return "—";
  }
}

// ─── Status Colors ────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Prospect: { bg: "bg-violet-900/30", text: "text-violet-300", dot: "bg-violet-400" },
  Qualifying: { bg: "bg-purple-900/30", text: "text-purple-300", dot: "bg-purple-400" },
  Writing: { bg: "bg-amber-900/30", text: "text-amber-300", dot: "bg-amber-400" },
  "In Review": { bg: "bg-sky-900/30", text: "text-sky-300", dot: "bg-sky-400" },
  Submitted: { bg: "bg-teal-900/30", text: "text-teal-300", dot: "bg-teal-400" },
  Active: { bg: "bg-teal-900/30", text: "text-teal-300", dot: "bg-teal-400" },
  Awarded: { bg: "bg-emerald-900/30", text: "text-emerald-300", dot: "bg-emerald-400" },
  Declined: { bg: "bg-neutral-800/50", text: "text-neutral-400", dot: "bg-neutral-500" },
  Rejected: { bg: "bg-neutral-800/50", text: "text-neutral-400", dot: "bg-neutral-500" },
};

export function getStatusStyle(status: string | undefined) {
  return STATUS_COLORS[status ?? ""] ?? STATUS_COLORS.Prospect;
}

// ─── Priority Colors ──────────────────────────────────────────────────────────

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  High: { bg: "bg-red-900/30", text: "text-red-300" },
  Medium: { bg: "bg-amber-900/30", text: "text-amber-300" },
  Low: { bg: "bg-neutral-800/40", text: "text-neutral-400" },
};

// ─── Pillar Abbreviations ─────────────────────────────────────────────────────

export const PILLAR_ABBREV: Record<string, string> = {
  "Capital Campaign": "Capital",
  "Programming & Operations": "Programs",
  "Studio WELEH": "WELEH",
  "Agricultural Extension": "Ag Ext.",
  "Founder & Enterprise": "Founder",
  "Textile Sustainability": "Textile",
};

export function abbreviatePillar(pillar: string): string {
  return PILLAR_ABBREV[pillar] ?? pillar;
}

// ─── Urgent Alerts ───────────────────────────────────────────────────────────

export function buildUrgentAlerts(opportunities: Opportunity[]): UrgentAlert[] {
  const alerts: UrgentAlert[] = [];
  const now = new Date();

  for (const opp of opportunities) {
    const deadline = opp.fields.Deadline;
    const status = opp.fields.Status ?? "Prospect";
    const name = opp.fields["Grant Name"] ?? "Unnamed";

    if (!deadline) continue;

    const days = differenceInDays(parseISO(deadline), now);

    if (days < 0 && !["Awarded", "Declined", "Rejected", "Submitted"].includes(status)) {
      alerts.push({ type: "overdue", grantName: name, opportunityId: opp.id, daysUntil: days, status });
    } else if (days >= 0 && days <= 7 && !["Awarded", "Declined", "Rejected"].includes(status)) {
      alerts.push({ type: "deadline", grantName: name, opportunityId: opp.id, daysUntil: days, status });
    } else if (status === "In Review" && days <= 14) {
      alerts.push({ type: "review", grantName: name, opportunityId: opp.id, daysUntil: days, status });
    }
  }

  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
}
