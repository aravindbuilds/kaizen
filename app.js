/* Kaizen — social progression platform.
   Home · Paths · Focus · Social · Profile. Offline-first; Firebase duo sync optional. */
const APP_V = "2.5";
window.__kzStep = "load";
window.addEventListener("error", e => {
  const t = document.querySelector("#errToast");
  if (t) { const where = (e.error && e.error.stack || "").split("\n")[1] || "";
    t.textContent = "Something hiccuped: " + (e.message || "unknown error") + " " + where.trim()
      + " [at: " + (window.__kzStep || "?") + "] — reload picks up where you left off.";
    t.classList.remove("hidden"); clearTimeout(window.__errT);
    window.__errT = setTimeout(() => t.classList.add("hidden"), 12000); }
});
window.addEventListener("unhandledrejection", e => {
  const t = document.querySelector("#errToast");
  const reason = e.reason || {};
  const msg = reason.message || String(reason) || "unknown error";
  if (t) {
    t.textContent = "Something hiccuped: " + msg + " [at: " + (window.__kzStep || "?") + "]";
    t.classList.remove("hidden"); clearTimeout(window.__errT);
    window.__errT = setTimeout(() => t.classList.add("hidden"), 12000);
  }
});
const $ = s => document.querySelector(s);
const LS_MAIN = "kaizen_v2", LS_DUO = "kaizen_duo", LS_SEEN = "kaizen_feedseen", LS_AUTH_RETURN = "kaizen_auth_return";
const store = {
  load(k){ try{ return JSON.parse(localStorage.getItem(k)) || null }catch{ return null } },
  save(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch{ return false; } }
};
function safeStoreGet(k){ try{ return localStorage.getItem(k); }catch{ return null; } }
function safeStoreSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch{ return false; } }
function safeStoreRemove(k){ try{ localStorage.removeItem(k); }catch{} }
const today = () => new Date().toISOString().slice(0,10);
const dayKey = (off=0) => new Date(Date.now()-off*864e5).toISOString().slice(0,10);
function dflt(){ return { v:3, xp:0, gems:0, streak:0, best:0, lastDay:"", chestDay:"", name:"",
  badges:[], myVids:{}, flags:{}, combo:0, bestCombo:0, courses:{}, activeCourse:null, enrolled:[],
  sessions:[], settings:{showActivity:true, showPaths:false} }; }
function blankCourse(){ return { decks:{}, days:{}, seen:{}, lastDeck:null }; }
function normCourse(c){ c=c||{}; c.decks=c.decks||{}; c.days=c.days||{}; c.seen=c.seen||{};
  Object.values(c.decks).forEach(d=>{ d.a=d.a||[]; d.correct=d.correct||0; d.total=d.total||0; });
  Object.values(c.days).forEach(d=>{ d.answers=d.answers||0; d.correct=d.correct||0; d.secs=d.secs||0; d.xp=d.xp||0; if(!d.h) d.h=new Array(24).fill(0); });
  return c; }
let S = store.load(LS_MAIN) || dflt();
(function migrate(){
  if(S.v===3) return;
  const old = store.load("nicl_quest_v1");
  S = Object.assign(dflt(), S, { v:3 });
  S.settings = S.settings||{showActivity:true, showPaths:false}; S.sessions = S.sessions||[];
  if(old && !S.courses["nicl-ao-2026"]){
    const c = blankCourse();
    c.decks = Object.fromEntries(Object.entries(old.decks||{}).map(([k,v])=>[`nicl-ao-2026:${k}`,v]));
    c.days = old.days||{};
    S.courses["nicl-ao-2026"]=c;
    Object.assign(S,{xp:old.xp||0,gems:old.gems||0,streak:old.streak||0,best:old.best||0,
      lastDay:old.lastDay||"",chestDay:old.chestDay||"",badges:old.badges||[],bestCombo:old.bestCombo||0,
      enrolled:["nicl-ao-2026"],activeCourse:"nicl-ao-2026"});
    S.myVids={"nicl-ao-2026":old.myVids||[]};
  }
  store.save(LS_MAIN,S);
})();
normState();
function CC(){ S.courses[S.activeCourse]=normCourse(S.courses[S.activeCourse]); return S.courses[S.activeCourse]; }
function normState(){ S.flags=S.flags||{}; S.badges=S.badges||[]; S.myVids=S.myVids||{};
  S.courses=S.courses||{}; S.enrolled=S.enrolled||[]; S.sessions=S.sessions||[];
  S.settings=Object.assign({showActivity:true, showPaths:false},S.settings||{});
  Object.keys(S.courses).forEach(k=>{ S.courses[k]=normCourse(S.courses[k]); }); }

