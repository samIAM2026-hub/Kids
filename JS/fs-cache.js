/* fs-cache.js — read Firestore less (HOMEWORK-SYSTEM.md 2026-10-22 · 免费读额度用完了).
   The free plan allows 50,000 reads a day. Every time homework.html or parent.html opened it read the whole
   bank, every attempt and every assignment day again (≈ 450 for a kid page, ≈ 1,100 for the parent page),
   and a kid's page opens again every time he comes back from a quiz. Sam: stay on the free plan, keep a copy
   on the device and only re-read what changed. Used by homework.html and parent.html.

   Each helper keeps documents in localStorage as { id, data } (Timestamps stored as { __ts: ms }) and hands
   back objects shaped like snapshot docs — { id, data() } — so the callers' code doesn't change.
     bank(db, key, query)            the bank: re-read only when meta/bank.v moved (parent.html and
                                     check-bank.mjs bump it on every bank write), or once BANK_MAX_MS is up
     attempts(key, full, since, ttl) full: () => query for everything; since: ts => query for newer ones.
                                     Newer-only between full reads, a full read every FULL_MS. If the newer-only
                                     query can't run (the kid page's needs the attempts kidId + submittedAt index;
                                     without it Firestore says failed-precondition) the copy is used for `ttl` ms
                                     instead, and the page adds what this device sent itself (sent()).
     sent(kidId) / addSent(id, data) attempts this device wrote (quiz-report.js keeps them), so a score shows
                                     straight away even while the copy is being used
     byDay(key, full, recent, from)  documents tied to a day (assignment days, progress): the ones from `from`
                                     on are re-read every time, older ones come from the copy (full read weekly)
   Anything going wrong with the copy (private mode, storage full) falls back to a normal read. */
(function (root) {
  'use strict';
  const BANK_MAX_MS = 6 * 3600e3, FULL_MS = 24 * 3600e3, DAYS_FULL_MS = 7 * 864e5, OVERLAP_MS = 10 * 60e3;
  const TS = () => root.firebase && root.firebase.firestore && root.firebase.firestore.Timestamp;
  const load = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { try { localStorage.removeItem(k); } catch (_) {} } };
  const enc = v => v && typeof v.toMillis === 'function' ? { __ts: v.toMillis() }
    : Array.isArray(v) ? v.map(enc)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) : v;
  const dec = v => v && typeof v === 'object' && !Array.isArray(v) && typeof v.__ts === 'number' && Object.keys(v).length === 1
      ? (TS() ? TS().fromMillis(v.__ts) : { toDate: () => new Date(v.__ts), toMillis: () => v.__ts })
    : Array.isArray(v) ? v.map(dec)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)])) : v;
  const out = docs => docs.map(d => ({ id: d.id, data: () => dec(d.data) }));
  const raw = snap => snap.docs.map(d => ({ id: d.id, data: enc(d.data()) }));
  const ms = v => v && typeof v.__ts === 'number' ? v.__ts : 0;

  async function bank(db, key, query) {
    const c = load(key);
    const ver = await db.doc('meta/bank').get().then(d => (d.data() || {}).v || 0).catch(() => null);
    if (c && ver != null && c.ver === ver && Date.now() - c.at < BANK_MAX_MS) return out(c.docs);
    const docs = raw(await query.get());
    save(key, { ver: ver == null ? -1 : ver, at: Date.now(), docs });
    return out(docs);
  }

  async function attempts(key, full, since, ttl) {
    const c = load(key), now = Date.now();
    if (c && now - c.at < FULL_MS) {
      if (!c.noDelta) {
        try {
          const add = raw(await since(TS().fromMillis(Math.max(0, c.max - OVERLAP_MS))).get()), by = new Map(c.docs.map(d => [d.id, d]));
          add.forEach(d => by.set(d.id, d));
          const docs = [...by.values()], max = Math.max(c.max, ...add.map(d => ms(d.data.submittedAt)));
          save(key, { ...c, max, docs });
          return out(docs);
        } catch (e) {
          console.warn('[fs-cache] newer-only read failed', e.code || e);
          if (e.code === 'failed-precondition') { c.noDelta = true; save(key, c); }
        }
      }
      if (ttl && now - (c.got || c.at) < ttl) return out(c.docs);
    }
    const docs = raw(await full().get());
    save(key, { at: c && c.noDelta && now - c.at < FULL_MS ? c.at : now, got: now, noDelta: !!(c && c.noDelta && now - c.at < FULL_MS),
                max: Math.max(0, ...docs.map(d => ms(d.data.submittedAt))), docs });
    return out(docs);
  }

  // What this device wrote itself (quiz-report.js addSent after each attempt lands): last SENT_DAYS days.
  const SENT_KEY = 'quizReport.sent.v1', SENT_DAYS = 3;
  function addSent(id, data) {
    const cut = Date.now() - SENT_DAYS * 864e5;
    const list = (load(SENT_KEY) || []).filter(x => x.id !== id && (x.at || 0) > cut);
    list.push({ id, at: Date.now(), data: enc(data) });
    save(SENT_KEY, list.slice(-60));
  }
  const sent = kidId => out((load(SENT_KEY) || []).filter(x => x.data && x.data.kidId === kidId));

  async function byDay(key, full, recent, from) {
    const c = load(key), now = Date.now();
    if (c && now - c.at < DAYS_FULL_MS) {
      try {
        const add = raw(await recent(from).get()), keep = c.docs.filter(d => d.day < from);
        const docs = [...keep, ...add.map(d => ({ ...d, day: d.data.day || d.id }))];
        save(key, { at: c.at, docs });
        return out(docs);
      } catch (e) { console.warn('[fs-cache] recent-days read failed, reading all', e.code || e); }
    }
    const docs = raw(await full().get()).map(d => ({ ...d, day: d.data.day || d.id }));
    save(key, { at: now, docs });
    return out(docs);
  }

  // Forget the copies (the parent's 刷新 button, sign-out): the next read is a full one.
  function clear(prefix) {
    try { Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }
  // Tell every device the bank changed (a parent write; check-bank.mjs does the same with the Admin SDK).
  const bumpBank = db => db.doc('meta/bank').set({ v: Date.now() }, { merge: true }).catch(e => console.warn('[fs-cache] bump', e.code || e));

  root.FsCache = { bank, attempts, byDay, clear, bumpBank, addSent, sent };
})(this);
