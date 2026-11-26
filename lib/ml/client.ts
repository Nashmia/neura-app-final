import { useEffect, useState } from "react";
import type { EmotionScore, MlModel, ModelStatus, NliPair, NliScores, SpeechAudio, VoiceEmotionResult, WorkerRequest, WorkerResponse } from "./protocol";

/**
 * Page-side access to the on-device models (lib/ml/worker.ts). Every call can fail (old browser,
 * no network for the first download, Data Saver on, out of memory); callers always have a fallback,
 * so a model that can't run only means the plain version of the feature.
 */

export const MODEL_INFO: Record<MlModel, { name: string; size: string }> = {
  emotion: { name: "DistilRoBERTa emotion model", size: "83 MB" },
  nli: { name: "DeBERTa-v3 NLI fact-checker", size: "87 MB" },
  tts: { name: "Kokoro-82M voice", size: "92 MB" },
  voice: { name: "wav2vec2 voice-tone model", size: "90 MB" },
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
const statuses: Record<MlModel, ModelStatus> = {
  emotion: { status: "idle", progress: 0 },
  nli: { status: "idle", progress: 0 },
  tts: { status: "idle", progress: 0 },
  voice: { status: "idle", progress: 0 },
};
const listeners = new Set<() => void>();

/** On-device models need Web Workers and WebAssembly, and are skipped when the browser asks to save data. */
export function mlSupported(): boolean {
  if (typeof window === "undefined" || typeof Worker === "undefined" || typeof WebAssembly !== "object") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData;
}

function failAll(message: string) {
  pending.forEach(({ reject }) => reject(new Error(message)));
  pending.clear();
  (Object.keys(statuses) as MlModel[]).forEach((m) => statuses[m].status === "loading" && (statuses[m] = { status: "error", progress: 0 }));
  listeners.forEach((l) => l());
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    if (message.type === "status") {
      statuses[message.model] = { status: message.status, progress: message.progress };
      listeners.forEach((l) => l());
      return;
    }
    const call = pending.get(message.id);
    if (!call) return;
    pending.delete(message.id);
    if (message.type === "result") call.resolve(message.result);
    else call.reject(new Error(message.error));
  };
  worker.onerror = (event) => {
    event.preventDefault();
    failAll("The on-device model stopped working.");
    worker?.terminate();
    worker = null;
  };
  return worker;
}

type Request = WorkerRequest extends infer R ? (R extends { id: number } ? Omit<R, "id"> : never) : never;

function call<T>(request: Request, timeoutMs: number, transfer: Transferable[] = []): Promise<T> {
  if (!mlSupported()) return Promise.reject(new Error("On-device models aren't available in this browser."));
  return new Promise<T>((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("The on-device model took too long."));
    }, timeoutMs);
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value as T);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    });
    try {
      getWorker().postMessage({ ...request, id }, transfer);
    } catch (error) {
      pending.delete(id);
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

// The first call includes the one-off model download, so the timeouts are generous.
const FIRST_LOAD_MS = 5 * 60_000;

/** Starts downloading a model in the background so it is ready when needed. */
export function warmModel(model: MlModel) {
  call<boolean>({ task: "warm", model }, FIRST_LOAD_MS).catch(() => undefined);
}

export function classifyEmotion(text: string): Promise<EmotionScore[]> {
  return call({ task: "emotion", text }, FIRST_LOAD_MS);
}

export function entailment(pairs: NliPair[]): Promise<NliScores[]> {
  return call({ task: "nli", pairs }, FIRST_LOAD_MS);
}

export function synthesizeSpeech(text: string, voice = "bf_emma"): Promise<SpeechAudio> {
  return call({ task: "tts", text, voice }, FIRST_LOAD_MS);
}

/** Decodes a recording and resamples it to 16 kHz mono, the rate the voice-tone model expects. */
async function toMono16k(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16_000)), 16_000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally {
    context.close().catch(() => undefined);
  }
}

/** How the voice in a recording sounds (wav2vec2 speech-emotion model), averaged over the clip. */
export async function classifyVoiceEmotion(blob: Blob): Promise<VoiceEmotionResult> {
  const samples = await toMono16k(blob);
  return call({ task: "voiceEmotion", samples }, FIRST_LOAD_MS, [samples.buffer]);
}

export function getModelStatus(model: MlModel): ModelStatus {
  return statuses[model];
}

/** Re-renders when the model's download/ready status changes. */
export function useModelStatus(model: MlModel): ModelStatus {
  const [status, setStatus] = useState<ModelStatus>(statuses[model]);
  useEffect(() => {
    const update = () => setStatus({ ...statuses[model] });
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, [model]);
  return status;
}
