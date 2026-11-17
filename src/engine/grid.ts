/**
 * Pixel grid painter. Art is composed as shapes into a colour grid, then an automatic outline
 * pass is applied and the result is blitted into the atlas. Keeps code-generated art clean.
 */
export class Grid {
  readonly c: (string | null)[];
  constructor(readonly w: number, readonly h: number) {
    this.c = new Array(w * h).fill(null);
  }
  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.c[y * this.w + x];
  }
  px(x: number, y: number, col: string | null) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.c[y * this.w + x] = col;
  }
  rect(x: number, y: number, w: number, h: number, col: string | null) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col);
  }
  /** Only paint over pixels that are already filled. */
  paintOver(x: number, y: number, w: number, h: number, col: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (this.get(x + i, y + j)) this.px(x + i, y + j, col);
  }
  hline(x0: number, x1: number, y: number, col: string) { for (let x = x0; x <= x1; x++) this.px(x, y, col); }
  vline(x: number, y0: number, y1: number, col: string) { for (let y = y0; y <= y1; y++) this.px(x, y, col); }
  ellipse(cx: number, cy: number, rx: number, ry: number, col: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, col);
      }
  }
  /** Rows of characters mapped through a palette ('.' = skip). */
  rows(x: number, y: number, rows: string[], pal: Record<string, string>) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') this.px(x + i, y + j, pal[r[i]] ?? null); });
  }
  /** 1px outline around every filled region (4-neighbour), drawn into empty pixels. */
  outline(col: string, diagonal = false) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1) ||
          (diagonal && (this.get(x - 1, y - 1) || this.get(x + 1, y - 1) || this.get(x - 1, y + 1) || this.get(x + 1, y + 1)));
        if (n) add.push(y * this.w + x);
      }
    for (const i of add) this.c[i] = col;
  }
  /** Mirror horizontally into a new grid. */
  flipped(): Grid {
    const g = new Grid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.c[y * this.w + x] = this.get(this.w - 1 - x, y);
    return g;
  }
  blit(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const col = this.c[y * this.w + x];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
  }
}

export function hash2(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Shift a #rrggbb colour lighter (+) or darker (-). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
