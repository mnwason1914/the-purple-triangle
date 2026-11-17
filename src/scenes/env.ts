import { Grid, hash2, shade } from '../engine/grid';
import { OUTLINE } from '../characters/painter';

/**
 * Environment painters. Scene backdrops are painted into one Grid per scene (uploaded as its own
 * texture); interactive props are small grids packed into the shared atlas.
 * Backdrop coordinate system: grid row 0 = top. Floor line (where feet stand) = FLOOR_ROW.
 */
export const BG_H = 160; // backdrop height in px
export const FLOOR_ROW = 140; // grid row of the walk line (world y = 0)

// ---------- tiny 3x5 pixel font for signs ----------
const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101',
  L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', W: '101101111111101',
  Ä: '101010101111101', Ü: '101000101101111', ' ': '000000000000000', '.': '000000000000010', '-': '000000111000000',
};
export function text(g: Grid, x: number, y: number, s: string, col: string) {
  for (const ch of s.toUpperCase()) {
    const f = FONT[ch] ?? FONT[' '];
    for (let i = 0; i < 15; i++) if (f[i] === '1') g.px(x + (i % 3), y + Math.floor(i / 3), col);
    x += 4;
  }
}

// ======================================================================= interiors
const WALL_K = '#8a8f6e', WALL_KD = '#7b8062';
const WALL_B = '#9a7f7a', WALL_BD = '#8c716c';
const WOOD = '#6e4e36', WOOD_D = '#563b28', FLOOR = '#7a5638', FLOOR_D = '#5e412a';

function wallpaper(g: Grid, x0: number, x1: number, top: number, bottom: number, base: string, dot: string, stripes: boolean) {
  g.rect(x0, top, x1 - x0, bottom - top, base);
  for (let y = top; y < bottom; y++)
    for (let x = x0; x < x1; x++) {
      if (stripes) { if ((x % 8) === 0) g.px(x, y, dot); if ((x % 8) === 4 && (y % 6) === 0) g.px(x, y, shade(dot, -0.1)); }
      else if ((x % 8) === (y % 12 < 6 ? 2 : 6) && (y % 6) === 3) { g.px(x, y, dot); g.px(x + 1, y - 1, dot); g.px(x - 1, y - 1, dot); g.px(x, y - 2, dot); }
    }
}

function windowFrame(g: Grid, x: number, y: number, w: number, h: number, night: boolean, curtain = '#c8b48a') {
  g.rect(x - 2, y - 2, w + 4, h + 4, '#e3dac4');
  g.rect(x, y, w, h, night ? '#1d2438' : '#a9c9df');
  if (!night) { g.rect(x, y, w, Math.floor(h / 3), '#c3dbea'); for (let i = 0; i < 4; i++) g.px(x + 3 + i * 5, y + h - 6 - (i % 2), '#e6eef4'); }
  else for (let i = 0; i < 5; i++) g.px(x + 2 + Math.floor(hash2(i, x) * (w - 4)), y + 2 + Math.floor(hash2(x, i) * (h - 8)), '#d8d8b8');
  g.vline(x + Math.floor(w / 2), y, y + h - 1, '#e3dac4');
  g.hline(x, x + w - 1, y + Math.floor(h * 0.4), '#e3dac4');
  g.rect(x - 4, y + h + 2, w + 8, 2, '#b8ad94'); // sill
  // curtains
  g.rect(x - 6, y - 4, 5, h + 8, curtain); g.rect(x + w + 1, y - 4, 5, h + 8, curtain);
  g.vline(x - 4, y - 4, y + h + 3, shade(curtain, -0.2)); g.vline(x + w + 3, y - 4, y + h + 3, shade(curtain, -0.2));
  g.rect(x - 8, y - 6, w + 16, 2, '#5a4030');
}

function floorAndWainscot(g: Grid, x0: number, x1: number) {
  const F = FLOOR_ROW;
  // wainscot
  g.rect(x0, F - 30, x1 - x0, 30, WOOD);
  g.hline(x0, x1 - 1, F - 30, '#8a6a4a');
  for (let x = x0; x < x1; x += 24) { g.rect(x + 3, F - 26, 18, 20, WOOD_D); g.rect(x + 4, F - 25, 16, 18, WOOD); }
  g.rect(x0, F - 4, x1 - x0, 4, '#45301f');
  // floor planks (perspective strip)
  g.rect(x0, F, x1 - x0, BG_H - F, FLOOR);
  for (let y = F + 3; y < BG_H; y += 5) g.hline(x0, x1 - 1, y, FLOOR_D);
  for (let y = F; y < BG_H; y += 5) for (let x = x0 + ((y * 7) % 37); x < x1; x += 37) g.vline(x, y, y + 4, FLOOR_D);
}

