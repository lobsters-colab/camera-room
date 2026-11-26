// ---------- GPU grading (WebGL): same recipe as core(), fast enough for live dragging ----------
// a factory, so the camera viewfinder can own a second context
function makeGPU(canvas) {
  canvas = canvas || document.createElement("canvas");
  let gl = null;
  try { gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false, alpha: false }); } catch (e) {}
  if (!gl) return null;
  const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const prec = hp && hp.precision > 0 ? "highp" : "mediump";
  const VS = "attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
  const FS = `precision ${prec} float;
varying vec2 vUv;
uniform sampler2D uSrc,uHal;
uniform float uG,uR,uK,uFade,uSat,uSt,uGrain,uChroma,uVig,uHalAmt,uBW,uSeed,uLift,uRot,uMirror,uFish,uPrism,uAspect;
uniform vec4 uCrop;
uniform vec3 uMul,uOff,uSh,uHi,uBWw;
const vec3 LW=vec3(.299,.587,.114);
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
// display uv (after crop, zoom, mirror and rotation fix) -> source texture uv
vec2 mapUv(vec2 d){
  vec2 p=uCrop.xy+d*uCrop.zw;
  if(uMirror>.5)p.x=1.-p.x;
  if(uRot>.5&&uRot<1.5)p=vec2(1.-p.y,p.x);
  else if(uRot>1.5&&uRot<2.5)p=vec2(1.-p.x,1.-p.y);
  else if(uRot>2.5)p=vec2(p.y,1.-p.x);
  return p;
}
vec3 samp(vec2 d){return texture2D(uSrc,mapUv(clamp(d,0.,1.))).rgb;}
void main(){
  vec2 d=vUv;float mask=1.;
  if(uFish>0.){
    vec2 c=d-.5;c.x*=uAspect;float r=length(c);
    float f=1.+uFish*(r*r*1.9-.5);
    c*=f;c.x/=uAspect;d=.5+c;
    float lim=.5*min(1.,uAspect);
    mask=1.-smoothstep(lim-.012,lim,r*(uAspect>1.?1.:1.));
  }
  vec3 o;
  if(uPrism>0.){
    vec2 s=vec2(.011*uPrism,0.);
    o=vec3(samp(d+s).r,samp(d).g,samp(d-s).b);
    vec3 gh=samp(d+vec2(.07,.03)*uPrism);
    o=max(o,mix(o,gh,.42*uPrism));
  } else o=samp(d);
  vec3 c=o;
  if(uBW>.5){float v=dot(c,uBWw);c=vec3(v);}
  c=pow(clamp(c+uLift,0.,1.),vec3(uG));
  float l=dot(c,LW);
  c*=1.-uR*clamp((l-.45)/.55,0.,1.);
  c=c+uK*(c*c*(3.-2.*c)-c);
  c=c*(1.-uFade)+uFade;
  l=dot(c,LW);
  c+=uSh*(1.-l)*(1.-l)+uHi*l*l;
  c=c*uMul+uOff;
  if(uBW<.5){l=dot(c,LW);c=l+(c-l)*uSat;}
  c=clamp(c,0.,1.);
  if(uHalAmt>0.){float a=texture2D(uHal,vUv).r*uHalAmt;c+=a*vec3(.9,.22,.08);}
  if(uVig>0.){vec2 d=(vUv-.5)*2.;float t=(length(d)-.55)/.85;if(t>0.)c*=1.-uVig*pow(min(t,1.),1.6);}
  c=o+(c-o)*uSt;
  if(uGrain>0.){vec2 q=gl_FragCoord.xy+uSeed;float n=(h12(q)+h12(q+17.3)+h12(q+41.7)-1.5)*2.*uGrain*uSt;
    vec3 ch=vec3(h12(q+3.1),h12(q+7.7),h12(q+11.9))-.5;c+=n+ch*uChroma;}
  gl_FragColor=vec4(clamp(c,0.,1.)*mask,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  } catch (e) { return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["uSrc","uHal","uG","uR","uK","uFade","uSat","uSt","uGrain","uChroma","uVig","uHalAmt","uBW","uSeed","uLift","uRot","uMirror","uFish","uPrism","uAspect","uCrop","uMul","uOff","uSh","uHi","uBWw"].forEach(n => U[n] = gl.getUniformLocation(prog, n));
  const mkTex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; };
  const texSrc = mkTex(), texHal = mkTex();
  gl.uniform1i(U.uSrc, 0); gl.uniform1i(U.uHal, 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE), maxVp = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  const maxSide = Math.min(maxTex, maxVp[0], maxVp[1]);
  let srcKey = null, srcVer = -1;

  function render(src, P, o, hal) {
    const isVid = typeof HTMLVideoElement !== "undefined" && src instanceof HTMLVideoElement;
    const sw = isVid ? src.videoWidth : src.width, sh = isVid ? src.videoHeight : src.height;
    if (!sw || !sh) return null;
    const W = o.outW || sw, H = o.outH || sh;
    if (sw > maxTex || sh > maxTex || W > maxSide || H > maxSide || gl.isContextLost()) return null;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texSrc);
    const ver = src.__ver || 0;
    if (isVid || srcKey !== src || srcVer !== ver) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); srcKey = src; srcVer = ver; }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texHal);
    if (hal) gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, hal.w, hal.h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, hal.data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([0]));
    const ex = o.exposure;
    gl.uniform1f(U.uG, ex.G); gl.uniform1f(U.uR, ex.R); gl.uniform1f(U.uK, P.k); gl.uniform1f(U.uFade, P.fade);
    gl.uniform1f(U.uSat, P.sat); gl.uniform1f(U.uSt, o.strength);
    const grain = P.grain * o.grain;
    gl.uniform1f(U.uGrain, grain); gl.uniform1f(U.uChroma, P.bw ? 0 : grain * 0.35 * o.strength);
    gl.uniform1f(U.uVig, P.vig); gl.uniform1f(U.uHalAmt, hal ? P.hal : 0);
    gl.uniform1f(U.uBW, P.bw ? 1 : 0); gl.uniform3fv(U.uBWw, P.bw || [0.299, 0.587, 0.114]);
    gl.uniform1f(U.uSeed, o.seed != null ? o.seed : 37.0); gl.uniform1f(U.uLift, P.lift);
    const v = o.view || {}, cr = v.crop || [0, 0, 1, 1];
    gl.uniform4f(U.uCrop, cr[0], cr[1], cr[2], cr[3]); gl.uniform1f(U.uRot, v.rot || 0); gl.uniform1f(U.uMirror, v.mirror ? 1 : 0);
    gl.uniform1f(U.uFish, P.fish || 0); gl.uniform1f(U.uPrism, P.prism || 0); gl.uniform1f(U.uAspect, W / H);
    gl.uniform3fv(U.uMul, P.mul); gl.uniform3fv(U.uOff, P.off); gl.uniform3fv(U.uSh, P.sh); gl.uniform3fv(U.uHi, P.hi);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return canvas;
  }
  // give back GPU memory after a big one-off render (iOS keeps canvas memory tight)
  function release() {
    canvas.width = canvas.height = 1; srcKey = null;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texSrc);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(3));
  }
  return { render, release, maxSide, canvas };
}
const GPU = makeGPU();

// Small blurred map of bright lights, for the CineStill-style glow.
function halMap(src, P, ex) {
  if (!(P.hal > 0)) return null;
  const s = Math.min(1, 160 / Math.max(src.width, src.height));
  const w = Math.max(2, Math.round(src.width * s)), h = Math.max(2, Math.round(src.height * s));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.drawImage(src, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data, m = new Float32Array(w * h), px = [0,0,0];
  for (let i = 0; i < w * h; i++) {
    gradePx(d[i*4]/255, d[i*4+1]/255, d[i*4+2]/255, P, ex.G, ex.R, px);
    m[i] = clamp01((0.299*px[0] + 0.587*px[1] + 0.114*px[2] - 0.72) / 0.28);
  }
  const tmp = new Float32Array(w * h), r = 3;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { a += m[y*w+xx]; n++; } } tmp[y*w+x] = a / n; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { a += tmp[yy*w+x]; n++; } } m[y*w+x] = a / n; }
  }
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = Math.min(255, Math.round(m[i] * 255));
  return { w, h, data };
}

// Grade src into the 2D canvas `out` (GPU when possible, CPU otherwise) and add the date stamp.
function renderGraded(out, src, P, o) {
  const g = GPU && GPU.render(src, P, o, halMap(src, P, o.exposure));
  if (!g) { renderTo(out, src, P, o); return out; }
  if (out.width !== src.width || out.height !== src.height) { out.width = src.width; out.height = src.height; }
  const ctx = out.getContext("2d");
  ctx.drawImage(g, 0, 0);
  drawStamp(ctx, out.width, out.height, o);
  return out;
}
