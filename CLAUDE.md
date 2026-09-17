# CLAUDE.md — Kids

> 🔴 **改任何已存在的页面之前，先 `cd Kids && git pull`，并重新 stage 一次那个文件。**
> Cowork 和 Claude Code 在同一个仓库里同时干活，拿 session 里的旧副本覆盖会抹掉对方的修正
> （2026-09-15 已发生三次，细节见 `HOMEWORK-SYSTEM.md` 第三十三节「🔴 零」）。做新课就只写新课那一个文件。
>
> **Building the homework system?** Read `HOMEWORK-SYSTEM.md` in this folder first —
> it holds the design decisions, the permission matrix, the Firestore model, and the
> things not to re-litigate (why Firebase over Supabase, why the quiz pages stay as
> single files). This file below is the house style for the pages themselves.

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

**`Checklists/Manners Scoreboard.html`** is the newer behavior tracker (both kids on one page).
It drops the task grid entirely: each kid starts at **10**, a **yellow card = −0.5**, running total
you reset manually, **pass line 5.0 (50%)**, plus a **per-kid round-start date** (a round can begin any
weekday; Reset dates a fresh round to today) and a **7-day reset countdown** (`ROUND_DAYS` config; shows
days left → "reset due today" → overdue). **Consequence rule:** miss the pass line and the kid gets **no
screen time the next week**, and that week's bar rises to **60%** — flip on the per-kid **Penalty week**
toggle (`PENALTY_PCT` config) to hold them to 6.0; it shows a red "no screen time" banner and survives Reset.
**Card log is the source of truth:** each card is a logged entry `{id, type:'yellow'|'red', reason, date}`
(yellow −0.5, red −1.0 = two yellows). Add via per-kid type-pick + required reason. The **log is permanent
history** — there is no bulk-clear (removed by request; only a per-row ✕ for fixing a mis-tap). Score/pips/counts
count **only the current week** — entries with `date >= that kid's start` (see `inRound`). Each log row has an
inline **edit (✎)** — opens an in-row editor for type / kid / reason / date (Save/Cancel); changing the kid moves
the entry between the two Firebase nodes. **New Week · Today**
just moves the kid's `start` forward, resetting the visible score to 10 without deleting anything; older cards
stay in the log dimmed as "past week". Legacy `{yellow:N}` payloads auto-migrate to yellow entries on load.
Synced payload is `{entries, start, penalty}` under the same `grace_manners`/`warren_manners` keys. Score number/meter are color-banded (green ≥5 · rust 2.5–4.5 ·
red <2.5). The 10-card pip strip is literal: each card absorbs **two** yellows — full green (kept) →
half green/half yellow (1 yellow) → whole red (2 yellows = one red card). Green + half·0.5 always equals
the score. Hand-editable vanilla JS — edit only the top `CONFIG` block. Uses the same Firebase
script but under **separate keys** (`grace_manners` /
`warren_manners`, storage `<child>_manners_v1`) so it never touches the old `grace` / `warren` data.

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

`Interest Lessons/index.html` is still a hand-written card grid: `.wrap` → `.grid` → `.lcard`
cards (`.ic` icon · `.t` title · `.d` desc · `.chip` tags). Match the existing markup when you
add an entry.

**`Quizzes/index.html` is data-driven — never hand-write a card into it.** Every quiz on that
page comes from the `Q` array in the script at the bottom. The child blocks, subject sections,
book shelves, counts, search index, date views and NEW badge are all built from that array at
load time, so **there are no `.count` pills to keep in sync** and nothing to place by hand.

```js
{ k:'warren', s:'📖 Reading', g:'🛶 The Adventures of Huckleberry Finn',
  gn:'by Mark Twain', h:'Huck-Finn-Quiz-Ch12.html', i:'🛶', t:'Chapter 12',
  d:'15 questions', tg:[['reading','Reading']], a:'2026-07-14' }
```

| field | what it does |
|---|---|
| `k` | child — `grace` · `warren` · `both` (shared; stays visible whichever name is picked) |
| `s` | subject heading, **including its emoji** — reuse an existing string exactly, or add a new one to `SUBJ_ORDER` |
| `g` | book / test set. Leave it out and the card sits loose in the subject; give it and the card goes inside that shelf tile |
| `gn` | small grey note beside the book name (author, "timed like the real SSAT") |
| `h` `i` `t` `d` | href · emoji · short title · one line of detail |
| `tg` | tags, `[['reading','Reading']]` — classes are `reading`, `vocab`, `think` |
| `a` | `YYYY-MM-DD` added date — drives the NEW badge and all three date views |
| `w` | `1` = full-width card, for "start here" pages and ones with a long description |
| `ac` | custom border colour, wide cards only |
| `o` | manual sort key — **only when the title has no useful number in it** |

**Sorting takes care of itself.** Inside a shelf, cards sort by the first number in the title
whenever most of that set's titles open with Chapter / Chapters / Exercise / Part / Lesson /
Unit / Book / Pages — so Ch 3 lands before Ch 18. Every other set sorts newest-first. Wide
(`w:1`) cards lead their group. Reach for `o` only when neither rule gives the order you want.

**Everything starts folded.** Subjects render closed, so the landing view is just the three
children and their subject headings with counts — one screen, however far the page grows. The
one exception is a subject holding something added today: it opens itself, and so does the
shelf inside it, so a NEW badge is never buried behind a fold.

**Three ways in, all self-building:** the search box (matches title, detail, subject, book,
child and filename — English, Chinese and bare chapter numbers all work), the name chips, and
the date views. When the name filter hides a match, the page offers "Search everyone" instead
of pretending nothing matched.

## Firebase & privacy

`JS/firebase-checklist-sync.js` holds a public Firebase web config (public by design — the real
security boundary is the Realtime Database **rules** in the Firebase console, not this file).
Never commit account data, and keep child references to **first names only** (as they are today).

## Index sync — do this every time a page is added/renamed/moved

1. **Quizzes** — the old `Q` array in `Quizzes/index.html` is gone (that hub retired 2026-09-17;
   the file is now a ~90-line signpost to `homework.html` / `parent.html`, kept only so the
   "back to all quizzes" links at the bottom of the 94 pages under `Quizzes/` don't 404).
   A new page is registered in three steps instead:
   ① add its questions to `homework-system/bank.json`;
   ② run `homework-system/inject-report.py` so the page gets its
   `<script src="../JS/quiz-report.js"></script>` line (it injects every html that hasn't got one);
   ③ run `node homework-system/check-bank.mjs --write` to sync the bank into Firestore.
   The page then shows up by itself in 家长台 (`parent.html`) and can be assigned to a child.
   **Interest Lessons** — still hand-written: add its `.lcard` to the grid.
2. Update the repo-root `../index.html` if the page is surfaced there (it currently links the two
   checklists, both hubs, the board game, and the Victoria explorer quest — under 👧🧒 孩子们 and
   🤖/🌲 sections).
3. After any move, verify every `href` still resolves (checklists reference `../JS/…`; lesson
   pages back-link `index.html`; both hubs offer **← Kids home** (`../index.html`) as well as
   **← Back to Home** (`../../index.html`)).
