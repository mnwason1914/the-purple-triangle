/**
 * 제1장 「가방 속의 소책자」 — built from the chapter spec (story/ch1-spec.md).
 * Thalheim, Silesia (Prussia), 29 June 1933, the day after the Magdeburg occupation.
 *
 * Flags: suspicion (start 10), composure (80), solidarity (50), ch1_photo ('burned'|'hidden'),
 * ch1_lock_sabotaged, ch1_potato_depth ('deep'|'shallow'), dirtOnHands, emptySpot,
 * ch1_forced, ch1_photo_taken, paul_detained, ch1_found.
 *
 * Line edits against the spec are marked [수정] with the reason in story/ch1-spec-review.md.
 */
import { SIZE } from './assets';
import { intro, outro } from './cinema';
import { FpsGame, type Actor, type FpsChapter, type Target } from './game';
import { WALL_H, type Sprite } from './render';

/** ?fast skips the opening cut and card (testing). */
const FAST = new URLSearchParams(location.search).has('fast');

type ItemState = 'bench' | 'held' | 'pot' | 'out' | 'crate' | 'leni' | 'used';

interface World {
  radio: Sprite; wt: Sprite; mimeo: Sprite; booklets: Sprite; screwdriver: Sprite; pot: Sprite; crate: Sprite;
  helena: Actor; leni: Actor; leniSolid: { x: number; y: number; r: number };
  st: Record<'wt' | 'mimeo' | 'booklets' | 'screwdriver', ItemState>;
}

const BENCH = { x: 7.4, y: 6.32 };
const PHOTO = { x: 5.5, y: 6.0 };
const FRONT = { x: 5.5, y: 11.0 };
const BACK = { x: 13.98, y: 8.5 };

function build(g: FpsGame): World {
  const L = g.level;
  L.photo = g.str('ch1_photo') === 'burned' ? (g.flag('emptySpot', false) ? 'dust' : 'wiped') : g.str('ch1_photo') === 'hidden' ? 'hidden' : 'hung';
  g.sprite('obj_workbench', BENCH.x, BENCH.y, 0, { w: 1.0 });
  g.solid(BENCH.x, BENCH.y, 0.42);
  const top = SIZE.obj_workbench[1] - 0.01;
  const radio = g.sprite('obj_radio', 7.05, 6.24, top);
  const mimeo = g.sprite('obj_mimeograph', 7.32, 6.3, top);
  const wt = g.sprite('obj_watchtower', 7.58, 6.3, top);
  const booklets = g.sprite('obj_booklets', 7.8, 6.28, top);
  const screwdriver = g.sprite('obj_screwdriver', 7.4, 6.47, top);
  g.sprite('obj_bicycle', 2.6, 6.45); g.solid(2.6, 6.45, 0.3);
  g.sprite('obj_wheels', 2.55, 10.5); g.solid(2.55, 10.5, 0.3);
  g.sprite('obj_bulb', 5.5, 8.3, WALL_H - SIZE.obj_bulb[1], { bright: 1.4 });
  g.sprite('obj_range', 11.3, 7.28); g.solid(11.3, 7.28, 0.36);
  const pot = g.sprite('obj_coffeepot', 11.55, 7.24, SIZE.obj_range[1] - 0.02);
  g.sprite('obj_basin', 12.9, 9.64); g.solid(12.9, 9.64, 0.3);
  g.sprite('obj_chair', 10.5, 9.68); g.solid(10.5, 9.68, 0.22);
  const depth = g.str('ch1_potato_depth');
  const crate = g.sprite(depth === 'deep' ? 'obj_potato_crate_deep' : depth === 'shallow' ? 'obj_potato_crate_shallow' : 'obj_potato_crate', 2.0, 1.45);
  g.solid(2.0, 1.45, 0.38);
  g.sprite('obj_wheels', 5.4, 1.4); g.solid(5.4, 1.4, 0.34);
  g.sprite('obj_shelf', 6.62, 2.6); g.solid(6.62, 2.6, 0.28);
  g.sprite('obj_bulb', 2.8, 2.0, WALL_H - SIZE.obj_bulb[1], { bright: 1.2 });
  const helena = g.actor('spr_helena', 7.75, 10.28);
  g.solid(7.75, 10.28, 0.25);
  const leni = g.actor('spr_leni_draw', 2.9, 9.55);
  const leniSolid = g.solid(2.9, 9.55, 0.3);
  return { radio, wt, mimeo, booklets, screwdriver, pot, crate, helena, leni, leniSolid, st: { wt: 'bench', mimeo: 'bench', booklets: 'bench', screwdriver: 'bench' } };
}

