/* O mundo da Vila Selvagem: a vila no meio e as regiões em volta, tudo num só cenário.
   O chão é desenhado em ladrilhos (pedaços de 512 px) guardados em cache; só a vila
   (caminhos, terrenos) é redesenhada quando muda. Coordenadas em "unidades do mundo". */
import type { Ctx2D } from './types';
import { circ, ell, poly, box, grad, hash, TAU, tree, boulder, hexRgb, sh } from './draw';
import { REGIONS, REGION_POS, SEA, NODES, WORLD } from './data';

type Deco = { x: number; y: number; r: number; k: string; s: number; seed: number };
let decos: Deco[] | null = null;
const inRect = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) => x > x0 && x < x1 && y > y0 && y < y1;
const inSea = (x: number, y: number, m = 0) => ((x - SEA.x) / (SEA.rx + m)) ** 2 + ((y - SEA.y) / (SEA.ry + m)) ** 2 < 1;
const ISLE = REGION_POS[6];
const onIsle = (x: number, y: number, m = 0) => Math.hypot((x - ISLE.x) / 1.1, (y - ISLE.y) / .85) < ISLE.r + m;
/** região onde fica um ponto (-1 = campo comum) */
export function regionAt(x: number, y: number) { for (let i = 1; i < REGION_POS.length; i++) { const p = REGION_POS[i]; if (Math.hypot(x - p.x, (y - p.y) * 1.2) < p.r) return i; } return -1; }
const VILLAGE = { x0: -170, y0: -120, x1: 1170, y1: 720 };
function makeDecos(): Deco[] {
  const out: Deco[] = [];
  const free = (x: number, y: number, d: number) => !NODES.some(n => Math.hypot(n.x - x, n.y - y) < d);
  /* campo comum: floresta perto da vila (mais densa no anel) e árvores soltas mais longe */
  for (let i = 0; i < 2600; i++) {
    const x = WORLD.x0 + hash(i, 1) * (WORLD.x1 - WORLD.x0), y = WORLD.y0 + hash(i, 2) * (WORLD.y1 - WORLD.y0);
    if (inRect(x, y, VILLAGE.x0, VILLAGE.y0, VILLAGE.x1, VILLAGE.y1) || inSea(x, y, 60) || regionAt(x, y) >= 0 || !free(x, y, 55)) continue;
    const dv = Math.max(VILLAGE.x0 - x, x - VILLAGE.x1, VILLAGE.y0 - y, y - VILLAGE.y1, 0);
    const dens = dv < 260 ? .85 : .22;
    if (hash(i, 3) > dens) continue;
    const r = hash(i, 4);
    if (r < .78) out.push({ x, y, r: 60, k: 'tree', s: 26 + hash(i, 5) * 16, seed: i }); else if (r < .9) out.push({ x, y, r: 30, k: 'bush', s: 1, seed: i }); else out.push({ x, y, r: 30, k: 'rock', s: 10 + hash(i, 6) * 8, seed: i });
  }
  /* cada região com seu terreno */
  REGIONS.forEach((R, id) => {
    if (!id) return; const P = REGION_POS[id];
    const n = id === 1 ? 170 : id === 5 ? 34 : id === 9 ? 50 : id === 6 ? 20 : 70;
    let made = 0;
    for (let i = 0; i < n * 3 && made < n; i++) {
      const a = hash(id * 1000 + i, 7) * TAU, d = Math.sqrt(hash(id * 1000 + i, 8)) * P.r * .92, x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d * .83;
      const sd = id * 1000 + i, q = hash(sd, 9);
      if (id === 6 && !onIsle(x, y, -30)) continue;
      if (!free(x, y, 40)) continue;
      made++;
      if (id === 1) out.push({ x, y, r: 70, k: q < .4 ? 'pine' : 'tree', s: 30 + hash(sd, 5) * 20, seed: sd });
      else if (id === 2) out.push({ x, y, r: 60, k: q < .45 ? 'hill' : 'rock', s: q < .45 ? 40 + hash(sd, 5) * 30 : 12 + hash(sd, 5) * 12, seed: sd });
      else if (id === 3) out.push({ x, y, r: 60, k: q < .55 ? 'dune' : q < .8 ? 'cactus' : 'rock', s: q < .55 ? 50 + hash(sd, 5) * 40 : 14 + hash(sd, 5) * 8, seed: sd });
      else if (id === 4) out.push({ x, y, r: 40, k: q < .35 ? 'palm' : q < .8 ? 'shell' : 'rock', s: q < .35 ? 30 : 8, seed: sd });
      else if (id === 5) out.push({ x, y, r: 150, k: 'mount', s: 70 + hash(sd, 5) * 70, seed: sd });
      else if (id === 6) out.push({ x, y, r: 50, k: q < .6 ? 'palm' : 'shell', s: q < .6 ? 30 : 8, seed: sd });
      else if (id === 7) out.push({ x, y, r: 40, k: q < .3 ? 'deadtree' : 'darkrock', s: 14 + hash(sd, 5) * 14, seed: sd });
      else if (id === 8) out.push({ x, y, r: 50, k: q < .3 ? 'pond' : q < .6 ? 'reeds' : 'deadtree', s: 16 + hash(sd, 5) * 16, seed: sd });
      else if (id === 9) out.push({ x, y, r: 130, k: q < .55 ? 'bigtree' : 'crystal', s: q < .55 ? 60 + hash(sd, 5) * 30 : 20 + hash(sd, 5) * 18, seed: sd });
    }
  });
  out.sort((a, b) => a.y - b.y);
  return out;
}
export const worldDecos = () => decos || (decos = makeDecos());

