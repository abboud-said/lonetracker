/**
 * Read the text off a schedule screenshot, on the device.
 *
 * The picture never leaves the browser: recognition runs in a web worker
 * with Tesseract, and the engine and the Swedish language data are served
 * from this site (public/tesseract, public/tessdata) rather than from a
 * CDN, so the only thing fetched is the engine itself, and only from here.
 * The first use downloads a few megabytes; after that both are cached.
 *
 * What comes back is text, not shifts — lib/screenshotText.ts turns it into
 * shifts, and the person checks those against the picture before they are
 * used. OCR is wrong often enough that nothing read here is loaded unseen.
 */

import type Tesseract from "tesseract.js";
import type { OcrWord } from "./screenshotGrid";

export type OcrProgress = {
  /** Fetching and starting the engine, then reading the picture. */
  stage: "engine" | "reading";
  /** 0–1 within the stage. */
  progress: number;
};

export type OcrResult = {
  /** The page as text, top to bottom. */
  text: string;
  /** Every word with where it sits on the prepared picture, for grid layouts. */
  words: OcrWord[];
  /** Size of the prepared picture the word boxes refer to. */
  width: number;
  height: number;
};

export type ScreenshotErrorCode = "image" | "engine";

export class ScreenshotError extends Error {
  code: ScreenshotErrorCode;
  constructor(code: ScreenshotErrorCode, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.code = code;
  }
}

// Absolute URLs on purpose: the worker runs from a blob: URL, against which
// a path like "/tesseract" cannot be resolved.
function assetUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

let workerPromise: Promise<Tesseract.Worker> | null = null;
const listeners = new Set<(p: OcrProgress) => void>();

function report(m: { status: string; progress: number }) {
  const stage: OcrProgress["stage"] = m.status === "recognizing text" ? "reading" : "engine";
  const p = { stage, progress: Math.max(0, Math.min(1, m.progress ?? 0)) };
  for (const fn of listeners) fn(p);
}

/** One engine per page. Loading it is the slow part, so it is kept. */
async function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, OEM, PSM } = await import("tesseract.js");
      const worker = await createWorker("swe", OEM.LSTM_ONLY, {
        workerPath: assetUrl("/tesseract/worker.min.js"),
        corePath: assetUrl("/tesseract"),
        langPath: assetUrl("/tessdata"),
        logger: report,
      });
      await worker.setParameters({
        // A phone screenshot is one column of lines; reading it as a single
        // block keeps the lines in order, which the block grouping relies on.
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw new ScreenshotError("engine", err);
    });
  }
  return workerPromise;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ScreenshotError("image"));
    };
    img.src = url;
  });
}

/**
 * Upscale, greyscale, and invert a dark-mode screenshot. Tesseract reads
 * black text on white at roughly 30 px x-height best; phone screenshots are
 * often half that, and a dark theme is the default on many phones now.
 */
function prepare(img: HTMLImageElement): HTMLCanvasElement {
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  if (w0 === 0 || h0 === 0) throw new ScreenshotError("image");

  // Break lines are the smallest text on a schedule screen, and a screenshot
  // that has been through a messaging app is often down to 1x — so the
  // target is generous.
  let scale = Math.min(4, Math.max(1, 2400 / w0));
  const maxPixels = 16_000_000;
  if (w0 * h0 * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (w0 * h0));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w0 * scale);
  canvas.height = Math.round(h0 * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ScreenshotError("image");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = frame.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    px[i] = px[i + 1] = px[i + 2] = y;
    sum += y;
  }
  const mean = sum / (px.length / 4);
  if (mean < 128) {
    for (let i = 0; i < px.length; i += 4) {
      px[i] = px[i + 1] = px[i + 2] = 255 - px[i];
    }
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

/** The text in a screenshot, with each word's position. Throws ScreenshotError. */
export async function recognizeScreenshot(
  file: File,
  onProgress: (p: OcrProgress) => void,
): Promise<OcrResult> {
  listeners.add(onProgress);
  try {
    onProgress({ stage: "engine", progress: 0 });
    const img = await loadImage(file);
    const canvas = prepare(img);
    const worker = await getWorker();
    onProgress({ stage: "reading", progress: 0 });
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const words: OcrWord[] = [];
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          for (const w of line.words) {
            words.push({
              text: w.text,
              conf: w.confidence,
              x0: w.bbox.x0,
              y0: w.bbox.y0,
              x1: w.bbox.x1,
              y1: w.bbox.y1,
            });
          }
        }
      }
    }
    return { text: data.text ?? "", words, width: canvas.width, height: canvas.height };
  } catch (err) {
    if (err instanceof ScreenshotError) throw err;
    throw new ScreenshotError("engine", err);
  } finally {
    listeners.delete(onProgress);
  }
}
