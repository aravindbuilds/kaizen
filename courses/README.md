# Bringing a course to life — the Kaizen pack convention

Any course (NICL AO, GATE 2027, anything) becomes a living path in the app from **one folder**. No code changes. No rebuild beyond deploy.

## 1. Folder structure

```text
webapp/courses/
├── courses.json            ← registry: which packs are live
├── nicl-ao-2026/           ← a course pack (example)
│   ├── course.json         ← identity, exam date, tracks
│   ├── decks.json          ← flashcard/quiz bank (required)
│   ├── quizzes.json        ← mock sets drawn from the bank
│   ├── videos.json         ← library entries
│   ├── guides.json         ← study-note guides (tricks, playbooks) rendered in Paths
│   ├── plan.md             ← phased plan (rendered in Paths)
│   └── resources.md        ← papers, mocks, links (rendered in Paths)
└── _template/              ← copy this to start a new course
```

## 2. Add a course (4 steps)

1. **Copy** `courses/_template/` → `courses/gate-2027/`.
2. **Fill the data**: `course.json` (title, exam date, tracks), `decks.json` (cards — same shape as template), `quizzes.json` (pick questions from decks), `videos.json` (search terms or IDs), `guides.json` (method notes: `{id, title, track, body}` in Markdown), `plan.md`, `resources.md`.
3. **Register**: add `{ "id": "gate-2027", "path": "courses/gate-2027/course.json" }` to `courses.json`.
4. **Deploy** (git push; Vercel rebuilds). The course appears under Paths; enrol and practise.

## 3. Card shape (decks + quizzes share it)

```json
{ "q": "…?", "options": ["a","b","c","d"], "answer": 0, "explain": "rule in 1–2 lines", "tag": "topic" }
```

- `answer` = index of the correct option. Keep 4 options.
- `track` on decks/quizzes must match a track id in `course.json`.
- Quiz questions may add `"deck": "deck-id"` (used for per-deck credit).

## 4. Rules the app enforces

- Filenames inside a pack are fixed (`decks.json`, …) but the pack folder name is free.
- Anything starting with `_` is ignored (so `_template` never ships as a course).
- Missing optional files (`plan.md`, `resources.md`, `videos.json`, `guides.json`) simply hide that section — `decks.json` is the only required file.
- Progress is namespaced per course (`courseId:deckId`), so streaks/XP stay global while mastery stays per course. Duo sync carries all courses automatically.

## 5. Authoring from existing study material

- Flashcards `.md` (Front/Back) → one card each: Back's answer becomes the correct option; invent 3 plausible distractors from neighbouring cards.
- PDF papers → transcribe target questions into `decks.json` (aim 10–15 per deck to start; grow anytime — progress is keyed by deck, not position, so appending cards never resets mastery).
- Video links → `videos.json` as `{label, videoId}`; topic playlists as `{label, query}`.
- Existing `plan.md` files drop in unchanged (headings, bullets, bold render; tables do not — convert key tables to bullets).
