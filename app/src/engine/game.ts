/* Motor do Cidade nas Costas: uma cidade nas costas de uma criatura gigante que viaja
   por um mundo desconhecido. Produção em tempo real (continua enquanto você está fora,
   com limite e sem perder nada), viagens pelo mapa, expedições com escolhas, a criatura
   que cresce e aprende habilidades, e os moradores que ganham experiência.
   As telas em React Native leem `ui`/`info` e chamam `act`. */
import {
  RES, RES_INFO, BASE_CAP, BUILDINGS, BUILD, GRID, CREATURE_XP, FEED, ABILITIES, REGIONS, ROUTES, ROLES, NAMES, VXP, REST_S,
  EXPED, EVENTS, DAILY, OFFLINE_MAX_H, type Bag, type Res,
} from './data';
import { ground, creature, building, text, setCanvasMaker, iconImage, INK } from './draw';
import type { Platform, Ctx2D, Insets, PtrEv } from './types';

export type Game = ReturnType<typeof createGame>;
/* espaço das telas em volta da criatura (React Native) */
export const TOP_H = 50, LEFT_W = 136, BOTTOM_H = 58;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const now = () => Date.now();

interface Cell { b: string | null; stock: Bag }
interface Villager { id: number; name: string; role: string; lvl: number; xp: number; rest: number; seed: number }

