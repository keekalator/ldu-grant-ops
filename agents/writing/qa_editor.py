"""
LDU Grant Operations — QA & Editing Agent
Final quality assurance before CEO review at D-3.
"""

from agents.base_agent import BaseAgent
from integrations.claude_client import claude


class QAEditorAgent(BaseAgent):
    """Performs final QA on grant applications before submission."""

    def __init__(self):
        super().__init__("QA & Editing Agent")

    def run(self, narrative: str, requirements: dict, **kwargs):
        """Run QA review on a complete narrative."""
        self.log_activity("QA Review", requirements.get("grant_name", "Unknown"))

        review = claude.qa_review(narrative, requirements)

        self.log_success("QA Review", requirements.get("grant_name", "Unknown"))
        return {"review": review, "word_count": len(narrative.split())}
