# ✨ Word Wizards Academy ✨
### A Typing & Writing Adventure Game — Complete Design Document

**Target player:** 9-year-old girl, beginner-to-early-intermediate typist
**Platform:** Computer / laptop (physical keyboard required)
**Session length:** 15–20 minutes
**Tone:** Warm, colorful, encouraging, never stressful
**Purpose of this document:** Complete enough to hand to a developer, designer, or AI coding tool to build a prototype.

---

## 1. Game Concept

### Theme: A Magic School for Word Wizards

The player is a new student at **Word Wizards Academy**, a floating school in the clouds where words have magical power. Every letter typed casts a little spell. The Academy's magical library — the **Storybook of Everything** — has lost its words, and the pages are blank! As the player learns to type and write, her words fly into the Storybook and bring its world back to life: characters wake up, gardens bloom, dragons hatch, and villages light up.

### Why this theme works

- **Typing = casting spells.** Every keystroke has an immediate, magical visual effect. Practice never feels like drill work.
- **Writing = world-building.** Her sentences and stories literally become part of the game world (her "Finish the sentence" answers appear on signs, in character speech bubbles, in the Storybook pages).
- **A school setting that's the opposite of stressful school.** No grades, no red pens. Teachers are friendly magical creatures who celebrate effort.

### Main characters

| Character | Role | Personality |
|---|---|---|
| **Professor Quill** | An elderly owl with tiny glasses; the headmaster | Gentle, wise, endlessly patient. Gives instructions and praise. |
| **Inky** | A small octopus who lives in an ink pot; the player's sidekick | Silly, enthusiastic, cheers for everything. Comic relief. |
| **Letter Sprites** | 26 tiny glowing creatures, one per letter (A is a red apple sprite, S is a blue snake sprite…) | Each sprite is "rescued" as the player masters its key. Collectible. |
| **The Smudge** | A harmless, bumbling blob of spilled ink; the "villain" | Never scary. It smudges words and makes silly spelling mistakes for the player to fix. It's more of a messy puppy than a threat. |

### Story arc (maps to the level structure)

1. **Arrival:** The player gets her wizard hat and wand (cursor) and meets Professor Quill.
2. **The Blank Storybook:** She discovers the Storybook of Everything is empty and promises to help refill it.
3. **Rescue the Letter Sprites:** Each key she learns frees one sprite (keyboard familiarity).
4. **The Word Garden:** Typed words grow into plants and creatures (word-level typing).
5. **The Sentence Bridge:** Complete sentences build bridges to new islands (sentence writing).
6. **The Smudge's Mess:** Fix smudged spelling and punctuation to clean up the Academy (editing skills).
7. **The Grand Storyteller:** She writes her own pages into the Storybook — her stories become the final chapters of the game (creative writing).

---

## 2. Main Learning Goals

| Skill | How the game teaches it |
|---|---|
| **Letter recognition on the keyboard** | Letter Sprite rescue missions: a sprite appears on screen, the matching key glows on an on-screen keyboard, and the glow fades over sessions until she finds keys without help. |
| **Finger placement** | "Home Row Nest": animated hands show which finger reaches each key; color-coded keys match color-coded fingers (left pinky = purple, etc.). Gentle reminders, never blocked progress if she uses the "wrong" finger. |
| **Common words (sight words)** | Word-level mini-games use grade 3–4 word lists (Dolch/Fry sight words + themed magic words). Frequently-missed words automatically reappear more often. |
| **Punctuation** | Punctuation marks are "magic finishers": a sentence spell only *sparkles* when it ends with `.` `?` or `!`. The Smudge steals punctuation and the player puts it back. |
| **Capital letters** | Capitals are "big magic": names and sentence-starts glow gold when capitalized correctly. Shift key introduced as the "power-up key." |
| **Sentence structure** | Sentence-building games: arrange word tiles, then *type* the finished sentence. Introduces subject + verb + detail naturally ("The dragon eats purple pancakes."). |
| **Short paragraph writing** | Guided 3–4 sentence tasks with sentence starters ("First… Then… Finally…"). The paragraph appears as a page in the Storybook. |
| **Creative storytelling** | Open-ended story prompts with picture inspiration, character choices, and "story seeds." No length pressure — even two sentences fills a Storybook page beautifully. |

**Accuracy before speed, always.** The game never shows a countdown timer in beginner levels. Speed elements appear only in optional mini-games, and even there, "slow and right" scores better than "fast and wrong."

