"""
LDU Grant Operations — Scoring Configuration
Weighted scoring matrix for prospect qualification.
Source: LDU Grant Operations Plan v2.0 — Section 5.4
"""

from dataclasses import dataclass
from typing import Dict, Tuple


@dataclass
class ScoringCriteria:
    """A single scoring criterion with weight and scale definitions."""
    name: str
    weight: float  # Percentage weight (0.0 to 1.0)
    description: str
    scale: Dict[int, str]  # Score → description


# ============================================================
# SCORING CRITERIA DEFINITIONS
# ============================================================

MISSION_FIT = ScoringCriteria(
    name="Mission Fit",
    weight=0.30,
    description="Alignment with LDU's funding pillars",
    scale={
        5: "Perfect alignment — grant was practically written for LDU",
        4: "Strong alignment with minor gaps",
        3: "Partial alignment — some programs fit, others don't",
        2: "Tangential — would require stretching to fit",
        1: "Minimal alignment",
    }
)

AWARD_SIZE = ScoringCriteria(
    name="Award Size",
    weight=0.20,
    description="Potential award amount",
    scale={
        5: "$100K+ award",
        4: "$50K–$100K award",
        3: "$25K–$50K award",
        2: "$10K–$25K award",
        1: "Under $10K award",
    }
)

WIN_PROBABILITY = ScoringCriteria(
    name="Win Probability",
    weight=0.25,
    description="Likelihood of winning the grant",
    scale={
        5: "Existing relationship with funder or strong track record",
        4: "Strong fit, good alignment, no existing relationship",
        3: "Competitive — good fit but many applicants",
        2: "Long shot — worth trying but low probability",
        1: "Very low probability",
    }
)

TIMELINE_FIT = ScoringCriteria(
    name="Timeline Fit",
    weight=0.15,
    description="Time available to prepare a quality application",
    scale={
        5: "6+ weeks until deadline",
        4: "4–6 weeks until deadline",
        3: "2–4 weeks until deadline",
        2: "1–2 weeks until deadline",
        1: "Under 1 week (emergency only)",
    }
)

STRATEGIC_VALUE = ScoringCriteria(
    name="Strategic Value",
    weight=0.10,
    description="Long-term strategic benefit beyond the award amount",
    scale={
        5: "Opens new funding pipeline or major funder relationship",
        4: "Builds important relationship for future applications",
        3: "One-time opportunity with limited long-term value",
        2: "High administrative burden relative to benefit",
        1: "Minimal strategic value",
    }
)


ALL_CRITERIA = [MISSION_FIT, AWARD_SIZE, WIN_PROBABILITY, TIMELINE_FIT, STRATEGIC_VALUE]


# ============================================================
# SCORING THRESHOLDS
# ============================================================

THRESHOLD_STANDARD = 3.5      # Standard pillars (P1–P4, Cross-Cutting)
THRESHOLD_FOUNDER = 3.0       # Pillar 5 founder grants (if simple + fast-turnaround)
FOUNDER_MAX_HOURS = 2         # Max hours of work for Pillar 5 lower threshold


# ============================================================
# SCORING FUNCTIONS
# ============================================================

def calculate_weighted_score(scores: Dict[str, int]) -> float:
    """
    Calculate the weighted score from individual criterion scores.

    Args:
        scores: Dict mapping criterion name to score (1-5)
                Keys: "mission_fit", "award_size", "win_probability",
                      "timeline_fit", "strategic_value"

    Returns:
        Weighted score (1.0 to 5.0)
    """
    criteria_map = {
        "mission_fit": MISSION_FIT,
        "award_size": AWARD_SIZE,
        "win_probability": WIN_PROBABILITY,
        "timeline_fit": TIMELINE_FIT,
        "strategic_value": STRATEGIC_VALUE,
    }

    total = 0.0
    for key, criterion in criteria_map.items():
        score = scores.get(key, 0)
        total += score * criterion.weight

    return round(total, 2)


def meets_threshold(weighted_score: float, pillar_id: str, estimated_hours: float = None) -> bool:
    """
    Determine if a prospect meets the threshold for the writing queue.

    Args:
        weighted_score: The calculated weighted score
        pillar_id: The primary pillar ID
        estimated_hours: Estimated hours to complete (relevant for P5 exception)

    Returns:
        True if the prospect should enter the writing queue
    """
    if pillar_id == "P5" and estimated_hours is not None and estimated_hours <= FOUNDER_MAX_HOURS:
        return weighted_score >= THRESHOLD_FOUNDER
    return weighted_score >= THRESHOLD_STANDARD


def get_score_for_award_amount(amount: int) -> int:
    """Convert a dollar amount to an Award Size score (1-5)."""
    if amount >= 100_000:
        return 5
    elif amount >= 50_000:
        return 4
    elif amount >= 25_000:
        return 3
    elif amount >= 10_000:
        return 2
    else:
        return 1


def get_score_for_days_until_deadline(days: int) -> int:
    """Convert days until deadline to a Timeline Fit score (1-5)."""
    if days >= 42:  # 6+ weeks
        return 5
    elif days >= 28:  # 4-6 weeks
        return 4
    elif days >= 14:  # 2-4 weeks
        return 3
    elif days >= 7:  # 1-2 weeks
        return 2
    else:
        return 1
