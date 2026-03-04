"""
LDU Grant Operations — Make.com Webhook Integration
Triggers for all 7 Make.com automation scenarios.
"""

import httpx
from typing import Dict, Any
from config.settings import settings
from loguru import logger


class MakeWebhookClient:
    """Client for triggering Make.com automation scenarios."""

    def __init__(self):
        self.client = httpx.Client(timeout=30.0)

    def _trigger(self, webhook_url: str, payload: Dict[str, Any], scenario_name: str) -> bool:
        """Send a webhook trigger to Make.com."""
        if not webhook_url:
            logger.warning(f"No webhook URL configured for: {scenario_name}")
            return False
        try:
            response = self.client.post(webhook_url, json=payload)
            response.raise_for_status()
            logger.info(f"Triggered Make.com scenario: {scenario_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to trigger {scenario_name}: {e}")
            return False

    def trigger_prospect_intake(self, prospect_data: Dict) -> bool:
        """Scenario 1: New prospect from Instrumentl → create Airtable record."""
        return self._trigger(settings.make_webhook_prospect_intake, prospect_data, "Prospect Intake")

    def trigger_deadline_sync(self, grant_data: Dict) -> bool:
        """Scenario 2: New record with deadline → Google Calendar events at D-28, D-14, D-7, D-3."""
        return self._trigger(settings.make_webhook_deadline_sync, grant_data, "Deadline Calendar Sync")

    def trigger_submission_followup(self, submission_data: Dict) -> bool:
        """Scenario 3: Status → Submitted → Day 0, Day 3, Day 14 follow-ups."""
        return self._trigger(settings.make_webhook_submission_followup, submission_data, "Post-Submission Follow-Up")

    def trigger_report_alert(self, report_data: Dict) -> bool:
        """Scenario 4: Report due date approaching → alerts at 30, 14, 7 days."""
        return self._trigger(settings.make_webhook_report_alert, report_data, "Report Due Alert")

    def trigger_award_onboarding(self, award_data: Dict) -> bool:
        """Scenario 5: Status → Awarded → create reporting records, set up calendar."""
        return self._trigger(settings.make_webhook_award_onboard, award_data, "Award Onboarding")

    def trigger_decline_recovery(self, decline_data: Dict) -> bool:
        """Scenario 6: Status → Declined → AI drafts feedback request, flags dossier."""
        return self._trigger(settings.make_webhook_decline_recovery, decline_data, "Decline Recovery")

    def trigger_weekly_summary(self, summary_data: Dict) -> bool:
        """Scenario 7: Friday 4PM → pipeline summary to Kika Keith via Poke."""
        return self._trigger(settings.make_webhook_weekly_summary, summary_data, "Weekly CEO Summary")


make = MakeWebhookClient()
