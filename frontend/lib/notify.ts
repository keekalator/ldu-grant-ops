/**
 * Push notification utility — uses ntfy.sh (free, no account required).
 *
 * Both Kika Keith and Kika Howze subscribe to the same private topic on
 * the ntfy app (iOS / Android). Every alert fired here lands on both phones.
 *
 * Environment variables:
 *   NTFY_TOPIC     — private topic name (treat like a password, keep secret)
 *   NTFY_BASE_URL  — defaults to https://ntfy.sh (can self-host)
 */

const NTFY_TOPIC    = process.env.NTFY_TOPIC;
const NTFY_BASE_URL = process.env.NTFY_BASE_URL ?? "https://ntfy.sh";

export type NotifyPriority = "max" | "urgent" | "high" | "default" | "low" | "min";

export interface NotifyPayload {
  title:     string;
  body:      string;
  priority?: NotifyPriority;
  /** ntfy emoji tags — see https://docs.ntfy.sh/publish/#tags-emojis */
  tags?:     string[];
  /** URL opened when the notification is tapped */
  clickUrl?: string;
}

/**
 * Send a push notification to the LDU team's phones.
 * Silent no-op if NTFY_TOPIC is not configured.
 */
export async function notify(payload: NotifyPayload): Promise<void> {
  if (!NTFY_TOPIC) {
    console.log("[notify] NTFY_TOPIC not set — skipping push notification:", payload.title);
    return;
  }

  const headers: Record<string, string> = {
    "Title":    payload.title,
    "Priority": payload.priority ?? "default",
  };
  if (payload.tags?.length)  headers["Tags"]  = payload.tags.join(",");
  if (payload.clickUrl)      headers["Click"] = payload.clickUrl;

  try {
    await fetch(`${NTFY_BASE_URL}/${NTFY_TOPIC}`, {
      method:  "POST",
      headers,
      body:    payload.body,
    });
    console.log(`[notify] Sent: "${payload.title}"`);
  } catch (e) {
    // Never let a failed notification crash the main request
    console.error("[notify] Failed to send push notification:", e);
  }
}

// ─── Pre-built alert helpers ──────────────────────────────────────────────────

export function notifyDeadlineAlert(grantName: string, daysLeft: number, entity: string, opportunityId: string) {
  const emoji   = daysLeft <= 0 ? "rotating_light" : daysLeft <= 2 ? "warning" : "calendar";
  const urgency = daysLeft <= 0 ? "max" : daysLeft <= 2 ? "urgent" : "high";
  const prefix  = daysLeft <= 0 ? "TODAY" : daysLeft === 1 ? "TOMORROW" : `${daysLeft} DAYS`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return notify({
    title:    `[${prefix}] ${grantName}`,
    body:     `Deadline ${daysLeft <= 0 ? "is TODAY" : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`} — ${entity}`,
    priority: urgency,
    tags:     [emoji, "ldu_grants"],
    clickUrl: baseUrl ? `${baseUrl}/opportunity/${opportunityId}` : undefined,
  });
}

export function notifyMultiEntity(grantName: string, entities: string[], opportunityId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return notify({
    title:    `[MULTI-ENTITY] ${grantName}`,
    body:     `${entities.join(" AND ")} are both strong candidates — decide who submits`,
    priority: "high",
    tags:     ["bell", "people_holding_hands", "ldu_grants"],
    clickUrl: baseUrl ? `${baseUrl}/opportunity/${opportunityId}` : undefined,
  });
}

export function notifyDraftReady(grantName: string, entity: string, opportunityId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return notify({
    title:    `[DRAFT READY] ${grantName}`,
    body:     `${entity} grant draft generated — review and approve`,
    priority: "default",
    tags:     ["writing_hand", "ldu_grants"],
    clickUrl: baseUrl ? `${baseUrl}/opportunity/${opportunityId}` : undefined,
  });
}

export function notifyStatusChange(grantName: string, newStatus: string, funder: string, opportunityId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const configs: Record<string, { priority: NotifyPriority; tags: string[]; body: string }> = {
    "Submitted": { priority: "high",    tags: ["rocket", "ldu_grants"],           body: `${grantName} submitted to ${funder}` },
    "Awarded":   { priority: "max",     tags: ["trophy", "tada", "ldu_grants"],   body: `CONGRATULATIONS — ${grantName} was awarded! Start onboarding.` },
    "Declined":  { priority: "default", tags: ["x", "ldu_grants"],                body: `${grantName} declined by ${funder}` },
    "Rejected":  { priority: "default", tags: ["x", "ldu_grants"],                body: `${grantName} rejected` },
  };
  const cfg = configs[newStatus];
  if (!cfg) return Promise.resolve();
  return notify({
    title:    `[${newStatus.toUpperCase()}] ${grantName}`,
    body:     cfg.body,
    priority: cfg.priority,
    tags:     cfg.tags,
    clickUrl: baseUrl ? `${baseUrl}/opportunity/${opportunityId}` : undefined,
  });
}

export function notifyNewHighScoreGrant(grantName: string, score: number, funder: string) {
  return notify({
    title:    `[NEW PROSPECT] ${grantName}`,
    body:     `Score ${score}/5 · ${funder} — review and score in pipeline`,
    priority: "default",
    tags:     ["moneybag", "star", "ldu_grants"],
  });
}
