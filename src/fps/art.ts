/**
 * Code-painted art for the first-person chapters: 64x64 wall/floor textures, billboard sprites,
 * first-person hands and 24x24 faces. File names follow the chapter spec's asset manifest so a
 * hand-made PNG with the same name can replace any of them (see assets.ts).
 */
import { C, Pix, hash, lit, mixc } from './pix';

const T = 64;
const OUT = '#16100c';

// =================================================================== walls
function plaster(seed = 1, molding = true): Pix {
  const p = new Pix(T, T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const n = hash(x, y, seed), n2 = hash(x >> 2, y >> 2, seed + 3);
    let c = mixc(C('#dad1bd'), C('#c4b9a3'), n2 * 0.7);
    if (n < 0.07) c = lit(c, 0.9); else if (n > 0.96) c = lit(c, 1.05);
    if (y < 4) c = lit(c, 0.84 + y * 0.04);
    p.px[y * T + x] = c;
  }
  let x = 8 + Math.floor(hash(seed, 9) * 44), y = 6;
  for (let i = 0; i < 12; i++) { p.set(x, y, '#aa9e88'); y++; const r = hash(i, seed); x += r < 0.33 ? -1 : r < 0.66 ? 1 : 0; }
  if (molding) {
    p.rect(0, 52, T, 12, '#4c3526');
    p.hl(0, T - 1, 52, '#7a583e'); p.hl(0, T - 1, 53, '#5e4431'); p.hl(0, T - 1, 63, '#2a1d15');
    for (let i = 0; i < T; i++) if (hash(i, 77, seed) < 0.35) p.set(i, 55 + Math.floor(hash(i, 5, seed) * 7), '#3c2a1e');
    p.vl(31, 54, 62, '#30221a');
  }
  return p;
}

function framedPhoto(p: Pix) {
  p.rect(21, 13, 22, 25, '#3a2416');
  p.hl(21, 42, 13, '#5c3c26'); p.vl(21, 13, 37, '#5c3c26');
  p.rect(24, 16, 16, 19, '#bfa27c');
  for (let y = 16; y < 35; y++) for (let x = 24; x < 40; x++) if (hash(x, y, 31) < 0.12) p.set(x, y, '#a88a66');
  p.rect(24, 29, 16, 6, '#9a7e5c');
  const fig = (x: number, h: number, dress: boolean) => {
    p.ellipse(x + 0.5, 20.5 + (8 - h), 1.4, 1.6, '#5a4030');
    p.rect(x - 1, 22 + (8 - h), 3, h, dress ? '#4a3426' : '#3a2a20');
  };
  fig(26, 8, false); fig(30, 7, true); fig(34, 8, false); fig(37, 5, true);
  p.line(26, 10, 32, 6, '#2a2a2a'); p.line(32, 6, 38, 10, '#2a2a2a'); p.set(32, 6, '#6a6a6a');
}

