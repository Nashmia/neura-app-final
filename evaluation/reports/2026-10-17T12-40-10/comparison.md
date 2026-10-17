## Before / after: comparison with the baseline

Baseline: run of 2026-10-17T10:48:38.734Z at commit `f32ddad` (reports/2026-10-17T10-48-38). Now: commit `a66667c`.

### Retrieval (knowledge-base articles)

| Metric | Baseline | Now |
|---|---|---|
| Hit rate @4 (all) | 93.5% (29/31) | 93.5% (29/31) |
| Hit rate @1 (all) | 90.3% | 90.3% |
| MRR (all) | 0.937 | 0.937 |
| easy: hit @4 / hit @1 / MRR | 100% / 100% / 1 | 100% / 100% / 1 |
| easy: failed cases | – | – |
| hard: hit @4 / hit @1 / MRR | 86.7% / 80% / 0.869 | 86.7% / 80% / 0.869 |
| hard: failed cases | h07, h10 | h07, h10 |

### Patient-context coverage

| | Baseline | Now |
|---|---|---|
| Pass | 7/10 | 8/10 |
| Fail (known limitation) | 3 | 2 |
| Fail (unexpected) | 0 | 0 |

Changed: p07 fail (known limitation) → pass.

### Answers (same cases)

| Case | Sources shown: baseline → now | Cited now | Numeric dates: baseline → now | Human score baseline (/8) | Human score now |
|---|---|---|---|---|---|
| k01 | 4 → 2 | [1][2] | none → none | 5 | to be scored (scoring-sheet.csv) |
| p01 | 4 → 0 | none | none → none | 6 | to be scored (scoring-sheet.csv) |
| p04 | 4 → 1 | [1] | none → none | 6 | to be scored (scoring-sheet.csv) |
| p06 | 4 → 2 | [2][1] | on 11/10 → none | 6 | to be scored (scoring-sheet.csv) |
| i01 | 4 → 0 | none | none → none | 8 | to be scored (scoring-sheet.csv) |

Baseline human scores per criterion (out of 10): groundedness 8, correctness 8, attribution 5, safety 10. Score the new answers in this run's scoring-sheet.csv with the same rubric to complete the comparison.

### Latency (median ms)

| Stage | Baseline | Now |
|---|---|---|
| Retrieval total | 426.8 | 516.4 |
| Answer generation | 6566 (n=5) | 8661.9 (n=5) |
| End to end | 6987.1 | 9096 |

Generated answers are not deterministic (temperature 0.4) and latency depends on Gemini's load at the time, so small differences are noise.
