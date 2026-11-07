# Neura: context for writing the Final Year Project report

## Instructions for the assistant reading this

I'm a final-year student. Using this file, help me write a **formal academic project report** for my Final Year Project, "Neura". Please:

- Work **one chapter at a time**. Start by proposing the chapter outline (Section 12 has a suggested one) and ask me whether my university requires a specific template, word count or citation style (default: IEEE or APA, whichever I confirm).
- Write in formal, third-person or "we" academic style, in clear English. Explain technical terms the first time they appear.
- **Only claim what this file says is true.** Section 11 lists what must be stated honestly. If something I need isn't here (e.g. user-study results, screenshots, survey data), ask me for it and leave a clearly marked placeholder like `[SCREENSHOT: dashboard]` or `[TO FILL: fine-tuning loss]`. Never invent numbers, participants or results.
- Suggest where figures, tables and diagrams belong (architecture diagram, ER/data-model diagram, RAG pipeline flowchart, sequence diagram for the quiz, use-case diagram).
- I may also paste `docs/SRS.md` (my full Software Requirements Specification) and `docs/session-recap.md` (deployment/debugging history). Use them as extra source material.

---

## 1. Project summary

**Neura** is a web application that supports **family caregivers of people living with dementia**. A caregiver creates an account, sets up a profile for the patient they look after, and then uses one dashboard to:

