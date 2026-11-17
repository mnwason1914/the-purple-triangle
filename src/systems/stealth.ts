import type { Actor } from '../characters/actor';
import type { Light, Lighting } from '../engine/lighting';
import type { Sprite } from '../engine/sprite';

export interface StealthTarget {
  x: number;
  hidden: boolean;
  /** doing something conspicuous (e.g. pushing a leaflet into a mailbox) */
  conspicuous: boolean;
}

type GuardState = 'patrol' | 'wait' | 'look' | 'investigate' | 'alert';

/**
 * A patrolling watcher carrying a lamp. Detection fills when the target is inside the lamp cone,
 * faster in light, at close range, or while acting conspicuously. Hiding in a doorway blocks it.
 * The meter is shown as "?" then "!" above the head so the player always knows why they were seen.
 */
export class Guard {
  meter = 0;
  state: GuardState = 'patrol';
  private idx = 0;
  private waitT = 0;
  private lookT = 0;
  private lastSeen = 0;
  enabled = true;
  readonly light: Light;

  constructor(
    readonly actor: Actor,
    readonly route: number[],
    readonly alertSprite: Sprite,
    readonly range = 76,
    readonly baseSpeed = 24,
    lamp = true,
  ) {
    actor.speed = baseSpeed;
    this.light = { x: actor.x, y: 17, r: range + 8, i: lamp ? 0.95 : 0, dir: 1, half: 0.42, on: lamp };
  }

  /** Returns true the frame the target is caught. */
  update(dt: number, t: StealthTarget, lighting: Lighting): boolean {
    const a = this.actor;
    if (!this.enabled) { this.alertSprite.mesh.visible = false; return false; }

    // ---- perception ----
    const dx = t.x - a.x;
    const dist = Math.abs(dx);
    const inFront = Math.sign(dx) === a.facing || dist < 6;
    let rate = 0;
    if (!t.hidden) {
      if (inFront && dist < this.range) {
        const lit = lighting.lightAt(t.x, 16);
        rate = 0.35 + 1.5 * lit;
        if (dist < 30) rate *= 1.5;
        if (t.conspicuous) rate *= 1.6;
      } else if (dist < 14) rate = 1.2; // brushing past behind them
    }
    if (rate > 0) { this.meter = Math.min(1, this.meter + rate * dt); this.lastSeen = t.x; }
    else this.meter = Math.max(0, this.meter - (this.state === 'investigate' ? 0.18 : 0.32) * dt);

    // ---- behaviour ----
    if (this.meter >= 1) {
      this.state = 'alert';
      a.target = null; a.moving = false; a.face(t.x);
    } else if (this.meter > 0.6) {
      this.state = 'investigate';
      a.speed = this.baseSpeed * 0.8;
      if (Math.abs(this.lastSeen - a.x) > 10) { a.target = this.lastSeen; } else { a.target = null; a.moving = false; }
    } else if (this.meter > 0.3) {
      if (this.state !== 'look') { this.state = 'look'; this.lookT = 0; }
      a.target = null; a.moving = false; a.face(this.lastSeen);
    } else if (this.state === 'look' || this.state === 'investigate') {
      this.lookT += dt;
      if (this.lookT > 1.2 || this.state === 'investigate') { this.state = 'wait'; this.waitT = 1.4; a.target = null; a.moving = false; }
    } else if (this.state === 'wait') {
      this.waitT -= dt;
      if (this.waitT <= 0) { this.state = 'patrol'; a.speed = this.baseSpeed; }
    } else {
      const goal = this.route[this.idx];
      if (a.target === null) a.target = goal;
      if (Math.abs(a.x - goal) < 1) {
        a.target = null; a.moving = false;
        this.idx = (this.idx + 1) % this.route.length;
        this.state = 'wait';
        this.waitT = 1.6 + Math.random() * 2;
        a.facing = -a.facing; // glance back the way they came
      }
    }

    // ---- lamp & marker ----
    this.light.x = a.x + a.facing * 5;
    this.light.dir = a.facing;
    const s = this.alertSprite;
    s.mesh.visible = this.meter > 0.3;
    if (s.mesh.visible) s.set(this.meter >= 0.6 ? 'alert_x' : 'alert_q');
    s.place(a.x, 36 + (this.meter >= 0.6 ? 1 : 0));
    return this.meter >= 1;
  }

  reset(x: number) {
    this.meter = 0;
    this.state = 'patrol';
    this.actor.x = x;
    this.actor.target = null;
    this.actor.speed = this.baseSpeed;
  }
}
