/* Desenhos do Base Zumbi (vetor no canvas, vista de cima em 3/4): chão com ruínas e estradas,
   soldado, zumbis, muros (madeira, pedra, metal), abrigo, torres, moedas, tiros e explosões. */
import type { Ctx2D, OffCanvas } from './types';

export const INK = '#2e2418';
export function hexRgb(h: string): [number, number, number] { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function sh(h: string, k: number) { const [r, g, b] = hexRgb(h); const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }
const FONT = (s: number) => s + 'px "Lilita One","Arial Black",sans-serif';
const TAU = Math.PI * 2;

function circ(g: Ctx2D, x: number, y: number, r: number, c: string, line = 0) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); g.fillStyle = c; g.fill(); if (line) { g.lineWidth = line; g.strokeStyle = INK; g.stroke(); } }
function ell(g: Ctx2D, x: number, y: number, rx: number, ry: number, c: string, line = 0, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); g.fillStyle = c; g.fill(); if (line) { g.lineWidth = line; g.strokeStyle = INK; g.stroke(); } }
function rrect(g: Ctx2D, x: number, y: number, w: number, h: number, r: number) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
function box(g: Ctx2D, x: number, y: number, w: number, h: number, r: number, c: string, line = 0) { rrect(g, x, y, w, h, r); g.fillStyle = c; g.fill(); if (line) { g.lineWidth = line; g.strokeStyle = INK; g.stroke(); } }
function poly(g: Ctx2D, pts: number[], c: string, line = 0) { g.beginPath(); for (let i = 0; i < pts.length; i += 2) { if (i) g.lineTo(pts[i], pts[i + 1]); else g.moveTo(pts[i], pts[i + 1]); } g.closePath(); g.fillStyle = c; g.fill(); if (line) { g.lineWidth = line; g.strokeStyle = INK; g.stroke(); } }
export function text(g: Ctx2D, s: string, x: number, y: number, size: number, col: string, line = 0, align = 'center') {
  g.font = FONT(size); g.textAlign = align; g.textBaseline = 'middle';
  if (line) { g.lineWidth = line; g.lineJoin = 'round'; g.strokeStyle = INK; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
}
export const hash = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };


export function tree(g: Ctx2D, x: number, y: number, s: number, seed: number, kind = 0) {
  const k = .8 + hash(seed, 3) * .5, r = s * k;
  ell(g, x + r * .25, y + r * .1, r * .9, r * .35, 'rgba(20,40,10,.28)');
  g.fillStyle = '#6c4428'; g.fillRect(x - r * .09, y - r * .7, r * .18, r * .72);
  if (kind === 1) { /* pinheiro */
    for (let i = 0; i < 3; i++) { const yy = y - r * (.5 + i * .45), w = r * (.95 - i * .22); poly(g, [x - w, yy, x, yy - r * .8, x + w, yy], i % 2 ? '#2c7038' : '#357c40'); poly(g, [x - w * .2, yy - r * .1, x, yy - r * .8, x + w * .5, yy], 'rgba(255,255,255,.08)'); }
    return;
  }
  const cols = ['#3c8c3c', '#47984a', '#2f7a34'];
  const blobs = [[-.45, -.9, .55], [.45, -.95, .55], [0, -1.35, .62], [0, -.85, .6]];
  for (const [dx, dy, rr] of blobs) { circ(g, x + dx * r, y + dy * r, rr * r, cols[Math.floor(hash(seed, dx * 10 + 5) * 3)]); }
  for (const [dx, dy, rr] of blobs) { circ(g, x + dx * r - rr * r * .25, y + dy * r - rr * r * .3, rr * r * .45, 'rgba(255,255,220,.13)'); }
}
export function boulder(g: Ctx2D, x: number, y: number, s: number, seed: number) {
  const k = .7 + hash(seed, 7) * .6, r = s * k;
  ell(g, x + r * .2, y + r * .35, r * 1.05, r * .38, 'rgba(0,0,0,.22)');
  g.beginPath(); g.moveTo(x - r, y + r * .3); g.quadraticCurveTo(x - r * 1.05, y - r * .5, x - r * .2, y - r * .75); g.quadraticCurveTo(x + r * .7, y - r * .85, x + r, y + r * .1); g.quadraticCurveTo(x + r * .9, y + r * .45, x, y + r * .45); g.closePath();
  g.fillStyle = grad(g, x, y - r, x, y + r * .5, [[0, '#c4c4cc'], [1, '#7c7c88']]); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(40,40,50,.5)'; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x - r * .6, y - r * .3); g.quadraticCurveTo(x - r * .3, y - r * .65, x + r * .2, y - r * .62); g.stroke();
}

