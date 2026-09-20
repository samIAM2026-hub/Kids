/* =====================================================================
   Fix loop — what happens after a paper is graded.

   The old ending was: read the explanation, close the tab. The kid had seen
   the reasoning but had never used it, which is why "I got it wrong because
   I don't understand it" was still true the next day. This walks him back
   through only the questions he missed, one at a time, and makes him answer
   each one again after the explanation.

   The choices are SHUFFLED every round. Re-showing a multiple-choice question
   in its original order teaches "the answer is B"; shuffling means the letter
   he might remember is worthless and he has to rebuild the reasoning. The
   right answer never lands on a position it has already occupied for that
   question, and the letters inside the explanation text ("(A) foot and (D)
   head are body parts…") are remapped to match the new order.

   Get it wrong in here and the question goes to the BACK of the queue with a
   fresh shuffle — it comes round again, so clicking through is not a way out.

   Drop-in for any page whose questions are {n, stem, opts, ans, why}:

     <div id="fixloop"></div>
     <script src="../JS/fix-loop.js"></script>

     // at the end of the page's own grade():
     FixLoop.mount({ el: document.getElementById('fixloop'), items: missed });

   It keeps its own state and never reads or writes the page's `answers`,
   `DATA` or graded DOM, and its buttons carry none of the classes the
   adapters watch (`.opt[data-n]`), so JS/quiz-report.js records exactly the
   score it always did. The fix round is practice, not a second attempt.
===================================================================== */
window.FixLoop = (function () {
  'use strict';

  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  /* Scoped to .fx-*; colours fall back so the module also works on pages
     that don't define the Kids palette. Fonts are inherited on purpose —
     the panel should look like the paper it grew out of. */
  var CSS = [
    '.fx { font-family: inherit; margin: 22px 0; }',
    '.fx .card { background: var(--paper,#fffdf7); border: 3px solid var(--accent,#7a4a86);',
    '  border-radius: 18px; padding: 22px; }',
    '.fx .eyebrow { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 11.5px;',
    '  letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent,#7a4a86); font-weight: bold; }',
    '.fx h2 { font-size: 23px; margin: 7px 0 8px; line-height: 1.25; }',
    '.fx p.lead { font-size: 15px; color: var(--muted,#7a6a55); margin-bottom: 4px; }',
    '.fx .meter { height: 7px; background: rgba(0,0,0,.08); border-radius: 999px; overflow: hidden; margin: 14px 0 4px; }',
    '.fx .meter i { display: block; height: 100%; width: 0; background: var(--green,#3a7d44);',
    '  border-radius: 999px; transition: width .25s; }',
    '.fx .count { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 12px;',
    '  letter-spacing: .8px; color: var(--muted,#7a6a55); }',
    '.fx .stem { font-size: 16.5px; margin: 12px 0 13px; }',
    '.fx .fig { margin: 10px 0 14px; text-align: center; }',
    '.fx .fig svg, .fx .fig img { max-width: 100%; height: auto; }',
    '.fx .opts { display: grid; gap: 7px; }',
    '.fx .fx-opt { display: flex; gap: 10px; align-items: flex-start; text-align: left; width: 100%;',
    '  background: #fff; border: 2px solid rgba(0,0,0,.10); border-radius: 10px; padding: 10px 12px;',
    '  font-family: inherit; font-size: 15px; font-weight: normal; color: var(--ink,#1c1a17); cursor: pointer; }',
    '.fx .fx-opt:hover:not(:disabled) { border-color: var(--accent,#7a4a86); }',
    '.fx .fx-opt .lt { font-weight: bold; color: var(--muted,#7a6a55); min-width: 22px; }',
    '.fx .fx-opt:disabled { cursor: default; opacity: 1; }',
    '.fx .fx-opt.right { border-color: var(--green,#3a7d44); background: var(--green-fill,#eaf4ec); }',
    '.fx .fx-opt.right .lt { color: var(--green,#3a7d44); }',
    '.fx .fx-opt.wrong { border-color: var(--red,#c0392b); background: var(--red-fill,#fbeaea); }',
    '.fx .fx-opt.wrong .lt { color: var(--red,#c0392b); }',
    '.fx .why { margin-top: 13px; padding: 12px 14px; border-radius: 10px; background: #f4f1e8;',
    '  border-left: 4px solid var(--accent,#7a4a86); font-size: 14.5px; }',
    '.fx .why b.hd { display: block; font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 11px;',
    '  letter-spacing: 1.2px; text-transform: uppercase; color: var(--accent,#7a4a86); margin-bottom: 4px; }',
    '.fx .why .ansline { color: var(--green,#3a7d44); font-weight: bold; margin-bottom: 4px; }',
    '.fx .verdict { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 11.5px; font-weight: bold;',
    '  letter-spacing: 1px; padding: 2px 9px; border-radius: 999px; }',
    '.fx .verdict.r { background: var(--green-fill,#eaf4ec); color: var(--green,#3a7d44); }',
    '.fx .verdict.w { background: var(--red-fill,#fbeaea); color: var(--red,#c0392b); }',
    '.fx .again { margin-top: 10px; font-size: 14px; color: #8a6a15; background: #fbf1d8;',
    '  border-radius: 8px; padding: 9px 11px; }',
    '.fx .flag { margin-top: 8px; font-size: 13px; color: #8a6a15; background: #fbf1d8;',
    '  border-radius: 8px; padding: 8px 11px; }',
    '.fx .btns { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; }',
    '.fx .won { text-align: center; }',
    '.fx .won .tick { font-size: 40px; line-height: 1; }',
    '.fx .tiles { display: grid; grid-template-columns: repeat(auto-fit,minmax(130px,1fr)); gap: 10px; margin-top: 16px; }',
    '.fx .tile { border: 2px solid rgba(0,0,0,.08); background: #fff; border-radius: 12px; padding: 12px 8px; }',
    '.fx .tile .n { font-size: 23px; font-weight: bold; line-height: 1.1; }',
    '.fx .tile .l { font-size: 11px; letter-spacing: .8px; text-transform: uppercase;',
    '  color: var(--muted,#7a6a55); font-family: "IBM Plex Mono", ui-monospace, monospace; margin-top: 3px; }',
    '@media print { .fx { display: none !important; } }'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('fx-css')) return;
    var s = document.createElement('style');
    s.id = 'fx-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function shuffled(n) {
    var a = [], i, j, t;
    for (i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // perm[newIndex] = oldIndex. `used` holds the positions the right answer has
  // already sat in for this question (including where it sat on the paper), so
  // a remembered letter never pays off. Give up after a few tries when the
  // question has run out of fresh positions.
  function permFor(item, used) {
    var n = item.opts.length, p, pos, guard = 0;
    do {
      p = shuffled(n);
      pos = p.indexOf(item.ans);
      guard++;
    } while (guard < 60 && used.indexOf(pos) >= 0);
    return p;
  }

  // "(A) foot and (D) head are body parts" — the letters in the explanation
  // point at the order the paper used, so they have to move with the choices.
  function remapWhy(html, oldToNew, n) {
    return String(html == null ? '' : html).replace(/\(([A-H])\)/g, function (m, L) {
      var old = LETTERS.indexOf(L);
      if (old < 0 || old >= n) return m;          // not a choice on this question
      return '(' + LETTERS[oldToNew[old]] + ')';
    });
  }

  function mount(opts) {
    injectCss();
    var el = opts.el, items = (opts.items || []).filter(function (it) {
      return it && it.opts && it.opts.length && typeof it.ans === 'number';
    });
    if (!el || !items.length) return null;

    var byN = {}, used = {}, tries = {};
    items.forEach(function (it) {
      byN[it.n] = it;
      used[it.n] = [it.ans];                      // where it sat on the paper
      tries[it.n] = 0;
    });

    var queue = [], fixed = 0, firstTry = 0, cur = null, perm = null;

    function label(n) { return opts.label || ('Question ' + n); }
    function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

    function intro() {
      el.innerHTML =
        '<div class="fx"><div class="card">' +
          '<div class="eyebrow">Fix what you missed</div>' +
          '<h2>' + plural(items.length, 'question') + ' to go back over</h2>' +
          '<p class="lead">Reading the explanation is not the same as being able to do it. ' +
            'You will get each one again, <b>with the choices shuffled</b> — so the letter is no help, ' +
            'you have to work the bridge out again. Miss one and it comes back round later.</p>' +
          '<div class="btns"><button type="button" class="fx-start">&#128260; Start fixing</button></div>' +
        '</div></div>';
      el.querySelector('.fx-start').addEventListener('click', function () { begin(); });
    }

    function begin() {
      queue = items.map(function (it) { return it.n; });
      fixed = 0; firstTry = 0;
      items.forEach(function (it) { tries[it.n] = 0; });
      next();
    }

    function next() {
      if (!queue.length) return won();
      cur = byN[queue.shift()];
      perm = permFor(cur, used[cur.n]);
      used[cur.n].push(perm.indexOf(cur.ans));
      draw();
    }

    function draw(picked) {
      var done = picked !== undefined, right = done && perm[picked] === cur.ans;
      var oldToNew = [];
      perm.forEach(function (oldIdx, newIdx) { oldToNew[oldIdx] = newIdx; });
      var ansAt = perm.indexOf(cur.ans);
      var total = items.length;

      var html =
        '<div class="fx"><div class="card">' +
          '<div class="eyebrow">Fix what you missed</div>' +
          '<div class="meter"><i style="width:' + Math.round(100 * fixed / total) + '%"></i></div>' +
          '<div class="count">' + fixed + ' of ' + total + ' fixed' +
            // pick() has already pushed a missed question back onto the queue, so
            // queue.length is the true remainder — adding one here counted it twice.
            (queue.length ? ' &middot; ' + queue.length + ' more in the queue' : '') +
            ' &middot; ' + label(cur.n) +
            (done ? ' <span class="verdict ' + (right ? 'r">FIXED' : 'w">NOT YET') + '</span>' : '') +
          '</div>' +
          '<div class="stem">' + cur.stem + '</div>' +
          (cur.fig ? '<div class="fig">' + cur.fig + '</div>' : '') +
          '<div class="opts">';

      perm.forEach(function (oldIdx, newIdx) {
        var cls = 'fx-opt';
        if (done && newIdx === ansAt) cls += ' right';
        else if (done && newIdx === picked) cls += ' wrong';
        html += '<button type="button" class="' + cls + '" data-fx="' + newIdx + '"' + (done ? ' disabled' : '') + '>' +
                  '<span class="lt">(' + LETTERS[newIdx] + ')</span><span class="tx">' + cur.opts[oldIdx] + '</span></button>';
      });
      html += '</div>';

      if (done) {
        html += '<div class="why"><b class="hd">Why</b>' +
                  '<div class="ansline">Answer: (' + LETTERS[ansAt] + ') ' + cur.opts[cur.ans] + '</div>' +
                  '<div>' + remapWhy(cur.why, oldToNew, cur.opts.length) + '</div></div>';
        if (cur.flag) html += '<div class="flag">&#9873; ' + cur.flag + '</div>';
        if (!right) html += '<div class="again">Read that through, then keep going — ' +
                              'this one comes back later with the choices in a different order.</div>';
        html += '<div class="btns"><button type="button" class="fx-next">' +
                  (queue.length || !right ? 'Next &rarr;' : 'Finish &rarr;') + '</button></div>';
      }

      html += '</div></div>';
      el.innerHTML = html;

      if (done) {
        el.querySelector('.fx-next').addEventListener('click', function () { next(); });
      } else {
        el.querySelectorAll('.fx-opt').forEach(function (b) {
          b.addEventListener('click', function () { pick(+b.dataset.fx); });
        });
      }
    }

    function pick(newIdx) {
      tries[cur.n]++;
      if (perm[newIdx] === cur.ans) {
        fixed++;
        if (tries[cur.n] === 1) firstTry++;
      } else {
        queue.push(cur.n);                        // back of the queue, fresh shuffle
      }
      draw(newIdx);
      el.scrollIntoView({ block: 'nearest' });
    }

    function won() {
      var total = items.length, extra = total - firstTry;
      el.innerHTML =
        '<div class="fx"><div class="card won">' +
          '<div class="tick">&#9989;</div>' +
          '<h2>All fixed</h2>' +
          '<p class="lead">You went back and got every one of them right.</p>' +
          '<div class="tiles">' +
            '<div class="tile"><div class="n">' + total + '</div><div class="l">Fixed</div></div>' +
            '<div class="tile"><div class="n">' + firstTry + '</div><div class="l">Right first go</div></div>' +
            '<div class="tile"><div class="n">' + extra + '</div><div class="l">Needed another go</div></div>' +
          '</div>' +
          // `extra` is "did not get it on the first go" — that can be two goes or five,
          // so the wording must not claim a number of attempts it never counted.
          (extra ? '<p class="lead" style="margin-top:14px">' +
                   (extra === 1 ? 'The one that took more than one go is the one'
                                : 'The ' + extra + ' that took more than one go are the ones') +
                   ' to look at again tomorrow.</p>' : '') +
          '<div class="btns" style="justify-content:center">' +
            '<button type="button" class="fx-start">&#128260; Do them once more</button>' +
          '</div>' +
        '</div></div>';
      el.querySelector('.fx-start').addEventListener('click', function () { begin(); });
      if (typeof opts.onFixed === 'function') opts.onFixed({ total: total, firstTry: firstTry });
    }

    intro();
    return { restart: begin };
  }

  return { mount: mount, _remapWhy: remapWhy, _permFor: permFor };
})();