function initFlags(g: FpsGame) {
  const f = g.flags;
  if (f.suspicion === undefined) Object.assign(f, {
    suspicion: 10, composure: 80, solidarity: 50, ch1_photo: '', ch1_lock_sabotaged: false, ch1_potato_depth: '',
    dirtOnHands: false, emptySpot: false,
  });
  g.composure = Number(f.composure);
}
function keepComposure(g: FpsGame) { g.set('composure', Math.round(g.composure)); }

// ===================================================================== chapter
export const Chapter1: FpsChapter = {
  first: 'ch1_open',
  title(g) {
    build(g);
    g.place(6.2, 9.4, -Math.PI / 2);
    g.eye = 0.71;
  },
  start(g, cp) {
    initFlags(g);
    if (cp === 'ch1_hide') void g.d.run(() => hide(g, build(g), true));
    else if (cp === 'ch1_after') void g.d.run(() => after(g, build(g), true));
    else { g.flags = {}; initFlags(g); void g.d.run(() => opening(g)); }
  },
};

// ===================================================================== 1-1 workshop
async function opening(g: FpsGame) {
  g.checkpoint('ch1_open');
  const w = build(g);
  g.place(6.4, 8.9, -Math.PI / 2 + 0.35);
  g.audio.music('none');
  g.audio.ambience('room');
  g.ui.fade(true);
  if (!FAST) {
    await intro();
    await g.card('1933년 6월 29일 정오<small>슐레지엔 · 탈하임</small>', 2.2);
    g.hideCard();
  }
  g.hud(true);
  g.progress = '0/3';
  g.ui.fade(false);
  await g.wait(0.6);

  g.setTex(w.radio, 'obj_radio_on');
  w.radio.bright = 0.9;
  g.sfx('radio');
  await g.say('radio', '어제 유월 이십팔일, 돌격대원 서른 명이 마그데부르크의 성경연구생 공장을 점거했습니다.'); // [수정] 어느 공장인지
  g.sfx('radio');
  await g.say('radio', '건물 위에는 하켄크로이츠 깃발이 게양되었습니다.');
  g.setTex(w.radio, 'obj_radio'); w.radio.bright = 0;
  g.sfx('select');
  await g.say('helena', '프로이센까지 금지령이 내린 지 며칠 만에 본부마저 닫혔구나.');
  await g.say('paul', '엄마, 놀라지 마. 우리 집 지하실 물건부터 오늘 치울게.');
  await g.say('leni', '오빠, 라디오 아저씨가 왜 화난 목소리로 말해?');
  await g.say('paul', '아무 일 아니야, 레니. 넌 의자에 앉아서 그림 그리고 있어.');
  g.endTalk();
  g.objective('작업실을 살펴본다');
  g.moveLock = false;

  let photoDone = false, nudged = false;
  const lookBench = async () => { await g.say('paul', '어젯밤 읍내에서 마르타가 가져온 등사기야. 당장 숨겨야 해.'); g.endTalk(); };
  g.targets = [
    { id: 'mimeo', x: w.mimeo.x, y: w.mimeo.y, r: 0.12, name: '등사기', verb: () => '조사', use: lookBench },
    { id: 'wt', x: w.wt.x, y: w.wt.y, r: 0.12, name: '「파수대」 묶음', verb: () => '조사', use: lookBench },
    { id: 'booklets', x: w.booklets.x, y: w.booklets.y, r: 0.1, name: '소책자 묶음', verb: () => '조사', use: lookBench },
    {
      id: 'photo', x: PHOTO.x, y: PHOTO.y, r: 0.3, name: '가족사진', verb: () => (photoDone ? null : '조사'),
      use: async () => {
        await g.think('아버지와 회중 형제들이 함께 찍힌 사진이야.'); // [추가] 왜 얼굴이 문제인지
        if (!nudged) await g.say('helena', '파울, 그 사진부터 떼어 내렴. 경찰 손에 얼굴이 들어가면 안 돼.');
        await g.think('태우면 아버지 얼굴까지 사라져. 하지만 남기면 식구들이 위험해.');
        const i = await g.choose(['액자에서 사진을 꺼내 석탄 레인지 아궁이에 태운다', '사진을 액자 뒤판 나무 틈에 밀어 넣어 숨긴다']);
        if (i === 0) {
          await g.say('paul', '재까지 완전히 부숴 놓을게요.');
          g.endTalk();
          await g.fade(true);
          g.sfx('fire');
          g.set('ch1_photo', 'burned'); g.set('emptySpot', true);
          g.level.photo = 'dust';
          await g.wait(1.2);
          await g.fade(false);
        } else {
          await g.say('paul', '아궁이에 불이 약해서 연기 나면 더 의심받아요.');
          g.endTalk();
          g.sfx('paper');
          g.set('ch1_photo', 'hidden');
          g.level.photo = 'hidden';
        }
        photoDone = true;
      },
    },
  ];
  // Nudge toward the photo if the player wanders.
  void g.d.run(async () => {
    await g.wait(22);
    if (photoDone || g.state !== 'play') return;
    nudged = true;
    g.bark('helena', '파울, 그 사진부터 떼어 내렴. 경찰 손에 얼굴이 들어가면 안 돼.', 3.4);
    g.objective('벽의 가족사진');
  });
  await g.until(() => photoDone && !g.ui.talking);
  await knock(g);
  await hide(g, w, false);
}

