---
name: ldu-scoring
description: LDU grant scoring matrix, weighted criteria, qualification thresholds, and auto-disqualification rules. Use when scoring prospects, reviewing eligibility, configuring the ScoringAgent, or deciding whether a grant should enter the writing queue.
---

# LDU Grant Scoring

## The 5-criteria scoring matrix

| Criterion | Weight | 5 (best) | 3 (middle) | 1 (worst) |
|-----------|--------|----------|-----------|-----------|
| **Mission Fit** | 30% | Directly addresses LDU pillar | Tangential fit | No alignment |
| **Win Probability** | 25% | Existing relationship / invited | Warm intro possible | Cold / competitive |
| **Award Size** | 20% | ≥ $100K | $25K–$100K | < $25K |
| **Timeline Fit** | 15% | 6+ weeks to deadline | 3–6 weeks | < 2 weeks |
| **Strategic Value** | 10% | Opens new funder pipeline | Repeat opportunity | One-time only |

**Weighted score formula**: `(mission*0.30) + (win_prob*0.25) + (award*0.20) + (timeline*0.15) + (strategic*0.10)`

## Thresholds

| Rule | Score | Action |
|------|-------|--------|
| Standard threshold | ≥ 3.5 | → enters writing queue |
| Pillar 5 (Founder & Enterprise) | ≥ 3.0 | → enters writing queue (lower bar, fast turnaround) |
| Below threshold | < 3.5 (or < 3.0 for P5) | → park, do not write |
| Hard disqualify | N/A | → immediately out (see below) |

## Auto-disqualify rules (no scoring needed)

Disqualify immediately if ANY of:
- Requires certification LDU doesn't hold: FQHC, accredited university, licensed clinical facility
- Geographic restriction outside: LA County, California statewide, national, or Yolo County
- Award amount under $5,000 (except Pillar 5 with specific strategic value noted)
- Requires matching funds LDU cannot provide
- Deadline < 14 days AND application is complex (>5 pages or requires audited financials)

## Auto-qualify (fast-track if ALL met)

- LDU or eligible entity is explicitly named in funder guidelines as eligible type
- Geographic match confirmed
- Award ≥ $25K
- Mission fit ≥ 4 (clear pillar alignment)
- Deadline ≥ 21 days out

## Scoring config location
```
config/scoring.py      → weights, thresholds, calculate_weighted_score()
config/pillars.py      → ALL_PILLARS, get_pillar_by_id(), get_all_keywords()
agents/research/scorer.py        → ScoringAgent
agents/research/eligibility.py   → EligibilityAgent
```

## Pipeline automation
```bash
# Screen + score all Prospects (runs daily at 8 AM via GitHub Actions)
python scripts/run_pipeline.py --mode daily

# Manual test
python scripts/run_pipeline.py --mode test
```

## Entity routing by funder type
| Funder focus | Entity |
|-------------|--------|
| Arts, education, youth, workforce | LDU / Life Development Group |
| Cannabis social equity | Gorilla Rx Wellness Co. |
| Women / Black women founders | Kika Keith (individual) or Life Development Group |
| Circular economy, textile, CalRecycle | Studio WELEH + LDU (co-applicant) |
| Agriculture, rural, food systems | Farm Entity |
