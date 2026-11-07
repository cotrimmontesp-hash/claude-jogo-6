/* Dados fixos: cartas, vespas, fases, visuais da colmeia, calendário diário e missões. */

export type CardId = 'operaria' | 'flor' | 'cera' | 'guarda' | 'ferrao' | 'grude' | 'bercario' | 'cardo' | 'bomba' | 'geleia';
export interface Card { id: CardId; name: string; cost: number; spell?: boolean; hp: number; unlock: number; col: string; desc: string; up: string }
export const CARDS: Card[] = [
  { id: 'operaria', name: 'Operária', cost: 2, hp: 2, unlock: 1, col: '#f8c020', desc: 'Faz 1 de mel por turno, +1 para cada Flor vizinha.', up: 'Mais vida; no nível 4 faz +1 de mel.' },
  { id: 'flor', name: 'Flor', cost: 1, hp: 1, unlock: 1, col: '#f06aa8', desc: 'Sozinha não faz nada: dá +1 de mel para cada Operária vizinha.', up: 'Mais vida; no nível 5 dá +2.' },
  { id: 'cera', name: 'Cera', cost: 1, hp: 5, unlock: 1, col: '#f4e0a0', desc: 'Parede forte. As vespas preferem dar a volta.', up: '+1 de vida por nível.' },
  { id: 'guarda', name: 'Guarda', cost: 3, hp: 4, unlock: 1, col: '#3c8cf0', desc: 'Pica 1 vespa encostada por turno (2 de dano).', up: 'Mais vida; dano +1 nos níveis 3 e 5.' },
  { id: 'ferrao', name: 'Ferrão', cost: 4, hp: 3, unlock: 2, col: '#e05a2a', desc: 'Torre: atira na vespa mais perto, até 2 casas (1 de dano).', up: 'Mais vida; dano +1 no nível 4.' },
  { id: 'grude', name: 'Mel Grudento', cost: 2, hp: 3, unlock: 3, col: '#f8a020', desc: 'Vespa que morder fica presa 1 turno sem andar.', up: 'Mais vida; prende 2 turnos no nível 4.' },
  { id: 'bercario', name: 'Berçário', cost: 4, hp: 3, unlock: 4, col: '#c8a0f0', desc: 'A cada 2 turnos te dá uma Operária de graça na mão.', up: 'Mais vida; no nível 4 a Operária vem a cada turno.' },
  { id: 'cardo', name: 'Cardo', cost: 3, hp: 4, unlock: 6, col: '#8c5cd8', desc: 'Planta com espinhos: quem morder leva 2 de dano.', up: 'Mais vida; espinho +1 no nível 4.' },
  { id: 'bomba', name: 'Bomba de Pólen', cost: 3, spell: true, hp: 0, unlock: 5, col: '#ffe040', desc: 'Feitiço: 3 de dano em todas as vespas em volta da casa escolhida.', up: 'Dano +1 nos níveis 3 e 5.' },
  { id: 'geleia', name: 'Geleia Real', cost: 2, spell: true, hp: 0, unlock: 7, col: '#fff0c0', desc: 'Feitiço: cura 3 das peças em volta (e da Rainha).', up: 'Cura +1 por nível.' },
];
export const CARD: { [k: string]: Card } = Object.fromEntries(CARDS.map(c => [c.id, c]));
export const CARD_MAX = 5;
export function upCost(id: string, lvl: number) { const i = CARDS.findIndex(c => c.id === id); return Math.round((40 + i * 6) * lvl * (1 + (lvl - 1) * .35) / 5) * 5; }
/** quantas de cada carta entram no baralho da partida (só as liberadas) */
export const DECK_COUNT: { [k: string]: number } = { operaria: 6, flor: 4, cera: 3, guarda: 3, ferrao: 2, grude: 2, bercario: 1, cardo: 2, bomba: 2, geleia: 1 };

