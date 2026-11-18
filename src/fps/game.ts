/**
 * First-person game shell: loop, player movement and posture, footstep noise, crosshair
 * interaction, countdown, barks (non-blocking lines), NPC walkers and the shared DOM UI
 * (dialogue, choices, cards, menus). Chapter scripts drive it through the small API below.
 */
import { AudioSys, type Sfx } from '../audio/audio';
import { Director } from '../systems/director';
import { Save, type Settings } from '../systems/save';
import { tx } from '../text/tx';
import { UI } from '../ui/ui';
import { ART, SIZE, buildArt, icon, loadOverrides, same } from './assets';
import { FpsInput } from './input';
import { Level } from './level';
import type { Pix } from './pix';
import { Renderer, type Sprite } from './render';

export type Flags = Record<string, number | boolean | string>;

export interface Target {
  id: string; x: number; y: number;
  /** aim radius in world units */ r?: number;
  reach?: number;
  name: string;
  verb: () => string | null;
  /** seconds to hold (null = tap) */ hold?: () => number | null;
  use: () => void | Promise<void>;
}

export interface FpsChapter {
  first: string;
  start(g: FpsGame, checkpoint: string): void;
  title(g: FpsGame): void;
}

const $ = (id: string) => document.getElementById(id)!;

export const NAMES: Record<string, string> = {
  paul: '파울', helena: '헬레나', leni: '레니', otto: '오토 베커', police: '순경', police2: '순경', radio: '라디오', uncle: '이모부',
};
const FACE_OF: Record<string, string> = { paul: 'hud_paul_calm', helena: 'face_helena', leni: 'face_leni', otto: 'face_otto', police: 'face_police', police2: 'face_police' };

export class Actor {
  readonly sp: Sprite;
  private path: [number, number][] = [];
  private phase = 0;
  speed = 1.15;
  constructor(public base: string, x: number, y: number) {
    this.sp = { x, y, z: 0, tex: ART[base], w: SIZE[base]?.[0], h: SIZE[base]?.[1], tag: base };
  }
  get x() { return this.sp.x; }
  get y() { return this.sp.y; }
  get moving() { return this.path.length > 0; }
  look(base: string) { this.base = base; this.sp.tex = ART[base]; this.sp.w = SIZE[base]?.[0]; this.sp.h = SIZE[base]?.[1]; }
  place(x: number, y: number) { this.sp.x = x; this.sp.y = y; this.path = []; }
  go(pts: [number, number][]) { this.path = [...pts]; }
  update(dt: number) {
    if (!this.path.length) { this.sp.tex = ART[this.base]; return; }
    const [tx, ty] = this.path[0];
    const dx = tx - this.sp.x, dy = ty - this.sp.y, d = Math.hypot(dx, dy), st = this.speed * dt;
    if (d <= st) { this.sp.x = tx; this.sp.y = ty; this.path.shift(); }
    else { this.sp.x += (dx / d) * st; this.sp.y += (dy / d) * st; }
    this.phase += dt * 5.5;
    const wn = `${this.base}_w${1 + (Math.floor(this.phase) % 2)}`;
    const f = same(this.base, wn) ? ART[wn] : null;
    this.sp.tex = Math.floor(this.phase * 2) % 2 && f ? f : ART[this.base];
  }
}

export class FpsGame {
  readonly ui = new UI();
  readonly audio = new AudioSys();
  readonly d = new Director();
  readonly input = new FpsInput();
  readonly r: Renderer;
  level = new Level();
  settings: Settings = Save.settings();
  state: 'title' | 'play' | 'pause' | 'end' = 'title';
  flags: Flags = {};
  checkpointId = '';

  // player
  px = 7; py = 8; pa = -Math.PI / 2; pitch = 0; eye = 0.71; crouch = false;
  holding: string | null = null;
  moveLock = true; lookLock = false; handsOn = true;
  composure = 80;
  sprites: Sprite[] = [];
  actors: Actor[] = [];
  solids: { x: number; y: number; r: number }[] = [];
  targets: Target[] = [];
  aim: Target | null = null;
  busy = false;
  /** countdown */
  timer = { left: 0, running: false, paused: false, shown: -1, onEnd: null as (() => void) | null, marks: [] as { at: number; fn: () => void }[] };
  noiseCd = 0;
  onNoise: ((level: number) => void) | null = null;
  onStep: ((x: number, y: number) => void) | null = null;
  progress = '';
  flashT = 0;

