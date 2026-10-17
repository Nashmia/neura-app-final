## Before / after: comparison with the baseline

Baseline: run of 2026-10-17T12:40:10.044Z at commit `a66667c` (reports/2026-10-17T12-40-10). Now: commit `0a55ebb`.

### Retrieval (knowledge-base articles)

| Metric | Baseline | Now |
|---|---|---|
| Hit rate @4 (all) | 93.5% (29/31) | 93.9% (31/33) |
| Hit rate @1 (all) | 90.3% | 90.9% |
| MRR (all) | 0.937 | 0.94 |
| easy: hit @4 / hit @1 / MRR | 100% / 100% / 1 | 100% / 100% / 1 |
| easy: failed cases | – | – |
| hard: hit @4 / hit @1 / MRR | 86.7% / 80% / 0.869 | 88.2% / 82.4% / 0.884 |
| hard: failed cases | h07, h10 | h07, h10 |

### Articles actually sent to the model

| | Baseline | Now |
|---|---|---|
| all: expected article sent | 93.5% (29/31), dense top 4 | 97% (32/33) |
| easy: expected article sent | 100% (16/16), dense top 4 | 100% (16/16) |
| hard: expected article sent | 86.7% (13/15), dense top 4 | 94.1% (16/17) |
| Precision of sent articles (cases with an expected article) | ≤ 0.25–0.5 (4 sent, usually 1–2 relevant) | 0.641 |
| Articles sent per question | 4 | 1.6 |
| Articles sent when no article is needed (patient-data / insufficient-info questions) | 4 (0 got none) | 0.083 (11/12 got none) |

### Patient-context coverage

| | Baseline | Now |
|---|---|---|
| Pass | 8/10 | 10/10 |
| Fail (known limitation) | 2 | 0 |
| Fail (unexpected) | 0 | 0 |

Changed: p03 fail (known limitation) → pass; p10 fail (known limitation) → pass.

### Answers (same cases)

| Case | Sources shown: baseline → now | Cited now | Numeric dates: baseline → now | Human score baseline (/8) | Human score now |
|---|---|---|---|---|---|
| k01 | 2 → 1 | [1] | none → none | n/a | to be scored (scoring-sheet.csv) |
| p01 | 0 → 0 | none | none → none | n/a | to be scored (scoring-sheet.csv) |
| p04 | 1 → 0 | none | none → none | n/a | to be scored (scoring-sheet.csv) |
| p06 | 2 → 2 | [2][1] | none → none | n/a | to be scored (scoring-sheet.csv) |
| i01 | 0 → 0 | none | none → none | n/a | to be scored (scoring-sheet.csv) |

Baseline human scores per criterion (out of 10): groundedness 0, correctness 0, attribution 0, safety 0. Score the new answers in this run's scoring-sheet.csv with the same rubric to complete the comparison.

### Latency (median ms)

| Stage | Baseline | Now |
|---|---|---|
| Retrieval total | 516.4 | 2244.6 |
| Answer generation | 8661.9 (n=5) | 6718.4 (n=5) |
| End to end | 9096 | 9025.9 |

Generated answers are not deterministic (temperature 0.4) and latency depends on Gemini's load at the time, so small differences are noise.