/* ---------- tiny md ---------- */
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
function inline(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>")
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
  .replace(/(^|[\s(>])(https?:\/\/[^\s<)]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>'); }
function md(t){ if(!t) return "";
  return t.split("\n").map(line=>{
    if(/^### /.test(line)) return `<h3>${esc(line.slice(4))}</h3>`;
    if(/^## /.test(line)) return `<h3>${esc(line.slice(3))}</h3>`;
    if(/^# /.test(line)) return `<h3>${esc(line.slice(2))}</h3>`;
    if(/^\s*-\s+/.test(line)) return `<ul><li>${inline(line.replace(/^\s*-\s+/,""))}</li></ul>`;
    if(/^\s*\d+\.\s+/.test(line)) return `<p>${inline(line.replace(/^\s*\d+\.\s+/,""))}</p>`;
    return line.trim()?`<p>${inline(line)}</p>`:"";
  }).join("").replace(/<\/ul><ul>/g,""); }

/* ---------- courses ---------- */
let COURSES = {};
let USING_FALLBACK = false;
function ingest(id, meta, decks, quizzes, videos, guides, plan, resources){
  const byQ = {}; decks.forEach(d=>d.cards.forEach((c,i)=>{ byQ[d.id+"::"+c.q]=i; }));
  quizzes.forEach(q=>q.questions.forEach(qq=>{ if(qq.oi===undefined){
    const did=qq.deck||decks[0]?.id; qq.oi = byQ[did+"::"+qq.q] ?? -1; } }));
  COURSES[id] = { meta, decks, quizzes, videos, guides:guides||[], plan, resources };
}
function loadFallback(){
  (window.KAIZEN_FALLBACK?.courses||[]).forEach(p=>{
    if(p.id.startsWith("_")) return;
    ingest(p.id, p.meta, p.decks, p.quizzes, p.videos, p.guides, p.plan, p.resources); });
  if(Object.keys(COURSES).length) USING_FALLBACK = true;
}
async function loadCourses(){
  try{
    const reg = await (await fetch("courses/courses.json")).json();
    for(const r of reg){ if(r.id.startsWith("_")) continue;
      try{
        const meta = await (await fetch(r.path)).json();
        const base = r.path.slice(0, r.path.lastIndexOf("/")+1);
        const get = async f => { try{ const x=await fetch(base+f); return x.ok?await x.text():null; }catch{ return null; } };
        const F = meta.files||{};
        ingest(r.id, meta,
          JSON.parse(await get(F.decks||"decks.json")||"[]"),
          JSON.parse(await get(F.quizzes||"quizzes.json")||"[]"),
          JSON.parse(await get(F.videos||"videos.json")||"[]"),
          JSON.parse(await get(F.guides||"guides.json")||"[]"),
          await get(F.plan||"plan.md"), await get(F.resources||"resources.md"));
      }catch(e){ console.warn("pack failed", r.id, e); }
    }
  }catch(e){ console.warn("registry fetch failed, trying embedded pack", e); }
  if(!Object.keys(COURSES).length) loadFallback();
  const ids = Object.keys(COURSES);
  if(!S.activeCourse || !COURSES[S.activeCourse]) S.activeCourse = ids[0]||null;
  if(!S.enrolled.length && ids.length) S.enrolled = [S.activeCourse];
  store.save(LS_MAIN,S);
  if(!ids.length) throw new Error("no courses");
}
const active = () => COURSES[S.activeCourse];
const ckey = did => `${S.activeCourse}:${did}`;
const deckById = (cid,did) => (COURSES[cid]||{decks:[]}).decks.find(d=>d.id===did);

/* ---------- sound (restrained) ---------- */
let AC=null;
function beep(f=660,d=.07){ try{ AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  const o=AC.createOscillator(), g=AC.createGain(); o.frequency.value=f;
  g.gain.setValueAtTime(.06,AC.currentTime); g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);
  o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime+d);}catch{} }

/* ---------- progress core ---------- */
const lvl = xp => Math.floor(Math.sqrt(xp/150))+1;
function touchDay(){
  const c=CC(), t=today();
  if(S.lastDay!==t){ S.streak=(S.lastDay===dayKey(1))?S.streak+1:1;
    S.best=Math.max(S.best,S.streak); S.lastDay=t; S.combo=0; }
  c.days[t]=c.days[t]||{answers:0,correct:0,secs:0,xp:0,h:new Array(24).fill(0)};
  if(!c.days[t].h) c.days[t].h=new Array(24).fill(0);
}
function addXP(n){ const before=lvl(S.xp); S.xp+=n;
  touchDay(); CC().days[today()].xp=(CC().days[today()].xp||0)+n;
  const L=lvl(S.xp);
  if(L>before){ feed(`reached Level ${L}`,"level"); }
  store.save(LS_MAIN,S); renderTop(); scheduleUpload(); }
function logAns(did, oi, ok, secs){
  touchDay(); const c=CC(), d=c.days[today()]; d.answers++; d.secs+=secs; if(ok) d.correct++;
  d.h[new Date().getHours()]++;
  if(oi>=0){ const sn=c.seen[ckey(did)]=c.seen[ckey(did)]||{}; sn[oi]=(sn[oi]||0)+1; }
  const D=c.decks[ckey(did)]=c.decks[ckey(did)]||{a:[],correct:0,total:0};
  D.a.push(ok?1:0); if(D.a.length>30) D.a.shift(); D.total++; if(ok) D.correct++;
  if(ok){ S.combo++; S.bestCombo=Math.max(S.bestCombo,S.combo);} else S.combo=0;
  if(d.answers===25) feed(`answered 25 questions today`,"goal");
  const m=mastery(S.activeCourse,did);
  if(m>=80 && D.total>=10 && !S.flags[`m80_${ckey(did)}`]){ S.flags[`m80_${ckey(did)}`]=1; S.gems+=2;
    feed(`reached ${m}% mastery in ${deckById(S.activeCourse,did)?.title||did}`,"mastery"); }
  checkBadges();
  store.save(LS_MAIN,S); renderTop(); renderHome(); scheduleUpload();
}
function mastery(cid,did){ const c=S.courses[cid], D=c&&c.decks[`${cid}:${did}`];
  if(!D||!D.a.length) return 0; return Math.round(100*D.a.reduce((x,y)=>x+y,0)/D.a.length); }
function completion(cid,did){ const deck=deckById(cid,did); if(!deck||!deck.cards.length) return 0;
  const sn=(S.courses[cid]||{seen:{}}).seen[`${cid}:${did}`]||{};
  return Math.round(100*Object.keys(sn).length/deck.cards.length); }
function checkBadges(){
  const nm=id=>{ const b=(typeof BADGES!=="undefined"?BADGES:[]).find(x=>x[0]===id); return b?b[2]:id; };
  const give=id=>{ if(!S.badges.includes(id)){ S.badges.push(id); S.gems+=3; feed(`unlocked "${nm(id)}"`,"mastery"); } };
  const allD=Object.values(S.courses).flatMap(c=>Object.values(c.decks||{}));
  const tot=allD.reduce((s,d)=>s+(d.total||0),0), cor=allD.reduce((s,d)=>s+(d.correct||0),0);
  const t=(S.courses[S.activeCourse]?.days||{})[today()]||{answers:0,correct:0};
  if(tot>=1) give("blood"); if(S.bestCombo>=5) give("combo5"); if(cor>=100) give("century");
  if(S.xp>=500) give("scholar"); if(S.streak>=7) give("week"); if(t.answers>=50) give("marathon");
  if(t.answers>=10 && t.correct/t.answers>=.8) give("sharp");
}
const BADGES=[["blood","01","First Steps","Answer 1"],["combo5","05","Streak 5","5 in a row"],["sharp","80","Sharp","80% over 10"],["century","100","Centurion","100 correct"],["scholar","XP","Scholar","500 XP"],["week","7d","Consistent","7-day streak"],["marathon","50","Marathon","50 answers/day"],["chest7","3x","Loyal","3 bonuses"]];

/* ---------- presence + interaction ---------- */
let lastTouch = Date.now();
["click","keydown","touchstart"].forEach(e=>addEventListener(e,()=>{ lastTouch=Date.now();
  if(SESS && SESS.state==="idle"){ setSessState("active"); } },{passive:true}));
document.addEventListener("visibilitychange",()=>{ lastTouch=Date.now();
  if(document.hidden){ try{ DB&&DUO.on&&DB.ref(`rooms/${DUO.room}/users/${DUO.uid}`).update(snapshot()); }catch{} } });

/* ---------- focus sessions ---------- */
let SESS=null; // {course,label,kind,deckId/mockId,startedAt,verified,xpStart,state,attempted,correct,wrongs[]}
let sessInt=null;
function startSession(kind,id,label){
  endSessionSilent();
  const A=active();
  SESS={course:S.activeCourse,label,kind,id,startedAt:Date.now(),verified:0,xpStart:S.xp,
    state:"active",attempted:0,correct:0,wrongs:[],lastTick:Date.now()};
  lastTouch=Date.now();
  CC().lastDeck = kind==="deck"?id:CC().lastDeck; store.save(LS_MAIN,S);
  $("#focusLanding").classList.add("hidden"); $("#focusSummary").classList.add("hidden");
  $("#focusActive").classList.remove("hidden"); $("#sessLabel").textContent=`${A.meta.title} · ${label}`;
  buildWork(); sessTick(true);
  clearInterval(sessInt); sessInt=setInterval(sessTick,1000);
  heartbeat(); renderFocusFriends();
}
function sessTick(first){
  if(!SESS) return;
  const now=Date.now(), dt=(now-SESS.lastTick)/1000; SESS.lastTick=now;
  const stale = document.hidden || (now-lastTouch>180000);
  if(SESS.state==="active" && stale){ setSessState("idle"); }
  if(SESS.state==="active" && !document.hidden){ SESS.verified+=dt; }
  const v=Math.floor(SESS.verified);
  $("#sessTimer").textContent=`${String(Math.floor(v/60)).padStart(2,"0")}:${String(v%60).padStart(2,"0")}`;
  $("#sessXP").textContent=`+${S.xp-SESS.xpStart} XP`;
  if(!first && Math.floor(now/15000)!==Math.floor((now-dt*1000)/15000)) heartbeat();
}
function setSessState(st){ if(!SESS) return; SESS.state=st; SESS.lastTick=Date.now();
  $("#sessState").textContent = st==="active"?"Session in progress":st==="paused"?"Paused":"Paused — idle, tap Resume to continue";
  $("#pauseBtn").textContent = st==="active"?"Pause":"Resume";
  heartbeat(); }
$("#pauseBtn").onclick=()=>{ if(!SESS) return; setSessState(SESS.state==="active"?"paused":"active"); };
$("#finishBtn").onclick=()=>finishSession(false);
function endSessionSilent(){ if(SESS){ clearInterval(sessInt); SESS=null; } }
function finishSession(interrupted){
  if(!SESS) return; clearInterval(sessInt);
  const mins=SESS.verified/60; let bonus=0;
  if(SESS.kind==="timer"){ bonus=Math.min(120,Math.floor(mins*2)); if(bonus>0) addXP(bonus); }
  const s={date:today(),course:SESS.course,label:SESS.label,kind:SESS.kind,mins:Math.round(mins*10)/10,
    attempted:SESS.attempted,correct:SESS.correct,xp:(S.xp-SESS.xpStart)+bonus,state:interrupted?"interrupted":"completed"};
  S.sessions.unshift(s); S.sessions=S.sessions.slice(0,30);
  const acc=s.attempted?Math.round(100*s.correct/s.attempted):null;
  if(!interrupted&&(s.attempted>0||mins>=5))
    feed(`completed a focus session — ${s.label} · ${Math.round(mins)} min${acc!==null?` · ${acc}% accuracy`:""} · +${s.xp} XP`,"session");
  store.save(LS_MAIN,S);
  const sum=$("#focusSummary"); sum.classList.remove("hidden"); $("#focusActive").classList.add("hidden");
  sum.innerHTML=`<div class="card center"><div class="card-h" style="justify-content:center">Session complete</div>
    <div style="font-size:2em;font-weight:800">+${s.xp} XP</div>
    <p class="muted">${Math.round(mins)} minutes focused${s.attempted?` · ${s.correct}/${s.attempted} correct${acc!==null?` (${acc}%)`:""}`:""}<br>Daily goal: ${goalPct()}% complete</p>
    <div class="row">${SESS.wrongs.length?`<button class="btn" id="revBtn">Review ${SESS.wrongs.length} mistakes</button>`:""}
    <button class="btn primary" id="backBtn">Return home</button></div></div>`;
  const rb=$("#revBtn"); if(rb) rb.onclick=()=>{ const w=SESS?[]:[]; startReview(); };
  const keepWrongs=[...SESS.wrongs];
  $("#backBtn").onclick=()=>{ sum.classList.add("hidden"); $("#focusLanding").classList.remove("hidden"); renderFocus(); };
  SESS.reviewWrongs=keepWrongs; SESS=null; heartbeat(); renderTop(); upload(); scheduleUpload();
  function startReview(){ if(!keepWrongs.length) return;
    prMode="quiz"; prKind="review"; prId="review"; reviewList=keepWrongs;
    order=reviewList.map((_,i)=>i); qi=0;
    sum.classList.add("hidden"); $("#focusActive").classList.remove("hidden");
    $("#sessLabel").textContent="Reviewing mistakes"; showQ(); }
}
function goalPct(){ const A=active(), g=A?.meta.dailyGoal||20;
  const d=(S.courses[S.activeCourse]?.days||{})[today()]||{answers:0};
  return Math.min(100,Math.round(100*d.answers/g)); }

/* ---------- practice items (deck / mock / review) ---------- */
let prMode="quiz", prKind="deck", prId=null, reviewList=[], order=[], qi=0, locked=false, tLeft=30, tInt=null;
function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }
function items(){ const A=active(); if(!A) return [];
  if(prKind==="mock"){ const m=A.quizzes.find(q=>q.id===prId); return m?m.questions.map(q=>({...q,deck:q.deck||A.decks[0]?.id,oi:q.oi??-1})):[]; }
  if(prKind==="review") return reviewList.map(w=>{ const d=deckById(S.activeCourse,w.deck);
    const c=d.cards[w.oi]; return {...c,deck:w.deck,oi:w.oi}; });
  const d=A.decks.find(x=>x.id===prId); return d?d.cards.map((c,i)=>({...c,deck:d.id,oi:i})):[]; }
function deckLabel(){ const A=active();
  if(prKind==="mock") return A.quizzes.find(q=>q.id===prId)?.title||"Mock";
  if(prKind==="review") return "Review mistakes";
  return A.decks.find(d=>d.id===prId)?.title||"Deck"; }
function showQ(){
  const list=items();
  if(!list.length){ $("#qText").textContent="Choose material in Focus to begin."; return; }
  if(prMode==="flash"&&prKind==="mock"){ prMode="quiz"; }
  if(prMode==="flash"){ $("#quizBox").classList.add("hidden"); $("#flashBox").classList.remove("hidden"); showFlash(); return; }
  $("#quizBox").classList.remove("hidden"); $("#flashBox").classList.add("hidden");
  locked=false; const c=list[order[qi]];
  $("#qText").textContent=c.q; $("#qCount").textContent=`Q ${qi+1}/${list.length}`;
  $("#explain").classList.add("hidden"); $("#nextBtn").classList.add("hidden");
  const ob=$("#opts"); ob.innerHTML="";
  shuffle(c.options.map((t,i)=>({t,i}))).forEach(({t,i})=>{ const b=document.createElement("button");
    b.className="opt"; b.textContent=t; b.onclick=()=>answer(i,b); ob.appendChild(b); });
  clearInterval(tInt); tLeft=30; $("#timer").textContent="0:30"; $("#timer").classList.remove("low");
  tInt=setInterval(()=>{ tLeft--; $("#timer").textContent="0:"+String(tLeft).padStart(2,"0");
    if(tLeft<=8)$("#timer").classList.add("low");
    if(tLeft<=0){clearInterval(tInt); answer(-1,null);} },1000);
}
function answer(i,btn){
  if(locked) return; locked=true; clearInterval(tInt);
  const list=items(), c=list[order[qi]], ok=(i===c.answer), secs=30-tLeft;
  document.querySelectorAll(".opt").forEach(b=>b.disabled=true);
  if(btn) btn.classList.add(ok?"correct":"wrong");
  if(!ok){ const real=[...document.querySelectorAll(".opt")].find(b=>b.textContent===c.options[c.answer]); if(real) real.classList.add("correct"); }
  const crit=ok&&Math.random()<.25, mult=1+Math.min(4,Math.floor(S.combo/3))*.5;
  const g=ok?Math.round((10+(S.combo>=3?5:0))*mult*(crit?2:1)):0;
  $("#explain").innerHTML=`<b>${ok?`+${g} XP${crit?" (crit)":""}${S.combo>=2?` (x${mult})`:""}`:"0 XP"}</b> • <b>${c.options[c.answer]}</b><br>${c.explain}`;
  $("#explain").classList.remove("hidden"); $("#nextBtn").classList.remove("hidden");
  beep(ok?720:220, ok?.09:.18);
  if(SESS){ SESS.attempted++; if(ok)SESS.correct++; else if(c.oi>=0)SESS.wrongs.push({deck:c.deck,oi:c.oi}); }
  logAns(c.deck, c.oi, ok, secs); if(g) setTimeout(()=>addXP(g),0);
  $("#nextBtn").onclick=()=>{ qi=(qi+1)%list.length; if(qi===0) order=shuffle(order); showQ(); };
}
function showFlash(){ const list=items(); if(!list.length) return; const c=list[order[qi]];
  $("#qCount").textContent=`Card ${qi+1}/${list.length}`;
  $("#flashFront").textContent=c.q; $("#flashBack").innerHTML=`<b>${c.options[c.answer]}</b><span class="muted">${c.explain}</span>`;
  $("#flashCard").classList.remove("flip"); }
function beginWork(kind,id){ prKind=kind; prId=id; order=shuffle(items().map((_,i)=>i)); qi=0; showQ(); }
/* flashCard/knew/miss are bound per session inside buildWork→rebindWork (elements only exist then) */

/* mobile nav must not depend on media queries alone (some webviews misreport them) */
function fitNav(){ try{ document.body.classList.toggle("mobile",(window.innerWidth||0)<=640); }catch{} }
window.addEventListener("resize",fitNav); window.addEventListener("orientationchange",()=>setTimeout(fitNav,300));
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./sw.js").catch(e=>{
      console.warn("offline shell unavailable",e);
    });
  });
}
/* ---------- tabs ---------- */
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); t.classList.add("active");
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  $("#tab-"+t.dataset.tab).classList.add("active");
  if(t.dataset.tab==="social"){ localStorage.setItem(LS_SEEN,Date.now()); $("#socDot").classList.add("hidden"); renderSocial(); }
  if(t.dataset.tab==="profile") renderProfile();
  if(t.dataset.tab==="paths") renderPaths();
  if(t.dataset.tab==="home") renderHome();
  if(t.dataset.tab==="focus") renderFocus();
});
document.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>document.querySelector(`[data-tab="${b.dataset.goto}"]`).click());

