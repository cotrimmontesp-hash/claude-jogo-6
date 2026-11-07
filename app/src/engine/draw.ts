/* Desenhos da Vila Selvagem (vetor no canvas, com sombras e degradês): chão da vila, caminhos,
   árvores, lago, cercado, construções em 3/4 (níveis 1 a 3), bichos, moradores e materiais. */
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
const hash = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };


/* ---------- vila: chão, caminhos, árvores, lago, cercado ---------- */
function grad(g: Ctx2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; }
function rgrad(g: Ctx2D, x: number, y: number, r: number, c0: string, c1: string) { const gr = (g as any).createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }

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
/** camada parada da vila (desenhada uma vez num canvas fora da tela) */
export function villageGround(g: Ctx2D, W: number, H: number, P: (x: number, y: number) => [number, number], k: number, plots: { x: number; y: number; open: boolean; block?: string; used: boolean }[], square: { x: number; y: number }, pen: { x: number; y: number; rx: number; ry: number }) {
  g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#86c45c'], [1, '#6cae48']]); g.fillRect(0, 0, W, H);
  /* manchas e capim */
  for (let i = 0; i < 260; i++) { const x = hash(i, 1) * W, y = hash(i, 2) * H; ell(g, x, y, (20 + hash(i, 3) * 60) * k, (8 + hash(i, 4) * 20) * k, hash(i, 5) < .5 ? 'rgba(255,255,200,.05)' : 'rgba(30,70,20,.06)'); }
  g.lineWidth = Math.max(1, k * 1.4);
  for (let i = 0; i < 900; i++) { const x = hash(i, 11) * W, y = hash(i, 12) * H, h = (4 + hash(i, 13) * 6) * k; g.strokeStyle = hash(i, 14) < .5 ? 'rgba(40,90,30,.35)' : 'rgba(190,230,140,.35)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - h * .3, y - h); g.moveTo(x, y); g.lineTo(x + h * .3, y - h * .9); g.stroke(); }
  /* lago */
  const [lx, ly] = P(150, 520);
  ell(g, lx + 6 * k, ly + 8 * k, 120 * k, 52 * k, 'rgba(40,60,20,.25)');
  g.beginPath(); g.ellipse(lx, ly, 120 * k, 50 * k, -.1, 0, TAU); g.fillStyle = rgrad(g, lx - 30 * k, ly - 10 * k, 130 * k, '#7cd0f0', '#2c88c0'); g.fill(); g.lineWidth = 4 * k; g.strokeStyle = '#c8b484'; g.stroke();
  for (let i = 0; i < 5; i++) ell(g, lx - 60 * k + i * 30 * k, ly - 12 * k + (i % 2) * 18 * k, 14 * k, 3 * k, 'rgba(255,255,255,.45)');
  for (let i = 0; i < 8; i++) { const a = -2.6 + i * .25, rx = lx + Math.cos(a) * 122 * k, ry = ly + Math.sin(a) * 52 * k; g.strokeStyle = '#4c7c2c'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 3 * k, ry - 16 * k); g.stroke(); ell(g, rx - 3 * k, ry - 18 * k, 2.5 * k, 6 * k, '#7c4c2c'); }
  /* caminhos até os terrenos abertos e até o cercado */
  const [sx, sy] = P(square.x, square.y);
  const dests = plots.filter(p => p.open).map(p => P(p.x, p.y)).concat([P(pen.x - pen.rx * .8, pen.y)]);
  for (const pass of [0, 1]) for (const [dx, dy] of dests) {
    const mx = (sx + dx) / 2 + (dy - sy) * .15, my = (sy + dy) / 2 - (dx - sx) * .1;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = pass ? '#d8b88a' : '#a88858'; g.lineWidth = (pass ? 22 : 28) * k;
    g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(mx, my, dx, dy); g.stroke();
  }
  /* pedrinhas no caminho */
  for (let i = 0; i < 120; i++) { const p = dests[i % dests.length]; const t = hash(i, 21); const x = sx + (p[0] - sx) * t + (hash(i, 22) - .5) * 14 * k, y = sy + (p[1] - sy) * t + (hash(i, 23) - .5) * 10 * k; ell(g, x, y, 2.2 * k, 1.4 * k, 'rgba(120,90,50,.45)'); }
  /* praça */
  g.beginPath(); g.ellipse(sx, sy, 62 * k, 38 * k, 0, 0, TAU); g.fillStyle = '#dcc094'; g.fill();
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; ell(g, sx + Math.cos(a) * 62 * k, sy + Math.sin(a) * 38 * k, 6 * k, 4 * k, '#b0a088', 1.2); }
  /* cercado dos bichos */
  const [px, py] = P(pen.x, pen.y);
  g.beginPath(); g.ellipse(px, py, pen.rx * k, pen.ry * k, 0, 0, TAU); g.fillStyle = 'rgba(120,180,70,.6)'; g.fill();
  for (let i = 0; i < 8; i++) ell(g, px + (hash(i, 31) - .5) * pen.rx * 1.4 * k, py + (hash(i, 32) - .5) * pen.ry * 1.2 * k, 10 * k, 5 * k, 'rgba(230,200,90,.5)');
  /* terrenos */
  for (const p of plots) {
    const [x, y] = P(p.x, p.y);
    if (!p.open) continue;
    if (!p.used) { g.beginPath(); g.ellipse(x, y + 10 * k, 52 * k, 30 * k, 0, 0, TAU); g.fillStyle = 'rgba(200,170,110,.55)'; g.fill(); g.setLineDash?.([6 * k, 5 * k]); g.lineWidth = 2 * k; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke(); g.setLineDash?.([]); }
    else { g.beginPath(); g.ellipse(x, y + 12 * k, 58 * k, 32 * k, 0, 0, TAU); g.fillStyle = 'rgba(190,160,100,.5)'; g.fill(); }
  }
  /* bordas: floresta */
  const edge: [number, number][] = [];
  for (let i = 0; i < 26; i++) { edge.push([i * 40 + 10, -10 + hash(i, 41) * 30]); edge.push([i * 40 + 20, 600 + hash(i, 42) * 20]); }
  for (let i = 0; i < 14; i++) { edge.push([-10 + hash(i, 43) * 25, i * 45]); edge.push([1000 + hash(i, 44) * 20, i * 45 + 20]); }
  edge.sort((a, b) => a[1] - b[1]);
  for (const [ex, ey] of edge) { const [x, y] = P(ex, ey); tree(g, x, y, 30 * k, ex * 7 + ey, hash(ex, ey) < .35 ? 1 : 0); }
}
/** terreno bloqueado (árvores ou pedras por cima) */
export function blockedPlot(g: Ctx2D, x: number, y: number, k: number, block: string, seed: number) {
  const pts: [number, number][] = [[-30, -6], [22, -12], [-6, 10], [34, 14], [-36, 22], [6, 30]];
  for (const [dx, dy] of pts) { if (block === 'pedras') boulder(g, x + dx * k, y + dy * k, 16 * k, seed + dx); else tree(g, x + dx * k, y + dy * k + 10 * k, 22 * k, seed + dx + dy, (dx + dy) % 3 === 0 ? 1 : 0); }
}
export function bonfire(g: Ctx2D, x: number, y: number, k: number, t: number) {
  ell(g, x, y + 6 * k, 18 * k, 7 * k, 'rgba(0,0,0,.25)');
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ell(g, x + Math.cos(a) * 14 * k, y + Math.sin(a) * 6 * k, 5 * k, 3.5 * k, '#8c8c94', 1); }
  g.lineWidth = 4 * k; g.strokeStyle = '#6c4428'; g.beginPath(); g.moveTo(x - 10 * k, y + 3 * k); g.lineTo(x + 10 * k, y - 3 * k); g.moveTo(x - 10 * k, y - 3 * k); g.lineTo(x + 10 * k, y + 3 * k); g.stroke();
  for (let i = 0; i < 3; i++) { const f = Math.sin(t * 9 + i * 2) * 3 * k, h = (20 + Math.sin(t * 7 + i) * 5) * k; g.beginPath(); g.moveTo(x - 8 * k + i * 8 * k - 5 * k, y); g.quadraticCurveTo(x - 8 * k + i * 8 * k + f, y - h, x - 8 * k + i * 8 * k + 5 * k, y); g.closePath(); g.fillStyle = ['#ff7020', '#ffb020', '#ff5010'][i]; g.fill(); }
  g.beginPath(); g.moveTo(x - 4 * k, y); g.quadraticCurveTo(x, y - 12 * k, x + 4 * k, y); g.fillStyle = '#fff4a0'; g.fill();
}
export function fence(g: Ctx2D, x: number, y: number, rx: number, ry: number, k: number, front: boolean) {
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, a2 = (i + 1) / n * TAU, sy = Math.sin(a);
    if ((sy > 0) !== front) continue;
    if (Math.abs(a - Math.PI) < .25) continue; /* porteira */
    const x1 = x + Math.cos(a) * rx, y1 = y + Math.sin(a) * ry, x2 = x + Math.cos(a2) * rx, y2 = y + Math.sin(a2) * ry;
    g.lineWidth = 3 * k; g.strokeStyle = '#8c5c34'; g.beginPath(); g.moveTo(x1, y1 - 10 * k); g.lineTo(x2, y2 - 10 * k); g.moveTo(x1, y1 - 4 * k); g.lineTo(x2, y2 - 4 * k); g.stroke();
    g.fillStyle = '#6c4428'; g.fillRect(x1 - 2 * k, y1 - 16 * k, 4 * k, 16 * k);
  }
}

