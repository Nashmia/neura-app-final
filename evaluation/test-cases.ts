/**
 * Care Assistant evaluation test set (43 cases: 28 easy + 15 hard).
 * p07 was a known limitation in Phase 1 (past "Upcoming" appointments were listed); fixed in Phase 2.
 *
 * - expectedSources: knowledge-base `source` ids; retrieval counts as a hit if ANY of them is in the top K.
 * - expectedFacts: strings that must appear in the patient-context text the route would build from
 *   fixtures/synthetic-patient.json (checked without any API call).
 * - forbiddenFacts: strings that must NOT appear in that patient context.
 * - knownLimitation: set when the test is expected to fail because of a documented limit of the current
 *   pipeline (see the audit); the report labels these failures separately.
 * - expectedBehaviour: what a good answer does — guidance for the human scorer (see RUBRIC.md).
 * - answerSubset: included in the default `--answers` run (max 5 generation calls).
 * - difficulty: "hard" marks the h-cases, written the way a stressed caregiver types (vague, no article
 *   keywords, misspellings, two topics, emotional context). They were drafted BEFORE looking at the article
 *   titles and labelled afterwards. Unmarked cases are "easy" (written knowing the titles). Reported separately.
 * - requireAllSources: retrieval passes only if EVERY expected source is in the top K (two-topic messages).
 *   Otherwise any one expected source is enough.
 */

export type Turn = { role: "user" | "model"; text: string };

export type Category =
  | "knowledge"
  | "knowledge-multi"
  | "follow-up"
  | "mood"
  | "medication"
  | "appointments"
  | "quiz-progress"
  | "insufficient-info";

export type TestCase = {
  id: string;
  category: Category;
  history: Turn[];
  expectedSources?: string[];
  expectedFacts?: string[];
  forbiddenFacts?: string[];
  knownLimitation?: string;
  expectedBehaviour: string;
  answerSubset?: boolean;
  difficulty?: "easy" | "hard";
  requireAllSources?: boolean;
};

const ask = (text: string): Turn[] => [{ role: "user", text }];

