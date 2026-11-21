import {initFirebase,onUser,loginGoogle,emailSignIn,emailSignUp,resetPassword,logout,userCol,aiCall,aiReady,geminiKey,setGeminiKey} from './fb.js';

/* ---------- utils ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const pad=n=>String(n).padStart(2,'0');
const ds=d=>{const x=new Date(d);return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())};
const parseD=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const today0=()=>{const x=new Date();x.setHours(0,0,0,0);return x};
const daysAgo=s=>Math.round((today0()-parseD(s))/864e5);
const monday=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const WD=['週日','週一','週二','週三','週四','週五','週六'];
const fmtD=s=>{const d=parseD(s);return (d.getMonth()+1)+'/'+d.getDate()+' '+WD[d.getDay()]};
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200)}

/* ---------- exercise library ---------- */
const LIB={
 cardio:{g:'體能',n:{gym:['跑步機','飛輪','划船機','滑步機'],db:['戶外跑步','跳繩'],bw:['戶外跑步','快走','跳繩']}},
 hiit:{g:'體能',n:{gym:['壺鈴擺盪','戰繩'],db:['啞鈴抓舉','波比跳'],bw:['波比跳','開合跳','高抬腿']}},
 squat:{g:'腿',n:{gym:['槓鈴背蹲舉','腿推機','哈克深蹲'],db:['啞鈴高腳杯深蹲','啞鈴前蹲'],bw:['徒手深蹲','跳躍深蹲']}},
 hinge:{g:'腿',n:{gym:['羅馬尼亞硬舉','傳統硬舉','槓鈴臀推'],db:['啞鈴羅馬尼亞硬舉','啞鈴臀推'],bw:['單腳臀橋','臀橋']}},
 lunge:{g:'腿',n:{gym:['保加利亞分腿蹲','行走弓箭步'],db:['啞鈴保加利亞分腿蹲','啞鈴弓箭步','啞鈴登階'],bw:['弓箭步','徒手保加利亞分腿蹲']}},
 legcurl:{g:'腿',n:{gym:['坐姿腿後勾','俯臥腿後勾'],db:['單腳啞鈴羅馬尼亞硬舉','啞鈴腿後勾'],bw:['滑行腿後勾','北歐腿後勾（輔助）']}},
 legext:{g:'腿',n:{gym:['腿伸屈'],db:['啞鈴登階'],bw:['西西深蹲']}},
 calves:{g:'腿',n:{gym:['站姿提踵機'],db:['啞鈴單腳提踵'],bw:['單腳提踵']}},
 hpush:{g:'胸',n:{gym:['槓鈴臥推','器械胸推'],db:['啞鈴臥推','上斜啞鈴臥推'],bw:['伏地挺身','下斜伏地挺身']}},
 vpush:{g:'肩',n:{gym:['槓鈴站姿肩推'],db:['坐姿啞鈴肩推','阿諾肩推'],bw:['派克伏地挺身']}},
 chest:{g:'胸',n:{gym:['繩索夾胸','蝴蝶機'],db:['啞鈴飛鳥'],bw:['寬距伏地挺身']}},
 lateral:{g:'肩',n:{gym:['繩索側平舉'],db:['啞鈴側平舉'],bw:['俯臥 Y-T-W 舉']}},
 triceps:{g:'三頭',n:{gym:['繩索三頭下壓','窄握臥推'],db:['過頭啞鈴三頭伸展','啞鈴仰臥三頭伸展'],bw:['窄距伏地挺身','椅子撐體']}},
 hpull:{g:'背',n:{gym:['槓鈴划船','坐姿繩索划船','胸靠划船'],db:['單臂啞鈴划船','俯身啞鈴划船'],bw:['反向划船（桌下）','毛巾門框划船']}},
 vpull:{g:'背',n:{gym:['滑輪下拉','引體向上'],db:['啞鈴仰臥拉舉'],bw:['引體向上','離心引體向上']}},
 reardelt:{g:'肩',n:{gym:['繩索面拉','反向蝴蝶機'],db:['俯身啞鈴反向飛鳥'],bw:['俯臥 Y-T-W 舉']}},
 biceps:{g:'二頭',n:{gym:['槓鈴彎舉','繩索彎舉'],db:['啞鈴交替彎舉','錘式彎舉'],bw:['反手反向划船','毛巾等長彎舉']}},
 core:{g:'腹',n:{gym:['懸吊抬腿','繩索捲腹'],db:['平板支撐','啞鈴側彎'],bw:['平板支撐','死蟲式','登山者']}},
};
const COMPOUND=new Set(['squat','hinge','lunge','hpush','vpush','hpull','vpull']);
const T={
 FA:{n:'全身 A',s:['squat','hpush','hpull','hinge','lateral','core','biceps']},
 FB:{n:'全身 B',s:['hinge','vpush','vpull','lunge','triceps','core','calves']},
 FC:{n:'全身 C',s:['squat:1','hpush:1','vpull:1','lunge:1','hpull:1','reardelt','core:1']},
 UA:{n:'上肢 A',s:['hpush','hpull','vpush','vpull','lateral','biceps','triceps']},
 LA:{n:'下肢 A',s:['squat','hinge','lunge','legcurl','calves','core']},
 UB:{n:'上肢 B',s:['vpush:1','vpull:1','hpush:1','hpull:1','chest','reardelt','triceps:1']},
 LB:{n:'下肢 B',s:['hinge:1','squat:1','legext','legcurl:1','calves','core:1']},
 PU:{n:'推日',s:['hpush','vpush','hpush:1','lateral','chest','triceps']},
 PL:{n:'拉日',s:['vpull','hpull','hpull:1','reardelt','biceps','core']},
 LG:{n:'腿日',s:['squat','hinge','lunge','legcurl','legext','calves']},
};
const SPLITS={2:['FA','FB'],3:['FA','FB','FC'],4:['UA','LA','UB','LB'],5:['UA','LA','PU','PL','LG'],6:['PU','PL','LG','PU','PL','LG']};
const SPLITNAME={2:'全身訓練 ×2',3:'全身訓練 ×3',4:'上下肢分化',5:'上下肢 + 推拉腿',6:'推拉腿 ×2'};
const WEEKDAYS={2:[1,4],3:[1,3,5],4:[1,2,4,5],5:[1,2,3,5,6],6:[1,2,3,4,5,6]};
const GOAL={muscle:'增肌',strength:'增強力量',fatloss:'減脂',health:'健康體能'};
const LEVEL={beg:'新手（< 6 個月）',int:'中階（6 個月–2 年）',adv:'進階（> 2 年）'};
const EQUIP={gym:'健身房',db:'只有啞鈴',bw:'徒手 / 居家'};
const GROUPS=['胸','背','肩','二頭','三頭','腿','腹','體能'];
const PCOL={胸:'#e8572a',背:'#2f6fd6',肩:'#8b5cf6',二頭:'#d4a017',三頭:'#475569',腿:'#1f9d6b',腹:'#e0457b',體能:'#0ea5b7'};
const OLDG={推:'胸',拉:'背',核心:'腹'};
const groupOf=e=>(e.pattern&&LIB[e.pattern])?LIB[e.pattern].g:e.group==='手臂'?(/三頭|下壓|撐體|伸展|窄/.test(e.name)?'三頭':'二頭'):(OLDG[e.group]||e.group||'其他');
const ptag=g=>`<span class="ptag" style="background:${PCOL[g]||'#888'}">${esc(g)}</span>`;
const PUSHP=new Set(['hpush','vpush','chest','lateral','triceps']),PULLP=new Set(['hpull','vpull','reardelt','biceps']);
const PART_SLOTS={胸:['hpush','hpush:1','chest','hpush:2'],背:['vpull','hpull','hpull:1','vpull:1'],肩:['vpush','lateral','reardelt','vpush:1'],二頭:['biceps','biceps:1','biceps:2'],三頭:['triceps','triceps:1','triceps:2'],腿:['squat','hinge','lunge','legcurl','calves'],腹:['core','core:1','core:2'],體能:['cardio','hiit','hiit:1','cardio:1']};
const BIG=new Set(['胸','背','腿']);
const isTimeUnit=u=>u==='秒'||u==='分鐘';
const unitOf=e=>e.unit||'次';
const LB=0.45359237;
const prefU=()=>(S.profile&&S.profile.wu)||'kg';
const toKg=(v,u)=>u==='lb'?v*LB:v;
const fromKg=(kg,u)=>u==='lb'?kg/LB:kg;
const rnd5=x=>Math.round(x*2)/2;
const wIn=(kg,u)=>rnd5(fromKg(kg,u));
const fmtW=(kg,u)=>{u=u||prefU();return wIn(kg,u)+' '+u};
const setTxt=(e,s)=>{const u=e.wu||'kg';const wv=s.w>0?wIn(s.w,u):0;return unitOf(e)==='分鐘'?(s.w>0?s.w+' km · ':'')+s.r+' 分':(wv?wv+(u==='lb'?' lb':'')+(unitOf(e)==='秒'?' ':'×'):'')+s.r+(unitOf(e)==='秒'?'秒':'')};

function options(pat,eq){const n=LIB[pat].n;const l=eq==='gym'?[...n.gym,...n.db]:eq==='db'?[...n.db,...n.bw]:[...n.bw];return [...new Set(l)]}
const BWSET=new Set(Object.values(LIB).flatMap(x=>x.n.bw));
const isBW=name=>BWSET.has(name)&&name!=='引體向上';
function prescribe(p,pat,j,name){
  const comp=COMPOUND.has(pat);let sets,min,max,rest;
  if(pat==='cardio'){const long=p.goal==='fatloss'||p.goal==='health';return {sets:1,min:long?25:15,max:long?40:25,rest:0,unit:'分鐘'}}
  if(pat==='hiit'){const timed=/戰繩|開合跳|高抬腿/.test(name);return {sets:p.level==='beg'?3:4,min:timed?30:10,max:timed?45:15,rest:45,unit:timed?'秒':'次'}}
  if(p.goal==='strength'){if(j===0&&comp){sets=5;min=3;max=5;rest=180}else if(comp){sets=4;min=5;max=8;rest=120}else{sets=3;min=8;max=12;rest=75}}
  else if(p.goal==='muscle'){if(comp){sets=4;min=6;max=10;rest=120}else{sets=3;min=10;max=15;rest=60}}
  else if(p.goal==='fatloss'){if(comp){sets=3;min=8;max=12;rest=75}else{sets=3;min=12;max=15;rest=45}}
  else{if(comp){sets=3;min=8;max=12;rest=90}else{sets=2;min=12;max=15;rest=60}}
  if(p.level==='beg')sets=Math.min(sets,3);
  if(p.level==='adv'&&comp)sets+=1;
  let unit='次';
  if(isBW(name)){if(comp){min=Math.max(min,8);max=Math.max(max,15)}else{min=12;max=20}}
  if(/平板/.test(name)){unit='秒';min=30;max=60}
  return {sets,min,max,rest,unit};
}
function buildPlan(p){
  if(!p)return [];
  const keys=SPLITS[p.days],wd=WEEKDAYS[p.days],n={beg:5,int:6,adv:7}[p.level]||6;
  const addCardio=p.goal==='fatloss'||p.goal==='health';
  return keys.map((k,i)=>{const t=T[k];const slots=t.s.slice(0,n).concat(addCardio?['cardio:'+i]:[]);
    return {idx:i,key:k,name:t.n,weekday:wd[i],ex:slots.map((slot,j)=>exFromSlot(p,slot,j,i+'-'+j))}});
}
function exFromSlot(p,slot,j,sk,avoid){
  const [pat,alt]=slot.split(':');const opts=options(pat,p.equip);const sw=sk?((p.swaps||{})[sk]||0):0;
  let name=opts[((+alt||0)+sw)%opts.length];
  if(avoid){for(let t=0;t<opts.length&&avoid.has(name);t++)name=opts[((+alt||0)+sw+t+1)%opts.length]}
  return {name,pattern:pat,group:LIB[pat].g,swapKey:sk,alts:opts.length,...prescribe(p,pat,j,name)};
}
function exForParts(parts,p){
  const k=parts.length,order=GROUPS.filter(g=>parts.includes(g));
  const cnt=g=>g==='體能'?(k===1?3:1):g==='腹'?(k===1?3:Math.min(2,k<=2?2:1)):k===1?4:k===2?3:k===3?(BIG.has(g)?3:2):(BIG.has(g)?2:1);
  const used=new Set(),out=[];
  order.forEach(g=>{PART_SLOTS[g].slice(0,cnt(g)).forEach((slot,j)=>{const e=exFromSlot(p,slot,out.length===0?0:j,null,used);if(!used.has(e.name)){used.add(e.name);out.push(e)}})});
  return out;
}
const rxText=e=>e.unit==='分鐘'?`${e.min}–${e.max} 分鐘`:`${e.sets} × ${e.min}–${e.max}${e.unit==='秒'?' 秒':''}`;

/* ---------- state ---------- */
const S={tab:LS.get('ft-tab','today'),mode:'loading',col:null,loaded:false,profile:null,workouts:[],bw:[],
  session:null,auth:'loading',user:null,login:{mode:'in',email:'',err:'',msg:'',busy:false},rest:null,openW:null,confirmDel:null,banner:'',sample:undefined,
  ai:{text:'',busy:false,err:'',q:''}};
const SK=()=>'ft-session-'+(S.user?S.user.uid:'anon');
const plan=()=>{const g=S.goal;if(g&&g.active&&g.schedule&&g.schedule.length)return goalPlanDays(g);return buildPlan(effP())};

/* ---------- storage ---------- */
function persistLocal(){if(S.mode==='local')LS.set('ft-data',{profile:S.profile,bw:S.bw,workouts:S.workouts,goal:S.goal})}
async function put(id,data){
  if(S.mode==='cloud'){try{await S.col.doc(id).set(data)}catch(e){toast('雲端儲存失敗'+(e&&e.code?'（'+e.code+'）':''))}}
  else persistLocal();
}
async function remove(id){
  if(S.mode==='cloud'){try{await S.col.doc(id).delete()}catch(e){toast('刪除失敗')}}
  else persistLocal();
}
const sortW=a=>a.sort((x,y)=>x.date===y.date?y.ts-x.ts:(x.date<y.date?1:-1));

