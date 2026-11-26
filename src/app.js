// ---------- Filter recipes ----------
const BASE = { lift: 0.01, g: 0.97, k: 0, fade: 0, sat: 1, mul: [1,1,1], off: [0,0,0], sh: [0,0,0], hi: [0,0,0], grain: 0.012, vig: 0.18, hal: 0, bw: null, face: 0.66, stamp: false, frame: "none" };
const CATS = ["全部", "數位", "富士", "柯達", "黑白", "其他"];
const FILTERS = [
  { id: "none",  cat: "*",    name: "原圖",              short: "原圖",       p: { none: true, lift: 0, g: 1, grain: 0, vig: 0 } },
  { id: "g7x",   cat: "數位", name: "Canon G7X",          short: "G7X",        p: { k: -0.1, fade: 0.035, sat: 0.88, mul: [1.06,0.985,0.95], off: [0.012,0,0.004], vig: 0.22, face: 0.68, stamp: true } },
  { id: "ccd",   cat: "數位", name: "CCD 冷白",           short: "CCD",        p: { k: 0.05, fade: 0.02, sat: 0.95, mul: [0.97,1.0,1.05], face: 0.7, stamp: true } },
  { id: "ricoh", cat: "數位", name: "理光 GR 正片",       short: "GR 正片",    p: { k: 0.45, sat: 1.15, sh: [0,0.005,0.02], mul: [1.01,1,0.98], vig: 0.22, face: 0.62, grain: 0.008 } },
  { id: "cc",    cat: "富士", name: "富士 Classic Chrome", short: "C.Chrome",   p: { k: 0.28, fade: 0.03, sat: 0.68, sh: [0,0.012,0.03], hi: [0.02,0.01,-0.01], mul: [1.0,0.99,0.97], face: 0.62 } },
  { id: "cn",    cat: "富士", name: "富士 Classic Neg",    short: "C.Neg",      p: { k: 0.35, fade: 0.04, sat: 0.85, sh: [-0.02,0.028,0.03], hi: [0.035,-0.005,0], mul: [1.02,0.99,0.95], face: 0.63 } },
  { id: "velvia",cat: "富士", name: "富士 Velvia",         short: "Velvia",     p: { k: 0.4, sat: 1.45, sh: [0,0,0.02], mul: [1.02,1,1], vig: 0.2, face: 0.62, grain: 0.008 } },
  { id: "pro400h",cat:"富士", name: "富士 Pro 400H",       short: "Pro 400H",   p: { k: -0.15, fade: 0.06, sat: 0.8, sh: [0,0.02,0.025], hi: [0,0.02,0.02], mul: [0.98,1.01,1.0], face: 0.72, vig: 0.1 } },
  { id: "superia",cat:"富士", name: "富士 Superia 400",    short: "Superia",    p: { k: 0.25, fade: 0.03, sh: [-0.01,0.03,0.01], hi: [0.01,0.01,-0.01], mul: [0.99,1.02,0.97], grain: 0.018, face: 0.65 } },
  { id: "portra",cat: "柯達", name: "柯達 Portra 400",     short: "Portra",     p: { k: -0.05, fade: 0.04, sat: 0.85, sh: [0.005,0.01,0.02], hi: [0.035,0.015,-0.01], mul: [1.04,1.0,0.95], grain: 0.014, face: 0.68 } },
  { id: "gold",  cat: "柯達", name: "柯達 Gold 200",       short: "Gold",       p: { k: 0.15, fade: 0.05, sat: 1.05, mul: [1.07,1.02,0.86], off: [0.01,0.005,0], hi: [0.03,0.02,-0.02], grain: 0.018, vig: 0.25, face: 0.66 } },
  { id: "colorplus",cat:"柯達",name:"柯達 ColorPlus 200",  short: "ColorPlus",  p: { k: 0.1, fade: 0.06, sat: 0.95, mul: [1.06,1.0,0.9], sh: [0.01,0.005,0], hi: [0.03,0.015,-0.02], grain: 0.02, face: 0.66 } },
  { id: "ektar", cat: "柯達", name: "柯達 Ektar 100",      short: "Ektar",      p: { k: 0.3, sat: 1.3, mul: [1.05,1.0,0.97], sh: [0,0,0.015], grain: 0.008, face: 0.64 } },
  { id: "hp5",   cat: "黑白", name: "Ilford HP5 黑白",     short: "HP5",        p: { bw: [0.35,0.5,0.15], k: 0.35, fade: 0.03, grain: 0.03, vig: 0.25, face: 0.62 } },
  { id: "trix",  cat: "黑白", name: "柯達 Tri-X 黑白",     short: "Tri-X",      p: { bw: [0.3,0.55,0.15], k: 0.6, grain: 0.035, vig: 0.3, face: 0.6 } },
  { id: "cine",  cat: "其他", name: "CineStill 800T",      short: "800T",       p: { k: 0.2, fade: 0.04, sat: 0.95, mul: [0.94,1.0,1.08], sh: [-0.01,0.01,0.045], hi: [0.02,0,-0.01], hal: 0.55, grain: 0.02, face: 0.64 } },
  { id: "pola",  cat: "其他", name: "拍立得",              short: "拍立得",     p: { k: -0.2, fade: 0.1, sat: 0.75, sh: [-0.01,0.03,0.02], hi: [0.04,0.02,-0.02], mul: [1.03,1.0,0.94], vig: 0.3, face: 0.68, frame: "pola" } },
  { id: "dispo", cat: "其他", name: "即可拍",              short: "即可拍",     p: { k: 0.3, fade: 0.05, sat: 1.1, mul: [1.05,1.01,0.9], sh: [0,0.02,0.01], grain: 0.026, vig: 0.38, face: 0.7, stamp: true } },
  { id: "jp",    cat: "其他", name: "日系空氣感",          short: "日系",       p: { k: -0.25, fade: 0.05, sat: 0.75, mul: [0.98,1.0,1.02], sh: [0,0.01,0.02], hi: [0,0.01,0.02], grain: 0.006, vig: 0.05, face: 0.74 } },
].map(f => ({ ...f, p: { ...BASE, ...f.p } }));
const FRAMES = [["none", "無", [0,0,0,0]], ["pola", "拍立得", [4,4,4,14]], ["polasq", "拍立得方形", [4,4,4,14]], ["white", "細白邊", [3,3,3,3]]];