export function grad(g: Ctx2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; }
export function rgrad(g: Ctx2D, x: number, y: number, r: number, c0: string, c1: string) { const gr = (g as any).createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
export { circ, ell, poly, box, TAU };

/* ---------- chão do mundo ---------- */
import { WORLD, BASE } from './data';
type Deco = { x: number; y: number; k: string; s: number; seed: number; r: number };
let decos: Deco[] | null = null;
/** estradas: uma cruz passando pela base */
const ROADS = [{ x0: 0, y0: BASE.y - 40, x1: WORLD.w, y1: BASE.y + 40 }, { x0: BASE.x - 40, y0: 0, x1: BASE.x + 40, y1: WORLD.h }];
const nearBase = (x: number, y: number, m: number) => Math.abs(x - BASE.x) < BASE.half + m && Math.abs(y - BASE.y) < BASE.half + m;
const onRoad = (x: number, y: number, m: number) => ROADS.some(r => x > r.x0 - m && x < r.x1 + m && y > r.y0 - m && y < r.y1 + m);
export function worldDecos() {
  if (decos) return decos;
  const out: Deco[] = [];
  for (let i = 0; i < 900; i++) {
    const x = hash(i, 1) * WORLD.w, y = hash(i, 2) * WORLD.h;
    if (nearBase(x, y, 120) || onRoad(x, y, 30)) continue;
    const q = hash(i, 3), edge = Math.min(x, y, WORLD.w - x, WORLD.h - y);
    if (edge < 140 ? q < .75 : q < .2) out.push({ x, y, k: hash(i, 4) < .3 ? 'dead' : 'tree', s: 30 + hash(i, 5) * 16, seed: i, r: 60 });
    else if (q < .32) out.push({ x, y, k: 'bush', s: 1, seed: i, r: 30 });
    else if (q < .4) out.push({ x, y, k: 'rock', s: 10 + hash(i, 6) * 10, seed: i, r: 30 });
    else if (q < .44) out.push({ x, y, k: 'grave', s: 1, seed: i, r: 20 });
  }
  /* carros quebrados, barris e pneus perto das estradas */
  for (let i = 0; i < 40; i++) { const r = ROADS[i % 2], t = hash(i, 11); const x = r.x0 + (r.x1 - r.x0) * (i % 2 ? .5 : t) + (i % 2 ? (hash(i, 12) - .5) * 60 : 0), y = r.y0 + (r.y1 - r.y0) * (i % 2 ? t : .5) + (i % 2 ? 0 : (hash(i, 12) - .5) * 60); if (nearBase(x, y, 90)) continue; const q = hash(i, 13); out.push({ x, y, k: q < .35 ? 'car' : q < .7 ? 'barrel' : 'tire', s: 1, seed: i, r: 70 }); }
  out.sort((a, b) => a.y - b.y);
  return (decos = out);
}
function deco(g: Ctx2D, d: Deco) {
  const { x, y, seed } = d;
  if (d.k === 'tree') tree(g, x, y, d.s, seed, seed % 3 === 0 ? 1 : 0);
  else if (d.k === 'dead') { ell(g, x + 6, y + 2, 16, 5, 'rgba(0,0,0,.2)'); g.strokeStyle = '#4c3c30'; g.lineCap = 'round'; g.lineWidth = 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - d.s * 1.4); g.moveTo(x, y - d.s * .7); g.lineTo(x - d.s * .5, y - d.s * 1.1); g.moveTo(x, y - d.s); g.lineTo(x + d.s * .45, y - d.s * 1.45); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(x - d.s * .5, y - d.s * 1.1); g.lineTo(x - d.s * .7, y - d.s * 1.3); g.stroke(); }
  else if (d.k === 'bush') { const r = 9 + hash(seed, 3) * 6; ell(g, x + r * .3, y + r * .5, r * 1.3, r * .45, 'rgba(20,50,10,.22)'); circ(g, x - r * .6, y, r * .8, '#4c7c34'); circ(g, x + r * .6, y, r * .75, '#4c7c34'); circ(g, x, y - r * .4, r, '#5c8c3c'); }
  else if (d.k === 'rock') boulder(g, x, y, d.s, seed);
  else if (d.k === 'grave') { ell(g, x + 3, y + 2, 12, 4, 'rgba(0,0,0,.22)'); box(g, x - 8, y - 20, 16, 22, 7, '#a0a0a8', 1.5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 1, y - 16, 2, 9); g.fillRect(x - 4, y - 13, 8, 2); }
  else if (d.k === 'barrel') { ell(g, x + 4, y + 3, 14, 5, 'rgba(0,0,0,.25)'); g.fillStyle = grad(g, x - 10, 0, x + 10, 0, [[0, '#b84c2c'], [.5, '#e0703c'], [1, '#983c24']]); g.fillRect(x - 10, y - 26, 20, 26); ell(g, x, y - 26, 10, 4, '#c85c34', 1.5); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 10, y - 18, 20, 2.5); g.fillRect(x - 10, y - 8, 20, 2.5); }
  else if (d.k === 'tire') { ell(g, x, y, 14, 7, '#2c2c30', 1); ell(g, x, y - 1, 6, 3, '#5c8c3c'); }
  else if (d.k === 'car') {
    const c = ['#c84c3c', '#3c6cb8', '#e0b030', '#5c9c5c'][seed % 4], f = seed % 2 ? 1 : -1;
    g.save(); g.translate(x, y); g.scale(f, 1);
    ell(g, 4, 6, 50, 12, 'rgba(0,0,0,.28)');
    box(g, -46, -24, 92, 26, 8, sh(c, -.25), 1.5); box(g, -46, -30, 92, 16, 7, c, 1.5);
    poly(g, [-24, -30, -14, -48, 22, -48, 32, -30], sh(c, .1), 1.5); poly(g, [-18, -31, -10, -45, 4, -45, 4, -31], '#9cc8e0'); poly(g, [8, -31, 8, -45, 20, -45, 27, -31], '#7ca8c0');
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-14, -40); g.lineTo(-6, -34); g.stroke();
    for (const wx of [-28, 28]) { circ(g, wx, -2, 9, '#2c2c30', 1); circ(g, wx, -2, 4, '#8c8c94'); }
    ell(g, -34, -14, 14, 5, 'rgba(120,70,30,.45)'); ell(g, 18, -20, 9, 4, 'rgba(120,70,30,.4)');
    g.restore();
  }
}
/** um pedaço do chão (g já em unidades do mundo) */
export function drawGround(g: Ctx2D, x0: number, y0: number, x1: number, y1: number) {
  g.fillStyle = '#7ca450'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const C = 50;
  for (let cx = Math.floor(x0 / C) - 1; cx <= Math.ceil(x1 / C); cx++) for (let cy = Math.floor(y0 / C) - 1; cy <= Math.ceil(y1 / C); cy++) {
    const hx = hash(cx * 7 + 3, cy * 13 + 5), x = cx * C + hash(cx, cy) * C, y = cy * C + hash(cy, cx) * C;
    if (hx < .55) ell(g, x, y, 30 + hx * 70, 12 + hx * 24, hx < .2 ? 'rgba(140,110,60,.16)' : hx < .4 ? 'rgba(255,255,200,.05)' : 'rgba(30,60,20,.07)');
    for (let j = 0; j < 3; j++) { const tx = x + (hash(cx + j, cy) - .5) * C, ty = y + (hash(cx, cy + j) - .5) * C, h = 4 + hash(cx + j, cy + j) * 6; g.strokeStyle = (cx + j) % 2 ? 'rgba(40,70,25,.35)' : 'rgba(200,220,140,.3)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - h * .3, ty - h); g.moveTo(tx, ty); g.lineTo(tx + h * .3, ty - h * .9); g.stroke(); }
  }
  /* estradas com faixa */
  for (const r of ROADS) {
    if (r.x1 < x0 || r.x0 > x1 || r.y1 < y0 || r.y0 > y1) continue;
    g.fillStyle = '#6c6c70'; g.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    g.fillStyle = 'rgba(0,0,0,.12)'; const hz = r.x1 - r.x0 > r.y1 - r.y0;
    if (hz) { g.fillRect(r.x0, r.y0, r.x1 - r.x0, 4); g.fillRect(r.x0, r.y1 - 4, r.x1 - r.x0, 4); } else { g.fillRect(r.x0, r.y0, 4, r.y1 - r.y0); g.fillRect(r.x1 - 4, r.y0, 4, r.y1 - r.y0); }
    g.fillStyle = '#e8d070'; if (hz) for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) g.fillRect(x, (r.y0 + r.y1) / 2 - 2, 32, 4); else for (let y = Math.floor(y0 / 60) * 60; y < y1; y += 60) g.fillRect((r.x0 + r.x1) / 2 - 2, y, 4, 32);
    for (let i = 0; i < 30; i++) { const cx = hz ? hash(i, 91) * WORLD.w : (r.x0 + r.x1) / 2 + (hash(i, 92) - .5) * 70, cy = hz ? (r.y0 + r.y1) / 2 + (hash(i, 93) - .5) * 70 : hash(i, 94) * WORLD.h; if (cx < x0 - 30 || cx > x1 + 30 || cy < y0 - 30 || cy > y1 + 30) continue; g.strokeStyle = 'rgba(30,30,30,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 10, cy + 6); g.lineTo(cx + 16, cy + 2); g.moveTo(cx + 10, cy + 6); g.lineTo(cx + 12, cy + 14); g.stroke(); }
  }
  /* chão da base: terra batida com sacos de areia nos cantos */
  const bx0 = BASE.x - BASE.half, by0 = BASE.y - BASE.half, bs = BASE.half * 2;
  if (bx0 < x1 && bx0 + bs > x0 && by0 < y1 && by0 + bs > y0) {
    g.fillStyle = '#b89c70'; g.fillRect(bx0, by0, bs, bs);
    for (let i = 0; i < 160; i++) ell(g, bx0 + hash(i, 61) * bs, by0 + hash(i, 62) * bs, 3 + hash(i, 63) * 10, 2 + hash(i, 64) * 4, hash(i, 65) < .5 ? 'rgba(120,90,50,.2)' : 'rgba(255,240,200,.12)');
    g.fillStyle = '#a08860'; g.fillRect(BASE.x - 40, by0, 80, bs); g.fillRect(bx0, BASE.y - 40, bs, 80);
    ell(g, BASE.x, BASE.y, 120, 70, 'rgba(90,70,40,.15)');
  }
  for (const d of worldDecos()) { if (d.x + d.r < x0 || d.x - d.r > x1 || d.y - 80 > y1 || d.y + 20 < y0) continue; deco(g, d); }
}

/* ---------- soldado ---------- */
export function soldier(g: Ctx2D, x: number, y: number, s: number, aim: number, t: number, moving: boolean, hurt: number, gun: string, gcol: string) {
  const st = moving ? Math.sin(t * 13) : 0, bob = moving ? Math.abs(st) * 1.2 * s : 0, L = Math.max(1, 1.1 * s);
  const face = Math.cos(aim) >= 0 ? 1 : -1;
  ell(g, x, y, 13 * s, 4.5 * s, 'rgba(0,0,0,.3)');
  g.save(); g.translate(x, y - bob);
  /* pernas */
  g.lineCap = 'round'; g.lineWidth = 5 * s; g.strokeStyle = '#3c4c2c';
  g.beginPath(); g.moveTo(-3.5 * s, -14 * s); g.lineTo(-3.5 * s + st * 5 * s, -2 * s); g.moveTo(3.5 * s, -14 * s); g.lineTo(3.5 * s - st * 5 * s, -2 * s); g.stroke();
  ell(g, -3.5 * s + st * 5 * s + face * s, -1.5 * s, 3.5 * s, 2 * s, '#2c2418'); ell(g, 3.5 * s - st * 5 * s + face * s, -1.5 * s, 3.5 * s, 2 * s, '#2c2418');
  /* corpo: colete */
  g.beginPath(); g.moveTo(-8 * s, -13 * s); g.lineTo(-7 * s, -30 * s); g.quadraticCurveTo(0, -34 * s, 7 * s, -30 * s); g.lineTo(8 * s, -13 * s); g.closePath();
  g.fillStyle = grad(g, 0, -34 * s, 0, -12 * s, [[0, '#6c8c4c'], [1, '#4c6c34']]); g.fill(); g.lineWidth = L; g.strokeStyle = '#1c2414'; g.stroke();
  box(g, -6 * s, -26 * s, 12 * s, 9 * s, 2 * s, '#5c7440', L * .6); g.fillStyle = '#3c2c1c'; g.fillRect(-8 * s, -16 * s, 16 * s, 2.5 * s);
  /* cabeça com capacete */
  circ(g, 0, -38 * s, 7 * s, '#f0c8a0', L);
  g.beginPath(); g.ellipse(0, -40.5 * s, 8.6 * s, 6.5 * s, 0, Math.PI, 0); g.closePath(); g.fillStyle = '#5c7c3c'; g.fill(); g.stroke();
  g.fillStyle = '#4c6c30'; g.fillRect(-9 * s, -41 * s, 18 * s, 2.2 * s);
  circ(g, face * 3 * s, -37 * s, 1.2 * s, '#1c1410'); circ(g, face * 5.5 * s, -34.5 * s, 1.2 * s, 'rgba(230,110,90,.5)');
  /* braços e arma apontando para o alvo */
  g.save(); g.translate(0, -24 * s); g.rotate(aim); if (face < 0) g.scale(1, -1);
  const len = gun === 'espingarda' ? 24 : gun === 'metralhadora' ? 26 : gun === 'rifle' ? 28 : 15;
  g.lineWidth = 4.5 * s; g.strokeStyle = '#5c7c3c'; g.beginPath(); g.moveTo(0, 0); g.lineTo(10 * s, 2 * s); g.stroke();
  box(g, 6 * s, -1.5 * s, len * s, 5 * s, 1.5 * s, gcol, L * .7);
  if (gun === 'metralhadora') { box(g, 10 * s, 3 * s, 5 * s, 7 * s, 1 * s, '#2c2c2c', L * .5); }
  if (gun === 'rifle') { box(g, 12 * s, -4 * s, 10 * s, 3 * s, 1 * s, '#9cd8ff', L * .5); circ(g, (6 + len) * s, 1 * s, 2.2 * s, '#bff0ff'); }
  if (gun === 'espingarda') box(g, 4 * s, 0, 6 * s, 6 * s, 1.5 * s, '#8c5c34', L * .5);
  circ(g, 10 * s, 2.5 * s, 2.6 * s, '#f0c8a0', L * .5);
  g.restore();
  if (hurt > 0) { g.globalAlpha = hurt * .6; ell(g, 0, -24 * s, 14 * s, 22 * s, '#ff3030'); g.globalAlpha = 1; }
  g.restore();
}

/* ---------- zumbi ---------- */
export function zombie(g: Ctx2D, z0: { skin: string; shirt: string; pants: string; id: string }, x: number, y: number, s: number, t: number, face: number, hit: number, die: number, attack: boolean) {
  const hl = Math.min(1, Math.max(0, hit)) * .7, z = hl > 0 ? { id: z0.id, skin: sh(z0.skin, hl), shirt: sh(z0.shirt, hl), pants: sh(z0.pants, hl) } : z0;
  const st = Math.sin(t * 7), lean = attack ? Math.sin(t * 12) * .15 : .08, L = Math.max(1, 1.1 * s);
  g.save(); g.translate(x, y);
  if (die > 0) { g.globalAlpha = 1 - die; g.rotate(face * die * 1.4); }
  ell(g, 0, 0, 13 * s, 4.5 * s, 'rgba(0,0,0,.3)');
  g.scale(face, 1);
  /* pernas arrastando */
  g.lineCap = 'round'; g.lineWidth = 5 * s; g.strokeStyle = z.pants;
  g.beginPath(); g.moveTo(-3.5 * s, -14 * s); g.lineTo(-4 * s + st * 3 * s, -2 * s); g.moveTo(3.5 * s, -14 * s); g.lineTo(3 * s - st * 3 * s, -2 * s); g.stroke();
  ell(g, -4 * s + st * 3 * s, -1.5 * s, 3.4 * s, 1.8 * s, sh(z.skin, -.3)); ell(g, 3 * s - st * 3 * s, -1.5 * s, 3.4 * s, 1.8 * s, sh(z.skin, -.3));
  g.rotate(lean);
  /* corpo com camisa rasgada */
  const fat = z.id === 'gordo' ? 1.35 : 1;
  g.beginPath(); g.moveTo(-8 * s * fat, -13 * s); g.lineTo(-7 * s * fat, -30 * s); g.quadraticCurveTo(0, -34 * s, 7 * s * fat, -30 * s); g.lineTo(8 * s * fat, -13 * s);
  for (let i = 0; i < 4; i++) g.lineTo(8 * s * fat - (i + .5) * 4 * s * fat, -13 * s + (i % 2 ? 3 : -1) * s);
  g.closePath(); g.fillStyle = grad(g, 0, -34 * s, 0, -12 * s, [[0, sh(z.shirt, .1)], [1, sh(z.shirt, -.2)]]); g.fill(); g.lineWidth = L; g.strokeStyle = '#1c2414'; g.stroke();
  ell(g, 3 * s, -22 * s, 2.5 * s, 3.5 * s, z.skin); g.fillStyle = 'rgba(80,120,40,.6)'; ell(g, -3 * s, -26 * s, 2 * s, 1.5 * s, 'rgba(90,140,50,.7)');
  if (z.id === 'chefe') { for (let i = 0; i < 4; i++) poly(g, [-6 * s + i * 4 * s, -31 * s, -4 * s + i * 4 * s, -37 * s, -2 * s + i * 4 * s, -31 * s], '#c8c8c8', L * .5); }
  /* braços esticados para frente */
  const arm = attack ? Math.sin(t * 12) * 4 * s : Math.sin(t * 3) * 1.5 * s;
  g.lineWidth = 4.2 * s; g.strokeStyle = z.skin;
  g.beginPath(); g.moveTo(2 * s, -27 * s); g.lineTo(16 * s, -26 * s + arm); g.moveTo(-1 * s, -25 * s); g.lineTo(13 * s, -22 * s - arm); g.stroke();
  circ(g, 16.5 * s, -26 * s + arm, 2.4 * s, sh(z.skin, -.1)); circ(g, 13.5 * s, -22 * s - arm, 2.4 * s, sh(z.skin, -.1));
  /* cabeça */
  const hx = 2 * s, hy = -38 * s;
  circ(g, hx, hy, 7.5 * s, z.skin, L);
  g.fillStyle = 'rgba(60,90,30,.35)'; ell(g, hx - 3 * s, hy - 3 * s, 2.5 * s, 1.8 * s, 'rgba(60,90,30,.35)');
  circ(g, hx + 3 * s, hy - 1.5 * s, 2.3 * s, '#fffbe0'); circ(g, hx + 3.4 * s, hy - 1.4 * s, 1 * s, '#c82020');
  circ(g, hx - 1.5 * s, hy - 2 * s, 1.8 * s, '#fffbe0'); circ(g, hx - 1.3 * s, hy - 1.9 * s, .8 * s, '#c82020');
  g.strokeStyle = '#2c1c14'; g.lineWidth = L; g.beginPath(); g.moveTo(hx - 1 * s, hy + 3.5 * s); g.lineTo(hx + 5 * s, hy + 3 * s); g.stroke();
  for (let i = 0; i < 3; i++) { g.fillStyle = '#fffbe0'; g.fillRect(hx + i * 2 * s - .5 * s, hy + 3 * s, 1.2 * s, 1.5 * s); }
  g.strokeStyle = sh(z.skin, -.4); g.lineWidth = 1.5 * s; g.beginPath(); g.moveTo(hx - 4 * s, hy - 6 * s); g.lineTo(hx - 2 * s, hy - 8.5 * s); g.moveTo(hx, hy - 7 * s); g.lineTo(hx + 1 * s, hy - 9.5 * s); g.stroke();
  g.restore();
}

/* ---------- muros ---------- */
/** um pedaço de muro do ponto (xa,ya) ao (xb,yb); lv 0..2; f = vida (0 = quebrado) */
export function wallPiece(g: Ctx2D, xa: number, ya: number, xb: number, yb: number, lv: number, f: number, seed: number) {
  const hz = Math.abs(yb - ya) < 1, len = Math.hypot(xb - xa, yb - ya), H = [30, 34, 38][lv];
  if (f <= 0) { /* escombros */
    for (let i = 0; i < 5; i++) { const u = (i + .5) / 5, x = xa + (xb - xa) * u + (hash(seed, i) - .5) * 10, y = ya + (yb - ya) * u + (hash(i, seed) - .5) * 8; if (lv === 0) { g.save(); g.translate(x, y); g.rotate((hash(seed, i + 5) - .5) * 2); box(g, -9, -3, 18, 5, 2, '#8c5c30', 1); g.restore(); } else boulder(g, x, y + 3, 6, seed + i); }
    return;
  }
  const n = Math.max(1, Math.round(len / (lv === 0 ? 11 : 22)));
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, x0 = xa + (xb - xa) * u0, y0 = ya + (yb - ya) * u0, x1 = xa + (xb - xa) * u1, y1 = ya + (yb - ya) * u1;
    const broken = f < .5 && hash(seed, i) > f * 2, h = H * (broken ? .55 + hash(i, seed) * .2 : 1);
    if (lv === 0) { /* estacas de madeira */
      const w = hz ? x1 - x0 : 10, cx = (x0 + x1) / 2, by = (y0 + y1) / 2 + (hz ? 0 : 5);
      ell(g, cx + 3, by + 2, w * .6, 3, 'rgba(0,0,0,.25)');
      g.fillStyle = grad(g, cx - w / 2, 0, cx + w / 2, 0, [[0, '#8c5c30'], [.5, '#b07c44'], [1, '#7c4c24']]);
      g.beginPath(); g.moveTo(cx - w / 2 + .5, by); g.lineTo(cx - w / 2 + .5, by - h); g.lineTo(cx, by - h - 7); g.lineTo(cx + w / 2 - .5, by - h); g.lineTo(cx + w / 2 - .5, by); g.closePath(); g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#3c2410'; g.stroke();
      g.strokeStyle = 'rgba(60,30,10,.4)'; g.lineWidth = .8; g.beginPath(); g.moveTo(cx - 1, by - h + 4); g.lineTo(cx - 1, by - 4); g.stroke();
      if (hz && i % 3 === 1) { g.fillStyle = '#6c4420'; g.fillRect(x0 - 4, by - h * .7, x1 - x0 + 8, 3); }
    } else if (lv === 1) { /* blocos de pedra */
      const w = hz ? x1 - x0 : 16, cx = (x0 + x1) / 2, by = (y0 + y1) / 2 + (hz ? 0 : 8);
      ell(g, cx + 3, by + 3, w * .6, 4, 'rgba(0,0,0,.25)');
      g.fillStyle = '#8c8c94'; g.fillRect(cx - w / 2, by - h, w, h); g.fillStyle = '#b4b4bc'; g.fillRect(cx - w / 2, by - h - 6, w, 7);
      for (let r = 0; r < 3; r++) { const yy = by - h + r * h / 3; g.fillStyle = r % 2 ? '#9c9ca4' : '#a8a8b0'; g.fillRect(cx - w / 2 + 1, yy + 1, w - 2, h / 3 - 2); }
      g.lineWidth = 1.2; g.strokeStyle = '#3c3c44'; g.strokeRect?.(cx - w / 2, by - h - 6, w, h + 6);
      if (broken) { g.strokeStyle = '#3c3c44'; g.beginPath(); g.moveTo(cx - 3, by - h - 6); g.lineTo(cx + 2, by - h + 6); g.lineTo(cx - 2, by - h + 12); g.stroke(); }
    } else { /* placas de metal com espetos */
      const w = hz ? x1 - x0 : 16, cx = (x0 + x1) / 2, by = (y0 + y1) / 2 + (hz ? 0 : 8);
      ell(g, cx + 3, by + 3, w * .6, 4, 'rgba(0,0,0,.25)');
      g.fillStyle = grad(g, 0, by - h, 0, by, [[0, '#a8b8c8'], [1, '#5c6c7c']]); g.fillRect(cx - w / 2, by - h, w, h);
      g.lineWidth = 1.2; g.strokeStyle = '#2c3440'; g.strokeRect?.(cx - w / 2, by - h, w, h);
      for (const ry of [.2, .8]) { circ(g, cx - w / 2 + 3, by - h * ry, 1.3, '#e0e8f0'); circ(g, cx + w / 2 - 3, by - h * ry, 1.3, '#e0e8f0'); }
      for (let k = 0; k < 3; k++) poly(g, [cx - w / 2 + k * w / 3, by - h, cx - w / 2 + (k + .5) * w / 3, by - h - 8, cx - w / 2 + (k + 1) * w / 3, by - h], '#c8d0d8', .8);
      g.fillStyle = '#e8c020'; if (i % 2) { g.fillRect(cx - w / 2 + 1, by - h * .55, w - 2, 3); }
    }
  }
}

