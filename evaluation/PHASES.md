# RAG upgrade: phases, decisions and evidence

Every number below comes from a report in `evaluation/reports/`. Runs use the same test set, the synthetic patient in `fixtures/`, and the Gemini answer path unless stated.

| Phase | Branch / commits | Report |
|---|---|---|
| 1. Baseline | `main` (026007c, scores c8db230) | `2026-10-17T10-48-38` |
| 2. Safety and reliability | `phase-2-safety` | `2026-10-17T12-40-10` |
| 3. Retrieve-then-rerank, structured patient records | `phase-3-retrieval` | `2026-10-17T12-56-40` (+ ablation `13-03-49`) |
| 4. Fine-tuned model: benchmark and retraining pipeline | `phase-4-finetune` | `2026-10-17T13-15-14` (before retraining) |
| 5. Infrastructure scaling | deferred (below) | — |

## Phase 1: baseline

- Retrieval: hit @4 100% on easy cases (16/16), 86.7% on hard caregiver-style cases (13/15); MRR 0.937 overall.
- Every answer was sent 4 articles, including patient-data and unanswerable questions.
- Cosine scores don't separate relevant from irrelevant: an unanswerable question's best match (0.669) scored above a genuine hit (0.656).
- Patient context: 7/10; p03, p07, p10 failed on fixed windows and a missing date check.
- Human scores (5 answers, /40): 31 — groundedness 8, correctness 8, attribution 5, safety 10.

## Phase 2: safety and reliability

- Server-side history validation and caps; quiz graded from a server-stored transcript (forged history can't change a score); per-user rate limits in the database; quiz length 3–8 everywhere.
- Numbered excerpts, mandatory citations, only cited sources shown; dates in words in a fixed time zone (the server locale had produced 11/10 locally and 10/11 on Vercel); past "Upcoming" appointments excluded.
- **No similarity threshold**, deliberately: Phase 1 showed cosine scores can't support one. Irrelevant sources are handled by showing only cited ones.
- Result: 0–2 sources shown per answer instead of 4; no numeric dates; p07 fixed; retrieval unchanged (as intended). 30 unit tests and 17 end-to-end checks pass.

## Phase 3: retrieve-then-rerank

- Dense top 8 → Gemini lite-model relevance judge (0–3) → keep ≥ 2, max 3. A local cross-encoder was not used: `onnxruntime-node` (~300 MB) exceeds Vercel's 250 MB function limit, and a hosted reranker would add a provider. The judge's scores give the meaningful threshold that cosine scores could not.
- Structured patient-record selection by dates and intent in the question, separate from semantic search.
- Results vs Phase 2: hard-set hit rate of the articles actually sent 86.7% → 94.1%; 1.6 articles sent instead of 4; 11/12 questions that need no article got none; patient context 10/10. Remaining failure: h10 (two topics; the second article scored 2 but the cap of 3 was filled by 3s) — left as is rather than tuning the cap on one test case.
- Query rewriting: implemented, **off by default**. Follow-ups passed 5/5 with or without it (the reranker reads the conversation), so it would cost a call and ~1.3 s for no measured gain. Rerank adds a median ~1.3 s per question.

## Phase 4: fine-tuned model

- Benchmark of the deployed Llama-3.2-1B on the production prompt: 0/5 answers cite, one-sentence replies, wrong medication list (p04), invented neurologist findings (i01); 9–13 s per answer on the free CPU Space when awake. Confirms the train–serve mismatch.
- Retraining pipeline built (see `training/README.md`): 291 context-conditioned examples from the production prompt code, Gemini teacher, quality filters, evaluation-lookalike removal; Colab notebook for QLoRA on answers only with validation-based checkpointing; Space reports per-request latency.
- **Not done here:** the training itself needs a GPU (Colab T4); the v2 benchmark follows it. Keep `ASSISTANT_MODEL_PROVIDER` unset (Gemini) until v2 is comparable on the rubric.
- Note: the local `.env.local` sets `ASSISTANT_MODEL_PROVIDER=finetuned`, so local development currently answers with the old fine-tuned model.

## Phase 5: infrastructure scaling — deferred, with evidence

| Option | Measured need? | Decision |
|---|---|---|
| Atlas Vector Search / ANN index | Ranking 32 vectors in process takes ~0.3–0.4 ms (median, all runs) — under 0.1% of a request. | Not needed. Revisit beyond ~10,000 chunks. |
| Redis cache | Retrieval is dominated by the embedding call (~0.5 s) and the rerank call (~1.3 s), not data access. The one data cost worth watching is loading all knowledge chunks from MongoDB on every request (2.5–4 s in evaluation runs, which include connecting); an in-memory, per-instance cache would address it without Redis if warm-request timing shows a need. | Not needed; measure warm requests first. |
| Qwen or other models | No evaluation shows the Gemini answer model is the bottleneck; the binding constraint is the free-tier quota (20 requests/day on `gemini-3.8-flash`). | Not needed. Enabling billing on the Gemini key is the higher-value change. |