function deco(g: Ctx2D, d: Deco) {
  const { x, y, s, seed } = d;
  switch (d.k) {
    case 'tree': tree(g, x, y, s, seed, 0); break;
    case 'pine': tree(g, x, y, s, seed, 1); break;
    case 'bigtree': tree(g, x, y, s, seed, 0); circ(g, x, y - s * 1.3, s * .3, 'rgba(255,240,150,.18)'); break;
    case 'rock': boulder(g, x, y, s, seed); break;
    case 'bush': { const r = 9 + hash(seed, 3) * 6; ell(g, x + r * .3, y + r * .5, r * 1.3, r * .45, 'rgba(20,50,10,.22)'); circ(g, x - r * .6, y, r * .8, '#3c8c34'); circ(g, x + r * .6, y, r * .75, '#3c8c34'); circ(g, x, y - r * .4, r, '#48a03c'); circ(g, x - r * .3, y - r * .7, r * .4, 'rgba(255,255,220,.15)'); break; }
    case 'hill': { g.beginPath(); g.ellipse(x, y, s, s * .62, 0, Math.PI, 0); g.closePath(); g.fillStyle = grad(g, x, y - s * .6, x, y, [[0, '#dcc898'], [1, '#a8946c']]); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(70,50,30,.45)'; g.stroke(); ell(g, x - s * .25, y - s * .38, s * .3, s * .1, 'rgba(255,255,230,.25)'); break; }
    case 'dune': { g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s * .1, y - s * .55, x + s * .9, y); g.closePath(); g.fillStyle = '#ecbe68'; g.fill(); g.beginPath(); g.moveTo(x - s * .1, y - s * .27); g.quadraticCurveTo(x + s * .4, y - s * .2, x + s * .9, y); g.lineTo(x + s * .1, y); g.closePath(); g.fillStyle = 'rgba(170,110,40,.28)'; g.fill(); break; }
    case 'cactus': { ell(g, x + 4, y + 2, s * .5, s * .15, 'rgba(80,50,10,.25)'); g.lineCap = 'round'; for (const [w, c] of [[s * .5, '#2c6c2c'], [s * .36, '#4c9c3c']] as [number, string][]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 1.6); g.moveTo(x, y - s * .7); g.lineTo(x - s * .55, y - s * .8); g.lineTo(x - s * .55, y - s * 1.2); g.moveTo(x, y - s * .95); g.lineTo(x + s * .5, y - s * 1.05); g.lineTo(x + s * .5, y - s * 1.4); g.stroke(); } break; }
    case 'palm': { ell(g, x + 8, y + 3, 18, 5, 'rgba(0,0,0,.2)'); g.strokeStyle = '#8c6438'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - s * .6, x + 5, y - s * 1.2); g.stroke(); for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * .62; g.strokeStyle = k % 2 ? '#2c8c3c' : '#3ca848'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 5, y - s * 1.2); g.quadraticCurveTo(x + 5 + Math.cos(a) * 18, y - s * 1.2 + Math.sin(a) * 18 - 8, x + 5 + Math.cos(a) * 30, y - s * 1.2 + Math.sin(a) * 26 + 12); g.stroke(); } circ(g, x + 3, y - s * 1.15, 4, '#6c4428'); circ(g, x + 9, y - s * 1.13, 4, '#6c4428'); break; }
    case 'shell': ell(g, x, y, 6, 4, hash(seed, 2) < .5 ? '#f8d8c8' : '#fff0d8', 1); break;
    case 'mount': { const w = s * .9, h = s; ell(g, x + w * .2, y + 6, w * 1.1, 14, 'rgba(30,30,40,.25)'); poly(g, [x - w, y, x, y - h, x + w, y], '#9494a4'); poly(g, [x, y - h, x + w, y, x + w * .15, y], '#74748a'); poly(g, [x - w * .32, y - h * .66, x, y - h, x + w * .32, y - h * .66, x + w * .1, y - h * .56, x - w * .08, y - h * .62], '#ffffff'); g.lineWidth = 2.5; g.strokeStyle = 'rgba(40,40,55,.55)'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y - h); g.lineTo(x + w, y); g.stroke(); break; }
    case 'deadtree': { g.strokeStyle = '#4c3c34'; g.lineCap = 'round'; g.lineWidth = s * .18; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 1.6); g.moveTo(x, y - s * .9); g.lineTo(x - s * .5, y - s * 1.3); g.moveTo(x, y - s * 1.2); g.lineTo(x + s * .45, y - s * 1.6); g.stroke(); break; }
    case 'darkrock': boulder(g, x, y, s, seed); ell(g, x, y - s * .4, s * .9, s * .5, 'rgba(60,40,100,.35)'); break;
    case 'pond': ell(g, x, y, s * 1.6, s * .6, 'rgba(70,100,80,.85)'); ell(g, x - s * .3, y - s * .15, s * .5, s * .12, 'rgba(200,230,210,.3)'); break;
    case 'reeds': for (let k = 0; k < 4; k++) { g.strokeStyle = '#4c6c38'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + k * 4, y); g.lineTo(x + k * 4 - 2, y - s); g.stroke(); ell(g, x + k * 4 - 2, y - s, 2, 5, '#6c4c2c'); } break;
    case 'crystal': for (const [dx, h, c] of [[-s * .3, s * 1.1, '#a8e8f8'], [s * .15, s * 1.5, '#c8f4ff'], [s * .5, s * .9, '#88d0f0']] as [number, number, string][]) poly(g, [x + dx - s * .2, y, x + dx, y - h, x + dx + s * .2, y], c, 1.5); break;
  }
}

