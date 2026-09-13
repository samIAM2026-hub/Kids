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

   Shared iPad / computer: a name badge in the top-right corner shows whose
   score this will be ("Not you?" signs out), and 30 minutes with nobody
   using the site signs the kid out — same rule and key as homework.html.
===================================================================== */
(function () {
  'use strict';

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
    session = { startedAt: now(), lastMark: now(), away: [], awayFrom: null, q: {}, sent: false };
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
  }
  function wrongList() {
    return Object.keys(session.q).map(Number).filter(function (q) { return session.q[q].correct === false; })
      .sort(function (a, b) { return a - b; });
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

  var badgeEl = null;
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
        '@media print{#kid-badge{display:none}}';
      document.head.appendChild(css);
      badgeEl = document.createElement('div');
      badgeEl.id = 'kid-badge';
      document.body.appendChild(badgeEl);
    }
    var kid = user && (KIDS[user.uid] || { n: 'Signed in', av: '🙂', fg: '#5b4636', bg: '#fffdf7', line: '#e6ddd0' });
    var home = new URL('../homework.html', location.href).href;
    if (kid) {
      badgeEl.style.cssText = 'color:' + kid.fg + ';background:' + kid.bg + ';border-color:' + kid.line;
      badgeEl.innerHTML = '<span>' + kid.av + ' ' + kid.n + '</span><span class="kb-go" role="button" tabindex="0">Not you?</span>';
      badgeEl.querySelector('.kb-go').onclick = function () {
        if (!confirm('Sign out ' + kid.n + ' and go to the sign-in page?')) return;
        auth.signOut().then(function () { location.href = home; });
      };
    } else {
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
      kind: total ? 'scored' : 'viewed',
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
      qTimes: Object.keys(s.q).map(Number).sort(function (a, b) { return a - b; }).map(function (q) {
        var r = s.q[q], o = { q: q, secs: Math.round(r.secs), awaySecs: Math.round(r.awaySecs) };
        if (r.correct !== undefined) o.correct = r.correct;
        return o;
      }),
      startedAtMs: s.startedAt, submittedAtMs: t,
      adapter: adapter ? adapter.name : 'viewed', reportVersion: 1
    };

    // Stamp the kid who is signed in at the moment of submitting (not when the page opened —
    // they may have switched); nobody signed in (a parent previewing) → drop it.
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
          delete data.localId; delete data.startedAtMs; delete data.submittedAtMs;
          return ref.set(data).catch(function (e) {
            // Kids may only create attempts. If an earlier send already landed (and the page closed
            // before the queue was cleared), the retry is refused — check it's there, then drop it.
            if (e.code !== 'permission-denied') throw e;
            return ref.get().then(function (d) { if (!d.exists) throw e; });
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

  // For checking by hand in the console: QuizReport.adapter, QuizReport.session()
  window.QuizReport = { adapter: adapter ? adapter.name : 'viewed', itemId: itemId, session: function () { return session; }, flush: flush };
})();