  private chapter!: FpsChapter;
  private lastT = -1;
  private lastRender = 0;
  private stepAcc = 0;
  private bob = 0;
  private holdT = 0;
  private holdId = '';
  private faces = new Map<string, string>();
  private barkQ: { name: string; text: string; secs: number; thought: boolean; done: () => void }[] = [];
  private barkT = 0;
  private barkCur = { thought: false };
  private titleT = 0;
  private aimEl = $('aim-label');
  private barkEl = $('bark');

  constructor() {
    buildArt();
    this.r = new Renderer($('fps') as HTMLCanvasElement);
    document.body.classList.add('fps');
    this.ui.blip = () => this.audio.play('blip');
    this.input.onGesture(() => this.audio.unlock());
    this.input.talking = () => this.ui.talking || !document.getElementById('card')!.hidden;
    const stage = $('stage');
    new ResizeObserver(() => this.resize()).observe(stage);
    this.resize();
    this.detectTouch();
    this.applySettings();
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') { this.save(); this.pause(); } });
    addEventListener('pagehide', () => this.save());
  }

  async init(ch: FpsChapter) {
    this.chapter = ch;
    await loadOverrides('assets/ch1/', (k, d) => this.audio.addFile(k, d));
    requestAnimationFrame((t) => this.frame(t));
  }

  private resize() { const r = $('stage').getBoundingClientRect(); if (r.width > 2) this.r.resize(r.width, r.height); }

  private detectTouch() {
    const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    document.body.classList.toggle('touch', touch);
    addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') document.body.classList.add('touch'); }, { capture: true });
    const rot = $('rotate');
    let portraitOk = false;
    const check = () => {
      const portrait = innerHeight > innerWidth * 1.05 && document.body.classList.contains('touch');
      rot.hidden = !portrait || portraitOk;
      document.body.classList.toggle('portrait-play', portrait && portraitOk);
      setTimeout(() => this.resize(), 50);
    };
    $('btn-portrait').addEventListener('click', () => { portraitOk = true; check(); });
    addEventListener('resize', check);
    check();
  }

  applySettings() {
    const s = this.settings;
    $('opt-sfx').classList.toggle('on', s.sfx);
    $('opt-music').classList.toggle('on', s.music);
    $('opt-saver').classList.toggle('on', s.saver);
    $('opt-haptic').classList.toggle('on', s.haptic);
    $('opt-speed').textContent = tx(`글자 속도 · ${['느리게', '보통', '빠르게'][s.textSpeed === 0.6 ? 0 : s.textSpeed === 1 ? 1 : 2]}`);
    this.audio.sfxOn = s.sfx;
    this.audio.setMusicOn(s.music);
    this.ui.textSpeed = s.textSpeed;
  }

  // ================================================================ flow
  newGame() { Save.clear(); this.flags = {}; this.begin(this.chapter.first); }
  continueGame() {
    const s = Save.load();
    if (!s) return this.newGame();
    this.flags = { ...s.flags };
    this.begin(s.checkpoint);
  }
  private begin(cp: string) {
    this.state = 'play';
    this.ui.screen(null);
    this.d.clear();
    this.reset();
    this.lastT = -1;
    this.chapter.start(this, cp);
  }
  /** Fresh world and player (keeps flags). */
  reset() {
    this.level = new Level();
    this.sprites = []; this.actors = []; this.solids = []; this.targets = [];
    this.holding = null; this.crouch = false; this.pitch = 0; this.moveLock = true; this.lookLock = false; this.handsOn = true;
    this.timer.running = false; this.timer.marks = []; this.timer.onEnd = null; this.timer.paused = false;
    this.busy = false; this.aim = null; this.barkQ = []; this.barkT = 0; this.barkEl.hidden = true;
    this.onNoise = null; this.onStep = null; this.progress = ''; this.flashT = 0;
    this.ui.closeDialog(); this.ui.hideCard(); this.ui.action(null); this.ui.objective(''); this.ui.fade(false);
    this.hud(false);
  }
  pause() { if (this.state !== 'play') return; this.state = 'pause'; this.ui.screen('pause'); this.input.release(); }
  resume() { if (this.state !== 'pause') return; this.state = 'play'; this.ui.screen(null); this.lastT = -1; }
  toTitle() {
    this.state = 'title';
    this.d.clear();
    this.reset();
    this.chapter.title(this);
    this.ui.screen('title');
    ($('btn-continue') as HTMLButtonElement).hidden = !Save.load();
    this.audio.music('title');
    this.audio.ambience('none');
  }
  end(title: string, text: string) {
    this.state = 'end';
    this.hud(false);
    this.ui.action(null);
    this.timer.running = false;
    Save.clear();
    this.ui.end(title, text);
  }
  checkpoint(id: string) { this.checkpointId = id; this.save(); }
  save() {
    if (this.state === 'title' || !this.checkpointId) return;
    Save.store(this.checkpointId, this.flags);
  }