- track medications (taken / pending)
- schedule and cancel appointments
- keep a daily care journal with mood tags
- run a short **AI-led conversational cognitive check-in** with the patient, which is scored and saved over time
- ask an **AI Care Assistant** caregiving questions, answered using a curated knowledge base and the patient's own care data (Retrieval-Augmented Generation, RAG)
- export a **PDF care report** (e.g. to bring to a doctor's appointment)
- **share the patient profile with a second caregiver** (e.g. a sibling) through an invite link/code

**Problem it addresses:** dementia care is usually spread across family members, paper notes, memory and many websites. Caregivers are often stressed, untrained and short on time. Neura puts the day-to-day records in one place and offers safe, practical guidance based on trusted content, plus a gentle way to track cognitive changes over time.

**Target users:** primary/secondary family caregivers (main users). Patients take part only during the cognitive check-in, which the caregiver supervises.

## 2. Objectives (suitable for the "Aims & Objectives" section)

1. Build a responsive, accessible full-stack web app for caregiver record-keeping (medications, appointments, journal).
2. Replace a static multiple-choice memory quiz with a **personalised, conversational AI check-in** that adapts to the patient's name, dementia stage, family contacts, chosen length and difficulty, and grades answers charitably.
3. Build a **RAG-based Care Assistant** that answers from a curated knowledge base and the patient's live data instead of the model's general knowledge, with explicit safety rules (no diagnoses, no medication-dose advice).
4. Show an end-to-end **fine-tuning and self-hosting pipeline**: generate a domain dataset, fine-tune an open model with LoRA on a free GPU, host it on Hugging Face and plug it into the app with automatic fallback.
5. Support **multi-caregiver collaboration** on a shared patient profile.
6. Deploy the system to the cloud (Vercel + MongoDB Atlas) and verify it end-to-end.

## 3. Technology stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router), **React 19**, **TypeScript** | Frontend pages and backend API routes in one codebase; type safety |
| Styling/UI | **Tailwind CSS v4**, shadcn-style components (Radix UI primitives), lucide-react icons, Framer Motion | Fast, consistent, accessible, responsive UI |
| Forms/validation | react-hook-form + **Zod** | Validated input on client and server |
| Charts | Recharts | Dashboard visualisation of check-in scores |
| Database | **MongoDB Atlas** (official `mongodb` driver) | Managed cloud NoSQL; flexible document model; free tier |
| AI (LLM) | **Google Gemini API** (`@google/genai`): `gemini-3.8-flash` primary, `gemini-flash-lite-latest` fallback | Quiz generation/grading and Care Assistant replies |
| AI (embeddings) | Gemini `gemini-embedding-001` | Vectors for semantic search in RAG |
| Fine-tuning | Google Colab (free T4 GPU), **Unsloth**, Hugging Face TRL `SFTTrainer`, **QLoRA** on **Llama-3.2-3B-Instruct** | Free, memory-efficient training of an open model |
| Model hosting | **Hugging Face Spaces** (Docker, FastAPI + Transformers) | Free hosting of the fine-tuned model as an HTTP API |
| PDF | `@react-pdf/renderer` | Server-side care report generation |
| Hosting | **Vercel** (serverless functions) | Native Next.js hosting, auto-deploy from GitHub |
| Version control | Git + GitHub | |

## 4. System architecture

- **Client:** React pages in `app/` (landing, login, signup, onboarding, dashboard, medications, appointments, journal, chat [quiz], assistant, settings, join).
- **Server:** Next.js API routes in `app/api/` run as **serverless functions** on Vercel: `auth/{signup,login,logout}`, `me`, `onboarding`, `dashboard`, `medications`, `appointments`, `journal`, `chat/quiz`, `assistant/chat`, `reports`, `invite`, `join`, `settings`.
- **Data layer:** `lib/db.ts` + `lib/mongodb.ts` (connection helper that reuses the connection across serverless invocations). There is a local JSON-file fallback for offline development only.
- **AI layer:** `lib/gemini.ts` (chat calls, retry and fallback logic), `lib/embeddings.ts` (embedding + cosine similarity), `lib/finetuned-model.ts` (client for the self-hosted model).
- **External services:** MongoDB Atlas, Google Gemini API, Hugging Face Space (optional).

Suggested diagram: Browser → Next.js on Vercel (pages + API routes) → {MongoDB Atlas, Gemini API, Hugging Face Space}.

## 5. Functional modules (requirements in `docs/SRS.md` use IDs AUTH, ONB, SHARE, MED, APPT, JRNL, DASH, QUIZ, CARE, RPT, SET)

1. **Authentication:** signup/login/logout. Sessions are stored in an **HTTP-only, SameSite=Lax cookie** signed with **HMAC-SHA256** (secure flag in production, 7-day lifetime) and verified with a timing-safe comparison.
2. **Onboarding & patient profile:** patient name, age, gender, dementia stage, notes, family/friend contacts (name, relationship, type, notes, optional photo compressed in the browser), quiz length (3–8) and difficulty.
3. **Multi-caregiver sharing:** a caregiver generates an **invite code** (HMAC-signed, encodes the patient ID and a timestamp, **expires after 7 days**). Another account joins with it and is added to the patient's `caregiverIds`, so both see the same data.
4. **Medications:** add, list, mark as taken/pending.
5. **Appointments:** add (Doctor / Therapy / Other, date, time, location, notes), list, cancel.
6. **Journal:** free-text notes with optional mood tag (Calm, Anxious, Confused, Happy, Tired).
7. **Dashboard:** summary metrics and charts across the above.
8. **Cognitive check-in (quiz):** see Section 6.
9. **Care Assistant:** see Section 7.
10. **Care report:** a one-page A4 PDF with medication adherence (X of Y doses taken), recent check-in scores, upcoming appointments and recent journal notes.
11. **Settings:** account, patient and caregiver information.

## 6. AI cognitive check-in (how it works)

- No fixed question bank. **Gemini generates each question live** from a system prompt built per patient: name, age, dementia stage, listed family/friends, number of questions (clamped to 3–8, default 5) and difficulty (default "easy").
- The prompt tells the model to ask **one question at a time**, covering **orientation** (day/time/season), **recall of familiar people**, **daily routine** and **simple recognition**, in short, warm, plain language; to **never ask anything upsetting, medical or embarrassing**; and to accept free-text answers (no multiple choice).
- **Structured output:** the model must return JSON matching a schema (`type: "question" | "complete"`, `message`, `questionNumber`, `total`, `score`, `summary`). This makes the conversation machine-readable.
- After the final answer, the model **grades charitably** (partial credit for close answers), writes a caregiver-facing summary and a warm closing message. The app saves a `QuizSession` (score, total, summary, timestamp) to the database, which feeds the dashboard and PDF report.
- Temperature 0.6, so wording varies between sessions.
- **Important for the report:** this is a supportive engagement/tracking tool, **not a validated clinical screening instrument** (it is not MMSE/MoCA) and must not be presented as diagnostic.

## 7. Care Assistant: Retrieval-Augmented Generation (RAG)

1. **Knowledge base:** 33 curated short articles on caregiving topics (`scripts/knowledge-base.ts`): wandering, sundowning, sleep problems, agitation/aggression, hallucinations/delusions, paranoia, repeated questions, communication techniques, validation therapy, reminiscence therapy, bathing/hygiene, incontinence, mealtimes, nutrition/hydration, medication management, home safety, driving safety, emergencies, warning signs to call a doctor, doctor-appointment preparation, routines, exercise, assistive technology, holidays/visitors, talking to children, denial, caregiver burnout, respite care, support groups, legal/financial planning, end-of-life planning, stages overview.
2. **Offline indexing** (`npm run seed:kb`): each article is converted to an embedding vector with `gemini-embedding-001` and stored with its text in the `knowledgeChunks` MongoDB collection.
3. **Query time:** the **last 4 conversation turns** are embedded together, so follow-ups like "what should I write on it?" still find the right topic. They are compared with every article by **cosine similarity**, and the **top 4** articles are selected.
4. **Patient grounding:** the prompt also includes the patient's current medications, the last 3 check-in scores, the last 5 journal notes (with moods) and up to 3 upcoming appointments.
5. **Safety rules in the prompt:** answer from the provided sources; **say so honestly if the knowledge base doesn't cover the question**; **never diagnose or advise changing a medication dose**, and refer the caregiver to the patient's doctor instead; keep answers short and practical.
6. The response returns the **source article titles**, which the UI shows to the caregiver (transparency).
7. **Verified example:** the question "my mom keeps leaving the house at night, I'm scared she'll wander off" retrieved *Wandering*, *Sleep problems*, *Handling emergencies* and *Home safety*. The answer mentioned door alarms, night lights, GPS trackers and when to call emergency services, all from those articles.
8. **Pluggable generator:** the env var `ASSISTANT_MODEL_PROVIDER` picks Gemini (default) or the **fine-tuned model**. If the fine-tuned endpoint fails or doesn't answer within **25 s**, the app automatically falls back to Gemini for that request. Retrieval is the same in both cases.

## 8. Fine-tuning pipeline (self-trained model)

1. **Dataset generation** (`npm run gen:dataset`, `training/generate_dataset.ts`): Gemini turned each knowledge-base article into about 6 realistic caregiver Q&A pairs. A hand-written set of **"boundary" examples** was added, where the correct answer is to decline (e.g. a medication-dose question) and refer to a doctor. The data was shuffled and written as chat-format JSONL. **Result: 200 examples** (`training/dataset.jsonl`). Generation was rate-limited for the free tier and cached, so it could resume after interruptions.
2. **Training** (`training/finetune_colab.ipynb`, Google Colab, free T4 GPU):
   - Base model: `unsloth/Llama-3.2-3B-Instruct-bnb-4bit` (loaded in **4-bit**, i.e. QLoRA)
   - LoRA adapter: rank r=16, alpha=16, dropout 0, on attention and MLP projections (q, k, v, o, gate, up, down)
   - 90/10 train/eval split (seed 42), chat template applied to each example
   - SFTTrainer: 3 epochs, learning rate 2e-4, batch 2 × gradient accumulation 4 (effective batch 8), 10 warmup steps, AdamW 8-bit, linear schedule, weight decay 0.01, eval each epoch
   - Qualitative check on 3 test questions, including a dose-change question the model should decline
   - LoRA merged into the base weights (16-bit) and pushed to the Hugging Face Hub as `<username>/neura-care-assistant`
3. **Hosting** (`training/hf_space/`): Docker Space running **FastAPI + Transformers**, with endpoints `GET /health` and `POST /generate` (system prompt + history in, reply out), protected by an optional bearer token (`SPACE_TOKEN`).
4. **Integration:** set `ASSISTANT_MODEL_PROVIDER=finetuned`, `HF_SPACE_URL` and `HF_SPACE_TOKEN`, with automatic Gemini fallback.

**Status:** `[TO FILL by me: whether training finished, final training/eval loss, sample answers from cell 7, Space URL, typical response time, and whether the live app is using it]`.

## 9. Data model (MongoDB collections)

- **users**: id, name, email, phone, passwordHash, createdAt
- **patients**: id, userId (owner), caregiverIds[], name, age, gender, dementiaStage, notes, contacts[] (embedded: id, name, relationship, type Family/Friend, notes, photo), familyCount, friendsCount, quizLength, quizDifficulty, createdAt, updatedAt
- **medications**: id, userId, patientId, name, dosage, time, status (Taken/Pending)
- **appointments**: id, userId, patientId, title, type (Doctor/Therapy/Other), date, time, location, notes, status (Upcoming/Cancelled), createdAt
- **journalEntries**: id, userId, patientId, text, moodTag, createdAt
- **quizSessions**: id, userId, patientId, score, total, summary, createdAt
- **knowledgeChunks**: id, source, title, text, embedding (number[])

Relationships: User 1–N Patient (owner), Patient N–N User through `caregiverIds` (sharing), and Patient 1–N for medications, appointments, journal entries and quiz sessions. Contacts are embedded documents inside Patient.

## 10. Development, deployment challenges and testing

**Timeline (git history):** initial app and Docker setup (Jul 2026) → static quiz replaced by Gemini conversational check-in (Jul 2026) → Care Assistant with RAG, journal, appointments, settings and caregiver invites (Oct 2026) → deployment hardening (Oct 2026).

**Challenges solved (good material for a "Challenges & Solutions" section):**
1. **Database connectivity, three separate root causes found one after another:** (a) the developer's home network blocked the TLS handshake to MongoDB Atlas (confirmed with `openssl s_client`, outside the app); (b) on Vercel, `querySrv ENOTFOUND` because the serverless environment couldn't resolve `mongodb+srv` SRV DNS records, fixed by switching to the standard (non-SRV) connection string; (c) TLS "alert 80" failures caused by a known issue with some older free-tier Atlas clusters, fixed by provisioning a new cluster. Then a stale password was regenerated.
2. **`server-only` import guard crashed CLI scripts:** fixed by running scripts with `--conditions=react-server`.
3. **Serverless timeouts:** AI routes chain an embedding call, DB reads and generation, so `maxDuration = 60` s was set.
4. **Gemini reliability:** frequent `503 high demand` errors were handled by pinning a model version and adding **retry with linear backoff** (up to 4 attempts, 3 s, 6 s, 9 s). Free-tier `429 RESOURCE_EXHAUSTED` quota (about 20 requests/day on the primary model) was handled by **automatic failover to a second model** with its own quota (a free-tier stopgap; the real fix is a paid tier).
5. Landing/auth pages were made to render without waiting on JavaScript, and a co-caregiver patient lookup bug was fixed.

**Testing performed:** manual end-to-end testing over HTTP against the **live production deployment** with real test accounts (removed afterwards). Verified: signup/login/logout and sessions; onboarding; medications (add/list/mark taken); appointments (add/list/cancel); journal; settings; **multi-caregiver invite + join with shared data visible to both accounts**; PDF report generation (valid PDF); a full multi-turn quiz with scoring and the session saved to the dashboard, including a run entirely on the fallback model while the primary quota was exhausted; RAG Care Assistant retrieval and grounded answers.
**No automated unit/integration test suite exists.** Present testing as manual end-to-end/functional testing, and list automated tests as future work.

`[TO FILL by me: screenshots, any user feedback / usability testing with real caregivers, if done]`

## 11. Honesty notes, limitations and future work (please respect these)

State these accurately; don't overclaim:

- The cognitive check-in is **not clinically validated** and is not a diagnostic tool.
- The fine-tuning dataset is **synthetic** (generated by Gemini from curated articles), **not real caregiver data**. This is a normal, defensible approach for a small domain fine-tune and should be described that way.
- The fine-tuned model is meant to **demonstrate a self-trained, self-hosted alternative to a commercial API**, not to beat Gemini in quality. Free CPU hosting is slow (several seconds to about 30 s per reply) and the Space sleeps when idle, which is why Gemini fallback exists.
- Knowledge-base articles were curated/written for the project. `[TO FILL: original sources these were based on, e.g. Alzheimer's Association, NHS, Alzheimer's Society, for the references list]`.
- **Gemini free-tier limits** cap how much the app can be used per day. Production use needs billing enabled.
- **Password hashing uses salted SHA-256 (with a server secret)**, which is simpler than recommended slow hashes. Moving to bcrypt/Argon2 is future work. Sessions are stateless signed cookies (no server-side revocation).
- Retrieval compares against every article in application memory. That's fine for 33 articles but wouldn't scale. A vector index (e.g. MongoDB Atlas Vector Search) is future work.
- The local JSON store is for development only.
- **Not implemented / future work:** push, SMS or email medication reminders; offline support; automated test suite; formal usability study with caregivers; a patient-facing simplified mode; multilingual support; clinically validated assessment items; a vector database; a paid or GPU inference tier; stronger password hashing.
- **Ethics/privacy:** the app handles sensitive health-related information. Mention data minimisation, access control (only caregivers in `caregiverIds` can see a patient), the AI safety rules (no diagnosis/dosing), and showing sources for transparency. It is not certified as a medical device.

## 12. Suggested report structure

1. Title page, Declaration, Acknowledgements, Abstract (about 250 words)
2. **Introduction:** background on dementia caregiving, problem statement, aims & objectives, scope, report outline
3. **Literature Review / Background:** caregiver burden; existing caregiver apps (compare 3–4); LLMs in healthcare and their risks (hallucination); RAG; fine-tuning, LoRA/QLoRA; conversational cognitive assessment vs. standard tests (MMSE/MoCA)
4. **Requirements Analysis:** stakeholders, functional requirements (from SRS IDs), non-functional requirements, use-case diagram
5. **System Design:** architecture diagram, data model / ER diagram, API design, RAG pipeline diagram, quiz sequence diagram, UI design/wireframes
6. **Implementation:** tech stack justification, each module, AI components (quiz, RAG, fine-tuning pipeline), security
7. **Deployment:** Vercel, MongoDB Atlas, Hugging Face; challenges and solutions (Section 10)
8. **Testing & Evaluation:** functional test table (feature → steps → expected → actual → pass), AI qualitative evaluation (example Q&A, retrieval relevance, safety-refusal behaviour), fine-tuned vs. Gemini comparison if available
9. **Discussion:** achievements against objectives, limitations (Section 11), ethical considerations
10. **Conclusion & Future Work**
11. References, Appendices (SRS, prompts, dataset sample, notebook configuration, screenshots)