export function wallPlaster() { return plaster(1); }
export function wallPhoto() { const p = plaster(5); framedPhoto(p); return p; }
export function wallPhotoDust() {
  const p = plaster(5);
  for (let y = 13; y < 38; y++) for (let x = 21; x < 43; x++) p.set(x, y, lit(p.get(x, y), 1.07));
  for (let x = 20; x < 44; x++) { if (hash(x, 1) < 0.8) p.set(x, 12, '#9c917c'); if (hash(x, 2) < 0.8) p.set(x, 38, '#a39882'); }
  for (let y = 12; y < 39; y++) { if (hash(y, 3) < 0.8) p.set(20, y, '#9c917c'); if (hash(y, 4) < 0.8) p.set(43, y, '#a39882'); }
  p.set(32, 6, '#6a6a6a'); p.set(32, 7, '#3a3a3a');
  return p;
}
export function wallPhotoWiped() {
  const p = plaster(5);
  for (let y = 11; y < 40; y++) for (let x = 18; x < 46; x++) if (hash(x, y, 8) < 0.25) p.set(x, y, lit(p.get(x, y), 1.03));
  p.set(32, 6, '#6a6a6a'); p.set(32, 7, '#3a3a3a');
  return p;
}
export function wallWindow() {
  const p = plaster(7);
  p.rect(14, 8, 36, 34, '#e9e3d5');
  for (let y = 10; y < 40; y++) for (let x = 16; x < 48; x++) {
    let c = mixc(C('#a9cde6'), C('#e8f1ef'), (y - 10) / 30);
    if (y > 33 && hash(x >> 1, 9) * 4 + 33 < y) c = C('#6f8a58');
    p.set(x, y, c);
  }
  p.vl(31, 10, 39, '#e9e3d5'); p.vl(32, 10, 39, '#cfc8b8'); p.hl(16, 47, 24, '#e9e3d5'); p.hl(16, 47, 25, '#cfc8b8');
  p.line(18, 12, 24, 18, '#f6fbfb'); p.line(36, 12, 41, 17, '#f6fbfb');
  p.rect(12, 41, 40, 3, '#cdc4b0'); p.hl(12, 51, 44, '#a99e88');
  for (let y = 6; y < 46; y++) for (let x = 0; x < 6; x++) {
    const c = ((x >> 1) + (y >> 1)) % 2 ? '#8e4c42' : '#a65a4e';
    p.set(10 + x - (y > 30 ? 1 : 0), y, c); p.set(48 + x + (y > 30 ? 1 : 0), y, c);
  }
  p.hl(9, 54, 6, '#5a4030');
  return p;
}
export function wallTools() {
  const p = plaster(9);
  p.rect(6, 8, 52, 34, '#7a5a3a');
  for (let y = 8; y < 42; y++) for (let x = 6; x < 58; x++) if (hash(x, y, 4) < 0.15) p.set(x, y, '#6a4c30');
  p.hl(6, 57, 8, '#94704a'); p.hl(6, 57, 41, '#4a3422');
  for (let i = 0; i < 6; i++) { const x = 11 + i * 8; p.set(x, 12, '#2a1c12'); }
  // wrenches
  for (let i = 0; i < 3; i++) { const x = 10 + i * 6; p.vl(x, 13, 26 + i * 3, '#9a9aa2'); p.vl(x + 1, 13, 26 + i * 3, '#6a6a72'); p.rect(x - 1, 12, 4, 2, '#8a8a92'); }
  // pump
  p.rect(30, 14, 3, 22, '#3a5a8a'); p.rect(29, 13, 5, 2, '#2a2a2a'); p.line(33, 35, 37, 39, '#2a2a2a');
  // rim
  p.ellipse(46.5, 25.5, 8, 8, '#8a8a90'); p.ellipse(46.5, 25.5, 6.5, 6.5, '#7a5a3a');
  for (let a = 0; a < 8; a++) p.line(46.5, 25.5, 46.5 + Math.cos(a * 0.785) * 6, 25.5 + Math.sin(a * 0.785) * 6, '#b0b0b8');
  p.set(46, 25, '#2a2a2a');
  return p;
}
export function wallKitchen() {
  const p = plaster(11, false);
  for (let y = 26; y < T; y++) for (let x = 0; x < T; x++) {
    const gx = x % 8, gy = (y - 26) % 8;
    let c = '#e6e4dc';
    if (gx === 0 || gy === 0) c = '#b4b0a6';
    else if ((gx === 4 && gy === 4) || (gx === 3 && gy === 4) || (gx === 4 && gy === 3)) c = '#4c6c9c';
    else if (hash(x, y, 12) < 0.04) c = '#f4f2ec';
    p.set(x, y, c);
  }
  p.hl(0, T - 1, 25, '#8a8070');
  return p;
}
export function wallCellar(seed = 2) {
  const p = new Pix(T, T).fill('#26262a');
  for (let row = 0; row < 8; row++) {
    const off = row % 2 ? 8 : 0;
    for (let col = -1; col < 4; col++) {
      const x0 = col * 16 + off, y0 = row * 8;
      const base = lit(C('#5c5a5e'), 0.72 + hash(col + 5, row, seed) * 0.4);
      for (let j = 1; j < 7; j++) for (let i = 1; i < 15; i++) {
        const xx = (x0 + i + T) % T;
        let c = base; const n = hash(xx, y0 + j, seed);
        if (n < 0.15) c = lit(base, 0.86); else if (n > 0.93) c = lit(base, 1.14);
        if (j === 1) c = lit(c, 1.12); if (j === 6) c = lit(c, 0.8);
        p.set(xx, y0 + j, c);
      }
    }
  }
  for (let y = 36; y < T; y++) for (let x = 0; x < T; x++) {
    const n = hash(x, y, seed + 9);
    if (n < (y - 36) / 80) p.set(x, y, n < 0.06 ? '#3a5632' : lit(p.get(x, y), 0.8));
  }
  for (let y = 0; y < 30; y++) if (hash(y, 3, seed) < 0.5) p.set(20 + Math.floor(y / 6), y, lit(p.get(20, y), 0.75));
  return p;
}
export function wallGarden(seed = 3) {
  const p = new Pix(T, T).fill('#8c8474');
  for (let row = 0; row < 7; row++) {
    const y0 = 4 + row * 6, off = row % 2 ? 8 : 0;
    for (let col = -1; col < 4; col++) {
      const base = lit(C('#9a4a36'), 0.78 + hash(col, row, seed) * 0.4);
      for (let j = 0; j < 5; j++) for (let i = 1; i < 16; i++) {
        const xx = (col * 16 + off + i + T) % T;
        let c = base; if (hash(xx, y0 + j, seed) < 0.12) c = lit(base, 0.85); if (j === 0) c = lit(c, 1.1);
        p.set(xx, y0 + j, c);
      }
    }
  }
  p.rect(0, 0, T, 4, '#9a968c'); p.hl(0, T - 1, 3, '#6a665e');
  for (let y = 46; y < T; y++) for (let x = 0; x < T; x++) {
    const blk = x < 30 ? 0 : 1;
    let c = lit(C('#8e8c88'), 0.85 + hash(blk, 1, seed) * 0.25);
    const n = hash(x, y, seed + 4); if (n < 0.2) c = lit(c, 0.8); else if (n > 0.9) c = C('#c8c4bc');
    if (x === 30 || x === 29 || y === 46) c = C('#4a4642');
    p.set(x, y, c);
  }
  return p;
}
export function wallGate() {
  const p = wallGarden(13);
  for (let y = 10; y < T; y++) for (let x = 12; x < 52; x++) {
    const plank = Math.floor((x - 12) / 8);
    let c = lit(C('#6c5038'), 0.85 + hash(plank, 3) * 0.3);
    if ((x - 12) % 8 === 0) c = C('#3a2a1c');
    if (hash(x, y, 21) < 0.1) c = lit(c, 0.85);
    p.set(x, y, c);
  }
  for (let x = 12; x < 52; x++) { const top = 10 - Math.round(Math.sin(((x - 12) / 40) * Math.PI) * 4); for (let y = top; y < 10; y++) p.set(x, y, '#6c5038'); p.set(x, top, '#8a6a4a'); }
  p.rect(12, 20, 40, 2, '#2e2e32'); p.rect(12, 50, 40, 2, '#2e2e32');
  p.rect(46, 34, 3, 4, '#2e2e32');
  return p;
}

