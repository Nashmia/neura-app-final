# Care Assistant RAG evaluation — 2026-10-17 10:47 UTC

> Baseline evaluation of the existing pipeline. Patient data is synthetic (evaluation/fixtures). Knowledge chunks: MongoDB collection "knowledgeChunks" (read-only). Generated answers are **not deterministic** (temperature 0.4); re-runs can differ.

## Run details

| | |
|---|---|
| Started / finished | 2026-10-17T10:47:38.276Z / 2026-10-17T10:48:30.805Z |
| Git commit | `f32ddadc92d05c2d9e8e1e17e8f92f6167527e26` |
| Node / locale / time zone | v22.14.0 / en-PK / Asia/Karachi |
| Embedding model | gemini-embedding-001 |
| Generation model (Gemini path forced) | gemini-3.8-flash (quota fallback: gemini-flash-lite-latest), temperature 0.4 |
| Retrieval | top-K = 4; query = last 4 turns joined with newlines (route.ts:65-68); 32 chunks, loaded in 3517.6 ms |
| Flags | `{"answers":false,"judge":false,"limit":5,"ids":null,"delaySeconds":20,"embedDelayMs":700,"kb":"mongo"}` |
| Route drift check | ✅ route.ts retrieval/context code matches the snapshot replica.ts was built from. |
| Replica equivalence check | ✅ replica.ts produced identical query, top-K, contexts and system prompt to the live route code for all 43 cases (fake embeddings, no API calls). |

## Gemini API requests made by this run

**43 total** — 43 embedding, 0 generation, 0 non-200 responses. Counted at the HTTP level, so retries and quota-fallback calls are included.

| Method · model | Requests |
|---|---|
| batchEmbedContents · gemini-embedding-001 | 43 |

Answer generation: Answer generation not requested (run with --answers).

## Results

### Retrieval (knowledge-base articles)

- **Hit rate @4:** 93.5% (29/31 cases with an expected article)
- **Hit rate @1:** 90.3%
- **Mean reciprocal rank:** 0.937 over the full ranking (MRR@4: 0.93)

| Difficulty | Cases | Hit @4 | Hit @1 | MRR | MRR@4 | Failed |
|---|---|---|---|---|---|---|
| easy | 16 | 100% (16) | 100% (16) | 1 | 1 | – |
| hard | 15 | 86.7% (13) | 80% (12) | 0.869 | 0.856 | h07, h10 |

*Easy* cases were written knowing the article titles. *Hard* cases (h01–h15) were written the way a stressed caregiver types — vague, misspelt, emotional, sometimes two topics — before looking at the titles, then labelled. h10 requires **both** of its articles in the top 4.

- **By category:** knowledge 20/21 · knowledge-multi 5/6 · follow-up 3/3 · medication 1/1
- **Similarity scores:** top-1 score on hits — min 0.566, median 0.709; top-1 score on insufficient-information questions — max 0.669 (0.669, 0.565, 0.614). There is no score threshold today, so 4 articles are always sent.

### Patient-context coverage (does the prompt contain the facts needed?)

7/10 pass · 3 fail because of a known limitation · 0 unexpected failures.

### Latency (ms)

| Stage | Median | Max | n |
|---|---|---|---|
| Embedding call | 430.2 | 748.8 | 43 |
| Similarity ranking (in-process) | 0.5 | 3.7 | 43 |
| Retrieval total | 430.5 | 752.5 | 43 |
| Answer generation | – | – | 0 |
| End to end (retrieval + context + generation) | – | – | 0 |

Knowledge-base load (once per run here; production does it on every request): 3517.6 ms. End-to-end reuses the retrieval embedding to save quota, so it is retrieval time + context build + generation time.

## Every test case

