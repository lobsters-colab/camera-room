// Firebase 連線層：登入、資料儲存、AI（免費的 Gemini）
const V = '12.19.0';
const B = `https://www.gstatic.com/firebasejs/${V}/`;
let initializeApp, getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, deleteDoc, onSnapshot;
let app, auth, db, model = null;
const C = window.APP_CONFIG || {};

const isStandalone = () =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

// 回傳 true = 使用雲端（登入＋同步）；false = 沒有設定 Firebase，資料只存在這支手機
export async function initFirebase() {
  let cfg = C.firebase && C.firebase.apiKey ? { ...C.firebase } : null;
  if (!cfg && /\.(web\.app|firebaseapp\.com)$/.test(location.hostname)) {
    // 放在 Firebase Hosting 時會自動提供專案設定
    try { const res = await fetch('/__/firebase/init.json'); if (res.ok) cfg = await res.json(); } catch (e) {}
    if (cfg) cfg.authDomain = location.host;
  }
  if (!cfg) return false;
  ({ initializeApp } = await import(B + 'firebase-app.js'));
  ({ getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
     signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } = await import(B + 'firebase-auth.js'));
  ({ initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, deleteDoc, onSnapshot }
     = await import(B + 'firebase-firestore.js'));
  app = initializeApp(cfg);
  auth = getAuth(app);
  auth.languageCode = 'zh-TW';
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true
  });
  getRedirectResult(auth).catch(e => console.warn('redirect', e));
  // 選用：免費 AI（Firebase AI Logic + Gemini Developer API），需要 App Check（reCAPTCHA v3）
  if (C.recaptchaSiteKey) {
    try {
      const { initializeAppCheck, ReCaptchaV3Provider } = await import(B + 'firebase-app-check.js');
      const { getAI, getGenerativeModel, GoogleAIBackend } = await import(B + 'firebase-ai.js');
      initializeAppCheck(app, { provider: new ReCaptchaV3Provider(C.recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
      model = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), { model: C.aiModel || 'gemini-3.5-flash-lite' });
    } catch (e) { console.warn('AI 未啟用', e); model = null; }
  }
  return true;
}