// Adjustable values: every one can be dragged or typed.
const ICON = {
  bright: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  contrast: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M12 8h5.5M12 12h8M12 16h5.5"/>',
  sat: '<path d="M12 3.5c3.5 4 6 7 6 10.5a6 6 0 0 1-12 0c0-3.500 2.500-6.500 6-10.500z"/>',
  temp: '<path d="M10 14.500V5a2 2 0 0 1 4 0v9.500a4 4 0 1 1-4 0z"/><path d="M12 9v8"/>',
  tint: '<circle cx="9" cy="12" r="5.500"/><circle cx="15" cy="12" r="5.500"/>',
  fade: '<path d="M4 7h16M4 12h12M4 17h7"/>',
  grain: '<path d="M6 6h.01M12 5h.01M18 7h.01M8 11h.01M15 12h.01M5 16h.01M11 17h.01M18 17h.01M13 8.500h.01M9 14.500h.01"/>',
  vig: '<rect x="3.500" y="5" width="17" height="14" rx="2"/><ellipse cx="12" cy="12" rx="5" ry="4"/>',
  halo: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.500" stroke-dasharray="2 2.500"/>',
  face: '<circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01M9 14.500c1.800 1.500 4.200 1.500 6 0"/>',
  reset: '<path d="M5 12a7 7 0 1 0 2.200-5.100"/><path d="M5 5v4h4"/>',
  ai: '<path d="M10 4l1.600 4.400L16 10l-4.400 1.600L10 16l-1.600-4.400L4 10l4.400-1.600z"/><path d="M17.500 14l.8 2.200 2.200.8-2.200.8-.8 2.200-.8-2.200-2.200-.8 2.200-.8z"/>',
  brush: '<path d="M14 5l5 5-7.500 7.500a3.500 3.500 0 0 1-5-5z"/><path d="M6.500 17.500c-1 .5-2 2-2.500 3.500 1.500 0 3-.5 3.800-1.500"/>',
  eraser: '<path d="M8.500 19.500h11M4.500 15.500l9-9a2 2 0 0 1 2.800 0l2.200 2.200a2 2 0 0 1 0 2.800l-8 8H7.500l-3-3a.7.7 0 0 1 0-1z"/>',
  clear: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const PARAMS = [
  { id: "strength", label: "強度", min: 0, max: 100, def: 100, note: "" },
  { id: "bright",   label: "亮度", min: -100, max: 100, def: 0, note: "開著自動臉部亮度時，這裡是在自動結果上再加減" },
  { id: "contrast", label: "對比", min: -100, max: 100, def: 0, note: "正值更銳利分明，負值更柔和" },
  { id: "sat",      label: "飽和", min: -100, max: 100, def: 0, note: "-100 會接近黑白" },
  { id: "temp",     label: "色溫", min: -100, max: 100, def: 0, note: "正值偏暖黃，負值偏冷藍" },
  { id: "tint",     label: "色調", min: -100, max: 100, def: 0, note: "正值偏洋紅，負值偏綠" },
  { id: "fade",     label: "褪色", min: 0, max: 100, def: 0, note: "把黑色抬成霧霧的灰" },
  { id: "grain",    label: "顆粒", min: 0, max: 300, def: 100, note: "100 是這款濾鏡原本的顆粒量" },
  { id: "vig",      label: "暗角", min: 0, max: 300, def: 100, note: "100 是這款濾鏡原本的暗角" },
  { id: "halo",     label: "光暈", min: 0, max: 100, def: 0, note: "燈光周圍的紅色光暈，夜景最明顯" },
  { id: "brush",    label: "筆刷", min: 5, max: 150, def: 36, ui: true },
];
const ADJUST = PARAMS.filter(p => p.id !== "strength" && !p.ui);
const param = id => PARAMS.find(p => p.id === id);

/*CORE*/

// Fast grade for small chip thumbnails (no grain/halation).
function renderThumb(canvas, img, P, ex) {
  const W = canvas.width, H = canvas.height, ctx = canvas.getContext("2d", { willReadFrequently: true });
  const s = Math.max(W / img.width, H / img.height), dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (W - dw)/2, (H - dh)/2, dw, dh);
  const id = ctx.getImageData(0, 0, W, H), d = id.data, o = [0,0,0];
  for (let i = 0; i < d.length; i += 4) {
    gradePx(d[i]/255, d[i+1]/255, d[i+2]/255, P, ex.G, ex.R, o);
    d[i] = o[0]*255; d[i+1] = o[1]*255; d[i+2] = o[2]*255;
  }
  ctx.putImageData(id, 0, 0);
}

// ---------- State ----------
const $ = id => document.getElementById(id);
const state = { photos: [], cur: 0, filter: "g7x", cat: "全部", frame: "none", frameTouched: false, stampTouched: false, stampManual: null, autoFace: true, tab: "tpl", template: null, tool: "bright", eraser: false, smart: true, adj: {} };
PARAMS.forEach(p => state.adj[p.id] = p.def);
const PREVIEW_MAX = 1400, PREFS = "darkroom-prefs-v2";
const graded = document.createElement("canvas");
let previewSrc = null;

function savePrefs() {
  try {
    localStorage.setItem(PREFS, JSON.stringify({ filter: state.filter, frame: state.frame, frameTouched: state.frameTouched, stamp: $("stamp").checked, stampTouched: state.stampTouched, autoFace: state.autoFace, caption: $("caption").value, adj: state.adj }));
  } catch (e) {}
}
function loadPrefs() {
  try {
    const s = JSON.parse(localStorage.getItem(PREFS) || "null");
    if (!s) return false;
    if (FILTERS.some(f => f.id === s.filter)) state.filter = s.filter;
    if (FRAMES.some(f => f[0] === s.frame)) state.frame = s.frame;
    state.frameTouched = !!s.frameTouched; state.stampTouched = !!s.stampTouched; state.autoFace = s.autoFace !== false;
    $("stamp").checked = !!s.stamp; $("caption").value = s.caption || "";
    PARAMS.forEach(p => { const v = Number(s.adj && s.adj[p.id]); if (Number.isFinite(v)) state.adj[p.id] = Math.min(p.max, Math.max(p.min, v)); });
    return true;
  } catch (e) { return false; }
}

// iOS releases canvas memory only when a canvas shrinks to 0x0, so do that for canvases we drop
function freeCanvas(...cs) { for (const c of cs) if (c && c.width) { c.width = 0; c.height = 0; } }
const FULL_MAX = 4096; // longest side kept for editing/export
function scaledCanvas(img, max) {
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
}
function cropSquare(img) {
  const s = Math.min(img.width, img.height), c = document.createElement("canvas");
  c.width = c.height = s;
  // keep a little more of the top so heads are not cut in portrait shots
  c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) * 0.35, s, s, 0, 0, s, s);
  return c;
}
const sourceFor = (img, frame) => frame === "polasq" ? cropSquare(img) : img;
// while erasing, the photo is shown whole and unframed so strokes map straight onto it
const viewFrame = () => state.tab === "erase" ? "none" : state.frame;
const curPhoto = () => state.photos[state.cur];
function skinOf(canvas) {
  const small = scaledCanvas(canvas, 600);
  return sampleSkin(small.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, small.width, small.height).data, small.width, small.height);
}
const pad2 = n => String(n).padStart(2, "0");
const fmtStamp = d => `'${String(d.getFullYear()).slice(2)} ${pad2(d.getMonth()+1)} ${pad2(d.getDate())}`;
const stampFor = photo => state.stampManual != null ? state.stampManual : fmtStamp(photo.date || new Date());
const currentFilter = () => FILTERS.find(f => f.id === state.filter);
// Recipe with the user's own values applied on top.
function effP(P, a = state.adj) {
  const t = a.temp / 100, ti = a.tint / 100;
  return { ...P,
    k: P.k + a.contrast / 100 * 0.6,
    sat: P.sat * (1 + a.sat / 100),
    fade: Math.min(0.45, P.fade + a.fade / 100 * 0.2),
    mul: [P.mul[0] * (1 + 0.12*t) * (1 + 0.04*ti), P.mul[1] * (1 - 0.08*ti), P.mul[2] * (1 - 0.12*t) * (1 + 0.04*ti)],
    vig: P.vig * a.vig / 100,
    hal: P.hal + a.halo / 100 * 0.8,
  };
}
const exposureFor = (photo, P, a = state.adj) => solveExposure(photo.skin, P, state.autoFace, a.bright / 10);
function optsFor(photo, P) {
  return { strength: state.adj.strength / 100, grain: state.adj.grain / 100, stamp: $("stamp").checked, stampText: stampFor(photo), exposure: exposureFor(photo, P) };
}

