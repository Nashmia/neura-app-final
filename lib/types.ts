import type { SpeechMarkers } from "@/lib/speech-markers";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
  // Bumped on password reset so every existing session cookie stops working.
  sessionVersion?: number;
  // Login lockout after repeated wrong passwords.
  loginFailures?: number;
  loginLockedUntil?: string;
  // Password reset link: only a SHA-256 of the emailed token is stored.
  resetTokenHash?: string;
  resetTokenExpires?: string;
  resetRequestedAt?: string;
};

export type Contact = {
  id: string;
  name: string;
  relationship: string;
  type: "Family" | "Friend";
  notes?: string;
  photo?: string; // compressed JPEG data URL (resized in the browser before upload)
};

export type Patient = {
  id: string;
  userId: string;
  caregiverIds: string[];
  name: string;
  age: number;
  gender: string;
  dementiaStage: string;
  notes: string;
  contacts: Contact[];
  familyCount: number;
  friendsCount: number;
  quizLength: number;
  quizDifficulty: string;
  // Bumped to revoke every doctor share link issued so far (lib/auth.ts).
  doctorShareVersion?: number;
  createdAt: string;
  updatedAt: string;
};

export type Medication = {
  id: string;
  userId: string;
  patientId: string;
  name: string;
  dosage: string;
  time: string;
  status: "Taken" | "Pending";
};

export type QuizSession = {
  id: string;
  userId: string;
  patientId: string;
  score: number;
  total: number;
  summary?: string;
  // Every question and answer of the check-in, so the score can be audited. Absent on older sessions.
  items?: QuizItem[];
  // All voice answers' speech markers added together. Absent when every answer was typed.
  speech?: SpeechMarkers;
  createdAt: string;
};

// `speech` is set when the answer was spoken (Whisper timings, lib/speech-markers.ts).
// `photoContactId` is set on the photo-recognition question (the contact whose photo was shown).
export type QuizItem = { questionNumber: number; question: string; answer: string; speech?: SpeechMarkers; photoContactId?: string };

/** The photo-recognition question of a check-in: whose photo is shown, at which question, and what it shows. */
export type QuizPhotoQuestion = { contactId: string; questionNumber: number; description: string };

/** A check-in in progress. The server keeps the transcript, so the saved score never depends on client-supplied history. */
export type QuizTranscript = {
  id: string;
  userId: string;
  patientId: string;
  questionCount: number;
  items: QuizItem[];
  pendingQuestion: string;
  photo?: QuizPhotoQuestion;
  status: "in_progress" | "complete";
  version: number; // bumped on every write; guards against double submissions
  createdAt: string;
  updatedAt: string;
};

export type Appointment = {
  id: string;
  userId: string;
  patientId: string;
  title: string;
  type: "Doctor" | "Therapy" | "Other";
  date: string; // YYYY-MM-DD
  time: string;
  location?: string;
  notes?: string;
  status: "Upcoming" | "Cancelled";
  createdAt: string;
};

export type MoodTag = "Calm" | "Anxious" | "Confused" | "Happy" | "Tired";

export type JournalEntry = {
  id: string;
  userId: string;
  patientId: string;
  text: string;
  moodTag?: MoodTag;
  // Emotion the in-browser emotion model read in the note text (lib/ml), when it ran.
  emotion?: { label: string; score: number };
  createdAt: string;
};

/** Gemini embedding of a journal note, kept apart so ordinary journal reads stay small. */
export type JournalEmbedding = { entryId: string; patientId: string; embedding: number[]; createdAt: string };

/** Topic of one Care Assistant question (the question text itself is not stored). */
export type AssistantTopic = { id: string; patientId: string; topic: string; createdAt: string };

/** The AI-written care digest, cached for a day per patient. */
export type CareDigest = { id: string; patientId: string; day: string; text: string; model: string; createdAt: string };

export type KnowledgeChunk = {
  id: string;
  source: string;
  title: string;
  text: string;
  embedding: number[];
};

export type DB = {
  users: User[];
  patients: Patient[];
  medications: Medication[];
  quizSessions: QuizSession[];
  quizTranscripts: QuizTranscript[];
  appointments: Appointment[];
  journalEntries: JournalEntry[];
  knowledgeChunks: KnowledgeChunk[];
};