| ID | Difficulty | Category | Retrieval | Rank | Top-1 (score) | Patient context | Answer |
|---|---|---|---|---|---|---|---|
| k01 | easy | knowledge | pass | 1 | repeated-questions (0.7071) | n/a | not run |
| k02 | easy | knowledge | pass | 1 | sundowning (0.8255) | n/a | not run |
| k03 | easy | knowledge | pass | 1 | bathing-hygiene (0.711) | n/a | not run |
| k04 | easy | knowledge | pass | 1 | driving-safety (0.7489) | n/a | not run |
| k05 | easy | knowledge | pass | 1 | caregiver-burnout (0.7318) | n/a | not run |
| k06 | easy | knowledge | pass | 1 | hallucinations-delusions (0.691) | n/a | not run |
| k07 | easy | knowledge | pass | 1 | paranoia-accusations (0.7218) | n/a | not run |
| k08 | easy | knowledge | pass | 1 | legal-financial-planning (0.7292) | n/a | not run |
| k09 | easy | knowledge | pass | 1 | talking-to-children (0.8275) | n/a | not run |
| k10 | easy | knowledge | pass | 1 | doctor-appointment-prep (0.7187) | n/a | not run |
| m01 | easy | knowledge-multi | pass | 1 | wandering (0.6966) | n/a | not run |
| m02 | easy | knowledge-multi | pass | 1 | mealtime-challenges (0.6619) | n/a | not run |
| f01 | easy | follow-up | pass | 1 | repeated-questions (0.836) | n/a | not run |
| f02 | easy | follow-up | pass | 1 | sundowning (0.8514) | n/a | not run |
| f03 | easy | follow-up | pass | 1 | home-safety (0.6563) | n/a | not run |
| p01 | easy | mood | n/a (no expected article) | – | warning-signs-doctor (0.6153) | pass | not run |
| p02 | easy | mood | n/a (no expected article) | – | sundowning (0.639) | pass | not run |
| p03 | easy | mood | n/a (no expected article) | – | bathing-hygiene (0.6625) | fail (known limitation) | not run |
| p04 | easy | medication | n/a (no expected article) | – | medication-management (0.6417) | pass | not run |
| p05 | easy | medication | n/a (no expected article) | – | medication-management (0.6802) | pass | not run |
| p06 | easy | medication | pass | 1 | warning-signs-doctor (0.7088) | pass | not run |
| p07 | easy | appointments | n/a (no expected article) | – | doctor-appointment-prep (0.6387) | fail (known limitation) | not run |
| p08 | easy | appointments | n/a (no expected article) | – | doctor-appointment-prep (0.5748) | pass | not run |
| p09 | easy | quiz-progress | n/a (no expected article) | – | stages-overview (0.6497) | pass | not run |
| p10 | easy | quiz-progress | n/a (no expected article) | – | stages-overview (0.5119) | fail (known limitation) | not run |
| i01 | easy | insufficient-info | n/a (no expected article) | – | doctor-appointment-prep (0.6692) | n/a | not run |
| i02 | easy | insufficient-info | n/a (no expected article) | – | doctor-appointment-prep (0.5647) | n/a | not run |
| i03 | easy | insufficient-info | n/a (no expected article) | – | medication-management (0.6138) | n/a | not run |
| h01 | hard | knowledge-multi | pass | 1 | sleep-problems (0.6522) | n/a | not run |
| h02 | hard | knowledge-multi | pass | 1 | mealtime-challenges (0.6764) | n/a | not run |
| h03 | hard | knowledge-multi | pass | 1 | agitation-aggression (0.5663) | n/a | not run |
| h04 | hard | knowledge | pass | 2 | repeated-questions (0.6785) | n/a | not run |
| h05 | hard | knowledge | pass | 1 | bathing-hygiene (0.7301) | n/a | not run |
| h06 | hard | knowledge | pass | 1 | paranoia-accusations (0.6394) | n/a | not run |
| h07 | hard | knowledge | fail | 5 | agitation-aggression (0.5696) | n/a | not run |
| h08 | hard | knowledge | pass | 1 | driving-safety (0.7223) | n/a | not run |
| h09 | hard | knowledge | pass | 1 | sundowning (0.709) | n/a | not run |
| h10 | hard | knowledge-multi | fail | 3 | warning-signs-doctor (0.6466) | n/a | not run |
| h11 | hard | knowledge | pass | 1 | repeated-questions (0.7112) | n/a | not run |
| h12 | hard | knowledge | pass | 1 | communication-techniques (0.6976) | n/a | not run |
| h13 | hard | knowledge | pass | 1 | exercise-benefits (0.6011) | n/a | not run |
| h14 | hard | knowledge | pass | 1 | incontinence (0.6973) | n/a | not run |
| h15 | hard | knowledge | pass | 1 | hallucinations-delusions (0.6927) | n/a | not run |

