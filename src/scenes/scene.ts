import * as THREE from 'three';
import type { Actor } from '../characters/actor';
import type { Atlas } from '../engine/atlas';
import type { Grid } from '../engine/grid';
import type { Light } from '../engine/lighting';
import { Sprite } from '../engine/sprite';
import type { Ambience } from '../audio/audio';
import { BG_H, FLOOR_ROW } from './env';

export interface Hotspot {
  id: string;
  x: number;
  /** half-width of the activation zone */
  r: number;
  verb: string; // button label: 조사, 대화, 숨기, 넣기, 열기, 나가기...
  enabled?: () => boolean;
  /** seconds the button must be held (0 = tap) */
  hold?: number;
  /** show a small diamond marker above it */
  marker?: boolean;
  markerY?: number;
  use: () => void | Promise<void>;
}

export type Floor = 'wood' | 'stone' | 'snow';

/** One walkable location. Owns its meshes so it can be disposed on exit (keeps memory flat). */
export class Scene {
  readonly group = new THREE.Group();
  readonly props = new Map<string, Sprite>();
  readonly actors = new Map<string, Actor>();
  hotspots: Hotspot[] = [];
  lights: Light[] = [];
  darkness = 0;
  ambience: Ambience = 'room';
  minX = 8;
  maxX: number;
  camY = 56;
  onUpdate: ((dt: number) => void) | null = null;
  private textures: THREE.Texture[] = [];

  constructor(readonly id: string, readonly width: number, readonly floor: Floor, private atlas: Atlas) {
    this.maxX = width - 8;
  }

  /** Large painted backdrop as its own texture (bottom of grid = world y -(BG_H-FLOOR_ROW)). */
  backdrop(g: Grid, x = 0, z = -50, parallax = 0) {
    const c = document.createElement('canvas');
    c.width = g.w; c.height = g.h;
    g.blit(c.getContext('2d')!, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    if (parallax) t.wrapS = THREE.RepeatWrapping;
    this.textures.push(t);
    const geo = new THREE.PlaneGeometry(g.w, g.h);
    geo.translate(g.w / 2, g.h / 2, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5 }));
    m.position.set(x, -(BG_H - FLOOR_ROW), z);
    this.group.add(m);
    return m;
  }

  prop(id: string, frame: string, x: number, y = 0, z = -10, flip = false, material?: THREE.Material, anchor: 'bottom' | 'center' = 'bottom') {
    const s = new Sprite(this.atlas, frame, z, material ?? this.atlas.material, anchor);
    s.set(frame, flip);
    s.place(x, y);
    this.group.add(s.mesh);
    this.props.set(id, s);
    return s;
  }

  addActor(id: string, a: Actor, x: number, facing = 1) {
    a.x = x;
    a.facing = facing;
    this.actors.set(id, a);
    this.group.add(a.sprite.mesh);
    return a;
  }

  removeActor(id: string) {
    const a = this.actors.get(id);
    if (!a) return;
    this.group.remove(a.sprite.mesh);
    this.actors.delete(id);
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    for (const t of this.textures) t.dispose();
    this.group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (m && m.map && this.textures.includes(m.map)) m.dispose();
    });
  }
}
