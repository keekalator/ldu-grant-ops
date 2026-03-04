"""
LDU Grant Operations — Pipeline Orchestrator
Master script that runs the full pipeline cycle.

Usage:
    python scripts/run_pipeline.py --mode daily     # Daily scan + screen + score
    python scripts/run_pipeline.py --mode weekly     # Full pipeline review
    python scripts/run_pipeline.py --mode summary    # CEO weekly summary only
    python scripts/run_pipeline.py --mode test       # Test all connections
    python scripts/run_pipeline.py --mode scrape     # Proactive discovery: scrape Grants.gov, CA Arts Council, CalRecycle, LA County Arts
"""

import argparse
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from loguru import logger

console = Console()


def test_connections():
    """Test all API connections and report status."""
    console.print(Panel("Testing All Connections", style="bold blue"))

    results = []

    # Test Anthropic / Claude
    try:
        from integrations.claude_client import claude
        response = claude._call(
            system="You are a test assistant.",
            user_message="Reply with exactly: CONNECTION_OK",
            max_tokens=20,
        )
        results.append(("Claude AI (Anthropic)", "OK" if "CONNECTION_OK" in response else "UNEXPECTED", response[:50]))
    except Exception as e:
        results.append(("Claude AI (Anthropic)", "FAILED", str(e)[:80]))

    # Test Airtable
    try:
        from integrations.airtable_client import airtable

        health = airtable.check_health()
        if health.get("ok"):
            results.append(("Airtable", "OK", health.get("details", "")[:80]))
        else:
            results.append(("Airtable", "FAILED", health.get("details", "")[:80]))
    except Exception as e:
        results.append(("Airtable", "FAILED", str(e)[:80]))

    # Test Config
    try:
        from config.pillars import ALL_PILLARS, get_all_keywords
        keywords = get_all_keywords()
        results.append(("Pillar Config", "OK", f"{len(ALL_PILLARS)} pillars, {len(keywords)} keywords"))
    except Exception as e:
        results.append(("Pillar Config", "FAILED", str(e)[:80]))

    # Test Scoring
    try:
        from config.scoring import calculate_weighted_score
        test_scores = {"mission_fit": 4, "award_size": 3, "win_probability": 4, "timeline_fit": 5, "strategic_value": 3}
        weighted = calculate_weighted_score(test_scores)
        results.append(("Scoring Engine", "OK", f"Test score: {weighted}"))
    except Exception as e:
        results.append(("Scoring Engine", "FAILED", str(e)[:80]))

    # Display results
    table = Table(title="Connection Test Results")
    table.add_column("Service", style="cyan")
    table.add_column("Status", style="bold")
    table.add_column("Details")

    for service, status, details in results:
        style = "green" if status == "OK" else "red"
        table.add_row(service, f"[{style}]{status}[/{style}]", details)

    console.print(table)

    failed = [r for r in results if r[1] != "OK"]
    if failed:
        console.print(f"\n[red]WARNING: {len(failed)} service(s) failed. Check your .env configuration.[/red]")
    else:
        console.print("\n[green]All connections successful! System ready.[/green]")


