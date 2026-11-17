import * as THREE from 'three';
import type { Actor } from '../characters/actor';
import type { Chapter, Game } from '../game/game';
import { BG_H, FLOOR_ROW, paintHome, paintNightSky, paintStairwell, paintStreet, type StreetLayout } from '../scenes/env';
import { Scene } from '../scenes/scene';
import type { Guard } from '../systems/stealth';

/**
 * CHAPTER 1 — 12 December 1936, Lindenfeld.
 * Flags: lotte_trust (0-2), hid_letter, hid_mags (place ids), forced, mags_found, letter_found,
 * paul_taken, named_johann, refused_greeting, kruger_kind, kruger_saw, delivered, warned, arrested.
 */

// ------------------------------------------------------------------ scene builders
const HOME_W = 432;
const X = { door: 22, stove: 66, potato: 94, table: 128, sewing: 172, basket: 198, radio: 216, calendar: 231, wardrobe: 300, floor: 340, bed: 384, bag: 414 };

function buildHome(g: Game, mode: 'day' | 'dusk' | 'night'): Scene {
  const s = new Scene('home', HOME_W, 'wood', g.atlas);
  s.backdrop(paintHome(mode !== 'day'));
  s.prop('stove', 'stove', X.stove, 0, -20);
  s.prop('coffeepot', 'coffeepot', X.stove + 6, 52, -19);
  s.prop('potatobin', 'potatobin', X.potato, 0, -18);
  s.prop('chair1', 'chair', X.table - 26, 0, -19);
  s.prop('table', 'table', X.table, 0, -18);
  s.prop('chair2', 'chair', X.table + 26, 0, -19, true);
  s.prop('sewing', 'sewing', X.sewing, 0, -18);
  s.prop('basket', 'basket', X.basket, 0, -17);
  s.prop('radio', 'radio', X.radio, 64, -18);
  s.prop('wardrobe', 'wardrobe', X.wardrobe, 0, -20);
  s.prop('bed', 'bed', X.bed, 0, -19);
  s.prop('floorboard', 'floorboard', X.floor, -4, -5);
  s.prop('schoolbag', 'schoolbag', X.bag, 0, -17);
  s.camY = 58;
  s.minX = 14;
  s.ambience = 'room';
  if (mode === 'day') s.darkness = 0;
  else {
    s.darkness = mode === 'dusk' ? 0.55 : 0.72;
    s.lights.push({ x: 120, y: 100, r: 130, i: 0.95 }, { x: 384, y: 70, r: 60, i: 0.4 });
    s.prop('lampglow', 'glow', 120, 104, -9, false, g.atlas.glowMaterial, 'center').mesh.scale.setScalar(1.4);
  }
  return s;
}

function buildStair(g: Game): Scene {
  const s = new Scene('stair', 288, 'stone', g.atlas);
  s.backdrop(paintStairwell(true));
  s.prop('coal', 'coalbucket', 186, 0, -10);
  s.darkness = 0.6;
  s.lights.push({ x: 103, y: 70, r: 70, i: 0.55 }, { x: 60, y: 110, r: 90, i: 0.6 });
  s.ambience = 'stair';
  s.camY = 58;
  s.minX = 30;
  s.maxX = 250;
  return s;
}

interface Street { s: Scene; L: StreetLayout }

function buildStreet(g: Game): Street {
  const s = new Scene('street', 1440, 'snow', g.atlas);
  const { g: grid, layout: L } = paintStreet();
  // sky (parallax, repeating)
  const skyGrid = paintNightSky();
  const sky = s.backdrop(skyGrid, 0, -90, 0.5);
  const skyMat = sky.material as THREE.MeshBasicMaterial;
  sky.geometry.dispose();
  sky.geometry = new THREE.PlaneGeometry(skyGrid.w * 5, skyGrid.h).translate((skyGrid.w * 5) / 2, skyGrid.h / 2, 0);
  skyMat.map!.repeat.set(5, 1);
  sky.position.y = 10;
  s.backdrop(grid);
  for (const x of L.lamps) {
    s.prop(`lamp${x}`, 'lamppost', x, 0, -12);
    s.prop(`lampglow${x}`, 'glow', x, 76, -9, false, g.atlas.glowMaterial, 'center');
    s.lights.push({ x, y: 76, r: 72, i: 0.95 });
  }
  for (const w of L.windows) if (w.lit) s.lights.push({ x: w.x, y: w.y, r: 22, i: 0.55 });
  L.mailboxes.forEach((x, i) => s.prop(`mb${i}`, 'mailbox', x, 26, -11));
  s.prop('cart', 'cart', 520, 0, -8);
  s.prop('barrels', 'barrels', 880, 0, -8);
  s.darkness = 0.82;
  s.ambience = 'street';
  s.camY = 60;
  s.minX = 20;
  s.maxX = 1420;

  // falling snow: one Points draw call, 1 world-pixel flakes
  const N = 160;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = Math.random() * 1440; pos[i * 3 + 1] = Math.random() * 180 - 20; pos[i * 3 + 2] = 30; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xe8eef4, size: g.view.scale, sizeAttenuation: false });
  const snow = new THREE.Points(geo, mat);
  snow.frustumCulled = false;
  s.group.add(snow);
  let t = 0;
  s.onUpdate = (dt) => {
    t += dt;
    mat.size = g.view.scale;
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 1] -= (8 + (i % 5) * 2) * dt;
      pos[i * 3] += Math.sin(t * 0.7 + i) * 6 * dt;
      if (pos[i * 3 + 1] < -14) { pos[i * 3 + 1] = 170; pos[i * 3] = g.camX + (Math.random() - 0.5) * g.view.w * 1.2; }
    }
    geo.attributes.position.needsUpdate = true;
    sky.position.x = Math.round(g.camX * 0.75 - skyGrid.w * 2);
  };
  return { s, L };
}

