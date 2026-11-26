// ---------- Mode switching and wiring for collage / video ----------
state.mode = "home";
const MODE_TITLE = { home: "濾鏡暗房", edit: "修圖", collage: "拼貼", reel: "回顧影片" };
function setMode(m) {
  if (state.mode === "reel" && m !== "reel") rStop();
  state.mode = m;
  ["home", "edit", "collage", "reel"].forEach(k => $("mode-" + k).hidden = k !== m);
  $("ttl").textContent = MODE_TITLE[m];
  $("backBtn").hidden = $("addLabel").hidden = $("saveOne").hidden = m === "home";
  $("addLabel").htmlFor = m === "edit" ? "file" : "cFile";
  if (m === "home") { renderHome(); return; }
  if (m === "collage") {
    if (!R.proj) R.proj = R.lib.length ? newProject(gridFor(Math.min(4, dedupe(R.lib).length)), dedupe(R.lib).slice(0, 4).map(x => x.id)) : newProject("g4", []);
    showCTab(R.ctab); requestAnimationFrame(cDirty); maybeCoach();
  } else if (m === "reel") { showRTab(R.rtab || "tpl"); requestAnimationFrame(() => rDraw(0)); }
  else requestAnimationFrame(() => { fitView(); renderPreview(); });
}
$("backBtn").onclick = () => setMode("home");
function goEditTab(tab) { setMode("edit"); const b = document.querySelector(`#tabbar [data-tab="${tab}"]`); if (b) b.click(); }
function maybeCoach() {
  let seen = false; try { seen = localStorage.getItem("darkroom-coach") === "1"; } catch (e) {}
  if (!seen && R.lib.length) $("cCoach").hidden = false;
}
$("cCoachOk").onclick = () => { $("cCoach").hidden = true; try { localStorage.setItem("darkroom-coach", "1"); } catch (e) {} };
$("cHelp").onclick = () => { $("cCoach").hidden = false; };
// home cards: pick photos first, then land on the right tool
const GO = {
  auto: () => { window.afterEditLoad = () => { goEditTab("tpl"); const rec = recommend(curPhoto()), t = TEMPLATES.find(x => x.id === rec.id); if (t) { applyTemplate(t); say(`判斷為${rec.why}，已套用「${t.name}」，下面可以換別的`); } }; $("file").click(); },
  filter: () => { window.afterEditLoad = () => goEditTab("filter"); $("file").click(); },
  erase: () => { window.afterEditLoad = () => { goEditTab("erase"); say("用手指把要消除的地方塗紅，或按「AI 找路人」"); }; $("file").click(); },
  collage: () => { window.afterLibLoad = () => { setMode("collage"); showCTab("tpl"); maybeCoach(); }; $("cFile").click(); },
  reel: () => { window.afterLibLoad = () => { setMode("reel"); showRTab("tpl"); say("先按播放看看，再到「音樂」加上你的歌"); }; $("cFile").click(); },
  week: () => { window.afterLibLoad = () => { setMode("collage"); switchTemplate("week"); showCTab("tpl"); cDirty(); maybeCoach(); }; $("cFile").click(); },
  sticker: () => { window.afterLibLoad = () => { setMode("collage"); showCTab("sticker"); say("點下面的照片，AI 會把主體去背成貼紙"); }; $("cFile").click(); },
};
document.querySelectorAll("#mode-home [data-go]").forEach(b => b.onclick = () => GO[b.dataset.go]());
function renderHome() {
  const host = $("cont"); host.innerHTML = "";
  const realEdit = state.photos.filter(p => !p.sample).length;
  const add = (label, fn) => { const b = el("button", "tbtn", label); b.type = "button"; b.onclick = fn; host.appendChild(b); };
  if (realEdit) add(`繼續修圖（${realEdit} 張）`, () => setMode("edit"));
  if (R.lib.length) { add(`繼續拼貼（${R.lib.length} 張）`, () => setMode("collage")); add("繼續回顧影片", () => setMode("reel")); }
}
document.querySelectorAll(".subseg").forEach(g => g.onclick = e => { const b = e.target.closest("button"); if (b) showCTab(b.dataset.sub); });
$("cTabbar").onclick = e => { const b = e.target.closest("button"); if (b) showCTab(b.dataset.tab); };
$("rTabbar").onclick = e => { const b = e.target.closest("button"); if (b) showRTab(b.dataset.tab); };
$("cEmptyBtn").onclick = () => $("cFile").click();
$("cFile").onchange = async e => {
  const files = [...e.target.files]; e.target.value = ""; if (!files.length) return;
  const fresh = !R.lib.length;
  await importToLib(files);
  const resetProj = fresh || !R.proj || R.proj.cells.every(c => !c.pid);
  if (resetProj && R.lib.length) { const r = recommendations()[0]; R.proj = r ? newProject(r.tpl, r.pids, r.anchor ? { anchor: r.anchor } : null) : newProject("g4", dedupe(R.lib).slice(0, 4).map(x => x.id)); R.sel = null; }
  if (window.afterLibLoad) { const f = window.afterLibLoad; window.afterLibLoad = null; f(); cDirty(); return; }
  if (state.mode === "collage") {
    if (fresh || R.proj.cells.every(c => !c.pid)) {
      const recs = recommendations(), r = recs[0];
      R.proj = r ? newProject(r.tpl, r.pids, r.anchor ? { anchor: r.anchor } : null) : newProject("g4", dedupe(R.lib).slice(0, 4).map(x => x.id));
      showCTab("tpl");
      if (r) say(`推薦「${r.title}」，下面還有其他組合`);
    } else { autoFill(); renderCTab(); }
    cDirty();
  } else if (state.mode === "reel") { rStop(); rDraw(0); renderRTab(); }
};
$("cAuto").onclick = autoFill;
$("cClearCell").onclick = () => { if (R.sel && R.sel.kind === "cell") { R.proj.cells[R.sel.i].pid = null; cDirty(); renderCTab(); } };
$("cText").oninput = () => {
  const st = R.sel && R.sel.kind === "stk" ? R.proj.stickers.find(s => s.id === R.sel.id && s.kind === "text") : null;
  if (st) { st.data.text = $("cText").value || " "; measureText(st); cDirty(); }
};
$("cTextAdd").onclick = () => {
  const st = R.sel && R.sel.kind === "stk" ? R.proj.stickers.find(s => s.id === R.sel.id && s.kind === "text") : null;
  if (st) { R.sel = null; $("cText").value = ""; cDirty(); renderCTab(); return; }
  const text = $("cText").value.trim() || "今天也很棒";
  addSticker("text", { text, style: R.textStyle || "hand", color: R.textColor || "#ffffff" });
  $("cText").value = text;
};
$("cText").onkeydown = e => { if (e.key === "Enter") $("cTextAdd").click(); };
$("cStyKeys").onclick = e => { const b = e.target.closest("button"); if (b) { R.styleKey = b.dataset.k; cRulers(); } };
new ResizeObserver(() => { if (state.mode === "collage") cDirty(); }).observe($("cFit"));
new ResizeObserver(() => { if (state.mode === "reel" && !rPlay) rDraw(0); }).observe($("rFit"));
setupCollageGestures();

