// ---------- On-device AI: ONNX Runtime, person segmentation (YOLOv8n-seg) and inpainting (MI-GAN) ----------
// files are split to stay under the host's per-file size limit
const MODEL_URL = { detect: ["model/yolov8n-seg.wasm"], inpaint: ["model/migan-1.wasm", "model/migan-2.wasm"], cutout: ["model/u2netp.wasm"] };
const sessions = {};
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("script")); document.head.appendChild(s); });
}
async function getSession(kind) {
  if (sessions[kind]) return sessions[kind];
  if (!window.ort) await loadScript("ort/ort.min.js");
  ort.env.wasm.wasmPaths = new URL("ort/", location.href).href;
  ort.env.wasm.numThreads = 1;
  const parts = await Promise.all(MODEL_URL[kind].map(async u => {
    const r = await fetch(new URL(u, location.href).href);
    if (!r.ok) throw new Error("model " + r.status);
    return new Uint8Array(await r.arrayBuffer());
  }));
  const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0; for (const p of parts) { bytes.set(p, at); at += p.length; }
  sessions[kind] = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  return sessions[kind];
}

// People in the preview image, each with a mask on the model's 160x160 grid. Cached per photo.
async function detectPeople(photo) {
  if (photo.det) return photo.det;
  const session = await getSession("detect");
  const prev = photo.prev, S = 640, pw = prev.width, ph = prev.height, g = Math.min(S / pw, S / ph);
  const dw = Math.round(pw * g), dh = Math.round(ph * g), padX = (S - dw) / 2, padY = (S - dh) / 2;
  const c = document.createElement("canvas"); c.width = c.height = S;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.fillStyle = "rgb(114,114,114)"; cx.fillRect(0, 0, S, S);
  cx.drawImage(prev, padX, padY, dw, dh);
  const px = cx.getImageData(0, 0, S, S).data, input = new Float32Array(3 * S * S), A = S * S;
  for (let i = 0; i < A; i++) { input[i] = px[i*4] / 255; input[A + i] = px[i*4+1] / 255; input[2*A + i] = px[i*4+2] / 255; }
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, S, S]) });
  let det = null, proto = null;
  for (const name of session.outputNames) { const t = out[name]; if (t.dims.length === 4) proto = t; else det = t; }
  const n = det.dims[2], rows = det.dims[1], o = det.data, nm = proto.dims[1], mh = proto.dims[2], mw = proto.dims[3], pd = proto.data;
  const coefStart = rows - nm;
  let boxes = [];
  for (let i = 0; i < n; i++) {
    const score = o[4*n + i]; if (score < 0.28) continue; // class 0 = person
    const bx = o[i], by = o[n + i], bw = o[2*n + i], bh = o[3*n + i];
    boxes.push({ i, score, x0: bx - bw/2, y0: by - bh/2, x1: bx + bw/2, y1: by + bh/2 });
  }
  boxes.sort((a, b) => b.score - a.score);
  const keep = [];
  const iou = (a, b) => { const iw = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), ih = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); if (iw <= 0 || ih <= 0) return 0; const inter = iw * ih; return inter / ((a.x1-a.x0)*(a.y1-a.y0) + (b.x1-b.x0)*(b.y1-b.y0) - inter); };
  for (const b of boxes) if (!keep.some(k => iou(k, b) > 0.5)) keep.push(b);
  const sc = mw / S, people = [];
  for (const b of keep) {
    const m = new Uint8Array(mw * mh); let area = 0;
    const X0 = Math.max(0, Math.floor(b.x0 * sc)), X1 = Math.min(mw - 1, Math.ceil(b.x1 * sc)), Y0 = Math.max(0, Math.floor(b.y0 * sc)), Y1 = Math.min(mh - 1, Math.ceil(b.y1 * sc));
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      let v = 0; const p = y*mw + x;
      for (let k = 0; k < nm; k++) v += o[(coefStart + k)*n + b.i] * pd[k*mw*mh + p];
      if (v > 0) { m[p] = 1; area++; }
    }
    if (area > 0) people.push({ mask: m, area, score: b.score });
  }
  photo.det = { mw, mh, sc, padX, padY, dw, dh, people };
  return photo.det;
}
// Paint a set of grid masks onto the preview-sized mask canvas.
function paintGridMask(photo, det, bits) {
  const { mw, mh, sc, padX, padY, dw, dh } = det;
  const mc = document.createElement("canvas"); mc.width = mw; mc.height = mh;
  const mx = mc.getContext("2d"), id = mx.createImageData(mw, mh);
  for (let i = 0; i < bits.length; i++) if (bits[i]) { id.data[i*4] = 255; id.data[i*4+1] = 59; id.data[i*4+2] = 48; id.data[i*4+3] = 255; }
  mx.putImageData(id, 0, 0);
  const ctx = ensureMask(photo).getContext("2d");
  ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mc, padX * sc, padY * sc, dw * sc, dh * sc, 0, 0, photo.prev.width, photo.prev.height);
  ctx.restore();
}
// Mark the smaller people (not the main subject) for removal.
async function findPassersby(photo) {
  const det = await detectPeople(photo), people = det.people;
  if (!people.length) return { subjects: 0, passersby: 0 };
  const maxA = Math.max(...people.map(b => b.area));
  const subjects = people.filter(b => b.area >= maxA * 0.4), others = people.filter(b => b.area < maxA * 0.4);
  if (!others.length) return { subjects: subjects.length, passersby: 0 };
  const { mw, mh } = det;
  let sel = new Uint8Array(mw * mh), prot = new Uint8Array(mw * mh);
  for (const b of others) for (let i = 0; i < sel.length; i++) if (b.mask[i]) sel[i] = 1;
  for (const b of subjects) for (let i = 0; i < prot.length; i++) if (b.mask[i]) prot[i] = 1;
  sel = dilateMask(sel, mw, mh, 2); prot = dilateMask(prot, mw, mh, 1);
  for (let i = 0; i < sel.length; i++) if (prot[i]) sel[i] = 0;
  paintGridMask(photo, det, sel);
  return { subjects: subjects.length, passersby: others.length };
}
// Smart select: a person the stroke touches gets selected whole.
function snapStrokeToPeople(photo, det, stroke) {
  const { mw, mh, sc, padX, padY, dw, dh } = det;
  const g = document.createElement("canvas"); g.width = mw; g.height = mh;
  const gx = g.getContext("2d", { willReadFrequently: true });
  gx.drawImage(stroke, 0, 0, stroke.width, stroke.height, padX * sc, padY * sc, dw * sc, dh * sc);
  const sd = gx.getImageData(0, 0, mw, mh).data;
  let strokeArea = 0; for (let i = 0; i < mw * mh; i++) if (sd[i*4+3] > 40) strokeArea++;
  if (!strokeArea) return 0;
  let sel = new Uint8Array(mw * mh), hits = 0;
  for (const p of det.people) {
    let ov = 0; for (let i = 0; i < mw * mh; i++) if (p.mask[i] && sd[i*4+3] > 40) ov++;
    if (ov / p.area > 0.06 || ov / strokeArea > 0.35) { hits++; for (let i = 0; i < sel.length; i++) if (p.mask[i]) sel[i] = 1; }
  }
  if (!hits) return 0;
  sel = dilateMask(sel, mw, mh, 2);
  paintGridMask(photo, det, sel);
  return hits;
}

