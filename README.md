# Kaizen — Better than yesterday

Kaizen is a social progression platform for study rooms (any size): personal paths, focus sessions, friends' live activity, leaderboards, challenges, and community videos. Static frontend + optional Firebase Realtime Database. Dark theme.

The deployable app lives entirely in this folder — **`webapp/` is the Vercel Root Directory**.

## Deploy on Vercel
1. Push the repo to GitHub.
2. Vercel → Add New Project → import repo, then set:
   - **Root Directory:** `webapp`
   - **Framework Preset:** Other
   - **Build Command:** `node tools/gen-config.mjs`
   - **Output Directory:** *(leave empty — the folder itself is served)*
3. **Environment Variables** (Project → Settings): `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` (+ optional `FIREBASE_MEASUREMENT_ID`, `KAIZEN_ROOM`).
4. Deploy. The build injects the config; secrets never touch git.

## Run locally
Static fetch needs a server (not `file://`):
```bash
cd webapp
cp .env.example .env   # fill in real values (gitignored)
node tools/gen-config.mjs
npx serve .            # or: python -m http.server
```

## Inside Kaizen
```text
Home      → today card, continue, your paths, friends in motion, live activity
Paths     → journeys with mastery vs completion, curriculum, insights, plan, resources, videos
Focus     → resume / flashcards / quiz / mock / timed sessions, live timer, summary + mistake review
Social    → activity + cheer, friends, leaderboards (day/week/focus/consistency), challenges
Profile   → stats, activity, paths, achievements, privacy, connection, sync status, export
```

## Adding a course (no code changes)
See `courses/README.md`: copy `courses/_template/` → fill `course.json`, `decks.json`, `quizzes.json`, `videos.json`, `plan.md`, `resources.md` → register in `courses/courses.json` → deploy.

## Shared rooms (any number of users)
`SETUP.md` — Firebase setup (Google sign-in, locked rules, authorized domains). Offline-first; presence (online/studying/paused/offline), verified focus time, feed + cheers, boards, challenges, **community videos with floored voting**. Progress key: `kaizen_v2` (older saves migrate automatically).
