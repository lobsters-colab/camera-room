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
const GKEY = 'ft-gemini-key', GMOD = 'ft-gemini-model';
const GMODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
export const geminiKey = () => { try { return localStorage.getItem(GKEY) || ''; } catch (e) { return ''; } };
export function setGeminiKey(k) { try { k ? localStorage.setItem(GKEY, k.trim()) : (localStorage.removeItem(GKEY), localStorage.removeItem(GMOD)); } catch (e) {} }
const GBASE = 'https://generativelanguage.googleapis.com/v1beta/';
let listed = null;
// 向 Google 查詢這把金鑰可以用的模型，挑適合聊天的 flash 系列
async function availableModels(key) {
  if (listed) return listed;
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
      .filter(n => /^gemini/.test(n) && !/(image|tts|audio|live|embed|vision|robotics|computer|native)/i.test(n));
    const ver = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? +m[1] : 0; };
    const score = n => (/latest/.test(n) ? 3 : 0) + (/flash/.test(n) ? 2 : 0) + (/lite/.test(n) ? 0.5 : 0) - (/(preview|exp)/.test(n) ? 1.5 : 0) + ver(n) / 10;
    ok.sort((x, y) => score(y) - score(x));
    listed = ok.length ? ok.slice(0, 6) : GMODELS;
  } catch (e) { if (e && e.code === 'bad_key') throw e; listed = GMODELS; }
  return listed;
}
async function geminiCall(prompt, opts = {}) {
  const key = geminiKey(); let pref = ''; try { pref = localStorage.getItem(GMOD) || ''; } catch (e) {}
  const models = await availableModels(key);
  const list = [...new Set([pref, ...models].filter(Boolean))];
  let lastErr = '';
  for (const m of list) {
    let r;
    try {
      r = await fetch(`${GBASE}models/${m}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [...(opts.images || []).map(im => ({ inline_data: { mime_type: im.mime, data: im.data } })), { text: prompt }] }],
          ...(opts.json ? { generationConfig: { responseMimeType: 'application/json' } } : {}) })
      });
    } catch (e) { throw { code: 'network', message: String(e && e.message || e) }; }
    const j = await r.json().catch(() => ({}));
    const msg = (j.error && j.error.message) || '';
    if (r.status === 404 || (/model/i.test(msg) && /(not found|not supported|deprecated|no longer)/i.test(msg))) { lastErr = m + '：' + (msg || '404'); if (m === pref) try { localStorage.removeItem(GMOD); } catch (e) {} continue; }
    if (r.status === 429) throw { code: 'quota', message: msg };
    if (r.status === 400 || r.status === 401 || r.status === 403) throw { code: 'bad_key', message: msg };
    if (!r.ok) { lastErr = m + '：HTTP ' + r.status + ' ' + msg; continue; }
    try { localStorage.setItem(GMOD, m); } catch (e) {}
    const c = j.candidates && j.candidates[0];
    const text = ((c && c.content && c.content.parts) || []).map(p => p.text || '').join('');
    if (!text) throw { code: 'unavailable', message: 'AI 沒有回覆內容' + (c && c.finishReason ? '（' + c.finishReason + '）' : '') };
    return text;
  }
  throw { code: 'unavailable', message: lastErr || '找不到可用的模型' };
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
    const text = model
      ? (await model.generateContent(opts.images && opts.images.length ? [prompt, ...opts.images.map(im => ({ inlineData: { data: im.data, mimeType: im.mime } }))] : prompt)).response.text()
      : await geminiCall(prompt, opts);
    if (opts.onText) opts.onText({ text, delta: text });
    return { text };
  } catch (e) {
    if (e && ['quota', 'bad_key', 'network', 'unavailable'].includes(e.code) && !model) throw e;
    if (e && (e.code === 'quota' || e.code === 'bad_key')) throw e;
    const m = String(e && (e.message || e.code) || '');
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(m)) throw { code: 'quota' };
    console.error(e);
    throw { code: 'unavailable' };
  }
}
