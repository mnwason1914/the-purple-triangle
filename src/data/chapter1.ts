import * as THREE from 'three';
import type { Actor } from '../characters/actor';
import type { Chapter, Game } from '../game/game';
import { BG_H, FLOOR_ROW, paintHome, paintNightSky, paintStairwell, paintStreet, type StreetLayout } from '../scenes/env';
import { Scene } from '../scenes/scene';
import type { Guard } from '../systems/stealth';

/**
 * CHAPTER 1 — 12 December 1936, Lindenfeld.
 * Written from story/script-ch1.md (Gemini script, reviewed).
 * Flags: lotte_trust (0-2), donated, suspicion, forced, mags_found, letter_found, book_found, book_burned,
 * refused_greeting, named_johann, paul_taken, stayed, kruger_kind, kruger_saw, confessed, delivered, warned, arrested.
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
  // lit winter-relief notice board: a bright patch on Brandt's beat
  s.prop('board', 'board', 1030, 0, -9);
  s.lights.unshift({ x: 1030, y: 30, r: 46, i: 0.95 }); // first, so the 16-light cap never drops it
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

// ================================================================== 1. MORNING  (script: 장면 A, A-1)
const SHELF_BOOK: [number, number] = [202, 64];

async function morning(g: Game) {
  g.set('lotte_trust', 1);
  g.items = [];
  g.checkpoint('morning');
  g.setScene(buildHome(g, 'day'));
  const s = g.scene!;
  s.prop('book', 'mannabook', SHELF_BOOK[0], SHELF_BOOK[1], -16);
  const e = elise(g, 'elise', X.sewing, 1);
  e.pose = 'sit';
  g.snapCamera();
  g.audio.music('none');
  await g.card('1936년 12월 12일, 토요일<small>베스트팔렌 · 린덴펠트</small>', 2.4);
  g.hideCard();
  g.audio.music('home');
  g.sfx('sew');
  await g.wait(1.2);
  await g.think('파울의 외투가 많이 얇아졌다. 올겨울을 무사히 버텨야 할 텐데.');
  await g.think('토요일이니 로테는 정오쯤 돌아오겠지.');
  g.endTalk();
  e.pose = null;
  g.objective('집을 둘러보고 재봉틀에서 일을 마치기');

  let sewn = false;
  const look = (id: string, x: number, verb: string, lines: string[], r = 10) => ({
    id, x, r, verb, enabled: () => !sewn,
    use: async () => { for (const l of lines) await g.think(l); g.endTalk(); },
  });
  s.hotspots = [
    { ...look('radio', X.radio, '라디오', ['정치 선전과 군가뿐인 라디오. 들을 때보다 끌 때가 더 많다.'], 12), use: async () => {
      g.sfx('blip'); await g.think('정치 선전과 군가뿐인 라디오. 들을 때보다 끌 때가 더 많다.'); g.endTalk();
    } },
    look('calendar', X.calendar, '달력', ['12일에 그려진 동그라미. 우리들만 아는 약속의 날이다.']),
    look('photo', 118, '사진', ['1924년 결혼사진. 파울이 아끼던 모자를 쓰고 웃고 있다.'], 8),
    look('window', X.sewing - 4, '창밖', ['건너편 창가의 크뤼거 부인. 남편이 구역 반장이 된 후론 인사를 안 받는다.'], 22),
    look('floor', X.floor, '마룻장', ['러그 밑에 숨겨진 헐거운 마룻장. 지금은 비어 있다.']),
    look('stove', X.stove, '난로', ['난로에 아직 온기가 남았다. 석탄을 더 아껴야 해.'], 12),
    look('bag', X.bag, '가방 자리', ['로테의 책가방이 놓여야 할 자리. 아직 주인 없이 비어 있다.']),
    look('shelf', SHELF_BOOK[0], '기록부', ['『만나』 생일 기록부. 형제자매들의 이름과 주소가 빼곡하다.', '이 작은 책에 우리 모두의 소중한 삶이 담겨 있다.'], 9),
    { id: 'sew', x: X.sewing, r: 14, verb: '재봉', enabled: () => !sewn, use: async () => {
      sewn = true;
      e.x = X.sewing; e.facing = 1; e.pose = 'sit';
      g.objective('');
      g.sfx('sew'); await g.wait(1.0);
      g.sfx('knock'); await g.wait(0.8);
      await krugerCollects(g, e);
      e.x = X.sewing; e.facing = 1; e.pose = 'sit';
      g.sfx('sew'); await g.wait(1.2);
      await lotteComesHome(g, e);
    } },
  ];
}

async function krugerCollects(g: Game, e: Actor) {
  const s = g.scene!;
  e.pose = null;
  await e.walkTo(X.door + 26); e.facing = -1;
  g.sfx('door');
  const kr = s.addActor('kruger', g.actor('kruger', 12), X.door + 4, 1);
  await g.say('kruger', 'smile', '안녕하세요, 하르트만 부인. 날이 참 춥지요?');
  await g.say('elise', 'neutral', '안녕하세요, 크뤼거 부인. 무슨 일이신가요?');
  await g.say('kruger', 'neutral', '겨울구호 기금을 모으고 있어요. 어려운 이웃을 돕는 일이죠.');
  await g.say('kruger', 'neutral', '다들 조금씩이라도 성의를 보이고 있답니다.');
  await g.think('부인의 시선이 어깨 너머로 집 안을 집요하게 훑는다.');
  const c = await g.choose(['"조금이나마 보태겠습니다."', '"이번 달은 형편이 어려워서요."']);
  if (c === 0) {
    g.set('donated', true);
    g.sfx('pick');
    await g.say('kruger', 'smile', '고마워요. 이웃끼리 서로 돕고 살아야지요.');
    await g.say('kruger', 'neutral', '그나저나 요즘 댁에 드나드는 손님이 많더군요.');
  } else {
    g.inc('suspicion');
    await g.say('kruger', 'stern', '흐음, 그래요? 다들 사정은 비슷하겠지만요.');
    await g.say('kruger', 'stern', '어쩔 수 없죠. 명단에는 기부 거부로 올려야겠군요.');
    await g.say('kruger', 'stern', '구역 반장인 제 남편이 워낙 꼼꼼해서요.');
  }
  g.endTalk();
  s.removeActor('kruger'); void kr;
  g.sfx('door');
  await g.think('부인의 차가운 시선이 문틈 사이에 남은 것만 같다.');
  await g.say('elise', 'worried', '…서둘러 일을 끝내야겠어.');
  g.endTalk();
  await e.walkTo(X.sewing);
}

// script: 장면 C, D
async function lotteComesHome(g: Game, e: Actor) {
  const s = g.scene!;
  g.sfx('door');
  const lotte = s.addActor('lotte', g.actor('lotte', 12), X.door, 1);
  lotte.speed = 30;
  await g.wait(0.5);
  await lotte.walkTo(X.sewing - 24);
  e.pose = null; e.face(lotte.x);
  await g.say('elise', 'worried', '로테? 벌써 온 거니? 아직 정오도 안 됐는데.');
  await g.say('lotte', 'sad', '쉬츠 선생님이 그냥 집에 가라고 하셨어.');
  await g.say('lotte', 'sad', '아침 조회 때 다들 팔을 들었지만, 난 들지 않았어.');
  await g.say('lotte', 'worried', '노래가 시작됐을 때도 그냥 입을 꾹 다물고 있었어.');
  await g.say('lotte', 'sad', '선생님이 날 교실 뒤에 세우고 아이들에게 말씀하셨어.');
  await g.say('lotte', 'afraid', '배신자네 집 아이니까 가까이 지내지 말라고.');
  g.sfx('paper');
  await g.think('교장 직인이 찍힌 통지서야. 월요일까지 학교로 오라니.');

  const c = await g.choose(['말없이 꼭 안아 준다', '"잘했어. 넌 옳은 일을 한 거야."', '"…다음엔 눈에 띄지 않게 뒤에 서 있으렴."']);
  if (c === 0) {
    g.set('lotte_trust', 2);
    await g.say('elise', 'sad', '많이 무서웠지? 장하다, 우리 딸.');
    await g.say('lotte', 'sad', '무서웠지만 울지 않았어. 엄마가 가르쳐 준 대로 했어.');
    await g.say('elise', 'smile', '넌 엄마보다 훨씬 용감하구나.');
  } else if (c === 1) {
    g.set('lotte_trust', 2);
    await g.say('elise', 'resolute', '잘했다. 하느님께서 네 용기를 기뻐하실 거야.');
    await g.say('lotte', 'worried', '그럼 월요일에도 경례 안 해도 돼?');
    await g.say('elise', 'resolute', '그래. 월요일엔 엄마가 같이 학교에 가마.');
  } else {
    g.set('lotte_trust', 0);
    await g.say('elise', 'worried', '…다음부턴 맨 뒤에 서서 눈에 띄지 않게 하렴.');
    await g.say('lotte', 'sad', '엄마는 숨지 않으면서 왜 나보고만 숨으라고 해?');
    await g.think('아이의 물음에 아무 대답도 할 수 없었다.');
  }
  g.endTalk();
  await lotte.walkTo(X.bed + 18);
  lotte.facing = -1; lotte.pose = 'sit';

  // Paul arrives
  await g.wait(1.0);
  g.sfx('door');
  const paul = s.addActor('paul', g.actor('paul', 12), X.door, 1);
  await paul.walkTo(X.table - 8);
  e.face(paul.x);
  await g.say('paul', 'neutral', '나 왔어. 오는 길에 빵집의 요한에게 들렀어.');
  g.sfx('paper');
  await g.say('paul', 'worried', '새로 나온 「파수대」 두 부야. 그리고 요한의 편지도.');
  await g.say('paul', 'stern', '편지는 읽고 나서 바로 없애야 해.');
  g.give('letter');
  await g.think('오늘 다섯 시, 빵집 뒷문. 한 집에 한 장씩.');
  await g.say('elise', 'worried', '당신이 직접 가면 안 되는 거야?');
  await g.say('paul', 'worried', '신호소 놈들이 내 도시락 가방까지 뒤지고 있어.');
  await g.say('paul', 'resolute', '다섯 시부터 일곱 시까지, 전국에서 동시에 하는 일이야.');
  await g.say('paul', 'resolute', '당신이 가 줘. 우리 가족을 위해서, 그리고 형제들을 위해.');
  g.endTalk();
  // he leaves one issue on the table and one by the bed
  await paul.walkTo(X.table + 18);
  paul.facing = -1;
  await g.wait(1.4);

  // THE KNOCK
  g.audio.music('none');
  g.sfx('knock_hard');
  g.haptic(60);
  await g.wait(1.0);
  await g.voice('문밖', '하르트만! 문 열어! 국가경찰이다!');
  g.endTalk();
  lotte.pose = null;
  g.checkpoint('knock');
  await hideSequence(g);
}

// ================================================================== 2. THE KNOCK  (script: 장면 E, F)
async function knock(g: Game) {
  // Resume directly into the hiding sequence.
  g.setScene(buildHome(g, 'day'));
  elise(g, 'elise', X.table - 30, 1);
  const s = g.scene!;
  s.addActor('lotte', g.actor('lotte', 12), X.bed + 18, -1);
  s.addActor('paul', g.actor('paul', 12), X.table + 18, -1);
  g.items = [];
  g.snapCamera();
  g.sfx('knock_hard');
  await g.voice('문밖', '하르트만! 문 열어! 국가경찰이다!');
  g.endTalk();
  await hideSequence(g);
}

type Place = 'left' | 'carried' | 'coffeepot' | 'potato' | 'floor' | 'bag' | 'basket' | 'wardrobe' | 'burned';
const MAGS = ['mag1', 'mag2'] as const;
const ITEMS = [...MAGS, 'book', 'letter'] as const;
type Item = (typeof ITEMS)[number];

async function hideSequence(g: Game) {
  const s = g.scene!;
  const e = g.player;
  const paul = s.actors.get('paul')!;
  const lotte = s.actors.get('lotte')!;
  g.audio.ambience('tension');
  // Two issues lie out (table, bedside), the birthday book is on the shelf, the letter is in her hand.
  const place: Record<Item, Place> = { mag1: 'left', mag2: 'left', book: 'left', letter: 'carried' };
  const spots: Record<'mag1' | 'mag2' | 'book', [number, number]> = { mag1: [X.table + 4, 22], mag2: [X.bed + 18, 26], book: SHELF_BOOK };
  s.prop('mag1', 'magazines', spots.mag1[0], spots.mag1[1], -16);
  s.prop('mag2', 'magazines', spots.mag2[0], spots.mag2[1], -16);
  if (!s.props.has('book')) s.prop('book', 'mannabook', SHELF_BOOK[0], SHELF_BOOK[1], -16);
  let left = 25;
  let done = false;
  let forced = false;
  g.items = [];
  g.give('letter');

  const carried = (items: readonly Item[]) => items.filter((m) => place[m] === 'carried');
  const syncInv = () => {
    if (carried(MAGS).length) g.give('magazines'); else g.take('magazines');
    if (place.book === 'carried') g.give('book'); else g.take('book');
    if (place.letter === 'carried') g.give('letter'); else g.take('letter');
  };
  const used: Record<string, number> = {};
  const room = (spot: string, cap: number) => cap - (used[spot] ?? 0);
  /** Put what fits, in order: magazines, then the book, then the letter. */
  const stash = (spot: Place, cap: number, what: readonly Item[]) => {
    for (const it of carried(what)) if (room(spot, cap) > 0) { place[it] = spot; used[spot] = (used[spot] ?? 0) + 1; }
    syncInv();
  };
  const can = (spot: string, cap: number, what: readonly Item[]) => room(spot, cap) > 0 && carried(what).length > 0;
  const ANY = ITEMS;

  await g.think('잡지 두 부는 탁자와 침대맡에, 기록부는 선반에 있다.');
  await g.think('노이만 씨네는 옷장부터 뒤졌댔지. 빨리 숨겨야 해.');
  g.endTalk();
  g.objective('25초 안에 물건 숨기기');

  const pick = (it: 'mag1' | 'mag2' | 'book') => ({
    id: it, x: spots[it][0], r: 10, verb: '집어 들기', enabled: () => place[it] === 'left', use: async () => {
      g.sfx('paper'); e.pose = 'reach'; await g.wait(0.35); e.pose = null;
      place[it] = 'carried'; s.props.get(it)!.mesh.visible = false; syncInv();
    },
  });
  const burn = async (it: 'letter' | 'book') => {
    g.sfx('fire'); e.pose = 'crouch'; await g.wait(1.4); e.pose = null;
    place[it] = 'burned'; syncInv();
    if (it === 'letter') g.toast('요한의 편지가 불길 속으로 사라졌다');
    else {
      g.set('book_burned', true);
      await g.think('형제자매들의 이름이 불 속으로 사라진다.');
      await g.think('이 이름들을 다시는 되찾을 수 없겠지.');
      g.endTalk();
    }
  };

  s.hotspots = [
    pick('mag1'), pick('mag2'), pick('book'),
    { id: 'coffeepot', x: X.stove + 6, r: 9, verb: '커피포트', enabled: () => can('coffeepot', 1, ['letter']), use: async () => {
      g.sfx('hide'); stash('coffeepot', 1, ['letter']); g.toast('커피포트 안에 편지를 숨겼다');
    } },
    { id: 'stove', x: X.stove - 6, r: 8, verb: '태우기', enabled: () => carried(['letter', 'book']).length > 0, use: async () => {
      const c = carried(['letter', 'book']);
      if (c.length === 2) {
        const i = await g.choose(['편지 태우기', '기록부 태우기']);
        await burn(i === 0 ? 'letter' : 'book');
      } else await burn(c[0] as 'letter' | 'book');
    } },
    { id: 'potato', x: X.potato, r: 10, verb: '감자 상자', enabled: () => can('potato', 1, ANY), use: async () => {
      e.pose = 'crouch'; g.sfx('hide'); await g.wait(1.1); e.pose = null;
      const wasMag = carried(MAGS).length > 0;
      stash('potato', 1, ANY); g.toast(wasMag ? '감자 사이에 잡지 한 부를 묻었다' : '감자 사이에 깊이 묻었다');
    } },
    { id: 'basket', x: X.basket, r: 9, verb: '바구니', enabled: () => can('basket', 1, ANY), use: async () => {
      g.sfx('hide'); stash('basket', 1, ANY); g.toast('재봉 바구니 밑바닥에 깔았다');
    } },
    { id: 'wardrobe', x: X.wardrobe, r: 14, verb: '옷장', enabled: () => can('wardrobe', 2, ANY), use: async () => {
      g.sfx('door', 0.5); stash('wardrobe', 2, ANY); g.toast('옷장 깊숙이 밀어 넣었다');
    } },
    { id: 'floor', x: X.floor, r: 10, verb: '마룻장', hold: 1.8, enabled: () => can('floor', 2, ANY), use: async () => {
      s.props.get('floorboard')!.set('floorboard_open'); g.sfx('hide'); await g.wait(0.3);
      stash('floor', 2, ANY);
      s.props.get('floorboard')!.set('floorboard'); g.toast('마룻장을 들어 그 밑에 숨겼다');
    } },
    { id: 'bag', x: X.bag - 6, r: 12, verb: '로테에게', enabled: () => place.letter === 'carried', use: async () => {
      if (g.flag('lotte_trust', 1) >= 2) {
        await g.say('lotte', 'resolute', '내 가방에 줘. 공책 사이에 끼울게.');
        g.endTalk();
        lotte.pose = 'crouch'; g.sfx('paper'); await g.wait(0.8); lotte.pose = null;
        stash('bag', 1, ['letter']);
      } else {
        await g.say('lotte', 'afraid', '엄마… 나 너무 무서워.');
        g.endTalk();
        await g.think('로테는 겁에 질려 손을 뒤로 숨겼다.');
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
    if (g.ui.talking || g.ui.choosing || g.state !== 'play') return false; // time stops while talking or paused
    left -= dt;
    knockT -= dt;
    const sec = Math.ceil(left);
    if (sec !== lastShown) { lastShown = sec; g.ui.counter(`문밖에서 기다리는 시간 · ${Math.max(0, sec)}`); }
    if (knockT <= 0) { knockT = left < 8 ? 1.8 : 3; g.sfx(left < 8 ? 'knock_hard' : 'knock'); g.haptic(30); }
    if (left <= 0) { forced = true; return true; }
    return done;
  }));
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
    await g.voice('문밖', '자물쇠공을 불러와! 문을 따야겠다.');
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

  if (forced) await g.say('vogt', 'stern', '자물쇠를 새로 달아야겠군. 협조할 생각이 없었나 보오.');
  else await g.say('vogt', 'neutral', '스스로 열었군. 현명하오.');
  await g.say('vogt', 'neutral', '하일 히틀러.');
  const greet = await g.choose(['아무 말도 하지 않는다', '"안녕하세요."', '"저는 그 인사를 할 수 없습니다."']);
  if (greet === 0) await g.say('vogt', 'stern', '입이 붙기라도 했소?');
  else if (greet === 1) {
    await g.say('elise', 'neutral', '안녕하세요.');
    await g.say('vogt', 'stern', '요즘 "안녕하세요"라 하는 건 사제들과 당신들뿐이지.');
  } else {
    g.set('refused_greeting', true);
    await g.say('elise', 'resolute', '저는 그 인사를 할 수 없습니다.');
    await g.say('vogt', 'stern', '브란트, 이 태도를 기록해 두시오.');
    lotte.face(e.x);
  }
  await g.say('vogt', 'stern', '금지된 인쇄물을 돌린다는 신고가 왔소. 집을 뒤지시오.');
  g.endTalk();

  const found: Item[] = [];
  const check = async (who: Actor, x: number, label: string, hits: (p: Place) => boolean) => {
    await who.walkTo(x);
    who.pose = 'reach'; g.sfx('hide', 0.6); await g.wait(0.9); who.pose = null;
    for (const it of ITEMS) if (hits(place[it]) && !found.includes(it)) found.push(it);
    if (label) g.toast(label, 1.4);
  };
  const inHand = carried(ITEMS);
  if (inHand.length) { found.push(...inHand); await g.say('vogt', 'stern', '손에 든 걸 이리 내시오.'); g.endTalk(); }
  const lying = (['mag1', 'mag2', 'book'] as const).filter((m) => place[m] === 'left');
  if (lying.length) {
    await brandt.walkTo(spots[lying[0]][0] - 8);
    found.push(...lying);
    for (const m of lying) s.props.get(m)!.mesh.visible = false;
    g.sfx('paper');
    await g.say('brandt', 'neutral', lying.some((m) => m !== 'book') ? '여기 금지된 잡지가 있습니다.' : '선반에 작은 책이 하나 있습니다.');
    g.endTalk();
  }
  await check(brandt, X.table, '경찰이 탁자를 뒤엎는다', () => false);
  await check(vogt, X.basket, '재봉 바구니를 쏟는다', (p) => p === 'basket');
  await check(brandt, X.stove, '난로를 들여다본다', () => false);
  if (place.letter === 'burned' || place.book === 'burned') { await g.say('brandt', 'neutral', '난로에 종이를 태운 흔적이 있습니다. 읽을 수 없습니다.'); g.endTalk(); }
  await check(vogt, X.wardrobe, '옷장을 끄집어낸다', (p) => p === 'wardrobe');
  if (forced) {
    await check(brandt, X.potato, '감자 상자를 쏟는다', (p) => p === 'potato');
    await check(vogt, X.floor, '러그 밑을 샅샅이 뒤진다', (p) => p === 'floor');
  } else {
    await vogt.walkTo(X.floor); vogt.pose = 'reach'; await g.wait(0.5); vogt.pose = null;
    await g.say('vogt', 'neutral', '…….'); g.endTalk();
  }
  // the schoolbag
  await vogt.walkTo(X.bag - 14);
  await g.say('vogt', 'neutral', '그 가방을 이리 내라.');
  if (place.letter === 'bag') {
    lotte.pose = 'fear';
    await g.say('lotte', 'afraid', '숙제밖에 없어요.');
    await g.say('brandt', 'neutral', '애 가방까지 뒤질 건 없잖소.');
    await g.say('vogt', 'stern', '이 동네 사람들은 마음이 너무 약해서 탈이오.');
    lotte.pose = null;
  } else {
    await g.say('lotte', 'worried', '여기요.');
    g.sfx('paper'); await g.wait(0.6);
    await g.say('vogt', 'neutral', '쳇, 숙제뿐이군.');
  }
  g.endTalk();

  const magsFound = found.some((f) => f === 'mag1' || f === 'mag2');
  const letterFound = found.includes('letter');
  const bookFound = found.includes('book');
  g.set('mags_found', magsFound);
  g.set('letter_found', letterFound);
  g.set('book_found', bookFound);
  g.inc('suspicion', (forced ? 1 : 0) + (magsFound ? 1 : 0) + (letterFound ? 1 : 0) + (bookFound ? 1 : 0) + (g.flag('refused_greeting', false) ? 1 : 0));
  g.items = []; g.take('letter');

  await vogt.walkTo(e.x + 18); vogt.facing = -1;
  if (magsFound) {
    g.sfx('paper');
    await g.say('vogt', 'stern', '스위스에서 넘어온 거군. 누가 가져다줬소?');
  } else if (letterFound) {
    await g.say('vogt', 'stern', '"오늘 다섯 시, 빵집 뒷문. 한 집에 한 장." …누가 쓴 거요?');
  }
  if (bookFound) {
    g.sfx('paper');
    await g.say('vogt', 'smile', '이름과 주소가 가득하군. 생일 축하 카드를 꽤 보내야겠소.');
  }
  if (!magsFound && !letterFound) {
    if (!bookFound) await g.say('vogt', 'neutral', '오늘은 운이 좋군. 하지만 당신들이 모인다는 건 다 아오.');
    await g.say('vogt', 'stern', '누가 당신들에게 책을 넘겨주오?');
  }
  e.pose = null;
  const name = await g.choose(['"모릅니다."', '아무 말도 하지 않는다', '"…빵집의 요한 베커입니다."']);
  if (name === 2) {
    g.set('named_johann', true);
    await g.say('elise', 'afraid', '…빵집의 요한 베커입니다.');
    paul.face(e.x);
    await g.say('paul', 'sad', '엘리제…!');
    await g.say('vogt', 'smile', '진작 그렇게 말할 일이지.');
  } else if (name === 0) {
    await g.say('elise', 'resolute', '모릅니다.');
    await g.say('vogt', 'stern', '다들 처음엔 그렇게 말하지.');
  } else {
    await g.say('vogt', 'stern', '딸이 보고 있소. 무엇을 가르치는지 잘 생각하시오.');
  }

  if (magsFound) {
    g.set('paul_taken', true);
    await g.say('vogt', 'neutral', '하르트만 씨, 같이 가 줘야겠소.');
    await g.say('paul', 'resolute', '로테야, 엄마 말씀 잘 듣고 있어라.');
    await g.say('lotte', 'afraid', '아빠! 안 돼!');
    g.endTalk();
    void brandt.walkTo(X.door);
    paul.pose = 'bow';
    await paul.walkTo(X.door + 8);
    s.removeActor('paul');
  } else {
    await g.say('vogt', 'stern', '다음번엔 오늘처럼 친절하지 않을 거요.');
    g.endTalk();
  }
  await vogt.walkTo(X.door);
  g.sfx('door');
  s.removeActor('vogt');
  s.removeActor('brandt');
  await g.wait(1.2);
  g.audio.ambience('room');
  if (letterFound && !g.flag('named_johann', false)) await g.think('요한에게 알려야 해. 이대로라면 그가 위험해져.');
  if (place.letter === 'coffeepot') await g.think('커피포트 뚜껑조차 열어 보지 않았어. 하느님, 감사합니다.');
  if (!bookFound && place.book !== 'burned') await g.think('숨겨 둔 기록부를 떠올렸다. 형제들의 이름은 무사하다.');
  g.endTalk();
  await g.card('오후 4시 40분', 1.6);
  g.hideCard();
  g.checkpoint('dusk');
  await dusk(g, true);
}

