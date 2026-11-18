// Turns Codex-generated art (art-src/ch1/raw) into game-size PNGs in public/assets/ch1 and
// lists them in the manifest. Sheets are split by the cell each figure's centre falls in;
// the flat magenta backdrop is keyed out; everything is box-filtered down to pixel-art size.
// Usage: node scripts/art-process.mjs [--contact out.png]
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG, encodePNG } from './png.mjs';

const RAW = 'art-src/ch1/raw', OUT = 'public/assets/ch1';
const TEX = 128;
const TEXTURES = ['tex_wall_plaster', 'tex_wall_photo', 'tex_wall_photo_dust', 'tex_wall_photo_wiped', 'tex_wall_window', 'tex_wall_tools',
  'tex_wall_kitchen', 'tex_wall_cellar', 'tex_wall_garden', 'tex_wall_gate', 'tex_wall_facade', 'tex_door_front', 'tex_door_front_scratched',
  'tex_door_back', 'tex_door_back_ajar', 'tex_floor_wood', 'tex_floor_creak', 'tex_floor_stairs', 'tex_floor_dirt', 'tex_floor_cobble',
  'tex_floor_kitchen', 'tex_ceil_wood', 'tex_ceil_cellar'];
const P = [48, 92], C = [32, 60];
// [sheet, cols, rows, [[name, w, h, anchor]...]]  anchor: b (bottom-centre), br, c, t
const SHEETS = [
  ['sheet_leni', 5, 1, [['spr_leni_bag', ...C], ['spr_leni_bag_w1', ...C], ['spr_leni_bag_w2', ...C], ['spr_leni', ...C], ['spr_leni_draw', 36, 52]]],
  ['sheet_otto', 3, 1, [['spr_otto', ...P], ['spr_otto_w1', ...P], ['spr_otto_w2', ...P]]],
  ['sheet_police', 6, 1, [['spr_police', ...P], ['spr_police_w1', ...P], ['spr_police_w2', ...P], ['spr_police2', ...P], ['spr_police2_w1', ...P], ['spr_police2_w2', ...P]]],
  ['spr_helena', 1, 1, [['spr_helena', ...P]]],
  ['sheet_faces', 4, 2, ['hud_paul_calm', 'hud_paul_tense', 'hud_paul_panic', 'hud_paul_panic2', 'face_helena', 'face_leni', 'face_otto', 'face_police'].map((n) => [n, 48, 48])],
  ['sheet_hands', 2, 2, [['hand_idle', 68, 68, 'br'], ['hand_screwdriver', 68, 68, 'br'], ['hand_r', 60, 52, 'c'], ['hand_l', 60, 52, 'c']]],
  ['sheet_objects_a', 4, 2, [['obj_radio', 28, 24], ['obj_radio_on', 28, 24], ['obj_watchtower', 26, 16], ['obj_booklets', 20, 16], ['obj_mimeograph', 32, 20], ['obj_screwdriver', 28, 8], ['obj_coffeepot', 24, 28], ['obj_rag', 24, 20]]],
  ['sheet_objects_b', 3, 2, [['obj_workbench', 88, 44], ['obj_range', 60, 52], ['obj_basin', 40, 48], ['obj_chair', 24, 32], ['obj_bulb', 10, 28, 't'], ['obj_shelf', 44, 52]]],
  ['sheet_objects_c', 3, 2, [['obj_potato_crate', 52, 32], ['obj_potato_crate_shallow', 52, 32], ['obj_potato_crate_deep', 52, 32], ['obj_bicycle', 72, 44], ['obj_wheels', 52, 36]]],
];

const load = (n) => { const f = path.join(RAW, `${n}.png`); return fs.existsSync(f) ? decodePNG(fs.readFileSync(f)) : null; };

/** Box-filter a region (with an optional per-pixel keep mask) into ow×oh. */
function shrink(im, x0, y0, bw, bh, ow, oh, keep) {
  const out = Buffer.alloc(ow * oh * 4);
  for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) {
    const sx0 = x0 + Math.floor((ox * bw) / ow), sx1 = Math.max(sx0 + 1, x0 + Math.floor(((ox + 1) * bw) / ow));
    const sy0 = y0 + Math.floor((oy * bh) / oh), sy1 = Math.max(sy0 + 1, y0 + Math.floor(((oy + 1) * bh) / oh));
    let r = 0, g = 0, b = 0, n = 0, tot = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      tot++;
      const i = y * im.w + x;
      if (keep && !keep[i]) continue;
      r += im.data[i * 4]; g += im.data[i * 4 + 1]; b += im.data[i * 4 + 2]; n++;
    }
    const q = (oy * ow + ox) * 4;
    if (n && n / tot >= 0.5) { out[q] = r / n; out[q + 1] = g / n; out[q + 2] = b / n; out[q + 3] = 255; }
  }
  return { w: ow, h: oh, data: out };
}

function keyMask(im) {
  const m = new Uint8Array(im.w * im.h);
  for (let i = 0; i < m.length; i++) {
    const r = im.data[i * 4], g = im.data[i * 4 + 1], b = im.data[i * 4 + 2];
    const mag = Math.min(r, b) - g;
    m[i] = mag > 38 && r > 95 && b > 95 ? 0 : 1;
  }
  return m;
}

