/**
 * Server-side Airtable client. Never import this from client components.
 * All data fetching goes through /app/api/* routes.
 */

const BASE_URL = "https://api.airtable.com/v0";
const API_TOKEN = process.env.AIRTABLE_API_TOKEN?.trim();
const BASE_ID = process.env.AIRTABLE_BASE_ID?.trim();

if (!API_TOKEN || !BASE_ID) {
  console.warn("[airtable] Missing AIRTABLE_API_TOKEN or AIRTABLE_BASE_ID env vars");
}

interface AirtableListOptions {
  filterByFormula?: string;
  sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
  maxRecords?: number;
  fields?: string[];
  view?: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

async function airtableFetch(path: string, options?: RequestInit) {
  const url = `${BASE_URL}/${BASE_ID}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    next: { revalidate: 60 }, // cache 60s in Next.js
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable error ${res.status}: ${err}`);
  }

  return res.json();
}

// ─── List Records ─────────────────────────────────────────────────────────────

export async function listRecords(
  tableName: string,
  options: AirtableListOptions = {}
): Promise<AirtableRecord[]> {
  const params = new URLSearchParams();

  if (options.filterByFormula) params.set("filterByFormula", options.filterByFormula);
  if (options.maxRecords) params.set("maxRecords", String(options.maxRecords));
  if (options.view) params.set("view", options.view);
  if (options.fields) options.fields.forEach((f) => params.append("fields[]", f));
  if (options.sort) {
    options.sort.forEach((s, i) => {
      params.append(`sort[${i}][field]`, s.field);
      params.append(`sort[${i}][direction]`, s.direction ?? "asc");
    });
  }

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    if (offset) params.set("offset", offset);
    const query = params.toString();
    const data: AirtableListResponse = await airtableFetch(
      `${encodeURIComponent(tableName)}${query ? `?${query}` : ""}`
    );
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

// ─── Get Single Record ────────────────────────────────────────────────────────

export async function getRecord(tableName: string, recordId: string): Promise<AirtableRecord> {
  return airtableFetch(`${encodeURIComponent(tableName)}/${recordId}`);
}

// ─── Update Record ────────────────────────────────────────────────────────────

export async function updateRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  return airtableFetch(`${encodeURIComponent(tableName)}/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

// ─── Opportunities helpers ────────────────────────────────────────────────────

export async function getOpportunities(options?: AirtableListOptions) {
  return listRecords("Opportunities", {
    sort: [{ field: "Deadline", direction: "asc" }],
    ...options,
  });
}

export async function getOpportunitiesByStatus(status: string) {
  return listRecords("Opportunities", {
    filterByFormula: `{Status} = "${status}"`,
    sort: [{ field: "Deadline", direction: "asc" }],
  });
}

export async function getWritingQueue() {
  return listRecords("Opportunities", {
    filterByFormula: `OR({Status} = "Writing", {Status} = "In Review")`,
    sort: [{ field: "Deadline", direction: "asc" }],
  });
}

export async function getUpcomingDeadlines(days = 30) {
  const future = new Date();
  future.setDate(future.getDate() + days);
  return listRecords("Opportunities", {
    filterByFormula: `AND(
      IS_AFTER({Deadline}, TODAY()),
      IS_BEFORE({Deadline}, "${future.toISOString().split("T")[0]}"),
      NOT({Status} = "Awarded"),
      NOT({Status} = "Declined"),
      NOT({Status} = "Rejected")
    )`,
    sort: [{ field: "Deadline", direction: "asc" }],
  });
}

export async function getFunders(options?: AirtableListOptions) {
  return listRecords("Funders", {
    sort: [{ field: "Funder Name", direction: "asc" }],
    ...options,
  });
}
