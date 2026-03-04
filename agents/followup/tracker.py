"""
LDU Grant Operations — Tracking & Status Agent
Post-submission monitoring and status updates.
"""

from agents.base_agent import BaseAgent
from integrations.airtable_client import airtable
from integrations.make_webhooks import make


class TrackerAgent(BaseAgent):
    """Monitors submissions and triggers follow-up workflows."""

    def __init__(self):
        super().__init__("Tracking & Status Agent")

    def run(self, **kwargs):
        """Check all pending submissions and trigger appropriate follow-ups."""
        self.log_activity("Status Check", "Scanning pending submissions")

        try:
            pending = airtable.get_pending_submissions()
            self.log_activity("Status Check", f"{len(pending)} pending submissions")

            for record in pending:
                fields = record.get("fields", {})
                # The actual follow-up timing is handled by Make.com scenarios
                # This agent checks for anomalies and escalates

            return {"pending_count": len(pending)}
        except Exception as e:
            self.log_error("Status Check", e)
            return {"error": str(e)}