### k01 — knowledge

**Question:** My mother keeps asking me what day it is every few minutes. How should I respond?

**Expected article(s):** repeated-questions → **pass** (best rank 1); expected scores {"repeated-questions":0.7071}

**Retrieved top 4:** 1. repeated-questions (0.7071) · 2. communication-techniques (0.6395) · 3. validation-therapy (0.6265) · 4. paranoia-accusations (0.6198) — retrieval 752.5 ms (embed 748.8, rank 3.7)

**Expected behaviour:** Answer calmly each time, address the underlying anxiety, suggest a visible clock/whiteboard; grounded in the repeated-questions article.

### k02 — knowledge

**Question:** Every evening around 5pm my dad gets restless and confused. Why does this happen and what helps?

**Expected article(s):** sundowning → **pass** (best rank 1); expected scores {"sundowning":0.8255}

**Retrieved top 4:** 1. sundowning (0.8255) · 2. sleep-problems (0.7023) · 3. routines (0.6958) · 4. agitation-aggression (0.6873) — retrieval 495 ms (embed 494.5, rank 0.5)

**Expected behaviour:** Explains sundowning; routine, daytime light, calm evening environment, redirection.

### k03 — knowledge

**Question:** She refuses to take a shower and gets really upset whenever I bring it up.

**Expected article(s):** bathing-hygiene → **pass** (best rank 1); expected scores {"bathing-hygiene":0.711}

**Retrieved top 4:** 1. bathing-hygiene (0.711) · 2. validation-therapy (0.5938) · 3. exercise-benefits (0.5922) · 4. agitation-aggression (0.5918) — retrieval 415.6 ms (embed 415.2, rank 0.4)

**Expected behaviour:** Practical bathing-resistance tips from the bathing article; no shaming.

### k04 — knowledge

**Question:** He insists on driving to the shops but I'm worried it isn't safe for him anymore.

**Expected article(s):** driving-safety → **pass** (best rank 1); expected scores {"driving-safety":0.7489}

**Retrieved top 4:** 1. driving-safety (0.7489) · 2. assistive-technology (0.6475) · 3. denial (0.6406) · 4. validation-therapy (0.6354) — retrieval 416.5 ms (embed 416.2, rank 0.3)

**Expected behaviour:** Warning signs, involving the doctor, alternatives to driving.

### k05 — knowledge

**Question:** I'm exhausted and irritable and haven't slept properly in weeks from looking after my husband.

**Expected article(s):** caregiver-burnout, respite-care → **pass** (best rank 1); expected scores {"caregiver-burnout":0.7318,"respite-care":0.6627}

**Retrieved top 4:** 1. caregiver-burnout (0.7318) · 2. respite-care (0.6627) · 3. sleep-problems (0.6498) · 4. agitation-aggression (0.619) — retrieval 543 ms (embed 542.5, rank 0.5)

**Expected behaviour:** Recognises burnout, self-care, respite options; supportive tone.

### k06 — knowledge

**Question:** My father says he sees strangers sitting in the living room who aren't there.

**Expected article(s):** hallucinations-delusions → **pass** (best rank 1); expected scores {"hallucinations-delusions":0.691}

**Retrieved top 4:** 1. hallucinations-delusions (0.691) · 2. paranoia-accusations (0.6357) · 3. validation-therapy (0.6302) · 4. agitation-aggression (0.6098) — retrieval 459.7 ms (embed 458.9, rank 0.8)

**Expected behaviour:** Don't argue, reassure, check environment, mention telling the doctor.

### k07 — knowledge

**Question:** She accuses me of stealing her purse whenever she misplaces it.

**Expected article(s):** paranoia-accusations → **pass** (best rank 1); expected scores {"paranoia-accusations":0.7218}

**Retrieved top 4:** 1. paranoia-accusations (0.7218) · 2. hallucinations-delusions (0.6168) · 3. validation-therapy (0.5999) · 4. repeated-questions (0.5984) — retrieval 435 ms (embed 434.5, rank 0.5)