/* ---------- construções em 3/4, com sombra, nível 1 a 3 ---------- */
function house(g: Ctx2D, x: number, y: number, w: number, h: number, d: number, wall: string, roof: string, k: number, opt: { door?: boolean; win?: number; chimney?: boolean; stone?: boolean } = {}) {
  /* x,y = centro do chão na frente; w largura, h altura da parede, d profundidade (vista de cima) */
  const L = Math.max(1, 1.4 * k);
  ell(g, x + w * .12, y + d * .1, w * .62, d * .55, 'rgba(20,30,10,.28)');
  /* parede lateral (direita) */
  poly(g, [x + w / 2, y, x + w / 2 + d * .5, y - d * .35, x + w / 2 + d * .5, y - d * .35 - h, x + w / 2, y - h], sh(wall, -.28), L);
  /* frente */
  g.fillStyle = grad(g, 0, y - h, 0, y, [[0, sh(wall, .08)], [1, sh(wall, -.1)]]); g.fillRect(x - w / 2, y - h, w, h); g.lineWidth = L; g.strokeStyle = 'rgba(40,25,10,.7)'; g.strokeRect?.(x - w / 2, y - h, w, h);
  if (opt.stone) { g.fillStyle = 'rgba(0,0,0,.08)'; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) g.fillRect(x - w / 2 + c * w / 5 + (r % 2) * w / 10, y - h + r * h / 4 + 1, w / 5 - 2, h / 4 - 2); }
  else { g.strokeStyle = 'rgba(80,50,20,.25)'; g.lineWidth = L * .6; for (let r = 1; r < 5; r++) { g.beginPath(); g.moveTo(x - w / 2, y - h + r * h / 5); g.lineTo(x + w / 2, y - h + r * h / 5); g.stroke(); } }
  /* janelas e porta */
  const nw = opt.win ?? 2;
  for (let i = 0; i < nw; i++) { const wx = x - w / 2 + w * (i + .5) / (nw + (opt.door === false ? 0 : 1)) + (i >= nw / 2 && opt.door !== false ? w / (nw + 1) : 0); box(g, wx - w * .07, y - h * .72, w * .14, h * .3, 1.5 * k, '#ffe8a0', L * .7); g.fillStyle = 'rgba(80,50,20,.5)'; g.fillRect(wx - .5 * k, y - h * .72, 1 * k, h * .3); }
  if (opt.door !== false) box(g, x - w * .09, y - h * .55, w * .18, h * .55, 2 * k, '#7c4c28', L * .8);
  /* telhado */
  const rh = h * .75;
  poly(g, [x - w / 2 - 4 * k, y - h, x - w / 2 + d * .5 - 4 * k, y - h - d * .35 - rh * .2, x + w / 2 + d * .5 + 4 * k, y - h - d * .35 - rh * .2, x + w / 2 + 4 * k, y - h], sh(roof, -.15), L);
  poly(g, [x - w / 2 - 6 * k, y - h + 2 * k, x - w * .05, y - h - rh, x + w / 2 + d * .5 - w * .05, y - h - rh - d * .35, x + w / 2 + d * .5 + 6 * k, y - h - d * .35 + 2 * k, x + w / 2 + 6 * k, y - h + 2 * k], roof, L);
  g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = L * .7;
  for (let i = 1; i < 5; i++) { const t = i / 5; g.beginPath(); g.moveTo(x - w / 2 - 6 * k + (w * .45) * t, y - h + 2 * k - rh * t); g.lineTo(x + w / 2 + 6 * k + (d * .5 - w * .05) * t - (w * .05) * 0, y - h + 2 * k - rh * t - d * .35 * t * 0); g.stroke(); }
  poly(g, [x - w * .05, y - h - rh, x + w / 2 + d * .5 - w * .05, y - h - rh - d * .35, x + w / 2 + d * .5 + 6 * k, y - h - d * .35 + 2 * k, x + w / 2 + 6 * k, y - h + 2 * k], 'rgba(0,0,0,.12)');
  if (opt.chimney) { g.fillStyle = '#9c6c4c'; g.fillRect(x + w * .22, y - h - rh * .95, w * .1, rh * .5); g.strokeRect?.(x + w * .22, y - h - rh * .95, w * .1, rh * .5); }
  return { top: y - h - rh };
}
function smoke(g: Ctx2D, x: number, y: number, k: number, t: number) { for (let i = 0; i < 4; i++) { const p = (t * .35 + i / 4) % 1; circ(g, x + Math.sin(p * 5 + i) * 6 * k, y - p * 45 * k, (4 + p * 9) * k, `rgba(235,235,235,${.55 - p * .5})`); } }
function field(g: Ctx2D, x: number, y: number, w: number, d: number, k: number, t: number, crop: string) {
  poly(g, [x - w / 2, y, x + w / 2, y, x + w / 2 + d * .4, y - d * .4, x - w / 2 + d * .4, y - d * .4], '#8c5c34', 1.2 * k);
  const rows = 4;
  for (let r = 0; r < rows; r++) { const ty = y - d * .4 * (r + .5) / rows, tx = d * .4 * (r + .5) / rows; for (let c = 0; c < 7; c++) { const cx = x - w / 2 + tx + w * (c + .5) / 7, sw = Math.sin(t * 1.8 + r + c) * 1.2 * k; g.strokeStyle = '#3c8c2c'; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(cx, ty); g.lineTo(cx + sw, ty - 9 * k); g.stroke(); circ(g, cx + sw, ty - 9 * k, 2.6 * k, crop); } }
}
export function building(g: Ctx2D, id: string, x: number, y: number, k: number, lvl: number, t: number, ready = 0) {
  const L = Math.max(1, 1.4 * k), u = k;
  const big = 1 + (lvl - 1) * .12;
  k *= big;
  if (id === 'casa') {
    if (lvl >= 3) house(g, x - 34 * k, y - 6 * k, 34 * k, 22 * k, 26 * k, '#e8d0a8', '#c0503c', k, { win: 1 });
    house(g, x, y, 50 * k, (lvl >= 2 ? 36 : 26) * k, 34 * k, '#f0dcb4', '#d0583c', k, { chimney: true, win: lvl >= 2 ? 2 : 1 });
    smoke(g, x + 14 * k, y - (lvl >= 2 ? 82 : 66) * k, k, t);
  } else if (id === 'fazenda') {
    field(g, x - 10 * k, y + 12 * k, (60 + lvl * 14) * k, 40 * k, k, t, lvl >= 3 ? '#f05a3c' : '#f0c030');
    house(g, x + 34 * k, y - 4 * k, 26 * k, 22 * k, 20 * k, '#c0503c', '#8c3c2c', k, { win: 0 });
    if (lvl >= 2) { g.lineWidth = 3 * k; g.strokeStyle = '#6c4428'; g.beginPath(); g.moveTo(x - 48 * k, y - 24 * k); g.lineTo(x - 48 * k, y - 2 * k); g.stroke(); circ(g, x - 48 * k, y - 28 * k, 6 * k, '#f4e0a0', 1); }
  } else if (id === 'serraria') {
    house(g, x - 8 * k, y, 46 * k, 24 * k, 30 * k, '#b48454', '#7c6048', k, { win: 1 });
    for (let i = 0; i < 2 + lvl; i++) { const lx = x + 26 * k, ly = y + 10 * k - i * 7 * k; box(g, lx, ly - 5 * k, 32 * k, 9 * k, 4.5 * k, '#a8703c', L * .7); circ(g, lx + 30 * k, ly - .5 * k, 4 * k, '#e8c890', L * .5); }
    g.save(); g.translate(x - 30 * k, y - 34 * k); g.rotate(t * 4); circ(g, 0, 0, 10 * k, '#d8dce4', L); for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); poly(g, [9 * k, -2 * k, 13 * k, 0, 9 * k, 2 * k], '#d8dce4'); } circ(g, 0, 0, 3 * k, '#5c5c64'); g.restore();
  } else if (id === 'poco') {
    ell(g, x + 6 * k, y + 6 * k, 30 * k, 12 * k, 'rgba(20,30,10,.28)');
    g.fillStyle = grad(g, x - 22 * k, 0, x + 22 * k, 0, [[0, '#a0a0a8'], [.5, '#c8c8d0'], [1, '#808088']]); g.fillRect(x - 22 * k, y - 22 * k, 44 * k, 22 * k);
    ell(g, x, y, 22 * k, 9 * k, '#9898a0'); ell(g, x, y - 22 * k, 22 * k, 9 * k, '#b0b0b8', L); ell(g, x, y - 22 * k, 16 * k, 6 * k, '#2c78b0');
    g.fillStyle = '#6c4428'; g.fillRect(x - 20 * k, y - 56 * k, 4 * k, 34 * k); g.fillRect(x + 16 * k, y - 56 * k, 4 * k, 34 * k);
    poly(g, [x - 28 * k, y - 52 * k, x, y - 70 * k, x + 28 * k, y - 52 * k], lvl >= 2 ? '#3c7cd8' : '#c0503c', L);
    box(g, x - 5 * k, y - 40 * k, 10 * k, 10 * k, 2 * k, '#8c5c34', L * .6);
  } else if (id === 'armazem') {
    house(g, x, y, (64 + lvl * 8) * k, 34 * k, 40 * k, '#c86c3c', '#8c3c24', k, { door: false, win: 0 });
    box(g, x - 14 * k, y - 28 * k, 28 * k, 28 * k, 2 * k, '#f4e4c4', L); g.strokeStyle = '#8c3c24'; g.lineWidth = 2.5 * k; g.beginPath(); g.moveTo(x - 14 * k, y - 28 * k); g.lineTo(x + 14 * k, y); g.moveTo(x + 14 * k, y - 28 * k); g.lineTo(x - 14 * k, y); g.stroke();
  } else if (id === 'estabulo') {
    house(g, x, y, (70 + lvl * 8) * k, 22 * k, 34 * k, '#a87848', '#6c5038', k, { door: false, win: 0 });
    for (let i = 0; i < 3; i++) box(g, x - 30 * k + i * 22 * k, y - 18 * k, 16 * k, 18 * k, 2 * k, '#4c3020', L * .6);
    for (let i = 0; i < lvl; i++) { box(g, x + 40 * k + i * 4 * k, y + 4 * k - i * 10 * k, 20 * k, 12 * k, 5 * k, '#e8c860', L * .7); g.strokeStyle = 'rgba(150,110,30,.6)'; g.beginPath(); g.moveTo(x + 44 * k + i * 4 * k, y + 10 * k - i * 10 * k); g.lineTo(x + 56 * k + i * 4 * k, y + 10 * k - i * 10 * k); g.stroke(); }
  } else if (id === 'pedreira') {
    for (let i = 0; i < 3 + lvl; i++) boulder(g, x - 30 * k + (i % 3) * 26 * k, y - Math.floor(i / 3) * 12 * k + 4 * k, 14 * k, i * 13);
    for (let i = 0; i < lvl + 1; i++) box(g, x + 20 * k, y - 6 * k - i * 9 * k, 22 * k, 9 * k, 1 * k, '#c8c8d0', L * .6);
    g.lineWidth = 3 * k; g.strokeStyle = '#6c4428'; g.beginPath(); g.moveTo(x - 4 * k, y + 4 * k); g.lineTo(x + 6 * k, y - 50 * k); g.lineTo(x + 38 * k, y - 44 * k); g.stroke(); g.lineWidth = 1 * k; g.beginPath(); g.moveTo(x + 36 * k, y - 44 * k); g.lineTo(x + 36 * k, y - 24 * k); g.stroke();
  } else if (id === 'torre') {
    const h = (70 + lvl * 14) * k;
    ell(g, x + 10 * k, y + 4 * k, 26 * k, 10 * k, 'rgba(20,30,10,.28)');
    g.lineWidth = 4 * k; g.strokeStyle = '#7c5434'; g.beginPath(); g.moveTo(x - 16 * k, y); g.lineTo(x - 10 * k, y - h); g.moveTo(x + 16 * k, y); g.lineTo(x + 10 * k, y - h); g.moveTo(x - 14 * k, y - h * .3); g.lineTo(x + 13 * k, y - h * .6); g.moveTo(x + 14 * k, y - h * .3); g.lineTo(x - 13 * k, y - h * .6); g.stroke();
    house(g, x, y - h + 18 * k, 34 * k, 16 * k, 24 * k, '#b48454', '#5c7cb0', k, { door: false, win: 1 });
    g.lineWidth = 1.5 * k; g.strokeStyle = '#3c3c3c'; g.beginPath(); g.moveTo(x - 4 * k, y - h - 22 * k); g.lineTo(x - 4 * k, y - h - 44 * k); g.stroke();
    poly(g, [x - 4 * k, y - h - 44 * k, x + 16 * k + Math.sin(t * 4) * 3 * k, y - h - 38 * k, x - 4 * k, y - h - 32 * k], '#e0503c');
  } else if (id === 'estufa') {
    const w = (56 + lvl * 8) * k, h = 28 * k;
    ell(g, x + 8 * k, y + 6 * k, w * .6, 12 * k, 'rgba(20,30,10,.25)');
    g.fillStyle = 'rgba(190,235,255,.55)'; g.fillRect(x - w / 2, y - h, w, h); g.beginPath(); g.moveTo(x - w / 2, y - h); g.quadraticCurveTo(x, y - h - 30 * k, x + w / 2, y - h); g.fill();
    for (let i = 0; i < 6; i++) circ(g, x - w / 2 + w * (i + .5) / 6, y - 8 * k, 6 * k, i % 2 ? '#4cac3c' : '#5cc048');
    g.strokeStyle = '#e8eef4'; g.lineWidth = 2 * k; g.strokeRect?.(x - w / 2, y - h, w, h); for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x - w / 2 + w * i / 5, y); g.lineTo(x - w / 2 + w * i / 5, y - h - 16 * k * Math.sin(Math.PI * i / 5)); g.stroke(); }
    g.beginPath(); g.moveTo(x - w / 2, y - h); g.quadraticCurveTo(x, y - h - 30 * k, x + w / 2, y - h); g.stroke();
  } else if (id === 'forja') {
    house(g, x, y, 54 * k, 28 * k, 34 * k, '#8c8c98', '#4c4c58', k, { stone: true, door: false, win: 0 });
    box(g, x - 14 * k, y - 22 * k, 28 * k, 20 * k, 4 * k, '#3c2c24', L); box(g, x - 10 * k, y - 18 * k, 20 * k, 14 * k, 3 * k, `rgb(255,${140 + Math.floor(Math.sin(t * 6) * 40)},40)`);
    g.fillStyle = '#6c6c78'; g.fillRect(x + 14 * k, y - 78 * k, 12 * k, 30 * k); smoke(g, x + 20 * k, y - 80 * k, k, t);
  } else if (id === 'cais') {
    g.beginPath(); g.ellipse(x, y + 6 * k, 60 * k, 24 * k, 0, 0, TAU); g.fillStyle = '#3c9cd8'; g.fill();
    for (let i = 0; i < 6; i++) box(g, x - 40 * k + i * 12 * k, y - 4 * k, 11 * k, 8 * k, 1 * k, '#b07c48', L * .5);
    g.save(); g.translate(x + 30 * k, y + 8 * k + Math.sin(t * 2) * 1.5 * k); poly(g, [-18 * k, 0, 18 * k, 0, 12 * k, 8 * k, -12 * k, 8 * k], '#a8603c', L); g.lineWidth = 2 * k; g.strokeStyle = '#5c3c24'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26 * k); g.stroke(); poly(g, [1 * k, -26 * k, 16 * k, -6 * k, 1 * k, -6 * k], '#f4f0e8', L * .6); g.restore();
  } else if (id === 'jardim') {
    ell(g, x, y + 4 * k, 46 * k, 20 * k, '#8c7c6c', L);
    for (let i = 0; i < 3 + lvl; i++) { const dx = -30 * k + i * 60 * k / (2 + lvl), hh = (24 + hash(i, 9) * 22) * k; poly(g, [dx + x - 7 * k, y + 4 * k, dx + x - 4 * k, y - hh * .7, dx + x, y - hh, dx + x + 4 * k, y - hh * .7, dx + x + 7 * k, y + 4 * k], ['#c070f0', '#e0a0ff', '#a050e0'][i % 3], L * .8); }
  }
  /* estrelas de nível */
  if (lvl > 1) for (let i = 0; i < lvl; i++) text(g, '★', x - (lvl - 1) * 7 * u + i * 14 * u, y + 22 * u, 13 * u, '#ffd040', 3);
  if (ready > 0) { const b = Math.sin(t * 5) * 3 * u; circ(g, x + 30 * u, y - 70 * u + b, 12 * u, '#fff', 2); text(g, '!', x + 30 * u, y - 69 * u + b, 17 * u, '#e07028'); }
}

