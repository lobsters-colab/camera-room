// =====================================================================
// Collage & video recap modes: shared photo library, recommendations,
// layout templates, stickers, and slideshow videos synced to music.
// =====================================================================
const R = { lib: [], proj: null, sel: null, ctab: "tpl", reel: null, med: new Map(), filt: new Map(), cut: new Map() };
const uid = () => Math.random().toString(36).slice(2, 10);
const libItem = id => R.lib.find(x => x.id === id);
// keep a cache to `max` entries, freeing the canvases it drops
function evict(map, max) { while (map.size > max) { const k = map.keys().next().value, c = map.get(k); map.delete(k); freeCanvas(c); } }

// ---------- Photo library ----------
async function decodeFile(it, maxSide) {
  const bmp = await createImageBitmap(it.file, { imageOrientation: "from-image" });
  const c = scaledCanvas(bmp, maxSide);
  if (bmp.close) bmp.close();
  return c;
}
// medium copy (<=1440) for previews and video frames, cached for the most recent photos
async function getMed(id) {
  if (R.med.has(id)) { const c = R.med.get(id); R.med.delete(id); R.med.set(id, c); return c; }
  const it = libItem(id); if (!it) return null;
  const c = await decodeFile(it, 1440);
  R.med.set(id, c);
  evict(R.med, 8);
  return c;
}
function coverThumb(src, s) {
  const c = document.createElement("canvas"); c.width = c.height = s;
  const k = Math.max(s / src.width, s / src.height), w = src.width * k, h = src.height * k;
  c.getContext("2d").drawImage(src, (s - w) / 2, (s - h) / 2, w, h);
  return c.toDataURL("image/jpeg", 0.8);
}
// sharpness, exposure, colour, faces and a perceptual hash, from a small copy
function analyze(c) {
  const S = 256, k = Math.min(1, S / Math.max(c.width, c.height));
  const w = Math.max(16, Math.round(c.width * k)), h = Math.max(16, Math.round(c.height * k));
  const t = document.createElement("canvas"); t.width = w; t.height = h;
  const x = t.getContext("2d", { willReadFrequently: true }); x.drawImage(c, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
  let lum = 0, clip = 0, rgS = 0, rgQ = 0, ybS = 0, ybQ = 0;
  for (let i = 0; i < w * h; i++) {
    const r = d[i*4], gg = d[i*4+1], b = d[i*4+2], l = (0.299*r + 0.587*gg + 0.114*b) / 255;
    g[i] = l; lum += l; if (l > 0.97 || l < 0.03) clip++;
    const rg = r - gg, yb = 0.5 * (r + gg) - b; rgS += rg; rgQ += rg*rg; ybS += yb; ybQ += yb*yb;
  }
  const n = w * h; lum /= n; clip /= n;
  const rgM = rgS / n, ybM = ybS / n, rgSd = Math.sqrt(Math.max(0, rgQ / n - rgM*rgM)), ybSd = Math.sqrt(Math.max(0, ybQ / n - ybM*ybM));
  const color = Math.sqrt(rgSd*rgSd + ybSd*ybSd) + 0.3 * Math.sqrt(rgM*rgM + ybM*ybM);
  let lm = 0, lq = 0, ln = 0;
  for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
    const i = y*w + xx, v = 4*g[i] - g[i-1] - g[i+1] - g[i-w] - g[i+w];
    lm += v; lq += v*v; ln++;
  }
  const lap = lq / ln - (lm / ln) ** 2;
  const sharp = Math.min(1, Math.max(0, (Math.log10(lap + 1e-6) + 3.2) / 2.2));
  const expo = Math.max(0, 1 - Math.abs(lum - 0.47) * 1.7 - clip * 1.4);
  const colorN = Math.min(1, color / 90);
  const skin = !!sampleSkin(d, w, h);
  const hc = document.createElement("canvas"); hc.width = 9; hc.height = 8;
  const hx = hc.getContext("2d", { willReadFrequently: true }); hx.drawImage(c, 0, 0, 9, 8);
  const hd = hx.getImageData(0, 0, 9, 8).data, hash = new Uint8Array(64);
  for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) { const a = (yy*9 + xx) * 4, b = a + 4; hash[yy*8 + xx] = (hd[a] + hd[a+1] + hd[a+2]) > (hd[b] + hd[b+1] + hd[b+2]) ? 1 : 0; }
  const score = 0.45 * sharp + 0.3 * expo + 0.15 * colorN + (skin ? 0.1 : 0);
  return { sharp, expo, color: colorN, lum, skin, hash, score };
}
const ham = (a, b) => { let s = 0; for (let i = 0; i < 64; i++) s += a[i] !== b[i]; return s; };
async function importToLib(files) {
  const added = [];
  let n = 0, bad = 0;
  for (const f of files) {
    n++; say(`匯入照片 ${n} / ${files.length}…`, true);
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
      const small = scaledCanvas(bmp, 512), w = bmp.width, h = bmp.height;
      if (bmp.close) bmp.close();
      let date = null;
      try { date = exifDate(await f.slice(0, 262144).arrayBuffer()); } catch (e) {}
      const it = { id: uid(), file: f, name: f.name, date: date || (f.lastModified ? new Date(f.lastModified) : null), exif: !!date, w, h, small, thumb: coverThumb(small, 140) };
      it.stats = analyze(small);
      R.lib.push(it); added.push(it);
    } catch (e) { bad++; }
    if (n % 3 === 0) await tick();
  }
  say(added.length ? `已匯入 ${added.length} 張` + (bad ? `，${bad} 個檔案讀不出來` : "") : "照片無法讀取，請換成 JPG 或 PNG");
  return added;
}

