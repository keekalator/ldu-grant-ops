"""
LDU Grant Operations — Reporting & Compliance Agent
Manages grant reporting obligations and deadlines.
"""

from agents.base_agent import BaseAgent
from integrations.airtable_client import airtable


class ReporterAgent(BaseAgent):
    """Manages reporting calendar and compliance for awarded grants."""

    def __init__(self):
        super().__init__("Reporting & Compliance Agent")

    def run(self, **kwargs):
        """Check upcoming report deadlines and alert on overdue items."""
        self.log_activity("Report Check", "Scanning upcoming reports")

        try:
            upcoming = airtable.get_upcoming_reports(30)
            self.log_activity("Report Check", f"{len(upcoming)} reports due in 30 days")
            return {"upcoming_count": len(upcoming), "reports": upcoming}
        except Exception as e:
            self.log_error("Report Check", e)
            return {"error": str(e)}
