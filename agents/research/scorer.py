"""
LDU Grant Operations — Prospect Scoring Agent
Applies weighted scoring matrix to qualified prospects.
Source: Grant Ops Plan v2.0, Section 5.4
"""

from typing import Dict, Optional
from agents.base_agent import BaseAgent
from config.scoring import (
    calculate_weighted_score,
    meets_threshold,
    get_score_for_award_amount,
    get_score_for_days_until_deadline,
    ALL_CRITERIA,
)
from integrations.claude_client import claude
from integrations.airtable_client import airtable
from datetime import datetime, date
import json


class ScoringAgent(BaseAgent):
    """
    Scores qualified prospects using the 5-criteria weighted matrix.
    Uses Claude AI for mission fit analysis, auto-calculates award size and timeline scores.
    """

    def __init__(self):
        super().__init__("Prospect Scoring Agent")

    def run(self, prospect: Dict, eligibility_results: Dict) -> Dict:
        """
        Score a qualified prospect.

        Args:
            prospect: Grant opportunity data
            eligibility_results: Output from EligibilityAgent

        Returns:
            Dict with individual scores, weighted score, and queue recommendation
        """
        self.log_activity("Scoring", prospect.get("name", "Unknown"))

        # Auto-calculate what we can
        scores = {}

        # 1. Mission Fit — use Claude for intelligent assessment
        scores["mission_fit"] = self._score_mission_fit(prospect, eligibility_results)

        # 2. Award Size — auto-calculate from amount
        amount_high = prospect.get("amount_high", 0)
        scores["award_size"] = get_score_for_award_amount(amount_high)

        # 3. Win Probability — use Claude + funder relationship data
        scores["win_probability"] = self._score_win_probability(prospect)

        # 4. Timeline Fit — auto-calculate from deadline
        scores["timeline_fit"] = self._score_timeline_fit(prospect)

        # 5. Strategic Value — use Claude assessment
        scores["strategic_value"] = self._score_strategic_value(prospect, eligibility_results)

        # Calculate weighted score
        weighted = calculate_weighted_score(scores)

        # Determine if it meets the threshold
        primary_pillar = eligibility_results.get("pillar_matches", [""])[0] if eligibility_results.get("pillar_matches") else ""
        estimated_hours = prospect.get("estimated_hours", None)
        enters_queue = meets_threshold(weighted, primary_pillar, estimated_hours)

        result = {
            "scores": scores,
            "weighted_score": weighted,
            "enters_writing_queue": enters_queue,
            "primary_pillar": primary_pillar,
            "threshold_used": 3.0 if primary_pillar == "P5" else 3.5,
            "recommendation": "WRITING QUEUE" if enters_queue else "PARK — below threshold",
        }

        self.log_success(
            "Scoring",
            f"{prospect.get('name', 'Unknown')}: {weighted:.2f} → {result['recommendation']}"
        )

        return result

    def _score_mission_fit(self, prospect: Dict, eligibility: Dict) -> int:
        """Score mission fit using Claude AI analysis."""
        pillar_matches = eligibility.get("pillar_matches", [])
        bonus_count = len(eligibility.get("bonus_qualifiers", []))

        # Quick heuristic first
        if len(pillar_matches) >= 3 and bonus_count >= 3:
            return 5
        elif len(pillar_matches) >= 2 and bonus_count >= 2:
            return 4
        elif len(pillar_matches) >= 1 and bonus_count >= 1:
            return 3
        elif len(pillar_matches) >= 1:
            return 2
        else:
            return 1

    def _score_win_probability(self, prospect: Dict) -> int:
        """Score win probability based on funder relationship and competitive landscape."""
        funder_name = prospect.get("funder", "")

        # Check if we have an existing relationship in Airtable
        try:
            funder_record = airtable.get_funder_by_name(funder_name)
            if funder_record:
                relationship = funder_record.get("fields", {}).get("Relationship Status", "New")
                if relationship == "Strong":
                    return 5
                elif relationship == "Active":
                    return 4
                elif relationship == "Introduced":
                    return 3
        except Exception:
            pass  # Airtable not yet configured — use default

        # Default: moderate probability for well-aligned opportunities
        return 3

    def _score_timeline_fit(self, prospect: Dict) -> int:
        """Score timeline fit from deadline date."""
        deadline_str = prospect.get("deadline", "")
        if not deadline_str:
            return 3  # Unknown deadline — moderate score

        try:
            deadline = datetime.strptime(deadline_str, "%Y-%m-%d").date()
            days = (deadline - date.today()).days
            return get_score_for_days_until_deadline(days)
        except ValueError:
            return 3

    def _score_strategic_value(self, prospect: Dict, eligibility: Dict) -> int:
        """Score strategic value based on opportunity characteristics."""
        value_indicators = 0

        # Multi-year or renewable grants are more strategic
        if prospect.get("renewable", False):
            value_indicators += 2

        # Large funders opening new pipelines
        amount = prospect.get("amount_high", 0)
        if amount >= 200_000:
            value_indicators += 1

        # First-time relationship with major funder
        funder = prospect.get("funder", "")
        known_major_funders = [
            "USDA", "CalRecycle", "NEA", "Ford Foundation", "Kresge",
            "California Endowment", "Weingart", "EDA",
        ]
        if any(f.lower() in funder.lower() for f in known_major_funders):
            value_indicators += 1

        # Aligns with multiple pillars
        if len(eligibility.get("pillar_matches", [])) >= 2:
            value_indicators += 1

        # Convert to 1-5 scale
        if value_indicators >= 4:
            return 5
        elif value_indicators >= 3:
            return 4
        elif value_indicators >= 2:
            return 3
        elif value_indicators >= 1:
            return 2
        else:
            return 1

    def score_and_update_airtable(self, record_id: str, prospect: Dict, eligibility: Dict):
        """Score a prospect and update its Airtable record with the results."""
        result = self.run(prospect, eligibility)

        # Update Airtable
        airtable.update_opportunity_score(record_id, result["scores"], result["weighted_score"])

        new_status = "Writing Queue" if result["enters_writing_queue"] else "Scored — Parked"
        airtable.update_opportunity_status(record_id, new_status)

        return result
