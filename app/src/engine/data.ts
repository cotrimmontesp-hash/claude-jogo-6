/* Dados fixos da Vila Selvagem: materiais, construções (com níveis), terrenos da vila,
   bichos (domados nas expedições e que sobem de nível), regiões do mapa, moradores,
   eventos das expedições e o prêmio diário. */

/* ---------- materiais ---------- */
export type Res = 'comida' | 'madeira' | 'pedra' | 'agua' | 'metal' | 'escamas' | 'cristal';
export const RES: Res[] = ['comida', 'madeira', 'pedra', 'agua', 'metal', 'escamas', 'cristal'];
export const RES_INFO: { [k: string]: { name: string; col: string } } = {
  comida: { name: 'Comida', col: '#f0a030' }, madeira: { name: 'Madeira', col: '#a8703c' }, pedra: { name: 'Pedra', col: '#9ca0ac' },
  agua: { name: 'Água', col: '#3ca8f0' }, metal: { name: 'Metal', col: '#6c7c94' }, escamas: { name: 'Escamas', col: '#30c0a8' }, cristal: { name: 'Cristal', col: '#c070f0' },
};
export type Bag = Partial<Record<Res, number>>;
export const BASE_CAP = 150;

/* ---------- construções: nível 1 a 3 ---------- */
export interface Building { id: string; name: string; cost: Bag; prod?: Bag; cap?: Bag; homes?: number; pens?: number; desc: string; from: number }
export const BLVL_MAX = 3;
export const BLVL_PROD = [1, 1.8, 2.7];
export const BUILDINGS: Building[] = [
  { id: 'casa', name: 'Casa', cost: { madeira: 12 }, homes: 2, from: 0, desc: 'Abriga moradores (2 por nível).' },
  { id: 'fazenda', name: 'Fazenda', cost: { madeira: 10 }, prod: { comida: 180 }, from: 0, desc: 'Planta comida para a vila e para os bichos.' },
  { id: 'serraria', name: 'Serraria', cost: { madeira: 6, pedra: 6 }, prod: { madeira: 140 }, from: 0, desc: 'Corta e empilha madeira.' },
  { id: 'poco', name: 'Poço', cost: { pedra: 12 }, prod: { agua: 140 }, cap: { agua: 100 }, from: 0, desc: 'Tira água e guarda mais.' },
  { id: 'armazem', name: 'Armazém', cost: { madeira: 20, pedra: 12 }, cap: { comida: 150, madeira: 150, pedra: 150, agua: 100, metal: 60, escamas: 60, cristal: 60 }, from: 0, desc: 'Guarda mais de tudo (mais a cada nível).' },
  { id: 'estabulo', name: 'Estábulo', cost: { madeira: 25, pedra: 10 }, pens: 2, from: 0, desc: 'Lugar para mais bichos (2 por nível) e comida mais barata para eles.' },
  { id: 'pedreira', name: 'Pedreira', cost: { madeira: 15 }, prod: { pedra: 120 }, from: 2, desc: 'Quebra pedras grandes.' },
  { id: 'torre', name: 'Torre de Vigia', cost: { madeira: 15, pedra: 20 }, from: 1, desc: 'Expedições mais seguras: +5% de chance por nível.' },
  { id: 'estufa', name: 'Estufa', cost: { pedra: 20, agua: 20 }, prod: { comida: 160 }, from: 3, desc: 'Vidro e calor: muita comida.' },
  { id: 'forja', name: 'Forja', cost: { pedra: 30, madeira: 20 }, prod: { metal: 60 }, from: 5, desc: 'Derrete minério e faz metal.' },
  { id: 'cais', name: 'Cais', cost: { madeira: 30, escamas: 10 }, prod: { escamas: 30 }, from: 6, desc: 'Barcos de pesca trazem escamas.' },
  { id: 'jardim', name: 'Jardim de Cristal', cost: { pedra: 20, cristal: 10 }, prod: { cristal: 30 }, from: 7, desc: 'Cultiva cristais devagar.' },
];
export const BUILD: { [k: string]: Building } = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
export function upgradeCost(b: Building, lvl: number): Bag { const o: Bag = {}; for (const k in b.cost) o[k as Res] = Math.ceil(b.cost[k as Res]! * (lvl === 1 ? 2.5 : 5)); if (lvl === 2) o.metal = (o.metal || 0) + 10; return o; }

