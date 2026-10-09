# Software Requirements Specification

## Neura — An AI-Assisted Care Companion for Dementia Caregivers

Version 1.0
Prepared for: Final Year Project
Date: 2026-08-29

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of
**Neura**, a web application that helps family caregivers manage the daily
and cognitive care of a relative living with dementia. It is intended for
the project supervisor/evaluators, and for any developer extending the
system after this project concludes. It follows the general structure of an
IEEE 830-style SRS, adapted to the scope of a final year project.

### 1.2 Scope
Neura is a browser-based application, built with Next.js, that provides a
single caregiver-facing account model in which one or more caregivers share
responsibility for one patient. The system will:

- Let a caregiver register, authenticate, and configure a patient profile.
- Track medications, appointments, and free-text/mood journal entries for
  the patient.
- Run a conversational, AI-generated cognitive check-in ("quiz") that the
  patient answers in their own words.
- Provide a retrieval-augmented-generation (RAG) chatbot, the **Care
  Assistant**, that answers the caregiver's questions using a curated
  dementia-caregiving knowledge base combined with the specific patient's
  live care data.
- Allow a caregiver to invite co-caregivers (e.g. siblings) to the same
  patient profile via a shareable, expiring link.
- Summarize care activity into a downloadable PDF report.
- Optionally serve Care Assistant replies from a fine-tuned open-source
  language model hosted by the project team, as an alternative to the
  commercial Gemini API, to demonstrate an end-to-end fine-tuning pipeline.

Out of scope: clinical diagnosis, medication dosing decisions, emergency/
crisis response, and any regulated medical-device functionality. The system
explicitly directs users to a licensed physician for medical decisions.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Meaning |
|---|---|
| Caregiver | The registered user of the application; a family member or carer managing a patient's care. |
| Patient | The person living with dementia the caregiver is caring for. Does not hold a login account. |
| RAG | Retrieval-Augmented Generation — generating an AI response grounded in retrieved reference text rather than the model's unguided output. |
| LLM | Large Language Model. |
| Knowledge chunk | One curated article (or a slice of one) in the caregiving knowledge base, stored with a pre-computed embedding vector. |
| Embedding | A numeric vector representation of text used to measure semantic similarity. |
| Invite code | A signed, time-limited token that grants a second caregiver account access to an existing patient profile. |
| LoRA | Low-Rank Adaptation — a parameter-efficient fine-tuning technique. |
| HF Space | A Hugging Face Space; a hosted container used here to serve the fine-tuned model. |

### 1.4 References
- Google Gemini API documentation (`@google/genai`)
- Hugging Face Spaces documentation (Docker SDK)
- Unsloth / LoRA fine-tuning documentation for Llama-3.2-3B-Instruct
- MongoDB Atlas documentation
- Next.js (App Router) documentation

### 1.5 Overview
Section 2 describes the product context, users, and constraints at a high
level. Section 3 lists detailed functional requirements grouped by module.
Section 4 covers external interface requirements. Section 5 covers
non-functional requirements. Section 6 describes the data model. Section 7
lists assumptions, dependencies, and known limitations.

---

## 2. Overall Description

### 2.1 Product Perspective
Neura is a new, self-contained system rather than an extension of an
existing product. It is a server-rendered Next.js application with:

- A relational-style document data layer, implemented against two
  interchangeable backends behind one interface: MongoDB Atlas (used
  whenever a connection string is configured, intended for deployment) and
  a local JSON file store (used automatically when no database is
  configured, intended for local development and demonstration without
  external setup).
- Two integrated AI subsystems: a generative quiz engine and a
  retrieval-augmented chatbot, both backed primarily by Google's Gemini
  API, with a self-hosted fine-tuned model available as a swappable
  alternative backend for the chatbot.

### 2.2 Product Functions (Summary)
1. Caregiver account registration and authentication.
2. Patient profile onboarding (demographics, dementia stage, contacts,
   quiz configuration).
3. Co-caregiver invitation and shared access to one patient profile.
4. Medication list management and adherence tracking.
5. Appointment scheduling and tracking.
6. Caregiver journal with mood tagging.
7. Dashboard summarizing quiz performance, medication adherence, mood
   trend, and upcoming appointments.
8. AI-generated conversational cognitive check-in for the patient, with
   automatic scoring and a caregiver-facing summary.
9. AI-powered Care Assistant chatbot for the caregiver, grounded in a
   curated knowledge base and the patient's live care data.
10. PDF care report generation for sharing with a physician or family.
11. Account/patient settings management.