/** The Hartmanns' two-room flat. width 432. */
export function paintHome(night: boolean): Grid {
  const W = 432;
  const g = new Grid(W, BG_H);
  const F = FLOOR_ROW;
  g.rect(0, 0, W, BG_H, '#2a2026');
  // ceiling
  g.rect(0, 0, W, 14, '#c9bfa8'); g.hline(0, W - 1, 13, '#a89c84'); g.rect(0, 14, W, 3, '#6a5040');
  wallpaper(g, 0, 262, 17, F - 30, night ? shade(WALL_K, -0.25) : WALL_K, night ? shade(WALL_KD, -0.25) : WALL_KD, false);
  wallpaper(g, 274, W, 17, F - 30, night ? shade(WALL_B, -0.25) : WALL_B, night ? shade(WALL_BD, -0.25) : WALL_BD, true);
  floorAndWainscot(g, 0, W);
  // entry door (left) frame
  g.rect(8, F - 74, 28, 74, '#3a2a1e'); g.rect(10, F - 72, 24, 72, '#6b4a30');
  g.rect(13, F - 68, 18, 28, '#5a3e28'); g.rect(13, F - 36, 18, 30, '#5a3e28'); g.px(30, F - 38, '#d8c070');
  // coat hooks with coats
  g.hline(42, 64, F - 66, '#3a2a1e');
  g.rect(44, F - 64, 7, 22, '#5a4638'); g.rect(55, F - 64, 7, 18, '#41503f'); g.px(47, F - 66, '#c9b06a'); g.px(58, F - 66, '#c9b06a');
  // kitchen window over sewing table
  windowFrame(g, 150, F - 98, 36, 42, night);
  // calendar + framed photo
  g.rect(224, F - 96, 14, 18, '#efe8d8'); g.rect(224, F - 96, 14, 4, '#a84848'); text(g, 225, F - 90, '12', '#3a2a2a');
  for (let i = 0; i < 3; i++) g.hline(226, 236, F - 83 + i * 2, '#b8b0a0');
  g.rect(110, F - 92, 18, 14, '#5a4030'); g.rect(112, F - 90, 14, 10, '#c8bca0');
  g.ellipse(116, F - 85, 2, 2.5, '#7a6a58'); g.ellipse(122, F - 84, 2, 3, '#7a6a58'); g.ellipse(119, F - 82, 1.5, 2, '#8a7a68');
  // shelf for radio
  g.rect(196, F - 64, 40, 3, '#45301f');
  // partition wall with open doorway
  g.rect(262, 17, 12, F - 17, '#bfb398'); g.vline(262, 17, F, '#a89c84');
  g.rect(262, F - 76, 12, 76, '#2a2026');
  g.rect(260, F - 78, 16, 3, '#5a4030'); g.vline(260, F - 78, F - 1, '#5a4030'); g.vline(275, F - 78, F - 1, '#5a4030');
  // bedroom: small window, crucifix-free wall text sampler, rug
  windowFrame(g, 360, F - 96, 26, 30, night, '#d8c8b8');
  g.rect(296, F - 92, 26, 18, '#e9e2d0'); g.rect(297, F - 91, 24, 16, '#f4efe2');
  for (let i = 0; i < 4; i++) g.hline(300, 318 - (i % 2) * 4, F - 88 + i * 3, '#7a5a7a');
  g.rect(308, F - 74, 2, 2, '#5a4030');
  // rug over the loose board area
  g.rect(318, F + 3, 46, 8, '#7a3a3a'); g.rect(320, F + 4, 42, 6, '#8e4a46');
  for (let x = 322; x < 360; x += 4) g.px(x, F + 7, '#c9a46a');
  // lamp light pool on ceiling for night
  if (night) { g.ellipse(120, 16, 22, 3, '#d8c890'); }
  return g;
}

