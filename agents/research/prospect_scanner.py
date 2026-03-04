"""
LDU Grant Operations — Prospect Scanner Agent
Daily scan of Instrumentl alerts + manual source monitoring.
"""

from agents.base_agent import BaseAgent
from agents.research.eligibility import EligibilityAgent
from agents.research.scorer import ScoringAgent
from agents.writing.writing_plan import WritingPlanAgent
from integrations.airtable_client import airtable
from loguru import logger


class ProspectScanner(BaseAgent):
    """Scans for new grant prospects daily from automated and manual sources."""

    def __init__(self):
        super().__init__("Prospect Scanner")
        self.screener = EligibilityAgent()
        self.scorer = ScoringAgent()
        self.planner = WritingPlanAgent()

    def run(self, **kwargs):
        """Run the daily prospect scan cycle."""
        mode = kwargs.get("mode", "scan")

        if mode == "test":
            return self._test_connections()
        elif mode == "scan":
            return self._run_daily_scan()

    def _test_connections(self):
        """Test that all required services are reachable."""
        self.log_activity("Test", "Testing connections...")
        results = {"airtable": False, "screening": False, "scoring": False}

        try:
            summary = airtable.get_pipeline_summary()
            results["airtable"] = True
            self.log_success("Test", f"Airtable OK — {sum(summary.values())} records")
        except Exception as e:
            self.log_error("Test Airtable", e)

        results["screening"] = True  # Screening is local logic
        results["scoring"] = True    # Scoring is local logic

        return results

    def _run_daily_scan(self):
        """Execute the full daily scan: check new prospects → screen → score."""
        self.log_activity("Daily Scan", "Starting...")

        # Pull new prospects from Airtable (Instrumentl pushes them via Make.com)
        try:
            new_prospects = airtable.get_opportunities_by_status("Prospect")
            self.log_activity("Daily Scan", f"Found {len(new_prospects)} new prospects")
        except Exception as e:
            self.log_error("Daily Scan", e)
            return {"error": str(e)}

        results = {"scanned": len(new_prospects), "qualified": 0, "disqualified": 0, "queued": 0}

        for record in new_prospects:
            fields = record.get("fields", {})
            prospect = {
                "name": fields.get("Grant Name", "Unknown"),
                "description": fields.get("Notes", ""),
                "funder": fields.get("Funder", ""),
                "deadline": fields.get("Deadline", ""),
                "amount_high": fields.get("Award Amount Range", 0),
                "geography": "",
                "requirements": "",
            }

            # Screen
            eligibility = self.screener.run(prospect)

            if eligibility["qualified"]:
                results["qualified"] += 1
                # Score
                score_result = self.scorer.run(prospect, eligibility)
                if score_result["enters_writing_queue"]:
                    results["queued"] += 1
                # Auto-generate writing plan for every qualified prospect
                if not record.get("fields", {}).get("Writing Plan"):
                    self.planner.run(record)
            else:
                results["disqualified"] += 1

        self.log_success("Daily Scan", f"Scanned: {results['scanned']}, Qualified: {results['qualified']}, Queued: {results['queued']}")
        return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true")
    parser.add_argument("--scan", action="store_true")
    args = parser.parse_args()

    scanner = ProspectScanner()
    if args.test:
        scanner.run(mode="test")
    elif args.scan:
        scanner.run(mode="scan")
