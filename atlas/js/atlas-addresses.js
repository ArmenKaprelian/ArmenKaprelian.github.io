// Dedicated worker for address-file inflation, lossless restoration and v4 validation.
'use strict';
let FM, IND_CLASS, YEAR_BREAKS;
const inputs = new Map(), twinNotes = {};
function restoreAddress(buf, key, manifest) {
  const src = new Uint8Array(buf);
  if (src.length < 4 || String.fromCharCode(...src.subarray(0, 4)) !== 'ATP1') return buf;
  const header = new DataView(buf, 4, 32);
  const n = header.getUint32(4, true), u = manifest.coords.addresses;
  const coords = key === 'coords';
  const magic = String.fromCharCode(...src.subarray(4,8));
  if (header.getUint16(18, true) !== 4 || (coords
      ? magic !== 'FRC1' || n !== u
      : magic !== 'FRM1' || header.getUint16(16, true) !== +key ||
        header.getUint32(8, true) !== u || n !== manifest.by_year[key].addresses)) {
    throw new Error('invalid packed address header');
  }
  const start = coords ? 32 : 32 + 4 * Math.ceil(u / 32);
  const out = new Uint8Array(start + n * (coords ? 8 : 25));
  let p = 4;
  function take(size) {
    if (size > src.length - p) throw new Error('incomplete packed address file');
    const part = src.subarray(p, p + size); p += size; return part;
  }
  function planes(dst, count, width) {
    for (let plane = 0; plane < width; plane++) {
      const bytes = take(count);
      for (let i = 0; i < count; i++) out[dst + i * width + plane] = bytes[i];
    }
  }
  out.set(take(start));
  if (coords) {
    planes(start, n, 4); planes(start + 4*n, n, 4);
  } else {
    planes(start, n, 2); planes(start + 2*n, n, 2); planes(start + 4*n, n, 2);
    const totals = new Uint16Array(out.buffer, start, n), filed = new Uint16Array(out.buffer, start + 2*n, n);
    out.set(take(n), start + 8*n);
    const counts = take(n);
    let present = 0;
    for (let i = 0; i < n; i++) {
      if (counts[i] > 8 || totals[i] === 65535 || filed[i] > totals[i]+1) throw new Error('invalid packed address count');
      totals[i]++; filed[i] = totals[i] - filed[i];
      if (counts[i]) present++;
    }
    const low = take(present), high = take(present);
    const rv = new Uint16Array(out.buffer, start + 6*n, n);
    for (let i = 0, j = 0; i < n; i++) if (counts[i]) { rv[i] = low[j] | high[j]<<8; j++; }
    for (let rank = 0; rank < 8; rank++) {
      const dst = start + (9 + 2*rank)*n;
      for (let i = 0; i < n; i++) out[dst+i] = counts[i] > rank ? src[p++] : 255;
    }
    for (let rank = 0; rank < 8; rank++) {
      const dst = start + (10 + 2*rank)*n;
      for (let i = 0; i < n; i++) {
        if (counts[i] > rank) out[dst+i] = counts[i] === 1 ? 100 : src[p++];
      }
    }
  }
  if (p !== src.length) throw new Error('invalid packed address file length');
  return out.buffer;
}