async function knock(g: FpsGame) {
  g.moveLock = true; g.targets = [];
  await g.wait(0.4);
  g.sfx('knock_hard'); g.haptic(140);
  await g.wait(0.5);
  g.sfx('knock_hard', 1.2);
  await g.say('otto', '바그너 군! 경찰과 함께 나왔소, 당장 문 여시오!', '오토 베커 (문밖)');
  await g.say('police', '가택 수색이오! 열지 않으면 자물쇠를 따겠소!', '순경 (문밖)'); // [수정] 영장·자물쇠공
  await g.say('helena', '벌써 들이닥쳤어! 파울, 어서 지하실 물건부터 감추렴!');
  g.sfx('scrape');
  await g.say('otto', '비켜 보시오. 이 동네 자물쇠는 다 내 손을 거쳤소.', '오토 베커 (문밖)'); // [수정] 오토가 열쇠수리공
  g.endTalk();
}

// ===================================================================== 1-2 hiding (90 s)
async function hide(g: FpsGame, w: World, resumed: boolean) {
  g.checkpoint('ch1_hide');
  if (resumed) {
    g.place(6.6, 7.4, -Math.PI / 2);
    g.ui.fade(false);
    g.hud(true);
    g.audio.ambience('room');
  }
  const st = w.st;
  let done = 0, forced = false, opened = false;
  const setDone = () => { done = (st.wt === 'out' ? 1 : 0) + (st.mimeo === 'crate' ? 1 : 0) + (st.booklets === 'leni' ? 1 : 0); g.progress = `${done}/3`; refresh(); };
  const refresh = () => {
    const h = g.holding;
    g.objective(
      h === 'wt' ? '「파수대」를 커피포트에 (부엌 레인지)' :
      h === 'pot' ? '커피포트를 뒷문의 이모부에게' :
      h === 'mimeo' ? '등사기를 지하실 감자 상자에' :
      h === 'booklets' ? '소책자를 레니에게' :
      h === 'screwdriver' ? '현관문 안쪽 빗장 나사를 조인다' :
      g.flag('dirtOnHands', false) ? '손을 씻는다 (부엌 세숫대야)' :
      done === 3 ? '현관문을 연다' : `숨기기 ${done}/3 — 「파수대」 · 등사기 · 소책자`);
  };
  g.progress = '0/3';
  refresh();
  g.audio.music('tense');
  g.moveLock = false;

  const pick = (id: 'wt' | 'mimeo' | 'booklets' | 'screwdriver', s: Sprite, name: string, after?: () => void): Target => ({
    id, x: s.x, y: s.y, r: id === 'screwdriver' ? 0.1 : 0.12, name,
    verb: () => (st[id] === 'bench' && !g.holding ? '집기' : null),
    use: () => { st[id] = 'held'; g.holding = id; s.hidden = true; g.sfx('pick'); refresh(); after?.(); },
  });
  g.targets = [
    pick('wt', w.wt, '「파수대」 묶음', () => g.bark('think', '레인지 옆 빈 커피포트 안에 쑤셔 넣자.')),
    pick('mimeo', w.mimeo, '등사기'),
    pick('booklets', w.booklets, '소책자 묶음'),
    pick('screwdriver', w.screwdriver, '드라이버'),
    {
      id: 'bench', x: BENCH.x, y: BENCH.y, r: 0.45, name: '작업대',
      verb: () => (g.holding && g.holding !== 'pot' ? '내려놓기' : null),
      use: () => {
        const h = g.holding as 'wt' | 'mimeo' | 'booklets' | 'screwdriver';
        st[h] = 'bench'; ({ wt: w.wt, mimeo: w.mimeo, booklets: w.booklets, screwdriver: w.screwdriver })[h].hidden = false;
        g.holding = null; g.sfx('drop'); refresh();
      },
    },
    {
      id: 'pot', x: w.pot.x, y: w.pot.y, r: 0.12, name: '법랑 커피포트',
      verb: () => (g.holding === 'wt' ? '넣기' : null),
      use: () => { st.wt = 'pot'; g.holding = 'pot'; w.pot.hidden = true; g.sfx('paper'); refresh(); },
    },
    {
      id: 'back', x: BACK.x, y: BACK.y, r: 0.3, name: '뒷문',
      verb: () => (g.holding === 'pot' ? '건네기' : null),
      use: () => {
        g.level.setBack(true); g.sfx('door');
        g.holding = null; st.wt = 'out'; g.inc('solidarity', 5); setDone();
        g.bark('paul', '이모부, 이 커피포트 좀 잠깐만 맡아 주세요.', 2.4);
        void g.d.run(async () => {
          await g.bark('uncle', '알았다, 수색 끝나면 다시 가져가거라.', 2.4, '이모부 (문틈)');
          await g.wait(1.6);
          g.level.setBack(false); g.sfx('door', 0.6);
        });
      },
    },
    {
      id: 'crate', x: 2.0, y: 1.45, r: 0.3, name: '감자 상자',
      verb: () => (g.holding === 'mimeo' ? '묻기' : null),
      use: async () => {
        await g.think('흙 밑바닥까지 깊이 묻어야 꼬챙이로 찔러도 안 걸려.');
        const i = await g.choose(['감자를 들어내고 바닥 흙 속에 깊이 묻는다 (-12초)', '감자 몇 알만 걷어 내고 얕게 덮는다 (-4초)']);
        g.endTalk();
        g.holding = null; st.mimeo = 'crate';
        g.sfx('hide'); g.sfx('step_snow');
        if (i === 0) {
          g.addTime(-12); g.set('ch1_potato_depth', 'deep'); g.set('dirtOnHands', true); g.setTex(w.crate, 'obj_potato_crate_deep');
          setDone();
          g.bark('think', '손에 흙이 잔뜩 묻었어. 올라가서 물통에 씻어야 해.', 3);
        } else {
          g.addTime(-4); g.set('ch1_potato_depth', 'shallow'); g.setTex(w.crate, 'obj_potato_crate_shallow');
          setDone();
          g.bark('think', '시간은 아꼈지만 흙이 파헤쳐진 티가 좀 나네.', 3);
        }
      },
    },
    {
      id: 'leni', x: w.leni.x, y: w.leni.y, r: 0.2, name: '레니',
      verb: () => (g.holding === 'booklets' && st.booklets === 'held' ? '건네기' : null),
      use: () => void g.d.run(async () => {
        g.holding = null; st.booklets = 'leni'; g.inc('solidarity', 5); setDone();
        g.sfx('paper');
        g.bark('paul', '레니, 이걸 책가방에 넣고 대문 밖에 서 있을 수 있니?', 2.8);
        await g.bark('leni', '응, 오빠. 아무한테도 가방 안 보여 줄게.', 2.6);
        g.solids = g.solids.filter((q) => q !== w.leniSolid);
        w.leni.look('spr_leni_bag'); w.leni.speed = 1.3;
        await g.walk(w.leni, [[3.0, 8.5], [8.6, 8.5], [13.5, 8.5]]);
        if (!g.actors.includes(w.leni)) return;
        g.level.setBack(true); g.sfx('door', 0.6);
        g.removeActor(w.leni);
        await g.wait(0.8);
        g.level.setBack(false);
      }),
    },
    {
      id: 'basin', x: 12.9, y: 9.64, r: 0.25, name: '세숫대야',
      verb: () => (g.flag('dirtOnHands', false) && !g.holding ? '씻기' : null),
      hold: () => 3,
      use: () => { g.sfx('wash'); g.set('dirtOnHands', false); refresh(); g.bark('think', '손톱 밑 흙까지 다 씻어 냈어.'); },
    },
    {
      id: 'wall', x: PHOTO.x, y: PHOTO.y, r: 0.3, name: '사진 자국',
      verb: () => (g.level.photo === 'dust' && !g.holding ? '닦기' : null),
      hold: () => 2,
      use: () => { g.sfx('wipe'); g.level.photo = 'wiped'; g.set('emptySpot', false); g.bark('think', '걸레로 먼지 자국을 닦아 냈어.'); }, // [추가]
    },
    {
      id: 'front', x: FRONT.x, y: FRONT.y, r: 0.3, name: '현관문',
      verb: () => (g.holding === 'screwdriver' ? '조이기' : done === 3 && !g.holding ? '열기' : !g.holding ? '조사' : null),
      hold: () => (g.holding === 'screwdriver' ? 2 : null),
      use: async () => {
        if (g.holding === 'screwdriver') {
          g.sfx('screw'); g.holding = null; st.screwdriver = 'used';
          g.set('ch1_lock_sabotaged', true); g.level.frontScratched = true; g.addTime(25); refresh();
          g.bark('think', '안쪽 걸쇠 나사를 조여 뒀어. 조금은 시간을 벌 거야.', 3);
        } else if (done === 3) opened = true;
        else g.bark('think', '아직 안 돼. 숨길 게 남았어.'); // [추가]
      },
    },
    { id: 'helena', x: w.helena.x, y: w.helena.y, r: 0.2, name: '어머니', verb: () => (g.holding ? null : '조사'), use: () => { g.bark('helena', '서두르렴, 파울. 문은 내가 지킬게.'); } }, // [추가]
  ];

  // footsteps that carry outside
  let noiseLine = 0;
  g.onNoise = () => {
    g.addTime(-5); g.composure = Math.max(0, g.composure - 6); g.haptic(60);
    g.sfx('creak', 1.4);
    const lines: [string, string, string][] = [['police', '안에서 발소리가 나는군. 서두르시오!', '순경 (문밖)'], ['otto', '안에 있는 거 다 압니다, 바그너 군!', '오토 베커 (문밖)']]; // [추가]
    const [who, t, n] = lines[noiseLine++ % 2];
    g.bark(who, t, 2.4, n);
  };
  g.timer.marks = [
    { at: 45, fn: () => { g.bark('otto', '자물쇠가 뻑뻑하군! 조금만 더 비틀면 열립니다!', 3, '오토 베커 (문밖)'); } },
    { at: 20, fn: () => { g.bark('helena', '파울, 이제 다 됐니? 얼른 현관문 열어 주자!', 3); } },
  ];
  g.startTimer(90, () => { forced = true; });
  // the lock being worked on
  void g.d.run(async () => { while (g.timer.running && g.state !== 'end') { await g.wait(1.4 + Math.random()); if (g.timer.running && !g.timer.paused) g.sfx('scrape', 0.7); } });

  await g.until(() => (opened || forced) && !g.busy && !g.ui.talking && !g.ui.choosing);
  g.stopTimer();
  g.onNoise = null;
  g.targets = [];
  if (st.booklets === 'leni' && g.actors.includes(w.leni)) { w.leni.place(13.5, 8.5); g.removeActor(w.leni); g.level.setBack(false); }
  g.moveLock = true;
  keepComposure(g);
  await search(g, w, forced);
}