/** Stairwell landing. width 288. */
export function paintStairwell(night: boolean): Grid {
  const W = 288;
  const g = new Grid(W, BG_H);
  const F = FLOOR_ROW;
  g.rect(0, 0, W, BG_H, '#221a20');
  const wall = night ? '#6e6a5e' : '#9a9682';
  g.rect(0, 0, W, F, wall);
  g.rect(0, F - 44, W, 44, night ? '#4a5048' : '#5f6a5c'); g.hline(0, W - 1, F - 44, night ? '#3a4038' : '#4a5448');
  for (let x = 0; x < W; x++) for (let y = 0; y < F - 44; y++) if (hash2(x, y) < 0.03) g.px(x, y, shade(wall, -0.08));
  g.rect(0, F, W, BG_H - F, '#5a5652'); for (let y = F + 4; y < BG_H; y += 6) g.hline(0, W - 1, y, '#4a4642');
  // Hartmann door (left) and Krüger door (middle)
  for (const [dx, name] of [[24, 'HARTMANN'], [150, 'KRÜGER']] as const) {
    g.rect(dx, F - 74, 28, 74, '#3a2a1e'); g.rect(dx + 2, F - 72, 24, 72, '#6b4a30');
    g.rect(dx + 5, F - 68, 18, 28, '#5a3e28'); g.rect(dx + 5, F - 36, 18, 30, '#5a3e28'); g.px(dx + 22, F - 38, '#d8c070');
    g.rect(dx + 3, F - 84, name.length * 4 + 2, 7, '#d8d0b8'); text(g, dx + 4, F - 83, name, '#3a3030');
  }
  // window on landing
  windowFrame(g, 92, F - 104, 22, 34, night, '#8a8a7a');
  // stairs going down on the right
  for (let i = 0; i < 9; i++) { const sx = 214 + i * 8; g.rect(sx, F - 2 + i * 2, 80, 2, '#7a6a58'); g.hline(sx, W - 1, F - 2 + i * 2, '#8e7e6a'); }
  g.rect(206, F - 40, 4, 40, '#4a3424'); g.hline(206, W - 1, F - 40, '#5a4030'); g.hline(206, W - 1, F - 39, '#3a2a1e');
  for (let x = 214; x < W; x += 10) g.vline(x, F - 38, F - 2, '#4a3424');
  // electric light switch & meter box
  g.rect(70, F - 64, 4, 6, '#d8d0b8'); g.rect(240, F - 100, 18, 22, '#4a4a48'); g.rect(242, F - 98, 14, 18, '#5a5a56');
  return g;
}

// ======================================================================= street (night, snow)
const PLASTER = '#cfc3a6', PLASTER_D = '#b8ab8e', BEAM = '#3f2e24', ROOF = '#4a2e2e', ROOF_D = '#3a2424', SNOW = '#e8eef4';

export interface StreetLayout {
  width: number;
  doors: { x: number; id: string }[]; // doorway niches (hide spots) centre x
  mailboxes: number[]; // x positions (props placed by scene)
  lamps: number[];
  windows: { x: number; y: number; lit: boolean; id?: string }[]; // world coords of lit windows (for lights)
  bakeryDoor: number;
  homeDoor: number;
  church: number;
}

