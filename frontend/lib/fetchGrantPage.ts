/**
 * fetchGrantPage
 *
 * Fetches a funder's website and extracts grant-relevant text content.
 * Used by the enrich, writing-plan, and draft agents so they always
 * read the actual current guidelines instead of relying solely on
 * Claude's training data.
 *
 * Strategy:
 *   1. Fetch the given URL
 *   2. If it looks like a homepage, scan links for a grant/apply sub-page
 *   3. Fetch the most grant-relevant sub-page found
 *   4. Return cleaned text (8 000 char max) + metadata
 */

export interface GrantPageResult {
  /** The URL that was actually read (may differ from input if a sub-page was found) */
  finalUrl: string;
  /** Whether a more-specific grant sub-page was discovered */
  discoveredGrantPage: boolean;
  /** Clean, stripped text ready to embed in a Claude prompt */
  text: string;
  /** Page <title> */
  title: string;
  /** Whether at least one fetch succeeded */
  success: boolean;
  /** Error message if success=false */
  error?: string;
}

// ─── HTML → plain text ───────────────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    // Drop blocks we never want
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Keep block-level whitespace by turning tags into newlines
    .replace(/<\/?(p|div|h[1-6]|li|td|br|tr|section|article)[^>]*>/gi, "\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode common entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    // Normalise whitespace
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Link extraction ─────────────────────────────────────────────────────────

function extractLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const hrefs: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], base).href;
      // Same host only — avoid leaving the funder's domain
      if (new URL(abs).hostname === base.hostname) hrefs.push(abs);
    } catch { /* skip unparseable */ }
  }
  return [...new Set(hrefs)];
}

// Grant-related keyword patterns (ordered by priority)
const GRANT_PATTERNS = [
  /grant[s]?[-/](apply|application|program|fund|opportunit)/i,
  /apply[-/]?(now|here|online|for[-/]?grant)/i,
  /rfp|nofa|notice[-/]of[-/](funding|award)/i,
  /funding[-/](opportunit|program|guideline|application)/i,
  /how[-/]to[-/]apply/i,
  /current[-/](grant|funding|opportunit)/i,
  /open[-/](grant|call|application)/i,
  /grant[-/](guideline|requirement|eligibilit|criteria|overview)/i,
  /\/grant[s]?\//i,
  /\/fund(ing)?\//i,
  /\/apply\//i,
  /\/rfp\b/i,
];

function rankGrantLink(url: string): number {
  let score = 0;
  for (let i = 0; i < GRANT_PATTERNS.length; i++) {
    if (GRANT_PATTERNS[i].test(url)) score += (GRANT_PATTERNS.length - i);
  }
  return score;
}

function findBestGrantLink(links: string[]): string | null {
  const scored = links
    .map(url => ({ url, score: rankGrantLink(url) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.url ?? null;
}

// ─── Core fetch helper ───────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10_000;

async function fetchUrl(url: string): Promise<{ html: string; ok: boolean }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LDUGrantResearcher/1.0; nonprofit grant research)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return { html: "", ok: false };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) {
      return { html: "", ok: false };
    }
    const html = await res.text();
    return { html, ok: true };
  } catch {
    return { html: "", ok: false };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a funder URL and return grant-relevant text.
 * Automatically tries to discover a deeper grant-specific page if the
 * provided URL looks like a homepage.
 */
export async function fetchGrantPage(url: string): Promise<GrantPageResult> {
  const EMPTY: GrantPageResult = {
    finalUrl: url,
    discoveredGrantPage: false,
    text: "",
    title: "",
    success: false,
  };

  if (!url || !url.startsWith("http")) {
    return { ...EMPTY, error: "No valid URL provided" };
  }

  // ── Step 1: Fetch the given URL ──────────────────────────────────────────
  const { html: rootHtml, ok: rootOk } = await fetchUrl(url);
  if (!rootOk || !rootHtml) {
    return { ...EMPTY, error: `Could not fetch ${url}` };
  }

  const titleMatch = rootHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rootTitle  = titleMatch ? titleMatch[1].trim() : "";
  const rootText   = htmlToText(rootHtml);

  // ── Step 2: Try to find a more-specific grant sub-page ──────────────────
  const links     = extractLinks(rootHtml, url);
  const grantLink = findBestGrantLink(links);

  if (!grantLink || grantLink === url) {
    // No deeper page found — use the root page
    return {
      finalUrl:            url,
      discoveredGrantPage: false,
      text:  rootText.slice(0, 10_000),
      title: rootTitle,
      success: true,
    };
  }

  // ── Step 3: Fetch the grant sub-page ─────────────────────────────────────
  const { html: grantHtml, ok: grantOk } = await fetchUrl(grantLink);

  if (!grantOk || !grantHtml) {
    // Fall back to root content
    return {
      finalUrl:            url,
      discoveredGrantPage: false,
      text:  rootText.slice(0, 10_000),
      title: rootTitle,
      success: true,
    };
  }

  const grantTitleMatch = grantHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  const grantTitle = grantTitleMatch ? grantTitleMatch[1].trim() : rootTitle;
  const grantText  = htmlToText(grantHtml);

  // Combine: grant sub-page content first, then root as context
  // Cap total at 12 000 chars (≈ 3 000 tokens)
  const combined = [
    `=== GRANT PAGE: ${grantLink} ===`,
    grantText.slice(0, 8_000),
    `\n=== FUNDER HOMEPAGE: ${url} ===`,
    rootText.slice(0, 3_000),
  ].join("\n\n").slice(0, 12_000);

  return {
    finalUrl:            grantLink,
    discoveredGrantPage: true,
    text:  combined,
    title: grantTitle,
    success: true,
  };
}

/**
 * Try multiple URLs (funder website + source URL) and return the best result.
 * Falls back gracefully if all fail.
 */
export async function fetchBestGrantPage(
  funderWebsite?: string,
  sourceUrl?: string,
): Promise<GrantPageResult | null> {
  const urls = [funderWebsite, sourceUrl]
    .filter((u): u is string => !!u && u.startsWith("http"))
    .filter((u, i, a) => a.indexOf(u) === i); // dedupe

  if (urls.length === 0) return null;

  // Try all URLs in parallel, take the first success
  const results = await Promise.all(urls.map(fetchGrantPage));
  const best = results.find(r => r.success && r.text.length > 200);
  return best ?? null;
}
