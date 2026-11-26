// ---------- Video recap (reels): templates, music with beat detection, recording ----------
const REEL_TPLS = [
  { id: "weekend", name: "Weekend Recap", intro: 4, per: 1, outro: 2, trans: "flash", td: 0.08, motion: "punch", text: "date", title: "WEEKEND RECAP" },
  { id: "travel", name: "旅行日記", intro: 4, per: 2, outro: 2, trans: "fade", td: 0.35, motion: "kb", text: "lower", title: "TRAVEL DIARY" },
  { id: "vlog", name: "Vlog", intro: 2, per: 2, outro: 2, trans: "slide", td: 0.3, motion: "zoom", text: "caption", title: "MY DAY" },
  { id: "dump", name: "Photo Dump", intro: 2, per: 0.5, outro: 2, trans: "cut", td: 0, motion: "none", text: "none", frame: "polaroid", title: "PHOTO DUMP" },
  { id: "ba", name: "Before & After", intro: 0, per: 4, outro: 0, trans: "wipe", td: 0.6, motion: "kb", text: "ba", title: "", max: 2 },
  { id: "memo", name: "慢速回憶", intro: 4, per: 3, outro: 3, trans: "fade", td: 0.8, motion: "kb", text: "hand", frame: "letterbox", title: "memories" },
];
function reelState() {
  if (!R.reel) R.reel = { tpl: "weekend", pids: [], bpm: 120, phase: 0, music: null, title: "", sub: "", filter: "none" };
  return R.reel;
}
function reelTpl() { return REEL_TPLS.find(t => t.id === reelState().tpl) || REEL_TPLS[0]; }
function reelPids() {
  const rs = reelState(), t = reelTpl();
  let pids = rs.pids.filter(libItem);
  if (!pids.length) pids = dedupe(R.lib).slice(0, 12).sort(byDate).map(x => x.id);
  return t.max ? pids.slice(0, t.max) : pids;
}
// timeline in seconds
function reelPlan() {
  const rs = reelState(), t = reelTpl(), beat = 60 / rs.bpm, pids = reelPids(), slides = [];
  let at = 0;
  if (t.intro) { slides.push({ type: "title", start: 0, dur: t.intro * beat }); at = t.intro * beat; }
  pids.forEach((pid, i) => { const dur = t.per * beat; slides.push({ type: "photo", pid, i, start: at, dur }); at += dur; });
  if (t.outro) { slides.push({ type: "outro", start: at, dur: t.outro * beat }); at += t.outro * beat; }
  return { slides, total: Math.max(at, 0.5), beat };
}
function reelImg(pid) {
  const it = libItem(pid); if (!it) return null;
  const med = R.med.get(pid);
  if (!med) getMed(pid).catch(() => {});
  return filtered(med || it.small, pid + (med ? "m" : "s"), reelState().filter);
}
// soft blurred backdrop for framed slides: tiny copy scaled up
function blurOf(img) {
  if (img.__blur) return img.__blur;
  const c = document.createElement("canvas"); c.width = 24; c.height = Math.max(8, Math.round(24 * img.height / img.width));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  img.__blur = c; return c;
}
function seeded(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }
function drawPhotoSlide(ctx, W, H, s, t, tp, local) {
  const img = reelImg(s.pid); if (!img) return;
  const p = Math.min(1, Math.max(0, local / s.dur));
  let scale = 1, ox = 0, oy = 0;
  if (tp.motion === "kb") { const dir = s.i % 2 ? 1 : -1; scale = 1.06 + 0.08 * p; ox = dir * (p - 0.5) * 0.04; oy = (s.i % 3 - 1) * (p - 0.5) * 0.03; }
  else if (tp.motion === "zoom") scale = 1.02 + 0.06 * p;
  else if (tp.motion === "punch") scale = 1 + 0.09 * Math.exp(-local * 9);
  if (tp.frame === "polaroid") {
    ctx.save(); ctx.imageSmoothingQuality = "low"; ctx.filter = "none";
    const b = blurOf(img), k = Math.max(W / b.width, H / b.height);
    ctx.globalAlpha = 0.9; ctx.drawImage(b, (W - b.width * k) / 2, (H - b.height * k) / 2, b.width * k, b.height * k); ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, 0, W, H); ctx.restore();
    const rot = (seeded(s.i) - 0.5) * 0.16, fw = W * 0.74, bd = fw * 0.05, ph = fw - 2 * bd, fh = ph * Math.min(1.25, img.height / img.width) + bd + fw * 0.16, ih = fh - bd - fw * 0.16;
    ctx.save(); ctx.translate(W / 2 + (seeded(s.i + 3) - 0.5) * W * 0.06, H / 2 + (seeded(s.i + 7) - 0.5) * H * 0.04); ctx.rotate(rot);
    ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = W * 0.03; ctx.shadowOffsetY = W * 0.01;
    ctx.fillStyle = "#fbfaf6"; ctx.fillRect(-fw / 2, -fh / 2, fw, fh); ctx.shadowColor = "transparent";
    const r = { x: -fw / 2 + bd, y: -fh / 2 + bd, w: ph, h: ih }, gm = coverGeom(img, r, { cx: .5, cy: .5, z: 1 });
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); ctx.drawImage(img, gm.x, gm.y, gm.w, gm.h); ctx.restore();
    ctx.restore();
    return;
  }
  const k = Math.max(W / img.width, H / img.height) * scale, w = img.width * k, h = img.height * k;
  ctx.drawImage(img, (W - w) / 2 + ox * W, (H - h) / 2 + oy * H, w, h);
}
function drawReelText(ctx, W, H, s, tp, rs) {
  const u = W / 1080;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  if (s.type === "photo") {
    const it = libItem(s.pid);
    if (tp.text === "date" && it && it.date) { ctx.font = `500 ${Math.round(46*u)}px "DM Mono", monospace`; ctx.textAlign = "right"; ctx.shadowColor = "rgba(255,110,20,.85)"; ctx.shadowBlur = 14*u; ctx.fillStyle = "#ff9a2e"; ctx.fillText(fmtStamp(it.date), W - 60*u, H - 140*u); ctx.shadowBlur = 0; ctx.fillText(fmtStamp(it.date), W - 60*u, H - 140*u); }
    if (tp.text === "lower" && (rs.sub || rs.title)) { const g = ctx.createLinearGradient(0, H * 0.72, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.55)"); ctx.fillStyle = g; ctx.fillRect(0, H * 0.72, W, H * 0.28); ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = `700 ${Math.round(58*u)}px "Noto Sans TC", sans-serif`; ctx.fillText(rs.sub || rs.title, 70*u, H - 200*u); if (it && it.date) { ctx.font = `500 ${Math.round(34*u)}px "DM Mono", monospace`; ctx.globalAlpha = .8; ctx.fillText(`${it.date.getFullYear()}.${pad2(it.date.getMonth()+1)}.${pad2(it.date.getDate())}`, 72*u, H - 140*u); ctx.globalAlpha = 1; } }
    if (tp.text === "caption" && rs.sub) { ctx.font = `700 ${Math.round(52*u)}px "Noto Sans TC", sans-serif`; ctx.lineWidth = 10*u; ctx.strokeStyle = "rgba(0,0,0,.65)"; ctx.strokeText(rs.sub, W/2, H - 260*u); ctx.fillStyle = "#fff"; ctx.fillText(rs.sub, W/2, H - 260*u); }
    if (tp.text === "hand") { ctx.font = `500 ${Math.round(90*u)}px "Caveat", "Noto Sans TC", cursive`; ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fillText(rs.sub || rs.title || tp.title, W/2, H - 230*u); }
    if (tp.text === "ba") { const label = s.i === 0 ? "BEFORE" : "AFTER"; ctx.font = `900 ${Math.round(84*u)}px "Noto Sans TC", sans-serif`; ctx.lineWidth = 14*u; ctx.strokeStyle = "#1f1c19"; ctx.strokeText(label, W/2, 300*u); ctx.fillStyle = s.i === 0 ? "#ffffff" : "#ffd23f"; ctx.fillText(label, W/2, 300*u); }
  }
}
function drawTitleCard(ctx, W, H, s, local, tp, rs, outro) {
  const u = W / 1080, pids = reelPids(), first = pids.length ? reelImg(pids[outro ? pids.length - 1 : 0]) : null;
  if (first) { const k = Math.max(W / first.width, H / first.height) * (1.1 + 0.05 * local / s.dur); ctx.drawImage(first, (W - first.width * k) / 2, (H - first.height * k) / 2, first.width * k, first.height * k); }
  ctx.fillStyle = "rgba(10,10,12,.55)"; ctx.fillRect(0, 0, W, H);
  const a = Math.min(1, local / 0.4); ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
  const title = outro ? (rs.outro || "see you next time") : (rs.title || tp.title);
  ctx.font = tp.id === "memo" || outro ? `500 ${Math.round(130*u)}px "Caveat", "Noto Sans TC", cursive` : `900 ${Math.round(104*u)}px "Noto Sans TC", sans-serif`;
  const lines = String(title).split(/\s*\/\s*|\n/);
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, H * 0.48 + (i - (lines.length - 1) / 2) * 120*u));
  if (!outro) {
    const dates = pids.map(libItem).filter(x => x && x.date).map(x => x.date).sort((x, y) => x - y);
    if (dates.length) { const d0 = dates[0], d1 = dates[dates.length - 1]; ctx.font = `500 ${Math.round(40*u)}px "DM Mono", monospace`; ctx.fillStyle = "#ff9a2e"; ctx.fillText(dayKey(d0) === dayKey(d1) ? `${d0.getFullYear()}.${pad2(d0.getMonth()+1)}.${pad2(d0.getDate())}` : `${pad2(d0.getMonth()+1)}.${pad2(d0.getDate())} — ${pad2(d1.getMonth()+1)}.${pad2(d1.getDate())}`, W / 2, H * 0.48 + 120*u * (lines.length / 2 + 0.6)); }
  }
  ctx.globalAlpha = 1;
}
function drawSlide(ctx, W, H, s, t, tp, rs) {
  const local = t - s.start;
  if (s.type === "photo") { drawPhotoSlide(ctx, W, H, s, t, tp, local); drawReelText(ctx, W, H, s, tp, rs); }
  else drawTitleCard(ctx, W, H, s, local, tp, rs, s.type === "outro");
}
function drawReel(ctx, W, H, t) {
  const rs = reelState(), tp = reelTpl(), plan = reelPlan(), S = plan.slides;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  let idx = S.findIndex(s => t >= s.start && t < s.start + s.dur); if (idx < 0) idx = S.length - 1;
  const s = S[idx], next = S[idx + 1], into = s.start + s.dur - t;
  drawSlide(ctx, W, H, s, t, tp, rs);
  if (next && tp.td > 0 && into < tp.td) {
    const p = 1 - into / tp.td;
    ctx.save();
    if (tp.trans === "fade") { ctx.globalAlpha = p; drawSlide(ctx, W, H, next, next.start, tp, rs); }
    else if (tp.trans === "slide") { const e = p * p * (3 - 2 * p); ctx.translate(W * (1 - e), 0); drawSlide(ctx, W, H, next, next.start, tp, rs); }
    else if (tp.trans === "wipe") { ctx.beginPath(); ctx.rect(0, 0, W * p, H); ctx.clip(); drawSlide(ctx, W, H, next, next.start, tp, rs); ctx.restore(); ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(W * p - 3, 0, 6, H); }
    else if (tp.trans === "flash") { ctx.fillStyle = `rgba(255,255,255,${0.85 * p})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  if (tp.trans === "flash" && s.type === "photo" && t - s.start < 0.08) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - (t - s.start) / 0.08)})`; ctx.fillRect(0, 0, W, H); }
  if (tp.frame === "letterbox") { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H * 0.1); ctx.fillRect(0, H * 0.9, W, H * 0.1); }
  return plan;
}