// =================================================================== doors
export function doorFront(scratched = false) {
  const p = new Pix(T, T).fill('#3a2a1e');
  for (let y = 2; y < T; y++) for (let x = 5; x < 59; x++) {
    const plank = Math.floor((x - 5) / 13.5);
    let c = lit(C('#7c5634'), 0.86 + hash(plank, 7) * 0.24);
    if (hash(x, y >> 2, 17) < 0.18) c = lit(c, 0.88);
    if (Math.round((x - 5) % 13.5) === 0) c = C('#4a3220');
    p.set(x, y, c);
  }
  for (const yy of [14, 46]) { p.rect(5, yy, 54, 4, '#8a6440'); p.hl(5, 58, yy, '#a07850'); p.hl(5, 58, yy + 3, '#5a3e28'); }
  p.rect(2, 0, 3, T, '#2a1c14'); p.rect(59, 0, 3, T, '#2a1c14'); p.rect(2, 0, 60, 2, '#2a1c14');
  p.rect(45, 28, 7, 14, '#a8822e'); p.vl(45, 28, 41, '#d4b25a'); p.hl(45, 51, 28, '#d4b25a');
  p.rect(47, 35, 2, 4, '#1a1208'); p.set(47, 34, '#1a1208');
  p.ellipse(42, 33, 2, 2, '#c9a24a'); p.set(41, 32, '#f0d88a');
  p.rect(44, 21, 12, 4, '#4a4a50'); p.hl(44, 55, 21, '#6a6a72'); p.set(46, 23, '#9a9aa0'); p.set(53, 23, '#9a9aa0');
  if (scratched) for (let i = 0; i < 14; i++) { const x = 43 + Math.floor(hash(i, 4) * 14), y = 19 + Math.floor(hash(i, 5) * 8); p.set(x, y, '#d8b888'); p.set(x + 1, y, '#c8a878'); }
  return p;
}
export function doorBack(ajar = false) {
  const p = plaster(15);
  p.rect(12, 2, 40, 62, '#4a3a2a');
  if (ajar) {
    p.rect(14, 4, 36, 60, '#141210');
    for (let y = 4; y < 64; y++) { p.set(46, y, '#f0e6c0'); p.set(47, y, '#d8cca0'); }
    for (let y = 4; y < 64; y++) for (let x = 14; x < 44; x++) p.set(x, y, lit(C('#5c6b5a'), 0.75 + hash((x - 14) >> 3, 5) * 0.2));
    p.ellipse(45, 30, 2, 3, '#e2b994');
    return p;
  }
  for (let y = 4; y < 64; y++) for (let x = 14; x < 50; x++) {
    let c = lit(C('#5c6b5a'), 0.85 + hash((x - 14) >> 3, 5) * 0.25);
    if ((x - 14) % 9 === 0) c = C('#36402f');
    if (hash(x, y, 14) < 0.06) c = lit(c, 1.2);
    p.set(x, y, c);
  }
  p.rect(16, 30, 32, 4, '#2e2e32'); p.hl(16, 47, 30, '#5a5a62'); p.rect(40, 27, 3, 10, '#2e2e32'); p.ellipse(41.5, 26, 2, 2, '#3a3a40');
  return p;
}

// =================================================================== floors / ceilings
export function floorWood(seed = 21, creaky = false) {
  const p = new Pix(T, T);
  for (let y = 0; y < T; y++) {
    const plank = y >> 3;
    const base = lit(C('#5c402c'), 0.8 + hash(plank, 1, seed) * 0.35);
    const seam = Math.floor(hash(plank, 2, seed) * T);
    for (let x = 0; x < T; x++) {
      let c = base;
      if (hash(x >> 3, y, seed) < 0.25) c = lit(c, 0.9);
      if (hash(x, y, seed + 5) < 0.05) c = lit(c, 1.15);
      if ((y & 7) === 0) c = C('#24180f');
      if (x === seam && (y & 7) !== 0) c = C('#2c1e14');
      p.px[y * T + x] = c;
    }
  }
  if (creaky) {
    for (let y = 25; y < 32; y++) for (let x = 0; x < T; x++) p.set(x, y, lit(C('#7c5a40'), 0.9 + hash(x >> 2, y, 3) * 0.2));
    p.line(8, 27, 30, 29, '#2a1c12'); p.line(30, 29, 44, 27, '#2a1c12');
    p.hl(0, T - 1, 31, '#1a100a'); p.set(50, 28, '#b0b0b0'); p.set(14, 28, '#b0b0b0');
  }
  return p;
}
export function floorStairs() {
  const p = new Pix(T, T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const s = y & 15;
    let c = s < 11 ? lit(C('#5e4430'), 0.85 + hash(x >> 3, y >> 4, 5) * 0.25) : C('#22170f');
    if (s === 0) c = C('#8a6a4c');
    if (s < 11 && hash(x, y, 6) < 0.06) c = lit(c, 0.8);
    if (s < 11 && (x < 4 || x > 59)) c = lit(c, 0.6);
    p.px[y * T + x] = c;
  }
  return p;
}
export function floorDirt(seed = 31) {
  const p = new Pix(T, T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let c = mixc(C('#3e3024'), C('#54422e'), hash(x >> 2, y >> 2, seed));
    const n = hash(x, y, seed + 1);
    if (n < 0.04) c = C('#7a6a56'); else if (n < 0.1) c = lit(c, 0.8);
    p.px[y * T + x] = c;
  }
  return p;
}
export function floorCobble(seed = 41) {
  const p = new Pix(T, T);
  const pts: [number, number, number][] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) pts.push([i * 16 + 4 + hash(i, j, seed) * 8, j * 16 + 4 + hash(j, i, seed) * 8, hash(i, j, seed + 2)]);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let d1 = 1e9, d2 = 1e9, k = 0;
    for (const [px, py, t] of pts) for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) {
      const d = (x - px - ox) ** 2 + (y - py - oy) ** 2;
      if (d < d1) { d2 = d1; d1 = d; k = t; } else if (d < d2) d2 = d;
    }
    let c = lit(C('#8a857a'), 0.78 + k * 0.35);
    if (Math.sqrt(d2) - Math.sqrt(d1) < 2.2) c = C('#3a3630');
    else if (hash(x, y, seed) < 0.08) c = lit(c, 1.12);
    p.px[y * T + x] = c;
  }
  return p;
}
export function floorKitchen() {
  const p = new Pix(T, T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const chk = ((x >> 4) + (y >> 4)) & 1;
    let c = C(chk ? '#a0563a' : '#8a4a32');
    if ((x & 15) === 0 || (y & 15) === 0) c = C('#4e3226');
    else if (hash(x, y, 9) < 0.07) c = lit(c, 0.88);
    p.px[y * T + x] = c;
  }
  return p;
}
export function ceilWood() {
  const p = new Pix(T, T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let c = lit(C('#5e4838'), 0.85 + hash(x >> 3, 3) * 0.2);
    if ((x & 7) === 0) c = C('#3a2c22');
    if (y >= 26 && y < 34) c = (y === 26 || y === 33) ? C('#22180f') : lit(C('#3e2c1e'), 0.9 + hash(x, y, 2) * 0.15);
    p.px[y * T + x] = c;
  }
  return p;
}
export function ceilCellar() {
  const p = new Pix(T, T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let c = mixc(C('#2c2a2a'), C('#3a3634'), hash(x >> 2, y >> 2, 51));
    if (y >= 28 && y < 36) c = C('#2a1e16');
    p.px[y * T + x] = c;
  }
  return p;
}

