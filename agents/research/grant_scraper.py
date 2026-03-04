"""
LDU Grant Operations — Grant Discovery Scraper Agent

Proactively discovers new grant opportunities from multiple public sources
and pushes them directly into Airtable as Prospect records — no Instrumentl
email alerts or Make.com required.

Sources:
  1. Grants.gov API          — Federal grants (USDA, NEA, DOL, EPA, HUD, EDA, DOEd, SBA)
  2. California Arts Council — State arts grants (Pillar 3)
  3. CalRecycle              — Recycled fiber / textile / circular economy grants (Pillar 6)
  4. LA County Arts Comm.    — Local arts funding (Pillar 3)

Run via:
  python scripts/run_pipeline.py --mode scrape
"""

import hashlib
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

import httpx
from bs4 import BeautifulSoup
from loguru import logger

from agents.base_agent import BaseAgent
from config.pillars import ALL_PILLARS, get_all_keywords, match_pillars
from integrations.airtable_client import airtable
from integrations.grants_gov import grants_gov


# ---------------------------------------------------------------------------
# Keyword clusters — focused search terms grouped by pillar
# Keeping these tight reduces API noise
# ---------------------------------------------------------------------------

SEARCH_KEYWORD_CLUSTERS: Dict[str, List[str]] = {
    "P1_capital": [
        "nonprofit community facility South LA",
        "capital improvement 501c3 Los Angeles",
        "facility renovation nonprofit California",
        "land acquisition agricultural nonprofit",
    ],
    "P2_programming": [
        "workforce development South Los Angeles",
        "digital literacy youth training California",
        "re-entry workforce program Los Angeles",
        "AI technology training community nonprofit",
        "vocational skills youth Los Angeles County",
    ],
    "P3_arts": [
        "arts education youth Los Angeles",
        "artist incubator community arts California",
        "sustainable fashion arts nonprofit",
        "community arts program South LA",
    ],
    "P4_agriculture": [
        "beginning farmer youth agriculture California",
        "USDA urban agriculture nonprofit",
        "land-based education environmental justice",
        "agricultural workforce development rural",
        "beginning farmer rancher development",
    ],
    "P5_founder": [
        "women entrepreneur grant California",
        "Black women business grant",
        "minority business development grant",
        "BIPOC founder small business",
        "cannabis social equity grant California",
    ],
    "P6_textile": [
        "textile recycling circular economy grant",
        "sustainable apparel nonprofit California",
        "waste diversion manufacturing California",
        "recycled fiber plastic glass CalRecycle",
    ],
}


