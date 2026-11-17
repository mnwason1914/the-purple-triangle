import type { Atlas } from '../engine/atlas';
import { Sprite } from '../engine/sprite';
import type { Pose } from './painter';

/** A character in a scene: walks along the floor line, animates, faces left/right. */
export class Actor {
  readonly sprite: Sprite;
  x = 0;
  y = 0;
  facing = 1;
  speed = 42;
  /** fixed pose overrides walking/idle animation */
  pose: Pose | null = null;
  target: number | null = null;
  moving = false;
  private t = Math.random() * 3;
  private stepFrame = -1;
  onStep: (() => void) | null = null;
  private resolveWalk: (() => void) | null = null;

  constructor(atlas: Atlas, public look: string, z: number) {
    this.sprite = new Sprite(atlas, `${look}_idle0`, z);
  }

  setLook(look: string) { this.look = look; }

  walkTo(x: number): Promise<void> {
    this.resolveWalk?.();
    this.target = x;
    return new Promise((r) => (this.resolveWalk = r));
  }

  face(x: number) { if (x !== this.x) this.facing = x > this.x ? 1 : -1; }

  /** Manual movement from player input: dir -1/0/1. */
  drive(dir: number, dt: number, minX: number, maxX: number) {
    if (dir !== 0) {
      this.facing = dir;
      this.x = Math.max(minX, Math.min(maxX, this.x + dir * this.speed * dt));
    }
    this.moving = dir !== 0 && this.x > minX && this.x < maxX;
  }

  update(dt: number) {
    this.t += dt;
    if (this.target !== null) {
      const d = this.target - this.x;
      if (Math.abs(d) <= this.speed * dt + 0.01) {
        this.x = this.target;
        this.target = null;
        this.moving = false;
        const r = this.resolveWalk; this.resolveWalk = null; r?.();
      } else {
        this.facing = Math.sign(d);
        this.x += Math.sign(d) * this.speed * dt;
        this.moving = true;
      }
    }
    let frame: string;
    if (this.pose) frame = this.pose;
    else if (this.moving) {
      const f = ((Math.floor(this.t * (this.speed / 7)) % 4) + 4) % 4;
      frame = `walk${f}`;
      if ((f === 0 || f === 2) && f !== this.stepFrame) this.onStep?.();
      this.stepFrame = f;
    } else frame = Math.floor(this.t / 0.9) % 2 ? 'idle1' : 'idle0';
    this.sprite.set(`${this.look}_${frame}`, this.facing < 0);
    this.sprite.place(this.x, this.y);
  }
}
