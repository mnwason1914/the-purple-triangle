export const SAVE_KEY = 'purple-triangle/save/v1';
export const SETTINGS_KEY = 'purple-triangle/settings/v1';

export interface SaveData {
  v: 1;
  checkpoint: string;
  flags: Record<string, number | boolean | string>;
  savedAt: number;
}

export interface Settings { sfx: boolean; music: boolean; saver: boolean; textSpeed: number; haptic: boolean }

const DEF: Settings = { sfx: true, music: true, saver: false, textSpeed: 1, haptic: true };

function read<T>(k: string): T | null { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) as T : null; } catch { return null; } }
function write(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }

export const Save = {
  load(): SaveData | null { const d = read<SaveData>(SAVE_KEY); return d && d.v === 1 && d.checkpoint ? d : null; },
  store(checkpoint: string, flags: SaveData['flags']) { return write(SAVE_KEY, { v: 1, checkpoint, flags, savedAt: Date.now() }); },
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } },
  settings(): Settings { return { ...DEF, ...(read<Partial<Settings>>(SETTINGS_KEY) ?? {}) }; },
  storeSettings(s: Settings) { write(SETTINGS_KEY, s); },
};
