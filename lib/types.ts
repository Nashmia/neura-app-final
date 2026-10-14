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
  createdAt: string;
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
  createdAt: string;
};

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
  appointments: Appointment[];
  journalEntries: JournalEntry[];
  knowledgeChunks: KnowledgeChunk[];
};
