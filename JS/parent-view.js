/* =====================================================================
   parent-view.js — 家长「只看不动」 (Sam 2026-11-23:「我能看和进入孩子的页面，
   但是我的权限不会影响孩子看他的东西」「不要每次只能先进家长界面」).

   A parent signed in with the parent account (the same named Firebase app 'parent' as
   parent.html, so one sign-in per device covers both) can open any kid page with
   ?as=warren / ?as=grace and see exactly what that kid sees. Nothing the parent does there
   may change the kid's data:

   - guard(firebase): from then on every Firestore write in this page (set / update / delete /
     add, in a transaction or a batch too) is dropped and logged, so a write path nobody
     thought of is still covered. The only way through is ParentView.writing(fn), used by
     homework.html's gold 🔑 buttons, which are deliberate parent actions.
   - link(url, kid): a page opened from the parent's view gets ?preview=1&as=<kid>, so
     quiz-report.js records nothing and the next page stays in the parent's view.
   - connect(): for pages that don't load Firebase themselves (Writing-Lab.html in preview):
     loads the compat SDK, signs in as nothing new, installs the guard and says whether a
     parent is signed in.
   ===================================================================== */
(function (root) {
  'use strict';

  var KIDS = {
    grace:  { n: 'Grace',  av: '👧', uid: 'mbtSDgfFrOOS4xIT3eXr7pETEt33' },
    warren: { n: 'Warren', av: '👦', uid: 'paACSAD0W0bBNknKrAf3GfpHy8x1' }
  };
  var KID_UIDS = Object.keys(KIDS).map(function (k) { return KIDS[k].uid; });
  var q = new URLSearchParams(location.search);
  var AS = KIDS[q.get('as')] ? q.get('as') : null;
  var PREVIEW = q.get('preview') === '1';

  var allow = 0;
  var PV = {
    KIDS: KIDS, AS: AS, PREVIEW: PREVIEW, blocked: 0, guarded: false,

    // Drop every Firestore write unless it runs inside ParentView.writing().
    guard: function (firebase) {
      if (PV.guarded || !firebase || !firebase.firestore) return;
      PV.guarded = true;
      var F = firebase.firestore;
      [['DocumentReference', ['set', 'update', 'delete']], ['CollectionReference', ['add']],
       ['Transaction', ['set', 'update', 'delete']], ['WriteBatch', ['set', 'update', 'delete']]].forEach(function (t) {
        var C = F[t[0]];
        if (!C || !C.prototype) return;
        t[1].forEach(function (m) {
          var orig = C.prototype[m];
          if (typeof orig !== 'function') return;
          C.prototype[m] = function () {
            if (allow > 0) return orig.apply(this, arguments);
            PV.blocked++;
            try { console.warn('[家长预览] 没有写入：' + t[0] + '.' + m + ' ' + ((this && this.path) || '')); } catch (e) {}
            if (t[0] === 'Transaction' || t[0] === 'WriteBatch') return this;        // keeps tx.set(…).set(…) chains working
            if (t[0] === 'CollectionReference') return Promise.resolve(this.doc());  // a ref that was never written
            return Promise.resolve();
          };
        });
      });
    },

    // A deliberate parent action (🔑 buttons): its writes go through.
    writing: function (fn) {
      allow++;
      var done = function () { allow--; };
      var p;
      try { p = Promise.resolve(fn()); } catch (e) { done(); return Promise.reject(e); }
      return p.then(function (v) { done(); return v; }, function (e) { done(); throw e; });
    },

    // Keep the parent's view when a page is opened from it. Other sites are left alone.
    link: function (url, kid) {
      if (!kid || /^https?:\/\//i.test(url || '')) return url;
      var i = url.indexOf('#'), hash = i >= 0 ? url.slice(i) : '', base = i >= 0 ? url.slice(0, i) : url;
      return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'preview=1&as=' + encodeURIComponent(kid) + hash;
    },

    isKidUid: function (uid) { return KID_UIDS.indexOf(uid) >= 0; },

    // For a page without its own Firebase: { db, auth, user, parent } once the saved sign-in is known.
    connect: function () {
      if (PV._conn) return PV._conn;
      var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
      var load = function (f) {
        return new Promise(function (ok, bad) {
          var s = document.createElement('script'); s.src = SDK + f; s.onload = ok; s.onerror = bad;
          document.head.appendChild(s);
        });
      };
      var have = root.firebase && root.firebase.firestore && root.firebase.auth;
      PV._conn = (have ? Promise.resolve() : load('firebase-app-compat.js')
        .then(function () { return Promise.all([load('firebase-auth-compat.js'), load('firebase-firestore-compat.js')]); }))
        .then(function () {
          var fb = root.firebase, app;
          try { app = fb.app('parent'); } catch (e) {
            app = fb.initializeApp({
              apiKey: 'AIzaSyDMKUeccjFtMbotXulnMhYcoykWpw4Y7ls',
              authDomain: 'family-checklist-acc6b.firebaseapp.com',
              projectId: 'family-checklist-acc6b',
              appId: '1:127899043154:web:5a49cce9a1913fbc41e68b'
            }, 'parent');
          }
          PV.guard(fb);
          var auth = app.auth(), db = app.firestore();
          return new Promise(function (ok) {
            var off = auth.onAuthStateChanged(function (u) {
              off();
              ok({ db: db, auth: auth, user: u, parent: !!(u && !u.isAnonymous && !PV.isKidUid(u.uid)) });
            });
          });
        });
      return PV._conn;
    }
  };
  root.ParentView = PV;
})(window);
