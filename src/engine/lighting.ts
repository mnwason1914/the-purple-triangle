import * as THREE from 'three';

export const MAX_LIGHTS = 16;

export interface Light {
  x: number;
  y: number;
  r: number; // radius in px
  i: number; // intensity 0..1
  /** optional cone: direction (+1 right / -1 left) and half-angle in radians */
  dir?: number;
  half?: number;
  on?: boolean;
  /** visual only — ignored by stealth light checks (e.g. the player's own readability light) */
  self?: boolean;
}

/**
 * Darkness overlay: a single full-screen quad. Each fragment computes light at its WORLD pixel
 * (floor of fragCoord/scale), with posterised falloff — light pools have crisp pixel-art steps.
 */
export class Lighting {
  readonly mesh: THREE.Mesh;
  readonly lights: Light[] = [];
  private mat: THREE.ShaderMaterial;
  private data = new Float32Array(MAX_LIGHTS * 4);
  private cone = new Float32Array(MAX_LIGHTS * 4);
  /** 0 = no darkness, 1 = black */
  darkness = 0;
  tint = new THREE.Color(0x0a0c1c);

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uLights: { value: this.data },
        uCone: { value: this.cone },
        uCount: { value: 0 },
        uDark: { value: 0 },
        uTint: { value: this.tint },
        uScale: { value: 1 },
        uOrigin: { value: new THREE.Vector2() },
      },
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        precision mediump float;
        uniform vec4 uLights[${MAX_LIGHTS}];
        uniform vec4 uCone[${MAX_LIGHTS}];
        uniform int uCount;
        uniform float uDark;
        uniform vec3 uTint;
        uniform float uScale;
        uniform vec2 uOrigin;
        void main(){
          vec2 w = floor(gl_FragCoord.xy / uScale) + uOrigin + 0.5;
          float light = 0.0;
          for (int i = 0; i < ${MAX_LIGHTS}; i++) {
            if (i >= uCount) break;
            vec4 L = uLights[i];
            vec2 d = w - L.xy;
            float dist = length(d);
            float a = clamp(1.0 - dist / L.z, 0.0, 1.0);
            vec4 C = uCone[i];
            if (C.z > 0.5) {
              float ang = atan(d.y, d.x * C.x);
              a *= (abs(ang) < C.y) ? 1.0 : 0.0;
              a = max(a, clamp(1.0 - dist / 10.0, 0.0, 1.0)); // small halo at the lamp itself
            }
            light += a * a * L.w * 1.6;
          }
          light = min(light, 1.0);
          light = floor(light * 4.0 + 0.5) / 4.0; // posterise into 4 steps
          float alpha = uDark * (1.0 - light);
          gl_FragColor = vec4(uTint, alpha);
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000;
  }

  private pick: Light[] = [];

  /** viewW: visible world width, so only lights that can touch the screen are uploaded (nearest first). */
  update(scale: number, worldLeft: number, worldBottom: number, viewW = Infinity) {
    let n = 0;
    const cx = worldLeft + viewW / 2;
    const pick = this.pick;
    pick.length = 0;
    for (const l of this.lights) if (l.on !== false && Math.abs(l.x - cx) - l.r < viewW / 2) pick.push(l);
    if (pick.length > MAX_LIGHTS) pick.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
    for (const l of pick) {
      if (n >= MAX_LIGHTS) break;
      this.data.set([l.x, l.y, l.r, l.i], n * 4);
      this.cone.set([l.dir ?? 1, l.half ?? 0, l.half ? 1 : 0, 0], n * 4);
      n++;
    }
    const u = this.mat.uniforms;
    u.uCount.value = n;
    u.uDark.value = this.darkness;
    u.uScale.value = scale;
    (u.uOrigin.value as THREE.Vector2).set(Math.floor(worldLeft), Math.floor(worldBottom));
    this.mesh.visible = this.darkness > 0.001;
  }

  /** How lit is a world point (0..1)? Used by stealth detection. */
  lightAt(x: number, y: number) {
    let light = 0;
    for (const l of this.lights) {
      if (l.on === false || l.self) continue;
      const dx = x - l.x, dy = y - l.y;
      const dist = Math.hypot(dx, dy);
      let a = Math.max(0, 1 - dist / l.r);
      if (l.half) { const ang = Math.atan2(dy, dx * (l.dir ?? 1)); if (Math.abs(ang) >= l.half) a = 0; }
      light += a * a * l.i * 1.6;
    }
    return Math.min(1, light);
  }
}
