/* Dados fixos do Cidade nas Costas: materiais, construções, criatura, regiões do mapa,
   moradores, eventos das expedições e o calendário do prêmio diário. */

/* ---------- materiais ---------- */
export type Res = 'comida' | 'madeira' | 'pedra' | 'agua' | 'metal' | 'escamas' | 'cristal';
export const RES: Res[] = ['comida', 'madeira', 'pedra', 'agua', 'metal', 'escamas', 'cristal'];
export const RES_INFO: { [k: string]: { name: string; col: string } } = {
  comida: { name: 'Comida', col: '#f0a030' }, madeira: { name: 'Madeira', col: '#a8703c' }, pedra: { name: 'Pedra', col: '#9ca0ac' },
  agua: { name: 'Água', col: '#3ca8f0' }, metal: { name: 'Metal', col: '#6c7c94' }, escamas: { name: 'Escamas', col: '#30c0a8' }, cristal: { name: 'Cristal', col: '#c070f0' },
};
export type Bag = Partial<Record<Res, number>>;
export const BASE_CAP = 150;

/* ---------- construções (cada uma ocupa 1 espaço do casco) ---------- */
export interface Building { id: string; name: string; cost: Bag; prod?: Bag; cap?: Bag; homes?: number; desc: string; from: number; adj?: { with: string; bonus: number; txt: string } }
/** `from`: região onde a planta é descoberta (0 = já começa sabendo) */
export const BUILDINGS: Building[] = [
  { id: 'casa', name: 'Casa', cost: { madeira: 10 }, homes: 2, from: 0, desc: 'Abriga 2 moradores.' },
  { id: 'roca', name: 'Roça', cost: { madeira: 8 }, prod: { comida: 200 }, from: 0, desc: 'Planta comida. Rende menos no deserto.', adj: { with: 'poco', bonus: .3, txt: '+30% ao lado de um Poço' } },
  { id: 'serraria', name: 'Serraria', cost: { madeira: 6, pedra: 4 }, prod: { madeira: 150 }, from: 0, desc: 'Corta madeira. Rende muito na floresta.' },
  { id: 'poco', name: 'Poço', cost: { pedra: 10 }, prod: { agua: 150 }, cap: { agua: 100 }, from: 0, desc: 'Junta água e guarda mais. Rende mais na costa.' },
  { id: 'armazem', name: 'Armazém', cost: { madeira: 20, pedra: 10 }, cap: { comida: 150, madeira: 150, pedra: 150, agua: 100, metal: 60, escamas: 60, cristal: 60 }, from: 0, desc: 'Guarda mais de tudo.' },
  { id: 'pedreira', name: 'Pedreira', cost: { madeira: 15 }, prod: { pedra: 125 }, from: 2, desc: 'Tira pedra. Rende muito nas colinas e montanhas.', adj: { with: 'oficina', bonus: .2, txt: '+20% ao lado da Oficina' } },
  { id: 'oficina', name: 'Oficina', cost: { madeira: 25, pedra: 15 }, from: 2, desc: 'Necessária para a criatura aprender habilidades. Engenheiros constroem mais barato.' },
  { id: 'torre', name: 'Torre de Vigia', cost: { madeira: 15, pedra: 20 }, from: 1, desc: 'Expedições mais seguras: +10% de chance em cada escolha.' },
  { id: 'estufa', name: 'Estufa', cost: { pedra: 20, agua: 20 }, prod: { comida: 150 }, from: 3, desc: 'Comida em qualquer lugar, até no deserto.' },
  { id: 'forja', name: 'Forja', cost: { pedra: 30, madeira: 20 }, prod: { metal: 60 }, from: 5, desc: 'Faz metal. Rende o dobro nas montanhas.', adj: { with: 'pedreira', bonus: .25, txt: '+25% ao lado da Pedreira' } },
  { id: 'farol', name: 'Farol', cost: { madeira: 30, escamas: 10 }, from: 6, desc: 'As viagens ficam 30% mais curtas.' },
  { id: 'jardim', name: 'Jardim de Cristal', cost: { pedra: 20, cristal: 10 }, prod: { cristal: 30 }, from: 7, desc: 'Cultiva cristais devagar.' },
];
export const BUILD: { [k: string]: Building } = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

/* ---------- criatura ---------- */
export const GRID = [[4, 2], [5, 2], [5, 3], [6, 3], [7, 3], [7, 4]]; /* tamanho do casco por nível */
export const CREATURE_XP = [40, 100, 200, 360, 600];
export const FEED = 20; /* comida por porção */
export interface Ability { id: string; name: string; desc: string; cost: Bag; lvl: number }
export const ABILITIES: Ability[] = [
  { id: 'patas', name: 'Patas Fortes', desc: 'Garras para subir montanhas.', cost: { metal: 15, pedra: 40 }, lvl: 2 },
  { id: 'nadadeiras', name: 'Nadadeiras', desc: 'Nada pelo mar até as ilhas.', cost: { escamas: 20, madeira: 40 }, lvl: 2 },
  { id: 'carapaca', name: 'Carapaça', desc: 'Placas duras que aguentam tempestades.', cost: { cristal: 15, pedra: 60 }, lvl: 3 },
];

