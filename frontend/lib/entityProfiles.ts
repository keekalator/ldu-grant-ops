/**
 * Shared entity profiles for all AI grant agents.
 *
 * Every route that calls Claude (enrich, writing-plan, draft) imports from here
 * so entity descriptions, demographics, and scoring logic stay in one place.
 */

export interface EntityProfile {
  /** Exact value used in the Airtable "Submitting Entity" single-select field */
  airtableValue: string;
  displayName: string;
  type: "nonprofit" | "business" | "individual" | "farm";
  tagline: string;
  /** 2-3 sentence description used in AI prompts */
  description: string;
  /** Key competitive advantages for grant applications */
  strengths: string[];
  /** Grant categories where this entity is the strongest applicant */
  bestFor: string[];
  /** Demographic and identity flags that matter for grant eligibility */
  demographics: string[];
  geography: string;
  /** Whether this entity can independently hold 501(c)(3) grants (or needs LDU as fiscal sponsor) */
  isNonprofit: boolean;
  /** Background color for entity chips in the UI (matches design system) */
  chipBg: string;
  chipColor: string;
}

export const ENTITY_PROFILES: EntityProfile[] = [
  {
    airtableValue: "LDU (501c3)",
    displayName: "Life Development University",
    type: "nonprofit",
    tagline: "501(c)(3) nonprofit creative campus — Crenshaw Blvd, South LA",
    description:
      "LDU is a 501(c)(3) nonprofit on Crenshaw Blvd, South Los Angeles, co-founded by Kika Keith (CEO) and Kika Howze (Implementation Lead). Black women-led and intergenerational. Programs: AI/tech training, camera operating, music production, vocational trades, youth development, re-entry workforce readiness, entrepreneurship, arts (Studio WELEH), and agricultural extension (Cultivation Campus, Yolo County).",
    strengths: [
      "Full 501(c)(3) status — eligible for all nonprofit-required grant programs",
      "Black women-led — strong fit for equity-focused and BIPOC-centered funders",
      "South LA / Crenshaw address — qualifies for LA County, City of LA, and underserved community grants",
      "Multi-program breadth — can address youth, workforce, arts, tech, and re-entry pillars simultaneously",
      "Intergenerational leadership (mother-daughter co-founders) — compelling narrative",
      "Intersectional impact: youth, adults, returning citizens, BIPOC, women, low-income",
    ],
    bestFor: [
      "Community development grants",
      "Workforce development / job training grants",
      "Youth programs",
      "Re-entry / criminal justice re-integration programs",
      "Technology education grants",
      "General operating support",
      "Capacity building grants",
      "Multi-pillar / comprehensive community grants",
    ],
    demographics: ["Black-led", "Women-led", "BIPOC community", "South LA / underserved community"],
    geography: "South Los Angeles, LA County, California statewide, Yolo County (farm extension)",
    isNonprofit: true,
    chipBg: "#dbeafe",
    chipColor: "#1565e8",
  },
  {
    airtableValue: "Studio WELEH",
    displayName: "Studio WELEH",
    type: "nonprofit",
    tagline: "Arts incubator, sustainable fashion & upcycling — South LA",
    description:
      "Studio WELEH is LDU's arts incubator focused on visual arts, sustainable fashion, upcycling, content creation, and youth art workshops. It operates at the Crenshaw campus and embodies 'Culture as Cultivation' — treating artistic practice as community cultivation. Studio WELEH can apply as an organization (under LDU as fiscal sponsor) or the lead artist 'Weleh' can apply as an individual artist for fellowships.",
    strengths: [
      "Arts-specific focus — ideal fit for arts funders that want program specificity over broad nonprofits",
      "Sustainable fashion + upcycling — strong alignment with circular economy and textile diversion grants",
      "Youth art programming — appeals to arts education funders and community arts funders",
      "South LA cultural identity — community-embedded arts practice with deep place-based roots",
      "Dual-track eligibility: applies as org (Studio WELEH/LDU) OR as individual artist (Weleh)",
      "SB 707 alignment — textile upcycling directly fits CalRecycle and circular economy programs",
    ],
    bestFor: [
      "Visual arts and arts incubator grants",
      "Arts education grants",
      "Sustainable fashion / textile / circular economy grants",
      "SB 707 / CalRecycle textile diversion grants",
      "Creative economy development grants",
      "Youth arts programs",
      "Arts + technology grants",
      "Community arts and cultural programming",
    ],
    demographics: ["Black-led", "Women-led", "South LA community arts", "Youth-serving"],
    geography: "South Los Angeles, LA County",
    isNonprofit: false,
    chipBg: "#ffe0f0",
    chipColor: "#ff1e78",
  },
  {
    airtableValue: "Gorilla Rx",
    displayName: "Gorilla Rx Wellness Co.",
    type: "business",
    tagline: "Cannabis dispensary — social equity licensee, women-owned, Black-owned",
    description:
      "Gorilla Rx Wellness Co. is a cannabis dispensary on Crenshaw Blvd, South LA. It holds a cannabis social equity license and is both women-owned and Black-owned. As a for-profit entity, it is the right applicant when grants are open to businesses (not nonprofits) or specifically target cannabis industry participants.",
    strengths: [
      "Cannabis social equity licensee — eligible for cannabis equity grant programs",
      "Women-owned AND Black-owned — dual demographic qualification for business grants",
      "For-profit entity — eligible for grants that explicitly exclude nonprofits",
      "South LA Crenshaw corridor — qualifies for neighborhood-specific business grants",
      "Community wellness and outreach angle",
    ],
    bestFor: [
      "Cannabis equity grants",
      "Cannabis community outreach grants",
      "Women business owner grants",
      "Black business owner grants",
      "Small business grants (for-profit eligible)",
      "Social equity entrepreneurship grants",
    ],
    demographics: ["Black-owned", "Women-owned", "Cannabis social equity licensee", "South LA"],
    geography: "South Los Angeles, LA County",
    isNonprofit: false,
    chipBg: "#d1fae5",
    chipColor: "#00a83a",
  },
  {
    airtableValue: "Farm Entity",
    displayName: "Cultivation Campus (Farm Entity)",
    type: "farm",
    tagline: "Agricultural operation — Yolo County, Woodland, NorCal",
    description:
      "The Cultivation Campus is LDU's agricultural extension in Yolo County/Woodland, Northern California. It encompasses seasonal exchange programming, farming operations, The Factory (clothing manufacturing), trades training, and wellness programming. It is operated by socially disadvantaged BIPOC farmers and embodies a 'from seed to supply chain' vision.",
    strengths: [
      "Active agricultural operation — eligible for USDA, CDFA, and farm-specific grants",
      "Socially disadvantaged farmer ownership — BIPOC-led agricultural operation, strong USDA priority",
      "Beginning farmer context — newer operation with a strong training and access mission",
      "Urban-rural connection: bridges South LA community to NorCal farm",
      "Yolo County location — eligible for Yolo County and Northern CA agricultural programs",
      "Value-added products through The Factory / farm-to-supply chain model",
    ],
    bestFor: [
      "USDA beginning farmer and rancher grants",
      "CDFA urban and agricultural grants",
      "Farm to fork / farm to community grants",
      "Sustainable agriculture grants",
      "Farmworker training and workforce programs",
      "Rural development grants",
      "Cooperative or community farm grants",
    ],
    demographics: ["Black-led", "Women-led", "Socially disadvantaged farmers", "Beginning farmers"],
    geography: "Yolo County, Woodland, California (Northern CA)",
    isNonprofit: false,
    chipBg: "#fde68a",
    chipColor: "#ff6b00",
  },
  {
    airtableValue: "Kika Keith",
    displayName: "Kika Keith",
    type: "individual",
    tagline: "CEO/Founder, LDU — Black woman entrepreneur, 50+",
    description:
      "Kika Keith is the CEO and Founder of Life Development University and Life Development Group. She is a Black woman entrepreneur and community institution-builder in South Los Angeles, a cannabis social equity pioneer, and the visionary behind both the Crenshaw campus and the Cultivation Campus. She is 50+ years old.",
    strengths: [
      "Black woman entrepreneur — qualifies for race- and gender-specific founder grants",
      "50+ age range — eligible for grants targeting mature and established founders",
      "Cannabis social equity pioneer — relevant for equity entrepreneurship recognition",
      "Community institution builder — long track record of creating lasting impact in South LA",
      "Dual-entity founder (501c3 + for-profit) — demonstrates entrepreneurial range",
    ],
    bestFor: [
      "Women entrepreneur grants and awards",
      "Black women founder grants",
      "50+ entrepreneur / second-act grants",
      "Community leadership awards",
      "Social equity entrepreneur recognition",
      "Individual founder fellowships",
    ],
    demographics: ["Black woman", "50+", "South LA community leader", "Cannabis social equity founder"],
    geography: "South Los Angeles, LA County",
    isNonprofit: false,
    chipBg: "#ede9fe",
    chipColor: "#7c3aed",
  },
  {
    airtableValue: "Kika Howze",
    displayName: "Kika Howze",
    type: "individual",
    tagline: "Implementation Lead, LDU — young Black woman tech builder, under-40",
    description:
      "Kika Howze is the Implementation Lead and co-builder of Life Development University's systems. She is Kika Keith's daughter, a young Black woman technologist and systems thinker, responsible for building the AI-powered grant operations and digital infrastructure at LDU.",
    strengths: [
      "Young Black woman in technology — strong fit for young innovator and tech entrepreneur grants",
      "Under-40 — eligible for next-generation leader and emerging entrepreneur grants",
      "AI and systems builder — relevant for technology innovation and social enterprise grants",
      "Intergenerational family enterprise narrative — unique mother-daughter story",
    ],
    bestFor: [
      "Young women entrepreneur grants (under-35 or under-40)",
      "Black women in tech grants",
      "Next-generation leader fellowships",
      "Innovation and technology grants",
      "Social entrepreneur fellowships",
    ],
    demographics: ["Black woman", "Under-40", "Tech builder", "Young entrepreneur"],
    geography: "South Los Angeles, LA County",
    isNonprofit: false,
    chipBg: "#ede9fe",
    chipColor: "#7c3aed",
  },
  {
    airtableValue: "Weleh (Individual)",
    displayName: "Weleh (Individual Artist)",
    type: "individual",
    tagline: "Visual artist — South LA, sustainable fashion, upcycling, cultural arts",
    description:
      "Weleh is the lead visual artist affiliated with Studio WELEH, based in South Los Angeles and a current LA County resident. Their practice centers on sustainable fashion, upcycling, and cultural arts — embodying 'Culture as Cultivation' through material transformation. Weleh applies as an individual for artist fellowships and individual-artist grant programs.",
    strengths: [
      "LA County resident artist — eligible for LA County-specific individual artist programs (CCF FVA, etc.)",
      "Established artistic practice — exhibitions, community work, visible cultural impact in South LA",
      "Sustainable fashion/upcycling — unique intersection of visual art and sustainability",
      "South LA community embeddedness — appeals to place-based arts funders",
      "Culture as Cultivation philosophy — distinctive artistic identity",
    ],
    bestFor: [
      "Individual artist fellowships (CCF FVA, Pollock-Krasner, etc.)",
      "Visual arts grants for individuals",
      "Sustainable / eco-arts individual grants",
      "LA County artist residency programs",
      "Creative Capital and similar individual artist awards",
    ],
    demographics: ["Individual artist", "LA County resident", "Black artist", "South LA-rooted"],
    geography: "Los Angeles County",
    isNonprofit: false,
    chipBg: "#ffe0f0",
    chipColor: "#ff1e78",
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getEntityProfile(airtableValue: string): EntityProfile | undefined {
  return ENTITY_PROFILES.find(e => e.airtableValue === airtableValue);
}

/**
 * Returns entity-specific context paragraph for use in AI prompts.
 * Falls back to LDU if the entity isn't found.
 */
export function buildEntityContext(airtableValue: string): string {
  const e = getEntityProfile(airtableValue) ?? getEntityProfile("LDU (501c3)")!;
  return `SUBMITTING ENTITY: ${e.displayName} (${e.airtableValue})
${e.description}

Key strengths:
${e.strengths.map(s => `• ${s}`).join("\n")}

Demographic qualifications: ${e.demographics.join(", ")}
Geographic reach: ${e.geography}
Grant types where this entity wins: ${e.bestFor.slice(0, 5).join(", ")}`.trim();
}

/**
 * Compact entity roster injected into enrich prompts so Claude can
 * evaluate every entity in a single pass.
 */
export const ALL_ENTITIES_PROMPT = ENTITY_PROFILES.map(e =>
  `[${e.airtableValue}] ${e.displayName} | ${e.type}
  ${e.description.slice(0, 200)}
  Best for: ${e.bestFor.slice(0, 3).join(", ")}
  Demographics: ${e.demographics.join(", ")}`
).join("\n\n");