// ===================================================================== 1-3 search
async function search(g: FpsGame, w: World, forced: boolean) {
  g.audio.music('none');
  const st = w.st;
  const sus = (n: number) => g.inc('suspicion', n);
  const S = () => g.flag('suspicion', 10);
  g.handsOn = true;
  if (forced) {
    g.sfx('unlock'); await g.wait(0.3); g.sfx('slam'); g.haptic(200);
    g.set('ch1_forced', true); sus(10);
  } else { g.sfx('door'); }
  g.level.setFront(true);
  const pA = g.actor('spr_police', 5.5, 12.6), pB = g.actor('spr_police2', 4.9, 13.0), otto = g.actor('spr_otto', 6.1, 13.0);
  void g.walk(pA, [[5.5, 10.25]]); void g.walk(pB, [[5.5, 11.5], [4.75, 10.2]]); void g.walk(otto, [[5.5, 11.6], [6.3, 10.2]]);
  g.pa = Math.atan2(10.6 - g.py, 5.5 - g.px);
  await g.wait(1.4);

  const unhidden = (['wt', 'mimeo', 'booklets'] as const).filter((k) => !['out', 'crate', 'leni'].includes(st[k]));
  if (forced) await g.say('otto', '열렸습니다, 경관님!'); // [추가]
  if (unhidden.length) { g.set('ch1_seized', unhidden.join(',')); return arrest(g, w, unhidden.includes('mimeo') ? 'mimeo' : 'print', [pA, pB, otto]); }

  if (!forced) {
    await g.say('police', '왜 이제야 문을 여는 거요!');
    await g.say('paul', '지금 열었습니다, 경관님. 들어오시지요.'); // [수정] 거짓말 대신
  }
  await g.say('otto', '하일 히틀러! 경관님, 이 녀석이 성경연구생 핵심입니다.');
  await g.say('police', '집 안을 전부 수색한다. 두 사람은 벽에 붙어 서 있소.');
  g.endTalk();
  await g.fade(true);
  g.crouch = false; g.holding = null;
  g.place(8.35, 9.3, Math.PI - 0.25);
  w.helena.place(8.4, 10.25);
  g.solids = g.solids.filter((q) => !(q.x === 7.75 && q.y === 10.28));
  pA.place(5.5, 10.1); pB.place(4.6, 10.0); otto.place(5.6, 10.55);
  await g.fade(false);
  g.lookLock = false;

  // patrol (about 20 seconds)
  void g.walk(pA, [[7.2, 7.1], [9.4, 8.5], [11.4, 8.2], [12.4, 9.0], [9.6, 8.5], [6.6, 9.6]]);
  void g.walk(pB, [[3.5, 7.0], [3.5, 5.2], [3.5, 4.1], [2.6, 2.3]]);
  await g.wait(1.2);
  if (g.flag('ch1_lock_sabotaged', false)) {
    await g.say('otto', '경관님, 이 녀석이 안에서 문빗장 나사를 조여 놨습니다!');
    await g.say('paul', '제 집 문입니다. 빗장은 제가 조였습니다.'); // [수정] 거짓말 대신
    g.endTalk(); sus(10); g.composure -= 5;
  }
  if (g.flag('dirtOnHands', false)) {
    await g.wait(1.5);
    pA.go([[7.4, 9.3]]); await g.until(() => !pA.moving);
    await g.say('police', '이봐, 손톱 밑에 젖은 흙이 잔뜩 묻어 있군. 지하실부터 뒤져!');
    g.endTalk(); sus(10); g.composure -= 10;
    void g.walk(pA, [[9.4, 8.5], [11.4, 8.2], [9.6, 8.5], [6.6, 9.6]]);
  }
  await g.walk(otto, [[5.5, 7.4], [5.5, 6.7]]);
  if (g.str('ch1_photo') === 'burned' && g.flag('emptySpot', false)) {
    await g.say('otto', '여기 걸려 있던 가족사진은 어디로 치웠나, 바그너 군?');
    const i = await g.choose(['“제가 내렸습니다. 이제 없습니다.”', '“그걸 왜 물으십니까?”'], 8); // [수정] 거짓말 대신
    if (i === 0) { await g.say('paul', '제가 내렸습니다. 이제 없습니다.'); await g.say('otto', '흥.'); }
    else { if (i === 1) await g.say('paul', '그걸 왜 물으십니까?'); else await g.say('paul', '…….'); sus(15); g.composure -= 10; }
    g.endTalk();
  }
  void g.walk(otto, [[4.2, 8.9], [6.4, 10.1]]);
  await g.wait(3);
  await g.walk(pB, [[3.5, 4.1], [3.5, 6.4], [4.6, 9.6]]);
  const dug = g.str('ch1_potato_depth') === 'shallow' || g.flag('dirtOnHands', false);
  if (!dug || S() < 15) { await g.say('police2', '지하실엔 썩은 감자랑 자전거 바퀴뿐입니다.'); g.endTalk(); }
  await g.until(() => !pA.moving && !otto.moving);

  if (S() >= 15) {
    if (dug) {
      pB.go([[7.5, 9.6]]); await g.until(() => !pB.moving);
      await g.say('police2', '이 감자 상자 흙이 왜 이렇게 파헤쳐져 있지?');
      const i = await g.choose(['“제 지하실입니다. 보실 대로 보십시오.”', '“제가… 아까 좀 뒤적였습니다.”'], 8); // [수정] 볍씨·거짓말 대신
      if (i === 0) await g.say('paul', '제 지하실입니다. 보실 대로 보십시오.');
      else { await g.say('paul', i === 1 ? '제가… 아까 좀 뒤적였습니다.' : '…….'); sus(15); g.composure -= 10; }
      g.endTalk();
    }
    if (g.str('ch1_photo') === 'hidden') {
      otto.go([[5.5, 6.7]]); await g.until(() => !otto.moving);
      await g.say('otto', '액자 뒤판이 불룩하군. 이리 내놔 봐!');
      await g.say('helena', '남편이 남긴 사진이에요. 그것만은 두고 가세요.'); // [수정] 거짓말 대신
      if (S() >= 30) {
        await g.say('otto', '얼굴이 여럿이군. 이건 내가 가져가지.'); // [추가] 결과
        g.set('ch1_photo_taken', true); g.level.photo = 'dust';
      } else await g.say('police', '사진 한 장 갖고 뭘 그러시오, 베커 반장.'); // [추가] 결과
      g.endTalk();
      void g.walk(otto, [[6.2, 10.1]]);
    }
    if (S() >= 40) {
      await g.say('police2', '감자 상자를 바닥까지 파 보겠습니다.'); // [추가]
      g.endTalk();
      await g.walk(pB, [[3.5, 7.0], [3.5, 4.1], [2.6, 2.3]]);
      await g.wait(1.5);
      if (g.str('ch1_potato_depth') === 'shallow') { g.set('ch1_seized', 'mimeo'); return arrest(g, w, 'dig', [pA, pB, otto]); }
      await g.walk(pB, [[3.5, 4.1], [3.5, 6.4], [4.6, 9.6]]);
      await g.say('police2', '꼬챙이로 바닥까지 찔러 봤지만 아무것도 없습니다.');
      g.endTalk();
    }
  }

  pA.go([[5.5, 10.2]]); otto.go([[6.1, 10.3]]); pB.go([[4.9, 10.2]]);
  await g.until(() => !pA.moving && !otto.moving && !pB.moving);
  await g.say('police', '인쇄물도 등사기도 없다. 허탕이군, 베커 반장.');
  await g.say('otto', '네 녀석 작업실에 뭘 숨겼는지 내가 끝까지 찾아낼 거야.');
  await g.say('police', '다음 집으로 이동한다. 하일 히틀러.');
  g.endTalk();
  void g.walk(pA, [[5.5, 12.6], [5.5, 13.6]]); void g.walk(pB, [[5.5, 11.4], [5.2, 13.6]]);
  await g.walk(otto, [[5.6, 11.6], [5.9, 13.6]]);
  await g.wait(0.6);
  await g.fade(true);
  for (const a of [pA, pB, otto]) g.removeActor(a);
  keepComposure(g);
  await after(g, w, false);
}