/*EXIF*/
// source: a canvas or ImageBitmap to build the previews from; src: the original file to re-decode later.
// Only the sample keeps its full canvas; real photos are decoded again from src when needed.
function addPhoto(source, name, sample, date, src) {
  const prev = scaledCanvas(source, PREVIEW_MAX), th = scaledCanvas(source, 120);
  const photo = { name, src: src || null, full: src ? null : source, prev, prevLow: scaledCanvas(source, 720), skin: skinOf(prev), sample: !!sample, date: date || null, thumb: th.toDataURL("image/jpeg", 0.8), mask: null, undo: [], dirty: false };
  freeCanvas(th);
  state.photos.push(photo);
  return photo;
}
async function ensureFull(photo) {
  if (photo.full && photo.full.width) return photo.full;
  const bmp = await createImageBitmap(photo.src, { imageOrientation: "from-image" });
  photo.full = scaledCanvas(bmp, FULL_MAX);
  if (bmp.close) bmp.close();
  return photo.full;
}
async function ensureLoaded(photo) {
  if (photo.prev && photo.prev.width) return;
  const keepFull = photo.full && photo.full.width, f = await ensureFull(photo);
  photo.prev = scaledCanvas(f, PREVIEW_MAX); photo.prevLow = scaledCanvas(f, 720); photo.skin = skinOf(photo.prev);
  if (!keepFull && !photo.dirty) { freeCanvas(f); photo.full = null; }
}
// drop a photo's big canvases; edits are kept by re-encoding the full image first
async function unloadPhoto(photo) {
  if (!photo || photo.sample) return;
  if (photo.dirty && photo.full && photo.full.width) { photo.src = await new Promise(r => photo.full.toBlob(r, "image/jpeg", 0.95)); photo.dirty = false; }
  if (!photo.src) return;
  freeCanvas(photo.full, photo.prev, photo.prevLow, photo.chipSrc, photo.mask);
  photo.full = photo.prev = photo.prevLow = photo.chipSrc = photo.mask = null; photo.det = null;
}
// after an export, free the full canvas unless it holds unsaved erase edits
function dropFullIfClean(photo) {
  if (photo.src && !photo.dirty && photo.full) { freeCanvas(photo.full); photo.full = null; }
  if (GPU && GPU.release) GPU.release();
}
let selectToken = 0;
async function selectPhoto(i) {
  const token = ++selectToken, old = curPhoto(), next = state.photos[i];
  if (!next) return;
  if (!next.prev || !next.prev.width) say("讀取照片中…", true);
  try { await ensureLoaded(next); } catch (e) { say("這張照片讀不出來"); return; }
  if (token !== selectToken) return;
  state.cur = i;
  if (old && old !== next) unloadPhoto(old);
  say("");
  renderThumbs(); renderChips(); renderTemplates(); renderEraseTools(); renderPreview();
}

// ---------- UI rendering ----------
function renderThumbs() {
  const t = $("thumbs"), real = state.photos.filter(p => !p.sample);
  t.innerHTML = "";
  $("saveAll").hidden = real.length < 2;
  if (real.length < 2) return;
  state.photos.forEach((p, i) => {
    const im = document.createElement("img");
    im.src = p.thumb; im.alt = p.name; im.tabIndex = 0;
    if (i === state.cur) im.className = "on";
    const pick = () => selectPhoto(i);
    im.onclick = pick; im.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } };
    t.appendChild(im);
  });
}
function renderCats() {
  const host = $("cats"); host.innerHTML = "";
  CATS.forEach(c => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = c; b.setAttribute("aria-pressed", String(c === state.cat));
    b.onclick = () => { state.cat = c; renderCats(); renderChips(); $("filters").scrollLeft = 0; };
    host.appendChild(b);
  });
}
function renderFrames() {
  const host = $("frames"); host.innerHTML = "";
  FRAMES.forEach(([id, label, b4]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "frame-opt"; b.setAttribute("aria-pressed", String(id === state.frame));
    const w = id === "polasq" ? 26 : 30, h = id === "polasq" ? 26 : 24;
    b.innerHTML = `<i><b style="width:${w}px;height:${h}px;box-sizing:content-box;border-style:solid;border-color:#f6f3ea;border-width:${b4[1]}px ${b4[2]}px ${b4[3]}px ${b4[0]}px"></b></i>${label}`;
    b.onclick = () => { state.frame = id; state.frameTouched = true; renderFrames(); renderPreview(); savePrefs(); };
    host.appendChild(b);
  });
}
function pickFilter(f) {
  state.filter = f.id; state.template = null; renderTemplatesSoon();
  if (!state.stampTouched) $("stamp").checked = f.p.stamp;
  if (!state.frameTouched) { state.frame = f.p.frame; renderFrames(); }
  renderChips(); renderPreview(); savePrefs();
}
function renderChips() {
  const host = $("filters"), photo = state.photos[state.cur];
  if (!host.children.length) {
    FILTERS.forEach(f => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.id = f.id; b.title = f.name;
      b.innerHTML = `<canvas width="132" height="132"></canvas><span>${f.short}</span>`;
      b.onclick = () => pickFilter(f);
      host.appendChild(b);
    });
  }
  [...host.children].forEach(b => {
    const f = FILTERS.find(x => x.id === b.dataset.id);
    b.hidden = !(state.cat === "全部" || f.cat === "*" || f.cat === state.cat);
    b.setAttribute("aria-pressed", String(f.id === state.filter));
  });
  if (state.tab !== "filter") { chipsDirty = true; return; }
  chipsDirty = false;
  if (!photo.chipSrc) {
    const s = 132, c = document.createElement("canvas"); c.width = c.height = s;
    const k = Math.max(s / photo.prev.width, s / photo.prev.height), dw = photo.prev.width * k, dh = photo.prev.height * k;
    c.getContext("2d").drawImage(photo.prev, (s - dw) / 2, (s - dh) / 2, dw, dh);
    photo.chipSrc = c;
  }
  [...host.children].forEach(b => {
    if (b.hidden) return;
    const f = FILTERS.find(x => x.id === b.dataset.id), P = effP(f.p), ex = exposureFor(photo, P), cv = b.querySelector("canvas");
    const g = GPU && GPU.render(photo.chipSrc, P, { exposure: ex, strength: 1, grain: 0 }, null);
    if (g) { const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(g, 0, 0, cv.width, cv.height); }
    else renderThumb(cv, photo.prev, P, ex);
  });
}
let chipsDirty = false;
function renderTools() {
  const host = $("tools"); host.innerHTML = "";
  const mk = (cls, icon, label, small, pressed, onclick) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tool" + cls;
    if (pressed != null) b.setAttribute("aria-pressed", String(pressed));
    b.innerHTML = `<i><svg viewBox="0 0 24 24">${ICON[icon]}</svg></i><span>${label}</span><small>${small}</small>`;
    b.onclick = onclick; host.appendChild(b);
  };
  mk("", "reset", "重設", "", null, () => { PARAMS.forEach(p => { if (!p.ui) state.adj[p.id] = p.def; }); refreshAll(); });
  mk(state.autoFace ? " on" : "", "face", "自動臉部", state.autoFace ? "開" : "關", null, () => { state.autoFace = !state.autoFace; refreshAll(); });
  const sep = document.createElement("div"); sep.className = "sep"; host.appendChild(sep);
  ADJUST.forEach(p => {
    const v = state.adj[p.id], changed = v !== p.def;
    mk(changed ? " on" : "", p.id, p.label, changed ? (p.min < 0 && v > 0 ? "+" : "") + v : "", p.id === state.tool, () => { state.tool = p.id; renderTools(); bindRow("adjust", p); $("adjustNote").textContent = p.note; });
  });
}
function refreshAll() {
  renderTemplatesSoon();
  bindRow("strength", param("strength")); bindRow("adjust", param(state.tool));
  $("adjustNote").textContent = param(state.tool).note;
  const sl = $("tools").scrollLeft; renderTools(); $("tools").scrollLeft = sl;
  renderChips(); renderPreview(); savePrefs();
}

