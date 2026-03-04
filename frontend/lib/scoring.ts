/**
 * LDU Grant Scoring Matrix — TypeScript port of config/scoring.py
 * Weighted 5-criterion scoring system for prospect qualification.
 */

// ─── Weights (must sum to 1.0) ────────────────────────────────────────────────

const WEIGHTS = {
  missionFit:      0.30,
  awardSize:       0.20,
  winProbability:  0.25,
  timelineFit:     0.15,
  strategicValue:  0.10,
} as const;

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const THRESHOLD_STANDARD = 3.5;
export const THRESHOLD_FOUNDER  = 3.0;   // P5 grants with <= 2h estimated work

// ─── Pillar keywords (ported from config/pillars.py) ─────────────────────────

export const PILLAR_KEYWORDS: Record<string, string[]> = {
  P1: [
    "community facilities", "capital improvement", "construction", "renovation",
    "facility buildout", "campus development", "south la", "crenshaw corridor",
    "nonprofit facility", "building acquisition", "nonprofit capital",
  ],
  P2: [
    "workforce development", "job training", "digital literacy", "ai training",
    "technology education", "vocational skills", "music education", "music programs",
    "entrepreneurship", "youth development", "re-entry workforce", "community education",
    "apprenticeship", "camera operating", "film production", "venue operations",
  ],
  P3: [
    "artist incubator", "arts education", "creative economy", "cultural development",
    "community arts", "youth arts workshops", "art exhibitions", "sustainable fashion",
    "textile upcycling", "apparel design", "sustainability education", "content creation",
    "studio space", "art supplies", "upcycling", "youth arts",
  ],
  P4: [
    "beginning farmer", "urban agriculture", "youth agriculture", "land-based education",
    "farm-to-table", "environmental justice", "agricultural workforce", "seasonal exchange",
    "rural manufacturing", "clothing factory", "textile manufacturing", "action sports",
    "wellness", "land acquisition", "first-time farmer",
  ],
  P5: [
    "women entrepreneurs", "black women entrepreneurs", "minority business",
    "small business grants", "social equity", "cannabis social equity",
    "women-owned business", "bipoc business", "young entrepreneur",
    "first-time landowner", "bipoc founders",
  ],
  CROSS_TEXTILE: [
    "textile recycling", "textile upcycling", "sustainable fashion", "circular economy",
    "waste diversion", "calrecycle", "sb 707", "extended producer responsibility",
    "closed-loop manufacturing", "sustainable apparel", "recycled fiber",
  ],
};

export const PILLAR_NAMES: Record<string, string> = {
  P1: "Capital Campaign",
  P2: "Programming & Operations",
  P3: "Studio WELEH",
  P4: "Agricultural Extension",
  P5: "Founder & Enterprise",
  CROSS_TEXTILE: "Textile Sustainability",
};

// ─── Auto-match pillars from grant text ───────────────────────────────────────

export function matchPillars(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(PILLAR_KEYWORDS)
    .filter(([, keywords]) => keywords.some(kw => lower.includes(kw)))
    .map(([id]) => id);
}

// ─── Score individual criteria ────────────────────────────────────────────────

export function scoreAwardSize(amount: number): number {
  if (amount >= 100_000) return 5;
  if (amount >= 50_000)  return 4;
  if (amount >= 25_000)  return 3;
  if (amount >= 10_000)  return 2;
  return 1;
}

