---
name: ldu-airtable
description: LDU Airtable schema, field names, filter formulas, and API patterns for the grant operations pipeline. Use when reading, writing, or querying the Airtable CRM, building filters, or working with any of the 6 tables.
---

# LDU Airtable Schema

## Connection
```python
from integrations.airtable_client import airtable
# Base ID: appboQmjEMDl5uZaM  (from AIRTABLE_BASE_ID env var)
# Token:   AIRTABLE_API_TOKEN env var
```

## Tables

### Opportunities (primary table)
All field names are exact — case-sensitive:

| Field | Type | Notes |
|-------|------|-------|
| `Grant Name` | text | required |
| `Status` | single select | see statuses below |
| `Pillar` | multi-select | see pillars below |
| `Award Amount Range` | number | in dollars |
| `Deadline` | date | ISO format |
| `Submitting Entity` | single select | LDU, Gorilla Rx, Studio WELEH, Farm Entity, Kika Keith, Life Development Group |
| `Priority` | single select | High, Medium, Low |
| `Source` | text | URL or source name |
| `Notes` | long text | comms log + status history |
| `Score` | number | 1.0–5.0 weighted |
| `Mission Fit` | number | 1–5 |
| `Win Probability` | number | 1–5 |
| `Timeline Fit` | number | 1–5 |
| `Award Size` | number | 1–5 |
| `Strategic Value` | number | 1–5 |
| `Description` | long text | grant description |
| `Funder Name` | text | funder organization |
| `Funder Website` | url | |
| `Eligibility Notes` | long text | |
| `Why We Qualify` | long text | |
| `Materials Needed` | long text | |
| `Next Steps` | long text | auto-populated by WritingPlanAgent |
| `Writing Plan` | long text | JSON string — parse before use |

### Valid Status values
`Prospect` → `Qualifying` → `Writing` → `In Review` → `Submitted` → `Awarded`
Also: `Active`, `Declined`, `Rejected`

### Valid Pillar values
- `Capital Campaign`
- `Programming & Operations`
- `Studio WELEH`
- `Agricultural Extension`
- `Founder & Enterprise`
- `Textile Sustainability`

## Common operations

```python
# Get all prospects
records = airtable.opportunities.all(formula="{Status}='Prospect'")

# Update a record
airtable.opportunities.update(record_id, {"Status": "Writing"}, typecast=True)
# IMPORTANT: always pass typecast=True when creating new select options

# Create a record
airtable.opportunities.create({
    "Grant Name": "...",
    "Status": "Prospect",
    "Pillar": ["Programming & Operations"],
}, typecast=True)

# Filter by pillar
formula = 'FIND("Capital Campaign", ARRAYJOIN({Pillar}, ",")) > 0'
```

## airtable_client helpers
```python
airtable.get_opportunities_by_status("Writing")  # returns list of records
airtable.get_writing_queue()                       # Writing + In Review
airtable.get_upcoming_deadlines(days=30)           # records with deadline in N days
airtable.get_pipeline_summary()                    # dict of status → count
airtable.update_opportunity(record_id, fields)     # wrapper with error handling
```

## Frontend API routes
```
GET  /api/opportunities              # all, with ?status=, ?pillar=, ?priority= filters
GET  /api/opportunities/[id]         # single record
PATCH /api/opportunities/[id]        # update fields
GET  /api/opportunities/[id]/writing-plan   # get existing plan
POST /api/opportunities/[id]/writing-plan   # generate new plan via Claude
GET  /api/stats                      # pipeline stats for dashboard
GET  /api/funders                    # all funders
```