/** chão de um pedaço do mundo; g já está transformado para unidades do mundo */
export function drawWorldTile(g: Ctx2D, x0: number, y0: number, x1: number, y1: number, village: (g: Ctx2D) => void) {
  /* grama */
  g.fillStyle = '#7cbc54'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const C = 46;
  for (let cx = Math.floor(x0 / C) - 1; cx <= Math.ceil(x1 / C); cx++) for (let cy = Math.floor(y0 / C) - 1; cy <= Math.ceil(y1 / C); cy++) {
    const hx = hash(cx * 7 + 3, cy * 13 + 5), x = cx * C + hash(cx, cy) * C, y = cy * C + hash(cy, cx) * C;
    if (hx < .5) ell(g, x, y, 30 + hx * 60, 12 + hx * 20, hx < .25 ? 'rgba(255,255,200,.05)' : 'rgba(30,70,20,.06)');
    for (let j = 0; j < 3; j++) { const tx = x + (hash(cx + j, cy) - .5) * C, ty = y + (hash(cx, cy + j) - .5) * C, h = 4 + hash(cx + j, cy + j) * 6; g.strokeStyle = (cx + j) % 2 ? 'rgba(40,90,30,.35)' : 'rgba(190,230,140,.35)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - h * .3, ty - h); g.moveTo(tx, ty); g.lineTo(tx + h * .3, ty - h * .9); g.stroke(); }
    if (hx > .93) { const cols = ['#ffffff', '#ffe060', '#f89cc8', '#c8a0f8']; for (let j = 0; j < 4; j++) circ(g, x + (hash(j, cx) - .5) * 20, y + (hash(cy, j) - .5) * 8, 2.2, cols[(cx + cy) & 3]); }
  }
  /* chão das regiões (degradê suave para a grama) */
  REGIONS.forEach((R, id) => {
    if (!id) return; const P = REGION_POS[id], rr = P.r * 1.25;
    if (P.x + rr < x0 || P.x - rr > x1 || P.y + rr < y0 || P.y - rr > y1) return;
    const c0 = id === 4 ? '#f0e0a8' : id === 6 ? '#c8ecb0' : R.bg, [r, gg, b] = hexRgb(c0);
    const gr = (g as any).createRadialGradient(P.x, P.y, P.r * .2, P.x, P.y, rr);
    gr.addColorStop(0, c0); gr.addColorStop(.6, c0); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(P.x, P.y, rr, rr * .83, 0, 0, TAU); g.fill();
  });
  /* mar com praia e espuma; a ilha dentro */
  if (x1 > SEA.x - SEA.rx - 80 && y0 < SEA.y + SEA.ry + 80) {
    const blob = (m: number, c: string) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU, w = 1 + (hash(i % 60, 77) - .5) * .05 + Math.sin(a * 5) * .015; g.lineTo(SEA.x + Math.cos(a) * (SEA.rx + m) * w, SEA.y + Math.sin(a) * (SEA.ry + m) * w); } g.fill(); };
    blob(70, '#e8d49c'); blob(26, 'rgba(255,255,255,.55)'); blob(10, '#5cb4e0'); blob(-60, '#3c94c8'); blob(-260, '#2c7cb4');
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2.5;
    for (let i = 0; i < 90; i++) { const wx = SEA.x + (hash(i, 31) - .5) * SEA.rx * 1.8, wy = SEA.y + (hash(i, 32) - .5) * SEA.ry * 1.8; if (!inSea(wx, wy, -80) || onIsle(wx, wy, 40)) continue; g.beginPath(); g.moveTo(wx - 12, wy); g.quadraticCurveTo(wx - 6, wy - 6, wx, wy); g.quadraticCurveTo(wx + 6, wy - 6, wx + 12, wy); g.stroke(); }
    const isle = (m: number, c: string) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, w = 1 + (hash(i % 40, 88) - .5) * .16; g.lineTo(ISLE.x + Math.cos(a) * (ISLE.r + m) * 1.1 * w, ISLE.y + Math.sin(a) * (ISLE.r + m) * .85 * w); } g.fill(); };
    isle(40, 'rgba(255,255,255,.5)'); isle(26, '#e8d49c'); isle(-10, '#8ccc64');
  }
  /* a vila (lago, caminhos, praça, cercado, terrenos) */
  if (x1 > VILLAGE.x0 && x0 < VILLAGE.x1 && y1 > VILLAGE.y0 && y0 < VILLAGE.y1) village(g);
  /* enfeites que tocam este pedaço */
  for (const d of worldDecos()) { if (d.x + d.r < x0 || d.x - d.r > x1 || d.y - d.s * 2 - 10 > y1 || d.y + 20 < y0) continue; deco(g, d); }
}

