/* plan-core.js —— 「每天按时间自动排」的排法（HOMEWORK-SYSTEM.md 2026-10-06，Sam 定：每人每天 90 分钟、按顺序排）。
   parent.html（每次打开家长台）和 homework-system/plan-day.mjs（每天早上 Mac 上自动跑）共用这一份，
   改这里两边一起变。都是纯函数：不碰 Firestore，读写由调用的一方做。

   队列的先后看每份作业身上的 q（字符串，按字典序排）：
     · 第一次被排时记下「那天|第几份」，顺延过来的用最早派的那天 —— 所以延后的总在前面；
     · 家长「往前 / 往后」之后整条队重新编号：qSeq(今天, 第几个)；
     · 派发「排到队尾」qTail，「插到最前」qFront（'!' 比数字小，'~' 比数字大）。 */
(function(root){
  const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const shiftDay = (d, n) => { const x = new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return iso(x); };
  // Class Vocab 跟着上课走，钉在派的那天；顺延过来的就不算钉住了，跟着队排
  const planPinned = it => !it.carried && /Class-Vocab/i.test(decodeURIComponent(it.id||''));
  const pad = (n, w) => String(n).padStart(w, '0');
  const qTail  = i => '~' + Date.now() + '|' + pad(i, 3);
  const qFront = i => '!' + pad(9e12 - Date.now(), 13) + '|' + pad(i, 3);
  const qSeq   = (T, i) => T + '|r' + pad(i, 4);

  // 纯函数，方便单独测：days = [{date, items}]（今天和以后的），返回 { date: items }，覆盖今天（或明天）往后所有要写的天。
  function planDays({ T, planToday, days, budget, gap, mins, doneAhead, keepToday, pinned }){
    const start = planToday ? T : shiftDay(T, 1);
    const out = {}, used = {}, seen = new Set();
    // 估不出数（NaN、0）就按 20 分钟算，免得这份永远排不进去
    const mm = it => { const v = +mins(it); return Number.isFinite(v) && v > 0 ? v : 20; };
    const add = (d, it) => { (out[d] = out[d] || []).push(it); seen.add(it.id); used[d] = (used[d] || 0) + mm(it) + gap; };
    // 哪天撤回过这份，就不再把它排回那天
    const wd = {}; days.forEach(d => { wd[d.date] = new Set((d.withdrawn || []).map(x => x.id)); });
    const pool = [];
    days.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(d=>{
      if(d.date === T && !planToday){ d.items.forEach(it => { out[T] = out[T] || []; out[T].push(it); seen.add(it.id); }); return; }
      d.items.forEach((it, i)=>{
        const x = it.q ? { ...it } : { ...it, q: (it.carried ? (it.origin || d.date) : d.date) + '|' + String(i).padStart(3, '0') };
        if(seen.has(x.id) || pool.some(y => y.id === x.id)) return;   // 同一份派了两天：只留最早那份
        if(d.date === T){ if(keepToday(x) || pinned(x)) return add(T, x); }
        else {
          if(doneAhead(x)) return add(T, { ...x, ahead: true });
          if(pinned(x)) return add(d.date, x);
        }
        pool.push(x);
      });
    });
    pool.sort((a,b)=>a.q.localeCompare(b.q));
    let d = start;
    for(let guard = 0; pool.length && guard < 366; d = shiftDay(d, 1), guard++){
      // 同一科目严格按顺序（数学课有先后，L7 不能跳到 L1 前面）：一份放不下，同科后面的今天也不放，只拿别的科来填
      let placed = 0;
      const blocked = new Set();
      for(let i = 0; i < pool.length; ){
        const it = pool[i], m = mm(it) + gap, have = used[d] || 0, sj = it.subj || '';
        if(blocked.has(sj) || (wd[d] && wd[d].has(it.id))){ blocked.add(sj); i++; continue; }
        if(m <= budget - have || (i === 0 && placed === 0 && m > budget / 2 && have < budget / 2)){ add(d, pool.splice(i, 1)[0]); placed++; }
        else { blocked.add(sj); i++; }
      }
    }
    // 兜底：一年都排不进去的（不该有），放在最后一天，绝不能从库里丢掉
    pool.forEach(it => add(d, it));
    // 重排过的不再写「从 X 挪来」；顺延过的留着 movedFrom，好算延后几天
    Object.values(out).forEach(list => list.forEach(it => { if(!it.carried) delete it.movedFrom; }));
    days.forEach(d => { if(d.date >= start && !out[d.date]) out[d.date] = []; });
    return out;
  }

  const api = { iso, shiftDay, planPinned, planDays, qTail, qFront, qSeq };
  if(typeof module !== 'undefined' && module.exports) module.exports = api; else root.PlanCore = api;
})(this);
