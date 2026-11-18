// Minimal PNG decode/encode (8-bit RGB/RGBA/grey, non-interlaced) with Node's zlib only.
import zlib from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function decodePNG(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let p = 8, w = 0, h = 0, depth = 0, ctype = 0, inter = 0, palette = null, trns = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; inter = data[12]; }
    else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || inter) throw new Error(`unsupported PNG (depth ${depth}, interlace ${inter})`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(w * h * 4), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  let o = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[o++];
    for (let i = 0; i < stride; i++) {
      const x = raw[o++], a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const q = (y * w + x) * 4, s = x * ch;
      if (ctype === 6) { out[q] = cur[s]; out[q + 1] = cur[s + 1]; out[q + 2] = cur[s + 2]; out[q + 3] = cur[s + 3]; }
      else if (ctype === 2) { out[q] = cur[s]; out[q + 1] = cur[s + 1]; out[q + 2] = cur[s + 2]; out[q + 3] = 255; }
      else if (ctype === 0) { out[q] = out[q + 1] = out[q + 2] = cur[s]; out[q + 3] = 255; }
      else if (ctype === 4) { out[q] = out[q + 1] = out[q + 2] = cur[s]; out[q + 3] = cur[s + 1]; }
      else { const k = cur[s]; out[q] = palette[k * 3]; out[q + 1] = palette[k * 3 + 1]; out[q + 2] = palette[k * 3 + 2]; out[q + 3] = trns && k < trns.length ? trns[k] : 255; }
    }
    prev.set(cur);
  }
  return { w, h, data: out };
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { let c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, c]);
}
export function encodePNG({ w, h, data }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
