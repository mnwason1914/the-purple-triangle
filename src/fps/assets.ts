/**
 * Art registry for the first-person chapters. Every entry is code-painted at boot; a PNG with
 * the same name listed in public/assets/ch1/manifest.json replaces it (textures keep their
 * own resolution, sprites keep the painted world size). Cutscene videos are listed there too.
 */
import * as A from './art';
import { Pix } from './pix';
import { TEXEL } from './render';

export const ART: Record<string, Pix> = {};
/** World size (w, h) of sprites, from the painted default. */
export const SIZE: Record<string, [number, number]> = {};
export const VIDEOS = new Set<string>();
/** Names replaced by a file. */
export const OVERRIDDEN = new Set<string>();
/** Painted-size copies of replaced objects for the hands and the status bar. */
export const ICON: Record<string, Pix> = {};
/** Painted pixel size of every entry (hands and faces may be replaced by finer art). */
export const PAINTED: Record<string, [number, number]> = {};
export const icon = (name: string) => ICON[name] ?? ART[name];
/** Use frame b with a only if both come from the same source (no painted/drawn mix). */
export const same = (a: string, b: string) => !!ART[b] && OVERRIDDEN.has(a) === OVERRIDDEN.has(b);

/** Recorded sound file names (spec) → game sound names. */
const SOUND_ALIAS: Record<string, string> = {
  bgm_workshop_tense: 'bgm_tense', sfx_radio_static: 'radio', sfx_door_knock: 'knock_hard', sfx_lockpick_scrape: 'scrape',
  sfx_wood_creak: 'creak', sfx_water_wash: 'wash',
};

const SPRITES: Record<string, () => Pix> = {
  spr_helena: () => A.person(A.LOOK.helena),
  spr_leni: () => A.person(A.LOOK.leni), spr_leni_w1: () => A.person(A.LOOK.leni, 1), spr_leni_w2: () => A.person(A.LOOK.leni, 2),
  spr_leni_bag: () => A.person(A.LOOK.leni_bag), spr_leni_bag_w1: () => A.person(A.LOOK.leni_bag, 1), spr_leni_bag_w2: () => A.person(A.LOOK.leni_bag, 2),
  spr_leni_draw: A.leniDrawing,
  spr_otto: () => A.person(A.LOOK.otto), spr_otto_w1: () => A.person(A.LOOK.otto, 1), spr_otto_w2: () => A.person(A.LOOK.otto, 2),
  spr_police: () => A.person(A.LOOK.police), spr_police_w1: () => A.person(A.LOOK.police, 1), spr_police_w2: () => A.person(A.LOOK.police, 2),
  spr_police2: () => A.person(A.LOOK.police2), spr_police2_w1: () => A.person(A.LOOK.police2, 1), spr_police2_w2: () => A.person(A.LOOK.police2, 2),
  obj_workbench: A.workbench, obj_radio: () => A.radio(false), obj_radio_on: () => A.radio(true),
  obj_watchtower: A.bundleWT, obj_booklets: A.booklets, obj_mimeograph: A.mimeograph, obj_screwdriver: A.screwdriver,
  obj_coffeepot: A.coffeepot, obj_range: A.range, obj_basin: A.basin,
  obj_potato_crate: () => A.crate('full'), obj_potato_crate_shallow: () => A.crate('shallow'), obj_potato_crate_deep: () => A.crate('deep'),
  obj_bicycle: A.bicycle, obj_wheels: A.wheels, obj_chair: A.chair, obj_bulb: () => A.bulb(true), obj_shelf: A.shelf, obj_rag: A.rag,
};
const OTHER: Record<string, () => Pix> = {
  tex_wall_plaster: A.wallPlaster, tex_wall_photo: A.wallPhoto, tex_wall_photo_dust: A.wallPhotoDust, tex_wall_photo_wiped: A.wallPhotoWiped,
  tex_wall_window: A.wallWindow, tex_wall_tools: A.wallTools, tex_wall_kitchen: A.wallKitchen, tex_wall_cellar: () => A.wallCellar(),
  tex_wall_garden: () => A.wallGarden(), tex_wall_gate: A.wallGate, tex_wall_facade: facade,
  tex_door_front: () => A.doorFront(false), tex_door_front_scratched: () => A.doorFront(true), tex_door_back: () => A.doorBack(false), tex_door_back_ajar: () => A.doorBack(true),
  tex_floor_wood: () => A.floorWood(), tex_floor_creak: () => A.floorWood(21, true), tex_floor_stairs: A.floorStairs, tex_floor_dirt: () => A.floorDirt(),
  tex_floor_cobble: () => A.floorCobble(), tex_floor_kitchen: A.floorKitchen, tex_ceil_wood: A.ceilWood, tex_ceil_cellar: A.ceilCellar,
  hand_idle: A.handRag, hand_screwdriver: A.handScrewdriver, hand_r: A.handRight, hand_l: A.handLeft,
};
for (const [k, f] of Object.entries(A.FACES)) OTHER[k.startsWith('paul') ? `hud_${k}` : `face_${k}`] = () => A.face(f);
OTHER.hud_paul_panic2 = () => A.face({ ...A.FACES.paul_panic, eyes: 1 });

function facade(): Pix {
  const p = A.wallPlaster();
  for (let i = 0; i < p.px.length; i++) {
    const c = p.px[i];
    const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    p.px[i] = (0xff000000 | (Math.round(b * 0.78) << 16) | (Math.round(g * 0.9) << 8) | Math.min(255, Math.round(r * 1.02))) >>> 0;
  }
  return p;
}

export function buildArt() {
  for (const [k, f] of Object.entries(SPRITES)) { const p = f(); ART[k] = p; SIZE[k] = [p.w / TEXEL, p.h / TEXEL]; }
  for (const [k, f] of Object.entries(OTHER)) ART[k] = f();
  for (const [k, p] of Object.entries(ART)) PAINTED[k] = [p.w, p.h];
}

/** Load hand-made replacements listed in the manifest. Missing manifest = all code art. */
export async function loadOverrides(base = 'assets/ch1/', onAudio?: (key: string, data: ArrayBuffer) => void) {
  let list: { images?: string[]; videos?: string[]; audio?: string[] } = {};
  try {
    const r = await fetch(`${base}manifest.json`, { cache: 'no-cache' });
    if (r.ok) list = await r.json();
  } catch { return; }
  for (const v of list.videos ?? []) VIDEOS.add(v);
  const images = (list.images ?? []).map((file) => new Promise<void>((done) => {
    const name = file.replace(/\.(png|webp|jpe?g)$/i, '');
    const painted = ART[name];
    const img = new Image();
    img.onload = () => {
      try {
        const cut = /^(spr|obj|hand)_/.test(name);
        ART[name] = Pix.from(img, undefined, undefined, cut);
        // status-bar and in-hand copies at the painted size
        if (painted && /^(obj|hud|face)_/.test(name)) ICON[name] = Pix.from(img, painted.w, painted.h, true);
        OVERRIDDEN.add(name);
      } catch { /* keep painted */ }
      done();
    };
    img.onerror = () => done();
    img.src = `${base}${file}`;
  }));
  const sounds = (list.audio ?? []).map(async (file) => {
    try {
      const r = await fetch(`${base}${file}`);
      if (!r.ok) return;
      const stem = file.replace(/\.[a-z0-9]+$/i, '');
      const key = SOUND_ALIAS[stem] ?? stem.replace(/^sfx_/, '');
      onAudio?.(key, await r.arrayBuffer());
    } catch { /* keep synthesised */ }
  });
  await Promise.all([...images, ...sounds]);
}
