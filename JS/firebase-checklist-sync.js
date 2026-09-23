(function () {
  'use strict';

  const firebaseConfig = {
    apiKey: 'AIzaSyDMKUeccjFtMbotXulnMhYcoykWpw4Y7ls',
    authDomain: 'family-checklist-acc6b.firebaseapp.com',
    databaseURL: 'https://family-checklist-acc6b-default-rtdb.firebaseio.com',
    projectId: 'family-checklist-acc6b',
    storageBucket: 'family-checklist-acc6b.firebasestorage.app',
    messagingSenderId: '127899043154',
    appId: '1:127899043154:web:5a49cce9a1913fbc41e68b'
  };

  // Reuse the named sessions used by parent.html and homework.html. Never
  // create an anonymous session. Database rules remain the authority.
  const entries = new Map();
  let apps = [], initialization, generation = 0, banner;
  const clone = value => JSON.parse(JSON.stringify(value || {}));
  const denied = error => /permission|denied/i.test((error && error.code) || '');

  function showStatus() {
    if (!document.body) return;
    if (!banner) {
      banner = document.createElement('aside');
      banner.id = 'checklist-cloud-status';
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:2147483647;padding:12px 16px;border:1px solid #cfc7b8;border-radius:10px;background:#fffdf7;color:#29251e;font:14px/1.5 system-ui;box-shadow:0 3px 18px #0002;max-height:30vh;overflow:auto';
      const message = document.createElement('div');
      message.className = 'checklist-cloud-message';
      banner.appendChild(message);
      const actions = document.createElement('div');
      actions.className = 'checklist-cloud-actions';
      [['孩子登录', '../homework.html'], ['家长登录', '../parent.html']].forEach(([label, href]) => {
        const link = document.createElement('a');
        link.textContent = label; link.href = href; link.target = '_blank'; link.rel = 'noopener';
        link.style.cssText = 'display:inline-block;margin:6px 16px 0 0;color:#295d3b';
        actions.appendChild(link);
      });
      const retry = document.createElement('button');
      retry.type = 'button'; retry.textContent = '重新连接';
      retry.onclick = () => initialize().then(refresh).catch(connectionFailed);
      actions.appendChild(retry);
      banner.appendChild(actions);
      document.body.appendChild(banner);
    }
    banner.querySelector('.checklist-cloud-message').textContent = Array.from(entries.values())
      .map(e => e.label + '：' + e.status).join(' ｜ ');
    banner.querySelector('.checklist-cloud-actions').hidden = Array.from(entries.values())
      .every(e => e.ready);
  }

  function detach(entry, clear) {
    if (entry.ref && entry.listener) entry.ref.off('value', entry.listener);
    entry.ref = null; entry.listener = null; entry.ready = false;
    if (clear) {
      entry.checked = {};
      entry.component.setState({ checked: {} });
      // Cached data from a previous identity must not appear after sign-out.
      try { localStorage.removeItem(entry.storageKey); } catch (_) {}
    }
  }

  function connectionFailed() {
    generation++;
    entries.forEach(entry => {
      detach(entry, true);
      entry.status = '连接失败，请检查网络后重新连接；尚未同步';
    });
    showStatus();
  }

  function initialize() {
    if (!initialization) {
      initialization = (async () => {
        if (!window.firebase || !firebase.auth || !firebase.database) throw new Error('Firebase unavailable');
        apps = ['parent', 'kid'].map(name => firebase.apps.find(app => app.name === name)
          || firebase.initializeApp(firebaseConfig, name));
        let restored = false;
        await Promise.all(apps.map(app => new Promise((resolve, reject) => {
          let first = true;
          app.auth().onAuthStateChanged(() => {
            if (first) { first = false; resolve(); }
            else if (restored) refresh();
          }, error => {
            if (first) { first = false; reject(error); }
            else connectionFailed();
          });
        })));
        restored = true;
      })().catch(error => { initialization = null; throw error; });
    }
    return initialization;
  }

  async function connect(entry, revision) {
    const candidates = apps.filter(app => {
      const user = app.auth().currentUser;
      return user && !user.isAnonymous;
    });
    if (!candidates.length) {
      entry.status = '请先登录孩子或家长账号，再返回此页';
      showStatus(); return;
    }
    for (const app of candidates) {
      const uid = app.auth().currentUser.uid;
      const ref = app.database(firebaseConfig.databaseURL).ref('checklists/' + entry.key);
      try {
        const snapshot = await ref.once('value');
        if (revision !== generation || !app.auth().currentUser || app.auth().currentUser.uid !== uid) return;
        entry.ref = ref; entry.ready = true;
        const apply = value => {
          entry.checked = clone(value);
          entry.component.setState({ checked: clone(entry.checked) });
          try { localStorage.setItem(entry.storageKey, JSON.stringify(entry.checked)); } catch (_) {}
        };
        apply(snapshot.val());
        entry.status = '已连接家庭账号，清单已同步';
        entry.listener = snap => {
          if (revision !== generation) return;
          apply(snap.val());
        };
        ref.on('value', entry.listener, error => {
          if (revision !== generation) return;
          detach(entry, true);
          entry.status = denied(error) ? '此账号没有权限，请切换家庭账号' : '同步中断，请重新连接';
          showStatus();
        });
        showStatus(); return;
      } catch (error) {
        if (revision !== generation) return;
        if (!denied(error)) {
          entry.status = '连接失败，请检查网络后重新连接；尚未同步';
          showStatus(); return;
        }
      }
    }
    if (revision === generation) {
      entry.status = '此账号没有这份清单的权限，请使用对应孩子或家长账号';
      showStatus();
    }
  }

  function refresh() {
    const revision = ++generation;
    entries.forEach(entry => {
      detach(entry, true);
      entry.status = '正在验证登录身份…';
    });
    showStatus();
    return Promise.all(Array.from(entries.values(), entry => connect(entry, revision)));
  }

  async function attach(component, childName, localStorageKey) {
    const previous = entries.get(childName);
    if (previous) detach(previous, true);
    const label = childName.startsWith('grace') ? 'Grace 清单' : childName.startsWith('warren') ? 'Warren 清单' : '清单';
    entries.set(childName, { key: childName, component, storageKey: localStorageKey,
      checked: {}, ready: false, status: '正在恢复家庭登录…', label });
    showStatus();
    try { await initialize(); await refresh(); } catch (_) { connectionFailed(); }
  }

  async function save(childName, checked) {
    const entry = entries.get(childName);
    if (!entry) return false;
    if (!entry.ready) {
      // Existing checklist components update optimistically during setState.
      // Restore the last permitted snapshot after that state update completes.
      Promise.resolve().then(() => entry.component.setState({ checked: clone(entry.checked) }));
      showStatus(); return false;
    }
    const revision = generation;
    const before = clone(entry.checked);
    entry.status = '正在保存…'; showStatus();
    try {
      await entry.ref.set(clone(checked));
      if (revision !== generation) return false;
      entry.status = '已保存到家庭清单'; showStatus(); return true;
    } catch (error) {
      if (revision !== generation) return false;
      entry.checked = before;
      entry.component.setState({ checked: clone(before) });
      entry.status = '保存失败，改动未同步；请重新连接';
      if (denied(error)) detach(entry, true);
      // Show retry even after a transient write failure.
      entry.ready = false;
      showStatus(); return false;
    }
  }

  function reset(childName) { return save(childName, {}); }
  window.ChecklistCloud = { attach, save, reset };
})();
