"""
LDU Grant Operations — Funder Intelligence Agent
Builds comprehensive funder dossiers for top prospects.
"""

from agents.base_agent import BaseAgent
from integrations.claude_client import claude
from integrations.airtable_client import airtable
from loguru import logger


class FunderIntelAgent(BaseAgent):
    """Researches funders and builds dossiers with alignment analysis."""

    def __init__(self):
        super().__init__("Funder Intelligence Agent")

    def run(self, funder_name: str, research_data: str = "", **kwargs):
        """Build a funder dossier."""
        self.log_activity("Dossier Build", funder_name)

        dossier = claude.build_funder_dossier(funder_name, research_data)

        # Save to Airtable funders table
        try:
            existing = airtable.get_funder_by_name(funder_name)
            if existing:
                airtable.funders.update(existing["id"], {"Notes": dossier})
            else:
                airtable.create_funder({
                    "Funder Name": funder_name,
                    "Relationship Status": "New",
                    "Notes": dossier,
                })
        except Exception as e:
            self.log_error("Airtable save", e)

        self.log_success("Dossier Build", funder_name)
        return {"funder": funder_name, "dossier": dossier}