---

## 3. Game Levels (World Structure)

The game is organized into **6 Worlds**, each with 5–8 short lessons (2–4 minutes each). A world unlocks when the previous one is ~80% complete — but earlier worlds stay open for replay.

### World 1: The Letter Meadow *(keyboard discovery)*
- Find letters on the keyboard; no finger placement pressure yet.
- Lessons: home row keys → top row → bottom row → all letters mixed.
- Each lesson rescues 3–4 Letter Sprites.
- On-screen keyboard always visible with glowing hints.
- **Goal:** Can find any letter within ~3 seconds.

### World 2: The Home Row Nest *(finger placement)*
- Introduces the "resting nest" (ASDF-JKL;) and the bumps on F and J ("the secret braille runes").
- Color-coded finger guides; short bursts (30–60 seconds) of guided typing.
- Space bar ("the thumb drum") and Enter ("the magic seal").
- **Goal:** Returns fingers to home row by habit; types home-row words without looking.

### World 3: The Word Garden *(words)*
- Type 2–5 letter sight words; each correct word grows a flower/creature in her personal garden.
- Introduces Shift for capital letters ("power-up key") — her own name is the first capital she types.
- Word families (cat/hat/bat), days of the week, color words, animal words.
- **Goal:** Types common short words smoothly; uses Shift for capitals.

### World 4: The Sentence Bridge *(sentences)*
- Type full simple sentences (4–8 words) to build bridge planks across the sky.
- Punctuation introduced: period, question mark, exclamation mark, then comma.
- Copy-typing first (sentence shown, she types it), then dictated pictures ("type what the dragon is doing").
- **Goal:** Types a complete sentence with capital + end punctuation, unassisted.

### World 5: The Smudge's Mess *(editing & fixing)*
- The Smudge has smudged the Academy's signs and letters! Fix spelling, missing capitals, and missing punctuation.
- Teaches: spotting errors, using Backspace confidently ("the undo charm"), arrow keys to move the cursor.
- "Silly sentence hospital": rewrite goofy broken sentences correctly.
- **Goal:** Can find and fix 1–2 errors in a short sentence.

### World 6: The Grand Storyteller *(paragraphs & creative writing)*
- Guided paragraph writing → open creative writing.
- Journal entries, letters to characters, picture descriptions, and original short stories.
- Her writing is saved into her personal **Storybook** — a beautiful, illustrated, printable book of everything she's written.
- **Goal:** Writes 3–5 sentence paragraphs independently and enjoys it.

---

## 4. Mini-Games

Available from the **Playground** area anytime (great for the "fun ending" of each session).

### 🌟 1. Sprite Catch
- **How it works:** Letter Sprites float gently down the screen holding their letter. Press the matching key to catch them in the ink pot. Missed sprites just float away (nothing bad happens) and come around again.
- **Teaches:** Letter recognition, key location.
- **Fun factor:** Sprites giggle when caught; catching 10 in a row triggers a confetti "Sprite Party." Speed is adjustable and starts *very* slow.

### 🌸 2. Bloom Burst
- **How it works:** A word appears above a flower bud. Type it correctly and the flower blooms with a satisfying *pop*. Every 5 blooms attracts a butterfly, bee, or hummingbird to the garden.
- **Teaches:** Word-level typing, sight words, spelling.
- **Fun factor:** The garden is persistent — it stays and grows across days, so she can watch her garden fill up over weeks.

