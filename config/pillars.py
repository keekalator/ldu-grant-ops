"""
LDU Grant Operations — Funding Pillars Configuration
All 6 funding categories with keywords, targets, priority funders, and narratives.
Source: LDU Grant Operations Plan v2.0
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class FundingPillar:
    """A funding pillar with all associated metadata for prospect matching and scoring."""
    id: str
    name: str
    description: str
    target_amount_low: int
    target_amount_high: int
    target_apps_per_year: tuple  # (min, max)
    keywords: List[str]
    priority_funders: List[str]
    key_narrative: str
    programs: List[str] = field(default_factory=list)
    is_cross_cutting: bool = False


# ============================================================
# PILLAR DEFINITIONS
# ============================================================

PILLAR_1_CAPITAL = FundingPillar(
    id="P1",
    name="Capital Campaign",
    description="Dual-site facility buildout (4241 Crenshaw) + farm land acquisition (Woodland/Winters, Yolo County)",
    target_amount_low=3_500_000,
    target_amount_high=9_000_000,
    target_apps_per_year=(8, 12),
    keywords=[
        "community facilities", "capital improvement", "construction", "renovation",
        "facility buildout", "campus development", "South LA", "Crenshaw corridor",
        "nonprofit facility", "building acquisition", "nonprofit capital",
    ],
    priority_funders=[
        "Weingart Foundation",
        "LA County Measure A",
        "USDA Community Facilities",
        "EDA Public Works Program",
        "CDFI Fund (Capital Magnet Fund)",
        "Kresge Foundation",
        "California Cultural & Historical Endowment",
        "New Markets Tax Credits (NMTC)",
        "USDA Farm Ownership Loans (FSA)",
        "USDA EQIP",
        "California Strategic Growth Council",
    ],
    key_narrative=(
        "Transforming a historically underinvested corridor into a hub for workforce development, "
        "cultural production, and community resilience. The dual-site model extends this transformation "
        "beyond the urban core—connecting South LA's creative and workforce economy to Northern California's "
        "agricultural landscape."
    ),
)

PILLAR_2_PROGRAMMING = FundingPillar(
    id="P2",
    name="Programming & Operations",
    description="Full range of workforce development, education, community outreach, and operational programs",
    target_amount_low=750_000,
    target_amount_high=2_000_000,
    target_apps_per_year=(20, 30),
    keywords=[
        "workforce development", "job training", "digital literacy", "AI training",
        "technology education", "vocational skills", "music education", "music programs",
        "entrepreneurship", "youth development", "re-entry workforce", "community education",
        "apprenticeship", "camera operating", "film production", "venue operations",
    ],
    programs=[
        "AI + Technology Training",
        "Camera Operating & Content Production",
        "Vocational Skills Training",
        "Music Programs & Production",
        "Venue Rental Operations",
        "Digital Literacy",
        "Entrepreneurship Education",
        "Youth Development",
        "Re-Entry Workforce",
        "Community Education & Outreach",
    ],
    priority_funders=[
        "California Endowment",
        "City of LA EWDD",
        "CA Employment Development Dept (ETPP)",
        "CA Apprenticeship Innovation Funding",
        "Honda Education Pillar",
        "DOL Workforce Innovation",
        "WIOA Title I Adult/Youth",
        "Lumina Foundation",
        "JP Morgan Chase Foundation",
        "Wells Fargo Foundation",
        "LA County DCBA",
        "Ballmer Group",
        "OpenAI People-First AI Fund",
        "Crail-Johnson Foundation",
    ],
    key_narrative=(
        "LDU prepares South LA residents for the economy that's emerging. AI/technology literacy, "
        "camera operating, music production, and skilled trades form an integrated workforce ecosystem "
        "where participants discover career paths through exploration and progress through demonstrated competency."
    ),
)

PILLAR_3_STUDIO_WELEH = FundingPillar(
    id="P3",
    name="Studio WELEH",
    description="Arts, apparel & sustainability funnel — lead funnel for all arts and apparel tracks at LDU",
    target_amount_low=400_000,
    target_amount_high=1_200_000,
    target_apps_per_year=(8, 12),
    keywords=[
        "artist incubator", "arts education", "creative economy", "cultural development",
        "community arts", "youth arts workshops", "art exhibitions", "sustainable fashion",
        "textile upcycling", "apparel design", "sustainability education", "content creation",
        "studio space", "art supplies", "upcycling", "closed-loop textile", "youth arts",
    ],
    programs=[
        "Artist Incubator (studio space, mentorship, career dev)",
        "Youth Workshops (visual arts, design, creative expression)",
        "Art Shows & Exhibitions",
        "Sustainable Apparel Design & Upcycling Courses",
        "Content Creation (digital storytelling, portfolio, social media)",
        "Field Trips (studio, cultural institutions, industry visits)",
        "Supply Procurement & Equipment",
    ],
    priority_funders=[
        "NEA Art Works / Our Town",
        "California Arts Council",
        "LA County Arts Commission",
        "Andy Warhol Foundation",
        "Ford Foundation",
        "Surdna Foundation",
        "Bloomberg Philanthropies",
        "Destination Crenshaw Partnership",
        "ArtPlace America",
        "CalRecycle Recycled Fiber/Plastic/Glass Grant",
        "California Climate Investments",
        "Barney & Barney Foundation",
        "EPA Circular Economy Grants",
    ],
    key_narrative=(
        "Studio WELEH is the operational engine for LDU's entire arts and apparel ecosystem. "
        "Sustainable apparel courses teach closed-loop design—collecting, cleaning, redesigning, "
        "and upcycling textiles—positioning LDU as a CalRecycle-ready textile diversion partner "
        "aligned with SB 707."
    ),
)

PILLAR_4_AG_EXTENSION = FundingPillar(
    id="P4",
    name="Agricultural Extension & Manufacturing",
    description="Cultivation Campus in NorCal — seasonal exchange, action sports, wellness, clothing factory, trades",
    target_amount_low=2_000_000,
    target_amount_high=5_000_000,
    target_apps_per_year=(6, 10),
    keywords=[
        "beginning farmer", "urban agriculture", "youth agriculture", "land-based education",
        "farm-to-table", "environmental justice", "agricultural workforce", "seasonal exchange",
        "rural manufacturing", "clothing factory", "textile manufacturing", "action sports",
        "wellness", "land acquisition", "first-time farmer",
    ],
    programs=[
        "Seasonal Exchange Residencies (8–12 weeks)",
        "Workforce Development & Certification (carpentry, welding, solar, tiny homes)",
        "Outdoor Action Sports & Physical Development",
        "Retreat & Renewal Programming",
        "Clothing Factory & Manufacturing Hub",
        "Wellness Programming (nutrition, movement, mindfulness)",
    ],
    priority_funders=[
        "USDA Community Facilities",
        "USDA BFRDP (up to $750K)",
        "USDA 2501 Outreach",
        "USDA EQIP (90% cost-share)",
        "USDA FSA Farm Ownership Loans",
        "CDFA Urban Agriculture",
        "California Strategic Growth Council",
        "W.K. Kellogg Foundation",
        "Robert Wood Johnson Foundation",
        "Patagonia Environmental Grants",
        "National Young Farmers Coalition",
        "Tony Hawk Foundation",
        "Home Depot Foundation",
        "Habitat for Humanity",
        "CalRecycle (manufacturing)",
        "EDA Rural Economic Development",
    ],
    key_narrative=(
        "The Cultivation Campus bridges the urban-rural divide by immersing South LA youth in "
        "California's agricultural landscape and vocational trades. It also houses a clothing factory "
        "demonstrating the symbiotic relationship between LA's creative apparel industry and Northern "
        "California's agricultural economy—a closed-loop supply chain spanning the state."
    ),
)

PILLAR_5_FOUNDER = FundingPillar(
    id="P5",
    name="Founder & Enterprise",
    description="Grants targeting founder demographics — women, Black women, cannabis social equity, under-40, 50+",
    target_amount_low=50_000,
    target_amount_high=200_000,
    target_apps_per_year=(15, 25),
    keywords=[
        "women entrepreneurs", "Black women entrepreneurs", "minority business",
        "small business grants", "social equity", "cannabis social equity",
        "women-owned business", "BIPOC business", "young entrepreneur",
        "first-time landowner", "BIPOC founders",
    ],
    priority_funders=[
        "Amber Grant / WomensNet ($10K monthly + $25K annual)",
        "Comcast RISE ($5K + resources)",
        "SoGal Black Founder Grant ($5K–$10K)",
        "NAACP Powershift Grant ($25K)",
        "MBDA Women's Entrepreneurship (up to $400K/org)",
        "Black Girl Ventures ($30K+ pitch)",
        "Galaxy of Stars ($2.5K–$20K)",
        "HerRise MicroGrants ($1K monthly)",
        "U.S. Chamber Dream Big Awards ($25K)",
    ],
    key_narrative=(
        "LDU was founded by Black women entrepreneurs who turned personal adversity—including "
        "navigating the cannabis social equity system—into community infrastructure. Every dollar "
        "invested in LDU's founders extends to the community they serve—because the founders ARE "
        "the community."
    ),
)

PILLAR_TEXTILE_SB707 = FundingPillar(
    id="CROSS_TEXTILE",
    name="Textile Sustainability & SB 707",
    description="CalRecycle grants, circular economy, textile diversion — cross-cutting across P3 and P4",
    target_amount_low=500_000,
    target_amount_high=2_000_000,
    target_apps_per_year=(5, 8),
    keywords=[
        "textile recycling", "textile upcycling", "sustainable fashion", "circular economy",
        "waste diversion", "CalRecycle", "SB 707", "extended producer responsibility",
        "closed-loop manufacturing", "sustainable apparel", "recycled fiber",
    ],
    priority_funders=[
        "CalRecycle Recycled Fiber/Plastic/Glass Grant",
        "California Climate Investments",
        "SB 707 PRO infrastructure grants (2028–2030)",
        "EPA circular economy grants",
        "Patagonia / 11th Hour Project",
    ],
    key_narrative=(
        "Studio WELEH's sustainable apparel courses teach closed-loop design—collecting, cleaning, "
        "redesigning, and upcycling textiles. LDU's model is directly comparable to Suay Shop "
        "(which received $1.3M from CalRecycle)—with the added dimension of youth education and "
        "workforce development."
    ),
    is_cross_cutting=True,
)


# ============================================================
# PILLAR REGISTRY — Use this to iterate over all pillars
# ============================================================

ALL_PILLARS = {
    "P1": PILLAR_1_CAPITAL,
    "P2": PILLAR_2_PROGRAMMING,
    "P3": PILLAR_3_STUDIO_WELEH,
    "P4": PILLAR_4_AG_EXTENSION,
    "P5": PILLAR_5_FOUNDER,
    "CROSS_TEXTILE": PILLAR_TEXTILE_SB707,
}


def get_all_keywords() -> List[str]:
    """Return a flat list of all keywords across all pillars (for Instrumentl configuration)."""
    keywords = []
    for pillar in ALL_PILLARS.values():
        keywords.extend(pillar.keywords)
    return list(set(keywords))  # Deduplicate


def match_pillars(text: str) -> List[FundingPillar]:
    """Given a text (e.g., grant description), return all matching pillars based on keyword hits."""
    text_lower = text.lower()
    matches = []
    for pillar in ALL_PILLARS.values():
        for keyword in pillar.keywords:
            if keyword.lower() in text_lower:
                matches.append(pillar)
                break  # One hit is enough to match
    return matches


def get_pillar_by_id(pillar_id: str) -> Optional[FundingPillar]:
    """Look up a pillar by its ID."""
    return ALL_PILLARS.get(pillar_id)
