/* Motor da Colmeia de Guerra: estratégia por turnos num tabuleiro de hexágonos.
   Você monta a colmeia com cartas (custam mel) para proteger a Rainha das vespas.
   Também cuida das recompensas: moedas, experiência, nível, cartas novas, melhorias,
   visuais, prêmio diário (7 dias) e missões do dia. As telas em React Native leem `ui`/`info`. */
import { CARDS, CARD, CARD_MAX, upCost, DECK_COUNT, WASPS, LEVELS, REGIONS, SKINS, DAILY, MISSIONS, MISSION_BONUS_GEMS, xpNeed, type Level } from './data';
import { hexPath, piece, wasp as drawWasp, text, setCanvasMaker, iconImage, sh, INK } from './draw';
import type { Platform, Ctx2D, Insets, PtrEv } from './types';

export type Game = ReturnType<typeof createGame>;

/* largura dos painéis das telas (React Native) dos dois lados do tabuleiro */
export const LEFT_W = 150, RIGHT_W = 232;
const N = 4; /* raio do tabuleiro */
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const key = (q: number, r: number) => q + ',' + r;
const hdist = (q: number, r: number, q2 = 0, r2 = 0) => (Math.abs(q - q2) + Math.abs(r - r2) + Math.abs(q + r - q2 - r2)) / 2;
function rng(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface Cell { q: number; r: number; t: string | null; hp: number; max: number; timer: number; hit: number; born: number }
interface WaspE { uid: number; id: string; q: number; r: number; hp: number; max: number; stuck: number; x: number; y: number; hurt: number; lx: number; ly: number; born: number; sum: number }
interface HandCard { id: string; free?: boolean; uid: number }

export function createGame(pf: Platform) {
  setCanvasMaker(pf.createCanvas);
  const isTouch = pf.isTouch;
  let W = 800, H = 400, DPR = 1, INS: Insets = { t: 0, r: 0, b: 0, l: 0 };
  function setLayout(w: number, h: number, dpr: number, ins: Insets) { W = w; H = h; DPR = dpr; INS = ins || INS; emit(); }

  /* ---------- estado das telas ---------- */
  const ui: any = { v: 0, show: { menu: true, map: false, deck: false, shop: false, missions: false, daily: false, play: false, pause: false, res: false }, toast: null as any };
  const subs = new Set<() => void>();
  let emitQ = false;
  function emit() { if (emitQ) return; emitQ = true; Promise.resolve().then(() => { emitQ = false; ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); }); }
  function only(k: string | null) { const d = ui.show.daily; for (const s in ui.show) ui.show[s] = false; if (k) ui.show[k] = true; if (k === 'menu' && d) ui.show.daily = true; emit(); }
  let toastT: any = null, toastN = 0;
  function toast(s: string) { ui.toast = { s, id: ++toastN }; emit(); clearTimeout(toastT); toastT = setTimeout(() => { ui.toast = null; emit(); }, 2800); }
  const sfx = (n: string, v = 1) => pf.audio.play(n, v);

  /* ---------- progresso salvo ---------- */
  let save: any = { coins: 0, gems: 0, xp: 0, plvl: 1, cards: {}, stars: [], unl: 1, bestWave: 0, skin: 'classica', skins: ['classica'], sfx: true, mus: true, daily: { last: '', streak: 0 }, miss: { day: '', list: [], bonus: false }, games: 0, tut: 0 };
  try { const s = JSON.parse(pf.storage.load() || 'null'); if (s && typeof s === 'object') save = Object.assign(save, s); } catch (e) { }
  for (const c of CARDS) if (!save.cards[c.id]) save.cards[c.id] = 1;
  function persist() { try { pf.storage.save(JSON.stringify(save)); } catch (e) { } }
  pf.audio.setVolumes(save.sfx, save.mus);

  /* ---------- dia de hoje (prêmio diário e missões) ---------- */
  const dstr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => dstr(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dstr(d); };
  function dailyState() {
    const last = save.daily.last, can = last !== today();
    const cont = last === yesterday();
    const streak = can ? (cont ? save.daily.streak | 0 : 0) : (save.daily.streak | 0) - 1;
    const day = ((streak % 7) + 7) % 7; /* 0..6: o dia que vale hoje */
    return { can, day, streak: can ? streak : save.daily.streak | 0 };
  }
  function rollMissions() {
    if (save.miss.day === today()) return;
    let h = 0; for (const ch of today()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const R = rng(h), pool = MISSIONS.map((m, i) => i), list: any[] = [], used = new Set<string>();
    while (list.length < 3 && pool.length) { const j = Math.floor(R() * pool.length); const i = pool.splice(j, 1)[0]; if (used.has(MISSIONS[i].k)) continue; used.add(MISSIONS[i].k); list.push({ i, prog: 0, claimed: false }); }
    save.miss = { day: today(), list, bonus: false }; persist();
  }
  rollMissions();
  function mission(k: string, n: number, max = false) {
    rollMissions();
    let changed = false;
    for (const m of save.miss.list) { const M = MISSIONS[m.i]; if (M.k !== k || m.claimed) continue; const before = m.prog; m.prog = max ? Math.max(m.prog, n) : m.prog + n; if (before < M.n && m.prog >= M.n) { toast('Missão completa: ' + M.txt + '! Pegue o prêmio em Missões.'); changed = true; } }
    if (changed) persist();
  }
  if (dailyState().can) ui.show.daily = true;

  /* ---------- experiência e nível ---------- */
  function addXP(n: number) {
    save.xp += n;
    while (save.xp >= xpNeed(save.plvl)) {
      save.xp -= xpNeed(save.plvl); save.plvl++; save.coins += 50;
      const nc = CARDS.find(c => c.unlock === save.plvl);
      setTimeout(() => { sfx('level'); toast('Nível ' + save.plvl + '! +50 moedas' + (nc ? '. Carta nova: ' + nc.name + '!' : '')); }, 1600);
    }
    persist();
  }
  const unlocked = (id: string) => CARD[id].unlock <= save.plvl;

  /* ---------- partida ---------- */
  type Mode = 'camp' | 'endless' | 'demo';
  let mode: Mode = 'demo', lvlIdx = 0, L: Level = LEVELS[0];
  let cells = new Map<string, Cell>(), wasps: WaspE[] = [], hand: HandCard[] = [], drawPile: string[] = [], discard: string[] = [];
  let honey = 0, turn = 1, maxTurns = 10, queenHp = 12, queenMax = 12, sel = -1, phase: 'player' | 'resolve' | 'over' = 'player';
  let plan: { q: number; r: number; id: string }[] = [], kills = 0, honeyTotal = 0, uid = 1, clock = 0, result: any = null, overT = 0, won = false;
  let floats: { x: number; y: number; s: string; c: string; t: number; k: number }[] = [], shots: { x0: number; y0: number; x1: number; y1: number; t: number; c: string }[] = [], parts: { x: number; y: number; vx: number; vy: number; t: number; c: string; r: number }[] = [];
  let queue: { t: number; f: () => void }[] = [], qT = 0, bannerT = 0, banner = '', recycled = new Set<number>(), hint = '';
  let R: () => number = Math.random;
  const skin = () => SKINS.find(s => s.id === save.skin) || SKINS[0];
  const cardLvl = (id: string) => save.cards[id] | 0 || 1;
  const maxHp = (id: string) => (CARD[id] ? CARD[id].hp : 99) + (cardLvl(id) - 1);

  function newBoard(seed: number, rocks: number) {
    cells = new Map(); R = rng(seed * 7919 + 13);
    for (let q = -N; q <= N; q++) for (let r = -N; r <= N; r++) if (hdist(q, r) <= N) cells.set(key(q, r), { q, r, t: null, hp: 0, max: 0, timer: 0, hit: 0, born: -9 });
    const c0 = cells.get(key(0, 0))!; c0.t = 'rainha';
    /* pedras, sem fechar todos os caminhos */
    const list = [...cells.values()].filter(c => { const d = hdist(c.q, c.r); return d >= 2 && d <= 3; });
    for (let i = 0; i < rocks && list.length; i++) { const c = list.splice(Math.floor(R() * list.length), 1)[0]; c.t = 'pedra'; if (!pathOk()) c.t = null; }
  }
  function pathOk() {
    const f = field(); for (const c of cells.values()) if (hdist(c.q, c.r) === N && c.t !== 'pedra' && f.get(key(c.q, c.r)) === Infinity) return false; return true;
  }
  function buildDeck() {
    const d: string[] = [];
    for (const c of CARDS) if (unlocked(c.id)) for (let i = 0; i < (DECK_COUNT[c.id] || 1); i++) d.push(c.id);
    return shuffle(d);
  }
  function shuffle<T>(a: T[]) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function drawCards() {
    while (hand.length < 4) {
      if (!drawPile.length) { drawPile = shuffle(discard); discard = []; if (!drawPile.length) break; }
      hand.push({ id: drawPile.pop()!, uid: uid++ });
    }
  }
  function startGame(m: Mode, idx: number) {
    mode = m; lvlIdx = idx; L = LEVELS[clamp(idx, 0, LEVELS.length - 1)];
    if (m === 'endless') { newBoard(Math.floor(Math.random() * 1e6), 4); maxTurns = 1e9; honey = 7; }
    else if (m === 'demo') { newBoard(77, 3); maxTurns = 1e9; honey = 0; }
    else { newBoard(L.seed, L.rocks); maxTurns = L.turns; honey = L.honey; }
    queenMax = queenHp = 12 + (save.plvl > 5 ? 2 : 0);
    wasps = []; hand = []; discard = []; drawPile = buildDeck(); sel = -1; turn = 1; kills = 0; honeyTotal = 0; floats = []; shots = []; parts = []; queue = []; qT = 0; overT = 0; won = false; recycled = new Set(); result = null;
    phase = 'player';
    if (m !== 'demo') { drawCards(); planWave(); banner = m === 'endless' ? 'ENXAME SEM FIM' : 'FASE ' + (idx + 1); bannerT = 2; save.games = (save.games | 0) + 1; mission('play', 1); persist(); only('play'); sfx('wave'); updHint(); }
  }
  function startDemo() {
    startGame('demo', 0);
    const put = (q: number, r: number, t: string) => { const c = cells.get(key(q, r)); if (c && !c.t) { c.t = t; c.hp = c.max = maxHp(t); } };
    put(1, 0, 'operaria'); put(0, 1, 'flor'); put(-1, 1, 'operaria'); put(-1, 0, 'guarda'); put(0, -1, 'ferrao'); put(1, -1, 'flor'); put(2, -1, 'operaria'); put(-2, 1, 'cera'); put(1, 1, 'grude');
    for (const [q, r, id] of [[4, -2, 'vespa'], [-3, -1, 'rapida'], [-1, 4, 'bruto']] as [number, number, string][]) addWasp(id, q, r);
  }
  function addWasp(id: string, q: number, r: number) {
    const W0 = WASPS[id], p = hexXY(q, r);
    let hp = W0.hp;
    if (mode === 'endless') hp = Math.round(hp * (1 + turn * .045));
    else if (mode === 'camp') hp = Math.round(hp * (1 + L.region * .12));
    wasps.push({ uid: uid++, id, q, r, hp, max: hp, stuck: 0, x: p.x, y: p.y - 40, hurt: 0, lx: 0, ly: 0, born: clock, sum: 0 });
  }

  /* ---------- tabuleiro na tela ---------- */
  function geo() {
    const x0 = LEFT_W + INS.l + 8, x1 = W - RIGHT_W - INS.r - 8, y0 = 8 + INS.t, y1 = H - 8 - INS.b;
    const menu = mode === 'demo';
    const aw = menu ? W * .5 : x1 - x0, ah = menu ? H * .78 : y1 - y0;
    const s = Math.max(10, Math.min(aw / (Math.sqrt(3) * (2 * N + 1)), ah / (1.5 * 2 * N + 2)));
    const cx = menu ? W * .68 : (x0 + x1) / 2, cy = menu ? H * .55 : (y0 + y1) / 2;
    return { s, cx, cy };
  }
  function hexXY(q: number, r: number) { const G = geo(); return { x: G.cx + G.s * Math.sqrt(3) * (q + r / 2), y: G.cy + G.s * 1.5 * r }; }
  function pick(x: number, y: number) {
    const G = geo(); const px = (x - G.cx) / G.s, py = (y - G.cy) / G.s;
    let q = (Math.sqrt(3) / 3 * px - py / 3), r = 2 / 3 * py; let s = -q - r;
    let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return cells.get(key(rq, rr)) || null;
  }

  /* ---------- caminho das vespas: custo até a Rainha ---------- */
  function field() {
    const dist = new Map<string, number>(); for (const k of cells.keys()) dist.set(k, Infinity);
    dist.set(key(0, 0), 0);
    const open: [number, number, number][] = [[0, 0, 0]];
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][2] < open[bi][2]) bi = i;
      const [q, r, d] = open.splice(bi, 1)[0];
      if (d > (dist.get(key(q, r)) as number)) continue;
      for (const [a, b] of DIRS) {
        const nq = q + a, nr = r + b, c = cells.get(key(nq, nr)); if (!c || c.t === 'pedra') continue;
        const cost = c.t && c.t !== 'rainha' ? 1 + c.hp * 1.6 : 1;
        const nd = d + cost; if (nd < (dist.get(key(nq, nr)) as number)) { dist.set(key(nq, nr), nd); open.push([nq, nr, nd]); }
      }
    }
    return dist;
  }

  /* ---------- jogada do jogador ---------- */
  const adjHive = (c: Cell) => DIRS.some(([a, b]) => { const n = cells.get(key(c.q + a, c.r + b)); return !!(n && n.t && n.t !== 'pedra'); });
  const waspAt = (q: number, r: number) => wasps.find(w => w.q === q && w.r === r);
  function canPlace(c: Cell, id: string) {
    if (CARD[id].spell) return true;
    return !c.t && !waspAt(c.q, c.r) && adjHive(c);
  }
  const costOf = (h: HandCard) => h.free ? 0 : CARD[h.id].cost;
  function tapCell(c: Cell) {
    if (phase !== 'player') return;
    if (sel < 0 || !hand[sel]) {
      if (c.t && c.t !== 'pedra') { const nm = c.t === 'rainha' ? 'Rainha' : CARD[c.t].name; toast(nm + ': ' + (c.t === 'rainha' ? queenHp + '/' + queenMax : c.hp + '/' + c.max) + ' de vida' + (c.t !== 'rainha' ? ' · ' + CARD[c.t].desc : '')); }
      else { const w = waspAt(c.q, c.r); if (w) toast(WASPS[w.id].name + ': ' + w.hp + ' de vida, morde ' + WASPS[w.id].dmg + (WASPS[w.id].spd > 1 ? ', anda 2 casas' : '')); }
      return;
    }
    const h = hand[sel], C = CARD[h.id];
    if (honey < costOf(h)) { sfx('nope'); toast('Falta mel! Essa carta custa ' + costOf(h) + '.'); return; }
    if (!canPlace(c, h.id)) { sfx('nope'); toast(c.t || waspAt(c.q, c.r) ? 'Essa casa está ocupada.' : 'Coloque encostado na colmeia (peças amarelas).'); return; }
    honey -= costOf(h);
    hand.splice(sel, 1); if (!h.free) discard.push(h.id); sel = -1;
    const p = hexXY(c.q, c.r);
    if (C.spell) {
      if (h.id === 'bomba') {
        const dmg = 3 + (cardLvl('bomba') >= 3 ? 1 : 0) + (cardLvl('bomba') >= 5 ? 1 : 0);
        sfx('boom'); burst(p.x, p.y, 26, ['#ffe040', '#f8a020', '#fff']);
        for (const w of wasps.slice()) if (hdist(w.q, w.r, c.q, c.r) <= 1) hurtWasp(w, dmg);
        mission('bomba', 1);
      } else if (h.id === 'geleia') {
        const amt = 3 + cardLvl('geleia') - 1; sfx('heal');
        for (const n of cells.values()) if (n.t && n.t !== 'pedra' && hdist(n.q, n.r, c.q, c.r) <= 1) {
          const pp = hexXY(n.q, n.r);
          if (n.t === 'rainha') { queenHp = Math.min(queenMax, queenHp + amt); } else n.hp = Math.min(n.max, n.hp + amt);
          float(pp.x, pp.y - 10, '+' + amt, '#5cdc5c');
        }
      }
    } else {
      c.t = h.id; c.hp = c.max = maxHp(h.id); c.timer = 0; c.born = clock; sfx('place'); burst(p.x, p.y, 8, ['#fff4c0', '#ffd860']);
      mission(h.id, 1);
      if (save.tut < 2) save.tut = 2;
    }
    updHint(); emit();
  }
  function selCard(i: number) {
    if (phase !== 'player') return;
    if (sel === i) { sel = -1; emit(); return; }
    const h = hand[i]; if (!h) return;
    sel = i; sfx('select');
    if (honey < costOf(h)) toast('Falta mel para ' + CARD[h.id].name + ' (custa ' + costOf(h) + ').');
    updHint(); emit();
  }
  function recycle() {
    if (phase !== 'player' || sel < 0 || !hand[sel]) return;
    const h = hand[sel]; if (recycled.has(turn)) { toast('Você já trocou uma carta neste turno.'); return; }
    hand.splice(sel, 1); if (!h.free) discard.push(h.id); sel = -1; honey += 1; recycled.add(turn); sfx('honey');
    toast('Carta trocada por 1 de mel. A mão enche no próximo turno.'); emit();
  }
  function updHint() {
    if (mode !== 'camp' || lvlIdx > 1) { hint = ''; return; }
    if (sel >= 0) hint = CARD[hand[sel]?.id]?.spell ? 'Toque numa casa do tabuleiro para usar o feitiço.' : 'Toque numa casa clara, encostada na colmeia.';
    else if (turn === 1 && save.tut < 2) hint = 'Toque numa carta aqui do lado para escolher. Comece com Operárias: elas fazem mel!';
    else hint = 'Quando acabar, toque em FIM DO TURNO. As vespas vêm dos pontos vermelhos.';
  }

  /* ---------- fim do turno ---------- */
  function endTurn() {
    if (phase !== 'player') return;
    phase = 'resolve'; sel = -1; hint = ''; emit();
    queue = [];
    const step = (t: number, f: () => void) => queue.push({ t, f });
    step(.05, produce);
    step(.55, defend);
    step(.55, () => moveWasps(0));
    if (wasps.some(w => WASPS[w.id].spd > 1)) step(.45, () => moveWasps(1));
    step(.5, spawn);
    step(.45, nextTurn);
  }
  function produce() {
    let total = 0;
    for (const c of cells.values()) {
      const p = () => hexXY(c.q, c.r);
      if (c.t === 'operaria') {
        let v = 1 + (cardLvl('operaria') >= 4 ? 1 : 0);
        for (const [a, b] of DIRS) { const n = cells.get(key(c.q + a, c.r + b)); if (n && n.t === 'flor') v += cardLvl('flor') >= 5 ? 2 : 1; }
        total += v; const pp = p(); float(pp.x, pp.y - 14, '+' + v, '#ffd820');
      } else if (c.t === 'rainha') { total += 1; const pp = p(); float(pp.x + 14, pp.y - 24, '+1', '#ffd820'); }
      else if (c.t === 'bercario') {
        c.timer++;
        if (c.timer >= (cardLvl('bercario') >= 4 ? 1 : 2) && hand.length < 6) { c.timer = 0; hand.push({ id: 'operaria', free: true, uid: uid++ }); const pp = p(); float(pp.x, pp.y - 14, 'Operária!', '#e0c8ff', .8); }
      }
    }
    honey += total; honeyTotal += total; if (total) { sfx('honey'); mission('honey', total); }
    emit();
  }
  function defend() {
    const any = wasps.length > 0;
    for (const c of cells.values()) {
      if (!wasps.length) break;
      const p = hexXY(c.q, c.r);
      if (c.t === 'guarda' || c.t === 'rainha') {
        const adj = wasps.filter(w => hdist(w.q, w.r, c.q, c.r) === 1).sort((a, b) => a.hp - b.hp);
        if (adj.length) { const w = adj[0]; const dmg = c.t === 'rainha' ? 1 : 2 + (cardLvl('guarda') >= 3 ? 1 : 0) + (cardLvl('guarda') >= 5 ? 1 : 0); const wp = hexXY(w.q, w.r); shots.push({ x0: p.x, y0: p.y, x1: wp.x, y1: wp.y, t: .25, c: '#fff' }); hurtWasp(w, dmg); sfx('sting', .7); }
      } else if (c.t === 'ferrao') {
        let best: WaspE | null = null, bd = 99;
        for (const w of wasps) { const d = hdist(w.q, w.r, c.q, c.r); if (d <= 2 && (d < bd || (d === bd && best && w.hp < best.hp))) { best = w; bd = d; } }
        if (best) { const wp = hexXY(best.q, best.r); shots.push({ x0: p.x, y0: p.y - 10, x1: wp.x, y1: wp.y, t: .3, c: '#ff8040' }); hurtWasp(best, 1 + (cardLvl('ferrao') >= 4 ? 1 : 0)); sfx('shoot', .7); }
      }
    }
    void any;
  }
  function hurtWasp(w: WaspE, d: number) {
    w.hp -= d; w.hurt = .2; const p = hexXY(w.q, w.r); float(p.x, p.y - 18, '-' + d, '#ffffff');
    if (w.hp <= 0) {
      wasps = wasps.filter(x => x !== w); kills++; mission('kills', 1); sfx('kill'); burst(p.x, p.y, 14, [WASPS[w.id].col, '#20202c', '#fff']);
      if (w.id === 'rainha') { banner = 'RAINHA VESPA DERROTADA!'; bannerT = 2.2; }
    }
  }
  function moveWasps(k: number) {
    const F = field();
    const order = wasps.slice().sort((a, b) => (F.get(key(a.q, a.r)) as number) - (F.get(key(b.q, b.r)) as number));
    for (const w of order) {
      if (!wasps.includes(w)) continue;
      const Wd = WASPS[w.id];
      if (k === 0 && w.stuck > 0) { w.stuck--; continue; }
      if (k >= Wd.spd) continue;
      /* rainha vespa chama ajuda */
      if (w.id === 'rainha' && k === 0) { w.sum++; if (w.sum % 2 === 0) { const free = DIRS.map(([a, b]) => cells.get(key(w.q + a, w.r + b))).filter(c => c && !c.t && !waspAt(c.q, c.r)) as Cell[]; if (free.length) { const c = free[Math.floor(Math.random() * free.length)]; addWasp('vespa', c.q, c.r); } } }
      let best: Cell | null = null, bd = F.get(key(w.q, w.r)) as number;
      for (const [a, b] of DIRS) {
        const c = cells.get(key(w.q + a, w.r + b)); if (!c || c.t === 'pedra') continue;
        const d = F.get(key(c.q, c.r)) as number;
        if (c.t === 'rainha') { best = c; bd = -1; break; }
        if (d < bd && !waspAt(c.q, c.r)) { best = c; bd = d; }
      }
      if (!best) continue;
      const wp = hexXY(w.q, w.r), bp = hexXY(best.q, best.r);
      if (best.t) {
        /* morde a peça */
        w.lx = (bp.x - wp.x) * .45; w.ly = (bp.y - wp.y) * .45;
        const dmg = Wd.dmg;
        if (best.t === 'rainha') { queenHp -= dmg; float(bp.x, bp.y - 30, '-' + dmg, '#ff5060', 1.2); sfx('queen'); best.hit = .3; if (queenHp <= 0) { queenHp = 0; lose(); return; } }
        else {
          best.hp -= dmg; best.hit = .3; float(bp.x, bp.y - 16, '-' + dmg, '#ff8080'); sfx('bite', .8);
          if (best.t === 'grude') w.stuck = Math.max(w.stuck, cardLvl('grude') >= 4 ? 2 : 1);
          if (best.t === 'cardo') hurtWasp(w, 2 + (cardLvl('cardo') >= 4 ? 1 : 0));
          if (best.hp <= 0) { burst(bp.x, bp.y, 12, ['#fff4c0', '#c89a3c', INK]); sfx('break'); best.t = null; best.hp = 0; }
        }
      } else { w.q = best.q; w.r = best.r; }
    }
    emit();
  }
  function edgeCells() { return [...cells.values()].filter(c => hdist(c.q, c.r) === N && c.t !== 'pedra'); }
  function planWave() {
    plan = [];
    if (mode === 'camp' && turn > maxTurns) return;
    let n: number;
    let types: [string, number][];
    if (mode === 'endless') { n = Math.floor(.8 + turn * .3 + Math.random() * .99); types = turn < 4 ? [['vespa', 1]] : turn < 8 ? [['vespa', 3], ['rapida', 1]] : [['vespa', 3], ['rapida', 2], ['bruto', 1 + Math.floor(turn / 10)]]; }
    else { n = Math.floor(L.base + L.grow * turn + Math.random() * .99); types = L.types; if (turn === 1) n = Math.min(n, 1); }
    const free = edgeCells().filter(c => !c.t && !waspAt(c.q, c.r));
    const tot = types.reduce((a, t) => a + t[1], 0);
    const bossTurn = (mode === 'camp' && L.boss && turn === maxTurns) || (mode === 'endless' && turn % 10 === 0);
    if (bossTurn && free.length) { const c = free.splice(Math.floor(Math.random() * free.length), 1)[0]; plan.push({ q: c.q, r: c.r, id: 'rainha' }); }
    for (let i = 0; i < n && free.length; i++) {
      let x = Math.random() * tot, id = types[0][0]; for (const [t, w] of types) { x -= w; if (x <= 0) { id = t; break; } }
      const c = free.splice(Math.floor(Math.random() * free.length), 1)[0]; plan.push({ q: c.q, r: c.r, id });
    }
  }
  function spawn() {
    for (const p of plan) { const c = cells.get(key(p.q, p.r)); if (!c || c.t || waspAt(p.q, p.r)) continue; addWasp(p.id, p.q, p.r); }
    if (plan.length) sfx('buzz');
    if (plan.some(p => p.id === 'rainha')) { banner = 'A RAINHA VESPA CHEGOU!'; bannerT = 2.2; sfx('wave'); }
    plan = [];
    emit();
  }
  function nextTurn() {
    if (phase === 'over') return;
    turn++;
    if (mode === 'camp' && turn > maxTurns && !wasps.length) { win(); return; }
    if (mode === 'camp' && turn > maxTurns + 3) {
      /* sobreviveu a todas as ondas: as vespas que sobraram fogem */
      for (const w of wasps) { const p = hexXY(w.q, w.r); burst(p.x, p.y, 6, ['#fff', WASPS[w.id].col]); }
      wasps = []; banner = 'AS VESPAS FUGIRAM!'; bannerT = 2; win(); return;
    }
    if (mode === 'endless') mission('wave', turn, true);
    planWave(); drawCards(); phase = 'player'; sfx('turn');
    if (mode === 'camp' && turn === maxTurns) { banner = 'ÚLTIMA ONDA!'; bannerT = 1.8; }
    else if (mode === 'camp' && turn > maxTurns) { banner = turn === maxTurns + 1 ? 'AGUENTE MAIS 3 TURNOS!' : 'FALTAM ' + (maxTurns + 4 - turn) + ' TURNOS!'; bannerT = 1.6; }
    updHint(); emit();
  }

  /* ---------- fim da partida ---------- */
  function win() {
    phase = 'over'; won = true; overT = 0; sfx('win');
    const pct = queenHp / queenMax, stars = pct >= .8 ? 3 : pct >= .4 ? 2 : 1;
    const prev = save.stars[lvlIdx] | 0, first = prev === 0;
    const coins = 30 + lvlIdx * 8 + stars * 10 + kills, xp = 40 + lvlIdx * 6, gems = first && L.boss ? 3 : 0;
    save.stars[lvlIdx] = Math.max(prev, stars); save.unl = Math.max(save.unl | 0, Math.min(LEVELS.length, lvlIdx + 2));
    save.coins += coins; save.gems += gems; addXP(xp);
    mission('win', 1); if (stars === 3) mission('stars3', 1);
    persist();
    result = { win: true, title: 'VITÓRIA!', sub: L.name, stars, lines: [['Vespas derrotadas', String(kills)], ['Mel juntado', String(honeyTotal)], ['Vida da Rainha', queenHp + ' / ' + queenMax]], coins, xp, gems, next: lvlIdx + 1 < LEVELS.length, mode };
    setTimeout(() => { if (phase === 'over') only('res'); }, 1300);
  }
  function lose() {
    if (phase === 'over') return;
    phase = 'over'; won = false; overT = 0; queue = []; sfx('lose');
    const hp = hexXY(0, 0); burst(hp.x, hp.y, 30, ['#ffd820', INK, '#fff']);
    let coins: number, xp: number, title: string, lines: any[];
    if (mode === 'endless') {
      const wave = turn; coins = wave * 4 + kills; xp = wave * 5; title = 'FIM DO ENXAME';
      const rec = wave > (save.bestWave | 0); save.bestWave = Math.max(save.bestWave | 0, wave);
      lines = [['Você chegou na onda', String(wave)], ['Vespas derrotadas', String(kills)], ['Recorde', save.bestWave + (rec ? '  (novo!)' : '')]];
    } else { coins = kills + 5; xp = 15; title = 'A RAINHA CAIU'; lines = [['Onda', turn + ' / ' + maxTurns], ['Vespas derrotadas', String(kills)]]; }
    save.coins += coins; addXP(xp); persist();
    result = { win: false, title, sub: mode === 'endless' ? 'Enxame sem fim' : L.name, stars: 0, lines, coins, xp, gems: 0, next: false, mode };
    setTimeout(() => { if (phase === 'over') only('res'); }, 1500);
  }

  /* ---------- efeitos ---------- */
  function float(x: number, y: number, s: string, c: string, k = 1) { floats.push({ x, y, s, c, t: 1.1, k }); }
  function burst(x: number, y: number, n: number, cols: string[]) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 120; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: .5 + Math.random() * .4, c: cols[i % cols.length], r: 2 + Math.random() * 3 }); } }

  /* ---------- laço ---------- */
  let last = pf.now();
  function tick(now: number) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    if (ui.show.pause) { pf.audio.music(null); return; }
    clock += dt;
    try {
      if (queue.length && phase !== 'over') { qT += dt; if (qT >= queue[0].t) { qT = 0; const it = queue.shift()!; it.f(); } }
      if (mode === 'demo') demoTick(dt);
      for (const w of wasps) { const p = hexXY(w.q, w.r); w.x += (p.x - w.x) * Math.min(1, dt * 9); w.y += (p.y - w.y) * Math.min(1, dt * 9); w.lx *= Math.pow(.02, dt); w.ly *= Math.pow(.02, dt); w.hurt = Math.max(0, w.hurt - dt); }
      for (const c of cells.values()) c.hit = Math.max(0, c.hit - dt);
      for (const f of floats) { f.t -= dt; f.y -= 26 * dt; } floats = floats.filter(f => f.t > 0);
      for (const s of shots) s.t -= dt; shots = shots.filter(s => s.t > 0);
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.t -= dt; } parts = parts.filter(p => p.t > 0);
      bannerT = Math.max(0, bannerT - dt);
      pf.audio.music(ui.show.play || ui.show.res ? 'play' : 'menu');
    } catch (e) { console.error(e); }
  }
  let demoT = 0;
  function demoTick(dt: number) {
    demoT += dt; if (demoT < 2.2) return; demoT = 0;
    /* fundo do menu: vespas rodeando e os guardas picando */
    if (wasps.length < 3) { const e = edgeCells().filter(c => !waspAt(c.q, c.r)); const c = e[Math.floor(Math.random() * e.length)]; addWasp(['vespa', 'rapida', 'bruto'][Math.floor(Math.random() * 3)], c.q, c.r); }
    const F = field();
    for (const w of wasps) {
      const opts = DIRS.map(([a, b]) => cells.get(key(w.q + a, w.r + b))).filter(c => c && !c.t && !waspAt(c.q, c.r) && hdist(c.q, c.r) >= 2) as Cell[];
      if (opts.length) { opts.sort((a, b) => (F.get(key(a.q, a.r)) as number) - (F.get(key(b.q, b.r)) as number)); const c = Math.random() < .5 ? opts[0] : opts[Math.floor(Math.random() * opts.length)]; w.q = c.q; w.r = c.r; }
    }
    for (const w of wasps.slice()) if (Math.random() < .25) { const p = hexXY(w.q, w.r); burst(p.x, p.y, 10, [WASPS[w.id].col, '#fff']); wasps = wasps.filter(x => x !== w); }
  }

  /* ---------- desenho ---------- */
  function draw(g: Ctx2D) {
    try {
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      const sk = skin(), reg = REGIONS[mode === 'camp' ? L.region : 0];
      const bg = sk.bg[0] ? sk.bg : reg.bg;
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      /* bolinhas de fundo (pólen) */
      g.globalAlpha = .18; g.fillStyle = '#fff';
      for (let i = 0; i < 26; i++) { const x = ((i * 97.3 + clock * (6 + i % 5)) % (W + 40)) - 20, y = (i * 53.7 % H) + Math.sin(clock + i) * 6; g.beginPath(); g.arc(x, y, 2 + (i % 4), 0, 7); g.fill(); }
      g.globalAlpha = 1;
      if (!cells.size) return;
      const G = geo(), s = G.s;
      const sel0 = sel >= 0 && hand[sel] ? hand[sel].id : null, isSpell = sel0 ? !!CARD[sel0].spell : false;
      /* sombra do tabuleiro */
      g.globalAlpha = .18; g.fillStyle = INK; g.beginPath(); g.ellipse(G.cx, G.cy + s * 1.2, s * 8.2, s * 7, 0, 0, 7); g.fill(); g.globalAlpha = 1;
      /* casas */
      for (const c of cells.values()) {
        const p = hexXY(c.q, c.r);
        hexPath(g, p.x, p.y + s * .12, s * .97); g.fillStyle = sh(sk.line, -.25); g.fill();
        hexPath(g, p.x, p.y, s * .97); g.fillStyle = ((c.q - c.r) % 3 === 0) ? sk.hex[1] : sk.hex[0]; g.fill(); g.lineWidth = Math.max(1, s * .07); g.strokeStyle = sk.line; g.stroke();
        if (c.t && c.t !== 'pedra' && c.t !== 'rainha') { hexPath(g, p.x, p.y, s * .82); g.fillStyle = 'rgba(255,190,40,.28)'; g.fill(); }
        if (sel0 && phase === 'player' && (isSpell || canPlace(c, sel0))) { g.globalAlpha = .35 + .2 * Math.sin(clock * 6); hexPath(g, p.x, p.y, s * .85); g.fillStyle = isSpell ? '#ffe9a0' : '#ffffff'; g.fill(); g.globalAlpha = 1; }
      }
      /* onde as vespas vão aparecer */
      for (const p0 of plan) { const p = hexXY(p0.q, p0.r); const k = .8 + .2 * Math.sin(clock * 7); g.beginPath(); g.arc(p.x, p.y, s * .45 * k, 0, 7); g.fillStyle = p0.id === 'rainha' ? 'rgba(200,20,60,.55)' : 'rgba(230,50,40,.4)'; g.fill(); text(g, '!', p.x, p.y + 1, s * .7, '#fff', 3); }
      /* peças */
      for (const c of cells.values()) {
        if (!c.t) continue;
        const p = hexXY(c.q, c.r), pop = Math.min(1, (clock - c.born) * 5), sc = c.t === 'rainha' ? 1 : .6 + .4 * pop + (pop < 1 ? Math.sin(pop * Math.PI) * .15 : 0);
        const jig = c.hit > 0 ? Math.sin(clock * 80) * 2 : 0;
        piece(g, c.t, p.x + jig, p.y, s * sc * (c.t === 'rainha' ? 1.1 : c.t === 'pedra' || c.t === 'cera' ? 1 : 1.22), clock + c.q, sk.queen);
        if (c.t !== 'pedra' && c.t !== 'rainha' && c.hp < c.max) hpBar(g, p.x, p.y + s * .62, s * .9, c.hp / c.max, '#5cdc5c');
      }
      /* rainha: vida */
      const qp = hexXY(0, 0); hpBar(g, qp.x, qp.y + s * .78, s * 1.5, queenHp / queenMax, queenHp / queenMax > .4 ? '#ffd820' : '#ff5060');
      /* vespas */
      for (const w of wasps) {
        const Wd = WASPS[w.id], sz = s * 1.02 * Wd.size, born = Math.min(1, (clock - w.born) * 3);
        g.globalAlpha = born; drawWasp(g, w.x + w.lx, w.y + w.ly - s * .1, sz, clock, w.id, w.hurt, w.stuck); g.globalAlpha = 1;
        hpBar(g, w.x, w.y + s * .55, s * .8, w.hp / w.max, '#ff5050');
      }
      for (const sh0 of shots) { const k = 1 - sh0.t / .3; const x = sh0.x0 + (sh0.x1 - sh0.x0) * k, y = sh0.y0 + (sh0.y1 - sh0.y0) * k; g.beginPath(); g.arc(x, y, Math.max(2, s * .1), 0, 7); g.fillStyle = sh0.c; g.fill(); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke(); }
      for (const p of parts) { g.globalAlpha = Math.min(1, p.t * 2); g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fillStyle = p.c; g.fill(); } g.globalAlpha = 1;
      for (const f of floats) { g.globalAlpha = Math.min(1, f.t * 2); text(g, f.s, f.x, f.y, Math.max(12, s * .6) * f.k, f.c, 4); } g.globalAlpha = 1;
      if (bannerT > 0 && mode !== 'demo') { g.globalAlpha = Math.min(1, bannerT * 2); text(g, banner, G.cx, G.cy - s * 2.2, Math.min(40, s * 1.5), '#fff', 7); g.globalAlpha = 1; }
    } catch (e) { console.error(e); }
  }
  function hpBar(g: Ctx2D, x: number, y: number, w: number, v: number, c: string) {
    const h = Math.max(4, w * .1);
    g.fillStyle = INK; g.fillRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3);
    g.fillStyle = '#5c3c2c'; g.fillRect(x - w / 2, y, w, h);
    g.fillStyle = c; g.fillRect(x - w / 2, y, w * clamp(v, 0, 1), h);
  }

  /* ---------- toques ---------- */
  function ptrDown(ev: PtrEv): boolean {
    if (!ui.show.play || phase === 'over') return false;
    const c = pick(ev.x, ev.y); if (c) tapCell(c);
    return false;
  }

  /* ---------- informações para as telas ---------- */
  const xpInfo = () => ({ lvl: save.plvl, xp: save.xp, need: xpNeed(save.plvl) });
  function menuInfo() {
    const d = dailyState(); rollMissions();
    const mdone = save.miss.list.filter((m: any) => !m.claimed && m.prog >= MISSIONS[m.i].n).length;
    return { coins: save.coins, gems: save.gems, ...xpInfo(), stars: (save.stars as number[]).reduce((a, b) => a + (b | 0), 0), maxStars: LEVELS.length * 3, bestWave: save.bestWave | 0, dailyCan: d.can, missReady: mdone, sfx: !!save.sfx, mus: !!save.mus, queen: iconImage('rainha', 160), nextUnlock: (CARDS.find(c => c.unlock > save.plvl) || null) && { name: CARDS.find(c => c.unlock > save.plvl)!.name, lvl: CARDS.find(c => c.unlock > save.plvl)!.unlock } };
  }
  function playInfo() {
    const nextW: { [k: string]: number } = {}; for (const p of plan) nextW[p.id] = (nextW[p.id] || 0) + 1;
    return {
      honey, turn: Math.min(turn, maxTurns), maxTurns: mode === 'endless' ? 0 : maxTurns, queenHp, queenMax, phase, mode, kills, hint, sel,
      hand: hand.map((h, i) => ({ id: h.id, uid: h.uid, name: CARD[h.id].name, cost: costOf(h), ok: honey >= costOf(h), free: !!h.free, sel: i === sel, spell: !!CARD[h.id].spell, img: iconImage(h.id, 96), lvl: cardLvl(h.id) })),
      selDesc: sel >= 0 && hand[sel] ? CARD[hand[sel].id].desc : '', canRecycle: sel >= 0 && !recycled.has(turn),
      next: Object.keys(nextW).map(id => ({ id, n: nextW[id], name: WASPS[id].name, img: iconImage(id, 64, undefined, 'wasp') })),
      onBoard: wasps.length, pile: drawPile.length,
    };
  }
  function mapInfo() {
    return {
      coins: save.coins, gems: save.gems, ...xpInfo(),
      regions: REGIONS.map((rg, ri) => ({ name: rg.name, col: rg.col, levels: LEVELS.map((l, i) => ({ l, i })).filter(o => o.l.region === ri).map(({ l, i }) => ({ i, name: l.name, turns: l.turns, boss: !!l.boss, stars: save.stars[i] | 0, locked: i >= (save.unl | 0) })) })),
      bestWave: save.bestWave | 0,
    };
  }
  function deckInfo() {
    return {
      coins: save.coins, ...xpInfo(),
      cards: CARDS.map(c => { const lv = cardLvl(c.id); return { id: c.id, name: c.name, cost: c.cost, spell: !!c.spell, desc: c.desc, up: c.up, lvl: lv, max: CARD_MAX, price: lv >= CARD_MAX ? 0 : upCost(c.id, lv), locked: !unlocked(c.id), unlock: c.unlock, img: iconImage(c.id, 96, '#fce6a8'), hp: c.spell ? 0 : c.hp + lv - 1, inDeck: DECK_COUNT[c.id] || 1 }; }),
    };
  }
  function shopInfo() { return { gems: save.gems, coins: save.coins, skins: SKINS.map(s => ({ id: s.id, name: s.name, price: s.price, owned: save.skins.includes(s.id), using: save.skin === s.id, hex: s.hex, bg: s.bg[0] ? s.bg : REGIONS[0].bg, queen: s.queen })) }; }
  function missionsInfo() {
    rollMissions();
    const list = save.miss.list.map((m: any, k: number) => { const M = MISSIONS[m.i]; return { k, txt: M.txt, n: M.n, prog: Math.min(M.n, m.prog), coins: M.coins, done: m.prog >= M.n, claimed: m.claimed }; });
    return { list, allClaimed: list.every((m: any) => m.claimed), bonus: save.miss.bonus, bonusGems: MISSION_BONUS_GEMS, coins: save.coins, gems: save.gems };
  }
  function dailyInfo() { const d = dailyState(); return { can: d.can, day: d.day, streak: d.streak, days: DAILY.map((r, i) => ({ i, txt: r.txt, coins: r.coins, gems: r.gems, done: i < d.day || (!d.can && i === d.day), today: i === d.day })) }; }
  function resInfo() { return result || { title: '', lines: [] }; }

  /* ---------- ações das telas ---------- */
  function btnSound(k?: string) { sfx(k === 'back' ? 'back' : 'click'); }
  function goMenu() { phase = 'over'; queue = []; startDemo(); only('menu'); }
  const act = {
    btnSound,
    openMap: () => only('map'), openDeck: () => only('deck'), openShop: () => only('shop'), openMissions: () => only('missions'), openDaily: () => { ui.show.daily = true; emit(); }, closeDaily: () => { ui.show.daily = false; emit(); },
    playLevel: (i: number) => { i = i | 0; if (i >= (save.unl | 0)) { sfx('nope'); toast('Vença a fase anterior para liberar.'); return; } startGame('camp', i); },
    playEndless: () => startGame('endless', 0),
    selCard, endTurn: () => { if (phase === 'player') { sfx('click'); endTurn(); } }, recycle,
    pause: () => { if (ui.show.play) { ui.show.pause = true; emit(); } }, resume: () => { ui.show.pause = false; emit(); },
    restart: () => { ui.show.pause = false; startGame(mode === 'demo' ? 'camp' : mode, lvlIdx); },
    quit: () => { ui.show.pause = false; goMenu(); },
    resNext: () => { if (mode === 'camp' && lvlIdx + 1 < LEVELS.length && won) startGame('camp', lvlIdx + 1); else goMenu(); },
    resRetry: () => startGame(mode === 'demo' ? 'camp' : mode, lvlIdx),
    resMenu: () => { const m = mode; goMenu(); if (m === 'camp') only('map'); },
    upgrade: (id: string) => {
      const c = CARD[id]; if (!c) return; if (!unlocked(id)) { toast('Libera no nível ' + c.unlock + '.'); return; }
      const lv = cardLvl(id); if (lv >= CARD_MAX) return; const p = upCost(id, lv);
      if (save.coins < p) { sfx('nope'); toast('Faltam ' + (p - save.coins) + ' moedas.'); return; }
      save.coins -= p; save.cards[id] = lv + 1; persist(); sfx('coin'); toast(c.name + ' agora é nível ' + (lv + 1) + '!'); emit();
    },
    buySkin: (id: string) => {
      const s = SKINS.find(x => x.id === id); if (!s) return;
      if (save.skins.includes(id)) { save.skin = id; persist(); sfx('click'); emit(); return; }
      if (save.gems < s.price) { sfx('nope'); toast('Faltam ' + (s.price - save.gems) + ' geleias. Ganhe no prêmio diário e nas missões!'); return; }
      save.gems -= s.price; save.skins.push(id); save.skin = id; persist(); sfx('prize'); toast('Visual ' + s.name + ' liberado!'); emit();
    },
    claimDaily: () => {
      const d = dailyState(); if (!d.can) return;
      const r = DAILY[d.day]; save.coins += r.coins; save.gems += r.gems;
      save.daily = { last: today(), streak: d.streak + 1 }; persist(); sfx('prize');
      toast('Dia ' + (d.day + 1) + ': você ganhou ' + r.txt + '!'); emit();
    },
    claimMission: (k: number) => {
      const m = save.miss.list[k]; if (!m || m.claimed) return; const M = MISSIONS[m.i]; if (m.prog < M.n) return;
      m.claimed = true; save.coins += M.coins; persist(); sfx('coin'); toast('+' + M.coins + ' moedas!'); emit();
    },
    claimBonus: () => { if (save.miss.bonus || !save.miss.list.every((m: any) => m.claimed)) return; save.miss.bonus = true; save.gems += MISSION_BONUS_GEMS; persist(); sfx('prize'); toast('+' + MISSION_BONUS_GEMS + ' geleias por completar todas as missões!'); emit(); },
    toggleSfx: () => { save.sfx = !save.sfx; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    toggleMus: () => { save.mus = !save.mus; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    goMenu, back, onHide: () => { persist(); if (ui.show.play && phase !== 'over') { ui.show.pause = true; emit(); } }, persist,
  };
  function back(): boolean {
    const S = ui.show;
    if (S.daily) { act.closeDaily(); return true; }
    if (S.pause) { act.resume(); return true; }
    if (S.play) { act.pause(); return true; }
    if (S.res) { act.resMenu(); return true; }
    if (S.map || S.deck || S.shop || S.missions) { sfx('back'); only('menu'); return true; }
    return false;
  }

  startDemo();
  const game = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout, tick, draw,
    input: { keyDown: (_c: string) => false, keyUp: (_c: string) => { }, ptrDown, ptrMove: (_e: PtrEv) => { }, ptrUp: (_e: PtrEv, _c?: boolean) => { } },
    info: { menu: menuInfo, play: playInfo, map: mapInfo, deck: deckInfo, shop: shopInfo, missions: missionsInfo, daily: dailyInfo, res: resInfo, isTouch: () => isTouch },
    act,
  };
  (game as any).__dbg = { save, get honey() { return honey; }, set honey(v: number) { honey = v; }, get turn() { return turn; }, get phase() { return phase; }, get wasps() { return wasps; }, get hand() { return hand; }, cells: () => cells, get queenHp() { return queenHp; }, startGame, tapCell: (q: number, r: number) => { const c = cells.get(key(q, r)); if (c) tapCell(c); }, hexXY };
  return game;
}