// ---------- Recommendations ----------
const dayKey = d => d ? `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` : "?";
const mondayOf = d => { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
function dedupe(items) {
  const keep = [];
  for (const it of [...items].sort((a, b) => b.stats.score - a.stats.score)) if (!keep.some(k => ham(k.stats.hash, it.stats.hash) <= 10)) keep.push(it);
  return keep;
}
const byDate = (a, b) => (a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0);
function gridFor(n) { return ({ 1: "g1", 2: "g2v", 3: "g3a", 4: "g4", 5: "g5", 6: "g6", 7: "mosaic7", 8: "g9", 9: "g9" })[Math.min(9, Math.max(1, n))]; }
function recommendations() {
  const out = [], uniq = dedupe(R.lib);
  if (!uniq.length) return out;
  const best = uniq.slice(0, 6);
  if (best.length >= 3) out.push({ title: `精選 ${best.length} 張`, sub: "Photo dump", tpl: best.length >= 5 ? "dump6" : "dump4", pids: best.slice(0, best.length >= 5 ? 6 : 4).sort(byDate).map(x => x.id) });
  if (uniq.length >= 2) { const k = Math.min(9, uniq.length); out.push({ title: "最佳拼貼", sub: `${k} 張最清楚的`, tpl: gridFor(k), pids: uniq.slice(0, k).map(x => x.id) }); }
  // per day
  const days = new Map();
  for (const it of uniq) { const k = dayKey(it.date); if (!days.has(k)) days.set(k, []); days.get(k).push(it); }
  const dayList = [...days.entries()].filter(([k, v]) => k !== "?" && v.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  if (days.size > 1) for (const [k, v] of dayList) {
    const [y, m, d] = k.split("-").map(Number), pick = v.slice(0, 6);
    out.push({ title: `${m}月${d}日`, sub: `${v.length} 張`, tpl: gridFor(pick.length), pids: pick.map(x => x.id) });
  }
  // week calendar: the week with the most days that have photos
  const weeks = new Map();
  for (const it of uniq) if (it.date) { const k = dayKey(mondayOf(it.date)); if (!weeks.has(k)) weeks.set(k, new Set()); weeks.get(k).add(dayKey(it.date)); }
  const wk = [...weeks.entries()].sort((a, b) => b[1].size - a[1].size)[0];
  if (wk && wk[1].size >= 3) {
    const mon = mondayOf(new Date(wk[0].replace(/-/g, "/")));
    out.push({ title: "一週回顧", sub: `${wk[1].size} 天有照片`, tpl: "week", anchor: mon, pids: weekPids(mon) });
  }
  const months = new Map();
  for (const it of uniq) if (it.date) { const k = `${it.date.getFullYear()}-${it.date.getMonth()}`; if (!months.has(k)) months.set(k, new Set()); months.get(k).add(dayKey(it.date)); }
  const mo = [...months.entries()].sort((a, b) => b[1].size - a[1].size)[0];
  if (mo && mo[1].size >= 5) { const [y, m] = mo[0].split("-").map(Number); out.push({ title: `${m + 1} 月回顧`, sub: `${mo[1].size} 天有照片`, tpl: "month", anchor: new Date(y, m, 1), pids: [] }); }
  const faces = uniq.filter(x => x.stats.skin);
  if (faces.length >= 3) out.push({ title: "人像精選", sub: "底片條", tpl: faces.length >= 4 ? "film4" : "booth3", pids: faces.slice(0, 4).sort(byDate).map(x => x.id) });
  return out;
}
// the week (or month) with the most days that have photos
function busiestPeriod(kind) {
  const m = new Map();
  for (const it of R.lib) if (it.date) {
    const a = kind === "week" ? mondayOf(it.date) : new Date(it.date.getFullYear(), it.date.getMonth(), 1), k = a.getTime();
    if (!m.has(k)) m.set(k, { a, days: new Set() });
    m.get(k).days.add(dayKey(it.date));
  }
  const best = [...m.values()].sort((x, y) => y.days.size - x.days.size || y.a - x.a)[0];
  const ref = new Date();
  return best ? best.a : kind === "week" ? mondayOf(ref) : new Date(ref.getFullYear(), ref.getMonth(), 1);
}
function bestOfDay(key) {
  return dedupe(R.lib.filter(it => dayKey(it.date) === key))[0] || null;
}
function weekPids(mon) {
  const pids = [];
  for (let i = 0; i < 7; i++) { const d = new Date(mon); d.setDate(d.getDate() + i); const b = bestOfDay(dayKey(d)); pids.push(b ? b.id : null); }
  return pids;
}

// ---------- Layout templates ----------
const grid = (cols, rows) => { const c = []; for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) c.push([k / cols, r / rows, 1 / cols, 1 / rows]); return c; };
const CT = [
  { id: "g1", cat: "格狀", name: "單張", cells: [[0, 0, 1, 1]] },
  { id: "g2v", cat: "格狀", name: "上下", cells: [[0, 0, 1, .5], [0, .5, 1, .5]] },
  { id: "g2h", cat: "格狀", name: "左右", cells: [[0, 0, .5, 1], [.5, 0, .5, 1]] },
  { id: "g3a", cat: "格狀", name: "一大二小", cells: [[0, 0, 1, .6], [0, .6, .5, .4], [.5, .6, .5, .4]] },
  { id: "g3b", cat: "格狀", name: "左大右二", cells: [[0, 0, .62, 1], [.62, 0, .38, .5], [.62, .5, .38, .5]] },
  { id: "g3r", cat: "格狀", name: "三列", cells: [[0, 0, 1, 1/3], [0, 1/3, 1, 1/3], [0, 2/3, 1, 1/3]] },
  { id: "g4", cat: "格狀", name: "四宮格", cells: grid(2, 2) },
  { id: "g4a", cat: "格狀", name: "一大三小", cells: [[0, 0, 1, .66], [0, .66, 1/3, .34], [1/3, .66, 1/3, .34], [2/3, .66, 1/3, .34]] },
  { id: "g5", cat: "格狀", name: "五格", cells: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, 1/3, .5], [1/3, .5, 1/3, .5], [2/3, .5, 1/3, .5]] },
  { id: "g6", cat: "格狀", name: "六格", cells: grid(2, 3) },
  { id: "mosaic7", cat: "格狀", name: "雜誌拼貼", cells: [[0, 0, .6, .45], [.6, 0, .4, .25], [.6, .25, .4, .2], [0, .45, .35, .3], [.35, .45, .65, .3], [0, .75, .5, .25], [.5, .75, .5, .25]] },
  { id: "g9", cat: "格狀", name: "九宮格", cells: grid(3, 3) },
  { id: "dump4", cat: "隨手疊", name: "隨手疊 4", kind: "dump", cells: [{ x: .32, y: .28, w: .54, r: -6 }, { x: .7, y: .38, w: .48, r: 5 }, { x: .3, y: .7, w: .5, r: 4 }, { x: .7, y: .76, w: .52, r: -4 }] },
  { id: "dump6", cat: "隨手疊", name: "隨手疊 6", kind: "dump", cells: [{ x: .28, y: .2, w: .44, r: -7 }, { x: .72, y: .22, w: .42, r: 6 }, { x: .5, y: .47, w: .46, r: -2 }, { x: .25, y: .74, w: .42, r: 5 }, { x: .74, y: .7, w: .44, r: -5 }, { x: .52, y: .9, w: .36, r: 3 }] },
  { id: "film4", cat: "底片", name: "底片條", kind: "film", n: 4 },
  { id: "booth3", cat: "底片", name: "拍貼機", kind: "booth", n: 3 },
  { id: "week", cat: "日曆", name: "一週回顧", kind: "week" },
  { id: "month", cat: "日曆", name: "月曆", kind: "month" },
];
const tplById = id => CT.find(t => t.id === id) || CT[0];
const RATIOS = { "1:1": 1, "4:5": 1.25, "3:4": 4 / 3, "9:16": 16 / 9 };
const BG = ["#f4f1ec", "#ffffff", "#141312", "#e9dcc7", "#f6d7d2", "#d6e4d3", "#cfdcec", "#2b3a55"];
function cellCount(tpl, proj) {
  if (tpl.kind === "week") return 7;
  if (tpl.kind === "month") return daysInMonth(proj.anchor);
  if (tpl.kind === "film" || tpl.kind === "booth") return tpl.n;
  return tpl.cells.length;
}
const daysInMonth = d => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
function newProject(tplId, pids, extra) {
  const tpl = tplById(tplId);
  const proj = { tpl: tplId, ratio: tpl.kind === "booth" || tpl.kind === "film" ? "9:16" : "4:5", gap: tpl.kind ? 0 : 14, radius: 0, bg: tpl.kind === "film" ? "#141312" : "#f4f1ec", filter: "none", cells: [], stickers: [], anchor: null, title: "", ...(extra || {}) };
  if ((tpl.kind === "week" || tpl.kind === "month") && !proj.anchor) proj.anchor = busiestPeriod(tpl.kind);
  if (tpl.kind === "week" && (!pids || !pids.length)) pids = weekPids(proj.anchor);
  if (tpl.kind === "month") {
    pids = [];
    for (let i = 1; i <= daysInMonth(proj.anchor); i++) { const b = bestOfDay(dayKey(new Date(proj.anchor.getFullYear(), proj.anchor.getMonth(), i))); pids.push(b ? b.id : null); }
  }
  const n = cellCount(tpl, proj);
  for (let i = 0; i < n; i++) proj.cells.push({ pid: pids && pids[i] || null, cx: .5, cy: .5, z: 1 });
  return proj;
}
// keep photos when switching templates; fill new empty cells with unused good photos
function switchTemplate(tplId) {
  const old = R.proj, tpl = tplById(tplId);
  let pids = old ? old.cells.map(c => c.pid).filter(Boolean) : [];
  const extra = old ? { gap: tpl.kind ? 0 : (old.gap || 14), radius: old.radius, filter: old.filter, stickers: old.stickers, bg: tpl.kind === "film" ? "#141312" : old.bg, ratio: tpl.kind === "film" || tpl.kind === "booth" ? "9:16" : old.ratio } : {};
  if (tpl.kind === "week" || tpl.kind === "month") pids = null;
  else {
    const need = cellCount(tpl, {}), used = new Set(pids);
    for (const it of dedupe(R.lib)) { if (pids.length >= need) break; if (!used.has(it.id)) { pids.push(it.id); used.add(it.id); } }
  }
  R.proj = newProject(tplId, pids, extra);
  R.sel = null;
}