// ------------------------------------------------------------------ helpers
function elise(g: Game, look: 'elise' | 'elise_out', x: number, facing = 1) {
  const a = g.actor(look, 20);
  g.player = a;
  g.scene!.addActor('elise', a, x, facing);
  // A faint personal light so the player can always read their own silhouette in the dark.
  if (g.scene!.darkness > 0.3) {
    const light = { x, y: 16, r: 20, i: 0.32, self: true };
    g.lighting.lights.push(light);
    const prev = g.scene!.onUpdate;
    g.scene!.onUpdate = (dt) => { prev?.(dt); light.x = a.x; light.i = g.hidden ? 0.12 : 0.32; };
  }
  return a;
}
const t = (h: number, m: number) => h * 60 + m;

// ------------------------------------------------------------------ chapter
export const Chapter1: Chapter = {
  first: 'morning',

  scene(g, id) {
    if (id === 'street') return buildStreet(g).s;
    return buildHome(g, 'day');
  },

  start(g, cp) {
    void g.d.run(async () => {
      switch (cp) {
        case 'morning': await morning(g); break;
        case 'knock': await knock(g); break;
        case 'dusk': await dusk(g); break;
        case 'street': await street(g); break;
        default: await morning(g);
      }
    });
  },
};

/** Title backdrop: the night street, slowly panning. */
export function titleScene(g: Game): Scene {
  const { s } = buildStreet(g);
  let t0 = 0;
  const base = s.onUpdate!;
  s.onUpdate = (dt) => { t0 += dt; g.setCam(300 + (0.5 - 0.5 * Math.cos(t0 * 0.03)) * 800); base(dt); };
  const walker = g.actor('townsman', 10);
  s.addActor('walker', walker, 200, 1);
  walker.speed = 18;
  const loop = async () => { while (g.state === 'title') { await walker.walkTo(1300); await walker.walkTo(200); } };
  void loop();
  return s;
}

// ================================================================== 1. MORNING
async function morning(g: Game) {
  g.set('lotte_trust', 1);
  g.items = [];
  g.checkpoint('morning');
  g.setScene(buildHome(g, 'day'));
  const e = elise(g, 'elise', X.sewing, 1);
  e.pose = 'sit';
  g.snapCamera();
  g.audio.music('none');
  await g.card('1936년 12월 12일, 토요일<small>베스트팔렌 · 린덴펠트</small>', 2.4);
  g.hideCard();
  g.audio.music('home');
  g.sfx('sew');
  await g.wait(1.2);
  await g.think('파울의 겨울 외투. 소매만 마저 꿰매면 된다.');
  await g.think('로테는 정오에 돌아온다. 토요일이니까.');
  g.endTalk();
  e.pose = null;
  g.objective('집 안을 둘러보자 · 재봉틀에서 일을 마치기');

  const s = g.scene!;
  let sewn = false;
  s.hotspots = [
    { id: 'radio', x: X.radio, r: 12, verb: '조사', use: async () => {
      g.sfx('blip');
      await g.voice('라디오', '…치직… 민족 공동체 안에서 모든 독일인은… 치직…');
      await g.think('끈다. 토요일 아침까지 듣고 싶지는 않다.');
      g.endTalk();
    } },
    { id: 'calendar', x: X.calendar, r: 10, verb: '조사', use: async () => {
      await g.think('12일. 동그라미 하나. 파울이 그려 놓았다. 무슨 뜻인지는 둘만 안다.');
      g.endTalk();
    } },
    { id: 'photo', x: 118, r: 8, verb: '조사', enabled: () => !sewn, use: async () => {
      await g.think('1924년, 결혼식 날. 파울은 저 모자를 아직도 쓴다.');
      g.endTalk();
    } },
    { id: 'window', x: X.sewing - 4, r: 22, verb: '창밖', enabled: () => !sewn, use: async () => {
      await g.think('맞은편 창가에 크뤼거 부인. 오늘도 거리를 내려다보고 있다.');
      await g.think('그녀의 남편이 이 구역 반장이 된 뒤로, 인사를 받아 주지 않는다.');
      g.endTalk();
    } },
    { id: 'floor', x: X.floor, r: 10, verb: '조사', use: async () => {
      await g.think('러그 밑, 헐거운 마룻장 하나. 지금은 비어 있다.');
      g.endTalk();
    } },
    { id: 'stove', x: X.stove, r: 12, verb: '조사', use: async () => {
      await g.think('타일 난로에 아직 온기가 남아 있다. 석탄은 다음 주까지 버텨야 한다.');
      g.endTalk();
    } },
    { id: 'bag', x: X.bag, r: 10, verb: '조사', use: async () => {
      await g.think('로테의 책가방 자리. 오늘은 가방을 메고 갔다.');
      g.endTalk();
    } },
    { id: 'sew', x: X.sewing, r: 14, verb: '재봉', enabled: () => !sewn, use: async () => {
      sewn = true;
      e.x = X.sewing; e.facing = 1; e.pose = 'sit';
      g.objective('');
      g.sfx('sew'); await g.wait(1.0); g.sfx('sew'); await g.wait(1.2);
      await lotteComesHome(g, e);
    } },
  ];
}

