"""
LDU Grant Operations — Airtable Table Creator

This script uses the Airtable Web API (metadata endpoints) to create the
six required tables in your existing base, using the credentials from
your .env file (loaded via config.settings.Settings).

Tables created (if they don't already exist):
  1. Opportunities
  2. Funders
  3. Submissions
  4. Reporting
  5. Boilerplate Library
  6. Team Tasks

The script is idempotent: if a table with the required name already
exists, it will be left as-is and reused.
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List

import requests
from loguru import logger

# Ensure project root is on sys.path so we can import config.settings
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import settings


API_BASE = "https://api.airtable.com/v0"


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.airtable_api_token}",
        "Content-Type": "application/json",
    }


def get_existing_tables() -> Dict[str, str]:
    """
    Return a mapping of {table_name: table_id} for the configured base.
    """
    url = f"{API_BASE}/meta/bases/{settings.airtable_base_id}/tables"
    resp = requests.get(url, headers=_headers(), timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Failed to list existing tables: {resp.status_code} {resp.text}"
        )
    data = resp.json()
    tables = data.get("tables", [])
    return {t.get("name"): t.get("id") for t in tables if t.get("name") and t.get("id")}


def create_table_if_missing(
    table_name: str, fields: List[Dict[str, Any]], existing: Dict[str, str]
) -> str:
    """
    Ensure a table with the given name exists; create it if missing.

    Returns the Airtable table ID.
    """
    if table_name in existing:
        table_id = existing[table_name]
        logger.info(f"Table '{table_name}' already exists (id={table_id}), skipping.")
        return table_id

    url = f"{API_BASE}/meta/bases/{settings.airtable_base_id}/tables"
    payload = {
        "name": table_name,
        "fields": fields,
    }
    resp = requests.post(url, headers=_headers(), json=payload, timeout=30)
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Failed to create table '{table_name}': {resp.status_code} {resp.text}"
        )
    data = resp.json()
    table_id = data.get("id") or data.get("table", {}).get("id")
    if not table_id:
        raise RuntimeError(
            f"Table '{table_name}' created but response did not include an id: {data}"
        )

    logger.info(f"Created table '{table_name}' (id={table_id}).")
    existing[table_name] = table_id
    return table_id


# ---------------------------------------------------------------------------
# Field definitions for each table
# ---------------------------------------------------------------------------


def build_funders_fields() -> List[Dict[str, Any]]:
    return [
        {"name": "Funder Name", "type": "singleLineText"},
        {
            "name": "Type",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "Federal"},
                    {"name": "State"},
                    {"name": "Local"},
                    {"name": "Foundation"},
                    {"name": "Corporate"},
                    {"name": "SB 707-Related"},
                ]
            },
        },
        {"name": "Contact Name", "type": "singleLineText"},
        {"name": "Contact Email", "type": "email"},
        {"name": "Phone", "type": "phoneNumber"},
        {"name": "Website", "type": "url"},
        {
            "name": "Average Award Size",
            "type": "number",
            "options": {"precision": 0},
        },
        {"name": "Past Grantees", "type": "multilineText"},
        {
            "name": "Relationship Status",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "New"},
                    {"name": "Introduced"},
                    {"name": "Active"},
                    {"name": "Strong"},
                ]
            },
        },
        {"name": "Funder Dossier Link", "type": "url"},
        {"name": "Notes", "type": "multilineText"},
    ]


def _pillar_choices() -> List[Dict[str, str]]:
    return [
        {"name": "Capital Campaign"},
        {"name": "Programming & Ops"},
        {"name": "Studio WELEH"},
        {"name": "Ag Extension & Mfg"},
        {"name": "Founder & Enterprise"},
        {"name": "Textile Sustainability"},
    ]


def build_opportunities_fields(funders_table_id: str) -> List[Dict[str, Any]]:
    return [
        {"name": "Grant Name", "type": "singleLineText"},
        {
            "name": "Funder",
            "type": "multipleRecordLinks",
            "options": {"linkedTableId": funders_table_id},
        },
        {
            "name": "Pillar",
            "type": "multipleSelects",
            "options": {"choices": _pillar_choices()},
        },
        {
            "name": "Source",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "Instrumentl"},
                    {"name": "Manual-KH"},
                    {"name": "Manual-KK"},
                    {"name": "Referral"},
                    {"name": "Newsletter"},
                ]
            },
        },
        {
            "name": "Deadline",
            "type": "date",
            "options": {
                "dateFormat": {"name": "local"},
            },
        },
        {
            "name": "Award Amount Range",
            "type": "number",
            "options": {"precision": 0},
        },
        {
            "name": "Status",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "Prospect"},
                    {"name": "Screening"},
                    {"name": "Scoring"},
                    {"name": "Profiling"},
                    {"name": "Writing Queue"},
                    {"name": "In Production"},
                    {"name": "Submitted"},
                    {"name": "Pending"},
                    {"name": "Awarded"},
                    {"name": "Declined"},
                    {"name": "Disqualified"},
                ]
            },
        },
        {
            "name": "Weighted Score",
            "type": "number",
            "options": {"precision": 2},
        },
        {
            "name": "Mission Fit",
            "type": "number",
            "options": {"precision": 0},
        },
        {
            "name": "Award Size",
            "type": "number",
            "options": {"precision": 0},
        },
        {
            "name": "Win Probability",
            "type": "number",
            "options": {"precision": 0},
        },
        {
            "name": "Timeline Fit",
            "type": "number",
            "options": {"precision": 0},
        },
        {
            "name": "Strategic Value",
            "type": "number",
            "options": {"precision": 0},
        },
        {"name": "Pre-Qualification Summary", "type": "multilineText"},
        {"name": "Assigned To", "type": "singleLineText"},
        {"name": "Submission Link", "type": "url"},
        {"name": "Notes", "type": "multilineText"},
    ]


def build_submissions_fields(
    opportunities_table_id: str, funders_table_id: str
) -> List[Dict[str, Any]]:
    return [
        {"name": "Record Name", "type": "singleLineText"},
        {
            "name": "Grant Name",
            "type": "multipleRecordLinks",
            "options": {"linkedTableId": opportunities_table_id},
        },
        {
            "name": "Funder",
            "type": "multipleRecordLinks",
            "options": {"linkedTableId": funders_table_id},
        },
        {
            "name": "Pillar",
            "type": "multipleSelects",
            "options": {"choices": _pillar_choices()},
        },
        {
            "name": "Date Submitted",
            "type": "date",
            "options": {
                "dateFormat": {"name": "local"},
            },
        },
        {
            "name": "Amount Requested",
            "type": "number",
            "options": {"precision": 0},
        },
        {
            "name": "Outcome",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "Pending"},
                    {"name": "Awarded"},
                    {"name": "Declined"},
                    {"name": "Withdrawn"},
                ]
            },
        },
        {
            "name": "Amount Awarded",
            "type": "number",
            "options": {"precision": 0},
        },
        {
            "name": "Award Date",
            "type": "date",
            "options": {
                "dateFormat": {"name": "local"},
            },
        },
        {"name": "Feedback Notes", "type": "multilineText"},
        {"name": "Reapplication Plan", "type": "multilineText"},
    ]


def build_reporting_fields(opportunities_table_id: str) -> List[Dict[str, Any]]:
    return [
        {"name": "Record Name", "type": "singleLineText"},
        {
            "name": "Grant Name",
            "type": "multipleRecordLinks",
            "options": {"linkedTableId": opportunities_table_id},
        },
        {"name": "Funder", "type": "singleLineText"},
        {
            "name": "Report Type",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "Interim"},
                    {"name": "Final"},
                    {"name": "Financial"},
                    {"name": "Narrative"},
                ]
            },
        },
        {
            "name": "Due Date",
            "type": "date",
            "options": {
                "dateFormat": {"name": "local"},
            },
        },
        {
            "name": "Status",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "Not Started"},
                    {"name": "Drafting"},
                    {"name": "Review"},
                    {"name": "Submitted"},
                ]
            },
        },
        {
            "name": "Submitted Date",
            "type": "date",
            "options": {
                "dateFormat": {"name": "local"},
            },
        },
        {"name": "Notes", "type": "multilineText"},
    ]


def build_boilerplate_fields() -> List[Dict[str, Any]]:
    return [
        {"name": "Section Name", "type": "singleLineText"},
        {
            "name": "Category",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "Organizational"},
                    {"name": "Needs"},
                    {"name": "Programs"},
                    {"name": "Outcomes"},
                    {"name": "Sustainability"},
                    {"name": "Capital"},
                    {"name": "Studio WELEH"},
                    {"name": "Ag Extension"},
                    {"name": "Founder"},
                    {"name": "Textile-SB707"},
                ]
            },
        },
        {
            "name": "Word Count",
            "type": "number",
            "options": {"precision": 0},
        },
        {
            "name": "Last Updated",
            "type": "date",
            "options": {
                "dateFormat": {"name": "local"},
            },
        },
        {"name": "Content", "type": "multilineText"},
        {
            "name": "Version",
            "type": "number",
            "options": {"precision": 0},
        },
        {"name": "Google Doc Link", "type": "url"},
    ]


def build_team_tasks_fields(opportunities_table_id: str) -> List[Dict[str, Any]]:
    return [
        {"name": "Task", "type": "singleLineText"},
        {"name": "Assigned To", "type": "singleLineText"},
        {
            "name": "Related Grant",
            "type": "multipleRecordLinks",
            "options": {"linkedTableId": opportunities_table_id},
        },
        {
            "name": "Due Date",
            "type": "date",
            "options": {
                "dateFormat": {"name": "local"},
            },
        },
        {
            "name": "Status",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "To Do"},
                    {"name": "In Progress"},
                    {"name": "Done"},
                ]
            },
        },
        {
            "name": "Priority",
            "type": "singleSelect",
            "options": {
                "choices": [
                    {"name": "High"},
                    {"name": "Medium"},
                    {"name": "Low"},
                ]
            },
        },
        {"name": "Notes", "type": "multilineText"},
    ]


def main() -> None:
    logger.info(
        f"Creating Airtable tables in base {settings.airtable_base_id!r} "
        "using token from .env."
    )
    existing = get_existing_tables()
    logger.info(
        f"Base currently has {len(existing)} table(s): "
        + ", ".join(sorted(existing.keys())) if existing else "Base currently has 0 tables."
    )

    created_ids: Dict[str, str] = {}

    # Order matters because of linked-record fields.
    # 1) Funders (no dependencies)
    funders_id = create_table_if_missing(
        "Funders", build_funders_fields(), existing
    )
    created_ids["Funders"] = funders_id

    # 2) Opportunities (links to Funders)
    opportunities_id = create_table_if_missing(
        "Opportunities", build_opportunities_fields(funders_id), existing
    )
    created_ids["Opportunities"] = opportunities_id

    # 3) Boilerplate Library (no links)
    boilerplate_id = create_table_if_missing(
        "Boilerplate Library", build_boilerplate_fields(), existing
    )
    created_ids["Boilerplate Library"] = boilerplate_id

    # 4) Reporting (links to Opportunities)
    reporting_id = create_table_if_missing(
        "Reporting", build_reporting_fields(opportunities_id), existing
    )
    created_ids["Reporting"] = reporting_id

    # 5) Submissions (links to Opportunities + Funders)
    submissions_id = create_table_if_missing(
        "Submissions",
        build_submissions_fields(opportunities_id, funders_id),
        existing,
    )
    created_ids["Submissions"] = submissions_id

    # 6) Team Tasks (links to Opportunities)
    tasks_id = create_table_if_missing(
        "Team Tasks", build_team_tasks_fields(opportunities_id), existing
    )
    created_ids["Team Tasks"] = tasks_id

    logger.info("Done. Required tables and IDs:")
    for name, tid in created_ids.items():
        logger.info(f"  {name}: {tid}")


if __name__ == "__main__":
    main()

