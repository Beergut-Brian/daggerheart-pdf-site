// Copies the pdf.js runtime assets (JPEG2000 wasm, CMaps, standard fonts) to public/pdfjs so the viewer can load them same-origin.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules", "pdfjs-dist");
const dst = path.join(root, "public", "pdfjs");
fs.rmSync(dst, { recursive: true, force: true });
for (const d of ["wasm", "cmaps", "standard_fonts", "iccs"]) {
  if (fs.existsSync(path.join(src, d))) fs.cpSync(path.join(src, d), path.join(dst, d), { recursive: true });
}
console.log("pdfjs assets copied to public/pdfjs:", fs.readdirSync(dst).join(", "));