/* ---------- regiões ---------- */
export interface Region {
  id: number; name: string; x: number; y: number; bg: string; bg2: string; mod: Bag; loot: Bag; need?: string[]; size?: number;
  desc: string; danger: number; people: string[]; gift?: Bag;
}
export const REGIONS: Region[] = [
  { id: 0, name: 'Campina Verde', x: .1, y: .55, bg: '#8cd468', bg2: '#74c058', mod: { comida: 1.2 }, loot: { comida: 30, madeira: 25 }, desc: 'Onde tudo começou. Calma e cheia de capim.', danger: 0, people: ['explorador'] },
  { id: 1, name: 'Floresta Antiga', x: .3, y: .3, bg: '#3c9c4c', bg2: '#2c8040', mod: { comida: 1.5, madeira: 2 }, loot: { madeira: 50, comida: 40 }, desc: 'Muita comida e madeira, mas cheia de feras.', danger: .2, people: ['cuidador', 'explorador'], gift: { madeira: 30 } },
  { id: 2, name: 'Colinas de Pedra', x: .3, y: .75, bg: '#c8b484', bg2: '#b4a070', mod: { pedra: 2, comida: .8 }, loot: { pedra: 50 }, desc: 'Pedra para todo lado. Aqui se aprende a fazer Oficinas.', danger: .05, people: ['engenheiro'], gift: { pedra: 30 } },
  { id: 3, name: 'Deserto Dourado', x: .52, y: .86, bg: '#f4d488', bg2: '#e8c070', mod: { comida: .2, agua: .3 }, loot: { cristal: 8, pedra: 20 }, desc: 'Quase nada cresce. Leve água! Esconde a Estufa.', danger: .1, people: ['engenheiro'], gift: { cristal: 6 } },
  { id: 4, name: 'Costa das Conchas', x: .52, y: .38, bg: '#f0e0a8', bg2: '#5cc0e8', mod: { agua: 1.6 }, loot: { escamas: 14, agua: 30 }, desc: 'Praia de conchas. Escamas para aprender a nadar.', danger: .05, people: ['cuidador'], gift: { escamas: 8 } },
  { id: 5, name: 'Montanhas Altas', x: .7, y: .66, bg: '#a8a8b8', bg2: '#8c8c9c', mod: { pedra: 2, metal: 2, comida: .6 }, loot: { metal: 16, pedra: 40 }, need: ['patas'], desc: 'Só com Patas Fortes. Minério para a Forja.', danger: .15, people: ['engenheiro', 'explorador'], gift: { metal: 10 } },
  { id: 6, name: 'Ilha Perdida', x: .72, y: .16, bg: '#bce8a8', bg2: '#40b8d8', mod: { comida: 1.3, agua: 1.3 }, loot: { escamas: 20, cristal: 8 }, need: ['nadadeiras'], desc: 'Só nadando. Gente que nunca viu uma criatura gigante.', danger: .1, people: ['cuidador', 'engenheiro', 'explorador'], gift: { escamas: 15, cristal: 5 } },
  { id: 7, name: 'Planície das Tempestades', x: .72, y: .9, bg: '#8c84a8', bg2: '#6c6488', mod: { agua: 1.4, comida: .7 }, loot: { cristal: 22 }, need: ['carapaca'], desc: 'Raios o tempo todo. Só com Carapaça. Muito cristal.', danger: .25, people: ['explorador'], gift: { cristal: 15 } },
  { id: 8, name: 'Pântano da Névoa', x: .5, y: .1, bg: '#7c9c6c', bg2: '#5c7c58', mod: { comida: 1.3, agua: 1.2 }, loot: { metal: 10, cristal: 10, comida: 30 }, size: 4, desc: 'Lama funda: só uma criatura de tamanho 4 atravessa.', danger: .2, people: ['cuidador', 'engenheiro'], gift: { metal: 10, cristal: 8 } },
  { id: 9, name: 'Terra dos Gigantes', x: .92, y: .45, bg: '#f8d860', bg2: '#e8b840', mod: { comida: 1.5, madeira: 1.5, pedra: 1.5, metal: 1.5, cristal: 1.5 }, loot: { cristal: 30, metal: 30, escamas: 20 }, need: ['patas', 'nadadeiras', 'carapaca'], size: 5, desc: 'Lar de outras criaturas gigantes. O fim da primeira jornada.', danger: .2, people: ['explorador', 'engenheiro', 'cuidador'], gift: { cristal: 30, metal: 30 } },
];
/** rotas: [de, para, segundos de viagem, gasto extra de comida, gasto extra de água] */
export const ROUTES: [number, number, number, number, number][] = [
  [0, 1, 50, 10, 5], [0, 2, 50, 10, 10], [1, 4, 60, 10, 5], [2, 3, 75, 10, 40], [1, 8, 80, 20, 10], [4, 6, 70, 15, 0], [4, 8, 70, 15, 5],
  [2, 5, 80, 20, 15], [3, 5, 70, 15, 30], [3, 7, 80, 20, 20], [5, 9, 100, 30, 20], [6, 9, 100, 30, 10], [7, 9, 100, 30, 20], [8, 6, 70, 15, 5],
];

