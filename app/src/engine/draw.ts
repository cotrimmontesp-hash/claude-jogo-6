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
const nearBase = (x: number, y: number, m: number) => Math.abs(x - BASE.x) < 410 + m && Math.abs(y - BASE.y) < 410 + m;
/** aparência do chão da base (nível do centro) */
let baseLv = 0;
export function setBaseLook(lv: number) { baseLv = lv; }
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
  /* chão da base: muda com o nível do centro */
  const bx0 = BASE.x - BASE.half, by0 = BASE.y - BASE.half, bs = BASE.half * 2;
  if (bx0 < x1 && bx0 + bs > x0 && by0 < y1 && by0 + bs > y0) {
    if (baseLv === 0) {
      g.fillStyle = '#b89c70'; g.fillRect(bx0, by0, bs, bs);
      for (let i = 0; i < 200; i++) ell(g, bx0 + hash(i, 61) * bs, by0 + hash(i, 62) * bs, 3 + hash(i, 63) * 10, 2 + hash(i, 64) * 4, hash(i, 65) < .5 ? 'rgba(120,90,50,.2)' : 'rgba(255,240,200,.12)');
      g.fillStyle = '#a08860'; g.fillRect(BASE.x - 40, by0, 80, bs); g.fillRect(bx0, BASE.y - 40, bs, 80);
    } else if (baseLv === 1) {
      g.fillStyle = '#b4a078'; g.fillRect(bx0, by0, bs, bs);
      for (let i = 0; i < 700; i++) circ(g, bx0 + hash(i, 61) * bs, by0 + hash(i, 62) * bs, 1 + hash(i, 63) * 2.4, ['#8c8478', '#a8a090', '#7c7468', '#c8bca8'][i % 4]);
      g.fillStyle = '#c8b48c'; g.fillRect(BASE.x - 46, by0, 92, bs); g.fillRect(bx0, BASE.y - 46, bs, 92);
      for (let i = 0; i < 24; i++) { const u = i / 24; for (const [px, py] of [[bx0 + 14, by0 + u * bs], [bx0 + bs - 14, by0 + u * bs]]) box(g, px - 7, py - 4, 14, 8, 2, '#9c8c70'); }
    } else if (baseLv === 2) {
      g.fillStyle = '#a8a49c'; g.fillRect(bx0, by0, bs, bs);
      const T = 34;
      for (let r = 0; r * T < bs; r++) for (let c = -1; c * T < bs; c++) { const ox = (r % 2) * T / 2; g.fillStyle = ['#b8b4ac', '#a4a098', '#aca8a0', '#9c988c'][(r * 7 + c * 3) & 3]; g.fillRect(bx0 + c * T + ox + 1, by0 + r * T + 1, T - 2, T - 2); }
      g.fillStyle = 'rgba(80,60,30,.25)'; g.fillRect(BASE.x - 50, by0, 100, bs); g.fillRect(bx0, BASE.y - 50, bs, 100);
      for (let i = 0; i < 40; i++) { const x = bx0 + hash(i, 71) * bs, y = by0 + hash(i, 72) * bs; g.strokeStyle = 'rgba(70,110,40,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 5); g.moveTo(x, y); g.lineTo(x + 2, y - 4); g.stroke(); }
    } else {
      g.fillStyle = '#9ca0a4'; g.fillRect(bx0, by0, bs, bs);
      const T = 90; g.strokeStyle = 'rgba(60,60,70,.35)'; g.lineWidth = 2;
      for (let k = 0; k <= bs; k += T) { g.beginPath(); g.moveTo(bx0 + k, by0); g.lineTo(bx0 + k, by0 + bs); g.moveTo(bx0, by0 + k); g.lineTo(bx0 + bs, by0 + k); g.stroke(); }
      for (let i = 0; i < 90; i++) ell(g, bx0 + hash(i, 81) * bs, by0 + hash(i, 82) * bs, 6 + hash(i, 83) * 14, 3 + hash(i, 84) * 5, 'rgba(255,255,255,.06)');
      g.fillStyle = '#e8c020'; for (let k = 20; k < bs; k += 40) { g.fillRect(BASE.x - 54, by0 + k, 4, 20); g.fillRect(BASE.x + 50, by0 + k, 4, 20); g.fillRect(bx0 + k, BASE.y - 54, 20, 4); g.fillRect(bx0 + k, BASE.y + 50, 20, 4); }
      /* heliponto */
      const hx = BASE.x + BASE.half * .55, hy = BASE.y - BASE.half * .5;
      circ(g, hx, hy, 46, '#5c6068'); g.lineWidth = 4; g.strokeStyle = '#e8e8e8'; g.beginPath(); g.arc(hx, hy, 40, 0, TAU); g.stroke(); text(g, 'H', hx, hy + 2, 40, '#e8e8e8');
    }
    ell(g, BASE.x, BASE.y - 20, 150 + baseLv * 30, 80 + baseLv * 16, 'rgba(90,70,40,.12)');
  }
  for (const d of worldDecos()) { if (d.x + d.r < x0 || d.x - d.r > x1 || d.y - 80 > y1 || d.y + 20 < y0) continue; deco(g, d); }
}