// ================================================================== 3. DUSK  (script: 장면 G, H)
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
    await g.say('paul', 'worried', '아직 늦지 않았어. 오늘은 그냥 집에 있어도 된다.');
    if (g.flag('named_johann', false)) await g.say('paul', 'sad', '요한은 오늘 밤 그들이 들이닥칠 거란 걸 모를 거야.');
  } else {
    await g.say('lotte', 'sad', '엄마, 아빠는 언제 와? 경찰서에서 벌써 오실 때 됐잖아.');
    await g.say('elise', 'worried', '…곧 오실 거야. 조금만 더 기다려 보자.');
    await g.think('파울이 끌려간 지 세 시간째 아무런 소식이 없다.');
  }
  const go = await g.choose(['코트를 여민다. "다녀올게."', '오늘 밤은 집에 남는다']);
  if (go === 1) {
    g.set('stayed', true);
    await g.think('…결국 문을 열지 못했다.');
    if (paul) await g.say('paul', 'sad', '괜찮아. 나가지 않는 것도 때로는 용기가 필요한 법이야.');
    await g.say('lotte', 'worried', '엄마, 저기 봐! 창밖 우체통 앞에 누가 있어.');
    await g.think('누군가 우체통에 전단을 급히 밀어 넣고 어둠 속으로 사라졌다.');
    await g.think('같은 시간, 이 나라 곳곳에서 누군가 같은 일을 하고 있을 것이다.');
    g.endTalk();
    await ending(g);
    return;
  }
  const trust = g.flag('lotte_trust', 1) >= 2;
  if (paulHome) {
    if (trust) await g.say('lotte', 'resolute', '엄마, 조심해서 다녀와. 내가 문 잘 잠그고 있을게.');
    else await g.say('lotte', 'afraid', '나 두고 가지 마, 엄마. 엄마도 아빠처럼 잡혀가면 어떡해?');
  } else {
    if (trust) await g.say('lotte', 'resolute', '걱정 마, 엄마. 내가 집 잘 지키고 있을게. 빨리 와야 해.');
    else await g.say('lotte', 'afraid', '아빠도 없는데 엄마까지 가면 난 어떡해. 가지 마, 제발.');
    await g.say('elise', 'sad', '무슨 일이 생기면 건너편 크뤼거 부인 집 문을 두드리렴.');
  }
  g.endTalk();
  lotte.face(e.x);
  g.objective('현관문으로 나가기');
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
  g.objective('계단 내려가기');
  let talked = false;
  s.hotspots = [
    { id: 'kruger', x: 172, r: 22, verb: '대화', enabled: () => !talked, use: async () => {
      talked = true;
      kr.pose = null; kr.face(g.player.x);
      await g.say('kruger', 'stern', '하르트만 부인, 이 눈 오는 저녁에 어딜 가요?');
      if (g.flag('paul_taken', false)) await g.say('kruger', 'sad', '낮에 파울 씨 연행되는 거 봤어요. 마음이 안 좋구려.');
      else await g.say('kruger', 'worried', '낮에 집이 아주 시끄럽더구려. 벽이 얇아서 다 들려요.');
      if (g.flag('donated', false)) await g.say('kruger', 'neutral', '아침엔 고마웠어요. 덕분에 체면치레는 했구려.');
      else await g.say('kruger', 'stern', '남편이 명단을 꼼꼼히 보더군. 조심하는 게 좋을 거요.');
      const c = await g.choose(['석탄통을 대신 들어 준다', '"빵 사러요." 하고 지나간다']);
      if (c === 0) {
        g.set('kruger_kind', true);
        g.player.pose = 'carry'; s.props.get('coal')!.mesh.visible = false;
        await g.wait(0.4);
        await g.player.walkTo(158);
        g.sfx('drop'); g.player.pose = null;
        await g.say('kruger', 'sad', '바쁠 텐데 고마워요. 우리 남편은 손 하나 안 까딱하는데.');
        await g.say('kruger', 'worried', '오늘 밤엔 눈이 아파서 커튼을 일찍 칠 거예요.');
        await g.say('kruger', 'neutral', '…무슨 뜻인지 알겠지요?');
      } else {
        await g.say('elise', 'neutral', '식구가 먹을 빵을 좀 사러 가야 해서요. 실례하겠습니다.');
        await g.say('kruger', 'stern', '토요일 이 시간에 문을 연 빵집이 있나 보군요.');
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
  // drop points: every mailbox, and the gap under each house door ("우편함이나 문 밑")
  const drops = [
    ...L.mailboxes.map((x, i) => ({ x, kind: 'mailbox' as const, prop: `mb${i}` })),
    ...L.doors.filter((d) => d.id.startsWith('door')).map((d) => ({ x: d.x - 7, kind: 'gap' as const, prop: '' })),
  ].filter((d) => d.x > L.homeDoor + 12); // includes her own tenement's mailbox
  const total = 20;

  g.objective('빵집 「베커」 뒷문으로 가기');
  g.startClock(t(17, 0), t(19, 0), 330, () => void timeUp());

  const hideSpots = [
    ...L.doors.filter((d) => d.id !== 'home').map((d) => ({ x: d.x, label: d.id === 'church' ? '현관에 숨기' : '문간에 숨기' })),
    { x: 520, label: '수레 뒤에 숨기' }, { x: 880, label: '통 뒤에 숨기' },
  ];

  s.hotspots = [
    ...hideSpots.map((h, i) => ({ id: `hide${i}`, x: h.x + 5, r: 6, verb: '숨기', use: () => g.hideAt(h.x) })),
    ...drops.map((d, i) => ({ id: `drop${i}`, x: d.x, r: d.kind === 'gap' ? 5 : 8, verb: d.kind === 'gap' ? '밀어 넣기' : '넣기', hold: 0.9,
      enabled: () => hasLeaflets && !done.has(i), use: async () => {
        done.add(i);
        delivered++;
        g.set('delivered', delivered);
        g.sfx('paper');
        if (d.prop) s.props.get(d.prop)!.set('mailbox_done');
        g.ui.counter(`전단 ${total - delivered} · 넣은 곳 ${delivered}`);
        if (!kind && kw && Math.abs(d.x - kw.x) < 200) g.set('kruger_saw', true);
        if (delivered >= Math.min(total, drops.length)) { hasLeaflets = false; g.take('leaflets'); g.objective('집으로 돌아가기'); }
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
    if (vg) await g.say('johann', 'worried', '왔는가. 가게 앞에 모자 쓴 남자가 한 시간째 서 있더군.');
    if (g.flag('named_johann', false)) {
      await g.say('johann', 'neutral', '파울은 괜찮은가? 낮에 경찰이 들이닥쳤다고 들었네.');
      const c = await g.choose(['"요한, 미안해요. 당신 이름을 말했어요."', '아무 말도 하지 못한다']);
      if (c === 0) {
        g.set('confessed', true);
        await g.say('johann', 'sad', '그렇군. 어쩌면 오늘이 우리의 마지막 밤일지도 모르겠네.');
        await g.say('johann', 'resolute', '그렇다면 더더욱 이 일을 헛되이 보낼 수 없지.');
      } else await g.think('입이 떨어지지 않는다. 그의 인자한 얼굴을 볼 수가 없다.');
    }
    await g.say('johann', 'resolute', '전단 스무 장일세. 한 집에 한 장씩, 우편함이나 문 밑으로.');
    await g.say('johann', 'neutral', '일곱 시엔 모두 집에 있어야 하네. 그 전엔 끝내야 해.');
    await g.say('johann', 'worried', '브란트가 램프를 들고 다니니 조심하게. 게시판 근처는 밝네.');
    g.give('leaflets');
    hasLeaflets = true;
    await g.say('johann', 'smile', '눈이 와서 다행이군. 발소리가 묻힐 게야. 하느님이 함께하시길.');
    g.endTalk();
    g.sfx('door', 0.6);
    s.removeActor('johann');
    g.ui.counter(`전단 ${total} · 넣은 곳 0`);
    g.objective('일곱 시 전 완료 · 불빛 피하기');
    g.toast('문간에 들어가면 숨을 수 있다.', 2.6);
  };

  const timeUp = async () => {
    g.stopClock();
    g.objective('일곱 시 경과 · 서둘러 귀가');
    bg.actor.speed = 30;
    g.toast('거리에 순찰이 늘었습니다.', 2);
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
        await g.say('vogt', 'smile', '눈 오는 밤에 산책이라니, 코트를 열어 보시오.');
        g.sfx('paper', 0.5);
        await g.say('vogt', 'stern', '빈손이군. 집에 가시오. 당신 집 창문은 내가 잘 아오.');
        g.endTalk();
        e.pose = null;
        g.set('warned', true);
        g.inc('suspicion');
        g.objective(gotLeaflets ? '포크트의 감시 피해 귀가하기' : '집으로 돌아가기');
        guard.reset(guard.actor.x + (guard.actor.x > e.x ? 50 : -50));
        return;
      }
      if (mercy) {
        await guard.actor.walkTo(e.x + (guard.actor.x > e.x ? 16 : -16));
        await g.say('brandt', 'stern', '이 시간에 여기서 뭘 하고 있소?');
        if (holding) {
          await g.say('brandt', 'neutral', '코트 안에 든 거… 나한테 보여주지 마시오.');
          await g.say('brandt', 'worried', '난 아무것도 못 봤소. 하수구에 버리고 당장 집으로 가시오.');
          g.take('leaflets'); hasLeaflets = false;
        } else {
          await g.say('brandt', 'worried', '포크트가 이 거리에 와 있소. 어서 집으로 가시오.');
        }
        await g.say('elise', 'worried', '고맙습니다, 브란트 씨.');
        await g.say('brandt', 'stern', '고마워하지 마시오. 다음엔 나도 어쩔 수 없소.');
        g.endTalk();
        e.pose = null;
        g.set('warned', true);
        g.objective('집으로 돌아가기');
        g.ui.counter(null);
        guard.reset(guard.actor.x + (guard.actor.x > e.x ? 60 : -60));
        return;
      }
      // arrest
      g.stopClock();
      g.audio.ambience('tension');
      await guard.actor.walkTo(e.x + (guard.actor.x > e.x ? 14 : -14));
      if (guard === vg) await g.say('vogt', 'smile', '빵 사러 나왔다더니, 이건 빵이 아니구려.');
      else {
        await g.say('brandt', 'sad', '…부인, 이번엔 나도 어쩔 수 없소.');
        if (holding) await g.say('brandt', 'stern', '코트를 여시오.');
      }
      g.endTalk();
      g.set('arrested', true);
      e.pose = 'bow';
      await g.wait(1.2);
      await ending(g);
    });
  };
}

// ================================================================== 5. ENDING  (script: 장면 J)
async function ending(g: Game) {
  const f = (k: string) => g.flags[k];
  g.ui.counter(null);
  g.stopClock();
  g.audio.ambience('none');
  g.audio.music('sorrow');
  g.ui.fade(true);
  await g.wait(1.0);
  const n = Number(f('delivered') ?? 0);

  if (f('arrested')) {
    await g.card('그날 밤 엘리제는 집으로 돌아가지 못했다.', 2.6);
    await g.card(f('paul_taken') ? '로테는 크뤼거 부인의 부엌 의자에서 잠이 들었다.' : '파울은 어둠 속에서 밤새 창가에 서 있었다.', 2.6);
  } else {
    g.setScene(buildHome(g, 'night'));
    const s = g.scene!;
    const e = elise(g, 'elise_out', X.door + 30, 1);
    const lotte = s.addActor('lotte', g.actor('lotte', 12), X.table + 4, -1);
    if (!f('paul_taken')) { const p = s.addActor('paul', g.actor('paul', 12), X.sewing, -1); p.pose = 'sit'; }
    g.snapCamera();
    g.ui.fade(false);
    await g.wait(0.8);
    await e.walkTo(X.table - 18);
    if (f('stayed')) {
      await g.say('lotte', 'worried', '그 사람, 무사히 집에 갔을까?');
      await g.say('elise', 'sad', '…그랬기를 바랄 뿐이야.');
    } else if (n > 0) {
      await g.say('lotte', 'smile', '엄마 왔다!');
      await g.say('elise', 'smile', n >= 10 ? '다행히 약속한 곳에 다 전해주고 왔단다.' : '조금밖에 못 했지만… 그래도 다녀왔어.');
      if (f('paul_taken')) {
        await g.say('lotte', 'sad', '아빠는? 경찰서에서 아직 안 오셨어?');
        await g.say('elise', 'worried', '내일은 꼭 오실 거야. 하느님께 기도하자.');
      } else await g.say('paul', 'smile', '어서 들어와. 눈 털고 앉아, 수프 데워 놨어.');
    } else {
      await g.say('lotte', 'worried', '엄마… 괜찮아? 옷이 다 젖었어.');
      await g.say('elise', 'sad', '브란트 씨가 그냥 보내 주셨단다. 운이 좋았어.');
    }
    g.endTalk();
    lotte.face(e.x);
    await g.wait(1.0);
    g.ui.fade(true);
    await g.wait(1.0);
  }
  if (n >= 1) await g.card('다음 날 경찰이 집집마다 전단에 대해 물었지만,\n주민들은 아무것도 받지 못했다고 답했다.', 3.2);
  if (f('kruger_kind')) await g.card('그날 밤 크뤼거 부인의 창문은 일찍 어두워졌다.', 2.2);
  else if (f('kruger_saw') && n >= 1) await g.card('크뤼거 부인의 커튼은 밤새 조금 걷혀 있었다.', 2.4);
  if (f('book_found')) await g.card('그 주에 기록부에 적힌 형제자매 몇 집에도\n경찰이 찾아갔다.', 3);
  else if (f('book_burned')) await g.card('엘리제는 그 이름들을 기억에서 다시 적기 시작했다.', 2.6);
  if (f('named_johann')) {
    await g.card('월요일 아침, 빵집 덧문은 열리지 않았다.', 2.6);
    if (f('confessed')) await g.card('요한은 마지막 빵을 이웃에게 나눠 주고 떠났다.', 2.6);
  }
  if (f('paul_taken') && !f('arrested')) await g.card('파울은 사흘 뒤 돌아왔고,\n그 사흘에 대해 아무 말도 하지 않았다.', 2.8);
  await g.card('1937년 6월.', 1.6);
  await g.card('그들은 다시 왔다.', 2.2);
  g.hideCard();

  const lines: string[] = [];
  if (f('stayed')) lines.push('엘리제는 그날 밤 집에 남았다.');
  else if (f('arrested')) lines.push('엘리제는 거리에서 체포되었다.');
  if (!f('stayed')) lines.push(`전단을 넣은 곳: ${n}곳`);
  lines.push(f('lotte_trust') === 2 ? '로테는 엄마를 믿는다.' : '로테는 아직 무엇이 옳은지 묻고 있다.');
  if (f('named_johann')) lines.push('요한 베커의 이름이 수사 기록에 올랐다.');
  if (f('book_found')) lines.push('생일 기록부의 이름들이 수사 기록에 올랐다.');
  else if (f('book_burned')) lines.push('생일 기록부는 재가 되어 사라졌다.');
  if (f('kruger_kind')) lines.push('크뤼거 부인은 커튼을 쳐 주었다.');
  g.end('제1장 · 12월', lines.join('\n') + '\n\n제2장 「공개 서한」으로 계속됩니다.');
}

export { BG_H, FLOOR_ROW };
