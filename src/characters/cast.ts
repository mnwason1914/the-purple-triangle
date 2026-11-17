import type { Look } from './painter';

/** Every character's look. Clothing follows mid-1930s small-town Westphalia. */
export const LOOKS: Record<string, Look> = {
  elise: { skin: '#ebc7a3', hair: '#6b4a2e', hairStyle: 'bun', top: '#58708f', bottom: '#3c4658', dress: true, shoes: '#2e2420', collar: '#e9e2d0', apron: '#ddd3bd' },
  elise_out: { skin: '#ebc7a3', hair: '#6b4a2e', hairStyle: 'scarf', hat: '#8a4a42', top: '#5a4638', bottom: '#3c4658', dress: true, longCoat: true, shoes: '#2e2420' },
  paul: { skin: '#e2b994', hair: '#3b2a20', hairStyle: 'cap', hat: '#4a4640', top: '#41503f', bottom: '#2f3036', dress: false, shoes: '#241c18', collar: '#d8d2c0', extras: ['mustache'] },
  lotte: { skin: '#f0cfaf', hair: '#c9944a', hairStyle: 'braids', top: '#a84848', bottom: '#8c3a3a', dress: true, shoes: '#3a2a22', child: true, collar: '#f1ece0' },
  kruger: { skin: '#e6c3a6', hair: '#9a9aa4', hairStyle: 'bun', top: '#4a3f52', bottom: '#3a3242', dress: true, shoes: '#221c22', extras: ['glasses', 'shawl'] },
  johann: { skin: '#e8bf98', hair: '#b88a54', hairStyle: 'short', top: '#dcd6c8', bottom: '#5a5048', dress: false, shoes: '#2b221c', apron: '#f2eee4', extras: ['beard'] },
  vogt: { skin: '#e6c9b4', hair: '#2a2420', hairStyle: 'hat', hat: '#2b2b30', top: '#2e2a28', bottom: '#222226', dress: false, longCoat: true, shoes: '#141414' },
  brandt: { skin: '#dcb592', hair: '#4a3a2a', hairStyle: 'police', hat: '#33402f', top: '#4d5c47', bottom: '#2f362c', dress: false, shoes: '#161616', extras: ['mustache', 'lamp'] },
  brandt_day: { skin: '#dcb592', hair: '#4a3a2a', hairStyle: 'police', hat: '#33402f', top: '#4d5c47', bottom: '#2f362c', dress: false, shoes: '#161616', extras: ['mustache'] },
  townsman: { skin: '#e0bb9a', hair: '#5a4632', hairStyle: 'hat', hat: '#4a4038', top: '#5a5248', bottom: '#38342e', dress: false, longCoat: true, shoes: '#221c18' },
  townswoman: { skin: '#eac9aa', hair: '#3a2a22', hairStyle: 'scarf', hat: '#4f6a5a', top: '#6a5a4a', bottom: '#4a3e34', dress: true, longCoat: true, shoes: '#221c18' },
};

export const PORTRAITS = ['elise', 'paul', 'lotte', 'kruger', 'johann', 'vogt', 'brandt'] as const;

export const NAMES: Record<string, string> = {
  elise: '엘리제',
  paul: '파울',
  lotte: '로테',
  kruger: '크뤼거 부인',
  johann: '요한',
  vogt: '포크트',
  brandt: '브란트 경사',
  townsman: '행인',
  townswoman: '행인',
};