/* ---------- soldado ---------- */
export function soldier(g: Ctx2D, x: number, y: number, s: number, aim: number, t: number, moving: boolean, hurt: number, gun: string, gcol: string, flash = 0, uni = '#6c8c4c') {
  const U0 = sh(uni, -.25), U1 = sh(uni, .12), U2 = sh(uni, -.35), UV = sh(uni, -.12), UP = sh(uni, -.25), UH1 = sh(uni, .1), UH2 = sh(uni, -.25), UHB = sh(uni, -.4), UA = sh(uni, -.1);
  const st = moving ? Math.sin(t * 13) : 0, bob = moving ? Math.abs(st) * 1.2 * s : 0, L = Math.max(1, 1.1 * s), ink = '#1c2414';
  const face = Math.cos(aim) >= 0 ? 1 : -1, back = Math.sin(aim) < -.35;
  ell(g, x, y, 14 * s, 5 * s, 'rgba(0,0,0,.32)');
  g.save(); g.translate(x, y - bob);
  /* pernas com botas */
  g.lineCap = 'round';
  for (const [lx, ph] of [[-3.5, 1], [3.5, -1]]) { const fx = lx * s + st * ph * 5 * s; g.lineWidth = 5.4 * s; g.strokeStyle = U2; g.beginPath(); g.moveTo(lx * s, -15 * s); g.lineTo(fx, -4 * s); g.stroke(); box(g, fx - 3.2 * s + face * .8 * s, -5 * s, 6.4 * s, 5 * s, 1.6 * s, '#3c2c1c', L * .6); }
  /* mochila (aparece atrás) */
  if (!back) box(g, -face * 9.5 * s - 4 * s, -31 * s, 8 * s, 14 * s, 2.5 * s, '#5c4c30', L * .7);
  /* corpo: farda e colete */
  g.beginPath(); g.moveTo(-8.5 * s, -13 * s); g.lineTo(-7.5 * s, -31 * s); g.quadraticCurveTo(0, -35 * s, 7.5 * s, -31 * s); g.lineTo(8.5 * s, -13 * s); g.closePath();
  g.fillStyle = grad(g, -8 * s, 0, 8 * s, 0, [[0, U0], [.45, U1], [1, U2]]); g.fill(); g.lineWidth = L; g.strokeStyle = ink; g.stroke();
  box(g, -6.5 * s, -28 * s, 13 * s, 12 * s, 2.5 * s, UV, L * .6);
  for (const px of [-4.5, 0, 4.5]) box(g, px * s - 1.8 * s, -21 * s, 3.6 * s, 4 * s, 1 * s, UP, L * .4);
  g.fillStyle = '#3c2c1c'; g.fillRect(-8.5 * s, -16 * s, 17 * s, 2.6 * s); box(g, -1.6 * s, -16.4 * s, 3.2 * s, 3.4 * s, .8 * s, '#c8a040');
  if (back) box(g, -5 * s, -32 * s, 10 * s, 15 * s, 2.5 * s, '#5c4c30', L * .7);
  /* cabeça com capacete e óculos de proteção */
  circ(g, 0, -39 * s, 7.2 * s, '#f0c8a0', L);
  if (!back) { circ(g, face * 3.2 * s, -38.5 * s, 1.3 * s, '#1c1410'); circ(g, face * 3.6 * s, -38.9 * s, .45 * s, '#fff'); g.strokeStyle = '#8c5c3c'; g.lineWidth = .9 * s; g.beginPath(); g.moveTo(face * 1.8 * s, -35 * s); g.lineTo(face * 4.6 * s, -35.3 * s); g.stroke(); circ(g, face * 5.6 * s, -36.3 * s, 1.2 * s, 'rgba(230,110,90,.45)'); }
  g.beginPath(); g.ellipse(0, -41.5 * s, 9 * s, 7 * s, 0, Math.PI, 0); g.closePath(); g.fillStyle = grad(g, 0, -49 * s, 0, -41 * s, [[0, UH1], [1, UH2]]); g.fill(); g.lineWidth = L; g.strokeStyle = ink; g.stroke();
  g.fillStyle = UHB; g.fillRect(-9.6 * s, -42 * s, 19.2 * s, 2.4 * s);
  box(g, -5 * s, -47.5 * s, 10 * s, 3.4 * s, 1.5 * s, '#3c3c3c', L * .4); circ(g, -2.4 * s, -45.8 * s, 1.3 * s, '#9cd0f0'); circ(g, 2.4 * s, -45.8 * s, 1.3 * s, '#9cd0f0');
  /* braços e arma apontando para o alvo (com recuo e clarão) */
  g.save(); g.translate(0, -25 * s); g.rotate(aim); if (face < 0) g.scale(1, -1);
  const len = gun === 'espingarda' ? 24 : gun === 'metralhadora' ? 26 : gun === 'rifle' ? 28 : 15, rc = -flash * 2.5 * s;
  g.translate(rc, 0);
  g.lineWidth = 4.8 * s; g.strokeStyle = UA; g.beginPath(); g.moveTo(-2 * s, -1 * s); g.lineTo(10 * s, 2 * s); g.stroke();
  box(g, 6 * s, -1.6 * s, len * s, 5.2 * s, 1.5 * s, gcol, L * .7); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(7 * s, -1.2 * s, (len - 2) * s, 1.4 * s);
  if (gun === 'metralhadora') box(g, 10 * s, 3 * s, 5 * s, 7.5 * s, 1 * s, '#2c2c2c', L * .5);
  if (gun === 'rifle') { box(g, 12 * s, -4.2 * s, 10 * s, 3 * s, 1 * s, '#9cd8ff', L * .5); circ(g, (6 + len) * s, 1 * s, 2.3 * s, '#bff0ff'); }
  if (gun === 'espingarda') box(g, 4 * s, 0, 6 * s, 6 * s, 1.5 * s, '#8c5c34', L * .5);
  box(g, 12 * s, 3 * s, 3.6 * s, 5 * s, 1 * s, '#2c2c2c', L * .4);
  circ(g, 10 * s, 2.5 * s, 2.7 * s, '#f0c8a0', L * .5);
  if (flash > 0) { const fx = (6 + len) * s; g.globalAlpha = flash; poly(g, [fx, -5 * s, fx + 16 * s, 0, fx, 5 * s, fx + 5 * s, 0], gun === 'rifle' ? '#9cf0ff' : '#ffd040'); circ(g, fx + 3 * s, 0, 4.5 * s, '#fff8d0'); g.globalAlpha = 1; }
  g.restore();
  if (hurt > 0) { g.globalAlpha = hurt * .55; ell(g, 0, -26 * s, 15 * s, 24 * s, '#ff3030'); g.globalAlpha = 1; }
  g.restore();
}