/* ---------- terrenos da vila (posições num mundo de 1000 x 600) ---------- */
export interface Plot { x: number; y: number; clear?: Bag; block?: 'arvores' | 'pedras' }
export const PLOTS: Plot[] = [
  { x: 400, y: 265 }, { x: 630, y: 255 }, { x: 500, y: 405 }, { x: 665, y: 410 }, { x: 330, y: 395 },
  { x: 255, y: 255, clear: { madeira: 20 }, block: 'arvores' }, { x: 745, y: 320, clear: { pedra: 20 }, block: 'pedras' },
  { x: 520, y: 175, clear: { madeira: 30 }, block: 'arvores' }, { x: 400, y: 510, clear: { madeira: 40, pedra: 20 }, block: 'pedras' },
  { x: 720, y: 520, clear: { madeira: 50 }, block: 'arvores' }, { x: 185, y: 395, clear: { pedra: 50, madeira: 30 }, block: 'pedras' },
  { x: 790, y: 200, clear: { madeira: 70, pedra: 40 }, block: 'arvores' }, { x: 565, y: 525, clear: { pedra: 80, metal: 10 }, block: 'pedras' },
  { x: 160, y: 215, clear: { madeira: 100, metal: 20 }, block: 'arvores' },
];
export const SQUARE = { x: 520, y: 305 }; /* praça com a fogueira */
export const PEN = { x: 855, y: 430, rx: 85, ry: 64 }; /* cercado dos bichos */