### 🐉 3. Dragon Snacks
- **How it works:** A baby dragon is hungry. Sentences describing foods appear ("The dragon wants three cheesy tacos!"). Type the sentence and the food flies into the dragon's mouth; it does a happy dance.
- **Teaches:** Sentence copy-typing, punctuation (the dragon won't eat until the sentence ends with punctuation — it politely points at the missing mark).
- **Fun factor:** Increasingly ridiculous foods; the dragon visibly grows over time and eventually learns to fly.

### 🕵️ 4. Smudge Patrol
- **How it works:** A sign or letter appears with one mistake (wrong letter, missing capital, missing period), and the Smudge is hiding nearby looking guilty. Find the error, click it, and type the fix.
- **Teaches:** Proofreading, spelling, capitals, punctuation.
- **Fun factor:** The Smudge does a dramatic "you got me!" flop every time. Collect "Smudge stamps" for a sticker book.

### 🚀 5. Word Rocket (optional gentle speed game)
- **How it works:** Type words to fuel a rocket. There's no countdown — the rocket simply flies higher the more she types in one "flight." Her previous best height is shown as a friendly flag to beat *if she wants to*.
- **Teaches:** Typing fluency and rhythm; self-competition instead of pressure.
- **Fun factor:** The rocket passes fun altitude landmarks (clouds → geese → airplane → aurora → moon).

### 💌 6. Owl Post
- **How it works:** Characters send her short letters ("Dear Wizard, what is your favorite animal? — Inky"). She types a 1–2 sentence reply and an owl delivers it. The character replies next session, referencing what she wrote.
- **Teaches:** Purposeful writing, answering questions in sentences.
- **Fun factor:** Real correspondence! The mailbox with a waiting letter is a powerful reason to come back tomorrow.

---

## 5. Writing Activities (Worlds 4–6)

Each activity produces a page in her Storybook. Suggested rotation:

1. **Finish the Sentence** — "If I had a pet dragon, I would…" / "The silliest thing in my backpack is…" Three starter choices so she's never stuck.
2. **Describe the Picture** — A colorful scene appears (a mermaid tea party, a dog driving a bus). Prompt: "Write 2 sentences about what you see." Word bank of helpful vocabulary on the side.
3. **Message to a Character** — Write to Inky, the dragon, or Professor Quill. The character responds next time.
4. **Create a Short Story** — Pick a hero, a place, and a problem from illustrated cards (or roll the "Story Dice"), then write 3–6 sentences. The game assembles simple illustrations to match her chosen cards.
5. **Diary of a Wizard** — A journal entry: "Dear Diary, today at the Academy…" Can be about real life or the game world. Private by default (parent can see *that* she wrote, and reading it is a settings choice — recommended off for trust).
6. **Silly Sentence Rescue** — The Smudge wrote "the cat ated fiv purpel sandwichs" — rewrite it correctly! Escalates from 1 error to several.
7. **List Magic** (easy-day option) — Type a list: "5 things that would be in your potion." Low effort, high fun, still typing practice.

---

## 6. Reward System — Effort Over Speed

### Core currency: ⭐ Star Sparks
Earned for **completing** activities, not for speed. Bonus stars for: trying a hard thing, improving on a personal best, and finishing a writing piece.

### Rewards

| Reward | How it's earned | What it does |
|---|---|---|
| **Letter Sprites (26)** | Master each key (used correctly ~20 times) | Collectible creatures that live in her dorm room and do little animations |
| **Badges** | Milestones: "First Sentence!", "Punctuation Pro", "Capital Champion", "Story Starter", "Comeback Kid" (returned after 3+ days away — never framed as guilt) | Displayed on her wizard robe |
| **Wizard Wardrobe** | Spend Star Sparks | Hats, robes, wands, glasses, pets — pure cosmetic fun |
| **Garden & Dorm items** | Spend Star Sparks | Decorate her persistent garden and dorm room |
| **Story progress** | Complete world lessons | New islands, characters, and chapters of the Academy story unlock |
| **Keyboard Mastery Stars** | Per-key accuracy milestones | Her on-screen keyboard fills with gold keys — a visual map of mastery |
| **Author Awards** | Creative writing milestones: first story, first 5-sentence paragraph, 10 Storybook pages | Her Storybook gets a fancier cover; a "Book Launch Party" scene where characters read her story aloud |
| **Printable Storybook** | Ongoing | Parent can print her illustrated Storybook — a real keepsake that makes writing feel important |

### Anti-frustration rules
- **No losing.** No lives, no game-overs, no falling scores. The worst outcome is "not yet — try again whenever you like."
- **Streaks reward presence, not perfection** ("You practiced 3 days this week! 🎉"), and broken streaks are never mentioned.
- **Every session ends with a win** — the last activity is always something she can definitely do.

---

## 7. Adaptive Difficulty

The game quietly tracks per-key accuracy, per-word accuracy, and typing rhythm, then adjusts:

1. **Warm-up calibration:** Each session starts with a 60-second playful warm-up that doubles as assessment.
2. **Struggling keys get gentle extra reps:** If `B` is missed often, more B-words appear in Bloom Burst — never announced as remediation, just "the garden needs some B-flowers today!"
3. **Pace gates:** New content (e.g., punctuation) only introduces when current content is ≥85% accurate *and* she's not showing frustration signals (rapid random keying, long pauses, many deletes).
4. **Down-shifting is invisible and instant:** After 3 misses in a row, the current item gets easier (shorter word, glowing key hint returns). No message, no shame — the hint simply reappears.
5. **Speed expectations grow slowly:** Target WPM starts at ~5 and rises only when accuracy stays ≥90%. Suggested arc: 5 → 8 → 12 → 15–20 WPM over several months.
6. **Choice preserves agency:** Each day she picks between 2–3 activity options at the same difficulty, so adaptation never removes her sense of control.

---

## 8. Parent Dashboard ("The Headmaster's Office")

Accessed with a simple parent gate (e.g., "hold P + type your year of birth"). Clean, minimal, one screen:

- **This week at a glance:** sessions played, minutes practiced, activities completed.
- **Accuracy:** overall % with a simple trend arrow (▲ improving).
- **Typing speed:** WPM with trend — presented with the note *"Speed grows naturally; accuracy matters more right now."*
- **Keyboard heat map:** keyboard image with keys shaded green (strong) → amber (developing) → soft red (needs practice). Instantly shows problem keys like `Q` or `;`.
- **Tricky words list:** the 5–10 words she most often misspells.
- **Writing progress:** number of Storybook pages, average sentence length trend, punctuation/capitalization correctness trend. Links to view her stories (with the diary-privacy setting noted).
- **Suggested practice:** 2–3 auto-generated suggestions, e.g. *"Play Bloom Burst with the 'B & V words' pack"* or *"She's ready to try her first 3-sentence paragraph."*
- **Settings:** session length, sound, difficulty pacing, diary privacy, print Storybook.

---

## 9. Daily Practice Plan (15–20 minutes)

Designed for a child who may tire or get bored — short segments, always ending on fun:

| Minutes | Segment | Content |
|---|---|---|
| 0–2 | **Welcome ritual** | Check the mailbox (Owl Post reply!), see garden growth, say hi to sprites. Builds anticipation, costs no effort. |
| 2–5 | **Warm-up** | One quick playful drill matched to yesterday's tricky keys (doubles as calibration). |
| 5–12 | **Main lesson** | One new lesson from the current World (the actual skill-building block). |
| 12–17 | **Her choice** | Any mini-game or writing activity she wants. Autonomy = motivation. |
| 17–20 | **Cool-down & celebration** | Star tally, badge check, Inky's silly joke of the day, "see you tomorrow" from Professor Quill. |

- **Tired-day mode:** If she's flagging, a "Short Day" button runs just Welcome + one mini-game (5–7 min). Showing up counts.
- The game gently suggests stopping after 25 minutes ("Even wizards rest their fingers!").

---

## 10. Example First Week Plan

| Day | Focus | Activities | Win of the day |
|---|---|---|---|
| **1** | Welcome & explore | Create wizard avatar, meet Quill & Inky, tour the Academy, Sprite Catch (very slow) with home-row letters | First 4 Letter Sprites rescued |
| **2** | Home row left hand | Home Row Nest lesson (A S D F), Sprite Catch with those keys, decorate dorm with first stars | "Left Hand Hero" badge |
| **3** | Home row right hand | J K L ; lesson, thumb drum (space bar), Bloom Burst with home-row words (*ask, lad, fall, salad*) | First flowers in her garden |
| **4** | Full home row + first word | Mixed home-row drill, type her own name with the Shift "power-up" — it appears in gold on her dorm door | Her name, capitalized, on the door |
| **5** | Top row intro | E, R, T, U, I lesson, Bloom Burst word families (*red, tree, sit*), first Owl Post: type a one-word answer to Inky's question | First mail sent |
| **6** | Play & consolidate | Her choice day: replay any mini-game; optional first Word Rocket flight (no target) | Personal rocket height flag planted |
| **7** | First sentence! | Guided: copy-type "I am a word wizard." with capital + period → fireworks, sentence appears as **page 1 of her Storybook** | "First Sentence!" badge + Storybook begins |

Parent tip built into the dashboard: *sit nearby days 1–3, then let her fly solo with you in earshot.*

---

## 11. Sample Game Screens

### 🏰 Home Screen — "The Academy Courtyard"
A bright illustrated courtyard under a pastel sky. Her avatar stands center. Clickable locations: **Classroom** (today's lesson — gently pulsing), **Playground** (mini-games), **Writing Tower** (writing activities), **Her Dorm** (rewards, sprites, wardrobe), **Garden** (persistent Bloom Burst garden), **Mailbox** (Owl Post — bounces when mail waits). Top corner: star count and a tiny settings gear. **No menus of text; everything is a place.**

### ⌨️ Typing Practice Screen
Top half: the activity scene (sprites falling, dragon waiting, bridge building). Middle: the current text to type in large, rounded, high-contrast font — typed letters turn green with a soft chime, the next letter is underlined. Bottom: friendly on-screen keyboard with glowing hint keys and color-coded finger zones; small animated hands (toggleable). Corner: Inky reacting to her typing with cheers. **No timer visible. No error counter visible.** Mistyped keys just wiggle softly; nothing turns harsh red.

### ✍️ Writing Challenge Screen
Left: the inspiration panel (picture, character letter, or story cards). Right: a big cream "spell parchment" text area with large font and generous line spacing. Below it: a **word bank** of clickable helper words and a friendly toolbar (Backspace charm, "read it to me" button that reads her text aloud). Professor Quill perches in the corner offering one gentle tip at a time. A "✨ Finish ✨" button triggers the page-into-Storybook animation.

### 🏆 Reward Screen — "Her Dorm Room"
A cozy attic room she decorates. Shelves display Letter Sprites (each animating when clicked), her badge robe on a stand, wardrobe closet, and the Storybook on a pedestal — click to flip through every page she's ever written, illustrated and dated. Confetti moments happen *here* after milestones.

### 📊 Parent Progress Screen
Flat, calm, adult design (white/navy, no game art) — one scrollable page matching Section 8: week summary cards up top, keyboard heat map center, tricky words and writing trends below, suggested practice at the bottom. Print Storybook button prominent.

---

## 12. Optional AI Features (gentle, never discouraging)

1. **Spelling helper, not spell-checker:** After she finishes (never while typing), Quill says: "Beautiful story! Want to make 2 words even stronger?" Misspelled words get a soft sparkle underline; clicking shows 2–3 choices rather than an auto-correction. She always makes the fix herself. Max 2–3 flags per piece regardless of error count.
2. **Praise-first feedback formula:** AI feedback always follows *specific praise → one suggestion → encouragement*: "I love how your dragon sneezes glitter — so imaginative! Wizards start sentences with a capital letter — can you find one that needs its big magic? You're becoming a real author!"
3. **Story companion:** If she's stuck mid-story, Inky offers three "what happens next?" idea bubbles to click for inspiration — suggestions, never text written for her.
4. **Character conversations:** Owl Post replies are AI-generated to reference what she actually wrote ("A hamster named Pickles?! Does Pickles do tricks?") — making writing feel *heard*, the strongest motivator of all.
5. **Read-aloud:** AI text-to-speech reads her writing back in a warm voice — kids often catch their own missing words by ear, which is self-correction without criticism.
6. **Adaptive prompt generation:** AI generates fresh writing prompts tuned to her interests (learned from her stories: loves animals → more animal prompts) and her level (sentence length, vocabulary).
7. **Parent-facing summaries:** AI writes the dashboard's "suggested practice" lines and a weekly parent note: "Grace wrote her longest story yet on Thursday — 6 sentences! Commas are the next frontier."
8. **Hard safety rails:** All AI output filtered for age-appropriateness; no open-ended chat (character replies are bounded to the game world and her writing); no personal-data requests; all AI feedback capped in length and always kind.

---

## 13. Notes for the Prototype Builder

- **Simplest viable prototype:** a single-page web app (HTML/CSS/JS, no backend) with: World 1 letter game (Sprite Catch), Bloom Burst, one sentence-typing activity (Dragon Snacks), local-storage progress, star counter, and the on-screen keyboard component. AI features and Owl Post can be stubbed with canned responses.
- **Key reusable component:** the *TypingLine* widget (target text, per-key validation, green-fill feedback, soft-wiggle on miss, per-key stats logging). Every mini-game wraps this one component.
- **Data to log per keystroke:** target key, pressed key, correct?, latency — this powers the heat map and adaptive difficulty.
- **Fonts/colors:** large rounded sans-serif (e.g., Baloo 2 / Quicksand), pastel palette, high contrast text, generous spacing. Sound: soft chimes and pops, master mute.
- **Accessibility:** all instructions read aloud (she shouldn't need to *read* fluently to learn to *type*), toggleable animations, adjustable font size.