/* ---------- sobrevivente (pede socorro, segue, depois vira ajudante) ---------- */
export function civil(g: Ctx2D, x: number, y: number, s: number, t: number, seed: number, mode: string, aim = 0, flash = 0) {
  const shirt = ['#e05a4c', '#4c8ce0', '#f0b030', '#9c6cf0', '#3cb0a0', '#e07cb0'][seed % 6], hair = ['#3c2818', '#8c5c2c', '#1c1c1c', '#d8a848', '#c84c2c'][seed % 5], skin = ['#f8d4b0', '#e8b088', '#c08860', '#8c5c3c'][seed % 4];
  const moving = mode === 'follow' || mode === 'walk', st = moving ? Math.sin(t * 12) : 0, L = Math.max(1, s);
  const face = Math.cos(aim) >= 0 ? 1 : -1;
  ell(g, x, y, 11 * s, 4 * s, 'rgba(0,0,0,.3)');
  g.save(); g.translate(x, y - (moving ? Math.abs(st) * s : 0));
  g.lineCap = 'round'; g.lineWidth = 4.6 * s; g.strokeStyle = '#3c4c6c';
  g.beginPath(); g.moveTo(-3 * s, -13 * s); g.lineTo(-3 * s + st * 4 * s, -2 * s); g.moveTo(3 * s, -13 * s); g.lineTo(3 * s - st * 4 * s, -2 * s); g.stroke();
  box(g, -7 * s, -28 * s, 14 * s, 16 * s, 4 * s, shirt, L);
  circ(g, 0, -34 * s, 6.4 * s, skin, L);
  g.beginPath(); g.arc(0, -35 * s, 6.6 * s, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = hair; g.fill();
  circ(g, face * 2.4 * s, -34 * s, 1 * s, '#1c1410');
  if (mode === 'help') {
    const w = Math.sin(t * 9);
    g.lineWidth = 3.6 * s; g.strokeStyle = shirt;
    g.beginPath(); g.moveTo(-5 * s, -26 * s); g.lineTo(-10 * s + w * 2 * s, -42 * s); g.moveTo(5 * s, -26 * s); g.lineTo(10 * s - w * 2 * s, -42 * s); g.stroke();
    circ(g, -10 * s + w * 2 * s, -43 * s, 2.2 * s, skin); circ(g, 10 * s - w * 2 * s, -43 * s, 2.2 * s, skin);
    g.beginPath(); g.ellipse(face * 1 * s, -30.5 * s, 1.6 * s, 1.4 * s, 0, 0, TAU); g.fillStyle = '#5c1c14'; g.fill();
  } else if (mode === 'ally') {
    g.save(); g.translate(0, -22 * s); g.rotate(aim); if (face < 0) g.scale(1, -1);
    g.lineWidth = 3.6 * s; g.strokeStyle = shirt; g.beginPath(); g.moveTo(0, 0); g.lineTo(8 * s, 1 * s); g.stroke();
    box(g, 6 * s, -1.4 * s, 13 * s, 4 * s, 1.2 * s, '#4c4c54', L * .6); circ(g, 8 * s, 1.5 * s, 2 * s, skin);
    if (flash > 0) { g.globalAlpha = flash; poly(g, [19 * s, -3.5 * s, 29 * s, 0, 19 * s, 3.5 * s], '#ffd040'); g.globalAlpha = 1; }
    g.restore();
  } else { g.lineWidth = 3.6 * s; g.strokeStyle = shirt; g.beginPath(); g.moveTo(-5 * s, -25 * s); g.lineTo(-6 * s - st * 3 * s, -15 * s); g.moveTo(5 * s, -25 * s); g.lineTo(6 * s + st * 3 * s, -15 * s); g.stroke(); }
  g.restore();
}

/* ---------- zumbi ---------- */
export function zombie(g: Ctx2D, z0: { skin: string; shirt: string; pants: string; id: string }, x: number, y: number, s: number, t: number, face: number, hit: number, die: number, attack: boolean) {
  const hl = Math.min(1, Math.max(0, hit)) * .7, z = hl > 0 ? { id: z0.id, skin: sh(z0.skin, hl), shirt: sh(z0.shirt, hl), pants: sh(z0.pants, hl) } : z0;
  const st = Math.sin(t * 7), lean = attack ? Math.sin(t * 12) * .15 : .1, L = Math.max(1, 1.1 * s), ink = '#1c2414';
  g.save(); g.translate(x, y);
  if (die > 0) { g.globalAlpha = Math.max(0, 1 - die); g.translate(0, die * 4 * s); g.rotate(face * die * 1.45); }
  ell(g, 0, 0, 13 * s, 4.5 * s, 'rgba(0,0,0,.32)');
  g.scale(face, 1);
  /* pernas arrastando, uma calça rasgada */
  g.lineCap = 'round';
  for (const [lx, ph] of [[-3.5, 1], [3.5, -1]]) { const fx = lx * s + st * ph * 3.2 * s; g.lineWidth = 5.4 * s; g.strokeStyle = z.pants; g.beginPath(); g.moveTo(lx * s, -15 * s); g.lineTo(fx, -4 * s); g.stroke(); g.lineWidth = 3.6 * s; g.strokeStyle = z.skin; g.beginPath(); g.moveTo(fx, -5 * s); g.lineTo(fx, -2 * s); g.stroke(); ell(g, fx + .8 * s, -1.4 * s, 3.4 * s, 1.8 * s, sh(z.skin, -.35)); }
  g.rotate(lean);
  /* braço de trás */
  const arm = attack ? Math.sin(t * 12) * 4 * s : Math.sin(t * 3) * 1.5 * s;
  const armP = (sx: number, sy: number, ex: number, ey: number, hx: number, hy: number, c: string) => { g.lineWidth = 4.4 * s; g.strokeStyle = c; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke(); circ(g, hx + 1 * s, hy, 2.6 * s, sh(c, -.08)); for (let f = 0; f < 3; f++) { g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(hx + 2 * s, hy - 1.5 * s + f * 1.5 * s); g.lineTo(hx + 4.6 * s, hy - 1.8 * s + f * 1.8 * s); g.stroke(); } };
  armP(-1 * s, -26 * s, 7 * s, -23 * s, 14 * s, -21 * s - arm, sh(z.skin, -.12));
  /* corpo com camisa rasgada e manchas */
  const fat = z.id === 'gordo' ? 1.35 : z.id === 'chefe' ? 1.2 : 1;
  const body = () => { g.beginPath(); g.moveTo(-8 * s * fat, -13 * s); g.lineTo(-7 * s * fat, -30 * s); g.quadraticCurveTo(0, -34.5 * s, 7 * s * fat, -30 * s); g.lineTo(8 * s * fat, -13 * s); for (let i = 0; i < 5; i++) g.lineTo(8 * s * fat - (i + .5) * 3.2 * s * fat, -13 * s + (i % 2 ? 3.5 : -1.5) * s); g.closePath(); };
  body(); g.fillStyle = grad(g, -8 * s, 0, 8 * s, 0, [[0, sh(z.shirt, -.15)], [.45, sh(z.shirt, .12)], [1, sh(z.shirt, -.25)]]); g.fill();
  if (g.clip) { g.save(); body(); g.clip(); ell(g, 3 * s, -21 * s, 3 * s, 4 * s, z.skin); for (let r = 0; r < 3; r++) { g.strokeStyle = 'rgba(80,110,60,.6)'; g.lineWidth = .8 * s; g.beginPath(); g.moveTo(1 * s, -23.5 * s + r * 2 * s); g.lineTo(5 * s, -23.5 * s + r * 2 * s); g.stroke(); } ell(g, -4 * s, -26 * s, 3 * s, 2 * s, 'rgba(70,110,40,.55)'); ell(g, -2 * s, -17 * s, 4 * s, 2.4 * s, 'rgba(60,40,20,.25)'); g.restore(); }
  body(); g.lineWidth = L; g.strokeStyle = ink; g.stroke();
  if (z.id === 'chefe') { for (let i = 0; i < 4; i++) poly(g, [-6 * s + i * 4 * s, -31 * s, -4 * s + i * 4 * s, -38 * s, -2 * s + i * 4 * s, -31 * s], '#d8d8d8', L * .5); g.fillStyle = '#3c3c3c'; g.fillRect(-8 * s * fat, -18 * s, 16 * s * fat, 2.5 * s); }
  /* braço da frente esticado */
  armP(2 * s, -28 * s, 10 * s, -27 * s, 17 * s, -26 * s + arm, z.skin);
  /* cabeça torta com cabelo ralo */
  const hx = 2.5 * s, hy = -39 * s;
  g.save(); g.translate(hx, hy); g.rotate(.18 + (attack ? Math.sin(t * 12) * .08 : 0));
  circ(g, 0, 0, 7.8 * s, z.skin, L);
  ell(g, -3 * s, -3.5 * s, 2.8 * s, 2 * s, 'rgba(60,90,30,.35)'); ell(g, 2 * s, 4.5 * s, 3 * s, 1.5 * s, 'rgba(60,90,30,.3)');
  circ(g, 3.2 * s, -1.2 * s, 2.5 * s, '#fffbe0'); circ(g, 3.6 * s, -1.1 * s, 1.1 * s, '#d02020');
  circ(g, -1.6 * s, -1.6 * s, 1.9 * s, '#fffbe0'); circ(g, -1.4 * s, -1.5 * s, .8 * s, '#d02020');
  g.strokeStyle = ink; g.lineWidth = 1.1 * s; g.beginPath(); g.moveTo(-2.5 * s, -4.4 * s); g.lineTo(-.5 * s, -3.6 * s); g.moveTo(1.8 * s, -3.8 * s); g.lineTo(5 * s, -4.4 * s); g.stroke();
  /* boca aberta com dentes */
  g.beginPath(); g.ellipse(2 * s, 4 * s, 3.4 * s, attack ? 2.4 * s : 1.6 * s, 0, 0, TAU); g.fillStyle = '#3c1410'; g.fill();
  for (let i = 0; i < 3; i++) { g.fillStyle = '#fffbe0'; g.fillRect(.2 * s + i * 1.6 * s, 2.6 * s, 1.1 * s, 1.3 * s); }
  g.strokeStyle = sh(z.skin, -.45); g.lineWidth = 1.4 * s; g.beginPath(); for (const [a, b] of [[-5, -5.5], [-2, -7.2], [1.5, -7.6], [4.5, -6.2]]) { g.moveTo(a * s, b * s); g.lineTo(a * s - 1 * s, b * s - 2.8 * s); } g.stroke();
  g.restore();
  g.restore();
}

/* ---------- marcas no chão e plaquinhas de preço ---------- */
export function decalDraw(g: Ctx2D, k: string, x: number, y: number, r: number, s: number, t: number) {
  if (k === 'goo') { const a = Math.min(1, (25 - t) / 5) * .75; g.globalAlpha = a; ell(g, x, y, 16 * s, 6 * s, '#5c9c2c', 0, r * .1); for (let i = 0; i < 5; i++) { const aa = r + i * 1.3; circ(g, x + Math.cos(aa) * 16 * s, y + Math.sin(aa) * 6 * s, (2 + (i % 3)) * s, '#6cb034'); } ell(g, x - 3 * s, y - 1.5 * s, 6 * s, 2 * s, 'rgba(200,255,150,.35)'); g.globalAlpha = 1; }
  else { const a = Math.min(1, (6 - t) / 2); g.globalAlpha = a; g.save(); g.translate(x, y); g.rotate(r); box(g, -2.4, -1, 4.8, 2, .8, '#e0b040'); g.restore(); g.globalAlpha = 1; }
}
export function priceTag(g: Ctx2D, x: number, y: number, price: number, ok: boolean, label: string, t: number) {
  const b = Math.sin(t * 3) * 2, txt = String(price);
  g.font = '15px "Lilita One","Arial Black",sans-serif'; const lw = label ? g.measureText(label + ' ').width : 0, tw = g.measureText(txt).width + lw;
  const w = tw + 30, h = 24, x0 = x - w / 2, y0 = y + b - h / 2;
  box(g, x0, y0 + 3, w, h, 12, 'rgba(0,0,0,.35)'); box(g, x0, y0, w, h, 12, ok ? '#3c8c2c' : 'rgba(40,30,20,.85)', 2);
  coin(g, x0 + 13, y0 + h - 3, 0, .95);
  if (label) text(g, label, x0 + 24, y0 + h / 2 + 1, 14, '#fff', 0, 'left');
  text(g, txt, x0 + 24 + lw, y0 + h / 2 + 1, 15, ok ? '#fff8c0' : '#ffd060', 0, 'left');
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
export function shelter(g: Ctx2D, x: number, y: number, t: number, f: number, lvl: number, blv = 0) {
  if (blv >= 2) { fortress(g, x, y, t, f, blv); return; }
  if (blv === 1) { /* torre de vigia de madeira e caixotes */
    const tx = x - 104, ty = y - 4; ell(g, tx + 6, ty + 4, 22, 7, 'rgba(0,0,0,.28)');
    g.strokeStyle = '#7c5430'; g.lineWidth = 5; g.beginPath(); g.moveTo(tx - 14, ty); g.lineTo(tx - 10, ty - 90); g.moveTo(tx + 14, ty); g.lineTo(tx + 10, ty - 90); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(tx - 13, ty - 20); g.lineTo(tx + 12, ty - 60); g.moveTo(tx + 13, ty - 20); g.lineTo(tx - 12, ty - 60); g.stroke();
    box(g, tx - 20, ty - 104, 40, 16, 2, '#a8743c', 1.5); poly(g, [tx - 24, ty - 104, tx, ty - 124, tx + 24, ty - 104], '#6c4424', 1.5);
    for (const [cx, cy] of [[x + 100, y + 4], [x + 112, y - 14], [x + 124, y + 6]]) { box(g, cx - 10, cy - 18, 20, 18, 2, '#b8884c', 1.3); g.strokeStyle = '#7c5430'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 10, cy - 18); g.lineTo(cx + 10, cy); g.moveTo(cx + 10, cy - 18); g.lineTo(cx - 10, cy); g.stroke(); }
  }
  ell(g, x + 12, y + 8, 84, 22, 'rgba(0,0,0,.32)');
  /* gerador ao lado */
  box(g, x + 64, y - 22, 26, 22, 3, '#c8a030', 1.5); g.fillStyle = '#2c2c2c'; for (let i = 0; i < 4; i++) g.fillRect(x + 67 + i * 5.5, y - 18, 3, 10); circ(g, x + 84, y - 26, 2.5, (t % 1) < .5 ? '#40ff60' : '#105020');
  /* parede de concreto com faixa de perigo */
  g.fillStyle = grad(g, x - 62, 0, x + 62, 0, [[0, '#8c887c'], [.5, '#b4b0a4'], [1, '#848074']]); g.fillRect(x - 62, y - 60, 124, 60);
  poly(g, [x + 62, y, x + 82, y - 15, x + 82, y - 75, x + 62, y - 60], '#6c685c', 1.5);
  for (let i = 0; i < 12; i++) poly(g, [x - 62 + i * 10.4, y - 8, x - 56 + i * 10.4, y - 8, x - 62 + i * 10.4 + 10, y, x - 62 + i * 10.4 + 4, y], i % 2 ? '#2c2c2c' : '#f0c020');
  g.fillStyle = 'rgba(0,0,0,.18)'; for (const cx of [-50, -20, 20, 50]) g.fillRect(x + cx - 1, y - 60, 2, 52);
  g.lineWidth = 1.5; g.strokeStyle = '#2c2a24'; g.strokeRect?.(x - 62, y - 60, 124, 60);
  /* teto de zinco ondulado */
  poly(g, [x - 68, y - 58, x + 66, y - 58, x + 88, y - 76, x - 46, y - 76], '#7c8088', 1.5);
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.2; for (let i = 0; i < 14; i++) { const u = i / 14; g.beginPath(); g.moveTo(x - 66 + u * 132, y - 58); g.lineTo(x - 44 + u * 132, y - 76); g.stroke(); }
  /* porta blindada e janelinhas com grade */
  box(g, x - 15, y - 38, 30, 38, 3, '#4c5c3c', 1.5); g.fillStyle = '#3c4c2c'; g.fillRect(x - 15, y - 26, 30, 3); g.fillRect(x - 15, y - 14, 30, 3); circ(g, x + 9, y - 19, 2, '#e8c040');
  for (const wx of [-48, 30]) { box(g, x + wx, y - 48, 18, 11, 2, `rgba(255,${205 + Math.sin(t * 3 + wx) * 25},110,1)`, 1.2); g.fillStyle = '#2c2a24'; for (let k = 1; k < 4; k++) g.fillRect(x + wx + k * 4.5, y - 48, 1.4, 11); }
  /* holofote no teto */
  box(g, x + 24, y - 88, 14, 10, 2, '#3c3c40', 1.2); circ(g, x + 38, y - 83, 4, '#fff8c0');
  /* sacos de areia em duas fileiras */
  for (let r = 0; r < 2; r++) for (let i = 0; i < 10; i++) { const sx = x - 70 + i * 15.5 + (r % 2) * 7, sy = y + 10 - r * 6; ell(g, sx, sy, 9, 5, r ? '#d8c08c' : '#c8b07c', 1); }
  /* bandeira e antena */
  g.strokeStyle = '#3c3c3c'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 42, y - 76); g.lineTo(x - 42, y - 126); g.stroke();
  const wv = Math.sin(t * 4) * 3; g.beginPath(); g.moveTo(x - 41, y - 126); g.quadraticCurveTo(x - 24, y - 128 + wv, x - 8, y - 121 + wv); g.lineTo(x - 41, y - 107); g.closePath(); g.fillStyle = '#e04838'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#2c2a24'; g.stroke();
  g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 52, y - 76); g.lineTo(x + 52, y - 106); g.stroke(); circ(g, x + 52, y - 107, 3, (t % 1) < .5 ? '#ff4040' : '#802020');
  if (lvl > 1) { for (let i = 0; i < Math.min(lvl - 1, 6); i++) box(g, x - 58 + i * 20, y - 82, 17, 6, 2, '#7c9c5c', 1); }
  /* fumaça e fogo quando está machucado */
  if (f < .5) for (let i = 0; i < 4; i++) { const p = (t * .4 + i / 4) % 1; circ(g, x + 20 + Math.sin(p * 6 + i) * 8, y - 78 - p * 60, 7 + p * 12, `rgba(60,60,60,${(.55 - p * .5) * (1 - f * 1.5)})`); }
  if (f < .25) for (let i = 0; i < 3; i++) { const fl = Math.sin(t * 15 + i * 2) * 3; poly(g, [x - 20 + i * 20, y - 60, x - 15 + i * 20 + fl, y - 80 - i * 3, x - 10 + i * 20, y - 60], '#ff8020'); }
}

