/* writing-kinds.js — which course a handed-in piece of writing belongs to
   (HOMEWORK-SYSTEM.md 2026-09-25 · 写作按课程分类, Sam 定).

   The course is decided by the page the piece was handed in from — nothing extra is stored on the
   writing, so every piece ever handed in sorts itself. One table here, read by parent.html,
   homework.html, Writing/Writing-Lab.html, Writing/Summer-Story-Studio.html and
   homework-system/writing-review.mjs (which loads this file with a fake window).

   A new course: add a row (key, 中文名, English name for the kid's pages, colour, its pages).
   A new page for an existing course: add it to that row's pages.

   How many drafts (Sam 2026-09-25):
     文书 ('many')  as many drafts as it takes; a parent's send is either "rewrite it" or "final".
     the others     mark once, rewrite once, then it's final (2026-09-24 批一次改一次就定稿). */
(function (root) {
  'use strict';

  var LIST = [
    { key: 'exam',   zh: 'ISEE / SSAT', en: 'Test Essay',        color: '#4a86e8',
      pages: ['Writing/Writing-Lab.html', 'Writing/ISEE-Writing-Sample-Feedback-Test1.html'] },
    { key: 'app',    zh: '文书',        en: 'Application Essay', color: '#9b6bdf', drafts: 'many',
      pages: ['Writing/Summer-Story-Studio.html', 'Writing/App-Essay-Feedback-PublicSpeaking.html'] },
    { key: 'basa',   zh: 'BASA',        en: 'BASA',              color: '#3fa56b',
      pages: ['Writing/BASA-Invention-Poem-Workshop.html', 'Writing/BASA-Poetry-Read-Aloud.html',
              'Writing/BASA-Read-Aloud-Studio.html'] },
    { key: 'speech', zh: '演讲课',      en: 'Speech',            color: '#e08a2e',
      pages: ['Writing/Speech-Studio.html'] }
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
    for (var i = 0; i < LIST.length; i++) if (LIST[i].pages.indexOf(p) >= 0) return LIST[i];
    return null;
  }
  // The course of a handed-in piece. The pid is looked at first: the application-essay pid and the
  // speech-lesson pids only ever come from those pages.
  function of(w) {
    var pid = String(w && w.pid || '');
    if (/^speech-L\d+-d\d$/.test(pid)) return BY_KEY.speech;
    if (pid === 'app-essay' || pid === 'story-cps' || pid === 'story-res') return BY_KEY.app;
    return ofPage(w && w.itemId) || BY_KEY.exam;
  }
  var many = function (w) { return of(w).drafts === 'many'; };
  // A rewrite of a marked piece. Speech Studio numbers a second hand-in of one step draftNo 2 without a
  // prevId — that is not a rewrite.
  function isRedraft(w) { return (w.draftNo || 1) >= 2 && !!w.prevId; }
  // No more drafts after this one. 文书: only when a parent pressed 定稿 (review.final). The one 文书 made
  // final before 2026-09-25 (mueo…) had review.final written in by hand when this came in.
  function isFinal(w) {
    if (w.status !== 'reviewed') return false;
    return many(w) ? !!(w.review && w.review.final) : isRedraft(w);
  }

  // What Claude is told about each course when it marks (parent.html's 🤖 button and writing-review.mjs).
  var RUBRIC = {
    exam: 'ISEE / SSAT Middle Level timed writing sample (30 minutes). Mark it the way an ISEE / SSAT reader would: '
      + 'organisation, development with specific support, sentence variety, word choice, and grammar / spelling / '
      + 'punctuation all count.',
    app: 'Private-school application essay — ONE complete true personal story, 250–350 words, on a topic the '
      + 'student chose themselves. This is NOT an ISEE/SSAT timed writing sample: there is no time limit and no '
      + 'set prompt to answer. Mark it the way an admissions officer would — they read a few hundred of these a '
      + 'season, most in under two minutes, and they are deciding one thing: can they picture this student in '
      + 'their classroom. The five things that count: (1) it is true and only this student could have written it; '
      + '(2) real sensory detail instead of adjectives — something the reader can see, hear or feel; (3) a quality '
      + 'comes through without being named — no "I learned to never give up"; (4) a real thought at the end, in a '
      + '12-year-old\'s size, not a slogan; (5) their own voice all the way through — flag any sentence that sounds '
      + 'like an adult wrote it. Spelling and grammar get a LIGHT pass only: mention them once if they get in the '
      + 'way, but spend your fix notes on the storytelling and the voice. A clean essay that says nothing scores '
      + 'LOWER here than a rough one that says something real. Never write sentences for the student to copy: '
      + 'a "fix" may tighten or correct their own words, but the new material has to come from them.',
    basa: 'BASA school writing (Grade 7) — the current task is a poem that celebrates an invention, for the BASA '
      + 'writing contest (free verse, a set form, or rhyming — the student chose). Mark it as a poem: concrete images '
      + 'instead of feeling words, sound and rhythm when read aloud, line breaks that do a job, whether it stays on '
      + 'the invention and what it changes, and whether the ending turns or lands. Spelling and grammar get a light '
      + 'pass only.',
    speech: 'Public-speaking homework (Leaders of Tomorrow, Level 1). One course lesson is built in five steps and '
      + 'each step is handed in on its own: step 1 the technique in her own words, step 2 three different opening hooks, '
      + 'step 3 the skeleton (purpose, specific intention, three main points each with support), step 4 three possible '
      + 'last lines plus the takeaway, step 5 the whole speech written out (150-250 words) with the lesson\'s outline above '
      + 'it, then read out loud and recorded. This is a SPOKEN piece, not an essay: mark it by how it would land on a '
      + 'room of listeners. What counts: would the opening make someone look up; is the intention one clear sentence; '
      + 'are the three points genuinely separate, about the same thing, and roughly the same size; does each point have '
      + 'something real behind it; does the ending leave them with one thing. Short sentences and plain words are a '
      + 'virtue here, not a weakness. Spelling and grammar get a light pass only.'
  };

  root.WritingKinds = { list: LIST, byKey: BY_KEY, pagePath: pagePath, ofPage: ofPage, of: of,
                        many: many, isRedraft: isRedraft, isFinal: isFinal, rubric: RUBRIC };
})(typeof window !== 'undefined' ? window : this);