/** Long night street of half-timbered houses. Returns the backdrop and layout data for gameplay. */
export function paintStreet(): { g: Grid; layout: StreetLayout } {
  const W = 1440;
  const g = new Grid(W, BG_H);
  const F = FLOOR_ROW;
  const layout: StreetLayout = { width: W, doors: [], mailboxes: [], lamps: [], windows: [], bakeryDoor: 0, homeDoor: 0, church: 0 };
  // night sky gap above roofs left transparent (parallax sky shows through)
  // ground: sidewalk + cobbles
  g.rect(0, F - 2, W, 4, '#6a6660');
  g.rect(0, F + 2, W, BG_H - F - 2, '#45423f');
  for (let y = F + 3; y < BG_H; y += 3) for (let x = ((y * 5) % 6); x < W; x += 6) { g.px(x, y, '#55524e'); g.px(x + 1, y, '#55524e'); g.px(x + 2, y + 1, '#3a3836'); }
  for (let x = 0; x < W; x++) if (hash2(x, 3) < 0.35) g.px(x, F + 2 + Math.floor(hash2(x, 4) * 3), SNOW);
  g.hline(0, W - 1, F - 2, SNOW);

  type House = { x: number; w: number; floors: number; kind: 'home' | 'house' | 'bakery' | 'church' | 'alley' };
  const houses: House[] = [
    { x: 0, w: 150, floors: 3, kind: 'home' },
    { x: 150, w: 130, floors: 2, kind: 'house' },
    { x: 280, w: 20, floors: 0, kind: 'alley' },
    { x: 300, w: 140, floors: 3, kind: 'house' },
    { x: 440, w: 120, floors: 2, kind: 'house' },
    { x: 560, w: 30, floors: 0, kind: 'alley' },
    { x: 590, w: 170, floors: 2, kind: 'bakery' },
    { x: 760, w: 130, floors: 3, kind: 'house' },
    { x: 890, w: 120, floors: 2, kind: 'house' },
    { x: 1010, w: 24, floors: 0, kind: 'alley' },
    { x: 1034, w: 140, floors: 3, kind: 'house' },
    { x: 1174, w: 266, floors: 0, kind: 'church' },
  ];
  let wi = 0;
  for (const h of houses) {
    const top = F - 2 - (h.floors * 36 + 6);
    if (h.kind === 'alley') {
      g.rect(h.x, F - 110, h.w, 108, '#1a1820');
      g.rect(h.x + 2, F - 40, h.w - 4, 38, '#141218');
      continue;
    }
    if (h.kind === 'church') {
      const cx = h.x + 120;
      layout.church = cx;
      g.rect(h.x + 30, F - 100, 190, 98, '#77747c');
      for (let y = F - 98; y < F - 2; y += 6) for (let x = h.x + 30 + ((y / 6) % 2) * 8; x < h.x + 220; x += 16) g.hline(x, x + 14, y, '#6a6770');
      // tower
      g.rect(cx - 18, F - 150, 36, 52, '#6e6b74');
      for (let i = 0; i < 12; i++) g.hline(cx - 18 + i * 1.5, cx + 18 - i * 1.5, F - 150 - i, ROOF_D);
      g.rect(cx - 6, F - 140, 12, 16, '#2a2a32'); g.ellipse(cx, F - 140, 6, 4, '#2a2a32');
      // arched portal (hide spot)
      g.rect(cx - 16, F - 48, 32, 46, '#4a4850'); g.ellipse(cx, F - 48, 16, 10, '#4a4850');
      g.rect(cx - 12, F - 44, 24, 42, '#231f26'); g.ellipse(cx, F - 44, 12, 8, '#231f26');
      // tall windows
      for (const wx of [h.x + 50, h.x + 80, h.x + 160, h.x + 190]) { g.rect(wx, F - 84, 10, 30, '#2a3048'); g.ellipse(wx + 5, F - 84, 5, 4, '#2a3048'); g.vline(wx + 5, F - 86, F - 55, '#5a5868'); }
      g.hline(h.x + 28, h.x + 222, F - 101, SNOW); g.hline(h.x + 28, h.x + 222, F - 100, SNOW);
      layout.doors.push({ x: cx, id: 'church' });
      continue;
    }
    // facade
    g.rect(h.x + 2, top, h.w - 4, F - 2 - top, PLASTER);
    for (let x = h.x + 2; x < h.x + h.w - 2; x++) for (let y = top; y < F - 2; y++) if (hash2(x, y) < 0.04) g.px(x, y, PLASTER_D);
    // timber frame
    const posts = Math.max(3, Math.round(h.w / 34));
    for (let i = 0; i <= posts; i++) { const x = h.x + 2 + Math.round((i * (h.w - 7)) / posts); g.rect(x, top, 3, F - 2 - top, BEAM); }
    for (let f = 0; f <= h.floors; f++) g.rect(h.x + 2, top + f * 36, h.w - 4, 3, BEAM);
    for (let f = 0; f < h.floors; f++)
      for (let i = 0; i < posts; i++) {
        if ((i + f) % 2 === 1) continue;
        const x0 = h.x + 2 + Math.round((i * (h.w - 7)) / posts) + 3, x1 = h.x + 2 + Math.round(((i + 1) * (h.w - 7)) / posts);
        const y0 = top + f * 36 + 3, y1 = top + (f + 1) * 36;
        for (let s = 0; s <= 1; s += 1 / 40) { g.rect(Math.round(x0 + (x1 - x0) * s), Math.round(y0 + (y1 - y0) * s), 2, 2, BEAM); }
      }
    // roof
    const rh = 34;
    for (let i = 0; i < rh; i++) {
      const inset = Math.round(i * 0.9);
      g.hline(h.x - 4 + inset, h.x + h.w + 3 - inset, top - 1 - i, i % 4 === 0 ? ROOF_D : ROOF);
    }
    for (let i = 0; i < rh; i += 1) { const inset = Math.round(i * 0.9); g.px(h.x - 4 + inset, top - 1 - i, SNOW); g.px(h.x + h.w + 3 - inset, top - 1 - i, SNOW); }
    g.hline(h.x - 4, h.x + h.w + 3, top - 1, SNOW);
    if (h.w > 120) { g.rect(h.x + h.w - 34, top - 44, 8, 14, '#5a3a32'); g.hline(h.x + h.w - 35, h.x + h.w - 25, top - 45, SNOW); }
    // windows per floor (upper floors)
    for (let f = 0; f < h.floors - 1; f++) {
      const wy = top + f * 36 + 9;
      for (let i = 0; i < posts; i++) {
        if (i % 2 === 0 && posts > 3) continue;
        const wx = h.x + 2 + Math.round(((i + 0.5) * (h.w - 7)) / posts) - 7;
        const lit = hash2(wi, 11) < 0.45 || (h.kind === 'home' && f === h.floors - 3);
        const id = h.kind === 'home' && f === 1 && i === 1 ? 'kruger' : undefined;
        g.rect(wx - 1, wy - 1, 16, 21, BEAM);
        g.rect(wx, wy, 14, 19, lit ? '#e8b860' : '#1c2234');
        if (lit) { g.rect(wx, wy, 14, 4, '#f4d488'); g.rect(wx, wy, 3, 19, '#c88f4a'); g.rect(wx + 11, wy, 3, 19, '#c88f4a'); }
        g.vline(wx + 7, wy, wy + 18, BEAM); g.hline(wx, wx + 13, wy + 8, BEAM);
        g.hline(wx - 2, wx + 15, wy + 19, SNOW); g.hline(wx - 2, wx + 15, wy + 20, '#8a8a90');
        layout.windows.push({ x: wx + 7, y: F - (wy + 9), lit, id });
        wi++;
      }
    }
    // ground floor: door niche + mailbox + maybe shop
    const doorX = h.x + Math.round(h.w * (h.kind === 'bakery' ? 0.78 : 0.35));
    g.rect(doorX - 13, F - 46, 26, 44, '#2a201c');
    g.rect(doorX - 10, F - 42, 20, 40, '#1a1416');
    g.rect(doorX - 7, F - 40, 14, 38, h.kind === 'home' ? '#4a3424' : '#3e2c20');
    g.px(doorX + 4, F - 20, '#c9a860');
    g.rect(doorX - 15, F - 48, 30, 3, BEAM); g.hline(doorX - 15, doorX + 14, F - 49, SNOW);
    g.rect(doorX - 13, F - 4, 26, 2, '#7a7670');
    layout.doors.push({ x: doorX, id: h.kind === 'home' ? 'home' : `door${layout.doors.length}` });
    if (h.kind === 'home') layout.homeDoor = doorX;
    if (h.kind === 'bakery') {
      // shop window and sign, door is the back-yard gate in the alley to its left
      g.rect(h.x + 14, F - 48, 74, 40, BEAM); g.rect(h.x + 16, F - 46, 70, 34, '#3a2a20');
      for (let i = 0; i < 6; i++) g.ellipse(h.x + 24 + i * 11, F - 16, 4, 2.5, '#8a5a2e');
      g.rect(h.x + 16, F - 46, 70, 2, '#5a4030');
      g.rect(h.x + 16, F - 62, 74, 11, '#5a3a26'); g.rect(h.x + 17, F - 61, 72, 9, '#7a5034'); text(g, h.x + 22, F - 59, 'BÄCKEREI BECKER', '#e8d8a0');
      layout.bakeryDoor = h.x - 15;
    } else {
      // ground floor windows
      for (const off of [0.66, 0.86]) {
        const wx = h.x + Math.round(h.w * off) - 7;
        if (Math.abs(wx + 7 - doorX) < 24 || wx + 16 > h.x + h.w) continue;
        g.rect(wx - 1, F - 40, 16, 22, BEAM); g.rect(wx, F - 39, 14, 20, hash2(wx, 5) < 0.4 ? '#e8b860' : '#1c2234');
        g.vline(wx + 7, F - 39, F - 20, BEAM); g.hline(wx - 2, wx + 15, F - 19, SNOW);
      }
    }
    layout.mailboxes.push(doorX + 20);
    if (h.w > 125 && h.kind !== 'bakery') layout.mailboxes.push(h.x + h.w - 18);
  }
  // street lamps are props; record positions
  layout.lamps = [110, 420, 690, 960, 1240, 1390];
  // bakery back gate in the alley
  g.rect(layout.bakeryDoor - 9, F - 30, 18, 28, '#3a2a20'); for (let x = layout.bakeryDoor - 8; x < layout.bakeryDoor + 9; x += 3) g.vline(x, F - 30, F - 3, '#2a1e18');
  return { g, layout };
}

