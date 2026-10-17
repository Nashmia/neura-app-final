# Care Assistant RAG evaluation

Measures how well the **existing** Care Assistant pipeline retrieves knowledge-base articles, whether the patient data it puts in the prompt contains what each question needs, how long each stage takes, and (optionally) how good the generated answers are. Nothing here changes how the app works.

## Run it

```
npm run eval:rag                       # retrieval + patient-context checks for all 43 cases (embeddings only, 0 generation calls)
npm run eval:rag -- --answers          # also generate answers for the 5-case subset (Gemini path, 20 s between calls)
npm run eval:rag -- --answers --judge  # also add the ADVISORY LLM judge (one extra generation call per answer)
```

| Flag | Default | Meaning |
|---|---|---|
| `--answers` | off | Generate answers for the answer subset (k01, p01, p04, p06, i01) |
| `--limit=N` | 5 | Max answers to generate (above 5 prints a quota warning) |
| `--ids=a,b` | all | Run only these case ids (answers are generated for all of them, up to `--limit`) |
| `--delay=S` | 20 | Seconds between generation calls |
| `--embed-delay=MS` | 700 | Milliseconds between embedding calls |
| `--judge` | off | Advisory LLM scores (needs `--answers`) |
| `--kb=mongo\|local` | mongo | Knowledge chunks from MongoDB `knowledgeChunks` (read-only) or `data/db.json` |
| `--baseline=DIR` | `reports/2026-10-17T10-48-38` (Phase 1) | Report folder to compare against; writes `comparison.md`. `none` skips it |
| `--label=TEXT` | generic | Description shown at the top of the report |

Each run writes `evaluation/reports/<timestamp>/`:
- `report.json`: everything (settings, git commit, every case, every API request's model/method/status/time)
- `report.md`: readable summary and per-case details
- `scoring-sheet.csv`: fill in 0/1/2 scores per answer using [RUBRIC.md](RUBRIC.md)
- `comparison.md`: before/after against the baseline (retrieval, patient context, answers incl. the baseline's human scores, latency)

**Baseline:** `reports/2026-10-17T10-48-38` is the fixed Phase 1 baseline (commit 026007c, human scores c8db230). Never edit it.

Unit tests for the Phase 2 safety fixes (no API calls, temporary data file): `npm test`.

## Gemini quota

The free tier allows very few **generation** requests per day and the live app shares them. Embedding requests have their own quota.

| Run | Embedding requests | Generation requests |
|---|---|---|
| default | one per case (43) | 0 |
| `--answers` | +0 (reuses the run's embeddings) | 5 normally; up to 8 per answer in the worst case (lib/gemini.ts retries 503s 4 times, then the fallback model 4 times on a 429) |
| `--judge` | +0 | +1 per answer (same worst case) |

The report counts every real HTTP request, including hidden retries, so you always know exactly what a run cost.

## What is measured

- **Retrieval** (cases with an expected article): is it in the top 4 (hit @4), its rank in the full ranking, similarity scores; aggregate hit rate @4 and @1 and mean reciprocal rank. Insufficient-information questions record their best similarity score for reference (there's no threshold today).
- **Easy vs hard**: the 28 original cases are *easy* (written knowing the article titles). The 15 *hard* cases (h01–h15) are written like a stressed caregiver types: vague, no article keywords, misspellings, two topics in one message, emotional context. They were drafted before looking at the titles and labelled afterwards. Retrieval is reported for all, easy and hard separately. h10 (two topics) passes only if both articles are in the top 4.
- **Patient-context coverage**: builds the exact patient-data text the route would send for the synthetic patient and checks the expected facts are present (and forbidden ones absent). No API calls. Some cases are *designed* to fail because of known limits (only the 5 newest journal entries and the 3 newest quiz sessions; the missing date check on "Upcoming" appointments was fixed in Phase 2); these are labelled "fail (known limitation)".
- **Latency**: embedding call, in-process similarity ranking, retrieval total, generation, end to end.
- **Answers** (optional): scored by you with the rubric. The LLM judge is advisory and never replaces your scores.

## How it stays faithful to production

- Since Phase 2 the route's retrieval, patient-context, prompt and citation code lives in `lib/assistant-context.ts`, and the evaluation imports that same module (plus `embedText` and `runAssistantTurn`), so there is no copy to drift. Phase 1 used a replica with line citations and a snapshot; see the Phase 1 commits.
- `drift-check.ts` verifies on every run that the route still builds retrieval, prompt and sources through `lib/assistant-context.ts`; if not, the report shows a ⚠️ DRIFT warning.
- The Gemini path is always used: `ASSISTANT_MODEL_PROVIDER` is ignored on purpose.
- "Today" is pinned to 2026-10-17 (the fixture's dates are fixed), and dates use `APP_TIME_ZONE` (default Asia/Karachi), so prompts are reproducible.

## Data safety

- Patient data comes only from `fixtures/synthetic-patient.json` (a made-up patient).
- The only database access is a read-only `find()` on the `knowledgeChunks` collection (`kb-source.ts` refuses any other collection). Nothing is ever written.
- API keys, connection strings and tokens are never printed or saved: requests are logged by model and method only, and all output passes through `redact()`.

## Files

| File | Purpose |
|---|---|
| `run.ts` | Runner (flags above) |
| `test-cases.ts` | The 43 test cases (28 easy, 15 hard) with expected articles, facts and behaviour |
| `fixtures/synthetic-patient.json` | Synthetic patient, medications, quiz sessions, journal, appointments |
| `drift-check.ts` | Checks the route still uses the shared lib/assistant-context.ts |
| `compare.ts` | Before/after comparison with a baseline report |
| `kb-source.ts` | Read-only knowledge-chunk loader |
| `call-counter.ts` | Counts Gemini HTTP requests; redacts secrets |
| `judge.ts` | Optional advisory LLM judge |
| `report.ts` | Writes report.json / report.md / scoring-sheet.csv |
| `RUBRIC.md` | 0/1/2 scoring definitions |