// =================================================================== people (front billboards)
interface Look {
  skin: string; hair: string; top: string; bottom: string; dress?: boolean; scarf?: string; cap?: string; shako?: boolean;
  apron?: string; moustache?: string; armband?: boolean; child?: boolean; braids?: boolean; bag?: boolean; keys?: boolean;
  belt?: string; collar?: string; sleeves?: string;
}
export const LOOK: Record<string, Look> = {
  helena: { skin: '#e8c4a2', hair: '#6a5a50', top: '#3e3a46', bottom: '#3e3a46', dress: true, scarf: '#5e4c66', apron: '#8f8b86', collar: '#d8d0c0' },
  leni: { skin: '#f0cfb0', hair: '#c49450', top: '#9c4040', bottom: '#8a3636', dress: true, child: true, braids: true, collar: '#f2ece0' },
  leni_bag: { skin: '#f0cfb0', hair: '#c49450', top: '#9c4040', bottom: '#8a3636', dress: true, child: true, braids: true, collar: '#f2ece0', bag: true },
  otto: { skin: '#e2bea2', hair: '#8e8a86', top: '#4a4238', bottom: '#38322a', cap: '#3a342c', moustache: '#7a7570', armband: true, keys: true, belt: '#2a1e14' },
  police: { skin: '#dcb592', hair: '#4a3a2a', top: '#2c3650', bottom: '#262c3c', shako: true, belt: '#1a1612', collar: '#3a4668', moustache: '#4a3a2a' },
  police2: { skin: '#e4c0a0', hair: '#7a5a3a', top: '#2c3650', bottom: '#262c3c', shako: true, belt: '#1a1612', collar: '#3a4668' },
  paul: { skin: '#e2b994', hair: '#3b2a20', top: '#41503f', bottom: '#2f3036', collar: '#d8d2c0', sleeves: '#41503f' },
};

export function person(o: Look, frame = 0): Pix {
  if (o.child) return child(o, frame);
  const p = new Pix(24, 46);
  const legL = frame === 1 ? -1 : 0, legR = frame === 2 ? -1 : 0;
  // legs / skirt
  if (o.dress) {
    for (let y = 27; y < 39; y++) { const w = 6 + Math.floor((y - 27) / 3); p.hl(12 - w, 11 + w, y, o.bottom); }
    if (o.apron) for (let y = 21; y < 38; y++) { const w = y < 27 ? 4 : 4 + Math.floor((y - 27) / 4); p.hl(12 - w, 11 + w, y, o.apron); }
    p.rect(8, 39 + legL, 3, 3, '#4a3e38'); p.rect(13, 39 + legR, 3, 3, '#4a3e38');
    p.rect(7, 42 + legL, 4, 3, '#221a16'); p.rect(13, 42 + legR, 4, 3, '#221a16');
  } else {
    p.rect(7, 28, 5, 14 + legL, o.bottom); p.rect(12, 28, 5, 14 + legR, o.bottom);
    p.vl(12, 30, 41, lit(C(o.bottom), 0.7));
    p.rect(6, 42 + legL, 6, 3, '#1a1410'); p.rect(12, 42 + legR, 6, 3, '#1a1410');
  }
  // torso and arms
  p.rect(6, 13, 12, 15, o.top); p.hl(5, 18, 14, o.top); p.hl(5, 18, 13, o.top);
  const sl = o.sleeves ?? o.top;
  p.rect(3, 14, 3, 13 + (frame === 1 ? -1 : 0), sl); p.rect(18, 14, 3, 13 + (frame === 2 ? -1 : 0), sl);
  p.rect(3, 27 + (frame === 1 ? -1 : 0), 3, 2, o.skin); p.rect(18, 27 + (frame === 2 ? -1 : 0), 3, 2, o.skin);
  p.tint(6, 13, 2, 15, 0.85); p.tint(16, 13, 2, 15, 0.85);
  if (o.apron) { p.rect(8, 15, 8, 8, o.apron); p.hl(8, 15, 15, lit(C(o.apron), 1.1)); }
  if (o.collar) { p.set(10, 13, o.collar); p.set(13, 13, o.collar); p.set(11, 14, o.collar); p.set(12, 14, o.collar); }
  if (o.belt) p.rect(6, 25, 12, 2, o.belt);
  if (o.shako) { p.rect(11, 25, 2, 2, '#b8a050'); p.set(8, 17, '#c0c0c8'); p.set(15, 17, '#c0c0c8'); p.set(8, 21, '#c0c0c8'); p.set(15, 21, '#c0c0c8'); }
  if (o.armband) { p.rect(3, 17, 3, 3, '#b02a20'); p.set(4, 18, '#e8e0d0'); }
  if (o.keys) { p.rect(19, 29, 2, 3, '#8a8a90'); p.set(20, 32, '#b0b0b8'); p.vl(4, 28, 35, '#6a6a70'); }
  // neck & head
  p.rect(10, 11, 4, 2, lit(C(o.skin), 0.85));
  p.ellipse(12, 7, 3.7, 4.8, o.skin);
  p.set(10, 7, '#2a1e1a'); p.set(13, 7, '#2a1e1a');
  p.hl(11, 12, 10, lit(C(o.skin), 0.75));
  if (o.moustache) p.hl(10, 13, 9, o.moustache);
  if (o.scarf) {
    for (let y = 1; y < 6; y++) { const w = y < 2 ? 2 : 4; p.hl(12 - w, 11 + w, y, o.scarf); }
    p.vl(8, 4, 10, o.scarf); p.vl(15, 4, 10, o.scarf); p.hl(9, 14, 2, lit(C(o.scarf), 1.15));
    p.set(11, 12, o.scarf); p.set(12, 12, o.scarf);
  } else if (o.shako) {
    p.rect(8, 0, 8, 5, '#16161c'); p.hl(7, 16, 5, '#0e0e12'); p.rect(11, 1, 2, 2, '#c0a040');
    p.vl(8, 5, 7, o.hair); p.vl(15, 5, 7, o.hair);
  } else if (o.cap) {
    p.rect(8, 1, 8, 3, o.cap); p.hl(7, 17, 4, lit(C(o.cap), 0.7)); p.vl(8, 4, 7, o.hair); p.vl(15, 4, 7, o.hair);
  } else {
    p.hl(9, 14, 2, o.hair); p.hl(8, 15, 3, o.hair); p.vl(8, 3, 6, o.hair); p.vl(15, 3, 5, o.hair);
  }
  return p.outline(OUT);
}

