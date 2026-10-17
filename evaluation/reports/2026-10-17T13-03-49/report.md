# Care Assistant RAG evaluation — 2026-10-17 13:03 UTC

> Phase 3 ablation: follow-ups without query rewriting. Patient data is synthetic (evaluation/fixtures). Knowledge chunks: MongoDB collection "knowledgeChunks" (read-only). Generated answers are **not deterministic** (temperature 0.4); re-runs can differ.

## Run details

| | |
|---|---|
| Started / finished | 2026-10-17T13:03:49.673Z / 2026-10-17T13:04:20.320Z |
| Git commit | `0a55ebb7556731164d7f384e478609fdaf83c07f` ⚠️ app/lib/scripts have uncommitted changes |
| Node / locale / time zone | v22.14.0 / en-PK / Asia/Karachi |
| Embedding model | gemini-embedding-001 |
| Generation model (Gemini path forced) | gemini-3.8-flash (quota fallback: gemini-flash-lite-latest), temperature 0.4 |
| Retrieval | top-K = 4; query = last 4 turns joined with newlines; 32 chunks, loaded in 3453.1 ms |
| Flags | `{"answers":false,"judge":false,"limit":5,"ids":["f01","f02","f03","f04","f05"],"delaySeconds":20,"embedDelayMs":700,"kb":"mongo","baseline":"none","label":"Phase 3 ablation: follow-ups without query rewriting","rerank":true,"rewrite":false,"taskDelayMs":4000}` |
| Production-code check | ✅ route.ts builds retrieval, prompt and sources with lib/retrieval.ts and lib/assistant-context.ts, which the evaluation imports directly. |

## Gemini API requests made by this run

**10 total** — 5 embedding, 5 generation, 0 non-200 responses. Counted at the HTTP level, so retries and quota-fallback calls are included.

| Method · model | Requests |
|---|---|
| batchEmbedContents · gemini-embedding-001 | 5 |
| generateContent · gemini-flash-lite-latest | 5 |

Answer generation: Answer generation not requested (run with --answers).

## Results

### Retrieval (knowledge-base articles)

- **Hit rate @4:** 100% (5/5 cases with an expected article)
- **Hit rate @1:** 80%
- **Mean reciprocal rank:** 0.867 over the full ranking (MRR@4: 0.867)

| Difficulty | Cases | Hit @4 | Hit @1 | MRR | MRR@4 | Failed |
|---|---|---|---|---|---|---|
| easy | 3 | 100% (3) | 100% (3) | 1 | 1 | – |
| hard | 2 | 100% (2) | 50% (1) | 0.667 | 0.667 | – |

*Easy* cases were written knowing the article titles. *Hard* cases (h01–h15) were written the way a stressed caregiver types — vague, misspelt, emotional, sometimes two topics — before looking at the titles, then labelled. h10 requires **both** of its articles in the top 4.

- **By category:** follow-up 5/5
- **Similarity scores:** top-1 score on hits — min 0.656, median 0.822; top-1 score on insufficient-information questions — max n/a (). There is no score threshold today, so 4 articles are always sent.

### Retrieval pipeline (articles actually sent to the model)

Mode: reranked. The dense @4 numbers above are the Phase 1/2 behaviour, computed from the same embeddings.

| Set | Cases | Hit (expected article sent) | Expected article in the 8 candidates | Precision of sent articles | Failed |
|---|---|---|---|---|---|
| all | 5 | 100% (5) | 100% | 0.667 | – |
| easy | 3 | 100% (3) | 100% | 0.611 | – |
| hard | 2 | 100% (2) | 100% | 0.75 | – |

Articles sent per question: 1.8 on average (dense top-4 always sent 4); null for questions that need no article, 0/0 of which got none. Rerank latency: median 1240.5 ms, max 1435.4 ms.

### Patient-context coverage (does the prompt contain the facts needed?)

0/0 pass · 0 fail because of a known limitation · 0 unexpected failures.

### Latency (ms)

| Stage | Median | Max | n |
|---|---|---|---|
| Embedding call | 906 | 935.5 | 5 |
| Similarity ranking (in-process) | 0.6 | 5.5 | 5 |
| Retrieval total | 2153.1 | 2376.4 | 5 |
| Answer generation | – | – | 0 |
| End to end (retrieval + context + generation) | – | – | 0 |

Knowledge-base load (once per run here; production does it on every request): 3453.1 ms. End-to-end reuses the retrieval embedding to save quota, so it is retrieval time + context build + generation time.

## Every test case

