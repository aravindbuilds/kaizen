# Kaizen — Better than yesterday

Social progression platform for study rooms (any size). Static frontend (no build step) + optional Firebase Realtime Database → Vercel-ready. Dark theme.

## Deploy
1. Push `webapp/` to GitHub (or `vercel` CLI from this folder).
2. Vercel → Add New Project → Framework Preset **Other** → Root Directory `webapp/` → Deploy.
3. Local preview needs a server (fetch won't work over file://): `npx serve webapp`.

## Five destinations
```text
Home      → today card, continue, your paths, friends in motion, live activity
Paths     → journeys with mastery vs completion, curriculum, insights, plan, resources, videos
Focus     → resume / flashcards / quiz / mock / timed sessions, live timer, summary + mistake review
Social    → activity + cheer, friends, leaderboards (day/week/consistency), challenges
Profile   → stats, activity, paths, achievements, privacy, connection, export
```

## Adding a course (no code changes)
See `courses/README.md`: copy `courses/_template/` → fill `course.json`, `decks.json`, `quizzes.json`, `videos.json`, `plan.md`, `resources.md` → register in `courses/courses.json` → deploy.

## Duo sync (any number of users)
`SETUP.md` — 5-min Firebase setup. Offline-first; presence (online/studying/paused/offline), verified focus time, feed + cheers, boards, challenges, **community videos with floored voting**. Progress key: `kaizen_v2` (v1 migrates automatically).
