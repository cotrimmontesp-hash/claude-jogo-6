/* Motor da Vila Selvagem: uma vila no chão (terrenos livres, caminhos, praça, cercado),
   construções que sobem até o nível 3, bichos domados nas expedições que comem, sobem
   de nível e evoluem, e um mapa de regiões que só abre com os bichos certos (nadar,
   escalar, voar, aguentar o deserto). A produção continua enquanto você está fora
   (até 12 horas, sem perder nada). As telas em React Native leem `ui`/`info` e chamam `act`. */
import {
  RES, RES_INFO, BASE_CAP, BUILDINGS, BUILD, BLVL_MAX, BLVL_PROD, upgradeCost, PLOTS, SQUARE, PEN,
  BEASTS, BEAST, BEAST_MAX, EVOLVE_AT, STAGE_NAMES, beastXP, feedCost, TRAIT_NAME,
  REGIONS, ROUTES, ROLES, NAMES, VXP, REST_S, EXPED, EVENTS, DAILY, OFFLINE_MAX_H, type Bag, type Res, type Trait,
} from './data';
import { villageGround, blockedPlot, bonfire, fence, building, beast as drawBeast, walker, text, setCanvasMaker, makeCanvas, iconImage } from './draw';
import type { Platform, Ctx2D, Insets, PtrEv, OffCanvas } from './types';

export type Game = ReturnType<typeof createGame>;
export const TOP_H = 50, LEFT_W = 136, BOTTOM_H = 58;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const now = () => Date.now();

interface Plot { b: string | null; lvl: number; stock: Bag; open: boolean }
interface Villager { id: number; name: string; role: string; lvl: number; xp: number; rest: number; seed: number }
interface Pet { uid: number; id: string; lvl: number; xp: number; rest: number }