/* ---------- HOME ---------- */
function allDays(){ return S.courses[S.activeCourse]?.days||{}; }
function renderTop(){ $("#xpTop").textContent=(allDays()[today()]||{xp:0}).xp||0;
  $("#streakTop").textContent=S.streak; }
function renderHome(){
  const A=active(); if(!A) return;
  const now=new Date();
  $("#todayDate").textContent=now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  $("#greet").textContent=(now.getHours()<12?"Good morning.":now.getHours()<17?"Good afternoon.":"Good evening.");
  const d=allDays()[today()]||{answers:0,secs:0,xp:0};
  $("#focusToday").textContent=Math.round((d.secs||0)/60)+"m";
  $("#xpToday").textContent=d.xp||0; $("#levelHome").textContent=lvl(S.xp);
  const goal=A.meta.dailyGoal||20;
  $("#goalDone").textContent=Math.min(goal,d.answers); $("#goalTotal").textContent=goal;
  $("#goalFill").style.width=Math.min(100,100*d.answers/goal)+"%";
  $("#streakHome").textContent=S.streak;
  const hp=$("#homePaths"); hp.innerHTML="";
  S.enrolled.filter(id=>COURSES[id]).slice(0,4).forEach(cid=>{
    const M=COURSES[cid], st=S.courses[cid]||{decks:{}};
    const ds=M.decks; const m=ds.length?Math.round(ds.reduce((s,x)=>s+mastery(cid,x.id),0)/ds.length):0;
    const el=document.createElement("div"); el.className="card path";
    el.innerHTML=`<h3>${M.meta.title}</h3><p class="muted">${M.meta.tagline||""}</p>
      <div class="track"><span>Mastery</span><span class="pct">${m}%</span></div><div class="mbar"><i style="width:${m}%"></i></div>`;
    el.onclick=()=>{ S.activeCourse=cid; store.save(LS_MAIN,S); renderAll();
      document.querySelector('[data-tab="paths"]').click(); };
    hp.appendChild(el); });
  renderStrip(); renderHomeFeed();
}
function presenceState(p, uid){ // {cls,label,detail} — online vs focus vs offline
  const alive = p&&p.alive?Date.now()-p.alive:Infinity;
  if(p&&p.session){
    const s=p.session;
    if(s.state==="active") return {cls:"on",label:"Studying",detail:`${s.label} · ${Math.floor((Date.now()-s.startedAt)/60000)}m`};
    if(s.state==="paused"||s.state==="idle") return {cls:"recent",label:"Paused",detail:s.label};
  }
  if(alive<90000) return {cls:"online",label:"Online",detail:"around"};
  return {cls:"",label:"Offline",detail:""};
}
function renderStrip(){
  const w=$("#friendStrip"); w.innerHTML=""; let activeN=0;
  const me={name:S.name||"You",self:true};
  const cards=[...mateList().filter(p=>p.settings?.showActivity!==false).slice(0,8),me];
  cards.forEach(p=>{
    let ps, nm;
    if(p.self){ nm=(S.name||"You")+" (you)";
      ps=SESS?presenceState({state:SESS.state,label:SESS.label,startedAt:SESS.startedAt}):{cls:"online",label:"Online",detail:"browsing"};
    } else { nm=p.name||"?"; ps=presenceState(p.presence); }
    if(ps.cls==="on"&&!p.self) activeN++;
    const pic=(p.self?S.photo:p.photo);
    const av=pic?`<img src="${pic}" alt="" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin:0 auto 4px;display:block">`
      :`<div class="av2">${esc((nm||"?")[0].toUpperCase())}</div>`;
    const el=document.createElement("div"); el.className="friend "+ps.cls;
    el.innerHTML=`${av}<b>${esc(nm)}</b><small>${ps.label}${ps.detail?" · "+esc(ps.detail):""}</small>`;
    w.appendChild(el); });
  const extra=mateList().length-8;
  $("#activeCount").textContent = mateList().length?`${activeN+(SESS?1:0)} studying right now${extra>0?` · +${extra} more in Social`:""}`
    :"Connect others in Profile → Connection to study together.";
}
function renderHomeFeed(){ const el=$("#homeFeed"); if(!el) return;
  el.innerHTML=feedCache.slice(0,3).map(x=>feedHTML(x,applauseMap[x.k])).join("")||`<p class="muted">No activity yet.</p>`;
  bindApplause(el); }

/* ---------- PATHS ---------- */
let pathFilter="all";
document.querySelectorAll("#pathFilter .seg-btn").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("#pathFilter .seg-btn").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); pathFilter=b.dataset.f; renderPaths(); });
function pathStats(cid){ const M=COURSES[cid], st=S.courses[cid]||{decks:{},seen:{}};
  const ms=M.decks.map(x=>mastery(cid,x.id)), cs=M.decks.map(x=>completion(cid,x.id));
  const totCards=M.decks.reduce((s,x)=>s+x.cards.length,0);
  const seenCards=M.decks.reduce((s,x)=>s+Object.keys((st.seen||{})[`${cid}:${x.id}`]||{}).length,0);
  return { mastery:ms.length?Math.round(ms.reduce((a,b)=>a+b,0)/ms.length):0,
    completion:totCards?Math.round(100*seenCards/totCards):0,
    mins:Math.round(Object.values(st.days||{}).reduce((s,d)=>s+(d.secs||0),0)/60),
    sess:S.sessions.filter(s=>s.course===cid).length }; }