**Expected behaviour:** Don't take it personally, help look, keep spares; from the paranoia article.

### k08 — knowledge

**Question:** Should we sort out power of attorney now while she can still take part in the decisions?

**Expected article(s):** legal-financial-planning → **pass** (best rank 1); expected scores {"legal-financial-planning":0.7292}

**Retrieved top 4:** 1. legal-financial-planning (0.7292) · 2. doctor-appointment-prep (0.6695) · 3. denial (0.6419) · 4. driving-safety (0.6405) — retrieval 472 ms (embed 471.5, rank 0.5)

**Expected behaviour:** Encourages early legal/financial planning; suggests professional advice.

### k09 — knowledge

**Question:** How do I explain grandpa's memory problems to my 8-year-old?

**Expected article(s):** talking-to-children → **pass** (best rank 1); expected scores {"talking-to-children":0.8275}

**Retrieved top 4:** 1. talking-to-children (0.8275) · 2. reminiscence-therapy (0.6882) · 3. repeated-questions (0.685) · 4. validation-therapy (0.6843) — retrieval 425.1 ms (embed 424.2, rank 0.9)

**Expected behaviour:** Age-appropriate honesty, reassurance, ways for the child to connect.

### k10 — knowledge

**Question:** What should I bring or prepare before the neurologist visit?

**Expected article(s):** doctor-appointment-prep → **pass** (best rank 1); expected scores {"doctor-appointment-prep":0.7187}

**Retrieved top 4:** 1. doctor-appointment-prep (0.7187) · 2. legal-financial-planning (0.6303) · 3. denial (0.6046) · 4. warning-signs-doctor (0.5968) — retrieval 427 ms (embed 426.5, rank 0.5)

**Expected behaviour:** Symptom notes, medication list, questions list; may mention the upcoming Neurologist follow-up from patient data.

### m01 — knowledge-multi

**Question:** She wanders around the house at night and I'm scared she'll get out of the front door.

**Expected article(s):** wandering, sleep-problems, home-safety → **pass** (best rank 1); expected scores {"wandering":0.6966,"sleep-problems":0.6673,"home-safety":0.6457}

**Retrieved top 4:** 1. wandering (0.6966) · 2. sleep-problems (0.6673) · 3. home-safety (0.6457) · 4. emergencies (0.644) — retrieval 413.8 ms (embed 413.3, rank 0.5)

**Expected behaviour:** Door alarms/locks, night routine, safety; combines wandering and night-time advice.

### m02 — knowledge-multi

**Question:** He's losing weight and doesn't finish his meals anymore.

**Expected article(s):** mealtime-challenges, nutrition-hydration → **pass** (best rank 1); expected scores {"mealtime-challenges":0.6619,"nutrition-hydration":0.6174}

**Retrieved top 4:** 1. mealtime-challenges (0.6619) · 2. nutrition-hydration (0.6174) · 3. warning-signs-doctor (0.5902) · 4. doctor-appointment-prep (0.5877) — retrieval 432.8 ms (embed 432.3, rank 0.5)

**Expected behaviour:** Mealtime strategies and nutrition; suggests the doctor for weight loss.

### f01 — follow-up (3-turn conversation)

**Question:** What should I write on it?

**Expected article(s):** repeated-questions → **pass** (best rank 1); expected scores {"repeated-questions":0.836}

**Retrieved top 4:** 1. repeated-questions (0.836) · 2. communication-techniques (0.7442) · 3. paranoia-accusations (0.7011) · 4. agitation-aggression (0.6895) — retrieval 441 ms (embed 440.5, rank 0.5)

**Expected behaviour:** Understands 'it' = the whiteboard; suggests day/date, plans, who is visiting.

### f02 — follow-up (3-turn conversation)

**Question:** Would changing the lighting help?

**Expected article(s):** sundowning → **pass** (best rank 1); expected scores {"sundowning":0.8514}

**Retrieved top 4:** 1. sundowning (0.8514) · 2. agitation-aggression (0.7476) · 3. sleep-problems (0.7282) · 4. routines (0.6995) — retrieval 546.2 ms (embed 545.7, rank 0.5)

**Expected behaviour:** Yes: good daytime light, well-lit calm evenings; grounded in sundowning article.

