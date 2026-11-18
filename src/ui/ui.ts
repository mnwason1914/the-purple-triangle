import { tx } from '../text/tx';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export type ScreenId = 'title' | 'settings' | 'pause' | 'end' | null;

/** DOM overlay UI: dialogue with portraits, choices, chapter cards, HUD, context button. */
export class UI {
  private dialog = $('dialog');
  private portrait = $<HTMLImageElement>('portrait');
  private dname = $('dname');
  private dtext = $('dtext');
  private dnext = $('dnext');
  private choicesEl = $('choices');
  private cardEl = $('card');
  private cardText = $('card-text');
  private fadeEl = $('fade');
  private toastEl = $('toast');
  private act = $('act');
  private actLabel = $('act-label');
  private ring = document.querySelector('#hold-ring circle') as SVGCircleElement;
  private objectiveEl = $('objective');
  private clockEl = $('clock');
  private counterEl = $('counter');
  private invEl = $('inventory');
  private toastT = 0;

  textSpeed = 1;
  // dialogue state
  private full = '';
  private shown = 0;
  private lineDone: (() => void) | null = null;
  private choiceDone: ((i: number) => void) | null = null;
  private choiceSel = 0;
  private choiceCount = 0;
  blip: (() => void) | null = null;
  private blipT = 0;

  get talking() { return !this.dialog.hidden; }
  get choosing() { return !this.choicesEl.hidden; }

  screen(id: ScreenId) {
    for (const s of ['title', 'settings', 'pause', 'end']) $(`screen-${s}`).hidden = s !== id;
    document.body.classList.toggle('ui-open', id !== null || this.talking || this.choosing || !this.cardEl.hidden);
  }

  private syncOpen() {
    document.body.classList.toggle('talking', this.talking || this.choosing);
    const anyScreen = ['title', 'settings', 'pause', 'end'].some((s) => !$(`screen-${s}`).hidden);
    document.body.classList.toggle('ui-open', anyScreen || this.talking || this.choosing || !this.cardEl.hidden);
  }

  hud(v: boolean) { $('hud').hidden = !v; }
  objective(text: string) { this.objectiveEl.textContent = tx(text); }
  clock(text: string | null, late = false) {
    this.clockEl.hidden = text === null;
    if (text !== null) { this.clockEl.textContent = tx(text); this.clockEl.classList.toggle('late', late); }
  }
  counter(text: string | null) { this.counterEl.hidden = text === null; if (text) this.counterEl.textContent = tx(text); }
  inventory(icons: string[]) {
    const key = icons.join('|');
    if (this.invEl.dataset.k === key) return;
    this.invEl.dataset.k = key;
    this.invEl.innerHTML = '';
    for (const src of icons) { const i = document.createElement('img'); i.src = src; this.invEl.appendChild(i); }
  }

  toast(msg: string, secs = 2) { this.toastEl.textContent = tx(msg); this.toastEl.hidden = false; this.toastT = secs; }

  fade(on: boolean) { this.fadeEl.classList.toggle('on', on); }

  /** Context button: null hides it. progress 0..1 for hold actions. */
  action(label: string | null, progress = 0) {
    this.act.hidden = label === null;
    if (label !== null) { const l = tx(label); if (this.actLabel.textContent !== l) this.actLabel.textContent = l; }
    this.ring.style.strokeDashoffset = String(289 * (1 - progress));
  }

  // ---------------------------------------------------------------- dialogue
  say(name: string, portrait: string | null, text: string, thought = false): Promise<void> {
    this.dialog.hidden = false;
    this.syncOpen();
    this.dname.textContent = name;
    if (portrait) this.portrait.src = portrait; else this.portrait.removeAttribute('src');
    this.dtext.classList.toggle('thought', thought);
    this.full = tx(text);
    this.shown = 0;
    this.dtext.textContent = '';
    return new Promise((r) => (this.lineDone = r));
  }

  closeDialog() { this.dialog.hidden = true; this.syncOpen(); }

  /** Tap: finish typing, or advance. */
  advance() {
    if (this.choosing) return;
    if (!this.lineDone) return;
    if (this.shown < this.full.length) { this.shown = this.full.length; this.dtext.textContent = this.full; return; }
    const r = this.lineDone; this.lineDone = null; r();
  }

  choice(options: string[]): Promise<number> {
    this.choicesEl.innerHTML = '';
    this.choiceCount = options.length;
    this.choiceSel = 0;
    options.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = tx(t);
      b.addEventListener('click', (e) => { e.stopPropagation(); this.pick(i); });
      this.choicesEl.appendChild(b);
    });
    this.choicesEl.hidden = false;
    this.highlight();
    this.syncOpen();
    return new Promise((r) => (this.choiceDone = r));
  }

  /** Countdown bar under the options (seconds). */
  choiceTimer(secs: number) {
    const bar = document.createElement('div');
    bar.className = 'choice-timer';
    bar.style.animationDuration = `${secs}s`;
    this.choicesEl.appendChild(bar);
  }
  /** Close the open choice without a pick (resolves with -1). */
  cancelChoice() { if (this.choosing) this.pick(-1); }

  /** Keyboard / gamepad navigation for choices. */
  moveChoice(d: number) { if (!this.choosing) return; this.choiceSel = (this.choiceSel + d + this.choiceCount) % this.choiceCount; this.highlight(); }
  confirmChoice() { if (this.choosing) this.pick(this.choiceSel); }
  private highlight() { [...this.choicesEl.querySelectorAll('.choice')].forEach((c, i) => c.classList.toggle('sel', i === this.choiceSel)); }
  private pick(i: number) {
    this.choicesEl.hidden = true;
    const r = this.choiceDone; this.choiceDone = null;
    this.syncOpen();
    r?.(i);
  }

  async card(html: string, hold = 2.6): Promise<void> {
    this.cardEl.hidden = false;
    this.syncOpen();
    this.cardText.innerHTML = tx(html);
    await new Promise((r) => setTimeout(r, 50));
    this.cardText.classList.add('on');
    await new Promise((r) => setTimeout(r, (hold + 1.2) * 1000));
    this.cardText.classList.remove('on');
    await new Promise((r) => setTimeout(r, 1100));
  }
  hideCard() { this.cardEl.hidden = true; this.syncOpen(); }

  update(dt: number) {
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.toastEl.hidden = true;
    if (!this.dialog.hidden && this.shown < this.full.length) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.full.length, this.shown + dt * 32 * this.textSpeed);
      const now = Math.floor(this.shown);
      if (now !== before) this.dtext.textContent = this.full.slice(0, now);
      if ((this.blipT -= dt) <= 0 && this.full[now - 1] !== ' ') { this.blipT = 0.07; this.blip?.(); }
    }
    this.dnext.classList.toggle('hide', this.shown < this.full.length);
  }

  end(title: string, text: string) {
    $('end-title').textContent = tx(title);
    $('end-text').textContent = tx(text);
    this.screen('end');
  }

  debug(t: string | null) { const d = $('debug'); d.hidden = t === null; if (t) d.textContent = t; }
}
