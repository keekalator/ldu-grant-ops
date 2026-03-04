# LDU Grant Operations — Agent System

## What This Is

This is the automated grant operations engine for Life Development University. It uses AI agents to find, qualify, score, write, and manage grant applications across six funding pillars — so you review and approve, never write from scratch.

**Your role:** Implementation Lead. You build the systems, run the agents, manage the pipeline, and deliver grant-ready packages to Kika Keith for approval.

**The agents' role:** Everything else.

---

## System Architecture (How It All Connects)

```
┌─────────────────────────────────────────────────────────────┐
│                    GRANT OPERATIONS ENGINE                    │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  RESEARCH     │───▶│  WRITING      │───▶│  FOLLOW-UP    │   │
│  │  AGENT        │    │  AGENT        │    │  AGENT        │   │
│  │              │    │              │    │              │   │
│  │ • Prospect ID │    │ • Narrative   │    │ • Tracking    │   │
│  │ • Eligibility │    │ • Budget      │    │ • Reporting   │   │
│  │ • Funder Intel│    │ • Compliance  │    │ • Relationship│   │
│  │ • Scoring     │    │ • QA/Edit     │    │              │   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
│         │                   │                   │           │
│  ┌──────▼───────────────────▼───────────────────▼───────┐   │
│  │                    SHARED SERVICES                     │   │
│  │                                                       │   │
│  │  Airtable (Pipeline CRM)  ◄──►  Make.com (Automation) │   │
│  │  Google Drive (File Store) ◄──►  Poke (Communications)│   │
│  │  Instrumentl (Discovery)  ◄──►  Claude AI (Drafting)  │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  FUNDING PILLARS:                                            │
│  P1: Capital Campaign  P2: Programming & Ops                 │
│  P3: Studio WELEH      P4: Ag Extension & Manufacturing      │
│  P5: Founder & Enterprise   Cross: Textile/SB 707            │
└─────────────────────────────────────────────────────────────┘
```

---

## Setup Instructions (Do These In Order)

### Prerequisites — Install These First

1. **Python 3.11+**: Download from https://www.python.org/downloads/
2. **Cursor**: Download from https://cursor.sh (this is where you'll run everything)
3. **Git**: Download from https://git-scm.com/downloads

### Step 1: Open This Project in Cursor

1. Open Cursor
2. File → Open Folder → Select this `ldu-grant-ops` folder
3. Cursor will detect the Python project automatically

### Step 2: Create Your Environment

Open Cursor's terminal (Ctrl+` or Cmd+`) and run:

```bash
# Create a virtual environment
python -m venv venv

# Activate it (Mac/Linux)
source venv/bin/activate

# Activate it (Windows)
venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt
```

### Step 3: Configure Your API Keys

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in Cursor and fill in your keys (instructions inside the file)

### Step 4: Initialize the Database

```bash
python scripts/setup_airtable.py
```

This creates all 6 tables in Airtable matching the Grant Ops Plan specifications.

### Step 5: Run Your First Agent

```bash
# Test that everything works
python -m agents.research.prospect_scanner --test

# Run the full research scan
python -m agents.research.prospect_scanner --scan
```

---

## Project Structure

