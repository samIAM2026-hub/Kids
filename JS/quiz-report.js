/* =====================================================================
   quiz-report.js — records a kid's attempt on a Kids quiz / practice /
   reference page. Design: HOMEWORK-SYSTEM.md §四 (score reporting) and §五
   (focus data).

   Loaded by ONE line at the end of each page, after the page's own scripts:
     <script src="../JS/quiz-report.js"></script>

   It never changes grading. An adapter recognises the page's structure,
   reads the score the page already computed, and times each answer.
   Pages no adapter recognises are recorded as "viewed" (time + focus only).

   Writes attempts/{id} as the signed-in kid, using the same named Firebase
   app ('kid') as homework.html, so the sign-in carries over. No kid signed
   in → nothing is recorded. Can't reach Firestore → kept in localStorage and
   sent on the next page load or when the connection comes back.

   Parent preview (?preview=1 on the URL, added by parent.html's links): nothing is
   recorded and a 家长预览 badge is shown instead.

   Shared iPad / computer: a name badge in the top-right corner shows whose
   score this will be ("Not you?" signs out), and 30 minutes with nobody
   using the site signs the kid out — same rule and key as homework.html.
===================================================================== */
(function () {
  'use strict';

  // Parent preview: parent.html's 题库 / 今日作业 links add ?preview=1. Record nothing and touch no
  // sign-in — otherwise a kid signed in on the same device would get the parent's clicks as a score.
  if (/(?:^|&)preview=1(?:&|$)/.test(location.search.slice(1))) {
    var showPreview = function () {
      var b = document.createElement('div');
      b.textContent = '家长预览 · 不记成绩';
      b.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;font:600 13px system-ui,sans-serif;' +
        'padding:6px 12px;border-radius:999px;background:#fff4d6;color:#7a5200;border:1px solid #e0b64a;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.12)';
      document.body.appendChild(b);
    };
    if (document.body) showPreview(); else document.addEventListener('DOMContentLoaded', showPreview);
    return;
  }

  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var CONFIG = {
    apiKey: 'AIzaSyDMKUeccjFtMbotXulnMhYcoykWpw4Y7ls',
    authDomain: 'family-checklist-acc6b.firebaseapp.com',
    projectId: 'family-checklist-acc6b',
    appId: '1:127899043154:web:5a49cce9a1913fbc41e68b'
  };
  var QUEUE_KEY = 'quizReport.queue.v1';
  var MAX_AWAY_LOG = 50;     // away segments kept per attempt
  var MIN_AWAY_SECS = 1;     // shorter blips (an alert box, a stray tap) aren't "leaving"
  var VIEW_MIN_SECS = 15;    // a page without an adapter counts as viewed after this long on it
  var ACTIVE_KEY = 'kid.lastActive.v1';   // shared with homework.html
  var IDLE_MS = 30 * 60 * 1000;           // nobody used the site this long → sign the kid out
  var PROG_EVERY_MS = 20000;               // live progress (进行中): at most one write per 20 s while answering
  var BEAT_MS = 60000;                     // …and once a minute while the page is just open (time not handed in)
  var UNF_KEY = 'quizReport.unfinished.v1';   // this device's sessions per kid / page / day (see putProgress)
  var KIDS = {                             // same uids as homework.html; for the name badge only
    mbtSDgfFrOOS4xIT3eXr7pETEt33: { n: 'Grace', av: '👧', fg: '#d84315', bg: '#fff4e8', line: '#ffb37b' },
    paACSAD0W0bBNknKrAf3GfpHy8x1: { n: 'Warren', av: '👦', fg: '#35704a', bg: '#eef6f0', line: '#8bb98f' }
  };

  /* ---------- which bank item is this page ---------- */
  // Bank hrefs are relative to Quizzes/ (pages elsewhere step out with ../);
  // the bank doc id is encodeURIComponent(href).
  var parts = decodeURIComponent(location.pathname).split('/').filter(Boolean);
  var file = parts[parts.length - 1], dir = parts[parts.length - 2];
  var href = dir === 'Quizzes' ? file : '../' + dir + '/' + file;
  var itemId = encodeURIComponent(href);

  /* ---------- reading and wrapping the page's globals ---------- */
  // Indirect eval runs in global scope, so it also sees the page's top-level let/const.
  function peek(name) { try { return (0, eval)(name); } catch (e) { return undefined; } }
  function isFn(name) { return typeof window[name] === 'function'; }

  // Replace a page function declared with `function name()` (those live on window, so the
  // page's own calls and onclick="name()" go through the wrapper). before() gets the call's
  // arguments and returns a context; after() gets that context once the original has run.
  function wrap(name, before, after) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () {
      var ctx = before ? before.apply(this, arguments) : undefined;
      var out = orig.apply(this, arguments);
      if (after) after(ctx);
      return out;
    };
  }

  /* ---------- session: one attempt being timed ---------- */
  var session;
  function now() { return Date.now(); }
  // Read before any listener can refresh it: was the site idle when this page opened?
  function lastActive() { try { return +localStorage.getItem(ACTIVE_KEY) || 0; } catch (e) { return now(); } }
  var idleAtLoad = now() - lastActive() > IDLE_MS;
  function newSession() {
    // A round starting on a practice page ends the menu session: write its last numbers first,
    // so the time spent there still counts (HOMEWORK-SYSTEM.md 2026-09-24 · 没交卷的时间).
    if (session && !session.sent && worthProgress()) sendProgress(false);
    if (session && session.progTimer) clearTimeout(session.progTimer);
    session = { startedAt: now(), lastMark: now(), away: [], awayFrom: null, q: {}, sent: false, fixupSent: false,
                progAt: 0, progTimer: 0 };
  }
  newSession();

  // Focus: the page leaving the foreground (another app or tab, screen locked). A page can't
  // know which app. iPad split view moves focus away without hiding the page, so blur counts
  // only while the page is still visible — otherwise visibilitychange already covers it.
  function leave() { if (session.awayFrom == null) session.awayFrom = now(); }
  function back() {
    if (session.awayFrom == null) return;
    if (now() - session.awayFrom >= MIN_AWAY_SECS * 1000) session.away.push({ from: session.awayFrom, to: now() });
    session.awayFrom = null;
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? leave() : back(); });
  window.addEventListener('blur', function () { if (!document.hidden) leave(); });
  window.addEventListener('focus', back);
  window.addEventListener('pageshow', back);

  function awayBetween(a, b) {
    var segs = session.away.slice();
    if (session.awayFrom != null) segs.push({ from: session.awayFrom, to: now() });
    return segs.reduce(function (s, x) {
      var lo = Math.max(a, x.from), hi = Math.min(b, x.to);
      return hi > lo ? s + (hi - lo) : s;
    }, 0) / 1000;
  }

  // Per-question time = this answer − max(previous answer, previous page turn).
  // On one-question-per-screen pages that is exactly "question shown → answer picked".
  function turn() { session.lastMark = now(); }
  function answered(q, correct) {
    var t = now(), from = session.lastMark;
    var r = session.q[q] || (session.q[q] = { q: q, secs: 0, awaySecs: 0 });
    r.secs += (t - from) / 1000;
    r.awaySecs += awayBetween(from, t);
    if (correct !== undefined) r.correct = correct;
    session.lastMark = t;
    session.started = true;
    progressSoon();
  }
  // Knowledge-point tag (HOMEWORK-SYSTEM.md §三十五; ids in
  // homework-system/_Materials/Math/知识点表.md). Each adapter that can map a question number back to
  // its question object sets skOf below. Untagged pages leave it null and untagged questions return
  // nothing — those are recorded as a bare { q: n } and the parent page files them under 未标注.
  // Nothing here may throw: a missing sk must never cost the kid their score.
  var skOf = null;
  var progTotal = null;   // adapters set this: how many questions the page has (live progress, below)
  function skFor(q) {
    if (!skOf) return undefined;
    try {
      var v = skOf(q);
      return typeof v === 'string' && v ? v : undefined;
    } catch (e) { return undefined; }
  }
  // wrong[] is [{ q: 3, sk: 'm4b.08.convert' }, { q: 7 }] — sk left out when the question has none.
  // Records written before 2026-09-17 hold plain numbers ([3, 7]); parent.html reads both.
  function wrongList() {
    return Object.keys(session.q).map(Number).filter(function (q) { return session.q[q].correct === false; })
      .sort(function (a, b) { return a - b; })
      .map(function (q) { var sk = skFor(q); return sk ? { q: q, sk: sk } : { q: q }; });
  }

  /* ---------- adapters ---------- */
  var ADAPTERS = [
    {
      // One question per screen: render() → choose(i) | check() → next() → showResult().
      // Globals current / score / answered, and questions[] or items[]. (Reading quizzes,
      // vocab MCQs, fill-in-the-blank pages.) A right answer is the one that raised `score`.
      name: 'stepper',
      list: function () { return peek('questions') || peek('items'); },
      match: function () {
        return isFn('showResult') && (isFn('choose') || isFn('check')) &&
          typeof peek('current') === 'number' && typeof peek('score') === 'number' && Array.isArray(this.list());
      },
      install: function () {
        var self = this;
        ['choose', 'check'].forEach(function (fn) {
          wrap(fn,
            function () { return { q: peek('current') + 1, score: peek('score'), was: peek('answered') }; },
            function (c) {
              if (c.was === true || peek('answered') !== true) return;   // already answered, or check() on an empty box
              answered(c.q, peek('score') > c.score);
            });
        });
        skOf = function (q) { var l = self.list(); var it = l && l[q - 1]; return it && it.sk; };
        progTotal = function () { return self.list().length; };
        wrap('render', null, turn);
        wrap('restart', null, newSession);
        wrap('showResult', null, function () {
          submit({ score: peek('score'), total: self.list().length, wrong: wrongList() });
        });
      }
    },
    {
      // All questions on one page: pick(i, j) … finishQuiz(). Globals QUIZ[], picks[], locked. (Math.)
      name: 'picks',
      match: function () {
        return isFn('finishQuiz') && isFn('pick') && Array.isArray(peek('QUIZ')) && Array.isArray(peek('picks'));
      },
      install: function () {
        wrap('pick', function (i) { return { q: i + 1, locked: peek('locked') }; },
          function (c) { if (!c.locked) answered(c.q); });
        skOf = function (q) { var l = peek('QUIZ'); var it = l && l[q - 1]; return it && it.sk; };
        progTotal = function () { return peek('QUIZ').length; };
        wrap('resetQuiz', null, newSession);
        wrap('finishQuiz', null, function () {
          if (peek('locked') !== true) return;                // blanks left: the page refused to grade
          var quiz = peek('QUIZ'), picks = peek('picks'), score = 0;
          quiz.forEach(function (it, i) {
            var ok = picks[i] === it.answer;
            if (ok) score++;
            (session.q[i + 1] || (session.q[i + 1] = { q: i + 1, secs: 0, awaySecs: 0 })).correct = ok;
          });
          submit({ score: score, total: quiz.length, wrong: wrongList() });
        });
      }
    },
    {
      // SSAT timed sections: Start → click .opt[data-n] → grade(auto). Globals DATA.items, answers{},
      // started, done. Question numbers are the printed SSAT numbers (e.g. 31–60).
      name: 'ssat-timed',
      match: function () {
        var d = peek('DATA');
        return isFn('grade') && d && Array.isArray(d.items) && peek('answers') && typeof peek('answers') === 'object';
      },
      install: function () {
        wrap('start', null, newSession);                      // the clock starts at Start, not page open
        progTotal = function () {
          var d = peek('DATA');
          return d.count || d.items.filter(function (x) { return x.type !== 'passage'; }).length;
        };
        // Numbers here are the printed SSAT numbers (31-60), not indexes — match on it.n.
        skOf = function (q) {
          var d = peek('DATA'), items = d && d.items;
          if (!items) return undefined;
          for (var i = 0; i < items.length; i++) if (items[i].n === q) return items[i].sk;
          return undefined;
        };
        // onPick was bound with addEventListener before this script ran, so listen instead of wrapping.
        document.addEventListener('click', function (e) {
          var b = e.target.closest && e.target.closest('.opt[data-n]');
          if (b && peek('started') && !peek('done')) answered(+b.dataset.n);
        }, true);
        wrap('grade', null, function () {
          if (peek('done') !== true) return;                  // cancelled the "blanks left" confirm
          var data = peek('DATA'), answers = peek('answers'), score = 0;
          data.items.filter(function (x) { return x.type !== 'passage'; }).forEach(function (it) {
            var ok = answers[it.n] === it.ans;
            if (ok) score++;
            (session.q[it.n] || (session.q[it.n] = { q: it.n, secs: 0, awaySecs: 0 })).correct = ok;
          });
          submit({ score: score, total: data.count || data.items.length, wrong: wrongList() });
        });
      }
    },
    {
      // Chinese practice games (pinyin, typing, idioms, listen-and-build): a menu of rounds, each ending on
      // a stars screen. Finishing a round counts as done (no pct → "✓ Done") and carries how many items
      // were right on the first try.
      //   startLevel(lvl) … endGame()   globals firstTryOK, total, currentLvl
      //   startTyping()   … endTyping() globals firstTryOK, total
      //   startRound(r)   … finish()    globals solvedFirst, round, ROUNDS[r].items / .name
      // A page may also set REPORT_WRITING (the Writing Lab: the kid's text, handed in to be marked) before
      // finish(); it goes to writings/{same ID as the attempt}, after the attempt itself.
      name: 'practice',
      pairs: [['startLevel', 'endGame'], ['startTyping', 'endTyping'], ['startRound', 'finish']],
      pair: function () {
        return this.pairs.filter(function (p) { return isFn(p[0]) && isFn(p[1]); })[0];
      },
      match: function () {
        return !!this.pair() && (typeof peek('firstTryOK') === 'number' || typeof peek('solvedFirst') === 'number');
      },
      install: function () {
        var p = this.pair();
        // Time the round, not the menu. A game has no per-question hook, so starting a round is
        // what shows 进行中 on the parent page (no x/y count).
        wrap(p[0], null, function () { newSession(); session.started = true; sendProgress(false); });
        wrap(p[1], null, function () {
          var rounds = peek('ROUNDS'), r = rounds && rounds[peek('round')];
          var first = peek('firstTryOK'), items = peek('total'), lvl = peek('currentLvl');
          if (typeof first !== 'number') first = peek('solvedFirst');
          if (typeof items !== 'number') items = r && r.items ? r.items.length : null;
          var writing = peek('REPORT_WRITING');
          submit({
            kind: 'practice',
            practice: { round: r ? r.name || '' : typeof lvl === 'string' ? lvl : '', firstTry: first, items: items },
            writing: writing && typeof writing === 'object' ? writing : null
          });
        });
      }
    }
  ];

  var adapter = null;
  for (var i = 0; i < ADAPTERS.length; i++) {
    try { if (ADAPTERS[i].match()) { adapter = ADAPTERS[i]; break; } } catch (e) {}
  }
  if (adapter) adapter.install();
  else {
    // No grading we understand: record that the page was viewed, once, when the kid leaves it.
    var viewedOnce = function () {
      if (session.sent || (now() - session.startedAt) / 1000 - awayBetween(session.startedAt, now()) < VIEW_MIN_SECS) return;
      submit({});
    };
    document.addEventListener('visibilitychange', function () { if (document.hidden) viewedOnce(); });
    window.addEventListener('pagehide', viewedOnce);
  }

  /* ---------- Firebase (loaded on demand, reusing a page's own SDK if it has one) ---------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  var ready = (function () {
    var p = Promise.resolve();
    if (!window.firebase) p = p.then(function () { return loadScript(SDK + 'firebase-app-compat.js'); });
    return p
      .then(function () { if (!firebase.auth) return loadScript(SDK + 'firebase-auth-compat.js'); })
      .then(function () { if (!firebase.firestore) return loadScript(SDK + 'firebase-firestore-compat.js'); })
      .then(function () {
        var app = firebase.apps.filter(function (a) { return a.name === 'kid'; })[0] || firebase.initializeApp(CONFIG, 'kid');
        return new Promise(function (resolve) {
          // Resolve once the saved sign-in has been restored; after that auth.currentUser is reliable.
          var off = app.auth().onAuthStateChanged(function () { off(); resolve({ db: app.firestore(), auth: app.auth() }); });
        });
      });
  })();

  /* ---------- shared device: idle sign-out + name badge ---------- */
  function signedInKid(auth) { var u = auth.currentUser; return u && !u.isAnonymous ? u : null; }
  var touchedAt = 0;
  function touch() {
    if (now() - touchedAt < 10000) return;
    touchedAt = now();
    try { localStorage.setItem(ACTIVE_KEY, String(touchedAt)); } catch (e) {}
  }

  // Signed in, the badge shrinks to a small avatar bubble so it doesn't cover the quiz: 5 seconds after
  // it shows, when the kid scrolls or taps the page, or with its "−" button. Tapping the bubble opens it
  // again. The not-signed-in warning stays open.
  var badgeEl = null, badgeFolds = false, badgeTimer = 0;
  function badgeSmall(small) {
    clearTimeout(badgeTimer);
    badgeEl.classList.toggle('kb-small', small);
    if (!small) badgeTimer = setTimeout(function () { badgeSmall(true); }, 5000);
  }
  function badge(user, auth) {
    if (!badgeEl) {
      var css = document.createElement('style');
      css.textContent =
        '#kid-badge,#kid-badge *{all:unset;box-sizing:border-box}' +
        '#kid-badge{position:fixed;top:10px;right:10px;z-index:2147483000;display:flex;align-items:center;gap:8px;' +
        'padding:5px 6px 5px 12px;border-radius:999px;border:2px solid;box-shadow:0 2px 8px rgba(0,0,0,.12);' +
        'font:600 14px/1.2 system-ui,-apple-system,sans-serif;max-width:calc(100vw - 20px)}' +
        '#kid-badge .kb-go{cursor:pointer;font-weight:500;font-size:13px;padding:4px 10px;border-radius:999px;' +
        'background:#fff;border:1px solid currentColor;white-space:nowrap}' +
        '#kid-badge .kb-av{display:none}' +
        '#kid-badge.kb-small{width:40px;height:40px;padding:0;justify-content:center;cursor:pointer;opacity:.85}' +
        '#kid-badge.kb-small>*{display:none}' +
        '#kid-badge.kb-small .kb-av{display:inline;font-size:20px}' +
        '@media print{#kid-badge{display:none}}';
      document.head.appendChild(css);
      badgeEl = document.createElement('div');
      badgeEl.id = 'kid-badge';
      document.body.appendChild(badgeEl);
      badgeEl.addEventListener('click', function (e) {
        if (!badgeFolds) return;
        if (badgeEl.classList.contains('kb-small')) { e.preventDefault(); badgeSmall(false); }
        else badgeSmall(!!e.target.closest('.kb-hide'));
      });
      document.addEventListener('pointerdown', function (e) {
        if (badgeFolds && !badgeEl.contains(e.target)) badgeSmall(true);
      }, true);
      window.addEventListener('scroll', function () { if (badgeFolds) badgeSmall(true); }, { passive: true });
    }
    var kid = user && (KIDS[user.uid] || { n: 'Signed in', av: '🙂', fg: '#5b4636', bg: '#fffdf7', line: '#e6ddd0' });
    var home = new URL('../homework.html', location.href).href;
    badgeFolds = !!kid;
    if (kid) {
      badgeEl.style.cssText = 'color:' + kid.fg + ';background:' + kid.bg + ';border-color:' + kid.line;
      // "My homework" back to the list: the page opens in the same tab, and an iPad home-screen
      // shortcut has no back button.
      badgeEl.innerHTML = '<span class="kb-av" role="button" aria-label="' + kid.n + '">' + kid.av + '</span>' +
        '<span>' + kid.av + ' ' + kid.n + '</span><a class="kb-go" href="' + home + '">📋 My homework</a>' +
        '<span class="kb-go kb-out" role="button" tabindex="0">Not you?</span>' +
        '<span class="kb-go kb-hide" role="button" tabindex="0" aria-label="Hide">−</span>';
      badgeEl.querySelector('.kb-out').onclick = function () {
        if (!confirm('Sign out ' + kid.n + ' and go to the sign-in page?')) return;
        auth.signOut().then(function () { location.href = home; });
      };
      badgeSmall(false);
    } else {
      clearTimeout(badgeTimer);
      badgeEl.classList.remove('kb-small');
      badgeEl.style.cssText = 'color:#8a7d70;background:#fffdf7;border-color:#e6ddd0';
      badgeEl.innerHTML = '<span>Not signed in · score won’t be saved</span><a class="kb-go" href="' + home + '">Sign in</a>';
    }
  }

  ready.then(function (fb) {
    var auth = fb.auth;
    // Signed in, but nobody used the site for a while: probably the other kid now → ask again.
    if (signedInKid(auth) && idleAtLoad) auth.signOut();
    auth.onAuthStateChanged(function (user) {
      badge(user && !user.isAnonymous ? user : null, auth);
      if (user && !user.isAnonymous) flush();
    });
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, function () { if (signedInKid(auth)) touch(); }, { capture: true, passive: true });
    });
    // Back after the screen was locked / the tab was away for a while.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && signedInKid(auth) && now() - lastActive() > IDLE_MS) auth.signOut();
    });
  }).catch(function () {});

  /* ---------- queue + send ---------- */
  function readQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch (e) { return []; } }
  function writeQueue(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {} }

  function submit(result) {
    if (session.sent) return;
    session.sent = true;
    var t = now(), s = session;
    var away = s.away.slice();
    if (s.awayFrom != null) away.push({ from: s.awayFrom, to: t });
    var awaySecs = away.reduce(function (sum, x) { return sum + (x.to - x.from) / 1000; }, 0);
    var secs = (t - s.startedAt) / 1000;
    var total = result.total || 0;

    var rec = {
      localId: t.toString(36) + Math.random().toString(36).slice(2, 10),
      itemId: itemId, href: href, t: document.title || file,
      kind: total ? 'scored' : result.kind || 'viewed',
      score: total ? result.score : null, total: total,
      pct: total ? Math.round(100 * result.score / total) : null,
      wrong: result.wrong || [],
      secs: Math.round(secs), activeSecs: Math.round(secs - awaySecs),
      focus: {
        awayCount: away.length,
        awaySecs: Math.round(awaySecs),
        maxAwaySecs: Math.round(away.reduce(function (m, x) { return Math.max(m, (x.to - x.from) / 1000); }, 0)),
        away: away.slice(0, MAX_AWAY_LOG).map(function (x) {
          return { at: Math.round((x.from - s.startedAt) / 1000), secs: Math.round((x.to - x.from) / 1000) };
        })
      },
      // sk here too, not only on wrong[]: the parent page needs the denominator (how many
      // questions of a knowledge point were attempted) to work out a per-sk 正确率 at all.
      qTimes: Object.keys(s.q).map(Number).sort(function (a, b) { return a - b; }).map(function (q) {
        var r = s.q[q], o = { q: q, secs: Math.round(r.secs), awaySecs: Math.round(r.awaySecs) };
        if (r.correct !== undefined) o.correct = r.correct;
        var sk = skFor(q);
        if (sk) o.sk = sk;
        return o;
      }),
      startedAtMs: s.startedAt, submittedAtMs: t,
      adapter: adapter ? adapter.name : 'viewed', reportVersion: 2
    };
    if (result.practice) rec.practice = result.practice;
    if (result.writing) rec.writing = result.writing;

    enqueue(rec);
  }

  // Stamp the kid who is signed in at the moment of submitting (not when the page opened —
  // they may have switched); nobody signed in (a parent previewing) → drop it.
  function enqueue(rec) {
    ready.then(function (fb) {
      var user = signedInKid(fb.auth);
      if (!user) { console.info('[quiz-report] no kid signed in — not recorded'); return; }
      touch();
      rec.kidId = user.uid;
      var q = readQueue(); q.push(rec); writeQueue(q);
      console.info('[quiz-report] recorded', rec.kind, rec.pct == null ? '' : rec.pct + '%');
      flush();
    }).catch(function (e) { console.warn('[quiz-report] Firebase unavailable — not recorded', e); });
  }

  /* ---------- live progress: 进行中 on the parent page (HOMEWORK-SYSTEM.md 2026-09-22 · 进行中) ----------
     progress/{kidUid}__{itemId}__{day}: one doc per kid per page per day, overwritten each time the kid
     works on it that day. Written on the first answer, then at most every PROG_EVERY_MS while answering,
     and once more with done:true when the attempt has landed (see flush). "started" (the 进行中 chip)
     still means the first question answered (Sam 2026-09-22).
     Since 2026-09-24 it also carries time, so the parent page can count time that was never handed in
     (Sam: 没交卷的那段也记进实际用时, including a page only opened and read): activeSecs / secs of this
     session, and earlierActive / earlierSecs = this day's earlier sessions on this page that ended
     without a hand-in. So a page that's only open is written too, once it has been in front for
     VIEW_MIN_SECS, then every BEAT_MS and when it's left. Best-effort only — a failed write never
     touches the attempt. */
  function localDay(ms) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // Each write replaces the day's doc, so a session that ended without a hand-in would vanish as soon as
  // the next one on the same page writes. This device remembers every session it wrote (keyed by its
  // startedAt) and each write carries the sum of the earlier unfinished ones. Another device's sessions
  // aren't known here — rare enough to live with.
  function readUnf() { try { return JSON.parse(localStorage.getItem(UNF_KEY)) || {}; } catch (e) { return {}; } }
  function tallyEarlier(p) {
    var all = readUnf(), key = p.kidId + '|' + p.itemId + '|' + p.day, mine = all[key] || {};
    var yesterday = localDay(now() - 864e5);
    Object.keys(all).forEach(function (k) {   // keep today and yesterday only
      var d = k.slice(k.lastIndexOf('|') + 1);
      if (d !== p.day && d !== localDay(now()) && d !== yesterday) delete all[k];
    });
    // A late done:true (the attempt landed after a new session began) must not undo that session.
    mine[p.startedAt] = { a: p.activeSecs, s: p.secs, d: p.done || !!(mine[p.startedAt] && mine[p.startedAt].d) };
    all[key] = mine;
    try { localStorage.setItem(UNF_KEY, JSON.stringify(all)); } catch (e) {}
    p.earlierActive = 0; p.earlierSecs = 0;
    Object.keys(mine).forEach(function (sid) {
      if (+sid === p.startedAt || mine[sid].d) return;
      p.earlierActive += mine[sid].a || 0;
      p.earlierSecs += mine[sid].s || 0;
    });
  }
  function putProgress(p) {
    ready.then(function (fb) {
      var user = signedInKid(fb.auth);
      if (!user) return;
      p.kidId = user.uid;
      tallyEarlier(p);
      return fb.db.collection('progress').doc(user.uid + '__' + p.itemId + '__' + p.day).set(p);
    }).catch(function (e) { console.warn('[quiz-report] progress not sent:', (e && e.code) || e); });
  }
  function activeNow() {
    var s = session;
    return Math.max(0, (now() - s.startedAt) / 1000 - awayBetween(s.startedAt, now()));
  }
  // Only a page that has been in front a little while is worth a doc: a tab opened by mistake isn't.
  function worthProgress() { return session.started || activeNow() >= VIEW_MIN_SECS; }
  // here: the kid is on this page right now (in front, not handed in). The parent page runs a live clock off it
  // (HOMEWORK-SYSTEM.md 2026-09-26 · 家长台实时计时): true → keep counting from this write, false → stop at this number.
  function sendProgress(done, gone) {
    var s = session;
    s.gone = !!gone || !!done || document.hidden || s.awayFrom != null;
    if (s.progTimer) { clearTimeout(s.progTimer); s.progTimer = 0; }
    s.progAt = now();
    var total = null;
    try { var n = progTotal && progTotal(); if (typeof n === 'number' && n > 0) total = n; } catch (e) {}
    putProgress({ itemId: itemId, t: String(document.title || file).slice(0, 300), day: localDay(s.startedAt),
                  answered: Object.keys(s.q).length, total: total, started: !!s.started,
                  activeSecs: Math.round(activeNow()), secs: Math.round((now() - s.startedAt) / 1000),
                  // lastAt drives 进行中 → 停在 on the parent page (30 min quiet), so once answering has begun it's the
                  // last answer / page turn, not this write — a heartbeat on a page left open mustn't keep it 进行中.
                  startedAt: s.startedAt, lastAt: s.started ? s.lastMark : now(), done: !!done, here: !s.gone });
  }
  function progressSoon() {
    var s = session;
    if (s.sent) return;
    var wait = PROG_EVERY_MS - (now() - s.progAt);
    if (!s.progAt || wait <= 0) sendProgress(false);
    else if (!s.progTimer) s.progTimer = setTimeout(function () {
      s.progTimer = 0;
      if (s === session && !s.sent) sendProgress(false);
    }, wait);
  }
  // Leaving mid-way (another app, lock screen, closing the tab): send the count and the time now.
  function leaving(gone) { if (!session.sent && worthProgress()) sendProgress(false, gone === true); }
  document.addEventListener('visibilitychange', function () { document.hidden ? leaving() : returned(); });
  window.addEventListener('pagehide', function () { leaving(true); });
  // iPad split view / another window: the page stays visible but the kid isn't on it — stop the parent's clock too.
  window.addEventListener('blur', function () { if (!document.hidden) leaving(); });
  window.addEventListener('focus', function () { returned(); });
  // Back on the page after a "gone" write: say so at once, so the parent's clock starts again (at most one write per away).
  function returned() {
    var s = session;
    if (s.gone && !s.sent && !document.hidden && s.awayFrom == null && worthProgress()) sendProgress(false);
  }
  // Open and in front but not answering (reading, the lesson part): keep the time current.
  setInterval(function () {
    if (!document.hidden && !session.sent && worthProgress() && now() - session.progAt >= BEAT_MS) sendProgress(false);
  }, 15000);

  /* ---------- the fix round (JS/fix-loop.js) ----------
     The kid went back through every question they missed and got them all right.
     That is recorded as its OWN attempt, after the graded one, so that:
       · the Mistakes notebook can clear — it lists the newest attempt per page that
         still has wrong[], and this one has none;
       · the score stays honest — `total: 0` means no pct, so it never touches his
         average and the kid page shows a plain "✓ Done". He redid the questions he
         missed, not the paper, and the paper's real score is already recorded.
     `fixup` keeps the detail: how many he had to fix and how many he got right first go. */
  function fixup(info) {
    // One per attempt, however many times he replays the round. Retaking the paper starts a
    // new session (newSession), so the fix round after that retake is recorded on its own.
    if (session.fixupSent) return;
    session.fixupSent = true;
    var t = now(), secs = Math.max(0, Math.round((info && info.secs) || 0));
    enqueue({
      localId: t.toString(36) + Math.random().toString(36).slice(2, 10),
      itemId: itemId, href: href, t: document.title || file,
      kind: 'fixup', score: null, total: 0, pct: null, wrong: [],
      secs: secs, activeSecs: secs,
      focus: { awayCount: 0, awaySecs: 0, maxAwaySecs: 0, away: [] },
      qTimes: [],
      fixup: { of: (info && info.total) || 0, firstTry: (info && info.firstTry) || 0 },
      startedAtMs: t - secs * 1000, submittedAtMs: t,
      adapter: adapter ? adapter.name : 'viewed', reportVersion: 2
    });
  }

  // Kids may only create. If an earlier send already landed (and the page closed before the
  // queue was cleared), the retry is refused — check it's there, then treat it as sent.
  function createOnce(ref, data) {
    return ref.set(data).catch(function (e) {
      if (e.code !== 'permission-denied') throw e;
      return ref.get().then(function (d) { if (!d.exists) throw e; });
    });
  }

  var flushing = false;
  function flush() {
    if (flushing) return;
    flushing = true;
    ready.then(function (fb) {
      var user = signedInKid(fb.auth);
      if (!user) return;
      // Only the kid signed in now sends their own records (the rules would refuse anything else).
      var mine = readQueue().filter(function (r) { return r.kidId === user.uid; });
      return mine.reduce(function (p, r) {
        return p.then(function () {
          var ref = fb.db.collection('attempts').doc(r.localId);
          var data = Object.assign({}, r, {
            startedAt: firebase.firestore.Timestamp.fromMillis(r.startedAtMs),
            submittedAt: firebase.firestore.Timestamp.fromMillis(r.submittedAtMs)
          });
          delete data.localId; delete data.startedAtMs; delete data.submittedAtMs; delete data.writing;
          return createOnce(ref, data).then(function () {
            // The attempt is in: tell the parent page (it re-reads attempts when a progress doc turns done).
            // Fix rounds are their own tiny attempt after the real one — no need to flip anything for those.
            if (r.kind !== 'fixup') putProgress({
              itemId: r.itemId, t: String(r.t || '').slice(0, 300), day: localDay(r.startedAtMs),
              answered: (r.qTimes || []).length, total: r.total || null, started: true,
              activeSecs: r.activeSecs || 0, secs: r.secs || 0,
              startedAt: r.startedAtMs, lastAt: r.submittedAtMs, done: true
            });
            if (!r.writing) return;
            // Rules: same ID as the attempt, and that attempt must already be this kid's.
            return createOnce(fb.db.collection('writings').doc(r.localId), Object.assign({}, r.writing, {
              kidId: r.kidId, itemId: r.itemId, attemptId: r.localId, submittedAt: data.submittedAt
            })).catch(function (e) {
              // Refused for what's in it (a shape Firestore can't store, or the rules said no): retrying
              // can't fix that, and a stuck record would hold back every later one. The attempt is in.
              if (e.code !== 'permission-denied' && e.code !== 'invalid-argument') throw e;
              console.warn('[quiz-report] writing not stored:', e.code);
            });
          }).then(function () {
            writeQueue(readQueue().filter(function (x) { return x.localId !== r.localId; }));
          });
        });
      }, Promise.resolve());
    }).catch(function (e) {
      console.warn('[quiz-report] send failed, will retry:', (e && e.code) || e);
    }).then(function () { flushing = false; });
  }
  flush();                                   // anything left over from an earlier page
  window.addEventListener('online', flush);

  // A page's own timed record that isn't a round — the Writing Lab timing a kid reading Dad's / Mom's marks
  // (HOMEWORK-SYSTEM.md 2026-09-26 · 看批改). Same queue, kid stamp and offline retry as an attempt;
  // the caller fills in itemId, t, secs / activeSecs, startedAtMs / submittedAtMs.
  function record(rec) {
    rec.localId = now().toString(36) + Math.random().toString(36).slice(2, 10);
    rec.reportVersion = 2;
    enqueue(rec);
  }

  // For checking by hand in the console: QuizReport.adapter, QuizReport.session()
  // ready: Promise<{ db, auth }> on the kid's sign-in — the Writing Lab reads the kid's own writings with it.
  window.QuizReport = { adapter: adapter ? adapter.name : 'viewed', itemId: itemId, session: function () { return session; },
                        flush: flush, ready: ready, fixup: fixup, record: record };
})();