// geometry of every slot, in canvas pixels
function layout(proj, W, H) {
  const tpl = tplById(proj.tpl), u = W / 1080, g = proj.gap * u, rad = proj.radius * u, out = { cells: [], deco: [] };
  if (!tpl.kind) {
    const pad = g / 2;
    for (const [x, y, w, h] of tpl.cells) out.cells.push({ x: pad + x * (W - 2*pad) + g/2, y: pad + y * (H - 2*pad) + g/2, w: w * (W - 2*pad) - g, h: h * (H - 2*pad) - g, r: 0, rad });
  } else if (tpl.kind === "dump") {
    for (const c of tpl.cells) {
      const fw = c.w * W, b = fw * 0.055, ph = fw - 2*b, fh = ph + b + fw * 0.17;
      out.cells.push({ x: c.x * W - fw/2 + b, y: c.y * H - fh/2 + b, w: ph, h: ph, r: c.r * Math.PI / 180, frame: { x: c.x * W - fw/2, y: c.y * H - fh/2, w: fw, h: fh, cx: c.x * W, cy: c.y * H }, rad: 0 });
    }
  } else if (tpl.kind === "film" || tpl.kind === "booth") {
    const film = tpl.kind === "film", n = tpl.n;
    const sw = film ? W * 0.78 : W * 0.56, sx = (W - sw) / 2;
    const top = H * (film ? 0.05 : 0.06), bottom = H * (film ? 0.05 : 0.16), avail = H - top - bottom, gapY = sw * 0.05;
    const side = film ? sw * 0.13 : sw * 0.07, fh = (avail - gapY * (n - 1)) / n;
    out.strip = { x: sx, y: top - (film ? 0 : sw * 0.07), w: sw, h: avail + (film ? 0 : sw * 0.07 + bottom * 0.75), film };
    for (let i = 0; i < n; i++) out.cells.push({ x: sx + side, y: top + i * (fh + gapY), w: sw - 2*side, h: fh, r: 0, rad: film ? 4 * u : 0 });
  } else if (tpl.kind === "week") {
    const head = H * 0.15, pad = Math.max(g, 18 * u), cw = (W - pad*3) / 2, chh = (H - head - pad*5) / 4;
    out.head = { x: pad, y: pad * 0.6, w: W - 2*pad, h: head - pad * 0.6 };
    for (let i = 0; i < 8; i++) {
      const col = i % 2, row = Math.floor(i / 2), rect = { x: pad + col * (cw + pad), y: head + pad + row * (chh + pad), w: cw, h: chh, r: 0, rad: Math.max(rad, 10 * u) };
      if (i < 7) { const d = new Date(proj.anchor); d.setDate(d.getDate() + i); rect.label = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i] + "  " + (d.getMonth() + 1) + "/" + d.getDate(); out.cells.push(rect); }
      else out.note = rect;
    }
  } else if (tpl.kind === "month") {
    const a = proj.anchor, first = (new Date(a.getFullYear(), a.getMonth(), 1).getDay() + 6) % 7, nd = daysInMonth(a), rows = Math.ceil((first + nd) / 7);
    const pad = 16 * u, head = H * 0.13, wk = H * 0.04, cw = (W - pad*2 - 6*u*6) / 7, chh = (H - head - wk - pad*2 - 6*u*(rows - 1)) / rows;
    out.head = { x: pad, y: pad, w: W - 2*pad, h: head - pad };
    out.wk = { y: head + wk * 0.6, cw, pad, gap: 6 * u };
    for (let i = 0; i < nd; i++) { const k = first + i, col = k % 7, row = Math.floor(k / 7); out.cells.push({ x: pad + col * (cw + 6*u), y: head + wk + pad * 0.5 + row * (chh + 6*u), w: cw, h: chh, r: 0, rad: 6 * u, day: i + 1 }); }
  }
  return out;
}

// ---------- Drawing ----------
function rrPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function coverGeom(img, rect, cell) {
  const s = Math.max(rect.w / img.width, rect.h / img.height) * cell.z, iw = img.width * s, ih = img.height * s;
  const mx = rect.w / 2 / iw, my = rect.h / 2 / ih;
  cell.cx = Math.min(1 - mx, Math.max(mx, cell.cx)); cell.cy = Math.min(1 - my, Math.max(my, cell.cy));
  return { x: rect.x + rect.w / 2 - cell.cx * iw, y: rect.y + rect.h / 2 - cell.cy * ih, w: iw, h: ih };
}
function filtered(src, key, filterId, noCache) {
  if (!filterId || filterId === "none" || !GPU) return src;
  const k = key + "|" + filterId;
  if (!noCache && R.filt.has(k)) return R.filt.get(k);
  const f = FILTERS.find(x => x.id === filterId); if (!f) return src;
  const P = effP(f.p, Object.fromEntries(PARAMS.map(p => [p.id, p.def])));
  const sm = scaledCanvas(src, 300);
  const skin = sampleSkin(sm.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, sm.width, sm.height).data, sm.width, sm.height);
  freeCanvas(sm);
  const g = GPU.render(src, P, { exposure: solveExposure(skin, P, true, 0), strength: 1, grain: 1 }, null);
  if (!g) return src;
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; c.getContext("2d").drawImage(g, 0, 0);
  if (!noCache) { R.filt.set(k, c); evict(R.filt, 8); }
  return c;
}
// image for a cell in the live preview: medium copy when ready, small copy meanwhile
function previewImg(pid, filterId) {
  const it = libItem(pid); if (!it) return null;
  const med = R.med.get(pid);
  if (!med) getMed(pid).then(() => cDirty()).catch(() => {});
  const src = med || it.small;
  return filtered(src, pid + (med ? "m" : "s"), filterId);
}
function drawEmpty(ctx, r, u, dark) {
  ctx.fillStyle = dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = dark ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.25)"; ctx.lineWidth = 2 * u;
  const c = Math.min(r.w, r.h) * 0.12, mx = r.x + r.w / 2, my = r.y + r.h / 2;
  ctx.beginPath(); ctx.moveTo(mx - c, my); ctx.lineTo(mx + c, my); ctx.moveTo(mx, my - c); ctx.lineTo(mx, my + c); ctx.stroke();
}
const isDark = hex => { const v = parseInt(hex.slice(1), 16); return (0.299*(v >> 16) + 0.587*((v >> 8) & 255) + 0.114*(v & 255)) < 110; };
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
function weekNo(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 86400000 + 1) / 7); }
function drawProject(ctx, W, H, proj, imgFor, ui) {
  const tpl = tplById(proj.tpl), L = layout(proj, W, H), u = W / 1080, dark = isDark(proj.bg), ink = dark ? "#f4f1ec" : "#1f1c19";
  ctx.save();
  ctx.fillStyle = proj.bg; ctx.fillRect(0, 0, W, H);
  if (L.strip) {
    const s = L.strip;
    ctx.fillStyle = s.film ? "#0b0a09" : "#ffffff";
    if (!s.film) { ctx.shadowColor = "rgba(0,0,0,.18)"; ctx.shadowBlur = 24 * u; ctx.shadowOffsetY = 6 * u; }
    ctx.fillRect(s.x, s.y, s.w, s.h); ctx.shadowColor = "transparent";
    if (s.film) {
      ctx.fillStyle = proj.bg === "#141312" ? "#2a2724" : proj.bg;
      const hw = s.w * 0.05, hh = hw * 0.7, step = hh * 2.1;
      for (let y = s.y + step * 0.4; y < s.y + s.h - hh; y += step) { rrPath(ctx, s.x + s.w * 0.04, y, hw, hh, 3*u); ctx.fill(); rrPath(ctx, s.x + s.w - s.w * 0.04 - hw, y, hw, hh, 3*u); ctx.fill(); }
      ctx.fillStyle = "rgba(255,170,60,.85)"; ctx.font = `500 ${Math.round(14*u)}px "DM Mono", monospace`; ctx.textAlign = "left";
      ctx.save(); ctx.translate(s.x + s.w * 0.115, s.y + s.h * 0.5); ctx.rotate(-Math.PI / 2); ctx.fillText("KODAK 400  ▸ 24  ▸ 25", -s.h * 0.2, 0); ctx.restore();
    }
  }
  if (L.head) {
    ctx.fillStyle = ink; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    if (tpl.kind === "week") {
      const end = new Date(proj.anchor); end.setDate(end.getDate() + 6);
      ctx.font = `700 ${Math.round(L.head.h * 0.42)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(proj.title || `WEEK ${weekNo(proj.anchor)}`, L.head.x, L.head.y + L.head.h * 0.55);
      ctx.font = `500 ${Math.round(L.head.h * 0.2)}px "DM Mono", monospace`; ctx.globalAlpha = 0.7;
      ctx.fillText(`${proj.anchor.getFullYear()} · ${proj.anchor.getMonth()+1}/${proj.anchor.getDate()} – ${end.getMonth()+1}/${end.getDate()}`, L.head.x, L.head.y + L.head.h * 0.9); ctx.globalAlpha = 1;
    } else {
      ctx.font = `700 ${Math.round(L.head.h * 0.5)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(proj.title || `${proj.anchor.getMonth()+1}月`, L.head.x, L.head.y + L.head.h * 0.62);
      ctx.font = `500 ${Math.round(L.head.h * 0.2)}px "DM Mono", monospace`; ctx.globalAlpha = 0.7; ctx.textAlign = "right";
      ctx.fillText(`${proj.anchor.getFullYear()} · ${MONTHS[proj.anchor.getMonth()]}`, L.head.x + L.head.w, L.head.y + L.head.h * 0.62); ctx.globalAlpha = 1;
      ctx.font = `500 ${Math.round(L.wk.cw * 0.2)}px "DM Mono", monospace`; ctx.textAlign = "center";
      ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].forEach((t, i) => ctx.fillText(t, L.wk.pad + i * (L.wk.cw + L.wk.gap) + L.wk.cw / 2, L.wk.y));
    }
  }
  L.cells.forEach((r, i) => {
    const cell = proj.cells[i]; if (!cell) return;
    ctx.save();
    if (r.frame) {
      ctx.translate(r.frame.cx, r.frame.cy); ctx.rotate(r.r); ctx.translate(-r.frame.cx, -r.frame.cy);
      ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 22 * u; ctx.shadowOffsetY = 8 * u;
      ctx.fillStyle = "#fbfaf6"; ctx.fillRect(r.frame.x, r.frame.y, r.frame.w, r.frame.h); ctx.shadowColor = "transparent";
    }
    const img = cell.pid ? imgFor(cell.pid) : null;
    rrPath(ctx, r.x, r.y, r.w, r.h, r.rad); ctx.save(); ctx.clip();
    if (img) { const gm = coverGeom(img, r, cell); ctx.drawImage(img, gm.x, gm.y, gm.w, gm.h); }
    else if (ui) drawEmpty(ctx, r, u, dark || !!L.strip && L.strip.film);
    else if (tpl.kind === "week" || tpl.kind === "month") { ctx.fillStyle = dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)"; ctx.fillRect(r.x, r.y, r.w, r.h); }
    ctx.restore();
    if (r.label) {
      ctx.font = `500 ${Math.round(r.h * 0.085)}px "DM Mono", monospace`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = img ? "#fff" : ink; if (img) { ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 6 * u; }
      ctx.fillText(r.label, r.x + r.w * 0.06, r.y + r.h - r.h * 0.07); ctx.shadowColor = "transparent";
    }
    if (r.day) {
      ctx.font = `700 ${Math.round(r.w * 0.26)}px "DM Mono", monospace`; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillStyle = img ? "#fff" : ink; if (img) { ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 4 * u; }
      ctx.fillText(String(r.day), r.x + r.w * 0.1, r.y + r.w * 0.08); ctx.shadowColor = "transparent"; ctx.textBaseline = "alphabetic";
    }
    if (ui && ui.selCell === i) { ctx.strokeStyle = "#ff9a2e"; ctx.lineWidth = 5 * u; rrPath(ctx, r.x, r.y, r.w, r.h, r.rad); ctx.stroke(); }
    if (ui && ui.dropCell === i) { ctx.fillStyle = "rgba(255,154,46,.3)"; rrPath(ctx, r.x, r.y, r.w, r.h, r.rad); ctx.fill(); }
    ctx.restore();
  });
  if (L.note) {
    ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.font = `500 ${Math.round(L.note.h * 0.2)}px "Caveat", "Noto Sans TC", cursive`;
    ctx.fillText(proj.note || "good week ♡", L.note.x + L.note.w / 2, L.note.y + L.note.h * 0.55);
  }
  if (tpl.kind === "booth" && L.strip) {
    ctx.fillStyle = "#1f1c19"; ctx.textAlign = "center"; const s = L.strip;
    ctx.font = `500 ${Math.round(s.w * 0.07)}px "DM Mono", monospace`;
    const d = proj.cells.map(c => libItem(c.pid)).find(x => x && x.date);
    ctx.fillText(proj.title || fmtStamp(d ? d.date : new Date()), s.x + s.w / 2, s.y + s.h - s.w * 0.12);
  }
  for (const st of proj.stickers) drawSticker(ctx, W, H, st, ui && ui.selStk === st.id);
  ctx.restore();
  return L;
}