// music: decode, estimate tempo and the beat phase
let audioCtx = null;
const getAC = () => audioCtx || (audioCtx = new (window.AudioContext || window.webkitAudioContext)());
async function analyzeMusic(file) {
  const buf = await new Promise((res, rej) => { file.arrayBuffer().then(ab => getAC().decodeAudioData(ab, res, rej)).catch(rej); });
  const sr = buf.sampleRate, a = buf.getChannelData(0), b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null, hop = 512, n = Math.floor(a.length / hop);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < hop; j++) { const v = a[i*hop + j] + (b ? b[i*hop + j] : 0); s += v * v; } env[i] = Math.log(1e-6 + s); }
  const on = new Float32Array(n); for (let i = 1; i < n; i++) on[i] = Math.max(0, env[i] - env[i-1]);
  const fps = sr / hop, L = Math.min(n, Math.floor(fps * 60));
  const at = x => { const i = Math.floor(x), f = x - i; return (on[i] || 0) * (1 - f) + (on[i + 1] || 0) * f; };
  let best = -1, bpm = 120;
  for (let t = 70; t <= 180; t += 0.5) {
    const lag = fps * 60 / t; let s = 0;
    for (let i = Math.ceil(lag); i < L; i++) s += on[i] * at(i - lag);
    s *= Math.exp(-((Math.log2(t / 115)) ** 2) / (2 * 0.45 * 0.45));
    if (s > best) { best = s; bpm = t; }
  }
  const per = fps * 60 / bpm; let bp = 0, bs = -1;
  for (let ph = 0; ph < per; ph += 0.5) { let s = 0; for (let t = ph; t < L; t += per) s += on[Math.round(t)] || 0; if (s > bs) { bs = s; bp = ph; } }
  return { bpm: Math.round(bpm), phase: bp / fps, duration: buf.duration };
}