/** Parallax night sky + distant roofs. width 512, repeats. */
export function paintNightSky(): Grid {
  const W = 512, H = 200;
  const g = new Grid(W, H);
  const bands = ['#0d0f1c', '#10142a', '#131a33', '#18203c', '#1d2744', '#232e4c'];
  for (let y = 0; y < H; y++) {
    const b = Math.min(bands.length - 1, Math.floor((y / H) * bands.length));
    for (let x = 0; x < W; x++) g.px(x, y, (y % Math.ceil(H / bands.length) > H / bands.length - 3 && (x + y) % 2 === 0 && b < bands.length - 1) ? bands[b + 1] : bands[b]);
  }
  // distant roofline silhouette
  let x = 0;
  while (x < W) {
    const w = 20 + Math.floor(hash2(x, 1) * 40), h = 30 + Math.floor(hash2(x, 2) * 30);
    for (let i = 0; i < w; i++) {
      const roof = Math.min(i, w - i) * 0.8;
      g.vline(x + i, H - h - Math.round(Math.min(roof, 14)), H - 1, '#0e1020');
    }
    if (hash2(x, 3) < 0.3) g.rect(x + w / 2, H - h - 6, 2, 3, '#e0b060');
    x += w;
  }
  // distant church spire
  for (let i = 0; i < 46; i++) g.hline(300 - Math.floor(i / 6), 300 + Math.floor(i / 6), H - 66 - (46 - i), '#0e1020');
  return g;
}

