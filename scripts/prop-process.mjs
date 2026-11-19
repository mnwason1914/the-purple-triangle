// Turns Codex-generated furniture views (art-src/props/raw) into face textures for the 3D props
// (godot/assets/props) and small table items into billboards (godot/assets/ch1).
// Front/side views: magenta keyed out (also inside openings), trimmed to the object, box-filtered
// to the face size at a fixed pixel density. Top views: whole image, same density.
// Usage: node scripts/prop-process.mjs
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG, encodePNG } from './png.mjs';

const RAW = 'art-src/props/raw', OUT = 'godot/assets/props', OBJ = 'godot/assets/ch1';
const PX = 110; // texture pixels per world unit
// base → [width, height, depth] in world units (must match chapter1.gd)
const SIZE = {
  p_workbench: [0.74, 0.46, 0.34], p_range: [0.5, 0.43, 0.32], p_basin: [0.33, 0.4, 0.26], p_chair: [0.22, 0.42, 0.22],
  p_shelf: [0.37, 0.43, 0.15], p_crate: [0.43, 0.27, 0.32], p_bicycle: [0.6, 0.37, 0.1], p_wheels: [0.43, 0.3, 0.15],
  p_cabinet: [0.4, 0.75, 0.2], p_stool: [0.16, 0.22, 0.16], p_drum: [0.22, 0.4, 0.22], p_parts: [0.35, 0.35, 0.3],
  p_table: [0.5, 0.36, 0.36], p_dresser: [0.45, 0.7, 0.18], p_barrel: [0.25, 0.36, 0.25], p_sacks: [0.4, 0.25, 0.3],
  p_woodpile: [0.6, 0.4, 0.25], p_pump: [0.2, 0.6, 0.2],
};
// the bicycle's long view goes on the long faces of its box
const RENAME = { p_bicycle_side: 'p_bicycle_front', p_bicycle_front: 'p_bicycle_side' };
// small billboards: name → height in texture pixels
const OBJS = { obj_lamp: 24, obj_jug: 16, obj_bread: 10, obj_cups: 9 };

const isKey = (d, i) => d[i] > 170 && d[i + 2] > 170 && d[i + 1] < 110;

function shrink(im, keyed, ow, oh) {
  let x0 = 0, y0 = 0, x1 = im.w - 1, y1 = im.h - 1;
  if (keyed) {
    x0 = im.w; y0 = im.h; x1 = -1; y1 = -1;
    for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (!isKey(im.data, (y * im.w + x) * 4)) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (oh == null) oh = Math.max(1, Math.round(ow)), ow = Math.max(1, Math.round((oh * bw) / bh));
  const out = Buffer.alloc(ow * oh * 4);
  for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) {
    const sx0 = x0 + Math.floor((ox * bw) / ow), sx1 = Math.max(sx0 + 1, x0 + Math.floor(((ox + 1) * bw) / ow));
    const sy0 = y0 + Math.floor((oy * bh) / oh), sy1 = Math.max(sy0 + 1, y0 + Math.floor(((oy + 1) * bh) / oh));
    let r = 0, g = 0, b = 0, n = 0, tot = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      tot++;
      const i = (y * im.w + x) * 4;
      if (keyed && isKey(im.data, i)) continue;
      r += im.data[i]; g += im.data[i + 1]; b += im.data[i + 2]; n++;
    }
    const q = (oy * ow + ox) * 4;
    if (n && n / tot >= 0.5) { out[q] = r / n; out[q + 1] = g / n; out[q + 2] = b / n; out[q + 3] = 255; }
  }
  return { w: ow, h: oh, data: out };
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(RAW).filter((f) => f.endsWith('.png')).sort()) {
  const raw = f.slice(0, -4);
  const im = decodePNG(fs.readFileSync(path.join(RAW, f)));
  if (OBJS[raw]) {
    const o = shrink(im, true, OBJS[raw], null);
    // keep the full height: shrink() above took ow as the height when oh is null
    fs.writeFileSync(path.join(OBJ, raw + '.png'), encodePNG(o));
    console.log(raw, `${o.w}x${o.h}`);
    continue;
  }
  const name = RENAME[raw] || raw;
  const base = Object.keys(SIZE).find((b) => name.startsWith(b + '_'));
  if (!base) { console.log('skip', raw); continue; }
  const [W, H, D] = SIZE[base];
  const view = name.slice(base.length + 1);
  let ow, oh, keyed = true;
  if (view.startsWith('top')) { ow = W * PX; oh = D * PX; keyed = false; }
  else if (view === 'front') { ow = W * PX; oh = H * PX; }
  else { ow = D * PX; oh = H * PX; }
  const o = shrink(im, keyed, Math.max(2, Math.round(ow)), Math.max(2, Math.round(oh)));
  fs.writeFileSync(path.join(OUT, name + '.png'), encodePNG(o));
  console.log(name, `${o.w}x${o.h}`);
}
