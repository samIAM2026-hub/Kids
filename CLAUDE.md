# CLAUDE.md — Kids

Learning material for **Grace and Warren**. All content is **English**, kid-friendly, and warm/
encouraging in tone (never stressful). Every page is a self-contained single-file HTML you can
open in a browser. This file documents the **existing** design so new pages match — don't invent
a new look.

## What's here

```text
Kids/
├── Checklists/         Grace / Warren weekly checklists (Firebase-synced, printable)
├── Quizzes/            reading & topic quizzes + index.html (quiz hub)
├── Interest Lessons/   mini-course lessons, board game + index.html (course hub)
├── Typing Game/        standalone game ("Word Wizards Academy") + its GAME_DESIGN.md
└── JS/firebase-checklist-sync.js   shared cloud-sync for checklists (the only shared script)
```

Two content pages are **hubs** — card grids that link the rest: `Quizzes/index.html` and
`Interest Lessons/index.html`. New quizzes/lessons must be added to their hub (see §Index sync).

## The shared foundation (every Kids page)

These hold across all types; the per-type accent (below) layers on top.

- **Warm cream canvas** — an off-white paper, never pure white (`#f6f3ed` / `#f5efe1` /
  `#fff4e8` / `#fffdf7` depending on page). Warm dark ink for text (`#1c1a17` / `#5b4636`).
- **Green = good, red = bad** — the one cross-cutting semantic. Pass / done / correct is a warm
  green (`#3a7d44` · `#356140` · `#3f7d4e`); fail / wrong is red (`#c0392b`, soft-red fill
  `#fbeaea`/`#fbeae7`). Keep this consistent — it's how the kids read every page.
- **English**, short sentences, encouraging. Explain *why* an answer is right, don't just mark it.
- **Self-contained single-file HTML.** Only exception: checklists load the shared Firebase script.

## Per-type playbook

### 1. Checklists — `Checklists/`
The two live checklists (Grace / Warren) are **generated Cowork bundles** — `<x-dc>`, `<sc-for>`,
`{{ }}` templating, `class Component extends DCLogic`. Those are painful to hand-edit; regenerate
them instead.

**For a new checklist, start from `Checklists/checklist-template.html`** — a hand-editable, vanilla-JS
equivalent with the same look and behavior. Copy it, then edit only its top `CONFIG` block
(`CHILD_NAME`, a unique `CLOUD_KEY` + `STORAGE_KEY` per child, and the `TASK_GROUPS` array). No build
step, no bundler. Either way, preserve:
- **Fonts:** Fraunces (serif display) · Newsreader (serif body) · IBM Plex Mono (labels/stats).
- **Palette:** ink `#1c1a17`, cream `#f6f3ed`, rust accent `#b4622f`, green `#3f7d4e` (done/pass),
  red `#c0392b` (failed). Weekend columns tinted (`#d9b9a3`).
- **Interaction:** each cell cycles **empty → done (✓ green) → failed (✕ red) → empty**. 7-day grid,
  task groups with emoji headers, **90% pass threshold**, pass/fail reward boxes. Print-optimized
  (`@page letter`).
- **Cloud sync (the key contract):** include `<script src="../JS/firebase-checklist-sync.js"></script>`,
  then in `componentDidMount` call `window.ChecklistCloud.attach(this, cloudKey, storageKey)`;
  `save()`→`ChecklistCloud.save(...)`, `reset()`→`ChecklistCloud.reset(...)`. Always keep a
  `localStorage` fallback for when the script/Firebase is absent.
  - `cloudKey` = the child, lowercase: `'grace'` / `'warren'` (→ Firebase path `checklists/<child>`).
  - `storageKey` = `'<child>_weekly_checklist_v1'`.

### 2. Quizzes — `Quizzes/`
Hand-authored single-file HTML. **Georgia/serif** body.
- **Question data** is a JS array of objects — reuse this exact shape:
  ```js
  { q: "…question…", options: ["A","B","C","D"], answer: 0, why: "…why the answer is right…" }
  ```
- **Structure:** `.wrap` container → question cards with `.btn` option buttons → `.scoreline` /
  `.stars` / `.result` reveal. Correct pick turns **green** (`#3a7d44`), wrong turns **soft-red**
  (`#fbeaea`); always show the `why`.
- **Theme per book/topic** (accent over the cream base) — keep a book's quizzes visually consistent:
  - *Huckleberry Finn* → river tan/brown `#c9b890` / `#5b4636` (raft motif)
  - *James and the Giant Peach* → orchard greens `#2e7d32` / `#43a047`
  - *Inside Canada's Parliament* → deep green + gold `#1c332c` / `#241f0e` / `#f3ecdd`
  - New book → pick one accent hue that fits it, reuse it across that book's chapters.
- **Naming:** `<Book>-Quiz-Ch<n>.html`, vocab as `<Book>-Vocab-Quiz-Ch<n>.html`.

### 3. Interest Lessons — `Interest Lessons/`
Hand-authored educational pages using **CSS `:root` variables** (`var(--body)` etc.).
- **Structure:** numbered sections — `.sect` blocks with `.num` + `.eyebrow` + `.block` + `.lead`.
- **Palette (geography course):** magenta accent `#a83b80` / `#b0468a`, soft pink `#e9cfe4`, cream
  `#f5efe1`, green `#356140`. The board game runs its own play palette (orange `#E9A23B` +
  green `#4E8B57`). A new course/topic may take its own accent — keep it consistent within the topic.
- Lesson pages **back-link to their hub** (`href="index.html"`).

### Hubs — `Quizzes/index.html`, `Interest Lessons/index.html`
Card grids: `.wrap` → `.grid` → `.quiz`/`.lcard` cards (`.ic` icon · `.t` title · `.d` desc ·
`.tag`/`.chip` tags · `.time` estimate), grouped by book/topic. Match the existing card markup when
adding an entry.

## Firebase & privacy

`JS/firebase-checklist-sync.js` holds a public Firebase web config (public by design — the real
security boundary is the Realtime Database **rules** in the Firebase console, not this file).
Never commit account data, and keep child references to **first names only** (as they are today).

## Index sync — do this every time a page is added/renamed/moved

1. Add/adjust its card in the matching **hub** (`Quizzes/index.html` or `Interest Lessons/index.html`).
2. Update the repo-root `../index.html` if the page is surfaced there (it currently links the two
   checklists, both hubs, the board game, and the Victoria explorer quest — under 👧🧒 孩子们 and
   🤖/🌲 sections).
3. After any move, verify every `href` still resolves (checklists reference `../JS/…`; lessons
   back-link `index.html`).
