/**
 * First-person controls. Touch: a floating stick on the left half (push to the rim to run),
 * drag anywhere on the right half to look, a crouch toggle and the shared context button.
 * Keyboard: WASD / arrows, mouse drag to look, Shift run, C crouch, E / Space act, Esc pause.
 */
export class FpsInput {
  moveX = 0; moveY = 0; turn = 0; lookDX = 0; lookDY = 0;
  run = false; crouchPressed = false; act = false; actPressed = false; anyPressed = false; pausePressed = false;
  upPressed = false; downPressed = false; confirmPressed = false;
  stickMag = 0;

  private keys = new Set<string>();
  private prevKeys = new Set<string>();
  private stickId: number | null = null;
  private stickO = { x: 0, y: 0 };
  private stickV = { x: 0, y: 0 };
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private touchAct = false;
  private prevAct = false;
  private tapQ = false;
  private pauseQ = false;
  private crouchQ = false;
  private gestureCbs: (() => void)[] = [];
  talking: () => boolean = () => false;

  constructor() {
    addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Escape' || e.code === 'KeyP') this.pauseQ = true;
      if (e.code === 'KeyC' || e.code === 'ControlLeft') this.crouchQ = true;
      this.tapQ = true;
      this.gesture();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.release());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.release(); });
    addEventListener('pointerdown', () => this.gesture(), { capture: true });

    const stickZone = document.getElementById('stick-zone')!;
    const stick = document.getElementById('stick')!;
    const knob = document.getElementById('knob')!;
    const R = 46;
    const drawStick = () => {
      if (this.stickId === null) { stick.classList.remove('on'); knob.style.transform = ''; return; }
      stick.classList.add('on');
      stick.style.left = `${this.stickO.x}px`; stick.style.top = `${this.stickO.y}px`;
      knob.style.transform = `translate(${this.stickV.x * R}px, ${this.stickV.y * R}px)`;
      stick.classList.toggle('run', this.stickMag > 0.92);
    };
    stickZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.talking()) { this.tapQ = true; return; }
      if (this.stickId !== null) return;
      this.stickId = e.pointerId;
      try { stickZone.setPointerCapture(e.pointerId); } catch { /* */ }
      const r = stickZone.getBoundingClientRect();
      this.stickO = { x: e.clientX - r.left, y: e.clientY - r.top };
      this.stickV = { x: 0, y: 0 }; this.stickMag = 0;
      drawStick();
    });
    stickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickId) return;
      const r = stickZone.getBoundingClientRect();
      let dx = (e.clientX - r.left - this.stickO.x) / R, dy = (e.clientY - r.top - this.stickO.y) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) { this.stickO.x += (dx / m) * (m - 1) * R * 0.5; this.stickO.y += (dy / m) * (m - 1) * R * 0.5; dx /= m; dy /= m; }
      this.stickV = { x: dx, y: dy }; this.stickMag = Math.min(1, m);
      drawStick();
    });
    const endStick = (e: PointerEvent) => { if (e.pointerId !== this.stickId) return; this.stickId = null; this.stickV = { x: 0, y: 0 }; this.stickMag = 0; drawStick(); };
    stickZone.addEventListener('pointerup', endStick);
    stickZone.addEventListener('pointercancel', endStick);
    stickZone.addEventListener('lostpointercapture', endStick);

    const look = document.getElementById('look-zone')!;
    look.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.talking()) { this.tapQ = true; return; }
      if (this.lookId !== null) return;
      this.lookId = e.pointerId;
      try { look.setPointerCapture(e.pointerId); } catch { /* */ }
      this.lookLast = { x: e.clientX, y: e.clientY };
    });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.lookDX += e.clientX - this.lookLast.x; this.lookDY += e.clientY - this.lookLast.y;
      this.lookLast = { x: e.clientX, y: e.clientY };
    });
    const endLook = (e: PointerEvent) => { if (e.pointerId === this.lookId) this.lookId = null; };
    look.addEventListener('pointerup', endLook);
    look.addEventListener('pointercancel', endLook);
    look.addEventListener('lostpointercapture', endLook);

    const btn = document.getElementById('act')!;
    let actId: number | null = null;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); actId = e.pointerId; try { btn.setPointerCapture(e.pointerId); } catch { /* */ } this.touchAct = true; btn.classList.add('on'); });
    const endAct = (e: PointerEvent) => { if (e.pointerId !== actId) return; actId = null; this.touchAct = false; btn.classList.remove('on'); };
    btn.addEventListener('pointerup', endAct);
    btn.addEventListener('pointercancel', endAct);
    btn.addEventListener('lostpointercapture', endAct);

    const crouch = document.getElementById('btn-crouch')!;
    crouch.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.crouchQ = true; });

    document.getElementById('stage')!.addEventListener('pointerdown', (e) => {
      const t = e.target as HTMLElement;
      if (!t.closest('#fps-controls') && !t.closest('#controls') && !t.closest('button') && !t.closest('.choice')) this.tapQ = true;
    });
  }

  onGesture(cb: () => void) { this.gestureCbs.push(cb); }
  private gesture() { for (const cb of this.gestureCbs) cb(); }
  get sticking() { return this.stickId !== null; }

  release() {
    this.keys.clear();
    this.stickId = null; this.lookId = null; this.stickV = { x: 0, y: 0 }; this.stickMag = 0; this.touchAct = false;
    document.getElementById('stick')?.classList.remove('on');
    document.getElementById('act')?.classList.remove('on');
  }

  update() {
    const k = this.keys;
    const edge = (c: string) => k.has(c) && !this.prevKeys.has(c);
    let mx = 0, my = 0, turn = 0;
    if (k.has('KeyW')) my += 1; if (k.has('KeyS')) my -= 1;
    if (k.has('KeyA')) mx -= 1; if (k.has('KeyD')) mx += 1;
    if (k.has('ArrowUp')) my += 1; if (k.has('ArrowDown')) my -= 1;
    if (k.has('ArrowLeft') || k.has('KeyQ')) turn -= 1; if (k.has('ArrowRight')) turn += 1;
    let gp = false, ga = false;
    for (const p of navigator.getGamepads?.() ?? []) {
      if (!p) continue;
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0, rx = p.axes[2] ?? 0, ry = p.axes[3] ?? 0;
      if (Math.abs(ax) > 0.2) mx += ax; if (Math.abs(ay) > 0.2) my -= ay;
      if (Math.abs(rx) > 0.2) turn += rx; if (Math.abs(ry) > 0.2) this.lookDY += ry * 6;
      ga ||= !!p.buttons[0]?.pressed; gp ||= !!p.buttons[9]?.pressed;
      if (p.buttons[1]?.pressed && !this.prevAct) this.crouchQ = true;
    }
    if (this.stickId !== null) { mx += this.stickV.x; my -= this.stickV.y; }
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    this.moveX = mx; this.moveY = my; this.turn = turn;
    this.run = k.has('ShiftLeft') || k.has('ShiftRight') || this.stickMag > 0.92;
    this.act = this.touchAct || k.has('KeyE') || k.has('Space') || k.has('Enter') || ga;
    this.actPressed = this.act && !this.prevAct;
    this.prevAct = this.act;
    this.anyPressed = this.tapQ || this.actPressed;
    this.tapQ = false;
    this.pausePressed = this.pauseQ || gp; this.pauseQ = false;
    this.crouchPressed = this.crouchQ; this.crouchQ = false;
    this.upPressed = edge('ArrowUp') || edge('KeyW');
    this.downPressed = edge('ArrowDown') || edge('KeyS');
    this.confirmPressed = edge('Enter') || edge('Space') || edge('KeyE');
    this.prevKeys = new Set(k);
  }

  consumeLook() { const d = { x: this.lookDX, y: this.lookDY }; this.lookDX = 0; this.lookDY = 0; return d; }
}
