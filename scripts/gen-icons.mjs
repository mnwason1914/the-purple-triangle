// PWA icons: a purple triangle over a lit window at night. Dependency-free PNG encoder.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return (b) => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(CRC(td)); return Buffer.concat([l, td, c]); };
function png(size, pad) {
  const P = 32, cell = size / P; const raw = Buffer.alloc((size * 3 + 1) * size);
  const at = (gx, gy) => {
    const inner = (v) => (v - P / 2) / (1 - pad * 2) + P / 2; const x = inner(gx), y = inner(gy);
    let c = [12, 10, 16];
    if (x >= 9 && x < 23 && y >= 5 && y < 21) c = (Math.floor(x) === 16 || Math.floor(y) === 12) ? [40, 28, 22] : [232, 184, 96];
    // triangle pointing down
    const ty = y - 14, half = (26 - y) * 0.62;
    if (y >= 12 && y < 26 && Math.abs(x - 16) <= half) c = (Math.abs(x - 16) > half - 1.2 || y < 13.2) ? [70, 40, 100] : [138, 90, 180];
    void ty;
    return c;
  };
  for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0; for (let x = 0; x < size; x++) { const c = at(Math.floor(x / cell), Math.floor(y / cell)); const i = y * (size * 3 + 1) + 1 + x * 3; raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2]; } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(size, 0); ih.writeUInt32BE(size, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, 0.06));
writeFileSync('public/icons/icon-512.png', png(512, 0.06));
writeFileSync('public/icons/maskable-512.png', png(512, 0.18));
writeFileSync('public/icons/apple-touch-icon.png', png(180, 0.06));
console.log('icons ok');
