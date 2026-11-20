/* writing-kinds.js — which course a handed-in piece of writing belongs to
   (HOMEWORK-SYSTEM.md 2026-09-25 · 写作按课程分类, Sam 定).

   The course is decided by the page the piece was handed in from — nothing extra is stored on the
   writing, so every piece ever handed in sorts itself. One table here, read by parent.html,
   homework.html, Writing/Writing-Lab.html, Writing/Summer-Story-Studio.html and
   homework-system/writing-review.mjs (which loads this file with a fake window).

   A new course: add a row (key, 中文名, English name for the kid's pages, colour, its pages).
   A new page for an existing course: add it to that row's pages. A course made of a whole run of pages
   (one per chapter of a book) gives a `match` pattern instead of listing them.

   How many drafts: mark once, rewrite once, then it's final (2026-09-24 批一次改一次就定稿).
   A course row with drafts: 'many' instead goes round as many times as it takes, and a parent's send is
   either "rewrite it" or "final" (review.final). No course uses that since 文书 moved out (below).
   A course row with drafts: 'one' is final as soon as it is marked — no rewrite (reading: one short
   paragraph per chapter, fifty chapters; 2026-11-15).

   Application essays (文书) are NOT here: since 2026-09-25 they are written and marked in the school-
   application site arbutus (~/Projects/arbutus), not in the homework system (Sam). */
