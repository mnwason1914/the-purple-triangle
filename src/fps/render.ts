/**
 * Software raycaster (Wolfenstein/DOOM-era 2.5D): textured walls, per-pixel floor and ceiling
 * casting with smooth light sampling, depth-sorted billboard sprites, first-person hands and a
 * status bar. Draws into a low-resolution ImageData that CSS scales up with crisp pixels.
 */
import { C, Pix, drawText } from './pix';

export const TEXEL = 60; // sprite texels per world unit
export const WALL_H = 1.2;

export interface Sprite {
  x: number; y: number; z: number; tex: Pix; w?: number; h?: number;
  hidden?: boolean; bright?: number; /** never darker than this */ glow?: number; tag?: string;
}

export interface World {
  w: number; h: number;
  /** Wall texture of a solid cell as seen from cell (fx, fy); null = open. */
  wall(x: number, y: number, fx: number, fy: number): Pix | null;
  floor(x: number, y: number): Pix;
  /** null = open sky */
  ceil(x: number, y: number): Pix | null;
  light(x: number, y: number): number;
}

export interface Cam { x: number; y: number; a: number; pitch: number; eye: number }

export interface Hud {
  time: string; late: boolean; progress: string; face: Pix; item: Pix | null; crouch: boolean; aim: boolean; flash: number;
}

export class Renderer {
  W = 320; H = 180; VH = 150;
  proj = 160;
  plane = 1;
  private buf = new Uint32Array(1);
  private img: ImageData | null = null;
  private zbuf = new Float32Array(1);
  private wallTop = new Int16Array(1);
  private wallBot = new Int16Array(1);
  private ctx: CanvasRenderingContext2D;
  hudH = 30;
  showHud = true;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  resize(cssW: number, cssH: number) {
    const H = 180;
    const W = Math.max(240, Math.min(420, Math.round((H * cssW) / Math.max(1, cssH))));
    if (W === this.W && this.img) return;
    this.W = W; this.H = H;
    this.layout();
    this.canvas.width = W; this.canvas.height = H;
    this.img = this.ctx.createImageData(W, H);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.zbuf = new Float32Array(W);
    this.wallTop = new Int16Array(W);
    this.wallBot = new Int16Array(W);
  }
  private layout() {
    this.VH = this.showHud ? this.H - this.hudH : this.H;
    this.plane = Math.max(0.62, Math.min(1.0, (0.42 * this.W) / this.VH));
    this.proj = this.W / 2 / this.plane;
  }
  setHud(on: boolean) { if (this.showHud !== on) { this.showHud = on; this.layout(); } }

  // ----------------------------------------------------------------- scene
  render(cam: Cam, world: World, sprites: Sprite[], hands: ((r: Renderer, buf: Uint32Array) => void) | null, hud: Hud | null) {
    const { W, VH, proj, buf, zbuf } = this;
    const dirX = Math.cos(cam.a), dirY = Math.sin(cam.a);
    const plX = -dirY * this.plane, plY = dirX * this.plane;
    const hor = Math.round(VH / 2 + cam.pitch);
    const eye = cam.eye;
    const sky0 = C('#8fb4d6'), sky1 = C('#d8e6ea');

    // ---------------- walls
    for (let x = 0; x < W; x++) {
      const camX = (2 * x) / W - 1;
      const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
      let mx = Math.floor(cam.x), my = Math.floor(cam.y);
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      let sx: number, sy: number, sdx: number, sdy: number;
      if (rdx < 0) { sx = -1; sdx = (cam.x - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - cam.x) * ddx; }
      if (rdy < 0) { sy = -1; sdy = (cam.y - my) * ddy; } else { sy = 1; sdy = (my + 1 - cam.y) * ddy; }
      let side = 0, tex: Pix | null = null, guard = 0;
      while (guard++ < 96) {
        const px = mx, py = my;
        if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
        if (mx < 0 || my < 0 || mx >= world.w || my >= world.h) break;
        tex = world.wall(mx, my, px, py);
        if (tex) break;
      }
      const perp = Math.max(0.0001, side === 0 ? sdx - ddx : sdy - ddy);
      zbuf[x] = perp;
      const top = hor - ((WALL_H - eye) * proj) / perp, bot = hor + (eye * proj) / perp;
      const yt = Math.max(0, Math.ceil(top)), yb = Math.min(VH - 1, Math.floor(bot));
      if (!tex) { this.wallTop[x] = 1; this.wallBot[x] = 0; zbuf[x] = 1e9; continue; }
      this.wallTop[x] = yt; this.wallBot[x] = yb;
      let wx = side === 0 ? cam.y + perp * rdy : cam.x + perp * rdx;
      wx -= Math.floor(wx);
      let tx = Math.floor(wx * tex.w);
      if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) tx = tex.w - 1 - tx;
      const hx = cam.x + rdx * perp - rdx * 0.02, hy = cam.y + rdy * perp - rdy * 0.02;
      const L = world.light(hx, hy) * fog(perp) * (side === 1 ? 0.86 : 1);
      const k = Math.min(400, (L * 256) | 0);
      const step = tex.h / (bot - top);
      let tpos = (yt - top) * step;
      const tp = tex.px, tw = tex.w, th = tex.h;
      for (let y = yt; y <= yb; y++) {
        const ty = Math.min(th - 1, tpos | 0); tpos += step;
        buf[y * W + x] = sh(tp[ty * tw + tx], k);
      }
    }