| ID | Difficulty | Category | Retrieval | Rank | Top-1 (score) | Patient context | Answer |
|---|---|---|---|---|---|---|---|
| f01 | easy | follow-up | pass | 1 | repeated-questions (0.836) | n/a | not run |
| f02 | easy | follow-up | pass | 1 | sundowning (0.8514) | n/a | not run |
| f03 | easy | follow-up | pass | 1 | home-safety (0.6563) | n/a | not run |
| f04 | hard | follow-up | pass | 3 | bathing-hygiene (0.822) | n/a | not run |
| f05 | hard | follow-up | pass | 1 | nutrition-hydration (0.7154) | n/a | not run |

### f01 — follow-up (3-turn conversation)

**Question:** What should I write on it?

**Expected article(s):** repeated-questions → **pass** (best rank 1); expected scores {"repeated-questions":0.836}

**Sent to the model (reranked):** repeated-questions → **pass** · rerank scores {"repeated-questions":3,"communication-techniques":1,"paranoia-accusations":0,"agitation-aggression":0,"talking-to-children":0,"denial":0,"holidays-visitors":1,"validation-therapy":1}

**Dense top 4:** 1. repeated-questions (0.836) · 2. communication-techniques (0.7442) · 3. paranoia-accusations (0.7011) · 4. agitation-aggression (0.6895) — retrieval 2376.4 ms (embed 935.5, rank 5.5)

**Expected behaviour:** Understands 'it' = the whiteboard; suggests day/date, plans, who is visiting.

### f02 — follow-up (3-turn conversation)

**Question:** Would changing the lighting help?

**Expected article(s):** sundowning → **pass** (best rank 1); expected scores {"sundowning":0.8514}

**Sent to the model (reranked):** sundowning, agitation-aggression, routines → **pass** · rerank scores {"sundowning":3,"agitation-aggression":2,"sleep-problems":1,"routines":2,"home-safety":1,"hallucinations-delusions":1,"repeated-questions":0,"mealtime-challenges":0}

**Dense top 4:** 1. sundowning (0.8514) · 2. agitation-aggression (0.7476) · 3. sleep-problems (0.7282) · 4. routines (0.6995) — retrieval 1925.9 ms (embed 792.8, rank 0.4)

**Expected behaviour:** Yes: good daytime light, well-lit calm evenings; grounded in sundowning article.

### f03 — follow-up (3-turn conversation)

**Question:** No, but what changes can I make so it doesn't happen again?

**Expected article(s):** home-safety → **pass** (best rank 1); expected scores {"home-safety":0.6563}

**Sent to the model (reranked):** home-safety, assistive-technology → **pass** · rerank scores {"home-safety":3,"incontinence":0,"bathing-hygiene":1,"assistive-technology":2,"doctor-appointment-prep":1,"repeated-questions":0,"validation-therapy":0,"hallucinations-delusions":0}

**Dense top 4:** 1. home-safety (0.6563) · 2. incontinence (0.6288) · 3. bathing-hygiene (0.6283) · 4. assistive-technology (0.6251) — retrieval 2313.5 ms (embed 906, rank 0.3)

**Expected behaviour:** Grab bars, non-slip mats, lighting, clutter removal.

### f04 — follow-up (hard) (5-turn conversation)

**Question:** how do i even bring it up with him without a huge fight

**Expected article(s):** driving-safety → **pass** (best rank 3); expected scores {"driving-safety":0.7625}

**Sent to the model (reranked):** driving-safety → **pass** · rerank scores {"bathing-hygiene":1,"incontinence":0,"driving-safety":3,"talking-to-children":0,"sleep-problems":0,"denial":1,"repeated-questions":0,"doctor-appointment-prep":1}

**Dense top 4:** 1. bathing-hygiene (0.822) · 2. incontinence (0.7678) · 3. driving-safety (0.7625) · 4. talking-to-children (0.7561) — retrieval 2036.1 ms (embed 794.9, rank 0.7)

**Expected behaviour:** Approaches for raising driving cessation (involve the doctor, alternatives, preserve dignity); about the father's driving, not bathing.

### f05 — follow-up (hard) (3-turn conversation)

**Question:** she hardly drinks anything either, maybe one cup a day. is that dangerous?

**Expected article(s):** nutrition-hydration → **pass** (best rank 1); expected scores {"nutrition-hydration":0.7154}

**Sent to the model (reranked):** nutrition-hydration, mealtime-challenges → **pass** · rerank scores {"nutrition-hydration":3,"mealtime-challenges":2,"end-of-life-planning":0,"doctor-appointment-prep":0,"talking-to-children":0,"bathing-hygiene":0,"exercise-benefits":0,"sleep-problems":0}

**Dense top 4:** 1. nutrition-hydration (0.7154) · 2. mealtime-challenges (0.6991) · 3. end-of-life-planning (0.6546) · 4. doctor-appointment-prep (0.6478) — retrieval 2153.1 ms (embed 923.5, rank 0.6)

**Expected behaviour:** Dehydration risk and practical ways to encourage fluids; suggests the doctor.