// ===================================================================== yard & ending
async function after(g: FpsGame, w: World, resumed: boolean) {
  g.checkpoint('ch1_after');
  g.level.setFront(true);
  g.targets = []; g.timer.left = 0; g.progress = '3/3';
  if (w.leni) g.removeActor(w.leni);
  w.helena.place(8.4, 10.25);
  g.place(8.0, 9.6, Math.PI * 0.75);
  void resumed;
  g.hud(true);
  g.ui.fade(false);
  g.audio.music('none');
  g.audio.ambience('room');
  g.objective('대문 밖으로 나간다');
  g.moveLock = false;
  const leni = g.actor('spr_leni_bag', 5.5, 13.55);
  g.solid(5.5, 13.55, 0.25);
  await g.until(() => Math.hypot(g.px - leni.x, g.py - leni.y) < 1.35 && !g.ui.talking);
  g.moveLock = true;
  g.pa = Math.atan2(leni.y - g.py, leni.x - g.px);
  g.audio.ambience('street');
  await g.say('leni', '오빠, 이제 가방 내려놔도 돼?');
  await g.say('paul', '응, 잘했어 레니. 정말 잘했어.');
  await g.say('helena', '어서 들어오렴. 이제부터는 문을 더 단단히 걸어 잠가야겠구나.', '헬레나 (문간)');
  g.endTalk();
  await g.fade(true);
  g.hud(false);
  if (!FAST) await outro(true);
  ending(g);
}