### 2.3 User Characteristics
- **Caregivers** are assumed to be non-technical adults, often under time
  pressure or emotional strain, who need a low-friction interface with
  large, legible text and minimal steps per task. They are the only users
  who authenticate.
- **Patients** never log in. They interact only through the cognitive
  quiz's conversational interface, which must therefore use short, plain,
  non-multiple-choice, large-print-friendly language and avoid questions
  that could confuse, upset, or embarrass them.
- Caregivers are assumed to have basic familiarity with using a web
  browser on a desktop or mobile device, but not with technical
  configuration.

### 2.4 Constraints
- Password hashing uses a single server-side secret with SHA-256 (no
  per-user salt) rather than a dedicated slow hash (e.g. bcrypt/argon2);
  this is an accepted constraint for a project of this scope, not a
  production-security claim.
- Session identity is carried in an HMAC-signed cookie rather than an
  encrypted token or server-side session store.
- The system depends on a third-party LLM API (Gemini) for two core
  features (quiz generation, assistant replies, and embeddings); an outage
  or missing API key disables those features.
- The optional self-hosted fine-tuned model runs on a free-tier Hugging
  Face Space, which sleeps after inactivity and is limited to CPU
  inference, so response latency for that path is materially higher than
  the Gemini path.
- AI response safety is enforced through system-prompt instructions to the
  model (e.g. "never provide a diagnosis"), not through a separate
  automated content-moderation layer.

### 2.5 Assumptions and Dependencies
- Each caregiver account is associated with at most one patient profile at
  a time.
- A valid Gemini API key is available in the deployment environment.
- If MongoDB is not configured, the application is assumed to be running
  in a single-instance local/demo context, since the JSON file store is
  not safe for concurrent multi-instance access and does not function on
  read-only production filesystems.
- Users have a reasonably modern browser with JavaScript enabled.

---

## 3. Specific Requirements — Functional

Each requirement is identified as FR-<module>-<number> and includes a
priority: **Must** (core to the project's evaluation), **Should**, or
**Could**.

### 3.1 Authentication (AUTH)
- **FR-AUTH-1 (Must)**: The system shall allow a new user to register with
  name, email, phone, and password, rejecting registration if the email is
  already in use.
- **FR-AUTH-2 (Must)**: The system shall allow a registered user to log in
  with email and password and establish a signed session cookie valid for
  7 days.
- **FR-AUTH-3 (Must)**: The system shall allow a logged-in user to log out,
  invalidating their session cookie.
- **FR-AUTH-4 (Must)**: The system shall reject access to any authenticated
  page or API route when no valid session is present, redirecting to the
  login page or returning HTTP 401 as appropriate.
- **FR-AUTH-5 (Should)**: The system shall expose the current user's basic
  profile (id, name, email, phone) to the frontend via a "current user"
  endpoint.

### 3.2 Onboarding & Patient Profile (ONB)
- **FR-ONB-1 (Must)**: The system shall allow a caregiver without an
  existing patient profile to create one by supplying the patient's name,
  age, gender, dementia stage, and optional notes.
- **FR-ONB-2 (Must)**: The system shall allow the caregiver to add one or
  more contacts (family or friends) for the patient, each with a name,
  relationship, type, optional notes, and an optional photo.
- **FR-ONB-3 (Must)**: The system shall allow the caregiver to configure
  the number of questions (3–20) and difficulty level for the cognitive
  check-in quiz.
- **FR-ONB-4 (Must)**: The system shall derive and store the family-member
  and friend counts from the submitted contact list rather than accepting
  them as separate input, so the counts cannot desynchronize from the
  actual contacts.
- **FR-ONB-5 (Should)**: On first creation of a patient profile, the
  system shall seed three default medications so the dashboard and
  medication list are populated for demonstration purposes.
- **FR-ONB-6 (Must)**: The system shall allow a caregiver to re-submit the
  onboarding form to update an existing patient profile's details.

### 3.3 Multi-Caregiver Sharing (SHARE)
- **FR-SHARE-1 (Must)**: The system shall allow any caregiver already
  attached to a patient to generate a shareable invite link.
- **FR-SHARE-2 (Must)**: An invite link shall encode the target patient and
  a timestamp, be cryptographically signed, and expire 7 days after
  creation.
- **FR-SHARE-3 (Must)**: The system shall allow a logged-in caregiver
  without an existing patient profile to redeem a valid, unexpired invite
  link and be added to that patient's list of caregivers.
- **FR-SHARE-4 (Must)**: The system shall reject an invite redemption if
  the code is missing, invalid, forged, or expired.
- **FR-SHARE-5 (Must)**: The system shall reject an invite redemption if
  the redeeming caregiver already has a different patient profile.
- **FR-SHARE-6 (Must)**: Every caregiver attached to a patient shall have
  equal read/write access to that patient's medications, appointments,
  journal entries, quiz sessions, and Care Assistant conversations.

### 3.4 Medication Tracking (MED)
- **FR-MED-1 (Must)**: The system shall allow a caregiver to add a
  medication with name, dosage, and scheduled time.
- **FR-MED-2 (Must)**: The system shall allow a caregiver to mark a
  medication as "Taken" or "Pending".
- **FR-MED-3 (Must)**: The system shall list all medications for the
  current patient.
- **FR-MED-4 (Should)**: The system shall allow a caregiver to delete a
  medication entry.

### 3.5 Appointments (APPT)
- **FR-APPT-1 (Must)**: The system shall allow a caregiver to create an
  appointment with title, type (Doctor/Therapy/Other), date, time, and
  optional location and notes.
- **FR-APPT-2 (Must)**: The system shall list appointments for the current
  patient, distinguishing upcoming from cancelled.
- **FR-APPT-3 (Should)**: The system shall allow a caregiver to cancel an
  appointment.
- **FR-APPT-4 (Must)**: The dashboard shall surface the soonest upcoming
  appointments (up to 3).

### 3.6 Caregiver Journal (JRNL)
- **FR-JRNL-1 (Must)**: The system shall allow a caregiver to record a
  journal entry consisting of free text and/or a mood tag (Calm, Anxious,
  Confused, Happy, Tired).
- **FR-JRNL-2 (Must)**: The system shall list journal entries for the
  current patient in reverse-chronological order.
- **FR-JRNL-3 (Must)**: The most recent mood-tagged entries shall be
  available to the dashboard for mood-trend visualization.

### 3.7 Dashboard (DASH)
- **FR-DASH-1 (Must)**: The system shall display the patient's latest quiz
  score as a percentage.
- **FR-DASH-2 (Must)**: The system shall display medication adherence as a
  taken/total count.
- **FR-DASH-3 (Must)**: The system shall display the total number of
  completed quiz sessions.
- **FR-DASH-4 (Must)**: The system shall display the count of upcoming
  appointments.
- **FR-DASH-5 (Should)**: The system shall render a trend chart of the
  patient's last 7 quiz scores (or representative sample data if fewer
  than 7 sessions exist).
