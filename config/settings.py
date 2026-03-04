"""
LDU Grant Operations — Central Settings
All configuration is loaded from .env — never hardcode secrets.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Anthropic (Claude AI) ---
    anthropic_api_key: str = Field(..., description="Claude API key")
    claude_model: str = Field(default="claude-sonnet-4-6", description="Claude model to use")

    # --- Airtable ---
    airtable_api_token: str = Field(..., description="Airtable personal access token")
    airtable_base_id: str = Field(..., description="Airtable base ID")

    # --- Google Drive ---
    google_credentials_path: str = Field(default="config/google_credentials.json")
    google_drive_folder_id: str = Field(default="")

    # --- Make.com Webhooks ---
    make_webhook_prospect_intake: str = Field(default="")
    make_webhook_deadline_sync: str = Field(default="")
    make_webhook_submission_followup: str = Field(default="")
    make_webhook_report_alert: str = Field(default="")
    make_webhook_award_onboard: str = Field(default="")
    make_webhook_decline_recovery: str = Field(default="")
    make_webhook_weekly_summary: str = Field(default="")

    # --- Instrumentl ---
    instrumentl_api_key: Optional[str] = Field(default=None)

    # --- Poke AI ---
    poke_webhook_url: str = Field(default="")

    # --- General ---
    timezone: str = Field(default="America/Los_Angeles")
    log_level: str = Field(default="INFO")
    ceo_contact: str = Field(default="")
    impl_lead_contact: str = Field(default="")

    # --- LDU Organization Info ---
    org_name: str = "Life Development University"
    org_legal_name: str = "Life Development Group"
    org_ein: str = ""  # Fill in when available
    org_address: str = "4241 Crenshaw Blvd, Los Angeles, CA"
    org_website: str = "www.lduniversity.org"
    org_type: str = "501(c)(3)"

    # --- Scoring Thresholds ---
    scoring_threshold_standard: float = 3.5
    scoring_threshold_founder: float = 3.0
    auto_disqualify_min_award: int = 5000
    auto_disqualify_min_days: int = 14

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton instance — import this everywhere
settings = Settings()