// ---------- AI erase with MI-GAN (512x512) ----------
async function eraseAI(full, maskCanvas) {
  const mw = maskCanvas.width, mh = maskCanvas.height;
  const md = maskCanvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, mw, mh).data;
  let x0 = mw, y0 = mh, x1 = -1, y1 = -1;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (md[(y*mw + x)*4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const session = await getSession("inpaint");
  const s = full.width / mw, FW = full.width, FH = full.height;
  // square crop around the hole with generous context, at least 512 px of the original when possible
  const bw = (x1 - x0 + 1) * s, bh = (y1 - y0 + 1) * s;
  let side = Math.round(Math.max(bw, bh) * 1.9 + 48 * s);
  side = Math.max(side, Math.min(512, Math.min(FW, FH)));
  side = Math.min(side, Math.max(FW, FH));
  const cw = Math.min(side, FW), ch = Math.min(side, FH);
  const mx = (x0 + x1 + 1) / 2 * s, my = (y0 + y1 + 1) / 2 * s;
  const cx = Math.round(Math.min(FW - cw, Math.max(0, mx - cw / 2))), cy = Math.round(Math.min(FH - ch, Math.max(0, my - ch / 2)));
  const fctx = full.getContext("2d", { willReadFrequently: true });
  const undo = { x: cx, y: cy, data: fctx.getImageData(cx, cy, cw, ch) };
  const N = 512;
  const work = document.createElement("canvas"); work.width = work.height = N;
  const wctx = work.getContext("2d", { willReadFrequently: true });
  wctx.imageSmoothingQuality = "high";
  wctx.drawImage(full, cx, cy, cw, ch, 0, 0, N, N);
  const img = wctx.getImageData(0, 0, N, N).data;
  const mk = document.createElement("canvas"); mk.width = mk.height = N;
  const mctx = mk.getContext("2d", { willReadFrequently: true });
  mctx.drawImage(maskCanvas, cx / s, cy / s, cw / s, ch / s, 0, 0, N, N);
  const ma = mctx.getImageData(0, 0, N, N).data;
  let hole = new Uint8Array(N * N);
  for (let i = 0; i < hole.length; i++) hole[i] = ma[i*4 + 3] > 30 ? 1 : 0;
  hole = dilateMask(hole, N, N, 5); // cover soft edges and halos
  const A = N * N, x = new Float32Array(4 * A);
  for (let i = 0; i < A; i++) {
    const h = hole[i];
    x[i] = 0.5 - h;
    x[A + i] = h ? 0 : img[i*4] / 127.5 - 1;
    x[2*A + i] = h ? 0 : img[i*4+1] / 127.5 - 1;
    x[3*A + i] = h ? 0 : img[i*4+2] / 127.5 - 1;
  }
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", x, [1, 4, N, N]) });
  const y = out[session.outputNames[0]].data;
  // match brightness/colour to the surroundings: compare model output with the real pixels in a ring around the hole
  const ring = dilateMask(hole, N, N, 8), off = [0, 0, 0]; let rn = 0;
  for (let i = 0; i < A; i++) if (ring[i] && !hole[i]) {
    off[0] += (y[i] * 127.5 + 127.5) - img[i*4]; off[1] += (y[A + i] * 127.5 + 127.5) - img[i*4+1]; off[2] += (y[2*A + i] * 127.5 + 127.5) - img[i*4+2]; rn++;
  }
  // the model's output outside the hole is not a reliable colour reference, so keep its own colours
  off[0] = off[1] = off[2] = 0;
  // blend only inside the (dilated) hole: solid in the core, fading to the real background over its outer band
  const notHole = new Uint8Array(A); for (let i = 0; i < A; i++) notHole[i] = hole[i] ? 0 : 1;
  const grown = dilateMask(notHole, N, N, 3), core = new Uint8Array(A);
  for (let i = 0; i < A; i++) core[i] = grown[i] ? 0 : 1;
  const alpha = new Float32Array(A), tmp = new Float32Array(A), br = 3;
  for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) { let a = 0, n = 0; for (let k = -br; k <= br; k++) { const q = xx + k; if (q >= 0 && q < N) { a += core[yy*N + q]; n++; } } tmp[yy*N + xx] = a / n; }
  for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) { let a = 0, n = 0; for (let k = -br; k <= br; k++) { const q = yy + k; if (q >= 0 && q < N) { a += tmp[q*N + xx]; n++; } } alpha[yy*N + xx] = a / n; }
  const res = wctx.createImageData(N, N), rd = res.data;
  for (let i = 0; i < A; i++) {
    rd[i*4] = y[i] * 127.5 + 127.5 - off[0]; rd[i*4+1] = y[A + i] * 127.5 + 127.5 - off[1]; rd[i*4+2] = y[2*A + i] * 127.5 + 127.5 - off[2];
    rd[i*4+3] = hole[i] ? Math.round(Math.max(core[i] ? 1 : 0, Math.min(1, alpha[i] * 1.15)) * 255) : 0;
  }
  wctx.putImageData(res, 0, 0);
  // scale back; when the crop was enlarged, add the photo's own grain so the patch is not smoother than the rest
  const up = document.createElement("canvas"); up.width = cw; up.height = ch;
  const uctx = up.getContext("2d", { willReadFrequently: true });
  uctx.imageSmoothingQuality = "high";
  uctx.drawImage(work, 0, 0, N, N, 0, 0, cw, ch);
  const scale = Math.max(cw, ch) / N;
  if (scale > 1.25) {
    const o = undo.data.data; let sum = 0, n = 0; const st = Math.max(1, Math.floor(Math.sqrt(cw * ch / 20000)));
    for (let yy = 0; yy < ch; yy += st) for (let xx = 0; xx + 1 < cw; xx += st) { const i = (yy*cw + xx) * 4; sum += Math.abs((o[i] + o[i+1] + o[i+2]) - (o[i+4] + o[i+5] + o[i+6])) / 3; n++; }
    const sigma = Math.min(8, (n ? sum / n : 0) * 0.5);
    if (sigma > 0.4) {
      const ud = uctx.getImageData(0, 0, cw, ch), u = ud.data;
      for (let i = 0; i < u.length; i += 4) {
        if (!u[i+3]) continue;
        const nz = (Math.random() + Math.random() + Math.random() - 1.5) * 2 * sigma * (u[i+3] / 255);
        u[i] += nz; u[i+1] += nz; u[i+2] += nz;
      }
      uctx.putImageData(ud, 0, 0);
    }
  }
  fctx.drawImage(up, cx, cy);
  full.__ver = (full.__ver || 0) + 1;
  return undo;
}