/* ---------- abrigo ---------- */
export function shelter(g: Ctx2D, x: number, y: number, t: number, f: number, lvl: number) {
  ell(g, x + 10, y + 6, 72, 18, 'rgba(0,0,0,.3)');
  /* sacos de areia na frente */
  for (let i = 0; i < 9; i++) { const sx = x - 64 + i * 16, sy = y + 8 - (i % 2) * 2; ell(g, sx, sy, 9, 5, '#c8b07c', 1); }
  /* parede de concreto */
  g.fillStyle = grad(g, 0, y - 58, 0, y, [[0, '#a8a49c'], [1, '#7c786c']]); g.fillRect(x - 58, y - 56, 116, 56);
  poly(g, [x + 58, y, x + 76, y - 14, x + 76, y - 70, x + 58, y - 56], '#6c685c', 1.5);
  g.lineWidth = 1.5; g.strokeStyle = '#2c2a24'; g.strokeRect?.(x - 58, y - 56, 116, 56);
  g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 1; for (let r = 1; r < 4; r++) { g.beginPath(); g.moveTo(x - 58, y - 56 + r * 14); g.lineTo(x + 58, y - 56 + r * 14); g.stroke(); }
  /* teto */
  poly(g, [x - 64, y - 54, x + 62, y - 54, x + 82, y - 70, x - 44, y - 70], '#5c5850', 1.5);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x - 50, y - 68, 110, 4);
  /* porta blindada, janelinhas com luz */
  box(g, x - 13, y - 34, 26, 34, 3, '#4c5c3c', 1.5); g.fillStyle = '#3c4c2c'; g.fillRect(x - 13, y - 22, 26, 3); circ(g, x + 7, y - 16, 1.8, '#e8c040');
  for (const wx of [-40, 26]) { box(g, x + wx, y - 44, 16, 9, 2, `rgba(255,${210 + Math.sin(t * 3 + wx) * 20},120,1)`, 1.2); g.fillStyle = '#2c2a24'; g.fillRect(x + wx + 7, y - 44, 2, 9); }
  /* bandeira e antena */
  g.strokeStyle = '#3c3c3c'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 40, y - 70); g.lineTo(x - 40, y - 118); g.stroke();
  const wv = Math.sin(t * 4) * 3; poly(g, [x - 39, y - 118, x - 8, y - 113 + wv, x - 39, y - 100], '#e04838', 1);
  g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 44, y - 70); g.lineTo(x + 44, y - 100); g.stroke(); circ(g, x + 44, y - 101, 3, (t % 1) < .5 ? '#ff4040' : '#802020');
  if (lvl > 1) { for (let i = 0; i < Math.min(lvl - 1, 6); i++) box(g, x - 56 + i * 19, y - 76, 16, 6, 2, '#7c9c5c', 1); }
  /* fumaça quando está machucado */
  if (f < .5) for (let i = 0; i < 4; i++) { const p = (t * .4 + i / 4) % 1; circ(g, x + 20 + Math.sin(p * 6 + i) * 8, y - 72 - p * 60, 7 + p * 12, `rgba(60,60,60,${(.55 - p * .5) * (1 - f * 1.5)})`); }
  if (f < .25) for (let i = 0; i < 3; i++) { const fl = Math.sin(t * 15 + i * 2) * 3; poly(g, [x - 20 + i * 20, y - 56, x - 15 + i * 20 + fl, y - 74 - i * 3, x - 10 + i * 20, y - 56], '#ff8020'); }
}