export function createGame(pf: Platform) {
  setCanvasMaker(pf.createCanvas);
  let W = 800, H = 400, DPR = 1, INS: Insets = { t: 0, r: 0, b: 0, l: 0 };
  function setLayout(w: number, h: number, dpr: number, ins: Insets) { W = w; H = h; DPR = dpr; INS = ins || INS; emit(); }

  /* ---------- telas ---------- */
  const ui: any = { v: 0, show: { city: true, build: false, creature: false, people: false, exped: false, map: false, daily: false, away: false }, toast: null as any };
  const subs = new Set<() => void>();
  let emitQ = false;
  function emit() { if (emitQ) return; emitQ = true; Promise.resolve().then(() => { emitQ = false; ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); }); }
  function only(k: string) { for (const s in ui.show) if (s !== 'daily' && s !== 'away') ui.show[s] = false; ui.show[k] = true; emit(); }
  function close(k: string) { ui.show[k] = false; if (!['build', 'creature', 'people', 'exped', 'map'].some(s => ui.show[s])) ui.show.city = true; emit(); }
  let toastT: any = null, toastN = 0;
  function toast(s: string) { ui.toast = { s, id: ++toastN }; emit(); clearTimeout(toastT); toastT = setTimeout(() => { ui.toast = null; emit(); }, 3000); }
  const sfx = (n: string, v = 1) => pf.audio.play(n, v);

  /* ---------- progresso salvo ---------- */
  const fresh = () => ({
    res: { comida: 50, madeira: 45, pedra: 25, agua: 35, metal: 0, escamas: 0, cristal: 0 } as Bag,
    cr: { lvl: 1, xp: 0, ab: {} as { [k: string]: boolean } },
    cols: 4, rows: 2, grid: [] as Cell[],
    vil: [] as Villager[], wait: [] as string[], nextId: 1,
    region: 0, visited: [0], travel: null as null | { from: number; to: number; start: number; dur: number },
    t: now(), daily: { last: '', streak: 0 }, sfx: true, mus: true, created: now(), exps: 0, done: false,
  });
  let save: any = fresh();
  try { const s = JSON.parse(pf.storage.load() || 'null'); if (s && typeof s === 'object' && s.grid) save = Object.assign(fresh(), s); } catch (e) { }
  if (!save.grid.length) {
    save.grid = Array.from({ length: save.cols * save.rows }, () => ({ b: null, stock: {} }));
    save.grid[1].b = 'casa'; save.grid[2].b = 'roca'; save.grid[6].b = 'poco';
    addVillager('explorador', 'Lia'); addVillager('engenheiro', 'Tito'); addVillager('cuidador', 'Bia');
  }
  function persist() { save.t = now(); try { pf.storage.save(JSON.stringify(save)); } catch (e) { } }
  pf.audio.setVolumes(save.sfx, save.mus);

  function addVillager(role: string, name?: string) {
    const used = new Set(save.vil.map((v: Villager) => v.name));
    const nm = name || NAMES.find(n => !used.has(n)) || ('Morador ' + save.nextId);
    const v: Villager = { id: save.nextId++, name: nm, role, lvl: 1, xp: 0, rest: 0, seed: Math.floor(Math.random() * 1000) };
    save.vil.push(v); return v;
  }
  const homes = () => 3 + save.grid.filter((c: Cell) => c.b === 'casa').length * 2;
  function recruit(role: string) {
    if (save.vil.length < homes()) { const v = addVillager(role); toast(v.name + ' (' + ROLES[role].name + ') veio morar na cidade!'); sfx('join'); return true; }
    save.wait.push(role); toast('Um ' + ROLES[role].name.toLowerCase() + ' quer morar aqui, mas falta casa! Construa uma Casa.'); return false;
  }
  function fillHomes() { while (save.wait.length && save.vil.length < homes()) { const r = save.wait.shift(); const v = addVillager(r); toast(v.name + ' se mudou para a casa nova!'); } }

  /* ---------- números da cidade ---------- */
  const has = (b: string) => save.grid.some((c: Cell) => c.b === b);
  const count = (role: string) => save.vil.filter((v: Villager) => v.role === role).length;
  const region = () => REGIONS[save.region];
  function cap(r: Res) { let c = BASE_CAP; for (const cell of save.grid) { const B = cell.b && BUILD[cell.b]; if (B && B.cap && B.cap[r]) c += B.cap[r]!; } return c; }
  const neighbors = (i: number) => { const x = i % save.cols, y = Math.floor(i / save.cols), out: number[] = []; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < save.cols && ny < save.rows) out.push(ny * save.cols + nx); } return out; };
  /** produção por hora de uma construção, já com região, vizinhos e fome */
  function rateOf(i: number): Bag {
    const cell = save.grid[i], B = cell && cell.b ? BUILD[cell.b] : null; if (!B || !B.prod) return {};
    const out: Bag = {}, R = save.travel ? null : region();
    let k = 1;
    if (B.adj && neighbors(i).some(n => save.grid[n].b === B.adj!.with)) k += B.adj.bonus;
    if (hungry()) k *= .5;
    for (const r in B.prod) { const m = B.id === 'estufa' ? 1 : (R ? (R.mod[r as Res] ?? 1) : .6); out[r as Res] = B.prod[r as Res]! * m * k; }
    return out;
  }
  const hungry = () => (save.res.comida || 0) <= 0 || (save.res.agua || 0) <= 0;
  const eatRate = () => save.vil.length * 6, drinkRate = () => save.vil.length * 4;
  function totalRates() { const t: Bag = {}; for (let i = 0; i < save.grid.length; i++) { const r = rateOf(i); for (const k in r) t[k as Res] = (t[k as Res] || 0) + r[k as Res]!; } return t; }

  /* ---------- tempo passando (também o tempo fora do jogo) ---------- */
  function simulate(sec: number) {
    if (sec <= 0) return;
    const h = sec / 3600;
    for (let i = 0; i < save.grid.length; i++) {
      const r = rateOf(i), cell = save.grid[i];
      for (const k in r) { const lim = r[k as Res]! * 8; cell.stock[k as Res] = Math.min(lim, (cell.stock[k as Res] || 0) + r[k as Res]! * h); }
    }
    save.res.comida = Math.max(0, (save.res.comida || 0) - eatRate() * h);
    save.res.agua = Math.max(0, (save.res.agua || 0) - drinkRate() * h);
  }
  function readyCount() { let n = 0; for (const c of save.grid) for (const k in c.stock) if (c.stock[k as Res]! >= 1) { n++; break; } return n; }
  function collectAll(silent = false) {
    let got: Bag = {}, full = false;
    for (let i = 0; i < save.grid.length; i++) {
      const c = save.grid[i];
      for (const k in c.stock) {
        const r = k as Res, amt = Math.floor(c.stock[r]!); if (amt < 1) continue;
        const room = Math.max(0, cap(r) - (save.res[r] || 0)), take = Math.min(room, amt);
        if (take < amt) full = true;
        if (take > 0) { save.res[r] = (save.res[r] || 0) + take; c.stock[r] = c.stock[r]! - take; got[r] = (got[r] || 0) + take; floatAt(i, '+' + take, RES_INFO[r].col); }
      }
    }
    const any = Object.keys(got).length > 0;
    if (!silent) { if (any) sfx('collect'); else sfx('nope'); if (full) toast('Os depósitos estão cheios! Construa um Armazém (ou um Poço para água).'); else if (!any) toast('Nada pronto ainda.'); }
    persist(); emit(); return got;
  }

  /* ---------- dia de hoje (prêmio diário) ---------- */
  const dstr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => dstr(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dstr(d); };
  function dailyState() { const can = save.daily.last !== today(); const streak = can ? (save.daily.last === yesterday() ? save.daily.streak | 0 : 0) : (save.daily.streak | 0) - 1; return { can, day: ((streak % 7) + 7) % 7, streak }; }

  /* ---------- chegada ao abrir o jogo ---------- */
  let away: any = null;
  {
    const sec = clamp((now() - (save.t || now())) / 1000, 0, OFFLINE_MAX_H * 3600);
    const before = JSON.stringify(save.grid.map((c: Cell) => c.stock));
    if (sec > 5) simulate(sec);
    if (sec > 120) {
      const got: Bag = {}; const prev = JSON.parse(before);
      save.grid.forEach((c: Cell, i: number) => { for (const k in c.stock) { const d = Math.floor((c.stock[k as Res] || 0) - ((prev[i] || {})[k] || 0)); if (d > 0) got[k as Res] = (got[k as Res] || 0) + d; } });
      away = { mins: Math.round(sec / 60), capped: sec >= OFFLINE_MAX_H * 3600 - 1, got };
      ui.show.away = true;
    }
    if (dailyState().can) ui.show.daily = !ui.show.away;
  }

  /* ---------- criatura ---------- */
  function feed() {
    if (save.cr.lvl >= GRID.length) { toast('A criatura já está do tamanho máximo!'); return; }
    if ((save.res.comida || 0) < FEED) { sfx('nope'); toast('Precisa de ' + FEED + ' de comida para uma porção.'); return; }
    save.res.comida -= FEED;
    const gain = Math.round(10 * (1 + count('cuidador') * .15 + save.vil.filter((v: Villager) => v.role === 'cuidador').reduce((a: number, v: Villager) => a + (v.lvl - 1) * .05, 0)));
    growXP(gain); sfx('eat'); bump = 1;
    persist(); emit();
  }
  function growXP(n: number) {
    save.cr.xp += n;
    while (save.cr.lvl < GRID.length && save.cr.xp >= CREATURE_XP[save.cr.lvl - 1]) {
      save.cr.xp -= CREATURE_XP[save.cr.lvl - 1]; save.cr.lvl++; resizeGrid();
      sfx('grow'); banner('A CRIATURA CRESCEU!'); toast('Nível ' + save.cr.lvl + '! O casco agora tem ' + save.cols * save.rows + ' espaços.');
    }
  }
  function resizeGrid() {
    const [nc, nr] = GRID[save.cr.lvl - 1], old = save.grid, oc = save.cols, orr = save.rows;
    const g: Cell[] = Array.from({ length: nc * nr }, () => ({ b: null, stock: {} }));
    const ox = Math.floor((nc - oc) / 2), oy = Math.floor((nr - orr) / 2);
    for (let y = 0; y < orr; y++) for (let x = 0; x < oc; x++) g[(y + oy) * nc + (x + ox)] = old[y * oc + x];
    save.grid = g; save.cols = nc; save.rows = nr; sel = -1;
  }
  function learn(id: string) {
    const A = ABILITIES.find(a => a.id === id); if (!A || save.cr.ab[id]) return;
    if (!has('oficina')) { sfx('nope'); toast('Construa uma Oficina primeiro (a planta aparece nas Colinas de Pedra).'); return; }
    if (save.cr.lvl < A.lvl) { sfx('nope'); toast('A criatura precisa estar no nível ' + A.lvl + '. Alimente ela!'); return; }
    if (!pay(A.cost)) return;
    save.cr.ab[id] = true; sfx('grow'); banner(A.name.toUpperCase() + '!'); toast('A criatura aprendeu ' + A.name + ': ' + A.desc);
    persist(); emit();
  }

  /* ---------- custos ---------- */
  const discount = () => Math.min(.25, count('engenheiro') * .05);
  const costOf = (bag: Bag, build = false) => { const o: Bag = {}; for (const k in bag) o[k as Res] = Math.ceil(bag[k as Res]! * (build ? 1 - discount() : 1)); return o; };
  const canPay = (bag: Bag) => Object.keys(bag).every(k => (save.res[k as Res] || 0) >= bag[k as Res]!);
  function pay(bag: Bag) {
    const miss = Object.keys(bag).filter(k => (save.res[k as Res] || 0) < bag[k as Res]!);
    if (miss.length) { sfx('nope'); toast('Falta ' + miss.map(k => (bag[k as Res]! - Math.floor(save.res[k as Res] || 0)) + ' de ' + RES_INFO[k].name.toLowerCase()).join(', ') + '.'); return false; }
    for (const k in bag) save.res[k as Res] = (save.res[k as Res] || 0) - bag[k as Res]!;
    return true;
  }

  /* ---------- cidade: construir, mover, desmontar ---------- */
  let sel = -1, moving = -1;
  const known = () => BUILDINGS.filter(b => save.visited.includes(b.from));
  function tapCell(i: number) {
    if (moving >= 0) {
      if (i !== moving) { const a = save.grid[moving]; save.grid[moving] = save.grid[i]; save.grid[i] = a; sfx('place'); toast('Construção movida.'); persist(); }
      moving = -1; sel = i; emit(); return;
    }
    sel = i; sfx('select'); ui.show.build = true; ui.show.city = false; emit();
  }
  function build(id: string) {
    if (sel < 0 || save.grid[sel].b) return;
    const B = BUILD[id]; if (!B || !known().includes(B)) return;
    if (!pay(costOf(B.cost, true))) return;
    save.grid[sel] = { b: id, stock: {} }; born[sel] = clock; sfx('build');
    if (id === 'casa') fillHomes();
    persist(); close('build');
  }
  function demolish() {
    if (sel < 0 || !save.grid[sel].b) return;
    const B = BUILD[save.grid[sel].b!];
    if (B.id === 'casa' && save.vil.length > homes() - 2) { sfx('nope'); toast('Moradores vivem nessa casa. Construa outra antes.'); return; }
    collectAll(true);
    for (const k in B.cost) save.res[k as Res] = Math.min(cap(k as Res), (save.res[k as Res] || 0) + Math.floor(B.cost[k as Res]! / 2));
    save.grid[sel] = { b: null, stock: {} }; sfx('break'); toast(B.name + ' desmontada (metade do material voltou).');
    persist(); close('build');
  }
  function startMove() { if (sel < 0 || !save.grid[sel].b) return; moving = sel; close('build'); toast('Toque no espaço para onde quer levar.'); }

  /* ---------- viagem ---------- */
  const route = (a: number, b: number) => ROUTES.find(r => (r[0] === a && r[1] === b) || (r[0] === b && r[1] === a));
  function reqMissing(to: number) {
    const R = REGIONS[to], miss: string[] = [];
    for (const n of R.need || []) if (!save.cr.ab[n]) miss.push(ABILITIES.find(a => a.id === n)!.name);
    if (R.size && save.cr.lvl < R.size) miss.push('criatura nível ' + R.size);
    return miss;
  }
  function travelCost(to: number) {
    const r = route(save.region, to)!; const n = save.vil.length;
    const dur = Math.round(r[2] * (has('farol') ? .7 : 1));
    return { dur, food: r[3] + Math.ceil(n * 1.5), water: r[4] + Math.ceil(n * 1) };
  }
  function travel(to: number) {
    if (save.travel) { toast('A criatura já está viajando.'); return; }
    if (to === save.region || !route(save.region, to)) { toast('Não tem caminho direto daqui.'); return; }
    const miss = reqMissing(to); if (miss.length) { sfx('nope'); toast('Para ir até ' + REGIONS[to].name + ' falta: ' + miss.join(', ') + '.'); return; }
    if (exp) { toast('Espere a expedição voltar.'); return; }
    const c = travelCost(to);
    if (!pay({ comida: c.food, agua: c.water })) return;
    collectAll(true);
    save.travel = { from: save.region, to, start: now(), dur: c.dur };
    sfx('travel'); toast('Partimos para ' + REGIONS[to].name + '! A cidade continua trabalhando na viagem.');
    persist(); close('map');
  }
  function arrive() {
    const to = save.travel.to; save.travel = null; save.region = to;
    const R = REGIONS[to], first = !save.visited.includes(to);
    banner(R.name.toUpperCase()); sfx('arrive');
    if (first) {
      save.visited.push(to);
      if (R.gift) for (const k in R.gift) save.res[k as Res] = Math.min(cap(k as Res), (save.res[k as Res] || 0) + R.gift[k as Res]!);
      const nb = BUILDINGS.filter(b => b.from === to);
      setTimeout(() => {
        toast('Descoberta! ' + R.desc + (nb.length ? ' Planta nova: ' + nb.map(b => b.name).join(', ') + '.' : ''));
        if (R.people.length) recruit(R.people[0]);
        if (to === 9 && !save.done) { save.done = true; banner('VOCÊS CHEGARAM À TERRA DOS GIGANTES!'); }
      }, 1200);
    } else toast('De volta a ' + R.name + '.');
    persist(); emit();
  }

  /* ---------- expedições ---------- */
  let exp: any = null;
  const free = () => save.vil.filter((v: Villager) => v.rest <= now());
  function expStart(type: string, ids: number[]) {
    if (save.travel) { toast('Durante a viagem não dá para sair em expedição.'); return; }
    const team = save.vil.filter((v: Villager) => ids.includes(v.id) && v.rest <= now()).slice(0, 3);
    if (!team.length) { toast('Escolha de 1 a 3 moradores descansados.'); return; }
    const R = region(), pool = EVENTS.filter(e => R.danger >= .15 || e.tag !== 'fera'), evs: any[] = [];
    while (evs.length < 3 && pool.length) evs.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    exp = { type, team: team.map((v: Villager) => v.id), evs, i: 0, score: 0, hurt: 0, log: [] as string[], done: false, reward: null };
    sfx('click'); emit();
  }
  function chance(opt: any) {
    let c = opt.base;
    if (opt.role) { const best = save.vil.filter((v: Villager) => exp.team.includes(v.id) && v.role === opt.role).reduce((a: number, v: Villager) => Math.max(a, v.lvl), 0); if (best) c += .25 + (best - 1) * .05; }
    if (has('torre')) c += .1;
    c -= region().danger * (exp.evs[exp.i].tag === 'fera' ? .8 : .3);
    return clamp(c, .1, .95);
  }
  function expChoose(k: number) {
    if (!exp || exp.done) return;
    const ev = exp.evs[exp.i], opt = k === 0 ? ev.a : ev.b;
    const ok = Math.random() < chance(opt);
    if (ok) { exp.score++; exp.log.push('✓ ' + opt.txt + ': deu certo!'); sfx('good'); }
    else { exp.hurt++; exp.log.push('✗ ' + opt.txt + ': não deu certo.'); sfx('bad'); }
    exp.i++;
    if (exp.i >= exp.evs.length) finishExp();
    emit();
  }
  function finishExp() {
    const R = region(), team = save.vil.filter((v: Villager) => exp.team.includes(v.id));
    const ex = team.filter((v: Villager) => v.role === 'explorador').reduce((a: number, v: Villager) => a + .15 + (v.lvl - 1) * .05, 0);
    const mult = (.6 + exp.score * .25 - exp.hurt * .1) * (1 + ex);
    const loot: Bag = {};
    const add = (r: Res, n: number) => { n = Math.max(0, Math.round(n)); if (n) loot[r] = (loot[r] || 0) + n; };
    if (exp.type === 'coletar') for (const k in R.loot) add(k as Res, R.loot[k as Res]! * mult);
    else if (exp.type === 'explorar') { for (const k in R.loot) add(k as Res, R.loot[k as Res]! * mult * .5); add('cristal', 2 + exp.score * 2); add('metal', exp.score * 2); }
    else for (const k in R.loot) add(k as Res, R.loot[k as Res]! * mult * .3);
    let full = false;
    for (const k in loot) { const r = k as Res, room = Math.max(0, cap(r) - (save.res[r] || 0)); if (room < loot[r]!) full = true; save.res[r] = (save.res[r] || 0) + Math.min(room, loot[r]!); }
    let person: string | null = null, crXP = 0;
    if (exp.type === 'resgatar' && exp.score >= 1) { const role = R.people[Math.floor(Math.random() * R.people.length)] || 'explorador'; person = role; recruit(role); }
    if (exp.type === 'explorar') { crXP = 5 + exp.score * 5; growXP(crXP); }
    const ups: string[] = [];
    for (const v of team) {
      v.xp += 10 + exp.score * 6; v.rest = now() + REST_S * 1000 * (exp.hurt >= 2 ? 1.6 : 1) * (1 - Math.min(.3, count('cuidador') * .08));
      while (v.lvl < VXP.length + 1 && v.xp >= VXP[v.lvl - 1]) { v.xp -= VXP[v.lvl - 1]; v.lvl++; ups.push(v.name + ' subiu para o nível ' + v.lvl + '!'); }
    }
    save.exps = (save.exps | 0) + 1;
    exp.done = true; exp.reward = { loot, person, crXP, ups, full, score: exp.score };
    sfx(exp.score >= 2 ? 'win' : 'collect'); persist();
  }

  /* ---------- efeitos ---------- */
  let clock = 0, bump = 0, walkOff = 0, bannerS = '', bannerT = 0;
  const born: { [i: number]: number } = {};
  let floats: { x: number; y: number; s: string; c: string; t: number }[] = [];
  function banner(s: string) { bannerS = s; bannerT = 2.6; }
  let deck = { x: 0, y: 0, w: 0, h: 0 };
  function cellRect(i: number) {
    const cs = Math.min(deck.w / save.cols, deck.h / save.rows), gx = deck.x + (deck.w - cs * save.cols) / 2, gy = deck.y + (deck.h - cs * save.rows) / 2;
    const x = i % save.cols, y = Math.floor(i / save.cols); return { x: gx + x * cs, y: gy + y * cs, s: cs };
  }
  function floatAt(i: number, s: string, c: string) { const r = cellRect(i); floats.push({ x: r.x + r.s / 2 + (Math.random() - .5) * r.s * .4, y: r.y + r.s * .3, s, c, t: 1.4 }); }

  /* ---------- laço ---------- */
  let last = pf.now(), simAcc = 0;
  function tick(nowp: number) {
    const dt = Math.min(.1, Math.max(0, (nowp - last) / 1000)); last = nowp; clock += dt;
    try {
      simAcc += dt;
      if (simAcc >= 1) { simulate(simAcc); simAcc = 0; if (save.travel && now() >= save.travel.start + save.travel.dur * 1000) arrive(); if (Math.floor(clock) % 5 === 0) persist(); emit(); }
      if (save.travel) walkOff += dt * 90;
      bump = Math.max(0, bump - dt * 2.5); bannerT = Math.max(0, bannerT - dt);
      for (const f of floats) { f.t -= dt; f.y -= 22 * dt; } floats = floats.filter(f => f.t > 0);
      pf.audio.music(save.travel ? 'travel' : 'city');
    } catch (e) { console.error(e); }
  }

  /* ---------- desenho ---------- */
  function draw(g: Ctx2D) {
    try {
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      const R = region(), T2 = save.travel ? REGIONS[save.travel.to] : null;
      ground(g, W, H, save.travel ? (walkOff % 2000 < 1000 ? R.id : T2!.id) : R.id, save.travel && walkOff % 2000 >= 1000 ? T2!.bg : R.bg, save.travel && walkOff % 2000 >= 1000 ? T2!.bg2 : R.bg2, walkOff, clock);
      /* área livre para a criatura */
      const x0 = LEFT_W + INS.l + 10, x1 = W - INS.r - 10, y0 = TOP_H + INS.t + 6, y1 = H - BOTTOM_H - INS.b;
      const growK = .72 + save.cr.lvl * .055;
      const cw = Math.min((x1 - x0) * .7, (y1 - y0) * 1.22) * growK, chh = cw * .56;
      const cx = (x0 + x1) / 2 - cw * .06, cy = (y0 + y1) / 2 + Math.sin(clock * (save.travel ? 5 : 1.3)) * (save.travel ? 2 : 1);
      const sc = 1 + bump * .03;
      g.save(); g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
      deck = creature(g, cx, cy, cw, chh, clock, { lvl: save.cr.lvl, patas: !!save.cr.ab.patas, nadadeiras: !!save.cr.ab.nadadeiras, carapaca: !!save.cr.ab.carapaca, walk: !!save.travel });
      /* a cidade */
      for (let i = 0; i < save.grid.length; i++) {
        const r = cellRect(i), c = save.grid[i];
        g.fillStyle = (i + Math.floor(i / save.cols)) % 2 ? '#e4c894' : '#dcbc84'; g.fillRect(r.x + 1, r.y + 1, r.s - 2, r.s - 2);
        if (i === sel && (ui.show.build || moving >= 0) || i === moving) { g.lineWidth = 3; g.strokeStyle = i === moving ? '#3c8cf0' : '#fff'; g.strokeRect?.(r.x + 3, r.y + 3, r.s - 6, r.s - 6); }
        if (c.b) {
          const pop = born[i] != null ? Math.min(1, (clock - born[i]) * 4) : 1;
          const ready = Object.values(c.stock).some(v => (v as number) >= 1) ? 1 : 0;
          g.save(); g.translate(r.x + r.s / 2, r.y + r.s / 2); g.scale(.5 + pop * .5, .5 + pop * .5); g.translate(-(r.x + r.s / 2), -(r.y + r.s / 2));
          building(g, c.b, r.x + r.s / 2, r.y + r.s * .52, r.s * .84, clock + i, ready);
          g.restore();
        } else if (moving < 0) { g.globalAlpha = .4; text(g, '+', r.x + r.s / 2, r.y + r.s / 2, r.s * .4, '#a8844c'); g.globalAlpha = 1; }
      }
      /* moradores andando no convés */
      save.vil.slice(0, 8).forEach((v: Villager, k: number) => {
        const p = (clock * .05 + k * .37 + v.seed * .01) % 1, px = deck.x + 6 + p * (deck.w - 12), py = deck.y + deck.h + 2 - ((k % 2) * 4);
        if (v.rest > now()) return;
        g.beginPath(); g.arc(px, py, 4, 0, 7); g.fillStyle = ROLES[v.role].col; g.fill(); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke();
      });
      g.restore();
      for (const f of floats) { g.globalAlpha = Math.min(1, f.t * 2); text(g, f.s, f.x, f.y, 18, f.c, 4); } g.globalAlpha = 1;
      if (save.travel) { const p = clamp((now() - save.travel.start) / (save.travel.dur * 1000), 0, 1); const bw = Math.min(260, W * .3), bx = (x0 + x1) / 2 - bw / 2, by = y0 + 6; g.fillStyle = INK; g.fillRect(bx - 3, by - 3, bw + 6, 18); g.fillStyle = '#fff4dc'; g.fillRect(bx, by, bw, 12); g.fillStyle = '#5cc048'; g.fillRect(bx, by, bw * p, 12); text(g, 'Viajando para ' + T2!.name + ' · ' + Math.ceil((1 - p) * save.travel.dur) + 's', (x0 + x1) / 2, by + 26, 15, '#fff', 4); }
      if (bannerT > 0) { g.globalAlpha = Math.min(1, bannerT * 2); text(g, bannerS, (x0 + x1) / 2, y0 + (y1 - y0) * .2, Math.min(34, W / 24), '#ffe070', 7); g.globalAlpha = 1; }
    } catch (e) { console.error(e); }
  }

  /* ---------- toques ---------- */
  function ptrDown(ev: PtrEv): boolean {
    if (!ui.show.city || ui.show.daily || ui.show.away) return false;
    for (let i = 0; i < save.grid.length; i++) { const r = cellRect(i); if (ev.x >= r.x && ev.x < r.x + r.s && ev.y >= r.y && ev.y < r.y + r.s) { tapCell(i); return false; } }
    if (moving >= 0) { moving = -1; emit(); }
    return false;
  }

  /* ---------- informações para as telas ---------- */
  const ri = (k: string, s = 40) => iconImage('res', k, s);
  function resList(bag: Bag, rich = false) { return Object.keys(bag).map(k => ({ k, n: Math.ceil(bag[k as Res]!), name: RES_INFO[k].name, col: RES_INFO[k].col, img: ri(k), ok: rich ? (save.res[k as Res] || 0) >= bag[k as Res]! : true })); }
  function goal() {
    if (readyCount() >= 3) return 'Toque em RECOLHER para guardar a produção.';
    if (!save.visited.includes(2)) return 'Viaje para as Colinas de Pedra: lá se aprende a fazer Oficinas.';
    if (!has('oficina')) return 'Construa uma Oficina: com ela a criatura aprende habilidades.';
    for (const r of [4, 5, 6, 7, 8, 9]) {
      if (save.visited.includes(r)) continue;
      const reach = ROUTES.some(rt => (save.visited.includes(rt[0]) && rt[1] === r) || (save.visited.includes(rt[1]) && rt[0] === r));
      if (!reach) continue;
      const miss = reqMissing(r);
      return miss.length ? 'Avistamos ' + REGIONS[r].name + '! Falta: ' + miss.join(', ') + '.' : 'Dá para chegar em ' + REGIONS[r].name + '. Abra o MAPA!';
    }
    return save.done ? 'Vocês chegaram à Terra dos Gigantes! Continue crescendo a cidade.' : 'Explore o mapa e cresça a criatura.';
  }
  function cityInfo() {
    const rates = totalRates();
    return {
      res: RES.map(k => ({ k, n: Math.floor(save.res[k] || 0), cap: cap(k), img: ri(k, 36), rate: Math.round((rates[k] || 0) - (k === 'comida' ? eatRate() : k === 'agua' ? drinkRate() : 0)) })).filter(r => r.n > 0 || r.rate !== 0 || ['comida', 'madeira', 'pedra', 'agua'].includes(r.k)),
      region: save.travel ? 'Viajando…' : region().name, lvl: save.cr.lvl, ready: readyCount(), goal: goal(), moving: moving >= 0, hungry: hungry(),
      people: save.vil.length, homes: homes(), free: free().length, traveling: !!save.travel, dailyCan: dailyState().can, sfx: !!save.sfx, mus: !!save.mus,
    };
  }
  function buildInfo() {
    const c = sel >= 0 ? save.grid[sel] : null;
    if (!c) return { mode: 'none' };
    if (c.b) {
      const B = BUILD[c.b], r = rateOf(sel), adjOk = B.adj ? neighbors(sel).some(n => save.grid[n].b === B.adj!.with) : false;
      return { mode: 'info', id: B.id, name: B.name, desc: B.desc, img: iconImage('build', B.id, 110), rate: resList(r).map(x => ({ ...x, n: Math.round(x.n) })), adj: B.adj ? { txt: B.adj.txt, ok: adjOk } : null, stock: resList(c.stock).filter(x => x.n >= 1).map(x => ({ ...x, n: Math.floor(save.grid[sel].stock[x.k as Res]!) })) };
    }
    return {
      mode: 'empty', discount: Math.round(discount() * 100),
      list: known().map(B => ({ id: B.id, name: B.name, desc: B.desc, img: iconImage('build', B.id, 90), cost: resList(costOf(B.cost, true), true), ok: canPay(costOf(B.cost, true)), prod: B.prod ? resList(B.prod) : [] })),
      locked: BUILDINGS.filter(b => !save.visited.includes(b.from)).map(b => ({ name: b.name, where: REGIONS[b.from].name })),
    };
  }
  function creatureInfo() {
    return {
      lvl: save.cr.lvl, max: GRID.length, xp: save.cr.xp, need: save.cr.lvl < GRID.length ? CREATURE_XP[save.cr.lvl - 1] : 0, feed: FEED, food: Math.floor(save.res.comida || 0),
      grid: save.cols + '×' + save.rows, nextGrid: save.cr.lvl < GRID.length ? GRID[save.cr.lvl].join('×') : '', oficina: has('oficina'),
      abilities: ABILITIES.map(a => ({ id: a.id, name: a.name, desc: a.desc, lvl: a.lvl, have: !!save.cr.ab[a.id], cost: resList(a.cost, true), ok: canPay(a.cost) && save.cr.lvl >= a.lvl && has('oficina') })),
    };
  }
  function peopleInfo() {
    return {
      homes: homes(), wait: save.wait.length,
      list: save.vil.map((v: Villager) => ({ id: v.id, name: v.name, role: v.role, roleName: ROLES[v.role].name, col: ROLES[v.role].col, lvl: v.lvl, xp: v.xp, need: VXP[v.lvl - 1] || 0, rest: Math.max(0, Math.ceil((v.rest - now()) / 1000)), img: iconImage('role', v.role, 72, v.seed) })),
      roles: Object.keys(ROLES).map(k => ({ k, name: ROLES[k].name, desc: ROLES[k].desc, col: ROLES[k].col, n: count(k) })),
    };
  }
  function expInfo() {
    const R = region();
    const base = { region: R.name, danger: Math.round(R.danger * 100), traveling: !!save.travel, types: EXPED, loot: resList(R.loot), torre: has('torre'),
      people: save.vil.map((v: Villager) => ({ id: v.id, name: v.name, roleName: ROLES[v.role].name, col: ROLES[v.role].col, lvl: v.lvl, rest: Math.max(0, Math.ceil((v.rest - now()) / 1000)), img: iconImage('role', v.role, 64, v.seed) })) };
    if (!exp) return { ...base, stage: 'pick' };
    if (exp.done) return { ...base, stage: 'done', log: exp.log, reward: { ...exp.reward, loot: resList(exp.reward.loot), person: exp.reward.person ? ROLES[exp.reward.person].name : null } };
    const ev = exp.evs[exp.i];
    const opt = (o: any) => ({ txt: o.txt, role: o.role ? ROLES[o.role].name : '', pct: Math.round(chance(o) * 100), has: o.role ? save.vil.some((v: Villager) => exp.team.includes(v.id) && v.role === o.role) : false });
    return { ...base, stage: 'event', i: exp.i, n: exp.evs.length, txt: ev.txt, fera: ev.tag === 'fera', a: opt(ev.a), b: opt(ev.b), log: exp.log, team: save.vil.filter((v: Villager) => exp.team.includes(v.id)).map((v: Villager) => ({ name: v.name, img: iconImage('role', v.role, 56, v.seed) })) };
  }
  function mapInfo() {
    const nodes = REGIONS.map(R => {
      const visited = save.visited.includes(R.id), here = save.region === R.id && !save.travel;
      const rt = route(save.region, R.id), adj = !!rt && !save.travel;
      const seen = visited || ROUTES.some(r => (save.visited.includes(r[0]) && r[1] === R.id) || (save.visited.includes(r[1]) && r[0] === R.id));
      const miss = reqMissing(R.id), c = adj ? travelCost(R.id) : null;
      return { id: R.id, name: seen ? R.name : '???', x: R.x, y: R.y, col: R.bg, col2: R.bg2, visited, here, seen, adj, miss, desc: seen ? R.desc : 'Uma terra que ninguém conhece.', cost: c, okCost: c ? (save.res.comida || 0) >= c.food && (save.res.agua || 0) >= c.water : false, target: save.travel && save.travel.to === R.id };
    });
    const lines = ROUTES.map(r => ({ a: r[0], b: r[1], seen: nodes[r[0]].seen && nodes[r[1]].seen }));
    return { nodes, lines, traveling: !!save.travel };
  }
  function dailyInfo() { const d = dailyState(); return { can: d.can, day: d.day, days: DAILY.map((r, i) => ({ i, txt: r.txt, done: i < d.day || (!d.can && i === d.day), today: i === d.day })) }; }
  function awayInfo() { return away ? { mins: away.mins, capped: away.capped, got: resList(away.got) } : { mins: 0, got: [] }; }

  /* ---------- ações das telas ---------- */
  const act = {
    btnSound: (k?: string) => sfx(k === 'back' ? 'back' : 'click'),
    collect: () => collectAll(), feed, learn, build, demolish, startMove,
    closeBuild: () => { sel = -1; close('build'); },
    open: (k: string) => { if (k === 'exped' && exp && exp.done) exp = null; only(k); },
    closeScreen: (k: string) => { if (k === 'exped' && exp && exp.done) exp = null; close(k); },
    travel,
    expStart: (type: string, ids: number[]) => expStart(type, ids || []), expChoose, expEnd: () => { exp = null; close('exped'); },
    claimDaily: () => {
      const d = dailyState(); if (!d.can) return; const r: any = DAILY[d.day];
      if (r.bag) for (const k in r.bag) save.res[k as Res] = Math.min(cap(k as Res) + 50, (save.res[k as Res] || 0) + r.bag[k]);
      if (r.xp) growXP(r.xp);
      if (r.villager) recruit(['explorador', 'engenheiro', 'cuidador'][Math.floor(Math.random() * 3)]);
      save.daily = { last: today(), streak: d.streak + 1 }; persist(); sfx('prize'); toast('Dia ' + (d.day + 1) + ': ' + r.txt + '!'); emit();
    },
    openDaily: () => { ui.show.daily = true; emit(); }, closeDaily: () => { ui.show.daily = false; emit(); },
    closeAway: () => { ui.show.away = false; if (dailyState().can) ui.show.daily = true; emit(); },
    toggleSfx: () => { save.sfx = !save.sfx; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    toggleMus: () => { save.mus = !save.mus; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    resetAll: () => { save = fresh(); try { pf.storage.save(''); } catch (e) { } location?.reload?.(); },
    back, onHide: () => persist(), persist,
  };
  function back(): boolean {
    const S = ui.show;
    if (S.away) { act.closeAway(); return true; }
    if (S.daily) { act.closeDaily(); return true; }
    if (moving >= 0) { moving = -1; emit(); return true; }
    if (S.exped && exp && !exp.done) { return true; }
    for (const k of ['build', 'creature', 'people', 'exped', 'map']) if (S[k]) { if (k === 'build') act.closeBuild(); else act.closeScreen(k); sfx('back'); return true; }
    return false;
  }

  const game = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout, tick, draw,
    input: { keyDown: (_c: string) => false, keyUp: (_c: string) => { }, ptrDown, ptrMove: (_e: PtrEv) => { }, ptrUp: (_e: PtrEv, _c?: boolean) => { } },
    info: { city: cityInfo, build: buildInfo, creature: creatureInfo, people: peopleInfo, exped: expInfo, map: mapInfo, daily: dailyInfo, away: awayInfo, isTouch: () => pf.isTouch },
    act,
  };
  (game as any).__dbg = { get save() { return save; }, simulate, arrive, tapCell, get exp() { return exp; }, finishTravel: () => { if (save.travel) save.travel.start = now() - save.travel.dur * 1000; } };
  return game;
}
