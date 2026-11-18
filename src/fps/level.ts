/**
 * The Wagner house in Thalheim: bicycle workshop, kitchen, cellar stairs, cellar and front yard.
 * One character per cell. Walls: P plaster, H photo wall, W window, T tool board, K kitchen tiles,
 * S cellar stone, G garden wall, g gate, F front door, B back door.
 * Floors: . wood, , creaking boards, k kitchen, s stairs, c cellar earth, y yard cobbles.
 */
import { ART } from './assets';
import type { Pix } from './pix';
import type { World } from './render';

const MAP = [
  'SSSSSSSSPPPPPPPPP',
  'SccccccSPPPPPPPPP',
  'SccccccSPPPPPPPPP',
  'SccccccSPPPPPPPPP',
  'SSSsSSSSPPPPPPPPP',
  'PTPsPHPPWPPPPPPPP',
  'PT.......PKKKKPPP',
  'PP...,...PkkkkKPP',
  'PW..,,,...kkkkBPP',
  'PP...,...PkkkkKPP',
  'PP.......PKKWKPPP',
  'PPPPPFPPPPPPPPPPP',
  'GyyyyyyyyyGPPPPPP',
  'GyyyyyyyyyGPPPPPP',
  'GGGGGgGGGGGPPPPPP',
  'PPPPPPPPPPPPPPPPP',
];

export type Region = 'workshop' | 'kitchen' | 'stairs' | 'cellar' | 'yard' | 'door' | 'wall';
const AMBIENT: Record<Region, number> = { workshop: 0.42, kitchen: 0.42, stairs: 0.28, cellar: 0.24, yard: 1.08, door: 0.55, wall: 0 };
const R = 2; // light samples per cell

interface Light { id: string; x: number; y: number; i: number; r: number }

export class Level implements World {
  readonly w = MAP[0].length;
  readonly h = MAP.length;
  private cells = MAP.map((r) => r.split(''));
  photo: 'hung' | 'dust' | 'wiped' | 'hidden' = 'hung';
  frontOpen = false;
  frontScratched = false;
  backAjar = false;
  private lights: Light[] = [
    { id: 'winW', x: 2.3, y: 8.5, i: 0.75, r: 4.5 },
    { id: 'winN', x: 8.5, y: 6.3, i: 0.7, r: 4.5 },
    { id: 'bulb', x: 5.5, y: 8.3, i: 0.45, r: 4 },
    { id: 'winK', x: 12.5, y: 9.7, i: 0.75, r: 3.6 },
    { id: 'stair', x: 3.5, y: 5.6, i: 0.28, r: 2.4 },
    { id: 'grate', x: 5.6, y: 1.3, i: 0.42, r: 3.6 },
    { id: 'cellarBulb', x: 2.8, y: 2.0, i: 0.5, r: 2.8 },
  ];
  private grid = new Float32Array((this.w * R + 1) * (this.h * R + 1));

  constructor() { this.relight(); }

