import * as nsfwjs from 'nsfwjs';
import sharp from 'sharp';

/**
 * Content moderation for photos using nsfwjs (Yahoo/OpenNSFW re-trained model).
 *
 * Runs fully local on the CPU-only TensorFlow.js backend — no external API.
 * This keeps the pipeline self-contained while still catching nudity/adult
 * content. The model is loaded once (singleton) and reused.
 *
 * Pipeline:
 *  1. Decode + resize the uploaded image to 224x224 RGBA with Sharp. Sharp
 *     decodes JPEG/PNG/WebP/AVIF/etc. (Jimp alone can't decode WebP, which
 *     caused uploads of otherwise-innocent `.webp` photos to fail).
 *  2. Feed `{data, width, height}` to nsfwjs (required for the CPU tfjs backend,
 *     which cannot decode raw image buffers itself — that needs tfjs-node's
 *     native binding, which we deliberately avoid for portability).
 *  3. Reject when the top prediction is a blocked class at/above threshold.
 *
 * Classifications: 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy'
 */

// Categories we reject. Tune by moving categories in/out of this set.
const BLOCKED_CLASSES = new Set(['Porn', 'Hentai']);

// Confidence threshold (0-1) above which a blocked class counts as the result.
const BLOCK_THRESHOLD = 0.5;

let modelPromise: Promise<nsfwjs.NSFWJS> | null = null;

/**
 * Optional override for where the NSFW model weights are loaded from.
 * In production set NSFW_MODEL_URL to a stable URL (e.g. your R2 bucket)
 * serving the exported nsfwjs model (model.json + shards). When unset,
 * nsfwjs falls back to its default hosted MobileNetV2 model.
 */
function resolveModelUrl(): string | undefined {
  return process.env.NSFW_MODEL_URL || undefined;
}

async function getModel(): Promise<nsfwjs.NSFWJS> {
  if (!modelPromise) {
    modelPromise = nsfwjs.load(resolveModelUrl()).catch((err) => {
      // Don't cache a rejected promise: if loading fails (e.g. transient
      // network issue on the first boot), allow the next request to retry
      // instead of failing every call forever.
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

/**
 * Preloads and warms up the NSFW model so the first real upload doesn't
 * pay the cold-start cost (download + load). Call once at server boot.
 */
export async function preloadNsfwModel(): Promise<void> {
  const model = await getModel();
  // One warm-up inference against a small neutral buffer allocs the
  // internal tensors once and validates the model loaded correctly.
  const warm = Buffer.alloc(4 * 4 * 3, 128);
  await model.classify(
    { data: new Uint8Array(warm), width: 4, height: 4 },
    1
  );
}

export interface NsfwVerdict {
  allowed: boolean;
  classification: string;
  confidence: number;
  topCategories: Array<{ className: string; probability: number }>;
}

async function decodeToPixels(
  buffer: Buffer
): Promise<{ data: Uint8Array; width: number; height: number }> {
  // Sharp decodes the raw bytes (incl. WebP, which Jimp can't) and resizes to
  // the 224x224 square the nsFW MobileNetV2 expects. ensureAlpha() guarantees
  // 4 channels so the RGBA layout matches what the tfjs CPU backend needs.
  const { data, info } = await sharp(buffer)
    .resize(224, 224)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

/**
 * Classifies an image buffer and returns whether it should be allowed.
 * Rejects when the top prediction is a blocked class at/above the threshold.
 */
export async function checkImage(
  buffer: Buffer,
  _mimetype: string
): Promise<NsfwVerdict> {
  const model = await getModel();
  const pixels = await decodeToPixels(buffer);

  // predictions come ordered by probability (highest first); topk = 5 covers all classes.
  const predictions = await model.classify(
    { data: pixels.data, width: pixels.width, height: pixels.height },
    5
  );

  const top = predictions[0];

  const blocked = BLOCKED_CLASSES.has(top.className);
  const allowed = !blocked || top.probability < BLOCK_THRESHOLD;

  return {
    allowed,
    classification: top.className,
    confidence: top.probability,
    topCategories: predictions.map((c) => ({
      className: c.className,
      probability: c.probability,
    })),
  };
}
