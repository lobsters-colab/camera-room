// ---------- Content-aware fill (PatchMatch, coarse to fine) ----------
// d: RGBA bytes, m: 1 where pixels must be replaced. Fills d in place.
function inpaintRGBA(d, m, w, h) {
  const levels = [{ d, m, w, h }];
  while (levels.length < 6) {
    const L = levels[levels.length - 1];
    if (Math.min(L.w, L.h) < 40) break;
    const w2 = L.w >> 1, h2 = L.h >> 1, d2 = new Uint8ClampedArray(w2 * h2 * 4), m2 = new Uint8Array(w2 * h2);
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
      const a = (2*y*L.w + 2*x), b = a + 1, c = a + L.w, e = c + 1, o = (y*w2 + x) * 4;
      for (let k = 0; k < 3; k++) d2[o+k] = (L.d[a*4+k] + L.d[b*4+k] + L.d[c*4+k] + L.d[e*4+k] + 2) >> 2;
      d2[o+3] = 255;
      m2[y*w2 + x] = L.m[a] | L.m[b] | L.m[c] | L.m[e];
    }
    levels.push({ d: d2, m: m2, w: w2, h: h2 });
  }
  // coarsest level: grow colours inward from the rim
  const C = levels[levels.length - 1];
  {
    const known = new Uint8Array(C.w * C.h);
    for (let i = 0; i < known.length; i++) known[i] = C.m[i] ? 0 : 1;
    for (let guard = 0; guard < C.w + C.h; guard++) {
      const upd = [];
      for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) {
        const i = y*C.w + x; if (known[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= C.w || yy >= C.h) continue;
          const j = yy*C.w + xx; if (!known[j]) continue;
          r += C.d[j*4]; g += C.d[j*4+1]; b += C.d[j*4+2]; n++;
        }
        if (n) upd.push(i, r/n, g/n, b/n);
      }
      if (!upd.length) break;
      for (let u = 0; u < upd.length; u += 4) { const i = upd[u]; C.d[i*4] = upd[u+1]; C.d[i*4+1] = upd[u+2]; C.d[i*4+2] = upd[u+3]; known[i] = 1; }
    }
  }
  let prev = null;
  for (let li = levels.length - 1; li >= 0; li--) {
    const L = levels[li], W = L.w, H = L.h, D = L.d, M = L.m, N = W * H;
    const r = Math.min(3, Math.max(1, (Math.min(W, H) - 1) >> 2));
    if (prev) {
      // start from the coarser result
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y*W + x; if (!M[i]) continue;
        const j = (Math.min(prev.h - 1, y >> 1) * prev.w + Math.min(prev.w - 1, x >> 1)) * 4;
        D[i*4] = prev.d[j]; D[i*4+1] = prev.d[j+1]; D[i*4+2] = prev.d[j+2];
      }
    }
    // dilate the hole by the patch radius: any patch touching it is a target, the rest are sources
    const dil = new Uint8Array(N), tmp = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) { const xx = x + k; if (xx >= 0 && xx < W) v = M[y*W + xx]; } tmp[y*W + x] = v; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) { const yy = y + k; if (yy >= 0 && yy < H) v = tmp[yy*W + x]; } dil[y*W + x] = v; }
    const targets = [], sources = [], srcOK = new Uint8Array(N);
    for (let y = r; y < H - r; y++) for (let x = r; x < W - r; x++) { const i = y*W + x; if (dil[i]) targets.push(i); else { srcOK[i] = 1; sources.push(i); } }
    const nn = new Int32Array(N).fill(-1), nd = new Float32Array(N);
    if (!sources.length || !targets.length) { prev = { d: D, w: W, h: H, nn: null }; continue; }
    const dist = (p, q, best) => {
      const px = p % W, py = (p - px) / W, qx = q % W, qy = (q - qx) / W;
      let s = 0;
      for (let dy = -r; dy <= r; dy++) {
        let a = ((py + dy) * W + px - r) * 4, b = ((qy + dy) * W + qx - r) * 4;
        for (let dx = -r; dx <= r; dx++, a += 4, b += 4) {
          const e0 = D[a] - D[b], e1 = D[a+1] - D[b+1], e2 = D[a+2] - D[b+2];
          s += e0*e0 + e1*e1 + e2*e2;
        }
        if (s >= best) return s;
      }
      return s;
    };
    for (const p of targets) {
      let q = -1;
      if (prev && prev.nn) {
        const x = p % W, y = (p - x) / W, cq = prev.nn[Math.min(prev.h - 1, y >> 1) * prev.w + Math.min(prev.w - 1, x >> 1)];
        if (cq >= 0) {
          const cx = cq % prev.w, cy = (cq - cx) / prev.w, qx = 2*cx + (x & 1), qy = 2*cy + (y & 1);
          if (qx < W && qy < H && srcOK[qy*W + qx]) q = qy*W + qx;
        }
      }
      nn[p] = q >= 0 ? q : sources[(Math.random() * sources.length) | 0];
    }
    const em = li === 0 ? 2 : li === levels.length - 1 ? 6 : 3;
    const acc = new Float32Array(N * 3), wt = new Float32Array(N), norm = (2*r + 1) * (2*r + 1) * 3 * 150;
    for (let it = 0; it < em; it++) {
      for (const p of targets) nd[p] = dist(p, nn[p], Infinity);
      for (let pm = 0; pm < 3; pm++) {
        const fwd = pm % 2 === 0, step = fwd ? -1 : 1;
        for (let t = fwd ? 0 : targets.length - 1; t >= 0 && t < targets.length; t += fwd ? 1 : -1) {
          const p = targets[t], x = p % W;
          let bq = nn[p], bd = nd[p];
          // propagation from the neighbours already visited in this sweep
          const nx = p + step;
          if (x + step >= 0 && x + step < W && nn[nx] >= 0) { const c = nn[nx] - step; if (c >= 0 && c < N && srcOK[c]) { const dd = dist(p, c, bd); if (dd < bd) { bd = dd; bq = c; } } }
          const ny = p + step * W;
          if (ny >= 0 && ny < N && nn[ny] >= 0) { const c = nn[ny] - step * W; if (c >= 0 && c < N && srcOK[c]) { const dd = dist(p, c, bd); if (dd < bd) { bd = dd; bq = c; } } }
          // random search around the current best, halving the radius
          for (let R = Math.max(W, H); R >= 1; R >>= 1) {
            const bx = bq % W, by = (bq - bx) / W;
            const cx = bx + (((Math.random() * 2 - 1) * R) | 0), cy = by + (((Math.random() * 2 - 1) * R) | 0);
            if (cx < r || cy < r || cx >= W - r || cy >= H - r) continue;
            const c = cy*W + cx; if (!srcOK[c]) continue;
            const dd = dist(p, c, bd); if (dd < bd) { bd = dd; bq = c; }
          }
          nn[p] = bq; nd[p] = bd;
        }
      }
      // vote: every patch paints its matched source onto the hole pixels it covers
      acc.fill(0); wt.fill(0);
      for (const p of targets) {
        const q = nn[p], wgt = 1 / (1 + nd[p] / norm);
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const tp = p + dy*W + dx; if (!M[tp]) continue;
          const sq = (q + dy*W + dx) * 4;
          acc[tp*3] += D[sq] * wgt; acc[tp*3+1] += D[sq+1] * wgt; acc[tp*3+2] += D[sq+2] * wgt; wt[tp] += wgt;
        }
      }
      const last = li === 0 && it === em - 1;
      for (let i = 0; i < N; i++) {
        if (!M[i] || !wt[i]) continue;
        let R0 = acc[i*3] / wt[i], G0 = acc[i*3+1] / wt[i], B0 = acc[i*3+2] / wt[i];
        if (last && nn[i] >= 0) { const s = nn[i] * 4; R0 = (R0 + D[s]) / 2; G0 = (G0 + D[s+1]) / 2; B0 = (B0 + D[s+2]) / 2; } // keep some texture
        D[i*4] = R0; D[i*4+1] = G0; D[i*4+2] = B0;
      }
    }
    prev = { d: D, w: W, h: H, nn };
  }
}

