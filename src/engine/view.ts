import * as THREE from 'three';

export const VIEW_MIN_H = 144;
export const VIEW_MIN_W = 240;
const MAX_DPR = 2;

/** Renderer + orthographic camera with integer pixel scaling (art stays crisp on every screen). */
export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
  scale = 1;
  dpr = 1;
  dw = 1;
  dh = 1;
  w = VIEW_MIN_W;
  h = VIEW_MIN_H;
  saver = false;
  private listeners: (() => void)[] = [];

  constructor(readonly canvas: HTMLCanvasElement, readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'default', stencil: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x0c0a10);
    new ResizeObserver(() => this.resize()).observe(host);
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    this.resize();
  }

  onResize(cb: () => void) { this.listeners.push(cb); }

  resize() {
    const r = this.host.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.saver ? 1.5 : MAX_DPR);
    this.dw = Math.round(r.width * this.dpr);
    this.dh = Math.round(r.height * this.dpr);
    this.scale = Math.max(1, Math.floor(Math.min(this.dh / VIEW_MIN_H, this.dw / VIEW_MIN_W)));
    this.renderer.setSize(this.dw, this.dh, false);
    this.w = this.dw / this.scale;
    this.h = this.dh / this.scale;
    const l = Math.floor(this.dw / 2), b = Math.floor(this.dh / 2);
    const c = this.camera;
    c.left = -l / this.scale; c.right = (this.dw - l) / this.scale;
    c.bottom = -b / this.scale; c.top = (this.dh - b) / this.scale;
    c.updateProjectionMatrix();
    for (const cb of this.listeners) cb();
  }

  /** Camera position is always whole world pixels. */
  setCamera(x: number, y: number) {
    this.camera.position.set(Math.round(x), Math.round(y), 100);
  }

  get left() { return this.camera.position.x + this.camera.left; }
  get bottom() { return this.camera.position.y + this.camera.bottom; }

  worldToCss(x: number, y: number) {
    const l = Math.floor(this.dw / 2), b = Math.floor(this.dh / 2);
    return {
      x: ((x - this.camera.position.x) * this.scale + l) / this.dpr,
      y: (this.dh - ((y - this.camera.position.y) * this.scale + b)) / this.dpr,
    };
  }
}