- **FR-DASH-6 (Should)**: The system shall render a mood trend chart
  derived from the patient's recent mood-tagged journal entries.
- **FR-DASH-7 (Should)**: The system shall display short notification-style
  summaries for pending medication, latest quiz result, and the next
  appointment.

### 3.8 Cognitive Check-In Quiz (QUIZ)
- **FR-QUIZ-1 (Must)**: The system shall generate a conversational
  cognitive check-in for the patient using an LLM, consisting of the
  configured number of questions, delivered one at a time.
- **FR-QUIZ-2 (Must)**: Quiz questions shall be limited to orientation
  (day/time/season), recall of the patient's named contacts, daily
  routine, and simple recognition, and shall exclude medical, upsetting,
  or embarrassing content.
- **FR-QUIZ-3 (Must)**: Questions shall be open-ended (free-text answer),
  not multiple-choice, and phrased in short, plain, large-print-friendly
  language.
- **FR-QUIZ-4 (Must)**: After the final question is answered, the system
  shall produce an integer score out of the total questions, grading
  charitably for partial or approximately-correct answers, plus a short
  caregiver-facing summary of how the check-in went.
- **FR-QUIZ-5 (Must)**: The system shall persist each completed quiz
  session (score, total, summary, timestamp) against the patient.
- **FR-QUIZ-6 (Must)**: If the underlying AI service is unavailable, the
  system shall return a clear error rather than a malformed or partial
  quiz.

### 3.9 Care Assistant Chatbot (CARE)
- **FR-CARE-1 (Must)**: The system shall provide a chat interface where
  the caregiver can ask free-text questions about dementia caregiving.
- **FR-CARE-2 (Must)**: The system shall retrieve the most relevant
  entries from a curated caregiving knowledge base using semantic
  (embedding-based) similarity search, using recent conversation context
  (not only the latest message) to resolve follow-up/pronoun-heavy
  questions.
- **FR-CARE-3 (Must)**: The system shall ground each reply in both the
  retrieved knowledge-base excerpts and the current patient's live care
  data: active medications, recent quiz session results, recent journal
  notes, and upcoming appointments.
