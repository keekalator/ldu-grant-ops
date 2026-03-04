"""
LDU Grant Operations — Narrative Drafting Agent
Uses Claude AI to generate grant narratives from boilerplate + writing briefs.
Follows the 28-day production cycle.
"""

import os
from typing import Dict, Optional
from agents.base_agent import BaseAgent
from integrations.claude_client import claude
from integrations.airtable_client import airtable
from config.pillars import get_pillar_by_id


class NarrativeAgent(BaseAgent):
    """
    Drafts grant narratives using Claude AI.
    Never writes from scratch — always works from boilerplate + funder-specific brief.
    """

    BOILERPLATE_DIR = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data", "boilerplate"
    )

    def __init__(self):
        super().__init__("Narrative Drafting Agent")

    def run(self, assignment: Dict) -> Dict:
        """
        Execute a narrative drafting assignment.

        Args:
            assignment: Dict with:
                - grant_name: str
                - pillar_ids: list of pillar IDs
                - funder_name: str
                - funder_requirements: str (word count, sections needed, etc.)
                - funder_dossier: str (dossier content)
                - deadline: str
                - stage: 'outline' | 'first_draft' | 'revision'
                - feedback: str (for revision stage)

        Returns:
            Dict with the generated content and metadata
        """
        stage = assignment.get("stage", "outline")
        self.log_activity("Drafting", f"{assignment.get('grant_name', 'Unknown')} — Stage: {stage}")

        if stage == "outline":
            return self._generate_outline(assignment)
        elif stage == "first_draft":
            return self._generate_first_draft(assignment)
        elif stage == "revision":
            return self._generate_revision(assignment)
        else:
            self.log_error("Drafting", ValueError(f"Unknown stage: {stage}"))
            return {"error": f"Unknown stage: {stage}"}

    def _generate_outline(self, assignment: Dict) -> Dict:
        """D-25: Generate outline and messaging strategy."""
        # Build writing brief
        writing_brief = self._build_writing_brief(assignment)

        # Generate outline via Claude
        outline = claude.draft_narrative_outline(writing_brief)

        self.log_success("Outline", f"Generated for {assignment.get('grant_name', 'Unknown')}")

        return {
            "stage": "outline",
            "grant_name": assignment.get("grant_name"),
            "content": outline,
            "writing_brief": writing_brief,
            "next_stage": "first_draft",
            "next_deadline_day": "D-18",
        }

    def _generate_first_draft(self, assignment: Dict) -> Dict:
        """D-18: Generate complete narrative from outline + boilerplate."""
        outline = assignment.get("outline", "")
        if not outline:
            return {"error": "No outline provided — run outline stage first"}

        # Load relevant boilerplate
        boilerplate = self._load_boilerplate(assignment.get("pillar_ids", []))

        # Generate full narrative
        narrative = claude.draft_full_narrative(
            outline=outline,
            boilerplate=boilerplate,
            funder_requirements=assignment.get("funder_requirements", ""),
        )

        self.log_success("First Draft", f"Generated for {assignment.get('grant_name', 'Unknown')}")

        return {
            "stage": "first_draft",
            "grant_name": assignment.get("grant_name"),
            "content": narrative,
            "word_count": len(narrative.split()),
            "next_stage": "revision",
            "next_deadline_day": "D-10",
        }

    def _generate_revision(self, assignment: Dict) -> Dict:
        """D-10: Revise based on feedback."""
        draft = assignment.get("draft", "")
        feedback = assignment.get("feedback", "")

        if not draft or not feedback:
            return {"error": "Both draft and feedback are required for revision"}

        revised = claude.revise_narrative(draft, feedback)

        self.log_success("Revision", f"Revised for {assignment.get('grant_name', 'Unknown')}")

        return {
            "stage": "revision",
            "grant_name": assignment.get("grant_name"),
            "content": revised,
            "word_count": len(revised.split()),
            "next_stage": "qa_review",
            "next_deadline_day": "D-5",
        }

    def _build_writing_brief(self, assignment: Dict) -> Dict:
        """Compile a writing brief from assignment data and pillar info."""
        pillar_ids = assignment.get("pillar_ids", [])
        pillars = [get_pillar_by_id(pid) for pid in pillar_ids if get_pillar_by_id(pid)]

        brief = {
            "grant_name": assignment.get("grant_name", ""),
            "funder": assignment.get("funder_name", ""),
            "deadline": assignment.get("deadline", ""),
            "funder_requirements": assignment.get("funder_requirements", ""),
            "funder_dossier_summary": assignment.get("funder_dossier", ""),
            "pillars": [
                {
                    "name": p.name,
                    "key_narrative": p.key_narrative,
                    "programs": p.programs,
                    "keywords": p.keywords[:10],
                }
                for p in pillars
            ],
            "ldu_context": {
                "org_name": "Life Development University",
                "address": "4241 Crenshaw Blvd, Los Angeles, CA",
                "type": "501(c)(3) program of Life Development Group",
                "mission": "Community-driven workforce development, creative economy, and land stewardship",
                "founders": "Mother-daughter duo, Black women entrepreneurs",
                "voice": "Warm, grounded, community-centered — not corporate",
            },
        }

        return brief

    def _load_boilerplate(self, pillar_ids: list) -> Dict[str, str]:
        """Load boilerplate content for the specified pillars."""
        boilerplate = {}

        # Always load organizational boilerplate
        org_path = os.path.join(self.BOILERPLATE_DIR, "organizational.md")
        if os.path.exists(org_path):
            with open(org_path, "r") as f:
                boilerplate["organizational"] = f.read()

        # Always load needs statements
        needs_path = os.path.join(self.BOILERPLATE_DIR, "needs_statements.md")
        if os.path.exists(needs_path):
            with open(needs_path, "r") as f:
                boilerplate["needs_statements"] = f.read()

        # Load pillar-specific boilerplate
        pillar_to_file = {
            "P1": "capital_campaign.md",
            "P2": "programs/",  # Multiple files in programs/
            "P3": "programs/studio_weleh.md",
            "P4": "programs/ag_extension.md",
            "P5": "founder.md",
            "CROSS_TEXTILE": "textile_sb707.md",
        }

        for pid in pillar_ids:
            file_ref = pillar_to_file.get(pid, "")
            if file_ref:
                full_path = os.path.join(self.BOILERPLATE_DIR, file_ref)
                if os.path.exists(full_path):
                    if os.path.isfile(full_path):
                        with open(full_path, "r") as f:
                            boilerplate[pid] = f.read()
                    elif os.path.isdir(full_path):
                        # Load all files in directory
                        for fname in os.listdir(full_path):
                            if fname.endswith(".md"):
                                with open(os.path.join(full_path, fname), "r") as f:
                                    boilerplate[f"{pid}_{fname}"] = f.read()

        # Load outcomes and sustainability
        for extra in ["outcomes.md", "sustainability.md"]:
            extra_path = os.path.join(self.BOILERPLATE_DIR, extra)
            if os.path.exists(extra_path):
                with open(extra_path, "r") as f:
                    boilerplate[extra.replace(".md", "")] = f.read()

        # Also try loading from Airtable boilerplate library
        try:
            for pid in pillar_ids:
                pillar = get_pillar_by_id(pid)
                if pillar:
                    records = airtable.get_boilerplate_by_category(pillar.name)
                    for record in records:
                        fields = record.get("fields", {})
                        section = fields.get("Section Name", "")
                        content = fields.get("Content", "")
                        if section and content:
                            boilerplate[f"airtable_{pid}_{section}"] = content
        except Exception:
            pass  # Airtable not yet configured

        return boilerplate