// 個人用：使用者自己的 Gemini API 金鑰（只存在這支手機）
const GKEY = 'ft-gemini-key', GMOD = 'ft-gemini-model3';  // model3：改成優先用 Flash 後重新挑選
const GMODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
export const geminiKey = () => { try { return localStorage.getItem(GKEY) || ''; } catch (e) { return ''; } };
// 貼上時常夾帶看不見的空白、換行或全形字元，會讓連線直接失敗 → 只保留金鑰會用到的字元
export const cleanKey = k => String(k || '').replace(/[^0-9A-Za-z_\-]/g, '');
try { const rawK = localStorage.getItem('ft-gemini-key'); if (rawK && rawK !== cleanKey(rawK)) localStorage.setItem('ft-gemini-key', cleanKey(rawK)); } catch (e) {}  // 修正之前存進去的髒金鑰
export function setGeminiKey(k) { try { k ? localStorage.setItem(GKEY, cleanKey(k)) : (localStorage.removeItem(GKEY), localStorage.removeItem(GMOD)); } catch (e) {} }
const GBASE = 'https://generativelanguage.googleapis.com/v1beta/';
let listed = null;
// 向 Google 查詢這把金鑰可以用的模型，挑適合聊天的 flash 系列
const MLIST = 'ft-gemini-models3';
async function availableModels(key) {
  if (listed) return listed;
  try { const c = JSON.parse(localStorage.getItem(MLIST) || 'null'); if (c && c.k === key.slice(-6) && Date.now() - c.t < 24 * 3600e3 && c.list.length) return (listed = c.list); } catch (e) {}
  try {
    const r = await fetch(GBASE + 'models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    if (r.status === 400 || r.status === 401 || r.status === 403) {
      const j = await r.json().catch(() => ({}));
      throw { code: 'bad_key', message: (j.error && j.error.message) || ('HTTP ' + r.status) };
    }
    if (!r.ok) return GMODELS;
    const j = await r.json();
    const ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
      .filter(n => /^gemini/.test(n) && !/(image|tts|audio|live|embed|vision|robotics|computer|native|thinking)/i.test(n));
    const ver = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? +m[1] : 0; };
    // Flash 優先（夠聰明也夠快），其次 Flash-Lite；Pro 最慢排最後
    const score = n => (/lite/.test(n) ? -1 : 0) + (/flash/.test(n) ? 4 : 0) + (/latest/.test(n) ? 1 : 0) - (/pro/.test(n) ? 4 : 0) - (/(preview|exp)/.test(n) ? 1.5 : 0) + ver(n) / 10;
    ok.sort((x, y) => score(y) - score(x));
    listed = ok.length ? ok.slice(0, 10) : GMODELS;
    try { localStorage.setItem(MLIST, JSON.stringify({ k: key.slice(-6), t: Date.now(), list: listed })); } catch (e) {}
  } catch (e) { if (e && e.code === 'bad_key') throw e; listed = GMODELS; }
  return listed;
}
// 額度用完的模型先跳過：每分鐘上限 → 擋 70 秒；每日上限 → 擋到太平洋時間午夜（台灣下午 4 點左右）
const QKEY = 'ft-gemini-quota';
const qGet = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '{}'); } catch (e) { return {}; } };
function qMark(m, msg) {
  const q = qGet(), now = Date.now();
  const daily = /per ?day|PerDay|daily|RPD/i.test(msg);
  let until = now + 70 * 1000;
  if (daily) { const d = new Date(); d.setUTCHours(8, 0, 0, 0); if (d.getTime() <= now) d.setUTCDate(d.getUTCDate() + 1); until = d.getTime(); }
  q[m] = until; try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) {}
}
const qBlocked = m => (qGet()[m] || 0) > Date.now();
function netMsg(e) {
  const raw = String(e && e.message || e || '');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return '手機目前沒有網路';
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return 'App 切到背景，連線被系統中斷';
  if (/header|ISO-8859|invalid/i.test(raw)) return '金鑰裡有不正確的字元，請重新複製貼上（' + raw + '）';
  return raw || '連線失敗';
}
async function geminiCall(prompt, opts = {}) {
  const key = cleanKey(geminiKey()); let pref = ''; try { pref = localStorage.getItem(GMOD) || ''; } catch (e) {}
  const models = await availableModels(key);
  const all = [...new Set([pref, ...models].filter(Boolean))];
  // 跳過免費版不能用的模型（只在找可用模型時才會換）
  const okList = all.filter(m => !qBlocked(m)), list = okList.length ? okList : all;
  let lastErr = '', quotaHits = 0, switched = false;
  // 思考設為「低」：2.x 用 thinkingBudget，3.x 以後與 latest 別名用 thinkingLevel
  const thinkCfg = m => /gemini-2\./.test(m) ? { thinkingBudget: 512 } : { thinkingLevel: 'low' };  // 低思考：回答快，又不會太隨便
  const stream = !!opts.onText && !opts.json;
  for (const m of list) {
    const NT = 'ft-nothink3'; let ntSet = []; try { ntSet = JSON.parse(localStorage.getItem(NT) || '[]'); } catch (e) {}
    let r, j = {}, msg = '', noThink = ntSet.includes(m), useStream = stream;
    const send = s => fetch(`${GBASE}models/${m}:${s ? 'streamGenerateContent?alt=sse' : 'generateContent'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: opts.signal,
      body: JSON.stringify({ contents: [{ role: 'user', parts: [...(opts.images || []).map(im => ({ inline_data: { mime_type: im.mime, data: im.data } })), { text: prompt }] }],
        generationConfig: { ...(opts.json ? { responseMimeType: 'application/json' } : {}), ...(noThink ? {} : { thinkingConfig: thinkCfg(m) }) } })
    });
    // 連線失敗時自動重試：串流 → 改一般模式 → 等 1.5 秒再試一次
    const sendRetry = async () => {
      let lastNet;
      for (let k = 0; k < 3; k++) {
        try { return await send(useStream); }
        catch (e) {
          if (e && e.name === 'AbortError') throw e;
          lastNet = e;
          if (useStream) useStream = false; else await new Promise(res => setTimeout(res, 1500));
        }
      }
      throw { code: 'network', message: netMsg(lastNet) };
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      r = await sendRetry();
      if (r.ok) break;
      j = await r.json().catch(() => ({})); msg = (j.error && j.error.message) || '';
      if (r.status === 400 && !noThink && /think/i.test(msg)) { noThink = true; try { localStorage.setItem(NT, JSON.stringify([...ntSet, m])); } catch (e) {} continue; }  // 這個模型不支援調整思考 → 不帶設定再試一次
      break;
    }
    if (!r.ok) {
      if (r.status === 404 || (/model/i.test(msg) && /(not found|not supported|deprecated|no longer)/i.test(msg))) { lastErr = m + '：' + (msg || '404'); if (m === pref) try { localStorage.removeItem(GMOD); } catch (e) {} switched = true; continue; }
      if (r.status === 429) throw { code: 'quota', message: msg };  // 額度用完就直接停，不自動換模型
      if (r.status === 400 || r.status === 401 || r.status === 403) {
        if (/api key|API_KEY/i.test(msg)) throw { code: 'bad_key', message: msg };
        if (/free tier|not available|permission/i.test(msg)) { const q = qGet(); q[m] = Date.now() + 24 * 3600e3; try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) {} }
        lastErr = m + '：' + (msg || 'HTTP ' + r.status); switched = true; continue;
      }
      lastErr = m + '：HTTP ' + r.status + ' ' + msg; switched = true; continue;
    }
    if (!switched || !pref) { try { localStorage.setItem(GMOD, m); } catch (e) {} }
    let text = '', finish = '';
    if (useStream && r.body && r.body.getReader) {
      // 邊產生邊顯示
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        let chunk;
        try { chunk = await rd.read(); }
        catch (e) {  // 串流中途斷線（例如 App 切到背景）
          if (e && e.name === 'AbortError') throw e;
          if (text) { text += '\n\n（連線中斷，回答可能不完整）'; break; }
          useStream = false; r = await sendRetry(); if (!r.ok) throw { code: 'network', message: '串流中斷後重試失敗（HTTP ' + r.status + '）' };
          j = await r.json().catch(() => ({})); const c0 = j.candidates && j.candidates[0];
          text = ((c0 && c0.content && c0.content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('');
          if (text) opts.onText({ text, delta: text });
          break;
        }
        const { value, done } = chunk; if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          try { const d = JSON.parse(line.slice(5)); const c = d.candidates && d.candidates[0];
            const t = ((c && c.content && c.content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('');
            if (c && c.finishReason) finish = c.finishReason;
            if (t) { text += t; opts.onText({ text, delta: t }); } } catch (e) {}
        }
      }
    } else {
      j = await r.json().catch(() => ({}));
      const c = j.candidates && j.candidates[0]; finish = c && c.finishReason || '';
      text = ((c && c.content && c.content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('');
    }
    if (!text) throw { code: 'unavailable', message: 'AI 沒有回覆內容' + (finish ? '（' + finish + '）' : '') };
    return { text, model: m, fallback: switched, streamed: useStream };
  }
  throw { code: 'unavailable', message: lastErr || '找不到可用的模型' };
}
// 連線檢查：一步一步測，找出 AI 連不上的原因
export async function diagGemini(step) {
  const key = cleanKey(geminiKey()), raw = geminiKey();
  if (!key) { step('金鑰', 'bad', '還沒有設定金鑰'); return; }
  step('金鑰格式', /^AIza[0-9A-Za-z_\-]{35}$/.test(key) ? 'ok' : 'warn', (raw !== key ? '已自動清掉多餘字元。' : '') + (/^AIza/.test(key) ? `長度 ${key.length}` : '不是 AIza 開頭，可能貼錯了'));
  step('網路', navigator.onLine ? 'ok' : 'bad', navigator.onLine ? '手機有連上網路' : '手機目前沒有網路');
  let t = Date.now(), r;
  try { r = await fetch(GBASE + 'models?pageSize=200', { headers: { 'x-goog-api-key': key } }); }
  catch (e) { step('連到 Google', 'bad', '連不到 Google 伺服器：' + netMsg(e) + '。可能是網路擋住了 Google（公司或學校 Wi-Fi），試試改用行動網路。'); return; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { step('金鑰驗證', 'bad', `HTTP ${r.status}：${(j.error && j.error.message) || ''}`); return; }
  step('連到 Google', 'ok', `金鑰有效，花了 ${Date.now() - t} ms`);
  listed = null; try { localStorage.removeItem(MLIST); } catch (e) {}
  const models = await availableModels(key);
  step('可用模型', models.length ? 'ok' : 'bad', models.slice(0, 4).join('、') || '沒有可用的模型');
  for (const [label, s] of [['一般回答', false], ['串流回答', true]]) {
    t = Date.now();
    try {
      const g = await geminiCall('只回覆兩個字：好的', s ? { onText: () => {} } : {});
      const fellBack = s && !g.streamed;
      step(label, fellBack ? 'warn' : 'ok', `${g.model} 回答「${g.text.trim().slice(0, 10)}」，花了 ${((Date.now() - t) / 1000).toFixed(1)} 秒` + (fellBack ? '。串流連不上，已自動改用一般模式（答案會一次出現）' : ''));
    } catch (e) { step(label, 'bad', (e && (e.message || e.code)) || '失敗'); }
  }
}
export const aiReady = () => !!model || !!geminiKey();

export function onUser(cb) {
  return onAuthStateChanged(auth, u => cb(u ? {
    uid: u.uid, label: u.email || u.displayName || '已登入', name: u.displayName || ''
  } : null));
}

export async function loginGoogle() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  if (isStandalone()) return signInWithRedirect(auth, p);
  try { await signInWithPopup(auth, p); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code))
      return signInWithRedirect(auth, p);
    throw e;
  }
}
export const emailSignIn = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const emailSignUp = (email, pw) => createUserWithEmailAndPassword(auth, email, pw);
export const resetPassword = email => sendPasswordResetEmail(auth, email);
export const logout = () => signOut(auth);

// 每位使用者的私人資料：users/{uid}/items/{id}
export function userCol(uid) {
  const col = collection(db, 'users', uid, 'items');
  return {
    doc: id => ({
      set: v => setDoc(doc(col, id), JSON.parse(JSON.stringify(v))),
      delete: () => deleteDoc(doc(col, id))
    }),
    onSnapshot: (next, error) => onSnapshot(col, snap => next({
      docs: snap.docs.map(d => ({ id: d.id, data: () => d.data() })),
      empty: snap.empty,
      metadata: { fromCache: snap.metadata.fromCache }
    }), error)
  };
}

// AI：每人每天上限（存在手機上），保護免費額度
export async function aiCall(prompt, opts = {}) {
  if (!model && !geminiKey()) throw { code: 'not_granted' };
  const uid = auth && auth.currentUser ? auth.currentUser.uid : 'local';
  const key = 'ai-' + uid + '-' + new Date().toLocaleDateString('sv');
  let n = 0; try { n = +localStorage.getItem(key) || 0; } catch (e) {}
  if (n >= (C.aiDailyLimit || 20)) throw { code: 'rate_limited' };
  try { localStorage.setItem(key, n + 1); } catch (e) {}
  try {
    let text, used = '';
    if (model) text = (await model.generateContent(opts.images && opts.images.length ? [prompt, ...opts.images.map(im => ({ inlineData: { data: im.data, mimeType: im.mime } }))] : prompt)).response.text();
    else { const g = await geminiCall(prompt, opts); text = g.text; used = g.model; }
    if (opts.onText && (model || opts.json)) opts.onText({ text, delta: text });
    return { text, model: used };
  } catch (e) {
    if (e && ['quota', 'bad_key', 'network', 'unavailable'].includes(e.code) && !model) throw e;
    if (e && (e.code === 'quota' || e.code === 'bad_key')) throw e;
    const m = String(e && (e.message || e.code) || '');
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(m)) throw { code: 'quota' };
    console.error(e);
    throw { code: 'unavailable' };
  }
}
