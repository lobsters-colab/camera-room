// ---------- Ruler slider: drag the scale, fling with inertia, snaps to the default, double-tap resets ----------
function makeRuler(host, opts) {
  const cv = document.createElement("canvas");
  host.appendChild(cv);
  host.tabIndex = 0; host.setAttribute("role", "slider");
  let min = opts.min, max = opts.max, def = opts.def, val = opts.value, ppu = 4;
  let drag = null, inertia = 0, lastTap = 0, snapped = false;
  const css = getComputedStyle(document.documentElement);
  const col = { tick: "rgba(244,241,236,.35)", major: "rgba(244,241,236,.75)", acc: css.getPropertyValue("--accent").trim() || "#ff9a2e" };
  function size() {
    const r = host.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
    if (!r.width) return false;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + "px"; cv.style.height = r.height + "px";
    // the whole range spans about 2.5 widths of the ruler: fine control, still reachable in a couple of swipes
    ppu = Math.max(2.5, (r.width * 2.5) / (max - min));
    return true;
  }
  function draw() {
    if (!cv.width && !size()) return;
    const ctx = cv.getContext("2d"), dpr = cv.width / (parseFloat(cv.style.width) || 1), W = cv.width, H = cv.height, cx = W / 2;
    ctx.clearRect(0, 0, W, H);
    const step = ppu * dpr < 4 ? 5 : 1;
    const from = Math.max(min, Math.floor((val - cx / (ppu * dpr)) / step) * step), to = Math.min(max, Math.ceil(val + cx / (ppu * dpr)));
    for (let u = from; u <= to; u += step) {
      const x = cx + (u - val) * ppu * dpr;
      const major = u % 25 === 0, isDef = u === def;
      ctx.fillStyle = isDef ? col.acc : major ? col.major : col.tick;
      const th = (isDef ? 0.62 : major ? 0.5 : 0.3) * H, tw = (isDef || major ? 1.6 : 1) * dpr;
      ctx.fillRect(Math.round(x - tw / 2), (H - th) / 2, tw, th);
    }
    // fill between default and current value
    const x0 = cx + (def - val) * ppu * dpr;
    ctx.fillStyle = "rgba(255,154,46,.22)";
    ctx.fillRect(Math.min(x0, cx), H * 0.44, Math.abs(cx - x0), H * 0.12);
    // centre needle
    ctx.fillStyle = col.acc;
    ctx.fillRect(Math.round(cx - 1.5 * dpr), H * 0.08, 3 * dpr, H * 0.84);
    host.setAttribute("aria-valuenow", String(Math.round(val)));
  }
  function emit(done) {
    const v = Math.round(val);
    opts.onInput(v, done);
  }
  function set(v, done, fromDrag) {
    v = Math.min(max, Math.max(min, v));
    // magnetic default: easy to land exactly on it
    if (fromDrag && Math.abs(v - def) < 2.2 * (4 / ppu) + 0.6) {
      if (!snapped) { snapped = true; try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} }
      v = def;
    } else if (fromDrag) snapped = false;
    val = v; draw(); emit(done);
  }
  host.addEventListener("pointerdown", e => {
    cancelAnimationFrame(inertia);
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
    drag = { x: e.clientX, v: val, t: performance.now(), lx: e.clientX, lt: performance.now(), vel: 0, moved: false };
  });
  host.addEventListener("pointermove", e => {
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - drag.x;
    if (Math.abs(dx) > 3) drag.moved = true;
    const dt = Math.max(1, now - drag.lt);
    drag.vel = 0.8 * ((e.clientX - drag.lx) / dt) + 0.2 * drag.vel;
    drag.lx = e.clientX; drag.lt = now;
    set(drag.v - dx / ppu, false, true);
  });
  const end = e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) {
      const now = performance.now();
      if (now - lastTap < 320) { lastTap = 0; set(def, true); return; }
      lastTap = now; emit(true); return;
    }
    let vel = -d.vel / ppu * 16; // units per frame
    if (Math.abs(vel) < 0.4 || performance.now() - d.lt > 80 || val === def) { emit(true); return; }
    const tick = () => {
      vel *= 0.9;
      const nv = val + vel;
      if (Math.abs(vel) < 0.15 || nv <= min || nv >= max) { set(nv, true); return; }
      set(nv, false); inertia = requestAnimationFrame(tick);
    };
    inertia = requestAnimationFrame(tick);
  };
  host.addEventListener("pointerup", end); host.addEventListener("pointercancel", end);
  host.addEventListener("keydown", e => {
    const k = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[e.key];
    if (k) { e.preventDefault(); set(val + k, true); }
    else if (e.key === "Home") { e.preventDefault(); set(min, true); }
    else if (e.key === "End") { e.preventDefault(); set(max, true); }
  });
  new ResizeObserver(() => { size(); draw(); }).observe(host);
  return {
    update(o) { min = o.min; max = o.max; def = o.def; val = o.value; host.setAttribute("aria-valuemin", min); host.setAttribute("aria-valuemax", max); size(); draw(); },
    setValue(v) { cancelAnimationFrame(inertia); val = v; draw(); },
  };
}
