// Copies the hand-authored CommonJS preload into dist-electron so Electron can load it.
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "..", "electron", "preload.cjs");
const outDir = resolve(__dirname, "..", "dist-electron");
const dst = resolve(outDir, "preload.cjs");

mkdirSync(outDir, { recursive: true });
cpSync(src, dst);
console.log(`[build] copied ${src} -> ${dst}`);