/* ---------- moradores ---------- */
export const ROLES: { [k: string]: { name: string; col: string; desc: string } } = {
  explorador: { name: 'Explorador', col: '#f08030', desc: 'Traz mais coisas das expedições.' },
  engenheiro: { name: 'Engenheiro', col: '#3c8cf0', desc: 'Resolve obstáculos e deixa as construções mais baratas.' },
  cuidador: { name: 'Cuidador', col: '#e860a8', desc: 'Cuida dos feridos e faz a criatura crescer mais rápido.' },
};
export const NAMES = ['Lia', 'Tito', 'Bia', 'Ravi', 'Nina', 'Davi', 'Mel', 'Caio', 'Lua', 'Rui', 'Zoe', 'Teo', 'Iara', 'Gael', 'Maya', 'Joca', 'Duda', 'Leo', 'Clara', 'Noah'];
export const VXP = [30, 70, 130, 220];
export const REST_S = 90; /* descanso depois de uma expedição (segundos) */

/* ---------- expedições ---------- */
export const EXPED = [
  { id: 'coletar', name: 'Coletar', desc: 'Junta os materiais da região.', icon: 'cesta' },
  { id: 'explorar', name: 'Explorar', desc: 'Procura ruínas e plantas de construção. Mais arriscado.', icon: 'luneta' },
  { id: 'resgatar', name: 'Resgatar', desc: 'Procura pessoas que queiram morar na cidade.', icon: 'corda' },
];
export interface ExEvent { txt: string; a: { txt: string; role?: string; base: number }; b: { txt: string; role?: string; base: number }; tag?: string }
export const EVENTS: ExEvent[] = [
  { txt: 'Um rio forte corta o caminho.', a: { txt: 'Montar uma ponte', role: 'engenheiro', base: .45 }, b: { txt: 'Procurar um trecho raso', role: 'explorador', base: .55 } },
  { txt: 'Pegadas enormes de fera na lama.', tag: 'fera', a: { txt: 'Seguir com cuidado', role: 'explorador', base: .5 }, b: { txt: 'Dar a volta (mais seguro)', base: .75 } },
  { txt: 'Alguém do grupo torceu o pé.', a: { txt: 'Fazer um curativo', role: 'cuidador', base: .5 }, b: { txt: 'Carregar e seguir', base: .55 } },
  { txt: 'Uma porta de pedra antiga, trancada.', a: { txt: 'Destravar o mecanismo', role: 'engenheiro', base: .4 }, b: { txt: 'Procurar outra entrada', role: 'explorador', base: .45 } },
  { txt: 'Um bando de bichos famintos cerca o grupo.', tag: 'fera', a: { txt: 'Distrair com comida', role: 'cuidador', base: .55 }, b: { txt: 'Correr para as pedras', role: 'explorador', base: .5 } },
  { txt: 'Uma ventania levanta poeira.', a: { txt: 'Esperar abrigados', base: .7 }, b: { txt: 'Seguir pelo atalho', role: 'explorador', base: .45 } },
  { txt: 'Um carrinho velho cheio de coisas.', a: { txt: 'Consertar e levar tudo', role: 'engenheiro', base: .5 }, b: { txt: 'Pegar só o que cabe', base: .8 } },
  { txt: 'Frutas estranhas numa árvore alta.', a: { txt: 'Provar com cuidado', role: 'cuidador', base: .5 }, b: { txt: 'Subir e colher muitas', role: 'explorador', base: .5 } },
  { txt: 'Ouvem um pedido de ajuda vindo de uma caverna.', a: { txt: 'Entrar com tochas', role: 'explorador', base: .5 }, b: { txt: 'Escorar a entrada antes', role: 'engenheiro', base: .55 } },
  { txt: 'O mapa molhou e ficou ilegível.', a: { txt: 'Seguir as estrelas', role: 'explorador', base: .55 }, b: { txt: 'Voltar pelo mesmo caminho', base: .7 } },
];

/* ---------- prêmio diário ---------- */
export const DAILY = [
  { txt: '30 de comida e madeira', bag: { comida: 30, madeira: 30 } },
  { txt: '40 de pedra e água', bag: { pedra: 40, agua: 40 } },
  { txt: 'Porção extra: +40 de crescimento', xp: 40 },
  { txt: '20 de metal', bag: { metal: 20 } },
  { txt: '15 escamas', bag: { escamas: 15 } },
  { txt: '15 cristais', bag: { cristal: 15 } },
  { txt: 'BAÚ: um morador novo + materiais', bag: { comida: 60, madeira: 60, pedra: 60, metal: 20 }, villager: true },
];
export const OFFLINE_MAX_H = 12;