// preview playback
let rPlay = null;
const rcv = () => $("rCanvas");
function rSize() {
  const box = $("rFit"), bw = box.clientWidth, bh = box.clientHeight; if (!bw || !bh) return null;
  let h = bh, w = h * 9 / 16; if (w > bw) { w = bw; h = w * 16 / 9; }
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(Math.min(720, w * dpr)), H = Math.round(W * 16 / 9), c = rcv();
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  c.style.width = Math.floor(w) + "px"; c.style.height = Math.floor(h) + "px";
  return { W, H };
}
function rDraw(t) {
  const sz = rSize(); if (!sz) return;
  const plan = drawReel(rcv().getContext("2d"), sz.W, sz.H, t || 0);
  $("rTime").textContent = `${(t || 0).toFixed(1)} / ${plan.total.toFixed(1)} 秒`;
}
function rStop() {
  if (!rPlay) return;
  cancelAnimationFrame(rPlay.raf); if (rPlay.audio) rPlay.audio.pause();
  rPlay = null; $("rPlay").textContent = "▶ 播放";
}
function musicStart(rs) { return rs.music ? Math.max(0, rs.music.offset + ((rs.phase - rs.music.offset) % (60 / rs.bpm) + 60 / rs.bpm) % (60 / rs.bpm)) : 0; }
async function rToggle() {
  if (rPlay) { rStop(); return; }
  const rs = reelState(), plan = reelPlan();
  for (const pid of reelPids()) await getMed(pid).catch(() => {});
  let audio = null;
  if (rs.music) { audio = rs.music.el; audio.currentTime = musicStart(rs); try { await audio.play(); } catch (e) { audio = null; } }
  const t0 = performance.now();
  rPlay = { audio, raf: 0 }; $("rPlay").textContent = "■ 停止";
  const loop = () => {
    if (!rPlay) return;
    const t = audio ? audio.currentTime - musicStart(rs) : (performance.now() - t0) / 1000;
    if (t >= plan.total) { rStop(); rDraw(0); return; }
    rDraw(Math.max(0, t)); rPlay.raf = requestAnimationFrame(loop);
  };
  loop();
}
// record the video in real time from a 1080x1920 canvas plus the music
async function exportReel() {
  rStop();
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { say("這個瀏覽器不支援錄製影片"); return; }
  const types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const mime = types.find(t => MediaRecorder.isTypeSupported(t));
  if (!mime) { say("這個瀏覽器不支援錄製影片"); return; }
  const rs = reelState(), plan = reelPlan(), pids = reelPids();
  if (!pids.length) { say("先選幾張照片"); return; }
  busy(true, "準備照片…"); $("rPlay").disabled = true; await tick();
  try {
    for (const pid of pids) await getMed(pid);
    const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); drawReel(ctx, W, H, 0);
    const stream = c.captureStream(30);
    let audio = null;
    if (rs.music) {
      const ac = getAC(); if (ac.state === "suspended") await ac.resume();
      if (!rs.music.node) { rs.music.node = ac.createMediaElementSource(rs.music.el); rs.music.node.connect(ac.destination); }
      const dest = ac.createMediaStreamDestination(); rs.music.node.connect(dest);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      audio = rs.music.el; audio.currentTime = musicStart(rs); rs.music.dest = dest;
    }
    const chunks = [], rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(res => rec.onstop = res);
    rec.start(250);
    if (audio) await audio.play().catch(() => {});
    const t0 = performance.now();
    await new Promise(res => {
      const loop = () => {
        const t = audio ? audio.currentTime - musicStart(rs) : (performance.now() - t0) / 1000;
        drawReel(ctx, W, H, Math.max(0, Math.min(plan.total - 0.001, t)));
        say(`錄製中 ${Math.min(plan.total, t).toFixed(0)} / ${plan.total.toFixed(0)} 秒，請保持畫面開著`, true);
        if (t >= plan.total) return res();
        requestAnimationFrame(loop);
      };
      loop();
    });
    rec.stop(); if (audio) audio.pause();
    await done;
    if (rs.music && rs.music.dest) { try { rs.music.node.disconnect(rs.music.dest); } catch (e) {} rs.music.dest = null; }
    stream.getTracks().forEach(t => t.stop());
    const ext = mime.includes("mp4") ? "mp4" : "webm", blob = new Blob(chunks, { type: mime.split(";")[0] });
    const res = await deliver({ blob, name: `recap_${dayKey(new Date())}.${ext}`, video: true }, false);
    busy(false, res === "saved" ? "影片已儲存" : res === "declined" ? "已取消儲存" : "");
  } catch (e) { busy(false, "錄製失敗，請再試一次"); }
  $("rPlay").disabled = false; rDraw(0);
}
function renderRTab() {
  if (state.mode !== "reel") return;
  const rs = reelState(), t = R.rtab || "tpl";
  if (t === "tpl") {
    const host = $("rTpls"); host.innerHTML = "";
    for (const tp of REEL_TPLS) {
      const b = el("button", null, tp.name); b.type = "button"; b.setAttribute("aria-pressed", String(rs.tpl === tp.id));
      b.onclick = () => { rs.tpl = tp.id; rStop(); rDraw(0); renderRTab(); };
      host.appendChild(b);
    }
    const plan = reelPlan(), tp = reelTpl();
    $("rTplNote").textContent = `${reelPids().length} 張照片 · 每張 ${tp.per} 拍 · 約 ${plan.total.toFixed(0)} 秒` + (tp.max ? ` · 只用前 ${tp.max} 張` : "");
  } else if (t === "photos") {
    const host = $("rTray"); host.innerHTML = "";
    const add = el("button", "tray-add", "＋"); add.type = "button"; add.setAttribute("aria-label", "從相簿加入照片"); add.onclick = () => $("cFile").click(); host.appendChild(add);
    const chosen = reelPids();
    for (const pid of chosen) {
      const it = libItem(pid), b = el("button", "tray-item"); b.type = "button";
      b.innerHTML = `<img src="${it.thumb}" alt=""><b>${chosen.indexOf(pid) + 1}</b>`;
      b.onclick = () => { rs.pids = chosen.filter(x => x !== pid); rStop(); rDraw(0); renderRTab(); };
      host.appendChild(b);
    }
    const rest = R.lib.filter(x => !chosen.includes(x.id));
    for (const it of rest) {
      const b = el("button", "tray-item used"); b.type = "button"; b.innerHTML = `<img src="${it.thumb}" alt="">`;
      b.onclick = () => { rs.pids = chosen.concat(it.id); rStop(); rDraw(0); renderRTab(); };
      host.appendChild(b);
    }
    $("rPhotoNote").textContent = R.lib.length ? "點有編號的照片移除，點淡色的加到最後" : "先從相簿加入照片";
  } else if (t === "music") {
    $("rMusicName").textContent = rs.music ? rs.music.name : "沒有音樂（影片會是靜音的）";
    if (!R.bpmRuler) {
      $("rBpmRow").innerHTML = `<span class="sl-label" id="rBpmLabel">節拍</span><div class="ruler" id="rBpmRuler" aria-labelledby="rBpmLabel"></div><div class="num"><input id="rBpmNum" type="number" inputmode="numeric" aria-label="每分鐘拍數"></div>`;
      R.bpmRuler = makeRuler($("rBpmRuler"), { min: 60, max: 180, def: 120, value: rs.bpm, onInput: (v, done) => { rs.bpm = v; $("rBpmNum").value = v; if (done) { rStop(); rDraw(0); } } });
      $("rBpmNum").onchange = () => { const v = Math.round(Math.min(180, Math.max(60, parseFloat($("rBpmNum").value) || rs.bpm))); rs.bpm = v; R.bpmRuler.setValue(v); $("rBpmNum").value = v; rDraw(0); };
    }
    R.bpmRuler.update({ min: 60, max: 180, def: rs.music ? rs.music.bpm : 120, value: rs.bpm }); $("rBpmNum").value = rs.bpm;
    $("rOffset").value = rs.music ? Math.round(rs.music.offset) : 0; $("rOffset").disabled = !rs.music;
    $("rMusicClear").disabled = !rs.music;
  } else if (t === "text") {
    if (document.activeElement !== $("rTitle")) $("rTitle").value = rs.title;
    if (document.activeElement !== $("rSub")) $("rSub").value = rs.sub;
    const fh = $("rFilters"); fh.innerHTML = "";
    for (const f of FILTERS) { const b = el("button", null, f.short); b.type = "button"; b.setAttribute("aria-pressed", String(rs.filter === f.id)); b.onclick = () => { rs.filter = f.id; rDraw(0); renderRTab(); }; fh.appendChild(b); }
  }
}
function showRTab(t) {
  R.rtab = t;
  [...$("rTabbar").children].forEach(x => x.setAttribute("aria-selected", String(x.dataset.tab === t)));
  ["tpl", "photos", "music", "text"].forEach(k => $("r-" + k).hidden = k !== t);
  renderRTab();
}