function renderPaths(){
  const w=$("#pathList"); w.innerHTML=""; $("#pathDetail").classList.add("hidden"); $("#pathDetail").innerHTML="";
  Object.entries(COURSES).forEach(([cid,M])=>{
    const st=pathStats(cid), done=st.completion>=100;
    if(pathFilter==="active"&&(done||!S.enrolled.includes(cid))) return;
    if(pathFilter==="done"&&!done) return;
    const el=document.createElement("div"); el.className="card path"+(cid===S.activeCourse?" active":"");
    el.innerHTML=`<h3>${M.meta.title}</h3><p class="muted">${M.meta.tagline||""}</p>
      <div class="track"><span>Mastery</span><span class="pct">${st.mastery}%</span></div><div class="mbar"><i style="width:${st.mastery}%"></i></div>
      <div class="track"><span>Completion</span><span class="pct">${st.completion}%</span></div><div class="mbar done"><i style="width:${st.completion}%"></i></div>
      <p class="muted tiny">Current focus: ${currentFocus(cid)} · ${st.sess} sessions · ${st.mins}m</p>
      <div class="row"><button class="btn ${cid===S.activeCourse?"":"primary"}" data-a="go">${cid===S.activeCourse?"Open path":"Study this path"}</button></div>`;
    el.querySelector("[data-a=go]").onclick=e=>{ e.stopPropagation();
      S.activeCourse=cid; if(!S.enrolled.includes(cid))S.enrolled.push(cid);
      store.save(LS_MAIN,S); renderAll(); openPath(cid); };
    el.onclick=()=>openPath(cid); w.appendChild(el); });
}
function currentFocus(cid){ const c=S.courses[cid]; const last=c?.lastDeck;
  if(last){ const d=deckById(cid,last); if(d) return d.title; }
  let worst=null,wm=101; (COURSES[cid]?.decks||[]).forEach(d=>{ const m=mastery(cid,d.id);
    const n=(c?.decks[`${cid}:${d.id}`]||{total:0}).total; if(n>0&&m<wm){wm=m;worst=d.title;} });
  return worst||"Getting started"; }