let unsubData=null;
async function init(){
  render();
  let cloud=false;
  try{cloud=await initFirebase()}catch(e){console.error(e);if(!navigator.onLine){S.banner='目前離線，連上網路後重新打開 App。'}S.auth='error';render(true);return}
  if(!cloud){localMode();return}
  onUser(u=>{
    if(unsubData){try{unsubData()}catch(e){}unsubData=null}
    S.user=u;
    if(!u){Object.assign(S,{auth:'out',loaded:false,profile:null,goal:null,workouts:[],bw:[],session:null,mode:'loading',col:null,banner:''});clearInterval(tickInt);render(true);return}
    S.auth='in';S.mode='cloud';S.sample=aiReady()?aiCall:null;S.col=userCol(u.uid);S.loaded=false;S.login={mode:'in',email:'',err:'',msg:'',busy:false};
    S.session=LS.get(SK(),null);
    if(S.session&&S.session.date!==ds(new Date())&&!S.session.ex.some(e=>e.sets.some(s=>s.r))){S.session=null;LS.del(SK())}
    if(S.session){if(!S.session.upd)S.session.upd=Date.now();startTick()}
    render(true);
    const timer=setTimeout(()=>{if(!S.loaded){S.loaded=true;S.banner='目前離線或連線較慢，紀錄會先存在手機，連上網路後自動同步。';render(true)}},8000);
    unsubData=S.col.onSnapshot(snap=>{
      if(!snap.metadata.fromCache){clearTimeout(timer);S.banner=''}
      if(snap.metadata.fromCache&&snap.empty&&!S.loaded)return;
      let p=null,bw=[],ws=[],goal=null,cs=null;
      snap.docs.forEach(d=>{const v=d.data();if(!v)return;if(d.id==='profile')p=v;else if(d.id==='goal')goal=v;else if(d.id==='session')cs=v;else if(d.id==='bodyweight')bw=(v.entries||[]).slice();else if(d.id.startsWith('w-'))ws.push(v)});
      S.profile=p;S.goal=goal;S.bw=bw.sort((a,b)=>a.d<b.d?-1:1);S.workouts=sortW(ws);S.loaded=true;adoptCloudSession(cs);render();
    },e=>{console.error(e);clearTimeout(timer);S.loaded=true;S.banner='雲端同步中斷，請重新打開 App。';render(true)});
  });
}

function localMode(){
  S.user={uid:'local',label:'這支手機'};S.auth='in';S.mode='local';S.sample=aiReady()?aiCall:null;
  const d=LS.get('ft-data',{});S.profile=d.profile||null;S.goal=d.goal||null;S.bw=d.bw||[];S.workouts=sortW(d.workouts||[]);
  S.session=LS.get(SK(),null);
  if(S.session&&S.session.date!==ds(new Date())&&!S.session.ex.some(e=>e.sets.some(s=>s.r))){S.session=null;LS.del(SK())}
  if(S.session){if(!S.session.upd)S.session.upd=Date.now();startTick()}
  S.loaded=true;S.banner='';
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
  render(true);
}

function aiKeyCard(){
  const k=geminiKey();
  return `<div class="card"><h2>✦ AI 教練（選用・免費）</h2>${k?`<div class="small">已設定 Gemini 金鑰（${esc(k.slice(0,6))}…${esc(k.slice(-4))}），AI 教練和 AI 目標規劃都能用。</div><div class="spacer"></div><button class="btn sm ghost danger" data-act="gkeyDel">移除金鑰</button>`
  :`<div class="small muted">到 Google AI Studio 免費申請 Gemini API 金鑰，貼在這裡就能用 AI 教練和 AI 目標規劃。金鑰只存在這支手機。</div>
  <div style="margin:8px 0"><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--acc);font-weight:700">申請免費金鑰 →</a></div>
  <div class="row"><input class="tx" id="gkey" type="password" autocomplete="off" placeholder="貼上 API 金鑰（AIza 開頭）"><button class="btn sm acc" data-act="gkeySave">儲存</button></div>`}
  <div class="tiny muted" style="margin-top:8px">免費版有每分鐘、每天的次數上限，送出的內容可能會被 Google 用來改進服務。</div></div>`;
}

/* ---------- login ---------- */
const AUTHERR={'auth/invalid-email':'Email 格式不正確。','auth/invalid-credential':'Email 或密碼不正確。','auth/wrong-password':'Email 或密碼不正確。','auth/user-not-found':'找不到這個帳號，要不要先註冊？','auth/email-already-in-use':'這個 Email 已經註冊過了，請直接登入。','auth/weak-password':'密碼至少要 6 個字元。','auth/missing-password':'請輸入密碼。','auth/too-many-requests':'嘗試太多次了，請稍後再試。','auth/popup-closed-by-user':'登入視窗被關閉了，請再試一次。','auth/cancelled-popup-request':'','auth/network-request-failed':'網路連線有問題，請確認後再試。','auth/unauthorized-domain':'這個網址還沒加入 Firebase 授權網域（見部署說明）。','auth/operation-not-allowed':'這種登入方式還沒在 Firebase 開啟（見部署說明）。'};
const authMsg=e=>AUTHERR[e&&e.code]??('登入失敗：'+((e&&e.code)||'請再試一次'));
function vLogin(){
  const L=S.login,up=L.mode==='up';
  return `<div class="card hero" style="margin-top:8px"><div class="big" style="font-size:28px">健身追蹤</div><div class="small muted">記錄訓練、自動排課表、追蹤目標。登入後資料存在你自己的帳號，換手機也不會不見。</div></div>
  <div class="card"><button class="btn block" data-act="loginGoogle" ${L.busy?'disabled':''} style="padding:13px;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:700">
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>用 Google 帳號登入</button>
  <div class="row" style="margin:16px 0 4px;gap:10px"><span style="flex:1;height:1px;background:var(--line)"></span><span class="tiny muted">或用 Email</span><span style="flex:1;height:1px;background:var(--line)"></span></div>
  <form id="emailform"><input class="tx" id="lemail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" value="${esc(L.email)}">
  <input class="tx" id="lpw" type="password" autocomplete="${up?'new-password':'current-password'}" placeholder="${up?'設定密碼（至少 6 個字元）':'密碼'}" style="margin-top:8px">
  <div class="spacer"></div><button class="btn pri block" type="submit" ${L.busy?'disabled':''}>${L.busy?'請稍候…':up?'註冊並登入':'登入'}</button></form>
  <div class="row between" style="margin-top:10px"><button class="btn sm ghost" data-act="loginMode">${up?'已經有帳號？登入':'還沒有帳號？註冊'}</button>${up?'':`<button class="btn sm ghost" data-act="forgotPw">忘記密碼</button>`}</div>
  ${L.err?`<div class="banner" style="margin-top:12px">${esc(L.err)}</div>`:''}${L.msg?`<div class="hint" style="margin-top:12px">${esc(L.msg)}</div>`:''}</div>
  ${installHint()}
  <div class="tiny muted" style="text-align:center;padding:4px 10px">你的訓練資料只有你自己看得到。</div>`;
}
function installHint(){
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone;
  if(standalone)return '';
  return `<div class="card small"><b>📲 加到主畫面，像 App 一樣使用</b><div class="muted" style="margin-top:4px">${ios?'在 Safari 按下方的「分享」按鈕（方框加向上箭頭），往下滑選「加入主畫面」。':'在瀏覽器選單選「加到主畫面」或「安裝應用程式」。'}</div></div>`;
}

/* ---------- analytics ---------- */
function exHistory(name){
  return S.workouts.filter(w=>w.ex.some(e=>e.name===name)).slice().reverse().map(w=>({date:w.date,e:w.ex.find(e=>e.name===name)}));
}
const e1rm=e=>Math.max(0,...e.sets.filter(s=>s.w>0&&s.r>0&&unitOf(e)==='次').map(s=>s.w*(1+Math.min(s.r,12)/30)));
const vol=w=>w.ex.reduce((a,e)=>a+(unitOf(e)!=='次'?0:e.sets.reduce((b,s)=>b+(+s.w||0)*(+s.r||0),0)),0);
const incFor=(name,group,u)=>u==='lb'?(/啞鈴/.test(name)?5:group==='腿'?10:5):(/啞鈴/.test(name)?2:group==='腿'?5:2.5);
const lastUnit=name=>{const w=S.workouts.find(w=>w.ex.some(e=>e.name===name&&e.wu));return w?w.ex.find(e=>e.name===name&&e.wu).wu:null};
function progressHint(ex){
  const h=exHistory(ex.name);if(!h.length)return null;
  const last=h[h.length-1],e=last.e,max=ex.max||e.target?.max,min=ex.min||e.target?.min;
  const setsTxt=e.sets.map(s=>setTxt(e,s)).join('、');
  if(isTimeUnit(unitOf(e))){const tot=e.sets.reduce((a,s)=>a+(+s.r||0),0);return {txt:`上次 ${fmtD(last.date)}：${setsTxt}`,tip:unitOf(e)==='分鐘'?`這次試著多 2–5 分鐘，或維持時間但加快配速`:`每組多撐 5–10 秒，或縮短組間休息`,w:e.sets[0]&&e.sets[0].w||'',up:max&&e.sets.every(s=>s.r>=max)}}
  const u=ex.wu||e.wu||'kg';
  const topW=wIn(Math.max(0,...e.sets.map(s=>+s.w||0)),u);
  const allTop=max&&e.sets.length&&e.sets.every(s=>s.r>=max);
  const anyLow=min&&e.sets.some(s=>s.r<min);
  let tip,w=topW,up=false;
  if(allTop&&topW>0){w=+(topW+incFor(ex.name,ex.group,u)).toFixed(1);tip=`每組都達到 ${max} ${e.unit||'次'}，這次試 ${w} ${u}`;up=true}
  else if(allTop){tip=e.unit==='秒'?'每組都撐滿了，這次多撐 10 秒或換更難的變化':'次數都到頂了，試著加次數或換更難的變化';up=true}
  else if(anyLow){tip=`有組數低於 ${min} 次，維持 ${topW||'同樣'}${topW?' '+u:''}，先把次數練滿`}
  else tip=`維持 ${topW?topW+' '+u:'同樣強度'}，每組多做 1 下就是進步`;
  return {txt:`上次 ${fmtD(last.date)}：${setsTxt}`,tip,w,up};
}
function weekBuckets(n){
  const out=[];const m=monday(new Date());
  for(let i=n-1;i>=0;i--){const s=new Date(m);s.setDate(s.getDate()-7*i);const e=new Date(s);e.setDate(e.getDate()+7);
    const ws=S.workouts.filter(w=>{const d=parseD(w.date);return d>=s&&d<e});
    out.push({start:s,count:ws.length,vol:ws.reduce((a,w)=>a+vol(w),0),ws})}
  return out;
}
function setsByGroup(days){
  const r={};GROUPS.forEach(g=>r[g]=0);r.推=0;r.拉=0;
  S.workouts.filter(w=>daysAgo(w.date)<days).forEach(w=>w.ex.forEach(e=>{const g=groupOf(e);r[g]=(r[g]||0)+e.sets.length;
    const pu=e.pattern?PUSHP.has(e.pattern):(g==='胸'||g==='肩'),pl=e.pattern?PULLP.has(e.pattern):g==='背';if(pu)r.推+=e.sets.length;if(pl)r.拉+=e.sets.length}));
  return r;
}
function latestBW(){return S.bw.length?S.bw[S.bw.length-1].kg:(S.profile&&+S.profile.weight)||null}

