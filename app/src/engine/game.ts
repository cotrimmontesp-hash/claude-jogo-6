/* Motor da Vila Selvagem: uma vila no chão (terrenos livres, caminhos, praça, cercado),
   construções que sobem até o nível 3, bichos domados nas expedições que comem, sobem
   de nível e evoluem, e um mapa de regiões que só abre com os bichos certos (nadar,
   escalar, voar, aguentar o deserto). A produção continua enquanto você está fora
   (até 12 horas, sem perder nada). As telas em React Native leem `ui`/`info` e chamam `act`. */
import {
  RES, RES_INFO, BASE_CAP, BUILDINGS, BUILD, BLVL_MAX, BLVL_PROD, upgradeCost, PLOTS, SQUARE, PEN,
  BEASTS, BEAST, BEAST_MAX, EVOLVE_AT, STAGE_NAMES, beastXP, feedCost, TRAIT_NAME, TRAIT_WHO,
  REGIONS, ROUTES, ROLES, NAMES, VXP, REST_S, EXPED, EVENTS, DAILY, OFFLINE_MAX_H, type Bag, type Res, type Trait,
  REGION_POS, WORLD, NODES, NODE_INFO, GROW_S, HARVEST,
} from './data';
import { blockedPlot, bonfire, fence, building, box, circ, beast as drawBeast, walker, text, setCanvasMaker, makeCanvas, iconImage, ambience, resNode } from './draw';
import { drawWorldTile, villageBase, regionAt, fog, storm, mist } from './world';
import type { Platform, Ctx2D, Insets, PtrEv, OffCanvas } from './types';

export type Game = ReturnType<typeof createGame>;
export const TOP_H = 50, LEFT_W = 136, BOTTOM_H = 58;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
const now = () => Date.now();

interface Plot { b: string | null; lvl: number; stock: Bag; open: boolean; crop?: number | null }
interface Villager { id: number; name: string; role: string; lvl: number; xp: number; rest: number; seed: number }
interface Pet { uid: number; id: string; lvl: number; xp: number; rest: number }