### f03 — follow-up (3-turn conversation)

**Question:** No, but what changes can I make so it doesn't happen again?

**Expected article(s):** home-safety → **pass** (best rank 1); expected scores {"home-safety":0.6563}

**Retrieved top 4:** 1. home-safety (0.6563) · 2. incontinence (0.6288) · 3. bathing-hygiene (0.6283) · 4. assistive-technology (0.6251) — retrieval 433.2 ms (embed 432.6, rank 0.6)

**Expected behaviour:** Grab bars, non-slip mats, lighting, clutter removal.

### p01 — mood

**Question:** How has her mood been over the last few days?

**Retrieved top 4:** 1. warning-signs-doctor (0.6153) · 2. agitation-aggression (0.6097) · 3. validation-therapy (0.6084) · 4. sundowning (0.6054) — retrieval 413.1 ms (embed 412.6, rank 0.5)

**Patient context:** pass

**Expected behaviour:** Summarises the recent mix of moods from the journal (anxious after dinner, calm with photos, etc.) without inventing entries.

### p02 — mood

**Question:** Was there anything that seemed to calm her down recently?

**Retrieved top 4:** 1. sundowning (0.639) · 2. validation-therapy (0.6339) · 3. agitation-aggression (0.6296) · 4. routines (0.6168) — retrieval 430.4 ms (embed 429.9, rank 0.5)

**Patient context:** pass

**Expected behaviour:** Mentions the photo albums with Priya (and possibly singing old songs).

### p03 — mood

**Question:** She refused her bath on the 9th of October. Has she been refusing baths before that too?

**Retrieved top 4:** 1. bathing-hygiene (0.6625) · 2. routines (0.5711) · 3. incontinence (0.5424) · 4. doctor-appointment-prep (0.5377) — retrieval 446.8 ms (embed 446.2, rank 0.6)

**Patient context:** fail (known limitation); missing: "Refused her bath"

**Known limitation:** The route only passes the 5 newest journal entries; the 9 Oct entry is the 6th newest, so the model never sees it.

**Expected behaviour:** Ideally confirms the 9 Oct entry; with the current window it should say it can't see that entry rather than guess.

### p04 — medication

**Question:** Which medications is she on, and which doses are still pending today?

**Retrieved top 4:** 1. medication-management (0.6417) · 2. doctor-appointment-prep (0.6119) · 3. stages-overview (0.5578) · 4. assistive-technology (0.5422) — retrieval 453.1 ms (embed 452.6, rank 0.5)

**Patient context:** pass

**Expected behaviour:** Lists all three correctly; Memantine 8 PM is pending.

### p05 — medication

**Question:** What time does she take her Memantine?

**Retrieved top 4:** 1. medication-management (0.6802) · 2. routines (0.6758) · 3. sleep-problems (0.6551) · 4. mealtime-challenges (0.6492) — retrieval 425 ms (embed 424.5, rank 0.5)

**Patient context:** pass

**Expected behaviour:** 8:00 PM, 5mg.

### p06 — medication

**Question:** She seems more confused lately. Should I increase her Donepezil to 15mg?

**Expected article(s):** medication-management, warning-signs-doctor → **pass** (best rank 1); expected scores {"medication-management":0.6951,"warning-signs-doctor":0.7088}

**Retrieved top 4:** 1. warning-signs-doctor (0.7088) · 2. medication-management (0.6951) · 3. stages-overview (0.691) · 4. validation-therapy (0.6829) — retrieval 423.4 ms (embed 422.9, rank 0.5)

**Patient context:** pass

**Expected behaviour:** SAFETY: must not recommend changing the dose; refers to the doctor; may note increased confusion is worth reporting.

### p07 — appointments

**Question:** When is her next appointment?

**Retrieved top 4:** 1. doctor-appointment-prep (0.6387) · 2. warning-signs-doctor (0.5559) · 3. stages-overview (0.5522) · 4. repeated-questions (0.5482) — retrieval 421.1 ms (embed 420.6, rank 0.5)

**Patient context:** fail (known limitation); should not contain: "Physiotherapy session"

**Known limitation:** The route keeps any appointment with status 'Upcoming' without checking its date, so the past 1 Oct physiotherapy session is listed first as 'upcoming'.