// A ruler row: drag/fling the scale, double-tap it to reset, or tap the number to type an exact value.
const rulers = {};
function bindRow(prefix, p) {
  const host = $(prefix + "Row");
  if (!host.children.length) {
    host.innerHTML = `<span class="sl-label" id="${prefix}Label"></span><div class="ruler" id="${prefix}Ruler" aria-labelledby="${prefix}Label"></div><div class="num"><button type="button" aria-label="減 1">−</button><input id="${prefix}Num" type="number" inputmode="numeric" step="1" aria-label="輸入數值"><button type="button" aria-label="加 1">＋</button></div>`;
  }
  const label = $(prefix + "Label"), num = $(prefix + "Num"), [minus, plus] = host.querySelectorAll(".num button");
  label.textContent = p.label;
  num.min = p.min; num.max = p.max; num.value = state.adj[p.id];
  const set = (v, done, fromRuler) => {
    v = Math.round(Math.min(p.max, Math.max(p.min, v)));
    const changed = v !== state.adj[p.id] || (done && state.dragging);
    state.dragging = !done;
    state.adj[p.id] = v;
    if (!fromRuler) rulers[prefix].setValue(v);
    if (document.activeElement !== num || done) num.value = v;
    if (p.ui) { if (done) savePrefs(); return; }
    if (changed) renderPreview();
    if (done) { const sl = $("tools").scrollLeft; renderTools(); $("tools").scrollLeft = sl; renderChipsSoon(); if (state.template) { state.template = null; renderTemplatesSoon(); } savePrefs(); }
  };
  const ro = { min: p.min, max: p.max, def: p.def, value: state.adj[p.id] };
  if (!rulers[prefix]) rulers[prefix] = makeRuler($(prefix + "Ruler"), { ...ro, onInput: (v, done) => rulers[prefix].cb(v, done) });
  rulers[prefix].cb = (v, done) => set(v, done, true);
  rulers[prefix].update(ro);
  num.oninput = () => { const v = parseFloat(num.value); if (Number.isFinite(v)) set(v, false); };
  num.onchange = num.onblur = () => { const v = parseFloat(num.value); set(Number.isFinite(v) ? v : state.adj[p.id], true); };
  num.onkeydown = e => { if (e.key === "Enter") num.blur(); };
  num.onfocus = () => num.select();
  minus.onclick = () => set(state.adj[p.id] - 1, true);
  plus.onclick = () => set(state.adj[p.id] + 1, true);
}
// chip thumbnails are re-graded after the user lets go, off the drag path
let chipTimer = 0;
function renderChipsSoon() { clearTimeout(chipTimer); chipTimer = setTimeout(renderChips, 120); }

function showComposed(src) { compose($("viewCanvas"), src, viewFrame(), $("caption").value.trim()); fitView(); }
// size the preview (and the paint layer) to fit the stage, for tall and wide photos alike
function fitView() {
  const box = document.querySelector(".fit"), vc = $("viewCanvas"), pc = $("paint");
  const bw = box.clientWidth, bh = box.clientHeight;
  if (!bw || !bh || !vc.width || !vc.height) return;
  const s = Math.min(bw / vc.width, bh / vc.height);
  const w = Math.floor(vc.width * s) + "px", h = Math.floor(vc.height * s) + "px";
  vc.style.width = w; vc.style.height = h; pc.style.width = w; pc.style.height = h;
}
new ResizeObserver(fitView).observe(document.querySelector(".fit"));
let raf = 0, lastMs = 0;
function renderPreview() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const photo = state.photos[state.cur], f = currentFilter(), P = effP(f.p);
    if (document.activeElement !== $("stampText")) $("stampText").value = stampFor(photo);
    // while a value is being dragged, preview at lower resolution so it follows the finger
    const low = state.dragging && photo.prevLow;
    previewSrc = sourceFor(low ? photo.prevLow : photo.prev, viewFrame());
    const t0 = performance.now();
    renderGraded(graded, previewSrc, P, optsFor(photo, P));
    if (!low) lastMs = performance.now() - t0;
    showComposed(graded);
    syncPaint();
    const faceNote = !state.autoFace || f.p.none ? "" : (photo.skin ? " · 已偵測臉部" : " · 沒偵測到臉");
    $("badge").textContent = (photo.sample ? "範例圖 · " : "") + f.name + faceNote;
  });
}

