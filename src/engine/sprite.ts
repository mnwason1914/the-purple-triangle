import * as THREE from 'three';
import type { Atlas } from './atlas';

/** Quad showing one atlas frame; anchor bottom-centre (actors/props) or centre (glows). */
export class Sprite {
  readonly mesh: THREE.Mesh;
  private uv: THREE.BufferAttribute;
  private current = '';
  private flip = false;

  constructor(private atlas: Atlas, frame: string, z: number, material: THREE.Material = atlas.material, anchor: 'bottom' | 'center' | 'bottomleft' = 'bottom') {
    const f = atlas.frame(frame);
    const geo = new THREE.PlaneGeometry(f.w, f.h);
    if (anchor === 'bottom') geo.translate(0, f.h / 2, 0);
    if (anchor === 'bottomleft') geo.translate(f.w / 2, f.h / 2, 0);
    this.uv = geo.attributes.uv as THREE.BufferAttribute;
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.position.z = z;
    this.set(frame);
  }

  get frameName() { return this.current; }

  set(name: string, flip = false) {
    if (name === this.current && flip === this.flip) return;
    this.current = name;
    this.flip = flip;
    const f = this.atlas.frame(name);
    const a = flip ? f.u1 : f.u0, b = flip ? f.u0 : f.u1;
    this.uv.setXY(0, a, f.v1); this.uv.setXY(1, b, f.v1); this.uv.setXY(2, a, f.v0); this.uv.setXY(3, b, f.v0);
    this.uv.needsUpdate = true;
  }

  place(x: number, y: number) {
    this.mesh.position.x = Math.round(x);
    this.mesh.position.y = Math.round(y);
  }

  dispose() { this.mesh.geometry.dispose(); }
}