**Expected behaviour:** Neurologist follow-up on 3 Nov at 10:30 (not the stale 1 Oct physiotherapy).

### p08 — appointments

**Question:** Is her dentist check-up still going ahead?

**Retrieved top 4:** 1. doctor-appointment-prep (0.5748) · 2. warning-signs-doctor (0.544) · 3. talking-to-children (0.543) · 4. stages-overview (0.5366) — retrieval 392.3 ms (embed 391.6, rank 0.7)

**Patient context:** pass

**Expected behaviour:** It's not among upcoming appointments; should say it has no upcoming dentist appointment on record rather than invent one.

### p09 — quiz-progress

**Question:** What was her most recent cognitive check-in score?

**Retrieved top 4:** 1. stages-overview (0.6497) · 2. warning-signs-doctor (0.647) · 3. validation-therapy (0.6295) · 4. doctor-appointment-prep (0.6271) — retrieval 421.7 ms (embed 421, rank 0.7)

**Patient context:** pass

**Expected behaviour:** 2 out of 5 on 11 Oct; may note it's lower than the previous 4/5.

### p10 — quiz-progress

**Question:** Has her check-in score improved since her very first check-in?

**Retrieved top 4:** 1. stages-overview (0.5119) · 2. warning-signs-doctor (0.5046) · 3. repeated-questions (0.5031) · 4. doctor-appointment-prep (0.5027) — retrieval 430.3 ms (embed 429.8, rank 0.5)

**Patient context:** fail (known limitation); missing: "1/5"

**Known limitation:** The route only passes the 3 newest sessions; the first session (1/5 on 20 Sep) is dropped.

**Expected behaviour:** Ideally compares to the first 1/5; with the current window it should say it can only see recent sessions.

### i01 — insufficient-info

**Question:** What did the neurologist say at her last appointment?

**Retrieved top 4:** 1. doctor-appointment-prep (0.6692) · 2. warning-signs-doctor (0.6383) · 3. stages-overview (0.609) · 4. talking-to-children (0.5949) — retrieval 435.3 ms (embed 434.8, rank 0.5)

**Expected behaviour:** Says it has no record of what the neurologist said; suggests asking the doctor / noting it in the journal. Must not invent findings.

### i02 — insufficient-info

**Question:** What were her blood pressure readings this week?

**Retrieved top 4:** 1. doctor-appointment-prep (0.5647) · 2. stages-overview (0.5433) · 3. medication-management (0.5364) · 4. repeated-questions (0.5348) — retrieval 432.4 ms (embed 431.9, rank 0.5)

**Expected behaviour:** Says blood pressure isn't recorded in Neura; no made-up numbers.

### i03 — insufficient-info

**Question:** Which medication was she taking back in 2024?

**Retrieved top 4:** 1. medication-management (0.6138) · 2. doctor-appointment-prep (0.5724) · 3. assistive-technology (0.5543) · 4. stages-overview (0.548) — retrieval 439.3 ms (embed 438.8, rank 0.5)

**Expected behaviour:** Says only current medications are recorded; no history before that.

### h01 — knowledge-multi (hard)

**Question:** im so tired, he keeps getting up at night and walking round the house at 3am. what do i even do

**Expected article(s):** sleep-problems, wandering, caregiver-burnout → **pass** (best rank 1); expected scores {"sleep-problems":0.6522,"wandering":0.5965,"caregiver-burnout":0.5501}

**Retrieved top 4:** 1. sleep-problems (0.6522) · 2. sundowning (0.6189) · 3. exercise-benefits (0.6094) · 4. wandering (0.5965) — retrieval 437.3 ms (embed 436.8, rank 0.5)

**Expected behaviour:** Night-time routine and wandering safety; acknowledges the caregiver's exhaustion.

### h02 — knowledge-multi (hard)

**Question:** mum wont eat anything anymore she just pushes the plate away, shes getting so thin

**Expected article(s):** mealtime-challenges, nutrition-hydration → **pass** (best rank 1); expected scores {"mealtime-challenges":0.6764,"nutrition-hydration":0.6279}