  // ================================================================ script API
  flag<T extends number | boolean | string>(k: string, def: T): T { return (this.flags[k] as T) ?? def; }
  str(k: string) { return String(this.flags[k] ?? ''); }
  set(k: string, v: number | boolean | string) { this.flags[k] = v; }
  inc(k: string, n = 1) { this.flags[k] = (Number(this.flags[k]) || 0) + n; }
  sfx(n: Sfx, v = 1) { this.audio.play(n, v); }
  haptic(ms: number) { if (this.settings.haptic) navigator.vibrate?.(ms); }
  wait(s: number) { return this.d.wait(s); }
  until(f: () => boolean) { return this.d.until(f); }
  objective(t: string) { this.ui.objective(t); }
  hud(on: boolean) {
    this.r.setHud(on);
    $('hud').hidden = !on;
    $('fps-controls').hidden = !on;
    document.body.classList.toggle('fps-play', on);
  }
  fade(on: boolean) { this.ui.fade(on); return this.wait(0.65); }
  async card(html: string, hold = 2.4) { await this.ui.card(html, hold); }
  hideCard() { this.ui.hideCard(); }

  facePortrait(key: string) {
    let u = this.faces.get(key);
    if (!u) { u = ART[key].canvas(3).toDataURL(); this.faces.set(key, u); }
    return u;
  }
  /** Modal line. who: speaker key; name overrides the display name (e.g. "오토 베커 (문밖)"). */
  async say(who: string, text: string, name?: string) {
    const f = FACE_OF[who];
    await this.ui.say(name ?? NAMES[who] ?? who, f ? this.facePortrait(who === 'paul' ? this.faceKey() : f) : null, text);
  }
  async think(text: string) { await this.ui.say('파울', null, text, true); }
  endTalk() { this.ui.closeDialog(); }
  /** Choice; with a timeout returns -1 when time runs out. Pauses the countdown while open. */
  async choose(opts: string[], timeout = 0): Promise<number> {
    this.timer.paused = true;
    const p = this.ui.choice(opts);
    let i: number;
    if (timeout > 0) {
      this.ui.choiceTimer(timeout);
      let timedOut = false;
      const t = this.wait(timeout).then(() => { timedOut = true; });
      await Promise.race([p, t]);
      if (timedOut && this.ui.choosing) { this.ui.cancelChoice(); i = -1; } else i = await p;
    } else i = await p;
    this.timer.paused = false;
    this.sfx('select');
    return i;
  }
  /** Non-blocking line shown over play. Resolves when it has been displayed. */
  bark(who: string, text: string, secs = 2.6, name?: string): Promise<void> {
    const thought = who === 'think';
    return new Promise((done) => {
      // stale thoughts give way to anything newer
      for (const q of this.barkQ.filter((b) => b.thought)) q.done();
      this.barkQ = this.barkQ.filter((b) => !b.thought);
      this.barkQ.push({ name: thought ? '' : name ?? NAMES[who] ?? who, text, secs, thought, done });
    });
  }

