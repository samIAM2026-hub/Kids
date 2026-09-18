/* =====================================================================
   ai-key.js — ONE Anthropic API key for every Kids page that needs Claude
   to mark something (writing, open-ended answers, anything the page can't
   grade by itself).

   Why a shared file: localStorage is per-origin, so a key typed once on
   https://samiam2026-hub.github.io is readable by every page under Kids/.
   Type it once on a device; every marking page on that device has it.
   It is never written into the repo, never sent to Firebase, and never
   goes anywhere except api.anthropic.com.

   Use it from a page:
     <script src="../JS/ai-key.js"></script>
     KidsAI.mountPanel(document.getElementById('somediv'));   // the setup UI
     KidsAI.hasKey()                                          // -> true/false
     KidsAI.askJSON({ system: '...', user: '...' })           // -> Promise<object>

   Design notes live in HOMEWORK-SYSTEM.md (2026-09-18 · Writing Lab).
===================================================================== */
(function () {
  'use strict';

  var K_KEY = 'kidsAI.key.v1';
  var K_MODEL = 'kidsAI.model.v1';
  // The Writing Lab shipped first with its own keys; move them over once.
  var LEGACY = [['writingLab.key.v1', K_KEY], ['writingLab.model.v1', K_MODEL]];

  var API = 'https://api.anthropic.com/v1/';
  var VERSION = '2023-06-01';

  function get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function set(k, v){ try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); }catch(e){} }

  LEGACY.forEach(function (p){ var v = get(p[0]); if (v && !get(p[1])) set(p[1], v); });

  function headers(json){
    var h = {
      'x-api-key': get(K_KEY) || '',
      'anthropic-version': VERSION,
      // Anthropic's opt-in header for calling the API straight from a browser.
      'anthropic-dangerous-direct-browser-access': 'true'
    };
    if (json) h['content-type'] = 'application/json';
    return h;
  }

  function friendly(status, detail){
    if (status === 401) return 'The API key was refused (401). Check it in the setup panel.';
    if (status === 400 && /credit|balance/i.test(detail)) return 'The API account is out of credit (400). Top it up in the Anthropic console.';
    if (status === 403) return 'That key is not allowed to do this (403).';
    if (status === 404) return 'That model is not available on this key (404). Pick another one in the setup panel.';
    if (status === 429) return 'Too many requests right now (429). Wait a minute and try again.';
    if (status === 500 || status === 529) return 'The service is busy (' + status + '). Try again in a moment.';
    return 'The request failed (' + status + ')' + (detail ? ': ' + detail : '') + '.';
  }

  function post(path, body){
    if (!get(K_KEY)) return Promise.reject(new Error('No API key saved on this device yet. Open the setup panel and paste one in.'));
    return fetch(API + path, { method: 'POST', headers: headers(true), body: JSON.stringify(body) })
      .then(handle, netErr);
  }
  function getJSON(path){
    if (!get(K_KEY)) return Promise.reject(new Error('No API key saved on this device yet.'));
    return fetch(API + path, { headers: headers(false) }).then(handle, netErr);
  }
  function netErr(){ throw new Error('Could not reach Claude. Check the internet connection and try again.'); }
  function handle(r){
    return r.text().then(function (t){
      var j = null; try{ j = JSON.parse(t); }catch(e){}
      if (!r.ok) throw new Error(friendly(r.status, (j && j.error && j.error.message) || ''));
      return j;
    });
  }

  /* ---------- the two calls pages actually make ---------- */
  function ask(o){
    o = o || {};
    return post('messages', {
      model: get(K_MODEL) || 'claude-sonnet-4-5',
      max_tokens: o.maxTokens || 4000,
      temperature: o.temperature == null ? 0.2 : o.temperature,
      system: o.system || '',
      messages: [{ role: 'user', content: o.user || '' }]
    }).then(function (j){
      var out = '';
      (j.content || []).forEach(function (b){ if (b.type === 'text') out += b.text; });
      return out;
    });
  }

  // Same call, but the reply is expected to be one JSON object. Strips a stray
  // ``` fence and any chat around it, which is the usual way this goes wrong.
  function askJSON(o){
    return ask(o).then(function (raw){
      var s = String(raw || '').trim()
        .replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      var a = s.indexOf('{'), b = s.lastIndexOf('}');
      if (a < 0 || b < a) throw new Error('The reply came back in a shape this page could not read. Try again.');
      try{ return JSON.parse(s.slice(a, b + 1)); }
      catch(e){ throw new Error('The reply came back in a shape this page could not read. Try again.'); }
    });
  }

  function listModels(){
    return getJSON('models?limit=40').then(function (j){
      return (j.data || []).map(function (m){ return { id: m.id, name: m.display_name || m.id }; });
    });
  }

  /* ---------- the shared setup panel ---------- */
  // Any page can drop this into a container and get the same UI and the same
  // storage, so the key really is "type it once".
  var CSS = [
    '.kaip{font-family:inherit}',
    '.kaip p{font-size:.87rem;color:#5b4636;margin:0 0 11px;line-height:1.6}',
    '.kaip label{display:block;font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;font-size:.62rem;',
      'letter-spacing:.13em;text-transform:uppercase;color:#5b4636;margin:0 0 5px}',
    '.kaip input,.kaip select{width:100%;font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;font-size:.85rem;',
      'padding:10px 12px;border:1px solid #e2d9c9;border-radius:8px;background:#f6f3ed;color:#1c1a17;',
      'margin:0 0 13px;outline:none}',
    '.kaip input:focus,.kaip select:focus{border-color:#b4622f}',
    '.kaip .row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}',
    '.kaip button{font-family:inherit;font-size:.85rem;cursor:pointer;border-radius:8px;border:1px solid #e2d9c9;',
      'background:#fffdf7;color:#1c1a17;padding:8px 14px}',
    '.kaip button:hover{border-color:#b4622f;color:#b4622f}',
    '.kaip .st{font-size:.82rem;font-style:italic;color:#5b4636}',
    '.kaip .st.ok{color:#3f7d4e;font-style:normal}',
    '.kaip .st.bad{color:#c0392b;font-style:normal}',
    '.kaip .note{font-size:.79rem;color:#5b4636;background:#faf6ee;border:1px dashed #e2d9c9;',
      'border-radius:8px;padding:10px 12px;margin-top:13px;line-height:1.6}'
  ].join('');

  function mountPanel(el){
    if (!el) return;
    if (!document.getElementById('kaip-css')){
      var s = document.createElement('style'); s.id = 'kaip-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
    el.innerHTML =
      '<div class="kaip">' +
        '<p>Marking is done by Claude. The key below is kept <b>only in this browser, on this device</b> — ' +
        'it is never put in the repo, never sent to Firebase, and never leaves this device except to ' +
        'Anthropic’s own API. <b>Type it once here and every page in Kids that needs marking can use it.</b></p>' +
        '<label for="kaip-key">Anthropic API key</label>' +
        '<input id="kaip-key" type="password" placeholder="sk-ant-api03-..." autocomplete="off" spellcheck="false">' +
        '<label for="kaip-model">Model</label>' +
        '<select id="kaip-model"><option value="">— save a key first, then the list loads —</option></select>' +
        '<div class="row">' +
          '<button type="button" id="kaip-save">Save</button>' +
          '<button type="button" id="kaip-test">Test it</button>' +
          '<button type="button" id="kaip-clear">Remove from this device</button>' +
          '<span class="st" id="kaip-st"></span>' +
        '</div>' +
        '<div class="note">Use a key with a monthly spend limit set on it. One piece of marking costs well under a cent, ' +
        'but a key sitting in a browser is a key the device is holding.</div>' +
      '</div>';

    var kin = el.querySelector('#kaip-key'), min = el.querySelector('#kaip-model'), st = el.querySelector('#kaip-st');
    function say(t, cls){ st.className = 'st' + (cls ? ' ' + cls : ''); st.textContent = t; }

    if (get(K_KEY)) kin.value = get(K_KEY);

    function refresh(){
      if (!get(K_KEY)) return;
      say('Loading the model list…');
      listModels().then(function (list){
        if (!list.length) throw new Error('no models returned');
        var chosen = get(K_MODEL);
        if (!chosen || !list.some(function (m){ return m.id === chosen; })){
          var son = list.filter(function (m){ return /sonnet/i.test(m.id); })[0];
          chosen = (son || list[0]).id; set(K_MODEL, chosen);
        }
        min.innerHTML = list.map(function (m){
          return '<option value="' + m.id + '"' + (m.id === chosen ? ' selected' : '') + '>' + m.name + '</option>';
        }).join('');
        say('Key saved on this device · marking will use ' + chosen, 'ok');
      }).catch(function (e){ say(e.message || String(e), 'bad'); });
    }

    el.querySelector('#kaip-save').onclick = function (){
      var v = kin.value.trim();
      if (!v){ say('Paste a key first.', 'bad'); return; }
      set(K_KEY, v); refresh();
    };
    el.querySelector('#kaip-test').onclick = function (){
      if (!get(K_KEY)){ say('Save a key first.', 'bad'); return; }
      say('Sending a one-word test…');
      ask({ system: 'Reply with the single word: ready', user: 'ping', maxTokens: 16, temperature: 0 })
        .then(function (t){ say('Working — Claude replied “' + String(t).trim().slice(0, 20) + '”', 'ok'); })
        .catch(function (e){ say(e.message || String(e), 'bad'); });
    };
    el.querySelector('#kaip-clear').onclick = function (){
      set(K_KEY, null); set(K_MODEL, null); kin.value = '';
      min.innerHTML = '<option value="">— save a key first, then the list loads —</option>';
      say('Removed from this device.');
    };
    min.onchange = function (){ set(K_MODEL, min.value); say('Marking will use ' + min.value, 'ok'); };

    refresh();
  }

  window.KidsAI = {
    hasKey:   function (){ return !!get(K_KEY); },
    getModel: function (){ return get(K_MODEL) || ''; },
    setModel: function (m){ set(K_MODEL, m); },
    clearKey: function (){ set(K_KEY, null); set(K_MODEL, null); },
    listModels: listModels,
    ask: ask,
    askJSON: askJSON,
    mountPanel: mountPanel
  };
})();