function components(mask, w, h) {
  const lab = new Int32Array(w * h).fill(-1), comps = [];
  const stack = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || lab[s] >= 0) continue;
    const id = comps.length; let n = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack.push(s); lab[s] = id;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i / w) | 0;
      n++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= mask.length || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
        if (mask[j] && lab[j] < 0) { lab[j] = id; stack.push(j); }
      }
    }
    comps.push({ id, n, cx: sx / n, cy: sy / n, x0, y0, x1, y1 });
  }
  return { lab, comps };
}

function place(src, tw, th, anchor = 'b') {
  const out = Buffer.alloc(tw * th * 4);
  const ox = anchor === 'br' ? tw - src.w : (tw - src.w) >> 1;
  const oy = anchor === 't' ? 0 : anchor === 'c' ? (th - src.h) >> 1 : th - src.h;
  for (let y = 0; y < src.h; y++) src.data.copy(out, ((oy + y) * tw + ox) * 4, y * src.w * 4, (y + 1) * src.w * 4);
  return { w: tw, h: th, data: out };
}

const written = [], missing = [], previews = [];
fs.mkdirSync(OUT, { recursive: true });
const save = (name, im) => { fs.writeFileSync(path.join(OUT, `${name}.png`), encodePNG(im)); written.push(name); previews.push([name, im]); };

for (const t of TEXTURES) {
  const im = load(t);
  if (!im) { missing.push(t); continue; }
  const s = Math.min(im.w, im.h);
  save(t, shrink(im, (im.w - s) >> 1, (im.h - s) >> 1, s, s, TEX, TEX));
}

for (const [sheet, cols, rows, items] of SHEETS) {
  const im = load(sheet);
  if (!im) { missing.push(sheet); continue; }
  const mask = keyMask(im);
  const { lab, comps } = components(mask, im.w, im.h);
  const minN = Math.max(40, (im.w * im.h) / 20000);
  const cells = items.map(() => ({ ids: new Set(), x0: im.w, y0: im.h, x1: -1, y1: -1 }));
  for (const c of comps) {
    if (c.n < minN) continue;
    const col = Math.min(cols - 1, Math.floor((c.cx / im.w) * cols)), row = Math.min(rows - 1, Math.floor((c.cy / im.h) * rows));
    const k = row * cols + col;
    if (k >= items.length) continue;
    const cell = cells[k];
    cell.ids.add(c.id); cell.x0 = Math.min(cell.x0, c.x0); cell.y0 = Math.min(cell.y0, c.y0); cell.x1 = Math.max(cell.x1, c.x1); cell.y1 = Math.max(cell.y1, c.y1);
  }
  items.forEach(([name, tw, th, anchor], k) => {
    const cell = cells[k];
    if (cell.x1 < 0) { missing.push(`${name} (empty cell in ${sheet})`); return; }
    const keep = new Uint8Array(im.w * im.h);
    for (let i = 0; i < keep.length; i++) if (lab[i] >= 0 && cell.ids.has(lab[i])) keep[i] = 1;
    const bw = cell.x1 - cell.x0 + 1, bh = cell.y1 - cell.y0 + 1;
    const sc = Math.min(tw / bw, th / bh);
    const ow = Math.max(1, Math.round(bw * sc)), oh = Math.max(1, Math.round(bh * sc));
    save(name, place(shrink(im, cell.x0, cell.y0, bw, bh, ow, oh, keep), tw, th, anchor));
  });
}

const mf = path.join(OUT, 'manifest.json');
const man = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : {};
man.images = written.map((n) => `${n}.png`).sort();
man.videos ??= []; man.audio ??= [];
fs.writeFileSync(mf, JSON.stringify(man, null, 2) + '\n');
console.log(`wrote ${written.length} images`);
if (missing.length) console.log('missing:', missing.join(', '));

// contact sheet for review
const ci = process.argv.indexOf('--contact');
if (ci > 0) {
  const S = 3, pad = 6, colW = 140 * 1;
  let x = pad, y = pad, rowH = 0; const W = 1400; const boxes = [];
  for (const [, im] of previews) {
    const w = im.w * (im.w > 100 ? 1 : S), h = im.h * (im.w > 100 ? 1 : S);
    if (x + w + pad > W) { x = pad; y += rowH + pad; rowH = 0; }
    boxes.push([im, x, y, w / im.w]); x += Math.max(w, 0) + pad; rowH = Math.max(rowH, h);
  }
  const H = y + rowH + pad, data = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { const c = ((i % W >> 3) + ((i / W | 0) >> 3)) % 2 ? 120 : 100; data[i * 4] = c; data[i * 4 + 1] = c + 10; data[i * 4 + 2] = c; data[i * 4 + 3] = 255; }
  for (const [im, bx, by, s] of boxes) for (let yy = 0; yy < im.h * s; yy++) for (let xx = 0; xx < im.w * s; xx++) {
    const si = ((yy / s | 0) * im.w + (xx / s | 0)) * 4; if (!im.data[si + 3]) continue;
    const di = ((by + yy) * W + bx + xx) * 4; im.data.copy(data, di, si, si + 3);
  }
  fs.writeFileSync(process.argv[ci + 1], encodePNG({ w: W, h: H, data }));
  console.log('contact sheet', process.argv[ci + 1]);
}