// ---------- Saving ----------
let downloads = null;
(async () => {
  try { if (window.claude && window.claude.use) downloads = await window.claude.use("downloads"); } catch (e) { downloads = null; }
})();
const toBlob = canvas => new Promise(res => canvas.toBlob(res, "image/jpeg", 0.95));
async function exportPhoto(photo) {
  if (!photo.skin) await ensureLoaded(photo);
  const full = await ensureFull(photo);
  const P = effP(currentFilter().p), tmp = document.createElement("canvas"), out = document.createElement("canvas");
  const src = sourceFor(full, state.frame);
  renderGraded(tmp, src, P, optsFor(photo, P));
  if (src !== full) freeCanvas(src);
  compose(out, tmp, state.frame, $("caption").value.trim());
  freeCanvas(tmp);
  const blob = await toBlob(out);
  freeCanvas(out);
  if (!blob) throw new Error("toBlob");
  dropFullIfClean(photo);
  const base = (photo.name || "photo").replace(/\.[^.]+$/, "");
  return { blob, name: `${base}_${state.filter}.jpg` };
}
async function deliver(file, multi, tries) { return deliverMany([file], tries); }
function isIOSDevice() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
// Safari only opens the share sheet right after a tap; after slow processing, ask for one more tap
function tapToShare(files) {
  return new Promise(resolve => {
    const ov = $("overlay"), url = URL.createObjectURL(files[0].blob), vid = !!files[0].video;
    $("overlayImg").hidden = vid; $("overlayVid").hidden = !vid;
    if (vid) $("overlayVid").src = url; else $("overlayImg").src = url;
    $("overlayMsg").textContent = files.length > 1 ? `${files.length} 個檔案處理好了` : "處理好了";
    $("overlayShare").hidden = false; $("overlayShare").textContent = vid ? "存影片" : files.length > 1 ? `存 ${files.length} 張到相簿` : "存到相簿";
    ov.classList.add("on");
    const done = r => { ov.classList.remove("on"); $("overlayShare").hidden = true; $("overlayVid").pause(); URL.revokeObjectURL(url); resolve(r); };
    $("overlayShare").onclick = async () => {
      try { await navigator.share({ files: files.map(f => new File([f.blob], f.name, { type: f.blob.type || "image/jpeg" })) }); done("saved"); }
      catch (e) { if (e && e.name === "AbortError") done("declined"); else { $("overlayMsg").textContent = "無法開啟分享，請長按圖片儲存"; $("overlayShare").hidden = true; } }
    };
    $("overlayClose").onclick = () => done("declined");
  });
}
async function deliverMany(files, tries) {
  if (downloads) {
    let saved = 0;
    for (const file of files) {
      const r = await deliverOne(file, files.length > 1, tries);
      if (r === "declined") return saved ? "saved" : "declined";
      saved++;
    }
    return "saved";
  }
  const standalone = window.self === window.top;
  if (standalone) {
    const fs = files.map(f => new File([f.blob], f.name, { type: f.blob.type || "image/jpeg" }));
    if (navigator.canShare && navigator.canShare({ files: fs })) {
      try { await navigator.share({ files: fs }); return "saved"; }
      catch (e) {
        if (e && e.name === "AbortError") return "declined";
        if (e && e.name === "NotAllowedError") return tapToShare(files);
      }
    }
  }
  let last = "shown";
  for (const file of files) { last = await deliverOne(file, files.length > 1, tries); if (last === "declined") break; }
  return last;
}
async function deliverOne(file, multi, tries) {
  if (downloads) {
    try { await downloads.save({ filename: file.name, data: file.blob }); return "saved"; }
    catch (e) {
      if (e && e.code === "declined") return "declined";
      if (e && e.code === "rate_limited" && (tries || 0) < 3) { await new Promise(r => setTimeout(r, 1500)); return deliverOne(file, multi, (tries || 0) + 1); }
    }
  }
  const standalone = window.self === window.top;
  if (standalone && !downloads) {
    if (!isIOSDevice()) {
      const u = URL.createObjectURL(file.blob), a = document.createElement("a");
      a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 10000);
      return "saved";
    }
  }
  const url = URL.createObjectURL(file.blob);
  $("overlayImg").hidden = !!file.video; $("overlayVid").hidden = !file.video;
  if (file.video) $("overlayVid").src = url; else $("overlayImg").src = url;
  $("overlayMsg").textContent = file.video ? "用影片右下角的選單或分享鍵存到相簿" : multi ? "長按圖片儲存，關閉後會顯示下一張" : "長按圖片即可儲存到相簿";
  $("overlay").classList.add("on");
  await new Promise(r => { $("overlayClose").onclick = () => { $("overlay").classList.remove("on"); $("overlayVid").pause(); URL.revokeObjectURL(url); r(); }; });
  return "shown";
}
let statusTimer = 0;
function say(msg, keep) {
  clearTimeout(statusTimer);
  const s = document.querySelector(".mode:not([hidden]) .status") || $("status");
  document.querySelectorAll(".status").forEach(x => { if (x !== s) x.textContent = ""; });
  s.textContent = msg || "";
  if (msg && !keep) statusTimer = setTimeout(() => s.textContent = "", 3500);
}
function busy(on, msg) { $("saveOne").disabled = $("saveAll").disabled = on; say(msg, on); }
const tick = () => new Promise(r => setTimeout(r, 30));
$("saveOne").onclick = async () => {
  if (state.mode === "collage") return exportCollage();
  if (state.mode === "reel") return exportReel();
  const photo = state.photos[state.cur];
  busy(true, "正在用原始解析度處理…"); await tick();
  try {
    const file = await exportPhoto(photo);
    const res = await deliver(file, false);
    busy(false, res === "saved" ? "已儲存" : res === "declined" ? "已取消儲存" : "");
  } catch (e) { busy(false, "處理失敗，照片可能太大，請再試一次"); }
};
$("saveAll").onclick = async () => {
  const list = state.photos.filter(p => !p.sample), files = [];
  try {
    for (const p of list) {
      busy(true, `處理中 ${files.length + 1} / ${list.length}…`); await tick();
      files.push(await exportPhoto(p));
      if (p !== curPhoto()) await unloadPhoto(p);
    }
  } catch (e) { busy(false, `第 ${files.length + 1} 張處理失敗，先存已完成的 ${files.length} 張`); }
  if (!files.length) { busy(false, "處理失敗，請再試一次"); return; }
  const res = await deliverMany(files);
  busy(false, res === "saved" ? `已儲存 ${files.length} 張` : res === "declined" ? "已取消儲存" : "");
};