function child(o: Look, frame: number): Pix {
  const p = new Pix(16, 30);
  const lL = frame === 1 ? -1 : 0, lR = frame === 2 ? -1 : 0;
  if (o.bag) { p.rect(1, 9, 14, 10, '#7a4a26'); p.hl(1, 14, 9, '#9a6236'); p.rect(2, 11, 12, 1, '#5a3418'); }
  for (let y = 18; y < 24; y++) { const w = 4 + Math.floor((y - 18) / 2); p.hl(8 - w, 7 + w, y, o.bottom); }
  p.rect(5, 24 + lL, 2, 3, '#e8d8c8'); p.rect(9, 24 + lR, 2, 3, '#e8d8c8');
  p.rect(4, 27 + lL, 3, 2, '#3a2a22'); p.rect(9, 27 + lR, 3, 2, '#3a2a22');
  p.rect(4, 10, 8, 9, o.top); p.rect(2, 11, 2, 7, o.top); p.rect(12, 11, 2, 7, o.top);
  p.rect(2, 18, 2, 1, o.skin); p.rect(12, 18, 2, 1, o.skin);
  if (o.collar) p.hl(6, 9, 10, o.collar);
  if (o.bag) { p.vl(5, 10, 17, '#5a3418'); p.vl(10, 10, 17, '#5a3418'); }
  p.ellipse(8, 5.5, 3.4, 4, o.skin);
  p.set(6, 6, '#2a1e1a'); p.set(9, 6, '#2a1e1a'); p.set(7, 8, '#b8665a'); p.set(8, 8, '#b8665a');
  p.hl(5, 10, 1, o.hair); p.hl(4, 11, 2, o.hair); p.vl(4, 2, 5, o.hair); p.vl(11, 2, 5, o.hair);
  if (o.braids) { p.vl(3, 5, 11, o.hair); p.vl(12, 5, 11, o.hair); p.set(3, 12, '#b04040'); p.set(12, 12, '#b04040'); }
  return p.outline(OUT);
}

/** Leni sitting on a stool, drawing on a slate. */
export function leniDrawing(): Pix {
  const p = new Pix(18, 26);
  p.rect(4, 19, 10, 2, '#6a4a30'); p.vl(5, 21, 25, '#4a3220'); p.vl(12, 21, 25, '#4a3220');
  const o = LOOK.leni;
  for (let y = 14; y < 20; y++) p.hl(4, 13, y, o.bottom);
  p.rect(5, 6, 8, 9, o.top);
  p.rect(5, 20, 2, 4, '#e8d8c8'); p.rect(11, 20, 2, 4, '#e8d8c8'); p.rect(4, 24, 3, 2, '#3a2a22'); p.rect(11, 24, 3, 2, '#3a2a22');
  p.rect(5, 11, 8, 5, '#2e3234'); p.hl(5, 12, 11, '#6a5038'); p.line(7, 13, 10, 14, '#d8d8d8');
  p.rect(3, 12, 2, 2, o.skin); p.rect(13, 12, 2, 2, o.skin);
  p.ellipse(9, 3, 3.3, 3.4, o.skin);
  p.set(8, 4, '#2a1e1a'); p.set(10, 4, '#2a1e1a');
  p.hl(6, 12, 0, o.hair); p.vl(5, 1, 4, o.hair); p.vl(13, 1, 4, o.hair); p.vl(4, 3, 8, o.hair); p.vl(14, 3, 8, o.hair);
  return p.outline(OUT);
}

