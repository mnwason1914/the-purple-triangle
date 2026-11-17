/**
 * Touch-first input. Left: slide pad (◀ ▶). Right: one context button that only appears when
 * something can be done (labelled with the verb). Keyboard and gamepad mirror it.
 */
export class Input {
  left = false;
  right = false;
  act = false;
  actPressed = false;
  anyPressed = false; // any tap/press this frame (advance dialogue)
  pausePressed = false;

  private keys = new Set<string>();
  private tl = false;
  private tr = false;
  private ta = false;
  private prevAct = false;
  private tapQueued = false;
  private pauseQueued = false;
  private prevPadPause = false;
  private padId: number | null = null;
  private gestureCbs: (() => void)[] = [];

  constructor() {
    addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Escape' || e.code === 'KeyP') this.pauseQueued = true;
      this.tapQueued = true;
      this.gesture();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.release());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.release(); });
    addEventListener('pointerdown', () => this.gesture(), { capture: true });

    const pad = document.getElementById('pad')!;
    const halves = pad.querySelectorAll<HTMLElement>('.half');
    const apply = (e: PointerEvent | null) => {
      let l = false, r = false;
      if (e) {
        const rc = pad.getBoundingClientRect();
        const dx = e.clientX - (rc.left + rc.width / 2);
        l = dx < -rc.width * 0.07;
        r = dx > rc.width * 0.07;
      }
      this.tl = l; this.tr = r;
      halves[0].classList.toggle('on', l);
      halves[1].classList.toggle('on', r);
    };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); this.padId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch { /* */ } apply(e); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === this.padId) apply(e); });
    const endPad = (e: PointerEvent) => { if (e.pointerId === this.padId) { this.padId = null; apply(null); } };
    pad.addEventListener('pointerup', endPad);
    pad.addEventListener('pointercancel', endPad);
    pad.addEventListener('lostpointercapture', endPad);

    const btn = document.getElementById('act')!;
    let actId: number | null = null;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); actId = e.pointerId; try { btn.setPointerCapture(e.pointerId); } catch { /* */ } this.ta = true; btn.classList.add('on'); });
    const endAct = (e: PointerEvent) => { if (e.pointerId !== actId) return; actId = null; this.ta = false; btn.classList.remove('on'); };
    btn.addEventListener('pointerup', endAct);
    btn.addEventListener('pointercancel', endAct);
    btn.addEventListener('lostpointercapture', endAct);

    // Tapping the game area (not controls) advances dialogue.
    document.getElementById('stage')!.addEventListener('pointerdown', (e) => {
      const t = e.target as HTMLElement;
      if (!t.closest('#controls') && !t.closest('button') && !t.closest('.choice')) this.tapQueued = true;
    });
    document.getElementById('controls')!.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onGesture(cb: () => void) { this.gestureCbs.push(cb); }
  private gesture() { for (const cb of this.gestureCbs) cb(); }

  release() {
    this.keys.clear();
    this.tl = this.tr = this.ta = false;
    this.padId = null;
    document.querySelectorAll('#controls .on').forEach((n) => n.classList.remove('on'));
  }

  update() {
    const k = this.keys;
    let gl = false, gr = false, ga = false, gp = false;
    for (const p of navigator.getGamepads?.() ?? []) {
      if (!p) continue;
      gl ||= (p.axes[0] ?? 0) < -0.4 || !!p.buttons[14]?.pressed;
      gr ||= (p.axes[0] ?? 0) > 0.4 || !!p.buttons[15]?.pressed;
      ga ||= !!p.buttons[0]?.pressed || !!p.buttons[2]?.pressed;
      gp ||= !!p.buttons[9]?.pressed;
    }
    this.left = this.tl || k.has('ArrowLeft') || k.has('KeyA') || gl;
    this.right = this.tr || k.has('ArrowRight') || k.has('KeyD') || gr;
    this.act = this.ta || k.has('Space') || k.has('KeyE') || k.has('Enter') || k.has('KeyX') || ga;
    this.actPressed = this.act && !this.prevAct;
    this.prevAct = this.act;
    this.anyPressed = this.tapQueued || this.actPressed;
    this.tapQueued = false;
    this.pausePressed = this.pauseQueued || (gp && !this.prevPadPause);
    this.prevPadPause = gp;
    this.pauseQueued = false;
  }

  consume() { this.actPressed = false; this.anyPressed = false; }
}
