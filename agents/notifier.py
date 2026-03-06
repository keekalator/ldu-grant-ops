"""
LDU Grant Ops — Push Notification Agent (Python)

Sends push notifications to Kika Keith and Kika Howze's phones via ntfy.sh.
Used by:
  - GitHub Actions scheduled workflows (deadline alerts, weekly summary)
  - Any Python agent that needs to alert the team

Setup:
  NTFY_TOPIC — set in .env and GitHub Secrets (private topic name)
  NTFY_BASE_URL — defaults to https://ntfy.sh

Usage:
  from agents.notifier import notify, deadline_alert, new_grant_alert

  notify("Grant Due Tomorrow", "Pollock-Krasner LOI is due 2026-04-30", priority="urgent")
  deadline_alert("Pollock-Krasner Foundation", days_left=1, entity="Weleh (Individual)")
"""

import os
import requests
from typing import Optional

NTFY_TOPIC    = os.getenv("NTFY_TOPIC", "")
NTFY_BASE_URL = os.getenv("NTFY_BASE_URL", "https://ntfy.sh")


def notify(
    title: str,
    body: str,
    priority: str = "default",
    tags: Optional[list[str]] = None,
    click_url: Optional[str] = None,
) -> bool:
    """
    Send a push notification.
    Returns True if sent, False if NTFY_TOPIC not set or request failed.
    """
    if not NTFY_TOPIC:
        print(f"[notify] NTFY_TOPIC not set — skipping: {title}")
        return False

    headers = {
        "Title":    title,
        "Priority": priority,
    }
    if tags:
        headers["Tags"] = ",".join(tags)
    if click_url:
        headers["Click"] = click_url

    try:
        resp = requests.post(
            f"{NTFY_BASE_URL}/{NTFY_TOPIC}",
            data=body.encode("utf-8"),
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        print(f"[notify] Sent: {title!r}")
        return True
    except Exception as exc:
        print(f"[notify] Failed to send push: {exc}")
        return False


# ─── Pre-built helpers ────────────────────────────────────────────────────────

def deadline_alert(grant_name: str, days_left: int, entity: str, record_id: str = "") -> bool:
    if days_left <= 0:
        prefix, priority, tag = "TODAY",    "max",    "rotating_light"
    elif days_left == 1:
        prefix, priority, tag = "TOMORROW", "urgent", "warning"
    elif days_left <= 3:
        prefix, priority, tag = f"{days_left} DAYS", "urgent", "warning"
    elif days_left <= 7:
        prefix, priority, tag = f"{days_left} DAYS", "high", "calendar"
    else:
        prefix, priority, tag = f"{days_left} DAYS", "high", "calendar"

    base_url = os.getenv("NEXT_PUBLIC_BASE_URL", "")
    click    = f"{base_url}/opportunity/{record_id}" if base_url and record_id else None

    return notify(
        title    = f"[{prefix}] {grant_name}",
        body     = f"Deadline {'is TODAY' if days_left <= 0 else f'in {days_left} day{\"s\" if days_left != 1 else \"\"}'} — {entity}",
        priority = priority,
        tags     = [tag, "ldu_grants"],
        click_url= click,
    )


def new_grant_alert(grant_name: str, score: float, funder: str) -> bool:
    return notify(
        title    = f"[NEW PROSPECT] {grant_name}",
        body     = f"Score {score:.1f}/5 · {funder} — review in pipeline",
        priority = "default",
        tags     = ["moneybag", "star", "ldu_grants"],
    )


def weekly_summary(stats: dict) -> bool:
    """
    stats = {
      "total_active": 12,
      "writing_queue": 5,
      "deadlines_this_week": [{"name": "...", "days": 3}],
      "awarded_this_month": 2,
      "total_awarded_value": 85000,
    }
    """
    lines = [
        f"Active pipeline: {stats.get('total_active', 0)} grants",
        f"Writing queue: {stats.get('writing_queue', 0)} in progress",
    ]

    deadlines = stats.get("deadlines_this_week", [])
    if deadlines:
        lines.append("This week's deadlines:")
        for d in deadlines[:3]:
            lines.append(f"  • {d['name']} — {d['days']} days")

    if stats.get("awarded_this_month", 0) > 0:
        val = stats.get("total_awarded_value", 0)
        lines.append(f"Awarded this month: {stats['awarded_this_month']} grants (${val:,})")

    return notify(
        title    = "LDU Weekly Pipeline Summary",
        body     = "\n".join(lines),
        priority = "default",
        tags     = ["bar_chart", "ldu_grants"],
    )


def multi_entity_alert(grant_name: str, entities: list[str], record_id: str = "") -> bool:
    base_url = os.getenv("NEXT_PUBLIC_BASE_URL", "")
    click    = f"{base_url}/opportunity/{record_id}" if base_url and record_id else None
    return notify(
        title    = f"[MULTI-ENTITY] {grant_name}",
        body     = f"{' AND '.join(entities)} are both strong candidates — decide who submits",
        priority = "high",
        tags     = ["bell", "people_holding_hands", "ldu_grants"],
        click_url= click,
    )


# ─── Daily deadline scan (standalone) ────────────────────────────────────────

def run_deadline_scan() -> None:
    """
    Standalone deadline scan — runs from GitHub Actions daily.
    Fetches Airtable directly and fires alerts for approaching deadlines.
    """
    import json
    from datetime import date

    token   = os.getenv("AIRTABLE_API_TOKEN", "")
    base_id = os.getenv("AIRTABLE_BASE_ID", "")

    if not token or not base_id:
        print("[deadline_scan] Airtable not configured — skipping")
        return

    formula = (
        "AND("
        "NOT({Status}='Declined'),"
        "NOT({Status}='Rejected'),"
        "NOT({Status}='Disqualified'),"
        "NOT({Status}='Awarded'),"
        "{Deadline}!=''"
        ")"
    )
    url = (
        f"https://api.airtable.com/v0/{base_id}/Opportunities"
        f"?filterByFormula={requests.utils.quote(formula)}"
        f"&fields[]=Grant Name"
        f"&fields[]=Deadline"
        f"&fields[]=Status"
        f"&fields[]=Submitting Entity"
        f"&fields[]=Funder Name"
    )
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    resp.raise_for_status()
    records = resp.json().get("records", [])

    alert_thresholds = {0, 1, 3, 7, 14}
    today = date.today()
    fired = 0

    for rec in records:
        fields    = rec.get("fields", {})
        deadline  = fields.get("Deadline", "")
        name      = fields.get("Grant Name", "Unknown")
        entity    = fields.get("Submitting Entity", "LDU")
        record_id = rec.get("id", "")

        if not deadline:
            continue
        try:
            dl_date = date.fromisoformat(deadline)
        except ValueError:
            continue

        days_left = (dl_date - today).days
        if days_left in alert_thresholds:
            deadline_alert(name, days_left, entity, record_id)
            fired += 1

    print(f"[deadline_scan] Done — {fired} alert(s) sent from {len(records)} active grants")


if __name__ == "__main__":
    run_deadline_scan()