function openPath(cid){
  const M=COURSES[cid], st=pathStats(cid), d=$("#pathDetail"); d.classList.remove("hidden");
  const deckRows=M.decks.map(x=>{ const m=mastery(cid,x.id), c=completion(cid,x.id);
    return `<div class="track"><span><b>${x.title}</b> <span class="muted">• ${x.cards.length} cards</span></span><span>Mastery ${m}% · Done ${c}%</span></div>
    <div class="mbar"><i style="width:${m}%"></i></div>`; }).join("");
  const acc=accuracy(cid);
  d.innerHTML=`<div class="card"><div class="card-h">${M.meta.title}<span class="muted">${M.meta.exam?.label||""}</span></div>
    <div class="sect">Overview</div>
    <p class="muted">${M.meta.tagline||""} · ${st.sess} sessions · ${st.mins} minutes · accuracy ${acc}%</p>
    <div class="sect">Curriculum</div>${deckRows}
    <div class="row"><button class="btn primary" id="pdGo">Continue path</button></div>
    <div class="sect">Guides</div><div class="row wrap" id="pdGuides"></div><div id="pdGuideBody"></div>
    <div class="sect">Insights</div><div id="pdInsights"></div>
    <div class="sect">Plan</div><div class="md">${md(M.plan)}</div>
    <div class="sect">Resources</div><div class="md">${md(M.resources)}</div>
    <div class="sect">Videos</div><div class="row wrap" id="pdVids"></div>
    <div class="video-frame"><iframe id="pdFrame" class="hidden" src="" title="Course videos" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>
    <div class="sect">Community videos</div>
    <div class="row"><input id="pdCvLabel" placeholder="Title (optional)" maxlength="80" style="max-width:38%"><input id="pdCvLink" placeholder="Paste YouTube link to share…" inputmode="url"></div>
    <div class="row"><button class="btn" id="pdCvAdd">Share with the room</button></div>
    <div id="pdCommunity" data-cid="${cid}"></div>
    </div>`;
  const ins=$("#pdInsights");
  const weak=M.decks.map(x=>({x,m:mastery(cid,x.id),n:((S.courses[cid]?.decks||{})[`${cid}:${x.id}`]||{total:0}).total}))
    .filter(x=>x.n>0).sort((a,b)=>a.m-b.m);
  ins.innerHTML=weak.length?`<p>Strongest: <b>${[...weak].sort((a,b)=>b.m-a.m)[0].x.title}</b> · Needs work: <b>${weak[0].x.title}</b> (${weak[0].m}%). Accuracy overall ${acc}%.</p>`:`<p class="muted">Practise to unlock insights.</p>`;
  const vw=$("#pdVids"); (M.videos||[]).forEach((v,i)=>{
    if(v.videoId){
      const b=document.createElement("button");
      b.className="btn"; b.textContent=v.label;
      b.onclick=()=>{ const frame=$("#pdFrame"); frame.src=`https://www.youtube.com/embed/${v.videoId}`; frame.classList.remove("hidden"); };
      vw.appendChild(b);
      if(i===0) b.onclick();
      return;
    }
    if(v.query){
      const b=document.createElement("a");
      b.className="btn"; b.textContent=`Search ${v.label}`;
      b.href=`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`;
      b.target="_blank"; b.rel="noopener";
      vw.appendChild(b);
    }
  });
  const gw=$("#pdGuides");
  if(gw){ (M.guides||[]).forEach((g,i)=>{ const b=document.createElement("button");
    b.className="btn"; b.textContent=g.title;
    b.onclick=()=>{ $("#pdGuideBody").innerHTML=`<div class="card"><div class="card-h">${esc(g.title)}</div><div class="md">${md(g.body)}</div></div>`; };
    gw.appendChild(b);
    if(i===0) b.onclick(); }); }
  renderCvideos();
  const sv=document.createElement("div"); sv.innerHTML=`<div class="row" style="margin-top:8px"><input id="pdYt" placeholder="Save a YouTube link or ID…" inputmode="url"><button class="btn" id="pdYtAdd" style="flex:none">Save</button></div><div class="row wrap" id="pdMine"></div>`;
  vw.after(sv);
  const renderMine=()=>{ const m=$("#pdMine"); m.innerHTML="";
    (S.myVids[cid]||[]).forEach(id=>{ const b=document.createElement("button"); b.className="btn"; b.textContent="Play "+id;
      b.onclick=()=>{ const frame=$("#pdFrame"); frame.src="https://www.youtube.com/embed/"+id; frame.classList.remove("hidden"); }; m.appendChild(b); }); };
  const ytId=s=>{ s=(s||"").trim(); const mt=s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    if(mt) return mt[1]; return /^[A-Za-z0-9_-]{11}$/.test(s)?s:null; };
  $("#pdYtAdd").onclick=()=>{ const v=$("#pdYt").value, id=ytId(v);
    if(id){ const l=S.myVids[cid]=S.myVids[cid]||[]; l.unshift(id); S.myVids[cid]=l.slice(0,12);
      store.save(LS_MAIN,S); const frame=$("#pdFrame"); frame.src="https://www.youtube.com/embed/"+id; frame.classList.remove("hidden"); $("#pdYt").value=""; renderMine(); scheduleUpload(); }
    else if(v.trim()){
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(v.trim())}`,"_blank","noopener");
    } };
  renderMine();
  try{ d.scrollIntoView({behavior:"smooth",block:"start"}); }catch{}
  $("#pdGo").onclick=()=>{ S.activeCourse=cid; store.save(LS_MAIN,S); renderAll();
    document.querySelector('[data-tab="focus"]').click(); };
}
function accuracy(cid){ const ds=Object.values((S.courses[cid]||{days:{}}).days);
  const a=ds.reduce((s,d)=>s+(d.answers||0),0), c=ds.reduce((s,d)=>s+(d.correct||0),0);
  return a?Math.round(100*c/a):0; }

/* ---------- FOCUS ---------- */
function renderFocus(){
  const A=active(); if(!A) return;
  const last=CC().lastDeck, ld=last&&A.decks.find(x=>x.id===last);
  $("#resumeTxt").textContent=ld?`${A.meta.title} • ${ld.title} • ${mastery(S.activeCourse,ld.id)}% mastery`:"Pick material below to start your first session.";
  if(SESS){ $("#focusLanding").classList.add("hidden"); $("#focusActive").classList.remove("hidden"); }
}
$("#resumeBtn").onclick=()=>{ const A=active(), last=CC().lastDeck;
  const id=last&&A.decks.find(x=>x.id===last)?last:A.decks[0]?.id; if(!id) return;
  prMode="quiz"; startSession("deck",id,A.decks.find(x=>x.id===id).title); beginWork("deck",id); };
document.querySelectorAll("#focusActs .btn").forEach(b=>b.onclick=()=>{
  const kind=b.dataset.start, A=active();
  if(kind==="timer"){ startSession("timer","timer","Timed focus"); buildTimerWork(); return; }
  const pk=$("#focusPick"); pk.classList.remove("hidden"); const r=$("#focusPickRow"); r.innerHTML="";
  const list=kind==="mock"?A.quizzes.map(q=>({id:q.id,t:q.title})) : A.decks.map(d=>({id:d.id,t:d.title}));
  if(!list.length){ r.innerHTML=`<p class="muted">Nothing here yet.</p>`; return; }
  list.forEach(x=>{ const btn=document.createElement("button"); btn.className="btn"; btn.style.flex="1 1 40%"; btn.textContent=x.t;
    btn.onclick=()=>{ prMode = kind==="flash"?"flash":"quiz";
      const label=kind==="mock"?A.quizzes.find(q=>q.id===x.id).title:A.decks.find(d=>d.id===x.id).title;
      startSession(kind,x.id,label); beginWork(kind,x.id); };
    r.appendChild(btn); });
});
function buildWork(){ $("#sessWork").innerHTML=`
  <div class="combo-row"><span id="combo" class="muted">Streak x1</span>
  <span id="qCount" class="muted"></span><span id="timer" class="timer">0:30</span></div>
  <div id="quizBox"><div id="qText" class="q-text"></div><div id="opts" class="opts"></div>
  <div id="explain" class="explain hidden"></div><button id="nextBtn" class="btn primary hidden">Next</button></div>
  <div id="flashBox" class="hidden"><div id="flashCard" class="flash"><div class="flash-inner">
  <div class="flash-face" id="flashFront"></div><div class="flash-face back" id="flashBack"></div></div></div>
  <p class="muted center">Tap card to flip, then mark honestly.</p>
  <div class="row"><button id="knewBtn" class="btn">Knew it</button><button id="missBtn" class="btn">Missed it</button></div></div>`;
  rebindWork();
  if(prMode==="flash"){ $("#quizBox").classList.add("hidden"); $("#flashBox").classList.remove("hidden"); }
}
function rebindWork(){
  $("#flashCard").onclick=()=>$("#flashCard").classList.toggle("flip");
  $("#knewBtn").onclick=()=>{ const c=items()[order[qi]]; logAns(c.deck,c.oi,true,8); addXP(6);
    if(SESS){SESS.attempted++;SESS.correct++;} qi=(qi+1)%items().length; showFlash(); refreshCombo(); };
  $("#missBtn").onclick=()=>{ const c=items()[order[qi]]; logAns(c.deck,c.oi,false,8);
    if(SESS){SESS.attempted++; if(c.oi>=0)SESS.wrongs.push({deck:c.deck,oi:c.oi});} qi=(qi+1)%items().length; showFlash(); refreshCombo(); };
}
function refreshCombo(){ const el=$("#combo"); if(el) el.textContent="Streak x"+(1+Math.min(4,Math.floor(S.combo/3))*.5); }
function buildTimerWork(){ $("#sessWork").innerHTML=`<p class="center muted">Stay with the material. The timer counts verified focus time — pausing when you switch away or go idle.</p>`; }
function renderFocusFriends(){
  const el=$("#sessFriends"); if(!el) return;
  const live=mateList().filter(p=>p.presence?.session?.state==="active"&&p.settings?.showActivity!==false);
  el.innerHTML=live.length?live.map(p=>`<b>${esc(p.name||"?")}</b> — ${esc(p.presence.session.label||"focusing")}`).join("<br>"):"No one else is in session.";
}

/* ---------- SOCIAL ---------- */
let socTab="activity", boardMode="week";
document.querySelectorAll("#socSeg .seg-btn").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("#socSeg .seg-btn").forEach(x=>x.classList.remove("active")); b.classList.add("active");
  socTab=b.dataset.s; renderSocial(); });
document.querySelectorAll("#boardSeg .seg-btn").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("#boardSeg .seg-btn").forEach(x=>x.classList.remove("active")); b.classList.add("active");
  boardMode=b.dataset.b; renderBoard(); });
function renderSocial(){
  ["activity","friends","board","chlg"].forEach(t=>$("#soc-"+t).classList.toggle("hidden",t!==socTab));
  if(socTab==="activity") renderFeed();
  if(socTab==="friends") renderFriends();
  if(socTab==="board") renderBoard();
  if(socTab==="chlg") renderChallenges();
}
function rangeDays(n){ const out=[]; for(let i=n-1;i>=0;i--) out.push(dayKey(i)); return out; }
function userStats(u){ // u: {courses} snapshot or local
  const days7=rangeDays(7), days1=[dayKey(0)];
  const sum=ds=>{ let a=0,x=0,s=0; ds.forEach(dt=>Object.values(u||{}).forEach(c=>{ const d=(c.days||{})[dt];
    if(d){a+=d.answers||0;x+=(d.xp||(d.answers||0)*12);s+=d.secs||0;} })); return {a,x,s}; };
  const courses=u||{};
  return { day:sum(days1), week:sum(days7),
    activeDays:days7.filter(dt=>Object.values(courses).some(c=>((c.days||{})[dt]||{answers:0}).answers>0)).length }; }
function renderFriends(){
  const w=$("#friendList"); w.innerHTML="";
  const selfCard={name:S.name||"You",courses:S.courses,xp:S.xp,streak:S.streak,
    presence:{alive:Date.now(),session:SESS?{state:SESS.state,label:SESS.label,startedAt:SESS.startedAt}:null},
    settings:S.settings,you:true};
  [{...selfCard},...mateList()].forEach(p=>{
    const you=!!p.you;
    const el=document.createElement("div"); el.className="card";
    const st=userStats(p.courses||{});
    const showA=you?true:(p.settings?.showActivity!==false);
    const ps=showA?presenceState(p.presence):{cls:"",label:"Private",detail:""};
      el.innerHTML=`<div class="card-h">${esc(p.name||(you?"You":"?"))}<span class="muted">Lv ${lvl(p.xp||0)}</span></div>
        <p class="muted">${ps.label}${ps.detail?" · "+esc(ps.detail):""} • streak ${p.streak||0}</p>
        <p class="tiny muted">Today ${todayMin(p.courses||{})}m · this week ${Math.round(st.week.s/60)}m · ${st.week.a} answers</p>
        ${!you&&p.settings?.showPaths===true?`<p class="tiny muted">Paths: ${esc(Object.keys(p.courses||{}).join(", "))}</p>`:""}`;
    w.appendChild(el); });
  if(!mateList().length){ const el=document.createElement("div"); el.className="card";
    el.innerHTML=`<b>No one else here yet</b><p class="muted">Share your room code (Profile → Connection).</p>`; w.appendChild(el); }
}
function rankDelta(u,mode){ // +n up, -n down (vs previous equal period)
  const xpIn=ds=>ds.reduce((s,dt)=>s+Object.values(u||{}).reduce((t,c)=>t+(((c.days||{})[dt]||{}).xp??((c.days||{})[dt]||{answers:0}).answers*12),0),0);
  const minIn=ds=>Math.round(ds.reduce((s,dt)=>s+Object.values(u||{}).reduce((t,c)=>t+(((c.days||{})[dt]||{secs:0}).secs||0),0),0)/60);
  if(mode==="day") return Math.round(xpIn([dayKey(0)])-xpIn([dayKey(1)]));
  if(mode==="focus"){ const cur=rangeDays(7), prev=[]; for(let i=7;i<14;i++) prev.push(dayKey(i)); return minIn(cur)-minIn(prev); }
  const cur=rangeDays(7), prev=[]; for(let i=7;i<14;i++) prev.push(dayKey(i));
  return Math.round(xpIn(cur)-xpIn(prev)); }
function weekMinutes(u){ return Math.round(rangeDays(7).reduce((s,dt)=>s+Object.values(u||{}).reduce((t,c)=>t+(((c.days||{})[dt]||{secs:0}).secs||0),0),0)/60); }
function todayMin(u){ const dt=dayKey(0); return Math.round(Object.values(u||{}).reduce((s,c)=>s+(((c.days||{})[dt]||{secs:0}).secs||0),0)/60); }
function renderBoard(){
  const rows=[{n:S.name||"You",u:S.courses,you:true},
    ...mateList().map(p=>({n:p.name||"?",u:p.courses||{},you:false,uid:p.uid}))];
  let scored, unit;
  if(boardMode==="consist") scored=rows.map(r=>({...r,v:userStats(r.u).activeDays,unit:"d"}));
  else if(boardMode==="focus") scored=rows.map(r=>({...r,v:weekMinutes(r.u),unit:"min"}));
  else{ const days=boardMode==="day"?[dayKey(0)]:rangeDays(7);
    scored=rows.map(r=>{ const v=days.reduce((s,dt)=>s+Object.values(r.u||{}).reduce((t,c)=>t+(((c.days||{})[dt]||{}).xp??((c.days||{})[dt]||{answers:0}).answers*12),0),0);
      return {...r,v:Math.round(v),unit:"XP"}; }); }
  scored.sort((a,b)=>b.v-a.v);
  const daysLeft=7-new Date().getDay();
  const sub=boardMode==="week"?daysLeft+" day(s) remaining":boardMode==="day"?"Resets midnight":boardMode==="focus"?"Verified focus minutes, this week":"Active days, this week";
  $("#boardBody").innerHTML=`<div class="card">${scored.map((r,i)=>{
    const d=r.you?0:rankDelta(r.u,boardMode);
    const dc=r.you?"":(d>0?` <span class="delta up">+${d}</span>`:d<0?` <span class="delta dn">${d}</span>`:` <span class="delta">—</span>`);
    return `<div class="board-row"><span class="rk">${i+1}</span><span class="who">${esc(r.n)}${r.you?" (you)":""}</span><span class="sc">${r.v} ${r.unit}</span>${dc}</div>`; }).join("")}
    <p class="muted tiny">${sub} • ${scored.length>1?(scored[0].you?"You lead — hold it.":`You're ${scored[0].v-scored[1].v} behind ${esc(scored[0].n)}. One session flips it.`):"Connect others to compete."}</p></div>`;
}
/* challenges */
function challenges(){ return store.load("kaizen_chlg")||[]; }
function saveChallenges(c){ localStorage.setItem("kaizen_chlg",JSON.stringify(c)); }
function weekAns(u){ return rangeDays(7).reduce((s,dt)=>s+Object.values(u||{}).reduce((t,c)=>t+(((c.days||{})[dt]||{answers:0}).answers||0),0),0); }
function weekMin(u){ return Math.round(rangeDays(7).reduce((s,dt)=>s+Object.values(u||{}).reduce((t,c)=>t+(((c.days||{})[dt]||{secs:0}).secs||0),0),0)/60); }
$("#chCreate").onclick=()=>{ const type=$("#chType").value, target=Math.max(10,+$("#chTarget").value||100);
  const d=new Date(); d.setDate(d.getDate()+(7-d.getDay())%7); d.setHours(23,59,59,0);
  const titles={questions:`Most questions — week of ${dayKey(0)}`,minutes:`Most focus minutes — week of ${dayKey(0)}`,team:`Team ${target} questions`};
  const list=challenges(); const ch={id:"c"+Date.now(),title:titles[type],type,target,endsAt:d.getTime(),by:S.name||"You"};
  list.unshift(ch); saveChallenges(list);
  try{ DB&&DUO.on&&DB.ref(`rooms/${DUO.room}/challenges/${ch.id}`).set(ch); }catch{}
  feed(`started a challenge: ${ch.title} (target ${target})`,"challenge");
  renderChallenges(); };
function contrib(u,type){ return type==="minutes"?weekMin(u):weekAns(u); }
function renderChallenges(){
  const w=$("#chList"); const list=challenges()
    .concat(((peerChallenges||[]).filter(p=>!challenges().some(l=>l.id===p.id))));
  w.innerHTML=list.length?"":`<p class="muted">No challenges yet — start one above.</p>`;
  const everyone=[{n:S.name||"You",u:S.courses},...mateList().map(p=>({n:p.name||"?",u:p.courses||{}}))];
  list.slice(0,5).forEach(ch=>{
    const vals=everyone.map(e=>({n:e.n,v:contrib(e.u,ch.type)}));
    const team=ch.type==="team", tot=vals.reduce((s,x)=>s+x.v,0), pct=team?Math.min(100,Math.round(100*tot/ch.target)):100;
    const el=document.createElement("div"); el.className="card";
    el.innerHTML=`<div class="card-h">${esc(ch.title)}<span class="muted">ends ${new Date(ch.endsAt).toLocaleDateString()}</span></div>
      ${team?`<div class="mbar"><i style="width:${pct}%"></i></div><p class="muted">${tot}/${ch.target} (${pct}%)</p>`:""}
      ${vals.map(x=>`<div class="track"><span>${esc(x.n)}</span><span>${x.v}</span></div>`).join("")}
      ${team?"":(()=>{ const mx=Math.max(...vals.map(x=>x.v));
        const lead=vals.filter(x=>x.v===mx).map(x=>x.n);
        const youLead=lead.includes(S.name||"You")&&lead.length===1;
        return `<p class="muted tiny">${mx===0?"No scores yet — first session takes the lead.":youLead?"You lead — hold it.":lead.join(", ")+" lead"+(lead.length>1?" (tied)":"")+" with "+mx+". Go close it."}</p>`; })()}`;
    w.appendChild(el); });
}
/* feed + applause + community videos */
let feedCache=[], applauseMap={}, peerChallenges=[], cvCache={};
function cvScore(v){ const vs=Object.values(v.votes||{}).reduce((s,x)=>s+x,0); return Math.max(0,vs); }
function cvMyVote(v){ return DUO.uid&&v.votes? (v.votes[DUO.uid]||0):0; }
function renderCvideos(){ const box=$("#pdCommunity"); if(!box) return;
  const cid=box.dataset.cid, list=Object.entries(cvCache[cid]||{}).map(([id,v])=>({id,...v}));
  list.sort((a,b)=>cvScore(b)-cvScore(a));
  const items=list.map(v=>{
    const mine=cvMyVote(v);
    const thumb=v.vid?`<img src="https://i.ytimg.com/vi/${v.vid}/mqdefault.jpg" data-play="${v.vid}" alt="">`:`<img data-q="${esc(v.query||"")}" alt="" style="display:flex;align-items:center;justify-content:center;color:var(--mut);font-size:.7em" src="data:,">`;
    return `<div class="cv">${thumb}<div class="meta"><b>${esc(v.label||"Untitled")}</b><small>from ${esc(v.by||"?")} · ${new Date(v.createdAt||Date.now()).toLocaleDateString()}</small></div>
    <div class="vote"><button data-v="1" data-id="${v.id}" class="${mine===1?"on":""}">▲</button><b>${cvScore(v)}</b><button data-v="-1" data-id="${v.id}" class="${mine===-1?"on":""}">▼</button></div></div>`; }).join("");
  box.innerHTML=(DB&&DUO.on?"":`<p class="muted tiny">Connect (Profile) to see community videos.</p>`)
    + (items||`<p class="muted tiny">No community videos yet — add the first.</p>`);
  box.querySelectorAll("[data-play]").forEach(im=>im.onclick=()=>{
    const frame=$("#pdFrame"); frame.src="https://www.youtube.com/embed/"+im.dataset.play; frame.classList.remove("hidden");
  });
  box.querySelectorAll("[data-q]").forEach(im=>im.onclick=()=>{
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(im.dataset.q)}`,"_blank","noopener");
  });
  box.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>voteVideo(cid,b.dataset.id,+b.dataset.v));
  const add=$("#pdCvAdd"); if(add) add.onclick=addCommunityVideo; }