    // ---------------- floor & ceiling
    const r0x = dirX - plX, r0y = dirY - plY, r1x = dirX + plX, r1y = dirY + plY;
    for (let y = 0; y < VH; y++) {
      const floorRow = y > hor;
      const p = floorRow ? y - hor : hor - y;
      if (p === 0) { for (let x = 0; x < W; x++) if (y < this.wallTop[x] || y > this.wallBot[x]) buf[y * W + x] = 0xff000000; continue; }
      const dist = ((floorRow ? eye : WALL_H - eye) * proj) / p;
      const stx = (dist * (r1x - r0x)) / W, sty = (dist * (r1y - r0y)) / W;
      let fx = cam.x + dist * r0x, fy = cam.y + dist * r0y;
      const fg = fog(dist);
      const skyc = mixFast(sky0, sky1, Math.min(1, y / (VH * 0.5)));
      for (let x = 0; x < W; x++, fx += stx, fy += sty) {
        if (y >= this.wallTop[x] && y <= this.wallBot[x]) continue;
        const cx = fx | 0, cy = fy | 0;
        if (cx < 0 || cy < 0 || cx >= world.w || cy >= world.h) { buf[y * W + x] = 0xff000000; continue; }
        const t = floorRow ? world.floor(cx, cy) : world.ceil(cx, cy);
        if (!t) { buf[y * W + x] = skyc; continue; }
        const tx = ((fx - cx) * t.w) | 0, ty = ((fy - cy) * t.h) | 0;
        const k = Math.min(400, (world.light(fx, fy) * fg * (floorRow ? 1 : 0.8) * 256) | 0);
        buf[y * W + x] = sh(t.px[ty * t.w + tx], k);
      }
    }

    // ---------------- sprites
    const inv = 1 / (plX * dirY - dirX * plY);
    const list: { s: Sprite; tx: number; ty: number }[] = [];
    for (const s of sprites) {
      if (s.hidden) continue;
      const rx = s.x - cam.x, ry = s.y - cam.y;
      const ty = inv * (-plY * rx + plX * ry);
      if (ty < 0.08) continue;
      list.push({ s, tx: inv * (dirY * rx - dirX * ry), ty });
    }
    list.sort((a, b) => b.ty - a.ty);
    for (const { s, tx, ty } of list) {
      const t = s.tex;
      const ww = s.w ?? t.w / TEXEL, hh = s.h ?? t.h / TEXEL;
      const scx = (W / 2) * (1 + tx / ty);
      const sw = (ww * proj) / ty, shh = (hh * proj) / ty;
      const bot = hor + ((eye - s.z) * proj) / ty, top = bot - shh;
      const x0 = scx - sw / 2;
      const xa = Math.max(0, Math.ceil(x0)), xb = Math.min(W - 1, Math.floor(x0 + sw));
      const ya = Math.max(0, Math.ceil(top)), yb = Math.min(VH - 1, Math.floor(bot));
      if (xa > xb || ya > yb) continue;
      let L = world.light(s.x, s.y) * fog(ty);
      if (s.bright) L = Math.max(L, s.bright);
      const k = Math.min(400, (L * 256) | 0);
      for (let x = xa; x <= xb; x++) {
        if (ty >= zbuf[x]) continue;
        const u = Math.min(t.w - 1, (((x - x0) / sw) * t.w) | 0);
        for (let y = ya; y <= yb; y++) {
          const v = Math.min(t.h - 1, (((y - top) / shh) * t.h) | 0);
          const c = t.px[v * t.w + u];
          if (c >>> 24) buf[y * W + x] = sh(c, k);
        }
      }
    }