/** chão da vila em unidades do mundo: lago, caminhos, praça, cercado e terrenos */
export function villageBase(g: Ctx2D, plots: { x: number; y: number; open: boolean; used: boolean }[], square: { x: number; y: number }, pen: { x: number; y: number; rx: number; ry: number }) {
  /* terra batida em volta da vila */
  const gr = (g as any).createRadialGradient(500, 330, 120, 500, 330, 560); gr.addColorStop(0, 'rgba(150,200,90,.35)'); gr.addColorStop(1, 'rgba(150,200,90,0)'); g.fillStyle = gr; g.fillRect(-100, -100, 1200, 800);
  for (let i = 0; i < 60; i++) { const x = 60 + hash(i, 51) * 900, y = 60 + hash(i, 52) * 520, cols = ['#ffffff', '#ffe060', '#f89cc8', '#c8a0f8', '#ff8c6c'], c = cols[Math.floor(hash(i, 53) * cols.length)]; for (let j = 0; j < 5; j++) { const fx = x + (hash(i, 60 + j) - .5) * 22, fy = y + (hash(i, 70 + j) - .5) * 10; g.strokeStyle = 'rgba(40,100,30,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(fx, fy + 4); g.lineTo(fx, fy); g.stroke(); circ(g, fx, fy, 2.2, c); circ(g, fx, fy, .9, '#f8c018'); } }
  /* lago */
  const lx = 150, ly = 520;
  ell(g, lx + 6, ly + 8, 120, 52, 'rgba(40,60,20,.25)');
  g.beginPath(); g.ellipse(lx, ly, 120, 50, -.1, 0, TAU); g.fillStyle = (() => { const r = (g as any).createRadialGradient(lx - 30, ly - 10, 0, lx - 30, ly - 10, 130); r.addColorStop(0, '#7cd0f0'); r.addColorStop(1, '#2c88c0'); return r; })(); g.fill(); g.lineWidth = 4; g.strokeStyle = '#c8b484'; g.stroke();
  for (let i = 0; i < 5; i++) ell(g, lx - 60 + i * 30, ly - 12 + (i % 2) * 18, 14, 3, 'rgba(255,255,255,.45)');
  for (let i = 0; i < 3; i++) { const px = lx - 40 + i * 45, py = ly + 8 - (i % 2) * 14; ell(g, px, py, 9, 4, '#4ca048'); ell(g, px + 2, py - 1, 3, 2, '#f8a0c8'); }
  for (let i = 0; i < 8; i++) { const a = -2.6 + i * .25, rx = lx + Math.cos(a) * 122, ry = ly + Math.sin(a) * 52; g.strokeStyle = '#4c7c2c'; g.lineWidth = 2; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 3, ry - 16); g.stroke(); ell(g, rx - 3, ry - 18, 2.5, 6, '#7c4c2c'); }
  /* caminhos */
  const sx = square.x, sy = square.y;
  const dests: [number, number][] = plots.filter(p => p.open).map(p => [p.x, p.y] as [number, number]).concat([[pen.x - pen.rx * .8, pen.y]]);
  for (const pass of [0, 1, 2]) for (const [dx, dy] of dests) {
    const mx = (sx + dx) / 2 + (dy - sy) * .15, my = (sy + dy) / 2 - (dx - sx) * .1;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = pass === 0 ? '#9c7c4c' : pass === 1 ? '#d4b484' : 'rgba(255,240,200,.25)'; g.lineWidth = pass === 0 ? 28 : pass === 1 ? 22 : 8;
    g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(mx, my, dx, dy); g.stroke();
  }
  for (let i = 0; i < 160; i++) { const p = dests[i % dests.length], t = hash(i, 21), x = sx + (p[0] - sx) * t + (hash(i, 22) - .5) * 14, y = sy + (p[1] - sy) * t + (hash(i, 23) - .5) * 10; ell(g, x, y, 2.2, 1.4, 'rgba(120,90,50,.45)'); }
  /* praça de pedra */
  g.beginPath(); g.ellipse(sx, sy, 64, 40, 0, 0, TAU); g.fillStyle = '#d8c09c'; g.fill();
  for (let r = 0; r < 3; r++) for (let i = 0; i < 10 + r * 6; i++) { const a = i / (10 + r * 6) * TAU + r, rr = 18 + r * 15; ell(g, sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * .62, 6, 3.6, `rgba(150,130,100,${.25 + hash(i, r) * .2})`); }
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; ell(g, sx + Math.cos(a) * 64, sy + Math.sin(a) * 40, 6, 4, '#b0a088', 1.2); }
  /* cercado dos bichos */
  g.beginPath(); g.ellipse(pen.x, pen.y, pen.rx, pen.ry, 0, 0, TAU); g.fillStyle = 'rgba(120,180,70,.6)'; g.fill();
  for (let i = 0; i < 8; i++) ell(g, pen.x + (hash(i, 31) - .5) * pen.rx * 1.4, pen.y + (hash(i, 32) - .5) * pen.ry * 1.2, 10, 5, 'rgba(230,200,90,.5)');
  const tx = pen.x + pen.rx * .45, ty = pen.y - pen.ry * .55;
  box(g, tx - 16, ty - 5, 32, 11, 3, '#8c5c34', 1.5); box(g, tx - 13, ty - 4, 26, 5, 2, '#5cb8e8');
  const hx = pen.x - pen.rx * .55, hy = pen.y - pen.ry * .45;
  ell(g, hx + 3, hy + 6, 18, 6, 'rgba(0,0,0,.2)'); box(g, hx - 15, hy - 10, 30, 16, 4, '#e8c860', 1.5);
  /* terrenos */
  for (const p of plots) {
    if (!p.open) continue;
    if (!p.used) { g.beginPath(); g.ellipse(p.x, p.y + 10, 52, 30, 0, 0, TAU); g.fillStyle = 'rgba(200,170,110,.55)'; g.fill(); g.setLineDash?.([6, 5]); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke(); g.setLineDash?.([]); }
    else { g.beginPath(); g.ellipse(p.x, p.y + 12, 60, 33, 0, 0, TAU); g.fillStyle = 'rgba(180,150,95,.5)'; g.fill(); }
  }
}