// ======================================================================= props (atlas)
export function propGrids(): Record<string, Grid> {
  const P: Record<string, Grid> = {};
  const mk = (name: string, w: number, h: number, paint: (g: Grid) => void, outline = true) => {
    const g = new Grid(w, h);
    paint(g);
    if (outline) g.outline(OUTLINE);
    P[name] = g;
  };
  mk('stove', 26, 52, (g) => {
    g.rect(1, 6, 24, 44, '#4f7a62');
    for (let y = 8; y < 48; y += 6) for (let x = 2; x < 25; x += 6) { g.rect(x, y, 5, 5, '#5f8c72'); g.px(x, y, '#7aa88c'); }
    g.rect(0, 0, 26, 6, '#3f6a52'); g.rect(0, 48, 26, 4, '#3a3030');
    g.rect(8, 30, 10, 8, '#2a2020'); g.rect(9, 31, 8, 6, '#3a2a24'); g.px(12, 34, '#e07030'); g.px(13, 35, '#f0a040');
  });
  mk('table', 44, 22, (g) => {
    g.rect(0, 0, 44, 4, '#7a5234'); g.hline(0, 43, 0, '#946a46'); g.rect(3, 4, 3, 18, '#5a3a24'); g.rect(38, 4, 3, 18, '#5a3a24');
    g.rect(1, 4, 42, 3, '#e8e2d2'); for (let x = 2; x < 42; x += 4) g.px(x, 6, '#c8b8b0');
  });
  mk('chair', 12, 26, (g) => { g.rect(0, 0, 3, 26, '#5a3a24'); g.rect(0, 12, 12, 3, '#6a4a2e'); g.rect(10, 15, 2, 11, '#5a3a24'); g.rect(0, 2, 3, 2, '#7a5234'); });
  mk('sewing', 34, 30, (g) => {
    g.rect(0, 10, 34, 3, '#6a4a2e'); g.rect(2, 13, 3, 17, '#2a2a2a'); g.rect(29, 13, 3, 17, '#2a2a2a'); g.rect(2, 26, 30, 2, '#2a2a2a');
    for (let i = 0; i < 5; i++) g.px(8 + i * 4, 21 + (i % 2), '#2a2a2a');
    g.rect(6, 3, 18, 3, '#1e1e22'); g.rect(20, 0, 5, 10, '#1e1e22'); g.rect(6, 3, 3, 7, '#1e1e22'); g.px(7, 9, '#c0c0c0');
    g.hline(10, 18, 4, '#c9a860'); g.rect(26, 2, 3, 3, '#a88860');
    g.rect(24, 7, 8, 3, '#8a3a3a'); // fabric
  });
  mk('basket', 14, 9, (g) => { g.rect(0, 2, 14, 7, '#a88050'); for (let x = 1; x < 14; x += 3) g.vline(x, 3, 8, '#8a6438'); g.rect(3, 0, 8, 3, '#7a8aa8'); });
  mk('radio', 18, 16, (g) => {
    g.rect(0, 0, 18, 16, '#3a2a20'); g.ellipse(9, 6, 6, 5, '#5a4a38'); g.ellipse(9, 6, 4, 3, '#2a201a');
    g.rect(3, 12, 12, 2, '#c9a860'); g.px(14, 13, '#e0d0a0'); g.px(4, 3, '#4a3a2c');
  });
  mk('wardrobe', 36, 70, (g) => {
    g.rect(0, 4, 36, 66, '#5a3e2a'); g.rect(0, 0, 36, 5, '#4a3222'); g.rect(2, 7, 15, 58, '#6a4a32'); g.rect(19, 7, 15, 58, '#6a4a32');
    g.px(16, 36, '#c9a860'); g.px(20, 36, '#c9a860'); g.rect(4, 9, 11, 2, '#7a5a40');
  });
  mk('bed', 64, 26, (g) => {
    g.rect(0, 0, 4, 26, '#5a3e2a'); g.rect(60, 6, 4, 20, '#5a3e2a');
    g.rect(4, 10, 56, 8, '#e8e2d2'); g.rect(4, 8, 14, 6, '#f4f0e6'); g.rect(18, 8, 42, 6, '#7a8aa8'); g.hline(18, 59, 8, '#8e9ebc');
    g.rect(4, 18, 56, 3, '#4a3222'); g.rect(5, 21, 2, 5, '#4a3222'); g.rect(57, 21, 2, 5, '#4a3222');
  });
  mk('floorboard', 20, 6, (g) => { g.rect(0, 0, 20, 4, '#7a5638'); g.hline(0, 19, 0, '#946a46'); g.px(2, 2, '#3a2a1e'); g.px(17, 2, '#3a2a1e'); }, false);
  mk('floorboard_open', 20, 10, (g) => { g.rect(0, 2, 20, 6, '#1a1210'); g.rect(3, 3, 10, 3, '#d8d0b0'); g.rect(0, 0, 20, 2, '#946a46'); }, false);
  mk('doll', 8, 12, (g) => { g.ellipse(4, 3, 3, 3, '#f0d8c0'); g.rect(1, 0, 6, 2, '#c9944a'); g.rect(2, 6, 5, 6, '#4a7aa8'); g.px(3, 3, '#2a2030'); });
  mk('magazines', 14, 6, (g) => { g.rect(0, 2, 14, 4, '#e8e0c8'); g.rect(1, 0, 12, 3, '#d8d0b0'); g.hline(2, 11, 1, '#7a5a7a'); g.hline(1, 12, 4, '#a89878'); });
  mk('mannabook', 9, 6, (g) => { g.rect(0, 0, 9, 6, '#2e3a5a'); g.rect(1, 1, 7, 4, '#3a4a6e'); g.vline(0, 0, 5, '#1e2638'); g.hline(2, 6, 2, '#c9a860'); }, false);
  mk('board', 24, 34, (g) => {
    // street notice board for the winter relief collection, with a small lamp on top
    g.rect(11, 14, 2, 20, '#2a2a2e'); g.rect(0, 12, 24, 3, '#2a2a2e'); g.rect(8, 9, 8, 3, '#2a2a2e'); g.rect(9, 10, 6, 2, '#ffe6a0');
    g.rect(1, 15, 22, 12, '#5a4030'); g.rect(2, 16, 20, 10, '#c8b890'); g.rect(4, 17, 7, 8, '#a83a2e'); g.rect(13, 17, 7, 3, '#3a3a3a'); g.rect(13, 21, 7, 4, '#e8e0c8');
    g.hline(1, 22, 15, '#e8eef4');
  });
  mk('letter', 8, 5, (g) => { g.rect(0, 0, 8, 5, '#f0ead8'); g.px(3, 2, '#a89878'); g.px(4, 2, '#a89878'); });
  mk('coalbucket', 12, 12, (g) => { g.rect(1, 3, 10, 9, '#4a4a50'); g.hline(0, 11, 3, '#5a5a62'); g.rect(2, 1, 8, 3, '#1e1e22'); g.px(5, 0, '#2a2a2e'); g.rect(1, 0, 1, 3, '#5a5a62'); g.rect(10, 0, 1, 3, '#5a5a62'); });
  mk('mailbox', 10, 12, (g) => {
    g.rect(0, 2, 10, 10, '#3e5a48'); g.rect(0, 0, 10, 3, '#2e4a38'); g.rect(2, 4, 6, 1, '#141414'); g.px(4, 8, '#c9a860'); g.px(5, 8, '#c9a860');
  });
  mk('mailbox_done', 10, 12, (g) => {
    g.rect(0, 2, 10, 10, '#3e5a48'); g.rect(0, 0, 10, 3, '#2e4a38'); g.rect(2, 4, 6, 1, '#141414'); g.rect(3, 3, 4, 2, '#f0ead8'); g.px(4, 8, '#c9a860'); g.px(5, 8, '#c9a860');
  });
  mk('lamppost', 12, 84, (g) => {
    g.rect(5, 12, 2, 70, '#2a2a2e'); g.rect(3, 80, 6, 4, '#2a2a2e'); g.rect(4, 70, 4, 2, '#3a3a3e');
    g.rect(2, 2, 8, 10, '#2a2a2e'); g.rect(3, 4, 6, 7, '#ffe6a0'); g.rect(4, 5, 4, 5, '#fff4d0'); g.rect(1, 0, 10, 3, '#2a2a2e'); g.px(5, -1, '#2a2a2e');
  });
  mk('cart', 40, 22, (g) => {
    g.rect(0, 4, 32, 10, '#6a4a2e'); for (let x = 2; x < 32; x += 6) g.vline(x, 4, 13, '#5a3a24');
    g.ellipse(9, 16, 6, 6, '#3a2a1e'); g.ellipse(9, 16, 2, 2, '#6a4a2e'); g.ellipse(25, 16, 6, 6, '#3a2a1e'); g.ellipse(25, 16, 2, 2, '#6a4a2e');
    g.rect(32, 6, 8, 2, '#5a3a24'); g.hline(0, 31, 4, '#e8eef4'); g.rect(4, 0, 20, 4, '#5a5048'); g.hline(4, 23, 0, '#e8eef4');
  });
  mk('barrels', 26, 22, (g) => {
    for (const bx of [0, 13]) { g.rect(bx, 2, 12, 20, '#6a4a2e'); g.hline(bx, bx + 11, 6, '#3a3a3e'); g.hline(bx, bx + 11, 16, '#3a3a3e'); g.hline(bx, bx + 11, 2, '#e8eef4'); }
  });
  mk('bundle', 10, 6, (g) => { g.rect(0, 0, 10, 6, '#c9b98f'); g.hline(0, 9, 3, '#8f7f5a'); g.vline(5, 0, 5, '#8f7f5a'); });
  mk('coffeepot', 9, 11, (g) => {
    g.rect(1, 3, 6, 8, '#c8c4bc'); g.rect(2, 1, 4, 2, '#a8a49c'); g.px(3, 0, '#5a5650'); g.rect(7, 4, 2, 4, '#a8a49c'); g.px(0, 4, '#a8a49c');
    g.hline(1, 6, 7, '#3a5a8a');
  });
  mk('potatobin', 22, 16, (g) => {
    g.rect(0, 3, 22, 13, '#7a5a3a'); for (let x = 0; x < 22; x += 5) g.vline(x, 3, 15, '#5a3e26'); g.hline(0, 21, 9, '#5a3e26');
    for (let i = 0; i < 6; i++) g.ellipse(3 + i * 3.4, 3, 2, 1.6, '#b08a50');
  });
  mk('schoolbag', 12, 11, (g) => { g.rect(0, 2, 12, 9, '#7a4a2a'); g.rect(0, 2, 12, 4, '#8a5a36'); g.rect(5, 5, 2, 2, '#c9a860'); g.rect(3, 0, 6, 2, '#5a3a20'); });
  mk('curtain', 14, 19, (g) => { g.rect(0, 0, 14, 19, '#3a2a30'); for (let x = 1; x < 14; x += 3) g.vline(x, 0, 18, '#2e2028'); }, false);
  mk('glow', 32, 32, (g) => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5);
      if (d < 5) g.px(x, y, '#6a4a1c'); else if (d < 9) g.px(x, y, '#3e2c12'); else if (d < 13) g.px(x, y, '#22180a'); else if (d < 16 && (x + y) % 2) g.px(x, y, '#140e06');
    }
  }, false);
  mk('alert_q', 7, 9, (g) => { g.rows(0, 0, ['.kkkkk.', 'kwwwwwk', 'kwkkkwk', 'kkkkwwk', '..kwwk.', '..kwk..', '..kkk..', '..kwk..', '..kkk..'], { k: OUTLINE, w: '#f4e8a0' }); }, false);
  mk('alert_x', 7, 9, (g) => { g.rows(0, 0, ['..kkk..', '..kwk..', '..kwk..', '..kwk..', '..kwk..', '..kkk..', '..kwk..', '..kkk..', '.......'], { k: OUTLINE, w: '#ff5a4a' }); }, false);
  mk('hint', 5, 5, (g) => { g.rows(0, 0, ['..k..', '.kwk.', 'kwwwk', '.kwk.', '..k..'], { k: OUTLINE, w: '#f4e8a0' }); }, false);
  return P;
}
