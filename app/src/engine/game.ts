/* Motor do Base Zumbi: você anda com o joystick e atira sozinho no zumbi mais perto.
   Os zumbis vêm em ondas, batem nos muros e tentam derrubar o abrigo no meio da base.
   Cada zumbi solta moedas; entre as ondas você compra armas, melhorias, muros e torres.
   As telas em React Native leem `ui`/`info` e chamam `act`. */
import { WORLD, BASE, HQ, TURRET_SLOTS, WALL_SEG, GUNS, ZOMBIES, WALL_LV, TURRET_LV, UPGRADES, upgPrice, waveSpec, PLAYER_HP, HQ_HP, PLAYER_SP, type ZType } from './data';
import { drawGround, decalDraw, priceTag, soldier, zombie as drawZombie, wallPiece, shelter, turret as drawTurret, coin as drawCoin, boom, text, circ, ell, box, setCanvasMaker, makeCanvas, iconImage, TAU } from './draw';
import type { Platform, Ctx2D, Insets, PtrEv, OffCanvas } from './types';

export type Game = ReturnType<typeof createGame>;
export const TOP_H = 52;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const now = () => Date.now();

interface Zom { uid: number; T: ZType; x: number; y: number; hp: number; max: number; sp: number; face: number; hit: number; die: number; cd: number; atk: boolean; t: number }
interface Bul { x: number; y: number; vx: number; vy: number; life: number; dmg: number; pierce: number; hits: number[]; col: string; w: number }