**Retrieved top 4:** 1. mealtime-challenges (0.6764) · 2. nutrition-hydration (0.6279) · 3. end-of-life-planning (0.6091) · 4. bathing-hygiene (0.5975) — retrieval 443 ms (embed 442.4, rank 0.6)

**Expected behaviour:** Mealtime strategies; recommends the doctor for weight loss.

### h03 — knowledge-multi (hard)

**Question:** he shouted at me again today and threw his cup. i dont know how much more of this i can take

**Expected article(s):** agitation-aggression, caregiver-burnout → **pass** (best rank 1); expected scores {"agitation-aggression":0.5663,"caregiver-burnout":0.5538}

**Retrieved top 4:** 1. agitation-aggression (0.5663) · 2. caregiver-burnout (0.5538) · 3. paranoia-accusations (0.5427) · 4. repeated-questions (0.5372) — retrieval 404.6 ms (embed 403.8, rank 0.8)

**Expected behaviour:** Responding to aggression safely, possible triggers; support for the caregiver.

### h04 — knowledge (hard)

**Question:** she keeps asking where her husband is but he died 6 years ago. do i tell her the truth every time??

**Expected article(s):** validation-therapy, communication-techniques → **pass** (best rank 2); expected scores {"validation-therapy":0.6619,"communication-techniques":0.6234}

**Retrieved top 4:** 1. repeated-questions (0.6785) · 2. validation-therapy (0.6619) · 3. talking-to-children (0.6378) · 4. paranoia-accusations (0.6269) — retrieval 405.5 ms (embed 404.9, rank 0.6)

**Expected behaviour:** Validation approach: respond to the emotion, avoid repeatedly re-breaking the news.

### h05 — knowledge (hard)

**Question:** how do i get dad to wash, he refuses and gets angry when i try

**Expected article(s):** bathing-hygiene → **pass** (best rank 1); expected scores {"bathing-hygiene":0.7301}

**Retrieved top 4:** 1. bathing-hygiene (0.7301) · 2. incontinence (0.6289) · 3. denial (0.6246) · 4. agitation-aggression (0.6205) — retrieval 442.3 ms (embed 441.8, rank 0.5)

**Expected behaviour:** Bathing-resistance tips: privacy, timing, choice, no confrontation.

### h06 — knowledge (hard)

**Question:** she hides things and then says im stealing from her. its breaking my heart

**Expected article(s):** paranoia-accusations → **pass** (best rank 1); expected scores {"paranoia-accusations":0.6394}

**Retrieved top 4:** 1. paranoia-accusations (0.6394) · 2. validation-therapy (0.5766) · 3. hallucinations-delusions (0.5745) · 4. talking-to-children (0.5481) — retrieval 411.2 ms (embed 410.7, rank 0.5)

**Expected behaviour:** Don't argue or take it personally, help search, keep spares; empathetic.

### h07 — knowledge (hard)

**Question:** is it normal to feel angry at him? i feel like a terrible daughter

**Expected article(s):** caregiver-burnout, support-groups → **fail** (best rank 5); expected scores {"caregiver-burnout":0.5513,"support-groups":0.5307}

**Retrieved top 4:** 1. agitation-aggression (0.5696) · 2. denial (0.5622) · 3. paranoia-accusations (0.5564) · 4. validation-therapy (0.5536) — retrieval 430.2 ms (embed 429.4, rank 0.8)

**Expected behaviour:** Normalises the feeling, self-care, support groups/respite; no judgement.

### h08 — knowledge (hard)

**Question:** he got lost driving to the shop yesterday. how do i take the keys away without a fight

**Expected article(s):** driving-safety → **pass** (best rank 1); expected scores {"driving-safety":0.7223}

**Retrieved top 4:** 1. driving-safety (0.7223) · 2. paranoia-accusations (0.6635) · 3. denial (0.654) · 4. wandering (0.6532) — retrieval 420.4 ms (embed 419.8, rank 0.6)

**Expected behaviour:** Getting lost is a warning sign; involve the doctor, alternatives, gentle approaches.

### h09 — knowledge (hard)

**Question:** evenings are the worst, around 5pm she gets so restless and keeps saying she wants to go home even tho she IS home

**Expected article(s):** sundowning → **pass** (best rank 1); expected scores {"sundowning":0.709}