async function lotteComesHome(g: Game, e: Actor) {
  const s = g.scene!;
  g.sfx('door');
  const lotte = s.addActor('lotte', g.actor('lotte', 12), X.door, 1);
  lotte.speed = 30;
  await g.wait(0.5);
  await lotte.walkTo(X.sewing - 24);
  e.pose = null; e.face(lotte.x);
  await g.say('elise', 'smile', '벌써 왔니? 아직 열한 시도 안 됐는데.');
  await g.say('lotte', 'sad', '…');
  await g.say('lotte', 'sad', '쉬츠 선생님이 집에 가래.');
  await g.say('elise', 'worried', '무슨 일이 있었어?');
  await g.say('lotte', 'afraid', '아침에 다 같이 일어나서 팔을 들고 "하일 히틀러" 했어. 나만 안 했어.');
  await g.say('lotte', 'sad', '선생님이 반 애들 앞에서 나보고 "배신자네 집 애"라고 했어.');
  await g.say('lotte', 'worried', '그리고 이거 엄마 아빠한테 주래.');
  g.sfx('paper');
  await g.think('교장 직인이 찍힌 편지. "학부모는 월요일까지 학교로 출석할 것."');

  const c = await g.choose(['로테를 꼭 안아 준다', '"잘했어. 넌 옳은 일을 한 거야."', '"…다음엔 그냥 조용히 있으렴. 팔만 살짝 들어도 돼."']);
  if (c === 0) {
    g.set('lotte_trust', 2);
    await g.say('elise', 'sad', '무서웠지.');
    await g.say('lotte', 'sad', '응… 근데 엄마, 나 울지는 않았어.');
    await g.say('elise', 'smile', '알아. 넌 엄마보다 용감해.');
  } else if (c === 1) {
    g.set('lotte_trust', 2);
    await g.say('elise', 'resolute', '잘했어. 넌 옳은 일을 한 거야.');
    await g.say('lotte', 'worried', '그럼 월요일에도 안 해도 돼?');
    await g.say('elise', 'worried', '…월요일엔 엄마가 같이 학교에 갈게.');
  } else {
    g.set('lotte_trust', 0);
    await g.say('elise', 'worried', '다음엔 그냥 조용히 있으렴. 팔만 살짝 들어도 아무도 몰라.');
    await g.say('lotte', 'sad', '…엄마는 안 하잖아.');
    await g.think('대답할 말이 없었다.');
  }
  g.endTalk();
  await lotte.walkTo(X.bed + 18);
  lotte.facing = -1;

  // Paul arrives
  await g.wait(1.0);
  g.sfx('door');
  const paul = s.addActor('paul', g.actor('paul', 12), X.door, 1);
  await paul.walkTo(X.table - 8);
  e.face(paul.x);
  await g.say('paul', 'neutral', '토요일이라 반나절이야. 신호소엔 마이어가 남았어.');
  g.sfx('paper');
  await g.say('paul', 'worried', '오는 길에 요한한테 들렀어. 이건 새로 온 「파수대」.');
  g.give('magazines');
  await g.say('paul', 'stern', '그리고 이건 요한의 편지야. 오늘 밤 일. 읽고 나면 없애.');
  g.give('letter');
  await g.say('elise', 'worried', '당신이 가면 안 돼? 오늘 밤.');
  await g.say('paul', 'worried', '신호소에서 누가 내 도시락까지 뒤졌어. 지금 날 보고 있는 눈이 너무 많아.');
  await g.say('paul', 'resolute', '다섯 시부터 일곱 시까지. 전국에서 같은 시간에. …당신이 가 줘.');
  g.endTalk();
  await paul.walkTo(X.table + 18);
  paul.facing = -1;
  await g.wait(1.4);

  // THE KNOCK
  g.audio.music('none');
  g.sfx('knock');
  g.haptic(60);
  await g.wait(1.0);
  await g.voice('문밖', '하르트만! 문 여시오. 경찰이오.');
  g.endTalk();
  g.checkpoint('knock');
  await hideSequence(g);
}

// ================================================================== 2. THE KNOCK
async function knock(g: Game) {
  // Resume directly into the hiding sequence.
  g.setScene(buildHome(g, 'day'));
  elise(g, 'elise', X.table - 30, 1);
  const s = g.scene!;
  const lotte = s.addActor('lotte', g.actor('lotte', 12), X.bed + 18, -1);
  void lotte;
  s.addActor('paul', g.actor('paul', 12), X.table + 18, -1);
  g.items = [];
  g.give('magazines');
  g.give('letter');
  g.snapCamera();
  g.sfx('knock');
  await g.voice('문밖', '하르트만! 문 여시오. 경찰이오.');
  g.endTalk();
  await hideSequence(g);
}

type Place = 'left' | 'carried' | 'coffeepot' | 'potato' | 'floor' | 'bag' | 'basket' | 'wardrobe' | 'burned';
const MAGS = ['mag1', 'mag2', 'mag3'] as const;
const ITEMS = [...MAGS, 'letter'] as const;