  char(x: number, y: number) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 'P' : this.cells[y][x]; }
  solid(x: number, y: number) {
    const c = this.char(Math.floor(x), Math.floor(y));
    if (c === 'F') return !this.frontOpen;
    return !'.,ksyc'.includes(c);
  }
  region(x: number, y: number): Region {
    const c = this.char(Math.floor(x), Math.floor(y));
    if (c === '.' || c === ',') return 'workshop';
    if (c === 'k') return 'kitchen';
    if (c === 's') return 'stairs';
    if (c === 'c') return 'cellar';
    if (c === 'y') return 'yard';
    if (c === 'F' && this.frontOpen) return 'door';
    return 'wall';
  }
  /** Footstep loudness multiplier of a cell (creaking boards and stairs). */
  noiseCoef(x: number, y: number) {
    const c = this.char(Math.floor(x), Math.floor(y));
    let k = c === ',' || c === 's' ? 2.5 : 1;
    if (Math.hypot(x - 5.5, y - 10.6) < 2.2) k *= 1.5;
    return k;
  }

  wall(x: number, y: number, fx: number, fy: number): Pix | null {
    const c = this.cells[y][x];
    const from = this.region(fx + 0.5, fy + 0.5);
    switch (c) {
      case 'P': return from === 'yard' ? ART.tex_wall_facade : from === 'stairs' || from === 'cellar' ? ART.tex_wall_cellar : ART.tex_wall_plaster;
      case 'H': return from === 'workshop' ? ART[`tex_wall_photo${this.photo === 'dust' ? '_dust' : this.photo === 'wiped' ? '_wiped' : ''}`] : ART.tex_wall_plaster;
      case 'W': return ART.tex_wall_window;
      case 'T': return ART.tex_wall_tools;
      case 'K': return from === 'kitchen' ? ART.tex_wall_kitchen : ART.tex_wall_plaster;
      case 'S': return ART.tex_wall_cellar;
      case 'G': return ART.tex_wall_garden;
      case 'g': return ART.tex_wall_gate;
      case 'F': return this.frontOpen ? null : this.frontScratched && from !== 'yard' ? ART.tex_door_front_scratched : ART.tex_door_front;
      case 'B': return this.backAjar ? ART.tex_door_back_ajar : ART.tex_door_back;
      default: return null;
    }
  }
  floor(x: number, y: number): Pix {
    switch (this.cells[y][x]) {
      case ',': return ART.tex_floor_creak;
      case 'k': return ART.tex_floor_kitchen;
      case 's': return ART.tex_floor_stairs;
      case 'c': return ART.tex_floor_dirt;
      case 'y': return ART.tex_floor_cobble;
      default: return ART.tex_floor_wood;
    }
  }
  ceil(x: number, y: number): Pix | null {
    const c = this.cells[y][x];
    if (c === 'y' || 'Gg'.includes(c)) return null;
    if (c === 's' || c === 'c' || c === 'S') return ART.tex_ceil_cellar;
    return ART.tex_ceil_wood;
  }

  setFront(open: boolean) { this.frontOpen = open; this.setLight('door', open ? { x: 5.5, y: 10.7, i: 0.95, r: 4.6 } : null); }
  setBack(ajar: boolean) { this.backAjar = ajar; this.setLight('back', ajar ? { x: 13.7, y: 8.5, i: 0.6, r: 3 } : null); }
  private setLight(id: string, l: Omit<Light, 'id'> | null) {
    this.lights = this.lights.filter((q) => q.id !== id);
    if (l) this.lights.push({ id, ...l });
    this.relight();
  }

  private blocked(ax: number, ay: number, bx: number, by: number) {
    const d = Math.hypot(bx - ax, by - ay);
    const n = Math.ceil(d / 0.2);
    for (let i = 1; i < n - 1; i++) {
      const x = ax + ((bx - ax) * i) / n, y = ay + ((by - ay) * i) / n;
      if (this.region(x, y) === 'wall') return true;
    }
    return false;
  }

  private relight() {
    const GW = this.w * R + 1;
    for (let j = 0; j <= this.h * R; j++) for (let i = 0; i <= this.w * R; i++) {
      const x = i / R, y = j / R;
      let amb = 0, ox = x, oy = y;
      for (const [dx, dy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
        const r = this.region(x + dx, y + dy);
        if (AMBIENT[r] > amb) { amb = AMBIENT[r]; ox = x + dx; oy = y + dy; }
      }
      let L = amb;
      if (amb > 0) for (const l of this.lights) {
        const d = Math.hypot(ox - l.x, oy - l.y);
        if (d >= l.r) continue;
        if (this.blocked(l.x, l.y, ox, oy)) continue;
        const f = 1 - d / l.r;
        L += l.i * f * f;
      }
      this.grid[j * GW + i] = Math.min(1.5, L);
    }
  }

  light(x: number, y: number): number {
    const GW = this.w * R + 1;
    const gx = Math.max(0, Math.min(this.w * R - 0.001, x * R)), gy = Math.max(0, Math.min(this.h * R - 0.001, y * R));
    const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy;
    const g = this.grid, o = iy * GW + ix;
    const a = g[o] + (g[o + 1] - g[o]) * fx, b = g[o + GW] + (g[o + GW + 1] - g[o + GW]) * fx;
    return a + (b - a) * fy;
  }
}
