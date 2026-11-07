/* Motor do Base Zumbi: você anda com o joystick e segura ATIRAR (a mira vai sozinha no zumbi
   mais perto). Os zumbis vêm em ondas, batem nos muros e tentam derrubar o centro da base.
   Pessoas pedem socorro fora da base: leve-as para dentro e elas viram ajudantes.
   Com as moedas que caem você põe torres tocando no chão, melhora muros e o centro (a base
   cresce e muda) e compra armas. Online: até 4 pessoas na base de quem criou a sala
   (o anfitrião simula tudo; os convidados mandam onde estão e se estão atirando).
   As telas em React Native leem `ui`/`info` e chamam `act`. */
import {
  WORLD, BASE, HQ, BASE_LV, turretSlots, MAX_SLOTS, ALLY_MAX, GUNS, ZOMBIES, WALL_LV, TURRET_LV, UPGRADES, upgPrice, waveSpec, PLAYER_HP, HQ_HP, PLAYER_SP, type ZType,
} from './data';
import { drawGround, setBaseLook, decalDraw, priceTag, soldier, civil, zombie as drawZombie, wallPiece, shelter, turret as drawTurret, coin as drawCoin, boom, text, circ, ell, box, poly, setCanvasMaker, makeCanvas, iconImage, TAU } from './draw';
import { Peer } from '../net/peer';
import type { Platform, Ctx2D, Insets, PtrEv, OffCanvas } from './types';

export type Game = ReturnType<typeof createGame>;
export const TOP_H = 52;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const now = () => Date.now();
const ZIDS = ['comum', 'corredor', 'gordo', 'chefe'];
const PCOLS = ['#6c8c4c', '#4c7cc0', '#c05848', '#d0903c'];

interface Zom { uid: number; T: ZType; x: number; y: number; tx: number; ty: number; hp: number; max: number; sp: number; face: number; hit: number; die: number; cd: number; atk: boolean; t: number }
interface Bul { x: number; y: number; vx: number; vy: number; life: number; dmg: number; pierce: number; hits: number[]; col: string; w: number; own: string }
interface Ply { id: string; name: string; col: string; x: number; y: number; hp: number; max: number; aim: number; cd: number; dead: number; hurt: number; moving: boolean; t: number; flash: number; gun: string; firing: boolean; dmg: number; rate: number; mag: number; nade: number; tx: number; ty: number }
interface Surv { id: number; x: number; y: number; hp: number; mode: 'help' | 'follow'; lead: string; seed: number; t: number }