// ---------- Inputs ----------
$("file").onchange = async e => {
  const files = [...e.target.files]; if (!files.length) return;
  say("讀取照片中…", true);
  const before = curPhoto();
  state.photos = state.photos.filter(p => !p.sample);
  const start = state.photos.length; let failed = "";
  for (const f of files) {
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
      let date = null;
      try { date = exifDate(await f.slice(0, 262144).arrayBuffer()); } catch (err) {}
      const p = addPhoto(bmp, f.name, false, date, f);
      if (bmp.close) bmp.close();
      // only the photo on screen keeps its previews
      if (state.photos.length - 1 !== start) unloadPhoto(p);
    } catch (err) { failed = `${f.name} 無法讀取，請換成 JPG 或 PNG`; }
  }
  if (!state.photos.length) addPhoto(makeSample(), "sample", true);
  state.cur = Math.min(start, state.photos.length - 1);
  if (before && before !== curPhoto()) unloadPhoto(before);
  say(failed);
  e.target.value = "";
  renderThumbs(); renderChips(); renderTemplates(); renderEraseTools(); renderPreview();
  if (window.afterEditLoad) { const f = window.afterEditLoad; window.afterEditLoad = null; f(); }
};
$("tabbar").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  state.tab = b.dataset.tab;
  if (state.tab === "filter" && chipsDirty) setTimeout(renderChips, 0);
  [...$("tabbar").children].forEach(x => x.setAttribute("aria-selected", String(x === b)));
  if (state.tab === "tpl" && tplDirty) setTimeout(renderTemplates, 0);
  ["tpl", "filter", "adjust", "erase", "frame"].forEach(t => $("tab-" + t).hidden = t !== state.tab);
  $("holdBtn").hidden = state.tab === "erase";
  renderPreview();
};
$("stamp").onchange = () => { state.stampTouched = true; renderPreview(); savePrefs(); };
$("stampText").oninput = () => { const v = $("stampText").value.trim(); state.stampManual = v || null; renderPreview(); };
$("stampText").onblur = renderPreview;
$("caption").oninput = () => { showComposed(graded); savePrefs(); };

// ---------- Erase: paint over things, or let the detector find passersby ----------
function ensureMask(photo) {
  if (!photo.mask || photo.mask.width !== photo.prev.width || photo.mask.height !== photo.prev.height) {
    photo.mask = document.createElement("canvas"); photo.mask.width = photo.prev.width; photo.mask.height = photo.prev.height;
  }
  return photo.mask;
}
function syncPaint() {
  const pc = $("paint"), photo = curPhoto();
  pc.hidden = state.tab !== "erase";
  if (pc.hidden) return;
  fitView();
  if (pc.width !== photo.prev.width || pc.height !== photo.prev.height) { pc.width = photo.prev.width; pc.height = photo.prev.height; }
  const ctx = pc.getContext("2d"); ctx.clearRect(0, 0, pc.width, pc.height);
  if (photo.mask) ctx.drawImage(photo.mask, 0, 0, pc.width, pc.height);
}
function refreshPhoto(photo) {
  freeCanvas(photo.prev, photo.prevLow, photo.chipSrc);
  photo.prev = scaledCanvas(photo.full, PREVIEW_MAX); photo.prevLow = scaledCanvas(photo.full, 720); photo.skin = skinOf(photo.prev); photo.det = null; photo.chipSrc = null; photo.rec = null;
  const th = scaledCanvas(photo.full, 120); photo.thumb = th.toDataURL("image/jpeg", 0.8); freeCanvas(th);
  renderThumbs(); renderChips(); renderTemplates(); renderEraseTools(); renderPreview();
}
function renderEraseTools() {
  const host = $("eraseTools"), photo = curPhoto(); host.innerHTML = "";
  const mk = (icon, label, small, pressed, onclick) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tool";
    if (pressed != null) b.setAttribute("aria-pressed", String(pressed));
    b.innerHTML = `<i><svg viewBox="0 0 24 24">${ICON[icon]}</svg></i><span>${label}</span><small>${small}</small>`;
    b.onclick = onclick; host.appendChild(b);
  };
  mk("ai", "AI 找路人", "", null, aiFind);
  const sep = document.createElement("div"); sep.className = "sep"; host.appendChild(sep);
  mk("brush", "塗抹", "", !state.eraser, () => { state.eraser = false; renderEraseTools(); });
  mk("face", "智慧選人", state.smart ? "開" : "關", state.smart, () => { state.smart = !state.smart; renderEraseTools(); say(state.smart ? "塗到人身上會自動選取整個人" : "只消除你塗到的地方"); });
  mk("eraser", "擦掉紅色", "", state.eraser, () => { state.eraser = true; renderEraseTools(); });
  mk("clear", "清除塗抹", "", null, () => { if (photo.mask) photo.mask.getContext("2d").clearRect(0, 0, photo.mask.width, photo.mask.height); syncPaint(); });
  mk("reset", "復原", photo.undo.length ? String(photo.undo.length) : "", null, () => {
    const u = photo.undo.pop(); if (!u) { say("沒有可以復原的步驟"); return; }
    ensureFull(photo).then(full => {
      full.getContext("2d").putImageData(u.data, u.x, u.y);
      full.__ver = (full.__ver || 0) + 1; photo.dirty = true;
      refreshPhoto(photo); say("已復原");
    }).catch(() => say("復原失敗"));
  });
}
// Fallback when the on-device model is not available here: ask Claude where the passersby are.
async function findPassersbyWithClaude(photo) {
  const sample = window.claude && window.claude.use ? await window.claude.use("sample") : null;
  if (!sample) throw new Error("no sample");
  const lim = await sample.limits();
  if (!lim || !lim.images) throw new Error("no images");
  const small = scaledCanvas(photo.prev, 1024);
  const blob = await new Promise(res => small.toBlob(res, "image/jpeg", 0.85));
  const ask = 'Look at the attached photo. Find every person in it. Reply with JSON only, no other text, in this exact shape: {"people":[{"role":"subject","box":[x0,y0,x1,y1]}]}. "role" is "subject" for the main person or people the photo is of (foreground, largest, posing for the camera) and "passerby" for anyone else in the background. "box" is a tight bounding box around the whole visible person, as fractions from 0 to 1 of the image width (x) and height (y), top-left origin. If there are no people, reply {"people":[]}.';
  const r = await sample.json(ask, { images: [blob], cache: false });
  const people = (r && Array.isArray(r.people) ? r.people : []).filter(p => p && Array.isArray(p.box) && p.box.length === 4 && p.box.every(v => Number.isFinite(Number(v))));
  const others = people.filter(p => p.role === "passerby"), W = photo.prev.width, H = photo.prev.height;
  const ctx = ensureMask(photo).getContext("2d");
  ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#ff3b30";
  for (const p of others) {
    let [x0, y0, x1, y1] = p.box.map(Number).map(v => Math.min(1, Math.max(0, v)));
    if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0];
    const padX = (x1 - x0) * 0.08 + 0.004, padY = (y1 - y0) * 0.05 + 0.004;
    const rx = Math.max(0, x0 - padX) * W, ry = Math.max(0, y0 - padY) * H, rw = Math.min(1, x1 + padX) * W - rx, rh = Math.min(1, y1 + padY) * H - ry, rad = Math.min(rw, rh) * 0.25;
    ctx.beginPath();
    ctx.moveTo(rx + rad, ry); ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rad); ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rad); ctx.arcTo(rx, ry + rh, rx, ry, rad); ctx.arcTo(rx, ry, rx + rw, ry, rad);
    ctx.closePath(); ctx.fill();
  }
  return { subjects: people.length - others.length, passersby: others.length };
}
let localAI = true, aiErase = true;
async function aiFind() {
  const photo = curPhoto();
  let r = null;
  if (localAI) {
    busy(true, detector ? "AI 正在找路人…" : "AI 準備中，第一次要下載模型…"); await tick();
    try { r = await findPassersby(photo); } catch (e) { localAI = false; }
  }
  if (!r) {
    busy(true, "把照片交給 Claude 找路人…"); await tick();
    try { r = await findPassersbyWithClaude(photo); }
    catch (e) { busy(false, e && e.code === "rate_limited" ? "Claude 暫時忙碌，稍後再試或手動塗抹" : "這裡無法使用 AI 找路人，請手動塗抹"); return; }
  }
  syncPaint();
  busy(false, r.passersby ? `找到 ${r.passersby} 個路人並塗紅，確認後按消除` : r.subjects ? "沒找到背景路人，可以自己塗抹" : "沒偵測到人，可以自己塗抹");
}
$("applyErase").onclick = async () => {
  const photo = curPhoto();
  if (!photo.mask) { say("先把要消除的地方塗紅"); return; }
  busy(true, sessions.inpaint ? "AI 消除中…" : "AI 準備中，第一次要下載模型…"); $("applyErase").disabled = true; await tick();
  try {
    let u = null;
    const full = await ensureFull(photo);
    if (aiErase) {
      try { u = await eraseAI(full, photo.mask); }
      catch (e) { aiErase = false; }
    }
    if (!aiErase) { say("AI 模型無法使用，改用基本消除…", true); await tick(); u = eraseFromPhoto(full, photo.mask); }
    if (!u) { busy(false, "先把要消除的地方塗紅"); return; }
    photo.dirty = true;
    if (GPU && GPU.release) GPU.release();
    photo.undo.push(u); if (photo.undo.length > 8) photo.undo.shift();
    photo.mask.getContext("2d").clearRect(0, 0, photo.mask.width, photo.mask.height);
    refreshPhoto(photo);
    busy(false, "已消除，不滿意可以按復原");
  } catch (e) { busy(false, "消除失敗，請縮小範圍再試"); }
  finally { $("applyErase").disabled = false; }
};