    hands?.(this, buf);
    if (hud) { if (this.showHud) this.drawHud(hud); this.crosshair(hud.aim); }
    if (hud && hud.flash > 0) this.flash(hud.flash);
    this.ctx.putImageData(this.img!, 0, 0);
  }

  /** Blit a pix into screen space with integer scaling (hands, icons). */
  blit(t: Pix, x0: number, y0: number, scale: number, k = 256, maxY = this.VH) {
    const { W, buf } = this;
    for (let v = 0; v < t.h; v++) for (let u = 0; u < t.w; u++) {
      const c = t.px[v * t.w + u];
      if (!(c >>> 24)) continue;
      const cc = k === 256 ? c : sh(c, k);
      for (let j = 0; j < scale; j++) {
        const y = y0 + v * scale + j;
        if (y < 0 || y >= maxY) continue;
        for (let i = 0; i < scale; i++) { const x = x0 + u * scale + i; if (x >= 0 && x < W) buf[y * W + x] = cc; }
      }
    }
  }

  private crosshair(aim: boolean) {
    const { W, VH, buf } = this;
    const cx = W >> 1, cy = VH >> 1;
    const c = aim ? C('#ffd27a') : C('#d8d0c0');
    const r = aim ? 3 : 1;
    for (let i = -r; i <= r; i++) { if (i === 0 && !aim) continue; buf[cy * W + cx + i] = c; buf[(cy + i) * W + cx] = c; }
    if (!aim) buf[cy * W + cx] = c;
  }

  private flash(a: number) {
    const { buf, W, VH } = this;
    const k = Math.max(0, 1 - a * 0.6);
    for (let i = 0; i < W * VH; i++) { const c = buf[i]; buf[i] = (0xff000000 | (sh(c, (k * 256) | 0) & 0x00ffff00) | Math.min(255, (c & 255) + ((a * 120) | 0))) >>> 0; }
  }

  private drawHud(h: Hud) {
    const { W, H, VH, buf } = this;
    const bg = C('#2b2420'), bg2 = C('#3a302a'), edge = C('#6a5640'), dark = C('#17110d');
    for (let y = VH; y < H; y++) for (let x = 0; x < W; x++) buf[y * W + x] = (y === VH) ? edge : (y === VH + 1 ? dark : ((x + y) % 7 === 0 ? bg2 : bg));
    const box = (x: number, w: number) => {
      for (let y = VH + 3; y < H - 3; y++) for (let i = x; i < x + w; i++) {
        const e = y === VH + 3 || y === H - 4 || i === x || i === x + w - 1;
        buf[y * W + i] = e ? (y === VH + 3 || i === x ? dark : edge) : C('#1e1814');
      }
    };
    // left: clock + time + progress
    box(4, 92);
    const cx = 16, cy = VH + 15;
    for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; buf[Math.round(cy + Math.sin(t) * 8) * W + Math.round(cx + Math.cos(t) * 8)] = C('#c8b896'); }
    for (let r = 0; r < 6; r++) buf[(cy - r) * W + cx] = C('#e8dcc0');
    const sec = Date.now() / 1000;
    for (let r = 0; r < 6; r++) buf[Math.round(cy + Math.sin(sec * 1.2) * r) * W + Math.round(cx + Math.cos(sec * 1.2) * r)] = C('#e86a50');
    drawText(buf, W, H, 28, VH + 8, h.time, h.late ? C('#ff7a5a') : C('#ffd27a'), 2);
    drawText(buf, W, H, 68, VH + 11, h.progress, C('#d8c8f0'), 1);
    // centre: face
    const fx = (W >> 1) - 15;
    box(fx, 30);
    this.blit(h.face, fx + 3, VH + 4, 1, 256, H);
    // right: held item + posture
    box(W - 64, 40);
    if (h.item) {
      const s = h.item.w > 18 ? 1 : 2;
      this.blit(h.item, W - 44 - ((h.item.w * s) >> 1), VH + 15 - ((h.item.h * s) >> 1), s, 256, H);
    }
    box(W - 22, 18);
    const pc = C('#b8a8d8');
    const gx = W - 13;
    if (h.crouch) { for (let i = 0; i < 4; i++) buf[(VH + 18) * W + gx - 2 + i] = pc; buf[(VH + 15) * W + gx] = pc; buf[(VH + 16) * W + gx] = pc; buf[(VH + 17) * W + gx] = pc; buf[(VH + 21) * W + gx - 2] = pc; buf[(VH + 21) * W + gx + 2] = pc; buf[(VH + 20) * W + gx - 1] = pc; buf[(VH + 20) * W + gx + 1] = pc; }
    else { buf[(VH + 8) * W + gx] = pc; for (let y = VH + 10; y < VH + 18; y++) buf[y * W + gx] = pc; for (let i = -2; i <= 2; i++) buf[(VH + 12) * W + gx + i] = pc; for (let j = 0; j < 4; j++) { buf[(VH + 18 + j) * W + gx - 1 - (j >> 1)] = pc; buf[(VH + 18 + j) * W + gx + 1 + (j >> 1)] = pc; } }
  }
}

function fog(d: number) { return 1 / (1 + d * 0.07); }

/** Multiply a packed colour by k/256 (k up to ~400 brightens). */
function sh(c: number, k: number): number {
  let r = ((c & 255) * k) >> 8, g = (((c >>> 8) & 255) * k) >> 8, b = (((c >>> 16) & 255) * k) >> 8;
  if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}
function mixFast(a: number, b: number, t: number) {
  const f = (s: number) => (((a >>> s) & 255) * (1 - t) + ((b >>> s) & 255) * t) | 0;
  return (0xff000000 | (f(16) << 16) | (f(8) << 8) | f(0)) >>> 0;
}