async function arrest(g: FpsGame, w: World, why: 'mimeo' | 'print' | 'dig', cops: Actor[]) {
  g.set('ch1_found', why);
  if (why === 'mimeo') await g.say('police', '등사기다! 여기서 찍어 냈군.'); // [추가] 시간 초과 분기
  else if (why === 'dig') await g.say('police2', '반장님, 흙 밑에 등사기가 있습니다!'); // [추가]
  else await g.say('police', '금지된 인쇄물이군. 전부 압수한다.'); // [추가]
  await g.say('otto', '제가 뭐랬습니까, 경관님.'); // [추가]
  await g.say('police', '파울 바그너, 경찰서로 같이 가야겠소.'); // [추가]
  await g.say('helena', '파울!');
  await g.say('paul', '엄마, 레니를 부탁해요.'); // [추가]
  g.endTalk();
  g.set('paul_detained', true);
  keepComposure(g);
  await g.fade(true);
  for (const a of cops) g.removeActor(a);
  if (w.leni) g.removeActor(w.leni);
  g.level.setFront(true);
  g.place(5.5, 12.25, Math.PI / 2);
  g.handsOn = false;
  const withBag = w.st.booklets === 'leni';
  const leni = g.actor(withBag ? 'spr_leni_bag' : 'spr_leni', 5.4, 13.5);
  g.actor('spr_police', 6.2, 12.6); g.actor('spr_police2', 4.8, 12.6);
  g.hud(false);
  g.audio.ambience('street');
  await g.fade(false);
  await g.say('leni', '오빠, 어디 가?'); // [추가]
  await g.say('paul', '금방 올게, 레니. 엄마 말 잘 들어.'); // [추가]
  g.endTalk();
  void leni;
  await g.wait(0.8);
  await g.fade(true);
  ending(g);
}