function insights(){
  const out=[],p=effP(),W=S.workouts;
  if(!p)return [{lv:'tip',t:'先設定你的目標',b:'到「我的」填寫目標、程度、每週天數與器材，就能產生專屬訓練計畫。'}];
  const P=plan();
  if(!W.length)out.push({lv:'tip',t:'開始第一次訓練',b:'到「今日」按「開始訓練」，照計畫記錄重量和次數。記錄越多，這裡的建議就越準。'});
  if(p.level==='beg'&&p.days>=5)out.push({lv:'tip',t:'新手每週 3–4 天就很夠',b:'剛開始最大的進步來自動作熟練與規律。每週 3–4 次全身或上下肢分化，恢復更好、也更容易持續。'});
  if(W.length){
    const wk=monday(new Date());const n=new Set(W.filter(w=>parseD(w.date)>=wk).map(w=>w.date)).size;
    const dLeft=7-((new Date().getDay()+6)%7);
    if(n>=p.days)out.push({lv:'good',t:`本週已練 ${n}/${p.days} 天`,b:'目標達成！剩下的日子以休息、散步、伸展為主，讓身體吸收訓練成果。'});
    else if(p.days-n>dLeft)out.push({lv:'warn',t:`本週 ${n}/${p.days} 天，剩 ${dLeft} 天`,b:`這週排不滿也沒關係，別把兩次訓練硬塞在同一天。優先做還沒練到的部位：${P.slice(n).map(d=>d.name).join('、')}。`});
    else out.push({lv:'tip',t:`本週 ${n}/${p.days} 天`,b:`還有 ${p.days-n} 天要練，下一次建議練：${(P[n]||P[0]).name}。`});
    const gap=daysAgo(W[0].date);
    if(gap>=5)out.push({lv:'warn',t:`已經 ${gap} 天沒訓練`,b:'中斷後回來，第一次把重量降 10–20%、組數少一組，先找回節奏，下一次再回到原本強度。'});
    const g=setsByGroup(14);
    if(g.拉>0&&g.推/g.拉>1.4)out.push({lv:'tip',t:'推多拉少',b:`近兩週推 ${g.推} 組、拉 ${g.拉} 組。拉的動作（划船、下拉、面拉）至少和推一樣多，對肩膀健康和體態都比較好。`});
    else if(g.推>0&&g.拉===0)out.push({lv:'tip',t:'近兩週沒有拉的動作',b:'加入划船或引體向上，平衡胸肩前側的訓練量。'});
    GROUPS.filter(x=>x!=='二頭'&&x!=='三頭'&&x!=='體能').forEach(x=>{const lastD=S.workouts.find(w=>w.ex.some(e=>groupOf(e)===x));const gap2=lastD?daysAgo(lastD.date):null;
      if(gap2!=null&&gap2>=10)out.push({lv:'tip',t:`${x} 已經 ${gap2} 天沒練`,b:`每個部位一週至少練 1–2 次才能維持進步，下次開始訓練時記得選「${x}」。`})});
    const upper=(g.推+g.拉)/2;
    if(upper>=8&&g.腿<upper*0.6)out.push({lv:'tip',t:'腿部訓練量偏少',b:`近兩週腿 ${g.腿} 組，上半身平均 ${Math.round(upper)} 組。腿是全身最大的肌群，別跳過腿日。`});
    if(p.goal==='muscle'){
      const g7=setsByGroup(7);const low=['胸','背','腿'].filter(k=>g7[k]<10&&W.filter(w=>daysAgo(w.date)<7).length>=Math.min(p.days,3));
      if(low.length)out.push({lv:'tip',t:'增肌訓練量可以再多一點',b:`過去 7 天 ${low.map(k=>k+' '+g7[k]+' 組').join('、')}。增肌一般建議每個部位每週 10–20 組，可以每次多加 1 組。`});
      const hi=['胸','背','腿'].filter(k=>g7[k]>25);
      if(hi.length)out.push({lv:'warn',t:'訓練量偏高',b:`${hi.join('、')} 每週超過 25 組，如果覺得疲勞累積、表現下滑，先減量。`});
    }
    // progression
    const names=[...new Set(W.filter(w=>daysAgo(w.date)<21).flatMap(w=>w.ex.map(e=>e.name)))];
    const ready=[],stuck=[];
    names.forEach(nm=>{
      const h=exHistory(nm);const e=h[h.length-1].e;const mx=e.target&&e.target.max;
      if(mx&&e.sets.length&&e.sets.every(s=>s.r>=mx))ready.push(nm);
      if(h.length>=4){const vals=h.map(x=>e1rm(x.e));const last3=Math.max(...vals.slice(-3)),before=Math.max(...vals.slice(0,-3));if(before>0&&last3<=before)stuck.push(nm)}
    });
    if(ready.length)out.push({lv:'good',t:'可以加重了',b:`${ready.slice(0,5).join('、')} 上次每組都達到目標上限。下次上半身加 2–2.5 kg、下半身加 5 kg（啞鈴每邊 +2 kg）。`});
    if(stuck.length)out.push({lv:'tip',t:'這些動作停滯了',b:`${stuck.slice(0,4).join('、')} 最近 3 次都沒超越之前的最佳表現。可以試：①重量降 10% 重新往上推 ②改用不同次數範圍 ③換成相似的替代動作 ④檢查睡眠與蛋白質是否足夠。`});
    // deload
    const wb=weekBuckets(10);let streak=0;for(let i=wb.length-2;i>=0;i--){if(wb[i].count>=2)streak++;else break}
    if(streak>=6)out.push({lv:'tip',t:`已連續 ${streak} 週穩定訓練`,b:'很棒！可以安排一週減量（重量不變、組數減半，或重量降 30–40%），讓關節和神經系統恢復，之後通常會更強。'});
  }
  // bodyweight
  if(S.bw.length>=2){
    const last=S.bw[S.bw.length-1];const ref=S.bw.slice().reverse().find(x=>(parseD(last.d)-parseD(x.d))/864e5>=13);
    if(ref){const wks=(parseD(last.d)-parseD(ref.d))/864e5/7;const rate=(last.kg-ref.kg)/ref.kg/wks*100;const r=rate.toFixed(2);
      if(p.goal==='fatloss'){if(rate>-0.2)out.push({lv:'tip',t:`體重每週變化 ${r}%`,b:'減脂速度偏慢。每天少吃約 300–500 大卡，或增加日常步數（每天 8,000–10,000 步）通常就夠。'});
        else if(rate<-1)out.push({lv:'warn',t:`體重每週下降 ${Math.abs(rate).toFixed(2)}%`,b:'掉得有點快，容易流失肌肉。建議放慢到每週 0.5–1%，並確保蛋白質攝取足夠。'});
        else out.push({lv:'good',t:`減脂速度剛好（每週 ${r}%）`,b:'維持目前的飲食與訓練節奏。'});}
      if(p.goal==='muscle'){if(rate>0.5)out.push({lv:'tip',t:`體重每週增加 ${r}%`,b:'增重偏快，多出來的可能是脂肪。每週 0.25–0.5% 比較理想。'});
        else if(rate<0.05)out.push({lv:'tip',t:'體重幾乎沒增加',b:'增肌需要些微熱量盈餘，每天多吃約 200–300 大卡（例如一份點心＋一杯牛奶）。'});
        else out.push({lv:'good',t:`增重速度剛好（每週 +${r}%）`,b:'繼續保持，同時看主要動作重量有沒有一起進步。'});}
    }
  }
  const gs=S.goal&&S.goal.active?goalStatus(S.goal):null;
  if(gs&&gs.status==='behind')out.unshift({lv:'warn',t:'目標進度落後',b:`${S.goal.summary}：目前 ${gs.cur} kg，目標 ${gs.tgt} kg，剩 ${gs.left} 天。到「計畫」查看調整建議。`});
  else if(gs&&gs.status==='done')out.unshift({lv:'good',t:'目標達成 🎉',b:`${S.goal.summary} 已完成，可以到「計畫」設定下一個目標。`});
  else if(gs&&gs.status==='ok')out.unshift({lv:'good',t:'目標進度符合預期',b:`${S.goal.summary}：目前 ${gs.cur} kg，剩 ${gs.left} 天。`});
  const gn=S.goal&&S.goal.active&&S.goal.nutrition;
  if(gn&&gn.calories)out.push({lv:'tip',t:`每日熱量目標：${gn.calories} 大卡`,b:`依你的目標「${S.goal.summary}」計算。每週看平均體重，再以每次 150 大卡微調。`});
  const bw=latestBW();
  if(bw){const lo=Math.round(bw*1.6),hi=Math.round(bw*2.2);out.push({lv:'tip',t:`蛋白質目標：每天 ${lo}–${hi} g`,b:`以 ${bw} kg 計算（每公斤 1.6–2.2 g），分 3–4 餐吃。雞胸、蛋、豆腐、魚、乳製品都是好來源。`})}
  if(p.goal==='fatloss'||p.goal==='health')out.push({lv:'tip',t:'有氧怎麼排',b:p.goal==='fatloss'?'重訓後或休息日做 20–30 分鐘中等強度有氧（快走、飛輪、游泳），每週 2–4 次。重訓仍是保住肌肉的關鍵，別用有氧取代。':'每週累積 150 分鐘中等強度有氧（能講話但無法唱歌的強度），可以拆成每天 20–30 分鐘。'});
  out.push({lv:'tip',t:'恢復的基本盤',b:'每晚睡 7–9 小時；同一個部位間隔 48 小時再練；任何關節刺痛就停止該動作，持續疼痛請找醫師或物理治療師。'});
  return out;
}