class GrantScraperAgent(BaseAgent):
    """
    Discovers grant opportunities from multiple public sources,
    deduplicates against Airtable, and creates Prospect records automatically.
    """

    def __init__(self):
        super().__init__("Grant Scraper Agent")
        self.http = httpx.Client(
            timeout=20.0,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/122.0.0.0 Safari/537.36"
                )
            },
        )

    def run(self, **kwargs) -> Dict:
        """
        Execute the full scrape cycle.

        Returns:
            {
                "total_found": int,
                "new_added": int,
                "duplicates_skipped": int,
                "errors": int,
                "sources": { source_name: count_added }
            }
        """
        self.log_activity("Scrape Cycle", "Starting multi-source grant discovery")

        stats = {
            "total_found": 0,
            "new_added": 0,
            "duplicates_skipped": 0,
            "errors": 0,
            "sources": {},
        }

        # Load existing records once for efficient dedup
        existing_fingerprints = self._load_existing_fingerprints()
        self.log_activity("Dedup Cache", f"Loaded {len(existing_fingerprints)} existing records")

        # Run each source
        sources = [
            ("Grants.gov", self._scrape_grants_gov),
            ("CA Arts Council", self._scrape_ca_arts_council),
            ("CalRecycle", self._scrape_calrecycle),
            ("LA County Arts", self._scrape_la_county_arts),
        ]

        for source_name, scrape_fn in sources:
            try:
                self.log_activity(f"Scraping {source_name}", "...")
                raw_prospects = scrape_fn()
                stats["total_found"] += len(raw_prospects)

                added = 0
                for prospect in raw_prospects:
                    fp = self._fingerprint(prospect)
                    if fp in existing_fingerprints:
                        stats["duplicates_skipped"] += 1
                        continue

                    if self._push_to_airtable(prospect):
                        existing_fingerprints.add(fp)
                        added += 1
                        stats["new_added"] += 1
                    else:
                        stats["errors"] += 1

                stats["sources"][source_name] = added
                self.log_success(f"{source_name}", f"{len(raw_prospects)} found, {added} new")

            except Exception as e:
                self.log_error(f"Source: {source_name}", e)
                stats["errors"] += 1
                stats["sources"][source_name] = 0

        self.log_success(
            "Scrape Cycle Complete",
            f"Total found: {stats['total_found']} | "
            f"New: {stats['new_added']} | "
            f"Skipped: {stats['duplicates_skipped']}",
        )
        return stats

    # =========================================================================
    # SOURCE 1: Grants.gov (Federal)
    # =========================================================================

    def _scrape_grants_gov(self) -> List[Dict]:
        """Query Grants.gov API with LDU's keyword clusters."""
        all_keywords = []
        for cluster in SEARCH_KEYWORD_CLUSTERS.values():
            all_keywords.extend(cluster)

        # Deduplicate keywords before sending
        all_keywords = list(dict.fromkeys(all_keywords))

        raw = grants_gov.search_for_ldu(keywords=all_keywords, max_per_keyword=10)

        # Filter to opportunities with meaningful award sizes
        filtered = [
            p for p in raw
            if p.get("amount_high", 0) >= 5000 or p.get("amount_low", 0) >= 5000
            or (p.get("amount_high", 0) == 0 and p.get("amount_low", 0) == 0)  # Keep if amount unknown
        ]

        # Attach pillar matches
        for prospect in filtered:
            text = f"{prospect['name']} {prospect['description']}"
            matches = match_pillars(text)
            prospect["pillar_matches"] = [p.id for p in matches]

        return filtered

    # =========================================================================
    # SOURCE 2: California Arts Council
    # =========================================================================

    def _scrape_ca_arts_council(self) -> List[Dict]:
        """Scrape open grant programs from the California Arts Council."""
        url = "https://arts.ca.gov/grants/"
        prospects = []

        try:
            resp = self.http.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # CAC grant listings are typically in article cards or list items with headings
            grant_cards = (
                soup.find_all("article")
                or soup.find_all("div", class_=lambda c: c and "grant" in c.lower())
                or soup.find_all("li", class_=lambda c: c and "grant" in c.lower())
            )

            for card in grant_cards[:20]:  # Cap at 20
                title_tag = card.find(["h2", "h3", "h4", "a"])
                if not title_tag:
                    continue
                title = title_tag.get_text(strip=True)
                if not title or len(title) < 5:
                    continue

                link_tag = card.find("a", href=True)
                link = link_tag["href"] if link_tag else url
                if link.startswith("/"):
                    link = "https://arts.ca.gov" + link

                desc_tag = card.find("p")
                description = desc_tag.get_text(strip=True) if desc_tag else ""

                prospects.append({
                    "name": title,
                    "funder": "California Arts Council",
                    "description": description,
                    "deadline": "",
                    "amount_low": 0,
                    "amount_high": 0,
                    "geography": "California",
                    "url": link,
                    "source": "AutoScrape-CAArts",
                    "external_id": self._fingerprint({"name": title, "funder": "California Arts Council"}),
                    "pillar_matches": ["P3"],
                })

            # Fallback: grab all links on the grants page if no cards found
            if not prospects:
                for link_tag in soup.find_all("a", href=True)[:30]:
                    href = link_tag["href"]
                    text = link_tag.get_text(strip=True)
                    if (
                        len(text) > 10
                        and any(kw in text.lower() for kw in ["grant", "program", "award", "fund"])
                        and "arts.ca.gov" in href or href.startswith("/")
                    ):
                        full_url = ("https://arts.ca.gov" + href) if href.startswith("/") else href
                        prospects.append({
                            "name": text,
                            "funder": "California Arts Council",
                            "description": f"Grant program listed at {url}",
                            "deadline": "",
                            "amount_low": 0,
                            "amount_high": 0,
                            "geography": "California",
                            "url": full_url,
                            "source": "AutoScrape-CAArts",
                            "external_id": self._fingerprint({"name": text, "funder": "CAC"}),
                            "pillar_matches": ["P3"],
                        })

        except Exception as e:
            logger.error(f"CA Arts Council scrape failed: {e}")

        return prospects

    # =========================================================================
    # SOURCE 3: CalRecycle
    # =========================================================================

    def _scrape_calrecycle(self) -> List[Dict]:
        """Scrape grant programs from CalRecycle (SB 707, textile, circular economy)."""
        url = "https://calrecycle.ca.gov/Funding/"
        prospects = []

        try:
            resp = self.http.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # CalRecycle funding pages use tables and lists of programs
            rows = soup.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) < 2:
                    continue

                title = cells[0].get_text(strip=True)
                description = cells[1].get_text(strip=True) if len(cells) > 1 else ""

                if not title or len(title) < 5:
                    continue

                link_tag = cells[0].find("a", href=True)
                link = link_tag["href"] if link_tag else url
                if link.startswith("/"):
                    link = "https://calrecycle.ca.gov" + link

                # Only include grants relevant to LDU (textile, recycling, manufacturing)
                combined = (title + " " + description).lower()
                if not any(kw in combined for kw in [
                    "textile", "fiber", "plastic", "recycl", "manufactur",
                    "circular", "waste", "diversion", "apparel", "grant", "fund"
                ]):
                    continue

                prospects.append({
                    "name": title,
                    "funder": "CalRecycle",
                    "description": description,
                    "deadline": "",
                    "amount_low": 0,
                    "amount_high": 0,
                    "geography": "California",
                    "url": link,
                    "source": "AutoScrape-CalRecycle",
                    "external_id": self._fingerprint({"name": title, "funder": "CalRecycle"}),
                    "pillar_matches": ["CROSS_TEXTILE", "P3", "P4"],
                })

            # Also try the grants-specific subpage
            if not prospects:
                for link_tag in soup.find_all("a", href=True):
                    text = link_tag.get_text(strip=True)
                    href = link_tag["href"]
                    if len(text) > 10 and any(kw in text.lower() for kw in ["grant", "fund", "loan"]):
                        full_url = ("https://calrecycle.ca.gov" + href) if href.startswith("/") else href
                        prospects.append({
                            "name": text,
                            "funder": "CalRecycle",
                            "description": "CalRecycle funding program",
                            "deadline": "",
                            "amount_low": 0,
                            "amount_high": 0,
                            "geography": "California",
                            "url": full_url,
                            "source": "AutoScrape-CalRecycle",
                            "external_id": self._fingerprint({"name": text, "funder": "CalRecycle"}),
                            "pillar_matches": ["CROSS_TEXTILE"],
                        })

        except Exception as e:
            logger.error(f"CalRecycle scrape failed: {e}")

        return prospects[:15]  # Cap to avoid noise

    # =========================================================================
    # SOURCE 4: LA County Arts Commission
    # =========================================================================

    def _scrape_la_county_arts(self) -> List[Dict]:
        """Scrape grant programs from the LA County Arts Commission."""
        url = "https://www.lacountyarts.org/funding"
        prospects = []

        try:
            resp = self.http.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Look for grant program cards/links
            for heading in soup.find_all(["h2", "h3", "h4"]):
                title = heading.get_text(strip=True)
                if not title or len(title) < 5:
                    continue
                if not any(kw in title.lower() for kw in ["grant", "fund", "award", "program"]):
                    continue

                # Get description from adjacent paragraph
                desc_tag = heading.find_next("p")
                description = desc_tag.get_text(strip=True) if desc_tag else ""

                # Get link
                link_tag = heading.find("a", href=True) or heading.find_next("a", href=True)
                link = link_tag["href"] if link_tag else url
                if link.startswith("/"):
                    link = "https://www.lacountyarts.org" + link

                prospects.append({
                    "name": title,
                    "funder": "LA County Arts Commission",
                    "description": description,
                    "deadline": "",
                    "amount_low": 0,
                    "amount_high": 0,
                    "geography": "Los Angeles County",
                    "url": link,
                    "source": "AutoScrape-LACountyArts",
                    "external_id": self._fingerprint({"name": title, "funder": "LACAC"}),
                    "pillar_matches": ["P3", "P2"],
                })

        except Exception as e:
            logger.error(f"LA County Arts scrape failed: {e}")

        return prospects[:15]

    # =========================================================================
    # Airtable Integration
    # =========================================================================

    def _load_existing_fingerprints(self) -> set:
        """
        Load a set of fingerprints for all existing Airtable opportunity records.
        Used to skip duplicates without making per-record API calls.
        """
        fingerprints = set()
        try:
            all_opps = airtable.opportunities.all(fields=["Grant Name", "Funder", "Source"])
            for record in all_opps:
                fields = record.get("fields", {})
                fp = self._fingerprint({
                    "name": fields.get("Grant Name", ""),
                    "funder": fields.get("Funder", ""),
                })
                fingerprints.add(fp)
                # Also store external_id if present in the name
                external_id = fields.get("External ID", "")
                if external_id:
                    fingerprints.add(external_id)
        except Exception as e:
            logger.error(f"Failed to load existing Airtable records for dedup: {e}")

        return fingerprints

    def _push_to_airtable(self, prospect: Dict) -> bool:
        """
        Create a new Opportunity record in Airtable from a scraped prospect.

        Returns True on success, False on failure.
        """
        pillar_matches = prospect.get("pillar_matches", [])

        airtable_record = {
            "Grant Name": prospect.get("name", "")[:255],
            # Funder is a linked record field — name stored in Notes
            "Status": "Prospect",
            "Source": prospect.get("source", "AutoScrape"),
            "Notes": self._build_notes(prospect),
            "Deadline": prospect.get("deadline") or None,
            "Award Amount Range": prospect.get("amount_high") or prospect.get("amount_low") or 0,
            "Pillar": pillar_matches[:1] if pillar_matches else [],
            "Submitting Entity": self._route_entity(prospect),
            "Priority": "MEDIUM",
        }

        # Remove None values — Airtable rejects them
        airtable_record = {k: v for k, v in airtable_record.items() if v is not None and v != ""}

        try:
            airtable.opportunities.create(airtable_record, typecast=True)
            logger.info(f"Created prospect: {prospect['name']} [{prospect.get('source')}]")
            return True
        except Exception as e:
            logger.error(f"Failed to create Airtable record for '{prospect.get('name')}': {e}")
            return False

    @staticmethod
    def _route_entity(prospect: Dict) -> str:
        """
        Determine which LDU entity should submit this application based on
        the grant's description, geography, and pillar matches.

        Rules (in priority order):
          - For-profit only / business grant → Studio WELEH (For-Profit)
          - Individual artist grant           → Weleh (Individual)
          - Cannabis / social equity          → Gorilla Rx (For-Profit)
          - Agricultural / farm entity        → Farm Entity (TBD)
          - Everything else                   → LDU (501c3) [default nonprofit]
        """
        text = (
            prospect.get("description", "") + " " + prospect.get("name", "")
        ).lower()
        pillar_ids = prospect.get("pillar_matches", [])

        # For-profit / small business signals
        if any(kw in text for kw in [
            "for-profit", "small business", "business owner",
            "entrepreneur grant", "woman-owned business",
        ]):
            return "Studio WELEH (For-Profit)"

        # Individual artist signals
        if any(kw in text for kw in [
            "individual artist", "emerging artist", "artist fellowship",
            "visual artist", "craft prize", "artist grant",
        ]):
            return "Weleh (Individual)"

        # Cannabis / social equity signals
        if any(kw in text for kw in ["cannabis", "social equity dispensary", "marijuana"]):
            return "Gorilla Rx (For-Profit)"

        # Agricultural / farm entity signals
        if any(kw in text for kw in [
            "beginning farmer", "agricultural producer", "farm ownership",
            "rancher", "farm entity", "usda fsa",
        ]) or pillar_ids == ["P4"]:
            return "Farm Entity (TBD)"

        return "LDU (501c3)"

    # =========================================================================
    # Utilities
    # =========================================================================

    @staticmethod
    def _fingerprint(prospect: Dict) -> str:
        """
        Create a stable fingerprint for a prospect to detect duplicates.
        Uses normalized grant name + funder name.
        """
        raw = f"{prospect.get('name', '').strip().lower()}|{prospect.get('funder', '').strip().lower()}"
        return hashlib.md5(raw.encode()).hexdigest()

    @staticmethod
    def _build_notes(prospect: Dict) -> str:
        """Build a structured notes field for Airtable from all available prospect data."""
        lines = [
            f"Source: {prospect.get('source', 'AutoScrape')}",
            f"URL: {prospect.get('url', '')}",
        ]

        if prospect.get("description"):
            lines.append(f"\nDescription:\n{prospect['description'][:1000]}")

        if prospect.get("cfda"):
            lines.append(f"\nCFDA: {prospect['cfda']}")

        if prospect.get("external_id"):
            lines.append(f"External ID: {prospect['external_id']}")

        if prospect.get("pillar_matches"):
            pillar_names = []
            for pid in prospect["pillar_matches"]:
                if pid in ALL_PILLARS:
                    pillar_names.append(ALL_PILLARS[pid].name)
            if pillar_names:
                lines.append(f"\nPillar Match: {', '.join(pillar_names)}")

        lines.append(f"\nAuto-discovered: {date.today().isoformat()}")
        return "\n".join(lines)