function ending(g: FpsGame) {
  const f = g.flags;
  const lines: string[] = [];
  if (f.ch1_photo === 'burned') lines.push('아버지의 사진은 재가 되었다.');
  else if (f.ch1_photo_taken) lines.push('사진 속 얼굴들은 베커의 주머니로 들어갔다.');
  else lines.push('아버지의 사진은 액자 뒤판 속에 남았다.');
  const seized = String(f.ch1_seized ?? '').split(',');
  if (seized.includes('mimeo')) lines.push('등사기는 경찰의 손에 넘어갔다.');
  else if (f.ch1_potato_depth === 'deep') lines.push('등사기는 감자 상자 밑 깊은 흙 속에 잠들었다.');
  else if (f.ch1_potato_depth === 'shallow') lines.push('등사기는 감자 몇 알 아래 얕게 묻혔다.');
  if (seized.includes('wt')) lines.push('「파수대」 묶음은 압수되었다.');
  else lines.push('「파수대」는 이모부의 커피포트에 담겨 집을 나갔다.');
  if (seized.includes('booklets')) lines.push('소책자 묶음도 함께 실려 갔다.');
  else lines.push('소책자는 레니의 가방 속에서 오후를 보냈다.');
  if (f.paul_detained) lines.push('그날 밤 파울은 집에 돌아오지 못했다.');
  if (Number(f.suspicion) >= 30) lines.push('베커는 이 집을 잊지 않을 것이다.');
  g.hud(false);
  g.end('제1장 「가방 속의 소책자」', lines.join('\n'));
}

