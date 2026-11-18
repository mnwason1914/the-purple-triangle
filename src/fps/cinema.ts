/**
 * The chapter's two short cuts (opening street, closing gate). If the manifest lists a video
 * (cut_1_intro.mp4 / cut_1_outro.mp4, e.g. made with Google Flow) it plays; otherwise a painted
 * pixel-art shot is animated for the same four seconds. Tap skips after one second.
 */
import { VIDEOS } from './assets';
import { C, Pix, hash, lit, mixc } from './pix';
import * as A from './art';

const W = 320, H = 180;

function play(draw: (ctx: CanvasRenderingContext2D, t: number) => void, secs: number): Promise<void> {
  const cv = document.getElementById('cine') as HTMLCanvasElement;
  cv.width = W; cv.height = H; cv.hidden = false;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return new Promise((done) => {
    const t0 = performance.now();
    let skip = false;
    const onTap = () => { if (performance.now() - t0 > 1000) skip = true; };
    cv.addEventListener('pointerdown', onTap);
    const step = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= secs || skip) { cv.removeEventListener('pointerdown', onTap); cv.hidden = true; done(); return; }
      draw(ctx, t / secs);
      requestAnimationFrame(step);
    };
    step();
  });
}

function video(file: string): Promise<boolean> {
  if (!VIDEOS.has(file)) return Promise.resolve(false);
  const v = document.getElementById('cine-video') as HTMLVideoElement;
  return new Promise((done) => {
    let t0 = 0;
    const finish = (ok: boolean) => { v.pause(); v.hidden = true; v.onended = v.onerror = null; v.removeEventListener('pointerdown', tap); done(ok); };
    const tap = () => { if (performance.now() - t0 > 1000) finish(true); };
    v.src = `assets/ch1/${file}`;
    v.hidden = false;
    v.onended = () => finish(true);
    v.onerror = () => finish(false);
    v.addEventListener('pointerdown', tap);
    t0 = performance.now();
    v.play().catch(() => finish(false));
  });
}

// ------------------------------------------------------------------ intro: Thalheim street
let introArt: HTMLCanvasElement | null = null;
function paintStreet(): HTMLCanvasElement {
  const p = new Pix(440, H);
  for (let y = 0; y < 90; y++) p.hl(0, 439, y, mixc(C('#7fa8d4'), C('#d4e4ea'), y / 90));
  // far mountains
  for (let x = 0; x < 440; x++) {
    const m = 54 + Math.sin(x * 0.021) * 10 + Math.sin(x * 0.057 + 1) * 5;
    for (let y = Math.floor(m); y < 92; y++) p.set(x, y, mixc(C('#8a9cb4'), C('#a8b6c4'), (y - m) / 40));
    const g = 72 + Math.sin(x * 0.04 + 2) * 5;
    for (let y = Math.floor(g); y < 96; y++) p.set(x, y, hash(x, y) < 0.1 ? '#4a6a3a' : '#5c7c46');
    if (hash(x, 3) < 0.12) for (let j = 0; j < 7; j++) p.hl(x - (j >> 1), x + (j >> 1), Math.floor(g) - 7 + j, '#2e4a2c');
  }
  // neighbour houses (left)
  const house = (x0: number, w: number, wallC: string, roofC: string) => {
    p.rect(x0, 62, w, 54, wallC);
    for (let i = 0; i < w; i += 9) p.vl(x0 + i, 62, 115, '#5a3e2a');
    p.hl(x0, x0 + w - 1, 80, '#5a3e2a'); p.hl(x0, x0 + w - 1, 98, '#5a3e2a');
    for (let j = 0; j < 22; j++) p.hl(x0 - 4 + j, x0 + w + 3 - j, 62 - j, j % 3 ? roofC : lit(C(roofC), 0.8));
    for (let i = 6; i < w - 8; i += 16) { p.rect(x0 + i, 84, 7, 10, '#3a4a5a'); p.rect(x0 + i, 84, 7, 1, '#e8e0d0'); }
  };
  house(6, 70, '#e4d8bc', '#9a4a32');
  house(92, 58, '#ddd0b2', '#8a4432');
  // the workshop: brick, sign with wheel
  const wx = 200, ww = 150;
  for (let y = 54; y < 122; y++) for (let x = wx; x < wx + ww; x++) {
    const row = Math.floor((y - 54) / 4), off = row % 2 ? 4 : 0;
    let c = lit(C('#9a4a36'), 0.8 + hash(Math.floor((x + off) / 8), row) * 0.35);
    if ((y - 54) % 4 === 0 || (x + off) % 8 === 0) c = C('#7a6a5a');
    p.set(x, y, c);
  }
  for (let j = 0; j < 26; j++) p.hl(wx - 6 + j, wx + ww + 5 - j, 54 - j, j % 3 ? '#6a3a2a' : '#5a3022');
  p.rect(wx + 20, 64, 110, 14, '#3a2a1c'); p.rect(wx + 22, 66, 106, 10, '#e8dcc0');
  for (let i = 0; i < 9; i++) p.rect(wx + 30 + i * 11, 68, 7, 6, '#3a2a1c');
  p.ellipse(wx + 75, 50, 9, 9, '#2a2a2e'); p.ellipse(wx + 75, 50, 7, 7, '#c8b890');
  for (let a = 0; a < 8; a++) p.line(wx + 75, 50, wx + 75 + Math.cos(a * 0.785) * 7, 50 + Math.sin(a * 0.785) * 7, '#4a4a50');
  p.rect(wx + 60, 86, 30, 36, '#5a3c24'); p.vl(wx + 75, 86, 121, '#3a2614'); p.rect(wx + 84, 102, 3, 4, '#c8a040');
  for (const ox of [16, 104]) { p.rect(wx + ox, 88, 22, 20, '#e8e2d4'); p.rect(wx + ox + 2, 90, 18, 16, '#9ac0d8'); p.vl(wx + ox + 11, 90, 105, '#e8e2d4'); p.hl(wx + ox + 2, wx + ox + 19, 97, '#e8e2d4'); }
  // garden wall + gate posts
  for (let x = 150; x < 200; x++) for (let y = 104; y < 124; y++) p.set(x, y, ((x >> 3) + (y >> 2)) % 2 ? '#9a4a36' : '#8a4232');
  for (let x = 350; x < 440; x++) for (let y = 104; y < 124; y++) p.set(x, y, ((x >> 3) + (y >> 2)) % 2 ? '#9a4a36' : '#8a4232');
  p.rect(352, 96, 10, 28, '#8e8c88'); p.rect(350, 94, 14, 3, '#a8a6a0');
  // street
  for (let y = 122; y < H; y++) for (let x = 0; x < 440; x++) {
    const s = Math.floor(x / (6 + (y - 122) / 6)) + Math.floor(y / 4) * 3;
    let c = lit(C('#8a857a'), 0.75 + hash(s, y >> 2) * 0.35);
    if (y % 4 === 0) c = C('#4a4640');
    p.set(x, y, c);
  }
  // noon shadows under eaves
  for (let x = 0; x < 440; x++) for (let y = 122; y < 128; y++) p.set(x, y, lit(p.get(x, y), 0.7));
  // bicycle leaning on the wall
  const bike = A.bicycle(); p.blit(bike, wx + 100, 104);
  introArt = p.canvas();
  return introArt;
}

