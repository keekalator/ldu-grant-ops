"""
LDU Grant Operations — Relationship Management Agent
Funder stewardship, thank-yous, and reapplication strategy.
"""

from agents.base_agent import BaseAgent
from integrations.airtable_client import airtable
from integrations.claude_client import claude


class RelationshipAgent(BaseAgent):
    """Manages funder relationships and stewardship communications."""

    def __init__(self):
        super().__init__("Relationship Management Agent")

    def run(self, **kwargs):
        """Generate stewardship actions for active funders."""
        self.log_activity("Stewardship", "Reviewing funder relationships")

        try:
            active_funders = airtable.get_funders_by_relationship("Active")
            strong_funders = airtable.get_funders_by_relationship("Strong")

            all_funders = active_funders + strong_funders
            self.log_activity("Stewardship", f"{len(all_funders)} funders in stewardship pipeline")

            return {"active": len(active_funders), "strong": len(strong_funders)}
        except Exception as e:
            self.log_error("Stewardship", e)
            return {"error": str(e)}
