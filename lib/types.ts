export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
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
  createdAt: string;
};

export type DB = {
  users: User[];
  patients: Patient[];
  medications: Medication[];
  quizSessions: QuizSession[];
};