export async function intro() {
  if (await video('cut_1_intro.mp4')) return;
  const art = introArt ?? paintStreet();
  await play((ctx, t) => {
    const e = t * t * (3 - 2 * t);
    const zoom = 1 + e * 0.35;
    const sw = W / zoom, sh = H / zoom;
    const sx = e * (440 - W) * 0.9 + (W - sw) * e * 0.8;
    const sy = (H - sh) * 0.75;
    ctx.drawImage(art, sx, sy, sw, sh, 0, 0, W, H);
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 1 - t * 4) * 0.9 + Math.max(0, t - 0.85) * 6})`;
    ctx.fillRect(0, 0, W, H);
  }, 4);
}

// ------------------------------------------------------------------ outro: Leni at the gate
export async function outro(withBag: boolean) {
  if (withBag && await video('cut_1_outro.mp4')) return;
  const base = new Pix(W, H);
  for (let y = 0; y < H; y++) base.hl(0, W - 1, y, mixc(C('#e8b870'), C('#b06a40'), y / H));
  for (let y = 120; y < H; y++) for (let x = 0; x < W; x++) {
    let c = lit(C('#9a8268'), 0.7 + hash(Math.floor(x / 9) + Math.floor(y / 5) * 7, 3) * 0.35);
    if (y % 5 === 0 || (x + (y / 5 | 0) * 4) % 9 === 0) c = C('#4a3a2c');
    base.set(x, y, c);
  }
  for (let y = 10; y < 132; y++) for (let x = 38; x < 92; x++) base.set(x, y, lit(C('#8e8a82'), 0.8 + hash(x >> 3, y >> 3) * 0.3));
  base.rect(32, 6, 66, 8, '#a8a49c');
  for (let y = 40; y < 120; y++) for (let x = 92; x < W; x++) base.set(x, y, ((x >> 3) + (y >> 2)) % 2 ? '#8a4a36' : '#7a4232');
  const kid = A.person(withBag ? A.LOOK.leni_bag : A.LOOK.leni);
  const big = new Pix(kid.w * 4, kid.h * 4);
  for (let y = 0; y < big.h; y++) for (let x = 0; x < big.w; x++) big.px[y * big.w + x] = kid.px[(y >> 2) * kid.w + (x >> 2)];
  // smile looking up
  big.rect(26, 30, 12, 4, '#f0cfb0'); big.rect(27, 32, 10, 2, '#b8665a'); big.rect(25, 30, 2, 2, '#b8665a'); big.rect(37, 30, 2, 2, '#b8665a');
  const bc = big.canvas(), bg = base.canvas();
  await play((ctx, t) => {
    ctx.drawImage(bg, 0, 0);
    ctx.fillStyle = 'rgba(40,20,10,0.35)';
    ctx.beginPath(); ctx.ellipse(150 + t * 30, 168, 40 + t * 40, 6, 0, 0, Math.PI * 2); ctx.fill();
    const sway = Math.sin(t * 9) > 0 ? 1 : 0;
    ctx.drawImage(bc, 118 + sway, H - bc.height - 4);
    ctx.fillStyle = `rgba(255,190,110,${0.12 + Math.sin(t * 3) * 0.03})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 1 - t * 5) + Math.max(0, t - 0.8) * 5})`;
    ctx.fillRect(0, 0, W, H);
  }, 4);
}