export function createGame(pf: Platform) {
  setCanvasMaker(pf.createCanvas);
  let W = 800, H = 400, DPR = 1, INS: Insets = { t: 0, r: 0, b: 0, l: 0 };
  const tiles = new Map<string, OffCanvas>();
  function setLayout(w: number, h: number, dpr: number, ins: Insets) { if (Math.abs(dpr - DPR) > .01 || Math.abs(h - H) > 1) tiles.clear(); W = w; H = h; DPR = dpr; INS = ins || INS; emit(); }

  /* ---------- telas ---------- */
  const ui: any = { v: 0, show: { hud: true, shop: false, lost: false, online: false }, toast: null as any };
  const subs = new Set<() => void>();
  let emitQ = false;
  function emit() { if (emitQ) return; emitQ = true; Promise.resolve().then(() => { emitQ = false; ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); }); }
  let toastT: any = null, toastN = 0;
  function toast(s: string) { ui.toast = { s, id: ++toastN }; emit(); clearTimeout(toastT); toastT = setTimeout(() => { ui.toast = null; emit(); }, 3000); }
  const sfxLast: { [k: string]: number } = {};
  const sfx = (n: string, v = 1, gap = 0) => { const t = now(); if (gap && t - (sfxLast[n] || 0) < gap) return; sfxLast[n] = t; pf.audio.play(n, v); };

  /* ---------- progresso salvo ---------- */
  const fresh = () => ({
    v: 1, coins: 0, wave: 1, best: 0, kills: 0, gun: 'pistola', guns: ['pistola'] as string[],
    upg: { dano: 0, cadencia: 0, vida: 0, ima: 0, abrigo: 0, granada: 0 } as { [k: string]: number },
    wallLv: 0, turrets: [0, 0, 0, 0, 0, 0, 0, 0], baseLv: 0, allies: 0, saved: 0, sfx: true, mus: true,
    name: 'Soldado ' + (100 + Math.floor(Math.random() * 900)),
  });
  let save: any = fresh();
  try { const s = JSON.parse(pf.storage.load() || 'null'); if (s && typeof s === 'object' && s.v === 1) { save = Object.assign(fresh(), s); save.upg = Object.assign(fresh().upg, s.upg || {}); while (save.turrets.length < MAX_SLOTS) save.turrets.push(0); } } catch (e) { }
  function persist() { try { pf.storage.save(JSON.stringify(save)); } catch (e) { } }
  pf.audio.setVolumes(save.sfx, save.mus);

  /* ---------- números do jogador local ---------- */
  const gunOf = (id: string) => GUNS.find(g => g.id === id) || GUNS[0];
  const maxHp = () => PLAYER_HP + save.upg.vida * 20;
  const myDmg = () => 1 + save.upg.dano * .15, myRate = () => 1 + save.upg.cadencia * .1, myMag = () => 70 + save.upg.ima * 35;
  const grenR = () => 95 + save.upg.granada * 14, grenDmg = () => 70 + save.upg.granada * 30, grenCd = () => 12 - save.upg.granada * 1.2;

  /* ---------- online ---------- */
  const NET: any = { peer: null, host: false, guest: false, code: '', conns: [] as any[], conn: null, status: '', busy: false, sendT: 0, roster: [] as any[], hostSave: null };
  const ROOMP = 'basezumbi-v1-r-';
  const online = () => NET.host || NET.guest;

  /* ---------- a base (o tamanho depende do nível do centro) ---------- */
  /** estado da base: do jogador, ou do anfitrião quando é convidado */
  const B = { lv: 0, wallLv: 0, turrets: [0, 0, 0, 0, 0, 0, 0, 0] as number[], abrigo: 0 };
  let SEG = 5, bx0 = 0, by0 = 0, bx1 = 0, by1 = 0, SLOTS = turretSlots(0);
  let SEGS: { side: number; xa: number; ya: number; xb: number; yb: number }[] = [];
  let walls: number[] = [];
  let tur = SLOTS.map(() => ({ cd: 0, ang: -Math.PI / 2, flash: 0 }));
  const hqMax = () => HQ_HP + B.abrigo * 150 + BASE_LV[B.lv].hq;
  function applyBase(lv: number) {
    const L = BASE_LV[lv]; B.lv = lv; BASE.half = L.half; HQ.r = 52 + lv * 16; SEG = L.seg;
    bx0 = BASE.x - L.half; by0 = BASE.y - L.half; bx1 = BASE.x + L.half; by1 = BASE.y + L.half;
    SLOTS = turretSlots(lv); tur = SLOTS.map((_, i) => tur[i] || { cd: 0, ang: -Math.PI / 2, flash: 0 });
    const len = L.half * 2 / SEG;
    SEGS = Array.from({ length: 4 * SEG }, (_, i) => {
      const side = Math.floor(i / SEG), k = i % SEG;
      if (side === 0) return { side, xa: bx0 + k * len, ya: by0, xb: bx0 + (k + 1) * len, yb: by0 };
      if (side === 2) return { side, xa: bx0 + k * len, ya: by1, xb: bx0 + (k + 1) * len, yb: by1 };
      if (side === 1) return { side, xa: bx1, ya: by0 + k * len, xb: bx1, yb: by0 + (k + 1) * len };
      return { side, xa: bx0, ya: by0 + k * len, xb: bx0, yb: by0 + (k + 1) * len };
    });
    walls = SEGS.map(() => WALL_LV[B.wallLv].hp);
    setBaseLook(lv); tiles.clear();
  }
  function loadMyBase() { B.wallLv = save.wallLv; B.turrets = save.turrets.slice(); B.abrigo = save.upg.abrigo; applyBase(save.baseLv); }
  loadMyBase();
  let hq = hqMax();

  /* ---------- estado da partida ---------- */
  const mkPly = (id: string, name: string, col: string): Ply => ({ id, name, col, x: HQ.x, y: HQ.y + 110, hp: maxHp(), max: maxHp(), aim: 0, cd: 0, dead: 0, hurt: 0, moving: false, t: 0, flash: 0, gun: save.gun, firing: false, dmg: myDmg(), rate: myRate(), mag: myMag(), nade: 0, tx: HQ.x, ty: HQ.y + 110 });
  const pl = mkPly('h', save.name, PCOLS[0]);
  let others: Ply[] = [];
  const players = () => [pl, ...others];
  let zs: Zom[] = [], buls: Bul[] = [], coins: { x: number; y: number; v: number; t: number; vx: number; vy: number; fly: string }[] = [];
  let booms: { x: number; y: number; t: number; r: number }[] = [], nades: { x: number; y: number; tx: number; ty: number; t: number; own: string }[] = [];
  let floats: { x: number; y: number; s: string; c: string; t: number; sz: number }[] = [];
  let surv: Surv[] = [], survN = 1, allyFx: { cd: number; aim: number; flash: number }[] = [];
  let shots: any[] = [];
  let phase: 'prep' | 'wave' | 'lost' = 'prep', queue: string[] = [], spawnT = 0, spec = waveSpec(save.wave), nadeCd = 0, uidN = 1, midSurv = false;
  let clock = 0, bannerS = '', bannerT = 0, shake = 0;
  let decals: { x: number; y: number; k: string; t: number; r: number; s: number }[] = [];
  const decal = (x: number, y: number, k: string, s = 1) => { decals.push({ x, y, k, t: 0, r: Math.random() * 6.28, s }); if (decals.length > 140) decals.shift(); };
  const waveNo = () => NET.guest ? (NET.hostSave ? NET.hostSave.wave : save.wave) : save.wave;
  function banner(s: string, net = true) { bannerS = s; bannerT = 2.6; if (net && NET.host) hostBroadcast({ t: 'ev', banner: s }); }
  function teamToast(s: string) { toast(s); if (NET.host) hostBroadcast({ t: 'ev', toast: s }); }
  function teamSfx(n: string) { sfx(n); if (NET.host) hostBroadcast({ t: 'ev', sfx: n }); }
  function resetBase() { walls = SEGS.map(() => WALL_LV[B.wallLv].hp); hq = hqMax(); for (const p of players()) { p.hp = p.max; p.dead = 0; } }
  const allyCount = () => Math.min(save.allies, ALLY_MAX[B.lv]);

  function startWave() {
    if (phase !== 'prep') return;
    if (NET.guest) { toast('Quem criou a sala começa a onda.'); return; }
    resetBase(); spec = waveSpec(save.wave); queue = spec.list.slice(); spawnT = 1.5; zs = []; buls = []; nadeCd = Math.min(nadeCd, 2); midSurv = false;
    phase = 'wave'; ui.show.shop = false; teamSfx('wave'); banner('ONDA ' + save.wave + '!');
    const n = (save.wave >= 4 ? 2 : 1); for (let i = 0; i < n; i++) spawnSurvivor();
    emit();
  }
  function spawnSurvivor() {
    if (surv.length >= 3) return;
    for (let k = 0; k < 10; k++) {
      const a = Math.random() * TAU, r = BASE.half + 240 + Math.random() * 220;
      const x = clamp(BASE.x + Math.cos(a) * r * 1.2, 80, WORLD.w - 80), y = clamp(BASE.y + Math.sin(a) * r, 100, WORLD.h - 60);
      if (Math.abs(x - BASE.x) < BASE.half + 80 && Math.abs(y - BASE.y) < BASE.half + 80) continue;
      surv.push({ id: survN++, x, y, hp: 45, mode: 'help', lead: '', seed: Math.floor(Math.random() * 1000), t: 0 });
      teamToast('Alguém está pedindo SOCORRO! Vá buscar e traga para a base.'); return;
    }
  }
  function spawn(id: string) {
    const T = ZOMBIES[id];
    let x = 0, y = 0;
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * TAU, r = BASE.half + 340 + Math.random() * 170;
      x = clamp(BASE.x + Math.cos(a) * r * 1.25, 40, WORLD.w - 40); y = clamp(BASE.y + Math.sin(a) * r, 50, WORLD.h - 30);
      if (players().every(p => Math.hypot(x - p.x, y - p.y) > 360)) break;
    }
    const hp = Math.round(T.hp * spec.hpMul * (1 + others.length * .35));
    zs.push({ uid: uidN++, T, x, y, tx: x, ty: y, hp, max: hp, sp: T.sp * (.9 + Math.random() * .2), face: 1, hit: 0, die: 0, cd: 0, atk: false, t: Math.random() * 10 });
    if (id === 'chefe') { banner('CHEGOU O CHEFÃO!'); teamSfx('boss'); }
  }
  function winWave() {
    for (const c of coins) save.coins += c.v; coins = [];
    save.coins += spec.bonus; save.best = Math.max(save.best, save.wave); save.wave++;
    phase = 'prep'; surv = []; resetBase(); persist();
    if (NET.host) hostBroadcast({ t: 'win', bonus: spec.bonus });
    banner('ONDA VENCIDA!'); toast('Bônus da onda: +' + spec.bonus + ' moedas. Toque no chão para melhorar a base!'); sfx('win'); emit();
  }
  function loseWave() { phase = 'lost'; ui.show.lost = true; ui.show.shop = false; for (const c of coins) save.coins += c.v; coins = []; surv = []; persist(); sfx('lose'); if (NET.host) hostBroadcast({ t: 'lost' }); emit(); }
  function retry() {
    if (NET.guest) { toast('Esperando quem criou a sala…'); return; }
    phase = 'prep'; ui.show.lost = false; zs = []; buls = []; queue = []; nades = []; surv = []; resetBase();
    for (const p of players()) { p.x = HQ.x; p.y = HQ.y + 110; }
    if (NET.host) hostBroadcast({ t: 'retry' }); emit();
  }

  /* ---------- dano ---------- */
  function credit(owner: string, n: number) {
    if (owner === pl.id || !NET.host) { save.coins += n; sfx('coin', .45, 45); return; }
    const c = NET.conns.find((c: any) => c.peer === owner); if (c && c.open) { try { c.send({ t: 'coin', n }); } catch (e) { } }
  }
  function hurtZ(z: Zom, d: number, kx = 0, ky = 0) {
    if (z.die > 0) return;
    z.hp -= d; z.hit = .14; z.x += kx; z.y += ky;
    if (Math.random() < .5) floats.push({ x: z.x + (Math.random() - .5) * 10, y: z.y - 50 * z.T.size, s: String(Math.round(d)), c: '#fff', t: .6, sz: 13 });
    if (z.hp <= 0) {
      z.die = .001; save.kills++; sfx('zdie', .7, 60); decal(z.x, z.y, 'goo', z.T.size);
      const total = Math.round(z.T.coin * (1 + (save.wave - 1) * .04)), n = Math.min(8, Math.max(1, Math.ceil(total / 3)));
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 60 + Math.random() * 90; coins.push({ x: z.x, y: z.y, v: Math.max(1, Math.round(total / n)), t: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6, fly: '' }); }
    } else sfx('hit', .5, 50);
  }
  function hurtPly(p: Ply, d: number) {
    if (p.dead > 0) return;
    p.hp -= d; p.hurt = .3;
    if (p === pl) { shake = Math.max(shake, .25); sfx('hurt', .8, 150); pf.vibrate?.(30); }
    if (p.hp <= 0) { p.hp = 0; p.dead = 4; if (p === pl) { toast('Você caiu! Volta em 4 segundos…'); emit(); } }
  }

  /* ---------- muros: um zumbi de fora querendo entrar ---------- */
  function wallBlock(z: Zom, nx: number, ny: number): number {
    const r = z.T.r * .6;
    const out = z.x < bx0 - r || z.x > bx1 + r || z.y < by0 - r || z.y > by1 + r;
    const inn = nx >= bx0 - r && nx <= bx1 + r && ny >= by0 - r && ny <= by1 + r;
    if (!out || !inn) return -1;
    let side = -1, pos = 0;
    if (z.y < by0 - r) { side = 0; pos = nx; } else if (z.y > by1 + r) { side = 2; pos = nx; } else if (z.x > bx1 + r) { side = 1; pos = ny; } else { side = 3; pos = ny; }
    const L = BASE.half * 2 / SEG, k = clamp(Math.floor((pos - (side % 2 ? by0 : bx0)) / L), 0, SEG - 1);
    const i = side * SEG + k;
    return walls[i] > 0 ? i : -1;
  }
  const inBase = (x: number, y: number, m = 0) => Math.abs(x - BASE.x) < BASE.half - m && Math.abs(y - BASE.y) < BASE.half - m;

  /* ---------- laço ---------- */
  let last = pf.now();
  function tick(nowp: number) {
    const dt = Math.min(.05, Math.max(0, (nowp - last) / 1000)); last = nowp; clock += dt;
    try {
      bannerT = Math.max(0, bannerT - dt); shake = Math.max(0, shake - dt);
      for (const f of floats) { f.t -= dt; f.y -= 30 * dt; } floats = floats.filter(f => f.t > 0);
      for (const b of booms) b.t += dt * 1.8; booms = booms.filter(b => b.t < 1);
      for (const t of tur) t.flash = Math.max(0, t.flash - dt * 8);
      for (const a of allyFx) a.flash = Math.max(0, a.flash - dt * 10);
      for (const p of players()) p.flash = Math.max(0, p.flash - dt * 14);
      for (const d of decals) d.t += dt; decals = decals.filter(d => d.t < (d.k === 'goo' ? 25 : 6));
      pf.audio.music(phase === 'wave' ? 'fight' : 'prep');
      nadeCd = Math.max(0, nadeCd - dt);
      if (NET.guest) { guestTick(dt); bulletTick(dt, false); if (Math.floor(clock * 4) !== Math.floor((clock - dt) * 4)) emit(); return; }
      if (phase === 'lost') { netTick(dt); return; }
      for (const p of players()) playerTick(p, dt);
      if (phase === 'wave') {
        spawnT -= dt;
        if (queue.length && spawnT <= 0) { spawn(queue.shift()!); if (queue.length > 3 && Math.random() < .3 + others.length * .15) spawn(queue.shift()!); spawnT = spec.gap * (.7 + Math.random() * .6); }
        if (!midSurv && queue.length < spec.list.length / 2) { midSurv = true; if (Math.random() < .6) spawnSurvivor(); }
        zombieTick(dt); turretTick(dt); allyTick(dt); survTick(dt);
        if (!queue.length && !zs.length) winWave();
        if (hq <= 0) loseWave();
      }
      bulletTick(dt, true); coinTick(dt); nadeTick(dt); netTick(dt);
      if (Math.floor(clock * 4) !== Math.floor((clock - dt) * 4)) emit();
    } catch (e) { console.error(e); }
  }
  function nearestZ(x: number, y: number, range: number) {
    let best: Zom | null = null, bd = range;
    for (const z of zs) { if (z.die > 0) continue; const d = Math.hypot(z.x - x, z.y - y); if (d < bd) { bd = d; best = z; } }
    return best;
  }
  /** movimento do jogador local (também no convidado) */
  function moveLocal(dt: number) {
    let mx = joy.dx, my = joy.dy;
    if ([...keys].some(k => k !== 'Space' && k !== 'KeyJ')) { mx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0); my = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0); }
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    pl.moving = Math.hypot(mx, my) > .1;
    if (pl.moving) { pl.x = clamp(pl.x + mx * PLAYER_SP * dt, 30, WORLD.w - 30); pl.y = clamp(pl.y + my * PLAYER_SP * dt, 40, WORLD.h - 20); }
    const dx = pl.x - HQ.x, dy = (pl.y - HQ.y) * 1.6, d = Math.hypot(dx, dy), R = HQ.r + 40;
    if (d < R) { pl.x = HQ.x + dx / (d || 1) * R; pl.y = HQ.y + dy / (d || 1) * R / 1.6; }
    const tg = nearestZ(pl.x, pl.y - 20, gunOf(save.gun).range);
    if (tg) pl.aim = Math.atan2(tg.y - 26 * tg.T.size - (pl.y - 30), tg.x - pl.x);
    else if (pl.moving) pl.aim = Math.atan2(my, mx);
    pl.firing = firing || keys.has('Space') || keys.has('KeyJ');
    pl.gun = save.gun; pl.dmg = myDmg(); pl.rate = myRate(); pl.mag = myMag(); pl.max = maxHp(); pl.name = save.name;
  }
  function fireFrom(p: Ply, real: boolean) {
    const G = gunOf(p.gun);
    p.cd = 1 / (G.rate * p.rate); p.flash = 1;
    decal(p.x - Math.cos(p.aim) * 8 + (Math.random() - .5) * 14, p.y + 4 + Math.random() * 6, 'shell');
    for (let i = 0; i < G.pellets; i++) {
      const a = p.aim + (Math.random() - .5) * G.spread * 2, sp = 950;
      const b: Bul = { x: p.x + Math.cos(p.aim) * 34, y: p.y - 30 + Math.sin(p.aim) * 34, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: G.range / sp, dmg: real ? G.dmg * p.dmg : 0, pierce: G.id === 'rifle' ? 5 : 1, hits: [], col: G.id === 'rifle' ? '#9cf0ff' : '#ffe070', w: G.id === 'rifle' ? 5 : 3, own: p.id };
      buls.push(b);
      if (NET.host) shots.push([Math.round(b.x), Math.round(b.y), Math.round(a * 100) / 100, Math.round(G.range), b.col, b.w, p.id]);
    }
    if (p === pl || Math.hypot(p.x - pl.x, p.y - pl.y) < 500) sfx(G.id === 'espingarda' ? 'shotgun' : G.id === 'rifle' ? 'laser' : G.id === 'metralhadora' ? 'mg' : 'shot', p === pl ? .55 : .3, G.id === 'metralhadora' ? 70 : 0);
  }
  function playerTick(p: Ply, dt: number) {
    p.hurt = Math.max(0, p.hurt - dt); p.t += dt;
    if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.dead = 0; p.hp = p.max; if (p === pl) { pl.x = HQ.x; pl.y = HQ.y + 110; sfx('click'); } } return; }
    if (p === pl) moveLocal(dt);
    else { const f = Math.min(1, dt * 10); p.x += (p.tx - p.x) * f; p.y += (p.ty - p.y) * f; }
    p.cd -= dt;
    if (p.firing && p.cd <= 0) fireFrom(p, true);
  }
  function zombieTick(dt: number) {
    const ps = players().filter(p => p.dead <= 0);
    for (const z of zs) {
      z.t += dt; z.hit = Math.max(0, z.hit - dt);
      if (z.die > 0) { z.die += dt * 1.8; continue; }
      z.cd -= dt; z.atk = false;
      /* alvo: jogador ou sobrevivente perto, senão o centro */
      let tgt: any = null, td = 240;
      for (const p of ps) { const d = Math.hypot(p.x - z.x, p.y - z.y); if (d < td) { td = d; tgt = p; } }
      for (const s of surv) { const d = Math.hypot(s.x - z.x, s.y - z.y); if (d < td) { td = d; tgt = s; } }
      const tx = tgt ? tgt.x : HQ.x, ty = tgt ? tgt.y : HQ.y + 20;
      if (tgt && td < 24 + z.T.r) { z.atk = true; if (z.cd <= 0) { z.cd = .9; if ('mode' in tgt) { tgt.hp -= z.T.dmg; } else hurtPly(tgt, z.T.dmg); } continue; }
      if (!tgt && Math.hypot((HQ.x - z.x), (HQ.y + 10 - z.y) * 1.5) < HQ.r + z.T.r + 30) { z.atk = true; if (z.cd <= 0) { z.cd = 1; hq -= z.T.dmg; shake = Math.max(shake, .1); sfx('thud', .5, 120); emit(); } continue; }
      const ddx = tx - z.x, ddy = ty - z.y, d = Math.hypot(ddx, ddy) || 1;
      const nx = z.x + ddx / d * z.sp * dt, ny = z.y + ddy / d * z.sp * dt;
      const wb = wallBlock(z, nx, ny);
      if (wb >= 0) { z.atk = true; if (z.cd <= 0) { z.cd = 1; walls[wb] -= z.T.dmg * (z.T.id === 'gordo' || z.T.id === 'chefe' ? 1.5 : 1); sfx('thud', .4, 120); if (walls[wb] <= 0) { walls[wb] = 0; sfx('break'); teamToast('Um muro caiu! Os zumbis vão entrar por ali.'); } } }
      else { z.x = nx; z.y = ny; }
      if (Math.abs(ddx) > 2) z.face = ddx > 0 ? 1 : -1;
    }
    for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) {
      const a = zs[i], b = zs[j]; if (a.die || b.die) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = (a.T.r + b.T.r) * .8;
      if (d > 0 && d < m) { const p = (m - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
    }
    zs = zs.filter(z => z.die < 1);
  }
  function turretTick(dt: number) {
    SLOTS.forEach((s, i) => {
      const lv = B.turrets[i]; if (!lv) return;
      const T = TURRET_LV[lv], st = tur[i]; st.cd -= dt;
      const tg = nearestZ(s.x, s.y - 26, T.range); if (!tg) return;
      const a = Math.atan2(tg.y - 26 * tg.T.size - (s.y - 26), tg.x - s.x);
      st.ang = a;
      if (st.cd <= 0) { st.cd = 1 / T.rate; st.flash = 1; const sp = 900; buls.push({ x: s.x + Math.cos(a) * 26, y: s.y - 26 + Math.sin(a) * 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: T.range / sp, dmg: T.dmg, pierce: 1, hits: [], col: '#ffb040', w: 3, own: 't' }); sfx('turret', .3, 90); }
    });
  }
  /** onde ficam os ajudantes: em volta, por dentro dos muros */
  function allyPos(i: number, n: number) { const a = i / Math.max(1, n) * TAU + .4, h = BASE.half - 46; return { x: BASE.x + clamp(Math.cos(a) * h * 1.5, -h, h), y: BASE.y + clamp(Math.sin(a) * h * 1.5, -h, h) + 10 }; }
  function allyTick(dt: number) {
    const n = allyCount();
    while (allyFx.length < n) allyFx.push({ cd: Math.random(), aim: 0, flash: 0 });
    for (let i = 0; i < n; i++) {
      const p = allyPos(i, n), a = allyFx[i]; a.cd -= dt;
      const tg = nearestZ(p.x, p.y - 22, 270); if (!tg) continue;
      a.aim = Math.atan2(tg.y - 26 * tg.T.size - (p.y - 22), tg.x - p.x);
      if (a.cd <= 0) { a.cd = .8; a.flash = 1; const sp = 900; buls.push({ x: p.x + Math.cos(a.aim) * 20, y: p.y - 22 + Math.sin(a.aim) * 20, vx: Math.cos(a.aim) * sp, vy: Math.sin(a.aim) * sp, life: 270 / sp, dmg: 7 + B.lv * 2, pierce: 1, hits: [], col: '#ffe070', w: 2.5, own: 'a' }); sfx('shot', .2, 120); }
    }
  }
  function survTick(dt: number) {
    for (const s of surv) {
      s.t += dt;
      if (s.mode === 'help') { const p = players().find(p => p.dead <= 0 && Math.hypot(p.x - s.x, p.y - s.y) < 70); if (p) { s.mode = 'follow'; s.lead = p.id; sfx('select'); if (p === pl) toast('Venha comigo! Leve para dentro da base.'); } }
      else {
        const p = players().find(q => q.id === s.lead && q.dead <= 0) || null;
        if (!p) { s.mode = 'help'; continue; }
        const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy);
        if (d > 46) { const sp = 165 * dt; s.x += dx / d * Math.min(sp, d - 46); s.y += dy / d * Math.min(sp, d - 46); }
        if (inBase(s.x, s.y, 20)) {
          s.hp = -999; save.saved = (save.saved | 0) + 1;
          const room = save.allies < ALLY_MAX[ALLY_MAX.length - 1]; if (room) save.allies++;
          const reward = 30 + save.wave * 5; credit(s.lead, reward);
          floats.push({ x: s.x, y: s.y - 50, s: '+' + reward, c: '#ffd040', t: 1.4, sz: 20 });
          teamSfx('rescue'); teamToast('Resgatado! +' + reward + ' moedas' + (allyCount() < save.allies ? ' (melhore o centro para caber mais ajudantes)' : ' e mais um ajudante na base.'));
          persist();
        }
      }
    }
    for (const s of surv) if (s.hp <= 0 && s.hp > -999) teamToast('Os zumbis pegaram um sobrevivente…');
    surv = surv.filter(s => s.hp > 0);
  }
  function bulletTick(dt: number, real: boolean) {
    for (const b of buls) {
      const steps = 3;
      for (let s = 0; s < steps && b.life > 0; s++) {
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps; b.life -= dt / steps;
        if (!real || !b.dmg) continue;
        for (const z of zs) {
          if (z.die > 0 || b.hits.includes(z.uid)) continue;
          const zy = z.y - 26 * z.T.size;
          if (Math.hypot(z.x - b.x, (zy - b.y) * .75) < z.T.r * 1.3 + 6) { b.hits.push(z.uid); hurtZ(z, b.dmg, b.vx * .004, b.vy * .004); if (b.hits.length >= b.pierce) { b.life = 0; break; } }
        }
      }
    }
    buls = buls.filter(b => b.life > 0);
  }
  function coinTick(dt: number) {
    const ps = players().filter(p => p.dead <= 0);
    for (const c of coins) {
      c.t += dt;
      if (c.t < .5) { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= .92; c.vy *= .92; continue; }
      let p: Ply | null = c.fly ? ps.find(q => q.id === c.fly) || null : null;
      if (!p) { let bd = 1e9; for (const q of ps) { const d = Math.hypot(q.x - c.x, q.y - c.y); if (d < q.mag && d < bd) { bd = d; p = q; } } }
      if (!p) { c.fly = ''; continue; }
      c.fly = p.id; const d = Math.hypot(p.x - c.x, p.y - c.y), sp = 420 * dt;
      c.x += (p.x - c.x) / (d || 1) * Math.min(d, sp); c.y += (p.y - c.y) / (d || 1) * Math.min(d, sp);
      if (d < 18) { credit(p.id, c.v); c.v = 0; }
    }
    coins = coins.filter(c => c.v > 0);
  }
  function grenadeFrom(p: Ply) {
    const tg = nearestZ(p.x, p.y, 380);
    const tx = tg ? tg.x : p.x + Math.cos(p.aim) * 200, ty = tg ? tg.y : p.y + Math.sin(p.aim) * 200;
    nades.push({ x: p.x, y: p.y - 30, tx, ty, t: 0, own: p.id }); sfx('throw');
  }
  function grenade() {
    if (pl.dead > 0 || phase !== 'wave') return;
    if (nadeCd > 0) { sfx('nope'); return; }
    nadeCd = grenCd();
    if (NET.guest) { sendHost({ t: 'nade', r: grenR(), d: grenDmg() }); sfx('throw'); }
    else grenadeFrom(pl);
    emit();
  }
  let nadeR: { [own: string]: [number, number] } = {};
  function nadeTick(dt: number) {
    for (const n of nades) {
      n.t += dt / .6;
      if (n.t >= 1) {
        const [R, D] = n.own === pl.id ? [grenR(), grenDmg()] : (nadeR[n.own] || [95, 70]);
        booms.push({ x: n.tx, y: n.ty, t: 0, r: R }); shake = .4; sfx('boom'); pf.vibrate?.(60);
        if (NET.host) hostBroadcast({ t: 'boom', x: Math.round(n.tx), y: Math.round(n.ty), r: R });
        for (const z of zs) { const d = Math.hypot(z.x - n.tx, (z.y - n.ty) * 1.3); if (d < R) hurtZ(z, D * (1 - d / R * .5), (z.x - n.tx) * .15, (z.y - n.ty) * .15); }
      }
    }
    nades = nades.filter(n => n.t < 1);
  }

  /* ---------- online: anfitrião ---------- */
  function hostBroadcast(o: any) { for (const c of NET.conns) { if (!c.open) continue; try { c.send(o); } catch (e) { } } }
  function sendHost(o: any) { if (NET.conn && NET.conn.open) { try { NET.conn.send(o); } catch (e) { } } }
  function netReset() { try { NET.peer && NET.peer.destroy(); } catch (e) { } Object.assign(NET, { peer: null, host: false, guest: false, code: '', conns: [], conn: null, status: '', busy: false, roster: [], hostSave: null }); others = []; }
  function roster() { NET.roster = players().map(p => ({ id: p.id, name: p.name, col: p.col })); if (NET.host) hostBroadcast({ t: 'roster', list: NET.roster }); emit(); }
  function createRoom() {
    if (NET.busy) return; leaveRoom(true); NET.busy = true; NET.status = 'Criando sala…'; emit();
    const tryCode = (left: number) => {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const p = new Peer(ROOMP + code); NET.peer = p;
      p.on('open', () => { NET.host = true; NET.code = code; NET.busy = false; NET.status = ''; pl.id = 'h'; roster(); sfx('coin'); });
      p.on('error', (e: any) => {
        if (e && e.type === 'unavailable-id' && left > 0) { tryCode(left - 1); return; }
        if (NET.peer !== p) return;
        NET.busy = false; NET.status = 'Sem conexão. Confira a internet e tente de novo.'; emit();
      });
      p.on('connection', (c: any) => {
        c.on('data', (d: any) => hostData(c, d));
        c.on('close', () => { NET.conns = NET.conns.filter((x: any) => x !== c); const o = others.find(q => q.id === c.peer); others = others.filter(q => q.id !== c.peer); if (o) toast(o.name + ' saiu da sala.'); roster(); });
        c.on('open', () => { if (NET.conns.length >= 3) { try { c.send({ t: 'full' }); } catch (e) { } setTimeout(() => c.close(), 300); return; } NET.conns.push(c); });
      });
    };
    tryCode(4);
  }
  function hostData(c: any, d: any) {
    if (!d || typeof d !== 'object') return;
    let o = others.find(q => q.id === c.peer);
    if (d.t === 'hi') {
      if (!o) { o = mkPly(c.peer, String(d.name || 'Soldado').slice(0, 14), PCOLS[Math.min(3, others.length + 1)]); others.push(o); }
      try { c.send({ t: 'you', id: c.peer, col: o.col, code: NET.code }); } catch (e) { }
      toast(o.name + ' entrou na sala!'); sfx('rescue'); roster(); return;
    }
    if (!o) return;
    if (d.t === 'st') {
      o.tx = clamp(+d.x || 0, 0, WORLD.w); o.ty = clamp(+d.y || 0, 0, WORLD.h); o.aim = +d.a || 0; o.firing = !!d.f; o.moving = !!d.m;
      o.gun = GUNS.some(g => g.id === d.g) ? d.g : 'pistola'; o.dmg = clamp(+d.dm || 1, 1, 3); o.rate = clamp(+d.rt || 1, 1, 2); o.mag = clamp(+d.mg || 70, 70, 300);
      const mx = PLAYER_HP + clamp(d.mh | 0, 0, 10) * 20; if (mx !== o.max) { o.hp += mx - o.max; o.max = mx; }
    } else if (d.t === 'nade') { if (o.dead <= 0 && phase === 'wave') { nadeR[o.id] = [clamp(+d.r || 95, 95, 190), clamp(+d.d || 70, 70, 260)]; grenadeFrom(o); } }
    else if (d.t === 'buy') { const ok = applyBuy(d.what, d.i | 0); if (!ok) { try { c.send({ t: 'refund', n: d.price | 0 }); } catch (e) { } } else toast(o.name + ' melhorou a base!'); }
  }
  let snapT = 0;
  function netTick(dt: number) {
    if (!NET.host || !NET.conns.length) { shots = []; return; }
    snapT -= dt; if (snapT > 0) return; snapT = .1;
    const r = (v: number) => Math.round(v);
    hostBroadcast({
      t: 's', ph: phase, w: save.wave, left: queue.length + zs.filter(z => z.die <= 0).length, boss: save.wave % 5 === 0, nx: waveSpec(save.wave).list.length,
      b: [B.lv, B.wallLv, B.abrigo, allyCount()], tu: B.turrets.slice(0, SLOTS.length), ta: tur.map(t => Math.round(t.ang * 100) / 100), wl: walls.map(r), hq: r(hq), hm: hqMax(),
      p: players().map(p => [p.id, r(p.x), r(p.y), Math.round(p.aim * 100) / 100, r(p.hp), p.max, Math.ceil(p.dead), p.moving ? 1 : 0, p.gun, p.col, p.name, p.firing ? 1 : 0]),
      z: zs.map(z => [z.uid, ZIDS.indexOf(z.T.id), r(z.x), r(z.y), r(z.hp), z.max, z.face, Math.round(z.die * 100) / 100, z.atk ? 1 : 0, z.hit > 0 ? 1 : 0]),
      c: coins.map(c => [r(c.x), r(c.y)]), sv: surv.map(s => [s.id, r(s.x), r(s.y), s.mode === 'help' ? 0 : 1, s.seed]), af: allyFx.slice(0, allyCount()).map(a => [Math.round(a.aim * 100) / 100, a.flash > .5 ? 1 : 0]),
      sh: shots,
    });
    shots = [];
  }

  /* ---------- online: convidado ---------- */
  function joinRoom(code: string) {
    code = String(code || '').replace(/\D/g, '').slice(0, 4);
    if (code.length !== 4) { toast('O código da sala tem 4 números.'); return; }
    if (NET.busy) return; leaveRoom(true); NET.busy = true; NET.status = 'Procurando a sala ' + code + '…'; emit();
    const p = new Peer(); NET.peer = p;
    p.on('open', () => {
      const c = p.connect(ROOMP + code); NET.conn = c;
      c.on('open', () => { NET.code = code; try { c.send({ t: 'hi', name: save.name }); } catch (e) { } });
      c.on('data', (d: any) => guestData(d));
      c.on('close', () => { if (NET.conn !== c) return; const was = NET.guest; leaveRoom(true); if (was) toast('A sala foi fechada. Voltando para a sua base.'); else { NET.status = 'Não deu para entrar na sala.'; emit(); } });
    });
    p.on('error', (e: any) => {
      if (NET.peer !== p) return;
      NET.busy = false; NET.status = e && e.type === 'peer-unavailable' ? 'Não achei a sala ' + code + '. Confira o código.' : 'Sem conexão. Confira a internet e tente de novo.';
      try { p.destroy(); } catch (er) { } NET.peer = null; emit();
    });
    setTimeout(() => { if (NET.peer === p && NET.busy) { NET.busy = false; NET.status = 'A sala não respondeu. Confira o código.'; try { p.destroy(); } catch (e) { } NET.peer = null; emit(); } }, 12000);
  }
  const zmap = new Map<number, Zom>();
  function guestData(d: any) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'you') { NET.guest = true; NET.busy = false; NET.status = ''; pl.id = d.id; pl.col = d.col || PCOLS[1]; pl.x = HQ.x + (PCOLS.indexOf(pl.col) - 1.5) * 60; pl.y = HQ.y + 120; zs = []; zmap.clear(); coins = []; surv = []; phase = 'prep'; ui.show.online = false; ui.show.shop = false; toast('Você entrou na sala ' + NET.code + '!'); sfx('rescue'); emit(); }
    else if (d.t === 'full') { leaveRoom(true); NET.status = 'A sala está cheia (4 pessoas).'; emit(); }
    else if (d.t === 'roster') { NET.roster = Array.isArray(d.list) ? d.list.slice(0, 4) : []; emit(); }
    else if (d.t === 's') applySnap(d);
    else if (d.t === 'coin') { save.coins += d.n | 0; sfx('coin', .45, 45); }
    else if (d.t === 'refund') { save.coins += d.n | 0; toast('Não deu para melhorar; as moedas voltaram.'); persist(); emit(); }
    else if (d.t === 'win') { save.coins += d.bonus | 0; persist(); banner('ONDA VENCIDA!', false); toast('Bônus da onda: +' + (d.bonus | 0) + ' moedas!'); sfx('win'); }
    else if (d.t === 'lost') { ui.show.lost = true; sfx('lose'); emit(); }
    else if (d.t === 'retry') { ui.show.lost = false; zs = []; zmap.clear(); pl.x = HQ.x; pl.y = HQ.y + 110; emit(); }
    else if (d.t === 'boom') { booms.push({ x: d.x, y: d.y, t: 0, r: d.r || 100 }); shake = .4; sfx('boom'); }
    else if (d.t === 'ev') { if (d.banner) banner(d.banner, false); if (d.toast) toast(d.toast); if (d.sfx) sfx(d.sfx); }
  }
  function applySnap(d: any) {
    const prev = phase; phase = d.ph; NET.hostSave = { wave: d.w, left: d.left, boss: d.boss, next: d.nx };
    if (prev !== phase && phase === 'wave') ui.show.shop = false;
    if (phase !== 'lost') ui.show.lost = false;
    const [lv, wl, ab, na] = d.b || [0, 0, 0, 0];
    if (lv !== B.lv || wl !== B.wallLv) { B.wallLv = wl; applyBase(lv); }
    B.abrigo = ab; B.turrets = (d.tu || []).concat([0, 0, 0, 0, 0, 0, 0, 0]).slice(0, MAX_SLOTS);
    (d.ta || []).forEach((a: number, i: number) => { if (tur[i]) { if (Math.abs(tur[i].ang - a) > .01 && B.turrets[i]) tur[i].flash = 1; tur[i].ang = a; } });
    if (Array.isArray(d.wl) && d.wl.length === walls.length) walls = d.wl;
    hq = d.hq; NET.hqMax = d.hm;
    /* jogadores */
    const keep: Ply[] = [];
    for (const r of d.p || []) {
      const [id, x, y, a, hp, mx, dead, mv, gun, col, name, fi] = r;
      if (id === pl.id) { pl.hp = hp; pl.max = mx; const wasDead = pl.dead > 0; pl.dead = dead; if (dead > 0 && !wasDead) toast('Você caiu! Volta em 4 segundos…'); if (wasDead && dead <= 0) { pl.x = x; pl.y = y; } continue; }
      let o = others.find(q => q.id === id); if (!o) { o = mkPly(id, name, col); o.x = x; o.y = y; }
      o.tx = x; o.ty = y; o.aim = a; o.hp = hp; o.max = mx; o.dead = dead; o.moving = !!mv; o.gun = gun; o.col = col; o.name = name; o.firing = !!fi;
      keep.push(o);
    }
    others = keep;
    /* zumbis */
    const seen = new Set<number>();
    for (const r of d.z || []) {
      const [uid, ti, x, y, hp, mx, face, die, atk, hit] = r; seen.add(uid);
      let z = zmap.get(uid);
      if (!z) { z = { uid, T: ZOMBIES[ZIDS[ti] || 'comum'], x, y, tx: x, ty: y, hp, max: mx, sp: 0, face, hit: 0, die: 0, cd: 0, atk: false, t: Math.random() * 10 }; zmap.set(uid, z); }
      if (die > 0 && z.die <= 0) { sfx('zdie', .6, 60); decal(z.x, z.y, 'goo', z.T.size); }
      z.tx = x; z.ty = y; z.hp = hp; z.max = mx; z.face = face; z.die = Math.max(z.die, die); z.atk = !!atk; if (hit) z.hit = .14;
    }
    for (const [uid, z] of zmap) if (!seen.has(uid)) { if (z.die <= 0) zmap.delete(uid); else if (z.die >= 1) zmap.delete(uid); }
    zs = [...zmap.values()];
    coins = (d.c || []).map((c: number[]) => ({ x: c[0], y: c[1], v: 1, t: 1, vx: 0, vy: 0, fly: '' }));
    const old = surv; surv = (d.sv || []).map((s: number[]) => { const o = old.find(q => q.id === s[0]); return { id: s[0], x: o ? o.x : s[1], y: o ? o.y : s[2], hp: 1, mode: s[3] ? 'follow' : 'help', lead: '', seed: s[4], t: 0, tx: s[1], ty: s[2] } as any; });
    while (allyFx.length < na) allyFx.push({ cd: 0, aim: 0, flash: 0 }); allyFx.length = na;
    (d.af || []).forEach((a: number[], i: number) => { if (allyFx[i]) { allyFx[i].aim = a[0]; if (a[1]) allyFx[i].flash = 1; } });
    for (const s of d.sh || []) { if (s[6] === pl.id) continue; const sp = 950; buls.push({ x: s[0], y: s[1], vx: Math.cos(s[2]) * sp, vy: Math.sin(s[2]) * sp, life: s[3] / sp, dmg: 0, pierce: 1, hits: [], col: s[4], w: s[5], own: s[6] }); const o = others.find(q => q.id === s[6]); if (o) o.flash = 1; }
  }
  let gsendT = 0;
  function guestTick(dt: number) {
    pl.hurt = Math.max(0, pl.hurt - dt); pl.t += dt;
    if (pl.dead <= 0) {
      moveLocal(dt); pl.cd -= dt;
      if (pl.firing && pl.cd <= 0) fireFrom(pl, false);
    }
    const f = Math.min(1, dt * 12);
    for (const o of others) { o.x += (o.tx - o.x) * f; o.y += (o.ty - o.y) * f; o.t += dt; }
    for (const z of zs) { z.x += (z.tx - z.x) * f; z.y += (z.ty - z.y) * f; z.t += dt; z.hit = Math.max(0, z.hit - dt); if (z.die > 0) z.die = Math.min(1, z.die + dt * 1.8); }
    for (const s of surv as any[]) { s.x += (s.tx - s.x) * f; s.y += (s.ty - s.y) * f; s.t += dt; }
    gsendT -= dt;
    if (gsendT <= 0) { gsendT = .066; sendHost({ t: 'st', x: Math.round(pl.x), y: Math.round(pl.y), a: Math.round(pl.aim * 100) / 100, f: pl.firing && pl.dead <= 0 ? 1 : 0, m: pl.moving ? 1 : 0, g: save.gun, dm: myDmg(), rt: myRate(), mg: myMag(), mh: save.upg.vida }); }
  }
  function leaveRoom(silent = false) {
    const was = online();
    if (NET.guest) { sendHost({ t: 'bye' }); }
    netReset();
    if (was) { zs = []; zmap.clear(); coins = []; surv = []; buls = []; phase = 'prep'; ui.show.lost = false; pl.id = 'h'; pl.col = PCOLS[0]; loadMyBase(); hq = hqMax(); pl.x = HQ.x; pl.y = HQ.y + 110; pl.hp = maxHp(); pl.dead = 0; }
    if (!silent) toast('Você saiu da sala.');
    emit();
  }

  /* ---------- câmera e chão em ladrilhos ---------- */
  const cam = { x: pl.x, y: pl.y - 30 };
  const kS = () => H / (480 + B.lv * 45);
  const P = (x: number, y: number): [number, number] => [W / 2 + (x - cam.x) * kS(), H / 2 + (y - cam.y) * kS()];
  const toWorld = (sx: number, sy: number): [number, number] => [cam.x + (sx - W / 2) / kS(), cam.y + (sy - H / 2) / kS()];
  let tileK = 0;
  function camTick() {
    const hw = W / 2 / kS(), hh = H / 2 / kS();
    cam.x += (pl.x - cam.x) * .12; cam.y += (pl.y - 30 - cam.y) * .12;
    cam.x = hw * 2 >= WORLD.w ? WORLD.w / 2 : clamp(cam.x, hw, WORLD.w - hw); cam.y = hh * 2 >= WORLD.h ? WORLD.h / 2 : clamp(cam.y, hh, WORLD.h - hh);
  }
  const TPX = 512;
  function drawTiles(g: Ctx2D) {
    const ts = kS() * Math.min(DPR, 2.2), TW = TPX / ts, S = kS() * DPR;
    if (Math.abs(ts - tileK) > .001) { tiles.clear(); tileK = ts; }
    const [ax, ay] = toWorld(0, 0), [bxx, byy] = toWorld(W, H);
    let made = 0;
    g.fillStyle = '#5c7c3c'; g.fillRect(0, 0, W * DPR, H * DPR);
    for (let tx = Math.floor(ax / TW); tx * TW < bxx; tx++) for (let ty = Math.floor(ay / TW); ty * TW < byy; ty++) {
      const key = tx + ':' + ty; let c = tiles.get(key);
      if (!c && (made < 4 || tiles.size < 12)) {
        c = makeCanvas(TPX, TPX); const t = c.getContext('2d'); t.setTransform(ts, 0, 0, ts, -tx * TW * ts, -ty * TW * ts);
        drawGround(t, tx * TW, ty * TW, (tx + 1) * TW, (ty + 1) * TW); tiles.set(key, c); made++;
        if (tiles.size > 60) tiles.delete(tiles.keys().next().value as string);
      }
      if (!c) continue;
      const sx = W * DPR / 2 + (tx * TW - cam.x) * S, sy = H * DPR / 2 + (ty * TW - cam.y) * S;
      g.drawImage(c as any, Math.floor(sx), Math.floor(sy), Math.ceil(TW * S) + 1, Math.ceil(TW * S) + 1);
    }
  }

  /* ---------- desenho ---------- */
  const hqMaxNow = () => NET.guest && NET.hqMax ? NET.hqMax : hqMax();
  function draw(g: Ctx2D) {
    try {
      camTick();
      const sk = shake > 0 ? (Math.random() - .5) * shake * 14 : 0, sk2 = shake > 0 ? (Math.random() - .5) * shake * 14 : 0;
      g.setTransform(1, 0, 0, 1, 0, 0);
      drawTiles(g);
      const S = kS() * DPR;
      g.setTransform(S, 0, 0, S, W * DPR / 2 - cam.x * S + sk * DPR, H * DPR / 2 - cam.y * S + sk2 * DPR);
      const [vx0, vy0] = toWorld(-80, -120), [vx1, vy1] = toWorld(W + 80, H + 140);
      const vis = (x: number, y: number) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
      for (const d of decals) if (vis(d.x, d.y)) decalDraw(g, d.k, d.x, d.y, d.r, d.s, d.t);
      for (const c of coins) if (vis(c.x, c.y)) drawCoin(g, c.x, c.y, clock + c.x * .01, 1.2);
      const items: { y: number; f: () => void }[] = [];
      SEGS.forEach((s, i) => {
        const my = (s.ya + s.yb) / 2; if (!vis((s.xa + s.xb) / 2, my)) return;
        const f = (walls[i] || 0) / WALL_LV[B.wallLv].hp;
        if (s.side % 2) { const n = 4; for (let k = 0; k < n; k++) { const ya = s.ya + (s.yb - s.ya) * k / n, yb = s.ya + (s.yb - s.ya) * (k + 1) / n; items.push({ y: yb, f: () => wallPiece(g, s.xa, ya, s.xb, yb, B.wallLv, f, i * 10 + k) }); } }
        else items.push({ y: my, f: () => wallPiece(g, s.xa, s.ya, s.xb, s.yb, B.wallLv, f, i) });
      });
      items.push({ y: HQ.y, f: () => shelter(g, HQ.x, HQ.y, clock, hq / hqMaxNow(), B.abrigo + 1, B.lv) });
      SLOTS.forEach((s, i) => { items.push({ y: s.y, f: () => drawTurret(g, s.x, s.y, B.turrets[i], tur[i].ang, clock, tur[i].flash) }); });
      const na = NET.guest ? allyFx.length : allyCount();
      for (let i = 0; i < na; i++) { const p = allyPos(i, na), a = allyFx[i] || { aim: 0, flash: 0 }; items.push({ y: p.y, f: () => civil(g, p.x, p.y, 1.2, clock + i, i * 37 + 3, 'ally', a.aim, a.flash) }); }
      for (const s of surv) if (vis(s.x, s.y)) items.push({ y: s.y, f: () => {
        civil(g, s.x, s.y, 1.25, clock + s.id, s.seed, s.mode === 'help' ? 'help' : 'follow', 0, 0);
        if (s.mode === 'help') { const b = Math.sin(clock * 6) * 2; box(g, s.x - 42, s.y - 82 + b, 84, 22, 10, '#fff', 2); poly(g, [s.x - 6, s.y - 61 + b, s.x + 6, s.y - 61 + b, s.x, s.y - 54 + b], '#fff'); text(g, 'SOCORRO!', s.x, s.y - 70 + b, 15, '#e03030'); }
      } });
      for (const z of zs) if (vis(z.x, z.y)) items.push({ y: z.y, f: () => {
        drawZombie(g, z.T, z.x, z.y, z.T.size * 1.3, z.t, z.face, z.hit / .14, z.die, z.atk);
        if (z.hp < z.max && z.die <= 0) { const w = 30 * z.T.size, yy = z.y - 64 * z.T.size; box(g, z.x - w / 2 - 1, yy - 1, w + 2, 6, 2, '#1c1c1c'); box(g, z.x - w / 2, yy, w * Math.max(0, z.hp / z.max), 4, 1.5, z.T.id === 'chefe' ? '#e040e0' : '#e04040'); }
      } });
      for (const p of players()) {
        if (p.dead <= 0) items.push({ y: p.y, f: () => {
          const G = gunOf(p.gun); soldier(g, p.x, p.y, 1.35, p.aim, p.t + (p === pl ? 0 : 3), p.moving, p.hurt / .3, G.id, G.col, p.flash, p.col);
          if (online()) { text(g, p.name, p.x, p.y - 78, 12, p === pl ? '#ffe070' : '#fff', 3); if (p !== pl) { box(g, p.x - 16, p.y - 70, 32, 5, 2, '#1c1c1c'); box(g, p.x - 15, p.y - 69, 30 * Math.max(0, p.hp / p.max), 3, 1.5, '#4cd060'); } }
        } });
        else items.push({ y: p.y, f: () => { g.globalAlpha = .5; ell(g, p.x, p.y, 14, 5, 'rgba(0,0,0,.4)'); text(g, '✚', p.x, p.y - 20, 22, '#ff5050', 3); g.globalAlpha = 1; } });
      }
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.f();
      /* plaquinhas de preço: tocar no chão compra ou melhora */
      if (pl.dead <= 0 && phase !== 'lost') {
        SLOTS.forEach((s, i) => { const lv = B.turrets[i]; if (lv < TURRET_LV.length - 1) priceTag(g, s.x, s.y + 30, TURRET_LV[lv].price, save.coins >= TURRET_LV[lv].price, lv ? '⬆' : '', clock + i); });
        if (B.wallLv + 1 < WALL_LV.length) priceTag(g, BASE.x + 80, by1 + 26, WALL_LV[B.wallLv + 1].price, save.coins >= WALL_LV[B.wallLv + 1].price, '⬆ MURO', clock);
        if (B.lv + 1 < BASE_LV.length) { const pr = BASE_LV[B.lv + 1].price; priceTag(g, HQ.x, HQ.y + 40, pr, save.coins >= pr, '⬆ CENTRO', clock + 2); }
      }
      { const f = Math.max(0, hq / hqMaxNow()), w = 120, yy = HQ.y - 150 - B.lv * 16; box(g, HQ.x - w / 2 - 2, yy, w + 4, 11, 4, '#1c1c1c'); box(g, HQ.x - w / 2, yy + 2, w * f, 7, 3, f > .5 ? '#4cd060' : f > .25 ? '#f0b030' : '#e04040'); }
      g.lineCap = 'round';
      for (const b of buls) { g.strokeStyle = b.col; g.lineWidth = b.w; g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x - b.vx * .022, b.y - b.vy * .022); g.stroke(); }
      for (const n of nades) { const x = n.x + (n.tx - n.x) * n.t, y = n.y + (n.ty - n.y) * n.t - Math.sin(n.t * Math.PI) * 90; circ(g, x, y, 6, '#4c6c34', 1.5); }
      for (const b of booms) boom(g, b.x, b.y, b.t, b.r);
      for (const f of floats) { g.globalAlpha = Math.min(1, f.t * 3); text(g, f.s, f.x, f.y, f.sz, f.c, 3); } g.globalAlpha = 1;
      /* na tela: noite, setas para quem pede socorro, joystick, avisos */
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (phase !== 'prep' && g.createRadialGradient) { const [px, py] = P(pl.x, pl.y - 20); const gr = g.createRadialGradient(px, py, H * .25, px, py, Math.max(W, H) * .8); gr.addColorStop(0, 'rgba(10,20,50,.08)'); gr.addColorStop(1, 'rgba(10,20,50,.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      for (const s of surv) {
        if (s.mode !== 'help') continue;
        const [sx, sy] = P(s.x, s.y - 30); if (sx > 20 && sx < W - 20 && sy > TOP_H && sy < H - 20) continue;
        const a = Math.atan2(sy - H / 2, sx - W / 2), m = 40, ex = clamp(W / 2 + Math.cos(a) * W, m, W - m), ey = clamp(H / 2 + Math.sin(a) * H, TOP_H + m, H - m), pu = 1 + Math.sin(clock * 8) * .12;
        g.save(); g.translate(ex, ey); g.scale(pu, pu); circ(g, 0, 0, 22, '#e03030', 3); g.rotate(a); poly(g, [26, 0, 12, -10, 12, 10], '#e03030', 2); g.restore();
        text(g, 'SOS', ex, ey + 1, 14, '#fff');
      }
      if (joy.id != null && pl.dead <= 0) { circ(g, joy.ox, joy.oy, 46, 'rgba(255,255,255,.14)'); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(joy.ox, joy.oy, 46, 0, TAU); g.stroke(); circ(g, joy.ox + joy.dx * 40, joy.oy + joy.dy * 40, 22, 'rgba(255,255,255,.55)', 2); }
      else if (phase === 'prep' && save.wave === 1 && !save.kills && !online()) { const [px, py] = P(pl.x, pl.y); text(g, 'Arraste o dedo para andar', px, py + 34, 15, '#fff', 4); }
      if (pl.dead > 0) text(g, 'Voltando em ' + Math.ceil(pl.dead) + '…', W / 2, H / 2, 26, '#ff8080', 6);
      if (bannerT > 0) { g.globalAlpha = Math.min(1, bannerT * 2); text(g, bannerS, W / 2, TOP_H + 50, Math.min(40, W / 18), '#ffe070', 8); g.globalAlpha = 1; }
    } catch (e) { console.error(e); }
  }

  /* ---------- controles: joystick que aparece onde você toca ---------- */
  const joy: { id: number | string | null; ox: number; oy: number; dx: number; dy: number; sx: number; sy: number; t0: number } = { id: null, ox: 0, oy: 0, dx: 0, dy: 0, sx: 0, sy: 0, t0: 0 };
  const keys = new Set<string>();
  let firing = false;
  const blocked = () => ui.show.shop || ui.show.lost || ui.show.online;
  function ptrDown(ev: PtrEv): boolean {
    if (blocked() || joy.id != null) return false;
    joy.id = ev.id; joy.ox = ev.x; joy.oy = ev.y; joy.sx = ev.x; joy.sy = ev.y; joy.dx = 0; joy.dy = 0; joy.t0 = now();
    return true;
  }
  function ptrMove(ev: PtrEv) {
    if (ev.id !== joy.id) return;
    let dx = ev.x - joy.ox, dy = ev.y - joy.oy; const d = Math.hypot(dx, dy), R = 46;
    if (d > R) { joy.ox += dx / d * (d - R); joy.oy += dy / d * (d - R); dx = ev.x - joy.ox; dy = ev.y - joy.oy; }
    const m = Math.hypot(dx, dy); joy.dx = m > 6 ? dx / R : 0; joy.dy = m > 6 ? dy / R : 0;
  }
  function ptrUp(ev: PtrEv) {
    if (ev.id !== joy.id) return;
    const tapd = Math.hypot(ev.x - joy.sx, ev.y - joy.sy) < 10 && now() - joy.t0 < 400;
    joy.id = null; joy.dx = 0; joy.dy = 0;
    if (tapd) tap(ev.x, ev.y);
  }
  function tap(sx: number, sy: number) {
    if (pl.dead > 0 || phase === 'lost') return;
    const [wx, wy] = toWorld(sx, sy);
    const ti = SLOTS.findIndex(s => Math.hypot(wx - s.x, (wy - s.y + 14) * 1.2) < 46 || Math.hypot(wx - s.x, wy - (s.y + 30)) < 34);
    if (ti >= 0) { buy('turret', ti); return; }
    if (Math.hypot(wx - HQ.x, wy - (HQ.y + 40)) < 50) { buy('centro', 0); return; }
    if (Math.abs(wx - (BASE.x + 80)) < 70 && Math.abs(wy - (by1 + 26)) < 30) { buy('wall', 0); return; }
    if (phase === 'prep' && Math.hypot(wx - HQ.x, (wy - HQ.y + 40) * 1.2) < 80 + B.lv * 15) openShop('base');
  }
  function keyDown(code: string) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyJ'].includes(code)) { keys.add(code); return true; }
    if (code === 'KeyG') { grenade(); return true; }
    if (code === 'Enter' && phase === 'prep' && !ui.show.shop) { startWave(); return true; }
    return false;
  }
  function keyUp(code: string) { keys.delete(code); }

  /* ---------- compras ---------- */
  let shopTab = 'arma';
  function openShop(tab?: string) { if (phase !== 'prep') { toast('A loja abre entre as ondas. Na onda, toque no chão para pôr torres.'); return; } if (tab) shopTab = tab; ui.show.shop = true; sfx('click'); emit(); }
  function pay(n: number) { if (save.coins < n) { sfx('nope'); toast('Faltam ' + (n - save.coins) + ' moedas.'); return false; } save.coins -= n; return true; }
  function priceOf(what: string, i: number) {
    if (what === 'turret') { const lv = B.turrets[i]; return lv < TURRET_LV.length - 1 ? TURRET_LV[lv].price : -1; }
    if (what === 'wall') return B.wallLv + 1 < WALL_LV.length ? WALL_LV[B.wallLv + 1].price : -1;
    if (what === 'centro') return B.lv + 1 < BASE_LV.length ? BASE_LV[B.lv + 1].price : -1;
    return -1;
  }
  /** aplica uma melhoria na base (de quem está jogando sozinho, ou do anfitrião) */
  function applyBuy(what: string, i: number) {
    if (what === 'turret') { if (i < 0 || i >= SLOTS.length || B.turrets[i] >= TURRET_LV.length - 1) return false; B.turrets[i]++; save.turrets = B.turrets.slice(); sfx('build'); }
    else if (what === 'wall') { const n = B.wallLv + 1; if (n >= WALL_LV.length) return false; const old = WALL_LV[n - 1].hp; B.wallLv = save.wallLv = n; if (phase === 'prep') walls = SEGS.map(() => WALL_LV[n].hp); else walls = walls.map(w => w > 0 ? Math.round(w / old * WALL_LV[n].hp) : 0); sfx('build'); banner('MUROS DE ' + WALL_LV[n].name.toUpperCase() + '!'); }
    else if (what === 'centro') {
      const n = B.lv + 1; if (n >= BASE_LV.length || phase !== 'prep') return false;
      save.baseLv = n; applyBase(n); hq = hqMax(); sfx('build'); sfx('win'); banner('A BASE VIROU ' + BASE_LV[n].name.toUpperCase() + '!');
      for (const p of players()) { if (Math.hypot(p.x - HQ.x, p.y - HQ.y) < HQ.r + 60) { p.y = HQ.y + HQ.r + 80; } }
    } else return false;
    persist(); emit(); return true;
  }
  function buy(what: string, i: number) {
    const pr = priceOf(what, i);
    if (pr < 0) { toast(what === 'turret' ? 'Torre no nível máximo!' : what === 'wall' ? 'Os muros já são de metal!' : 'O centro já está no máximo!'); return; }
    if (what === 'centro' && phase !== 'prep') { toast('Melhore o centro entre as ondas.'); return; }
    if (!pay(pr)) return;
    if (NET.guest) { sendHost({ t: 'buy', what, i, price: pr }); sfx('buy'); persist(); emit(); return; }
    if (!applyBuy(what, i)) { save.coins += pr; return; }
    if (what === 'turret') toast(B.turrets[i] > 1 ? 'Torre melhorada!' : 'Torre construída!');
  }
  function buyGun(id: string) {
    const G = GUNS.find(g => g.id === id); if (!G) return;
    if (save.guns.includes(id)) { save.gun = id; sfx('select'); persist(); emit(); return; }
    if (!pay(G.price)) return;
    save.guns.push(id); save.gun = id; sfx('buy'); toast(G.name + ' comprada!'); persist(); emit();
  }
  function buyUpg(id: string) {
    const U = UPGRADES.find(u => u.id === id); if (!U) return; const lv = save.upg[id] || 0;
    if (lv >= U.max) { toast('Já está no máximo!'); return; }
    if (!pay(upgPrice(U, lv))) return;
    save.upg[id] = lv + 1; if (id === 'vida') { pl.max = maxHp(); pl.hp = pl.max; }
    if (id === 'abrigo' && !NET.guest) { B.abrigo = save.upg.abrigo; hq = hqMax(); }
    sfx('buy'); persist(); emit();
  }

  /* ---------- informações para as telas ---------- */
  function hudInfo() {
    const hs = NET.guest && NET.hostSave ? NET.hostSave : null;
    return {
      coins: save.coins, wave: hs ? hs.wave : save.wave, best: save.best, phase, left: hs ? hs.left : queue.length + zs.filter(z => z.die <= 0).length,
      hp: Math.max(0, Math.ceil(pl.hp)), maxHp: pl.max, hq: Math.max(0, Math.ceil(hq)), hqMax: hqMaxNow(), dead: Math.ceil(pl.dead),
      nade: nadeCd > 0 ? Math.ceil(nadeCd) : 0, sfx: !!save.sfx, mus: !!save.mus, coinImg: iconImage('coin', 'c', 40),
      next: hs ? hs.next : waveSpec(save.wave).list.length, boss: hs ? hs.boss : save.wave % 5 === 0, kills: save.kills,
      online: online(), host: NET.host, guest: NET.guest, code: NET.code, people: players().length, allies: NET.guest ? allyFx.length : allyCount(), baseName: BASE_LV[B.lv].name, sos: surv.filter(s => s.mode === 'help').length,
    };
  }
  function shopInfo() {
    return {
      tab: shopTab, coins: save.coins, coinImg: iconImage('coin', 'c', 40), guest: NET.guest,
      guns: GUNS.map(G => ({ id: G.id, name: G.name, desc: G.desc, price: G.price, owned: save.guns.includes(G.id), on: save.gun === G.id, ok: save.coins >= G.price, img: iconImage('gun', G.id, 96), stats: 'Dano ' + G.dmg + (G.pellets > 1 ? ' x' + G.pellets : '') + ' · ' + G.rate + ' tiros/s' })),
      upg: UPGRADES.map(U => { const lv = save.upg[U.id] || 0; return { id: U.id, name: U.name, desc: U.desc, lvl: lv, max: U.max, price: lv < U.max ? upgPrice(U, lv) : 0, ok: lv < U.max && save.coins >= upgPrice(U, lv), img: iconImage('upg', U.id, 80) }; }),
      centro: { lv: B.lv, name: BASE_LV[B.lv].name, next: B.lv + 1 < BASE_LV.length ? { name: BASE_LV[B.lv + 1].name, price: BASE_LV[B.lv + 1].price, ok: save.coins >= BASE_LV[B.lv + 1].price, slots: BASE_LV[B.lv + 1].slots, allies: ALLY_MAX[B.lv + 1] } : null, img: iconImage('shelter', 's' + B.lv, 96, B.lv) },
      wall: { lv: B.wallLv, name: WALL_LV[B.wallLv].name, hp: WALL_LV[B.wallLv].hp, img: iconImage('wall', 'w', 96, B.wallLv), next: B.wallLv + 1 < WALL_LV.length ? { name: WALL_LV[B.wallLv + 1].name, hp: WALL_LV[B.wallLv + 1].hp, price: WALL_LV[B.wallLv + 1].price, ok: save.coins >= WALL_LV[B.wallLv + 1].price } : null },
      turrets: SLOTS.map((_, i) => { const lv = B.turrets[i]; return { i, lvl: lv, max: TURRET_LV.length - 1, price: lv < TURRET_LV.length - 1 ? TURRET_LV[lv].price : 0, ok: lv < TURRET_LV.length - 1 && save.coins >= TURRET_LV[lv].price, img: iconImage('turret', 't', 80, Math.max(1, lv)), dmg: TURRET_LV[Math.min(TURRET_LV.length - 1, lv + 1)].dmg }; }),
    };
  }
  function lostInfo() { return { wave: waveNo(), coins: save.coins, kills: save.kills, guest: NET.guest }; }
  function onlineInfo() { return { host: NET.host, guest: NET.guest, code: NET.code, status: NET.status, busy: NET.busy, name: save.name, players: NET.roster.length ? NET.roster : [{ id: pl.id, name: save.name, col: pl.col }] }; }

  /* ---------- ações das telas ---------- */
  const act = {
    btnSound: (k?: string) => sfx(k === 'back' ? 'back' : 'click'),
    startWave, retry, grenade, openShop, fire: (on: boolean) => { firing = !!on; },
    closeShop: () => { ui.show.shop = false; emit(); }, tab: (t: string) => { shopTab = t; sfx('click'); emit(); },
    buyGun, buyUpg, wallUp: () => buy('wall', 0), turretUp: (i: number) => buy('turret', i), centroUp: () => buy('centro', 0),
    openOnline: () => { if (phase === 'wave' && !online()) { toast('Termine a onda antes.'); return; } ui.show.online = true; sfx('click'); emit(); },
    closeOnline: () => { ui.show.online = false; emit(); },
    createRoom, joinRoom: (c: string) => joinRoom(c), leaveRoom: () => leaveRoom(false),
    setName: (n: string) => { const s = String(n || '').replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 14).trim(); if (s) { save.name = s; pl.name = s; persist(); emit(); } },
    toggleSfx: () => { save.sfx = !save.sfx; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    toggleMus: () => { save.mus = !save.mus; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    back, onHide: () => persist(), persist,
  };
  function back(): boolean {
    if (ui.show.online) { ui.show.online = false; sfx('back'); emit(); return true; }
    if (ui.show.shop) { ui.show.shop = false; sfx('back'); emit(); return true; }
    if (ui.show.lost) { retry(); return true; }
    return false;
  }

  const game = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout, tick, draw,
    input: { keyDown, keyUp, ptrDown, ptrMove, ptrUp, wheel: (_d: number, _x: number, _y: number) => { } },
    info: { hud: hudInfo, shop: shopInfo, lost: lostInfo, online: onlineInfo, isTouch: () => pf.isTouch },
    act,
  };
  (game as any).__dbg = { get save() { return save; }, pl, get zs() { return zs; }, startWave, joy, spawn, get phase() { return phase; }, get surv() { return surv; }, spawnSurvivor, applyBase, NET, get others() { return others; } };
  return game;
}