(function (root) {
  'use strict';

  var LIST = [
    { key: 'exam',   zh: 'ISEE / SSAT', en: 'Test Essay',        color: '#4a86e8',
      pages: ['Writing/Writing-Lab.html', 'Writing/ISEE-Writing-Sample-Feedback-Test1.html'] },
    { key: 'basa',   zh: 'BASA',        en: 'BASA',              color: '#3fa56b',
      pages: ['Writing/BASA-Invention-Poem-Workshop.html', 'Writing/BASA-Poetry-Read-Aloud.html',
              'Writing/BASA-Read-Aloud-Studio.html'] },
    { key: 'speech', zh: '演讲课',      en: 'Speech',            color: '#e08a2e',
      pages: ['Writing/Speech-Studio.html', 'Writing/Grace-Speech-Thanksgiving.html', 'Writing/Grace-Speech-Healthy-Eating.html'] },
    // Novel study: the paragraph at the end of each chapter page (Quizzes/Holes-Ch1.html, -Ch2, …) and of
    // each Scythe lesson page (Quizzes/Scythe-L1.html … -L23, 2026-11-19).
    // A page in Quizzes/ has a bare file name as its item ID (bank hrefs are relative to Quizzes/).
    { key: 'reading', zh: '阅读',       en: 'Reading',           color: '#b9562b', drafts: 'one',
      pages: [], match: /^(Holes-Ch\d+[a-z]?|Scythe-L\d+)\.html$/ }
  ];
  var BY_KEY = {};
  LIST.forEach(function (k) { BY_KEY[k.key] = k; });

  // A bank / attempt item ID ('..%2FWriting%2FWriting-Lab.html') or a plain path → 'Writing/Writing-Lab.html'.
  function pagePath(id) {
    var s = String(id || '');
    try { s = decodeURIComponent(s); } catch (e) {}
    return s.replace(/[?#].*$/, '').replace(/^(\.\.\/|\.\/|\/)+/, '');
  }
  // The course of a page, or null for a page that isn't a writing page.
  function ofPage(id) {
    var p = pagePath(id);
    if (!p) return null;
    for (var i = 0; i < LIST.length; i++) if (LIST[i].pages.indexOf(p) >= 0 || (LIST[i].match && LIST[i].match.test(p))) return LIST[i];
    return null;
  }
  // The course of a handed-in piece. The pid is looked at first: speech-lesson pids only come from that page.
  function of(w) {
    var pid = String(w && w.pid || '');
    if (/^speech-L\d+-[dsw]\d$/.test(pid)) return BY_KEY.speech;   // -d = old five steps, -s = four steps (09-27), -w = whole speech in one sitting (10-04)
    return ofPage(w && w.itemId) || BY_KEY.exam;
  }
  var many = function (w) { return of(w).drafts === 'many'; };
  // A rewrite of a marked piece. Speech Studio numbers a second hand-in of one step draftNo 2 without a
  // prevId — that is not a rewrite.
  function isRedraft(w) { return (w.draftNo || 1) >= 2 && !!w.prevId; }
  // No more drafts after this one. drafts:'many': only when a parent pressed 定稿 (review.final).
  function isFinal(w) {
    if (w.status !== 'reviewed') return false;
    if (of(w).drafts === 'one') return true;
    return many(w) ? !!(w.review && w.review.final) : isRedraft(w);
  }

  // What Claude is told about each course when it marks (parent.html's 🤖 button and writing-review.mjs).
  var RUBRIC = {
    exam: 'ISEE / SSAT Middle Level timed writing sample (30 minutes). Mark it the way an ISEE / SSAT reader would: '
      + 'organisation, development with specific support, sentence variety, word choice, and grammar / spelling / '
      + 'punctuation all count.',
    basa: 'BASA school writing (Grade 7) — the current task is a poem that celebrates an invention, for the BASA '
      + 'writing contest (free verse, a set form, or rhyming — the student chose). Mark it as a poem: concrete images '
      + 'instead of feeling words, sound and rhythm when read aloud, line breaks that do a job, whether it stays on '
      + 'the invention and what it changes, and whether the ending turns or lands. Spelling and grammar get a light '
      + 'pass only.',
    speech: 'Public-speaking homework (Leaders of Tomorrow, Level 1) for a Grade 3 child. Since 2026-10-04 one lesson is: read '
      + 'the lesson (skill, model speech), then write the WHOLE speech in one sitting (about 150-250 words: first line, '
      + 'introduction, three points each with one real moment, conclusion, last line), then read it out loud and record it. '
      + '(Pieces handed in before that came from older step-by-step versions: four steps 09-27 to 10-04 — stories, the '
      + 'YOUR SPEECH table, first/last line, whole speech — and five steps before that; mark those as the part they are.) This is a SPOKEN piece, not an essay: mark it by how it would land on a '
      + 'room of listeners. What counts: would the opening make someone look up; is the intention one clear sentence; '
      + 'are the three points genuinely separate, about the same thing, and roughly the same size; does each point have '
      + 'something real behind it; does the ending leave them with one thing. Short sentences and plain words are a '
      + 'virtue here, not a weakness. Spelling and grammar get a light pass only.',
    reading: 'Novel study for a strong 12-year-old reader (Grade 7, has finished SSAT prep). After each chapter of the '
      + 'book he writes ONE paragraph of about 80-120 words, untimed, choosing between an ANALYSIS prompt (a claim '
      + 'about how the author creates an effect) and an IMITATION prompt (his own writing in the author\'s manner); '
      + 'the PROMPT line says which. For ANALYSIS mark, in this order: is there one clear claim; does he use specific '
      + 'details from the chapter as evidence (a paraphrase is fine, vague gestures are not); does he explain HOW each '
      + 'detail produces the effect instead of just listing it; does he name a technique correctly (tone, irony, '
      + 'euphemism, word choice, what is withheld, characterization). For IMITATION mark: does it use the techniques '
      + 'the prompt asked for, is the voice controlled, does it show rather than state. Check any claim about the '
      + 'book against the chapter itself before calling it right or wrong. Language: point out at most two things, '
      + 'the ones that most get in the way; this is not a grammar exercise. The writing ends with two extra lines, '
      + '"My prediction: …" and "Watching: …": his prediction about what will matter later in the book. Comment on '
      + 'the prediction in one "note" (is it reasoned from the text?) and NEVER reveal whether it comes true or '
      + 'anything from later chapters. There is no rewrite: this marking is final, so "next_time" must be things he '
      + 'can do in the next chapter\'s paragraph.'
  };

  root.WritingKinds = { list: LIST, byKey: BY_KEY, pagePath: pagePath, ofPage: ofPage, of: of,
                        many: many, isRedraft: isRedraft, isFinal: isFinal, rubric: RUBRIC };
})(typeof window !== 'undefined' ? window : this);
