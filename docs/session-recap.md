# Neura — what this project is, and what happened in this session

This file is a conceptual walkthrough, written for another AI assistant to read and then explain back to the project owner (a student finishing a final-year-project caregiver app). It covers: what the app is, how its three main systems work, what broke during deployment, how each thing was fixed, and what's still in progress. It is not a changelog of commands — it's meant to explain the *why* behind each piece.

## 1. What Neura is

Neura is a web app for family caregivers of dementia patients. A caregiver signs up, enters basic info about the patient they care for (name, age, dementia stage, family/friend contacts), and then gets a dashboard with:
- **Medication tracking** (mark doses taken/pending)
- **Appointments** (schedule, cancel)
- **A journal** (mood + notes about the patient's day)
- **A cognitive check-in "quiz"** — a short, gentle AI-led conversation that checks the patient's orientation/memory and scores it
- **A "Care Assistant" chatbot** — caregivers can ask it caregiving questions ("my mom keeps wandering at night, what do I do?") and it answers using a curated knowledge base, grounded in that specific patient's data
- **PDF care reports** — a summary export of medication adherence, quiz scores, appointments, and journal notes
- **Multi-caregiver sharing** — one caregiver can invite another (e.g. two siblings) to co-manage the same patient profile via an invite link/code

It's built with **Next.js** (React framework, runs both the frontend pages and the backend API routes in one codebase), hosted on **Vercel** (a platform that runs Next.js apps as serverless functions — each API request spins up a short-lived function rather than a server running 24/7), with **MongoDB Atlas** as the database (a cloud-hosted NoSQL database) and **Google's Gemini API** as the AI brain behind the quiz and the Care Assistant.

## 2. The three systems the user asked about: database, RAG, and chatbot

### 2a. The database (MongoDB Atlas)
Data (users, patients, medications, appointments, journal entries, quiz sessions, and the knowledge-base articles) lives in MongoDB Atlas, a managed cloud database. The app also has a **local fallback**: if no database connection string is configured, it reads/writes a JSON file on disk instead — this lets a developer run the app locally without setting up a real database, but it doesn't work on Vercel (whose filesystem is read-only), so production always needs the real database.

### 2b. The RAG pipeline (how the Care Assistant answers questions)
"RAG" = Retrieval-Augmented Generation. Instead of just asking an AI model a question and hoping it knows the answer, you first **retrieve** relevant source material, then hand that material to the AI as context so it answers *grounded in* real content instead of making things up. Here's how it's implemented:

1. **Knowledge base**: 33 short articles were written covering caregiving topics (wandering, sundowning, medication management, caregiver burnout, etc.) — see `scripts/knowledge-base.ts`.
2. **Embedding**: each article's text is converted into a numerical vector (a list of ~3000 numbers that captures its *meaning*) using Gemini's embedding model. This is done once, offline, via `npm run seed:kb`, and the vectors are stored alongside each article in the `knowledgeChunks` MongoDB collection.
3. **At question time**: when a caregiver asks the Care Assistant something, their question is also converted into the same kind of vector.
4. **Similarity search**: the app compares the question's vector to all 33 article vectors using "cosine similarity" (a measure of how pointed-in-the-same-direction two vectors are — closer to 1 means more semantically similar) and picks the top 4 most relevant articles.
5. **Grounded generation**: those 4 articles' text, plus the specific patient's live data (their medications, recent quiz scores, journal notes, upcoming appointments), get stitched into a prompt that's sent to Gemini along with instructions like "answer using only this information, and say so if it doesn't cover the question, and never give medical dosage advice." Gemini then writes the actual reply.
6. The API response also returns which articles it used, so the UI can show "sources" to the caregiver.

This was tested end-to-end this session and confirmed working: asking "my mom keeps leaving the house at night, I'm scared she'll wander off" correctly retrieved the *Wandering*, *Sleep problems*, *Handling emergencies*, and *Home safety* articles, and the generated answer was genuinely grounded in them (mentioned door alarms, night lights, GPS trackers, when to call emergency services) rather than being generic AI filler.

### 2c. The chatbot (Gemini-powered quiz and Care Assistant)
Both the quiz and the Care Assistant are powered by Google's **Gemini API** — a cloud LLM (large language model) service you call over the internet with an API key, rather than running a model yourself. The quiz gives Gemini a system instruction describing the patient and asks it to conduct a short, warm, conversational memory check-in, one question at a time, and grade it at the end. The Care Assistant gives Gemini the RAG context described above plus a question, and gets back a grounded answer.

There's also a secondary, optional path: a **fine-tuned model** (a smaller open-source model, Llama-3.2-3B, trained specifically on this app's caregiving Q&A style using a technique called LoRA, hosted for free on Hugging Face). This is meant to replace Gemini as a self-trained alternative, with automatic fallback to Gemini if it's unavailable. As of this session, the training dataset (`training/dataset.jsonl`, 199 examples) is generated, but the actual Colab training + Hugging Face hosting steps are still in progress — the user is doing those now.

## 3. What went wrong in production, and how each thing was diagnosed and fixed

This is the bulk of what happened this session: getting a mostly-finished codebase (built in earlier sessions, sitting uncommitted) from "works on my machine, sort of" to "actually deployed and functioning for a real user."

### Problem 1: Weeks of work were never committed to git
The entire RAG system, Care Assistant, journal/appointments/settings/invite features existed only as uncommitted files on the user's laptop — `origin/main` on GitHub was weeks behind. If deployed via Vercel's normal GitHub integration, none of it would have shipped. **Fix**: committed and pushed everything.

### Problem 2: No Vercel project existed yet
**Fix**: used the Vercel CLI (`vercel link`) to create a project and connect it to the GitHub repo for auto-deploys on push.

