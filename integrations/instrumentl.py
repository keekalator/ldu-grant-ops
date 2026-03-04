"""
LDU Grant Operations — Instrumentl Integration
Ingests grant alerts from Instrumentl into the pipeline.

NOTE: Instrumentl primarily pushes data via email alerts.
The main integration path is:
  Instrumentl email alert → Make.com scenario → Airtable record

This module handles any direct API access if available,
and provides utilities for parsing Instrumentl data formats.
"""

from typing import Dict, List
from loguru import logger


class InstrumentlClient:
    """Client for Instrumentl grant discovery platform."""

    def __init__(self):
        logger.info("Instrumentl client initialized — primary integration via Make.com webhooks")

    def parse_alert_data(self, raw_alert: Dict) -> Dict:
        """Parse an Instrumentl alert into our standard prospect format."""
        return {
            "name": raw_alert.get("grant_name", ""),
            "funder": raw_alert.get("funder_name", ""),
            "description": raw_alert.get("description", ""),
            "deadline": raw_alert.get("deadline", ""),
            "amount_low": raw_alert.get("amount_min", 0),
            "amount_high": raw_alert.get("amount_max", 0),
            "geography": raw_alert.get("geographic_scope", ""),
            "url": raw_alert.get("url", ""),
            "source": "Instrumentl",
        }


instrumentl = InstrumentlClient()
