// Turns Codex-generated interface art (art-src/ui/raw) into game-size PNGs in godot/assets/ui:
// the magenta backdrop is keyed out, the image is trimmed to the object and box-filtered down to
// roughly its own pixel grid, then stored at 2× so it stays crisp when the game scales it up.
// Usage: node scripts/ui-process.mjs
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG, encodePNG } from './png.mjs';

const RAW = 'art-src/ui/raw', OUT = 'godot/assets/ui';
// name → output width in pixels (height follows the trimmed aspect)
const W = {
  ui_btn_primary: 120, ui_btn_primary_pressed: 120, ui_btn_plain: 120, ui_btn_plain_pressed: 120,
  ui_panel_dialog: 160, ui_panel_small: 72, ui_choice: 150, ui_choice_selected: 150,
  ui_stick_base: 56, ui_stick_knob: 28, ui_act: 48, ui_act_pressed: 48, ui_crouch: 40, ui_crouch_on: 40,
  ui_pause: 28, ui_cross: 12, ui_emblem: 40, ui_portrait_frame: 32, ui_bar: 96, ui_bar_fill: 96, ui_rotate: 48,
};

function key(im) {
  const m = new Uint8Array(im.w * im.h);
  for (let i = 0; i < m.length; i++) {
    const r = im.data[i * 4], g = im.data[i * 4 + 1], b = im.data[i * 4 + 2];
    m[i] = r > 170 && b > 170 && g < 110 ? 0 : 1; // magenta only: the violet accent must survive
  }
  return m;
}

function process(name, ow) {
  const im = decodePNG(fs.readFileSync(path.join(RAW, name + '.png')));
  const keep = key(im);
  let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (keep[y * im.w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const oh = Math.max(1, Math.round((ow * bh) / bw));
  const out = Buffer.alloc(ow * oh * 4);
  for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) {
    const sx0 = x0 + Math.floor((ox * bw) / ow), sx1 = Math.max(sx0 + 1, x0 + Math.floor(((ox + 1) * bw) / ow));
    const sy0 = y0 + Math.floor((oy * bh) / oh), sy1 = Math.max(sy0 + 1, y0 + Math.floor(((oy + 1) * bh) / oh));
    let r = 0, g = 0, b = 0, n = 0, tot = 0;
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      tot++;
      const i = y * im.w + x;
      if (!keep[i]) continue;
      r += im.data[i * 4]; g += im.data[i * 4 + 1]; b += im.data[i * 4 + 2]; n++;
    }
    const q = (oy * ow + ox) * 4;
    if (n && n / tot >= 0.5) { out[q] = r / n; out[q + 1] = g / n; out[q + 2] = b / n; out[q + 3] = 255; }
  }
  // store at 2× (nearest) so one art pixel = two interface units, matching the 960×540 layout
  const K = 2, big = Buffer.alloc(ow * K * oh * K * 4);
  for (let y = 0; y < oh * K; y++) for (let x = 0; x < ow * K; x++) out.copy(big, (y * ow * K + x) * 4, (((y / K) | 0) * ow + ((x / K) | 0)) * 4, (((y / K) | 0) * ow + ((x / K) | 0)) * 4 + 4);
  fs.writeFileSync(path.join(OUT, name + '.png'), encodePNG({ w: ow * K, h: oh * K, data: big }));
  return `${name} ${ow * K}x${oh * K}`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const [n, w] of Object.entries(W)) {
  if (!fs.existsSync(path.join(RAW, n + '.png'))) { console.log('missing', n); continue; }
  console.log(process(n, w));
}