/* ---------- bichos ---------- */
export function beast(g: Ctx2D, b: { body: string; body2: string; kind: string; ears?: string; horns?: boolean; tail?: string; snout?: number; size: number; id: string }, x: number, y: number, s: number, t: number, stage: number, face: number, walking: boolean) {
  const sz = s * b.size * (.7 + stage * .2), L = Math.max(1, sz * .05);
  const step = walking ? Math.sin(t * 10) : 0;
  g.save(); g.translate(x, y); g.scale(face, 1);
  ell(g, 0, 0, sz * .62, sz * .16, 'rgba(0,0,0,.22)');
  if (b.kind === 'ave') {
    const fly = walking ? Math.sin(t * 14) * .6 : Math.sin(t * 2) * .1, hop = walking ? Math.abs(Math.sin(t * 7)) * sz * .25 : 0;
    g.translate(0, -hop);
    ell(g, -sz * .05, -sz * .45, sz * .3, sz * .38, b.body, L);
    ell(g, sz * .02, -sz * .4, sz * .18, sz * .26, b.body2);
    g.save(); g.translate(-sz * .1, -sz * .5); g.rotate(-.4 - fly); ell(g, -sz * .2, 0, sz * .34, sz * .12, sh(b.body, -.15), L); g.restore();
    circ(g, sz * .12, -sz * .82, sz * .2, b.body, L);
    if (b.id === 'coruja') { circ(g, sz * .06, -sz * .84, sz * .08, '#fff8d0', L * .6); circ(g, sz * .2, -sz * .84, sz * .08, '#fff8d0', L * .6); circ(g, sz * .07, -sz * .84, sz * .04, '#202020'); circ(g, sz * .21, -sz * .84, sz * .04, '#202020'); poly(g, [sz * .02, -sz * .98, sz * .06, -sz * 1.08, sz * .1, -sz * .98], b.body); poly(g, [sz * .18, -sz * .98, sz * .22, -sz * 1.08, sz * .26, -sz * .98], b.body); }
    else { circ(g, sz * .18, -sz * .86, sz * .045, '#202020'); }
    poly(g, [sz * .28, -sz * .82, sz * .42, -sz * .76, sz * .28, -sz * .72], '#f0b030', L * .6);
    g.lineWidth = L; g.strokeStyle = '#d09020'; g.beginPath(); g.moveTo(-sz * .05, -sz * .1); g.lineTo(-sz * .05, 0); g.moveTo(sz * .08, -sz * .1); g.lineTo(sz * .08, 0); g.stroke();
    if (stage >= 2) poly(g, [-sz * .3, -sz * .4, -sz * .55, -sz * .3, -sz * .32, -sz * .25], sh(b.body, -.2));
    g.restore(); return;
  }
  if (b.kind === 'casco') {
    const wob = walking ? Math.sin(t * 5) * sz * .02 : 0;
    for (const [lx, ph] of [[-.3, 1], [.25, -1]]) ell(g, sz * lx + step * ph * sz * .04, -sz * .06, sz * .1, sz * .1, b.body, L);
    circ(g, sz * .55 + wob, -sz * .32, sz * .16, b.body, L); circ(g, sz * .6 + wob, -sz * .36, sz * .035, '#202020');
    g.beginPath(); g.ellipse(0, -sz * .2, sz * .55, sz * .42, 0, Math.PI, 0); g.closePath(); g.fillStyle = grad(g, 0, -sz * .62, 0, -sz * .2, [[0, sh(b.body2, .2)], [1, sh(b.body2, -.25)]]); g.fill(); g.lineWidth = L; g.strokeStyle = 'rgba(40,25,10,.7)'; g.stroke();
    g.strokeStyle = 'rgba(40,25,10,.4)'; for (const [hx, hy] of [[-.25, -.38], [.05, -.48], [.3, -.36], [-.02, -.28]]) { g.beginPath(); g.ellipse(sz * hx, sz * hy, sz * .12, sz * .07, 0, 0, TAU); g.stroke(); }
    box(g, -sz * .58, -sz * .24, sz * 1.16, sz * .08, sz * .04, sh(b.body2, -.35));
    if (stage >= 2) for (const hx of [-.2, .1, .35]) poly(g, [sz * hx - sz * .05, -sz * .5, sz * hx, -sz * .66, sz * hx + sz * .05, -sz * .5], '#5c8c48');
    g.restore(); return;
  }
  /* quadrúpede */
  const legH = sz * (b.id === 'camelo' ? .5 : b.id === 'lontra' ? .16 : .3), bodyY = -legH - sz * .18;
  const legs = [[-.32, 1], [-.2, -1], [.25, -1], [.37, 1]];
  for (const [lx, ph] of legs) { const sw = step * ph * sz * .06; g.lineWidth = sz * .09; g.lineCap = 'round'; g.strokeStyle = sh(b.body, -.2); g.beginPath(); g.moveTo(sz * lx, bodyY + sz * .05); g.lineTo(sz * lx + sw, -sz * .02); g.stroke(); }
  /* rabo */
  const tw = Math.sin(t * 3) * .3;
  g.lineCap = 'round'; g.strokeStyle = b.tail === 'peludo' ? b.body2 : b.body; g.lineWidth = b.tail === 'peludo' ? sz * .14 : b.tail === 'grosso' ? sz * .12 : sz * .05;
  g.beginPath(); g.moveTo(-sz * .45, bodyY - sz * .04); g.quadraticCurveTo(-sz * .7, bodyY - sz * (.05 + tw * .2), -sz * (b.tail === 'curto' ? .5 : .74), bodyY + sz * (b.tail === 'grosso' ? .12 : -.12 + tw * .15)); g.stroke();
  /* corpo */
  const bl = b.id === 'lontra' ? .62 : .5;
  g.beginPath(); g.ellipse(0, bodyY, sz * bl, sz * .22, 0, 0, TAU); g.fillStyle = grad(g, 0, bodyY - sz * .22, 0, bodyY + sz * .22, [[0, sh(b.body, .12)], [1, sh(b.body, -.18)]]); g.fill(); g.lineWidth = L; g.strokeStyle = 'rgba(30,20,10,.55)'; g.stroke();
  ell(g, sz * .05, bodyY + sz * .1, sz * bl * .7, sz * .08, b.body2);
  if (b.id === 'camelo') { ell(g, -sz * .08, bodyY - sz * .22, sz * .2, sz * .16, b.body, L); }
  if (b.id === 'javali' || (b.id === 'lobo' && stage >= 2)) { g.strokeStyle = sh(b.body, -.35); g.lineWidth = sz * .05; g.beginPath(); for (let i = 0; i < 6; i++) { const hx = -sz * .3 + i * sz * .12; g.moveTo(hx, bodyY - sz * .2); g.lineTo(hx + sz * .03, bodyY - sz * .29); } g.stroke(); }
  /* cabeça */
  const nx = sz * (b.id === 'camelo' ? .5 : .48), ny = bodyY - sz * (b.id === 'camelo' ? .35 : .14);
  if (b.id === 'camelo') { g.lineWidth = sz * .12; g.strokeStyle = b.body; g.beginPath(); g.moveTo(sz * .35, bodyY - sz * .05); g.quadraticCurveTo(sz * .5, bodyY - sz * .25, nx, ny); g.stroke(); }
  ell(g, nx, ny, sz * .19, sz * .16, b.body, L);
  const sl = (b.snout || 1) * sz * .1;
  ell(g, nx + sz * .16, ny + sz * .03, sl + sz * .02, sz * .08, b.id === 'javali' ? '#c89888' : b.body2, L * .7);
  circ(g, nx + sz * .16 + sl, ny + sz * .01, sz * .03, '#202020');
  if (b.id === 'javali') { g.strokeStyle = '#f4f0e0'; g.lineWidth = sz * .03; g.beginPath(); g.moveTo(nx + sz * .14, ny + sz * .08); g.quadraticCurveTo(nx + sz * .2, ny - sz * .02, nx + sz * .16, ny - sz * .06); g.stroke(); }
  circ(g, nx + sz * .05, ny - sz * .04, sz * .035, '#202020'); circ(g, nx + sz * .06, ny - sz * .05, sz * .012, '#fff');
  if (b.ears === 'ponta') { poly(g, [nx - sz * .1, ny - sz * .1, nx - sz * .06, ny - sz * .3, nx + sz * .02, ny - sz * .12], b.body, L * .8); poly(g, [nx - sz * .08, ny - sz * .12, nx - sz * .06, ny - sz * .24, nx, ny - sz * .13], b.body2); }
  else if (b.ears === 'redonda') circ(g, nx - sz * .07, ny - sz * .14, sz * .065, b.body, L * .7);
  else if (b.ears === 'caida') ell(g, nx - sz * .1, ny - sz * .02, sz * .05, sz * .1, b.body2, L * .6, .5);
  if (b.horns) { const hk = 1 + stage * .35; g.strokeStyle = '#8c7c64'; g.lineWidth = sz * .05; g.beginPath(); g.moveTo(nx - sz * .02, ny - sz * .13); g.quadraticCurveTo(nx - sz * .2 * hk, ny - sz * .38 * hk, nx - sz * .3 * hk, ny - sz * .16 * hk); g.stroke(); }
  if (b.id === 'urso' && stage >= 2) { ell(g, nx - sz * .12, ny + sz * .05, sz * .12, sz * .14, sh(b.body, -.2)); }
  if (b.id === 'lobo' && stage >= 1) { ell(g, nx - sz * .14, ny + sz * .06, sz * .1, sz * .12, b.body2); }
  g.restore();
}

