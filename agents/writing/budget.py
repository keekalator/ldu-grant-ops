"""
LDU Grant Operations — Budget Development Agent
Generates budgets and justifications from templates per pillar.
"""

from agents.base_agent import BaseAgent
from integrations.claude_client import claude


class BudgetAgent(BaseAgent):
    """Develops grant budgets and budget justification narratives."""

    def __init__(self):
        super().__init__("Budget Development Agent")

    def run(self, grant_info: dict, **kwargs):
        """Generate a budget and justification for a grant application."""
        self.log_activity("Budget", grant_info.get("grant_name", "Unknown"))

        justification = claude.draft_budget_justification(
            budget_data=grant_info.get("budget_lines", {}),
            program_description=grant_info.get("program_description", ""),
        )

        self.log_success("Budget", grant_info.get("grant_name", "Unknown"))
        return {"justification": justification}