// stage gestures: hold to compare with the original, or paint while on the erase tab
const showOrig = e => { if (e && e.cancelable) e.preventDefault(); if (previewSrc) showComposed(previewSrc); };
const showEdit = () => showComposed(graded);
const stage = $("stage");
let lastPt = null, strokeCv = null;
function paintPoint(e) {
  const r = $("paint").getBoundingClientRect(), photo = curPhoto(), k = photo.prev.width / r.width;
  return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k };
}
function paintStroke(p) {
  const photo = curPhoto(), mask = ensureMask(photo), pc = $("paint"), targets = [mask.getContext("2d")];
  const direct = pc.width === mask.width && pc.height === mask.height;
  if (direct) targets.push(pc.getContext("2d"));
  if (!state.eraser) {
    if (!strokeCv) { strokeCv = document.createElement("canvas"); strokeCv.width = photo.prev.width; strokeCv.height = photo.prev.height; }
    targets.push(strokeCv.getContext("2d"));
  }
  for (const ctx of targets) {
    ctx.globalCompositeOperation = state.eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = ctx.fillStyle = "#ff3b30"; ctx.lineCap = ctx.lineJoin = "round"; ctx.lineWidth = state.adj.brush * p.k;
    ctx.beginPath(); ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill();
    if (lastPt) { ctx.beginPath(); ctx.moveTo(lastPt.x, lastPt.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over";
  }
  lastPt = p;
  if (!direct) syncPaint();
}
async function endStroke() {
  lastPt = null;
  const stroke = strokeCv; strokeCv = null;
  if (!stroke || !state.smart || !localAI) return;
  const photo = curPhoto();
  try {
    if (!photo.det) say(sessions.detect ? "辨識人物中…" : "AI 準備中，第一次要下載模型…", true);
    const det = await detectPeople(photo);
    const n = snapStrokeToPeople(photo, det, stroke);
    syncPaint();
    say(n ? `已自動選取 ${n} 個人` : "");
  } catch (e) { localAI = false; say(""); }
}
stage.addEventListener("pointerdown", e => {
  if (e.target.closest("button")) { if (state.tab !== "erase") showOrig(e); return; }
  if (state.tab === "erase") { e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch (err) {} lastPt = null; paintStroke(paintPoint(e)); }
  else showOrig(e);
});
stage.addEventListener("pointermove", e => { if (state.tab === "erase" && lastPt) paintStroke(paintPoint(e)); });
["pointerup", "pointerleave", "pointercancel"].forEach(n => stage.addEventListener(n, () => { if (state.tab === "erase") { if (lastPt) endStroke(); } else showEdit(); }));
stage.addEventListener("contextmenu", e => e.preventDefault());
$("holdBtn").addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") showOrig(e); });
$("holdBtn").addEventListener("keyup", showEdit);

// ---------- Start ----------
if (!loadPrefs()) { $("stamp").checked = currentFilter().p.stamp; state.frame = currentFilter().p.frame; }
addPhoto(makeSample(), "sample", true);

// ---------- Templates: a whole look (filter + values + frame + date) in one tap ----------
const TEMPLATES = [
  { id: "t-night",  name: "夜拍閃光",   filter: "g7x",    adj: { contrast: 5 }, stamp: true },
  { id: "t-cine",   name: "電影夜景",   filter: "cine",   adj: { contrast: 10, fade: 10, halo: 30 } },
  { id: "t-portra", name: "人像膚色",   filter: "portra", adj: { bright: 8, sat: -5, temp: 8, fade: 10 } },
  { id: "t-jp",     name: "日系清新",   filter: "jp",     adj: { bright: 12, contrast: -10, temp: -10, tint: 5 } },
  { id: "t-gold",   name: "復古底片",   filter: "gold",   adj: { fade: 20, grain: 150, vig: 120 }, stamp: true },
  { id: "t-pola",   name: "拍立得回憶", filter: "pola",   adj: { fade: 10 }, frame: "pola" },
  { id: "t-bw",     name: "街拍黑白",   filter: "trix",   adj: { contrast: 15, grain: 140 } },
  { id: "t-land",   name: "風景鮮豔",   filter: "velvia", adj: { sat: 10, contrast: 5, vig: 60 } },
  { id: "t-food",   name: "美食暖調",   filter: "ektar",  adj: { temp: 15, sat: 10, bright: 8, vig: 40 } },
  { id: "t-ccd",    name: "CCD 冷白",   filter: "ccd",    adj: { bright: 6, temp: -6 }, stamp: true },
];
const TPL_KEY = "darkroom-templates";
function userTemplates() { try { const v = JSON.parse(localStorage.getItem(TPL_KEY) || "[]"); return Array.isArray(v) ? v.filter(t => t && typeof t.id === "string" && typeof t.name === "string" && FILTERS.some(f => f.id === t.filter) && FRAMES.some(f => f[0] === (t.frame || "none"))) : []; } catch (e) { return []; } }
function saveUserTemplates(list) { try { localStorage.setItem(TPL_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
const tplAdj = t => {
  const a = {};
  PARAMS.forEach(p => { if (p.ui) return; const v = Number(t.adj && t.adj[p.id]); a[p.id] = t.adj && t.adj[p.id] != null && Number.isFinite(v) ? Math.round(Math.min(p.max, Math.max(p.min, v))) : p.def; });
  return a;
};

// Look at the photo and pick the template that suits it.
function recommend(photo) {
  if (photo.rec) return photo.rec;
  const c = scaledCanvas(photo.prev, 96), d = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  let lum = 0, sat = 0, dark = 0, warm = 0, green = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i+1] / 255, b = d[i+2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = 0.299*r + 0.587*g + 0.114*b;
    lum += l; sat += mx ? (mx - mn) / mx : 0; if (l < 0.15) dark++;
    if (r > g * 1.15 && g > b * 1.1 && mx > 0.35) warm++;
    if (g > r * 1.05 && g > b * 1.05) green++;
    n++;
  }
  lum /= n; sat /= n; dark /= n; warm /= n; green /= n;
  const face = !!photo.skin;
  let id, why;
  if (lum < 0.22 || dark > 0.55) { id = face ? "t-night" : "t-cine"; why = face ? "夜晚人像" : "夜景"; }
  else if (face) { id = lum > 0.55 ? "t-jp" : "t-portra"; why = "人像"; }
  else if (warm > 0.25 && sat > 0.3) { id = "t-food"; why = "暖色系主體"; }
  else if (green > 0.3 || (sat > 0.35 && lum > 0.4)) { id = "t-land"; why = "風景"; }
  else if (sat < 0.15) { id = "t-bw"; why = "色彩較少"; }
  else { id = "t-gold"; why = "日常"; }
  photo.rec = { id, why };
  return photo.rec;
}

function applyTemplate(t) {
  const f = FILTERS.find(x => x.id === t.filter); if (!f) return;
  state.filter = f.id; state.template = t.id;
  const a = tplAdj(t); PARAMS.forEach(p => { if (!p.ui) state.adj[p.id] = a[p.id]; });
  state.frame = t.frame || f.p.frame; state.frameTouched = false; state.stampTouched = false;
  $("stamp").checked = t.stamp != null ? !!t.stamp : f.p.stamp;
  renderFrames(); refreshAll(); renderTemplates();
  say(`已套用「${t.name}」，可以再到「調整」微調`);
}

let tplDirty = false, tplTimer = 0;
function renderTemplatesSoon() { clearTimeout(tplTimer); tplTimer = setTimeout(renderTemplates, 150); }
function renderTemplates() {
  const host = $("tpls");
  if (state.tab !== "tpl") { tplDirty = true; return; }
  tplDirty = false;
  const photo = curPhoto(), rec = recommend(photo), sl = host.scrollLeft;
  host.innerHTML = "";
  const recT = TEMPLATES.find(t => t.id === rec.id);
  const smart = document.createElement("button");
  smart.type = "button"; smart.className = "tpl";
  smart.innerHTML = `<i><svg viewBox="0 0 24 24"><path d="M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6z"/><path d="M17.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg></i><span>智慧推薦</span>`;
  smart.onclick = () => { applyTemplate(recT); say(`判斷為${rec.why}，套用「${recT.name}」`); };
  host.appendChild(smart);
  const users = userTemplates();
  const list = [recT, ...TEMPLATES.filter(t => t !== recT), ...users];
  if (!photo.chipSrc) {
    const s = 132, c = document.createElement("canvas"); c.width = c.height = s;
    const k = Math.max(s / photo.prev.width, s / photo.prev.height), dw = photo.prev.width * k, dh = photo.prev.height * k;
    c.getContext("2d").drawImage(photo.prev, (s - dw) / 2, (s - dh) / 2, dw, dh);
    photo.chipSrc = c;
  }
  for (const t of list) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tpl"; b.setAttribute("aria-pressed", String(state.template === t.id));
    const cv = document.createElement("canvas"); cv.width = cv.height = 132;
    b.appendChild(cv);
    const sp = document.createElement("span"); sp.textContent = t.name; b.appendChild(sp);
    if (t === recT) { const r = document.createElement("b"); r.className = "rec"; r.textContent = "推薦"; b.appendChild(r); }
    const isUser = users.includes(t);
    if (isUser) {
      const del = document.createElement("b"); del.className = "del"; del.textContent = "×"; del.setAttribute("aria-label", "刪除這個模板");
      del.onclick = e => { e.stopPropagation(); saveUserTemplates(userTemplates().filter(x => x.id !== t.id)); if (state.template === t.id) state.template = null; renderTemplates(); say(`已刪除「${t.name}」`); };
      b.appendChild(del);
    }
    b.onclick = () => applyTemplate(t);
    host.appendChild(b);
    const f = FILTERS.find(x => x.id === t.filter), a = tplAdj(t), P = effP(f.p, a), ex = exposureFor(photo, P, a);
    const g = GPU && GPU.render(photo.chipSrc, P, { exposure: ex, strength: a.strength / 100, grain: 0 }, null);
    if (g) cv.getContext("2d").drawImage(g, 0, 0, 132, 132);
    else renderThumb(cv, photo.prev, P, ex);
  }
  host.scrollLeft = sl;
}
$("tplSave").onclick = () => {
  const name = $("tplName").value.trim();
  if (!name) { say("先幫模板取個名字"); $("tplName").focus(); return; }
  const adj = {}; PARAMS.forEach(p => { if (!p.ui) adj[p.id] = state.adj[p.id]; });
  const t = { id: "u" + Date.now(), name, filter: state.filter, adj, frame: state.frame, stamp: $("stamp").checked };
  const list = userTemplates(); list.push(t);
  if (!saveUserTemplates(list)) { say("這裡無法儲存模板"); return; }
  state.template = t.id; $("tplName").value = "";
  renderTemplates(); $("tpls").scrollLeft = 1e6;
  say(`已存成「${name}」`);
};
$("tplName").onkeydown = e => { if (e.key === "Enter") $("tplSave").click(); };

renderCats(); renderFrames(); renderThumbs();
bindRow("strength", param("strength")); bindRow("adjust", param(state.tool)); $("adjustNote").textContent = param(state.tool).note;
bindRow("brush", param("brush"));
renderTools(); renderEraseTools(); renderChips(); renderTemplates(); renderPreview();
if ("serviceWorker" in navigator && window.self === window.top && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
if (document.fonts) Promise.all([document.fonts.load('500 40px "DM Mono"'), document.fonts.load('500 40px "Caveat"')]).then(renderPreview).catch(() => {});
</script>
</body>
</html>