// =================================================================== objects
export function workbench(): Pix {
  const p = new Pix(44, 22);
  p.rect(0, 0, 44, 4, '#9a7448'); p.hl(0, 43, 0, '#b88e5c'); p.hl(0, 43, 3, '#6a4c2e');
  for (let x = 0; x < 44; x++) if (hash(x, 1) < 0.2) p.set(x, 1 + Math.floor(hash(x, 2) * 2), '#82603a');
  p.rect(2, 4, 3, 18, '#6a4c2e'); p.rect(39, 4, 3, 18, '#6a4c2e');
  p.rect(5, 13, 34, 2, '#7a5a38');
  p.rect(8, 10, 6, 3, '#4a4a50'); p.rect(26, 9, 9, 4, '#3a3a40'); p.rect(30, 6, 2, 3, '#5a5a62');
  p.ellipse(18, 18, 3, 3, '#2a2a2e'); p.ellipse(18, 18, 1.5, 1.5, '#8a8a90');
  p.rect(-1, -1, 0, 0, '#000');
  p.rect(36, -2, 6, 3, '#4a4a52'); p.rect(38, 1, 2, 3, '#3a3a40');
  return p.outline(OUT);
}
export function radio(on = false): Pix {
  const p = new Pix(14, 12);
  p.rect(0, 3, 14, 9, '#6a4428'); p.ellipse(7, 4, 7, 4, '#6a4428'); p.hl(1, 12, 1, '#8a5c38');
  p.rect(2, 4, 6, 6, '#b8a07a'); for (let y = 4; y < 10; y += 2) p.hl(2, 7, y, '#8a7456');
  p.rect(9, 5, 3, 2, on ? '#ffb040' : '#5a4a30'); p.ellipse(10.5, 9, 1, 1, '#2a1a10');
  return p.outline(OUT);
}
export function bundleWT(): Pix {
  const p = new Pix(13, 8);
  for (let i = 0; i < 4; i++) { const y = 6 - i * 2; p.rect(0 + (i & 1), y, 12, 2, i % 2 ? '#e6e0cc' : '#d8d0b8'); p.hl(1, 9, y, '#6a7a92'); }
  p.vl(6, 0, 7, '#8a6a40'); p.hl(0, 12, 4, '#8a6a40');
  return p.outline(OUT);
}
export function booklets(): Pix {
  const p = new Pix(10, 8);
  const cols = ['#9a5a3a', '#4a5a7a', '#7a3a3a', '#5a6a4a'];
  for (let i = 0; i < 4; i++) { const y = 6 - i * 2; p.rect(i & 1, y, 9, 2, cols[i]); p.hl(1 + (i & 1), 7, y + 1, '#e8e0cc'); }
  return p.outline(OUT);
}
export function mimeograph(): Pix {
  const p = new Pix(16, 10);
  p.rect(0, 3, 16, 7, '#8a6a3c'); p.ellipse(8, 3.5, 6, 3, '#9a7a48');
  for (let x = 0; x < 16; x++) for (let y = 0; y < 10; y++) if (p.get(x, y) >>> 24 && hash(x, y, 3) < 0.2) p.set(x, y, '#6e5230');
  p.vl(5, 1, 9, '#d8c8a0'); p.vl(11, 1, 9, '#d8c8a0'); p.hl(0, 15, 6, '#d8c8a0');
  p.set(2, 4, '#c8a868'); p.set(13, 5, '#c8a868');
  return p.outline(OUT);
}
export function screwdriver(): Pix {
  const p = new Pix(14, 4);
  p.rect(0, 0, 6, 4, '#a8743c'); p.hl(0, 5, 0, '#c89a5c'); p.hl(6, 13, 1, '#b8b8c2'); p.hl(6, 13, 2, '#7a7a84');
  return p.outline(OUT);
}
export function coffeepot(): Pix {
  const p = new Pix(12, 14);
  for (let y = 3; y < 13; y++) { const w = 3 + Math.floor((y - 3) / 3); p.hl(6 - w, 5 + w, y, '#eceae4'); }
  p.hl(2, 9, 12, '#3c5a8a'); p.hl(3, 8, 3, '#3c5a8a'); p.rect(4, 1, 4, 2, '#eceae4'); p.set(5, 0, '#3c5a8a'); p.set(6, 0, '#3c5a8a');
  p.line(9, 8, 11, 5, '#eceae4'); p.vl(0, 6, 10, '#d8d6d0');
  p.tint(7, 4, 3, 8, 0.9);
  return p.outline(OUT);
}
export function range(): Pix {
  const p = new Pix(30, 26);
  p.rect(0, 6, 30, 20, '#232326'); p.rect(0, 5, 30, 2, '#4a4a50'); p.hl(0, 29, 5, '#6a6a72');
  p.rect(3, 10, 10, 7, '#2e2e32'); p.rect(4, 11, 8, 5, '#1a1a1c'); p.rect(5, 13, 6, 2, '#c85a20'); p.set(7, 13, '#ffa040');
  p.rect(16, 10, 11, 12, '#2e2e32'); p.hl(16, 26, 10, '#5a5a62'); p.rect(25, 15, 2, 2, '#9a8a60');
  p.rect(22, 0, 4, 5, '#2a2a2e');
  p.rect(2, 24, 3, 2, '#1a1a1c'); p.rect(25, 24, 3, 2, '#1a1a1c');
  for (let x = 1; x < 29; x += 4) p.set(x, 7, '#8a8a92');
  return p.outline(OUT);
}
export function basin(): Pix {
  const p = new Pix(20, 24);
  p.rect(2, 8, 16, 3, '#7a5a3a'); p.hl(2, 17, 8, '#9a7450'); p.vl(3, 11, 23, '#6a4c30'); p.vl(16, 11, 23, '#6a4c30'); p.hl(3, 16, 19, '#6a4c30');
  p.ellipse(10, 7, 8, 2.5, '#9aa0a6'); p.ellipse(10, 6.6, 6.5, 1.6, '#6a8aa6'); p.hl(6, 13, 6, '#a6c4dc');
  p.rect(14, 11, 4, 8, '#e6e2d6'); p.vl(14, 11, 18, '#c8c2b2'); p.set(15, 13, '#b04a40'); p.set(16, 13, '#b04a40');
  p.rect(3, 0, 4, 6, '#d8d4ca'); p.hl(3, 6, 0, '#3c5a8a'); p.set(7, 2, '#d8d4ca');
  return p.outline(OUT);
}
export function crate(state: 'full' | 'shallow' | 'deep' = 'full'): Pix {
  const p = new Pix(26, 16);
  p.rect(0, 5, 26, 11, '#6a4c30');
  for (const y of [6, 10, 14]) p.hl(0, 25, y, '#4a3420');
  p.vl(0, 5, 15, '#5a3e26'); p.vl(25, 5, 15, '#5a3e26'); p.hl(0, 25, 5, '#8a6640');
  const soil = state === 'full' ? '#4a3a2a' : state === 'shallow' ? '#2e2218' : '#3a2c1e';
  p.rect(1, 3, 24, 3, soil);
  const pot = (x: number, y: number) => { p.ellipse(x, y, 2.2, 1.6, '#a88a5a'); p.set(Math.round(x - 1), Math.round(y - 1), '#c4a878'); };
  if (state === 'full') { for (let i = 0; i < 9; i++) pot(3 + i * 2.4, 3 + (i % 2)); for (let i = 0; i < 5; i++) pot(5 + i * 4, 1.5); }
  else if (state === 'shallow') { for (let i = 0; i < 5; i++) pot(3 + i * 5, 3 + (i % 2)); for (let i = 0; i < 18; i++) p.set(2 + Math.floor(hash(i, 3) * 22), 2 + Math.floor(hash(i, 4) * 3), '#1e160e'); pot(28, 13); }
  else { for (let i = 0; i < 9; i++) pot(3 + i * 2.4, 3 + (i % 2)); for (let i = 0; i < 4; i++) pot(6 + i * 4.5, 1.5); }
  return p.outline(OUT);
}
export function bicycle(): Pix {
  const p = new Pix(36, 22);
  const wheel = (cx: number) => { p.ellipse(cx, 14, 7.5, 7.5, '#1c1c1e'); p.ellipse(cx, 14, 6.2, 6.2, '#000000'); for (let a = 0; a < 6; a++) p.line(cx, 14, cx + Math.cos(a) * 6, 14 + Math.sin(a) * 6, '#9a9aa0'); p.set(cx, 14, '#c0c0c8'); };
  wheel(8); wheel(28);
  for (let x = 0; x < 36; x++) for (let y = 0; y < 22; y++) if (p.get(x, y) === C('#000000')) p.px[y * 36 + x] = 0;
  p.line(8, 14, 16, 14, '#2a3a2a'); p.line(16, 14, 13, 6, '#2a3a2a'); p.line(13, 6, 25, 6, '#2a3a2a'); p.line(25, 6, 16, 14, '#2a3a2a'); p.line(25, 6, 28, 14, '#2a3a2a'); p.line(8, 14, 13, 6, '#2a3a2a');
  p.rect(11, 4, 5, 2, '#3a2a1e'); p.line(25, 6, 24, 2, '#3a3a3e'); p.hl(22, 27, 2, '#3a3a3e');
  return p.outline(OUT);
}
export function wheels(): Pix {
  const p = new Pix(26, 18);
  for (const [cx, cy, r] of [[7, 10, 7], [17, 9, 8], [12, 12, 6]] as const) {
    for (let a = 0; a < 64; a++) p.set(cx + Math.cos(a / 10.2) * r, cy + Math.sin(a / 10.2) * r, '#3a3a3e');
    for (let a = 0; a < 4; a++) p.line(cx, cy, cx + Math.cos(a * 0.8) * r, cy + Math.sin(a * 0.8) * r, '#7a7a80');
  }
  p.rect(0, 16, 26, 2, '#4a3a2a');
  return p.outline(OUT);
}
export function chair(): Pix {
  const p = new Pix(12, 18);
  p.rect(1, 0, 10, 2, '#6a4a30'); p.vl(1, 0, 17, '#5a3e26'); p.vl(10, 0, 17, '#5a3e26');
  p.rect(1, 9, 10, 2, '#7a5a38'); p.vl(3, 11, 17, '#5a3e26'); p.vl(8, 11, 17, '#5a3e26');
  return p.outline(OUT);
}
export function bulb(on = true): Pix {
  const p = new Pix(5, 14);
  p.vl(2, 0, 8, '#2a2a2a'); p.rect(1, 8, 3, 2, '#5a5a5a'); p.ellipse(2.5, 11.5, 2, 2.2, on ? '#fff0b8' : '#8a8a80');
  return p;
}
export function shelf(): Pix {
  const p = new Pix(22, 26);
  p.vl(0, 0, 25, '#5a3e26'); p.vl(21, 0, 25, '#5a3e26');
  for (const y of [7, 15, 23]) { p.hl(0, 21, y, '#7a5a38'); }
  for (let i = 0; i < 5; i++) { const x = 2 + i * 4; p.rect(x, 3, 3, 4, i % 2 ? '#c87a3a' : '#b84a4a'); p.hl(x, x + 2, 2, '#c8c8b8'); }
  for (let i = 0; i < 4; i++) { const x = 3 + i * 5; p.rect(x, 11, 4, 4, '#6a8a4a'); p.hl(x, x + 3, 10, '#c8c8b8'); }
  p.rect(3, 19, 15, 4, '#8a7a5a');
  return p.outline(OUT);
}
export function rag(): Pix {
  const p = new Pix(12, 10);
  p.rect(1, 1, 10, 8, '#6e6c64'); p.speckle(1, 1, 10, 8, ['#4a4844', '#3a3834'], 0.3, 4); p.set(11, 9, '#6e6c64');
  return p.outline(OUT);
}