### Problem 3: MongoDB wouldn't connect — three separate causes, found one at a time
This was the longest thread. Each fix revealed the *next* problem underneath it, which is worth understanding because it wasn't one bug, it was three:

1. **The user's home network was blocking the TLS handshake to MongoDB Atlas** entirely (confirmed by testing raw TLS with `openssl s_client`, bypassing all app code — it failed identically to the app's own error). This is why the database had been disabled in local dev for weeks.
2. Once deployed to Vercel (a different network, not subject to the home-network block), a **different** error appeared: `querySrv ENOTFOUND`. MongoDB's standard connection string format (`mongodb+srv://...`) requires a special kind of DNS lookup (an "SRV record") to find the actual database servers. Some serverless environments can't perform that specific kind of DNS lookup. **Fix**: switched to the "standard" connection string format, which lists the three actual server addresses directly and skips the SRV lookup.
3. With that DNS problem solved, yet *another* error appeared: the same `SSL alert number 80` TLS failure as the original home-network block — but now reproducible from Vercel's servers too, and even by calling MongoDB directly with no app code involved. Research into MongoDB's own community forums confirmed this is a known issue: **free-tier (M0) Atlas clusters sometimes have an outdated TLS implementation** that fails against modern clients, independent of network or IP allow-list settings. **Fix**: deleted the broken free cluster and created a brand new one (also free tier), which provisions on current infrastructure and doesn't have the bug.

After that, one real authentication mistake (a stale/un-saved database password) caused one more round of `bad auth` errors, fixed by regenerating the password properly.

### Problem 4: Seed/dataset scripts crashed outside of Next.js
`lib/db.ts`, `lib/mongodb.ts`, and `lib/embeddings.ts` all start with `import "server-only"` — a safety marker meaning "this code must only run in a Next.js server component, never in a browser." That marker only resolves correctly when Next.js's own bundler is involved; running the same file via a plain script runner (`tsx`) always hit its hard-coded error. **Fix**: added `--conditions=react-server` to the script commands, which tells Node.js to resolve `server-only` the same way Next.js does.

### Problem 5: The AI routes had no timeout override
Vercel serverless functions have a default execution time limit, and an embedding call + database reads + an AI generation call in sequence can exceed it, especially if Gemini is slow. **Fix**: added `export const maxDuration = 60` (seconds) to both AI-calling routes.

### Problem 6: Gemini itself turned out to be unreliable in two different ways
1. The model originally used (`gemini-flash-latest`) was returning frequent `503 "high demand"` errors for anything beyond a trivial prompt — confirmed by calling it directly, independent of Vercel, so it wasn't a deployment issue. **Fix**: pinned to a specific current model (`gemini-3.8-flash`) and added automatic retry-with-backoff for these "usually temporary" errors (Google's own wording), since a production app should gracefully retry a flaky upstream API rather than failing outright.
2. During thorough testing, a **second, more serious problem** surfaced: a `429 RESOURCE_EXHAUSTED` quota error. The free Gemini API tier caps `gemini-3.8-flash` at just **20 requests per day** — a hard ceiling that one real user's single session could realistically hit. This is not something retrying fixes. **Fix (partial)**: added a fallback to a second model (`gemini-flash-lite-latest`) with its own separate quota, so the app degrades gracefully instead of hard-failing when the primary quota runs out. This was verified working — a full quiz conversation completed successfully entirely on the fallback model while the primary was exhausted. **This is a stopgap, not a real fix** — the actual fix, which the user has deferred to later, is enabling billing on the Gemini API key, which removes the tiny free-tier caps for a small per-request cost.

## 4. What was verified working, end-to-end, against the real production deployment

Not just "the code looks right" — each of these was actually exercised over HTTP against the live site with real test accounts (all cleaned up afterward):
- Signup, login, logout, session handling
- Onboarding (creating a patient profile)
- Medications: add, list, mark taken
- Appointments: add, list, cancel
- Journal: add, list
- Settings: viewing account/patient/caregiver info
- **Multi-caregiver sharing**: one account generates an invite code, a second account joins via it, and both correctly see the same shared patient data
- PDF report generation (downloaded and confirmed as a valid PDF)
- The full AI quiz conversation (multiple turns, correct scoring, session saved to the dashboard)
- The RAG-powered Care Assistant (correct retrieval of relevant articles + grounded, safety-conscious answer)

## 5. What's still open

- **Enabling billing on the Gemini API key** — deferred by the user for later, but necessary before this could handle real multi-user traffic without hitting the free quota.
- **The fine-tuned model** — dataset is ready; the user is currently going through Colab (training) and will then set up a Hugging Face Space (hosting). Once that's done, three environment variables need to be set in Vercel (`ASSISTANT_MODEL_PROVIDER=finetuned`, `HF_SPACE_URL`, `HF_SPACE_TOKEN`) to switch the Care Assistant over to it, with automatic fallback to Gemini if that model's endpoint is ever unreachable.

## 6. Key files, for reference

- `lib/db.ts` / `lib/mongodb.ts` — database access layer (with the local-JSON-file fallback for offline dev)
- `lib/embeddings.ts` — turns text into vectors via Gemini's embedding model
- `lib/gemini.ts` — all the Gemini chat calls (quiz + assistant), including the retry and quota-fallback logic
- `lib/finetuned-model.ts` — calls the (optional) self-hosted fine-tuned model
- `scripts/knowledge-base.ts` / `scripts/seed-knowledge-base.ts` — the 33 source articles and the script that embeds + uploads them
- `app/api/assistant/chat/route.ts` — the RAG retrieval + grounded chat endpoint
- `app/api/chat/quiz/route.ts` — the cognitive check-in endpoint
- `training/` — the fine-tuning dataset, Colab notebook, and Hugging Face Space files