def run_daily_cycle():
    """Execute the daily pipeline cycle: scan → screen → score."""
    console.print(Panel("Daily Pipeline Cycle", style="bold green"))
    console.print(f"Started: {datetime.now().isoformat()}")

    # Step 1: Check for new Instrumentl alerts (via Airtable — Make.com pushes them in)
    console.print("\n[cyan]Step 1:[/cyan] Checking for new prospects...")
    try:
        from integrations.airtable_client import airtable
        new_prospects = airtable.get_opportunities_by_status("Prospect")
        console.print(f"  Found {len(new_prospects)} new prospects to screen")
    except Exception as e:
        console.print(f"  [red]Error checking prospects: {e}[/red]")
        return

    # Step 2: Screen each new prospect
    console.print("\n[cyan]Step 2:[/cyan] Running eligibility screening...")
    from agents.research.eligibility import EligibilityAgent
    screener = EligibilityAgent()

    qualified = []
    disqualified = []

    for record in new_prospects:
        fields = record.get("fields", {})
        prospect_data = {
            "name": fields.get("Grant Name", "Unknown"),
            "description": fields.get("Notes", ""),
            "funder": fields.get("Funder", ""),
            "deadline": fields.get("Deadline", ""),
            "amount_high": fields.get("Award Amount Range", 0),
            "geography": fields.get("Notes", ""),  # Extract from notes
            "requirements": fields.get("Notes", ""),
        }

        result = screener.run(prospect_data)

        if result["qualified"]:
            qualified.append((record, result))
            # Update status to Screening
            try:
                airtable.update_opportunity(record["id"], {
                    "Status": "Scoring",
                    "Pre-Qualification Summary": result["pre_qualification_summary"],
                    "Pillar": result["pillar_matches"],
                })
            except Exception:
                pass
        else:
            disqualified.append((record, result))
            try:
                airtable.update_opportunity(record["id"], {
                    "Status": "Disqualified",
                    "Pre-Qualification Summary": result["pre_qualification_summary"],
                })
            except Exception:
                pass

    console.print(f"  Qualified: {len(qualified)} | Disqualified: {len(disqualified)}")

    # Step 3: Score qualified prospects
    console.print("\n[cyan]Step 3:[/cyan] Scoring qualified prospects...")
    from agents.research.scorer import ScoringAgent
    scorer = ScoringAgent()

    writing_queue_additions = 0
    for record, eligibility in qualified:
        fields = record.get("fields", {})
        prospect_data = {
            "name": fields.get("Grant Name", "Unknown"),
            "description": fields.get("Notes", ""),
            "funder": fields.get("Funder", ""),
            "deadline": fields.get("Deadline", ""),
            "amount_high": fields.get("Award Amount Range", 0),
        }

        score_result = scorer.run(prospect_data, eligibility)

        if score_result["enters_writing_queue"]:
            writing_queue_additions += 1

        try:
            scorer.score_and_update_airtable(record["id"], prospect_data, eligibility)
        except Exception:
            pass

    console.print(f"  Added to writing queue: {writing_queue_additions}")

    # Step 4: Auto-generate writing plans for newly qualified prospects
    console.print("\n[cyan]Step 4:[/cyan] Generating writing plans for qualified prospects...")
    from agents.writing.writing_plan import WritingPlanAgent
    planner = WritingPlanAgent()
    plans_generated = 0
    for record, _ in qualified:
        if not record.get("fields", {}).get("Writing Plan"):
            result = planner.run(record)
            if result.get("saved"):
                plans_generated += 1
    console.print(f"  Writing plans generated: {plans_generated}")

    # Summary
    console.print(Panel(
        f"Daily Cycle Complete\n"
        f"New prospects screened: {len(new_prospects)}\n"
        f"Qualified: {len(qualified)}\n"
        f"Disqualified: {len(disqualified)}\n"
        f"Added to writing queue: {writing_queue_additions}",
        style="bold green"
    ))


def run_weekly_review():
    """Execute the Monday pipeline review."""
    console.print(Panel("Weekly Pipeline Review", style="bold blue"))

    try:
        from integrations.airtable_client import airtable

        # Pipeline summary
        summary = airtable.get_pipeline_summary()
        table = Table(title="Pipeline by Status")
        table.add_column("Status", style="cyan")
        table.add_column("Count", style="bold")
        for status, count in sorted(summary.items()):
            table.add_row(status, str(count))
        console.print(table)

        # Upcoming deadlines
        upcoming = airtable.get_upcoming_deadlines(30)
        if upcoming:
            deadline_table = Table(title="Upcoming Deadlines (30 days)")
            deadline_table.add_column("Grant", style="cyan")
            deadline_table.add_column("Deadline", style="yellow")
            deadline_table.add_column("Status")
            for record in upcoming[:10]:
                fields = record.get("fields", {})
                deadline_table.add_row(
                    fields.get("Grant Name", "Unknown"),
                    fields.get("Deadline", "Unknown"),
                    fields.get("Status", "Unknown"),
                )
            console.print(deadline_table)

        # Writing queue
        writing_queue = airtable.get_writing_queue()
        console.print(f"\n[bold]Writing Queue:[/bold] {len(writing_queue)} applications in production")

        # Pending submissions
        pending = airtable.get_pending_submissions()
        console.print(f"[bold]Pending Decisions:[/bold] {len(pending)} submissions awaiting response")

    except Exception as e:
        console.print(f"[red]Error running weekly review: {e}[/red]")
        console.print("Make sure Airtable is configured and tables are created.")


def run_ceo_summary():
    """Generate the Friday 4PM CEO summary."""
    console.print(Panel("Generating CEO Summary", style="bold magenta"))

    try:
        from integrations.airtable_client import airtable
        from integrations.claude_client import claude

        # Gather pipeline data
        pipeline_data = {
            "summary": airtable.get_pipeline_summary(),
            "upcoming_deadlines": [
                r.get("fields", {}) for r in airtable.get_upcoming_deadlines(14)
            ],
            "writing_queue": [
                r.get("fields", {}) for r in airtable.get_writing_queue()
            ],
            "pending": [
                r.get("fields", {}) for r in airtable.get_pending_submissions()
            ],
            "generated_at": datetime.now().isoformat(),
        }

        # Generate summary via Claude
        summary = claude.generate_ceo_summary(pipeline_data)
        console.print(Panel(summary, title="CEO Weekly Summary", style="magenta"))

    except Exception as e:
        console.print(f"[red]Error generating summary: {e}[/red]")