function dilateMask(m, w, h, r) {
  const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) { const xx = x + k; if (xx >= 0 && xx < w) v = m[y*w + xx]; } t[y*w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let k = -r; k <= r && !v; k++) { const yy = y + k; if (yy >= 0 && yy < h) v = t[yy*w + x]; } o[y*w + x] = v; }
  return o;
}

const WORK_MAX = 448;
// Remove whatever is painted in maskCanvas (same size as the preview) from the full-resolution canvas.
// Returns an undo record, or null when nothing is painted.
function eraseFromPhoto(full, maskCanvas) {
  const mw = maskCanvas.width, mh = maskCanvas.height;
  const md = maskCanvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, mw, mh).data;
  let x0 = mw, y0 = mh, x1 = -1, y1 = -1;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (md[(y*mw + x)*4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const s = full.width / mw;
  const margin = Math.max(24, Math.round(Math.max(x1 - x0, y1 - y0) * 0.9));
  x0 = Math.max(0, x0 - margin); y0 = Math.max(0, y0 - margin); x1 = Math.min(mw - 1, x1 + margin); y1 = Math.min(mh - 1, y1 + margin);
  const cx = Math.floor(x0 * s), cy = Math.floor(y0 * s);
  const cw = Math.min(full.width - cx, Math.ceil((x1 - x0 + 1) * s)), ch = Math.min(full.height - cy, Math.ceil((y1 - y0 + 1) * s));
  const ws = Math.min(1, WORK_MAX / Math.max(cw, ch)), ww = Math.max(8, Math.round(cw * ws)), wh = Math.max(8, Math.round(ch * ws));
  const fctx = full.getContext("2d", { willReadFrequently: true });
  const undo = { x: cx, y: cy, data: fctx.getImageData(cx, cy, cw, ch) };

  const work = document.createElement("canvas"); work.width = ww; work.height = wh;
  const wctx = work.getContext("2d", { willReadFrequently: true });
  wctx.imageSmoothingQuality = "high";
  wctx.drawImage(full, cx, cy, cw, ch, 0, 0, ww, wh);
  const img = wctx.getImageData(0, 0, ww, wh);
  const mk = document.createElement("canvas"); mk.width = ww; mk.height = wh;
  const mctx = mk.getContext("2d", { willReadFrequently: true });
  mctx.drawImage(maskCanvas, cx / s, cy / s, cw / s, ch / s, 0, 0, ww, wh);
  const ma = mctx.getImageData(0, 0, ww, wh).data;
  let hole = new Uint8Array(ww * wh);
  for (let i = 0; i < hole.length; i++) hole[i] = ma[i*4 + 3] > 40 ? 1 : 0;
  hole = dilateMask(hole, ww, wh, Math.max(2, Math.round(Math.max(ww, wh) * 0.008)));
  inpaintRGBA(img.data, hole, ww, wh);

  // soft edge so the patch blends into the photo
  const soft = dilateMask(hole, ww, wh, 2), alpha = new Float32Array(ww * wh), tmp = new Float32Array(ww * wh), br = 2;
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { let a = 0, n = 0; for (let k = -br; k <= br; k++) { const xx = x + k; if (xx >= 0 && xx < ww) { a += soft[y*ww + xx]; n++; } } tmp[y*ww + x] = a / n; }
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { let a = 0, n = 0; for (let k = -br; k <= br; k++) { const yy = y + k; if (yy >= 0 && yy < wh) { a += tmp[yy*ww + x]; n++; } } alpha[y*ww + x] = a / n; }
  for (let i = 0; i < alpha.length; i++) img.data[i*4 + 3] = hole[i] ? 255 : Math.round(alpha[i] * 255);
  wctx.putImageData(img, 0, 0);

  // match the photo's own noise so an enlarged patch does not look too smooth
  let sigma = 0;
  if (ws < 0.999) {
    const o = undo.data.data; let sum = 0, n = 0; const stepPx = Math.max(1, Math.floor(Math.sqrt(cw * ch / 20000)));
    for (let y = 0; y < ch; y += stepPx) for (let x = 0; x + 1 < cw; x += stepPx) { const i = (y*cw + x) * 4; sum += Math.abs((o[i] + o[i+1] + o[i+2]) - (o[i+4] + o[i+5] + o[i+6])) / 3; n++; }
    sigma = Math.min(7, (n ? sum / n : 0) * 0.55);
  }
  fctx.imageSmoothingQuality = "high";
  if (sigma > 0.4) {
    const up = document.createElement("canvas"); up.width = cw; up.height = ch;
    const uctx = up.getContext("2d", { willReadFrequently: true });
    uctx.imageSmoothingQuality = "high";
    uctx.drawImage(work, 0, 0, ww, wh, 0, 0, cw, ch);
    const ud = uctx.getImageData(0, 0, cw, ch), u = ud.data;
    for (let i = 0; i < u.length; i += 4) {
      if (!u[i+3]) continue;
      const nz = (Math.random() + Math.random() + Math.random() - 1.5) * 2 * sigma;
      u[i] += nz; u[i+1] += nz; u[i+2] += nz;
    }
    uctx.putImageData(ud, 0, 0);
    fctx.drawImage(up, cx, cy);
  } else {
    fctx.drawImage(work, 0, 0, ww, wh, cx, cy, cw, ch);
  }
  full.__ver = (full.__ver || 0) + 1;
  return undo;
}
