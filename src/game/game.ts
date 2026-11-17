import { tx } from '../text/tx';
import * as THREE from 'three';
import { Actor } from '../characters/actor';
import { LOOKS, NAMES, PORTRAITS } from '../characters/cast';
import { EXPRESSIONS, paintHuman, paintPortrait, POSES, type Expression } from '../characters/painter';
import { AudioSys, type Sfx } from '../audio/audio';
import { Input } from '../controls/input';
import { Atlas } from '../engine/atlas';
import { Lighting } from '../engine/lighting';
import { View } from '../engine/view';
import { propGrids } from '../scenes/env';
import type { Hotspot, Scene } from '../scenes/scene';
import { Director } from '../systems/director';
import { Save, type Settings } from '../systems/save';
import { Guard } from '../systems/stealth';
import { UI } from '../ui/ui';

export type Flags = Record<string, number | boolean | string>;

export interface Chapter {
  /** Build a scene by id. */
  scene(g: Game, id: string): Scene;
  /** Start play from a checkpoint id (sets up scene and runs its script). */
  start(g: Game, checkpoint: string): void;
  first: string;
}

const $ = (id: string) => document.getElementById(id)!;
const ITEM_FRAMES: Record<string, string> = { magazines: 'magazines', letter: 'letter', leaflets: 'bundle' };

export class Game {
  readonly view: View;
  readonly root = new THREE.Scene();
  readonly atlas = new Atlas(1024);
  readonly lighting = new Lighting();
  readonly audio = new AudioSys();
  readonly input = new Input();
  readonly ui = new UI();
  readonly d = new Director();
  settings: Settings = Save.settings();

  state: 'title' | 'play' | 'pause' | 'end' = 'title';
  scene: Scene | null = null;
  player!: Actor;
  flags: Flags = {};
  items: string[] = [];
  guards: Guard[] = [];
  hidden = false;
  conspicuous = false;
  camX = 0;
  checkpointId = '';
  onCaught: ((g: Guard) => void) | null = null;
  /** Clock in minutes since midnight; null = hidden */
  clockMin: number | null = null;
  clockRate = 0; // in-game minutes per real second
  clockEnd: number | null = null;
  onClockEnd: (() => void) | null = null;

  private chapter!: Chapter;
  private holdT = 0;
  private holdId = '';
  private lastT = -1;
  private lastRender = 0;
  private prevL = false;
  private prevR = false;
  private hiddenMat: THREE.MeshBasicMaterial;
  private portraits = new Map<string, string>();
  private icons = new Map<string, string>();
  private fpsN = 0;
  private fpsT = 0;
  private readonly debug = new URLSearchParams(location.search).has('debug');