/* ---------- bichos ---------- */
export type Trait = 'nadar' | 'escalar' | 'voar' | 'deserto' | 'forca' | 'faro' | 'visao';
export interface Beast { id: string; name: string; body: string; body2: string; kind: 'quad' | 'ave' | 'casco'; traits: Trait[]; bonus: { res?: Res; exp?: number }; desc: string; where: number[]; ears?: string; horns?: boolean; tail?: string; snout?: number; size: number }
export const BEASTS: Beast[] = [
  { id: 'lobo', name: 'Lobo', body: '#8c8c98', body2: '#c8c8d0', kind: 'quad', traits: ['faro'], bonus: { exp: .04 }, desc: 'Fareja caminhos: expedições mais seguras.', where: [0, 1], ears: 'ponta', tail: 'peludo', snout: 1, size: 1 },
  { id: 'javali', name: 'Javali', body: '#6c4c34', body2: '#9c7454', kind: 'quad', traits: ['forca'], bonus: { res: 'comida' }, desc: 'Revira a terra: +comida na vila.', where: [0, 1], ears: 'ponta', tail: 'fino', snout: 2, size: 1 },
  { id: 'raposa', name: 'Raposa', body: '#e06c2c', body2: '#fce8d8', kind: 'quad', traits: ['faro'], bonus: { exp: .03 }, desc: 'Esperta: acha mais coisas nas expedições.', where: [1, 4], ears: 'ponta', tail: 'peludo', snout: 1, size: .85 },
  { id: 'cabra', name: 'Cabra-montesa', body: '#e8e0d0', body2: '#a89c88', kind: 'quad', traits: ['escalar'], bonus: { res: 'pedra' }, desc: 'Sobe qualquer pedra. Abre caminho para as montanhas.', where: [2], ears: 'caida', horns: true, tail: 'fino', snout: 1, size: .95 },
  { id: 'camelo', name: 'Camelo', body: '#d8b078', body2: '#c09860', kind: 'quad', traits: ['deserto'], bonus: { res: 'agua' }, desc: 'Aguenta o deserto: viagens quentes sem gastar água.', where: [3], ears: 'redonda', tail: 'fino', snout: 1, size: 1.25 },
  { id: 'lontra', name: 'Lontra', body: '#7c5434', body2: '#c8a07c', kind: 'quad', traits: ['nadar'], bonus: { res: 'escamas' }, desc: 'Nada muito bem. Leva o grupo até as ilhas.', where: [4], ears: 'redonda', tail: 'grosso', snout: 1, size: .8 },
  { id: 'tartaruga', name: 'Tartaruga Gigante', body: '#7cb064', body2: '#a07c4c', kind: 'casco', traits: ['nadar', 'forca'], bonus: { res: 'madeira' }, desc: 'Lenta e forte. Nada e carrega muita coisa.', where: [4, 6], size: 1.2 },
  { id: 'urso', name: 'Urso', body: '#5c3c24', body2: '#8c6444', kind: 'quad', traits: ['forca', 'escalar'], bonus: { res: 'madeira' }, desc: 'Muito forte: +madeira e aguenta perigos.', where: [5, 1], ears: 'redonda', tail: 'curto', snout: 1, size: 1.35 },
  { id: 'coruja', name: 'Coruja', body: '#a08060', body2: '#e8d8c0', kind: 'ave', traits: ['visao', 'voar'], bonus: { exp: .05 }, desc: 'Enxerga longe: mostra o melhor caminho.', where: [8, 1], size: .8 },
  { id: 'aguia', name: 'Águia Real', body: '#6c4828', body2: '#f4f0e8', kind: 'ave', traits: ['voar', 'visao'], bonus: { res: 'cristal' }, desc: 'Voa acima das tempestades.', where: [5, 7], size: 1.1 },
];
export const BEAST: { [k: string]: Beast } = Object.fromEntries(BEASTS.map(b => [b.id, b]));
export const BEAST_MAX = 10;
export const EVOLVE_AT = [4, 8]; /* níveis em que o bicho evolui (fica maior e mais forte) */
export const STAGE_NAMES = ['filhote', 'jovem', 'adulto'];
export function beastXP(lvl: number) { return 20 + lvl * 18; }
export function feedCost(lvl: number) { return 10 + lvl * 6; }
export const TRAIT_NAME: { [k: string]: string } = { nadar: 'Nada', escalar: 'Escala', voar: 'Voa', deserto: 'Aguenta deserto', forca: 'Força', faro: 'Faro', visao: 'Visão' };