async function hideSequence(g: Game) {
  const s = g.scene!;
  const e = g.player;
  const paul = s.actors.get('paul')!;
  const lotte = s.actors.get('lotte')!;
  g.audio.ambience('tension');
  // Three issues lie around the room; the letter is in her hand. Every hiding place holds only so much.
  const place: Record<string, Place> = { mag1: 'left', mag2: 'left', mag3: 'left', letter: 'carried' };
  const spots: Record<string, [number, number]> = { mag1: [X.table + 4, 22], mag2: [230, 64], mag3: [X.bed + 18, 26] };
  for (const m of MAGS) s.prop(m, 'magazines', spots[m][0], spots[m][1], -16);
  let left = 25;
  let done = false;
  let forced = false;
  g.take('magazines');
  g.give('letter');

  const carriedMags = () => MAGS.filter((m) => place[m] === 'carried');
  const syncInv = () => { if (carriedMags().length) g.give('magazines'); else g.take('magazines'); if (place.letter !== 'carried') g.take('letter'); };
  const used: Record<string, number> = {};
  const room = (spot: string, cap: number) => cap - (used[spot] ?? 0);
  /** Put what fits: magazines first, then the letter. */
  const stash = (spot: Place, cap: number, mags: boolean, letter: boolean) => {
    if (mags) for (const m of carriedMags()) if (room(spot, cap) > 0) { place[m] = spot; used[spot] = (used[spot] ?? 0) + 1; }
    if (letter && place.letter === 'carried' && room(spot, cap) > 0) { place.letter = spot; used[spot] = (used[spot] ?? 0) + 1; }
    syncInv();
  };
  const can = (spot: string, cap: number, mags: boolean, letter: boolean) =>
    room(spot, cap) > 0 && ((mags && carriedMags().length > 0) || (letter && place.letter === 'carried'));

  await g.think('새 호는 탁자 위에. 지난 호들은 선반과 침대 머리맡에. 그리고 손에는 요한의 편지.');
  await g.think('노이만 씨 집에서는 옷장과 바구니부터 뒤졌다고 했다.');
  g.endTalk();
  g.objective('「파수대」 세 부와 편지를 숨기자');
  g.toast('문 두드리는 소리가 커진다', 2);

  const pick = (m: (typeof MAGS)[number]) => ({
    id: m, x: spots[m][0], r: 10, verb: '집기', enabled: () => place[m] === 'left', use: async () => {
      g.sfx('paper'); e.pose = 'reach'; await g.wait(0.35); e.pose = null;
      place[m] = 'carried'; s.props.get(m)!.mesh.visible = false; syncInv();
    },
  });

  s.hotspots = [
    pick('mag1'), pick('mag2'), pick('mag3'),
    { id: 'coffeepot', x: X.stove + 6, r: 9, verb: '커피포트', enabled: () => can('coffeepot', 1, false, true), use: async () => {
      g.sfx('hide'); stash('coffeepot', 1, false, true); g.toast('편지를 커피포트 안에 접어 넣었다');
    } },
    { id: 'stove', x: X.stove - 6, r: 8, verb: '태우기', enabled: () => place.letter === 'carried', use: async () => {
      g.sfx('fire'); e.pose = 'crouch'; await g.wait(1.4); e.pose = null; stash('burned', 9, false, true); g.toast('편지는 재가 되었다');
    } },
    { id: 'potato', x: X.potato, r: 10, verb: '감자 상자', enabled: () => can('potato', 1, true, true), use: async () => {
      e.pose = 'crouch'; g.sfx('hide'); await g.wait(1.1); e.pose = null;
      stash('potato', 1, true, true); g.toast('감자 밑에 묻었다. 하나가 겨우 들어간다');
    } },
    { id: 'basket', x: X.basket, r: 9, verb: '바구니', enabled: () => can('basket', 1, true, true), use: async () => {
      g.sfx('hide'); stash('basket', 1, true, true); g.toast('천 조각 밑에 밀어 넣었다');
    } },
    { id: 'wardrobe', x: X.wardrobe, r: 14, verb: '옷장', enabled: () => can('wardrobe', 2, true, true), use: async () => {
      g.sfx('door', 0.5); stash('wardrobe', 2, true, true); g.toast('침대보 사이에 끼워 넣었다');
    } },
    { id: 'floor', x: X.floor, r: 10, verb: '마룻장', hold: 1.8, enabled: () => can('floor', 2, true, true), use: async () => {
      s.props.get('floorboard')!.set('floorboard_open'); g.sfx('hide'); await g.wait(0.3);
      stash('floor', 2, true, true);
      s.props.get('floorboard')!.set('floorboard'); g.toast('마룻장 밑은 두 부가 한계다');
    } },
    { id: 'bag', x: X.bag - 6, r: 12, verb: '로테에게', enabled: () => place.letter === 'carried', use: async () => {
      if (g.flag('lotte_trust', 1) >= 2) {
        await g.say('lotte', 'resolute', '…내 가방에. 공책 사이에.');
        g.endTalk();
        lotte.pose = 'crouch'; g.sfx('paper'); await g.wait(0.8); lotte.pose = null;
        stash('bag', 1, false, true);
      } else {
        await g.say('lotte', 'afraid', '엄마… 나 무서워.');
        g.endTalk();
        await g.think('로테는 손을 뒤로 숨겼다. 시간이 없다.');
        g.endTalk();
      }
    } },
    { id: 'door', x: X.door + 4, r: 12, verb: '문 열기', use: async () => { done = true; } },
  ];

  let knockT = 3;
  let lastShown = -1;
  let prev = g.d.now;
  await g.d.release(g.d.until(() => {
    const now = g.d.now;
    const dt = now - prev;
    prev = now;
    if (g.ui.talking || g.state !== 'play') return false; // time stops while Lotte answers or paused
    left -= dt;
    knockT -= dt;
    const sec = Math.ceil(left);
    if (sec !== lastShown) { lastShown = sec; g.ui.counter(`문밖에서 기다리는 시간 · ${Math.max(0, sec)}`); }
    if (knockT <= 0) { knockT = left < 8 ? 1.8 : 3; g.sfx(left < 8 ? 'knock_hard' : 'knock'); g.haptic(30); }
    if (left <= 0) { forced = true; return true; }
    return done;
  }));
  // wait for any hiding action in progress to finish
  await g.d.until(() => g.d.busy <= 1);
  g.ui.counter(null);
  s.hotspots = [];
  g.objective('');

  // ---- the search ----
  const vogt = s.addActor('vogt', g.actor('vogt', 12), X.door, 1);
  const brandt = s.addActor('brandt', g.actor('brandt_day', 11), X.door - 6, 1);
  vogt.speed = 34; brandt.speed = 30;
  if (forced) {
    g.sfx('knock_hard'); await g.wait(0.6);
    await g.voice('문밖', '자물쇠공! 열어.');
    g.endTalk();
    g.sfx('door'); g.haptic(80);
  } else {
    await e.walkTo(X.door + 26); e.facing = -1;
    g.sfx('door');
  }
  g.set('forced', forced);
  e.pose = null;
  await vogt.walkTo(X.door + 40);
  void brandt.walkTo(X.door + 22);
  if (e.x < X.door + 60) await e.walkTo(X.door + 62);
  e.facing = -1;

  await g.say('vogt', 'stern', forced ? '문 하나 여는 데 꽤 오래 걸리는군, 하르트만 부인.' : '하르트만 부인. 국가경찰 포크트요.');
  await g.say('vogt', 'neutral', '하일 히틀러.');
  const greet = await g.choose(['아무 말도 하지 않는다', '"안녕하세요."', '"저는 그 인사를 할 수 없습니다."']);
  if (greet === 0) { await g.say('vogt', 'stern', '…좋소. 침묵도 대답이지.'); }
  else if (greet === 1) { await g.say('elise', 'neutral', '안녕하세요.'); await g.say('vogt', 'stern', '"안녕하세요". 요즘 그렇게 말하는 사람은 둘뿐이오. 늙은 사제들과, 당신들.'); }
  else {
    g.set('refused_greeting', true);
    await g.say('elise', 'resolute', '저는 그 인사를 할 수 없습니다.');
    await g.say('vogt', 'stern', '기록해 두시오, 브란트.');
    lotte.face(e.x);
  }
  await g.say('vogt', 'neutral', '이 집에 금지된 인쇄물이 있다는 신고가 들어왔소. 뒤져.');
  g.endTalk();

  // search route, item by item
  const found: string[] = [];
  const check = async (who: Actor, x: number, label: string, hits: (p: Place) => boolean) => {
    await who.walkTo(x);
    who.pose = 'reach'; g.sfx('hide', 0.6); await g.wait(0.9); who.pose = null;
    for (const item of ITEMS) if (hits(place[item])) found.push(item);
    if (label) g.toast(label, 1.4);
  };
  for (const item of ITEMS) if (place[item] === 'carried') found.push(item);
  if (found.length) { await g.say('vogt', 'stern', '손에 든 그건 뭐요. 이리 주시오.'); g.endTalk(); }
  const lying = MAGS.filter((m) => place[m] === 'left');
  if (lying.length) {
    await brandt.walkTo(spots[lying[0]][0] - 8);
    found.push(...lying);
    for (const m of lying) s.props.get(m)!.mesh.visible = false;
    g.sfx('paper');
    await g.say('brandt', 'neutral', lying.length > 1 ? '숨길 생각도 안 했군요. 여기저기 그대로 있습니다.' : '여기 하나 그대로 있습니다.');
    g.endTalk();
  }
  await check(brandt, X.table, '탁자', () => false);
  await check(vogt, X.basket, '재봉 바구니', (p) => p === 'basket');
  await check(brandt, X.stove, '난로', () => false);
  if (place.letter === 'burned') { await g.say('brandt', 'neutral', '불 속에 종이 탄 자국이 있습니다. 읽을 수는 없습니다.'); g.endTalk(); }
  await check(vogt, X.wardrobe, '옷장', (p) => p === 'wardrobe');
  await check(brandt, X.potato, forced ? '감자 상자' : '', (p) => forced && p === 'potato');
  if (forced) { await check(vogt, X.floor, '러그 밑', (p) => p === 'floor'); }
  else { await vogt.walkTo(X.floor); vogt.pose = 'reach'; await g.wait(0.5); vogt.pose = null; await g.say('vogt', 'neutral', '…'); g.endTalk(); }
  // the schoolbag
  await vogt.walkTo(X.bag - 14);
  await g.say('vogt', 'neutral', '그 가방, 이리 줘 보렴.');
  if (place.letter === 'bag') {
    lotte.pose = 'fear';
    await g.say('lotte', 'afraid', '…숙제밖에 없어요.');
    await g.say('brandt', 'neutral', '포크트 씨. 애 가방까지 뒤질 것까진 없잖소.');
    await g.say('vogt', 'stern', '…이 동네는 마음이 약하군.');
    lotte.pose = null;
  } else {
    await g.say('lotte', 'worried', '…여기요.');
    g.sfx('paper'); await g.wait(0.6);
    await g.say('vogt', 'neutral', '숙제뿐이군.');
  }
  g.endTalk();

  const magsFound = found.some((f) => f !== 'letter');
  const letterFound = found.includes('letter');
  g.set('mags_found', magsFound);
  g.set('letter_found', letterFound);
  g.inc('suspicion', (forced ? 1 : 0) + (magsFound ? 1 : 0) + (letterFound ? 1 : 0) + (g.flag('refused_greeting', false) ? 1 : 0));
  g.take('magazines'); g.take('letter');

  await vogt.walkTo(e.x + 18); vogt.facing = -1;
  if (magsFound) {
    g.sfx('paper');
    await g.say('vogt', 'stern', '「파수대」. 스위스에서 들어온 거지. 이걸 누가 가져다주었소?');
  } else if (letterFound) {
    await g.say('vogt', 'stern', '"오늘 다섯 시, 빵집 뒷문. 한 집에 한 장." …이 편지, 누가 썼소?');
  } else {
    await g.say('vogt', 'neutral', '아무것도 없군. 오늘은.');
    await g.say('vogt', 'stern', '하지만 당신들이 모이는 걸 우린 알고 있소. 누가 당신들에게 책을 넘겨주지?');
  }
  e.pose = null;
  const name = await g.choose(['"모릅니다."', '아무 말도 하지 않는다', '"…빵집의 요한 베커입니다."']);
  if (name === 2) {
    g.set('named_johann', true);
    await g.say('elise', 'afraid', '…빵집의, 요한 베커입니다.');
    paul.face(e.x);
    await g.say('paul', 'sad', '엘리제…');
    await g.say('vogt', 'smile', '거 봐요. 어렵지 않잖소.');
  } else if (name === 0) {
    await g.say('elise', 'resolute', '모릅니다.');
    await g.say('vogt', 'stern', '다들 그렇게 말하지. 처음에는.');
  } else {
    await g.say('vogt', 'stern', '…');
    await g.say('vogt', 'stern', '당신 딸이 보고 있소, 부인. 그 애한테 무엇을 가르치는지 잘 생각해 보시오.');
  }

  if (magsFound) {
    g.set('paul_taken', true);
    await g.say('vogt', 'neutral', '하르트만 씨는 우리와 함께 갑니다. 몇 가지 물어볼 게 있어서.');
    await g.say('paul', 'resolute', '…로테, 엄마 말 잘 들어.');
    await g.say('lotte', 'afraid', '아빠!');
    g.endTalk();
    void brandt.walkTo(X.door);
    paul.pose = 'bow';
    await paul.walkTo(X.door + 8);
    s.removeActor('paul');
  } else {
    await g.say('vogt', 'stern', '다음에 올 때는 오늘처럼 친절하지 않을 거요.');
    g.endTalk();
  }
  await vogt.walkTo(X.door);
  g.sfx('door');
  s.removeActor('vogt');
  s.removeActor('brandt');
  await g.wait(1.2);
  g.audio.ambience('room');
  if (letterFound && !g.flag('named_johann', false)) await g.think('편지에는 빵집이 적혀 있었다. 요한에게 알려야 한다.');
  if (place.letter === 'coffeepot') await g.think('커피포트. 그들은 뚜껑조차 열어 보지 않았다.');
  g.endTalk();
  await g.card('오후 4시 40분', 1.6);
  g.hideCard();
  g.checkpoint('dusk');
  await dusk(g, true);
}

