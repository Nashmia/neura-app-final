import { cosineSimilarity } from "@/lib/embeddings";

/**
 * Zero-shot topic tags for Care Assistant questions. Each topic is described in a sentence, both are
 * embedded with the same Gemini embedding model, and a question takes the most similar topic's tag.
 * No labelled training data: the topic descriptions are the only "training". Only the tag is stored.
 */

export const TOPICS: { id: string; label: string; description: string }[] = [
  { id: "behaviour", label: "Behaviour & mood", description: "Agitation, aggression, anxiety, repeated questions, sundowning, wandering, mood changes and challenging behaviour in dementia." },
  { id: "sleep", label: "Sleep", description: "Sleep problems, waking at night, daytime napping, bedtime routines and night-time restlessness." },
  { id: "medication", label: "Medication", description: "Medicines, doses, side effects, missed doses, refusing tablets, prescriptions and pharmacy questions." },
  { id: "daily-care", label: "Daily care", description: "Bathing, dressing, eating, drinking, toileting, continence, personal hygiene and everyday routines." },
  { id: "safety", label: "Safety", description: "Falls, home safety, driving, getting lost, emergencies, injuries and keeping the person safe." },
  { id: "communication", label: "Communication", description: "How to talk with the person, confusion, memory loss, recognising family, and responding with patience." },
  { id: "health", label: "Health & doctors", description: "Doctor appointments, diagnosis, dementia stages, symptoms, check-in scores, progression and health changes." },
  { id: "caregiver", label: "Caregiver wellbeing", description: "Caregiver stress, burnout, guilt, respite, support groups, getting help and looking after yourself." },
];

/** The topic id closest to `question` (an embedding); `topicVectors` are the topic embeddings in TOPICS order. */
export function classifyTopic(question: number[], topicVectors: number[][]): string {
  let best = 0;
  let bestScore = -Infinity;
  topicVectors.forEach((vector, i) => {
    const score = cosineSimilarity(question, vector);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return TOPICS[best].id;
}

// Topic embeddings rarely change, so each server instance embeds them once.
let topicVectors: Promise<number[][]> | null = null;
export function getTopicVectors(embed: (text: string) => Promise<number[]>): Promise<number[][]> {
  topicVectors ??= Promise.all(TOPICS.map((t) => embed(`${t.label}: ${t.description}`))).catch((error) => {
    topicVectors = null; // try again on the next question
    throw error;
  });
  return topicVectors;
}
