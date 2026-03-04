"""
LDU Grant Operations — Pipeline Seed Script
Imports all 38 grants from the Entity Routing Matrix into Airtable.

Source: Entity_Routing_Matrix.xlsx (Google Sheets)
Link:   https://docs.google.com/spreadsheets/d/1EELLH_ry-hY-tsFNVZ4-PpdUm3zGDLjY/

Run once to populate Airtable:
    python scripts/seed_pipeline.py

Run with --dry-run to preview without writing:
    python scripts/seed_pipeline.py --dry-run

Run with --force to re-import even if records already exist:
    python scripts/seed_pipeline.py --force
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from integrations.airtable_client import airtable

console = Console()

# ---------------------------------------------------------------------------
# STATUS MAP: Routing Matrix status → Airtable pipeline status
# ---------------------------------------------------------------------------
STATUS_MAP = {
    "APPLY":    "Writing Queue",   # Pre-qualified, ready to draft
    "TRACK":    "Prospect",        # Monitor; screen when cycle opens
    "ACTIVE":   "Active",          # Already running / under contract
    "OUTREACH": "Prospect",        # Relationship to build, not a direct grant
    "RESEARCH": "Prospect",        # Needs eligibility research first
    "SETUP":    "Prospect",        # Account/profile setup task
}

# ---------------------------------------------------------------------------
# THE 38 GRANTS
# Format per row:
#   (grant_name, funder, submitting_entity, entity_type, deadline_iso,
#    priority, routing_status, pillar_ids, award_amount_high, strategy_notes)
# ---------------------------------------------------------------------------

ENTITY_ROUTING_MATRIX = [
    # ── NONPROFIT: LDU (501c3) ───────────────────────────────────────────────
    (
        "California Arts in Parks (LOI)",
        "California Arts Council",
        "LDU (501c3)", "Nonprofit",
        "2026-03-13", "HIGH", "APPLY",
        ["P3"],
        0,
        "LDU as lead applicant. Frame campus programming extending to park-based activations. "
        "Partner orgs listed as collaborators.",
    ),
    (
        "Landbell USA / SB 707 Partnership",
        "Landbell USA",
        "LDU (501c3)", "Nonprofit",
        "", "HIGH", "OUTREACH",
        ["CROSS_TEXTILE"],
        0,
        "LDU positions as collection site + workforce development partner. Studio WELEH provides "
        "textile upcycling angle. Gorilla Rx could serve as secondary collection point.",
    ),
    (
        "UAIP (Urban Agriculture Incentive Zones)",
        "CDFA / CA State",
        "LDU (501c3)", "Nonprofit",
        "", "MEDIUM", "TRACK",
        ["P4"],
        0,
        "LDU campus as urban ag site. Supports Studio to Soil narrative.",
    ),
    (
        "NEA Grants for Arts Projects - July 2026",
        "National Endowment for the Arts",
        "LDU (501c3)", "Nonprofit",
        "2026-07-09", "HIGH", "APPLY",
        ["P3"],
        100000,
        "LDU under Visual & Media Arts or Arts Education. Frame: Studio WELEH exhibitions, "
        "textile workshops, Turbo Kogo activations, creative AI masterclasses on Crenshaw campus. "
        "ACTION REQUIRED: Register SAM.gov + Grants.gov immediately.",
    ),
    (
        "LA DCA Cultural Grant FY 2026-27",
        "LA Department of Cultural Affairs",
        "LDU (501c3)", "Nonprofit",
        "", "MEDIUM", "TRACK",
        ["P3"],
        0,
        "LDU as LA City nonprofit. Design-Visual Arts or Culture/History discipline. "
        "Must be free/low-cost public programming.",
    ),
    (
        "Impact100 Greater Sacramento",
        "Impact100 Greater Sacramento",
        "LDU (501c3)", "Nonprofit",
        "", "MEDIUM", "TRACK",
        ["P3", "P4"],
        100000,
        "Requires Sac/Yolo County presence. Apply under Arts & Culture or Environment. "
        "Viable once NorCal farm operations active. Deadline: Jan-Mar 2027.",
    ),
    (
        "Arts in California Parks (full app)",
        "California Arts Council",
        "LDU (501c3)", "Nonprofit",
        "", "HIGH", "APPLY",
        ["P3"],
        0,
        "If LOI advances. LDU leads, partner orgs support. Contingent on Mar 13 LOI approval.",
    ),
    (
        "Crafting the Future Macro Grant",
        "Crafting the Future",
        "LDU (501c3)", "Nonprofit",
        "", "MEDIUM", "TRACK",
        ["P3", "P5"],
        10000,
        "LDU or Studio WELEH for $10K macro grant supporting BIPOC artist programming — "
        "workshops, residencies, paid positions.",
    ),
    (
        "LA County Cannabis Community Outreach",
        "LA County DPH / Cannabis",
        "LDU (501c3)", "Nonprofit",
        "", "HIGH", "ACTIVE",
        ["P5"],
        0,
        "LDU as community org. Gorilla Rx as dispensary partner providing industry expertise. "
        "Existing relationship. Per contract.",
    ),
    (
        "Amber Grant (2nd app — LDU)",
        "WomensNet / Amber Grant",
        "LDU (501c3)", "Nonprofit",
        "", "MEDIUM", "APPLY",
        ["P5"],
        10000,
        "Second submission — LDU as woman-led nonprofit. Different narrative angle than Studio WELEH submission. Monthly rolling deadline.",
    ),
    (
        "Sky's the Limit",
        "Sky's the Limit",
        "LDU (501c3)", "Nonprofit",
        "", "MEDIUM", "APPLY",
        ["P5"],
        0,
        "DUAL: Pitch LDU campus story. Also pitch Studio WELEH mission separately. "
        "Community-voted — leverage social following for boosts. Monthly pitch cycle.",
    ),
    (
        "CDFA BFFTP",
        "California Dept of Food & Agriculture",
        "LDU (501c3)", "Nonprofit",
        "", "MEDIUM", "TRACK",
        ["P4"],
        0,
        "LDU applies as nonprofit to fund Studio to Soil training program. "
        "Workforce pipeline from Crenshaw campus to NorCal farm.",
    ),
    (
        "CDFA Urban Agriculture Grant",
        "California Dept of Food & Agriculture",
        "LDU (501c3)", "Nonprofit",
        "", "MEDIUM", "TRACK",
        ["P4"],
        0,
        "LDU as community-based org. Funds urban food system infrastructure, jobs/internships, technical assistance.",
    ),

    # ── INDIVIDUAL ARTIST: Weleh ─────────────────────────────────────────────
    (
        "LACMA Art + Technology Lab",
        "LACMA",
        "Weleh (Individual)", "Individual Artist",
        "2026-04-22", "HIGH", "APPLY",
        ["P3"],
        0,
        "Weleh as lead artist OR Studio WELEH as collective. Turbo Kogo character universe = "
        "perfect pitch. Can also list LDU as institutional partner for public engagement component.",
    ),
    (
        "Pollock-Krasner Foundation",
        "Pollock-Krasner Foundation",
        "Weleh (Individual)", "Individual Artist",
        "", "HIGH", "APPLY",
        ["P3"],
        50000,
        "Weleh as individual artist ONLY. Dual criteria: artistic merit + financial need. "
        "10 images of current work. Textile/mixed media = sculpture category. Rolling deadline.",
    ),
    (
        "AWAW Environmental Art Grant",
        "Artists Who Are Women",
        "NEEDS QUALIFYING LEAD", "Individual Artist",
        "2026-04-07", "MEDIUM", "RESEARCH",
        ["P3"],
        0,
        "ELIGIBILITY ISSUE: Requires woman/trans/GNC lead artist. Neither Weleh (male) nor Kika "
        "(manager, not artist) qualifies. Strategy: identify qualifying artist collaborator as lead, "
        "LDU as institutional partner, Studio WELEH textile work as project framework.",
    ),
    (
        "Creative Capital Award",
        "Creative Capital",
        "Weleh (Individual)", "Individual Artist",
        "", "HIGH", "TRACK",
        ["P3"],
        10000,
        "Weleh as individual artist. Automatically considered for State of the Art Prize "
        "($10K per state). Multidisciplinary/technology angle for Turbo Kogo. Watch 2026/27 cycle.",
    ),
    (
        "LOEWE Craft Prize 2027",
        "LOEWE Foundation",
        "Weleh (Individual)", "Individual Artist",
        "", "HIGH", "TRACK",
        ["P3"],
        55000,
        "Weleh as individual artist. Textile is core eligible category. Must be original handmade "
        "piece created within last 5 years. EUR 50K winner. "
        "ACTION: Prepare standout piece NOW for ~Jul-Oct 2026 submission window.",
    ),
    (
        "CCF Fellowship for Visual Artists",
        "California Community Foundation",
        "Weleh (Individual)", "Individual Artist",
        "", "MEDIUM", "TRACK",
        ["P3"],
        50000,
        "Weleh as LA County resident artist. Career investment, not project-based. "
        "6 images + 2,000-char artist statement. ~Jan 2027 deadline.",
    ),
    (
        "Spector Craft Prize",
        "Crystal Bridges Museum",
        "Weleh (Individual)", "Individual Artist",
        "", "MEDIUM", "TRACK",
        ["P3"],
        0,
        "Weleh as individual if within 7-year emerging window. Textiles eligible. "
        "Crystal Bridges Museum. ~Mar 2027.",
    ),
    (
        "BADG Creative Futures Grant",
        "BADG",
        "Weleh (Individual)", "Individual Artist",
        "", "MEDIUM", "TRACK",
        ["P3", "P5"],
        0,
        "Weleh as Black artist in design/fine art. Separate craft-focused track for professional "
        "artists in fiber arts, textiles, wearable arts. Fall 2026.",
    ),
    (
        "Crafting the Future Micro Grant",
        "Crafting the Future",
        "Weleh (Individual)", "Individual Artist",
        "", "MEDIUM", "TRACK",
        ["P5"],
        500,
        "Weleh individually for $500 micro grant (unrestricted — studio supplies, materials, travel). TBD 2026.",
    ),
    (
        "Innovate Grant (ArtConnect)",
        "ArtConnect",
        "Weleh (Individual)", "Individual Artist",
        "", "LOW", "APPLY",
        ["P3"],
        1800,
        "Weleh as individual artist. $1,800. Low-effort, builds award portfolio. Recurring quarterly.",
    ),
    (
        "Crocker Art Museum 2027 Auction",
        "Crocker Art Museum",
        "Weleh (Individual)", "Individual Artist",
        "", "LOW", "TRACK",
        ["P3"],
        0,
        "Weleh submits work. Sales + Sacramento institutional visibility. "
        "Also submit portfolio to curatorial@crockerart.org. ~Jan-Feb 2027.",
    ),
    (
        "ArtConnect Profile + Aggregators (Setup)",
        "ArtConnect / CaFE / Submittable",
        "Weleh (Individual)", "Individual Artist",
        "", "HIGH", "SETUP",
        ["P3"],
        0,
        "ACTION: Create profiles on ArtConnect, CaFE (callforentry.org), Submittable, Artwork Archive. "
        "This feeds all rolling open calls. Do immediately.",
    ),

    # ── INDIVIDUAL: Kika (Founder) ────────────────────────────────────────────
    (
        "O'Shaughnessy Fellowship",
        "O'Shaughnessy Foundation",
        "Kika (Individual)", "Individual",
        "2026-04-30", "HIGH", "APPLY",
        ["P5"],
        100000,
        "DUAL SUBMISSION: Kika applies framing LDU transformation story (predatory facility to "
        "creative campus). Weleh applies separately framing Turbo Kogo universe + Studio to Soil vision. "
        "One application covers both Fellowship ($100K) and Grants ($10K).",
    ),
    (
        "O'Shaughnessy Fellowship (Weleh — 2nd app)",
        "O'Shaughnessy Foundation",
        "Weleh (Individual)", "Individual",
        "2026-04-30", "HIGH", "APPLY",
        ["P5", "P3"],
        100000,
        "Second submission — Weleh individually. Character universe, digital fashion, "
        "art-as-technology narrative.",
    ),

    # ── FOR-PROFIT: Studio WELEH ──────────────────────────────────────────────
    (
        "Amber Grant",
        "WomensNet / Amber Grant",
        "Studio WELEH (For-Profit)", "For-Profit",
        "", "MEDIUM", "APPLY",
        ["P5"],
        10000,
        "DUAL: Apply through Studio WELEH (Kika as woman business owner). Separately apply through LDU. "
        "Single application covers all Amber sub-grants. Monthly rolling deadline.",
    ),
    (
        "Atomic Grant",
        "Atomic Grant",
        "Studio WELEH (For-Profit)", "For-Profit",
        "", "MEDIUM", "APPLY",
        ["P5"],
        1500,
        "Kika as woman 21+ business owner. Could also submit through LDU angle. $1,500 + coaching. Quarterly.",
    ),
    (
        "Sky's the Limit (Studio WELEH — 2nd pitch)",
        "Sky's the Limit",
        "Studio WELEH (For-Profit)", "For-Profit",
        "", "MEDIUM", "APPLY",
        ["P5"],
        0,
        "Second pitch — Studio WELEH / From Studio to Soil narrative. Community-voted. Monthly pitch cycle.",
    ),
    (
        "Freed Fellowship",
        "Freed Fellowship",
        "Studio WELEH (For-Profit)", "For-Profit",
        "", "LOW", "RESEARCH",
        ["P5"],
        0,
        "FOR-PROFIT ONLY. Apply through Studio WELEH. Could also apply through Gorilla Rx as separate entity. "
        "$19 application fee. Monthly (last day).",
    ),
    (
        "BGV (Black Girl Ventures)",
        "Black Girl Ventures",
        "Studio WELEH (For-Profit)", "For-Profit",
        "", "MEDIUM", "TRACK",
        ["P5"],
        30000,
        "Kika as Black woman founder. Could also pitch LDU or Gorilla Rx in separate cycles. TBD next cycle.",
    ),

    # ── FOR-PROFIT: Gorilla Rx ────────────────────────────────────────────────
    (
        "Freed Fellowship (Gorilla Rx — 2nd app)",
        "Freed Fellowship",
        "Gorilla Rx (For-Profit)", "For-Profit",
        "", "LOW", "RESEARCH",
        ["P5"],
        0,
        "Second submission — Gorilla Rx as Black woman-owned dispensary. Different business narrative. "
        "Monthly (last day).",
    ),

    # ── FARM ENTITY (TBD) ─────────────────────────────────────────────────────
    (
        "USDA VAPG (Value-Added Producer Grant)",
        "USDA Rural Development",
        "Farm Entity (TBD)", "For-Profit/Coop",
        "2026-04-15", "HIGH", "RESEARCH",
        ["P4"],
        250000,
        "Requires agricultural producer status. Apply through farm entity once established. "
        "Beginning + socially disadvantaged farmer priority.",
    ),
    (
        "USDA FSA Direct Farm Ownership Loan",
        "USDA Farm Service Agency",
        "Farm Entity (TBD)", "Individual/Entity",
        "", "HIGH", "RESEARCH",
        ["P1", "P4"],
        0,
        "Primary land acquisition vehicle. 100% financing for beginning farmers. "
        "ACTION: Contact Yolo County FSA office in Woodland. Kika or farm LLC as borrower. Rolling.",
    ),
    (
        "USDA EQIP Beginning Farmer",
        "USDA NRCS",
        "Farm Entity (TBD)", "Individual/Entity",
        "", "MEDIUM", "TRACK",
        ["P4"],
        0,
        "Apply AFTER land secured. 90% cost-share for beginning + socially disadvantaged farmers. "
        "Infrastructure: irrigation, fencing, soil health. County signup windows.",
    ),
    (
        "American Farmland Trust Brighter Future Fund",
        "American Farmland Trust",
        "Farm Entity (TBD)", "Individual/Entity",
        "", "MEDIUM", "TRACK",
        ["P4"],
        10000,
        "Apply through farm entity. $10K for BIPOC farmers, land access, regenerative practices. TBD 2026.",
    ),

    # ── PARTNERSHIP (Not a grant) ─────────────────────────────────────────────
    (
        "Ujamaa Farmer Collective (Partnership Outreach)",
        "Ujamaa Farmer Collective / People's Land Fund",
        "N/A (Partnership)", "Partnership",
        "", "HIGH", "OUTREACH",
        ["P4"],
        0,
        "NOT A GRANT. Contact Nelson Hawkins. Explore: shared land access, joint state funding advocacy, "
        "training partnerships, BIPOC farming network. Also connect with Center for Land-Based Learning "
        "(Woodland) and People's Land Fund (Oakland). Immediate.",
    ),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def build_airtable_record(row: tuple) -> dict:
    """Convert a seed row tuple into an Airtable Opportunities record dict."""
    (
        grant_name, funder, submitting_entity, entity_type,
        deadline_iso, priority, routing_status,
        pillar_ids, award_high, strategy_notes,
    ) = row

    airtable_status = STATUS_MAP.get(routing_status, "Prospect")

    notes_lines = [
        f"Funder: {funder}",
        f"Entity: {submitting_entity} ({entity_type})",
        f"Priority: {priority}",
        f"Routing Status: {routing_status}",
        f"Source: Entity Routing Matrix (Manual)",
        "",
        f"Strategy:\n{strategy_notes}",
    ]

    record = {
        "Grant Name": grant_name,
        # Funder is a linked record field — name goes into Notes; link manually in Airtable
        "Status": airtable_status,
        "Source": "Manual-EntityMatrix",
        "Notes": "\n".join(notes_lines),
        "Pillar": pillar_ids[:1] if pillar_ids else [],
        "Award Amount Range": award_high,
        "Submitting Entity": submitting_entity,
        "Priority": priority,
    }

    if deadline_iso:
        record["Deadline"] = deadline_iso

    # Remove blank/zero values Airtable rejects
    if not record["Award Amount Range"]:
        del record["Award Amount Range"]

    return record


def get_existing_grant_names() -> set:
    """Fetch all existing Grant Name values from Airtable to skip duplicates."""
    try:
        records = airtable.opportunities.all(fields=["Grant Name"])
        return {r["fields"].get("Grant Name", "").strip().lower() for r in records}
    except Exception as e:
        console.print(f"[yellow]Warning: could not load existing records for dedup: {e}[/yellow]")
        return set()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Seed Airtable with Entity Routing Matrix grants")
    parser.add_argument("--dry-run", action="store_true", help="Preview records without writing to Airtable")
    parser.add_argument("--force", action="store_true", help="Re-import even if grant name already exists")
    args = parser.parse_args()

    console.print(Panel(
        f"LDU Grant Pipeline — Seed Import\n"
        f"Source: Entity Routing Matrix  |  Records: {len(ENTITY_ROUTING_MATRIX)}\n"
        f"Mode: {'DRY RUN (no writes)' if args.dry_run else 'LIVE'}",
        style="bold blue",
    ))

    existing = set() if args.force else get_existing_grant_names()
    if existing:
        console.print(f"Found {len(existing)} existing records — duplicates will be skipped.\n")

    preview_table = Table(title="Grants to Import")
    preview_table.add_column("#", style="dim", width=3)
    preview_table.add_column("Grant Name", style="cyan", max_width=40)
    preview_table.add_column("Entity", style="magenta", max_width=22)
    preview_table.add_column("Priority", width=8)
    preview_table.add_column("Deadline", width=12)
    preview_table.add_column("→ Status", style="bold green", width=16)
    preview_table.add_column("Skipped?", width=10)

    added = 0
    skipped = 0
    errors = 0

    for i, row in enumerate(ENTITY_ROUTING_MATRIX, start=1):
        grant_name = row[0]
        entity = row[2]
        deadline = row[4]
        priority = row[5]
        routing_status = row[6]
        airtable_status = STATUS_MAP.get(routing_status, "Prospect")

        already_exists = grant_name.strip().lower() in existing
        skip_reason = "exists" if already_exists else ""

        priority_color = {
            "HIGH": "bold red",
            "MEDIUM": "yellow",
            "LOW": "dim",
            "N/A": "dim",
        }.get(priority, "white")

        preview_table.add_row(
            str(i),
            grant_name[:40],
            entity[:22],
            f"[{priority_color}]{priority}[/{priority_color}]",
            deadline or "TBD/Rolling",
            airtable_status,
            f"[yellow]{skip_reason}[/yellow]" if skip_reason else "[green]NEW[/green]",
        )

        if already_exists:
            skipped += 1
            continue

        if args.dry_run:
            added += 1
            continue

        # Write to Airtable (typecast=True lets Airtable auto-create new select options)
        try:
            record = build_airtable_record(row)
            airtable.opportunities.create(record, typecast=True)
            added += 1
        except Exception as e:
            console.print(f"  [red]ERROR on row {i} '{grant_name}': {e}[/red]")
            errors += 1

    console.print(preview_table)
    console.print()

    if args.dry_run:
        console.print(Panel(
            f"DRY RUN COMPLETE — nothing written.\n"
            f"Would add: {added} records  |  Would skip: {skipped} duplicates\n\n"
            f"Remove --dry-run to execute the import.",
            style="bold yellow",
        ))
    else:
        console.print(Panel(
            f"Seed Import Complete\n"
            f"Added: {added}  |  Skipped (duplicates): {skipped}  |  Errors: {errors}\n\n"
            f"Next step: run [bold]python scripts/run_pipeline.py --mode daily[/bold] "
            f"to screen and score the new prospects.",
            style="bold green" if errors == 0 else "bold yellow",
        ))


if __name__ == "__main__":
    main()
