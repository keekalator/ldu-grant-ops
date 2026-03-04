"""
LDU Grant Operations — Writing Plan Agent
Generates a structured, grant-specific writing plan using Claude AI.
Triggered automatically when a grant is added as a Prospect.
"""

import json
import logging
from typing import Dict, Optional
from agents.base_agent import BaseAgent
from integrations.claude_client import claude
from integrations.airtable_client import airtable

logger = logging.getLogger(__name__)

PLAN_PROMPT = """You are a senior grant writer for Life Development University (LDU), a 501(c)(3) nonprofit 
creative campus on Crenshaw Boulevard in Los Angeles. LDU is co-founded by a mother-daughter team 
(Kika Keith, CEO, and Kika Howze, Implementation Lead).

Given the grant details below, generate a focused WRITING PLAN that tells the team exactly how to win this grant.
Be specific to this funder — not generic advice.

GRANT DETAILS:
{grant_details}

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{{
  "angle": "The one strategic narrative angle that makes LDU the perfect fit — 2-3 sentences. Be specific to this funder's priorities.",
  "sections": [
    "Section Name: What to write here — be specific about content and tone"
  ],
  "themes": [
    "Theme to weave through the narrative — tied directly to this funder's language"
  ],
  "materials": [
    "Exact item to prepare or gather"
  ],
  "estimatedHours": 8,
  "winTips": [
    "Funder-specific tip that increases win probability"
  ]
}}

- sections: 3–6 items covering every required section of this application
- themes: 3–5 themes
- materials: everything needed (narratives, budget, letters, attachments, registrations)
- estimatedHours: realistic total writing hours (integer)
- winTips: 2–4 highly specific tips based on this funder's known preferences
"""


class WritingPlanAgent(BaseAgent):
    """
    Generates a grant-specific writing plan for every new Prospect.
    Stores the plan in the Airtable 'Writing Plan' field.
    """

    def __init__(self):
        super().__init__("Writing Plan Agent")

    def run(self, record: Dict) -> Dict:
        """
        Generate and save a writing plan for a single opportunity record.

        Args:
            record: Full Airtable record dict (id + fields)

        Returns:
            Dict with 'plan' (parsed) and 'saved' (bool)
        """
        fields = record.get("fields", {})
        record_id = record.get("id", "")
        grant_name = fields.get("Grant Name", "Unknown Grant")

        self.log_activity("Writing Plan", f"Generating plan for: {grant_name}")

        grant_details = self._format_grant_details(fields)
        plan = self._generate_plan(grant_details, grant_name)

        if "error" in plan:
            return plan

        saved = self._save_plan(record_id, plan)
        return {"plan": plan, "saved": saved, "record_id": record_id}

    def _format_grant_details(self, fields: Dict) -> str:
        parts = []
        if fields.get("Grant Name"):
            parts.append(f"Grant Name: {fields['Grant Name']}")
        if fields.get("Funder Name"):
            parts.append(f"Funder: {fields['Funder Name']}")
        if fields.get("Description"):
            parts.append(f"Description: {fields['Description']}")
        if fields.get("Pillar"):
            pillars = fields["Pillar"] if isinstance(fields["Pillar"], list) else [fields["Pillar"]]
            parts.append(f"LDU Pillars: {', '.join(pillars)}")
        if fields.get("Award Amount Range"):
            parts.append(f"Award Amount: ${fields['Award Amount Range']:,}")
        if fields.get("Deadline"):
            parts.append(f"Deadline: {fields['Deadline']}")
        if fields.get("Submitting Entity"):
            parts.append(f"Submitting Entity: {fields['Submitting Entity']}")
        if fields.get("Eligibility Notes"):
            parts.append(f"Eligibility: {fields['Eligibility Notes']}")
        if fields.get("Why We Qualify"):
            parts.append(f"Why LDU Qualifies: {fields['Why We Qualify']}")
        if fields.get("Source"):
            parts.append(f"Source: {fields['Source']}")
        if fields.get("Notes"):
            # Only include first 500 chars of notes as context
            notes_preview = fields["Notes"][:500]
            parts.append(f"Context Notes: {notes_preview}")
        return "\n".join(parts) if parts else "No details available."

    def _generate_plan(self, grant_details: str, grant_name: str) -> Dict:
        prompt = PLAN_PROMPT.format(grant_details=grant_details)
        response = self.call_with_retry(
            lambda: claude.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1200,
                messages=[{"role": "user", "content": prompt}],
            )
        )
        if not response:
            return {"error": "Claude API call failed after retries"}

        raw = response.content[0].text.strip()

        # Strip any accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        try:
            plan = json.loads(raw)
            return plan
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error for {grant_name}: {e}\nRaw: {raw[:300]}")
            # Return raw text as a fallback angle so nothing is lost
            return {
                "angle": raw[:500],
                "sections": [],
                "themes": [],
                "materials": [],
                "estimatedHours": 0,
                "winTips": [],
            }

    def _save_plan(self, record_id: str, plan: Dict) -> bool:
        """Save the writing plan JSON to Airtable 'Writing Plan' field."""
        try:
            airtable.opportunities.update(
                record_id,
                {"Writing Plan": json.dumps(plan)},
                typecast=True,
            )
            self.log_activity("Writing Plan", f"Saved plan to record {record_id}")
            return True
        except Exception as e:
            self.log_error("Writing Plan Save", e)
            return False

    def generate_for_all_prospects(self) -> int:
        """
        Run over every Prospect in the pipeline that lacks a writing plan.
        Returns count of plans generated.
        """
        records = airtable.opportunities.all(
            formula="AND({Status}='Prospect', {Writing Plan}='')"
        )
        count = 0
        for record in records:
            result = self.run(record)
            if result.get("saved"):
                count += 1
        self.log_activity("Writing Plan", f"Batch complete — {count} plans generated")
        return count
