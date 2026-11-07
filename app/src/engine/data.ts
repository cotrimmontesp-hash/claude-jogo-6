/* Números do Base Zumbi: armas, zumbis, muros, torres, melhorias e ondas. */

/** o mundo (unidades) e a base no meio */
export const WORLD = { w: 2200, h: 1500 };
export const BASE = { x: 1100, y: 760, half: 230 };
/** abrigo no meio da base */
export const HQ = { x: 1100, y: 740, r: 52 };
/** lugares das torres (dentro dos muros) */
export const TURRET_SLOTS = [{ x: 945, y: 610 }, { x: 1255, y: 610 }, { x: 945, y: 905 }, { x: 1255, y: 905 }];
/** muros: 4 lados x 5 pedaços */
export const WALL_SEG = 5;

export interface Gun { id: string; name: string; dmg: number; rate: number; range: number; pellets: number; spread: number; price: number; desc: string; col: string }
export const GUNS: Gun[] = [
  { id: 'pistola', name: 'Pistola', dmg: 12, rate: 2.6, range: 300, pellets: 1, spread: .04, price: 0, desc: 'Confiável. Um tiro de cada vez.', col: '#5c5c64' },
  { id: 'espingarda', name: 'Espingarda', dmg: 9, rate: 1.3, range: 240, pellets: 5, spread: .35, price: 250, desc: '5 balas de uma vez. Ótima de perto.', col: '#7c4c2c' },
  { id: 'metralhadora', name: 'Metralhadora', dmg: 9, rate: 8, range: 320, pellets: 1, spread: .1, price: 700, desc: 'Muitos tiros por segundo.', col: '#3c4c3c' },
  { id: 'rifle', name: 'Rifle de Raio', dmg: 55, rate: 1.6, range: 470, pellets: 1, spread: 0, price: 1600, desc: 'Atravessa vários zumbis em linha.', col: '#2c6cc8' },
];

export interface ZType { id: string; name: string; hp: number; sp: number; dmg: number; coin: number; r: number; skin: string; shirt: string; pants: string; size: number }
export const ZOMBIES: { [k: string]: ZType } = {
  comum: { id: 'comum', name: 'Zumbi', hp: 30, sp: 36, dmg: 8, coin: 3, r: 15, skin: '#8cc070', shirt: '#6c7cb0', pants: '#4c4438', size: 1 },
  corredor: { id: 'corredor', name: 'Corredor', hp: 20, sp: 82, dmg: 6, coin: 4, r: 13, skin: '#a8c878', shirt: '#c05048', pants: '#3c3c48', size: .88 },
  gordo: { id: 'gordo', name: 'Grandão', hp: 150, sp: 22, dmg: 22, coin: 12, r: 24, skin: '#7cac60', shirt: '#d8c8a0', pants: '#5c4c3c', size: 1.45 },
  chefe: { id: 'chefe', name: 'Chefão', hp: 1100, sp: 26, dmg: 45, coin: 90, r: 34, skin: '#6c9c50', shirt: '#5c2c2c', pants: '#2c2c2c', size: 2.1 },
};

/** muros por nível: vida de cada pedaço */
export const WALL_LV = [
  { name: 'Madeira', hp: 120, price: 0, col: '#a8743c' },
  { name: 'Pedra', hp: 320, price: 400, col: '#9c9ca4' },
  { name: 'Metal', hp: 750, price: 1100, col: '#7c8c9c' },
];

/** torre por nível (0 = não tem) */
export const TURRET_LV = [
  { dmg: 0, rate: 0, range: 0, price: 120 },
  { dmg: 8, rate: 2, range: 260, price: 220 },
  { dmg: 12, rate: 3, range: 290, price: 420 },
  { dmg: 18, rate: 4, range: 320, price: 750 },
  { dmg: 26, rate: 5, range: 360, price: 0 },
];

/** melhorias do jogador e da base (preço sobe a cada nível) */
export interface Upg { id: string; name: string; desc: string; base: number; mult: number; max: number }
export const UPGRADES: Upg[] = [
  { id: 'dano', name: 'Dano', desc: '+15% de dano por nível', base: 60, mult: 1.45, max: 10 },
  { id: 'cadencia', name: 'Rapidez', desc: '+10% de tiros por segundo', base: 70, mult: 1.45, max: 8 },
  { id: 'vida', name: 'Vida', desc: '+20 de vida máxima', base: 50, mult: 1.4, max: 10 },
  { id: 'ima', name: 'Ímã', desc: 'Puxa as moedas de mais longe', base: 40, mult: 1.5, max: 6 },
  { id: 'abrigo', name: 'Abrigo forte', desc: '+150 de vida do abrigo', base: 80, mult: 1.5, max: 8 },
  { id: 'granada', name: 'Granada', desc: 'Explosão maior e recarga mais rápida', base: 90, mult: 1.6, max: 6 },
];
export const upgPrice = (u: Upg, lvl: number) => Math.round(u.base * Math.pow(u.mult, lvl) / 5) * 5;

/** como é cada onda */
export function waveSpec(n: number) {
  const list: string[] = [];
  const total = 7 + n * 3;
  for (let i = 0; i < total; i++) {
    const r = ((i * 7919 + n * 104729) % 1000) / 1000;
    if (n >= 3 && r < Math.min(.3, .06 * (n - 2))) list.push('corredor');
    else if (n >= 4 && r > 1 - Math.min(.2, .04 * (n - 3))) list.push('gordo');
    else list.push('comum');
  }
  if (n % 5 === 0) list.push('chefe');
  return { list, hpMul: 1 + (n - 1) * .1, gap: Math.max(.35, 1.6 - n * .08), bonus: 20 + n * 10 };
}
export const PLAYER_HP = 100, HQ_HP = 600, PLAYER_SP = 150;