export function createGame(pf: Platform) {
  setCanvasMaker(pf.createCanvas);
  let W = 800, H = 400, DPR = 1, INS: Insets = { t: 0, r: 0, b: 0, l: 0 };
  let groundKey = '', groundCv: OffCanvas | null = null;
  function setLayout(w: number, h: number, dpr: number, ins: Insets) { W = w; H = h; DPR = dpr; INS = ins || INS; groundKey = ''; emit(); }

  /* ---------- telas ---------- */
  const ui: any = { v: 0, show: { city: true, build: false, beasts: false, people: false, exped: false, map: false, daily: false, away: false }, toast: null as any };
  const subs = new Set<() => void>();
  let emitQ = false;
  function emit() { if (emitQ) return; emitQ = true; Promise.resolve().then(() => { emitQ = false; ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); }); }
  function only(k: string) { for (const s in ui.show) if (s !== 'daily' && s !== 'away') ui.show[s] = false; ui.show[k] = true; emit(); }
  function close(k: string) { ui.show[k] = false; if (!['build', 'beasts', 'people', 'exped', 'map'].some(s => ui.show[s])) ui.show.city = true; emit(); }
  let toastT: any = null, toastN = 0;
  function toast(s: string) { ui.toast = { s, id: ++toastN }; emit(); clearTimeout(toastT); toastT = setTimeout(() => { ui.toast = null; emit(); }, 3200); }
  const sfx = (n: string, v = 1) => pf.audio.play(n, v);

  let walkers: { v: number; from: [number, number]; to: [number, number]; t: number; sp: number }[] = [];
  let roam: { uid: number; x: number; y: number; tx: number; ty: number; face: number; wait: number }[] = [];
  /* ---------- progresso salvo ---------- */
  const fresh = () => ({
    v: 2, res: { comida: 60, madeira: 50, pedra: 30, agua: 40, metal: 0, escamas: 0, cristal: 0 } as Bag,
    plots: PLOTS.map((p, i) => ({ b: null, lvl: 1, stock: {}, open: !p.clear })) as Plot[],
    vil: [] as Villager[], wait: [] as string[], nextId: 1, pets: [] as Pet[],
    explored: [0], t: now(), daily: { last: '', streak: 0 }, sfx: true, mus: true, exps: 0, done: false,
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
    save.vil.push(v); walkers = []; return v;
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
  function readyCount() { let n = 0; for (const p of save.plots) for (const k in p.stock) if (p.stock[k as Res]! >= 1) { n++; break; } return n; }
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
    sel = i; sfx('select'); ui.show.build = true; ui.show.city = false; emit();
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
    for (const n of R.need || []) if (!tr.has(n)) miss.push('um bicho que ' + TRAIT_NAME[n].toLowerCase());
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

  /* ---------- tela da vila ---------- */
  let clock = 0, bannerS = '', bannerT = 0;
  const born: { [i: number]: number } = {};
  let floats: { x: number; y: number; s: string; c: string; t: number }[] = [];
  function banner(s: string) { bannerS = s; bannerT = 2.8; }
  let V = { k: 1, ox: 0, oy: 0 };
  function view() {
    const x0 = LEFT_W + INS.l + 4, x1 = W - INS.r - 4, y0 = TOP_H + INS.t, y1 = H - BOTTOM_H - INS.b + 6;
    /* mostra a parte do mundo onde fica a vila (x 90..940, y 95..565) */
    const k = Math.min((x1 - x0) / 850, (y1 - y0) / 470);
    V = { k, ox: (x0 + x1) / 2 - 515 * k, oy: (y0 + y1) / 2 - 330 * k };
  }
  const P = (x: number, y: number): [number, number] => [V.ox + x * V.k, V.oy + y * V.k];
  function floatAt(i: number, s: string, c: string) { const [x, y] = P(PLOTS[i].x, PLOTS[i].y); floats.push({ x: x + (Math.random() - .5) * 30, y: y - 50 * V.k, s, c, t: 1.4 }); }
  function groundLayer() {
    const key = W + 'x' + H + '@' + DPR + ':' + save.plots.map((p: Plot) => (p.open ? 1 : 0) + (p.b ? 'b' : '')).join('');
    if (key === groundKey && groundCv) return groundCv;
    groundKey = key;
    const c = makeCanvas(Math.round(W * DPR), Math.round(H * DPR)), g = c.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    villageGround(g, W, H, P, V.k, PLOTS.map((pl, i) => ({ x: pl.x, y: pl.y, open: save.plots[i].open, block: pl.block, used: !!save.plots[i].b })), SQUARE, PEN);
    groundCv = c; return c;
  }
  /* moradores andando pelos caminhos */
  const spot = (): [number, number] => { const open = PLOTS.filter((_, i) => save.plots[i].open); const p = open[Math.floor(Math.random() * open.length)] || SQUARE; return [p.x + (Math.random() - .5) * 30, p.y + 18]; };
  function walkTick(dt: number) {
    const busy = (v: Villager) => v.rest > now();
    if (walkers.length !== save.vil.length) walkers = save.vil.map((_: any, i: number) => ({ v: i, from: [SQUARE.x, SQUARE.y] as [number, number], to: spot(), t: Math.random(), sp: .08 + Math.random() * .06 }));
    for (const w of walkers) { const v = save.vil[w.v]; if (!v || busy(v)) continue; w.t += dt * w.sp; if (w.t >= 1.6) { w.from = w.to; w.to = Math.random() < .5 ? [SQUARE.x + (Math.random() - .5) * 60, SQUARE.y + (Math.random() - .5) * 30] : spot(); w.t = 0; } }
  }
  /* bichos passeando no cercado */
  function roamTick(dt: number) {
    if (roam.length !== save.pets.length) roam = save.pets.map((p: Pet) => { const a = Math.random() * 6.28; return { uid: p.uid, x: PEN.x + Math.cos(a) * PEN.rx * .5, y: PEN.y + Math.sin(a) * PEN.ry * .5, tx: PEN.x, ty: PEN.y, face: 1, wait: Math.random() * 3 }; });
    for (const r of roam) {
      const p = save.pets.find((x: Pet) => x.uid === r.uid); if (!p) continue;
      if (p.rest > now()) continue;
      if (r.wait > 0) { r.wait -= dt; continue; }
      const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy);
      if (d < 3) { const a = Math.random() * 6.28, rr = Math.random() * .75; r.tx = PEN.x + Math.cos(a) * PEN.rx * rr; r.ty = PEN.y + Math.sin(a) * PEN.ry * rr; r.wait = 1 + Math.random() * 4; continue; }
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
      bannerT = Math.max(0, bannerT - dt);
      for (const f of floats) { f.t -= dt; f.y -= 22 * dt; } floats = floats.filter(f => f.t > 0);
      pf.audio.music(ui.show.exped || ui.show.map ? 'travel' : 'city');
    } catch (e) { console.error(e); }
  }

  /* ---------- desenho ---------- */
  function draw(g: Ctx2D) {
    try {
      view();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(groundLayer() as any, 0, 0);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      const k = V.k, items: { y: number; f: () => void }[] = [];
      /* terrenos */
      save.plots.forEach((p: Plot, i: number) => {
        const [x, y] = P(PLOTS[i].x, PLOTS[i].y);
        if (!p.open) { items.push({ y, f: () => blockedPlot(g, x, y, k * 1.15, PLOTS[i].block || 'arvores', i * 31) }); return; }
        if (p.b) {
          const ready = Object.values(p.stock).some(v => (v as number) >= 1) ? 1 : 0;
          const pop = born[i] != null ? Math.min(1, (clock - born[i]) * 3) : 1;
          items.push({ y: y + 20 * k, f: () => { g.save(); g.translate(x, y + 20 * k); g.scale(.6 + .4 * pop, .6 + .4 * pop); g.translate(-x, -(y + 20 * k)); building(g, p.b!, x, y + 20 * k, k * 1.3, p.lvl, clock + i, ready); g.restore(); } });
        } else if (moving < 0) items.push({ y: y - 100, f: () => { g.globalAlpha = .75; text(g, '+', x, y + 10 * k, 30 * k, '#fff', 3); g.globalAlpha = 1; } });
        if (i === moving || (i === sel && ui.show.build)) items.push({ y: 9999, f: () => { g.lineWidth = 3; g.strokeStyle = i === moving ? '#3c8cf0' : '#fff'; g.beginPath(); g.ellipse(x, y + 12 * k, 60 * k, 34 * k, 0, 0, 7); g.stroke(); } });
      });
      const [sx, sy] = P(SQUARE.x, SQUARE.y);
      items.push({ y: sy, f: () => bonfire(g, sx, sy, k, clock) });
      /* cercado e bichos */
      const [px, py] = P(PEN.x, PEN.y);
      items.push({ y: py - PEN.ry * k, f: () => fence(g, px, py, PEN.rx * k, PEN.ry * k, k, false) });
      items.push({ y: py + PEN.ry * k, f: () => fence(g, px, py, PEN.rx * k, PEN.ry * k, k, true) });
      for (const r of roam) {
        const p = save.pets.find((x: Pet) => x.uid === r.uid); if (!p) continue;
        const [x, y] = P(r.x, r.y), resting = p.rest > now();
        items.push({ y, f: () => { drawBeast(g, { ...BEAST[p.id] }, x, y, 44 * k, clock + r.uid, stageOf(p.lvl), r.face, !resting && r.wait <= 0); if (resting) text(g, 'z', x + 14 * k, y - 34 * k + Math.sin(clock * 2) * 3, 12 * k, '#fff', 3); } });
      }
      /* moradores */
      for (const w of walkers) {
        const v = save.vil[w.v]; if (!v || v.rest > now()) continue;
        const t = clamp(w.t, 0, 1), x0 = w.from[0], y0 = w.from[1], x1 = w.to[0], y1 = w.to[1];
        const wx = x0 + (x1 - x0) * t, wy = y0 + (y1 - y0) * t, [x, y] = P(wx, wy);
        const col = ROLES[v.role].col, skin = ['#f8d4b0', '#e8b088', '#c08860', '#8c5c3c'][v.seed % 4];
        items.push({ y, f: () => walker(g, x, y, k * 1.7, col, skin, clock + v.seed, w.t < 1, x1 >= x0 ? 1 : -1) });
      }
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.f();
      for (const f of floats) { g.globalAlpha = Math.min(1, f.t * 2); text(g, f.s, f.x, f.y, 18, f.c, 4); } g.globalAlpha = 1;
      if (bannerT > 0) { g.globalAlpha = Math.min(1, bannerT * 2); text(g, bannerS, W / 2 + LEFT_W / 2, TOP_H + 40, Math.min(30, W / 26), '#ffe070', 7); g.globalAlpha = 1; }
    } catch (e) { console.error(e); }
  }

  /* ---------- toques ---------- */
  function ptrDown(ev: PtrEv): boolean {
    if (!ui.show.city || ui.show.daily || ui.show.away) return false;
    view();
    let best = -1, bd = 1e9;
    for (let i = 0; i < PLOTS.length; i++) { const [x, y] = P(PLOTS[i].x, PLOTS[i].y); const d = Math.hypot((ev.x - x) / 1.3, ev.y - (y - 6 * V.k)); if (d < bd) { bd = d; best = i; } }
    const [px, py] = P(PEN.x, PEN.y);
    if (Math.hypot((ev.x - px) / PEN.rx, (ev.y - py) / PEN.ry) < V.k * 1.05 && moving < 0) { only('beasts'); sfx('select'); return false; }
    if (best >= 0 && bd < 62 * V.k) { tapPlot(best); return false; }
    if (moving >= 0) { moving = -1; emit(); }
    return false;
  }

  /* ---------- informações para as telas ---------- */
  const ri = (k: string, s = 40) => iconImage('res', k, s);
  function resList(bag: Bag, rich = false) { return Object.keys(bag).map(k => ({ k, n: Math.ceil(bag[k as Res]!), name: RES_INFO[k].name, col: RES_INFO[k].col, img: ri(k), ok: rich ? (save.res[k as Res] || 0) >= bag[k as Res]! : true })); }
  const petImg = (p: Pet | { id: string; lvl: number }, s = 96) => iconImage('beast', p.id, s, stageOf(p.lvl), BEAST[p.id]);
  function goal() {
    if (readyCount() >= 3) return 'Toque em RECOLHER para guardar a produção.';
    if (save.explored.length < 2) return 'Abra EXPEDIÇÃO e explore uma região vizinha. Leve o lobo junto!';
    if (!has('estabulo') && save.pets.length >= pens()) return 'O cercado está cheio: construa um Estábulo para ter mais bichos.';
    for (const r of [5, 6, 7, 8, 9, 3, 4]) {
      if (save.explored.includes(r) || !reachable(r)) continue;
      const miss = missing(r);
      return miss.length ? 'Avistamos ' + REGIONS[r].name + '! Falta: ' + miss.join(' e ') + '.' : 'Dá para explorar ' + REGIONS[r].name + '. Abra EXPEDIÇÃO!';
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
      return { mode: 'info', id: B.id, name: B.name, lvl: p.lvl, max: BLVL_MAX, desc: B.desc, img: iconImage('build', B.id, 120, p.lvl), rate: resList(r).map(x => ({ ...x, n: Math.round(x.n) })), next: up ? resList(up, true) : null, nextOk: up ? canPay(up) : false, nextProd: B.prod && p.lvl < BLVL_MAX ? Math.round(BLVL_PROD[p.lvl] / BLVL_PROD[p.lvl - 1] * 100 - 100) : 0, stock: resList(p.stock).filter(x => x.n >= 1).map(x => ({ ...x, n: Math.floor(p.stock[x.k as Res]!) })) };
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
  function mapInfo() {
    const nodes = REGIONS.map(R => {
      const explored = save.explored.includes(R.id), seen = reachable(R.id);
      return { id: R.id, name: seen ? R.name : '???', x: R.x, y: R.y, col: R.bg, col2: R.bg2, explored, seen, miss: seen ? missing(R.id) : [], desc: seen ? R.desc : 'Uma terra que ninguém conhece.', beasts: seen ? BEASTS.filter(b => b.where.includes(R.id)).map(b => b.name) : [], loot: seen ? resList(R.loot) : [], home: R.id === 0 };
    });
    return { nodes, lines: ROUTES.map(([a, b]) => ({ a, b, seen: nodes[a].seen && nodes[b].seen })) };
  }
  function expInfo() {
    const R = REGIONS[exp ? exp.region : clamp(target, 0, 9)];
    const base = {
      region: R.name, regionId: R.id, danger: Math.round(R.danger * 100), types: EXPED, loot: resList(R.loot), torre: sumLvl('torre') * 5, need: (R.need || []).map(t => TRAIT_NAME[t]), beastLvl: R.beastLvl || 0, explored: save.explored.includes(R.id),
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
    const opt = (o: any) => ({ txt: o.txt, who: o.role ? ROLES[o.role].name : o.trait ? 'bicho que ' + TRAIT_NAME[o.trait].toLowerCase() : '', pct: Math.round(chance(o) * 100), has: o.role ? save.vil.some((v: Villager) => exp.team.includes(v.id) && v.role === o.role) : o.trait ? save.pets.some((p: Pet) => exp.pets.includes(p.uid) && BEAST[p.id].traits.includes(o.trait)) : false });
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
    pickRegion: (r: number) => { if (!reachable(r)) { toast('Ninguém conhece esse lugar ainda. Explore as regiões vizinhas.'); return; } target = r; exp = null; ui.show.map = false; ui.show.exped = true; ui.show.city = false; sfx('click'); emit(); },
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
    if (S.exped) { exp = null; ui.show.exped = false; ui.show.map = true; emit(); sfx('back'); return true; }
    for (const k of ['build', 'beasts', 'people', 'map']) if (S[k]) { if (k === 'build') act.closeBuild(); else act.closeScreen(k); sfx('back'); return true; }
    return false;
  }

  const game = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout, tick, draw,
    input: { keyDown: (_c: string) => false, keyUp: (_c: string) => { }, ptrDown, ptrMove: (_e: PtrEv) => { }, ptrUp: (_e: PtrEv, _c?: boolean) => { } },
    info: { city: cityInfo, build: buildInfo, beasts: beastsInfo, people: peopleInfo, exped: expInfo, map: mapInfo, daily: dailyInfo, away: awayInfo, isTouch: () => pf.isTouch },
    act,
  };
  (game as any).__dbg = { get save() { return save; }, simulate, tapPlot, get exp() { return exp; }, tame };
  return game;
}