export function createGame(pf: Platform) {
  setCanvasMaker(pf.createCanvas);
  let W = 800, H = 400, DPR = 1, INS: Insets = { t: 0, r: 0, b: 0, l: 0 };
  let groundKey = '';
  function setLayout(w: number, h: number, dpr: number, ins: Insets) { const re = Math.abs(dpr - DPR) > .01; W = w; H = h; DPR = dpr; INS = ins || INS; if (re) tiles.clear(); emit(); }
  const tiles = new Map<string, { cv: OffCanvas; vk: string }>();

  /* ---------- telas ---------- */
  const ui: any = { v: 0, show: { city: true, build: false, beasts: false, people: false, exped: false, region: false, daily: false, away: false }, toast: null as any };
  const subs = new Set<() => void>();
  let emitQ = false;
  function emit() { if (emitQ) return; emitQ = true; Promise.resolve().then(() => { emitQ = false; ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); }); }
  function only(k: string) { for (const s in ui.show) if (s !== 'daily' && s !== 'away') ui.show[s] = false; ui.show[k] = true; emit(); }
  function close(k: string) { ui.show[k] = false; if (!['build', 'beasts', 'people', 'exped'].some(s => ui.show[s])) ui.show.city = true; emit(); }
  let toastT: any = null, toastN = 0;
  function toast(s: string) { ui.toast = { s, id: ++toastN }; emit(); clearTimeout(toastT); toastT = setTimeout(() => { ui.toast = null; emit(); }, 3200); }
  const sfx = (n: string, v = 1) => pf.audio.play(n, v);

  interface Walker { id: number; x: number; y: number; tx: number; ty: number; st: 'idle' | 'go' | 'work' | 'back'; node: number; t: number; carry: string | null; face: number; wait: number }
  let walkers: Walker[] = [];
  let roam: { uid: number; x: number; y: number; tx: number; ty: number; face: number; wait: number }[] = [];
  /* ---------- progresso salvo ---------- */
  const fresh = () => ({
    v: 2, res: { comida: 60, madeira: 50, pedra: 30, agua: 40, metal: 0, escamas: 0, cristal: 0 } as Bag,
    plots: PLOTS.map((p, i) => ({ b: null, lvl: 1, stock: {}, open: !p.clear })) as Plot[],
    vil: [] as Villager[], wait: [] as string[], nextId: 1, pets: [] as Pet[],
    explored: [0], t: now(), daily: { last: '', streak: 0 }, sfx: true, mus: true, exps: 0, done: false,
    nodes: {} as { [i: number]: { left: number; at: number } }, tut: { chop: false, plant: false },
  });
  let save: any = fresh();
  try { const s = JSON.parse(pf.storage.load() || 'null'); if (s && typeof s === 'object' && s.v === 2) save = Object.assign(fresh(), s); } catch (e) { }
  if (!save.vil.length) {
    save.plots[0].b = 'casa'; save.plots[1].b = 'fazenda'; save.plots[2].b = 'poco';
    addVillager('explorador', 'Lia'); addVillager('engenheiro', 'Tito'); addVillager('cuidador', 'Bia');
    save.pets.push({ uid: save.nextId++, id: 'lobo', lvl: 1, xp: 0, rest: 0 });
  }
  function persist() { save.t = now(); try { pf.storage.save(JSON.stringify(save)); } catch (e) { } }
  pf.audio.setVolumes(save.sfx, save.mus);

  function addVillager(role: string, name?: string) {
    const used = new Set(save.vil.map((v: Villager) => v.name));
    const nm = name || NAMES.find(n => !used.has(n)) || ('Morador ' + save.nextId);
    const v: Villager = { id: save.nextId++, name: nm, role, lvl: 1, xp: 0, rest: 0, seed: Math.floor(Math.random() * 1000) };
    save.vil.push(v); return v;
  }
  const sumLvl = (b: string) => save.plots.reduce((a: number, p: Plot) => a + (p.b === b ? p.lvl : 0), 0);
  const homes = () => 3 + sumLvl('casa') * 2;
  const pens = () => 2 + sumLvl('estabulo') * 2;
  function recruit(role: string) {
    if (save.vil.length < homes()) { const v = addVillager(role); toast(v.name + ' (' + ROLES[role].name + ') veio morar na vila!'); sfx('join'); return true; }
    save.wait.push(role); toast('Um ' + ROLES[role].name.toLowerCase() + ' quer morar aqui, mas falta casa!'); return false;
  }
  function fillHomes() { while (save.wait.length && save.vil.length < homes()) { const r = save.wait.shift(); const v = addVillager(r); toast(v.name + ' se mudou para a casa nova!'); } }

  /* ---------- números da vila ---------- */
  const has = (b: string) => save.plots.some((p: Plot) => p.b === b);
  const count = (role: string) => save.vil.filter((v: Villager) => v.role === role).length;
  function cap(r: Res) { let c = BASE_CAP; for (const p of save.plots) { const B = p.b && BUILD[p.b]; if (B && B.cap && B.cap[r]) c += B.cap[r]! * p.lvl; } return c; }
  const hungry = () => (save.res.comida || 0) <= 0 || (save.res.agua || 0) <= 0;
  const eatRate = () => save.vil.length * 6 + save.pets.length * 3, drinkRate = () => save.vil.length * 4 + save.pets.length * 2;
  /** bônus dos bichos para um material (+4% por nível de cada bicho que ajuda nele) */
  const petBonus = (r: string) => save.pets.reduce((a: number, p: Pet) => a + (BEAST[p.id].bonus.res === r ? p.lvl * .04 : 0), 0);
  function rateOf(i: number): Bag {
    const p = save.plots[i], B = p && p.b ? BUILD[p.b] : null; if (!B || !B.prod) return {};
    const out: Bag = {}, k = BLVL_PROD[p.lvl - 1] * (hungry() ? .5 : 1);
    for (const r in B.prod) out[r as Res] = B.prod[r as Res]! * k * (1 + petBonus(r));
    return out;
  }
  function totalRates() { const t: Bag = {}; for (let i = 0; i < save.plots.length; i++) { const r = rateOf(i); for (const k in r) t[k as Res] = (t[k as Res] || 0) + r[k as Res]!; } return t; }

  /* ---------- tempo passando ---------- */
  function simulate(sec: number) {
    if (sec <= 0) return;
    const h = sec / 3600;
    for (let i = 0; i < save.plots.length; i++) { const r = rateOf(i), p = save.plots[i]; for (const k in r) { const lim = r[k as Res]! * 8; p.stock[k as Res] = Math.min(lim, (p.stock[k as Res] || 0) + r[k as Res]! * h); } }
    save.res.comida = Math.max(0, (save.res.comida || 0) - eatRate() * h);
    save.res.agua = Math.max(0, (save.res.agua || 0) - drinkRate() * h);
  }
  function readyCount() { let n = 0; save.plots.forEach((p: Plot, i: number) => { if (p.b === 'fazenda' && p.crop && cropGrow(i) >= 1) { n++; return; } for (const k in p.stock) if (p.stock[k as Res]! >= 1) { n++; break; } }); return n; }
  function collectAll(silent = false) {
    const got: Bag = {}; let full = false;
    for (let i = 0; i < save.plots.length; i++) {
      const p = save.plots[i];
      for (const k in p.stock) {
        const r = k as Res, amt = Math.floor(p.stock[r]!); if (amt < 1) continue;
        const room = Math.max(0, cap(r) - (save.res[r] || 0)), take = Math.min(room, amt);
        if (take < amt) full = true;
        if (take > 0) { save.res[r] = (save.res[r] || 0) + take; p.stock[r] = p.stock[r]! - take; got[r] = (got[r] || 0) + take; floatAt(i, '+' + take, RES_INFO[r].col); }
      }
    }
    let crops = 0; save.plots.forEach((p: Plot, i: number) => { crops += harvest(i, true); }); if (crops) got.comida = (got.comida || 0) + crops;
    const any = Object.keys(got).length > 0;
    if (!silent) { if (any) sfx('collect'); else sfx('nope'); if (full) toast('Os depósitos estão cheios! Melhore ou construa um Armazém.'); else if (!any) toast('Nada pronto ainda.'); }
    persist(); emit(); return got;
  }

  /* ---------- prêmio diário ---------- */
  const dstr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => dstr(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dstr(d); };
  function dailyState() { const can = save.daily.last !== today(); const streak = can ? (save.daily.last === yesterday() ? save.daily.streak | 0 : 0) : (save.daily.streak | 0) - 1; return { can, day: ((streak % 7) + 7) % 7, streak }; }

  /* ---------- chegada ao abrir o jogo ---------- */
  let away: any = null;
  {
    const sec = clamp((now() - (save.t || now())) / 1000, 0, OFFLINE_MAX_H * 3600);
    const before = save.plots.map((p: Plot) => ({ ...p.stock }));
    if (sec > 5) simulate(sec);
    if (sec > 120) {
      const got: Bag = {};
      save.plots.forEach((p: Plot, i: number) => { for (const k in p.stock) { const d = Math.floor((p.stock[k as Res] || 0) - ((before[i] || {})[k] || 0)); if (d > 0) got[k as Res] = (got[k as Res] || 0) + d; } });
      away = { mins: Math.round(sec / 60), capped: sec >= OFFLINE_MAX_H * 3600 - 1, got };
      ui.show.away = true;
    }
    if (dailyState().can) ui.show.daily = !ui.show.away;
  }

  /* ---------- bichos ---------- */
  const stageOf = (lvl: number) => lvl >= EVOLVE_AT[1] ? 2 : lvl >= EVOLVE_AT[0] ? 1 : 0;
  function petXP(p: Pet, n: number) {
    if (p.lvl >= BEAST_MAX) return;
    p.xp += n;
    while (p.lvl < BEAST_MAX && p.xp >= beastXP(p.lvl)) {
      p.xp -= beastXP(p.lvl); const st0 = stageOf(p.lvl); p.lvl++;
      if (stageOf(p.lvl) > st0) { banner(BEAST[p.id].name.toUpperCase() + ' EVOLUIU!'); sfx('grow'); toast(BEAST[p.id].name + ' agora é ' + STAGE_NAMES[stageOf(p.lvl)] + ': maior e mais forte!'); }
      else { sfx('level'); toast(BEAST[p.id].name + ' subiu para o nível ' + p.lvl + '!'); }
    }
  }
  function feedPet(uid: number) {
    const p = save.pets.find((x: Pet) => x.uid === uid); if (!p) return;
    if (p.lvl >= BEAST_MAX) { toast('Nível máximo!'); return; }
    const c = Math.ceil(feedCost(p.lvl) * (1 - Math.min(.4, sumLvl('estabulo') * .1)));
    if ((save.res.comida || 0) < c) { sfx('nope'); toast('Precisa de ' + c + ' de comida.'); return; }
    save.res.comida -= c;
    petXP(p, Math.round(12 * (1 + count('cuidador') * .12)));
    sfx('eat'); persist(); emit();
  }
  function tame(id: string) {
    if (save.pets.length >= pens()) { toast('O cercado está cheio! Construa ou melhore um Estábulo.'); return false; }
    save.pets.push({ uid: save.nextId++, id, lvl: 1, xp: 0, rest: 0 }); roam = []; sfx('join'); banner('NOVO BICHO: ' + BEAST[id].name.toUpperCase() + '!'); return true;
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

  /* ---------- vila: terrenos ---------- */
  let sel = -1, moving = -1;
  const known = () => BUILDINGS.filter(b => save.explored.includes(b.from));
  function tapPlot(i: number) {
    if (moving >= 0) {
      if (i !== moving && save.plots[i].open) { const a = save.plots[moving]; save.plots[moving] = { ...save.plots[i], open: true }; save.plots[i] = { ...a, open: true }; sfx('place'); toast('Construção mudou de lugar.'); groundKey = ''; persist(); }
      moving = -1; emit(); return;
    }
    const p = save.plots[i];
    if (p.b === 'fazenda') {
      if (p.crop && cropGrow(i) >= 1) { harvest(i); return; }
      if (!p.crop) { plant(i); return; }
    }
    sel = i; sfx('select'); ui.show.build = true; ui.show.city = false; ui.show.region = false; emit();
  }
  /* ---------- fazenda: plantar e colher ---------- */
  const cropGrow = (i: number) => { const p = save.plots[i]; if (!p || !p.crop) return -1; return (now() - p.crop) / (GROW_S[p.lvl - 1] * 1000); };
  function plant(i: number) { const p = save.plots[i]; if (p.b !== 'fazenda' || p.crop) return; p.crop = now(); save.tut.plant = true; sfx('place'); floatAt(i, 'Plantado!', '#ffffff'); persist(); emit(); }
  function harvest(i: number, silent = false) {
    const p = save.plots[i]; if (p.b !== 'fazenda' || !p.crop || cropGrow(i) < 1) return 0;
    const n = Math.round(HARVEST[p.lvl - 1] * (1 + petBonus('comida'))), room = Math.max(0, cap('comida') - (save.res.comida || 0)), take = Math.min(room, n);
    if (take <= 0) { if (!silent) { sfx('nope'); toast('O depósito de comida está cheio!'); } return 0; }
    save.res.comida = (save.res.comida || 0) + take; p.crop = null; floatAt(i, '+' + take, RES_INFO.comida.col);
    if (!silent) { sfx('collect'); persist(); emit(); }
    return take;
  }
  function build(id: string) {
    if (sel < 0 || save.plots[sel].b || !save.plots[sel].open) return;
    const B = BUILD[id]; if (!B || !known().includes(B)) return;
    if (!pay(costOf(B.cost, true))) return;
    save.plots[sel] = { b: id, lvl: 1, stock: {}, open: true }; born[sel] = clock; sfx('build'); groundKey = '';
    if (id === 'casa') fillHomes();
    persist(); close('build');
  }
  function upgrade() {
    if (sel < 0) return; const p = save.plots[sel]; if (!p.b) return;
    if (p.lvl >= BLVL_MAX) { toast('Já está no nível máximo.'); return; }
    if (!pay(costOf(upgradeCost(BUILD[p.b], p.lvl), true))) return;
    collectAll(true); p.lvl++; born[sel] = clock; sfx('build'); toast(BUILD[p.b].name + ' agora é nível ' + p.lvl + '!');
    if (p.b === 'casa') fillHomes();
    persist(); emit();
  }
  function clearPlot() {
    if (sel < 0) return; const P = PLOTS[sel], p = save.plots[sel]; if (p.open || !P.clear) return;
    if (!pay(P.clear)) return;
    p.open = true; groundKey = ''; sfx('break'); toast(P.block === 'pedras' ? 'Pedras quebradas: terreno livre!' : 'Árvores cortadas: terreno livre!');
    persist(); emit();
  }
  function demolish() {
    if (sel < 0 || !save.plots[sel].b) return;
    const p = save.plots[sel], B = BUILD[p.b!];
    if (B.id === 'casa' && save.vil.length > homes() - 2 * p.lvl) { sfx('nope'); toast('Moradores vivem nessa casa. Construa outra antes.'); return; }
    if (B.id === 'estabulo' && save.pets.length > pens() - 2 * p.lvl) { sfx('nope'); toast('Os bichos precisam desse estábulo.'); return; }
    collectAll(true);
    for (const k in B.cost) save.res[k as Res] = Math.min(cap(k as Res), (save.res[k as Res] || 0) + Math.floor(B.cost[k as Res]! / 2));
    save.plots[sel] = { b: null, lvl: 1, stock: {}, open: true }; sfx('break'); groundKey = ''; toast(B.name + ' desmontada (metade do material voltou).');
    persist(); close('build');
  }
  function startMove() { if (sel < 0 || !save.plots[sel].b) return; moving = sel; close('build'); toast('Toque no terreno para onde quer levar.'); }

  /* ---------- expedições pelo mapa ---------- */
  let exp: any = null, target = -1;
  const reachable = (r: number) => save.explored.includes(r) || ROUTES.some(([a, b]) => (save.explored.includes(a) && b === r) || (save.explored.includes(b) && a === r));
  const teamTraits = (uids: number[]) => { const s = new Set<Trait>(); for (const p of save.pets) if (uids.includes(p.uid)) for (const t of BEAST[p.id].traits) s.add(t); return s; };
  function missing(r: number, uids?: number[]) {
    const R = REGIONS[r], miss: string[] = [];
    const tr = uids ? teamTraits(uids) : teamTraits(save.pets.map((p: Pet) => p.uid));
    for (const n of R.need || []) if (!tr.has(n)) miss.push('um ' + TRAIT_WHO[n]);
    if (R.beastLvl) { const pool = save.pets.filter((p: Pet) => !uids || uids.includes(p.uid)); if (!pool.some((p: Pet) => p.lvl >= R.beastLvl!)) miss.push('um bicho nível ' + R.beastLvl); }
    return miss;
  }
  function supplies(r: number, uids: number[]) {
    const R = REGIONS[r], n = 1 + uids.length * .3, desert = teamTraits(uids).has('deserto');
    return { food: Math.ceil(R.food * n), water: Math.ceil(R.water * n * (desert ? .2 : 1)) };
  }
  function expStart(region: number, type: string, ids: number[], uids: number[]) {
    if (!reachable(region)) { toast('Essa região ainda não foi avistada.'); return; }
    const team = save.vil.filter((v: Villager) => ids.includes(v.id) && v.rest <= now()).slice(0, 3);
    const pets = save.pets.filter((p: Pet) => uids.includes(p.uid) && p.rest <= now()).slice(0, 2);
    if (!team.length) { toast('Escolha de 1 a 3 moradores descansados.'); return; }
    const miss = missing(region, pets.map((p: Pet) => p.uid));
    if (miss.length) { sfx('nope'); toast('Para ' + REGIONS[region].name + ' falta: ' + miss.join(' e ') + '.'); return; }
    if (type === 'domar' && save.pets.length >= pens()) { toast('O cercado está cheio! Construa ou melhore um Estábulo antes.'); return; }
    const sp = supplies(region, pets.map((p: Pet) => p.uid));
    if (!pay({ comida: sp.food, agua: sp.water })) return;
    const R = REGIONS[region], pool = EVENTS.filter(e => R.danger >= .15 || e.tag !== 'fera'), evs: any[] = [];
    while (evs.length < 3 && pool.length) evs.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    exp = { region, type, team: team.map((v: Villager) => v.id), pets: pets.map((p: Pet) => p.uid), evs, i: 0, score: 0, hurt: 0, log: [] as string[], done: false, reward: null };
    sfx('travel'); emit();
  }
  function chance(opt: any) {
    let c = opt.base;
    if (opt.role) { const best = save.vil.filter((v: Villager) => exp.team.includes(v.id) && v.role === opt.role).reduce((a: number, v: Villager) => Math.max(a, v.lvl), 0); if (best) c += .25 + (best - 1) * .05; }
    if (opt.trait) { const best = save.pets.filter((p: Pet) => exp.pets.includes(p.uid) && BEAST[p.id].traits.includes(opt.trait)).reduce((a: number, p: Pet) => Math.max(a, p.lvl), 0); if (best) c += .3 + best * .025; }
    for (const p of save.pets) if (exp.pets.includes(p.uid)) c += (BEAST[p.id].bonus.exp || 0) * (1 + p.lvl * .1) + p.lvl * .005;
    c += sumLvl('torre') * .05;
    c -= REGIONS[exp.region].danger * (exp.evs[exp.i].tag === 'fera' ? .8 : .3);
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
    const R = REGIONS[exp.region], team = save.vil.filter((v: Villager) => exp.team.includes(v.id)), pets = save.pets.filter((p: Pet) => exp.pets.includes(p.uid));
    const ex = team.filter((v: Villager) => v.role === 'explorador').reduce((a: number, v: Villager) => a + .15 + (v.lvl - 1) * .05, 0);
    const strong = pets.filter((p: Pet) => BEAST[p.id].traits.includes('forca')).reduce((a: number, p: Pet) => a + .1 + p.lvl * .02, 0);
    const mult = (.6 + exp.score * .25 - exp.hurt * .1) * (1 + ex + strong);
    const loot: Bag = {};
    const add = (r: Res, n: number) => { n = Math.max(0, Math.round(n)); if (n) loot[r] = (loot[r] || 0) + n; };
    const lk = exp.type === 'coletar' ? 1 : .35;
    for (const k in R.loot) add(k as Res, R.loot[k as Res]! * mult * lk);
    let full = false;
    for (const k in loot) { const r = k as Res, room = Math.max(0, cap(r) - (save.res[r] || 0)); if (room < loot[r]!) full = true; save.res[r] = (save.res[r] || 0) + Math.min(room, loot[r]!); }
    let person: string | null = null, newPet: string | null = null, discovered: any = null;
    if (exp.type === 'resgatar' && exp.score >= 1) { const role = R.people[Math.floor(Math.random() * R.people.length)] || 'explorador'; person = role; recruit(role); }
    if (exp.type === 'domar') {
      const opts = BEASTS.filter(b => b.where.includes(R.id));
      if (opts.length && exp.score >= 2) { const b = opts[Math.floor(Math.random() * opts.length)]; if (tame(b.id)) newPet = b.id; }
    }
    if (!save.explored.includes(R.id) && exp.score >= 1) {
      save.explored.push(R.id);
      if (R.gift) for (const k in R.gift) save.res[k as Res] = Math.min(cap(k as Res), (save.res[k as Res] || 0) + R.gift[k as Res]!);
      discovered = { name: R.name, blue: BUILDINGS.filter(b => b.from === R.id).map(b => b.name), beasts: BEASTS.filter(b => b.where.includes(R.id)).map(b => b.name) };
      if (R.people.length && !person) { person = R.people[0]; recruit(person); }
      if (R.id === 9) save.done = true;
      banner('DESCOBERTA: ' + R.name.toUpperCase());
    }
    const ups: string[] = [];
    for (const v of team) {
      v.xp += 10 + exp.score * 6; v.rest = now() + REST_S * 1000 * (exp.hurt >= 2 ? 1.6 : 1) * (1 - Math.min(.3, count('cuidador') * .08));
      while (v.lvl < VXP.length + 1 && v.xp >= VXP[v.lvl - 1]) { v.xp -= VXP[v.lvl - 1]; v.lvl++; ups.push(v.name + ' subiu para o nível ' + v.lvl + '!'); }
    }
    for (const p of pets) { const l0 = p.lvl; petXP(p, 12 + exp.score * 6); p.rest = now() + REST_S * 1000 * .8; if (p.lvl > l0) ups.push(BEAST[p.id].name + ' subiu para o nível ' + p.lvl + '!'); }
    save.exps = (save.exps | 0) + 1;
    exp.done = true; exp.reward = { loot, person, newPet, discovered, ups, full, score: exp.score };
    sfx(exp.score >= 2 ? 'win' : 'collect'); persist();
  }

  /* ---------- câmera: o mundo inteiro, arrastando com o dedo e com pinça ---------- */
  let clock = 0, bannerS = '', bannerT = 0;
  const born: { [i: number]: number } = {};
  let floats: { x: number; y: number; s: string; c: string; t: number }[] = [];
  function banner(s: string) { bannerS = s; bannerT = 2.8; }
  const cam = { x: 515, y: 330, z: 1, init: false };
  let camGo: { x: number; y: number; z?: number } | null = null, vel = { x: 0, y: 0 };
  let k0 = 1;
  const kS = () => k0 * cam.z;
  const ZMAX = 1.9;
  const zMin = () => Math.max(.4, W / ((WORLD.x1 - WORLD.x0) * k0), H / ((WORLD.y1 - WORLD.y0) * k0));
  function clampCam() {
    cam.z = clamp(cam.z, zMin(), ZMAX);
    const hw = W / 2 / kS(), hh = H / 2 / kS();
    cam.x = clamp(cam.x, WORLD.x0 + hw, WORLD.x1 - hw); cam.y = clamp(cam.y, WORLD.y0 + hh, WORLD.y1 - hh);
  }
  function view() {
    const x0 = LEFT_W + INS.l + 4, x1 = W - INS.r - 4, y0 = TOP_H + INS.t, y1 = H - BOTTOM_H - INS.b + 6;
    k0 = Math.min((x1 - x0) / 850, (y1 - y0) / 470);
    if (!cam.init) { cam.init = true; cam.x = 515 - ((x0 + x1) / 2 - W / 2) / kS(); cam.y = 330 - ((y0 + y1) / 2 - H / 2) / kS(); }
    clampCam();
  }
  /** mundo -> tela (px css) e tela -> mundo */
  const P = (x: number, y: number): [number, number] => [W / 2 + (x - cam.x) * kS(), H / 2 + (y - cam.y) * kS()];
  const toWorld = (sx: number, sy: number): [number, number] => [cam.x + (sx - W / 2) / kS(), cam.y + (sy - H / 2) / kS()];
  function floatAt(i: number, s: string, c: string) { floats.push({ x: PLOTS[i].x + (Math.random() - .5) * 30, y: PLOTS[i].y - 50, s, c, t: 1.4 }); }
  function floatW(x: number, y: number, s: string, c: string) { floats.push({ x, y, s, c, t: 1.4 }); }
  /** câmera vai suavemente até um ponto do mundo */
  function lookAt(x: number, y: number, z?: number) { camGo = { x, y, z }; vel = { x: 0, y: 0 }; }

  /* ---------- chão em ladrilhos ---------- */
  const LV = [.4, .55, .75, 1, 1.35, 1.9], TPX = 512, TMAX = 44;
  let shownLv = -1;
  const vKey = () => save.plots.map((p: Plot) => (p.open ? 1 : 0) + (p.b ? 'b' : '')).join('');
  const VR = { x0: -170, y0: -120, x1: 1170, y1: 720 };
  function tileScale(li: number) { return LV[li] * k0 * Math.min(DPR, 2.2); }
  function makeTile(li: number, tx: number, ty: number) {
    const ts = tileScale(li), TW = TPX / ts, wx0 = tx * TW, wy0 = ty * TW;
    const c = makeCanvas(TPX, TPX), g = c.getContext('2d');
    g.setTransform(ts, 0, 0, ts, -wx0 * ts, -wy0 * ts);
    const plots = PLOTS.map((pl, i) => ({ x: pl.x, y: pl.y, open: save.plots[i].open, used: !!save.plots[i].b }));
    drawWorldTile(g, wx0, wy0, wx0 + TW, wy0 + TW, gg => villageBase(gg, plots, SQUARE, PEN));
    const touches = wx0 < VR.x1 && wx0 + TW > VR.x0 && wy0 < VR.y1 && wy0 + TW > VR.y0;
    return { cv: c, vk: touches ? vKey() : '' };
  }
  function getTile(li: number, tx: number, ty: number, make: boolean) {
    const key = li + ':' + tx + ':' + ty; let t = tiles.get(key);
    if (t && t.vk && t.vk !== groundKey) { tiles.delete(key); t = undefined; }
    if (t) { tiles.delete(key); tiles.set(key, t); return t; }
    if (!make) return null;
    t = makeTile(li, tx, ty); tiles.set(key, t);
    while (tiles.size > TMAX) { const first = tiles.keys().next().value as string; tiles.delete(first); }
    return t;
  }
  function drawTiles(g: Ctx2D) {
    groundKey = vKey();
    const S = kS() * DPR;
    let li = LV.findIndex(z => z >= cam.z * .95); if (li < 0) li = LV.length - 1;
    const [ax, ay] = toWorld(0, 0), [bx, by] = toWorld(W, H);
    const pass = (L: number, make: number) => {
      const TW = TPX / tileScale(L); let missing = 0;
      for (let tx = Math.floor(ax / TW); tx * TW < bx; tx++) for (let ty = Math.floor(ay / TW); ty * TW < by; ty++) {
        const t = getTile(L, tx, ty, make > 0); if (!t) { missing++; continue; } if (make > 0 && !tiles.get(L + ':' + tx + ':' + ty)) make--;
        const sx = W * DPR / 2 + (tx * TW - cam.x) * S, sy = H * DPR / 2 + (ty * TW - cam.y) * S, sz = TW * S;
        g.drawImage(t.cv as any, Math.floor(sx), Math.floor(sy), Math.ceil(sz) + 1, Math.ceil(sz) + 1);
      }
      return missing;
    };
    g.fillStyle = '#7cbc54'; g.fillRect(0, 0, W * DPR, H * DPR);
    const budget = shownLv < 0 ? 999 : 3;
    if (shownLv >= 0 && shownLv !== li) pass(shownLv, 0);
    let made = 0; const TW = TPX / tileScale(li);
    for (let tx = Math.floor(ax / TW); tx * TW < bx && made < budget; tx++) for (let ty = Math.floor(ay / TW); ty * TW < by && made < budget; ty++) if (!getTile(li, tx, ty, false)) { getTile(li, tx, ty, true); made++; }
    if (pass(li, 0) === 0) shownLv = li;
  }

  /* ---------- árvores, pedras e arbustos para coletar ---------- */
  function nodeState(i: number) {
    const N = NODE_INFO[NODES[i].kind], s = save.nodes[i];
    if (!s) return { left: N.uses, regrow: 1 };
    if (s.left <= 0 && now() >= s.at) { delete save.nodes[i]; return { left: N.uses, regrow: 1 }; }
    return { left: s.left, regrow: s.left > 0 ? 1 : 1 - (s.at - now()) / (N.regrow * 1000) };
  }
  const freeVil = (v: Villager) => v.rest <= now();
  function syncWalkers() {
    const ids = new Set(save.vil.map((v: Villager) => v.id));
    walkers = walkers.filter(w => ids.has(w.id));
    for (const v of save.vil) if (!walkers.some(w => w.id === v.id)) walkers.push({ id: v.id, x: SQUARE.x + (Math.random() - .5) * 80, y: SQUARE.y + (Math.random() - .5) * 40, tx: SQUARE.x, ty: SQUARE.y, st: 'idle', node: -1, t: 0, carry: null, face: 1, wait: Math.random() * 3 });
  }
  function sendTo(i: number) {
    const N = NODE_INFO[NODES[i].kind], st = nodeState(i);
    if (st.left <= 0) { sfx('nope'); toast(N.name + ' crescendo de novo: volta em ' + Math.ceil((save.nodes[i].at - now()) / 1000) + 's.'); return; }
    syncWalkers();
    if (walkers.some(w => w.node === i)) { toast('Já tem um morador trabalhando aí.'); return; }
    if ((save.res[N.res] || 0) >= cap(N.res)) { sfx('nope'); toast('O depósito de ' + RES_INFO[N.res].name.toLowerCase() + ' está cheio!'); return; }
    let best: Walker | null = null, bd = 1e9;
    for (const w of walkers) { const v = save.vil.find((x: Villager) => x.id === w.id); if (!v || !freeVil(v) || w.st !== 'idle') continue; const d = Math.hypot(w.x - NODES[i].x, w.y - NODES[i].y); if (d < bd) { bd = d; best = w; } }
    if (!best) { sfx('nope'); toast(save.vil.some(freeVil) ? 'Todos estão trabalhando. Espere alguém voltar.' : 'Os moradores estão descansando da expedição.'); return; }
    best.st = 'go'; best.node = i; best.carry = null; save.tut.chop = true;
    const v = save.vil.find((x: Villager) => x.id === best!.id)!;
    sfx('select'); floatW(best.x, best.y - 30, v.name + ': vou!', '#ffffff'); emit();
  }
  const depot = (): [number, number] => { let d: [number, number] = [SQUARE.x, SQUARE.y + 10]; save.plots.forEach((p: Plot, i: number) => { if (p.b === 'armazem') d = [PLOTS[i].x, PLOTS[i].y + 26]; }); return d; };
  const spot = (): [number, number] => { const open = PLOTS.filter((_, i) => save.plots[i].open); const p = open[Math.floor(Math.random() * open.length)] || SQUARE; return Math.random() < .5 ? [SQUARE.x + (Math.random() - .5) * 90, SQUARE.y + (Math.random() - .5) * 50] : [p.x + (Math.random() - .5) * 40, p.y + 26]; };
  function walkTick(dt: number) {
    syncWalkers();
    for (const w of walkers) {
      const v = save.vil.find((x: Villager) => x.id === w.id); if (!v) continue;
      if (!freeVil(v)) { w.st = 'idle'; w.node = -1; w.carry = null; continue; }
      const N = w.node >= 0 ? NODE_INFO[NODES[w.node].kind] : null;
      if (w.st === 'go' && w.node >= 0) { const n = NODES[w.node]; w.tx = n.x + (w.x < n.x ? -22 : 22); w.ty = n.y + 6; }
      if (w.st === 'back') { const [dx, dy] = depot(); w.tx = dx; w.ty = dy; }
      if (w.st === 'work') {
        w.t -= dt;
        if (w.t <= 0 && N) {
          const st = nodeState(w.node), left = st.left - 1;
          save.nodes[w.node] = { left, at: left <= 0 ? now() + N.regrow * 1000 : 0 };
          if (left <= 0) sfx('break', .6);
          w.carry = N.res; w.st = 'back';
        }
        continue;
      }
      const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
      if (d > 2) { const sp = (w.st === 'idle' ? 28 : 105) * dt; const m = Math.min(d, sp); w.x += dx / d * m; w.y += dy / d * m; if (Math.abs(dx) > 1) w.face = dx > 0 ? 1 : -1; continue; }
      if (w.st === 'go' && N) { w.st = 'work'; w.t = N.work * (1 - Math.min(.4, (v.lvl - 1) * .08)); w.face = NODES[w.node].x > w.x ? 1 : -1; continue; }
      if (w.st === 'back' && N && w.carry) {
        const r = w.carry as Res, n = N.per + (v.lvl - 1) * 2, room = Math.max(0, cap(r) - (save.res[r] || 0)), take = Math.min(room, n);
        if (take > 0) { save.res[r] = (save.res[r] || 0) + take; floatW(w.x, w.y - 34, '+' + take, RES_INFO[r].col); sfx('collect', .6); }
        w.carry = null;
        const again = nodeState(w.node).left > 0 && (save.res[r] || 0) < cap(r);
        if (take < n) toast('O depósito de ' + RES_INFO[r].name.toLowerCase() + ' encheu!');
        if (again) w.st = 'go'; else { w.st = 'idle'; w.node = -1; }
        emit(); continue;
      }
      /* à toa: passeia pela vila */
      w.wait -= dt; if (w.wait <= 0) { const [x, y] = spot(); w.tx = x; w.ty = y; w.wait = 2 + Math.random() * 5; }
    }
  }
  /* bichos passeando no cercado */
  function roamTick(dt: number) {
    if (roam.length !== save.pets.length) roam = save.pets.map((p: Pet, i: number) => { const a = i / save.pets.length * 6.28 + Math.random() * .5, rr = .35 + (i % 2) * .3; return { uid: p.uid, x: PEN.x + Math.cos(a) * PEN.rx * rr, y: PEN.y + Math.sin(a) * PEN.ry * rr, tx: PEN.x, ty: PEN.y, face: 1, wait: Math.random() * 3 }; });
    for (const r of roam) {
      const p = save.pets.find((x: Pet) => x.uid === r.uid); if (!p) continue;
      if (p.rest > now()) continue;
      if (r.wait > 0) { r.wait -= dt; continue; }
      const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy);
      if (d < 3) { let bx = PEN.x, by = PEN.y, bd = -1; for (let n = 0; n < 6; n++) { const a = Math.random() * 6.28, rr = .2 + Math.random() * .58, cx = PEN.x + Math.cos(a) * PEN.rx * rr, cy = PEN.y + Math.sin(a) * PEN.ry * rr; let m = 1e9; for (const o of roam) if (o !== r) m = Math.min(m, Math.hypot(o.x - cx, (o.y - cy) * 1.4)); if (m > bd) { bd = m; bx = cx; by = cy; } } r.tx = bx; r.ty = by; r.wait = 1 + Math.random() * 4; continue; }
      const sp = 22 * dt; r.x += dx / d * sp; r.y += dy / d * sp; r.face = dx >= 0 ? 1 : -1;
    }
  }

  /* ---------- laço ---------- */
  let last = pf.now(), simAcc = 0;
  function tick(nowp: number) {
    const dt = Math.min(.1, Math.max(0, (nowp - last) / 1000)); last = nowp; clock += dt;
    try {
      simAcc += dt;
      if (simAcc >= 1) { simulate(simAcc); simAcc = 0; if (Math.floor(clock) % 5 === 0) persist(); emit(); }
      walkTick(dt); roamTick(dt);
      if (camGo && !ptrs.size) { const f = Math.min(1, dt * 4.5); cam.x += (camGo.x - cam.x) * f; cam.y += (camGo.y - cam.y) * f; if (camGo.z) cam.z += (camGo.z - cam.z) * f; if (Math.hypot(camGo.x - cam.x, camGo.y - cam.y) < 2) camGo = null; }
      if (!ptrs.size && (vel.x || vel.y)) { cam.x -= vel.x * dt / kS(); cam.y -= vel.y * dt / kS(); const f = Math.exp(-dt * 4); vel.x *= f; vel.y *= f; if (Math.hypot(vel.x, vel.y) < 8) vel = { x: 0, y: 0 }; }
      bannerT = Math.max(0, bannerT - dt);
      for (const f of floats) { f.t -= dt; f.y -= 22 * dt; } floats = floats.filter(f => f.t > 0);
      pf.audio.music(ui.show.exped ? 'travel' : 'city');
    } catch (e) { console.error(e); }
  }

  /* ---------- desenho ---------- */
  const ROLE_TOOL: { [k in Res]?: string } = { madeira: 'machado', pedra: 'picareta', comida: 'mao' };
  function draw(g: Ctx2D) {
    try {
      view();
      g.setTransform(1, 0, 0, 1, 0, 0);
      drawTiles(g);
      const S = kS() * DPR;
      g.setTransform(S, 0, 0, S, W * DPR / 2 - cam.x * S, H * DPR / 2 - cam.y * S);
      const [vx0, vy0] = toWorld(-120, -160), [vx1, vy1] = toWorld(W + 120, H + 160);
      const vis = (x: number, y: number) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
      /* trilhas entre as regiões conhecidas */
      g.setLineDash?.([18, 14]); g.lineCap = 'round';
      for (const [a, b] of ROUTES) {
        const sa = reachable(a), sb = reachable(b); if (!sa || !sb) continue;
        let A = REGION_POS[a], B = REGION_POS[b]; const ex = save.explored.includes(a) && save.explored.includes(b);
        const edge = (V: typeof A, O: typeof A) => { const d = Math.hypot(O.x - V.x, O.y - V.y) || 1; return { x: V.x + (O.x - V.x) / d * 620, y: V.y + (O.y - V.y) / d * 400, r: 0 }; };
        if (a === 0) A = edge(A, B); if (b === 0) B = edge(B, A);
        g.strokeStyle = ex ? 'rgba(110,70,35,.75)' : 'rgba(110,70,35,.4)'; g.lineWidth = 7;
        g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo((A.x + B.x) / 2 + 40, (A.y + B.y) / 2 - 40, B.x, B.y); g.stroke();
      }
      g.setLineDash?.([]);
      if (vis(REGION_POS[8].x, REGION_POS[8].y)) mist(g, clock);
      const items: { y: number; f: () => void }[] = [];
      /* terrenos */
      save.plots.forEach((p: Plot, i: number) => {
        const x = PLOTS[i].x, y = PLOTS[i].y;
        if (!vis(x, y)) return;
        if (!p.open) { items.push({ y, f: () => blockedPlot(g, x, y, 1.15, PLOTS[i].block || 'arvores', i * 31) }); return; }
        if (p.b) {
          const crop = p.b === 'fazenda' ? cropGrow(i) : 0;
          const ready = p.b === 'fazenda' ? (crop >= 1 ? 1 : 0) : Object.values(p.stock).some(v => (v as number) >= 1) ? 1 : 0;
          const pop = born[i] != null ? Math.min(1, (clock - born[i]) * 3) : 1;
          items.push({ y: y + 20, f: () => { g.save(); g.translate(x, y + 20); g.scale(.6 + .4 * pop, .6 + .4 * pop); g.translate(-x, -(y + 20)); building(g, p.b!, x, y + 20, 1.3, p.lvl, clock + i, ready, crop); if (p.b === 'fazenda' && !p.crop) { const b = Math.sin(clock * 4) * 3; text(g, 'PLANTAR', x - 10, y - 26 + b, 15, '#ffffff', 4); } g.restore(); } });
        } else if (moving < 0) items.push({ y: y - 100, f: () => { g.globalAlpha = .75; text(g, '+', x, y + 10, 30, '#fff', 3); g.globalAlpha = 1; } });
        if (i === moving || (i === sel && ui.show.build)) items.push({ y: 9999, f: () => { g.lineWidth = 3; g.strokeStyle = i === moving ? '#3c8cf0' : '#fff'; g.beginPath(); g.ellipse(x, y + 12, 60, 34, 0, 0, 7); g.stroke(); } });
      });
      /* coleta */
      NODES.forEach((n, i) => {
        if (!vis(n.x, n.y)) return;
        const st = nodeState(i), N = NODE_INFO[n.kind], worker = walkers.find(w => w.node === i && w.st === 'work');
        items.push({ y: n.y, f: () => {
          resNode(g, n.kind, n.x, n.y, st.left, N.uses, st.regrow, i * 17 + 5, clock, worker ? 1 : 0);
          if (worker) { const v = save.vil.find((x: Villager) => x.id === worker.id), tot = N.work * (1 - Math.min(.4, ((v ? v.lvl : 1) - 1) * .08)), f = 1 - worker.t / tot; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(n.x, n.y - 70, 11, 0, TAU); g.stroke(); g.strokeStyle = '#ffe040'; g.beginPath(); g.arc(n.x, n.y - 70, 11, -Math.PI / 2, -Math.PI / 2 + f * TAU); g.stroke(); }
          else if (st.left > 0 && !save.tut.chop && n.kind === 'arvore' && i < 3) { const b = Math.abs(Math.sin(clock * 4)) * 8; text(g, '👆', n.x + 4, n.y - 70 - b, 26, '#fff'); }
        } });
      });
      const sx = SQUARE.x, sy = SQUARE.y;
      items.push({ y: sy, f: () => bonfire(g, sx, sy, 1, clock) });
      /* cercado e bichos */
      const px = PEN.x, py = PEN.y;
      items.push({ y: py - PEN.ry, f: () => fence(g, px, py, PEN.rx, PEN.ry, 1, false) });
      items.push({ y: py + PEN.ry, f: () => fence(g, px, py, PEN.rx, PEN.ry, 1, true) });
      for (const r of roam) {
        const p = save.pets.find((x: Pet) => x.uid === r.uid); if (!p) continue;
        const resting = p.rest > now();
        items.push({ y: r.y, f: () => { drawBeast(g, { ...BEAST[p.id] }, r.x, r.y, 54, clock + r.uid, stageOf(p.lvl), r.face, !resting && r.wait <= 0); if (resting) text(g, 'z', r.x + 20, r.y - 46 + Math.sin(clock * 2) * 3, 12, '#fff', 3); } });
      }
      /* moradores */
      for (const w of walkers) {
        const v = save.vil.find((x: Villager) => x.id === w.id); if (!v || !freeVil(v) || !vis(w.x, w.y)) continue;
        const col = ROLES[v.role].col, skin = ['#f8d4b0', '#e8b088', '#c08860', '#8c5c3c'][v.seed % 4];
        const N = w.node >= 0 ? NODE_INFO[NODES[w.node].kind] : null;
        const moving = w.st !== 'work' && Math.hypot(w.tx - w.x, w.ty - w.y) > 2;
        items.push({ y: w.y, f: () => walker(g, w.x, w.y, 1.9, col, skin, clock + v.seed, moving, w.face, { carry: w.carry || undefined, tool: w.st === 'work' || w.st === 'go' ? (N ? ROLE_TOOL[N.res] : undefined) : undefined, working: w.st === 'work', seed: v.seed }) });
      }
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.f();
      /* regiões: tempestade, neblina no desconhecido, contorno da escolhida */
      if (vis(REGION_POS[7].x, REGION_POS[7].y)) storm(g, clock);
      for (let r = 1; r < REGIONS.length; r++) { const R = REGION_POS[r]; if (!reachable(r) && R.x + R.r > vx0 && R.x - R.r < vx1 && R.y + R.r > vy0 && R.y - R.r < vy1) fog(g, r, clock); }
      if (ui.show.region && regionSel > 0) { const R = REGION_POS[regionSel]; g.setLineDash?.([20, 14]); g.lineWidth = 6; g.strokeStyle = `rgba(255,255,255,${.6 + Math.sin(clock * 4) * .3})`; g.beginPath(); g.ellipse(R.x, R.y, R.r * .95, R.r * .8, 0, 0, TAU); g.stroke(); g.setLineDash?.([]); }
      /* por cima, na tela: vida, placas das regiões, números, avisos */
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      ambience(g, W, H, P, kS(), clock, new Date().getHours(), P(sx, sy));
      for (let r = 1; r < REGIONS.length; r++) {
        const R = REGION_POS[r], [x, y] = P(R.x, R.y - R.r * .1); if (x < -100 || x > W + 100 || y < -40 || y > H + 40) continue;
        const seen = reachable(r), ex = save.explored.includes(r), miss = seen && !ex ? missing(r) : [];
        const name = seen ? REGIONS[r].name : '???', col = ex ? '#3c8c2c' : !seen ? '#8c96a4' : miss.length ? '#e05a4c' : '#f0a020';
        g.font = '15px "Lilita One","Arial Black",sans-serif'; const tw = g.measureText(name).width;
        box(g, x - tw / 2 - 26, y - 14, tw + 40, 28, 14, 'rgba(46,36,24,.82)'); circ(g, x - tw / 2 - 12, y, 11, col, 2);
        text(g, ex ? '★' : !seen ? '?' : miss.length ? '✖' : '!', x - tw / 2 - 12, y + 1, 14, '#fff'); text(g, name, x + 7, y + 1, 15, '#fff');
      }
      for (const f of floats) { const [x, y] = P(f.x, f.y); g.globalAlpha = Math.min(1, f.t * 2); text(g, f.s, x, y, 18, f.c, 4); } g.globalAlpha = 1;
      if (bannerT > 0) { g.globalAlpha = Math.min(1, bannerT * 2); text(g, bannerS, W / 2 + LEFT_W / 2, TOP_H + 40, Math.min(30, W / 26), '#ffe070', 7); g.globalAlpha = 1; }
    } catch (e) { console.error(e); }
  }

  /* ---------- toques: arrastar, pinça e tocar ---------- */
  const ptrs = new Map<number | string, { x: number; y: number; sx: number; sy: number; t0: number; moved: boolean }>();
  let pinch: { d0: number; z0: number; wx: number; wy: number } | null = null, pinchUsed = false, lastMove = 0;
  const blocked = () => !ui.show.city || ui.show.daily || ui.show.away;
  function ptrDown(ev: PtrEv): boolean {
    if (blocked()) return false;
    view();
    ptrs.set(ev.id, { x: ev.x, y: ev.y, sx: ev.x, sy: ev.y, t0: now(), moved: false });
    vel = { x: 0, y: 0 }; camGo = null;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, [wx, wy] = toWorld(mx, my); pinch = { d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), z0: cam.z, wx, wy }; pinchUsed = true; }
    return true;
  }
  function ptrMove(ev: PtrEv) {
    const p = ptrs.get(ev.id); if (!p) return;
    const dx = ev.x - p.x, dy = ev.y - p.y, t = now(), dt = Math.max(1, t - lastMove) / 1000; lastMove = t;
    p.x = ev.x; p.y = ev.y;
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()]; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(a.x - b.x, a.y - b.y);
      cam.z = clamp(pinch.z0 * d / pinch.d0, zMin(), ZMAX);
      cam.x = pinch.wx - (mx - W / 2) / kS(); cam.y = pinch.wy - (my - H / 2) / kS(); clampCam(); return;
    }
    if (!p.moved && Math.hypot(ev.x - p.sx, ev.y - p.sy) > 9) p.moved = true;
    if (p.moved) { cam.x -= dx / kS(); cam.y -= dy / kS(); clampCam(); vel = { x: vel.x * .6 + dx / dt * .4, y: vel.y * .6 + dy / dt * .4 }; }
  }
  function ptrUp(ev: PtrEv, cancel?: boolean) {
    const p = ptrs.get(ev.id); if (!p) return; ptrs.delete(ev.id);
    if (ptrs.size < 2) pinch = null;
    if (!cancel && !p.moved && !pinchUsed && !ptrs.size && now() - p.t0 < 700) tap(ev.x, ev.y);
    if (!ptrs.size) { pinchUsed = false; if (now() - lastMove > 80 || !p.moved) vel = { x: 0, y: 0 }; }
  }
  function wheel(dy: number, x: number, y: number) {
    if (blocked()) return; view();
    const [wx, wy] = toWorld(x, y); cam.z = clamp(cam.z * Math.exp(-dy * .0015), zMin(), ZMAX);
    cam.x = wx - (x - W / 2) / kS(); cam.y = wy - (y - H / 2) / kS(); clampCam(); camGo = null;
  }
  function tap(sx: number, sy: number) {
    view();
    const [wx, wy] = toWorld(sx, sy);
    if (moving >= 0) {
      let best = -1, bd = 1e9; for (let i = 0; i < PLOTS.length; i++) { const d = Math.hypot((wx - PLOTS[i].x) / 1.3, wy - (PLOTS[i].y - 6)); if (d < bd) { bd = d; best = i; } }
      if (best >= 0 && bd < 70) tapPlot(best); else { moving = -1; emit(); } return;
    }
    /* árvore / pedra / arbusto */
    let ni = -1, nd = 1e9;
    NODES.forEach((n, i) => { const d = Math.hypot(wx - n.x, (wy - (n.y - 22)) * .9); if (d < nd) { nd = d; ni = i; } });
    let best = -1, bd = 1e9;
    for (let i = 0; i < PLOTS.length; i++) { const d = Math.hypot((wx - PLOTS[i].x) / 1.3, wy - (PLOTS[i].y - 6)); if (d < bd) { bd = d; best = i; } }
    if (ni >= 0 && nd < 40 && nd < bd) { sendTo(ni); return; }
    if (best >= 0 && bd < 62) { tapPlot(best); return; }
    if (Math.hypot((wx - PEN.x) / PEN.rx, (wy - PEN.y) / PEN.ry) < 1.05) { only('beasts'); sfx('select'); return; }
    const r = regionAt(wx, wy);
    if (r > 0) { selectRegion(r); return; }
    if (ui.show.region) { ui.show.region = false; emit(); }
  }
  let regionSel = -1;
  function selectRegion(r: number) { regionSel = r; ui.show.region = true; sfx('select'); emit(); }
  function suggestRegion() {
    for (const r of [1, 2, 4, 8, 3, 5, 6, 7, 9]) if (reachable(r) && !save.explored.includes(r) && !missing(r).length) return r;
    for (const r of [1, 2, 4, 8, 3, 5, 6, 7, 9]) if (reachable(r) && !save.explored.includes(r)) return r;
    return 1;
  }
  function goExped() { const r = suggestRegion(), R = REGION_POS[r]; view(); const z = Math.max(zMin(), Math.min(cam.z, .75)); lookAt(R.x - 60 / (k0 * z), R.y, z); selectRegion(r); }

  /* ---------- informações para as telas ---------- */
  const ri = (k: string, s = 40) => iconImage('res', k, s);
  function resList(bag: Bag, rich = false) { return Object.keys(bag).map(k => ({ k, n: Math.ceil(bag[k as Res]!), name: RES_INFO[k].name, col: RES_INFO[k].col, img: ri(k), ok: rich ? (save.res[k as Res] || 0) >= bag[k as Res]! : true })); }
  const petImg = (p: Pet | { id: string; lvl: number }, s = 96) => iconImage('beast', p.id, s, stageOf(p.lvl), BEAST[p.id]);
  function goal() {
    const ripe = save.plots.some((p: Plot, i: number) => p.b === 'fazenda' && p.crop && cropGrow(i) >= 1);
    if (!save.tut.chop) return 'Toque numa árvore: um morador vai lá cortar e traz a madeira.';
    if (!save.tut.plant) return 'Toque na fazenda para plantar. Quando crescer, toque de novo para colher.';
    if (ripe) return 'A plantação está pronta! Toque na fazenda para colher.';
    if (readyCount() >= 3) return 'Toque em RECOLHER para guardar a produção.';
    if (save.explored.length < 2) return 'Arraste o mapa até uma região (ou toque em EXPEDIÇÃO) e mande uma expedição. Leve o lobo!';
    if (!has('estabulo') && save.pets.length >= pens()) return 'O cercado está cheio: construa um Estábulo para ter mais bichos.';
    for (const r of [5, 6, 7, 8, 9, 3, 4]) {
      if (save.explored.includes(r) || !reachable(r)) continue;
      const miss = missing(r);
      return miss.length ? 'Avistamos ' + REGIONS[r].name + '! Falta: ' + miss.join(' e ') + '.' : 'Dá para explorar ' + REGIONS[r].name + '. Toque nela no mapa!';
    }
    return save.done ? 'Vocês chegaram à Terra dos Gigantes! Continue crescendo a vila e os bichos.' : 'Melhore as construções e os bichos.';
  }
  function cityInfo() {
    const rates = totalRates();
    return {
      res: RES.map(k => ({ k, n: Math.floor(save.res[k] || 0), cap: cap(k), img: ri(k, 36), rate: Math.round((rates[k] || 0) - (k === 'comida' ? eatRate() : k === 'agua' ? drinkRate() : 0)) })).filter(r => r.n > 0 || r.rate !== 0 || ['comida', 'madeira', 'pedra', 'agua'].includes(r.k)),
      ready: readyCount(), goal: goal(), moving: moving >= 0, hungry: hungry(), people: save.vil.length, homes: homes(), pets: save.pets.length, pens: pens(),
      free: save.vil.filter((v: Villager) => v.rest <= now()).length, dailyCan: dailyState().can, sfx: !!save.sfx, mus: !!save.mus, explored: save.explored.length,
    };
  }
  function buildInfo() {
    if (sel < 0) return { mode: 'none' };
    const p = save.plots[sel], PL = PLOTS[sel];
    if (!p.open) return { mode: 'locked', block: PL.block === 'pedras' ? 'Pedras grandes' : 'Árvores', cost: resList(PL.clear || {}, true), ok: canPay(PL.clear || {}) };
    if (p.b) {
      const B = BUILD[p.b], r = rateOf(sel), up = p.lvl < BLVL_MAX ? costOf(upgradeCost(B, p.lvl), true) : null;
      return { mode: 'info', id: B.id, name: B.name, lvl: p.lvl, max: BLVL_MAX, desc: B.desc, img: iconImage('build', B.id, 120, p.lvl), rate: resList(r).map(x => ({ ...x, n: Math.round(x.n) })), next: up ? resList(up, true) : null, nextOk: up ? canPay(up) : false, nextProd: B.prod && p.lvl < BLVL_MAX ? Math.round(BLVL_PROD[p.lvl] / BLVL_PROD[p.lvl - 1] * 100 - 100) : 0, stock: resList(p.stock).filter(x => x.n >= 1).map(x => ({ ...x, n: Math.floor(p.stock[x.k as Res]!) })), crop: B.id === 'fazenda' ? { state: !p.crop ? 'vazio' : cropGrow(sel) >= 1 ? 'pronta' : 'crescendo', left: p.crop ? Math.max(0, Math.ceil(GROW_S[p.lvl - 1] * (1 - cropGrow(sel)))) : 0, yield: HARVEST[p.lvl - 1], time: GROW_S[p.lvl - 1] } : null };
    }
    return {
      mode: 'empty', discount: Math.round(discount() * 100),
      list: known().map(B => ({ id: B.id, name: B.name, desc: B.desc, img: iconImage('build', B.id, 96, 1), cost: resList(costOf(B.cost, true), true), ok: canPay(costOf(B.cost, true)) })),
      locked: BUILDINGS.filter(b => !save.explored.includes(b.from)).map(b => ({ name: b.name, where: REGIONS[b.from].name })),
    };
  }
  function beastsInfo() {
    const st = sumLvl('estabulo'), disc = 1 - Math.min(.4, st * .1);
    return {
      pens: pens(), food: Math.floor(save.res.comida || 0),
      list: save.pets.map((p: Pet) => { const B = BEAST[p.id], s = stageOf(p.lvl); return { uid: p.uid, id: p.id, name: B.name, lvl: p.lvl, max: BEAST_MAX, xp: p.xp, need: beastXP(p.lvl), stage: STAGE_NAMES[s], next: s < 2 ? EVOLVE_AT[s] : 0, traits: B.traits.map(t => TRAIT_NAME[t]), desc: B.desc, bonus: B.bonus.res ? '+' + Math.round(p.lvl * 4) + '% de ' + RES_INFO[B.bonus.res].name.toLowerCase() : '+' + Math.round((B.bonus.exp || 0) * (1 + p.lvl * .1) * 100 + p.lvl * .5) + '% nas expedições', feed: Math.ceil(feedCost(p.lvl) * disc), rest: Math.max(0, Math.ceil((p.rest - now()) / 1000)), img: petImg(p, 110) }; }),
      wild: BEASTS.filter(b => !save.pets.some((p: Pet) => p.id === b.id)).map(b => ({ name: b.name, where: b.where.map(w => save.explored.includes(w) || reachable(w) ? REGIONS[w].name : '???').join(' ou '), traits: b.traits.map(t => TRAIT_NAME[t]), img: iconImage('beast', b.id, 64, 0, b) })),
    };
  }
  function peopleInfo() {
    return {
      homes: homes(), wait: save.wait.length,
      list: save.vil.map((v: Villager) => ({ id: v.id, name: v.name, role: v.role, roleName: ROLES[v.role].name, col: ROLES[v.role].col, lvl: v.lvl, xp: v.xp, need: VXP[v.lvl - 1] || 0, rest: Math.max(0, Math.ceil((v.rest - now()) / 1000)), img: iconImage('role', v.role, 72, v.seed) })),
      roles: Object.keys(ROLES).map(k => ({ k, name: ROLES[k].plural, desc: ROLES[k].desc, col: ROLES[k].col, n: count(k) })),
    };
  }
  function regionInfo() {
    const r = regionSel; if (r < 1) return { id: -1 };
    const R = REGIONS[r], explored = save.explored.includes(r), seen = reachable(r);
    return { id: r, name: seen ? R.name : '???', explored, seen, miss: seen ? missing(r) : [], desc: seen ? R.desc : 'Uma terra que ninguém conhece. Explore as regiões vizinhas para descobrir.', beasts: seen ? BEASTS.filter(b => b.where.includes(r)).map(b => b.name) : [], loot: seen ? resList(R.loot) : [] };
  }
  function expInfo() {
    const R = REGIONS[exp ? exp.region : clamp(target, 0, 9)];
    const base = {
      region: R.name, regionId: R.id, danger: Math.round(R.danger * 100), types: EXPED, loot: resList(R.loot), torre: sumLvl('torre') * 5, need: (R.need || []).map(t => TRAIT_WHO[t]), beastLvl: R.beastLvl || 0, explored: save.explored.includes(R.id),
      wildHere: BEASTS.filter(b => b.where.includes(R.id)).map(b => b.name),
      people: save.vil.map((v: Villager) => ({ id: v.id, name: v.name, roleName: ROLES[v.role].name, col: ROLES[v.role].col, lvl: v.lvl, rest: Math.max(0, Math.ceil((v.rest - now()) / 1000)), img: iconImage('role', v.role, 64, v.seed) })),
      pets: save.pets.map((p: Pet) => ({ uid: p.uid, name: BEAST[p.id].name, lvl: p.lvl, traits: BEAST[p.id].traits.map(t => TRAIT_NAME[t]).join(', '), rest: Math.max(0, Math.ceil((p.rest - now()) / 1000)), img: petImg(p, 64) })),
      supplies: (uids: number[]) => supplies(R.id, uids),
    };
    const sup0 = supplies(R.id, []), sup1 = supplies(R.id, save.pets.filter((p: Pet) => BEAST[p.id].traits.includes('deserto')).map((p: Pet) => p.uid));
    const b2: any = { ...base, supplies: undefined, food: sup0.food, water: sup0.water, waterCamel: sup1.water };
    if (!exp) return { ...b2, stage: 'pick' };
    if (exp.done) return { ...b2, stage: 'done', log: exp.log, reward: { ...exp.reward, loot: resList(exp.reward.loot), person: exp.reward.person ? ROLES[exp.reward.person].name : null, newPet: exp.reward.newPet ? BEAST[exp.reward.newPet].name : null, petImg: exp.reward.newPet ? petImg({ id: exp.reward.newPet, lvl: 1 }, 96) : '' } };
    const ev = exp.evs[exp.i];
    const opt = (o: any) => ({ txt: o.txt, who: o.role ? ROLES[o.role].name : o.trait ? TRAIT_WHO[o.trait] : '', pct: Math.round(chance(o) * 100), has: o.role ? save.vil.some((v: Villager) => exp.team.includes(v.id) && v.role === o.role) : o.trait ? save.pets.some((p: Pet) => exp.pets.includes(p.uid) && BEAST[p.id].traits.includes(o.trait)) : false });
    return { ...b2, stage: 'event', i: exp.i, n: exp.evs.length, txt: ev.txt, fera: ev.tag === 'fera', a: opt(ev.a), b: opt(ev.b), log: exp.log, team: save.vil.filter((v: Villager) => exp.team.includes(v.id)).map((v: Villager) => ({ k: 'v' + v.id, img: iconImage('role', v.role, 56, v.seed) })).concat(save.pets.filter((p: Pet) => exp.pets.includes(p.uid)).map((p: Pet) => ({ k: 'p' + p.uid, img: petImg(p, 56) }))) };
  }
  function dailyInfo() { const d = dailyState(); return { can: d.can, day: d.day, days: DAILY.map((r, i) => ({ i, txt: r.txt, done: i < d.day || (!d.can && i === d.day), today: i === d.day })) }; }
  function awayInfo() { return away ? { mins: away.mins, capped: away.capped, got: resList(away.got) } : { mins: 0, got: [] }; }

  /* ---------- ações das telas ---------- */
  const act = {
    btnSound: (k?: string) => sfx(k === 'back' ? 'back' : 'click'),
    collect: () => collectAll(), build, upgrade, clearPlot, demolish, startMove, feedPet,
    closeBuild: () => { sel = -1; close('build'); },
    open: (k: string) => { if (exp && exp.done) exp = null; only(k); },
    closeScreen: (k: string) => { if (exp && exp.done) exp = null; if (k === 'exped' && exp && !exp.done) return; close(k); },
    pickRegion: (r: number) => { if (!reachable(r)) { toast('Ninguém conhece esse lugar ainda. Explore as regiões vizinhas.'); return; } target = r; exp = null; ui.show.region = false; ui.show.exped = true; ui.show.city = false; sfx('click'); emit(); },
    goExped, plant: () => { if (sel >= 0) plant(sel); }, harvest: () => { if (sel >= 0) harvest(sel); },
    expStart: (type: string, ids: number[], uids: number[]) => expStart(target, type, ids || [], uids || []), expChoose, expEnd: () => { exp = null; close('exped'); },
    claimDaily: () => {
      const d = dailyState(); if (!d.can) return; const r: any = DAILY[d.day];
      if (r.bag) for (const k in r.bag) save.res[k as Res] = Math.min(cap(k as Res) + 50, (save.res[k as Res] || 0) + r.bag[k]);
      if (r.bxp) for (const p of save.pets) petXP(p, r.bxp);
      if (r.beast) { const opts = BEASTS.filter(b => b.where.some(w => save.explored.includes(w))); const b = opts[Math.floor(Math.random() * opts.length)] || BEASTS[1]; if (!tame(b.id)) recruit('explorador'); }
      save.daily = { last: today(), streak: d.streak + 1 }; persist(); sfx('prize'); toast('Dia ' + (d.day + 1) + ': ' + r.txt + '!'); emit();
    },
    openDaily: () => { ui.show.daily = true; emit(); }, closeDaily: () => { ui.show.daily = false; emit(); },
    closeAway: () => { ui.show.away = false; if (dailyState().can) ui.show.daily = true; emit(); },
    toggleSfx: () => { save.sfx = !save.sfx; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    toggleMus: () => { save.mus = !save.mus; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    back, onHide: () => persist(), persist,
  };
  function back(): boolean {
    const S = ui.show;
    if (S.away) { act.closeAway(); return true; }
    if (S.daily) { act.closeDaily(); return true; }
    if (moving >= 0) { moving = -1; emit(); return true; }
    if (S.exped && exp && !exp.done) return true;
    if (S.exped) { exp = null; ui.show.exped = false; ui.show.city = true; ui.show.region = regionSel > 0; emit(); sfx('back'); return true; }
    if (S.region) { ui.show.region = false; emit(); sfx('back'); return true; }
    for (const k of ['build', 'beasts', 'people']) if (S[k]) { if (k === 'build') act.closeBuild(); else act.closeScreen(k); sfx('back'); return true; }
    return false;
  }

  const game = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout, tick, draw,
    input: { keyDown: (_c: string) => false, keyUp: (_c: string) => { }, ptrDown, ptrMove, ptrUp, wheel },
    info: { city: cityInfo, build: buildInfo, beasts: beastsInfo, people: peopleInfo, exped: expInfo, region: regionInfo, daily: dailyInfo, away: awayInfo, isTouch: () => pf.isTouch },
    act,
  };
  (game as any).__dbg = { get save() { return save; }, simulate, tapPlot, get exp() { return exp; }, tame, cam, sendTo, tap, get walkers() { return walkers; }, lookAt };
  return game;
}