function ytParse(s){ s=(s||"").trim(); const m=s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if(m) return {vid:m[1]}; if(/^[A-Za-z0-9_-]{11}$/.test(s)) return {vid:s}; return null; }
function addCommunityVideo(){ const box=$("#pdCommunity"); if(!box) return;
  if(!DB||!DUO.on){ alert("Connect first (Profile → Connection)."); return; }
  const cid=box.dataset.cid, link=$("#pdCvLink").value, label=($("#pdCvLabel").value||"").trim().slice(0,80)||"Shared video";
  const p=ytParse(link);
  if(!p){ alert("Paste a valid YouTube link or 11-character ID."); return; }
  DB.ref(`rooms/${DUO.room}/cvideos/${cid}`).push({vid:p.vid,label,by:S.name||"?",uid:DUO.uid,createdAt:Date.now(),votes:{}});
  $("#pdCvLink").value=""; $("#pdCvLabel").value=""; }
function voteVideo(cid,vidId,val){
  if(!DB||!DUO.on){ alert("Connect first (Profile → Connection)."); return; }
  const ref=DB.ref(`rooms/${DUO.room}/cvideos/${cid}/${vidId}/votes/${DUO.uid}`);
  ref.transaction(cur=>{ if(cur===val) return null; return val; }); }
function feedHTML(x,ap){ const n=ap||{};
  const cheered=n.mine?"Cheered ✓":"Cheer";
  return `<div class="feed-it"><b>${esc(x.name)}</b> ${esc(x.text)}<small>${new Date(x.t).toLocaleString()}</small>
  <div class="acts"><button class="applaud${n.mine?" did":""}" data-k="${x.k}">${cheered}${n.c?` · ${n.c}`:""}</button></div></div>`; }
function bindApplause(root){ root.querySelectorAll(".applaud").forEach(b=>b.onclick=()=>{
  const k=b.dataset.k;
  if(!DB||!DUO.on){ b.textContent="Join room to cheer"; setTimeout(()=>renderSocial(),1500); return; }
  const mine=applauseMap[k]&&applauseMap[k].mine;
  try{
    if(mine){ DB.ref(`rooms/${DUO.room}/applause/${k}/${DUO.uid}`).remove(); }
    else{
      DB.ref(`rooms/${DUO.room}/applause/${k}/${DUO.uid}`).set(S.name||"You");
      const item=feedCache.find(x=>x.k===k), owner=item?item.name:"";
      if(owner&&owner!==(S.name||"")) feed(`${S.name||"Someone"} cheered ${owner}'s update`,"cheer");
      b.textContent="Sent ✓";
    }
    markPush();
  }catch(e){ syncErr(e); } }); }
function renderFeed(v){ if(v!==undefined) feedCache=Object.entries(v).map(([k,x])=>({...x,k})).sort((a,b)=>b.t-a.t);
  const el=$("#feed"); if(!el) return;
  el.innerHTML=feedCache.slice(0,15).map(x=>feedHTML(x,applauseMap[x.k])).join("")||`<p class="muted">No activity yet.</p>`;
  bindApplause(el); renderHomeFeed();
  const seen=+((localStorage.getItem(LS_SEEN))||0);
  const fresh=feedCache.filter(x=>x.t>seen&&x.uid!==DUO.uid).length;
  const dot=$("#socDot"); const socActive=document.querySelector('[data-tab="social"]').classList.contains("active");
  if(fresh&&!socActive){ dot.textContent=fresh; dot.classList.remove("hidden"); }
  else dot.classList.add("hidden"); }