- **FR-CARE-4 (Must)**: The system shall instruct the underlying model to
  decline to provide a medical diagnosis or recommend a medication dosage
  change, redirecting such questions to the patient's doctor.
- **FR-CARE-5 (Must)**: The system shall instruct the underlying model to
  state when the knowledge base does not cover a question rather than
  fabricating an answer.
- **FR-CARE-6 (Should)**: The system shall return the titles/sources of
  the knowledge-base excerpts used to generate each reply, alongside the
  reply text.
- **FR-CARE-7 (Should)**: The system shall support switching the
  reply-generation backend between the commercial Gemini API and a
  self-hosted fine-tuned model via configuration, without changing the
  retrieval or grounding behavior.
- **FR-CARE-8 (Must)**: If the configured fine-tuned model backend is
  unreachable or times out, the system shall automatically fall back to
  the Gemini backend for that request rather than failing outright.
- **FR-CARE-9 (Must)**: If no AI backend is reachable, the system shall
  return a clear error rather than an empty or malformed reply.

### 3.10 Care Report Export (RPT)
- **FR-RPT-1 (Must)**: The system shall generate a downloadable PDF report
  for the current patient containing: medication adherence, the most
  recent cognitive check-in scores, upcoming appointments, and recent
  caregiver journal notes.
- **FR-RPT-2 (Should)**: The report shall include the patient's name, age,
  dementia stage, and the report generation timestamp.

### 3.11 Settings (SET)
- **FR-SET-1 (Must)**: The system shall display the current caregiver's
  account information.
- **FR-SET-2 (Must)**: The system shall list all caregivers currently
  attached to the patient profile.

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- A responsive, browser-based UI covering: landing page, sign up, log in,
  onboarding wizard, dashboard, medications, appointments, journal,
  cognitive quiz chat, Care Assistant chat, settings, and invite-join flow.
- The cognitive quiz interface (patient-facing) shall use large,
  high-contrast, minimal-clutter text suitable for a user with cognitive
  impairment.
- The dashboard and other caregiver-facing views shall use standard
  responsive layouts suitable for desktop and mobile browsers.

### 4.2 Software Interfaces
- **Google Gemini API** (`@google/genai`): text generation for the
  cognitive quiz and Care Assistant, and text embeddings for retrieval.
  Requires a `GEMINI_API_KEY`.
- **MongoDB Atlas**: primary production data store, connected via
  `MONGODB_URI`/`MONGODB_DB`. A local JSON file is used as a drop-in
  substitute when these are not configured.
- **Hugging Face Space (optional)**: HTTP endpoint (`/generate`) serving
  the self-hosted fine-tuned model, configured via `HF_SPACE_URL` and
  optionally authenticated with `HF_SPACE_TOKEN`.

### 4.3 Communications Interfaces
- All client-server communication occurs over HTTPS in production, using
  standard HTTP request/response semantics (JSON payloads, one PDF binary
  download endpoint).

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **NFR-PERF-1**: Dashboard and CRUD pages should load their primary data
  within 2 seconds under normal network conditions, excluding first-load
  JS bundle transfer.
- **NFR-PERF-2**: Care Assistant and quiz responses depend on third-party
  LLM latency; the system should surface a loading indicator for any AI
  response expected to take longer than 1 second.
- **NFR-PERF-3**: When the fine-tuned model backend is selected and its
  host is asleep or slow, the system should time out and fall back to the
  Gemini backend within approximately 25 seconds rather than leaving the
  user waiting indefinitely.

### 5.2 Security
- **NFR-SEC-1**: Session cookies shall be `httpOnly`, `sameSite=lax`, and
  `secure` in production, to reduce exposure to XSS-based token theft and
  cross-site cookie leakage.
- **NFR-SEC-2**: Session and invite tokens shall be integrity-protected
  with an HMAC signature verified using constant-time comparison, to
  resist forgery and timing attacks.
- **NFR-SEC-3**: Invite links shall expire after a bounded time window (7
  days) to limit the blast radius of a leaked link.
- **NFR-SEC-4**: A given caregiver account shall never be able to access
  medications, appointments, journal entries, or quiz sessions belonging
  to a patient they are not listed as a caregiver for.
- **NFR-SEC-5 (Known limitation, documented rather than resolved)**:
  Password hashing uses SHA-256 with a shared server secret rather than a
  per-user-salted slow hash; this is acceptable for the project's
  evaluation context but should be flagged as a future hardening item.

