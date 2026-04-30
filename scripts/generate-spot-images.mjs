#!/usr/bin/env node
// Nano Banana — Gemini 2.5 Flash Image generator for TROVE spots.
//
// USAGE:
//   1. Get an API key from https://aistudio.google.com/apikey
//   2. Set it in your shell (NEVER commit it):
//        Windows PowerShell:  $env:GEMINI_API_KEY = "sk-..."
//        macOS/Linux/bash:    export GEMINI_API_KEY="sk-..."
//   3. From repo root, run:
//        node scripts/generate-spot-images.mjs           # generate missing
//        node scripts/generate-spot-images.mjs --force   # regenerate all
//        node scripts/generate-spot-images.mjs --only=techno-tuesdays,sunset-sessions
//
// Output: public/spots/<id>.jpg (one per spot)
// Side-effect: rewrites the AUTO-GENERATED-IMAGES block in src/lib/spots.ts
// so the app picks up the new files immediately.
//
// Tokens-mindful: only generates spots that don't have a file yet (use --force
// to override). Concurrency capped at 3.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "spots");
const SPOTS_TS = path.join(ROOT, "src", "lib", "spots.ts");
const MODEL = "gemini-2.5-flash-image-preview";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const CONCURRENCY = 3;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ERROR: GEMINI_API_KEY is not set. See header of this file for setup.");
  process.exit(1);
}

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const ONLY = (() => {
  const arg = argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(arg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean));
})();

// ────────────────────────────────────────────────────────────────────────────
// Pull spot definitions out of spots.ts via a tiny, format-tolerant scrape.
// We don't import the file because it's TS + has Vite asset imports.
// ────────────────────────────────────────────────────────────────────────────

const src = await fs.readFile(SPOTS_TS, "utf-8");
const spotBlockRegex = /spot\(\{([\s\S]*?)\}\)/g;
const spots = [];
let m;
while ((m = spotBlockRegex.exec(src)) !== null) {
  const body = m[1];
  const get = (key) => {
    const re = new RegExp(`${key}:\\s*"([^"]*)"`);
    return body.match(re)?.[1] ?? "";
  };
  const id = get("id");
  if (!id) continue;
  spots.push({
    id,
    name: get("name"),
    tagline: get("tagline"),
    category: get("category"),
    subcategory: get("subcategory"),
    city: get("city"),
    area: get("area"),
  });
}

if (spots.length === 0) {
  console.error("ERROR: No spots parsed from spots.ts. Has the format changed?");
  process.exit(1);
}

console.log(`Found ${spots.length} spots in spots.ts.`);

// ────────────────────────────────────────────────────────────────────────────
// Brand-aware prompts. TROVE = SA, vibrant, magenta + gold neon, cinematic,
// 4:5 portrait, no text or logos in the frame.
// ────────────────────────────────────────────────────────────────────────────

const BRAND_STYLE =
  "Cinematic editorial photograph, 4:5 portrait composition, dark moody base " +
  "lighting with magenta and gold neon accents, high contrast, shallow depth " +
  "of field, atmospheric haze, documentary realism, South African setting. " +
  "STRICTLY: no text, no logos, no watermarks, no captions, no UI overlays. " +
  "Subject fills frame, evocative of a real venue you'd want to book tonight.";

function promptFor(s) {
  return [
    BRAND_STYLE,
    `Subject: ${s.subcategory || s.category} — ${s.name}.`,
    `Location feel: ${s.area}, ${s.city}.`,
    `Mood / tagline: ${s.tagline}`,
  ].join(" ");
}

// ────────────────────────────────────────────────────────────────────────────
// API call — Gemini 2.5 Flash Image returns inlineData with base64-encoded
// image. We save it as a .jpg.
// ────────────────────────────────────────────────────────────────────────────

async function generateOne(spot) {
  const outPath = path.join(OUT_DIR, `${spot.id}.jpg`);
  if (!FORCE) {
    try {
      await fs.access(outPath);
      return { id: spot.id, skipped: true };
    } catch {
      /* not found — continue */
    }
  }

  const body = {
    contents: [{ parts: [{ text: promptFor(spot) }] }],
    generationConfig: { responseModalities: ["IMAGE"] },
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData?.data);
  if (!imgPart) {
    throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 300)}`);
  }
  const buf = Buffer.from(imgPart.inlineData.data, "base64");
  await fs.writeFile(outPath, buf);
  return { id: spot.id, bytes: buf.length };
}

// ────────────────────────────────────────────────────────────────────────────
// Drive concurrency-limited fan-out.
// ────────────────────────────────────────────────────────────────────────────

await fs.mkdir(OUT_DIR, { recursive: true });

const queue = spots.filter((s) => !ONLY || ONLY.has(s.id));
console.log(`Generating ${queue.length} images (concurrency=${CONCURRENCY})…\n`);

const results = [];
async function worker() {
  while (queue.length > 0) {
    const s = queue.shift();
    if (!s) break;
    const t0 = Date.now();
    try {
      const r = await generateOne(s);
      const ms = Date.now() - t0;
      if (r.skipped) console.log(`  ↩ skip   ${s.id} (already exists)`);
      else console.log(`  ✓ wrote  ${s.id}.jpg  ${(r.bytes / 1024).toFixed(0)}KB  ${ms}ms`);
      results.push({ ok: true, id: s.id, skipped: !!r.skipped });
    } catch (err) {
      console.error(`  ✗ FAIL   ${s.id}  ${err.message}`);
      results.push({ ok: false, id: s.id, error: err.message });
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const ok = results.filter((r) => r.ok && !r.skipped).length;
const skipped = results.filter((r) => r.skipped).length;
const failed = results.filter((r) => !r.ok).length;
console.log(`\nDone — ${ok} generated, ${skipped} skipped, ${failed} failed.`);

// ────────────────────────────────────────────────────────────────────────────
// Rewrite the AUTO-GENERATED-IMAGES block in spots.ts so the app picks up the
// new files. We list every id whose file currently exists on disk.
// ────────────────────────────────────────────────────────────────────────────

const existing = [];
for (const s of spots) {
  try {
    await fs.access(path.join(OUT_DIR, `${s.id}.jpg`));
    existing.push(s.id);
  } catch {
    /* no file */
  }
}

const block = [
  "// AUTO-GENERATED-IMAGES-START — rewritten by scripts/generate-spot-images.mjs",
  "// Maps spot id → public path of an AI-generated image (Nano Banana). Falls back",
  "// to the category image when a spot id is not present here.",
  "const generatedImages: Record<string, string> = {",
  ...existing.map((id) => `  "${id}": "/spots/${id}.jpg",`),
  "};",
  "// AUTO-GENERATED-IMAGES-END",
].join("\n");

const updated = src.replace(
  /\/\/ AUTO-GENERATED-IMAGES-START[\s\S]*?\/\/ AUTO-GENERATED-IMAGES-END/,
  block,
);

if (updated === src) {
  console.warn("\nWARNING: marker block not found in spots.ts — did the file change?");
} else {
  await fs.writeFile(SPOTS_TS, updated);
  console.log(`\nUpdated src/lib/spots.ts — ${existing.length} spots now resolve to /spots/<id>.jpg`);
}
