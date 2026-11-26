// ---------- Core grading ----------
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
// r,g,b are already gamma-adjusted here
function core(r, g, b, P, R, o) {
  let l = 0.299*r + 0.587*g + 0.114*b;
  const m = 1 - R * clamp01((l - 0.45) / 0.55);
  r *= m; g *= m; b *= m;
  const C = P.k;
  r = r + C*(r*r*(3-2*r) - r); g = g + C*(g*g*(3-2*g) - g); b = b + C*(b*b*(3-2*b) - b);
  const F = P.fade;
  r = r*(1-F) + F; g = g*(1-F) + F; b = b*(1-F) + F;
  l = 0.299*r + 0.587*g + 0.114*b;
  const s = (1-l)*(1-l), h = l*l;
  r += P.sh[0]*s + P.hi[0]*h; g += P.sh[1]*s + P.hi[1]*h; b += P.sh[2]*s + P.hi[2]*h;
  r = r*P.mul[0] + P.off[0]; g = g*P.mul[1] + P.off[1]; b = b*P.mul[2] + P.off[2];
  if (!P.bw) {
    l = 0.299*r + 0.587*g + 0.114*b;
    r = l + (r-l)*P.sat; g = l + (g-l)*P.sat; b = l + (b-l)*P.sat;
  }
  o[0] = clamp01(r); o[1] = clamp01(g); o[2] = clamp01(b);
}
function gradePx(r, g, b, P, G, R, o) {
  if (P.bw) { const v = r*P.bw[0] + g*P.bw[1] + b*P.bw[2]; r = g = b = v; }
  const L = P.lift; core(Math.pow(clamp01(r + L), G), Math.pow(clamp01(g + L), G), Math.pow(clamp01(b + L), G), P, R, o);
}

// Skin pixels in the central area stand in for the face.
function sampleSkin(data, W, H) {
  const out = [];
  const x0 = Math.floor(W*0.2), x1 = Math.floor(W*0.8), y0 = Math.floor(H*0.08), y1 = Math.floor(H*0.75);
  const step = Math.max(1, Math.floor(Math.sqrt(((x1-x0)*(y1-y0)) / 40000)));
  let total = 0;
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
    total++;
    const i = (y*W + x) * 4, R = data[i], G = data[i+1], B = data[i+2];
    const Y = 0.299*R + 0.587*G + 0.114*B, Cb = 128 - 0.1687*R - 0.3313*G + 0.5*B, Cr = 128 + 0.5*R - 0.4187*G - 0.0813*B;
    if (Y > 45 && Cr > 135 && Cr < 175 && Cb > 80 && Cb < 125 && R > G && R > B) out.push(R/255, G/255, B/255);
  }
  if (!(out.length / 3 > total * 0.004 && out.length >= 60)) return null;
  // a few hundred skin pixels are plenty for the brightness estimate and keep live dragging cheap
  const n = out.length / 3, keepN = 400;
  if (n <= keepN) return out;
  const stride = n / keepN, few = [];
  for (let i = 0; i < keepN; i++) { const j = Math.floor(i * stride) * 3; few.push(out[j], out[j+1], out[j+2]); }
  return few;
}
function faceLum(skin, P, G, R) {
  const o = [0,0,0]; let sum = 0; const n = skin.length / 3;
  for (let i = 0; i < skin.length; i += 3) { gradePx(skin[i], skin[i+1], skin[i+2], P, G, R, o); sum += 0.299*o[0] + 0.587*o[1] + 0.114*o[2]; }
  return sum / n;
}
function solveExposure(skin, P, auto, adj) {
  const target = P.face + adj * 0.015;
  if (P.none) return { G: Math.pow(0.97, adj), R: 0 };
  if (!auto || !skin) return { G: P.g * Math.pow(0.97, adj), R: 0.12 };
  if (faceLum(skin, P, P.g, 0) <= target) {
    let lo = 0.5, hi = P.g;
    for (let i = 0; i < 22; i++) { const mid = (lo+hi)/2; if (faceLum(skin, P, mid, 0) < target) hi = mid; else lo = mid; }
    return { G: (lo+hi)/2, R: 0 };
  }
  let lo = 0, hi = 0.5;
  for (let i = 0; i < 22; i++) { const mid = (lo+hi)/2; if (faceLum(skin, P, P.g, mid) > target) lo = mid; else hi = mid; }
  return { G: P.g, R: (lo+hi)/2 };
}