/* ---------- goals ---------- */
const CN={零:0,一:1,二:2,兩:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
function cnNum(s){if(!s)return NaN;if(/^\d+(\.\d+)?$/.test(s))return +s;if(s==='半')return 0.5;const m=s.match(/^([一二兩三四五六七八九])?(十)?([一二三四五六七八九])?$/);if(!m||(!m[1]&&!m[2]&&!m[3]))return NaN;if(!m[2])return CN[m[1]||m[3]];return (m[1]?CN[m[1]]:1)*10+(m[3]?CN[m[3]]:0)}
const NUMRE='(\\d+(?:\\.\\d+)?|[一二兩三四五六七八九十半]+)';
function parseGoal(text){
  const t=text.replace(/\s+/g,' ').trim();let kg=null,abs=null,m;
  const UNIT='\\s*(公斤|kg|KG|Kg|斤|lbs|lb|LBS|LB|Lbs|磅)';
  const toK=(n,u)=>cnNum(n)*(u==='斤'?0.6:/lb|磅/i.test(u)?0.45359237:1);
  if((m=t.match(new RegExp('(?:到|至)\\s*'+NUMRE+UNIT))))abs=toK(m[1],m[2]);
  if((m=t.match(new RegExp(NUMRE+UNIT))))kg=toK(m[1],m[2]);
  let weeks=null;
  if(/半年/.test(t))weeks=26;
  else if((m=t.match(new RegExp(NUMRE+'\\s*(個?月|週|周|星期|禮拜|天|年)')))){const n=cnNum(m[1]),u=m[2];weeks=/月/.test(u)?n*4.345:/年/.test(u)?n*52:/天/.test(u)?n/7:n}
  const lm=t.match(/(啞鈴|槓鈴)?(臥推|深蹲|硬舉|肩推|引體)/);const lift=lm?[lm[0],lm[0]]:null;
  let liftKg=null;if(lm){const after=t.slice(lm.index);const mm=after.match(new RegExp(NUMRE+UNIT));if(mm)liftKg=r1(toK(mm[1],mm[2]))}
  let type='general';
  if(/增重|增肌|變壯|長肉|變胖|胖|bulk/i.test(t))type='gain';
  else if(/減重|減肥|減脂|瘦|減|cut|體脂/i.test(t))type='loss';
  if(lift&&liftKg&&!/增重|減重/.test(t)){type='lift';kg=liftKg}
  if(type==='general'&&/跑|耐力|體能|心肺|體測|馬拉松|有氧|游泳/.test(t))type='endurance';
  return {type,kg:Number.isFinite(kg)?kg:null,abs:Number.isFinite(abs)?abs:null,weeks:Number.isFinite(weeks)&&weeks>0?Math.round(weeks*10)/10:null,lift:lift?lift[1]:null};
}
const fmtWeeks=W=>W>=4&&Math.abs(W/4.345-Math.round(W/4.345))<0.15?Math.round(W/4.345)+' 個月':Math.round(W)+' 週';
function tdee(p,bw){const act=p.days<=3?1.45:p.days<=5?1.55:1.65;
  if(p.height&&p.age){const s=p.sex==='m'?5:p.sex==='f'?-161:-78;return Math.round((10*bw+6.25*p.height-5*p.age+s)*act/10)*10}
  return Math.round(bw*(p.days<=3?30:p.days<=5?32:34)/10)*10}
function bestE1RM(sub){let b=0;S.workouts.forEach(w=>w.ex.forEach(e=>{if(e.name.includes(sub))b=Math.max(b,e1rm(e))}));return b?Math.round(b):null}
const r1=x=>Math.round(x*10)/10;
function ruleGoal(text){
  const p=S.profile,pg=parseGoal(text),bw=latestBW();
  const W=pg.weeks||(pg.type==='gain'||pg.type==='loss'?12:8);
  const today=ds(new Date()),dl=ds(new Date(Date.now()+W*7*864e5));
  const g={text,source:'rule',created:today,active:true,track:'adj',weeks:W,type:pg.type,base_goal:p.goal,phases:[],tips:[],nutrition:null,metric:null,schedule:null,feasible:'realistic',adjusted_target:''};
  const T0=bw?tdee(p,bw):null;
  if(bw)g.nutrition={calories:T0,tdee:T0,protein_g:Math.round(bw*1.8),notes:['每餐都有一份蛋白質（掌心大小）','訓練前後 2 小時內吃一餐含碳水與蛋白質']};
  if(pg.type==='gain'||pg.type==='loss'){
    if(!bw)return {needWeight:true};
    const gain=pg.type==='gain';
    let A=pg.abs!=null?Math.abs(pg.abs-bw):pg.kg;
    if(A==null)A=r1(bw*(gain?0.004:0.0075)*W);
    const hi=gain?0.005:0.01,ok=gain?0.004:0.0075;
    const maxA=bw*hi*W,okA=r1(bw*ok*W);
    const feas=A<=maxA?'realistic':A<=maxA*1.6?'aggressive':'unrealistic';
    const adjA=feas==='unrealistic'?okA:r1(A);const needW=Math.ceil(A/(bw*ok));
    const tgt=r1(gain?bw+A:bw-A),adjT=r1(gain?bw+adjA:bw-adjA);
    g.base_goal=gain?'muscle':'fatloss';
    g.summary=`${fmtWeeks(W)}內${gain?'增重':'減重'} ${r1(A)} kg（${bw} → ${tgt} kg）`;
    g.feasible=feas;
    const perW=r1(A/W*10)/10;
    g.assessment=feas==='realistic'?`每週約 ${(A/W).toFixed(2)} kg（體重的 ${(A/W/bw*100).toFixed(1)}%），在健康的範圍內，${gain?'增加的重量能以肌肉為主':'能減脂同時保住肌肉'}。`
      :feas==='aggressive'?`每週 ${(A/W).toFixed(2)} kg 偏快，做得到但${gain?'多出來的會有較多脂肪':'容易流失肌肉、精神和訓練表現變差'}。建議放慢一點或延長時間。`
      :`${fmtWeeks(W)}${gain?'增':'減'} ${r1(A)} kg 等於每週 ${(A/W).toFixed(1)} kg，遠超過身體${gain?'長肌肉':'安全減脂'}的速度（每週約體重的 ${gain?'0.25–0.5':'0.5–1'}%，以你來說是 ${r1(bw*(gain?0.0025:0.005))}–${r1(bw*hi)} kg）。${gain?'硬吃到這個數字，增加的大多是脂肪和水分，健康風險也高':'這樣減掉的會有大量肌肉和水分，也很容易復胖'}。`;
    g.adjusted_target=feas==='unrealistic'?`${fmtWeeks(W)}${gain?'增':'減'} ${adjA} kg（到 ${adjT} kg），或花約 ${needW} 週（${(needW/4.345).toFixed(1)} 個月）達成 ${r1(A)} kg`:'';
    g.metric={type:'weight',start:bw,target:adjT,origTarget:tgt,unit:'kg',startDate:today,deadline:dl};
    const rate=adjA/W,kcal=Math.round(Math.min(gain?500:750,Math.max(gain?250:300,rate*7700/7))/10)*10;
    g.nutrition={calories:gain?T0+kcal:Math.max(p.sex==='m'?1500:1200,T0-kcal),tdee:T0,protein_g:Math.round(bw*(gain?1.8:2.0)),
      notes:gain?['碳水每公斤體重 4–6 g，支撐訓練和恢復','吃不下時用液體熱量：牛奶、豆漿、香蕉燕麥奶昔','每週平均體重增加太快（> 0.5%）就每天少 150 大卡；太慢就多 150–200 大卡']
        :['蛋白質吃足，減脂期才能保住肌肉','先從含糖飲料、宵夜、油炸下手，最容易減少熱量','每週平均體重沒變化就每天再少 150 大卡，或多走 3,000 步']};
    g.phases=gain?[{weeks:'第 1–2 週',focus:'把飯吃到目標',details:'每天固定 4–5 餐，先讓熱量穩定達標；訓練以熟練動作為主，每組保留 2–3 下餘力。'},{weeks:'第 3–6 週',focus:'漸進加重',details:'主要動作每週嘗試加重或加次數；每週量 3 次體重取平均，依增加速度微調熱量。'},{weeks:'第 7 週後',focus:'穩定累積',details:'每 4–6 週安排一週減量；確認體重和主項重量同步上升，代表長的是肌肉。'}]
      :[{weeks:'第 1–2 週',focus:'建立熱量赤字',details:'記錄飲食、把熱量控制到目標；重訓維持強度，不要因為減脂就改輕重量。'},{weeks:'第 3–8 週',focus:'穩定減脂',details:'每週減體重的 0.5–1%；加入 2–4 次有氧或每天 8,000–10,000 步。'},{weeks:'之後',focus:'調整與維持',details:'停滯 2 週以上再微調熱量；接近目標時逐步把熱量加回維持量，避免復胖。'}];
    g.tips=gain?['睡前一杯牛奶或一份優格，輕鬆多 150–250 大卡','每次訓練盡量比上次多 1 下或多 1 kg','每晚睡 7–9 小時，肌肉是在休息時長的']:['蛋白質和蔬菜先吃，比較有飽足感','重訓重量盡量維持，這是保住肌肉的訊號','不要每天看體重波動，看每週平均'];
  }else if(pg.type==='lift'){
    const cur=bestE1RM(pg.lift),tgt=pg.kg;g.base_goal='strength';
    g.summary=`${fmtWeeks(W)}內${pg.lift} ${tgt} kg`;
    if(cur){const wk=(tgt-cur)/cur/W;g.feasible=wk<=0.01?'realistic':wk<=0.02?'aggressive':'unrealistic';
      g.assessment=`目前${pg.lift}估計 1RM 約 ${cur} kg，需要提升 ${r1(tgt-cur)} kg（每週約 ${(wk*100).toFixed(1)}%）。`+(g.feasible==='realistic'?'照計畫穩定加重做得到。':g.feasible==='aggressive'?'有挑戰性，新手比較有機會，中階以上要很穩定。':'以一般進步速度來說太快了。');
      if(g.feasible==='unrealistic')g.adjusted_target=`${fmtWeeks(W)}內 ${Math.round(cur*(1+0.01*W)/2.5)*2.5} kg，或花約 ${Math.ceil((tgt-cur)/cur/0.01)} 週達成 ${tgt} kg`;}
    else{g.feasible='realistic';g.assessment=`還沒有${pg.lift}的紀錄。先照計畫練 1–2 週，系統就能根據你的估計 1RM 判斷進度。`}
    g.metric={type:'lift',exercise:pg.lift,start:cur,target:tgt,origTarget:tgt,unit:'kg',startDate:today,deadline:dl};
    g.phases=[{weeks:'第 1–3 週',focus:'技術與基礎量',details:`${pg.lift}每週練 2 次，5×5 左右，重量控制在約 75–80% 1RM，專注動作一致。`},{weeks:'第 4–7 週',focus:'提高強度',details:'主組改成 4×3–4，重量 80–88%；輔助動作補強弱點。'},{weeks:'最後 1–2 週',focus:'減量與測試',details:'組數減半、保持強度，測試前 3–4 天只做輕量；再測試單次最大重量。'}];
    g.tips=['每次測試前充分熱身，漸進加重到大重量','大重量一定要有保護或安全槓','睡眠和熱量不足時，力量很難進步'];
  }else if(pg.type==='endurance'){
    g.base_goal='health';g.summary=text;g.assessment='依你的時間安排漸進增加有氧量，每週總量增加不超過 10%，搭配重訓維持肌力與預防受傷。';
    g.phases=[{weeks:'第 1–3 週',focus:'打底',details:'每週 3 次輕鬆有氧 20–30 分鐘，能邊跑邊講話的強度。'},{weeks:'第 4–6 週',focus:'加入強度',details:'每週 1 次間歇（例如 400 m × 6），其他保持輕鬆。'},{weeks:'最後 2 週',focus:'模擬與調整',details:'做一次完整距離模擬，最後一週減量保持狀態。'}];
    g.tips=['80% 的有氧用輕鬆強度，20% 才是高強度','跑鞋合腳很重要','腿部重訓能減少跑步受傷'];
  }else{g.summary=text;g.assessment='已依你的描述和目前設定排出計畫。目標越具體（多少公斤、多久、哪個動作），評估就越準。';g.tips=['把目標寫成可衡量的數字和期限，更容易追蹤']}
  return g;
}
const str=v=>typeof v==='string'?v.trim().slice(0,600):'';
const strArr=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'&&x.trim()).slice(0,6).map(x=>x.slice(0,200)):[];
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function patternOf(name){for(const k in LIB){const n=LIB[k].n;if([...n.gym,...n.db,...n.bw].includes(name))return k}return ''}
function cleanSchedule(arr){
  if(!Array.isArray(arr)||!arr.length)return null;
  const days=arr.slice(0,7).map(d=>({weekday:Number.isInteger(+d.weekday)&&+d.weekday>=0&&+d.weekday<=6?+d.weekday:null,name:String(d.name||'訓練').slice(0,24),
    ex:(Array.isArray(d.exercises)?d.exercises:[]).slice(0,10).map(e=>{const name=String(e&&e.name||'').trim().slice(0,30);if(!name)return null;
      const pat=patternOf(name),unit=['次','秒','分鐘'].includes(e.unit)?e.unit:'次';
      let min=clamp(+e.min||(unit==='分鐘'?20:8),1,600),max=clamp(+e.max||min,1,600);if(max<min)[min,max]=[max,min];
      return {name,pattern:pat,group:GROUPS.includes(e.part)?e.part:(pat?LIB[pat].g:'腹'),unit,sets:clamp(Math.round(+e.sets||3),1,10),min,max,rest:clamp(Math.round(Number.isFinite(+e.rest)&&e.rest!==''&&e.rest!=null?+e.rest:(unit==='分鐘'?0:90)),0,600)}}).filter(Boolean)})).filter(d=>d.ex.length);
  if(!days.length)return null;
  const used=new Set(),def=WEEKDAYS[days.length]||[1,2,3,4,5,6,0];
  days.forEach(d=>{if(d.weekday==null||used.has(d.weekday))d.weekday=def.find(x=>!used.has(x))??[1,2,3,4,5,6,0].find(x=>!used.has(x));used.add(d.weekday)});
  return days.sort((a,b)=>((a.weekday+6)%7)-((b.weekday+6)%7));
}
function parseJSON(t){try{return JSON.parse(t)}catch(e){}const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e){}}return null}
function mergeAI(base,j){
  if(!j||typeof j!=='object')return {...base,note:'AI 回覆格式有誤，先用內建規則產生計畫。'};
  const n=j.nutrition||{},bn=base.nutrition||{};
  const cal=+n.calories>=1000&&+n.calories<=6000?Math.round(+n.calories/10)*10:(bn.calories??null);
  const pro=+n.protein_g>=30&&+n.protein_g<=400?Math.round(+n.protein_g):(bn.protein_g??null);
  const ph=Array.isArray(j.phases)?j.phases.slice(0,5).map(x=>({weeks:str(x&&x.weeks),focus:str(x&&x.focus),details:str(x&&x.details)})).filter(x=>x.focus||x.details):[];
  return {...base,source:'ai',summary:str(j.summary)||base.summary,feasible:['realistic','aggressive','unrealistic'].includes(j.feasible)?j.feasible:base.feasible,
    assessment:str(j.assessment)||base.assessment,adjusted_target:j.feasible==='realistic'?'':(str(j.adjusted_target)||base.adjusted_target),base_goal:GOAL[j.base_goal]?j.base_goal:base.base_goal,
    nutrition:(cal||pro||bn.tdee)?{calories:cal,tdee:bn.tdee||null,protein_g:pro,notes:strArr(n.notes).length?strArr(n.notes):(bn.notes||[])}:null,
    phases:ph.length?ph:base.phases,tips:strArr(j.tips).length?strArr(j.tips):base.tips,schedule:cleanSchedule(j.schedule)};
}
function goalPrompt(text,base){
  const p=S.profile,bw=latestBW();
  const lib=GROUPS.map(g=>g+'：'+[...new Set(Object.keys(LIB).filter(k=>LIB[k].g===g).flatMap(k=>options(k,p.equip)))].join('、')).join('\n');
  const recent=S.workouts.filter(w=>daysAgo(w.date)<28).slice(0,12).map(w=>`${w.date} ${w.name}：`+w.ex.map(e=>e.name+' '+e.sets.map(s=>setTxt(e,s)).join('/')).join('；')).join('\n');
  const ref={類型:base.type,可行性初判:base.feasible,初判說明:base.assessment,建議目標:base.adjusted_target||'無',週數:base.weeks,估計每日消耗熱量:base.nutrition&&base.nutrition.tdee,建議熱量:base.nutrition&&base.nutrition.calories,建議蛋白質g:base.nutrition&&base.nutrition.protein_g};
  return `你是專業的肌力與體能教練兼運動營養師。根據使用者的目標規劃訓練計畫。只輸出一個 JSON 物件，不要任何其他文字、說明或 Markdown 程式碼框。

使用者目標原文：「${text}」
使用者資料：體重 ${bw||'未提供'} kg；身高 ${p.height||'未提供'} cm；年齡 ${p.age||'未提供'}；性別 ${p.sex==='m'?'男':p.sex==='f'?'女':'未提供'}；經驗 ${LEVEL[p.level]}；器材 ${EQUIP[p.equip]}；每週可練 ${p.days} 天
近 4 週訓練：${recent||'無紀錄'}
系統參考計算（數字請以此為基礎，不要偏離太多）：${JSON.stringify(ref)}

原則：誠實評估可行性。不健康或不切實際的目標（例如一個月增重 10 公斤）要明白說明原因與風險，給更合理的替代目標，但仍提供能安全朝目標前進的計畫。不做醫療診斷。全部用繁體中文（台灣用語）。

JSON 格式：
{"summary":"一句話重述目標","feasible":"realistic 或 aggressive 或 unrealistic","assessment":"2–3 句評估與原因","adjusted_target":"建議的替代目標，一句話；可行則空字串","base_goal":"muscle 或 strength 或 fatloss 或 health",
"nutrition":{"calories":每日熱量數字,"protein_g":每日蛋白質克數,"notes":["2–4 條具體飲食建議"]},
"phases":[{"weeks":"第 1–2 週","focus":"重點","details":"具體做法一句話"}],
"schedule":[{"weekday":1,"name":"這天的名稱","exercises":[{"name":"動作名稱","part":"胸/背/肩/二頭/三頭/腿/腹/體能 其中一個","sets":4,"min":6,"max":10,"unit":"次 或 秒 或 分鐘","rest":120}]}],
"tips":["3–5 條實用建議"]}

schedule 共 ${p.days} 天（weekday：0=週日、1=週一 … 6=週六），同部位不要連續兩天；每天 4–8 個動作，大肌群複合動作排前面；有氧動作 unit 用「分鐘」、sets 用 1。phases 2–4 段。
動作請優先從下列清單挑選（使用者器材：${EQUIP[p.equip]}）：
${lib}`;
}
async function makeGoal(){
  const ta=$('#goalText');const text=(ta&&ta.value||'').trim();if(!text){toast('請描述你的目標');return}
  S.goalDraft=text;S.goalErr='';
  const bi=$('#goalBW');if(bi&&+bi.value>20&&+bi.value<400){const d=ds(new Date()),kg=+bi.value;S.bw=[...S.bw.filter(x=>x.d!==d),{d,kg}].sort((a,b)=>a.d<b.d?-1:1);await put('bodyweight',{entries:S.bw})}
  const base=ruleGoal(text);
  if(base.needWeight){S.goalErr='這個目標需要你目前的體重才能評估，請先填入。';render(true);return}
  let g=base;
  if(S.sample){
    S.goalBusy=true;render(true);
    try{const r=await S.sample(goalPrompt(text,base),{kind:'plan'});g=mergeAI(base,parseJSON(r.text||''))}
    catch(e){g={...base,note:'AI 暫時無法使用，先用內建規則產生計畫。'+(e&&e.message?'（'+String(e.message).slice(0,100)+'）':'')};if(e&&e.code==='not_granted')S.sample=null}
    S.goalBusy=false;
  }
  S.goal=g;S.goalEdit=false;put('goal',g);toast('目標計畫已產生 🎯');S.tab='plan';LS.set('ft-tab','plan');render(true);window.scrollTo(0,0);
}
function effP(){const p=S.profile,g=S.goal;if(!p)return p;if(!(g&&g.active))return p;return {...p,goal:g.base_goal||p.goal,days:g.schedule?clamp(g.schedule.length,2,6):p.days}}
function goalPlanDays(g){return g.schedule.map((d,i)=>({idx:i,key:'G'+i,name:d.name,weekday:d.weekday,custom:true,ex:d.ex.map(e=>({...e,swapKey:null,alts:0}))}))}
function goalStatus(g){
  const m=g&&g.metric;if(!m)return null;
  const tgt=g.track==='orig'?m.origTarget:m.target;
  const cur=m.type==='weight'?latestBW():bestE1RM(m.exercise);
  const t0=parseD(m.startDate),t1=parseD(m.deadline),tot=Math.max(1,(t1-t0)/864e5),el=clamp((today0()-t0)/864e5,0,tot),left=Math.max(0,Math.round(tot-el));
  if(cur==null||m.start==null)return {tgt,cur,left,pct:0,status:'none'};
  const span=tgt-m.start||1e-9,pct=clamp((cur-m.start)/span,0,1),exp=el/tot;
  const lag=(cur-(m.start+span*exp))/span;
  const status=pct>=1?'done':el<7?'early':lag<-0.15?'behind':lag>0.25&&m.type==='weight'?'fast':'ok';
  return {tgt,cur,left,pct,exp,status};
}
const FEAS={realistic:['可行','var(--ok)','var(--okbg)'],aggressive:['偏激進','var(--warn)','var(--warnbg)'],unrealistic:['不切實際','#d23c3c','color-mix(in srgb,#d23c3c 14%,var(--card))']};
function progressHTML(g){
  const s=goalStatus(g);if(!s)return '';const m=g.metric;
  const label=m.type==='weight'?'體重':m.exercise+' 估計 1RM';
  const msg={none:m.type==='weight'?'到「月曆」記錄體重後就能追蹤進度。':`練過${m.exercise}後就能追蹤進度。`,early:'剛開始，先穩定執行一週再看趨勢。',ok:'進度符合預期，繼續保持！',behind:m.type==='weight'?(g.type==='gain'?'進度落後，每天再多吃 150–200 大卡。':'進度落後，每天再少 150 大卡或多走 3,000 步。'):'進度落後，檢查睡眠、熱量和是否每次都有漸進加重。',fast:g.type==='gain'?'增加得比預期快，可能長了較多脂肪，每天少 150 大卡。':'掉得比預期快，小心流失肌肉，每天多吃 150 大卡。',done:'🎉 已達成目標！可以設定下一個目標。'}[s.status];
  const alt=m.origTarget!==m.target?`<button class="btn sm ghost" data-act="goalTrack">${g.track==='orig'?'改用建議目標 '+m.target:'改用原本目標 '+m.origTarget} kg</button>`:'';
  return `<div style="margin-top:12px"><div class="row between small"><span>${label}：<b>${s.cur??'—'}</b>${s.cur!=null?' kg':''}</span><span>目標 <b>${s.tgt}</b> kg · 剩 ${s.left} 天</span></div>
  <div class="pbar" style="grid-template-columns:1fr;margin:6px 0"><span class="tr" style="position:relative"><i style="width:${s.pct*100}%;background:var(--acc)"></i>${s.exp!=null?`<b style="position:absolute;top:-2px;bottom:-2px;left:${clamp(s.exp,0,1)*100}%;width:2px;background:var(--ink);opacity:.5"></b>`:''}</span></div>
  <div class="tiny muted">${m.start!=null?`起點 ${m.start} kg · `:''}截止 ${fmtD(m.deadline)}${s.exp!=null?' · 黑線＝目前應達進度':''}</div>
  <div class="hint ${s.status==='ok'||s.status==='done'?'':'neutral'}">${esc(msg)}</div>${alt}</div>`;
}
function goalCard(){
  if(S.goalBusy)return `<div class="card"><h2>🎯 正在規劃你的目標計畫…</h2><div class="small muted">AI 正在評估可行性、排課表和飲食，大約需要 20–40 秒。</div></div>`;
  const g=S.goal;
  if(!g||S.goalEdit){const needBW=!latestBW();
    return `<div class="card"><h2>🎯 你的目標是什麼？</h2><div class="small muted">用一句話描述就好，例如期限、想增減幾公斤、想舉多重。會先評估可不可行，再排出專屬課表、飲食和階段安排，並追蹤進度。</div>
    <textarea class="tx" id="goalText" style="margin-top:10px" placeholder="例如：一個月內增重 10 公斤">${esc(S.goalDraft||'')}</textarea>
    <div class="chips">${['一個月內增重 10 公斤','3 個月減脂 5 公斤','半年內臥推 100 公斤','2 個月後體測跑 3000 公尺','想練出明顯的腹肌'].map(q=>`<button class="chipbtn" data-act="goalEx" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    ${needBW?`<label class="fl">目前體重 kg（增重、減重目標需要）</label><input class="tx" id="goalBW" type="number" step="0.1" inputmode="decimal" placeholder="例如 65">`:''}
    ${S.goalErr?`<div class="banner" style="margin-top:10px">${esc(S.goalErr)}</div>`:''}
    <div class="spacer"></div><button class="btn acc block" data-act="goalGo">產生我的目標計畫</button>${g?`<div class="spacer"></div><button class="btn ghost block" data-act="goalCancel">取消</button>`:''}</div>`}
  const f=FEAS[g.feasible]||FEAS.realistic,n=g.nutrition;
  let h=`<div class="card"><div class="row between"><span class="small muted">🎯 我的目標${g.active?'':'（已暫停）'}</span><span class="badge" style="background:${f[2]};color:${f[1]};font-weight:700">${f[0]}</span></div>
  <h2 style="margin:6px 0">${esc(g.summary||g.text)}</h2>${g.summary&&g.summary!==g.text?`<div class="tiny muted">原文：${esc(g.text)}</div>`:''}
  <p class="small" style="margin:8px 0 0">${esc(g.assessment)}</p>
  ${g.adjusted_target?`<div class="hint" style="background:var(--warnbg);color:var(--warn)">建議目標：${esc(g.adjusted_target)}</div>`:''}
  ${g.note?`<div class="tiny muted" style="margin-top:6px">${esc(g.note)}</div>`:''}
  ${progressHTML(g)}
  <div class="row wrap" style="margin-top:12px"><button class="btn sm" data-act="goalEdit">重新設定目標</button><button class="btn sm ghost" data-act="goalToggle">${g.active?'改用標準計畫':'改回目標計畫'}</button>
  ${S.confirmDel==='goal'?`<button class="btn sm danger" data-act="goalDel">確定刪除</button>`:`<button class="btn sm ghost danger" data-act="goalAskDel">刪除</button>`}</div></div>`;
  if(n&&(n.calories||n.protein_g))h+=`<div class="card"><h2>🍚 每日飲食目標</h2><div class="grid3"><div class="stat"><b>${n.calories||'—'}</b><span>大卡</span></div><div class="stat"><b>${n.protein_g||'—'}<small style="font-size:12px"> g</small></b><span>蛋白質</span></div><div class="stat"><b>${n.tdee||'—'}</b><span>估計消耗</span></div></div>
  ${(n.notes||[]).length?`<ul class="small" style="margin:10px 0 0;padding-left:18px">${n.notes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<div class="tiny muted" style="margin-top:6px">熱量為估算值${S.profile.height&&S.profile.age?'':'（到「我的」填身高、年齡、性別會更準）'}，依每週體重變化微調。</div></div>`;
  if((g.phases||[]).length)h+=`<div class="card"><h2>📅 階段安排</h2>${g.phases.map(x=>`<div style="padding:8px 0;border-top:1px solid var(--line)"><div class="tiny" style="color:var(--acc);font-weight:700">${esc(x.weeks)}</div><b>${esc(x.focus)}</b><div class="small muted">${esc(x.details)}</div></div>`).join('')}</div>`;
  if((g.tips||[]).length)h+=`<div class="card"><h2>💡 給你的建議</h2><ul class="small" style="margin:0;padding-left:18px">${g.tips.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
  return h;
}

/* ---------- session ---------- */
let sessT=null,sessBusy=false,sessAgain=false;
function saveSession(){
  if(!S.session)return;S.session.upd=Date.now();LS.set(SK(),S.session);
  if(S.mode!=='cloud')return;clearTimeout(sessT);sessT=setTimeout(flushSession,700);
}
async function flushSession(){
  if(sessBusy){sessAgain=true;return}
  if(!S.session||S.mode!=='cloud')return;
  sessBusy=true;const snap=JSON.parse(JSON.stringify(S.session));
  try{await S.col.doc('session').set(snap);S.sessSaved=Date.now();const el=document.getElementById('savedot');if(el)el.textContent='☁︎ 已自動儲存'}
  catch(e){const el=document.getElementById('savedot');if(el)el.textContent='⚠︎ 雲端暫存失敗，已存在本機'}
  sessBusy=false;if(sessAgain){sessAgain=false;flushSession()}
}
function clearSessionStore(){clearTimeout(sessT);LS.del(SK());if(S.mode==='cloud'){S.col.doc('session').delete().catch(()=>{})}}
function adoptCloudSession(cs){
  if(!cs||!cs.id||!Array.isArray(cs.ex))return;
  if(S.workouts.some(w=>w.id===cs.id)){if(!S.session||S.session.id===cs.id){S.col.doc('session').delete().catch(()=>{})}return}
  if(S.session&&(S.session.upd||0)>=(cs.upd||0))return;
  const a=document.activeElement;if(S.session&&a&&a.closest&&a.closest('#view'))return;
  S.session=cs;LS.set(SK(),cs);startTick();
}
window.addEventListener('pagehide',()=>{if(S.session){LS.set(SK(),S.session);clearTimeout(sessT);flushSession()}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&S.session){LS.set(SK(),S.session);clearTimeout(sessT);flushSession()}});
function startSession(dayIdx,parts){
  const P=plan();const day=dayIdx==null?null:P[dayIdx];const p=effP()||{goal:'muscle',level:'int',equip:'gym',days:3};
  let ex=[],name='自訂訓練';
  if(day){ex=day.ex;name=day.name}
  else if(parts&&parts.length){ex=exForParts(parts,p);name=GROUPS.filter(g=>parts.includes(g)).join(' + ')}
  S.session={id:'w-'+Date.now(),date:ds(new Date()),name,parts:parts||[...new Set(ex.map(e=>e.group))],planDay:day?day.idx:null,
    started:Date.now(),pausedMs:0,pausedAt:null,ex:ex.map(mkSessEx)};
  S.picking=false;saveSession();S.tab='today';render(true);window.scrollTo(0,0);startTick();toast('開始計時 ⏱');
}
function mkSessEx(e){
  const wu=e.unit==='分鐘'?'kg':(lastUnit(e.name)||prefU());
  const h=progressHint({...e,wu});const w=h&&h.w?h.w:'';
  return {name:e.name,pattern:e.pattern,group:e.group,unit:e.unit,wu,target:{sets:e.sets,min:e.min,max:e.max,rest:e.rest},
    sets:Array.from({length:e.sets},()=>({w:(isBW(e.name)&&e.unit!=='分鐘')?'':w,r:'',done:false}))};
}
const elapsed=s=>Math.max(0,((s.pausedAt||Date.now())-s.started-(s.pausedMs||0))/1000);
const hms=sec=>{sec=Math.floor(sec);const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),x=sec%60;return (h?h+':'+pad(m):m)+':'+pad(x)};
const wMin=w=>w.dur?w.dur/60:(w.min||0);
const durTxt=w=>{const m=Math.round(wMin(w));return m>=60?Math.floor(m/60)+' 小時 '+(m%60)+' 分':m+' 分鐘'};
let tickInt;
function startTick(){clearInterval(tickInt);tickInt=setInterval(()=>{const el=document.getElementById('elapsed');if(el&&S.session)el.textContent=hms(elapsed(S.session))},1000)}
function finishSession(){
  const s=S.session;
  const ex=s.ex.map(e=>{const u=e.unit==='分鐘'?'kg':(e.wu||'kg');return {name:e.name,pattern:e.pattern||'',group:groupOf(e),unit:e.unit||'次',wu:u,target:e.target||null,
    sets:e.sets.filter(x=>+x.r>0).map(x=>({w:e.unit==='分鐘'?(+x.w||0):Math.round(((x._kg!=null&&String(x._w)===String(x.w))?x._kg:toKg(+x.w||0,u))*1000)/1000,r:+x.r}))}}).filter(e=>e.sets.length);
  if(!ex.length){toast('還沒有記錄任何一組（至少填入次數或時間）');return}
  const dur=Math.max(60,Math.round(elapsed(s)));
  const w={id:s.id,date:s.date,name:s.name,parts:[...new Set(ex.map(e=>e.group))],planDay:s.planDay,ts:Date.now(),start:s.started,dur,min:Math.round(dur/60),ex};
  S.workouts=sortW([w,...S.workouts.filter(x=>x.id!==w.id)]);
  put(w.id,w);S.session=null;clearSessionStore();S.rest=null;renderRest();clearInterval(tickInt);
  toast('訓練已儲存 💪 共 '+durTxt(w));S.tab='log';S.calSel=w.date;S.calM=null;S.openW=w.id;render(true);window.scrollTo(0,0);
}

/* ---------- rest timer ---------- */
let restInt;
function startRest(sec){S.rest={end:Date.now()+sec*1000};clearInterval(restInt);restInt=setInterval(renderRest,500);renderRest()}
function renderRest(){
  const el=$('#rest');
  if(!S.rest){el.innerHTML='';clearInterval(restInt);return}
  const left=Math.ceil((S.rest.end-Date.now())/1000);
  if(left<=0){el.innerHTML=`<div class="restbar"><div><div class="tiny">休息結束</div><b>開始下一組！</b></div><button class="btn sm" data-act="restStop">關閉</button></div>`;clearInterval(restInt);return}
  el.innerHTML=`<div class="restbar"><div><div class="tiny">組間休息</div><b>${Math.floor(left/60)}:${pad(left%60)}</b></div><div class="row"><button class="btn sm" data-act="restAdd">+30 秒</button><button class="btn sm" data-act="restStop">跳過</button></div></div>`;
}

/* ---------- views ---------- */
const ICONS={
 today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>',
 plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01"/></svg>',
 log:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/></svg>',
 coach:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.5L12 15l-1.8-4.5L5.5 9l4.7-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
 me:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'};
const TABN={today:'今日',plan:'計畫',log:'月曆',coach:'建議',me:'我的'};

function render(force){
  const a=document.activeElement;
  if(!force&&a&&a.matches&&a.matches('input,textarea,select')&&a.closest('#view')){S.pending=true;return}
  S.pending=false;
  $('#dateline').textContent=(()=>{const d=new Date();return (d.getMonth()+1)+' 月 '+d.getDate()+' 日 '+WD[d.getDay()]})();
  $('#modebadge').textContent=S.auth!=='in'?'':S.mode==='local'?'📱 本機':(S.banner?'⚠︎ 離線':'☁︎ 已同步');
  $('#banner').innerHTML=S.banner?`<div class="banner">${esc(S.banner)}</div>`:'';
  $('#tabs').innerHTML=Object.keys(TABN).map(k=>`<button class="${S.tab===k?'on':''}" data-act="tab" data-k="${k}">${ICONS[k]}${TABN[k]}</button>`).join('');
  const v=$('#view');
  document.body.classList.toggle('noauth',S.auth!=='in');
  if(S.auth==='loading'){v.innerHTML='<div class="empty">載入中…</div>';return}
  if(S.auth==='error'){v.innerHTML='<div class="card"><h2>無法連線</h2><div class="small muted">讀取不到 Firebase 設定。請確認網址正確、網路正常；如果你是架站的人，請確認已經用 firebase deploy 部署到 Firebase Hosting。</div><div class="spacer"></div><button class="btn" data-act="reload">重新整理</button></div>';return}
  if(S.auth==='out'){v.innerHTML=vLogin();return}
  if(!S.loaded){v.innerHTML='<div class="empty">載入你的訓練資料…</div>';return}
  v.innerHTML=({today:vToday,plan:vPlan,log:vLog,coach:vCoach,me:vMe}[S.tab]||vToday)();
}
document.addEventListener('focusout',()=>setTimeout(()=>{if(S.pending)render()},50));

function profileForm(p){
  p=p||{goal:'muscle',level:'beg',days:3,equip:'gym',weight:''};
  const seg=(name,map,val)=>`<div class="seg">${Object.entries(map).map(([k,l])=>`<input type="radio" name="${name}" id="${name}-${k}" value="${k}" ${String(val)===String(k)?'checked':''}><label for="${name}-${k}">${l}</label>`).join('')}</div>`;
  return `<form id="pform">
  <label class="fl">主要目標</label>${seg('goal',GOAL,p.goal)}
  <label class="fl">訓練經驗</label>${seg('level',LEVEL,p.level)}
  <label class="fl">每週可以練幾天</label>${seg('days',{2:'2 天',3:'3 天',4:'4 天',5:'5 天',6:'6 天'},p.days)}
  <label class="fl">可用器材</label>${seg('equip',EQUIP,p.equip)}
  <label class="fl">預設重量單位（訓練時每個動作也能各自切換）</label>${seg('wu',{kg:'公斤 kg',lb:'磅 lb'},p.wu||'kg')}
  <label class="fl">目前體重（kg，選填，用來算蛋白質）</label><input class="tx" name="weight" type="number" inputmode="decimal" step="0.1" value="${esc(p.weight||'')}" placeholder="例如 68">
  <label class="fl">選填：用來估算每日熱量</label><div class="row"><input class="tx" name="height" type="number" inputmode="decimal" placeholder="身高 cm" value="${esc(p.height||'')}"><input class="tx" name="age" type="number" inputmode="numeric" placeholder="年齡" value="${esc(p.age||'')}"></div>
  <div class="seg" style="margin-top:8px">${seg('sex',{m:'男',f:'女',x:'不填'},p.sex||'x').replace(/^<div class="seg">|<\/div>$/g,'')}</div>
  <div class="spacer"></div><button class="btn acc block" type="submit">${S.profile?'儲存並更新計畫':'產生我的訓練計畫'}</button>
  </form>`;
}

function vToday(){
  if(!S.profile)return `<div class="card hero"><div class="muted small">歡迎！</div><div class="big">先告訴我你的目標</div><div class="small muted">30 秒設定，馬上產生專屬訓練計畫。</div></div><div class="card">${profileForm()}</div>`;
  if(S.session)return vSession();
  if(S.picking)return vPick();
  const P=plan();const wd=new Date().getDay();const td=P.find(d=>d.weekday===wd);
  const doneToday=S.workouts.filter(w=>w.date===ds(new Date()));
  let h='';
  if(doneToday.length){const m=doneToday.reduce((a,w)=>a+wMin(w),0);h+=`<div class="card hero"><div class="muted small">今天</div><div class="big">已完成 ✓ ${esc(doneToday.map(w=>w.name).join('、'))}</div><div class="small muted">訓練 ${durTxt({min:m})} · ${doneToday.reduce((a,w)=>a+w.ex.length,0)} 個動作</div><div class="spacer"></div><button class="btn pri block" data-act="pick">再練一場</button></div>`}
  else if(td){h+=`<div class="card hero"><div class="muted small">今天計畫：${esc(td.name)}</div><div class="big">準備好了嗎？</div><div class="small muted">按下開始，先選今天要練的部位，接著自動計時。</div><div class="spacer"></div><button class="btn pri block" data-act="pick">開始訓練</button></div>`}
  else{const nx=nextDay(P);h+=`<div class="card hero"><div class="muted small">今天是休息日</div><div class="big">想動一動也可以</div><div class="small muted">下一次計畫：${WD[nx.weekday]} ${esc(nx.name)}。休息日適合做體能或腹部。</div><div class="spacer"></div><button class="btn pri block" data-act="pick">開始訓練</button></div>`}
  if(S.goal&&S.goal.active){const f=FEAS[S.goal.feasible]||FEAS.realistic;h+=`<div class="card" data-act="tab" data-k="plan" style="cursor:pointer"><div class="row between"><span class="small muted">🎯 我的目標</span><span class="badge" style="background:${f[2]};color:${f[1]};font-weight:700">${f[0]}</span></div><b>${esc(S.goal.summary||S.goal.text)}</b>${progressHTML(S.goal).replace(/<button[\s\S]*?<\/button>/g,'')}${S.goal.nutrition&&S.goal.nutrition.calories?`<div class="tiny muted" style="margin-top:6px">今日飲食：${S.goal.nutrition.calories} 大卡 · 蛋白質 ${S.goal.nutrition.protein_g} g</div>`:''}</div>`}
  else if(!S.goal)h+=`<div class="card" data-act="tab" data-k="plan" style="cursor:pointer"><b>🎯 有具體目標嗎？</b><div class="small muted">例如「3 個月減脂 5 公斤」，幫你評估可行性並排專屬課表 ›</div></div>`;
  const wk=weekBuckets(1)[0];const wkDays=new Set(wk.ws.map(w=>w.date)).size;
  const mo=ds(new Date()).slice(0,7);const moDays=new Set(S.workouts.filter(w=>w.date.startsWith(mo)).map(w=>w.date)).size;
  h+=`<div class="grid3" style="margin-bottom:12px"><div class="stat"><b>${wkDays}/${S.profile.days}</b><span>本週訓練天數</span></div><div class="stat"><b>${Math.round(wk.ws.reduce((a,w)=>a+wMin(w),0))}<small style="font-size:12px"> 分</small></b><span>本週總時間</span></div><div class="stat" data-act="tab" data-k="log" style="cursor:pointer"><b>${moDays}</b><span>本月天數 ›</span></div></div>`;
  if(td&&!doneToday.length){h+=`<div class="card"><h2>今日計畫預覽</h2><ul class="ex-list">${td.ex.map(e=>{const ph=progressHint(e);return `<li><div>${ptag(groupOf(e))}${esc(e.name)}${ph&&ph.up?' <span class="tiny" style="color:var(--ok)">▲ 可加重</span>':''}</div><span class="rx">${rxText(e)}</span></li>`}).join('')}</ul></div>`}
  const ins=insights().filter(x=>x.lv!=='tip'||/可以加重|停滯|本週|沒練/.test(x.t)).slice(0,2);
  if(ins.length)h+=ins.map(insCard).join('')+`<button class="btn ghost block" data-act="tab" data-k="coach">看全部建議 →</button>`;
  return h;
}
function lastTrained(g){const w=S.workouts.find(w=>w.ex.some(e=>groupOf(e)===g));if(!w)return '還沒練過';const d=daysAgo(w.date);return d===0?'今天':d===1?'昨天':d+' 天前'}
function openPicker(){
  const P=plan();const wd=new Date().getDay();const td=P.find(d=>d.weekday===wd);
  const done=new Set(S.workouts.filter(w=>w.date===ds(new Date())).flatMap(w=>w.ex.map(groupOf)));
  S.pick=td&&!done.size?[...new Set(td.ex.map(e=>e.group))]:[];
  S.picking=true;render(true);window.scrollTo(0,0);
}
function vPick(){
  const P=plan(),p=effP();const sel=S.pick||[];
  let h=`<div class="card"><h2 style="font-size:20px">今天要練什麼？</h2><div class="small muted">可以複選。選好後會依你的目標和器材自動排動作，並開始計時。</div>
  <div class="pickgrid">${GROUPS.map(g=>`<button class="pick ${sel.includes(g)?'on':''}" style="--pc:${PCOL[g]}" data-act="pickT" data-g="${g}"><span class="dot" style="background:${PCOL[g]}"></span>${g}<small>${lastTrained(g)}</small></button>`).join('')}</div>`;
  if(sel.length){const ex=exForParts(sel,p);const est=Math.round(ex.reduce((a,e)=>a+(e.unit==='分鐘'?e.min:e.sets*(0.75+e.rest/60)),0)+8);
    h+=`<div class="small muted" style="margin-bottom:4px">預計 ${ex.length} 個動作 · 約 ${est} 分鐘（開始後還可以增減）</div><ul class="ex-list">${ex.map(e=>`<li><div>${ptag(e.group)}${esc(e.name)}</div><span class="rx">${rxText(e)}</span></li>`).join('')}</ul><div class="spacer"></div>`}
  h+=`<button class="btn acc block" data-act="pickGo" ${sel.length?'':'disabled'} style="padding:14px;font-size:16px">${sel.length?'開始訓練 ⏱':'請先選擇部位'}</button></div>`;
  h+=`<div class="card"><h3>或直接照計畫練</h3><div class="row wrap" style="margin-top:8px">${P.map(d=>`<button class="btn sm" data-act="start" data-i="${d.idx}">${esc(d.name)}</button>`).join('')}</div>
  <div class="spacer"></div><button class="btn sm ghost" data-act="start" data-i="">空白開始，自己加動作</button></div>
  <button class="btn ghost block" data-act="pickCancel">取消</button>`;
  return h;
}
const estMin=d=>Math.round(d.ex.reduce((a,e)=>a+(e.unit==='分鐘'?e.min:e.sets*(0.75+e.rest/60)),0)+8);
const nextDay=P=>{const wd=new Date().getDay();for(let i=1;i<=7;i++){const f=P.find(d=>d.weekday===(wd+i)%7);if(f)return f}return P[0]};
const fmtVol=v=>{if(prefU()==='lb'){const l=v/LB;return l>=10000?(l/1000).toFixed(0)+'k lb':Math.round(l).toLocaleString()+' lb'}return v>=1000?(v/1000).toFixed(1)+' t':Math.round(v)+' kg'};

function vSession(){
  const s=S.session;const doneSets=s.ex.reduce((a,e)=>a+e.sets.filter(x=>x.done).length,0),total=s.ex.reduce((a,e)=>a+e.sets.length,0);
  const paused=!!s.pausedAt;
  let h=`<div class="card hero"><div class="muted small">${paused?'已暫停':'訓練進行中'} · ${fmtD(s.date)}</div><div class="big">${esc(s.name)}</div>
  <div class="row between" style="margin-top:6px"><div><div class="timer" id="elapsed">${hms(elapsed(s))}</div><div class="tiny muted">訓練時間</div></div><div style="text-align:right"><div class="big">${doneSets}/${total}</div><div class="tiny muted">完成組數</div></div></div>
  <div class="tiny muted" id="savedot" style="margin-top:6px">${S.mode==='cloud'?(S.sessSaved?'☁︎ 已自動儲存':'☁︎ 進度會自動儲存'):'📱 進度已自動存在手機'}</div>
  <div class="spacer"></div><button class="btn pri sm" data-act="pause">${paused?'▶ 繼續計時':'❚❚ 暫停'}</button></div>`;
  s.ex.forEach((e,i)=>{
    const t=e.target;const ph=progressHint({name:e.name,group:e.group,min:t&&t.min,max:t&&t.max,wu:e.wu||'kg'});const u=e.wu||'kg';
    const bw=isBW(e.name);
    h+=`<div class="card exc"><div class="row between"><div>${ptag(groupOf(e))}<span class="nm">${esc(e.name)}</span></div><div class="row" style="gap:4px">${e.unit!=='分鐘'?`<span class="useg"><button class="${u==='kg'?'on':''}" data-act="wu" data-e="${i}" data-u="kg">kg</button><button class="${u==='lb'?'on':''}" data-act="wu" data-e="${i}" data-u="lb">lb</button></span>`:''}<button class="btn sm ghost" data-act="exDel" data-e="${i}" aria-label="移除">✕</button></div></div>
    ${t?`<div class="small muted" style="margin-top:4px">${e.unit==='分鐘'?`目標 ${t.min}–${t.max} 分鐘，中等強度（能講話但無法唱歌）`:`目標 ${t.sets} 組 × ${t.min}–${t.max} ${e.unit||'次'} · 休息 ${t.rest} 秒`}</div>`:''}
    ${ph?`<div class="hint ${ph.up?'':'neutral'}">${esc(ph.txt)}<br>→ ${esc(ph.tip)}</div>`:''}
    <div class="colhd"><span>組</span><span>${e.unit==='分鐘'?'距離 km（選填）':bw?`負重 ${u}（選填）`:`重量 ${u}`}</span><span>${e.unit||'次'}</span><span></span></div>
    ${e.sets.map((x,j)=>`<div class="setrow ${x.done?'done':''}"><span class="n">${j+1}</span><input inputmode="decimal" type="number" step="0.5" data-in="w" data-e="${i}" data-s="${j}" value="${esc(x.w)}" placeholder="${e.unit==='分鐘'?'km':bw?'0':u}"><input inputmode="numeric" type="number" data-in="r" data-e="${i}" data-s="${j}" value="${esc(x.r)}" placeholder="${t?t.min+'–'+t.max:''}"><button class="ck" data-act="ck" data-e="${i}" data-s="${j}" aria-label="完成這組">✓</button></div>`).join('')}
    <div class="row" style="margin-top:10px"><button class="btn sm" data-act="setAdd" data-e="${i}">＋ 加一組</button>${e.sets.length>1?`<button class="btn sm ghost" data-act="setDel" data-e="${i}">－ 刪最後一組</button>`:''}</div></div>`;
  });
  const all=Object.entries(LIB).map(([k,v])=>({k,g:v.g,names:[...new Set([...v.n.gym,...v.n.db,...v.n.bw])]}));
  h+=`<div class="card"><h2>加入動作</h2><select class="tx" id="addSel">${GROUPS.map(g=>`<optgroup label="${g}">${all.filter(x=>x.g===g).flatMap(x=>x.names.map(n=>`<option value="${x.k}|${esc(n)}">${esc(n)}</option>`)).join('')}</optgroup>`).join('')}</select>
  <div class="row" style="margin-top:8px"><button class="btn sm" data-act="exAdd">加入</button></div>
  <label class="fl">或輸入自訂動作</label><div class="row"><input class="tx" id="custName" placeholder="例如：史密斯機深蹲"><select class="tx" id="custG" style="width:90px">${GROUPS.map(g=>`<option>${g}</option>`).join('')}</select></div>
  <div class="row" style="margin-top:8px"><button class="btn sm" data-act="exCustom">加入自訂</button></div></div>`;
  h+=`<button class="btn acc block" data-act="finish" style="padding:14px;font-size:16px">完成訓練並儲存</button><div class="spacer"></div>
  ${S.confirmDel==='session'?`<div class="row"><button class="btn danger block" data-act="discard">確定放棄這次紀錄</button><button class="btn block" data-act="cancelDel">取消</button></div>`:`<button class="btn ghost block danger" data-act="askDiscard">放棄這次訓練</button>`}`;
  return h;
}

function vPlan(){
  if(!S.profile)return `<div class="card"><h2>還沒有計畫</h2><p class="muted">先設定基本資料，就會自動產生。</p>${profileForm()}</div>`;
  const p=effP(),P=plan(),wd=new Date().getDay(),g=S.goal,custom=!!(g&&g.active&&g.schedule);
  let h=goalCard();
  h+=`<div class="card"><div class="row between"><div><div class="small muted">${g&&g.active?'目標計畫的課表':'你的計畫'}</div><h2 style="margin:2px 0">${custom?'專屬課表 · 每週 '+P.length+' 天':SPLITNAME[p.days]}</h2><div class="small muted">${GOAL[p.goal]} · ${LEVEL[p.level].split('（')[0]} · ${EQUIP[p.equip]}</div></div><button class="btn sm" data-act="tab" data-k="me">調整</button></div>
  ${custom?'':`<p class="small" style="margin:10px 0 0">${planWhy(p)}</p>`}</div>`;
  P.forEach(d=>{
    h+=`<div class="card ${d.weekday===wd?'today-mark':''}"><div class="dayhead"><div><div class="wd">${WD[d.weekday]}${d.weekday===wd?' · 今天':''}</div><h3>${esc(d.name)}</h3></div><span class="small muted">約 ${estMin(d)} 分鐘</span></div>
    <ul class="ex-list">${d.ex.map(e=>`<li><div>${ptag(groupOf(e))}${esc(e.name)}${e.alts>1&&e.swapKey?` <button class="btn sm ghost" style="padding:2px 6px;font-size:12px" data-act="swap" data-k="${e.swapKey}" title="換一個類似動作">⇄</button>`:''}</div><span class="rx">${rxText(e)}${e.rest?' · 休 '+e.rest+'s':''}</span></li>`).join('')}</ul>
    <div class="spacer"></div><button class="btn sm" data-act="start" data-i="${d.idx}">用這天開始訓練</button></div>`;
  });
  h+=`<div class="card"><h2>進步原則（漸進超負荷）</h2><ul class="small" style="margin:0;padding-left:18px">
  <li>每個動作有次數範圍，例如 8–12 次。</li><li>所有組都做到上限 → 下次加重（上半身 +2.5 kg、下半身 +5 kg）。</li><li>加重後次數掉到下限附近是正常的，再慢慢往上練。</li><li>每組保留 1–3 下的餘力，動作標準優先。</li>${custom?'':'<li>按 ⇄ 可以把動作換成類似的替代動作。</li>'}</ul></div>`;
  return h;
}
function planWhy(p){
  const a={2:'每週 2 次全身訓練，每個部位一週練到 2 次，適合時間有限的人。',3:'每週 3 次全身訓練（A/B/C 輪替），每個部位一週刺激 3 次，是新手到中階最有效率的安排。',4:'上下肢分化，每個部位一週練 2 次，每次可以做更多組數。',5:'上下肢加推拉腿，訓練量充足，適合有經驗、恢復能力好的人。',6:'推拉腿各練 2 次，訓練量高，需要充足睡眠與飲食。'}[p.days];
  const b={muscle:'組數與次數以 6–15 次為主，著重累積訓練量。',strength:'第一個主項用 3–5 次的大重量，輔助動作補足肌肉量。',fatloss:'次數偏高、休息較短，搭配有氧，重點是在熱量赤字下保住肌肉。',health:'中等強度、組數適中，搭配規律有氧，重在長期維持。'}[p.goal];
  return a+b;
}

function calShift(d){const n=new Date();const c=S.calM||{y:n.getFullYear(),m:n.getMonth()};let m=c.m+d,y=c.y;if(m<0){m=11;y--}if(m>11){m=0;y++}S.calM={y,m};S.calSel=null;S.openW=null;render(true)}
const wParts=w=>GROUPS.filter(g=>w.ex.some(e=>groupOf(e)===g));
function wCard(w){const open=S.openW===w.id;const t0=w.start?new Date(w.start):null;
  return `<div class="card wk" data-act="openW" data-id="${w.id}"><div class="row between"><div><b>${esc(w.name)}</b><div class="meta">${fmtD(w.date)}${t0?' '+pad(t0.getHours())+':'+pad(t0.getMinutes()):''} · ⏱ ${durTxt(w)} · ${w.ex.reduce((a,e)=>a+e.sets.length,0)} 組</div><div style="margin-top:4px">${wParts(w).map(ptag).join('')}</div></div><span class="small muted">${vol(w)?fmtVol(vol(w)):''}</span></div>
  ${open?`<div class="det">${w.ex.map(e=>`<div>${ptag(groupOf(e))}${esc(e.name)}：<span class="muted">${e.sets.map(s=>esc(setTxt(e,s))).join('、')}</span></div>`).join('')}
  <div class="row" style="margin-top:10px">${S.confirmDel===w.id?`<button class="btn sm danger" data-act="delW" data-id="${w.id}">確定刪除</button><button class="btn sm" data-act="cancelDel">取消</button>`:`<button class="btn sm ghost danger" data-act="askDelW" data-id="${w.id}">刪除這筆</button>`}</div></div>`:''}</div>`}
function vLog(){
  const now=new Date();const cm=S.calM||{y:now.getFullYear(),m:now.getMonth()};const key=cm.y+'-'+pad(cm.m+1);
  const mws=S.workouts.filter(w=>w.date.startsWith(key));const byDay={};mws.forEach(w=>(byDay[w.date]=byDay[w.date]||[]).push(w));
  const nDays=Object.keys(byDay).length,dim=new Date(cm.y,cm.m+1,0).getDate();
  const isCur=cm.y===now.getFullYear()&&cm.m===now.getMonth(),isPast=new Date(cm.y,cm.m+1,1)<=now;
  const passed=isCur?now.getDate():isPast?dim:0;
  const totMin=mws.reduce((a,w)=>a+wMin(w),0);
  const off=(new Date(cm.y,cm.m,1).getDay()+6)%7;const td=ds(now);
  let cells=['一','二','三','四','五','六','日'].map(x=>`<div class="wh">${x}</div>`).join('');
  for(let i=0;i<off;i++)cells+='<div class="c out"></div>';
  for(let d=1;d<=dim;d++){const dt=key+'-'+pad(d);const ws=byDay[dt];const parts=ws?GROUPS.filter(g=>ws.some(w=>w.ex.some(e=>groupOf(e)===g))):[];
    cells+=`<div class="c ${ws?'on':''} ${dt===td?'td':''} ${S.calSel===dt?'sel':''} ${dt>td?'fut':''}" data-act="calDay" data-d="${dt}"><span>${d}</span><span class="dots">${parts.map(g=>`<i style="background:${PCOL[g]}"></i>`).join('')}</span></div>`}
  let h=`<div class="card"><div class="calhd"><button class="btn sm ghost" data-act="calPrev" aria-label="上個月">‹</button><b>${cm.y} 年 ${cm.m+1} 月</b><button class="btn sm ghost" data-act="calNext" aria-label="下個月">›</button></div>
  <div class="cal">${cells}</div><div class="legend">${GROUPS.map(g=>`<span><i style="background:${PCOL[g]}"></i>${g}</span>`).join('')}</div></div>`;
  h+=`<div class="grid3" style="margin-bottom:12px"><div class="stat"><b>${nDays}<small style="font-size:12px">${passed?' / '+passed:''}</small></b><span>本月訓練天數</span></div><div class="stat"><b>${totMin>=60?(totMin/60).toFixed(1)+'<small style="font-size:12px"> 時</small>':Math.round(totMin)+'<small style="font-size:12px"> 分</small>'}</b><span>總訓練時間</span></div><div class="stat"><b>${mws.length?Math.round(totMin/mws.length):0}<small style="font-size:12px"> 分</small></b><span>平均每次</span></div></div>`;
  if(mws.length){const pd={};GROUPS.forEach(g=>pd[g]=new Set());mws.forEach(w=>wParts(w).forEach(g=>pd[g].add(w.date)));const mx=Math.max(1,...GROUPS.map(g=>pd[g].size));
    h+=`<div class="card"><h2>${cm.m+1} 月各部位訓練天數</h2>${GROUPS.map(g=>`<div class="pbar"><span>${g}</span><span class="tr"><i style="width:${pd[g].size/mx*100}%;background:${PCOL[g]}"></i></span><span class="muted" style="text-align:right">${pd[g].size} 天</span></div>`).join('')}</div>`}
  const list=S.calSel?(byDay[S.calSel]||[]):mws;
  h+=`<div class="row between" style="margin:18px 4px 10px"><h2 style="margin:0;font-size:17px">${S.calSel?fmtD(S.calSel)+' 的訓練':(cm.m+1)+' 月紀錄'}</h2>${S.calSel?`<button class="btn sm ghost" data-act="calDay" data-d="${S.calSel}">看整個月</button>`:''}</div>`;
  h+=list.length?list.map(wCard).join(''):`<div class="card empty">${S.calSel?'這天沒有訓練紀錄':'這個月還沒有訓練'}${S.calSel===td||(!S.calSel&&isCur)?`<br><br><button class="btn acc" data-act="pick">開始訓練</button>`:''}</div>`;
  if(S.workouts.length){
    const wb=weekBuckets(8);
    h+=`<div class="card"><h2>每週訓練總量</h2>${barChart(wb)}<div class="tiny muted">總量 = 重量 × 次數 的加總；柱上數字為該週訓練次數</div></div>`;
    const names=[...new Set(S.workouts.flatMap(w=>w.ex.map(e=>e.name)))];
    const prs=names.map(n=>{let best=0,bs=null,bd='',bu='kg';S.workouts.forEach(w=>w.ex.filter(e=>e.name===n).forEach(e=>{e.sets.forEach(s=>{if(unitOf(e)!=='次'||!(s.w>0))return;const v=s.w*(1+Math.min(s.r,12)/30);if(v>best){best=v;bs=s;bd=w.date;bu=e.wu||'kg'}})}));return {n,best,bs,bd,u:bu}}).filter(x=>x.best>0).sort((a,b)=>b.best-a.best).slice(0,8);
    if(prs.length)h+=`<div class="card"><h2>個人最佳</h2>${prs.map(x=>`<div class="pr"><span>${esc(x.n)}<br><span class="tiny muted">${fmtW(x.bs.w,x.u)} × ${x.bs.r} · ${fmtD(x.bd)}</span></span><span style="text-align:right"><b>${Math.round(fromKg(x.best,prefU()))}</b> ${prefU()}<br><span class="tiny muted">估計 1RM</span></span></div>`).join('')}</div>`;
  }
  h+=bwCard();
  return h;
}
function barChart(wb){
  const W=320,H=150,pl=8,pb=22,pt=18,bw=(W-pl*2)/wb.length;const mx=Math.max(1,...wb.map(b=>b.vol));
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="近 8 週訓練總量">
  ${wb.map((b,i)=>{const h=(H-pb-pt)*b.vol/mx;const x=pl+i*bw+bw*0.18,w=bw*0.64,y=H-pb-h;const cur=i===wb.length-1;
  return `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(h,b.vol?2:0)}" rx="4" fill="var(--acc)" opacity="${cur?1:0.55}"><title>${fmtVol(b.vol)}</title></rect>
  ${b.count?`<text x="${x+w/2}" y="${y-5}" text-anchor="middle" font-size="11" fill="var(--mute)">${b.count}次</text>`:''}
  <text x="${x+w/2}" y="${H-6}" text-anchor="middle" font-size="10.5" fill="var(--mute)">${b.start.getMonth()+1}/${b.start.getDate()}</text>`}).join('')}
  <line x1="${pl}" x2="${W-pl}" y1="${H-pb}" y2="${H-pb}" stroke="var(--line)"/></svg>`;
}
function bwCard(){
  const pts=S.bw.slice(-16);
  let chart='';
  if(pts.length>=2){const W=320,H=120,p=14;const ks=pts.map(x=>x.kg);const lo=Math.min(...ks)-0.5,hi=Math.max(...ks)+0.5;
    const X=i=>p+i*(W-2*p)/(pts.length-1),Y=k=>p+(H-2*p)*(1-(k-lo)/(hi-lo));
    chart=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="體重趨勢"><polyline fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linejoin="round" points="${pts.map((x,i)=>X(i)+','+Y(x.kg)).join(' ')}"/>${pts.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x.kg)}" r="3" fill="var(--acc)"><title>${x.d} ${x.kg} kg</title></circle>`).join('')}
    <text x="${p}" y="${H-2}" font-size="10.5" fill="var(--mute)">${fmtD(pts[0].d)}</text><text x="${W-p}" y="${H-2}" text-anchor="end" font-size="10.5" fill="var(--mute)">${fmtD(pts[pts.length-1].d)}</text></svg>`}
  const last=S.bw[S.bw.length-1];
  return `<div class="card"><div class="row between"><h2 style="margin:0">體重</h2>${last?`<span><b style="font-size:20px">${last.kg}</b> kg</span>`:''}</div>${chart}
  <form id="bwform" class="row" style="margin-top:10px"><input class="tx" name="kg" type="number" step="0.1" inputmode="decimal" placeholder="今天體重 kg" required><button class="btn" type="submit">記錄</button></form>
  <div class="tiny muted" style="margin-top:6px">建議每週固定 2–3 天、早上起床如廁後量，看趨勢不看單日。</div></div>`;
}

const insCard=x=>`<div class="card ins ${x.lv}"><div class="lv">${{good:'做得好',tip:'建議',warn:'注意'}[x.lv]}</div><h3 style="margin:2px 0 4px">${esc(x.t)}</h3><div class="small">${esc(x.b)}</div></div>`;
function vCoach(){
  let h='';
  const ins=insights();
  h+=`<div class="card"><h2>✦ AI 教練</h2><div class="small muted">會參考你的目標、計畫、近 4 週紀錄和體重來回答。</div>`;
  if(!S.sample)h+=`<p class="small muted">${S.mode==='local'?'AI 教練還沒開啟。到「我的」貼上免費的 Gemini 金鑰就能使用。':'AI 教練目前沒有開啟（架站的人可以依照說明免費開啟）。'}下面的自動建議仍會根據你的紀錄更新。</p>${S.mode==='local'?'<button class="btn sm" data-act="tab" data-k="me">去設定 →</button>':''}</div>`;
  else{
    h+=`<div class="chips">${['幫我檢視這週的訓練','為什麼我的重量卡住了？','我的飲食該怎麼配合目標？','今天很累，該照練還是休息？','幫我調整計畫讓訓練時間更短'].map(q=>`<button class="chipbtn" data-act="askQ" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <textarea class="tx" id="aiq" placeholder="或輸入你的問題，例如：膝蓋做深蹲會不舒服，有什麼替代動作？">${esc(S.ai.q)}</textarea>
    <div class="row" style="margin-top:8px"><button class="btn acc" data-act="ask" ${S.ai.busy?'disabled':''}>${S.ai.busy?'思考中…':'問教練'}</button>${S.ai.busy?`<button class="btn sm ghost" data-act="aiStop">停止</button>`:''}</div>
    ${S.ai.err?`<div class="banner" style="margin-top:10px">${esc(S.ai.err)}</div>`:''}
    <div id="aiout">${S.ai.text?`<div class="ai-out">${md(S.ai.text)}</div>`:''}</div></div>`;
  }
  h+=`<h2 style="margin:18px 4px 10px;font-size:17px">根據你的紀錄</h2>`+ins.map(insCard).join('');
  return h;
}
function md(t){
  const lines=esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').split('\n');let o='',inL=false;
  lines.forEach(l=>{const m=l.match(/^\s*(?:[-*•]|\d+[.)、])\s+(.*)/);if(m){if(!inL){o+='<ul>';inL=true}o+='<li>'+m[1]+'</li>'}else{if(inL){o+='</ul>';inL=false}const s=l.replace(/^#+\s*/,'');if(s.trim())o+=(l.match(/^#+/)?'<p><b>'+s+'</b></p>':'<p>'+s+'</p>')}});
  if(inL)o+='</ul>';return o;
}
let aiCtl;
async function askAI(q){
  q=(q||'').trim();if(!q){toast('請輸入問題');return}
  if(!S.sample){toast('無法使用 AI 教練');return}
  S.ai={text:'',busy:true,err:'',q};render(true);
  const p=S.profile,P=plan();
  const recent=S.workouts.filter(w=>daysAgo(w.date)<28).slice().reverse();
  const ctx=[
    '你是一位專業、務實、親切的肌力與體能教練。請用繁體中文（台灣用語）回答，具體可執行，用短段落或條列，約 150–300 字，除非使用者要求更詳細。不要做醫療診斷；若提到疼痛、受傷或疾病，提醒先停止相關動作並就醫或找物理治療師。只根據下面提供的資料，資料不足時直接說明並給一般原則。',
    '',
    '【目標】'+(S.goal&&S.goal.active?`${S.goal.summary}（${(FEAS[S.goal.feasible]||[''])[0]}）${S.goal.adjusted_target?'；建議目標：'+S.goal.adjusted_target:''}${S.goal.nutrition&&S.goal.nutrition.calories?'；每日熱量 '+S.goal.nutrition.calories+' 大卡、蛋白質 '+S.goal.nutrition.protein_g+' g':''}`:'無'),
    '【使用者設定】'+(p?`目標：${GOAL[p.goal]}；經驗：${LEVEL[p.level]}；每週 ${p.days} 天；器材：${EQUIP[p.equip]}；體重：${latestBW()||'未提供'} kg`:'尚未設定'),
    '【目前計畫】'+(P.length?'\n'+P.map(d=>`${WD[d.weekday]} ${d.name}：`+d.ex.map(e=>`${e.name} ${e.sets}×${e.min}-${e.max}`).join('、')).join('\n'):'無'),
    '【近 4 週訓練紀錄】'+(recent.length?'\n'+recent.map(w=>`${w.date} ${w.name}（${durTxt(w)}）：`+w.ex.map(e=>`${e.name} `+e.sets.map(s=>setTxt(e,s)).join('/')).join('；')).join('\n'):'無紀錄'),
    '【體重紀錄】'+(S.bw.length?S.bw.slice(-10).map(x=>`${x.d} ${x.kg}kg`).join('、'):'無'),
    '【系統自動判讀】'+insights().filter(x=>!/恢復的基本盤/.test(x.t)).map(x=>x.t+'：'+x.b).join(' / '),
    '【今天日期】'+ds(new Date())+' '+WD[new Date().getDay()],
    '',
    '使用者的問題：'+q
  ].join('\n');
  aiCtl=new AbortController();
  try{
    const r=await S.sample(ctx,{modelTier:'default',cache:false,signal:aiCtl.signal,onText:({text})=>{S.ai.text=text;const o=$('#aiout');if(o&&S.tab==='coach')o.innerHTML=`<div class="ai-out">${md(text)}</div>`}});
    S.ai.text=r.text;
  }catch(e){
    if(e&&e.text)S.ai.text=e.text;
    if(e&&e.name==='AbortError'){}
    else if(e&&e.code==='not_granted'){S.sample=null}
    else if(e&&e.code==='rate_limited')S.ai.err='今天的 AI 使用次數已經用完，明天再來問吧。';
    else if(e&&e.code==='bad_key')S.ai.err='Gemini 金鑰無效或沒有權限，請到「我的」重新貼上。'+(e.message?'（'+e.message.slice(0,80)+'）':'');
    else if(e&&e.code==='quota')S.ai.err='免費 AI 額度暫時用完了，過一陣子（或明天）再試。';
    else if(e&&e.code==='network')S.ai.err='連不上 Gemini，請確認網路後再試。';
    else if(!(aiCtl&&aiCtl.signal.aborted))S.ai.err='教練暫時無法回答，請稍後再試。'+(e&&e.message?'（'+String(e.message).slice(0,120)+'）':'');
  }
  S.ai.busy=false;if(S.tab==='coach')render(true);
}

function vMe(){
  return `${S.mode==='local'?`<div class="card"><b>📱 資料存在這支手機</b><div class="small muted" style="margin-top:4px">不用登入，紀錄只存在這支手機上，別人看不到。換手機或清除 Safari 資料前，記得先按下方「複製備份」把資料存起來。</div></div>${aiKeyCard()}`:`<div class="card"><div class="row between"><div><div class="small muted">登入帳號</div><b>${esc(S.user?S.user.label:'')}</b></div>${S.confirmDel==='logout'?`<button class="btn sm danger" data-act="logout">確定登出</button>`:`<button class="btn sm" data-act="askLogout">登出</button>`}</div>${S.session&&S.confirmDel==='logout'?'<div class="tiny" style="color:var(--warn);margin-top:6px">你有進行中的訓練，它已存在雲端，下次登入會接回來。</div>':''}</div>`}
  ${installHint()}
  <div class="card"><h2>我的設定</h2><div class="small muted">修改後計畫會立即更新，舊紀錄不受影響。</div>${profileForm(S.profile)}</div>
  <div class="card"><h2>資料</h2><div class="small muted">${S.mode==='cloud'?'你的紀錄存在你自己的雲端空間，只有你看得到，換裝置打開也會同步。':'目前存在這個瀏覽器中。'}</div>
  <div class="spacer"></div><div class="row wrap"><button class="btn sm" data-act="copy">複製備份（JSON）</button><button class="btn sm ghost" data-act="importOpen">匯入備份</button></div>
  ${S.importOpen?`<div class="small muted" style="margin-top:10px">把舊版「複製備份」得到的內容貼在這裡：</div><textarea class="tx" id="importText" style="margin-top:6px;min-height:110px" placeholder='{"profile":…,"workouts":[…]}'></textarea><div class="spacer"></div><button class="btn sm acc" data-act="importGo" ${S.importBusy?'disabled':''}>${S.importBusy?'匯入中…':'開始匯入'}</button>`:''}
  ${S.profile&&S.profile.swaps&&Object.keys(S.profile.swaps).length?`<button class="btn sm ghost" data-act="resetSwaps">還原預設動作</button>`:''}</div>
  <div class="card small muted">這個 App 的建議是一般性的訓練原則，不取代醫師或合格教練的專業評估。有傷病史或身體不適時請先諮詢專業人士。</div>`;
}

/* ---------- events ---------- */
const ACT={
  tab:b=>{S.tab=b.dataset.k;LS.set('ft-tab',S.tab);S.confirmDel=null;render(true);window.scrollTo(0,0)},
  start:b=>{if(S.session&&!confirmOverwrite()){return}startSession(b.dataset.i===''?null:+b.dataset.i)},
  pick:()=>{if(S.session&&!confirmOverwrite())return;openPicker()},
  pickT:b=>{const g=b.dataset.g;S.pick=S.pick||[];S.pick=S.pick.includes(g)?S.pick.filter(x=>x!==g):[...S.pick,g];render(true)},
  pickGo:()=>{if(S.pick&&S.pick.length)startSession(null,S.pick.slice())},
  pickCancel:()=>{S.picking=false;render(true)},
  goalGo:()=>{makeGoal()},
  goalEx:b=>{S.goalDraft=b.dataset.q;const t=$('#goalText');if(t)t.value=b.dataset.q},
  goalEdit:()=>{S.goalEdit=true;S.goalDraft=S.goal?S.goal.text:'';S.goalErr='';render(true)},
  goalCancel:()=>{S.goalEdit=false;render(true)},
  goalToggle:()=>{S.goal={...S.goal,active:!S.goal.active};put('goal',S.goal);render(true);toast(S.goal.active?'已改回目標計畫':'已改用標準計畫')},
  goalTrack:()=>{S.goal={...S.goal,track:S.goal.track==='orig'?'adj':'orig'};put('goal',S.goal);render(true)},
  goalAskDel:()=>{S.confirmDel='goal';render(true)},
  goalDel:()=>{S.goal=null;S.confirmDel=null;remove('goal');render(true);toast('已刪除目標')},
  pause:()=>{const s=S.session;if(s.pausedAt){s.pausedMs=(s.pausedMs||0)+(Date.now()-s.pausedAt);s.pausedAt=null}else s.pausedAt=Date.now();saveSession();render(true)},
  calPrev:()=>{calShift(-1)},calNext:()=>{calShift(1)},
  calDay:b=>{S.calSel=S.calSel===b.dataset.d?null:b.dataset.d;S.openW=null;render(true)},
  ck:b=>{const e=S.session.ex[+b.dataset.e],x=e.sets[+b.dataset.s];
    if(!x.done&&!(+x.r>0)){const t=e.target;if(t){x.r=t.min}}
    x.done=!x.done;saveSession();render(true);if(x.done&&e.target&&e.target.rest>0)startRest(e.target.rest)},
  setAdd:b=>{const e=S.session.ex[+b.dataset.e];const l=e.sets[e.sets.length-1]||{w:'',r:''};e.sets.push({w:l.w,r:'',done:false});saveSession();render(true)},
  setDel:b=>{S.session.ex[+b.dataset.e].sets.pop();saveSession();render(true)},
  exDel:b=>{S.session.ex.splice(+b.dataset.e,1);saveSession();render(true)},
  exAdd:()=>{const [k,n]=$('#addSel').value.split('|');const p=S.profile||{goal:'muscle',level:'int',equip:'gym'};const rx=prescribe(p,k,1,n);
    S.session.ex.push(mkSessEx({name:n,pattern:k,group:LIB[k].g,...rx}));saveSession();render(true);toast('已加入 '+n)},
  exCustom:()=>{const n=$('#custName').value.trim();if(!n){toast('請輸入動作名稱');return}const g=$('#custG').value;
    const cd=g==='體能';S.session.ex.push({name:n,pattern:'',group:g,unit:cd?'分鐘':'次',wu:cd?'kg':(lastUnit(n)||prefU()),target:null,sets:Array.from({length:cd?1:3},()=>({w:'',r:'',done:false}))});saveSession();render(true)},
  finish:()=>finishSession(),
  reload:()=>location.reload(),
  gkeySave:()=>{const v=(($('#gkey')||{}).value||'').trim();if(v.length<20){toast('金鑰看起來不完整');return}setGeminiKey(v);S.sample=aiCall;render(true);toast('已開啟 AI 教練 ✦')},
  gkeyDel:()=>{setGeminiKey('');S.sample=aiReady()?aiCall:null;render(true);toast('已移除金鑰')},
  importOpen:()=>{S.importOpen=!S.importOpen;render(true)},
  importGo:async()=>{const j=parseJSON(($('#importText')||{}).value||'');
    if(!j||!(j.profile||Array.isArray(j.workouts))){toast('看不懂這段內容，請貼上完整的備份');return}
    const ws=(Array.isArray(j.workouts)?j.workouts:[]).filter(w=>w&&typeof w.id==='string'&&w.id.startsWith('w-')&&/^\d{4}-\d{2}-\d{2}$/.test(w.date||'')&&Array.isArray(w.ex));
    S.importBusy=true;render(true);
    try{
      if(j.profile&&typeof j.profile==='object'&&!S.profile){S.profile=j.profile;await put('profile',j.profile)}
      if(j.goal&&typeof j.goal==='object'&&!S.goal){S.goal=j.goal;await put('goal',j.goal)}
      const bw=Array.isArray(j.bodyweight)?j.bodyweight.filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.d)&&+x.kg>0):[];
      if(bw.length){const m={};[...S.bw,...bw].forEach(x=>m[x.d]=x);S.bw=Object.values(m).sort((a,b)=>a.d<b.d?-1:1).slice(-400);await put('bodyweight',{entries:S.bw})}
      const have=new Set(S.workouts.map(w=>w.id));let n=0;
      for(const w of ws){if(have.has(w.id))continue;await put(w.id,w);n++}
      S.workouts=sortW([...S.workouts,...ws.filter(w=>!have.has(w.id))]);persistLocal();
      S.importOpen=false;toast(`已匯入 ${n} 筆訓練`+(bw.length?`、${bw.length} 筆體重`:''));
    }catch(e){toast('匯入失敗，請再試一次')}
    S.importBusy=false;render(true)},
  loginGoogle:async()=>{S.login.err='';S.login.busy=true;render(true);try{await loginGoogle()}catch(e){S.login.err=authMsg(e)}S.login.busy=false;if(S.auth==='out')render(true)},
  loginMode:()=>{const e=$('#lemail');S.login={...S.login,mode:S.login.mode==='up'?'in':'up',err:'',msg:'',email:e?e.value:S.login.email};render(true)},
  forgotPw:async()=>{const em=(($('#lemail')||{}).value||'').trim();if(!em){S.login={...S.login,err:'請先輸入你的 Email，再按忘記密碼。',msg:''};render(true);return}
    try{await resetPassword(em);S.login={...S.login,email:em,err:'',msg:'已寄出重設密碼的信，請到信箱收信（也看一下垃圾郵件）。'}}catch(e){S.login={...S.login,email:em,err:authMsg(e),msg:''}}render(true)},
  askLogout:()=>{S.confirmDel='logout';render(true)},
  logout:async()=>{S.confirmDel=null;if(S.session){clearTimeout(sessT);await flushSession()}try{await logout()}catch(e){toast('登出失敗')}},
  wu:b=>{const e=S.session.ex[+b.dataset.e],nu=b.dataset.u,ou=e.wu||'kg';if(nu===ou)return;
    e.sets.forEach(x=>{if(x.w!==''&&+x.w>0){const kg=(x._kg!=null&&String(x._w)===String(x.w))?x._kg:toKg(+x.w,ou);x.w=wIn(kg,nu);x._kg=kg;x._w=x.w}});e.wu=nu;saveSession();render(true)},
  askDiscard:()=>{S.confirmDel='session';render(true)},
  discard:()=>{S.session=null;clearSessionStore();S.rest=null;renderRest();S.confirmDel=null;render(true)},
  cancelDel:()=>{S.confirmDel=null;render(true)},
  restStop:()=>{S.rest=null;renderRest()},
  restAdd:()=>{if(S.rest){S.rest.end+=30000;renderRest()}},
  openW:(b,ev)=>{if(ev.target.closest('button'))return;S.openW=S.openW===b.dataset.id?null:b.dataset.id;S.confirmDel=null;render(true)},
  askDelW:b=>{S.confirmDel=b.dataset.id;render(true)},
  delW:b=>{const id=b.dataset.id;S.workouts=S.workouts.filter(w=>w.id!==id);S.confirmDel=null;remove(id);render(true);toast('已刪除')},
  swap:b=>{const p={...S.profile,swaps:{...(S.profile.swaps||{})}};p.swaps[b.dataset.k]=(p.swaps[b.dataset.k]||0)+1;S.profile=p;put('profile',p);render(true)},
  resetSwaps:()=>{const p={...S.profile,swaps:{}};S.profile=p;put('profile',p);render(true);toast('已還原')},
  askQ:b=>{askAI(b.dataset.q)},
  ask:()=>{askAI($('#aiq').value)},
  aiStop:()=>{try{aiCtl&&aiCtl.abort()}catch(e){}},
  copy:async()=>{try{await navigator.clipboard.writeText(JSON.stringify({profile:S.profile,workouts:S.workouts,bodyweight:S.bw},null,1));toast('已複製到剪貼簿')}catch(e){toast('無法複製')}},
};
function confirmOverwrite(){toast('你有進行中的訓練，先完成或放棄它');S.tab='today';render(true);return false}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]');if(!b)return;const f=ACT[b.dataset.act];if(f){if(b.tagName==='BUTTON')ev.preventDefault();f(b,ev)}});
document.addEventListener('input',ev=>{const t=ev.target;if(t.dataset&&t.dataset.in&&S.session){const x=S.session.ex[+t.dataset.e].sets[+t.dataset.s];x[t.dataset.in]=t.value;saveSession()}
  if(t.id==='aiq')S.ai.q=t.value;if(t.id==='goalText')S.goalDraft=t.value});
document.addEventListener('submit',ev=>{
  ev.preventDefault();const f=ev.target;
  if(f.id==='emailform'){const em=($('#lemail').value||'').trim(),pw=$('#lpw').value||'';
    if(!em||!pw){S.login={...S.login,email:em,err:'請輸入 Email 和密碼。',msg:''};render(true);return}
    S.login={...S.login,email:em,err:'',msg:'',busy:true};render(true);
    (S.login.mode==='up'?emailSignUp(em,pw):emailSignIn(em,pw)).catch(e=>{S.login={...S.login,busy:false,err:authMsg(e)};render(true)});return}
  if(f.id==='pform'){const fd=new FormData(f);const p={...(S.profile||{}),goal:fd.get('goal'),level:fd.get('level'),days:+fd.get('days'),equip:fd.get('equip'),weight:fd.get('weight')?+fd.get('weight'):'',height:+fd.get('height')||'',age:+fd.get('age')||'',sex:fd.get('sex')||'x',wu:fd.get('wu')||'kg',updated:Date.now()};
    if(S.profile&&S.profile.equip!==p.equip)p.swaps={};
    S.profile=p;put('profile',p);toast('計畫已更新');S.tab='plan';LS.set('ft-tab','plan');render(true);window.scrollTo(0,0)}
  if(f.id==='bwform'){const kg=+new FormData(f).get('kg');if(!(kg>20&&kg<400)){toast('請輸入合理的體重');return}const d=ds(new Date());
    S.bw=[...S.bw.filter(x=>x.d!==d),{d,kg}].sort((a,b)=>a.d<b.d?-1:1).slice(-400);put('bodyweight',{entries:S.bw});if(S.profile&&!S.profile.weight){}
    render(true);toast('已記錄 '+kg+' kg')}
});
if(S.session&&S.session.date!==ds(new Date())&&!S.session.ex.some(e=>e.sets.some(s=>s.r))){S.session=null;LS.del(SK())}
if(S.session&&!S.session.upd)S.session.upd=Date.now();
init();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