// =================================================================== first-person hands
const SKIN = '#e2b994', CUFF = '#41503f';
export function handRight(): Pix {
  const p = new Pix(30, 26);
  for (let y = 12; y < 26; y++) { const x0 = 14 - Math.floor((y - 12) * 0.2), x1 = 26 + Math.floor((y - 12) * 0.25); p.hl(x0, Math.min(29, x1), y, y > 19 ? CUFF : SKIN); }
  p.ellipse(17, 9, 7.5, 6.5, SKIN);
  for (let i = 0; i < 4; i++) p.vl(11 + i * 3, 4, 7, lit(C(SKIN), 0.8));
  p.ellipse(9.5, 11, 2.5, 3.5, SKIN);
  p.tint(18, 10, 10, 6, 0.9);
  return p.outline(OUT);
}
export function handLeft(): Pix { const r = handRight(); const p = new Pix(r.w, r.h); p.blit(r, 0, 0, true); return p; }
export function handRag(): Pix {
  const p = new Pix(34, 34);
  p.blit(handRight(), 4, 8);
  p.rect(2, 2, 16, 14, '#6e6c64'); p.speckle(2, 2, 16, 14, ['#4a4844', '#3a3834', '#82807a'], 0.35, 9);
  for (let i = 0; i < 6; i++) p.vl(3 + i * 2, 16, 18 + (i % 3), '#5e5c56');
  return p.outline(OUT);
}
export function handScrewdriver(): Pix {
  const p = new Pix(34, 34);
  p.line(4, 2, 16, 14, '#b8b8c2'); p.line(5, 2, 17, 14, '#7a7a84');
  p.rect(14, 12, 6, 6, '#a8743c');
  p.blit(handRight(), 4, 8);
  return p.outline(OUT);
}

