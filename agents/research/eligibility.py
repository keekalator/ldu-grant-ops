"""
LDU Grant Operations — Eligibility Screening Agent
Auto-screens prospects against LDU's pre-qualification criteria.
Source: Grant Ops Plan v2.0, Section 5.3
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, date
from agents.base_agent import BaseAgent
from config.pillars import match_pillars, ALL_PILLARS
from config.settings import settings
from integrations.claude_client import claude


class EligibilityAgent(BaseAgent):
    """
    Screens grant prospects against LDU's eligibility criteria.
    Returns a structured pre-qualification summary for each prospect.
    """

    # Geographic areas LDU serves
    ELIGIBLE_GEOGRAPHIES = [
        "los angeles", "la county", "california", "national", "nationwide",
        "united states", "yolo county", "woodland", "winters", "sacramento valley",
        "south la", "crenshaw", "statewide",
    ]

    # Certifications LDU does NOT have
    DISQUALIFYING_CERTIFICATIONS = [
        "fqhc", "federally qualified health center",
        "accredited university", "regionally accredited",
        "licensed clinical", "medical facility",
        "hospital", "school district",
    ]

    def __init__(self):
        super().__init__("Eligibility Screening Agent")

    def run(self, prospect: Dict) -> Dict:
        """
        Run the full eligibility screen on a prospect.

        Args:
            prospect: Dict with keys like 'name', 'description', 'funder',
                     'deadline', 'amount_low', 'amount_high', 'geography',
                     'requirements', 'url'

        Returns:
            Dict with:
              - qualified: bool
              - recommendation: 'auto_qualify' | 'auto_disqualify' | 'manual_review'
              - must_have_results: list of (criterion, passed: bool)
              - bonus_qualifiers: list of matched bonus criteria
              - disqualify_reasons: list of reasons (if any)
              - pillar_matches: list of matched pillar IDs
              - pre_qualification_summary: formatted text for Airtable
        """
        self.log_activity("Screening", prospect.get("name", "Unknown"))

        results = {
            "qualified": True,
            "recommendation": "auto_qualify",
            "must_have_results": [],
            "bonus_qualifiers": [],
            "disqualify_reasons": [],
            "pillar_matches": [],
            "pre_qualification_summary": "",
        }

        # --- MUST-HAVE CHECKS ---
        self._check_entity_eligibility(prospect, results)
        self._check_geography(prospect, results)
        self._check_org_thresholds(prospect, results)
        self._check_pillar_alignment(prospect, results)

        # --- AUTO-DISQUALIFY CHECKS ---
        self._check_certifications(prospect, results)
        self._check_minimum_award(prospect, results)
        self._check_deadline(prospect, results)
        self._check_matching_funds(prospect, results)

        # --- BONUS QUALIFIERS ---
        self._check_bonus_qualifiers(prospect, results)

        # --- DETERMINE RECOMMENDATION ---
        if results["disqualify_reasons"]:
            results["qualified"] = False
            results["recommendation"] = "auto_disqualify"
        elif len(results["must_have_results"]) > 0 and all(r[1] for r in results["must_have_results"]):
            results["recommendation"] = "auto_qualify"
        else:
            results["recommendation"] = "manual_review"

        # --- BUILD SUMMARY ---
        results["pre_qualification_summary"] = self._build_summary(results)

        self.log_success("Screening", f"{prospect.get('name', 'Unknown')} → {results['recommendation']}")
        return results

    # ==========================================================
    # MUST-HAVE CHECKS
    # ==========================================================

    def _check_entity_eligibility(self, prospect: Dict, results: Dict):
        """Check if LDU's 501(c)(3) or Gorilla Rx's for-profit status is eligible."""
        req = prospect.get("requirements", "").lower()
        desc = prospect.get("description", "").lower()
        combined = req + " " + desc

        # Check if it requires for-profit only (Gorilla Rx might qualify)
        if "for-profit only" in combined or "for-profit businesses only" in combined:
            if "gorilla rx" in prospect.get("target_entity", "").lower():
                results["must_have_results"].append(("Entity eligibility (Gorilla Rx)", True))
            else:
                results["must_have_results"].append(("Entity eligibility", False))
                results["disqualify_reasons"].append("Grant is for-profit only; LDU is 501(c)(3)")
                return

        results["must_have_results"].append(("Entity eligibility (501(c)(3))", True))

    def _check_geography(self, prospect: Dict, results: Dict):
        """Check geographic eligibility."""
        geo = prospect.get("geography", "").lower()
        if not geo:
            results["must_have_results"].append(("Geographic eligibility", True))
            return  # No restriction listed = likely national

        eligible = any(area in geo for area in self.ELIGIBLE_GEOGRAPHIES)
        results["must_have_results"].append(("Geographic eligibility", eligible))
        if not eligible:
            results["disqualify_reasons"].append(f"Geographic restriction: {prospect.get('geography', 'Unknown')}")

    def _check_org_thresholds(self, prospect: Dict, results: Dict):
        """Check org size/revenue thresholds."""
        # Most grants LDU applies for won't have restrictive thresholds
        # This is a placeholder for specific checks as they arise
        min_budget = prospect.get("min_org_budget", 0)
        max_budget = prospect.get("max_org_budget", float("inf"))

        # LDU's approximate budget range — update as financials change
        ldu_budget = prospect.get("ldu_annual_budget", 500_000)

        if ldu_budget < min_budget:
            results["must_have_results"].append(("Org size threshold", False))
            results["disqualify_reasons"].append(f"Minimum org budget ${min_budget:,} exceeds LDU's")
        elif ldu_budget > max_budget:
            results["must_have_results"].append(("Org size threshold", False))
            results["disqualify_reasons"].append(f"Maximum org budget ${max_budget:,} — LDU too large")
        else:
            results["must_have_results"].append(("Org size threshold", True))

    def _check_pillar_alignment(self, prospect: Dict, results: Dict):
        """Check alignment with at least one funding pillar."""
        desc = prospect.get("description", "") + " " + prospect.get("name", "")
        matches = match_pillars(desc)

        if matches:
            results["pillar_matches"] = [p.id for p in matches]
            results["must_have_results"].append(("Pillar alignment", True))
        else:
            # Try Claude for a deeper analysis before failing
            results["must_have_results"].append(("Pillar alignment", False))
            results["recommendation"] = "manual_review"

    # ==========================================================
    # AUTO-DISQUALIFY CHECKS
    # ==========================================================

    def _check_certifications(self, prospect: Dict, results: Dict):
        """Check for required certifications LDU doesn't have."""
        req = prospect.get("requirements", "").lower()
        for cert in self.DISQUALIFYING_CERTIFICATIONS:
            if cert in req:
                results["disqualify_reasons"].append(f"Requires certification: {cert}")

    def _check_minimum_award(self, prospect: Dict, results: Dict):
        """Disqualify if award is under $5,000 (unless Pillar 5 with strategic value)."""
        max_award = prospect.get("amount_high", 0)
        if max_award and max_award < settings.auto_disqualify_min_award:
            # Exception for Pillar 5 founder grants
            if "P5" in results.get("pillar_matches", []):
                results["bonus_qualifiers"].append("Pillar 5 exception: small award may have strategic value")
            else:
                results["disqualify_reasons"].append(f"Award under ${settings.auto_disqualify_min_award:,}")

    def _check_deadline(self, prospect: Dict, results: Dict):
        """Disqualify if deadline is under 14 days AND application is complex."""
        deadline_str = prospect.get("deadline", "")
        complexity = prospect.get("complexity", "standard")

        if deadline_str:
            try:
                deadline = datetime.strptime(deadline_str, "%Y-%m-%d").date()
                days_remaining = (deadline - date.today()).days

                if days_remaining < settings.auto_disqualify_min_days and complexity == "complex":
                    results["disqualify_reasons"].append(
                        f"Only {days_remaining} days until deadline with complex application"
                    )
            except ValueError:
                pass  # Can't parse date — skip this check

    def _check_matching_funds(self, prospect: Dict, results: Dict):
        """Disqualify if matching funds are required and LDU can't provide them."""
        match_required = prospect.get("matching_funds_required", 0)
        if match_required and match_required > 50_000:  # Threshold for concern
            results["disqualify_reasons"].append(
                f"Requires ${match_required:,} in matching funds"
            )

    # ==========================================================
    # BONUS QUALIFIERS
    # ==========================================================

    def _check_bonus_qualifiers(self, prospect: Dict, results: Dict):
        """Check for bonus qualifiers that increase the score."""
        desc = (prospect.get("description", "") + " " + prospect.get("requirements", "")).lower()

        bonus_checks = [
            ("women-led", "Targets women-led organizations"),
            ("women-owned", "Targets women-owned organizations"),
            ("black-led", "Targets Black-led organizations"),
            ("black-owned", "Targets Black-owned organizations"),
            ("bipoc", "Targets BIPOC organizations"),
            ("first-time land", "Targets first-time land acquirers"),
            ("beginning farmer", "Targets beginning farmers"),
            ("young entrepreneur", "Targets young entrepreneurs (under 40)"),
            ("under 40", "Targets entrepreneurs under 40"),
            ("south la", "Focuses on South LA"),
            ("crenshaw", "Focuses on Crenshaw corridor"),
            ("disadvantaged communit", "Targets disadvantaged communities"),
            ("textile", "Addresses textile sustainability"),
            ("upcycl", "Addresses upcycling"),
            ("circular economy", "Addresses circular economy"),
            ("sb 707", "Aligns with SB 707"),
            ("cannabis social equity", "Targets cannabis social equity"),
            ("re-entry", "Targets re-entry populations"),
            ("justice-involved", "Targets justice-involved individuals"),
            ("ai training", "Funds AI/technology education"),
            ("digital literacy", "Funds digital literacy"),
            ("youth programming", "Supports youth programming"),
            ("arts education", "Supports arts education"),
            ("music program", "Supports music programs"),
            ("action sports", "Supports action sports"),
        ]

        for keyword, description in bonus_checks:
            if keyword in desc:
                results["bonus_qualifiers"].append(description)

    # ==========================================================
    # SUMMARY BUILDER
    # ==========================================================

    def _build_summary(self, results: Dict) -> str:
        """Build a formatted pre-qualification summary for Airtable."""
        lines = []
        lines.append(f"RECOMMENDATION: {results['recommendation'].upper()}")
        lines.append("")

        lines.append("MUST-HAVE CRITERIA:")
        for criterion, passed in results["must_have_results"]:
            status = "PASS" if passed else "FAIL"
            lines.append(f"  [{status}] {criterion}")

        if results["disqualify_reasons"]:
            lines.append("")
            lines.append("DISQUALIFY REASONS:")
            for reason in results["disqualify_reasons"]:
                lines.append(f"  - {reason}")

        if results["bonus_qualifiers"]:
            lines.append("")
            lines.append("BONUS QUALIFIERS:")
            for bonus in results["bonus_qualifiers"]:
                lines.append(f"  + {bonus}")

        if results["pillar_matches"]:
            lines.append("")
            pillar_names = [ALL_PILLARS[pid].name for pid in results["pillar_matches"] if pid in ALL_PILLARS]
            lines.append(f"PILLAR MATCHES: {', '.join(pillar_names)}")

        return "\n".join(lines)