  place(x: number, y: number, a: number) { this.px = x; this.py = y; this.pa = a; this.pitch = 0; }
  sprite(name: string, x: number, y: number, z = 0, extra: Partial<Sprite> = {}): Sprite {
    const s: Sprite = { x, y, z, tex: ART[name], w: SIZE[name]?.[0], h: SIZE[name]?.[1], tag: name, ...extra };
    this.sprites.push(s);
    return s;
  }
  setTex(s: Sprite, name: string) { s.tex = ART[name]; s.tag = name; }
  actor(base: string, x: number, y: number) { const a = new Actor(base, x, y); this.actors.push(a); this.sprites.push(a.sp); return a; }
  walk(a: Actor, pts: [number, number][]) { a.go(pts); return this.until(() => !a.moving); }
  removeActor(a: Actor) { this.actors = this.actors.filter((q) => q !== a); this.sprites = this.sprites.filter((s) => s !== a.sp); }
  solid(x: number, y: number, r: number) { const s = { x, y, r }; this.solids.push(s); return s; }

  startTimer(secs: number, onEnd: () => void) {
    Object.assign(this.timer, { left: secs, running: true, paused: false, shown: -1, onEnd });
  }
  addTime(s: number) { this.timer.left = Math.max(0, this.timer.left + s); this.flashT = s < 0 ? 0.5 : 0; }
  stopTimer() { this.timer.running = false; }

  faceKey() {
    if (this.composure >= 60) return 'hud_paul_calm';
    if (this.composure >= 30) return 'hud_paul_tense';
    return Math.floor(performance.now() / 140) % 2 && same('hud_paul_panic', 'hud_paul_panic2') ? 'hud_paul_panic2' : 'hud_paul_panic';
  }

  // ================================================================ loop
  private frame(tMs: number) {
    requestAnimationFrame((t) => this.frame(t));
    const now = tMs / 1000;
    let dt = this.lastT < 0 ? 1 / 60 : now - this.lastT;
    this.lastT = now;
    dt = Math.max(0, Math.min(dt, 0.1));
    const inp = this.input;
    inp.update();
    if (inp.pausePressed && (this.state === 'play' || this.state === 'pause')) { if (this.state === 'pause') this.resume(); else this.pause(); }
    this.ui.update(dt);

    if (this.state === 'play') {
      this.d.update(dt);
      if (this.ui.choosing) {
        if (inp.upPressed) this.ui.moveChoice(-1);
        if (inp.downPressed) this.ui.moveChoice(1);
        if (inp.confirmPressed && !document.body.classList.contains('touch')) this.ui.confirmChoice();
      } else if (this.ui.talking && inp.anyPressed) this.ui.advance();
      this.updatePlay(dt);
      this.updateBarks(dt);
    } else if (this.state === 'title') {
      this.d.update(dt);
      this.titleT += dt;
      this.pa = -Math.PI / 2 + Math.sin(this.titleT * 0.12) * 1.1;
    }
    if (this.state !== 'pause') for (const a of this.actors) a.update(dt);
    if (this.flashT > 0) this.flashT -= dt;

    if (this.settings.saver && now - this.lastRender < 1 / 30 - 0.004) return;
    this.lastRender = now;
    const playing = this.state === 'play' || this.state === 'pause' || this.state === 'end';
    this.r.render({ x: this.px, y: this.py, a: this.pa, pitch: this.pitch, eye: this.eye }, this.level, this.sprites,
      playing && this.handsOn ? (r, buf) => this.drawHands(r, buf) : null,
      playing && !$('hud').hidden ? this.hudState() : null);
  }

  private hudState() {
    const t = this.timer;
    const s = Math.max(0, Math.ceil(t.left));
    const time = t.running || t.left > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '-:--';
    return { time, late: t.running && t.left <= 20, progress: this.progress, face: ART[this.faceKey()], item: this.holding ? icon(ITEM_ART[this.holding]) ?? null : icon('obj_rag'), crouch: this.crouch, aim: !!this.aim, flash: this.flashT };
  }

