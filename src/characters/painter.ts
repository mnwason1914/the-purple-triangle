import { Grid, shade } from '../engine/grid';

export const OUTLINE = '#1a1420';

export type HairStyle = 'bun' | 'short' | 'braids' | 'cap' | 'hat' | 'scarf' | 'police';
export type Extra = 'mustache' | 'glasses' | 'lamp' | 'apron' | 'shawl' | 'satchel' | 'beard';

export interface Look {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  hat?: string; // cap/hat/scarf/police colour
  top: string;
  bottom: string;
  dress: boolean;
  longCoat?: boolean;
  shoes: string;
  child?: boolean;
  collar?: string;
  apron?: string;
  extras?: Extra[];
}

export const POSES = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'reach', 'crouch', 'fear', 'bow', 'sit', 'carry'] as const;
export type Pose = (typeof POSES)[number];

export const EXPRESSIONS = ['neutral', 'smile', 'worried', 'sad', 'afraid', 'stern', 'resolute'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

interface Geo { hy: number; ty: number; tb: number; arm: number }

/** Side-view 16x32 character, facing right. */
export function paintHuman(look: Look, pose: Pose): Grid {
  const g = new Grid(16, 32);
  const child = !!look.child;
  const base: Geo = child ? { hy: 11, ty: 19, tb: 24, arm: 5 } : { hy: 2, ty: 10, tb: 20, arm: 8 };
  const skinS = shade(look.skin, -0.18);
  const topS = shade(look.top, -0.28);
  const topL = shade(look.top, 0.14);
  const botS = shade(look.bottom, -0.25);
  const has = (e: Extra) => !!look.extras?.includes(e);

  // ---------- pose parameters ----------
  let dy = 0; // whole upper body drop
  let headDx = 0, headDy = 0;
  let front: 'down' | 'swingF' | 'swingB' | 'forward' | 'up' | 'bundle' | 'lap' = 'down';
  let back: 'down' | 'swingF' | 'swingB' | 'up' | 'hidden' = 'down';
  // legs: [x, lift] for back then front
  let legs: [number, number, number, number] = [6, 0, 8, 0];
  let legMode: 'stand' | 'crouch' | 'sit' = 'stand';
  switch (pose) {
    case 'idle1': headDy = 1; break;
    case 'walk0': legs = [5, 0, 9, 0]; front = 'swingB'; back = 'swingF'; break;
    case 'walk1': legs = [7, 1, 7, 0]; dy = -1; break;
    case 'walk2': legs = [9, 0, 5, 0]; front = 'swingF'; back = 'swingB'; break;
    case 'walk3': legs = [7, 0, 7, 1]; dy = -1; break;
    case 'reach': front = 'forward'; legs = [6, 0, 9, 0]; break;
    case 'crouch': legMode = 'crouch'; dy = child ? 3 : 7; headDx = 1; front = 'swingF'; break;
    case 'fear': front = 'up'; back = 'up'; headDy = 1; headDx = -1; legs = [5, 0, 8, 0]; break;
    case 'bow': headDx = 1; headDy = 2; back = 'hidden'; break;
    case 'sit': legMode = 'sit'; dy = child ? 3 : 5; front = 'lap'; break;
    case 'carry': front = 'bundle'; back = 'hidden'; break;
  }
  const hy = base.hy + dy + headDy;
  const ty = base.ty + dy;
  const tb = base.tb + (legMode === 'stand' ? 0 : dy);
  const feetY = 30;
  const legTop = base.tb + 1;

  const arm = (kind: string, sx: number, col: string) => {
    const L = base.arm;
    const y0 = ty + 1;
    switch (kind) {
      case 'down': g.rect(sx, y0, 2, L - 2, col); g.rect(sx, y0 + L - 2, 2, 2, look.skin); break;
      case 'swingF': g.rect(sx, y0, 2, 4, col); g.rect(sx + 1, y0 + 4, 2, L - 6, col); g.rect(sx + 1, y0 + L - 2, 2, 2, look.skin); break;
      case 'swingB': g.rect(sx, y0, 2, 4, col); g.rect(sx - 1, y0 + 4, 2, L - 6, col); g.rect(sx - 1, y0 + L - 2, 2, 2, look.skin); break;
      case 'forward': g.rect(sx, y0, 2, 3, col); g.rect(sx, y0 + 2, 5, 2, col); g.rect(sx + 5, y0 + 2, 2, 2, look.skin); break;
      case 'up': g.rect(sx, y0, 2, 3, col); g.rect(sx + 1, y0 - 3, 2, 4, col); g.rect(sx + 1, y0 - 5, 2, 2, look.skin); break;
      case 'lap': g.rect(sx, y0, 2, 4, col); g.rect(sx, y0 + 4, 4, 2, col); g.rect(sx + 4, y0 + 4, 2, 2, look.skin); break;
      case 'bundle':
        g.rect(sx, y0, 2, 3, col); g.rect(sx, y0 + 3, 4, 2, col);
        g.rect(sx + 2, y0 + 1, 4, 5, '#c9b98f'); g.hline(sx + 2, sx + 5, y0 + 3, '#8f7f5a');
        g.rect(sx + 4, y0 + 4, 2, 2, look.skin);
        break;
    }
  };

  // ---------- back arm ----------
  if (back !== 'hidden') arm(back, 6, topS);

  // ---------- legs ----------
  const shoe = look.shoes;
  if (legMode === 'stand') {
    const leg = (x: number, lift: number, col: string) => {
      g.rect(x, legTop, 2, feetY - legTop - lift, col);
      g.rect(x, feetY - lift, 3, 2, shoe);
    };
    const legCol = look.dress ? look.skin : look.bottom;
    const legColS = look.dress ? skinS : botS;
    leg(legs[0], legs[1], legColS);
    leg(legs[2], legs[3], legCol);
    if (look.dress && !child) { // stockings
      g.paintOver(legs[0], legTop, 2, feetY - legTop - legs[1], '#b89a86');
      g.paintOver(legs[2], legTop, 2, feetY - legTop - legs[3], '#c9ab95');
    }
  } else if (legMode === 'crouch') {
    const ky = feetY - 3;
    g.rect(5, ky - 1, 6, 2, look.dress ? look.bottom : look.bottom);
    g.rect(10, ky, 2, 3, look.dress ? '#c9ab95' : look.bottom);
    g.rect(10, feetY, 3, 2, shoe);
    g.rect(4, ky + 1, 2, 2, botS);
    g.rect(3, feetY, 3, 2, shoe);
  } else {
    const sy = tb + 1;
    g.rect(6, sy, 7, 2, look.bottom);
    g.rect(11, sy + 2, 2, feetY - sy - 2, look.dress ? '#c9ab95' : look.bottom);
    g.rect(11, feetY, 3, 2, shoe);
  }

  // ---------- torso / skirt / coat ----------
  g.rect(5, ty, 6, tb - ty + 1, look.top);
  g.vline(5, ty, tb, topS);
  g.vline(10, ty + 1, tb - 1, topL);
  if (look.dress) {
    const s0 = tb - 1;
    const len = child ? 4 : legMode === 'stand' ? 6 : 3;
    for (let i = 0; i < len; i++) {
      const w = i < 2 ? 0 : 1;
      g.rect(5 - w, s0 + i, 6 + w * 2, 1, look.bottom);
      g.px(5 - w, s0 + i, botS);
    }
  }
  if (look.longCoat && legMode === 'stand') {
    g.rect(5, tb, 7, 6, look.top);
    g.vline(5, tb, tb + 5, topS);
    g.vline(9, tb + 1, tb + 5, topS);
  }
  if (look.apron || has('apron')) g.rect(8, ty + 3, 3, (tb - ty) + (look.dress ? 4 : 2), look.apron ?? '#e4dccb');
  if (look.collar) { g.rect(7, ty, 4, 1, look.collar); g.px(10, ty + 1, look.collar); }
  if (has('shawl')) { g.rect(5, ty, 6, 3, '#6b5a6e'); g.px(4, ty + 1, '#6b5a6e'); g.px(10, ty + 3, '#6b5a6e'); }
  if (has('satchel')) { g.rect(4, ty + 6, 3, 4, '#5a4030'); g.px(6, ty + 1, '#5a4030'); g.px(7, ty + 3, '#5a4030'); }
  if (look.hairStyle === 'police') { g.hline(5, 10, ty + 6, '#2b2b2b'); g.px(9, ty + 6, '#c9b06a'); g.px(9, ty + 2, '#c9b06a'); g.px(9, ty + 4, '#c9b06a'); }

  // ---------- head ----------
  const hx = 5 + headDx;
  g.rect(7 + Math.min(headDx, 0), hy + 7, 2, 2, skinS); // neck
  g.rect(hx, hy, 6, 8, look.skin);
  g.px(hx + 6, hy + 4, look.skin); // nose
  g.px(hx + 4, hy + 3, OUTLINE); // eye
  g.px(hx + 4, hy + 6, shade(look.skin, -0.32)); // mouth
  g.px(hx + 2, hy + 4, skinS); // ear
  if (has('mustache')) g.hline(hx + 4, hx + 5, hy + 5, look.hair);
  if (has('beard')) { g.rect(hx + 2, hy + 6, 4, 2, look.hair); g.hline(hx + 4, hx + 5, hy + 5, look.hair); }
  if (has('glasses')) { g.px(hx + 4, hy + 3, '#d8e4f0'); g.px(hx + 5, hy + 3, OUTLINE); g.hline(hx + 2, hx + 3, hy + 3, OUTLINE); }

  const H = look.hair, hat = look.hat ?? '#333';
  switch (look.hairStyle) {
    case 'bun':
      g.rect(hx, hy - 1, 6, 3, H); g.rect(hx, hy, 2, 6, H); g.px(hx + 5, hy + 1, H);
      g.rect(hx - 2, hy, 3, 3, H);
      g.px(hx + 2, hy - 1, shade(H, 0.2));
      break;
    case 'short':
      g.rect(hx, hy - 1, 6, 2, H); g.rect(hx, hy, 2, 4, H); g.px(hx + 5, hy + 1, H);
      break;
    case 'braids':
      g.rect(hx, hy - 1, 6, 2, H); g.rect(hx, hy, 2, 5, H); g.px(hx + 5, hy + 1, H);
      g.rect(hx - 1, hy + 4, 2, 5, H); g.px(hx - 1, hy + 9, '#c94a4a');
      break;
    case 'cap':
      g.rect(hx, hy, 2, 4, H);
      g.rect(hx - 1, hy - 2, 7, 3, hat); g.rect(hx + 3, hy, 5, 1, shade(hat, -0.3));
      break;
    case 'hat':
      g.rect(hx, hy, 2, 4, H);
      g.rect(hx, hy - 3, 6, 3, hat); g.hline(hx - 2, hx + 7, hy, hat); g.hline(hx + 1, hx + 4, hy - 1, shade(hat, -0.35));
      break;
    case 'police':
      g.rect(hx, hy, 2, 3, H);
      g.rect(hx, hy - 3, 6, 3, hat); g.hline(hx - 1, hx + 7, hy, '#1f1f1f'); g.px(hx + 3, hy - 2, '#c9b06a');
      break;
    case 'scarf':
      g.rect(hx - 1, hy - 1, 7, 3, hat); g.rect(hx - 1, hy, 3, 7, hat); g.px(hx + 5, hy + 1, hat);
      g.px(hx + 3, hy + 8, hat); g.px(hx + 4, hy + 8, hat);
      break;
  }

  // ---------- front arm (over torso) ----------
  arm(front, 8, look.top === look.bottom ? topL : look.top);
  if (has('lamp') && (front === 'down' || front === 'swingF' || front === 'swingB')) {
    const lx = front === 'swingF' ? 9 : front === 'swingB' ? 7 : 8;
    const ly = ty + base.arm;
    g.rect(lx, ly - 1, 3, 4, '#3a3a3a'); g.px(lx + 2, ly, '#ffe08a'); g.px(lx + 2, ly + 1, '#ffd060');
  }

  g.outline(OUTLINE);
  return g;
}

/** 32x32 bust portrait (facing viewer) with an expression. */
export function paintPortrait(look: Look, expr: Expression): Grid {
  const g = new Grid(32, 32);
  const skinS = shade(look.skin, -0.16);
  const has = (e: Extra) => !!look.extras?.includes(e);
  const cx = 16;
  const child = !!look.child;
  const fy = child ? 16 : 14;
  const H = look.hair;
  const hat = look.hat ?? '#333';

  // hair behind head
  if (look.hairStyle === 'bun') { g.ellipse(cx, fy - 2, 9, 9, H); g.ellipse(cx, fy - 11, 4, 3, H); }
  if (look.hairStyle === 'braids') { g.ellipse(cx, fy - 1, 9, 9, H); g.rect(6, fy + 2, 3, 12, H); g.rect(23, fy + 2, 3, 12, H); g.px(7, fy + 14, '#c94a4a'); g.px(24, fy + 14, '#c94a4a'); }
  if (look.hairStyle === 'scarf') g.ellipse(cx, fy - 1, 10, 11, hat);

  // shoulders
  g.ellipse(cx, 32, 14, 7, look.top);
  g.rect(3, 29, 26, 3, look.top);
  g.hline(5, 26, 26, shade(look.top, 0.15));
  if (look.collar) { g.rect(12, 25, 3, 2, look.collar); g.rect(17, 25, 3, 2, look.collar); }
  if (look.apron) g.rect(12, 28, 8, 4, look.apron);
  if (has('shawl')) { g.ellipse(cx, 30, 13, 5, '#6b5a6e'); }
  if (look.hairStyle === 'police') { for (const y of [28, 30]) g.px(cx, y, '#c9b06a'); g.rect(12, 25, 8, 2, shade(look.top, -0.2)); }
  if (look.longCoat) { g.rect(13, 25, 6, 7, shade(look.top, -0.3)); g.vline(16, 26, 31, shade(look.top, 0.1)); }

  // neck & face
  g.rect(13, fy + 6, 6, 6, skinS);
  g.ellipse(cx, fy, 7.5, 9, look.skin);
  g.px(8, fy, skinS); g.px(23, fy, skinS); // ears
  g.px(8, fy + 1, skinS); g.px(23, fy + 1, skinS);
  g.hline(13, 18, fy + 8, skinS); // jaw shadow

  // hair front
  switch (look.hairStyle) {
    case 'bun':
      g.ellipse(cx, fy - 6, 8.5, 4.5, H);
      g.rect(8, fy - 6, 2, 6, H); g.rect(22, fy - 6, 2, 6, H);
      g.hline(12, 16, fy - 8, shade(H, 0.25));
      break;
    case 'braids':
      g.ellipse(cx, fy - 6, 8.5, 4.5, H); g.rect(8, fy - 6, 2, 7, H); g.rect(22, fy - 6, 2, 7, H);
      g.vline(16, fy - 9, fy - 4, shade(H, -0.25));
      break;
    case 'short':
      g.ellipse(cx, fy - 7, 8.5, 4, H); g.rect(8, fy - 7, 2, 5, H); g.rect(22, fy - 7, 2, 5, H);
      break;
    case 'cap':
      g.rect(8, fy - 4, 2, 4, H); g.rect(22, fy - 4, 2, 4, H);
      g.ellipse(cx, fy - 7, 9.5, 4, hat); g.rect(7, fy - 5, 18, 2, shade(hat, -0.3));
      break;
    case 'hat':
      g.rect(8, fy - 4, 2, 4, H); g.rect(22, fy - 4, 2, 4, H);
      g.rect(9, fy - 13, 14, 7, hat); g.hline(10, 21, fy - 8, shade(hat, -0.4));
      g.rect(4, fy - 6, 24, 2, hat); g.hline(4, 27, fy - 5, shade(hat, -0.3));
      break;
    case 'police':
      g.rect(8, fy - 4, 2, 4, H); g.rect(22, fy - 4, 2, 4, H);
      g.rect(9, fy - 13, 14, 8, hat); g.rect(8, fy - 6, 16, 2, '#1f1f1f'); g.rect(15, fy - 11, 2, 2, '#c9b06a');
      break;
    case 'scarf':
      g.ellipse(cx, fy - 6, 9, 5, hat); g.rect(7, fy - 6, 3, 12, hat); g.rect(22, fy - 6, 3, 12, hat);
      g.rect(14, fy + 9, 4, 3, hat);
      break;
  }

  // ---------- expression ----------
  const EYE = '#2a2030', WHITE = '#f4ede4', MOUTH = shade(look.skin, -0.4), LIP = '#b8605a';
  const ey = fy + 1;
  const L = 11, R = 19; // left x of each eye
  const brows = (lIn: number, lOut: number, rIn: number, rOut: number) => {
    const bc = shade(H === '#9a9aa4' ? '#6a6a74' : H, -0.15);
    g.px(L - 1, ey - 3 + lOut, bc); g.px(L, ey - 3 + lOut, bc); g.px(L + 1, ey - 3 + lIn, bc); g.px(L + 2, ey - 3 + lIn, bc);
    g.px(R - 1, ey - 3 + rIn, bc); g.px(R, ey - 3 + rIn, bc); g.px(R + 1, ey - 3 + rOut, bc); g.px(R + 2, ey - 3 + rOut, bc);
  };
  const eyesOpen = () => {
    for (const x of [L, R]) { g.rect(x, ey, 2, 2, EYE); g.px(x, ey, '#5a5068'); g.px(x - 1, ey + 1, WHITE); }
  };
  switch (expr) {
    case 'neutral': eyesOpen(); brows(0, 0, 0, 0); g.hline(14, 17, fy + 5, MOUTH); break;
    case 'smile':
      for (const x of [L, R]) { g.hline(x, x + 1, ey + 1, EYE); g.px(x - 1, ey + 2, EYE); }
      brows(0, 0, 0, 0);
      g.hline(14, 17, fy + 5, LIP); g.px(13, fy + 4, LIP); g.px(18, fy + 4, LIP);
      g.px(10, ey + 3, '#e8a090'); g.px(21, ey + 3, '#e8a090');
      break;
    case 'worried':
      eyesOpen(); brows(-1, 1, -1, 1);
      g.hline(15, 16, fy + 5, MOUTH); g.px(14, fy + 6, MOUTH); g.px(17, fy + 6, MOUTH);
      break;
    case 'sad':
      for (const x of [L, R]) { g.hline(x - 1, x + 1, ey, skinS); g.rect(x, ey + 1, 2, 1, EYE); }
      brows(-1, 1, -1, 1);
      g.hline(14, 17, fy + 5, MOUTH); g.px(13, fy + 6, MOUTH); g.px(18, fy + 6, MOUTH);
      g.px(L, ey + 3, '#9cc8ec'); g.px(L, ey + 4, '#9cc8ec');
      break;
    case 'afraid':
      for (const x of [L, R]) { g.rect(x - 1, ey - 1, 3, 3, WHITE); g.px(x, ey, EYE); }
      brows(-2, -1, -2, -1);
      g.rect(15, fy + 4, 2, 3, '#4a2028');
      break;
    case 'stern':
      eyesOpen(); for (const x of [L, R]) g.hline(x - 1, x + 1, ey - 1, skinS);
      brows(1, -1, 1, -1);
      g.hline(13, 18, fy + 5, shade(look.skin, -0.5));
      break;
    case 'resolute':
      eyesOpen(); brows(0, 0, 0, 0); g.hline(L - 1, L + 2, ey - 2, shade(H, -0.2)); g.hline(R - 1, R + 2, ey - 2, shade(H, -0.2));
      g.hline(14, 17, fy + 5, shade(look.skin, -0.45));
      break;
  }
  // nose
  g.px(16, fy + 2, skinS); g.px(16, fy + 3, skinS); g.px(15, fy + 3, skinS);
  if (has('mustache')) g.rect(13, fy + 4, 6, 1, H);
  if (has('beard')) { g.ellipse(cx, fy + 7, 6, 3, H); g.rect(13, fy + 4, 6, 1, H); g.hline(14, 17, fy + 5, MOUTH); }
  if (has('glasses')) {
    for (const x of [L, R]) { g.rect(x - 2, ey - 1, 5, 1, OUTLINE); g.rect(x - 2, ey + 2, 5, 1, OUTLINE); g.vline(x - 2, ey - 1, ey + 2, OUTLINE); g.vline(x + 2, ey - 1, ey + 2, OUTLINE); }
    g.hline(L + 3, R - 3, ey, OUTLINE);
  }
  g.outline(OUTLINE);
  return g;
}