// ================================================================== 3. DUSK
async function dusk(g: Game, continuing = false) {
  g.setScene(buildHome(g, 'dusk'));
  const s = g.scene!;
  const e = elise(g, 'elise_out', X.table - 10, -1);
  const lotte = s.addActor('lotte', g.actor('lotte', 12), X.table + 22, -1);
  const paulHome = !g.flag('paul_taken', false);
  const paul = paulHome ? s.addActor('paul', g.actor('paul', 12), X.sewing + 6, -1) : null;
  if (paul) paul.pose = 'sit';
  g.snapCamera();
  if (!continuing) { await g.card('오후 4시 40분', 1.2); g.hideCard(); }
  g.audio.music('none');
  for (const i of [...g.items]) g.take(i);

  if (paulHome) {
    await g.say('paul', 'worried', '아직 늦지 않았어. 오늘은 그냥 집에 있어도 돼.');
    if (g.flag('named_johann', false)) {
      await g.say('paul', 'sad', '…요한은 오늘 밤 그 사람들이 온다는 걸 몰라.');
    }
  } else {
    await g.say('lotte', 'sad', '아빠는 언제 와?');
    await g.say('elise', 'worried', '…곧.');
    await g.think('파울을 데려간 건 세 시간 전이다. 아무 소식도 없다.');
  }
  const go = await g.choose(['코트를 여민다. "다녀올게."', '오늘 밤은 집에 남는다']);
  if (go === 1) {
    g.set('stayed', true);
    await g.say('elise', 'sad', '…오늘은 여기 있을게.');
    if (paul) await g.say('paul', 'sad', '그래. 그것도 용기야.');
    await g.say('lotte', 'worried', '엄마, 창밖에 누가 있어. 우체통 앞에.');
    await g.think('눈 속에서, 누군가가 우체통에 무언가를 밀어 넣고 서둘러 사라졌다.');
    await g.think('같은 시간, 이 나라 곳곳에서.');
    g.endTalk();
    await ending(g);
    return;
  }
  if (g.flag('lotte_trust', 1) >= 2) await g.say('lotte', 'resolute', paulHome ? '아빠랑 기다릴게.' : '나 혼자 있을 수 있어. 문 잠글게.');
  else await g.say('lotte', 'afraid', paulHome ? '…빨리 와야 돼.' : '가지 마… 엄마까지 가면 안 돼.');
  if (!paulHome) { await g.say('elise', 'sad', '크뤼거 부인 집 문을 두드리렴. 무슨 일이 있으면.'); }
  g.endTalk();
  lotte.face(e.x);
  g.objective('현관문으로 나가자');
  s.hotspots = [
    { id: 'out', x: X.door + 4, r: 14, verb: '나가기', use: async () => {
      g.sfx('door');
      g.ui.fade(true);
      await g.wait(0.7);
      g.setScene(buildStair(g));
      elise(g, 'elise_out', 46, 1);
      g.snapCamera();
      g.ui.fade(false);
      await stairwell(g);
    } },
  ];
}