/* ---------- regiões (expedições) ---------- */
export interface Region {
  id: number; name: string; x: number; y: number; bg: string; bg2: string; loot: Bag; need?: Trait[]; beastLvl?: number;
  desc: string; danger: number; people: string[]; gift?: Bag; food: number; water: number;
}
export const REGIONS: Region[] = [
  { id: 0, name: 'Campina Verde', x: .1, y: .55, bg: '#8cd468', bg2: '#74c058', loot: { comida: 40, madeira: 35 }, desc: 'Em volta da vila. Calma e cheia de capim.', danger: 0, people: ['explorador'], food: 4, water: 2 },
  { id: 1, name: 'Floresta Antiga', x: .3, y: .3, bg: '#3c9c4c', bg2: '#2c8040', loot: { madeira: 70, comida: 50 }, desc: 'Muita madeira e comida, mas cheia de feras.', danger: .2, people: ['cuidador', 'explorador'], gift: { madeira: 40 }, food: 8, water: 4 },
  { id: 2, name: 'Colinas de Pedra', x: .3, y: .75, bg: '#c8b484', bg2: '#b4a070', loot: { pedra: 70 }, desc: 'Pedra para todo lado. Aqui se aprende a fazer Pedreiras.', danger: .05, people: ['engenheiro'], gift: { pedra: 40 }, food: 8, water: 6 },
  { id: 3, name: 'Deserto Dourado', x: .52, y: .86, bg: '#f4d488', bg2: '#e8c070', loot: { cristal: 12, pedra: 30 }, desc: 'Gasta muita água (um Camelo resolve). Esconde a Estufa.', danger: .1, people: ['engenheiro'], gift: { cristal: 8 }, food: 10, water: 40 },
  { id: 4, name: 'Costa das Conchas', x: .52, y: .38, bg: '#f0e0a8', bg2: '#5cc0e8', loot: { escamas: 18, agua: 40 }, desc: 'Praia de conchas. Lontras e tartarugas vivem aqui.', danger: .05, people: ['cuidador'], gift: { escamas: 10 }, food: 10, water: 4 },
  { id: 5, name: 'Montanhas Altas', x: .7, y: .66, bg: '#a8a8b8', bg2: '#8c8c9c', loot: { metal: 20, pedra: 50 }, need: ['escalar'], desc: 'Precisa de um bicho que escale. Minério para a Forja.', danger: .15, people: ['engenheiro', 'explorador'], gift: { metal: 12 }, food: 14, water: 10 },
  { id: 6, name: 'Ilha Perdida', x: .72, y: .16, bg: '#bce8a8', bg2: '#40b8d8', loot: { escamas: 26, cristal: 10 }, need: ['nadar'], desc: 'Só com um bicho que nade. Lá se faz o Cais.', danger: .1, people: ['cuidador', 'engenheiro', 'explorador'], gift: { escamas: 20, cristal: 6 }, food: 14, water: 6 },
  { id: 7, name: 'Planície das Tempestades', x: .72, y: .9, bg: '#8c84a8', bg2: '#6c6488', loot: { cristal: 28 }, need: ['voar'], desc: 'Raios o tempo todo. Só um bicho que voa acha o caminho.', danger: .25, people: ['explorador'], gift: { cristal: 18 }, food: 16, water: 10 },
  { id: 8, name: 'Pântano da Névoa', x: .5, y: .1, bg: '#7c9c6c', bg2: '#5c7c58', loot: { metal: 14, cristal: 12, comida: 40 }, beastLvl: 4, desc: 'Lama funda: precisa de um bicho evoluído (nível 4).', danger: .2, people: ['cuidador', 'engenheiro'], gift: { metal: 12, cristal: 10 }, food: 14, water: 6 },
  { id: 9, name: 'Terra dos Gigantes', x: .92, y: .45, bg: '#f8d860', bg2: '#e8b840', loot: { cristal: 40, metal: 40, escamas: 26 }, need: ['nadar', 'escalar', 'voar'], beastLvl: 8, desc: 'Lar dos bichos lendários. Precisa de nadar, escalar, voar e um bicho nível 8.', danger: .2, people: ['explorador', 'engenheiro', 'cuidador'], gift: { cristal: 40, metal: 40 }, food: 20, water: 14 },
];
export const ROUTES: [number, number][] = [[0, 1], [0, 2], [1, 4], [2, 3], [1, 8], [4, 6], [4, 8], [2, 5], [3, 5], [3, 7], [5, 9], [6, 9], [7, 9], [8, 6]];

/* ---------- moradores ---------- */
export const ROLES: { [k: string]: { name: string; plural: string; col: string; desc: string } } = {
  explorador: { name: 'Explorador', plural: 'Exploradores', col: '#e07028', desc: 'Traz mais coisas das expedições.' },
  engenheiro: { name: 'Engenheiro', plural: 'Engenheiros', col: '#3c7cd8', desc: 'Resolve obstáculos e deixa as construções mais baratas.' },
  cuidador: { name: 'Cuidador', plural: 'Cuidadores', col: '#d8508c', desc: 'Cuida do grupo e dos bichos: bichos crescem mais rápido.' },
};
export const NAMES = ['Lia', 'Tito', 'Bia', 'Ravi', 'Nina', 'Davi', 'Mel', 'Caio', 'Lua', 'Rui', 'Zoe', 'Teo', 'Iara', 'Gael', 'Maya', 'Joca', 'Duda', 'Leo', 'Clara', 'Noah'];
export const VXP = [30, 70, 130, 220];
export const REST_S = 90;