**Retrieved top 4:** 1. sundowning (0.709) · 2. sleep-problems (0.6132) · 3. routines (0.6095) · 4. wandering (0.6069) — retrieval 418 ms (embed 417.4, rank 0.6)

**Expected behaviour:** Explains sundowning; reassurance rather than correction, calm evening routine.

### h10 — knowledge-multi (hard)

**Question:** she nearly fell on the stairs and also shes stopped taking her pills properly, im scared

**Expected article(s):** home-safety, medication-management → **fail** (best rank 3); expected scores {"home-safety":0.6172,"medication-management":0.633} — all required; in top 4: medication-management

**Retrieved top 4:** 1. warning-signs-doctor (0.6466) · 2. emergencies (0.6371) · 3. medication-management (0.633) · 4. stages-overview (0.6268) — retrieval 429.2 ms (embed 428.6, rank 0.6)

**Expected behaviour:** Addresses BOTH topics: fall/stair safety and medication adherence (pill organiser, supervision, tell the doctor).

### h11 — knowledge (hard)

**Question:** dad asks the same question like 20 times an hour and i lose my patience

**Expected article(s):** repeated-questions → **pass** (best rank 1); expected scores {"repeated-questions":0.7112}

**Retrieved top 4:** 1. repeated-questions (0.7112) · 2. communication-techniques (0.6135) · 3. agitation-aggression (0.5983) · 4. paranoia-accusations (0.5949) — retrieval 440.9 ms (embed 440.3, rank 0.6)

**Expected behaviour:** Repeated-questions strategies; acknowledges the caregiver's frustration.

### h12 — knowledge (hard)

**Question:** how do i talk to him when he cant find his words anymore, he gets so frustrated

**Expected article(s):** communication-techniques → **pass** (best rank 1); expected scores {"communication-techniques":0.6976}

**Retrieved top 4:** 1. communication-techniques (0.6976) · 2. repeated-questions (0.6677) · 3. agitation-aggression (0.6662) · 4. validation-therapy (0.6626) — retrieval 444.4 ms (embed 443.8, rank 0.6)

**Expected behaviour:** Communication techniques: patience, simple questions, non-verbal cues.

### h13 — knowledge (hard)

**Question:** my mom used to love gardening now she just sits all day staring at the tv. how to keep her bussy

**Expected article(s):** reminiscence-therapy, exercise-benefits, routines → **pass** (best rank 1); expected scores {"reminiscence-therapy":0.5837,"exercise-benefits":0.6011,"routines":0.5559}

**Retrieved top 4:** 1. exercise-benefits (0.6011) · 2. bathing-hygiene (0.5873) · 3. reminiscence-therapy (0.5837) · 4. validation-therapy (0.5816) — retrieval 433.7 ms (embed 433, rank 0.7)

**Expected behaviour:** Meaningful activity adapted to her interests (e.g. simple gardening tasks), routine, movement. Note: the knowledge base has no dedicated activities article, so any of the three nearest articles counts.

### h14 — knowledge (hard)

**Question:** accidents in the bathroom are happening more and more, its embarassing for both of us

**Expected article(s):** incontinence → **pass** (best rank 1); expected scores {"incontinence":0.6973}

**Retrieved top 4:** 1. incontinence (0.6973) · 2. bathing-hygiene (0.638) · 3. home-safety (0.5998) · 4. paranoia-accusations (0.5978) — retrieval 430.5 ms (embed 430.2, rank 0.3)

**Expected behaviour:** Incontinence management with dignity; mentions checking with the doctor.

### h15 — knowledge (hard)

**Question:** shes seeing people in the room who arent there and talking to them, shoud i be worried

**Expected article(s):** hallucinations-delusions → **pass** (best rank 1); expected scores {"hallucinations-delusions":0.6927}

**Retrieved top 4:** 1. hallucinations-delusions (0.6927) · 2. warning-signs-doctor (0.6364) · 3. paranoia-accusations (0.6276) · 4. validation-therapy (0.6225) — retrieval 405.4 ms (embed 404.8, rank 0.6)

**Expected behaviour:** Don't argue, reassure, tell the doctor (possible infection/medication cause).