  private drawHands(r: Renderer, _buf: Uint32Array) {
    const s = Math.max(1, Math.round(r.VH / 75));
    const bx = Math.round(Math.sin(this.bob) * 2 * s), by = Math.round(Math.abs(Math.cos(this.bob)) * 2 * s) + (this.crouch ? 2 * s : 0);
    const k = Math.max(110, Math.min(300, (this.level.light(this.px, this.py) * 300) | 0));
    const W = r.W, VH = r.VH;
    if (!this.holding) r.blit(ART.hand_idle, W - 34 * s - 4 + bx, VH - 30 * s + by, s, k);
    else if (this.holding === 'screwdriver') r.blit(ART.hand_screwdriver, W - 34 * s - 4 + bx, VH - 30 * s + by, s, k);
    else {
      const it = icon(ITEM_ART[this.holding]);
      const sc = s * (it.w > 13 ? 2 : 3);
      const ix = (W >> 1) - ((it.w * sc) >> 1) + bx, iy = VH - it.h * sc - 6 * s + by;
      r.blit(ART.hand_l, ix - 18 * s, iy + it.h * sc - 14 * s, s, k);
      r.blit(it, ix, iy, sc, k);
      r.blit(ART.hand_r, ix + it.w * sc - 12 * s, iy + it.h * sc - 14 * s, s, k);
    }
  }

  private updatePlay(dt: number) {
    const inp = this.input;
    const talking = this.ui.talking || this.ui.choosing;
    const free = !talking && !this.moveLock;
    // look
    const lk = inp.consumeLook();
    if (!talking && !this.lookLock) {
      const sens = 3.2 / Math.max(320, innerWidth);
      this.pa += lk.x * sens + inp.turn * 2.2 * dt;
      this.pitch = Math.max(-this.r.VH * 0.28, Math.min(this.r.VH * 0.28, this.pitch - lk.y * 0.35));
    }
    if (inp.crouchPressed && free) { this.crouch = !this.crouch; $('btn-crouch').classList.toggle('on', this.crouch); }
    const eyeT = this.crouch ? 0.4 : 0.71;
    this.eye += (eyeT - this.eye) * (1 - Math.exp(-dt * 10));

    // move
    if (free && (inp.moveX || inp.moveY)) {
      const run = inp.run && !this.crouch;
      const speed = this.crouch ? 0.85 : run ? 2.7 : 1.7;
      const ca = Math.cos(this.pa), sa = Math.sin(this.pa);
      const vx = (ca * inp.moveY - sa * inp.moveX) * speed * dt, vy = (sa * inp.moveY + ca * inp.moveX) * speed * dt;
      const ox = this.px, oy = this.py;
      this.tryMove(vx, vy);
      const moved = Math.hypot(this.px - ox, this.py - oy);
      this.bob += moved * 5.5;
      this.stepAcc += moved;
      if (this.stepAcc > 0.62) { this.stepAcc = 0; this.step(run); }
    }
    if (this.noiseCd > 0) this.noiseCd -= dt;

    // aim & act
    this.aim = free && !this.busy ? this.findTarget() : null;
    const verb = this.aim ? this.aim.verb() : null;
    let prog = 0;
    if (this.aim && verb) {
      const hold = this.aim.hold?.() ?? null;
      if (hold) {
        if (inp.act && (this.holdId === this.aim.id || inp.actPressed)) {
          this.holdId = this.aim.id; this.holdT += dt; prog = Math.min(1, this.holdT / hold);
          if (this.holdT >= hold) { const t = this.aim; this.resetHold(); this.use(t); }
        } else if (this.holdId) this.resetHold();
      } else if (inp.actPressed) this.use(this.aim);
    } else if (this.holdId) this.resetHold();
    this.ui.action(this.aim && verb ? verb : null, prog);
    const label = this.aim && verb ? tx(this.aim.name) : '';
    if (this.aimEl.textContent !== label) this.aimEl.textContent = label;
    this.aimEl.hidden = !label;

    // countdown
    const t = this.timer;
    if (t.running && !t.paused && !talking) {
      t.left -= dt;
      const s = Math.ceil(t.left);
      if (s !== t.shown) { t.shown = s; if (s <= 20 && s > 0) this.sfx('tick', s <= 10 ? 1.4 : 1); }
      for (const m of t.marks) if (t.left <= m.at) { t.marks = t.marks.filter((q) => q !== m); m.fn(); }
      const drain = t.left < 20 ? 0.6 : t.left < 45 ? 0.3 : 0.08;
      this.composure = Math.max(0, this.composure - drain * dt);
      if (t.left <= 0) { t.left = 0; t.running = false; const cb = t.onEnd; t.onEnd = null; if (cb) void this.d.run(async () => cb()); }
    }
    if (t.running && this.composure < 30 && Math.random() < dt * 1.2) this.sfx('heart', 0.6);
  }

