"""
LDU Grant Operations — Compliance & Attachments Agent
Compiles required documents and verifies submission checklists.
"""

from agents.base_agent import BaseAgent


class ComplianceAgent(BaseAgent):
    """Manages compliance documents and attachment packages."""

    # Standing attachments LDU should always have ready
    STANDING_ATTACHMENTS = [
        "IRS Determination Letter (501(c)(3))",
        "Board of Directors List",
        "Organizational Chart",
        "Most Recent Form 990",
        "Audited Financial Statements",
        "Certificate of Insurance",
        "Key Personnel Resumes (Kika Keith, Kika Howze)",
        "SAM.gov Registration Confirmation",
        "Women-Owned Business Certifications (SBE, MBE, WBE, DBE)",
    ]

    def __init__(self):
        super().__init__("Compliance & Attachments Agent")

    def run(self, grant_requirements: dict, **kwargs):
        """Check what attachments are needed and which are ready."""
        self.log_activity("Compliance Check", grant_requirements.get("grant_name", "Unknown"))

        required = grant_requirements.get("required_attachments", [])
        checklist = []

        for item in required:
            is_standing = any(sa.lower() in item.lower() for sa in self.STANDING_ATTACHMENTS)
            checklist.append({
                "item": item,
                "status": "Ready (standing)" if is_standing else "Needs preparation",
                "is_standing": is_standing,
            })

        ready_count = sum(1 for c in checklist if c["is_standing"])
        self.log_success("Compliance", f"{ready_count}/{len(checklist)} attachments ready")

        return {"checklist": checklist, "ready": ready_count, "total": len(checklist)}
