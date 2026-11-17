import * as THREE from 'three';
import type { Grid } from './grid';

export interface Frame { w: number; h: number; u0: number; v0: number; u1: number; v1: number }

/** Shelf-packed texture atlas filled at boot from code-painted grids. */
export class Atlas {
  readonly texture: THREE.CanvasTexture;
  readonly material: THREE.MeshBasicMaterial;
  readonly glowMaterial: THREE.MeshBasicMaterial;
  private frames = new Map<string, Frame>();
  private ctx: CanvasRenderingContext2D;
  private cx = 1;
  private cy = 1;
  private rowH = 0;
  readonly canvas: HTMLCanvasElement;

  constructor(readonly size = 1024) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, alphaTest: 0.5 });
    this.glowMaterial = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  }

  has(name: string) { return this.frames.has(name); }

  frame(name: string): Frame {
    const f = this.frames.get(name);
    if (!f) throw new Error(`missing frame "${name}"`);
    return f;
  }

  add(name: string, g: Grid) {
    if (this.frames.has(name)) return;
    const { w, h } = g;
    if (this.cx + w + 1 > this.size) { this.cx = 1; this.cy += this.rowH + 1; this.rowH = 0; }
    if (this.cy + h + 1 > this.size) throw new Error('atlas full');
    const x = this.cx, y = this.cy;
    this.cx += w + 1;
    this.rowH = Math.max(this.rowH, h);
    g.blit(this.ctx, x, y);
    const e = 0.01, s = this.size;
    this.frames.set(name, { w, h, u0: (x + e) / s, u1: (x + w - e) / s, v0: 1 - (y + h - e) / s, v1: 1 - (y + e) / s });
  }

  /** Call after all add() calls of a batch so the GPU copy is refreshed. */
  commit() { this.texture.needsUpdate = true; }

  /** Data URL of one frame (for DOM UI such as dialogue portraits). */
  dataURL(name: string): string {
    const f = this.frame(name);
    const c = document.createElement('canvas');
    c.width = f.w; c.height = f.h;
    const x = Math.round(f.u0 * this.size), y = Math.round((1 - f.v1) * this.size);
    c.getContext('2d')!.drawImage(this.canvas, x, y, f.w, f.h, 0, 0, f.w, f.h);
    return c.toDataURL();
  }
}