/* ---------- torre de tiro ---------- */
export function turret(g: Ctx2D, x: number, y: number, lvl: number, ang: number, t: number, flash: number) {
  if (lvl <= 0) { g.setLineDash?.([6, 5]); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(x, y, 30, 16, 0, 0, TAU); g.stroke(); g.setLineDash?.([]); text(g, '+', x, y - 2, 26, '#fff', 3); return; }
  ell(g, x + 4, y + 4, 32, 12, 'rgba(0,0,0,.3)');
  /* sacos de areia em roda */
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, sx = x + Math.cos(a) * 24, sy = y + Math.sin(a) * 11; if (Math.sin(a) < 0) ell(g, sx, sy - 4, 9, 5.5, '#c8b07c', 1); }
  /* torre: base de metal */
  const c = ['#6c7c5c', '#6c7c5c', '#5c7c9c', '#8c6cb8', '#c8a030'][lvl];
  g.fillStyle = grad(g, x - 14, 0, x + 14, 0, [[0, sh(c, -.25)], [.5, sh(c, .15)], [1, sh(c, -.3)]]); g.fillRect(x - 13, y - 22, 26, 20); ell(g, x, y - 22, 13, 6, sh(c, .2), 1.3);
  g.lineWidth = 1.3; g.strokeStyle = '#1c2414'; g.strokeRect?.(x - 13, y - 22, 26, 20);
  /* cano girando para o alvo */
  g.save(); g.translate(x, y - 26); g.rotate(ang); const bl = 20 + lvl * 3;
  box(g, -7, -6, 14, 12, 3, sh(c, -.1), 1.2);
  for (let b = 0; b < (lvl >= 3 ? 2 : 1); b++) box(g, 4, (lvl >= 3 ? -4.5 + b * 5 : -2), bl, 4, 1.5, '#3c3c40', 1);
  if (flash > 0) { g.globalAlpha = flash; poly(g, [bl + 4, -6, bl + 18, 0, bl + 4, 6], '#ffe060'); circ(g, bl + 6, 0, 5, '#fff8c0'); g.globalAlpha = 1; }
  g.restore();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, sx = x + Math.cos(a) * 24, sy = y + Math.sin(a) * 11; if (Math.sin(a) >= 0) ell(g, sx, sy - 4, 9, 5.5, '#d8c08c', 1); }
  for (let i = 0; i < lvl; i++) text(g, '★', x - (lvl - 1) * 6 + i * 12, y + 16, 11, '#ffd040', 2.5);
}