// =================================================================== faces (HUD + dialogue)
export interface Face {
  skin: string; hair: string; top: string; hairStyle: 'short' | 'scarf' | 'braids' | 'cap' | 'shako';
  scarf?: string; cap?: string; moustache?: string; age?: number; collar?: string;
  eyes?: number; sweat?: number; mouth?: 'calm' | 'tight' | 'bite' | 'smile' | 'open' | 'stern'; brows?: 'flat' | 'worried' | 'angry'; armband?: boolean;
}
export function face(f: Face): Pix {
  const p = new Pix(24, 24);
  p.rect(2, 19, 20, 5, f.top); p.hl(4, 19, 18, f.top);
  if (f.collar) { p.line(9, 18, 11, 21, f.collar); p.line(14, 18, 12, 21, f.collar); }
  if (f.armband) p.rect(2, 20, 3, 4, '#b02a20');
  p.rect(10, 16, 4, 3, lit(C(f.skin), 0.82));
  p.ellipse(12, 10.5, 6.2, 7.6, f.skin);
  p.rect(5, 10, 1, 3, lit(C(f.skin), 0.9)); p.rect(18, 10, 1, 3, lit(C(f.skin), 0.9));
  const ex = f.eyes ?? 0;
  for (const x of [9, 14]) { p.set(x, 10, '#f4eee6'); p.set(x + 1, 10, '#f4eee6'); p.set(x + (ex > 0 ? 1 : 0), 10, '#2a1c16'); }
  const b = f.brows ?? 'flat', hc = lit(C(f.hair), 0.8);
  if (b === 'flat') { p.hl(8, 10, 8, hc); p.hl(14, 16, 8, hc); }
  else if (b === 'worried') { p.set(8, 8, hc); p.set(9, 7, hc); p.set(10, 7, hc); p.set(14, 7, hc); p.set(15, 7, hc); p.set(16, 8, hc); }
  else { p.set(8, 7, hc); p.set(9, 7, hc); p.set(10, 8, hc); p.set(14, 8, hc); p.set(15, 7, hc); p.set(16, 7, hc); }
  p.set(12, 12, lit(C(f.skin), 0.78)); p.set(12, 13, lit(C(f.skin), 0.85));
  const m = f.mouth ?? 'calm', mc = '#8e4e42';
  if (m === 'calm') p.hl(11, 13, 15, mc);
  else if (m === 'tight') p.hl(10, 14, 15, '#6e3a32');
  else if (m === 'bite') { p.hl(10, 14, 15, '#6e3a32'); p.set(11, 16, '#f0e8e0'); p.set(12, 16, '#f0e8e0'); }
  else if (m === 'smile') { p.hl(11, 13, 15, mc); p.set(10, 14, mc); p.set(14, 14, mc); }
  else if (m === 'open') { p.rect(11, 15, 3, 2, '#4a2420'); }
  else { p.hl(10, 14, 15, '#6e3a32'); p.set(10, 16, '#6e3a32'); p.set(14, 16, '#6e3a32'); }
  if (f.moustache) p.hl(10, 14, 14, f.moustache);
  if ((f.age ?? 0) > 40) { p.set(7, 13, lit(C(f.skin), 0.85)); p.set(17, 13, lit(C(f.skin), 0.85)); p.hl(10, 14, 5, lit(C(f.skin), 0.9)); }
  if (f.hairStyle === 'scarf') {
    for (let y = 1; y < 8; y++) { const w = y < 2 ? 4 : 7; p.hl(12 - w, 11 + w, y, f.scarf!); }
    p.rect(4, 7, 2, 10, f.scarf!); p.rect(18, 7, 2, 10, f.scarf!); p.hl(7, 16, 2, lit(C(f.scarf!), 1.15));
    p.hl(9, 15, 7, lit(C(f.hair), 1)); 
  } else if (f.hairStyle === 'cap') {
    p.rect(5, 1, 14, 5, f.cap!); p.hl(4, 20, 6, lit(C(f.cap!), 0.7)); p.vl(5, 7, 10, f.hair); p.vl(18, 7, 10, f.hair);
  } else if (f.hairStyle === 'shako') {
    p.rect(6, 0, 12, 6, '#16161c'); p.hl(5, 19, 6, '#0a0a0e'); p.rect(11, 1, 3, 3, '#c0a040'); p.vl(6, 7, 10, f.hair); p.vl(17, 7, 10, f.hair);
  } else {
    p.hl(7, 16, 2, f.hair); p.hl(6, 17, 3, f.hair); p.hl(6, 17, 4, f.hair); p.vl(6, 5, 9, f.hair); p.vl(17, 5, 8, f.hair); p.hl(8, 12, 5, f.hair);
    if (f.hairStyle === 'braids') { p.rect(4, 8, 2, 10, f.hair); p.rect(18, 8, 2, 10, f.hair); p.set(4, 18, '#b04040'); p.set(19, 18, '#b04040'); }
  }
  const sw = f.sweat ?? 0;
  if (sw > 0) { p.set(17, 6, '#bfe4ff'); p.set(17, 7, '#8ec8f0'); }
  if (sw > 1) { p.set(6, 11, '#bfe4ff'); p.set(6, 12, '#8ec8f0'); p.set(16, 13, '#bfe4ff'); }
  return p.outline(OUT);
}

const PAUL: Face = { skin: '#e2b994', hair: '#3b2a20', top: '#41503f', hairStyle: 'short', collar: '#d8d2c0' };
export const FACES: Record<string, Face> = {
  paul_calm: { ...PAUL, mouth: 'calm' },
  paul_tense: { ...PAUL, mouth: 'tight', brows: 'worried', sweat: 1 },
  paul_panic: { ...PAUL, mouth: 'bite', brows: 'worried', sweat: 2 },
  helena: { skin: '#e8c4a2', hair: '#6a5a50', top: '#3e3a46', hairStyle: 'scarf', scarf: '#5e4c66', age: 51, mouth: 'tight', brows: 'worried', collar: '#d8d0c0' },
  leni: { skin: '#f0cfb0', hair: '#c49450', top: '#9c4040', hairStyle: 'braids', mouth: 'smile', collar: '#f2ece0' },
  otto: { skin: '#e2bea2', hair: '#8e8a86', top: '#4a4238', hairStyle: 'cap', cap: '#3a342c', moustache: '#7a7570', age: 55, mouth: 'stern', brows: 'angry', armband: true },
  police: { skin: '#dcb592', hair: '#4a3a2a', top: '#2c3650', hairStyle: 'shako', moustache: '#4a3a2a', mouth: 'stern', collar: '#3a4668' },
};