```
ldu-grant-ops/
│
├── README.md                    ← You are here
├── SETUP_GUIDE.md              ← Detailed setup walkthrough with screenshots
├── requirements.txt             ← Python packages to install
├── .env.example                 ← Template for your API keys
├── .cursorrules                 ← Tells Cursor AI how to help you with this project
│
├── config/
│   ├── __init__.py
│   ├── settings.py              ← Central configuration (reads from .env)
│   ├── pillars.py               ← All 6 funding pillars with keywords & criteria
│   └── scoring.py               ← Weighted scoring matrix (Mission Fit, Award Size, etc.)
│
├── agents/
│   ├── __init__.py
│   ├── base_agent.py            ← Shared agent foundation (logging, error handling)
│   │
│   ├── research/
│   │   ├── __init__.py
│   │   ├── prospect_scanner.py  ← Scans Instrumentl + manual sources daily
│   │   ├── eligibility.py       ← Auto-screens against pre-qualification criteria
│   │   ├── scorer.py            ← Weighted scoring matrix (3.5+ → writing queue)
│   │   └── funder_intel.py      ← Builds funder dossiers for top prospects
│   │
│   ├── writing/
│   │   ├── __init__.py
│   │   ├── narrative.py         ← Claude AI drafts narratives from boilerplate + brief
│   │   ├── budget.py            ← Generates budgets from templates per pillar
│   │   ├── compliance.py        ← Compiles attachments, checks requirements
│   │   └── qa_editor.py         ← Final QA — word counts, formatting, proofread
│   │
│   └── followup/
│       ├── __init__.py
│       ├── tracker.py           ← Post-submission monitoring & status updates
│       ├── reporter.py          ← Grant reporting & compliance calendar
│       └── relationship.py      ← Funder stewardship, thank-yous, reapply strategy
│
├── integrations/
│   ├── __init__.py
│   ├── airtable_client.py       ← All Airtable read/write operations
│   ├── claude_client.py         ← Claude API for drafting & analysis
│   ├── google_drive.py          ← File storage & retrieval
│   ├── instrumentl.py           ← Instrumentl alert ingestion
│   └── make_webhooks.py         ← Triggers for Make.com automation scenarios
│
├── data/
│   ├── boilerplate/
│   │   ├── organizational.md    ← Mission statements, history, leadership bios
│   │   ├── needs_statements.md  ← South LA demographics, workforce gaps, etc.
│   │   ├── programs/
│   │   │   ├── ai_technology.md
│   │   │   ├── camera_operating.md
│   │   │   ├── vocational_skills.md
│   │   │   ├── music_programs.md
│   │   │   ├── venue_operations.md
│   │   │   ├── studio_weleh.md
│   │   │   └── ag_extension.md
│   │   ├── outcomes.md          ← Logic models, evaluation frameworks
│   │   ├── sustainability.md    ← Diversified funding, earned revenue, SB 707
│   │   ├── capital_campaign.md  ← Dual-site vision narrative
│   │   ├── founder.md           ← Women/Black women entrepreneur narratives
│   │   └── textile_sb707.md     ← CalRecycle language, diversion metrics
│   │
│   ├── templates/
│   │   ├── budget_capital.xlsx
│   │   ├── budget_programming.xlsx
│   │   ├── budget_studio_weleh.xlsx
│   │   ├── budget_ag_extension.xlsx
│   │   ├── loi_template.md
│   │   └── cover_letter_template.md
│   │
│   └── funder_dossiers/         ← Generated funder profiles live here
│
├── scripts/
│   ├── setup_airtable.py        ← Creates all Airtable tables & views
│   ├── setup_drive_folders.py   ← Creates Google Drive folder structure
│   ├── import_boilerplate.py    ← Loads boilerplate into Airtable
│   ├── daily_scan.py            ← Cron job: runs prospect scanner daily
│   ├── weekly_summary.py        ← Generates Friday 4PM CEO summary
│   └── run_pipeline.py          ← Master orchestrator: runs full pipeline cycle
│
├── tests/
│   ├── test_eligibility.py
│   ├── test_scoring.py
│   └── test_narrative.py
│
└── logs/                        ← Agent activity logs
    └── .gitkeep
```

---

## How the Agents Work Together

### Daily Cycle (Automated)
1. **Prospect Scanner** runs at 7:00 AM — pulls Instrumentl alerts, checks manual sources
2. **Eligibility Agent** auto-screens new prospects against pre-qualification criteria
3. **Scorer** applies weighted matrix — 3.5+ enters writing queue
4. **Your Poke briefing** arrives at 7:30 AM with pipeline status

### Weekly Cycle
- **Monday:** Pipeline review dashboard auto-generated
- **Tuesday–Thursday:** Writing agents produce narratives on the 28-day cycle
- **Friday 4:00 PM:** CEO summary auto-sent to Kika Keith via Poke

### 28-Day Production Cycle (Per Grant)
- D-28: Writing Brief created from Funder Dossier
- D-25: Claude AI generates outline + messaging strategy
- D-18: Full narrative + budget draft
- D-14: You review (substantive issues only)
- D-10: AI revision
- D-7: Attachments compiled
- D-5: Final QA
- D-3: Package sent to Kika Keith for approval
- D-2: Submit

---

## Funding Pillars Quick Reference

| Pillar | Target Annual | Apps/Year |
|--------|--------------|-----------|
| P1: Capital Campaign | $3.5M–$9M | 8–12 |
| P2: Programming & Ops | $750K–$2M | 20–30 |
| P3: Studio WELEH | $400K–$1.2M | 8–12 |
| P4: Ag Extension & Mfg | $2M–$5M | 6–10 |
| P5: Founder & Enterprise | $50K–$200K | 15–25 |
| Cross: Textile/SB 707 | $500K–$2M | 5–8 |
| **TOTAL** | **$6M–$10M requested** | **50–65** |

---

## Need Help?

In Cursor, you can ask the AI assistant anything about this project. The `.cursorrules` file teaches it everything about LDU's grant operations, so it can help you modify agents, debug issues, and extend the system.
