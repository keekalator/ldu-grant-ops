// ─── Grant Opportunity ───────────────────────────────────────────────────────

export type GrantStatus =
  // Live Airtable values
  | "Prospect"
  | "Scoring"
  | "Writing Queue"
  | "Active"
  | "Submitted"
  | "Awarded"
  | "Disqualified"
  | "Declined"
  | "Rejected"
  // Legacy / future values kept for safety
  | "Qualifying"
  | "Writing"
  | "In Review";

export type Pillar =
  | "Capital Campaign"
  | "Programming & Operations"
  | "Studio WELEH"
  | "Agricultural Extension"
  | "Founder & Enterprise"
  | "Textile Sustainability";

export type SubmittingEntity =
  | "LDU"
  | "Gorilla Rx"
  | "Studio WELEH"
  | "Farm Entity"
  | "Kika Keith"
  | "Life Development Group";

export type Priority = "High" | "Medium" | "Low";

export interface Opportunity {
  id: string;
  fields: {
    "Grant Name": string;
    Status?: GrantStatus;
    Pillar?: Pillar[];
    "Award Amount Range"?: number;
    Deadline?: string;
    "Submitting Entity"?: SubmittingEntity;
    Priority?: Priority;
    Source?: string;
    Notes?: string;
    "Score"?: number;
    "Weighted Score"?: number;
    "Mission Fit"?: number;
    "Win Probability"?: number;
    "Timeline Fit"?: number;
    "Award Size"?: number;
    "Strategic Value"?: number;
    "Created At"?: string;
    "Last Modified"?: string;
    // Extended detail fields
    "Description"?: string;
    "Funder Name"?: string;   // legacy alias
    "Funder"?: string;        // actual Airtable field name
    "Funder Website"?: string;
    "Eligibility Notes"?: string;
    "Why We Qualify"?: string;
    "Materials Needed"?: string;
    "Next Steps"?: string;
    "Writing Plan"?: string;           // JSON string — parsed by WritingPlanPanel
    "Disqualification Reason"?: string; // set when Status = Disqualified
  };
}

// ─── Funder ───────────────────────────────────────────────────────────────────

export interface Funder {
  id: string;
  fields: {
    "Funder Name": string;
    "Funder Type"?: string;
    Website?: string;
    "Focus Areas"?: string[];
    "Average Award"?: number;
    "Geographic Focus"?: string;
    Notes?: string;
  };
}

// ─── Submission ───────────────────────────────────────────────────────────────

export interface Submission {
  id: string;
  fields: {
    "Submission Name"?: string;
    Status?: string;
    "Submitted Date"?: string;
    "Award Amount"?: number;
    Notes?: string;
  };
}

// ─── Pipeline Stats ───────────────────────────────────────────────────────────

export interface PipelineStats {
  total: number;
  byStatus: Record<string, number>;
  byPillar: Record<string, number>;
  totalRequested: number;
  totalAwarded: number;
  upcomingDeadlines: Opportunity[];
  writingQueue: Opportunity[];
  urgentAlerts: UrgentAlert[];
}

export interface UrgentAlert {
  type: "deadline" | "review" | "overdue";
  grantName: string;
  opportunityId: string;
  daysUntil: number;
  status: string;
}

// ─── Kanban stage groupings ───────────────────────────────────────────────────

export type KanbanStage = "scout" | "draft" | "sent" | "done";

export const KANBAN_STAGE_STATUSES: Record<KanbanStage, GrantStatus[]> = {
  scout: ["Prospect", "Scoring"],
  draft: ["Writing Queue"],
  sent:  ["Active", "Submitted"],
  done:  ["Awarded", "Declined", "Rejected", "Disqualified"],
};

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  records?: T;
}
