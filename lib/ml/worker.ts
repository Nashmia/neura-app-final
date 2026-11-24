/// <reference lib="webworker" />
/**
 * Runs the on-device models off the main thread, so the page never freezes while they load or run.
 * Model files download from the Hugging Face Hub once and the browser caches them (Cache Storage).
 *   emotion  MicahB/emotion_text_classifier (DistilRoBERTa, 7 emotions), ~83 MB quantised
 *   nli      Xenova/nli-deberta-v3-xsmall (natural-language inference), ~87 MB quantised
 *   tts      Kokoro-82M (open-weight text-to-speech, British voices), ~92 MB quantised
 */
import { AutoModelForSequenceClassification, AutoTokenizer, env, pipeline, softmax, type PreTrainedModel, type PreTrainedTokenizer, type TextClassificationPipeline } from "@huggingface/transformers";
import type { KokoroTTS } from "kokoro-js";
import type { MlModel, WorkerRequest, WorkerResponse } from "./protocol";

env.allowLocalModels = false;

const post = (message: WorkerResponse, transfer: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(message, transfer);

/** Reports download progress of each model's main weights file (the .onnx file dominates the size). */
function progressFor(model: MlModel) {
  return (p: { status: string; file?: string; progress?: number }) => {
    if (p.status === "progress" && p.file?.endsWith(".onnx")) post({ type: "status", model, status: "loading", progress: Math.round(p.progress ?? 0) });
  };
}

function lazy<T>(model: MlModel, load: () => Promise<T>) {
  let promise: Promise<T> | null = null;
  return () => {
    promise ??= (post({ type: "status", model, status: "loading", progress: 0 }), load())
      .then((value) => {
        post({ type: "status", model, status: "ready", progress: 100 });
        return value;
      })
      .catch((error) => {
        promise = null; // allow a retry later
        post({ type: "status", model, status: "error", progress: 0 });
        throw error;
      });
    return promise;
  };
}

// pipeline()'s overloads are too broad for TypeScript to resolve here, so it is called through a narrower type.
const textClassifier = pipeline as unknown as (task: "text-classification", model: string, options: object) => Promise<TextClassificationPipeline>;
const emotion = lazy("emotion", () => textClassifier("text-classification", "MicahB/emotion_text_classifier", { dtype: "q8", progress_callback: progressFor("emotion") }));

const NLI_MODEL = "Xenova/nli-deberta-v3-xsmall";
const nli = lazy("nli", async (): Promise<{ tokenizer: PreTrainedTokenizer; model: PreTrainedModel }> => ({
  tokenizer: await AutoTokenizer.from_pretrained(NLI_MODEL),
  model: await AutoModelForSequenceClassification.from_pretrained(NLI_MODEL, { dtype: "q8", progress_callback: progressFor("nli") }),
}));

const tts = lazy("tts", async (): Promise<KokoroTTS> => {
  const { KokoroTTS } = await import("kokoro-js");
  return KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "wasm", progress_callback: progressFor("tts") });
});

async function handle(request: WorkerRequest) {
  switch (request.task) {
    case "warm": {
      await (request.model === "emotion" ? emotion() : request.model === "nli" ? nli() : tts());
      return post({ type: "result", id: request.id, result: true });
    }
    case "emotion": {
      const classify = await emotion();
      const output = (await classify(request.text.slice(0, 1500), { top_k: 3 })) as { label: string; score: number }[];
      return post({ type: "result", id: request.id, result: output });
    }
    case "nli": {
      const { tokenizer, model } = await nli();
      const labels = (model.config as unknown as { id2label: Record<string, string> }).id2label;
      const results: { entailment: number; contradiction: number; neutral: number }[] = [];
      // Small batches keep memory low on phones.
      for (let i = 0; i < request.pairs.length; i += 8) {
        const batch = request.pairs.slice(i, i + 8);
        const inputs = tokenizer(batch.map((p) => p.premise), { text_pair: batch.map((p) => p.hypothesis), padding: true, truncation: true });
        const { logits } = await model(inputs);
        for (let b = 0; b < batch.length; b++) {
          const probs = softmax(Array.from(logits[b].data as Float32Array));
          const byLabel = Object.fromEntries(probs.map((p, j) => [labels[j], p]));
          results.push({ entailment: byLabel.entailment ?? 0, contradiction: byLabel.contradiction ?? 0, neutral: byLabel.neutral ?? 0 });
        }
      }
      return post({ type: "result", id: request.id, result: results });
    }
    case "tts": {
      const model = await tts();
      const audio = await model.generate(request.text.slice(0, 600), { voice: request.voice as "bf_emma", speed: 0.9 });
      const samples = audio.audio as Float32Array;
      return post({ type: "result", id: request.id, result: { samples, sampleRate: audio.sampling_rate } }, [samples.buffer]);
    }
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  handle(event.data).catch((error) => post({ type: "error", id: event.data.id, error: error instanceof Error ? error.message : String(error) }));
};
