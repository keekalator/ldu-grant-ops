"""
LDU Grant Operations — Claude AI Integration
All Claude API calls for narrative drafting, prospect analysis, and scoring assistance.
"""

from typing import Dict, List, Optional
from anthropic import Anthropic
from config.settings import settings
from loguru import logger


class ClaudeClient:
    """Client for Claude AI operations in the grant pipeline."""

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model

    def _call(self, system: str, user_message: str, max_tokens: int = 4096) -> str:
        """Make a Claude API call with system prompt and user message."""
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise

    # ==========================================================
    # PROSPECT ANALYSIS
    # ==========================================================

    def analyze_prospect_fit(self, grant_description: str, pillar_keywords: List[str]) -> Dict:
        """
        Analyze how well a grant opportunity fits LDU's pillars.
        Returns a structured assessment with recommended scores.
        """
        system = """You are a grant analyst for Life Development University (LDU), a 501(c)(3) 
nonprofit creative campus on Crenshaw Boulevard in South LA. LDU operates across 6 funding 
pillars: Capital Campaign, Programming & Operations, Studio WELEH (arts/apparel), Agricultural 
Extension & Manufacturing, Founder & Enterprise, and Textile Sustainability (SB 707).

Analyze the grant opportunity and return a JSON object with:
- "pillar_matches": list of matching pillar IDs (P1, P2, P3, P4, P5, CROSS_TEXTILE)
- "mission_fit_score": integer 1-5
- "mission_fit_reasoning": brief explanation
- "estimated_hours": estimated hours to complete the application
- "key_alignment_points": list of 3-5 specific alignment points
- "potential_concerns": list of any concerns or gaps
- "recommended_narrative_angle": suggested approach for the application

Return ONLY valid JSON, no other text."""

        user_msg = f"""Grant opportunity description:
{grant_description}

LDU pillar keywords for matching:
{', '.join(pillar_keywords)}"""

        return self._call(system, user_msg)

    def pre_qualify_prospect(self, grant_info: Dict) -> Dict:
        """
        Run pre-qualification check against LDU's eligibility criteria.
        Returns structured pass/fail assessment.
        """
        system = """You are a grant eligibility screener for Life Development University (LDU).

LDU's qualifications:
- 501(c)(3) nonprofit (Life Development Group)
- Located: 4241 Crenshaw Blvd, Los Angeles, CA
- Also operates Gorilla Rx Wellness (for-profit cannabis dispensary, social equity licensee)
- Farm property target: Woodland/Winters, Yolo County, CA
- Women-led, Black women-led organization
- Co-founders: one age 33 (young entrepreneur), one in her 50s

Auto-Disqualify if:
- Requires certification LDU lacks (FQHC, accredited university status)
- Geographic restriction outside LA County, California, national, or Yolo County
- Award under $5,000 (unless founder/enterprise grant with strategic value)
- Requires matching funds LDU cannot provide
- Deadline less than 14 days away AND application is complex

Return a JSON object with:
- "qualified": boolean
- "disqualify_reason": string or null
- "must_have_met": list of criteria met
- "must_have_failed": list of criteria not met
- "bonus_qualifiers": list of bonus criteria met
- "recommendation": "auto_qualify" | "auto_disqualify" | "manual_review"

Return ONLY valid JSON."""

        user_msg = f"""Grant information:
{str(grant_info)}"""

        return self._call(system, user_msg)

    # ==========================================================
    # NARRATIVE DRAFTING
    # ==========================================================

    def draft_narrative_outline(self, writing_brief: Dict) -> str:
        """Generate an outline and messaging strategy for a grant application."""
        system = """You are an expert grant writer for Life Development University (LDU), a 501(c)(3)
nonprofit creative campus in South LA. You write compelling, authentic narratives that avoid 
corporate jargon and speak with the grounded voice of community builders.

LDU's voice: Warm but professional, culturally grounded, strategic. Not extractive — 
contributory. Not corporate — community. The writing should feel like it comes from people 
who live and work on Crenshaw Boulevard, because it does.

Generate a detailed outline with:
1. Messaging strategy (2-3 sentences on the overall approach)
2. Section-by-section outline with key points for each section
3. Specific data points or stories to include
4. Funder-specific language recommendations
5. Word count targets per section"""

        user_msg = f"""Writing Brief:
{str(writing_brief)}"""

        return self._call(system, user_msg, max_tokens=4096)

    def draft_full_narrative(self, outline: str, boilerplate: Dict[str, str], funder_requirements: str) -> str:
        """Generate a complete narrative draft from outline and boilerplate."""
        system = """You are an expert grant writer for Life Development University (LDU). 
Write a complete grant narrative that:
- Follows the provided outline exactly
- Incorporates boilerplate language naturally (don't just paste it — weave it in)
- Meets all funder requirements and word/page counts
- Uses LDU's authentic voice: warm, grounded, community-centered
- Includes specific data, metrics, and outcome projections
- Tells a compelling story, not just lists activities

CRITICAL: This is a draft for human review, not a final submission. Mark any sections that 
need specific data, quotes, or verification with [NEEDS: description of what's needed]."""

        boilerplate_text = "\n\n".join([f"=== {k} ===\n{v}" for k, v in boilerplate.items()])

        user_msg = f"""Outline:
{outline}

Boilerplate Library Sections:
{boilerplate_text}

Funder Requirements:
{funder_requirements}"""

        return self._call(system, user_msg, max_tokens=8192)

    def revise_narrative(self, draft: str, feedback: str) -> str:
        """Revise a narrative based on feedback."""
        system = """You are an expert grant editor for Life Development University. 
Revise the narrative based on the feedback provided. Maintain LDU's authentic voice 
throughout. Mark any new sections that need verification with [NEEDS: description]."""

        user_msg = f"""Current draft:
{draft}

Feedback for revision:
{feedback}"""

        return self._call(system, user_msg, max_tokens=8192)

    # ==========================================================
    # BUDGET ASSISTANCE
    # ==========================================================

    def draft_budget_justification(self, budget_data: Dict, program_description: str) -> str:
        """Generate a budget justification narrative from budget line items."""
        system = """You are a grant budget specialist for Life Development University.
Write a clear, detailed budget justification that explains each line item in terms of 
program necessity. Connect costs to outcomes. Be specific about rates, quantities, and 
why each expense is reasonable."""

        user_msg = f"""Budget line items:
{str(budget_data)}

Program description:
{program_description}"""

        return self._call(system, user_msg, max_tokens=4096)

    # ==========================================================
    # QA & EDITING
    # ==========================================================

    def qa_review(self, narrative: str, requirements: Dict) -> str:
        """Perform quality assurance review on a complete narrative."""
        system = """You are a grant QA specialist. Review the narrative for:
1. Word/page count compliance
2. All required sections present
3. Funder-specific language and terminology
4. Consistency of data/metrics throughout
5. Grammar, clarity, and persuasiveness
6. Any [NEEDS:] markers that haven't been resolved

Return a structured review with:
- "pass": boolean (ready for CEO review?)
- "issues": list of issues found, each with severity (critical/minor)
- "word_count": actual word count
- "suggestions": list of improvements
- "missing_sections": any required sections not found"""

        user_msg = f"""Narrative to review:
{narrative}

Funder requirements:
{str(requirements)}"""

        return self._call(system, user_msg, max_tokens=4096)

    # ==========================================================
    # FUNDER INTELLIGENCE
    # ==========================================================

    def build_funder_dossier(self, funder_name: str, research_data: str) -> str:
        """Generate a comprehensive funder dossier from research data."""
        system = """You are a grant research analyst for Life Development University.
Build a comprehensive funder dossier that includes:
1. Funder overview (mission, priorities, giving areas)
2. Historical giving patterns (average award, # of awards, geographic focus)
3. Past grantees similar to LDU
4. Key decision-makers and their backgrounds
5. Alignment analysis with each relevant LDU pillar
6. Recommended approach and talking points for relationship building
7. Red flags or concerns
8. Suggested timeline for engagement"""

        user_msg = f"""Funder: {funder_name}

Research data:
{research_data}"""

        return self._call(system, user_msg, max_tokens=4096)

    # ==========================================================
    # WEEKLY SUMMARY
    # ==========================================================

    def generate_ceo_summary(self, pipeline_data: Dict) -> str:
        """Generate the Friday 4PM CEO summary from pipeline data."""
        system = """You are generating a weekly pipeline summary for the CEO of Life Development 
University. Be concise, strategic, and action-oriented. Highlight:
1. New prospects added this week
2. Applications in progress (with deadline countdown)
3. Submissions this week
4. Pending decisions and expected timelines
5. Awards and declines
6. Key decisions needed from CEO
7. Next week's priorities

Format for SMS/Poke delivery — keep it scannable."""

        user_msg = f"""Pipeline data for this week:
{str(pipeline_data)}"""

        return self._call(system, user_msg, max_tokens=2048)


# Singleton instance
claude = ClaudeClient()
