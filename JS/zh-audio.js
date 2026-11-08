/* Pre-recorded Chinese audio for the 中文阅读 lesson pages (HOMEWORK-SYSTEM.md 2026-11-08).
   speechSynthesis goes silent when an iPad / iPhone is on silent, and some devices have no Chinese
   voice at all; an <audio> element plays in both cases. Each page loads audio/zh/<page>.js first, which sets
     window.ZH_AUDIO = { dir: 'audio/zh', map: { '<exact text the page speaks>': 'x.mp3' | ['a.mp3','b.mp3'] } }
   (built by homework-system/zh-audio-builder). The page's speak() calls ZhAudio.play(text, slow) first and
   only falls back to the device voice when there is no clip for that text. */
(function(){
  var el = new Audio(), queue = [], rate = 1;
  el.preload = 'auto';
  function next(){
    var f = queue.shift(); if (!f) return;
    el.src = f;
    el.defaultPlaybackRate = rate; el.playbackRate = rate;
    try { el.preservesPitch = true; el.webkitPreservesPitch = true; } catch (e) {}
    var p = el.play(); if (p && p.catch) p.catch(function(){});
  }
  el.addEventListener('ended', next);
  /* a clip that won't load (offline, blocked): say the same text with the device voice instead */
  var lastText = '';
  el.addEventListener('error', function(){
    queue = [];
    try {
      var u = new SpeechSynthesisUtterance(lastText);
      u.lang = 'zh-CN'; u.rate = rate < 0.8 ? 0.6 : 0.85;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch (e) {}
  });
  window.ZhAudio = {
    play: function(text, slow){
      var A = window.ZH_AUDIO, m = A && A.map[text];
      if (!m) return false;
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
      el.pause();
      lastText = text;
      rate = slow ? 0.7 : 0.9;
      queue = [].concat(m).map(function(f){ return A.dir + '/' + f; });
      next();
      return true;
    },
    stop: function(){ queue = []; el.pause(); }
  };
})();