/* ---------- moradores andando (pequenos) ---------- */
export function walker(g: Ctx2D, x: number, y: number, k: number, col: string, skin: string, t: number, moving: boolean, face: number) {
  const st = moving ? Math.sin(t * 10) : 0;
  ell(g, x, y, 6 * k, 2.2 * k, 'rgba(0,0,0,.25)');
  g.lineWidth = 2.4 * k; g.lineCap = 'round'; g.strokeStyle = '#4c3828';
  g.beginPath(); g.moveTo(x - 1.5 * k, y - 7 * k); g.lineTo(x - 1.5 * k + st * 2.5 * k, y); g.moveTo(x + 1.5 * k, y - 7 * k); g.lineTo(x + 1.5 * k - st * 2.5 * k, y); g.stroke();
  box(g, x - 4 * k, y - 16 * k, 8 * k, 10 * k, 3 * k, col, 1);
  circ(g, x, y - 19.5 * k, 4.2 * k, skin, 1);
  circ(g, x + face * 1.6 * k, y - 20 * k, .8 * k, '#202020');
}

/* ---------- imagens para as telas ---------- */
type MkCanvas = (w: number, h: number) => OffCanvas;
let mk: MkCanvas = null as any;
export function setCanvasMaker(f: MkCanvas) { mk = f; }
export function makeCanvas(w: number, h: number) { return mk(w, h); }
const imgCache: { [k: string]: string } = {};
/** PNG de um desenho: kind = 'build' | 'res' | 'role' | 'beast' */
export function iconImage(kind: string, id: string, size = 96, seed = 0, beastDef?: any): string {
  const key = kind + id + size + '-' + seed; if (imgCache[key] != null) return imgCache[key];
  let out = '';
  try {
    const c = mk(size, size), g = c.getContext('2d');
    if (kind === 'build') building(g, id, size / 2, size * .74, size / 120, seed || 1, 0);
    else if (kind === 'res') resIcon(g, id, size / 2, size / 2, size * .86);
    else if (kind === 'role') person(g, size / 2, size * .46, size * .78, id, seed);
    else if (kind === 'beast' && beastDef) beast(g, beastDef, size * .46, size * .86, size * .62, 0, seed, 1, false);
    out = c.toDataURL ? c.toDataURL('image/png') : '';
  } catch (e) { console.warn('iconImage', kind, id, e); out = ''; }
  imgCache[key] = out;
  return out;
}