### 5.3 Reliability & Availability
- **NFR-REL-1**: Failure of an AI backend (Gemini or the fine-tuned model)
  shall degrade gracefully — the affected feature (quiz or assistant)
  shall return a clear error message rather than crashing the page or
  corrupting stored data.
- **NFR-REL-2**: Data writes (medications, appointments, journal entries,
  quiz sessions) shall not be lost due to a transient AI-service failure,
  since those operations are independent of the AI call path.

### 5.4 Usability
- **NFR-USE-1**: All patient-facing cognitive quiz text shall avoid jargon,
  use short sentences, and avoid multiple-choice formatting, in line with
  accessibility norms for users with cognitive impairment.
- **NFR-USE-2**: Error messages returned by API routes shall be
  human-readable and actionable (e.g. "Complete onboarding first." rather
  than a raw stack trace or status code).

### 5.5 Maintainability & Portability
- **NFR-MAINT-1**: The data-access layer shall expose a single interface
  regardless of storage backend (MongoDB or local JSON file), so that
  switching backends requires no changes to API route logic.
- **NFR-MAINT-2**: The Care Assistant's reply-generation backend
  (Gemini vs. fine-tuned model) shall be selectable via configuration
  without code changes to the retrieval/grounding pipeline.

### 5.6 Ethical / Safety Requirements
- **NFR-ETH-1**: The Care Assistant shall not present itself as a
  substitute for professional medical advice and shall explicitly redirect
  medical-decision questions (diagnosis, dosage changes) to the patient's
  doctor.
- **NFR-ETH-2**: The cognitive quiz shall be designed to avoid causing
  distress or embarrassment to the patient, excluding questions that risk
  highlighting memory loss in a upsetting way.
- **NFR-ETH-3**: The knowledge base and any fine-tuning dataset derived
  from it shall be clearly documented as being based on general public
  caregiving guidance (and, for the fine-tuning dataset, synthetically
  generated), not real patient data, to avoid misrepresenting the system's
  evidentiary basis.

---

## 6. Data Model

The system's core entities and their relationships:

- **User** (caregiver account): id, name, email, phone, passwordHash,
  createdAt.
- **Patient**: id, creating userId, `caregiverIds[]` (all caregivers with
  access — enables multi-caregiver sharing), name, age, gender,
  dementiaStage, notes, `contacts[]`, familyCount, friendsCount,
  quizLength, quizDifficulty, createdAt, updatedAt.
- **Contact**: id, name, relationship, type (Family/Friend), notes, photo.
  Embedded within a Patient.
- **Medication**: id, userId, patientId, name, dosage, time, status
  (Taken/Pending).
- **QuizSession**: id, userId, patientId, score, total, summary,
  createdAt.
- **Appointment**: id, userId, patientId, title, type
  (Doctor/Therapy/Other), date, time, location, notes, status
  (Upcoming/Cancelled), createdAt.
- **JournalEntry**: id, userId, patientId, text, moodTag (Calm/Anxious/
  Confused/Happy/Tired), createdAt.
- **KnowledgeChunk**: id, source, title, text, embedding (vector). Not
  patient-specific; shared read-only reference data for the Care
  Assistant's retrieval step.

All patient-scoped entities (Medication, QuizSession, Appointment,
JournalEntry) are keyed by `patientId`, and access is authorized by
checking that the requesting user's id appears in that patient's
`caregiverIds[]` — this is the mechanism that makes multi-caregiver sharing
and per-patient data isolation work simultaneously.

---

## 7. Assumptions, Dependencies, and Known Limitations

- The project assumes access to a Google Gemini API key for development
  and evaluation; the free tier's rate limits directly bound how much
  interactive AI testing (and dataset generation) can be done per day.
- The optional fine-tuned model path assumes access to a free Google Colab
  GPU runtime and a Hugging Face account; its purpose in this project is
  to demonstrate an end-to-end fine-tuning and self-hosting pipeline as an
  alternative to a commercial API, not to outperform Gemini in quality.
- The fine-tuning dataset is synthetically generated from the curated
  knowledge base by Gemini, not collected from real caregivers; this is
  documented as an accepted, defensible approach for a domain-specific
  small-model fine-tune within an academic project, and should be
  presented as such rather than as real-world data.
- The local JSON-file data store is a development/demo convenience only;
  it is not safe under concurrent access and does not work on read-only
  production filesystems (e.g. Vercel), which is why MongoDB is required
  for any deployed instance.
- The system does not implement push notifications, SMS/email reminders,
  or offline support; these are natural future-work extensions but are
  outside the current scope.
