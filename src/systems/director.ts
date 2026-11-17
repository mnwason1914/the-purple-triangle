/** Coroutine helper: cutscenes are async functions awaiting conditions resolved by the game loop. */
export class Director {
  busy = 0;
  private waits: { check: () => boolean; resolve: () => void }[] = [];
  private time = 0;

  get active() { return this.busy > 0; }
  /** Game-time clock (seconds); advances only while the game updates. */
  get now() { return this.time; }

  async run(fn: () => Promise<void>) {
    this.busy++;
    try { await fn(); } finally { this.busy--; }
  }

  /** Hand control back to the player while awaiting (interactive segments inside a cutscene). */
  async release<T>(p: Promise<T>): Promise<T> {
    this.busy--;
    try { return await p; } finally { this.busy++; }
  }

  wait(seconds: number): Promise<void> {
    const end = this.time + seconds;
    return this.until(() => this.time >= end);
  }

  until(check: () => boolean): Promise<void> {
    if (check()) return Promise.resolve();
    return new Promise((resolve) => this.waits.push({ check, resolve }));
  }

  update(dt: number) {
    this.time += dt;
    const ready = this.waits.filter((w) => w.check());
    if (ready.length) {
      this.waits = this.waits.filter((w) => !ready.includes(w));
      for (const w of ready) w.resolve();
    }
  }

  clear() { this.waits = []; this.busy = 0; }
}
