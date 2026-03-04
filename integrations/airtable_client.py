"""
LDU Grant Operations — Airtable Integration
All Airtable read/write operations for the 6-table Grant Pipeline CRM.

Tables:
  1. Opportunities — prospects, scores, statuses, deadlines, pillar tags
  2. Funders — profiles, contacts, giving history, relationship status
  3. Submissions — applications, outcomes, amounts, feedback
  4. Reporting — active grants, report dates, deliverables
  5. Boilerplate Library — version-controlled narrative blocks
  6. Team Tasks — assignments, deadlines, completion tracking
"""

from typing import Dict, List, Optional, Any
from pyairtable import Api, Table
from config.settings import settings
from loguru import logger
import requests


REQUIRED_TABLES = [
    "Opportunities",
    "Funders",
    "Submissions",
    "Reporting",
    "Boilerplate Library",
    "Team Tasks",
]


class AirtableClient:
    """Client for all Airtable operations in the LDU Grant Pipeline."""

    def __init__(self):
        self.api = Api(settings.airtable_api_token)
        self.base_id = settings.airtable_base_id

        # Table references (names must match Airtable)
        self._tables = {}

    def _get_table(self, table_name: str) -> Table:
        """Get or create a table reference."""
        if table_name not in self._tables:
            self._tables[table_name] = self.api.table(self.base_id, table_name)
        return self._tables[table_name]

    # ==========================================================
    # OPPORTUNITIES TABLE
    # ==========================================================

    @property
    def opportunities(self) -> Table:
        return self._get_table("Opportunities")

    def create_opportunity(self, data: Dict[str, Any]) -> Dict:
        """Create a new grant opportunity record."""
        record = self.opportunities.create(data)
        logger.info(f"Created opportunity: {data.get('Grant Name', 'Unknown')}")
        return record

    def get_opportunities_by_status(self, status: str) -> List[Dict]:
        """Get all opportunities with a specific status."""
        return self.opportunities.all(formula=f"{{Status}} = '{status}'")

    def get_opportunities_by_pillar(self, pillar: str) -> List[Dict]:
        """Get all opportunities for a specific pillar."""
        return self.opportunities.all(formula=f"FIND('{pillar}', {{Pillar}})")

    def get_writing_queue(self) -> List[Dict]:
        """Get all opportunities in the writing queue."""
        return self.opportunities.all(formula="{Status} = 'Writing Queue'")

    def get_upcoming_deadlines(self, days: int = 30) -> List[Dict]:
        """Get opportunities with deadlines in the next N days."""
        return self.opportunities.all(
            formula=f"AND({{Deadline}} != '', DATETIME_DIFF({{Deadline}}, TODAY(), 'days') <= {days}, DATETIME_DIFF({{Deadline}}, TODAY(), 'days') >= 0)",
            sort=["Deadline"]
        )

    def update_opportunity(self, record_id: str, data: Dict[str, Any]) -> Dict:
        """Update an existing opportunity record."""
        record = self.opportunities.update(record_id, data)
        logger.info(f"Updated opportunity {record_id}: {list(data.keys())}")
        return record

    def update_opportunity_status(self, record_id: str, new_status: str) -> Dict:
        """Update just the status of an opportunity."""
        return self.update_opportunity(record_id, {"Status": new_status})

    def update_opportunity_score(self, record_id: str, scores: Dict[str, int], weighted: float) -> Dict:
        """Update the scoring fields for an opportunity."""
        return self.update_opportunity(record_id, {
            "Mission Fit": scores.get("mission_fit", 0),
            "Award Size": scores.get("award_size", 0),
            "Win Probability": scores.get("win_probability", 0),
            "Timeline Fit": scores.get("timeline_fit", 0),
            "Strategic Value": scores.get("strategic_value", 0),
            "Weighted Score": weighted,
        })

    # ==========================================================
    # FUNDERS TABLE
    # ==========================================================

    @property
    def funders(self) -> Table:
        return self._get_table("Funders")

    def create_funder(self, data: Dict[str, Any]) -> Dict:
        """Create a new funder record."""
        record = self.funders.create(data)
        logger.info(f"Created funder: {data.get('Funder Name', 'Unknown')}")
        return record

    def get_funder_by_name(self, name: str) -> Optional[Dict]:
        """Look up a funder by name."""
        results = self.funders.all(formula=f"{{Funder Name}} = '{name}'")
        return results[0] if results else None

    def get_funders_by_relationship(self, status: str) -> List[Dict]:
        """Get funders by relationship status."""
        return self.funders.all(formula=f"{{Relationship Status}} = '{status}'")

    # ==========================================================
    # SUBMISSIONS TABLE
    # ==========================================================

    @property
    def submissions(self) -> Table:
        return self._get_table("Submissions")

    def create_submission(self, data: Dict[str, Any]) -> Dict:
        """Log a new submission."""
        record = self.submissions.create(data)
        logger.info(f"Created submission: {data.get('Grant Name', 'Unknown')}")
        return record

    def get_pending_submissions(self) -> List[Dict]:
        """Get all submissions with pending outcomes."""
        return self.submissions.all(formula="{Outcome} = 'Pending'")

    # ==========================================================
    # REPORTING TABLE
    # ==========================================================

    @property
    def reporting(self) -> Table:
        return self._get_table("Reporting")

    def create_report_record(self, data: Dict[str, Any]) -> Dict:
        """Create a new reporting obligation record."""
        return self.reporting.create(data)

    def get_upcoming_reports(self, days: int = 30) -> List[Dict]:
        """Get reports due in the next N days."""
        return self.reporting.all(
            formula=f"AND({{Due Date}} != '', DATETIME_DIFF({{Due Date}}, TODAY(), 'days') <= {days})",
            sort=["Due Date"]
        )

    # ==========================================================
    # BOILERPLATE LIBRARY TABLE
    # ==========================================================

    @property
    def boilerplate(self) -> Table:
        return self._get_table("Boilerplate Library")

    def get_boilerplate_by_category(self, category: str) -> List[Dict]:
        """Get boilerplate sections for a specific category."""
        return self.boilerplate.all(formula=f"{{Category}} = '{category}'")

    def update_boilerplate(self, record_id: str, content: str, word_count: int) -> Dict:
        """Update a boilerplate entry with new content."""
        return self.boilerplate.update(record_id, {
            "Content": content,
            "Word Count": word_count,
            "Last Updated": self._today(),
        })

    # ==========================================================
    # TEAM TASKS TABLE
    # ==========================================================

    @property
    def tasks(self) -> Table:
        return self._get_table("Team Tasks")

    def create_task(self, data: Dict[str, Any]) -> Dict:
        """Create a new task."""
        return self.tasks.create(data)

    def get_tasks_by_assignee(self, assignee: str) -> List[Dict]:
        """Get all tasks for a specific person."""
        return self.tasks.all(formula=f"{{Assigned To}} = '{assignee}'")

    def get_tasks_by_status(self, status: str) -> List[Dict]:
        """Get all tasks with a specific status."""
        return self.tasks.all(formula=f"{{Status}} = '{status}'")

    # ==========================================================
    # UTILITIES
    # ==========================================================

    def check_health(self) -> Dict[str, Any]:
        """
        Lightweight health check for Airtable configuration.

        - Verifies the personal access token can see the base
        - Verifies all required tables exist in the base

        Returns:
            {"ok": bool, "details": str}
        """
        headers = {
            "Authorization": f"Bearer {settings.airtable_api_token}",
            "Content-Type": "application/json",
        }

        try:
            resp = requests.get(
                f"https://api.airtable.com/v0/meta/bases/{self.base_id}/tables",
                headers=headers,
                timeout=10,
            )
        except Exception as exc:
            logger.error(f"Airtable health check failed: {exc}")
            return {"ok": False, "details": f"Error contacting Airtable: {exc}"}

        if resp.status_code != 200:
            logger.error(
                f"Airtable health check unexpected status {resp.status_code}: {resp.text}"
            )
            return {
                "ok": False,
                "details": f"Airtable meta API returned {resp.status_code}: {resp.text}",
            }

        data = resp.json()
        existing = {t.get("name") for t in data.get("tables", [])}
        missing = [t for t in REQUIRED_TABLES if t not in existing]

        if missing:
            detail = (
                "Missing required tables in Airtable base "
                f"{self.base_id}: {', '.join(missing)}. "
                "Run 'python scripts/setup_airtable.py' and create the 6 tables "
                "exactly as specified in that script, then re-run the test."
            )
            logger.warning(detail)
            return {"ok": False, "details": detail}

        return {
            "ok": True,
            "details": f"Airtable base {self.base_id} is reachable; all required tables are present.",
        }

    @staticmethod
    def _today() -> str:
        from datetime import date
        return date.today().isoformat()

    def get_pipeline_summary(self) -> Dict[str, int]:
        """Get a count of opportunities by status for dashboard reporting."""
        all_opps = self.opportunities.all()
        summary = {}
        for opp in all_opps:
            status = opp["fields"].get("Status", "Unknown")
            summary[status] = summary.get(status, 0) + 1
        return summary


# Singleton instance
airtable = AirtableClient()
