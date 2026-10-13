// Vercel build: stage the static site into public/ (Vercel's output dir)
// and generate config.gen.js there from env. Local dev is unaffected
// (serve webapp/ directly; run gen-config.mjs without args for that).
import { rmSync, mkdirSync, cpSync, existsSync, readdirSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public");
const SKIP = new Set(["public", "tools", "node_modules", ".git", ".vercel", ".env"]);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const e of readdirSync(root)) {
  if (SKIP.has(e)) continue;
  cpSync(join(root, e), join(out, e), { recursive: true });
}
execSync("node tools/gen-config.mjs public", { cwd: root, stdio: "inherit" });
if (!existsSync(join(out, "index.html"))) throw new Error("build failed: no index.html in public/");
console.log("build ok -> public/");