// video controls
$("rPlay").onclick = rToggle;
$("rMusicBtn").onclick = () => $("rMusic").click();
$("rMusic").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  const rs = reelState(); rStop();
  say("分析音樂節拍中…", true);
  try {
    const info = await analyzeMusic(f);
    if (rs.music && rs.music.url) URL.revokeObjectURL(rs.music.url);
    const url = URL.createObjectURL(f), el2 = new Audio(url); el2.preload = "auto"; el2.playsInline = true;
    rs.music = { name: f.name, url, el: el2, bpm: info.bpm, offset: 0, duration: info.duration };
    rs.bpm = info.bpm; rs.phase = info.phase;
    say(`偵測到約 ${info.bpm} BPM，照片會跟著節拍切換`);
  } catch (err) { say("這個音樂檔讀不出來，換成 MP3 或 M4A 試試"); }
  renderRTab(); rDraw(0);
};
$("rMusicClear").onclick = () => { const rs = reelState(); rStop(); if (rs.music) URL.revokeObjectURL(rs.music.url); rs.music = null; renderRTab(); rDraw(0); };
$("rOffset").onchange = () => { const rs = reelState(); if (!rs.music) return; rs.music.offset = Math.max(0, Math.min(rs.music.duration - 1, parseFloat($("rOffset").value) || 0)); $("rOffset").value = Math.round(rs.music.offset); };
$("rTitle").oninput = () => { reelState().title = $("rTitle").value.trim(); if (!rPlay) rDraw(0); };
$("rSub").oninput = () => { reelState().sub = $("rSub").value.trim(); if (!rPlay) rDraw(reelPlan().slides.length > 1 ? reelPlan().slides[1].start + 0.3 : 0); };
$("rAuto").onclick = () => { const rs = reelState(); rs.pids = dedupe(R.lib).slice(0, 12).sort(byDate).map(x => x.id); rStop(); rDraw(0); renderRTab(); say("已挑出最清楚、不重複的照片"); };

setMode("home");