/* ---------- PROFILE ---------- */
function renderProfile(){
  $("#avatar").textContent=(S.name||"K")[0].toUpperCase();
  $("#profName").textContent=S.name||"You";
  $("#profSub").textContent=`Level ${lvl(S.xp)} · ${S.xp} XP · ${S.streak}-day streak`;
  const allD=Object.values(S.courses).flatMap(c=>Object.values(c.days||{}));
  const secs=allD.reduce((s,d)=>s+(d.secs||0),0);
  $("#meTime").textContent=Math.round(secs/60)+"m";
  $("#meSess").textContent=S.sessions.length;
  const a=allD.reduce((s,d)=>s+(d.answers||0),0), c=allD.reduce((s,d)=>s+(d.correct||0),0);
  $("#meAcc").textContent=a?Math.round(100*c/a)+"%":"–";
  $("#meStreak").textContent=S.best;
  const cb=$("#courseBars"); if(cb){ cb.innerHTML="";
    (active()?.decks||[]).forEach(d=>{ const m=mastery(S.activeCourse,d.id);
      const n=(CC().decks[ckey(d.id)]||{total:0}).total;
      const el=document.createElement("div"); el.className="course";
      el.innerHTML=`<div class="top"><span><b>${d.title}</b> <span class="muted">• ${n} attempts</span></span><span>${m}%</span></div><div class="bar"><i style="width:${m}%"></i></div>`;
      cb.appendChild(el); }); }
  const wd=$("#weekDots"); wd.innerHTML="";
  for(let i=6;i>=0;i--){ const hit=rangeDays(1).length&&Object.values(S.courses).some(cc=>((cc.days||{})[dayKey(i)]||{answers:0}).answers>0);
    const el=document.createElement("div"); el.className="sday"+(hit?" hit":"")+(i===0?" today":"");
    el.innerHTML=`<div class="dot">✓</div><span>${"SMTWTFS"[new Date(dayKey(i)+"T12:00").getDay()]}</span>`; wd.appendChild(el); }
  const dayData=rangeDays(7).map(dt=>{
    let mins=0, answers=0;
    Object.values(S.courses).forEach(cc=>{ const d=(cc.days||{})[dt]; if(d){ mins+=(d.secs||0)/60; answers+=d.answers||0; } });
    const date=new Date(dt+"T12:00");
    return {dt, mins, answers, label:date.toLocaleDateString(undefined,{weekday:"short"}).slice(0,2)};
  });
  const renderChart=(id, values, suffix, noteId, note)=>{
    const el=$(id); if(!el) return;
    el.innerHTML="";
    const mx=Math.max(1,...values);
    dayData.forEach((d,i)=>{
      const col=document.createElement("div"); col.className="hcol"+(i===dayData.length-1?" today":"");
      const value=Math.round(values[i]);
      col.innerHTML=`<b>${value}${suffix}</b><div class="hbar" style="height:${Math.max(6,8+112*values[i]/mx)}px"></div><span>${d.label}</span>`;
      el.appendChild(col);
    });
    const n=$(noteId); if(n) n.textContent=note;
  };
  const mins=dayData.map(d=>d.mins), answers=dayData.map(d=>d.answers);
  const totalMins=Math.round(mins.reduce((a,b)=>a+b,0)), totalAnswers=answers.reduce((a,b)=>a+b,0);
  renderChart("#hourChart",mins,"m","#timeChartNote",`${totalMins}m total · ${Math.round(totalMins/7)}m daily average`);
  renderChart("#answerChart",answers,"","#answerChartNote",`${totalAnswers} total · ${Math.max(...answers)} on your best day`);
  const pp=$("#profPaths"); pp.innerHTML="";
  S.enrolled.filter(id=>COURSES[id]).forEach(cid=>{ const st=pathStats(cid);
    const el=document.createElement("div"); el.className="course";
    el.innerHTML=`<div class="top"><span><b>${COURSES[cid].meta.title}</b></span><span>${st.mastery}% mastery · ${st.completion}% done</span></div><div class="bar"><i style="width:${st.mastery}%"></i></div>`;
    pp.appendChild(el); });
  const bg=$("#badgeGrid"); bg.innerHTML="";
  BADGES.forEach(([id,e,n,ds])=>{ const won=S.badges.includes(id), el=document.createElement("div");
    el.className="badge"+(won?" won":""); el.innerHTML=`<div class="e">${won?e:"–"}</div><b>${n}</b><br><span class="muted">${ds}</span>`; bg.appendChild(el); });
  $("#pvActivity").checked=S.settings.showActivity!==false;
  $("#pvPaths").checked=S.settings.showPaths===true;
}
$("#pvActivity").onchange=e=>{ S.settings.showActivity=e.target.checked; store.save(LS_MAIN,S); scheduleUpload(); };
$("#pvPaths").onchange=e=>{ S.settings.showPaths=e.target.checked; store.save(LS_MAIN,S); scheduleUpload(); };
$("#exportBtn").onclick=()=>{ const b=new Blob([JSON.stringify(S)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="kaizen-backup.json"; a.click(); };
$("#resetBtn").onclick=()=>{ if(confirm("Reset ALL Kaizen progress on this device?")){ S=dflt(); store.save(LS_MAIN,S); location.reload(); } };

/* ---------- DUO / COMMUNITY (N users in a room) ---------- */
let DUO = store.load(LS_DUO) || {room:"",name:"",uid:"",on:false};
if(DUO.slot && !DUO.uid){ DUO.uid=""; delete DUO.slot; } // migrate from A/B slots
let DB=null, roomRef=null, mates={}, upT=null, doingNow="browsing";
const mateList = () => Object.entries(mates).map(([uid,p])=>({uid,...p}));
function cfg(){ return window.KAIZEN_CFG||{}; }
function feed(text,kind){ if(!DB||!DUO.on||!DUO.room) return;
  try{ DB.ref(`rooms/${DUO.room}/feed`).push({t:Date.now(),uid:DUO.uid,name:S.name||"Someone",text,kind:kind||"note"});
    markPush(); }catch(e){ syncErr(e); } }
function snapshot(){ return {name:S.name||"",photo:S.photo||"",xp:S.xp,gems:S.gems,streak:S.streak,best:S.best,lastDay:S.lastDay,
  courses:S.courses,badges:S.badges,chestDay:S.chestDay,settings:S.settings,
  presence:{alive:Date.now(),doing:doingNow,
    session:SESS?{state:SESS.state,label:SESS.label,startedAt:SESS.startedAt}:null}}; }
function heartbeat(doing){ if(doing) doingNow=doing;
  if(!DB||!DUO.on) return;
  try{ DB.ref(`rooms/${DUO.room}/users/${DUO.uid}`).update(
    {presence:{alive:Date.now(),doing:doingNow,session:SESS?{state:SESS.state,label:SESS.label,startedAt:SESS.startedAt}:null}}); }catch{} }
function scheduleUpload(){ if(!DB||!DUO.on) return; clearTimeout(upT); upT=setTimeout(upload,2000); }
function upload(){ if(!DB||!DUO.on) return;
  try{ DB.ref(`rooms/${DUO.room}/users/${DUO.uid}`).update(snapshot()); markPush(); }
  catch(e){ syncErr(e); } }
function syncErr(e){ const el=$("#duoStatus");
  const msg=String((e&&e.message)||e||"unknown");
  SYNC.lastErr=new Date().toLocaleTimeString()+" "+msg; renderSync();
  if(el) el.textContent = /permission_denied/i.test(msg)
    ? "Permission denied — the database Rules aren't published yet (or you're signed out). Fix below ↓"
    : "Sync blocked: "+msg+" — sign in (Profile) and check database Rules (SETUP.md).";
  if(/permission_denied/i.test(msg)){ const h=$("#syncHelp"); if(h) h.classList.remove("hidden"); } }
const SYNC={push:0,pull:0,lastErr:"",conn:"offline"};
function markPull(){ SYNC.pull=Date.now(); renderSync(); }
function markPush(){ SYNC.push=Date.now(); renderSync(); }
function renderSync(){ const el=$("#syncLines"); if(!el) return;
  const f=t=>t?new Date(t).toLocaleTimeString():"—";
  el.innerHTML=`auth: <b>${authUser()?esc(authUser().email||"?"):"signed out"}</b> · you: <b>${esc((DUO.uid||"").slice(-6)||"—")}</b><br>`+
    `room: <b>${esc(DUO.room||"—")}</b> · link: <b>${SYNC.conn}</b> · members here: <b>${Object.keys(mates).length+((DB&&DUO.on)?1:0)}</b><br>`+
    `last sent: ${f(SYNC.push)} · last received: ${f(SYNC.pull)}`+
    (SYNC.lastErr?`<br>last error: ${esc(SYNC.lastErr)}`:"");
  const dot=$("#syncDot"); if(dot) dot.textContent=SYNC.conn==="live"?"● live":SYNC.conn; }
function watch(ref,fn){ try{ ref.on("value",snap=>fn(snap.val()),syncErr); }catch(e){ syncErr(e); } }
function ago(ts){ const s=Math.max(0,(Date.now()-ts)/1000);
  if(s<60) return "just now"; if(s<3600) return Math.floor(s/60)+"m ago";
  if(s<86400) return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; }
function connect(){
  const room=($("#roomInput").value||cfg().room||"").trim();
  if(!room){ $("#duoStatus").textContent="Enter a room code first — everyone uses the same code."; return; }
  if(!cfg().firebaseConfig){ $("#duoStatus").textContent="No backend configured yet — see SETUP.md (5 min). Offline mode continues."; return; }
  const user=authUser();
  const typedName=(($("#nameInput").value||"").trim().slice(0,20));
  if(!user){ // remember intent across a redirect-based sign-in
    DUO={room,name:typedName,uid:"",on:!!room}; store.save(LS_DUO,DUO);
    $("#duoStatus").textContent="Sign in with Google first, then join the room."; signIn(); return; }
  const name=(($("#nameInput").value||"").trim().slice(0,20))||user.displayName||"Someone";
  try{
    DUO={room,name,uid:user.uid,on:true}; S.name=name; S.photo=user.photoURL||"";
    store.save(LS_DUO,DUO); store.save(LS_MAIN,S);
    upload(); heartbeat("just connected");
    roomRef=DB.ref(`rooms/${room}`);
    const pulled=()=>{ markPull(); };
    const wFeed=(v)=>{ pulled(); renderFeed(v); };
    watch(roomRef.child("feed").limitToLast(20), wFeed);
    watch(roomRef.child("applause"), v=>{ pulled(); applauseMap={};
      Object.entries(v||{}).forEach(([k,o])=>applauseMap[k]={c:Object.keys(o).length,mine:!!(DUO.uid&&o[DUO.uid])});
      renderFeed(Object.fromEntries(feedCache.map(x=>[x.k,x]))); });
    watch(roomRef.child("challenges"), v=>{ pulled(); peerChallenges=v?Object.values(v):[]; renderChallenges(); });
    watch(roomRef.child("cvideos"), v=>{ pulled(); cvCache=v||{}; renderCvideos(); });
    watch(roomRef.child("users"), v=>{ pulled(); const u=v||{};
      delete u[DUO.uid]; mates=u; onPeer();
      $("#duoStatus").textContent=`${S.name} in "${room}" — ${Object.keys(mates).length} other(s) here.`; });
    try{ DB.ref(`rooms/${room}/users/${DUO.uid}/presence`).onDisconnect().set({alive:Date.now(),doing:"away",session:null}); }catch{}
    try{ DB.ref(".info/connected").on("value",s=>{
      if(!DUO.on) return; SYNC.conn=s.val()?"live":"reconnecting"; renderSync();
      $("#duoStatus").textContent = s.val()? `${S.name} in "${room}" — live (${Object.keys(mates).length} other(s)).`
        : "Reconnecting… answers are safe on this device and will sync."; }); }catch{}
    setInterval(()=>heartbeat(),15000);
    $("#duoStatus").textContent=`${name} in "${room}" — ${Object.keys(mates).length} other(s) here.`;
    $("#dcBtn").classList.remove("hidden");
    const wb=$("#waveBtn"); if(wb) wb.classList.remove("hidden");
    refreshAuthUI(); renderSync(); onPeer();
  }catch(e){ $("#duoStatus").textContent="Connection failed: "+e.message; }
}
/* ---------- Google sign-in (persistent) ---------- */
function ensureApp(){
  if(typeof firebase==="undefined") throw new Error("backend scripts blocked — check connection");
  if(!cfg().firebaseConfig) throw new Error("no backend configured — see SETUP.md");
  if(!firebase.apps.length) firebase.initializeApp(cfg().firebaseConfig);
  DB=firebase.database();
  return firebase.auth();
}
function authUser(){
  try{
    if(typeof firebase==="undefined"||!cfg().firebaseConfig) return null;
    if(!firebase.apps.length) firebase.initializeApp(cfg().firebaseConfig);
    return firebase.auth().currentUser;
  }catch{ return null; }
}
let signInBusy=false;
const IS_MOBILE=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||"");
async function persistBest(auth){
  // LOCAL keeps sign-in across restarts; webviews often block storage → degrade gracefully
  for(const mode of [firebase.auth.Auth.Persistence.LOCAL,
      firebase.auth.Auth.Persistence.SESSION, firebase.auth.Auth.Persistence.NONE]){
    try{ await auth.setPersistence(mode); return mode; }catch{}
  }
  return null;
}
async function signIn(){
  if(signInBusy) return; signInBusy=true;
  const btn=$("#googleBtn"); if(btn){ btn.disabled=true; btn.textContent="Signing in…"; }
  const done=msg=>{ signInBusy=false; if(btn){ btn.disabled=false; btn.textContent="Sign in with Google"; }
    if(msg) $("#duoStatus").textContent=msg; };
  try{
    window.__kzStep="signin-start";
    const auth=ensureApp();
    const mode=await persistBest(auth);
    window.__kzStep="signin-persist:"+mode;
    if(mode==="none"||mode===null)
      $("#duoStatus").textContent="Note: this browser blocks storage — sign-in will last this tab only. Prefer Safari/Chrome app.";
    const prov=new firebase.auth.GoogleAuthProvider();
    if(IS_MOBILE){
      try{
        window.__kzStep="signin-mobile-popup";
        const result=await auth.signInWithPopup(prov);
        window.__kzStep="signin-mobile-popup-ok";
        if(result&&result.user) handleAuthUser(result.user);
        done();
        return;
      }catch(e){
        const popupBlocked=["auth/popup-blocked","auth/popup-closed-by-user","auth/operation-not-supported-in-this-environment"].includes(e.code);
        if(!popupBlocked) throw e;
      }
    }
    try{
      window.__kzStep="signin-popup";
      const result=await auth.signInWithPopup(prov);
      window.__kzStep="signin-popup-ok";
      if(result&&result.user) handleAuthUser(result.user);
      done();
    }catch(e){
      if(!["auth/popup-blocked","auth/popup-closed-by-user","auth/operation-not-supported-in-this-environment"].includes(e.code))
        throw e;
      window.__kzStep="signin-redirect";
      safeStoreSet(LS_AUTH_RETURN,JSON.stringify({tab:"profile",at:Date.now()}));
      await auth.signInWithRedirect(prov);
    }
  }catch(e){
    let msg="Sign-in failed: "+(e.message||e);
    if(String(e.code||"").includes("unauthorized-domain"))
      msg+=" — add THIS domain ("+location.hostname+") in Firebase console → Authentication → Settings → Authorized domains.";
    if(String(e.code||"").includes("invalid-api-key")||String(e.message||"").includes("api-key"))
      msg+=" — the API key in Vercel env vars looks wrong (no quotes/spaces).";
    done(msg);
  }
}
async function signOut(){
  try{ await ensureApp().signOut(); }catch{}
  DUO.on=false; store.save(LS_DUO,DUO);
  try{ roomRef&&roomRef.off(); }catch{} DB=null; mates={};
  $("#dcBtn").classList.add("hidden"); refreshAuthUI();
  $("#duoStatus").textContent="Signed out. Offline mode.";
  renderStrip(); if(document.querySelector('[data-tab="social"]').classList.contains("active")) renderSocial(); }
function refreshAuthUI(current){
  const u=current===undefined?authUser():current, has=!!u;
  $("#authBox").classList.toggle("hidden",has);
  $("#userBox").classList.toggle("hidden",!has);
  if(has){ $("#userName").textContent=u.displayName||S.name||"You"; $("#userMail").textContent=u.email||"";
    if(!$("#nameInput").value) $("#nameInput").value=u.displayName||""; }
}
let handledAuthUid="";
function handleAuthUser(u){
  if(!u||handledAuthUid===u.uid) return;
  handledAuthUid=u.uid;
  window.__kzStep="auth-user:"+u.uid.slice(-6);
  refreshAuthUI(u);
  let returned=null;
  try{ returned=JSON.parse(safeStoreGet(LS_AUTH_RETURN)||"null"); }catch{}
  if(returned&&Date.now()-(returned.at||0)<10*60*1000){
    safeStoreRemove(LS_AUTH_RETURN);
    const tab=document.querySelector(`[data-tab="${returned.tab||"profile"}"]`);
    if(tab) tab.click();
  }
  if(!S.name){ S.name=u.displayName||""; S.photo=u.photoURL||""; store.save(LS_MAIN,S); }
  if(DUO.on&&DUO.room&&DUO.uid!==u.uid){ DUO.uid=u.uid; store.save(LS_DUO,DUO); }
  if(DUO.on&&DUO.room&&!roomRef){ S.name=S.name||u.displayName||""; connect(); }
}
$("#googleBtn").onclick=signIn;
$("#signOutBtn").onclick=signOut;
const crb=$("#copyRulesBtn");
if(crb) crb.onclick=async()=>{ const t=$("#rulesPre").textContent;
  try{ await navigator.clipboard.writeText(t); crb.textContent="Copied ✓"; }
  catch{ const ta=document.createElement("textarea"); ta.value=t; document.body.appendChild(ta);
    ta.select(); try{document.execCommand("copy"); crb.textContent="Copied ✓";}catch{} ta.remove(); }
  setTimeout(()=>crb.textContent="Copy rules",2000); };
function onPeer(){ renderStrip(); renderFocusFriends(); updateDuoMini();
  if(document.querySelector('[data-tab="social"]').classList.contains("active")) renderSocial(); }
function updateDuoMini(){ const el=$("#duoMini"); if(!el) return;
  const ms=mateList();
  if(!DUO.on){ el.textContent="Not connected."; return; }
  if(!ms.length){ el.textContent="Connected — waiting for others to join."; return; }
  const vis=ms.filter(p=>p.settings?.showActivity!==false);
  const studying=vis.filter(p=>p.presence?.session?.state==="active").length;
  const online=vis.filter(p=>{ const pr=p.presence; return pr&&Date.now()-pr.alive<90000&&pr.session?.state!=="active"; }).length;
  el.innerHTML=`<b>${ms.length}</b> here · <b>${studying}</b> studying · <b>${online}</b> online — ${vis.map(p=>esc(p.name||"?")).join(", ")}.`; }
$("#connectBtn").onclick=connect;
const wv=$("#waveBtn");
if(wv) wv.onclick=()=>{ if(!DB||!DUO.on){ $("#duoStatus").textContent="Join the room first, then wave."; return; }
  feed("waved to the room","note"); wv.textContent="Waved ✓"; setTimeout(()=>wv.textContent="Wave to the room 👋",2000); };
$("#dcBtn").onclick=()=>{ DUO.on=false; store.save(LS_DUO,DUO);
  try{ roomRef&&roomRef.off(); }catch{} DB=null; mates={};
  $("#dcBtn").classList.add("hidden"); $("#duoStatus").textContent="Disconnected. Offline mode.";
  renderStrip(); renderSocial(); };
window.addEventListener("beforeunload",()=>{ try{
  if(SESS&&SESS.state==="active"){ localStorage.setItem("kz_interrupted","1"); }
  try{ DB&&DUO.on&&DB.ref(`rooms/${DUO.room}/users/${DUO.uid}`).update(snapshot()); }catch{}
  DB&&DUO.on&&DB.ref(`rooms/${DUO.room}/users/${DUO.uid}/presence`).set({alive:Date.now(),doing:"away",session:null});}catch{} });

/* ---------- countdown + init ---------- */
function renderTop(){ /* header shows daily XP + streak */
  const d=(S.courses[S.activeCourse]?.days||{})[today()]||{xp:0};
  $("#xpTop").textContent=d.xp||0; $("#streakTop").textContent=S.streak; }
function renderAll(){ renderTop(); renderHome(); }
(async function init(){
  const c=cfg();
  try{ await loadCourses(); }
  catch(e){ document.querySelector("main").insertAdjacentHTML("afterbegin",
    `<div class="card"><b>Couldn't load any course.</b><p class="muted">Check that the <code>courses/</code> folder is deployed next to <code>index.html</code>, then reload.</p></div>`); return; }
  if(!Object.keys(COURSES).length){ document.querySelector("main").insertAdjacentHTML("afterbegin",
    `<div class="card"><b>No courses found.</b><p class="muted">See courses/README.md to add one.</p></div>`); return; }
  if(USING_FALLBACK){ document.querySelector("main").insertAdjacentHTML("afterbegin",
    `<div class="card"><p class="muted tiny" style="margin:0">Offline pack mode — studying works fully. Deploy with the <code>courses/</code> folder (or add more packs) to go live.</p></div>`); }
  if(localStorage.getItem("kz_interrupted")){ localStorage.removeItem("kz_interrupted");
    S.sessions.unshift({date:today(),course:S.activeCourse,label:"Unfinished session",kind:"timer",mins:0,attempted:0,correct:0,xp:0,state:"interrupted"}); }
  $("#roomInput").value=DUO.room||c.room||""; $("#nameInput").value=S.name||c.name||"";
  try{
    if(typeof firebase!=="undefined"&&c.firebaseConfig){
      if(!firebase.apps.length) firebase.initializeApp(c.firebaseConfig);
      DB=firebase.database();
      const auth=firebase.auth();
      auth.getRedirectResult()
        .then(res=>{
          if(res&&res.user){
            window.__kzStep="redirect-ok";
            handleAuthUser(res.user);
          }
        })
        .catch(e=>{ window.__kzStep="redirect-err";
          safeStoreRemove(LS_AUTH_RETURN);
          $("#duoStatus").textContent="Sign-in return failed: "+(e.message||e);
          const b=$("#googleBtn"); if(b){ b.disabled=false; b.textContent="Try Google sign-in again"; }
        });
      auth.onAuthStateChanged(u=>{ try{
        window.__kzStep="auth-changed:"+(u?"signed-in":"signed-out");
        if(u) handleAuthUser(u);
        else refreshAuthUI();
      }catch(e){ window.__kzStep="auth-handler-err";
        $("#duoStatus").textContent="Signed in, but something stumbled after: "+(e.message||e); } });
    }
  }catch(e){ console.warn("auth init", e); }
  refreshAuthUI();
  touchDay();   store.save(LS_MAIN,S);
  normState();
  fitNav();
  const av = document.querySelector("#appVer"); if (av) av.textContent = "v" + APP_V;
  renderAll(); renderPaths();
  const A=active();
  if(A&&A.decks[0]){ prKind="deck"; prId=A.decks[0].id; prMode="quiz"; }
})();