// ---------- Stickers ----------
const DECOS = ["star", "heart", "sparkle", "smile", "flower", "cloud", "bolt", "tape", "arrow", "scribble", "wow", "rec", "camera", "sun"];
function drawDeco(ctx, kind, w, h, color) {
  const lw = Math.max(1.5, w * 0.045), ink = "#1f1c19";
  ctx.lineJoin = ctx.lineCap = "round"; ctx.lineWidth = lw;
  const P = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * w - w/2, y * h - h/2) : ctx.moveTo(x * w - w/2, y * h - h/2)); ctx.closePath(); };
  if (kind === "star") { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI/2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.47; pts.push([0.5 + Math.cos(a) * r, 0.53 + Math.sin(a) * r]); } P(pts); ctx.fillStyle = color || "#ffd23f"; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); }
  else if (kind === "heart") { ctx.beginPath(); ctx.moveTo(0, h * 0.38); ctx.bezierCurveTo(-w * 0.6, -h * 0.05, -w * 0.3, -h * 0.5, 0, -h * 0.2); ctx.bezierCurveTo(w * 0.3, -h * 0.5, w * 0.6, -h * 0.05, 0, h * 0.38); ctx.fillStyle = color || "#ff5a6e"; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); }
  else if (kind === "sparkle") { ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.quadraticCurveTo(0, 0, Math.cos(a) * w * 0.48, Math.sin(a) * h * 0.48); ctx.quadraticCurveTo(0, 0, Math.cos(a + Math.PI/2) * w * 0.48, Math.sin(a + Math.PI/2) * h * 0.48); } ctx.fillStyle = color || "#fff6c9"; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); }
  else if (kind === "smile") { ctx.beginPath(); ctx.arc(0, 0, w * 0.45, 0, 7); ctx.fillStyle = color || "#ffd23f"; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(-w * 0.15, -h * 0.1, w * 0.045, h * 0.08, 0, 0, 7); ctx.ellipse(w * 0.15, -h * 0.1, w * 0.045, h * 0.08, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, h * 0.02, w * 0.25, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
  else if (kind === "flower") { ctx.fillStyle = color || "#ffb3c7"; ctx.strokeStyle = ink; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; ctx.beginPath(); ctx.ellipse(Math.cos(a) * w * 0.24, Math.sin(a) * h * 0.24, w * 0.19, h * 0.15, a, 0, 7); ctx.fill(); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, w * 0.13, 0, 7); ctx.fillStyle = "#ffd23f"; ctx.fill(); ctx.stroke(); }
  else if (kind === "cloud") { ctx.beginPath(); ctx.arc(-w * 0.2, h * 0.08, w * 0.2, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(0, -h * 0.1, w * 0.24, Math.PI, 0); ctx.arc(w * 0.24, h * 0.06, w * 0.18, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); ctx.fillStyle = color || "#ffffff"; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); }
  else if (kind === "bolt") { P([[.58, .02], [.18, .56], [.46, .56], [.36, .98], [.84, .4], [.54, .4]]); ctx.fillStyle = color || "#ffd23f"; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); }
  else if (kind === "tape") { ctx.fillStyle = color || "rgba(244,200,120,.75)"; ctx.beginPath(); const z = h * 0.12; ctx.moveTo(-w/2, -h/2); for (let i = 0; i <= 6; i++) ctx.lineTo(-w/2 + (i % 2) * z, -h/2 + h * i / 6); ctx.lineTo(w/2, h/2); for (let i = 6; i >= 0; i--) ctx.lineTo(w/2 - (i % 2) * z, -h/2 + h * i / 6); ctx.closePath(); ctx.fill(); }
  else if (kind === "arrow") { ctx.strokeStyle = color || ink; ctx.lineWidth = lw * 1.3; ctx.beginPath(); ctx.moveTo(-w * 0.42, h * 0.3); ctx.bezierCurveTo(-w * 0.2, -h * 0.4, w * 0.15, -h * 0.4, w * 0.4, -h * 0.05); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w * 0.22, -h * 0.2); ctx.lineTo(w * 0.42, -h * 0.04); ctx.lineTo(w * 0.2, h * 0.08); ctx.stroke(); }
  else if (kind === "scribble") { ctx.strokeStyle = color || "#ff3b30"; ctx.lineWidth = lw * 1.2; ctx.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2.15 - 0.6, r = 1 + 0.06 * Math.sin(i * 0.7); ctx.lineTo(Math.cos(a) * w * 0.44 * r, Math.sin(a) * h * 0.4 * r); } ctx.stroke(); }
  else if (kind === "wow") { ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 0.36 : 0.48; ctx.lineTo(Math.cos(a) * w * r, Math.sin(a) * h * r); } ctx.closePath(); ctx.fillStyle = color || "#ffd23f"; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); ctx.fillStyle = ink; ctx.font = `900 ${Math.round(h * 0.26)}px "Noto Sans TC", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("WOW", 0, h * 0.02); }
  else if (kind === "rec") { rrPath(ctx, -w/2, -h/2, w, h, h * 0.2); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fill(); ctx.fillStyle = "#ff3b30"; ctx.beginPath(); ctx.arc(-w * 0.28, 0, h * 0.18, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `500 ${Math.round(h * 0.42)}px "DM Mono", monospace`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("REC", -w * 0.1, h * 0.03); }
  else if (kind === "camera") { rrPath(ctx, -w * 0.45, -h * 0.28, w * 0.9, h * 0.62, w * 0.08); ctx.fillStyle = color || "#ffffff"; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); ctx.beginPath(); ctx.rect(-w * 0.18, -h * 0.4, w * 0.3, h * 0.12); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, h * 0.04, w * 0.18, 0, 7); ctx.fillStyle = "#2b3a55"; ctx.fill(); ctx.stroke(); }
  else if (kind === "sun") { ctx.strokeStyle = ink; ctx.fillStyle = color || "#ffb02e"; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * w * 0.3, Math.sin(a) * h * 0.3); ctx.lineTo(Math.cos(a) * w * 0.47, Math.sin(a) * h * 0.47); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, w * 0.24, 0, 7); ctx.fill(); ctx.stroke(); }
}
const DECO_AR = { tape: 0.32, rec: 0.42, arrow: 0.7, cloud: 0.65, camera: 0.8, scribble: 0.75 };
const TEXT_STYLES = [["stamp", "日期戳記"], ["hand", "手寫"], ["label", "標籤"], ["title", "大標題"], ["tape", "紙膠帶"]];
const TEXT_COLORS = ["#ffffff", "#1f1c19", "#ff9a2e", "#ff3b30", "#ffd23f", "#ff8fb1", "#4f7cff"];
function textFont(style, px) {
  return style === "stamp" ? `500 ${px}px "DM Mono", monospace` : style === "hand" ? `500 ${px}px "Caveat", "Noto Sans TC", cursive` : style === "title" ? `900 ${px}px "Noto Sans TC", sans-serif` : `700 ${px}px "Noto Sans TC", sans-serif`;
}
// aspect ratio (h/w) of a text sticker, measured once per change
function measureText(st) {
  const c = measureText.c || (measureText.c = document.createElement("canvas").getContext("2d"));
  c.font = textFont(st.data.style, 100);
  const tw = Math.max(40, c.measureText(st.data.text || " ").width), padX = st.data.style === "label" || st.data.style === "tape" ? 70 : 20;
  st.ar = (st.data.style === "hand" ? 150 : 130) / (tw + padX);
}
function drawText(ctx, st, w, h) {
  const d = st.data, px = h / ((d.style === "hand" ? 150 : 130) / 100);
  const fs = px * 1.0, col = d.color;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = textFont(d.style, Math.round(fs));
  if (d.style === "label") { rrPath(ctx, -w/2, -h/2, w, h, h * 0.5); ctx.fillStyle = col === "#ffffff" ? "#1f1c19" : "#ffffff"; ctx.fill(); ctx.fillStyle = col === "#ffffff" ? "#ffffff" : col; ctx.fillText(d.text, 0, h * 0.04); return; }
  if (d.style === "tape") { drawDeco(ctx, "tape", w, h, "rgba(244,200,120,.85)"); ctx.fillStyle = col === "#ffffff" ? "#1f1c19" : col; ctx.fillText(d.text, 0, h * 0.04); return; }
  if (d.style === "stamp") { ctx.shadowColor = "rgba(255,110,20,.85)"; ctx.shadowBlur = fs * 0.3; ctx.fillStyle = col === "#ffffff" ? "#ff9a2e" : col; ctx.fillText(d.text, 0, 0); ctx.shadowBlur = 0; ctx.fillText(d.text, 0, 0); return; }
  if (d.style === "title") { ctx.lineWidth = fs * 0.12; ctx.strokeStyle = col === "#1f1c19" ? "#ffffff" : "#1f1c19"; ctx.strokeText(d.text, 0, h * 0.04); }
  else { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = fs * 0.08; }
  ctx.fillStyle = col; ctx.fillText(d.text, 0, h * 0.04); ctx.shadowColor = "transparent";
}
function stickerBox(st, W) { const w = st.s * W; return { w, h: w * st.ar }; }
function drawSticker(ctx, W, H, st, selected) {
  const { w, h } = stickerBox(st, W);
  ctx.save(); ctx.translate(st.x * W, st.y * H); ctx.rotate(st.r);
  if (st.kind === "cut") { const c = R.cut.get(st.data.key); if (c) ctx.drawImage(c, -w/2, -h/2, w, h); }
  else if (st.kind === "deco") drawDeco(ctx, st.data.deco, w, h, st.data.color);
  else drawText(ctx, st, w, h);
  if (selected) {
    const u = W / 1080; ctx.setLineDash([10 * u, 8 * u]); ctx.strokeStyle = "#ff9a2e"; ctx.lineWidth = 3 * u;
    ctx.strokeRect(-w/2 - 8*u, -h/2 - 8*u, w + 16*u, h + 16*u); ctx.setLineDash([]);
    const hr = 26 * u;
    ctx.fillStyle = "#ff9a2e"; ctx.beginPath(); ctx.arc(w/2 + 8*u, h/2 + 8*u, hr, 0, 7); ctx.fill();
    ctx.strokeStyle = "#1a1006"; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(w/2 + 8*u, h/2 + 8*u, hr * 0.45, -0.3, Math.PI * 1.3); ctx.stroke();
    ctx.fillStyle = "#3a3a3f"; ctx.beginPath(); ctx.arc(-w/2 - 8*u, -h/2 - 8*u, hr, 0, 7); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.beginPath(); const q = hr * 0.38, cx = -w/2 - 8*u, cy = -h/2 - 8*u; ctx.moveTo(cx - q, cy - q); ctx.lineTo(cx + q, cy + q); ctx.moveTo(cx + q, cy - q); ctx.lineTo(cx - q, cy + q); ctx.stroke();
  }
  ctx.restore();
}
function addSticker(kind, data, ar, s) {
  const st = { id: uid(), kind, data, x: 0.5, y: 0.5, s: s || 0.32, r: (Math.random() - 0.5) * 0.25, ar: ar || 1 };
  if (kind === "text") { st.r = 0; measureText(st); st.s = Math.min(0.8, Math.max(0.25, 0.09 / st.ar)); }
  R.proj.stickers.push(st); R.sel = { kind: "stk", id: st.id };
  cDirty(); renderCTab();
  return st;
}

// AI cutout sticker (U2-Net small, on device), white outline like a die-cut sticker
async function makeCutout(it) {
  const session = await getSession("cutout");
  const src = await getMed(it.id), S = 320;
  const c = document.createElement("canvas"); c.width = c.height = S;
  const cx = c.getContext("2d", { willReadFrequently: true }); cx.drawImage(src, 0, 0, S, S);
  const d = cx.getImageData(0, 0, S, S).data; let mx = 1e-6;
  for (let i = 0; i < S * S; i++) mx = Math.max(mx, d[i*4], d[i*4+1], d[i*4+2]);
  const mean = [0.485, 0.456, 0.406], sd = [0.229, 0.224, 0.225], A = S * S, x = new Float32Array(3 * A);
  for (let i = 0; i < A; i++) for (let k = 0; k < 3; k++) x[k*A + i] = (d[i*4 + k] / mx - mean[k]) / sd[k];
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", x, [1, 3, S, S]) });
  const y = out[session.outputNames[0]].data; let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < A; i++) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); }
  const m = document.createElement("canvas"); m.width = m.height = S;
  const mctx = m.getContext("2d"), md = mctx.createImageData(S, S);
  for (let i = 0; i < A; i++) { const v = (y[i] - lo) / (hi - lo || 1); md.data[i*4+3] = Math.round(clamp01((v - 0.25) / 0.5) * 255); }
  mctx.putImageData(md, 0, 0);
  // subject on transparent background at medium resolution
  const W = src.width, H = src.height, sub = document.createElement("canvas"); sub.width = W; sub.height = H;
  const sx = sub.getContext("2d", { willReadFrequently: true });
  sx.imageSmoothingQuality = "high"; sx.drawImage(m, 0, 0, W, H);
  sx.globalCompositeOperation = "source-in"; sx.drawImage(src, 0, 0); sx.globalCompositeOperation = "source-over";
  const ad = sx.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let yy = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2) if (ad[(yy*W + xx)*4 + 3] > 100) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  if (x1 < 0) throw new Error("empty");
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = Math.min(1, 900 / Math.max(bw, bh)), ow = Math.max(8, Math.round(bw * k)), oh = Math.max(8, Math.round(bh * k)), border = Math.round(Math.max(ow, oh) * 0.035);
  const crop = document.createElement("canvas"); crop.width = ow; crop.height = oh;
  crop.getContext("2d").drawImage(sub, x0, y0, bw, bh, 0, 0, ow, oh);
  const fin = document.createElement("canvas"); fin.width = ow + border * 2 + 8; fin.height = oh + border * 2 + 8;
  const fx = fin.getContext("2d");
  // white outline: the silhouette stamped around a circle, tinted white
  const sil = document.createElement("canvas"); sil.width = fin.width; sil.height = fin.height;
  const sl = sil.getContext("2d");
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; sl.drawImage(crop, border + 4 + Math.cos(a) * border, border + 4 + Math.sin(a) * border); }
  sl.drawImage(crop, border + 4, border + 4);
  sl.globalCompositeOperation = "source-in"; sl.fillStyle = "#ffffff"; sl.fillRect(0, 0, sil.width, sil.height);
  fx.shadowColor = "rgba(0,0,0,.28)"; fx.shadowBlur = border * 0.8; fx.shadowOffsetY = border * 0.3;
  fx.drawImage(sil, 0, 0); fx.shadowColor = "transparent";
  fx.drawImage(crop, border + 4, border + 4);
  const key = uid(); R.cut.set(key, fin);
  return { key, ar: fin.height / fin.width };
}

// ---------- Collage editor UI ----------
const cv = () => $("cCanvas");
let cRaf = 0, cDrag = null, swapGhost = null;
function cDirty() { cancelAnimationFrame(cRaf); cRaf = requestAnimationFrame(drawCollage); }
function cSize() {
  const box = $("cFit"), ratio = RATIOS[R.proj.ratio] || 1.25;
  const bw = box.clientWidth, bh = box.clientHeight; if (!bw || !bh) return null;
  let w = bw, h = bw * ratio; if (h > bh) { h = bh; w = bh / ratio; }
  const dpr = Math.min(2.5, window.devicePixelRatio || 1), W = Math.round(Math.min(1200, w * dpr)), H = Math.round(W * ratio);
  const c = cv(); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  c.style.width = Math.floor(w) + "px"; c.style.height = Math.floor(h) + "px";
  return { W, H };
}
function drawCollage() {
  if (!R.proj) return;
  updateCtx();
  const sz = cSize(); if (!sz) return;
  const ctx = cv().getContext("2d");
  const ui = { selCell: R.sel && R.sel.kind === "cell" ? R.sel.i : -1, selStk: R.sel && R.sel.kind === "stk" ? R.sel.id : null, dropCell: swapGhost ? swapGhost.target : -1 };
  R.lastLayout = drawProject(ctx, sz.W, sz.H, R.proj, pid => previewImg(pid, R.proj.filter), ui);
  if (swapGhost) {
    const img = previewImg(swapGhost.pid, R.proj.filter);
    if (img) { const s = sz.W * 0.22, k = s / Math.max(img.width, img.height); ctx.globalAlpha = 0.85; ctx.drawImage(img, swapGhost.x - img.width * k / 2, swapGhost.y - img.height * k / 2, img.width * k, img.height * k); ctx.globalAlpha = 1; }
  }
  const empty = R.proj.cells.length && R.proj.cells.every(c => !c.pid) && !R.lib.length;
  $("cEmpty").hidden = !empty;
}
function cPoint(e) { const r = cv().getBoundingClientRect(); return { x: (e.clientX - r.left) * cv().width / r.width, y: (e.clientY - r.top) * cv().height / r.height }; }
function hitCell(p) {
  const L = R.lastLayout; if (!L) return -1;
  for (let i = L.cells.length - 1; i >= 0; i--) {
    const r = L.cells[i]; let x = p.x, y = p.y;
    if (r.frame) { const c = Math.cos(-r.r), s = Math.sin(-r.r), dx = x - r.frame.cx, dy = y - r.frame.cy; x = r.frame.cx + dx * c - dy * s; y = r.frame.cy + dx * s + dy * c; const f = r.frame; if (x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) return i; continue; }
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}
function toLocal(st, p) {
  const W = cv().width, H = cv().height, dx = p.x - st.x * W, dy = p.y - st.y * H, c = Math.cos(-st.r), s = Math.sin(-st.r);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}
function hitSticker(p) {
  const W = cv().width, u = W / 1080, list = R.proj.stickers;
  const sel = R.sel && R.sel.kind === "stk" ? list.find(s => s.id === R.sel.id) : null;
  if (sel) {
    const { w, h } = stickerBox(sel, W), l = toLocal(sel, p), hr = 34 * u;
    if (Math.hypot(l.x - (w/2 + 8*u), l.y - (h/2 + 8*u)) < hr) return { st: sel, part: "handle" };
    if (Math.hypot(l.x + (w/2 + 8*u), l.y + (h/2 + 8*u)) < hr) return { st: sel, part: "delete" };
  }
  for (let i = list.length - 1; i >= 0; i--) {
    const st = list[i], { w, h } = stickerBox(st, W), l = toLocal(st, p), pad = 12 * u;
    if (Math.abs(l.x) <= w/2 + pad && Math.abs(l.y) <= h/2 + pad) return { st, part: "body" };
  }
  return null;
}
const pointers = new Map();
function setupCollageGestures() {
  const c = cv();
  c.addEventListener("pointerdown", e => {
    e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch (err) {}
    const p = cPoint(e); pointers.set(e.pointerId, p);
    if (pointers.size === 2 && cDrag) { startPinch(); return; }
    if (pointers.size > 2) return;
    const hs = hitSticker(p);
    if (hs) {
      if (hs.part === "delete") { R.proj.stickers = R.proj.stickers.filter(s => s !== hs.st); R.sel = null; cDrag = null; cDirty(); renderCTab(); return; }
      R.sel = { kind: "stk", id: hs.st.id };
      const st = hs.st, W = c.width, H = c.height;
      cDrag = hs.part === "handle"
        ? { mode: "handle", st, cx: st.x * W, cy: st.y * H, d0: Math.hypot(p.x - st.x * W, p.y - st.y * H), a0: Math.atan2(p.y - st.y * H, p.x - st.x * W), s0: st.s, r0: st.r }
        : { mode: "stk", st, p0: p, x0: st.x, y0: st.y, moved: false };
      R.proj.stickers = R.proj.stickers.filter(s => s !== st).concat(st); // bring to front
      cDirty(); renderCTab(); return;
    }
    const i = hitCell(p);
    if (i < 0) { R.sel = null; cDrag = null; cDirty(); renderCTab(); return; }
    const cell = R.proj.cells[i], prevSel = R.sel;
    R.sel = { kind: "cell", i };
    cDrag = { mode: "cell", i, cell, p0: p, cx0: cell.cx, cy0: cell.cy, moved: false, t0: performance.now(), wasSel: prevSel && prevSel.kind === "cell" && prevSel.i === i };
    if (cell.pid) cDrag.lp = setTimeout(() => {
      if (!cDrag || cDrag.moved || cDrag.mode !== "cell") return;
      cDrag.mode = "swap"; swapGhost = { pid: cell.pid, from: i, x: p.x, y: p.y, target: -1 };
      try { navigator.vibrate && navigator.vibrate(12); } catch (err) {}
      say("拖到另一格就能交換照片"); cDirty();
    }, 380);
    cDirty();
  });
  c.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId) || !cDrag) return;
    const p = cPoint(e); pointers.set(e.pointerId, p);
    const W = c.width, H = c.height;
    if (cDrag.mode === "pinchStk" || cDrag.mode === "pinchCell") { doPinch(); return; }
    if (cDrag.mode === "stk") {
      if (Math.hypot(p.x - cDrag.p0.x, p.y - cDrag.p0.y) > 4) cDrag.moved = true;
      cDrag.st.x = cDrag.x0 + (p.x - cDrag.p0.x) / W; cDrag.st.y = cDrag.y0 + (p.y - cDrag.p0.y) / H;
      cDirty(); return;
    }
    if (cDrag.mode === "handle") {
      const d = Math.hypot(p.x - cDrag.cx, p.y - cDrag.cy), a = Math.atan2(p.y - cDrag.cy, p.x - cDrag.cx);
      cDrag.st.s = Math.max(0.05, Math.min(1.6, cDrag.s0 * d / Math.max(1, cDrag.d0)));
      let r = cDrag.r0 + a - cDrag.a0; const snap = Math.round(r / (Math.PI / 2)) * (Math.PI / 2); if (Math.abs(r - snap) < 0.06) r = snap;
      cDrag.st.r = r; cDirty(); return;
    }
    if (cDrag.mode === "swap") { swapGhost.x = p.x; swapGhost.y = p.y; const t = hitCell(p); swapGhost.target = t !== swapGhost.from ? t : -1; cDirty(); return; }
    if (cDrag.mode === "cell") {
      const dx = p.x - cDrag.p0.x, dy = p.y - cDrag.p0.y;
      if (Math.hypot(dx, dy) > 6) { cDrag.moved = true; clearTimeout(cDrag.lp); }
      if (!cDrag.moved || !cDrag.cell.pid) return;
      const img = previewImg(cDrag.cell.pid, R.proj.filter), r = R.lastLayout.cells[cDrag.i]; if (!img) return;
      const s = Math.max(r.w / img.width, r.h / img.height) * cDrag.cell.z;
      let ddx = dx, ddy = dy; if (r.frame) { const cs = Math.cos(-r.r), sn = Math.sin(-r.r); ddx = dx * cs - dy * sn; ddy = dx * sn + dy * cs; }
      cDrag.cell.cx = cDrag.cx0 - ddx / (img.width * s); cDrag.cell.cy = cDrag.cy0 - ddy / (img.height * s);
      cDirty();
    }
  });
  const end = e => {
    pointers.delete(e.pointerId);
    if (!cDrag) return;
    if (cDrag.mode === "pinchStk" || cDrag.mode === "pinchCell") { if (pointers.size === 0) cDrag = null; else if (pointers.size === 1) { cDrag = null; } return; }
    clearTimeout(cDrag.lp);
    if (cDrag.mode === "swap") {
      const t = swapGhost.target;
      if (t >= 0) { const a = R.proj.cells[swapGhost.from], b = R.proj.cells[t]; [a.pid, b.pid] = [b.pid, a.pid]; a.cx = a.cy = b.cx = b.cy = .5; a.z = b.z = 1; R.sel = { kind: "cell", i: t }; say("已交換"); }
      swapGhost = null;
    } else if (cDrag.mode === "cell" && !cDrag.moved) {
      const now = performance.now();
      if (cDrag.wasSel && now - (R.lastTap || 0) < 330 && cDrag.cell.pid) { cDrag.cell.cx = cDrag.cell.cy = .5; cDrag.cell.z = 1; say("已重設這格的位置"); }
      R.lastTap = now;
      if (!cDrag.cell.pid) showCTab("photo"); else renderCTab();
    } else if (cDrag.mode === "stk" && !cDrag.moved && cDrag.st.kind === "text") { showCTab("text"); }
    cDrag = null; cDirty();
  };
  c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);
  c.addEventListener("contextmenu", e => e.preventDefault());
}
function startPinch() {
  const [a, b] = [...pointers.values()];
  const base = { d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x) };
  clearTimeout(cDrag.lp);
  if (cDrag.mode === "stk" || cDrag.mode === "handle") cDrag = { mode: "pinchStk", st: cDrag.st, s0: cDrag.st.s, r0: cDrag.st.r, ...base };
  else if (cDrag.mode === "cell" && cDrag.cell.pid) cDrag = { mode: "pinchCell", cell: cDrag.cell, z0: cDrag.cell.z, ...base };
}
function doPinch() {
  const [a, b] = [...pointers.values()]; if (!b) return;
  const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
  if (cDrag.mode === "pinchStk") { cDrag.st.s = Math.max(0.05, Math.min(1.6, cDrag.s0 * d / Math.max(1, cDrag.d0))); cDrag.st.r = cDrag.r0 + ang - cDrag.a0; }
  else cDrag.cell.z = Math.max(1, Math.min(5, cDrag.z0 * d / Math.max(1, cDrag.d0)));
  cDirty();
}

// panel tabs
function showCTab(t) {
  R.ctab = t;
  const tabOf = t === "text" ? "sticker" : t;
  [...$("cTabbar").children].forEach(x => x.setAttribute("aria-selected", String(x.dataset.tab === tabOf)));
  ["tpl", "photo", "sticker", "text", "style"].forEach(k => $("c-" + k).hidden = k !== t);
  document.querySelectorAll(".subseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.sub === t)));
  renderCTab();
}
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function miniPreview(proj, size) {
  const ratio = RATIOS[proj.ratio] || 1.25, c = document.createElement("canvas"); c.width = size; c.height = Math.round(size * ratio);
  drawProject(c.getContext("2d"), c.width, c.height, proj, pid => { const it = libItem(pid); return it ? it.small : null; }, null);
  return c;
}
function renderCTab() {
  if (state.mode !== "collage") return;
  const t = R.ctab;
  if (t === "tpl") {
    const host = $("cTpls"); host.innerHTML = "";
    const imp = el("button", "tpl", `<i><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></i><span>從相簿選</span>`);
    imp.type = "button"; imp.onclick = () => $("cFile").click(); host.appendChild(imp);
    const recs = recommendations();
    if (recs.length) host.appendChild(el("span", "tcat", "推薦"));
    if (!recs.length) { $("cRecNote").textContent = R.lib.length ? "照片再多一點，就能推薦更多組合" : "一次多選一些照片（例如這週拍的），我會挑出清楚、不重複的，排成推薦的拼貼"; }
    else $("cRecNote").textContent = `從 ${R.lib.length} 張裡挑出不模糊、不重複的照片`;
    for (const r of recs) {
      const b = el("button", "tpl rcard"); b.type = "button";
      const proj = newProject(r.tpl, r.pids, r.anchor ? { anchor: r.anchor } : null);
      const pv = miniPreview(proj, 120); b.appendChild(pv);
      b.appendChild(el("span", null, r.title));
      b.appendChild(el("small", null, r.sub));
      b.onclick = () => { R.proj = newProject(r.tpl, r.pids, { anchor: r.anchor || null, filter: R.proj ? R.proj.filter : "none" }); R.sel = null; cDirty(); say(`已套用「${r.title}」，可以拖移、捏合縮放，長按交換`); };
      host.appendChild(b);
    }
    const pids = R.proj.cells.map(c => c.pid).filter(Boolean);
    let lastCat = "";
    for (const tp of CT) {
      if (tp.cat !== lastCat) { host.appendChild(el("span", "tcat", tp.cat)); lastCat = tp.cat; }
      const b = el("button", "tpl"); b.type = "button"; b.setAttribute("aria-pressed", String(R.proj.tpl === tp.id));
      const proj = newProject(tp.id, tp.kind === "week" || tp.kind === "month" ? null : pids, { anchor: R.proj.anchor });
      b.appendChild(miniPreview(proj, 76)); b.appendChild(el("span", null, tp.name));
      b.onclick = () => { switchTemplate(tp.id); cDirty(); renderCTab(); };
      host.appendChild(b);
    }
  } else if (t === "photo") {
    const host = $("cTray"); host.innerHTML = "";
    const add = el("button", "tray-add", "＋"); add.type = "button"; add.setAttribute("aria-label", "從相簿加入照片"); add.onclick = () => $("cFile").click(); host.appendChild(add);
    const top = new Set(dedupe(R.lib).slice(0, Math.max(3, Math.round(R.lib.length * 0.3))).map(x => x.id));
    const used = new Set(R.proj.cells.map(c => c.pid));
    for (const it of R.lib) {
      const b = el("button", "tray-item" + (used.has(it.id) ? " used" : "")); b.type = "button";
      b.innerHTML = `<img src="${it.thumb}" alt="">${top.has(it.id) ? '<b>推薦</b>' : ""}`;
      b.onclick = () => placePhoto(it.id);
      host.appendChild(b);
    }
    const s = R.sel && R.sel.kind === "cell" ? R.sel.i : -1;
    $("cPhotoNote").textContent = s >= 0 ? `點照片放進第 ${s + 1} 格` : "先點一格，再點照片放進去";
    $("cClearCell").disabled = s < 0 || !R.proj.cells[s].pid;
  } else if (t === "sticker") {
    const host = $("cCutTray"); host.innerHTML = "";
    if (!R.lib.length) host.appendChild(el("span", "note", "先匯入照片，就能把人物或物品做成去背貼紙"));
    for (const it of R.lib) {
      const b = el("button", "tray-item"); b.type = "button"; b.innerHTML = `<img src="${it.thumb}" alt="">`;
      b.onclick = async () => {
        say(sessions.cutout ? "AI 去背中…" : "AI 準備中，第一次要下載模型…", true);
        try { const r = await makeCutout(it); addSticker("cut", { key: r.key }, r.ar, 0.45); say("貼紙做好了，可以拖移、用右下角旋轉縮放"); }
        catch (e) { say("這張找不到明顯的主體，換一張試試"); }
      };
      host.appendChild(b);
    }
    const dh = $("cDecos");
    if (!dh.children.length) for (const k of DECOS) {
      const b = el("button", "deco"); b.type = "button"; b.setAttribute("aria-label", k);
      const c = document.createElement("canvas"); c.width = c.height = 96; const x = c.getContext("2d"), ar = DECO_AR[k] || 1;
      x.translate(48, 48); drawDeco(x, k, 80, 80 * ar);
      b.appendChild(c); b.onclick = () => addSticker("deco", { deco: k }, ar, k === "tape" ? 0.4 : 0.2);
      dh.appendChild(b);
    }
  } else if (t === "text") {
    const st = R.sel && R.sel.kind === "stk" ? R.proj.stickers.find(s => s.id === R.sel.id && s.kind === "text") : null;
    const input = $("cText");
    if (document.activeElement !== input) input.value = st ? st.data.text : "";
    $("cTextAdd").textContent = st ? "完成" : "加上文字";
    const sh = $("cTextStyles"); sh.innerHTML = "";
    const cur = st ? st.data.style : (R.textStyle || "hand");
    for (const [k, label] of TEXT_STYLES) { const b = el("button", null, label); b.type = "button"; b.setAttribute("aria-pressed", String(cur === k)); b.onclick = () => { R.textStyle = k; if (st) { st.data.style = k; measureText(st); cDirty(); } renderCTab(); }; sh.appendChild(b); }
    const ch = $("cTextColors"); ch.innerHTML = "";
    const curC = st ? st.data.color : (R.textColor || "#ffffff");
    for (const col of TEXT_COLORS) { const b = el("button", "sw"); b.type = "button"; b.style.background = col; b.setAttribute("aria-label", col); b.setAttribute("aria-pressed", String(curC === col)); b.onclick = () => { R.textColor = col; if (st) { st.data.color = col; cDirty(); } renderCTab(); }; ch.appendChild(b); }
  } else if (t === "style") {
    const rh = $("cRatios"); rh.innerHTML = "";
    for (const k of Object.keys(RATIOS)) { const b = el("button", null, k); b.type = "button"; b.setAttribute("aria-pressed", String(R.proj.ratio === k)); b.onclick = () => { R.proj.ratio = k; cDirty(); renderCTab(); }; rh.appendChild(b); }
    const bh = $("cBgs"); bh.innerHTML = "";
    for (const col of BG) { const b = el("button", "sw"); b.type = "button"; b.style.background = col; b.setAttribute("aria-label", "背景 " + col); b.setAttribute("aria-pressed", String(R.proj.bg === col)); b.onclick = () => { R.proj.bg = col; cDirty(); renderCTab(); }; bh.appendChild(b); }
    const fh = $("cFilters"); fh.innerHTML = "";
    for (const f of FILTERS) { const b = el("button", null, f.short); b.type = "button"; b.setAttribute("aria-pressed", String(R.proj.filter === f.id)); b.onclick = () => { R.proj.filter = f.id; cDirty(); renderCTab(); }; fh.appendChild(b); }
    cRulers();
  }
}
const CSTY = { gap: { label: "邊距", min: 0, max: 80, def: 14 }, radius: { label: "圓角", min: 0, max: 80, def: 0 } };
function cRulers() {
  const key = R.styleKey || "gap", p = CSTY[key];
  $("cStyKeys").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === key)));
  const host = $("cStyleRow");
  if (!host.children.length) host.innerHTML = `<span class="sl-label" id="cStyleLabel"></span><div class="ruler" id="cStyleRuler" aria-labelledby="cStyleLabel"></div><div class="num"><input id="cStyleNum" type="number" inputmode="numeric" aria-label="輸入數值"></div>`;
  $("cStyleLabel").textContent = p.label;
  const num = $("cStyleNum"); num.value = R.proj[key];
  const set = v => { v = Math.round(Math.min(p.max, Math.max(p.min, v))); R.proj[key] = v; if (document.activeElement !== num) num.value = v; R.cRuler.setValue(v); cDirty(); };
  if (!R.cRuler) R.cRuler = makeRuler($("cStyleRuler"), { min: p.min, max: p.max, def: p.def, value: R.proj[key], onInput: v => R.cRuler.cb(v) });
  R.cRuler.cb = v => { R.proj[R.styleKey || "gap"] = v; num.value = v; cDirty(); };
  R.cRuler.update({ min: p.min, max: p.max, def: p.def, value: R.proj[key] });
  num.onchange = () => { const v = parseFloat(num.value); if (Number.isFinite(v)) set(v); };
  num.onkeydown = e => { if (e.key === "Enter") num.blur(); };
}
function placePhoto(pid) {
  let i = R.sel && R.sel.kind === "cell" ? R.sel.i : -1;
  if (i < 0) i = R.proj.cells.findIndex(c => !c.pid);
  if (i < 0) i = 0;
  const c = R.proj.cells[i]; c.pid = pid; c.cx = c.cy = .5; c.z = 1;
  const next = R.proj.cells.findIndex(x => !x.pid);
  R.sel = { kind: "cell", i: next >= 0 ? next : i };
  cDirty(); renderCTab();
}
function autoFill() {
  const used = new Set(R.proj.cells.map(c => c.pid).filter(Boolean)), best = dedupe(R.lib);
  // best distinct photos first, then any other unused ones so no cell stays empty
  const pool = best.concat(R.lib.filter(x => !best.includes(x))).filter(x => !used.has(x.id));
  for (const c of R.proj.cells) if (!c.pid && pool.length) { c.pid = pool.shift().id; c.cx = c.cy = .5; c.z = 1; }
  cDirty(); renderCTab();
}
async function exportCollage() {
  if (!R.proj || !R.proj.cells.some(c => c.pid)) { say("先放幾張照片進拼貼再儲存"); return; }
  const ratio = RATIOS[R.proj.ratio] || 1.25, W = $("cHQ").checked ? 2160 : 1080, H = Math.round(W * ratio);
  busy(true, "正在用原始畫質輸出…"); await tick();
  try {
    const L = layout(R.proj, W, H), imgs = new Map(), need = new Map();
    // each photo is decoded once, just large enough to cover its biggest cell (zoom included)
    L.cells.forEach((r, i) => {
      const c = R.proj.cells[i], it = c && c.pid && libItem(c.pid); if (!it) return;
      const s = Math.max(r.w / it.w, r.h / it.h) * c.z, n = Math.min(3000, Math.ceil(s * Math.max(it.w, it.h) * 1.05));
      need.set(c.pid, Math.max(need.get(c.pid) || 0, n, 256));
    });
    for (const [pid, n] of need) {
      const src = await decodeFile(libItem(pid), n), img = filtered(src, pid, R.proj.filter, true);
      if (img !== src) freeCanvas(src);
      imgs.set(pid, img);
      await tick();
    }
    if (GPU && GPU.release) GPU.release();
    const out = document.createElement("canvas"); out.width = W; out.height = H;
    drawProject(out.getContext("2d"), W, H, R.proj, pid => imgs.get(pid) || null, null);
    for (const c of imgs.values()) freeCanvas(c);
    imgs.clear();
    const blob = await new Promise(res => out.toBlob(res, "image/jpeg", 0.93));
    freeCanvas(out);
    if (!blob) throw new Error("toBlob");
    const res = await deliver({ blob, name: `collage_${dayKey(new Date())}.jpg` }, false);
    busy(false, res === "saved" ? "已儲存拼貼" : res === "declined" ? "已取消儲存" : "");
  } catch (e) { busy(false, "輸出失敗，試試關掉高畫質再存一次"); }
}

// floating actions for whatever is selected, so the next step is always visible
let ctxKey = "";
function updateCtx() {
  const bar = $("cCtx"), s = R.sel;
  let key = "none";
  const cell = s && s.kind === "cell" ? R.proj.cells[s.i] : null;
  const st = s && s.kind === "stk" ? R.proj.stickers.find(x => x.id === s.id) : null;
  if (cell) key = "c" + s.i + (cell.pid ? "p" : "e");
  else if (st) key = "s" + st.id;
  if (cDrag && (cDrag.mode !== "cell" || cDrag.moved)) key = "drag";
  if (key === ctxKey) return;
  ctxKey = key; bar.innerHTML = "";
  const btn = (label, fn, go) => { const b = el("button", go ? "go" : null, label); b.type = "button"; b.onclick = e => { e.stopPropagation(); fn(); }; bar.appendChild(b); };
  if (key === "none" || key === "drag") { bar.hidden = true; return; }
  bar.hidden = false;
  if (cell && !cell.pid) { btn("＋ 選照片放進這格", () => showCTab("photo"), true); }
  else if (cell) {
    bar.appendChild(el("span", "hint", "拖曳調整位置・兩指縮放・按住拖到別格交換"));
    btn("換照片", () => showCTab("photo"));
    btn("重設位置", () => { cell.cx = cell.cy = .5; cell.z = 1; cDirty(); });
    btn("移除", () => { cell.pid = null; ctxKey = ""; cDirty(); renderCTab(); });
  } else if (st) {
    if (st.kind === "text") btn("編輯文字", () => { showCTab("text"); $("cText").focus(); });
    btn("複製", () => { const c = { ...st, id: uid(), x: st.x + 0.04, y: st.y + 0.04, data: { ...st.data } }; R.proj.stickers.push(c); R.sel = { kind: "stk", id: c.id }; cDirty(); });
    btn("刪除", () => { R.proj.stickers = R.proj.stickers.filter(x => x !== st); R.sel = null; cDirty(); renderCTab(); });
  }
}