async function stairwell(g: Game) {
  const s = g.scene!;
  const kr = s.addActor('kruger', g.actor('kruger', 12), 172, -1);
  kr.pose = 'bow';
  g.objective('계단을 내려가자');
  let talked = false;
  s.hotspots = [
    { id: 'kruger', x: 172, r: 22, verb: '대화', enabled: () => !talked, use: async () => {
      talked = true;
      kr.pose = null; kr.face(g.player.x);
      await g.say('kruger', 'stern', '…하르트만 부인. 이 시간에 어딜 가요. 이 눈에.');
      if (g.flag('paul_taken', false)) await g.say('kruger', 'worried', '낮에 파울 씨를 데려가는 걸 봤어요.');
      else await g.say('kruger', 'worried', '낮에… 다 들렸어요. 이 건물 벽은 얇으니까.');
      const c = await g.choose(['석탄통을 대신 들어 준다', '"빵 사러요." 하고 지나간다']);
      if (c === 0) {
        g.set('kruger_kind', true);
        g.player.pose = 'carry'; s.props.get('coal')!.mesh.visible = false;
        await g.wait(0.4);
        await g.player.walkTo(158);
        g.sfx('drop'); g.player.pose = null;
        await g.say('kruger', 'sad', '…고마워요. 남편은 이런 건 안 해 줘요. 회의만 다니지.');
        await g.say('kruger', 'worried', '오늘 밤엔 커튼을 일찍 칠 거예요. 눈이 아파서. …알겠어요?');
      } else {
        await g.say('elise', 'neutral', '빵 사러요.');
        await g.say('kruger', 'stern', '토요일 이 시간에 빵을 파는 집이 있나 보군요.');
      }
      g.endTalk();
      kr.pose = 'bow';
    } },
    { id: 'down', x: 236, r: 14, verb: '내려가기', use: async () => {
      g.checkpoint('street');
      g.ui.fade(true);
      await g.wait(0.7);
      await street(g, true);
    } },
  ];
}

