"""
LDU Grant Operations — Airtable Setup Script
Creates all 6 tables in your Airtable base with the correct fields and views.

Usage:
    python scripts/setup_airtable.py

IMPORTANT: This script creates the table STRUCTURE. You still need to:
1. Create the Airtable base manually at airtable.com
2. Add your base ID to .env as AIRTABLE_BASE_ID
3. Create your API token at airtable.com/create/tokens
4. Then run this script to set up the tables

Note: Airtable's API has limited schema creation capabilities.
This script will guide you through manual setup where needed.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rich.console import Console
from rich.panel import Panel
from rich.table import Table as RichTable

console = Console()


def print_table_spec(name: str, fields: list, views: list = None):
    """Print a formatted table specification."""
    console.print(f"\n[bold cyan]TABLE: {name}[/bold cyan]")

    table = RichTable(title=f"{name} — Fields")
    table.add_column("Field Name", style="bold")
    table.add_column("Type", style="green")
    table.add_column("Options / Notes", style="dim")

    for field_name, field_type, options in fields:
        table.add_row(field_name, field_type, options)

    console.print(table)

    if views:
        console.print(f"  [yellow]Views to create:[/yellow]")
        for view in views:
            console.print(f"    - {view}")


def main():
    console.print(Panel(
        "[bold]LDU Grant Operations — Airtable Setup Guide[/bold]\n\n"
        "This script shows you exactly what to create in Airtable.\n"
        "Follow each table specification below.",
        style="blue"
    ))

    # ============================================================
    # TABLE 1: OPPORTUNITIES
    # ============================================================
    print_table_spec(
        "Opportunities",
        fields=[
            ("Grant Name", "Single line text", "Primary field"),
            ("Funder", "Link to Funders table", "Linked record"),
            ("Pillar", "Multiple select", "Capital Campaign, Programming & Ops, Studio WELEH, Ag Extension & Mfg, Founder & Enterprise, Textile Sustainability"),
            ("Submitting Entity", "Single select", "LDU (501c3), Weleh (Individual), Studio WELEH (For-Profit), Gorilla Rx (For-Profit), Kika (Individual), Farm Entity (TBD), N/A (Partnership)"),
            ("Entity Type", "Single select", "Nonprofit, Individual Artist, Individual, For-Profit, For-Profit/Coop, Partnership"),
            ("Priority", "Single select", "HIGH, MEDIUM, LOW"),
            ("Source", "Single select", "Instrumentl, Manual-KH, Manual-KK, Manual-EntityMatrix, Referral, Newsletter, AutoScrape-GrantsGov, AutoScrape-CAArts, AutoScrape-CalRecycle, AutoScrape-LACountyArts"),
            ("Deadline", "Date", "Include time field"),
            ("Award Amount Range", "Number", "Currency format"),
            ("Status", "Single select", "Prospect, Screening, Scoring, Profiling, Writing Queue, In Production, Submitted, Pending, Awarded, Declined, Disqualified, Active"),
            ("Weighted Score", "Number", "Decimal, 2 places — will be calculated by agents"),
            ("Mission Fit", "Number", "1-5 scale"),
            ("Award Size", "Number", "1-5 scale"),
            ("Win Probability", "Number", "1-5 scale"),
            ("Timeline Fit", "Number", "1-5 scale"),
            ("Strategic Value", "Number", "1-5 scale"),
            ("Pre-Qualification Summary", "Long text", "Auto-filled by eligibility agent"),
            ("Assigned To", "Single line text", "Person responsible"),
            ("Submission Link", "URL", "Link to submission portal"),
            ("Notes", "Long text", "General notes"),
        ],
        views=[
            "Pipeline by Pillar (grouped by Pillar field)",
            "Pipeline by Deadline (sorted by Deadline, ascending)",
            "Pipeline by Status (Kanban view, grouped by Status)",
            "Active Applications (filtered: Status = In Production or Writing Queue)",
            "Upcoming Deadlines — 30 Days (filtered: Deadline within 30 days)",
            "Founder & Enterprise Quick-Turn (filtered: Pillar = Founder & Enterprise)",
            "Textile/Sustainability Track (filtered: Pillar contains Textile Sustainability)",
        ]
    )

    # ============================================================
    # TABLE 2: FUNDERS
    # ============================================================
    print_table_spec(
        "Funders",
        fields=[
            ("Funder Name", "Single line text", "Primary field"),
            ("Type", "Single select", "Federal, State, Local, Foundation, Corporate, SB 707-Related"),
            ("Contact Name", "Single line text", "Primary contact"),
            ("Contact Email", "Email", ""),
            ("Phone", "Phone number", ""),
            ("Website", "URL", ""),
            ("Average Award Size", "Number", "Currency"),
            ("Past Grantees", "Long text", "Notable past grantees"),
            ("Relationship Status", "Single select", "New, Introduced, Active, Strong"),
            ("Funder Dossier Link", "URL", "Link to Google Drive dossier"),
            ("Notes", "Long text", ""),
        ],
        views=[
            "Funder Relationship Map (grouped by Relationship Status)",
            "By Type (grouped by Type)",
        ]
    )

    # ============================================================
    # TABLE 3: SUBMISSIONS
    # ============================================================
    print_table_spec(
        "Submissions",
        fields=[
            ("Grant Name", "Link to Opportunities", "Linked record"),
            ("Funder", "Link to Funders", "Linked record"),
            ("Pillar", "Multiple select", "Same options as Opportunities"),
            ("Date Submitted", "Date", ""),
            ("Amount Requested", "Number", "Currency"),
            ("Outcome", "Single select", "Pending, Awarded, Declined, Withdrawn"),
            ("Amount Awarded", "Number", "Currency"),
            ("Award Date", "Date", ""),
            ("Feedback Notes", "Long text", "Funder feedback if available"),
            ("Reapplication Plan", "Long text", "Strategy for next cycle"),
        ],
    )

    # ============================================================
    # TABLE 4: REPORTING
    # ============================================================
    print_table_spec(
        "Reporting",
        fields=[
            ("Grant Name", "Link to Opportunities", "Linked record"),
            ("Funder", "Single line text", ""),
            ("Report Type", "Single select", "Interim, Final, Financial, Narrative"),
            ("Due Date", "Date", ""),
            ("Status", "Single select", "Not Started, Drafting, Review, Submitted"),
            ("Submitted Date", "Date", ""),
            ("Notes", "Long text", ""),
        ],
    )

    # ============================================================
    # TABLE 5: BOILERPLATE LIBRARY
    # ============================================================
    print_table_spec(
        "Boilerplate Library",
        fields=[
            ("Section Name", "Single line text", "Primary field"),
            ("Category", "Single select", "Organizational, Needs, Programs, Outcomes, Sustainability, Capital, Studio WELEH, Ag Extension, Founder, Textile-SB707"),
            ("Word Count", "Number", "Integer"),
            ("Last Updated", "Date", ""),
            ("Content", "Long text", "The actual boilerplate text"),
            ("Version", "Number", "Integer, starts at 1"),
            ("Google Doc Link", "URL", "Link to source document"),
        ],
    )

    # ============================================================
    # TABLE 6: TEAM TASKS
    # ============================================================
    print_table_spec(
        "Team Tasks",
        fields=[
            ("Task", "Single line text", "Primary field"),
            ("Assigned To", "Single line text", ""),
            ("Related Grant", "Link to Opportunities", "Linked record"),
            ("Due Date", "Date", ""),
            ("Status", "Single select", "To Do, In Progress, Done"),
            ("Priority", "Single select", "High, Medium, Low"),
            ("Notes", "Long text", ""),
        ],
    )

    # ============================================================
    # SUMMARY
    # ============================================================
    console.print(Panel(
        "[bold green]Setup Complete![/bold green]\n\n"
        "Create these 6 tables in your Airtable base, then:\n"
        "1. Update your .env file with the AIRTABLE_BASE_ID\n"
        "2. Run: python scripts/run_pipeline.py --mode test\n"
        "3. Verify the Airtable connection shows OK",
        style="green"
    ))


if __name__ == "__main__":
    main()