/** forte de pedra (nível 2) e cidadela (nível 3) */
function fortress(g: Ctx2D, x: number, y: number, t: number, f: number, blv: number) {
  const big = blv === 3, W = big ? 92 : 80, Hh = big ? 92 : 78;
  ell(g, x + 14, y + 10, W + 40, 28, 'rgba(0,0,0,.32)');
  const tower = (tx: number, th: number) => {
    g.fillStyle = grad(g, tx - 20, 0, tx + 20, 0, [[0, big ? '#7c8490' : '#8c8478'], [.5, big ? '#b4bcc8' : '#b8b0a0'], [1, big ? '#6c7480' : '#7c7468']]); g.fillRect(tx - 20, y - th, 40, th);
    if (!big) for (let r = 0; r < th / 12; r++) for (let c = 0; c < 3; c++) { g.strokeStyle = 'rgba(40,30,20,.3)'; g.lineWidth = 1; g.strokeRect?.(tx - 20 + c * 13.3 + (r % 2) * 6, y - th + r * 12, 13.3, 12); }
    g.lineWidth = 1.5; g.strokeStyle = '#2c2a24'; g.strokeRect?.(tx - 20, y - th, 40, th);
    if (big) { box(g, tx - 24, y - th - 8, 48, 10, 3, '#5c6470', 1.5); box(g, tx - 10, y - th + 14, 20, 26, 3, `rgba(150,220,255,${.8 + Math.sin(t * 2 + tx) * .1})`, 1.2); }
    else { for (let k = 0; k < 4; k++) box(g, tx - 20 + k * 11, y - th - 9, 8, 10, 1, '#a8a090', 1.2); box(g, tx - 4, y - th + 18, 8, 14, 3, '#2c2418'); }
  };
  tower(x - W - 6, Hh + 20); tower(x + W + 6, Hh + 20);
  /* corpo principal */
  g.fillStyle = grad(g, x - W, 0, x + W, 0, [[0, big ? '#8c94a0' : '#9c9484'], [.5, big ? '#c8d0dc' : '#c8c0ac'], [1, big ? '#7c8490' : '#8c8474']]); g.fillRect(x - W, y - Hh, W * 2, Hh);
  if (!big) { for (let r = 0; r < Hh / 14; r++) for (let c = 0; c < W * 2 / 22; c++) { g.strokeStyle = 'rgba(40,30,20,.25)'; g.lineWidth = 1; g.strokeRect?.(x - W + c * 22 + (r % 2) * 11, y - Hh + r * 14, 22, 14); } for (let k = 0; k < W * 2 / 18; k++) box(g, x - W + k * 18 + 2, y - Hh - 10, 12, 11, 1, '#b0a894', 1.2); }
  else { g.fillStyle = 'rgba(40,60,90,.85)'; g.fillRect(x - W + 10, y - Hh + 14, W * 2 - 20, 26); g.fillStyle = 'rgba(160,220,255,.4)'; for (let k = 0; k < 8; k++) g.fillRect(x - W + 14 + k * (W * 2 - 28) / 8, y - Hh + 16, (W * 2 - 28) / 8 - 4, 22); poly(g, [x - W - 6, y - Hh, x + W + 6, y - Hh, x + W - 10, y - Hh - 14, x - W + 10, y - Hh - 14], '#5c6470', 1.5); for (let i = 0; i < 12; i++) poly(g, [x - W + i * W / 6, y - 10, x - W + 8 + i * W / 6, y - 10, x - W + i * W / 6 + 16, y, x - W + i * W / 6 + 8, y], i % 2 ? '#2c2c2c' : '#f0c020'); }
  g.lineWidth = 1.5; g.strokeStyle = '#2c2a24'; g.strokeRect?.(x - W, y - Hh, W * 2, Hh);
  /* portão */
  g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x - 20, y - 34); g.arc(x, y - 34, 20, Math.PI, 0); g.lineTo(x + 20, y); g.closePath(); g.fillStyle = big ? '#3c4450' : '#5c3c20'; g.fill(); g.stroke();
  g.strokeStyle = big ? '#7c8490' : '#3c2410'; g.lineWidth = 2; for (let k = -12; k <= 12; k += 8) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k, y - 44); g.stroke(); }
  /* bandeiras */
  for (const fx of [x - W - 6, x + W + 6]) { const top = y - Hh - 20 - (big ? 8 : 9); g.strokeStyle = '#3c3c3c'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(fx, top); g.lineTo(fx, top - 34); g.stroke(); const wv = Math.sin(t * 4 + fx) * 3; poly(g, [fx + 1, top - 34, fx + 24, top - 29 + wv, fx + 1, top - 20], big ? '#3c8cf0' : '#e04838', 1); }
  if (big) { /* radar girando e holofotes */
    const rx = x, ry = y - Hh - 22; g.strokeStyle = '#3c3c44'; g.lineWidth = 3; g.beginPath(); g.moveTo(rx, y - Hh - 14); g.lineTo(rx, ry); g.stroke();
    const a = Math.cos(t * 1.5); ell(g, rx, ry - 6, 22 * Math.abs(a) + 3, 10, '#d8dce4', 1.5); ell(g, rx, ry - 6, 6 * Math.abs(a) + 1, 3, '#8c909c');
    for (const lx of [x - W + 20, x + W - 20]) { box(g, lx - 6, y - Hh - 14, 12, 8, 2, '#3c3c40', 1); circ(g, lx, y - Hh - 10, 3, '#fff8c0'); }
  }
  for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) { const sx = x - W - 8 + i * (W * 2 + 16) / 11, sy = y + 12 - r * 6; ell(g, sx, sy, 9, 5, r ? '#d8c08c' : '#c8b07c', 1); }
  if (f < .5) for (let i = 0; i < 4; i++) { const p = (t * .4 + i / 4) % 1; circ(g, x + 20 + Math.sin(p * 6 + i) * 8, y - Hh - 10 - p * 60, 8 + p * 14, `rgba(60,60,60,${(.55 - p * .5) * (1 - f * 1.5)})`); }
  if (f < .25) for (let i = 0; i < 4; i++) { const fl = Math.sin(t * 15 + i * 2) * 3; poly(g, [x - 40 + i * 26, y - Hh, x - 34 + i * 26 + fl, y - Hh - 22, x - 28 + i * 26, y - Hh], '#ff8020'); }
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
    else if (kind === 'shelter') { g.translate(50, 85); const sc = lvl >= 2 ? .4 : .55; g.scale(sc, sc); shelter(g, 0, 0, 0, 1, 1, lvl); }
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