async function fetchInflated(path, key) {
  let buf = inputs.get(key);
  inputs.delete(key);
  const bytes = new Uint8Array(buf);
  if (bytes[0] === 31 && bytes[1] === 139) {
    twinNotes[key] = gzipComment(bytes);
    buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  return restoreAddress(buf, key, FM);
}
  function gzipComment(u8) { const flg = u8[3]; let p = 10; if (flg & 4) p += 2 + (u8[p] | (u8[p + 1] << 8)); if (flg & 8) { while (u8[p]) p++; p++; } if (!(flg & 16)) return ''; let s = ''; while (u8[p]) s += String.fromCharCode(u8[p++]); return s; }
  const magicOf = dv => String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  // Version 4 (round 31): every address of every year once, fetched with the first year (M9's firms-coords.bin.gz). x comes as the
  // step from the previous address, and y as the step from the previous address where x repeats, else y itself.
  let coordsP = null;
  const loadCoords = () => coordsP || (coordsP = fetchInflated(FM.coords.file, 'coords').then(buf => {
    const dv = new DataView(buf), magic = magicOf(dv), U = dv.getUint32(4, true), ver = dv.getUint16(18, true);
    if (magic !== 'FRC1' || ver !== 4 || U !== FM.coords.addresses || buf.byteLength !== 32 + 8 * U) throw new Error(`bad coordinates file (${magic} v${ver}, ${U} addresses, ${buf.byteLength} bytes)`);
    const dx = new Int32Array(buf, 32, U), dy = new Int32Array(buf, 32 + 4 * U, U), X = new Int32Array(U), Y = new Int32Array(U);
    let x = 0, y = 0; for (let i = 0; i < U; i++) { if (dx[i]) { x += dx[i]; y = dy[i]; } else y += dy[i]; X[i] = x; Y[i] = y; }
    return { U, X, Y };
  }).catch(e => { coordsP = null; throw e; }));
  async function loadYear(y) {
    const [C, buf] = await Promise.all([loadCoords(), fetchInflated(FM.files[y], y)]);
    const dv = new DataView(buf), magic = magicOf(dv), n = dv.getUint32(4, true), U = dv.getUint32(8, true), year = dv.getUint16(16, true), ver = dv.getUint16(18, true), exp = FM.by_year[y];
    const MK = FM.layout.mix_rows || 8, RB = FM.layout.record_bytes || (9 + 2 * MK), W = (C.U + 31) >>> 5, o = 32 + 4 * W;   // a bitmap over the coordinates, then n, a, f, rv, cls and MK (ind, ish) pairs by share descending
    if (magic !== 'FRM1' || ver !== 4 || year !== +y || U !== C.U || n !== exp.addresses || buf.byteLength !== o + RB * n) throw new Error(`bad file (${magic} v${ver} ${year}, ${n} records, ${buf.byteLength} bytes)`);
    const bits = new Uint32Array(buf, 32, W), x = new Int32Array(n), yv = new Int32Array(n); let j = 0;
    for (let w = 0; w < W; w++) for (let b = bits[w]; b; ) { const t = b & -b, i = (w << 5) + 31 - Math.clz32(t); if (j < n) { x[j] = C.X[i]; yv[j] = C.Y[i]; } j++; b ^= t; }
    if (j !== n) throw new Error(`the bitmap marks ${j} addresses, the header ${n}`);
    const nn = new Uint16Array(buf, o, n), a = new Uint16Array(buf, o + 2 * n, n), f = new Uint16Array(buf, o + 4 * n, n), rv = new Uint16Array(buf, o + 6 * n, n), cls = new Uint8Array(buf, o + 8 * n, n);
    const mixInd = [], mixSh = []; for (let k = 0; k < MK; k++) { mixInd.push(new Uint8Array(buf, o + (9 + 2 * k) * n, n)); mixSh.push(new Uint8Array(buf, o + (10 + 2 * k) * n, n)); }
    const ind = mixInd[0], ish = mixSh[0], indCls = new Uint8Array(n), byInd = new Uint32Array(10);
    const share = new Uint8Array(n); let sumN = 0;
    for (let i = 0; i < n; i++) { sumN += nn[i]; const sh = 100 * a[i] / nn[i]; let c = 0; while (c < YEAR_BREAKS.length && sh >= YEAR_BREAKS[c]) c++; share[i] = c; const ic = IND_CLASS[ind[i]]; indCls[i] = ic; byInd[ic]++; }
    if (sumN !== exp.firms) throw new Error(`firms ${sumN} differ from the manifest's ${exp.firms}`);
    if (exp.by_ind && exp.by_ind.some((v, i) => v !== byInd[i])) throw new Error(`addresses by industry class differ from the manifest's for ${y}`);
    return { year: +y, n, x, y: yv, nn, a, f, rv, cls, share, ind, ish, indCls, mixInd, mixSh, mk: MK };
  }

self.onmessage = async ({data}) => {
  if (data.init) {
    ({FM, IND_CLASS, YEAR_BREAKS} = data);
    return;
  }
  const {id, key, bytes} = data;
  try {
    inputs.set(key, bytes);
    if (key === 'coords') {
      await loadCoords();
      self.postMessage({id, note:twinNotes[key]});
    } else {
      const result = await loadYear(key);
      const buffers = new Set();
      for (const value of Object.values(result)) {
        if (ArrayBuffer.isView(value)) buffers.add(value.buffer);
      }
      self.postMessage({id, result, note:twinNotes[key]}, [...buffers]);
    }
  } catch (error) {
    self.postMessage({id, error:error.message});
  }
};