// ================================================================== 4. THE STREET (17:00–19:00)
async function street(g: Game, arrived = false) {
  const built: Street = buildStreet(g);
  g.setScene(built.s);
  if (!arrived) { await g.card('오후 5시', 1); g.hideCard(); }
  const { s, L } = built;
  const e = elise(g, 'elise_out', L.homeDoor + 4, 1);
  g.snapCamera();
  g.ui.fade(false);
  g.audio.music('none');
  g.items = [];
  g.ui.inventory([]);

  // Krüger's window
  const kw = L.windows.find((w) => w.id === 'kruger') ?? L.windows.find((w) => w.x < 150 && w.lit);
  const kind = g.flag('kruger_kind', false);
  if (kw && kind) {
    s.prop('curtain', 'curtain', kw.x, kw.y - 10, -40);
    const li = s.lights.find((l) => l.x === kw.x && l.y === kw.y); if (li) li.on = false;
  }

  // watchers
  const brandt = s.addActor('brandt', g.actor('brandt', 11), 640, -1);
  const bg = g.addGuard(brandt, [380, 1180, 640], 76, 22, true);
  let vg: Guard | null = null;
  if (g.flag('letter_found', false) || g.flag('named_johann', false) || g.flag('suspicion', 0) >= 3) {
    const vogt = s.addActor('vogt', g.actor('vogt', 11), 640, 1);
    vg = g.addGuard(vogt, [560, 760], 52, 14, false);
  }

  let delivered = 0;
  let hasLeaflets = false;
  let gotLeaflets = false;
  const done = new Set<number>();
  const mailboxes = L.mailboxes.filter((x) => x > L.homeDoor + 30);
  const total = 12;

  g.objective('빵집 「베커」 왼쪽 골목의 뒷문으로');
  g.startClock(t(17, 0), t(19, 0), 330, () => void timeUp());

  const hideSpots = [
    ...L.doors.filter((d) => d.id !== 'home').map((d) => ({ x: d.x, label: d.id === 'church' ? '현관에 숨기' : '문간에 숨기' })),
    { x: 520, label: '수레 뒤에 숨기' }, { x: 880, label: '통 뒤에 숨기' },
  ];

  s.hotspots = [
    ...hideSpots.map((h, i) => ({ id: `hide${i}`, x: h.x, r: 9, verb: h.label.split(' ')[0] === '현관에' ? '숨기' : '숨기', use: () => g.hideAt(h.x) })),
    ...mailboxes.map((x, i) => ({ id: `mb${i}`, x, r: 8, verb: '넣기', hold: 0.9, enabled: () => hasLeaflets && !done.has(i), use: async () => {
      done.add(i);
      delivered++;
      g.set('delivered', delivered);
      g.sfx('paper');
      s.props.get(`mb${L.mailboxes.indexOf(x)}`)!.set('mailbox_done');
      g.ui.counter(`전단 ${total - delivered} · 넣은 우편함 ${delivered}`);
      if (!kind && kw && Math.abs(x - kw.x) < 200) g.set('kruger_saw', true);
      if (delivered >= Math.min(total, mailboxes.length)) { hasLeaflets = false; g.take('leaflets'); g.objective('집으로 돌아가자'); }
    } })),
    { id: 'bakery', x: L.bakeryDoor, r: 10, verb: '두드리기', enabled: () => !gotLeaflets, use: () => bakery() },
    { id: 'home', x: L.homeDoor, r: 10, verb: '집으로', enabled: () => gotLeaflets || g.flag('warned', false), use: () => goHome() },
  ];

  const bakery = async () => {
    gotLeaflets = true;
    g.sfx('knock', 0.5);
    await g.wait(0.8);
    g.sfx('door', 0.6);
    const jo = s.addActor('johann', g.actor('johann', 12), L.bakeryDoor - 2, 1);
    e.face(jo.x);
    if (vg) {
      await g.say('johann', 'worried', '엘리제. 가게 앞에 모자 쓴 남자가 한 시간째 서 있어.');
    }
    if (g.flag('named_johann', false)) {
      await g.say('johann', 'neutral', '파울은 괜찮아? 낮에 무슨 일이 있었다고 들었어.');
      const c = await g.choose(['"…요한, 미안해요. 그 사람들에게 당신 이름을 말했어요."', '아무 말도 하지 못한다']);
      if (c === 0) {
        g.set('confessed', true);
        await g.say('johann', 'sad', '…');
        await g.say('johann', 'resolute', '그래. 그럼 오늘이 내 마지막 밤일지도 모르겠군. 그렇다면 더더욱 헛되이 보낼 수 없지.');
      } else await g.think('목이 메어 아무 말도 나오지 않았다.');
    }
    await g.say('johann', 'resolute', '열두 장. 한 집에 한 장씩. 우체통이나 문틈으로.');
    await g.say('johann', 'neutral', '일곱 시엔 모두 집에 있어야 해. 브란트는 램프를 들고 다니니 멀리서도 보여.');
    g.give('leaflets');
    hasLeaflets = true;
    await g.say('johann', 'smile', '눈이 와서 다행이야. 발소리가 묻히니까. …하나님께서 함께하시길.');
    g.endTalk();
    g.sfx('door', 0.6);
    s.removeActor('johann');
    g.ui.counter(`전단 ${total} · 넣은 우편함 0`);
    g.objective('일곱 시 전에 우편함에 전단을 넣자 · 램프 불빛을 피할 것');
    g.toast('문간에 들어가면 숨을 수 있다', 2.6);
  };

  const timeUp = async () => {
    g.stopClock();
    g.objective('일곱 시가 넘었다. 집으로 돌아가자');
    bg.actor.speed = 30;
    g.toast('거리에 순찰이 늘었다', 2);
  };

  const goHome = async () => {
    g.stopClock();
    g.ui.counter(null);
    g.sfx('door');
    await ending(g);
  };

  g.onCaught = (guard) => {
    void g.d.run(async () => {
      if (g.hidden) g.unhide();
      const isBrandt = guard === bg;
      const holding = hasLeaflets;
      guard.actor.face(e.x);
      e.face(guard.actor.x);
      e.pose = 'fear';
      const warned = g.flag('warned', false);
      const mercy = holding ? isBrandt && !warned && g.flag('suspicion', 0) < 3 : !warned;
      if (mercy && !isBrandt) {
        // Vogt stops her empty-handed: a cold warning, nothing to arrest her for yet.
        await guard.actor.walkTo(e.x + (guard.actor.x > e.x ? 16 : -16));
        await g.say('vogt', 'smile', '하르트만 부인. 눈 오는 밤에 산책이라. 코트를 열어 보시오.');
        g.sfx('paper', 0.5);
        await g.say('vogt', 'stern', '…빈손이군. 집에 가시오. 당신 집 창문은 내가 잘 아니까.');
        g.endTalk();
        e.pose = null;
        g.set('warned', true);
        g.inc('suspicion');
        g.objective(gotLeaflets ? '포크트가 지켜본다. 조심해서 계속하거나 집으로' : '집으로 돌아가자');
        guard.reset(guard.actor.x + (guard.actor.x > e.x ? 50 : -50));
        return;
      }
      if (mercy) {
        await guard.actor.walkTo(e.x + (guard.actor.x > e.x ? 16 : -16));
        await g.say('brandt', 'stern', '하르트만 부인. 이 시간에 여기서 뭘 하는 거요.');
        if (holding) {
          await g.say('brandt', 'neutral', '그 코트 안에 든 거. …아니, 말하지 마시오.');
          await g.say('brandt', 'worried', '난 오늘 밤 아무것도 못 봤소. 그 종이들은 하수구에 버리고, 당장 집으로 가시오.');
          g.take('leaflets'); hasLeaflets = false;
        } else {
          await g.say('brandt', 'worried', '포크트가 오늘 이 거리에 와 있소. 집에 가시오. 당장.');
        }
        await g.say('elise', 'worried', '…고맙습니다, 브란트 씨.');
        await g.say('brandt', 'stern', '고마워하지 마시오. 다음엔 나도 어쩔 수 없소.');
        g.endTalk();
        e.pose = null;
        g.set('warned', true);
        g.objective('집으로 돌아가자');
        g.ui.counter(null);
        guard.reset(guard.actor.x + (guard.actor.x > e.x ? 60 : -60));
        return;
      }
      // arrest
      g.stopClock();
      g.audio.ambience('tension');
      await guard.actor.walkTo(e.x + (guard.actor.x > e.x ? 14 : -14));
      if (guard === vg) await g.say('vogt', 'smile', '하르트만 부인. 빵 사러 나왔소?');
      else await g.say('brandt', 'sad', '…부인. 이번엔 안 되오.');
      if (holding) await g.say(guard === vg ? 'vogt' : 'brandt', 'stern', '코트를 여시오.');
      g.endTalk();
      g.set('arrested', true);
      e.pose = 'bow';
      await g.wait(1.2);
      await ending(g);
    });
  };
}