/* ---------- vespas ---------- */
export type WaspId = 'vespa' | 'rapida' | 'bruto' | 'rainha';
export interface Wasp { id: WaspId; name: string; hp: number; dmg: number; spd: number; col: string; size: number }
export const WASPS: { [k: string]: Wasp } = {
  vespa: { id: 'vespa', name: 'Vespa', hp: 3, dmg: 1, spd: 1, col: '#e8402c', size: 1 },
  rapida: { id: 'rapida', name: 'Vespa Ligeira', hp: 2, dmg: 1, spd: 2, col: '#f89020', size: .85 },
  bruto: { id: 'bruto', name: 'Marimbondo Bruto', hp: 8, dmg: 2, spd: 1, col: '#8048c8', size: 1.25 },
  rainha: { id: 'rainha', name: 'Rainha Vespa', hp: 24, dmg: 3, spd: 1, col: '#c81838', size: 1.6 },
};

/* ---------- fases ---------- */
export interface Level { name: string; region: number; turns: number; base: number; grow: number; types: [WaspId, number][]; rocks: number; honey: number; boss?: boolean; seed: number }
export const REGIONS = [
  { name: 'Jardim', col: '#5cc048', bg: ['#9ce070', '#6cc050'] },
  { name: 'Pântano', col: '#3ca890', bg: ['#7cc8a8', '#4c9c80'] },
  { name: 'Montanha', col: '#9c8cc8', bg: ['#c8c0e0', '#8c84b0'] },
];
export const LEVELS: Level[] = [
  { region: 0, name: 'Primeira Flor', turns: 8, base: .6, grow: .12, types: [['vespa', 1]], rocks: 2, honey: 6, seed: 1 },
  { region: 0, name: 'Canteiro', turns: 9, base: .8, grow: .15, types: [['vespa', 1]], rocks: 3, honey: 6, seed: 2 },
  { region: 0, name: 'Vento Ligeiro', turns: 10, base: .9, grow: .17, types: [['vespa', 3], ['rapida', 1]], rocks: 3, honey: 6, seed: 3 },
  { region: 0, name: 'Muro de Pedra', turns: 10, base: 1, grow: .2, types: [['vespa', 3], ['rapida', 1]], rocks: 7, honey: 6, seed: 4 },
  { region: 0, name: 'Rainha do Jardim', turns: 11, base: 1, grow: .2, types: [['vespa', 3], ['rapida', 1]], rocks: 3, honey: 7, boss: true, seed: 5 },
  { region: 1, name: 'Brejo', turns: 11, base: 1.1, grow: .22, types: [['vespa', 3], ['rapida', 2]], rocks: 4, honey: 7, seed: 6 },
  { region: 1, name: 'Marimbondos', turns: 11, base: 1.1, grow: .22, types: [['vespa', 3], ['bruto', 1]], rocks: 4, honey: 7, seed: 7 },
  { region: 1, name: 'Lama Funda', turns: 12, base: 1.2, grow: .24, types: [['vespa', 3], ['rapida', 2], ['bruto', 1]], rocks: 6, honey: 7, seed: 8 },
  { region: 1, name: 'Correria', turns: 12, base: 1.1, grow: 0.21, types: [['vespa', 1], ['rapida', 3]], rocks: 4, honey: 7, seed: 9 },
  { region: 1, name: 'Rainha do Pântano', turns: 13, base: 1.1, grow: 0.21, types: [['vespa', 3], ['rapida', 2], ['bruto', 1]], rocks: 5, honey: 8, boss: true, seed: 10 },
  { region: 2, name: 'Pé da Serra', turns: 13, base: 1.2, grow: 0.23, types: [['vespa', 3], ['rapida', 2], ['bruto', 2]], rocks: 6, honey: 8, seed: 11 },
  { region: 2, name: 'Desfiladeiro', turns: 13, base: 1.2, grow: 0.25, types: [['vespa', 2], ['rapida', 2], ['bruto', 2]], rocks: 10, honey: 8, seed: 12 },
  { region: 2, name: 'Ventania', turns: 14, base: 1.3, grow: 0.25, types: [['vespa', 2], ['rapida', 3], ['bruto', 2]], rocks: 6, honey: 8, seed: 13 },
  { region: 2, name: 'Pico Gelado', turns: 14, base: 1.4, grow: 0.26, types: [['vespa', 2], ['rapida', 2], ['bruto', 3]], rocks: 7, honey: 9, seed: 14 },
  { region: 2, name: 'Rainha da Montanha', turns: 15, base: 1.4, grow: 0.26, types: [['vespa', 2], ['rapida', 2], ['bruto', 3]], rocks: 6, honey: 9, boss: true, seed: 15 },
];

