"""
LDU Grant Operations — Grants.gov Public API Client
Searches the federal grants database with no authentication required.

API docs: https://www.grants.gov/web/grants/s2s/grantor/get-opportunity-list.html
Primary endpoint: POST https://apply07.grants.gov/grantsws/rest/opportunities/search/
"""

import httpx
from typing import Dict, List, Optional
from datetime import datetime
from loguru import logger


GRANTS_GOV_SEARCH_URL = "https://apply07.grants.gov/grantsws/rest/opportunities/search/"

# Federal agency codes most relevant to LDU's pillars
RELEVANT_AGENCY_CODES = [
    "AG",   # USDA — Pillar 4 (agriculture, land, rural dev) + Pillar 1 (community facilities)
    "ART",  # National Endowment for the Arts — Pillar 3 (Studio WELEH)
    "DL",   # Dept of Labor — Pillar 2 (workforce)
    "EP",   # EPA — Pillar 6 (circular economy, textile)
    "HU",   # HUD — Pillar 1 (community development), Pillar 2
    "EDA",  # Economic Development Administration — Pillars 1, 4
    "ED",   # Dept of Education — Pillar 2 (digital literacy, vocational)
    "SBA",  # Small Business Administration — Pillar 5 (founder)
]


class GrantsGovClient:
    """
    Client for the Grants.gov public search API.
    No API key required — federal law requires public access.
    """

    def __init__(self):
        self.client = httpx.Client(
            timeout=30.0,
            headers={"Content-Type": "application/json"},
        )

    def search(
        self,
        keyword: str,
        rows: int = 25,
        status: str = "posted",
        sort_by: str = "openDate|desc",
    ) -> List[Dict]:
        """
        Search Grants.gov for open opportunities matching a keyword.

        Args:
            keyword: Search term (e.g., 'workforce development South LA')
            rows: Number of results to return (max 25 per call)
            status: 'posted', 'closed', 'archived'
            sort_by: Sort order for results

        Returns:
            List of raw opportunity dicts from the API
        """
        payload = {
            "rows": rows,
            "keyword": keyword,
            "oppStatuses": status,
            "sortBy": sort_by,
        }

        try:
            response = self.client.post(GRANTS_GOV_SEARCH_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            opportunities = data.get("oppHits", [])
            logger.info(f"Grants.gov [{keyword}]: {len(opportunities)} results")
            return opportunities
        except httpx.HTTPStatusError as e:
            logger.error(f"Grants.gov HTTP error for '{keyword}': {e.response.status_code}")
            return []
        except Exception as e:
            logger.error(f"Grants.gov search failed for '{keyword}': {e}")
            return []

    def search_by_agency(self, agency_code: str, rows: int = 25) -> List[Dict]:
        """Search for all open opportunities from a specific federal agency."""
        payload = {
            "rows": rows,
            "agencyCode": agency_code,
            "oppStatuses": "posted",
            "sortBy": "openDate|desc",
        }

        try:
            response = self.client.post(GRANTS_GOV_SEARCH_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            opportunities = data.get("oppHits", [])
            logger.info(f"Grants.gov [agency={agency_code}]: {len(opportunities)} results")
            return opportunities
        except Exception as e:
            logger.error(f"Grants.gov agency search failed for '{agency_code}': {e}")
            return []

    def parse_opportunity(self, raw: Dict) -> Dict:
        """
        Convert a raw Grants.gov opportunity dict into LDU's standard prospect format.
        This is the same format used by InstrumentlClient.parse_alert_data().
        """
        # Parse deadline from Grants.gov date format (MM/DD/YYYY)
        close_date_raw = raw.get("closeDate", "") or raw.get("closeDateStr", "")
        deadline = self._parse_date(close_date_raw)

        # Parse award amounts (Grants.gov provides these as strings or ints)
        award_floor = self._safe_int(raw.get("awardFloor", 0))
        award_ceiling = self._safe_int(raw.get("awardCeiling", 0))

        # Build a clean description from available fields
        synopsis = raw.get("synopsis", "") or raw.get("description", "") or ""
        agency = raw.get("agencyName", "") or raw.get("agency", "")
        title = raw.get("title", "") or raw.get("opportunityTitle", "")
        opp_number = raw.get("number", "") or raw.get("opportunityNumber", "")

        return {
            "name": title,
            "funder": agency,
            "description": synopsis[:2000] if synopsis else f"Federal opportunity from {agency}",
            "deadline": deadline,
            "amount_low": award_floor,
            "amount_high": award_ceiling,
            "geography": "National",
            "url": f"https://www.grants.gov/search-results-detail/{raw.get('id', '')}",
            "source": "AutoScrape-GrantsGov",
            "external_id": opp_number,
            "cfda": raw.get("cfdaList", [""])[0] if raw.get("cfdaList") else "",
        }

    def search_for_ldu(self, keywords: List[str], max_per_keyword: int = 15) -> List[Dict]:
        """
        Run a batch of keyword searches relevant to LDU and return parsed, deduplicated results.

        Args:
            keywords: List of search terms to query
            max_per_keyword: Max results per keyword (keep low to avoid noise)

        Returns:
            List of parsed prospect dicts, deduplicated by opportunity number
        """
        seen_ids: set = set()
        results: List[Dict] = []

        for keyword in keywords:
            raw_hits = self.search(keyword=keyword, rows=max_per_keyword)
            for hit in raw_hits:
                opp_number = hit.get("number") or hit.get("opportunityNumber") or hit.get("id")
                if opp_number and opp_number in seen_ids:
                    continue
                if opp_number:
                    seen_ids.add(opp_number)
                parsed = self.parse_opportunity(hit)
                if parsed["name"]:  # Skip empty results
                    results.append(parsed)

        logger.info(f"Grants.gov batch search: {len(results)} unique opportunities across {len(keywords)} keywords")
        return results

    # ----------------------------------------------------------
    # Helpers
    # ----------------------------------------------------------

    @staticmethod
    def _parse_date(date_str: str) -> str:
        """Convert MM/DD/YYYY or YYYY-MM-DD to YYYY-MM-DD for Airtable."""
        if not date_str:
            return ""
        for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y"):
            try:
                return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return ""

    @staticmethod
    def _safe_int(value) -> int:
        """Safely convert a value to int, returning 0 on failure."""
        try:
            return int(str(value).replace(",", "").replace("$", "").strip())
        except (ValueError, TypeError):
            return 0


# Singleton
grants_gov = GrantsGovClient()