// ================================================================== 5. ENDING
async function ending(g: Game) {
  const f = (k: string) => g.flags[k];
  g.ui.counter(null);
  g.stopClock();
  g.audio.ambience('none');
  g.audio.music('sorrow');
  g.ui.fade(true);
  await g.wait(1.0);

  if (f('arrested')) {
    await g.card('그날 밤, 엘리제는 집으로 돌아가지 못했다.', 2.6);
    await g.card(f('paul_taken') ? '로테는 크뤼거 부인의 부엌에서, 의자에 앉은 채 잠이 들었다.' : '파울은 밤새 창가에 서 있었다.', 2.6);
  } else {
    // home at night
    g.setScene(buildHome(g, 'night'));
    const s = g.scene!;
    const e = elise(g, 'elise_out', X.door + 30, 1);
    const lotte = s.addActor('lotte', g.actor('lotte', 12), X.table + 4, -1);
    if (!f('paul_taken')) { const p = s.addActor('paul', g.actor('paul', 12), X.sewing, -1); p.pose = 'sit'; }
    g.snapCamera();
    g.ui.fade(false);
    await g.wait(0.8);
    await e.walkTo(X.table - 18);
    const n = Number(f('delivered') ?? 0);
    if (f('stayed')) {
      await g.say('lotte', 'worried', '엄마, 그 사람 무사히 집에 갔을까?');
      await g.say('elise', 'sad', '…그랬으면 좋겠구나.');
    } else if (n > 0) {
      await g.say('lotte', 'smile', '엄마 왔다!');
      await g.say('elise', 'smile', n >= 8 ? '응. 다 끝났어.' : '응. 할 수 있는 만큼 했어.');
      if (f('paul_taken')) {
        await g.say('lotte', 'sad', '아빠는?');
        await g.say('elise', 'worried', '…내일은 올 거야. 같이 기다리자.');
      } else await g.say('paul', 'smile', '눈 털고 와. 수프 데워 놨어.');
    } else {
      await g.say('lotte', 'worried', '엄마… 괜찮아?');
      await g.say('elise', 'sad', '…응. 브란트 씨가 그냥 보내 줬어.');
    }
    g.endTalk();
    lotte.face(e.x);
    await g.wait(1.0);
    g.ui.fade(true);
    await g.wait(1.0);
    if (n >= 1 && !f('stayed')) await g.card('다음 날 아침, 경찰이 거리의 집집마다 문을 두드렸다.\n사람들은 아무것도 받지 못했다고 말했다.', 3.2);
    if (f('kruger_saw')) await g.card('크뤼거 부인의 커튼이 그날 밤 내내 조금 걷혀 있었다.', 2.4);
    else if (f('kruger_kind')) await g.card('그날 밤, 크뤼거 부인의 창문은 일찍 어두워졌다.', 2.2);
  }
  if (f('named_johann')) await g.card(f('confessed') ? '월요일 아침, 빵집 베커의 덧문은 열리지 않았다.\n요한은 마지막 빵을 이웃에게 나눠 주고 갔다고 했다.' : '월요일 아침, 빵집 베커의 덧문은 열리지 않았다.', 3);
  if (f('paul_taken') && !f('arrested')) await g.card('파울은 사흘 뒤에 돌아왔다. 그는 그 사흘에 대해 말하지 않았다.', 2.6);
  await g.card('1937년 6월.\n그들은 다시 왔다.', 2.4);
  g.hideCard();

  const lines: string[] = [];
  if (f('stayed')) lines.push('엘리제는 그날 밤 집에 남았다.');
  else if (f('arrested')) lines.push('엘리제는 체포되었다.');
  else lines.push(`엘리제가 넣은 우편함: ${Number(f('delivered') ?? 0)}곳`);
  lines.push(f('lotte_trust') === 2 ? '로테는 엄마를 믿는다.' : '로테는 아직 무엇이 옳은지 묻고 있다.');
  if (f('named_johann')) lines.push('요한의 이름이 그들의 서류에 적혔다.');
  if (f('kruger_kind')) lines.push('크뤼거 부인은 커튼을 쳤다.');
  g.end('제1장 · 12월', lines.join('\n') + '\n\n제2장 「공개 서한」으로 계속됩니다.');
}

export { BG_H, FLOOR_ROW };