def run_scrape_cycle():
    """Proactively discover new grant prospects from public sources."""
    console.print(Panel("Grant Discovery Scrape", style="bold yellow"))
    console.print("Sources: Grants.gov (federal) · CA Arts Council · CalRecycle · LA County Arts\n")

    try:
        from agents.research.grant_scraper import GrantScraperAgent
        scraper = GrantScraperAgent()
        results = scraper.run()

        table = Table(title="Scrape Results by Source")
        table.add_column("Source", style="cyan")
        table.add_column("New Prospects Added", style="bold green")

        for source, count in results.get("sources", {}).items():
            table.add_row(source, str(count))

        console.print(table)
        console.print(Panel(
            f"Total found: {results['total_found']}\n"
            f"New added to Airtable: {results['new_added']}\n"
            f"Duplicates skipped: {results['duplicates_skipped']}\n"
            f"Errors: {results['errors']}\n\n"
            f"Run [bold]--mode daily[/bold] next to screen and score the new prospects.",
            style="bold yellow",
        ))

    except Exception as e:
        console.print(f"[red]Scrape cycle failed: {e}[/red]")


def run_write_cycle(record_id: str | None = None):
    """Trigger writing agents for grants in the Writing Queue."""
    console.print(Panel("Writing Agent Cycle", style="bold yellow"))

    try:
        from integrations.airtable_client import airtable
        from agents.writing.narrative import NarrativeAgent
        from agents.writing.budget import BudgetAgent
        from agents.writing.qa_editor import QAEditorAgent

        if record_id:
            records = [airtable.get_opportunity(record_id)]
            console.print(f"  Writing for specific record: {record_id}")
        else:
            records = airtable.get_writing_queue()
            console.print(f"  Found {len(records)} grants in Writing Queue")

        if not records:
            console.print("[yellow]No grants in Writing Queue. Nothing to draft.[/yellow]")
            return

        narrative_agent = NarrativeAgent()
        budget_agent    = BudgetAgent()
        qa_agent        = QAEditorAgent()

        for record in records:
            fields = record.get("fields", {})
            name   = fields.get("Grant Name", "Unknown")
            console.print(f"\n  Drafting: [cyan]{name}[/cyan]")

            grant_data = {
                "name":        name,
                "description": fields.get("Description", fields.get("Notes", "")),
                "funder":      fields.get("Funder Name", ""),
                "amount":      fields.get("Award Amount Range", 0),
                "deadline":    fields.get("Deadline", ""),
                "pillar":      (fields.get("Pillar") or [""])[0],
                "entity":      fields.get("Submitting Entity", "LDU"),
                "eligibility": fields.get("Eligibility Notes", ""),
                "why_qualify": fields.get("Why We Qualify", ""),
            }

            try:
                narrative = narrative_agent.run(grant_data)
                console.print(f"    [green]✓ Narrative drafted[/green]")
            except Exception as e:
                console.print(f"    [red]✗ Narrative failed: {e}[/red]")
                narrative = {"narrative": ""}

            try:
                budget = budget_agent.run(grant_data)
                console.print(f"    [green]✓ Budget narrative drafted[/green]")
            except Exception as e:
                console.print(f"    [red]✗ Budget failed: {e}[/red]")
                budget = {"budget_narrative": ""}

            try:
                qa = qa_agent.run({**grant_data, **narrative, **budget})
                console.print(f"    [green]✓ QA review complete[/green]")
            except Exception as e:
                console.print(f"    [red]✗ QA failed: {e}[/red]")
                qa = {"feedback": ""}

            # Combine all drafts into Notes for now (until Google Drive integration)
            combined = (
                f"=== NARRATIVE DRAFT ===\n{narrative.get('narrative','')}\n\n"
                f"=== BUDGET NARRATIVE ===\n{budget.get('budget_narrative','')}\n\n"
                f"=== QA NOTES ===\n{qa.get('feedback','')}"
            )

            try:
                airtable.update_opportunity(record["id"], {"Notes": combined, "Status": "Writing"})
                console.print(f"    [green]✓ Draft saved to Airtable[/green]")
            except Exception as e:
                console.print(f"    [red]✗ Save failed: {e}[/red]")

        console.print(Panel(
            f"Write cycle complete — {len(records)} grant(s) drafted.\n"
            "Next step: Kika Howze reviews in Google Drive, then moves status to 'In Review'.",
            style="bold yellow"
        ))

    except Exception as e:
        console.print(f"[red]Write cycle failed: {e}[/red]")


def main():
    parser = argparse.ArgumentParser(description="LDU Grant Operations Pipeline")
    parser.add_argument(
        "--mode",
        choices=["daily", "weekly", "summary", "test", "scrape", "write"],
        required=True,
        help="Pipeline mode to run",
    )
    parser.add_argument(
        "--id",
        default=None,
        help="Airtable record ID for --mode write (optional — drafts all Writing Queue if omitted)",
    )
    args = parser.parse_args()

    console.print(f"\n[bold]LDU Grant Operations Engine[/bold]")
    console.print(f"Mode: {args.mode} | Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")

    if args.mode == "test":
        test_connections()
    elif args.mode == "daily":
        run_daily_cycle()
    elif args.mode == "weekly":
        run_weekly_review()
    elif args.mode == "summary":
        run_ceo_summary()
    elif args.mode == "scrape":
        run_scrape_cycle()
    elif args.mode == "write":
        run_write_cycle(record_id=args.id)


if __name__ == "__main__":
    main()