export function scoreTimelineFit(deadlineIso: string | undefined | null): number {
  if (!deadlineIso) return 3; // unknown = neutral
  const days = Math.floor(
    (new Date(deadlineIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0)   return 1; // overdue
  if (days >= 42) return 5; // 6+ weeks
  if (days >= 28) return 4; // 4–6 weeks
  if (days >= 14) return 3; // 2–4 weeks
  if (days >= 7)  return 2; // 1–2 weeks
  return 1;                  // under 1 week
}

export function scoreMissionFit(pillars: string[], descriptionText = ""): number {
  // Count matching pillars (detected or explicitly set)
  const matched = pillars.length > 0
    ? pillars
    : matchPillars(descriptionText);

  if (matched.length >= 3) return 5; // cross-cutting multi-pillar
  if (matched.length === 2) return 4;
  if (matched.length === 1) return 3;
  return 2; // some text match but no clear pillar
}

// ─── Weighted score ───────────────────────────────────────────────────────────

export interface ScoreInputs {
  missionFit:     number; // 1–5
  awardSize:      number; // 1–5
  winProbability: number; // 1–5
  timelineFit:    number; // 1–5
  strategicValue: number; // 1–5
}

export function calculateWeightedScore(scores: ScoreInputs): number {
  const raw =
    scores.missionFit     * WEIGHTS.missionFit     +
    scores.awardSize      * WEIGHTS.awardSize      +
    scores.winProbability * WEIGHTS.winProbability +
    scores.timelineFit    * WEIGHTS.timelineFit    +
    scores.strategicValue * WEIGHTS.strategicValue;
  return Math.round(raw * 100) / 100;
}

export function meetsThreshold(score: number, pillar: string): boolean {
  return score >= (pillar === "P5" ? THRESHOLD_FOUNDER : THRESHOLD_STANDARD);
}

// ─── Priority from score ──────────────────────────────────────────────────────

export function scoreToPriority(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 4.0) return "HIGH";
  if (score >= 3.0) return "MEDIUM";
  return "LOW";
}

// ─── Auto-score a raw prospect ────────────────────────────────────────────────

export interface RawProspect {
  name:        string;
  funder?:     string;
  description?: string;
  deadline?:   string;
  amount?:     number;
  pillars?:    string[];
  sourceUrl?:  string;
  source?:     string;
}

export interface ScoredProspect extends RawProspect {
  scores:         ScoreInputs;
  weightedScore:  number;
  priority:       "HIGH" | "MEDIUM" | "LOW";
  pillarsMatched: string[];
  entity:         string;
}

export function autoScore(prospect: RawProspect): ScoredProspect {
  const text     = `${prospect.name} ${prospect.description ?? ""}`;
  const pillars  = prospect.pillars?.length
    ? prospect.pillars
    : matchPillars(text);
  const primaryPillar = pillars[0] ?? "";

  const scores: ScoreInputs = {
    missionFit:     scoreMissionFit(pillars, text),
    awardSize:      scoreAwardSize(prospect.amount ?? 0),
    winProbability: 3, // default: competitive (no relationship data at ingest)
    timelineFit:    scoreTimelineFit(prospect.deadline),
    strategicValue: 3, // default: neutral until reviewed
  };

  const weightedScore = calculateWeightedScore(scores);

  return {
    ...prospect,
    scores,
    weightedScore,
    priority:       scoreToPriority(weightedScore),
    pillarsMatched: pillars,
    entity:         routeEntity(text, pillars),
  };
}

// ─── Entity routing (ported from grant_scraper.py) ───────────────────────────

export function routeEntity(text: string, pillars: string[]): string {
  const lower = text.toLowerCase();
  if (["for-profit","small business","business owner","entrepreneur grant","woman-owned business"]
      .some(kw => lower.includes(kw))) return "Studio WELEH (For-Profit)";
  if (["individual artist","emerging artist","artist fellowship","visual artist","craft prize"]
      .some(kw => lower.includes(kw))) return "Weleh (Individual)";
  if (["cannabis","social equity dispensary","marijuana"]
      .some(kw => lower.includes(kw))) return "Gorilla Rx (For-Profit)";
  if (["beginning farmer","agricultural producer","farm ownership","rancher","usda fsa"]
      .some(kw => lower.includes(kw)) || pillars.join("") === "P4") return "Farm Entity (TBD)";
  return "LDU (501c3)";
}
