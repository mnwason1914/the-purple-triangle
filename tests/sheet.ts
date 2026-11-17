// Renders a contact sheet of character art to PNG (run in Node) for visual QA.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { paintHuman, paintPortrait, POSES, EXPRESSIONS } from '../src/characters/painter';
import { LOOKS, PORTRAITS } from '../src/characters/cast';
import type { Grid } from '../src/engine/grid';

const SCALE = 4;
const tiles: { g: Grid; x: number; y: number }[] = [];
let y = 2, W = 0;
for (const who of Object.keys(LOOKS)) {
  let x = 2;
  for (const p of POSES) { tiles.push({ g: paintHuman(LOOKS[who], p), x, y }); x += 18; }
  W = Math.max(W, x); y += 34;
}
for (const who of PORTRAITS) {
  let x = 2;
  for (const e of EXPRESSIONS) { tiles.push({ g: paintPortrait(LOOKS[who], e), x, y }); x += 34; }
  W = Math.max(W, x); y += 34;
}
const H = y;
const w = W * SCALE, h = H * SCALE;
const raw = Buffer.alloc((w * 3 + 1) * h);
for (let i = 0; i < h; i++) { raw[i * (w * 3 + 1)] = 0; for (let j = 0; j < w; j++) { const o = i * (w * 3 + 1) + 1 + j * 3; raw[o] = 120; raw[o + 1] = 110; raw[o + 2] = 130; } }
for (const t of tiles) for (let gy = 0; gy < t.g.h; gy++) for (let gx = 0; gx < t.g.w; gx++) {
  const c = t.g.get(gx, gy); if (!c) continue;
  const n = parseInt(c.slice(1), 16);
  for (let sy = 0; sy < SCALE; sy++) for (let sx = 0; sx < SCALE; sx++) {
    const px = (t.x + gx) * SCALE + sx, py = (t.y + gy) * SCALE + sy;
    const o = py * (w * 3 + 1) + 1 + px * 3; raw[o] = n >> 16; raw[o + 1] = (n >> 8) & 255; raw[o + 2] = n & 255;
  }
}
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(process.argv[2], Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('sheet', w, h);
