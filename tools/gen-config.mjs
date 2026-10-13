// Generates webapp/config.gen.js from environment variables at deploy time,
// so secrets never live in git. Safe to run locally too (falls back to .env,
// then to empty values = offline mode).
// Env: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_DATABASE_URL,
//      FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID,
//      FIREBASE_APP_ID, FIREBASE_MEASUREMENT_ID (optional), KAIZEN_ROOM (optional)
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.argv[2] ? join(root, process.argv[2]) : root;
const env = { ...process.env };

// tiny .env loader (KEY=VALUE, # comments) - no dependencies
try {
  const envFile = join(root, ".env");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {}

const pick = (...ks) => { for (const k of ks) if (env[k]) return env[k]; return undefined; };
const fb = {
  apiKey: pick("FIREBASE_API_KEY"),
  authDomain: pick("FIREBASE_AUTH_DOMAIN"),
  databaseURL: pick("FIREBASE_DATABASE_URL"),
  projectId: pick("FIREBASE_PROJECT_ID"),
  storageBucket: pick("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: pick("FIREBASE_MESSAGING_SENDER_ID"),
  appId: pick("FIREBASE_APP_ID"),
  measurementId: pick("FIREBASE_MEASUREMENT_ID"),
};
Object.keys(fb).forEach(k => fb[k] === undefined && delete fb[k]);
const out = {
  ...(Object.keys(fb).length ? { firebaseConfig: fb } : {}),
  ...(pick("KAIZEN_ROOM") ? { room: pick("KAIZEN_ROOM") } : {}),
};
writeFileSync(join(outDir, "config.gen.js"),
  "/* Generated at deploy from env - do not commit. */\n" +
  "window.KAIZEN_CFG = Object.assign(window.KAIZEN_CFG || {}, " + JSON.stringify(out) + ");\n");
console.log("config.gen.js written (" + (out.firebaseConfig ? "firebase configured" : "empty = offline mode") + ")");