  constructor() {
    this.view = new View($('game') as HTMLCanvasElement, $('stage'));
    this.buildArt();
    this.hiddenMat = new THREE.MeshBasicMaterial({ map: this.atlas.texture, alphaTest: 0.5, color: 0x4a4458 });
    this.root.add(this.lighting.mesh);
    this.ui.blip = () => this.audio.play('blip');
    this.input.onGesture(() => this.audio.unlock());
    this.detectTouch();
    this.applySettings();

    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') { this.save(); this.pause(); } });
    addEventListener('pagehide', () => this.save());
    this.view.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.save(); });
    this.view.canvas.addEventListener('webglcontextrestored', () => location.reload());
  }

  private buildArt() {
    for (const [id, look] of Object.entries(LOOKS)) for (const p of POSES) this.atlas.add(`${id}_${p}`, paintHuman(look, p));
    for (const who of PORTRAITS) for (const e of EXPRESSIONS) this.atlas.add(`p_${who}_${e}`, paintPortrait(LOOKS[who], e));
    for (const [n, gr] of Object.entries(propGrids())) this.atlas.add(n, gr);
    this.atlas.commit();
  }

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
      setTimeout(() => this.view.resize(), 50);
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
    this.view.saver = s.saver;
    this.view.resize();
  }

  // =================================================================== boot / flow
  run(chapter: Chapter) {
    this.chapter = chapter;
    this.view.renderer.setAnimationLoop((t) => this.frame(t));
  }

  newGame() {
    Save.clear();
    this.flags = {};
    this.items = [];
    this.begin(this.chapter.first);
  }

  continueGame() {
    const s = Save.load();
    if (!s) return this.newGame();
    this.flags = { ...s.flags };
    this.items = String(this.flags._items ?? '').split(',').filter(Boolean);
    this.begin(s.checkpoint);
  }

  private begin(cp: string) {
    this.state = 'play';
    this.ui.screen(null);
    this.ui.hud(true);
    this.d.clear();
    this.lastT = -1;
    this.chapter.start(this, cp);
  }

  pause() {
    if (this.state !== 'play') return;
    this.state = 'pause';
    this.ui.screen('pause');
    this.input.release();
  }
  resume() {
    if (this.state !== 'pause') return;
    this.state = 'play';
    this.ui.screen(null);
    this.lastT = -1;
  }

  toTitle(scene: Scene) {
    this.state = 'title';
    this.d.clear();
    this.ui.closeDialog();
    this.ui.hideCard();
    this.ui.hud(false);
    this.ui.action(null);
    this.ui.clock(null);
    this.ui.counter(null);
    this.clockMin = null;
    this.guards = [];
    this.setScene(scene);
    this.ui.screen('title');
    ($('btn-continue') as HTMLButtonElement).hidden = !Save.load();
    this.audio.music('title');
  }

  // =================================================================== scenes
  setScene(s: Scene) {
    if (this.scene) { this.root.remove(this.scene.group); this.scene.dispose(); }
    this.scene = s;
    this.root.add(s.group);
    this.lighting.lights.length = 0;
    this.lighting.lights.push(...s.lights);
    this.lighting.darkness = s.darkness;
    this.audio.ambience(s.ambience);
    this.guards = [];
    this.hidden = false;
    this.conspicuous = false;
    this.onCaught = null;
  }

  /** Create a character, wired for footstep sounds. */
  actor(look: string, z = 10): Actor {
    const a = new Actor(this.atlas, look, z);
    a.onStep = () => {
      if (!this.scene) return;
      const near = Math.abs(a.x - (this.player?.x ?? a.x)) < 120;
      if (near) this.audio.play(`step_${this.scene.floor}` as Sfx, a === this.player ? 0.8 : 0.5);
    };
    return a;
  }

  addGuard(a: Actor, route: number[], range = 76, speed = 24, lamp = true) {
    const s = this.scene!.prop(`alert_${this.guards.length}`, 'alert_q', a.x, 36, 40);
    s.mesh.visible = false;
    const gd = new Guard(a, route, s, range, speed, lamp);
    this.guards.push(gd);
    this.lighting.lights.push(gd.light);
    return gd;
  }

  /** Fade out, swap scene, fade in. */
  async goto(build: () => Scene, playerX: number, facing = 1) {
    this.ui.fade(true);
    await this.d.wait(0.6);
    const s = build();
    this.setScene(s);
    if (this.player) { this.player.x = playerX; this.player.facing = facing; this.player.pose = null; }
    this.snapCamera();
    await this.d.wait(0.15);
    this.ui.fade(false);
    await this.d.wait(0.4);
  }

  // =================================================================== script API
  portrait(who: string, expr: Expression) {
    const key = `p_${who}_${expr}`;
    if (!this.atlas.has(key)) return null;
    let u = this.portraits.get(key);
    if (!u) { u = this.atlas.dataURL(key); this.portraits.set(key, u); }
    return u;
  }

  async say(who: string, expr: Expression, text: string) {
    await this.ui.say(NAMES[who] ?? who, this.portrait(who, expr), text);
  }
  /** Elise's inner voice. */
  async think(text: string) { await this.ui.say('엘리제', null, text, true); }
  /** Off-screen voice (no portrait). */
  async voice(name: string, text: string) { await this.ui.say(name, null, text); }
  endTalk() { this.ui.closeDialog(); }

  async choose(options: string[]) { const i = await this.ui.choice(options); this.audio.play('select'); return i; }
  wait(s: number) { return this.d.wait(s); }
  flag<T extends number | boolean | string>(k: string, def: T): T { return (this.flags[k] as T) ?? def; }
  set(k: string, v: number | boolean | string) { this.flags[k] = v; }
  inc(k: string, n = 1) { this.flags[k] = (Number(this.flags[k]) || 0) + n; }
  objective(t: string) { this.ui.objective(t); }
  toast(t: string, s = 2) { this.ui.toast(t, s); }
  sfx(n: Sfx, v = 1) { this.audio.play(n, v); }
  haptic(ms: number) { if (this.settings.haptic) navigator.vibrate?.(ms); }

  give(item: string) { if (!this.items.includes(item)) this.items.push(item); this.audio.play('pick'); this.syncItems(); }
  take(item: string) { this.items = this.items.filter((i) => i !== item); this.syncItems(); }
  has(item: string) { return this.items.includes(item); }
  private syncItems() {
    this.flags._items = this.items.join(',');
    this.ui.inventory(this.items.map((i) => {
      let u = this.icons.get(i);
      if (!u) { u = this.atlas.dataURL(ITEM_FRAMES[i] ?? i); this.icons.set(i, u); }
      return u;
    }));
  }

  /** Save point: progress resumes here on "Continue". */
  checkpoint(id: string) {
    this.checkpointId = id;
    this.save();
  }
  save() {
    if (this.state === 'title' || !this.checkpointId) return;
    this.flags._items = this.items.join(',');
    Save.store(this.checkpointId, this.flags);
  }

  async card(html: string, hold = 2.6) { await this.ui.card(html, hold); }
  hideCard() { this.ui.hideCard(); }

  end(title: string, text: string) {
    this.state = 'end';
    this.ui.hud(false);
    this.ui.action(null);
    Save.clear();
    this.ui.end(title, text);
  }

  // hiding ----------------------------------------------------------
  hideAt(x: number) {
    this.hidden = true;
    this.player.x = x;
    this.player.pose = 'crouch';
    (this.player.sprite.mesh as THREE.Mesh).material = this.hiddenMat;
    this.player.sprite.mesh.position.z = -30;
    this.audio.play('hide');
  }
  unhide() {
    this.hidden = false;
    this.player.pose = null;
    (this.player.sprite.mesh as THREE.Mesh).material = this.atlas.material;
    this.player.sprite.mesh.position.z = 20;
  }

  // =================================================================== loop
  private frame(tMs: number) {
    const now = tMs / 1000;
    let dt = this.lastT < 0 ? 1 / 60 : now - this.lastT;
    this.lastT = now;
    dt = Math.max(0, Math.min(dt, 0.1));
    const inp = this.input;
    inp.update();
    if (inp.pausePressed) { if (this.state === 'pause') this.resume(); else this.pause(); }
    this.ui.update(dt);

    const lEdge = inp.left && !this.prevL, rEdge = inp.right && !this.prevR;
    this.prevL = inp.left; this.prevR = inp.right;

    if (this.state === 'play' || this.state === 'title') {
      this.d.update(dt);
      if (this.state === 'play') {
        if (this.ui.choosing) {
          if (lEdge) this.ui.moveChoice(-1);
          if (rEdge) this.ui.moveChoice(1);
          if (inp.actPressed && !document.body.classList.contains('touch')) this.ui.confirmChoice();
        } else if (this.ui.talking && inp.anyPressed) this.ui.advance();
        this.updatePlay(dt);
      }
      const s = this.scene;
      if (s) {
        s.onUpdate?.(dt);
        for (const a of s.actors.values()) a.update(dt);
      }
      if (this.state === 'play') this.followCamera(dt);
    }
    this.view.setCamera(this.camX, this.scene?.camY ?? 56);
    this.lighting.update(this.view.scale, this.view.left, this.view.bottom);

    if (this.settings.saver && now - this.lastRender < 1 / 30 - 0.004) return;
    this.lastRender = now;
    this.view.renderer.render(this.root, this.view.camera);
    if (this.debug) this.trackFps(dt);
  }

  private updatePlay(dt: number) {
    const s = this.scene;
    if (!s || !this.player) return;
    const free = !this.d.active && !this.ui.talking && !this.ui.choosing;
    const inp = this.input;

    // movement
    if (free && !this.hidden) this.player.drive((inp.right ? 1 : 0) - (inp.left ? 1 : 0), dt, s.minX, s.maxX);
    else if (!this.d.active) this.player.moving = false;

    // context action
    let label: string | null = null;
    let progress = 0;
    if (free) {
      if (this.hidden) {
        label = '나오기';
        if (inp.actPressed || inp.left || inp.right) { if (inp.actPressed || this.guards.every((g) => g.meter < 0.3)) this.unhide(); }
      } else {
        const h = this.nearestHotspot();
        if (h) {
          label = h.verb;
          if (h.hold) {
            if (inp.act && (this.holdId === h.id || inp.actPressed)) {
              this.holdId = h.id;
              this.holdT += dt;
              this.player.pose = 'reach';
              this.conspicuous = true;
              progress = Math.min(1, this.holdT / h.hold);
              if (this.holdT >= h.hold) { this.resetHold(); void this.d.run(async () => { await h.use(); }); }
            } else if (this.holdId) this.resetHold();
          } else if (inp.actPressed) {
            void this.d.run(async () => { await h.use(); });
          }
        } else if (this.holdId) this.resetHold();
      }
    } else if (this.holdId) this.resetHold();
    this.ui.action(label, progress);

    // stealth
    for (const gd of this.guards) {
      if (!free) continue; // cutscenes move guards themselves
      if (gd.update(dt, { x: this.player.x, hidden: this.hidden, conspicuous: this.conspicuous }, this.lighting)) {
        this.resetHold();
        this.audio.play('caught');
        this.haptic(120);
        const cb = this.onCaught;
        if (cb) cb(gd);
      }
    }
    const worst = Math.max(0, ...this.guards.map((g) => g.meter));
    if (worst > 0.3 && Math.random() < dt * (1 + worst * 2)) this.audio.play('heart', worst);

    // clock
    if (this.clockMin !== null && free) {
      const before = Math.floor(this.clockMin);
      this.clockMin += this.clockRate * dt;
      const m = Math.floor(this.clockMin);
      if (m !== before) {
        const end = this.clockEnd ?? 9999;
        this.ui.clock(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`, end - m <= 15);
        if (m >= end && this.onClockEnd) { const cb = this.onClockEnd; this.onClockEnd = null; void this.d.run(async () => cb()); }
      }
    }
  }

  private resetHold() {
    this.holdT = 0;
    this.holdId = '';
    this.conspicuous = false;
    if (this.player && this.player.pose === 'reach' && !this.d.active) this.player.pose = null;
  }

  private nearestHotspot(): Hotspot | null {
    const s = this.scene!;
    let best: Hotspot | null = null;
    let bd = Infinity;
    for (const h of s.hotspots) {
      if (h.enabled && !h.enabled()) continue;
      const d = Math.abs(h.x - this.player.x);
      if (d <= h.r && d < bd) { best = h; bd = d; }
    }
    return best;
  }

  startClock(fromMin: number, toMin: number, realSeconds: number, onEnd: () => void) {
    this.clockMin = fromMin;
    this.clockEnd = toMin;
    this.clockRate = (toMin - fromMin) / realSeconds;
    this.onClockEnd = onEnd;
    this.ui.clock(`${Math.floor(fromMin / 60)}:${String(fromMin % 60).padStart(2, '0')}`);
  }
  stopClock() { this.clockMin = null; this.onClockEnd = null; this.ui.clock(null); }

  // =================================================================== camera
  private camTarget() {
    return this.player ? this.player.x + this.player.facing * 18 : this.camX;
  }
  snapCamera() { this.camX = this.camTarget(); this.clampCam(); }
  private clampCam() {
    const s = this.scene;
    if (!s) return;
    const hw = this.view.w / 2;
    this.camX = s.width <= this.view.w ? s.width / 2 : Math.min(Math.max(this.camX, hw), s.width - hw);
  }
  private followCamera(dt: number) {
    this.camX += (this.camTarget() - this.camX) * (1 - Math.exp(-dt * 3.5));
    this.clampCam();
  }
  /** For title attract: set camera directly. */
  setCam(x: number) { this.camX = x; this.clampCam(); }

  /** CSS position of a world point (for overlays). */
  toCss(x: number, y: number) { return this.view.worldToCss(x, y); }

  private trackFps(dt: number) {
    this.fpsN++; this.fpsT += dt;
    if (this.fpsT < 0.5) return;
    const info = this.view.renderer.info;
    this.ui.debug(`${Math.round(this.fpsN / this.fpsT)} fps  calls ${info.render.calls}  tex ${info.memory.textures}  geo ${info.memory.geometries}\n${this.view.scale}x  ${Math.round(this.view.w)}x${Math.round(this.view.h)}  dpr ${this.view.dpr}  x ${Math.round(this.player?.x ?? 0)}  ${this.checkpointId}`);
    this.fpsN = 0; this.fpsT = 0;
  }
}