/* ---------- moeda, explosão ---------- */
export function coin(g: Ctx2D, x: number, y: number, t: number, s = 1, big = false) {
  const sp = Math.abs(Math.cos(t * 4)) * .8 + .2, r = (big ? 9 : 6.5) * s, hop = Math.abs(Math.sin(t * 3)) * 3 * s;
  ell(g, x, y + 1, r * .9, r * .35, 'rgba(0,0,0,.25)');
  ell(g, x, y - r - hop, r * sp, r, '#c89018'); ell(g, x, y - r - hop, r * sp * .78, r * .78, '#ffd040');
  if (sp > .5) text(g, '$', x, y - r - hop + .5, r * 1.3, '#c89018');
  ell(g, x - r * .3 * sp, y - r * 1.4 - hop, r * .2 * sp, r * .25, 'rgba(255,255,255,.8)');
}
export function boom(g: Ctx2D, x: number, y: number, f: number, R: number) {
  const r = R * (.3 + f * .9);
  g.globalAlpha = 1 - f; circ(g, x, y, r, '#ff9020'); circ(g, x, y, r * .65, '#ffd040'); circ(g, x, y, r * .3, '#fff8d0');
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + f; circ(g, x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * .7, R * .18 * (1 - f), '#5c5c5c'); }
  g.globalAlpha = 1;
}

