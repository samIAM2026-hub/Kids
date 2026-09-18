/* =====================================================================
   writing-review.js — the parts of a marked Writing Lab piece that the kid's
   page (Writing/Writing-Lab.html) and the parent page (parent.html) both draw.

   A note is { s, e, quote, kind, fix, note }: characters s..e of the text
   (s = -1 when it isn't tied to a place), kind 'fix' | 'good' | 'note'.
   Design: HOMEWORK-SYSTEM.md, 2026-09-18 手动批改.
===================================================================== */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // Notes in reading order; the ones with no place go last. Index in this list + 1 = the number shown.
  function ordered(notes) {
    return (notes || []).slice().sort(function (a, b) {
      var pa = a.s >= 0 ? a.s : 1e9, pb = b.s >= 0 ? b.s : 1e9;
      return pa - pb || (a.e || 0) - (b.e || 0);
    });
  }
  function placed(n, len) { return n && n.s >= 0 && n.e > n.s && n.e <= len; }

  // The text with each note's stretch wrapped in <mark class="wr-KIND" data-n="i"> and its number
  // after it in <sup>. Overlapping notes split into pieces; a piece takes the kind of the first note.
  // Keep the container white-space:pre-wrap so line breaks show.
  function markup(text, notes) {
    text = String(text || '');
    var list = ordered(notes), len = text.length, cuts = { 0: 1 };
    cuts[len] = 1;
    list.forEach(function (n) { if (placed(n, len)) { cuts[n.s] = 1; cuts[n.e] = 1; } });
    var pts = Object.keys(cuts).map(Number).sort(function (a, b) { return a - b; }), out = '';
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], on = [];
      list.forEach(function (n, k) { if (placed(n, len) && n.s <= a && n.e >= b) on.push(k); });
      var piece = esc(text.slice(a, b));
      if (on.length) piece = '<mark class="wr-' + (list[on[0]].kind || 'note') + '" data-n="' + on.join(' ') + '">' + piece + '</mark>';
      list.forEach(function (n, k) { if (placed(n, len) && n.e === b) piece += '<sup data-n="' + k + '">' + (k + 1) + '</sup>'; });
      out += piece;
    }
    return out;
  }

  // Where a quote sits in the text: exact first, then ignoring case and runs of spaces / curly quotes.
  // Returns [s, e] or null. `after` skips earlier matches (the same words quoted twice).
  function locate(text, quote, after) {
    text = String(text || ''); quote = String(quote || '').trim();
    if (!quote) return null;
    var i = text.indexOf(quote, after || 0);
    if (i < 0 && after) i = text.indexOf(quote);
    if (i >= 0) return [i, i + quote.length];
    // Loose: build a map from a normalised copy back to the original positions.
    var norm = '', map = [];
    function fold(c) { return c.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').toLowerCase(); }
    for (var k = 0; k < text.length; k++) {
      var c = text[k];
      if (/\s/.test(c)) { if (norm && norm[norm.length - 1] === ' ') continue; c = ' '; }
      norm += fold(c); map.push(k);
    }
    var q = fold(quote.replace(/\s+/g, ' '));
    var j = norm.indexOf(q);
    if (j < 0) return null;
    return [map[j], map[j + q.length - 1] + 1];
  }

  // Word-level differences between two drafts: HTML with <del> for removed and <ins> for added words.
  function diff(before, after) {
    var A = String(before || '').match(/\S+|\s+/g) || [], B = String(after || '').match(/\S+|\s+/g) || [];
    var n = A.length, m = B.length;
    if (n * m > 4e6) return '<ins>' + esc(after) + '</ins>';   // far past a 30-minute piece; don't hang the page
    var L = [];
    for (var i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--)
      L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = '', x = 0, y = 0;
    while (x < n && y < m) {
      if (A[x] === B[y]) { out += esc(A[x]); x++; y++; }
      else if (L[x + 1][y] >= L[x][y + 1]) { out += /^\s+$/.test(A[x]) ? '' : '<del>' + esc(A[x]) + '</del>'; x++; }
      else { out += /^\s+$/.test(B[y]) ? esc(B[y]) : '<ins>' + esc(B[y]) + '</ins>'; y++; }
    }
    for (; x < n; x++) if (!/^\s+$/.test(A[x])) out += '<del>' + esc(A[x]) + '</del>';
    for (; y < m; y++) out += /^\s+$/.test(B[y]) ? esc(B[y]) : '<ins>' + esc(B[y]) + '</ins>';
    return out.replace(/<\/del><del>/g, ' ').replace(/<\/ins>(\s*)<ins>/g, '$1');
  }

  window.WritingReview = { markup: markup, locate: locate, diff: diff, ordered: ordered, esc: esc };
})();
