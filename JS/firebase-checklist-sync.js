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

  let readyPromise;
  const references = {};

  function initialize() {
    if (!readyPromise) {
      readyPromise = (async function () {
        if (!window.firebase) throw new Error('Firebase did not load');
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        await firebase.auth().signInAnonymously();
        return firebase.database();
      })();
    }
    return readyPromise;
  }

  async function attach(component, childName, localStorageKey) {
    try {
      const database = await initialize();
      const ref = database.ref('checklists/' + childName);
      references[childName] = ref;

      const first = await ref.once('value');
      if (!first.exists()) {
        try {
          const local = localStorage.getItem(localStorageKey);
          if (local) await ref.set(JSON.parse(local));
        } catch (error) {
          console.warn('Could not migrate local checklist data:', error);
        }
      }

      ref.on('value', function (snapshot) {
        const checked = snapshot.val() || {};
        component.setState({ checked: checked });
        try { localStorage.setItem(localStorageKey, JSON.stringify(checked)); } catch (error) {}
      }, function (error) {
        console.error('Checklist sync failed:', error);
      });
    } catch (error) {
      console.error('Checklist connection failed:', error);
      try {
        const local = localStorage.getItem(localStorageKey);
        if (local) component.setState({ checked: JSON.parse(local) });
      } catch (storageError) {}
    }
  }

  function save(childName, checked, localStorageKey) {
    try { localStorage.setItem(localStorageKey, JSON.stringify(checked)); } catch (error) {}
    const ref = references[childName];
    if (ref) ref.set(checked).catch(function (error) {
      console.error('Checklist save failed:', error);
    });
  }

  function reset(childName, localStorageKey) {
    try { localStorage.removeItem(localStorageKey); } catch (error) {}
    const ref = references[childName];
    if (ref) ref.remove().catch(function (error) {
      console.error('Checklist reset failed:', error);
    });
  }

  window.ChecklistCloud = { attach: attach, save: save, reset: reset };
})();