export function createGame(pf: Platform) {
  setCanvasMaker(pf.createCanvas);
  let W = 800, H = 400, DPR = 1, INS: Insets = { t: 0, r: 0, b: 0, l: 0 };
  const tiles = new Map<string, OffCanvas>();
  function setLayout(w: number, h: number, dpr: number, ins: Insets) { if (Math.abs(dpr - DPR) > .01 || Math.abs(h - H) > 1) tiles.clear(); W = w; H = h; DPR = dpr; INS = ins || INS; emit(); }

  /* ---------- telas ---------- */
  const ui: any = { v: 0, show: { hud: true, shop: false, lost: false }, toast: null as any };
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
    wallLv: 0, turrets: [0, 0, 0, 0], sfx: true, mus: true,
  });
  let save: any = fresh();
  try { const s = JSON.parse(pf.storage.load() || 'null'); if (s && typeof s === 'object' && s.v === 1) { save = Object.assign(fresh(), s); save.upg = Object.assign(fresh().upg, s.upg || {}); } } catch (e) { }
  function persist() { try { pf.storage.save(JSON.stringify(save)); } catch (e) { } }
  pf.audio.setVolumes(save.sfx, save.mus);

  /* ---------- números ---------- */
  const gun = () => GUNS.find(g => g.id === save.gun) || GUNS[0];
  const maxHp = () => PLAYER_HP + save.upg.vida * 20;
  const hqMax = () => HQ_HP + save.upg.abrigo * 150;
  const dmgMul = () => 1 + save.upg.dano * .15;
  const rateMul = () => 1 + save.upg.cadencia * .1;
  const magnet = () => 70 + save.upg.ima * 35;
  const grenR = () => 95 + save.upg.granada * 14, grenDmg = () => 70 + save.upg.granada * 30, grenCd = () => 12 - save.upg.granada * 1.2;

  /* ---------- estado da partida ---------- */
  const bx0 = BASE.x - BASE.half, by0 = BASE.y - BASE.half, bx1 = BASE.x + BASE.half, by1 = BASE.y + BASE.half;
  /** pedaços de muro: lado (0 cima, 1 direita, 2 baixo, 3 esquerda) e posição */
  const SEGS = Array.from({ length: 4 * WALL_SEG }, (_, i) => {
    const side = Math.floor(i / WALL_SEG), k = i % WALL_SEG, L = BASE.half * 2 / WALL_SEG;
    if (side === 0) return { side, xa: bx0 + k * L, ya: by0, xb: bx0 + (k + 1) * L, yb: by0 };
    if (side === 2) return { side, xa: bx0 + k * L, ya: by1, xb: bx0 + (k + 1) * L, yb: by1 };
    if (side === 1) return { side, xa: bx1, ya: by0 + k * L, xb: bx1, yb: by0 + (k + 1) * L };
    return { side, xa: bx0, ya: by0 + k * L, xb: bx0, yb: by0 + (k + 1) * L };
  });
  let walls: number[] = SEGS.map(() => WALL_LV[save.wallLv].hp);
  let hq = hqMax();
  const pl = { x: HQ.x, y: HQ.y + 90, hp: maxHp(), aim: 0, cd: 0, dead: 0, hurt: 0, moving: false, t: 0 };
  let zs: Zom[] = [], buls: Bul[] = [], coins: { x: number; y: number; v: number; t: number; vx: number; vy: number; fly: boolean }[] = [];
  let booms: { x: number; y: number; t: number; r: number }[] = [], nades: { x: number; y: number; tx: number; ty: number; t: number }[] = [];
  let floats: { x: number; y: number; s: string; c: string; t: number; sz: number }[] = [];
  const tur = TURRET_SLOTS.map(() => ({ cd: 0, ang: -Math.PI / 2, flash: 0 }));
  let phase: 'prep' | 'wave' | 'lost' = 'prep', queue: string[] = [], spawnT = 0, spec = waveSpec(save.wave), nadeCd = 0, uidN = 1;
  let clock = 0, bannerS = '', bannerT = 0, shake = 0, firing = false, pflash = 0;
  let decals: { x: number; y: number; k: string; t: number; r: number; s: number }[] = [];
  const decal = (x: number, y: number, k: string, s = 1) => { decals.push({ x, y, k, t: 0, r: Math.random() * 6.28, s }); if (decals.length > 140) decals.shift(); };
  function banner(s: string) { bannerS = s; bannerT = 2.6; }
  function resetBase() { walls = SEGS.map(() => WALL_LV[save.wallLv].hp); hq = hqMax(); pl.hp = maxHp(); pl.dead = 0; }

  function startWave() {
    if (phase !== 'prep') return;
    resetBase(); spec = waveSpec(save.wave); queue = spec.list.slice(); spawnT = 1.5; zs = []; buls = []; nadeCd = Math.min(nadeCd, 2);
    phase = 'wave'; ui.show.shop = false; sfx('wave'); banner('ONDA ' + save.wave + '!'); emit();
  }
  function spawn(id: string) {
    const T = ZOMBIES[id];
    let x = 0, y = 0;
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * TAU, r = 560 + Math.random() * 160;
      x = clamp(BASE.x + Math.cos(a) * r * 1.25, 40, WORLD.w - 40); y = clamp(BASE.y + Math.sin(a) * r, 50, WORLD.h - 30);
      if (Math.hypot(x - pl.x, y - pl.y) > 360) break;
    }
    const hp = Math.round(T.hp * spec.hpMul);
    zs.push({ uid: uidN++, T, x, y, hp, max: hp, sp: T.sp * (.9 + Math.random() * .2), face: 1, hit: 0, die: 0, cd: 0, atk: false, t: Math.random() * 10 });
    if (id === 'chefe') { banner('CHEGOU O CHEFÃO!'); sfx('boss'); }
  }
  function winWave() {
    for (const c of coins) save.coins += c.v; coins = [];
    save.coins += spec.bonus; save.best = Math.max(save.best, save.wave); save.wave++;
    phase = 'prep'; resetBase(); persist();
    banner('ONDA VENCIDA!'); toast('Bônus da onda: +' + spec.bonus + ' moedas. Compre melhorias na LOJA!'); sfx('win'); emit();
  }
  function loseWave() { phase = 'lost'; ui.show.lost = true; ui.show.shop = false; for (const c of coins) save.coins += c.v; coins = []; persist(); sfx('lose'); emit(); }
  function retry() { phase = 'prep'; ui.show.lost = false; zs = []; buls = []; queue = []; nades = []; resetBase(); pl.x = HQ.x; pl.y = HQ.y + 90; emit(); }

  /* ---------- dano ---------- */
  function hurtZ(z: Zom, d: number, kx = 0, ky = 0) {
    if (z.die > 0) return;
    z.hp -= d; z.hit = .14; z.x += kx; z.y += ky;
    if (Math.random() < .5) floats.push({ x: z.x + (Math.random() - .5) * 10, y: z.y - 40 * z.T.size, s: String(Math.round(d)), c: '#fff', t: .6, sz: 13 });
    if (z.hp <= 0) {
      z.die = .001; save.kills++; sfx('zdie', .7, 60); decal(z.x, z.y, 'goo', z.T.size);
      const total = Math.round(z.T.coin * (1 + (save.wave - 1) * .04)), n = Math.min(8, Math.max(1, Math.ceil(total / 3)));
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 60 + Math.random() * 90; coins.push({ x: z.x, y: z.y, v: Math.max(1, Math.round(total / n)), t: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6, fly: false }); }
    } else sfx('hit', .5, 50);
  }
  function hurtPlayer(d: number) {
    if (pl.dead > 0) return;
    pl.hp -= d; pl.hurt = .3; shake = Math.max(shake, .25); sfx('hurt', .8, 150); pf.vibrate?.(30);
    if (pl.hp <= 0) { pl.hp = 0; pl.dead = 4; toast('Você caiu! Volta em 4 segundos…'); emit(); }
  }

  /* ---------- muros: um zumbi de fora querendo entrar ---------- */
  function wallBlock(z: Zom, nx: number, ny: number): number {
    const r = z.T.r * .6;
    const out = z.x < bx0 - r || z.x > bx1 + r || z.y < by0 - r || z.y > by1 + r;
    const inn = nx >= bx0 - r && nx <= bx1 + r && ny >= by0 - r && ny <= by1 + r;
    if (!out || !inn) return -1;
    let side = -1, pos = 0;
    if (z.y < by0 - r) { side = 0; pos = nx; } else if (z.y > by1 + r) { side = 2; pos = nx; } else if (z.x > bx1 + r) { side = 1; pos = ny; } else { side = 3; pos = ny; }
    const L = BASE.half * 2 / WALL_SEG, k = clamp(Math.floor((pos - (side % 2 ? by0 : bx0)) / L), 0, WALL_SEG - 1);
    const i = side * WALL_SEG + k;
    return walls[i] > 0 ? i : -1;
  }

  /* ---------- laço ---------- */
  let last = pf.now();
  function tick(nowp: number) {
    const dt = Math.min(.05, Math.max(0, (nowp - last) / 1000)); last = nowp; clock += dt;
    try {
      bannerT = Math.max(0, bannerT - dt); shake = Math.max(0, shake - dt);
      for (const f of floats) { f.t -= dt; f.y -= 30 * dt; } floats = floats.filter(f => f.t > 0);
      for (const b of booms) b.t += dt * 1.8; booms = booms.filter(b => b.t < 1);
      for (const t of tur) t.flash = Math.max(0, t.flash - dt * 8);
      pflash = Math.max(0, pflash - dt * 14); for (const d of decals) d.t += dt; decals = decals.filter(d => d.t < (d.k === 'goo' ? 25 : 6));
      pf.audio.music(phase === 'wave' ? 'fight' : 'prep');
      if (phase === 'lost') return;
      playerTick(dt);
      if (phase === 'wave') {
        spawnT -= dt;
        if (queue.length && spawnT <= 0) { spawn(queue.shift()!); if (queue.length > 3 && Math.random() < .3) spawn(queue.shift()!); spawnT = spec.gap * (.7 + Math.random() * .6); }
        zombieTick(dt); turretTick(dt);
        if (!queue.length && !zs.length) winWave();
        if (hq <= 0) loseWave();
      }
      bulletTick(dt); coinTick(dt); nadeTick(dt);
      nadeCd = Math.max(0, nadeCd - dt);
      if (Math.floor(clock * 4) !== Math.floor((clock - dt) * 4)) emit();
    } catch (e) { console.error(e); }
  }
  function nearest(x: number, y: number, range: number) {
    let best: Zom | null = null, bd = range;
    for (const z of zs) { if (z.die > 0) continue; const d = Math.hypot(z.x - x, z.y - y); if (d < bd) { bd = d; best = z; } }
    return best;
  }
  function playerTick(dt: number) {
    pl.hurt = Math.max(0, pl.hurt - dt); pl.t += dt;
    if (pl.dead > 0) { pl.dead -= dt; if (pl.dead <= 0) { pl.dead = 0; pl.hp = maxHp(); pl.x = HQ.x; pl.y = HQ.y + 90; sfx('click'); } return; }
    let mx = joy.dx, my = joy.dy;
    if ([...keys].some(k => k !== 'Space' && k !== 'KeyJ')) { mx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0); my = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0); }
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    pl.moving = Math.hypot(mx, my) > .1;
    if (pl.moving) { pl.x = clamp(pl.x + mx * PLAYER_SP * dt, 30, WORLD.w - 30); pl.y = clamp(pl.y + my * PLAYER_SP * dt, 40, WORLD.h - 20); }
    /* o abrigo é sólido */
    const dx = pl.x - HQ.x, dy = (pl.y - HQ.y) * 1.6, d = Math.hypot(dx, dy), R = HQ.r + 34;
    if (d < R) { pl.x = HQ.x + dx / (d || 1) * R; pl.y = HQ.y + dy / (d || 1) * R / 1.6; }
    const G = gun(), tg = nearest(pl.x, pl.y - 20, G.range);
    if (tg) pl.aim = Math.atan2(tg.y - 26 * tg.T.size - (pl.y - 30), tg.x - pl.x);
    else if (pl.moving) pl.aim = Math.atan2(my, mx);
    pl.cd -= dt;
    const want = firing || keys.has('Space') || keys.has('KeyJ');
    if (want && pl.cd <= 0) {
      pl.cd = 1 / (G.rate * rateMul()); pflash = 1;
      decal(pl.x - Math.cos(pl.aim) * 8 + (Math.random() - .5) * 14, pl.y + 4 + Math.random() * 6, 'shell');
      for (let i = 0; i < G.pellets; i++) {
        const a = pl.aim + (Math.random() - .5) * G.spread * 2, sp = 950;
        buls.push({ x: pl.x + Math.cos(pl.aim) * 34, y: pl.y - 30 + Math.sin(pl.aim) * 34, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: G.range / sp, dmg: G.dmg * dmgMul(), pierce: G.id === 'rifle' ? 5 : 1, hits: [], col: G.id === 'rifle' ? '#9cf0ff' : '#ffe070', w: G.id === 'rifle' ? 5 : 3 });
      }
      sfx(G.id === 'espingarda' ? 'shotgun' : G.id === 'rifle' ? 'laser' : G.id === 'metralhadora' ? 'mg' : 'shot', .55, G.id === 'metralhadora' ? 70 : 0);
    }
  }
  function zombieTick(dt: number) {
    for (const z of zs) {
      z.t += dt; z.hit = Math.max(0, z.hit - dt);
      if (z.die > 0) { z.die += dt * 1.8; continue; }
      z.cd -= dt; z.atk = false;
      /* alvo: o jogador se estiver perto, senão o abrigo */
      const dp = Math.hypot(pl.x - z.x, pl.y - z.y), chase = pl.dead <= 0 && dp < 240;
      const tx = chase ? pl.x : HQ.x, ty = chase ? pl.y : HQ.y + 20;
      if (chase && dp < 24 + z.T.r) { z.atk = true; if (z.cd <= 0) { z.cd = .9; hurtPlayer(z.T.dmg); } continue; }
      if (!chase && Math.hypot((HQ.x - z.x), (HQ.y + 10 - z.y) * 1.5) < HQ.r + z.T.r + 26) { z.atk = true; if (z.cd <= 0) { z.cd = 1; hq -= z.T.dmg; shake = Math.max(shake, .1); sfx('thud', .5, 120); emit(); } continue; }
      const ddx = tx - z.x, ddy = ty - z.y, d = Math.hypot(ddx, ddy) || 1;
      const nx = z.x + ddx / d * z.sp * dt, ny = z.y + ddy / d * z.sp * dt;
      const wb = wallBlock(z, nx, ny);
      if (wb >= 0) { z.atk = true; if (z.cd <= 0) { z.cd = 1; walls[wb] -= z.T.dmg * (z.T.id === 'gordo' || z.T.id === 'chefe' ? 1.5 : 1); sfx('thud', .4, 120); if (walls[wb] <= 0) { walls[wb] = 0; sfx('break'); toast('Um muro caiu! Os zumbis vão entrar por ali.'); } } }
      else { z.x = nx; z.y = ny; }
      if (Math.abs(ddx) > 2) z.face = ddx > 0 ? 1 : -1;
    }
    /* não ficar um em cima do outro */
    for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) {
      const a = zs[i], b = zs[j]; if (a.die || b.die) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = (a.T.r + b.T.r) * .8;
      if (d > 0 && d < m) { const p = (m - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
    }
    zs = zs.filter(z => z.die < 1);
  }
  function turretTick(dt: number) {
    TURRET_SLOTS.forEach((s, i) => {
      const lv = save.turrets[i]; if (!lv) return;
      const T = TURRET_LV[lv], st = tur[i]; st.cd -= dt;
      const tg = nearest(s.x, s.y - 26, T.range); if (!tg) return;
      const a = Math.atan2(tg.y - 26 * tg.T.size - (s.y - 26), tg.x - s.x);
      st.ang = a;
      if (st.cd <= 0) { st.cd = 1 / T.rate; st.flash = 1; const sp = 900; buls.push({ x: s.x + Math.cos(a) * 26, y: s.y - 26 + Math.sin(a) * 26, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: T.range / sp, dmg: T.dmg, pierce: 1, hits: [], col: '#ffb040', w: 3 }); sfx('turret', .3, 90); }
    });
  }
  function bulletTick(dt: number) {
    for (const b of buls) {
      const steps = 3;
      for (let s = 0; s < steps && b.life > 0; s++) {
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps; b.life -= dt / steps;
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
    const M = magnet();
    for (const c of coins) {
      c.t += dt;
      if (c.t < .5) { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= .92; c.vy *= .92; continue; }
      const d = Math.hypot(pl.x - c.x, pl.y - c.y);
      if (pl.dead <= 0 && (d < M || c.fly)) { c.fly = true; const sp = 420 * dt; c.x += (pl.x - c.x) / (d || 1) * Math.min(d, sp); c.y += (pl.y - c.y) / (d || 1) * Math.min(d, sp); }
      if (d < 18 && pl.dead <= 0) { save.coins += c.v; c.v = 0; sfx('coin', .45, 45); }
    }
    coins = coins.filter(c => c.v > 0);
  }
  function grenade() {
    if (pl.dead > 0 || phase !== 'wave') return;
    if (nadeCd > 0) { sfx('nope'); return; }
    const tg = nearest(pl.x, pl.y, 380);
    const tx = tg ? tg.x : pl.x + Math.cos(pl.aim) * 200, ty = tg ? tg.y : pl.y + Math.sin(pl.aim) * 200;
    nades.push({ x: pl.x, y: pl.y - 30, tx, ty, t: 0 }); nadeCd = grenCd(); sfx('throw'); emit();
  }
  function nadeTick(dt: number) {
    for (const n of nades) {
      n.t += dt / .6;
      if (n.t >= 1) {
        booms.push({ x: n.tx, y: n.ty, t: 0, r: grenR() }); shake = .4; sfx('boom'); pf.vibrate?.(60);
        for (const z of zs) { const d = Math.hypot(z.x - n.tx, (z.y - n.ty) * 1.3); if (d < grenR()) hurtZ(z, grenDmg() * (1 - d / grenR() * .5), (z.x - n.tx) * .15, (z.y - n.ty) * .15); }
      }
    }
    nades = nades.filter(n => n.t < 1);
  }

  /* ---------- câmera e chão em ladrilhos ---------- */
  const cam = { x: pl.x, y: pl.y - 30 };
  const kS = () => H / 480;
  const P = (x: number, y: number): [number, number] => [W / 2 + (x - cam.x) * kS(), H / 2 + (y - cam.y) * kS()];
  const toWorld = (sx: number, sy: number): [number, number] => [cam.x + (sx - W / 2) / kS(), cam.y + (sy - H / 2) / kS()];
  function camTick() {
    const hw = W / 2 / kS(), hh = H / 2 / kS();
    cam.x += (pl.x - cam.x) * .12; cam.y += (pl.y - 30 - cam.y) * .12;
    cam.x = hw * 2 >= WORLD.w ? WORLD.w / 2 : clamp(cam.x, hw, WORLD.w - hw); cam.y = hh * 2 >= WORLD.h ? WORLD.h / 2 : clamp(cam.y, hh, WORLD.h - hh);
  }
  const TPX = 512;
  function drawTiles(g: Ctx2D) {
    const ts = kS() * Math.min(DPR, 2.2), TW = TPX / ts, S = kS() * DPR;
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
      /* moedas no chão */
      for (const d of decals) if (vis(d.x, d.y)) decalDraw(g, d.k, d.x, d.y, d.r, d.s, d.t);
      for (const c of coins) if (vis(c.x, c.y)) drawCoin(g, c.x, c.y, clock + c.x * .01, 1.2);
      const items: { y: number; f: () => void }[] = [];
      SEGS.forEach((s, i) => {
        const my = (s.ya + s.yb) / 2; if (!vis((s.xa + s.xb) / 2, my)) return;
        const f = walls[i] / WALL_LV[save.wallLv].hp;
        if (s.side % 2) { const n = 4; for (let k = 0; k < n; k++) { const ya = s.ya + (s.yb - s.ya) * k / n, yb = s.ya + (s.yb - s.ya) * (k + 1) / n; items.push({ y: yb, f: () => wallPiece(g, s.xa, ya, s.xb, yb, save.wallLv, f, i * 10 + k) }); } }
        else items.push({ y: my, f: () => wallPiece(g, s.xa, s.ya, s.xb, s.yb, save.wallLv, f, i) });
      });
      items.push({ y: HQ.y, f: () => shelter(g, HQ.x, HQ.y, clock, hq / hqMax(), save.upg.abrigo + 1) });
      TURRET_SLOTS.forEach((s, i) => { items.push({ y: s.y, f: () => drawTurret(g, s.x, s.y, save.turrets[i], tur[i].ang, clock, tur[i].flash) }); });
      for (const z of zs) if (vis(z.x, z.y)) items.push({ y: z.y, f: () => {
        drawZombie(g, z.T, z.x, z.y, z.T.size * 1.3, z.t, z.face, z.hit / .14, z.die, z.atk);
        if (z.hp < z.max && z.die <= 0) { const w = 30 * z.T.size, yy = z.y - 64 * z.T.size; box(g, z.x - w / 2 - 1, yy - 1, w + 2, 6, 2, '#1c1c1c'); box(g, z.x - w / 2, yy, w * Math.max(0, z.hp / z.max), 4, 1.5, z.T.id === 'chefe' ? '#e040e0' : '#e04040'); }
      } });
      if (pl.dead <= 0) items.push({ y: pl.y, f: () => { const G = gun(); soldier(g, pl.x, pl.y, 1.35, pl.aim, pl.t, pl.moving, pl.hurt / .3, G.id, G.col, pflash); } });
      else items.push({ y: pl.y, f: () => { g.globalAlpha = .5; ell(g, pl.x, pl.y, 14, 5, 'rgba(0,0,0,.4)'); text(g, '✚', pl.x, pl.y - 20, 22, '#ff5050', 3); g.globalAlpha = 1; } });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.f();
      /* plaquinhas de preço: tocar no chão compra/melhora */
      if (pl.dead <= 0) {
        TURRET_SLOTS.forEach((s, i) => { const lv = save.turrets[i]; if (lv < TURRET_LV.length - 1) priceTag(g, s.x, s.y + (lv ? 30 : 30), TURRET_LV[lv].price, save.coins >= TURRET_LV[lv].price, lv ? '⬆' : '', clock + i); });
        if (save.wallLv + 1 < WALL_LV.length) priceTag(g, BASE.x, by1 + 26, WALL_LV[save.wallLv + 1].price, save.coins >= WALL_LV[save.wallLv + 1].price, '⬆ MURO', clock);
        const U = UPGRADES.find(u => u.id === 'abrigo')!, al = save.upg.abrigo || 0; if (al < U.max) priceTag(g, HQ.x + 92, HQ.y - 60, upgPrice(U, al), save.coins >= upgPrice(U, al), '⬆', clock + 2);
      }
      /* barra do abrigo */
      { const f = Math.max(0, hq / hqMax()), w = 110; box(g, HQ.x - w / 2 - 2, HQ.y - 140, w + 4, 11, 4, '#1c1c1c'); box(g, HQ.x - w / 2, HQ.y - 138, w * f, 7, 3, f > .5 ? '#4cd060' : f > .25 ? '#f0b030' : '#e04040'); }
      /* tiros, granadas, explosões */
      g.lineCap = 'round';
      for (const b of buls) { g.strokeStyle = b.col; g.lineWidth = b.w; g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x - b.vx * .022, b.y - b.vy * .022); g.stroke(); }
      for (const n of nades) { const x = n.x + (n.tx - n.x) * n.t, y = n.y + (n.ty - n.y) * n.t - Math.sin(n.t * Math.PI) * 90; ell(g, n.x + (n.tx - n.x) * n.t, n.y + 30 + (n.ty - n.y - 30) * n.t, 6, 2.5, 'rgba(0,0,0,.3)'); circ(g, x, y, 6, '#4c6c34', 1.5); }
      for (const b of booms) boom(g, b.x, b.y, b.t, b.r);
      for (const f of floats) { g.globalAlpha = Math.min(1, f.t * 3); text(g, f.s, f.x, f.y, f.sz, f.c, 3); } g.globalAlpha = 1;
      /* na tela: noite durante a onda, joystick, avisos */
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (phase !== 'prep' && g.createRadialGradient) { const [px, py] = P(pl.x, pl.y - 20); const gr = g.createRadialGradient(px, py, H * .25, px, py, Math.max(W, H) * .8); gr.addColorStop(0, 'rgba(10,20,50,.08)'); gr.addColorStop(1, 'rgba(10,20,50,.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      if (joy.id != null && pl.dead <= 0) { circ(g, joy.ox, joy.oy, 46, 'rgba(255,255,255,.14)'); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(joy.ox, joy.oy, 46, 0, TAU); g.stroke(); circ(g, joy.ox + joy.dx * 40, joy.oy + joy.dy * 40, 22, 'rgba(255,255,255,.55)', 2); }
      else if (phase === 'prep' && save.wave === 1 && !save.kills) { const [px, py] = P(pl.x, pl.y); text(g, 'Arraste o dedo para andar', px, py + 34, 15, '#fff', 4); }
      if (pl.dead > 0) text(g, 'Voltando em ' + Math.ceil(pl.dead) + '…', W / 2, H / 2, 26, '#ff8080', 6);
      if (bannerT > 0) { g.globalAlpha = Math.min(1, bannerT * 2); text(g, bannerS, W / 2, TOP_H + 50, Math.min(40, W / 18), '#ffe070', 8); g.globalAlpha = 1; }
    } catch (e) { console.error(e); }
  }

  /* ---------- controles: joystick que aparece onde você toca ---------- */
  const joy: { id: number | string | null; ox: number; oy: number; dx: number; dy: number; sx: number; sy: number; t0: number } = { id: null, ox: 0, oy: 0, dx: 0, dy: 0, sx: 0, sy: 0, t0: 0 };
  const keys = new Set<string>();
  const blocked = () => ui.show.shop || ui.show.lost;
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
    if (pl.dead > 0) return;
    const [wx, wy] = toWorld(sx, sy);
    const ti = TURRET_SLOTS.findIndex(s => Math.hypot(wx - s.x, (wy - s.y + 14) * 1.2) < 46);
    if (ti >= 0) { turretUp(ti); return; }
    if (Math.hypot(wx - (HQ.x + 92), wy - (HQ.y - 60)) < 34) { buyUpg('abrigo'); return; }
    if (Math.abs(wx - BASE.x) < 70 && Math.abs(wy - (by1 + 26)) < 30) { wallUp(); return; }
    if (phase === 'prep' && Math.hypot(wx - HQ.x, (wy - HQ.y + 30) * 1.2) < 70) openShop('melhorias');
  }
  function keyDown(code: string) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) { keys.add(code); return true; }
    if (code === 'Space' || code === 'KeyJ') { keys.add(code); return true; }
    if (code === 'KeyG') { grenade(); return true; }
    if (code === 'Enter' && phase === 'prep' && !ui.show.shop) { startWave(); return true; }
    return false;
  }
  function keyUp(code: string) { keys.delete(code); }

  /* ---------- loja ---------- */
  let shopTab = 'arma';
  function openShop(tab?: string) { if (phase !== 'prep') { toast('A loja abre entre as ondas.'); return; } if (tab) shopTab = tab; ui.show.shop = true; sfx('click'); emit(); }
  function pay(n: number) { if (save.coins < n) { sfx('nope'); toast('Faltam ' + (n - save.coins) + ' moedas.'); return false; } save.coins -= n; return true; }
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
    save.upg[id] = lv + 1; if (id === 'vida') pl.hp = maxHp(); if (id === 'abrigo') hq = hqMax();
    sfx('buy'); persist(); emit();
  }
  function wallUp() {
    const n = save.wallLv + 1; if (n >= WALL_LV.length) { toast('Os muros já são de metal!'); return; }
    if (!pay(WALL_LV[n].price)) return;
    const old = WALL_LV[n - 1].hp; save.wallLv = n;
    if (phase === 'prep') resetBase(); else walls = walls.map(w => w > 0 ? Math.round(w / old * WALL_LV[n].hp) : 0);
    sfx('build'); toast('Muros de ' + WALL_LV[n].name.toLowerCase() + '!'); persist(); emit();
  }
  function turretUp(i: number) {
    const lv = save.turrets[i]; if (lv >= TURRET_LV.length - 1) { toast('Torre no nível máximo!'); return; }
    if (!pay(TURRET_LV[lv].price)) return;
    save.turrets[i] = lv + 1; sfx('build'); toast(lv ? 'Torre melhorada!' : 'Torre construída!'); persist(); emit();
  }

  /* ---------- informações para as telas ---------- */
  function hudInfo() {
    return {
      coins: save.coins, wave: save.wave, best: save.best, phase, left: queue.length + zs.filter(z => z.die <= 0).length,
      hp: Math.max(0, Math.ceil(pl.hp)), maxHp: maxHp(), hq: Math.max(0, Math.ceil(hq)), hqMax: hqMax(), dead: Math.ceil(pl.dead),
      nade: nadeCd > 0 ? Math.ceil(nadeCd) : 0, sfx: !!save.sfx, mus: !!save.mus, coinImg: iconImage('coin', 'c', 40),
      next: waveSpec(save.wave).list.length, boss: save.wave % 5 === 0, kills: save.kills,
    };
  }
  function shopInfo() {
    return {
      tab: shopTab, coins: save.coins, coinImg: iconImage('coin', 'c', 40),
      guns: GUNS.map(G => ({ id: G.id, name: G.name, desc: G.desc, price: G.price, owned: save.guns.includes(G.id), on: save.gun === G.id, ok: save.coins >= G.price, img: iconImage('gun', G.id, 96), stats: 'Dano ' + G.dmg + (G.pellets > 1 ? ' x' + G.pellets : '') + ' · ' + G.rate + ' tiros/s' })),
      upg: UPGRADES.map(U => { const lv = save.upg[U.id] || 0; return { id: U.id, name: U.name, desc: U.desc, lvl: lv, max: U.max, price: lv < U.max ? upgPrice(U, lv) : 0, ok: lv < U.max && save.coins >= upgPrice(U, lv), img: iconImage('upg', U.id, 80) }; }),
      wall: { lv: save.wallLv, name: WALL_LV[save.wallLv].name, hp: WALL_LV[save.wallLv].hp, img: iconImage('wall', 'w', 96, save.wallLv), next: save.wallLv + 1 < WALL_LV.length ? { name: WALL_LV[save.wallLv + 1].name, hp: WALL_LV[save.wallLv + 1].hp, price: WALL_LV[save.wallLv + 1].price, ok: save.coins >= WALL_LV[save.wallLv + 1].price } : null },
      turrets: save.turrets.map((lv: number, i: number) => ({ i, lvl: lv, max: TURRET_LV.length - 1, price: lv < TURRET_LV.length - 1 ? TURRET_LV[lv].price : 0, ok: lv < TURRET_LV.length - 1 && save.coins >= TURRET_LV[lv].price, img: iconImage('turret', 't', 80, Math.max(1, lv)), dmg: TURRET_LV[Math.min(TURRET_LV.length - 1, lv + 1)].dmg })),
    };
  }
  function lostInfo() { return { wave: save.wave, coins: save.coins, kills: save.kills }; }

  /* ---------- ações das telas ---------- */
  const act = {
    btnSound: (k?: string) => sfx(k === 'back' ? 'back' : 'click'),
    startWave, retry, grenade, openShop, fire: (on: boolean) => { firing = !!on; }, closeShop: () => { ui.show.shop = false; emit(); }, tab: (t: string) => { shopTab = t; sfx('click'); emit(); },
    buyGun, buyUpg, wallUp, turretUp,
    toggleSfx: () => { save.sfx = !save.sfx; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    toggleMus: () => { save.mus = !save.mus; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    back, onHide: () => persist(), persist,
  };
  function back(): boolean {
    if (ui.show.shop) { ui.show.shop = false; sfx('back'); emit(); return true; }
    if (ui.show.lost) { retry(); return true; }
    return false;
  }

  const game = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout, tick, draw,
    input: { keyDown, keyUp, ptrDown, ptrMove, ptrUp, wheel: (_d: number, _x: number, _y: number) => { } },
    info: { hud: hudInfo, shop: shopInfo, lost: lostInfo, isTouch: () => pf.isTouch },
    act,
  };
  (game as any).__dbg = { get save() { return save; }, pl, get zs() { return zs; }, startWave, joy, spawn, get phase() { return phase; } };
  return game;
}