/* ---------- imagens para as telas ---------- */
type MkCanvas = (w: number, h: number) => OffCanvas;
let mk: MkCanvas = () => { throw new Error('sem canvas'); };
export function setCanvasMaker(f: MkCanvas) { mk = f; }
export function makeCanvas(w: number, h: number) { return mk(w, h); }
const imgCache: { [k: string]: string } = {};
import { ZOMBIES, GUNS } from './data';
export function iconImage(kind: string, id: string, size = 96, lvl = 1): string {
  const key = kind + id + size + '-' + lvl; if (imgCache[key] != null) return imgCache[key];
  let out = '';
  try {
    const c = mk(size, size), g = c.getContext('2d'), u = size / 100;
    g.save(); g.scale(u, u);
    if (kind === 'gun') { const G = GUNS.find(x => x.id === id)!; g.translate(8, 60); g.rotate(-.35); const len = id === 'espingarda' ? 62 : id === 'metralhadora' ? 70 : id === 'rifle' ? 76 : 40; box(g, 0, -8, len, 14, 4, G.col, 2.5); box(g, 6, 4, 12, 22, 3, sh(G.col, -.25), 2.5); if (id === 'metralhadora') box(g, 30, 4, 12, 18, 2, '#2c2c2c', 2); if (id === 'rifle') { box(g, 24, -16, 30, 8, 2, '#9cd8ff', 2); circ(g, len, -1, 6, '#bff0ff', 2); } if (id === 'espingarda') box(g, 34, 4, 22, 8, 3, '#8c5c34', 2); }
    else if (kind === 'zombie') { zombie(g, ZOMBIES[id], 50, 92, 1.9 / Math.max(1, ZOMBIES[id].size * .75), 1, 1, 0, 0, false); }
    else if (kind === 'turret') turret(g, 50, 78, Math.max(1, lvl), -.4, 0, 0);
    else if (kind === 'wall') { wallPiece(g, 10, 78, 90, 78, lvl, 1, 3); }
    else if (kind === 'shelter') { g.translate(50, 85); g.scale(.62, .62); shelter(g, 0, 0, 0, 1, 1); }
    else if (kind === 'coin') coin(g, 50, 82, 0, 4.2, true);
    else if (kind === 'upg') upgIcon(g, id);
    g.restore();
    out = c.toDataURL ? c.toDataURL('image/png') : '';
  } catch (e) { console.warn('iconImage', kind, id, e); }
  imgCache[key] = out; return out;
}
function upgIcon(g: Ctx2D, id: string) {
  circ(g, 50, 50, 42, { dano: '#e05040', cadencia: '#f0a020', vida: '#e8486c', ima: '#4c8ce0', abrigo: '#7c8c6c', granada: '#5c7c3c' }[id] || '#888', 3);
  if (id === 'dano') { poly(g, [50, 18, 60, 42, 84, 42, 64, 56, 72, 80, 50, 66, 28, 80, 36, 56, 16, 42, 40, 42], '#ffe060', 2.5); }
  else if (id === 'cadencia') { poly(g, [58, 14, 30, 54, 48, 54, 40, 86, 72, 42, 54, 42], '#fff4b0', 2.5); }
  else if (id === 'vida') { g.beginPath(); g.moveTo(50, 78); g.bezierCurveTo(10, 50, 22, 18, 50, 36); g.bezierCurveTo(78, 18, 90, 50, 50, 78); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); }
  else if (id === 'ima') { g.lineWidth = 16; g.strokeStyle = '#e04040'; g.beginPath(); g.arc(50, 46, 20, Math.PI, 0); g.stroke(); g.fillStyle = '#e8e8f0'; g.fillRect(22, 44, 16, 14); g.fillRect(62, 44, 16, 14); coin(g, 50, 84, 0, 1.4); }
  else if (id === 'abrigo') { box(g, 24, 40, 52, 34, 4, '#a8a49c', 2.5); poly(g, [20, 42, 50, 22, 80, 42], '#5c5850', 2.5); box(g, 44, 54, 12, 20, 2, '#4c5c3c', 2); }
  else if (id === 'granada') { circ(g, 50, 56, 22, '#4c6c34', 2.5); box(g, 42, 26, 16, 12, 3, '#8c8c94', 2); g.lineWidth = 3; g.strokeStyle = '#c8c8d0'; g.beginPath(); g.arc(62, 30, 8, -1.5, 1.5); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(30, 56); g.lineTo(70, 56); g.moveTo(50, 36); g.lineTo(50, 76); g.stroke(); }
}
