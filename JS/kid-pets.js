/* =====================================================================
   Pets & badges for the kids' homework page (HOMEWORK-SYSTEM.md §二十三).
   Pure logic — no Firebase, no page. Everything is worked out from what already
   exists: the kid's attempts and the days homework was assigned. homework.html
   draws it and keeps a short summary in pets/{uid}.

   XP      finish an assigned page +10 (late still counts; once per time it was assigned)
           80%+ on an assigned quiz +10 (first go or after redoing — same either way)
           clear a page from the Mistakes notebook +10 (once per page; not on top of the 80% bonus)
           every page of a homework day done that same day +10
           Nothing for speed (it would reward guessing), and failing first never pays more
           than getting it right first time.
   Streak  homework days in a row with everything done that day. Days with no homework
           are skipped; today can't break it until today is over. Doing a page late still
           pays XP but never brings a broken streak back — compute() returns streakFrom,
           streakBroke and todayLeft so the page can say all this in the kid's own words.
===================================================================== */
(function (root) {
  'use strict';

  const PASS = 80;
  const XP = { page: 10, pass: 10, fix: 10, day: 10 };
  const STAGE_LV = [1, 4, 8];            // level each stage starts at (stage 0 = no XP yet)
  const need = lv => 50 + 25 * (lv - 1); // XP from this level to the next

  // stages: [emoji, name] for stage 0 (no XP) … 3 (Lv 8+)
  const PETS = {
    chick:  { n: 'Chick',  stages: [['🥚', 'Egg'], ['🐣', 'Hatchling'], ['🐥', 'Chick'], ['🐓', 'Rooster']] },
    dragon: { n: 'Dragon', stages: [['🥚', 'Dragon egg'], ['🦎', 'Baby dragon'], ['🐲', 'Young dragon'], ['🐉', 'Dragon']] },
    cat:    { n: 'Kitten', stages: [['🧺', 'Kitten in a basket'], ['🐱', 'Kitten'], ['🐈', 'Cat'], ['🦁', 'Lion']] },
    fish:   { n: 'Fish',   stages: [['🫧', 'Fish egg'], ['🐟', 'Little fish'], ['🐠', 'Reef fish'], ['🐋', 'Whale']] },
  };

  function level(xp) {
    let lv = 1, into = Math.max(0, xp || 0);
    while (into >= need(lv)) { into -= need(lv); lv++; }
    return { lv, into, need: need(lv) };
  }
  function stageOf(xp) {
    if (!xp) return 0;
    const lv = level(xp).lv;
    return lv >= STAGE_LV[2] ? 3 : lv >= STAGE_LV[1] ? 2 : 1;
  }

  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const SUBJ = {
    Chinese: ['🏮', 'Chinese Champ'], Math: ['🧮', 'Math Whiz'], Reading: ['📖', 'Bookworm'],
    Vocabulary: ['🔤', 'Word Collector'], Writing: ['✍️', 'Storyteller'], SSAT: ['📝', 'SSAT Pro'],
    'Big Ideas': ['🧠', 'Big Thinker'],
  };
  const SUBJ_PAGES = 10;

  // Every badge, in shelf order. hint(state, ctx) says what's left while it's locked.
  function catalog(kind, subjects) {
    const pet = PETS[kind] || PETS.chick;
    const streak = (id, ic, n, days) => ({ id, ic, n, d: `${days} homework days in a row, all done`,
      hint: s => `${plural(days - s.streak, 'more day')} in a row` });
    const pages = (id, ic, n, count) => ({ id, ic, n, d: `${count} homework pages`,
      hint: s => plural(count - s.pages, 'more page') });
    const list = [
      { id: 'first', ic: '🌱', n: 'First Step', d: 'Finished your first homework page', hint: () => 'Finish a homework page' },
      { id: 'perfect', ic: '💯', n: 'Perfect Page', d: 'Got 100% on a quiz', hint: () => 'Get 100% on a quiz' },
      { id: 'comeback', ic: '💪', n: 'Comeback Kid', d: 'Redid a quiz under 80% and passed', hint: () => 'Redo a quiz you got under 80%, and pass' },
      { id: 'clean', ic: '🧹', n: 'Clean Slate', d: 'Cleared the whole Mistakes notebook',
        hint: (s, c) => c.mistakes ? `${plural(c.mistakes, 'page')} left in Mistakes` : 'Clear your Mistakes notebook' },
      streak('streak3', '🔥', 'On a Roll', 3),
      streak('streak7', '⚡', 'Week of Fire', 7),
      streak('streak14', '🌟', 'Unstoppable', 14),
      pages('pages10', '📗', 'Ten Down', 10),
      pages('pages50', '🏅', 'Fifty Club', 50),
      pages('pages100', '🏆', 'Century', 100),
      { id: 'grown', ic: pet.stages[3][0], n: 'All Grown Up', d: `Grew into a ${pet.stages[3][1].toLowerCase()}`,
        hint: s => `Reach Lv ${STAGE_LV[2]} (now Lv ${s.lv})` },
    ];
    Object.keys(SUBJ).filter(s => (subjects || []).includes(s)).forEach(s => list.push({
      id: 'subj_' + s, ic: SUBJ[s][0], n: SUBJ[s][1], d: `${SUBJ_PAGES} ${s} pages`,
      hint: st => plural(SUBJ_PAGES - ((st.subj || {})[s] || 0), `more ${s} page`),
    }));
    return list;
  }
  function badgeInfo(id, kind) {
    const subj = id.startsWith('subj_') ? [id.slice(5)] : [];
    return catalog(kind, subj).find(b => b.id === id) || null;
  }

  /* att : [{ id, t, pct (null if not scored), wrong (count), date 'YYYY-MM-DD', at (ms), kind }]
     days: [{ date, items:[{id, t, subj}], withdrawn:[…same] }]   subj = English subject name
     today: 'YYYY-MM-DD' */
  function compute(att, days, today) {
    att = att.filter(a => a.id).slice().sort((a, b) => (a.at || 0) - (b.at || 0));
    const byItem = new Map();
    att.forEach(a => { if (!byItem.has(a.id)) byItem.set(a.id, []); byItem.get(a.id).push(a); });
    const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

    const events = [];               // { at, xp, kind:'page'|'pass'|'fix'|'day', t, subj }
    const earned = new Map();        // badge id → when first earned
    const earn = (id, at) => { if (!earned.has(id)) earned.set(id, at || 0); };

    // Assigned pages: the first attempt on or after the day it was assigned finishes it.
    // Withdrawn items count too, so taking one back later doesn't shrink the pet.
    const jobs = [];
    days.forEach(d => {
      if (d.date > today) return;
      [...(d.items || []), ...(d.withdrawn || [])].forEach(it => jobs.push({ date: d.date, id: it.id, t: it.t, subj: it.subj }));
    });
    jobs.sort(byDate);
    const usedPage = new Set(), usedPass = new Set();
    jobs.forEach(j => {
      const list = byItem.get(j.id) || [];
      const a = list.find(x => x.date >= j.date && !usedPage.has(x));
      if (!a) return;
      usedPage.add(a);
      events.push({ at: a.at, xp: XP.page, kind: 'page', t: j.t || a.t, subj: j.subj });
      const p = list.find(x => x.date >= j.date && x.pct != null && x.pct >= PASS && !usedPass.has(x));
      if (p) { usedPass.add(p); events.push({ at: p.at, xp: XP.pass, kind: 'pass', t: j.t || p.t, subj: j.subj }); }
    });

    // Redoing: Comeback (under 80% → pass), Perfect, and clearing a Mistakes-notebook page.
    const usedFix = new Set();
    byItem.forEach((list, id) => {
      let low = false, prev = null;
      list.forEach(a => {
        if (a.pct != null) {
          if (a.pct < PASS) low = true;
          else if (low) { earn('comeback', a.at); low = false; }
          if (a.pct === 100) earn('perfect', a.at);
        }
        // `pct != null` keeps a bare "viewed" record from counting as a fix; a fix round
        // (kind 'fixup', no score by design) is the real thing and pays the same +10.
        const cleared = a.pct != null || a.kind === 'fixup';
        if (prev && prev.wrong > 0 && !a.wrong && cleared && !usedFix.has(id) && !usedPass.has(a)) {
          usedFix.add(id);
          events.push({ at: a.at, xp: XP.fix, kind: 'fix', t: a.t });
        }
        prev = a;
      });
    });

    // Clean Slate: the notebook (newest attempt per page with wrong answers) had pages, then none.
    {
      const nb = new Map(); let left = 0, had = false;
      att.forEach(a => {
        const was = (nb.get(a.id) || 0) > 0, now = (a.wrong || 0) > 0;
        nb.set(a.id, a.wrong || 0);
        left += (now ? 1 : 0) - (was ? 1 : 0);
        if (left > 0) had = true;
        else if (had) earn('clean', a.at);
      });
    }

    // Homework days: all done that same day → bonus + streak.
    // `broke` keeps the last homework day that wasn't finished and what was left on it, so the
    // page can tell the kid why a streak ended instead of the fire just disappearing on him.
    let run = 0, best = 0, todayDone = false, from = null, broke = null, todayLeft = null;
    days.filter(d => d.date <= today && (d.items || []).length).sort(byDate).forEach(d => {
      const hits = d.items.map(it => (byItem.get(it.id) || []).find(a => a.date === d.date));
      const missed = d.items.filter((it, i) => !hits[i]).map(it => it.t || '');
      if (hits.every(Boolean)) {
        const at = Math.max(...hits.map(h => h.at || 0));
        events.push({ at, xp: XP.day, kind: 'day', date: d.date });
        run++; if (run === 1) from = d.date;
        best = Math.max(best, run);
        if (run >= 3) earn('streak3', at);
        if (run >= 7) earn('streak7', at);
        if (run >= 14) earn('streak14', at);
        if (d.date === today) todayDone = true;
      } else if (d.date !== today) {
        broke = { date: d.date, after: run, missed };
        run = 0; from = null;
      } else {
        todayLeft = missed;                    // today isn't finished yet — it can still be saved
      }
    });

    // Walk the XP in time order for the count and level badges.
    events.sort((a, b) => (a.at || 0) - (b.at || 0));
    let xp = 0, pages = 0;
    const subj = {};
    events.forEach(e => {
      xp += e.xp;
      if (e.kind === 'page') {
        pages++;
        earn('first', e.at);
        if (pages >= 10) earn('pages10', e.at);
        if (pages >= 50) earn('pages50', e.at);
        if (pages >= 100) earn('pages100', e.at);
        if (SUBJ[e.subj]) {
          subj[e.subj] = (subj[e.subj] || 0) + 1;
          if (subj[e.subj] >= SUBJ_PAGES) earn('subj_' + e.subj, e.at);
        }
      }
      if (level(xp).lv >= STAGE_LV[2]) earn('grown', e.at);
    });

    const badges = [...earned].map(([id, at]) => ({ id, at })).sort((a, b) => a.at - b.at);
    return { xp, ...level(xp), stage: stageOf(xp), streak: run, best, todayDone, pages, subj, badges, events,
             streakFrom: from, streakBroke: broke, todayLeft };
  }

  const api = { PASS, XP, STAGE_LV, PETS, level, stageOf, catalog, badgeInfo, compute };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KidPets = api;
})(this);
