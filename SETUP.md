# Shared room setup — any number of users (one-time, ~8 min, free)

The app works fully offline without this. Do the steps below once, redeploy, then everyone signs in with Google and joins the SAME room code in Profile → Connection.

## 1. Create the project
1. Go to https://console.firebase.google.com/ → Add project (any name, Analytics off is fine).

## 2. Enable Google sign-in
1. Left menu → **Build → Authentication** → Get started.
2. **Sign-in method** tab → enable **Google** → set support email → Save.

## 3. Create the database
1. Left menu → **Build → Realtime Database** → Create Database → choose region → **Start in locked mode**.
2. Open the **Rules** tab, replace with (only signed-in users can read/write):
```json
{
  "rules": {
    "rooms": {
      "$code": { ".read": "auth != null", ".write": "auth != null" }
    }
  }
}
```
3. Publish. (Use an unguessable room code like `kaizen-k7q2`.)

## 2. Get the web config values
1. Project Overview → **</>** (Add an app, Web) → nickname `kaizen` → you get a `firebaseConfig` object.
2. Keep that tab open — you'll copy values from it, NOT into code.

## 3. Give the values to the app (never paste them into code)
The browser cannot read `.env`. Something must turn values into `config.gen.js` first — pick ONE:

**A. Local preview (Live Server / `npx serve` / file open):**
1. Copy `webapp/.env.example` → `webapp/.env`, fill in the real values.
2. Run once (and again after any edit): `node tools/gen-config.mjs` from the `webapp/` folder.
3. Reload the app. (`config.gen.js` is gitignored — it stays on your machine.)

**B. Vercel deploy:**
1. Vercel → Project → Settings → Environment Variables → add `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` (+ optional `FIREBASE_MEASUREMENT_ID`, `KAIZEN_ROOM`).
2. Redeploy (the build runs `node tools/gen-config.mjs` automatically via `vercel.json`).
3. NOTE: a `.env` file never reaches Vercel (it's gitignored) — dashboard env vars are the only path there.

## 5. Everyone joins (sign-in persists)
Each person: Profile → Connection → **Sign in with Google** → room code → Join room. Sign-in persists on the device (survives reloads); signing out leaves the room but keeps personal progress.

**Mobile notes (sign-in fails on phone but works on PC?):**
- Open Kaizen in the **real browser app** (Safari on iPhone, Chrome on Android) — NOT inside Instagram/WhatsApp/Gmail's in-app browser, which blocks Google sign-in entirely. The app uses redirect sign-in on mobile automatically.
- If storage is blocked, the app signs you in for the current tab only and says so — it still works, just sign in again next visit.
- Your Vercel domain must be in Firebase console → Authentication → Settings → **Authorized domains** (localhost is pre-authorized for testing).

## 6. Deploy on Vercel WITHOUT the key in git
At build time Vercel generates `config.gen.js` from env vars (see `tools/gen-config.mjs` + `vercel.json` buildCommand). The committed `config.js` holds only nulls.
1. Vercel → Project → **Settings → Environment Variables**, add (copy exact values from Firebase console → Project settings):
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID` (optional), `KAIZEN_ROOM` (optional default room).
2. Deploy with Root Directory `webapp/`. Locally, copy `.env.example` to `.env` and fill it (gitignored) — `node tools/gen-config.mjs` does the same job.

Be honest about what this hides: it keeps the key **out of the repo**, but any shipped web app exposes its Firebase key in DevTools — that is by design and safe IF the three locks below hold:
1. **Rules** = `auth != null` (done above) — the key alone grants nothing.
2. **Authorized domains**: Firebase console → Authentication → Settings → Authorized domains → add your `*.vercel.app` domain (and remove `localhost` when done testing).
3. (Optional, later) **App Check** with reCAPTCHA — blocks other sites from reusing your key entirely.

## What syncs
- Progress, streaks, per-course mastery + completion, sessions, achievements.
- **Presence**: online / studying / paused / offline per person (heartbeat every 15s). Durations stay private; Profile → Privacy controls what's shared.
- **Activity feed** with Cheer reactions, **leaderboards** (Day / Week / Consistency + movement), **challenges** (scored across the whole room).
- **Community videos** (per course): anyone shares a YouTube link; anyone votes ▲/▼. Score = likes minus dislikes, floored at **0** — no negativity, best rises.

## Cost / limits
Firebase Spark (free, no card): 1 GB stored + 10 GB/month download. A study room's JSON traffic is effectively zero.