/* ---------- expedições ---------- */
export const EXPED = [
  { id: 'coletar', name: 'Coletar', desc: 'Junta os materiais da região.' },
  { id: 'domar', name: 'Domar bicho', desc: 'Procura um bicho da região para trazer à vila.' },
  { id: 'resgatar', name: 'Resgatar', desc: 'Procura pessoas que queiram morar na vila.' },
];
export interface ExEvent { txt: string; a: { txt: string; role?: string; trait?: Trait; base: number }; b: { txt: string; role?: string; trait?: Trait; base: number }; tag?: string }
export const EVENTS: ExEvent[] = [
  { txt: 'Um rio forte corta o caminho.', a: { txt: 'Montar uma ponte', role: 'engenheiro', base: .45 }, b: { txt: 'Atravessar nadando', trait: 'nadar', base: .4 } },
  { txt: 'Pegadas enormes de fera na lama.', tag: 'fera', a: { txt: 'Seguir com cuidado', role: 'explorador', base: .5 }, b: { txt: 'Deixar o bicho farejar', trait: 'faro', base: .45 } },
  { txt: 'Alguém do grupo torceu o pé.', a: { txt: 'Fazer um curativo', role: 'cuidador', base: .5 }, b: { txt: 'Carregar no lombo do bicho', trait: 'forca', base: .45 } },
  { txt: 'Uma parede de pedra bloqueia a trilha.', a: { txt: 'Escalar a parede', trait: 'escalar', base: .4 }, b: { txt: 'Abrir passagem', role: 'engenheiro', base: .45 } },
  { txt: 'Um bando de bichos famintos cerca o grupo.', tag: 'fera', a: { txt: 'Distrair com comida', role: 'cuidador', base: .55 }, b: { txt: 'Espantar com força', trait: 'forca', base: .45 } },
  { txt: 'Neblina fechada: ninguém enxerga nada.', a: { txt: 'Ver do alto', trait: 'visao', base: .4 }, b: { txt: 'Seguir as estrelas', role: 'explorador', base: .5 } },
  { txt: 'Um carrinho velho cheio de coisas.', a: { txt: 'Consertar e levar tudo', role: 'engenheiro', base: .5 }, b: { txt: 'O bicho puxa o carrinho', trait: 'forca', base: .5 } },
  { txt: 'Frutas estranhas numa árvore alta.', a: { txt: 'Provar com cuidado', role: 'cuidador', base: .5 }, b: { txt: 'Voar até o topo', trait: 'voar', base: .45 } },
  { txt: 'Ouvem um pedido de ajuda vindo de uma caverna.', a: { txt: 'Entrar com tochas', role: 'explorador', base: .5 }, b: { txt: 'Farejar quem está lá', trait: 'faro', base: .45 } },
  { txt: 'O calor é forte e a água está acabando.', a: { txt: 'Achar uma fonte', role: 'explorador', base: .45 }, b: { txt: 'Seguir o bicho do deserto', trait: 'deserto', base: .4 } },
];

/* ---------- prêmio diário ---------- */
export const DAILY = [
  { txt: '40 de comida e madeira', bag: { comida: 40, madeira: 40 } },
  { txt: '50 de pedra e água', bag: { pedra: 50, agua: 50 } },
  { txt: 'Petisco: +40 de experiência para todos os bichos', bxp: 40 },
  { txt: '20 de metal', bag: { metal: 20 } },
  { txt: '20 escamas', bag: { escamas: 20 } },
  { txt: '20 cristais', bag: { cristal: 20 } },
  { txt: 'BAÚ: um filhote de bicho + materiais', bag: { comida: 80, madeira: 80, pedra: 80, metal: 20 }, beast: true },
];
export const OFFLINE_MAX_H = 12;