/* ---------- materiais ---------- */
export function resIcon(g: Ctx2D, id: string, x: number, y: number, s: number) {
  const L = Math.max(1.2, s * .07), u = s / 100, X = (v: number) => x + v * u, Y = (v: number) => y + v * u;
  if (id === 'comida') { circ(g, X(0), Y(6), 36 * u, '#f05a3c', L); ell(g, X(-12), Y(-6), 9 * u, 6 * u, 'rgba(255,255,255,.45)'); g.lineWidth = L; g.strokeStyle = '#6c4428'; g.beginPath(); g.moveTo(X(0), Y(-26)); g.lineTo(X(4), Y(-42)); g.stroke(); ell(g, X(16), Y(-36), 14 * u, 7 * u, '#5cc048', L * .7, -.4); }
  else if (id === 'madeira') { box(g, X(-40), Y(-16), 80 * u, 34 * u, 17 * u, '#b07840', L); ell(g, X(32), Y(1), 12 * u, 16 * u, '#e8c890', L * .8); circ(g, X(32), Y(1), 5 * u, '#c09060'); }
  else if (id === 'pedra') { poly(g, [X(-40), Y(26), X(-32), Y(-14), X(-6), Y(-34), X(26), Y(-26), X(40), Y(6), X(32), Y(28)], '#9ca0ac', L); poly(g, [X(-20), Y(-10), X(-4), Y(-26), X(16), Y(-20), X(0), Y(-4)], '#c8ccd4'); }
  else if (id === 'agua') { g.beginPath(); g.moveTo(X(0), Y(-42)); g.quadraticCurveTo(X(40), Y(10), X(0), Y(38)); g.quadraticCurveTo(X(-40), Y(10), X(0), Y(-42)); g.fillStyle = '#3ca8f0'; g.fill(); g.lineWidth = L; g.strokeStyle = INK; g.stroke(); ell(g, X(-10), Y(6), 6 * u, 12 * u, 'rgba(255,255,255,.55)'); }
  else if (id === 'metal') { poly(g, [X(-40), Y(20), X(-26), Y(-16), X(26), Y(-16), X(40), Y(20)], '#8c9cb4', L); poly(g, [X(-22), Y(-12), X(22), Y(-12), X(18), Y(-4), X(-18), Y(-4)], '#c8d4e8'); }
  else if (id === 'escamas') { for (const [dx, dy] of [[-14, 8], [14, 8], [0, -10]]) { g.beginPath(); g.arc(X(dx), Y(dy), 22 * u, Math.PI, 0); g.quadraticCurveTo(X(dx + 22), Y(dy + 20), X(dx), Y(dy + 26)); g.quadraticCurveTo(X(dx - 22), Y(dy + 20), X(dx - 22), Y(dy)); g.fillStyle = '#30c0a8'; g.fill(); g.lineWidth = L * .8; g.strokeStyle = INK; g.stroke(); } }
  else if (id === 'cristal') { poly(g, [X(0), Y(-44), X(26), Y(-10), X(0), Y(40), X(-26), Y(-10)], '#c070f0', L); poly(g, [X(0), Y(-44), X(8), Y(-10), X(0), Y(40), X(-8), Y(-10)], '#e0b0ff'); }
}