export const testCases: TestCase[] = [
  // ── General dementia-care knowledge ───────────────────────────────────────────
  { id: "k01", category: "knowledge", history: ask("My mother keeps asking me what day it is every few minutes. How should I respond?"), expectedSources: ["repeated-questions"], expectedBehaviour: "Answer calmly each time, address the underlying anxiety, suggest a visible clock/whiteboard; grounded in the repeated-questions article.", answerSubset: true },
  { id: "k02", category: "knowledge", history: ask("Every evening around 5pm my dad gets restless and confused. Why does this happen and what helps?"), expectedSources: ["sundowning"], expectedBehaviour: "Explains sundowning; routine, daytime light, calm evening environment, redirection." },
  { id: "k03", category: "knowledge", history: ask("She refuses to take a shower and gets really upset whenever I bring it up."), expectedSources: ["bathing-hygiene"], expectedBehaviour: "Practical bathing-resistance tips from the bathing article; no shaming." },
  { id: "k04", category: "knowledge", history: ask("He insists on driving to the shops but I'm worried it isn't safe for him anymore."), expectedSources: ["driving-safety"], expectedBehaviour: "Warning signs, involving the doctor, alternatives to driving." },
  { id: "k05", category: "knowledge", history: ask("I'm exhausted and irritable and haven't slept properly in weeks from looking after my husband."), expectedSources: ["caregiver-burnout", "respite-care"], expectedBehaviour: "Recognises burnout, self-care, respite options; supportive tone." },
  { id: "k06", category: "knowledge", history: ask("My father says he sees strangers sitting in the living room who aren't there."), expectedSources: ["hallucinations-delusions"], expectedBehaviour: "Don't argue, reassure, check environment, mention telling the doctor." },
  { id: "k07", category: "knowledge", history: ask("She accuses me of stealing her purse whenever she misplaces it."), expectedSources: ["paranoia-accusations"], expectedBehaviour: "Don't take it personally, help look, keep spares; from the paranoia article." },
  { id: "k08", category: "knowledge", history: ask("Should we sort out power of attorney now while she can still take part in the decisions?"), expectedSources: ["legal-financial-planning"], expectedBehaviour: "Encourages early legal/financial planning; suggests professional advice." },
  { id: "k09", category: "knowledge", history: ask("How do I explain grandpa's memory problems to my 8-year-old?"), expectedSources: ["talking-to-children"], expectedBehaviour: "Age-appropriate honesty, reassurance, ways for the child to connect." },
  { id: "k10", category: "knowledge", history: ask("What should I bring or prepare before the neurologist visit?"), expectedSources: ["doctor-appointment-prep"], expectedBehaviour: "Symptom notes, medication list, questions list; may mention the upcoming Neurologist follow-up from patient data." },

  // ── Questions spanning more than one article ─────────────────────────────────
  { id: "m01", category: "knowledge-multi", history: ask("She wanders around the house at night and I'm scared she'll get out of the front door."), expectedSources: ["wandering", "sleep-problems", "home-safety"], expectedBehaviour: "Door alarms/locks, night routine, safety; combines wandering and night-time advice." },
  { id: "m02", category: "knowledge-multi", history: ask("He's losing weight and doesn't finish his meals anymore."), expectedSources: ["mealtime-challenges", "nutrition-hydration"], expectedBehaviour: "Mealtime strategies and nutrition; suggests the doctor for weight loss." },

  // ── Multi-turn follow-ups (retrieval uses the last 4 turns joined, as the route does) ─
  { id: "f01", category: "follow-up", history: [
    { role: "user", text: "My mum keeps asking the same question over and over." },
    { role: "model", text: "That's very common. Answering calmly each time helps, and a whiteboard with key information in a shared space can reduce how often she needs to ask." },
    { role: "user", text: "What should I write on it?" },
  ], expectedSources: ["repeated-questions"], expectedBehaviour: "Understands 'it' = the whiteboard; suggests day/date, plans, who is visiting." },
  { id: "f02", category: "follow-up", history: [
    { role: "user", text: "My husband gets agitated in the late afternoon." },
    { role: "model", text: "That may be sundowning, which often appears later in the day as light fades and tiredness builds." },
    { role: "user", text: "Would changing the lighting help?" },
  ], expectedSources: ["sundowning"], expectedBehaviour: "Yes: good daytime light, well-lit calm evenings; grounded in sundowning article." },
  { id: "f03", category: "follow-up", history: [
    { role: "user", text: "Dad had a fall in the bathroom yesterday." },
    { role: "model", text: "I'm sorry to hear that. Was he hurt?" },
    { role: "user", text: "No, but what changes can I make so it doesn't happen again?" },
  ], expectedSources: ["home-safety"], expectedBehaviour: "Grab bars, non-slip mats, lighting, clutter removal." },

  // ── Mood trends (patient data) ──────────────────────────────────────────────
  { id: "p01", category: "mood", history: ask("How has her mood been over the last few days?"), expectedFacts: ["mood: Anxious", "mood: Calm", "mood: Tired", "mood: Confused", "mood: Happy"], expectedBehaviour: "Summarises the recent mix of moods from the journal (anxious after dinner, calm with photos, etc.) without inventing entries.", answerSubset: true },
  { id: "p02", category: "mood", history: ask("Was there anything that seemed to calm her down recently?"), expectedFacts: ["old photo albums"], expectedBehaviour: "Mentions the photo albums with Priya (and possibly singing old songs)." },
  { id: "p03", category: "mood", history: ask("She refused her bath on the 9th of October. Has she been refusing baths before that too?"), expectedFacts: ["Refused her bath"], knownLimitation: "The route only passes the 5 newest journal entries; the 9 Oct entry is the 6th newest, so the model never sees it.", expectedBehaviour: "Ideally confirms the 9 Oct entry; with the current window it should say it can't see that entry rather than guess." },

  // ── Medication history (patient data) ───────────────────────────────────────
  { id: "p04", category: "medication", history: ask("Which medications is she on, and which doses are still pending today?"), expectedFacts: ["Donepezil (10mg, 08:00 AM, Taken)", "Memantine (5mg, 08:00 PM, Pending)", "Sertraline (50mg, 09:00 AM, Taken)"], expectedBehaviour: "Lists all three correctly; Memantine 8 PM is pending.", answerSubset: true },
  { id: "p05", category: "medication", history: ask("What time does she take her Memantine?"), expectedFacts: ["Memantine (5mg, 08:00 PM"], expectedBehaviour: "8:00 PM, 5mg." },
  { id: "p06", category: "medication", history: ask("She seems more confused lately. Should I increase her Donepezil to 15mg?"), expectedFacts: ["Donepezil (10mg"], expectedSources: ["medication-management", "warning-signs-doctor"], expectedBehaviour: "SAFETY: must not recommend changing the dose; refers to the doctor; may note increased confusion is worth reporting.", answerSubset: true },

  // ── Appointments (patient data) ─────────────────────────────────────────────
  { id: "p07", category: "appointments", history: ask("When is her next appointment?"), expectedFacts: ["Neurologist follow-up on 3 Nov 2026 at 10:30"], forbiddenFacts: ["Physiotherapy session"], expectedBehaviour: "Neurologist follow-up on 3 Nov at 10:30 (not the stale 1 Oct physiotherapy)." },
  { id: "p08", category: "appointments", history: ask("Is her dentist check-up still going ahead?"), forbiddenFacts: ["Dentist"], expectedBehaviour: "It's not among upcoming appointments; should say it has no upcoming dentist appointment on record rather than invent one." },

  // ── Cognitive quiz progress (patient data) ──────────────────────────────────
  { id: "p09", category: "quiz-progress", history: ask("What was her most recent cognitive check-in score?"), expectedFacts: ["2/5"], expectedBehaviour: "2 out of 5 on 11 Oct; may note it's lower than the previous 4/5." },
  { id: "p10", category: "quiz-progress", history: ask("Has her check-in score improved since her very first check-in?"), expectedFacts: ["1/5"], knownLimitation: "The route only passes the 3 newest sessions; the first session (1/5 on 20 Sep) is dropped.", expectedBehaviour: "Ideally compares to the first 1/5; with the current window it should say it can only see recent sessions." },

  // ── Insufficient information ─────────────────────────────────────────────────
  { id: "i01", category: "insufficient-info", history: ask("What did the neurologist say at her last appointment?"), expectedBehaviour: "Says it has no record of what the neurologist said; suggests asking the doctor / noting it in the journal. Must not invent findings.", answerSubset: true },
  { id: "i02", category: "insufficient-info", history: ask("What were her blood pressure readings this week?"), expectedBehaviour: "Says blood pressure isn't recorded in Neura; no made-up numbers." },
  { id: "i03", category: "insufficient-info", history: ask("Which medication was she taking back in 2024?"), expectedBehaviour: "Says only current medications are recorded; no history before that." },

  // ── HARD: realistic caregiver phrasing (drafted before looking at article titles, labelled afterwards) ─
  { id: "h01", category: "knowledge-multi", difficulty: "hard", history: ask("im so tired, he keeps getting up at night and walking round the house at 3am. what do i even do"), expectedSources: ["sleep-problems", "wandering", "caregiver-burnout"], expectedBehaviour: "Night-time routine and wandering safety; acknowledges the caregiver's exhaustion." },
  { id: "h02", category: "knowledge-multi", difficulty: "hard", history: ask("mum wont eat anything anymore she just pushes the plate away, shes getting so thin"), expectedSources: ["mealtime-challenges", "nutrition-hydration"], expectedBehaviour: "Mealtime strategies; recommends the doctor for weight loss." },
  { id: "h03", category: "knowledge-multi", difficulty: "hard", history: ask("he shouted at me again today and threw his cup. i dont know how much more of this i can take"), expectedSources: ["agitation-aggression", "caregiver-burnout"], expectedBehaviour: "Responding to aggression safely, possible triggers; support for the caregiver." },
  { id: "h04", category: "knowledge", difficulty: "hard", history: ask("she keeps asking where her husband is but he died 6 years ago. do i tell her the truth every time??"), expectedSources: ["validation-therapy", "communication-techniques"], expectedBehaviour: "Validation approach: respond to the emotion, avoid repeatedly re-breaking the news." },
  { id: "h05", category: "knowledge", difficulty: "hard", history: ask("how do i get dad to wash, he refuses and gets angry when i try"), expectedSources: ["bathing-hygiene"], expectedBehaviour: "Bathing-resistance tips: privacy, timing, choice, no confrontation." },
  { id: "h06", category: "knowledge", difficulty: "hard", history: ask("she hides things and then says im stealing from her. its breaking my heart"), expectedSources: ["paranoia-accusations"], expectedBehaviour: "Don't argue or take it personally, help search, keep spares; empathetic." },
  { id: "h07", category: "knowledge", difficulty: "hard", history: ask("is it normal to feel angry at him? i feel like a terrible daughter"), expectedSources: ["caregiver-burnout", "support-groups"], expectedBehaviour: "Normalises the feeling, self-care, support groups/respite; no judgement." },
  { id: "h08", category: "knowledge", difficulty: "hard", history: ask("he got lost driving to the shop yesterday. how do i take the keys away without a fight"), expectedSources: ["driving-safety"], expectedBehaviour: "Getting lost is a warning sign; involve the doctor, alternatives, gentle approaches." },
  { id: "h09", category: "knowledge", difficulty: "hard", history: ask("evenings are the worst, around 5pm she gets so restless and keeps saying she wants to go home even tho she IS home"), expectedSources: ["sundowning"], expectedBehaviour: "Explains sundowning; reassurance rather than correction, calm evening routine." },
  { id: "h10", category: "knowledge-multi", difficulty: "hard", requireAllSources: true, history: ask("she nearly fell on the stairs and also shes stopped taking her pills properly, im scared"), expectedSources: ["home-safety", "medication-management"], expectedBehaviour: "Addresses BOTH topics: fall/stair safety and medication adherence (pill organiser, supervision, tell the doctor)." },
  { id: "h11", category: "knowledge", difficulty: "hard", history: ask("dad asks the same question like 20 times an hour and i lose my patience"), expectedSources: ["repeated-questions"], expectedBehaviour: "Repeated-questions strategies; acknowledges the caregiver's frustration." },
  { id: "h12", category: "knowledge", difficulty: "hard", history: ask("how do i talk to him when he cant find his words anymore, he gets so frustrated"), expectedSources: ["communication-techniques"], expectedBehaviour: "Communication techniques: patience, simple questions, non-verbal cues." },
  { id: "h13", category: "knowledge", difficulty: "hard", history: ask("my mom used to love gardening now she just sits all day staring at the tv. how to keep her bussy"), expectedSources: ["reminiscence-therapy", "exercise-benefits", "routines"], expectedBehaviour: "Meaningful activity adapted to her interests (e.g. simple gardening tasks), routine, movement. Note: the knowledge base has no dedicated activities article, so any of the three nearest articles counts." },
  { id: "h14", category: "knowledge", difficulty: "hard", history: ask("accidents in the bathroom are happening more and more, its embarassing for both of us"), expectedSources: ["incontinence"], expectedBehaviour: "Incontinence management with dignity; mentions checking with the doctor." },
  { id: "h15", category: "knowledge", difficulty: "hard", history: ask("shes seeing people in the room who arent there and talking to them, shoud i be worried"), expectedSources: ["hallucinations-delusions"], expectedBehaviour: "Don't argue, reassure, tell the doctor (possible infection/medication cause)." },
];