/* ---------- visuais da colmeia (comprados com geleia) ---------- */
export interface Skin { id: string; name: string; price: number; hex: [string, string]; line: string; bg: [string, string]; queen: string }
export const SKINS: Skin[] = [
  { id: 'classica', name: 'Clássica', price: 0, hex: ['#fce6a8', '#f6d88c'], line: '#c89a3c', bg: ['', ''], queen: '#f8c020' },
  { id: 'noite', name: 'Noite Estrelada', price: 10, hex: ['#5c5ca8', '#4c4c98'], line: '#2c2c6c', bg: ['#2c2c64', '#14143c'], queen: '#f8e080' },
  { id: 'gelo', name: 'Gelo', price: 15, hex: ['#dcf2fc', '#c4e6f8'], line: '#7cb4d8', bg: ['#a8dcf4', '#6cb0dc'], queen: '#a8e8ff' },
  { id: 'doce', name: 'Algodão-Doce', price: 25, hex: ['#fcd8ec', '#f8c4e0'], line: '#d878a8', bg: ['#fcc8e0', '#d8a0f0'], queen: '#ff80c0' },
  { id: 'ouro', name: 'Ouro Real', price: 40, hex: ['#fce070', '#f8cc40'], line: '#b8861c', bg: ['#5c3c10', '#3c2408'], queen: '#fff4b0' },
];

/* ---------- prêmio por entrar todo dia ---------- */
export const DAILY = [
  { coins: 50, gems: 0, txt: '50 moedas' },
  { coins: 80, gems: 0, txt: '80 moedas' },
  { coins: 0, gems: 3, txt: '3 geleias' },
  { coins: 120, gems: 0, txt: '120 moedas' },
  { coins: 150, gems: 2, txt: '150 moedas + 2 geleias' },
  { coins: 200, gems: 0, txt: '200 moedas' },
  { coins: 300, gems: 10, txt: 'BAÚ: 300 moedas + 10 geleias' },
];

/* ---------- missões do dia ---------- */
export interface Mission { k: string; n: number; txt: string; coins: number }
export const MISSIONS: Mission[] = [
  { k: 'win', n: 1, txt: 'Vença 1 fase', coins: 40 },
  { k: 'win', n: 2, txt: 'Vença 2 fases', coins: 70 },
  { k: 'kills', n: 25, txt: 'Derrote 25 vespas', coins: 50 },
  { k: 'kills', n: 50, txt: 'Derrote 50 vespas', coins: 80 },
  { k: 'operaria', n: 12, txt: 'Coloque 12 Operárias', coins: 40 },
  { k: 'guarda', n: 6, txt: 'Coloque 6 Guardas', coins: 45 },
  { k: 'flor', n: 10, txt: 'Coloque 10 Flores', coins: 40 },
  { k: 'stars3', n: 1, txt: 'Ganhe 3 estrelas numa fase', coins: 60 },
  { k: 'play', n: 3, txt: 'Jogue 3 partidas', coins: 40 },
  { k: 'honey', n: 80, txt: 'Junte 80 de mel no total', coins: 45 },
  { k: 'wave', n: 8, txt: 'Chegue na onda 8 do Enxame sem fim', coins: 70 },
];
export const MISSION_BONUS_GEMS = 3;

export function xpNeed(lvl: number) { return 80 + lvl * 40; }