  private use(t: Target) {
    this.busy = true;
    void this.d.run(async () => { try { await t.use(); } finally { this.busy = false; } });
  }
  private resetHold() { this.holdT = 0; this.holdId = ''; }

  private step(run: boolean) {
    const k = this.level.noiseCoef(this.px, this.py);
    const posture = this.crouch ? 0 : run ? 2 : 1;
    const region = this.level.region(this.px, this.py);
    const surf: Sfx = region === 'yard' || region === 'cellar' ? 'step_stone' : 'step_wood';
    this.sfx(surf, this.crouch ? 0.25 : run ? 1 : 0.7);
    if (k > 1.2) this.sfx('creak', this.crouch ? 0.25 : 0.8);
    this.onStep?.(this.px, this.py);
    const noise = posture * k;
    if (noise >= 2.4 && this.noiseCd <= 0 && this.onNoise) { this.noiseCd = 4; this.onNoise(noise); }
  }

  private tryMove(vx: number, vy: number) {
    const rad = 0.2;
    const blocked = (x: number, y: number) => {
      for (const [dx, dy] of [[-rad, -rad], [rad, -rad], [-rad, rad], [rad, rad]]) if (this.level.solid(x + dx, y + dy)) return true;
      for (const s of this.solids) if (Math.hypot(x - s.x, y - s.y) < s.r + rad) return true;
      return false;
    };
    if (!blocked(this.px + vx, this.py)) this.px += vx;
    if (!blocked(this.px, this.py + vy)) this.py += vy;
  }

  private findTarget(): Target | null {
    let best: Target | null = null, bestScore = Infinity;
    const ca = Math.cos(this.pa), sa = Math.sin(this.pa);
    for (const t of this.targets) {
      if (!t.verb()) continue;
      const dx = t.x - this.px, dy = t.y - this.py, d = Math.hypot(dx, dy);
      if (d > (t.reach ?? 1.45)) continue;
      const fwd = dx * ca + dy * sa;
      if (fwd <= 0.05) continue;
      const lat = Math.abs(-dx * sa + dy * ca);
      const ang = Math.atan2(lat, fwd), tol = Math.atan2(t.r ?? 0.16, fwd) + 0.04;
      if (ang > tol) continue;
      if (this.occluded(t.x, t.y)) continue;
      const score = ang / tol + d * 0.05;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    return best;
  }
  private occluded(x: number, y: number) {
    const d = Math.hypot(x - this.px, y - this.py), n = Math.ceil(d / 0.1);
    for (let i = 1; i < n - 1; i++) {
      const qx = this.px + ((x - this.px) * i) / n, qy = this.py + ((y - this.py) * i) / n;
      if (this.level.solid(qx, qy)) return true;
    }
    return false;
  }

  private updateBarks(dt: number) {
    if (this.barkT > 0) {
      if (this.barkQ.length) this.barkT = Math.min(this.barkT, this.barkCur.thought ? 0.5 : 1.1);
      this.barkT -= dt;
      if (this.barkT <= 0 && !this.barkQ.length) this.barkEl.classList.remove('on');
      if (this.barkT > 0) return;
    }
    const b = this.barkQ.shift();
    if (!b) return;
    ($('bark-name')).textContent = b.name;
    ($('bark-text')).textContent = tx(b.text);
    this.barkEl.classList.toggle('thought', b.thought);
    this.barkEl.hidden = false;
    this.barkEl.classList.add('on');
    this.barkT = b.secs;
    this.barkCur = b;
    this.sfx('blip', 0.6);
    b.done();
  }
}

/** Held item → sprite used in hands and the status bar. */
export const ITEM_ART: Record<string, string> = {
  wt: 'obj_watchtower', pot: 'obj_coffeepot', mimeo: 'obj_mimeograph', booklets: 'obj_booklets', screwdriver: 'obj_screwdriver',
};
export type { Pix };