/* ---------- moradores ---------- */
const SKINS = ['#f8d4b0', '#e8b088', '#c08860', '#8c5c3c', '#f0c8a0'];
const HAIR = ['#3c2818', '#8c5428', '#f0c048', '#202020', '#c04828'];
export function person(g: Ctx2D, x: number, y: number, s: number, role: string, seed: number, t = 0) {
  const L = Math.max(1.2, s * .07), u = s / 100, X = (v: number) => x + v * u, Y = (v: number) => y + v * u;
  const bob = Math.sin(t * 3 + seed) * 2 * u;
  const col = role === 'explorador' ? '#f08030' : role === 'engenheiro' ? '#3c8cf0' : '#e860a8';
  ell(g, X(0), Y(34) + bob, 30 * u, 24 * u, col, L);
  circ(g, X(0), Y(-8) + bob, 28 * u, SKINS[seed % SKINS.length], L);
  g.beginPath(); g.arc(X(0), Y(-14) + bob, 28 * u, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = HAIR[(seed >> 2) % HAIR.length]; g.fill();
  circ(g, X(-10), Y(-6) + bob, 4 * u, INK); circ(g, X(10), Y(-6) + bob, 4 * u, INK);
  g.lineWidth = L * .8; g.strokeStyle = INK; g.beginPath(); g.arc(X(0), Y(4) + bob, 8 * u, .2, Math.PI - .2); g.stroke();
  if (role === 'explorador') { ell(g, X(0), Y(-30) + bob, 38 * u, 9 * u, '#b07840', L); box(g, X(-18), Y(-50) + bob, 36 * u, 20 * u, 8 * u, '#b07840', L); }
  else if (role === 'engenheiro') { g.beginPath(); g.arc(X(0), Y(-24) + bob, 26 * u, Math.PI, 0); g.closePath(); g.fillStyle = '#f8d040'; g.fill(); g.lineWidth = L; g.strokeStyle = INK; g.stroke(); box(g, X(-30), Y(-26) + bob, 60 * u, 6 * u, 3 * u, '#f8d040', L * .7); }
  else { circ(g, X(18), Y(-30) + bob, 10 * u, '#ff80b0', L * .7); circ(g, X(28), Y(-24) + bob, 7 * u, '#ff80b0', L * .7); }
}

