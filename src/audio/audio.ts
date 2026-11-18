/**
 * All sound is synthesised with Web Audio (no files): footsteps per surface, knocks, doors,
 * paper, heartbeat, ambience beds and a sparse piano-like score. Unlocked on first gesture
 * (iOS), suspended while hidden.
 */
export type Ambience = 'none' | 'room' | 'street' | 'tension' | 'stair';
export type Sfx = 'step_wood' | 'step_stone' | 'step_snow' | 'knock' | 'knock_hard' | 'door' | 'paper' | 'hide' | 'pick' | 'blip'
  | 'heart' | 'alert' | 'caught' | 'clock' | 'select' | 'whistle' | 'drop' | 'fire' | 'sew'
  | 'radio' | 'scrape' | 'creak' | 'wash' | 'tick' | 'unlock' | 'slam' | 'wipe' | 'screw';

const N = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioSys {
  sfxOn = true;
  musicOn = true;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private mus!: GainNode;
  private amb!: GainNode;
  private noiseBuf!: AudioBuffer;
  private ambNodes: AudioNode[] = [];
  private ambKind: Ambience = 'none';
  private wantAmb: Ambience = 'none';
  private ambTimer: number | null = null;
  private musTimer: number | null = null;
  private musTheme: string | null = null;
  private musStep = 0;
  private musNext = 0;

  private files = new Map<string, ArrayBuffer>();
  private bufs = new Map<string, AudioBuffer>();
  private musSrc: AudioBufferSourceNode | null = null;
  private musFile: string | null = null;

  /** Recorded sound replacing a synthesised one: key = Sfx name or 'bgm_<theme>'. */
  addFile(key: string, data: ArrayBuffer) { this.files.set(key, data); if (this.ctx) this.decode(key); }
  private decode(key: string) {
    const d = this.files.get(key);
    if (!d || !this.ctx) return;
    this.ctx.decodeAudioData(d.slice(0)).then((b) => { this.bufs.set(key, b); if (key === `bgm_${this.musTheme}`) { const t = this.musTheme as 'tense'; this.musTheme = null; this.music(t); } }).catch(() => {});
  }
  private stopMusicFile() { try { this.musSrc?.stop(); } catch { /* */ } this.musSrc = null; this.musFile = null; }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;
      queueMicrotask(() => { for (const k of this.files.keys()) this.decode(k); });
      this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.connect(this.master);
      this.mus = ctx.createGain(); this.mus.gain.value = 0.5; this.mus.connect(this.master);
      this.amb = ctx.createGain(); this.amb.gain.value = 0.6; this.amb.connect(this.master);
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
      document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend(); else this.ctx.resume(); });
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (this.ambKind !== this.wantAmb) this.ambience(this.wantAmb);
  }

  private get ok() { return !!this.ctx && this.ctx.state === 'running'; }

  private tone(f: number, dur: number, type: OscillatorType, vol: number, when = 0, bus?: GainNode, slide?: number, attack = 0.005) {
    const c = this.ctx!; const t = c.currentTime + when;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus ?? this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number, freq: number, q = 1, when = 0, type: BiquadFilterType = 'bandpass', bus?: GainNode) {
    const c = this.ctx!; const t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus ?? this.sfx);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  play(name: Sfx, vol = 1) {
    if (!this.sfxOn || !this.ok) return;
    const v = vol;
    const rec = this.bufs.get(name);
    if (rec) {
      const s = this.ctx!.createBufferSource(); s.buffer = rec;
      const g = this.ctx!.createGain(); g.gain.value = Math.min(1.5, v);
      s.connect(g); g.connect(this.sfx); s.start();
      return;
    }
    switch (name) {
      case 'step_wood': this.noise(0.06, 0.12 * v, 500 + Math.random() * 200, 2); this.tone(110, 0.05, 'sine', 0.05 * v); break;
      case 'step_stone': this.noise(0.05, 0.09 * v, 1800 + Math.random() * 400, 3); break;
      case 'step_snow': this.noise(0.09, 0.07 * v, 900 + Math.random() * 300, 0.7, 0, 'lowpass'); break;
      case 'knock': for (let i = 0; i < 3; i++) { this.tone(95, 0.12, 'sine', 0.5 * v, i * 0.18); this.noise(0.05, 0.25 * v, 300, 1, i * 0.18); } break;
      case 'knock_hard': for (let i = 0; i < 4; i++) { this.tone(80, 0.15, 'sine', 0.7 * v, i * 0.14); this.noise(0.07, 0.4 * v, 250, 1, i * 0.14); } break;
      case 'door': this.tone(180, 0.35, 'sawtooth', 0.025 * v, 0, undefined, 120); this.noise(0.12, 0.15 * v, 200, 1, 0.3, 'lowpass'); break;
      case 'paper': this.noise(0.18, 0.08 * v, 4000, 0.8, 0, 'highpass'); this.noise(0.1, 0.06 * v, 3000, 0.8, 0.12, 'highpass'); break;
      case 'hide': this.noise(0.25, 0.08 * v, 700, 0.6, 0, 'lowpass'); break;
      case 'pick': this.tone(N(76), 0.08, 'triangle', 0.08 * v); this.tone(N(83), 0.12, 'triangle', 0.06 * v, 0.06); break;
      case 'drop': this.tone(N(64), 0.15, 'triangle', 0.08 * v); this.noise(0.1, 0.06 * v, 3000, 0.8, 0, 'highpass'); break;
      case 'blip': this.tone(N(70 + Math.floor(Math.random() * 4)), 0.03, 'triangle', 0.025 * v); break;
      case 'heart': this.tone(55, 0.12, 'sine', 0.35 * v); this.tone(50, 0.12, 'sine', 0.25 * v, 0.16); break;
      case 'alert': this.tone(N(74), 0.18, 'square', 0.05 * v); this.tone(N(79), 0.25, 'square', 0.05 * v, 0.12); break;
      case 'caught': this.tone(N(50), 1.2, 'sawtooth', 0.06 * v, 0, undefined, N(45)); this.noise(0.6, 0.1 * v, 120, 1, 0, 'lowpass'); break;
      case 'clock': this.noise(0.02, 0.05 * v, 5000, 4); break;
      case 'select': this.tone(N(72), 0.08, 'triangle', 0.06 * v); break;
      case 'whistle': this.tone(N(88), 0.5, 'sine', 0.06 * v, 0, undefined, N(86)); this.tone(N(88), 0.35, 'sine', 0.06 * v, 0.55); break;
      case 'fire': this.noise(0.8, 0.12 * v, 900, 0.5); this.noise(0.5, 0.08 * v, 2500, 2, 0.2); break;
      case 'sew': for (let i = 0; i < 10; i++) this.noise(0.03, 0.06 * v, 2200, 6, i * 0.09); break;
      case 'radio': this.noise(1.6, 0.05 * v, 1800, 0.4); for (let i = 0; i < 6; i++) this.tone(180 + Math.random() * 120, 0.12, 'square', 0.012 * v, i * 0.22); break;
      case 'scrape': for (let i = 0; i < 4; i++) { this.noise(0.09, 0.06 * v, 3200 + Math.random() * 1600, 9, i * 0.13); this.tone(1900 + Math.random() * 600, 0.05, 'square', 0.006 * v, i * 0.13); } break;
      case 'creak': this.tone(140 + Math.random() * 40, 0.32, 'sawtooth', 0.035 * v, 0, undefined, 95); this.noise(0.25, 0.05 * v, 600, 4); break;
      case 'wash': for (let i = 0; i < 5; i++) this.noise(0.22, 0.07 * v, 1200 + Math.random() * 900, 0.8, i * 0.2); break;
      case 'tick': this.noise(0.015, 0.06 * v, 6000, 6); this.tone(2400, 0.02, 'square', 0.006 * v); break;
      case 'unlock': this.tone(900, 0.05, 'square', 0.03 * v); this.noise(0.12, 0.2 * v, 1500, 3, 0.05); this.tone(300, 0.08, 'sine', 0.2 * v, 0.06); break;
      case 'slam': this.tone(70, 0.4, 'sine', 0.6 * v); this.noise(0.3, 0.4 * v, 200, 0.7, 0, 'lowpass'); break;
      case 'wipe': for (let i = 0; i < 4; i++) this.noise(0.12, 0.05 * v, 2600, 1.5, i * 0.16); break;
      case 'screw': for (let i = 0; i < 5; i++) { this.noise(0.04, 0.05 * v, 4200, 8, i * 0.11); this.tone(2600, 0.02, 'square', 0.006 * v, i * 0.11); } break;
    }
  }

  // ---------------------------------------------------------------- ambience beds
  ambience(kind: Ambience) {
    this.wantAmb = kind;
    if (!this.ctx) return;
    if (kind === this.ambKind) return;
    for (const n of this.ambNodes) { try { (n as AudioScheduledSourceNode).stop?.(); } catch { /* */ } n.disconnect(); }
    this.ambNodes = [];
    if (this.ambTimer !== null) { clearInterval(this.ambTimer); this.ambTimer = null; }
    this.ambKind = kind;
    const c = this.ctx;
    const loopNoise = (freq: number, q: number, vol: number, type: BiquadFilterType, lfo = 0) => {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(this.amb); s.start();
      this.ambNodes.push(s, f, g);
      if (lfo) { const o = c.createOscillator(); const og = c.createGain(); o.frequency.value = lfo; og.gain.value = vol * 0.8; o.connect(og); og.connect(g.gain); o.start(); this.ambNodes.push(o, og); }
    };
    if (kind === 'room') {
      loopNoise(300, 0.5, 0.012, 'lowpass');
      let tick = 0;
      this.ambTimer = window.setInterval(() => { if (this.ok && this.sfxOn) { this.noise(0.015, tick++ % 2 ? 0.03 : 0.022, 4500, 5, 0, 'bandpass', this.amb); } }, 1000);
    } else if (kind === 'street') {
      loopNoise(500, 0.4, 0.05, 'lowpass', 0.07);
      loopNoise(1400, 1.2, 0.012, 'bandpass', 0.13);
      this.ambTimer = window.setInterval(() => {
        if (!this.ok || !this.sfxOn) return;
        const r = Math.random();
        if (r < 0.06) { for (let i = 0; i < 2; i++) { this.tone(420, 0.09, 'sawtooth', 0.012, i * 0.25, this.amb, 300); } } // far dog
        else if (r < 0.1) this.tone(N(48), 2.5, 'sine', 0.03, 0, this.amb, N(47)); // distant train
      }, 2500);
    } else if (kind === 'stair') {
      loopNoise(200, 0.5, 0.02, 'lowpass', 0.05);
    } else if (kind === 'tension') {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 55;
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 55.7;
      const g = c.createGain(); g.gain.value = 0.06;
      o.connect(g); o2.connect(g); g.connect(this.amb); o.start(); o2.start();
      this.ambNodes.push(o, o2, g);
      loopNoise(150, 0.5, 0.02, 'lowpass');
    }
  }

  // ---------------------------------------------------------------- score
  /** Sparse motifs. Silence is part of the score: 'none' stops music. */
  music(theme: 'title' | 'home' | 'sorrow' | 'tense' | 'none') {
    if (!this.ctx) { this.musTheme = theme === 'none' ? null : theme; return; }
    const file = this.bufs.get(`bgm_${theme}`);
    if (this.musFile && this.musFile !== theme) this.stopMusicFile();
    if (file && this.musicOn) {
      if (this.musTimer !== null) clearInterval(this.musTimer);
      this.musTimer = null; this.musTheme = theme;
      if (this.musFile === theme) return;
      const s = this.ctx.createBufferSource(); s.buffer = file; s.loop = true; s.connect(this.mus); s.start();
      this.musSrc = s; this.musFile = theme;
      return;
    }
    if (theme === 'none' || !this.musicOn) {
      if (this.musTimer !== null) clearInterval(this.musTimer);
      this.musTimer = null; this.musTheme = theme === 'none' ? null : theme; return;
    }
    if (this.musTheme === theme && this.musTimer !== null) return;
    this.musTheme = theme;
    this.musStep = 0;
    this.musNext = this.ctx.currentTime + 0.2;
    if (this.musTimer === null) this.musTimer = window.setInterval(() => this.schedule(), 150);
  }

  setMusicOn(on: boolean) { this.musicOn = on; if (!on) this.music('none'); }

  private schedule() {
    const c = this.ctx;
    if (!c || !this.ok || !this.musTheme) return;
    // D minor, slow: (note, beats). 0 = rest.
    const themes: Record<string, [number, number][]> = {
      title: [[62, 2], [65, 1], [69, 3], [67, 1], [65, 1], [64, 2], [62, 4], [0, 2], [57, 2], [62, 1], [65, 3], [64, 1], [62, 1], [61, 4], [0, 4]],
      home: [[69, 1], [67, 1], [65, 2], [64, 1], [65, 1], [67, 4], [0, 2], [65, 1], [64, 1], [62, 2], [64, 2], [62, 4], [0, 6]],
      sorrow: [[62, 3], [61, 1], [62, 2], [57, 4], [0, 2], [58, 3], [57, 1], [55, 2], [57, 6], [0, 6]],
      tense: [[38, 1], [0, 1], [38, 1], [0, 1], [41, 1], [0, 1], [38, 1], [37, 1], [38, 1], [0, 1], [38, 1], [0, 1], [44, 1], [0, 1], [43, 1], [41, 1]],
    };
    const seq = themes[this.musTheme];
    const tense = this.musTheme === 'tense';
    const beat = tense ? 0.36 : 0.75;
    while (this.musNext < c.currentTime + 0.5) {
      const [n, b] = seq[this.musStep % seq.length];
      const when = this.musNext - c.currentTime;
      if (n && tense) {
        this.tone(N(n), 0.32, 'triangle', 0.11, when, this.mus, N(n) * 0.98, 0.003);
        this.tone(N(n + 12), 0.12, 'sine', 0.03, when, this.mus);
      } else if (n) {
        this.tone(N(n), beat * b * 1.6, 'triangle', 0.05, when, this.mus, undefined, 0.01);
        this.tone(N(n + 12), beat * b * 0.6, 'sine', 0.015, when, this.mus);
        if (this.musStep % 4 === 0) this.tone(N(n - 24), beat * 4, 'sine', 0.04, when, this.mus);
      }
      this.musNext += beat * b;
      this.musStep++;
    }
  }
}
