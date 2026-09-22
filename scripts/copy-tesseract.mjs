// Copy the OCR engine out of node_modules into public/, so the browser loads
// it from this site rather than from a CDN. The schedule screenshot is read
// entirely on the device; the only thing fetched is the engine itself, and
// with these files served from here nothing is fetched from anyone else.
//
// Runs on postinstall. public/tesseract/ is gitignored — these are build
// artefacts of the installed package version, not source.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "tesseract");
mkdirSync(out, { recursive: true });

// tesseract.js picks one of the three LSTM builds at runtime by probing the
// browser's SIMD support, so all three have to be present.
const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"],
];

let copied = 0;
for (const [from, to] of files) {
  const src = join(root, "node_modules", from);
  const dst = join(out, to);
  if (!existsSync(src)) {
    console.error(`copy-tesseract: missing ${src} — run npm install first`);
    process.exit(1);
  }
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  copyFileSync(src, dst);
  copied++;
}

const version = JSON.parse(readFileSync(join(root, "node_modules/tesseract.js/package.json"), "utf8")).version;
console.log(`copy-tesseract: tesseract.js ${version}, ${copied} file(s) copied to public/tesseract`);
