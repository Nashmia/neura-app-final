/**
 * Face-centred contact photos. Google's MediaPipe BlazeFace detector (a ~230 KB model running in the
 * browser via WebAssembly) finds the largest face, and the photo is cropped to a square around it, so
 * the small round avatars and the check-in photo question show the person rather than the background.
 * Any failure (offline, old browser, no face) returns null and the photo is used as it is.
 */

const MEDIAPIPE_VERSION = "0.10.35"; // keep in step with @mediapipe/tasks-vision in package.json
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const TIMEOUT_MS = 10_000;

export type Box = { x: number; y: number; width: number; height: number };

type Detector = { detect(image: HTMLImageElement): { detections: { boundingBox?: { originX: number; originY: number; width: number; height: number } }[] } };
let detector: Promise<Detector> | null = null;

function loadDetector(): Promise<Detector> {
  detector ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    return FaceDetector.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL }, runningMode: "IMAGE", minDetectionConfidence: 0.5 });
  })().catch((error) => {
    detector = null;
    throw error;
  });
  return detector;
}

/** The largest face in the image, or null. */
export async function detectFace(image: HTMLImageElement): Promise<Box | null> {
  try {
    const d = await Promise.race([loadDetector(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Face detector timed out.")), TIMEOUT_MS))]);
    const faces = d.detect(image).detections.map((f) => f.boundingBox).filter((b): b is NonNullable<typeof b> => Boolean(b));
    const largest = faces.sort((a, b) => b.width * b.height - a.width * a.height)[0];
    return largest ? { x: largest.originX, y: largest.originY, width: largest.width, height: largest.height } : null;
  } catch (error) {
    console.warn("Face detection unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * A square crop around `face` with room for hair and shoulders, kept inside the image.
 * The face sits a little above centre, as in a portrait.
 */
export function faceCrop(face: Box, imageWidth: number, imageHeight: number): Box {
  const side = Math.min(Math.max(face.width, face.height) * 2.2, imageWidth, imageHeight);
  const centerX = face.x + face.width / 2;
  const centerY = face.y + face.height / 2 + face.height * 0.15;
  const x = Math.min(Math.max(centerX - side / 2, 0), imageWidth - side);
  const y = Math.min(Math.max(centerY - side / 2, 0), imageHeight - side);
  return { x: Math.round(x), y: Math.round(y), width: Math.round(side), height: Math.round(side) };
}
