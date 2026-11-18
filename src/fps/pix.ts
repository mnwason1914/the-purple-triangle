/**
 * Tiny RGBA pixel buffer used for every code-painted texture, sprite, hand and face of the
 * first-person chapters. Colours are packed ABGR (ImageData byte order on little-endian).
 */
const cache = new Map<string, number>();
export function C(hex: string): number {
  let v = cache.get(hex);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    v = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
    cache.set(hex, v);
  }
  return v;
}
/** Scale a packed colour's brightness (k: 0..2). */
export function lit(c: number, k: number): number {
  const r = Math.min(255, (c & 255) * k), g = Math.min(255, ((c >>> 8) & 255) * k), b = Math.min(255, ((c >>> 16) & 255) * k);
  return ((c & 0xff000000) | (b << 16) | (g << 8) | r) >>> 0;
}
/** Linear mix of two packed colours. */
export function mixc(a: number, b: number, t: number): number {
  const f = (s: number) => Math.round(((a >>> s) & 255) * (1 - t) + ((b >>> s) & 255) * t);
  return ((0xff << 24) | (f(16) << 16) | (f(8) << 8) | f(0)) >>> 0;
}
export function hash(x: number, y: number, s = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class Pix {
  readonly px: Uint32Array;
  constructor(readonly w: number, readonly h: number) { this.px = new Uint32Array(w * h); }

  get(x: number, y: number) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.px[y * this.w + x]; }
  set(x: number, y: number, c: number | string) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = typeof c === 'string' ? C(c) : c;
  }
  fill(c: number | string) { this.px.fill(typeof c === 'string' ? C(c) : c); return this; }
  rect(x: number, y: number, w: number, h: number, c: number | string) {
    const v = typeof c === 'string' ? C(c) : c;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, v);
  }
  hl(x0: number, x1: number, y: number, c: number | string) { for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  vl(x: number, y0: number, y1: number, c: number | string) { for (let y = y0; y <= y1; y++) this.set(x, y, c); }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number | string) {
    const v = typeof c === 'string' ? C(c) : c;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, v);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number | string) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  /** Multiply the brightness of already painted pixels in a box. */
  tint(x: number, y: number, w: number, h: number, k: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const c = this.get(i, j); if (c >>> 24) this.set(i, j, lit(c, k)); }
  }
  /** Speckle a box with colours from a palette (deterministic). */
  speckle(x: number, y: number, w: number, h: number, cols: string[], density: number, seed: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const r = hash(i, j, seed);
      if (r < density) this.set(i, j, cols[Math.floor(hash(j, i, seed + 7) * cols.length)]);
    }
  }
  /** 1px outline around filled pixels (for sprites). */
  outline(col: string) {
    const c = C(col); const add: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y) >>> 24) continue;
      if ((this.get(x - 1, y) | this.get(x + 1, y) | this.get(x, y - 1) | this.get(x, y + 1)) >>> 24) add.push(y * this.w + x);
    }
    for (const i of add) this.px[i] = c;
    return this;
  }
  /** Copy another pix in (alpha-tested). */
  blit(src: Pix, ox: number, oy: number, flip = false) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.px[y * src.w + (flip ? src.w - 1 - x : x)];
      if (c >>> 24) this.set(ox + x, oy + y, c);
    }
  }
  clone() { const p = new Pix(this.w, this.h); p.px.set(this.px); return p; }
  canvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.px);
    ctx.putImageData(img, 0, 0);
    if (scale === 1) return c;
    const s = document.createElement('canvas');
    s.width = this.w * scale; s.height = this.h * scale;
    const sx = s.getContext('2d')!;
    sx.imageSmoothingEnabled = false;
    sx.drawImage(c, 0, 0, s.width, s.height);
    return s;
  }
  static from(img: HTMLImageElement | HTMLCanvasElement, w?: number, h?: number): Pix {
    const W = w ?? img.width, H = h ?? img.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, W, H);
    const p = new Pix(W, H);
    const d = new Uint32Array(ctx.getImageData(0, 0, W, H).data.buffer);
    for (let i = 0; i < d.length; i++) p.px[i] = (d[i] >>> 24) > 127 ? (d[i] | 0xff000000) >>> 0 : 0;
    return p;
  }
}

/** 3x5 pixel digits for the status bar (0-9, ':', '/'). */
const GLYPHS: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
  ':': '000010000010000', '/': '001001010100100', '-': '000000111000000', ' ': '000000000000000',
};
export function drawText(buf: Uint32Array, W: number, H: number, x: number, y: number, s: string, col: number, scale = 1) {
  for (const ch of s) {
    const g = GLYPHS[ch];
    if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1')
      for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) {
        const px = x + i * scale + a, py = y + j * scale + b;
        if (px >= 0 && py >= 0 && px < W && py < H) buf[py * W + px] = col;
      }
    x += 4 * scale;
  }
}