/* ---------- coisas que mexem, desenhadas a cada quadro ---------- */
/** neblina por cima de região desconhecida */
export function fog(g: Ctx2D, id: number, t: number) {
  const P0 = REGION_POS[id], P = { x: P0.x, y: P0.y - P0.r * .15, r: P0.r * 1.1 };
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * .02, d = P.r * (.35 + hash(id, i) * .5), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d * .7, r = P.r * (.42 + hash(id, i + 20) * .22); circ(g, x, y, r, 'rgba(228,234,242,.9)'); }
  circ(g, P.x, P.y, P.r * .7, 'rgba(238,242,248,.96)');
  for (let i = 0; i < 5; i++) circ(g, P.x - P.r * .4 + i * P.r * .2, P.y - P.r * .25 - (i % 2) * P.r * .12, P.r * .22, 'rgba(255,255,255,.6)');
}
/** nuvens de tempestade com raios */
export function storm(g: Ctx2D, t: number) {
  const P = REGION_POS[7];
  for (let c = 0; c < 3; c++) {
    const x = P.x + (c - 1) * 150 + Math.sin(t * .2 + c) * 30, y = P.y - 210 - (c % 2) * 40, s = 1.2 - (c % 2) * .3;
    const flash = ((t * .7 + c * .37) % 1) < .06;
    if (flash) poly(g, [x + 4, y + 20, x - 14, y + 70, x + 2, y + 70, x - 10, y + 130, x + 26, y + 60, x + 10, y + 60, x + 22, y + 20], '#ffe848');
    for (const [dx, dy, r] of [[-40, 0, 38], [0, -18, 48], [44, 0, 36], [0, 12, 36]]) circ(g, x + dx * s, y + dy * s, r * s, flash ? '#9c94bc' : '#5c5472');
    for (const [dx, dy, r] of [[-34, -10, 24], [0, -26, 30]]) circ(g, x + dx * s, y + dy * s, r * s, flash ? '#c0b8e0' : '#7c7494');
  }
}
/** neblina do pântano passando */
export function mist(g: Ctx2D, t: number) { const P = REGION_POS[8]; for (let i = 0; i < 4; i++) { const x = P.x + Math.sin(t * .15 + i * 2) * 120, y = P.y - 60 + i * 40; ell(g, x, y, 140, 22, 'rgba(230,240,232,.28)'); } }
export { sh };