function makeRng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Full render of img into canvas (graded photo, no frame). Works in place to stay light on memory.
function renderTo(canvas, img, P, o) {
  const W = img.width, H = img.height;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  const G = o.exposure.G, R = o.exposure.R, st = o.strength, grainAmt = P.grain * o.grain, px = [0,0,0];
  const lut = new Float32Array(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.pow(clamp01(v/255 + P.lift), G);
  const bw = P.bw;
  const gradeAt = i => {
    if (bw) { const pv = Math.pow(clamp01((d[i]*bw[0] + d[i+1]*bw[1] + d[i+2]*bw[2]) / 255 + P.lift), G); core(pv, pv, pv, P, R, px); }
    else core(lut[d[i]], lut[d[i+1]], lut[d[i+2]], P, R, px);
  };
  // halation: blurred glow around bright lights, computed on a small grid
  let hal = null, hw = 0, hh = 0, sc = 8;
  if (P.hal > 0) {
    sc = Math.max(4, Math.round(Math.max(W, H) / 160));
    hw = Math.ceil(W / sc); hh = Math.ceil(H / sc);
    hal = new Float32Array(hw * hh);
    for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
      gradeAt((Math.min(H-1, y*sc) * W + Math.min(W-1, x*sc)) * 4);
      hal[y*hw + x] = clamp01((0.299*px[0] + 0.587*px[1] + 0.114*px[2] - 0.72) / 0.28);
    }
    const tmp = new Float32Array(hw * hh), r = 3;
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < hw) { s += hal[y*hw+xx]; c++; } } tmp[y*hw+x] = s / c; }
      for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < hh) { s += tmp[yy*hw+x]; c++; } } hal[y*hw+x] = s / c; }
    }
  }
  const rng = makeRng(1234567), cx = W/2, cy = H/2, chroma = bw ? 0 : grainAmt * 0.35 * st;
  for (let y = 0; y < H; y++) {
    const dy = (y - cy) / cy;
    for (let x = 0; x < W; x++) {
      const i = (y*W + x) * 4;
      const sr = d[i]/255, sg = d[i+1]/255, sb = d[i+2]/255;
      gradeAt(i);
      let r = px[0], g = px[1], b = px[2];
      if (hal) {
        const hx = Math.min(hw-1, x / sc), hy = Math.min(hh-1, y / sc);
        const x0 = Math.floor(hx), y0 = Math.floor(hy), x1 = Math.min(hw-1, x0+1), y1 = Math.min(hh-1, y0+1), fx = hx - x0, fy = hy - y0;
        const a = ((hal[y0*hw+x0]*(1-fx) + hal[y0*hw+x1]*fx)*(1-fy) + (hal[y1*hw+x0]*(1-fx) + hal[y1*hw+x1]*fx)*fy) * P.hal;
        r += a * 0.9; g += a * 0.22; b += a * 0.08;
      }
      if (P.vig > 0) {
        const dx = (x - cx) / cx, t = (Math.sqrt(dx*dx + dy*dy) - 0.55) / 0.85;
        if (t > 0) { const vf = 1 - P.vig * Math.pow(t > 1 ? 1 : t, 1.6); r *= vf; g *= vf; b *= vf; }
      }
      r = sr + (r - sr) * st; g = sg + (g - sg) * st; b = sb + (b - sb) * st;
      if (grainAmt > 0) {
        const n = (rng() + rng() + rng() - 1.5) * 2 * grainAmt * st;
        if (chroma) { r += n + (rng() - 0.5) * chroma; g += n + (rng() - 0.5) * chroma; b += n + (rng() - 0.5) * chroma; }
        else { r += n; g += n; b += n; }
      }
      d[i] = clamp01(r) * 255; d[i+1] = clamp01(g) * 255; d[i+2] = clamp01(b) * 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  drawStamp(ctx, W, H, o);
}

function drawStamp(ctx, W, H, o) {
  if (!(o.stamp && o.stampText)) return;
  ctx.save();
  const fs = Math.round(Math.min(W, H) * 0.05);
  ctx.font = `500 ${fs}px "DM Mono", ui-monospace, monospace`;
  ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
  const tx = W - W*0.05, ty = H - H*0.05;
  ctx.shadowColor = "rgba(255,110,20,.85)"; ctx.shadowBlur = fs * 0.35;
  ctx.fillStyle = "rgba(255,150,46,.95)";
  ctx.fillText(o.stampText, tx, ty);
  ctx.shadowBlur = 0;
  ctx.fillText(o.stampText, tx, ty);
  ctx.restore();
}

// Put the photo into its frame.
// resizing a canvas reallocates it, so only do it when the size really changes
function fitSize(target, w, h) {
  if (target.width !== w || target.height !== h) { target.width = w; target.height = h; }
  else target.getContext("2d").clearRect(0, 0, w, h);
}
function compose(target, src, frame, caption) {
  const w = src.width, h = src.height, ctx = target.getContext("2d");
  if (frame === "none") { fitSize(target, w, h); ctx.drawImage(src, 0, 0); return; }
  let side, top, bottom;
  if (frame === "white") { side = top = bottom = Math.round(Math.max(w, h) * 0.035); }
  else { side = top = Math.round(w * 0.065); bottom = Math.round(w * 0.26); }
  fitSize(target, w + side * 2, h + top + bottom);
  ctx.fillStyle = frame === "white" ? "#ffffff" : "#f6f3ea";
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.drawImage(src, side, top);
  if (frame !== "white") {
    // soft edge where the print sits in the paper
    ctx.strokeStyle = "rgba(40,30,20,.16)"; ctx.lineWidth = Math.max(1, w * 0.002);
    ctx.strokeRect(side, top, w, h);
    if (caption) {
      let fs = Math.round(bottom * 0.34);
      ctx.fillStyle = "#3a352f"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `500 ${fs}px "Caveat", "Noto Sans TC", cursive`;
      const maxW = w * 0.95, tw = ctx.measureText(caption).width;
      if (tw > maxW) { fs = Math.floor(fs * maxW / tw); ctx.font = `500 ${fs}px "Caveat", "Noto Sans TC", cursive`; }
      ctx.fillText(caption, target.width / 2, top + h + bottom * 0.5);
    }
  }
}

