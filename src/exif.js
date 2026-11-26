// Shooting date from the JPEG's EXIF, if present.
function exifDate(buf) {
  try {
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xFFD8) return null;
    let p = 2;
    while (p + 4 < v.byteLength) {
      const marker = v.getUint16(p), len = v.getUint16(p + 2);
      if (marker === 0xFFE1 && v.getUint32(p + 4) === 0x45786966) {
        const t = p + 10, le = v.getUint16(t) === 0x4949;
        const u16 = o => v.getUint16(o, le), u32 = o => v.getUint32(o, le);
        const find = (ifd, tag) => { const n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i*12; if (u16(e) === tag) return e; } return 0; };
        const str = e => { let s = ""; const o = t + u32(e + 8); for (let i = 0; i < 19; i++) s += String.fromCharCode(v.getUint8(o + i)); return s; };
        const ifd0 = t + u32(t + 4);
        let e = 0; const sub = find(ifd0, 0x8769);
        if (sub) { const x = t + u32(sub + 8); e = find(x, 0x9003) || find(x, 0x9004); }
        if (!e) e = find(ifd0, 0x0132);
        if (!e) return null;
        const m = str(e).match(/^(\d{4}):(\d{2}):(\d{2})/);
        return m && +m[1] > 1990 ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
      }
      if ((marker & 0xFF00) !== 0xFF00 || marker === 0xFFDA) break;
      p += 2 + len;
    }
  } catch (e) {}
  return null;
}

function makeSample() {
  const c = document.createElement("canvas"); c.width = 1200; c.height = 900;
  const x = c.getContext("2d");
  const sky = x.createLinearGradient(0, 0, 0, 900);
  sky.addColorStop(0, "#22304a"); sky.addColorStop(0.55, "#c9785a"); sky.addColorStop(0.75, "#e8b07a"); sky.addColorStop(1, "#3a2f2a");
  x.fillStyle = sky; x.fillRect(0, 0, 1200, 900);
  x.fillStyle = "#2b3a2e"; x.fillRect(0, 640, 1200, 260);
  x.fillStyle = "#1c2420"; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(60 + i*140, 640, 90, 70 + (i%3)*20, 0, Math.PI, 0); x.fill(); }
  [[180,420],[1010,380],[880,470]].forEach(([lx,ly]) => { const g = x.createRadialGradient(lx,ly,0,lx,ly,22); g.addColorStop(0,"#fffbe8"); g.addColorStop(1,"rgba(255,240,200,0)"); x.fillStyle = g; x.beginPath(); x.arc(lx,ly,22,0,7); x.fill(); });
  x.fillStyle = "#3b4d6b"; x.beginPath(); x.moveTo(470, 900); x.quadraticCurveTo(600, 560, 730, 900); x.fill();
  x.fillStyle = "#1d1714"; x.beginPath(); x.ellipse(600, 440, 92, 104, 0, 0, 7); x.fill();
  const skin = x.createRadialGradient(585, 480, 10, 600, 500, 95); skin.addColorStop(0, "#f2c3a3"); skin.addColorStop(1, "#c98a68");
  x.fillStyle = skin; x.beginPath(); x.ellipse(600, 505, 80, 95, 0, 0, 7); x.fill();
  x.fillStyle = "#2a1c17"; x.beginPath(); x.ellipse(570, 495, 7, 5, 0, 0, 7); x.ellipse(630, 495, 7, 5, 0, 0, 7); x.fill();
  x.fillStyle = "#b5605a"; x.beginPath(); x.ellipse(600, 555, 18, 6, 0, 0, 7); x.fill();
  return c;
}
