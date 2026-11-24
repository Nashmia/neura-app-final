/** Messages between the page and the on-device model worker (lib/ml/worker.ts). */

export type MlModel = "emotion" | "nli" | "tts";
export type ModelStatus = { status: "idle" | "loading" | "ready" | "error"; progress: number };

export type NliPair = { premise: string; hypothesis: string };
export type NliScores = { entailment: number; contradiction: number; neutral: number };
export type EmotionScore = { label: string; score: number };
export type SpeechAudio = { samples: Float32Array; sampleRate: number };

export type WorkerRequest =
  | { id: number; task: "warm"; model: MlModel }
  | { id: number; task: "emotion"; text: string }
  | { id: number; task: "nli"; pairs: NliPair[] }
  | { id: number; task: "tts"; text: string; voice: string };

export type WorkerResponse =
  | { type: "status"; model: MlModel; status: ModelStatus["status"]; progress: number }
  | { type: "result"; id: number; result: unknown }
  | { type: "error"; id: number; error: string };
