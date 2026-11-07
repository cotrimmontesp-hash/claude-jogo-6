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
  /* flores e arbustinhos espalhados */
  for (let i = 0; i < 70; i++) { const [x, y] = P(60 + hash(i, 51) * 900, 60 + hash(i, 52) * 520), cols = ['#ffffff', '#ffe060', '#f89cc8', '#c8a0f8', '#ff8c6c']; const c = cols[Math.floor(hash(i, 53) * cols.length)]; for (let j = 0; j < 5; j++) { const fx = x + (hash(i, 60 + j) - .5) * 22 * k, fy = y + (hash(i, 70 + j) - .5) * 10 * k; g.strokeStyle = 'rgba(40,100,30,.6)'; g.lineWidth = k; g.beginPath(); g.moveTo(fx, fy + 4 * k); g.lineTo(fx, fy); g.stroke(); circ(g, fx, fy, 2.2 * k, c); circ(g, fx, fy, .9 * k, '#f8c018'); } }
  for (let i = 0; i < 26; i++) { const [x, y] = P(70 + hash(i, 81) * 880, 80 + hash(i, 82) * 500), r = (7 + hash(i, 83) * 6) * k; ell(g, x + r * .3, y + r * .5, r * 1.3, r * .45, 'rgba(20,50,10,.22)'); circ(g, x - r * .6, y, r * .8, '#3c8c34'); circ(g, x + r * .6, y, r * .75, '#3c8c34'); circ(g, x, y - r * .4, r, '#48a03c'); circ(g, x - r * .3, y - r * .7, r * .4, 'rgba(255,255,220,.15)'); if (hash(i, 84) < .4) for (let j = 0; j < 4; j++) circ(g, x + (hash(i, 90 + j) - .5) * r * 1.6, y - r * (.1 + hash(i, 95 + j) * .6), 1.6 * k, '#e83c3c'); }
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
  /* cocho de água e feno */
  const tx = px + pen.rx * .45 * k, ty = py - pen.ry * .55 * k;
  box(g, tx - 16 * k, ty - 5 * k, 32 * k, 11 * k, 3 * k, '#8c5c34', 1.5); box(g, tx - 13 * k, ty - 4 * k, 26 * k, 5 * k, 2 * k, '#5cb8e8');
  const hx = px - pen.rx * .55 * k, hy = py - pen.ry * .45 * k;
  ell(g, hx + 3 * k, hy + 6 * k, 18 * k, 6 * k, 'rgba(0,0,0,.2)'); box(g, hx - 15 * k, hy - 10 * k, 30 * k, 16 * k, 4 * k, '#e8c860', 1.5); g.strokeStyle = 'rgba(140,100,30,.6)'; g.lineWidth = 1.5 * k; g.beginPath(); g.moveTo(hx - 15 * k, hy - 3 * k); g.lineTo(hx + 15 * k, hy - 3 * k); g.stroke();
  /* terrenos */
  for (const p of plots) {
    const [x, y] = P(p.x, p.y);
    if (!p.open) continue;
    if (!p.used) { g.beginPath(); g.ellipse(x, y + 10 * k, 52 * k, 30 * k, 0, 0, TAU); g.fillStyle = 'rgba(200,170,110,.55)'; g.fill(); g.setLineDash?.([6 * k, 5 * k]); g.lineWidth = 2 * k; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke(); g.setLineDash?.([]); }
    else { g.beginPath(); g.ellipse(x, y + 12 * k, 58 * k, 32 * k, 0, 0, TAU); g.fillStyle = 'rgba(190,160,100,.5)'; g.fill(); }
  }
  /* bordas: floresta em camadas, com sombra por dentro */
  const shade = (x0: number, y0: number, x1: number, y1: number) => { g.fillStyle = grad(g, x0, y0, x1, y1, [[0, 'rgba(20,50,20,.45)'], [1, 'rgba(20,50,20,0)']]); };
  const [ax, ay] = P(0, 0), [bx, by] = P(1000, 600);
  shade(0, ay + 30 * k, 0, ay + 110 * k); g.fillRect(0, 0, W, ay + 110 * k);
  shade(0, by - 10 * k, 0, by - 80 * k); g.fillRect(0, by - 80 * k, W, H);
  shade(ax + 30 * k, 0, ax + 110 * k, 0); g.fillRect(0, 0, ax + 110 * k, H);
  shade(bx - 20 * k, 0, bx - 100 * k, 0); g.fillRect(bx - 100 * k, 0, W, H);
  const edge: [number, number, number][] = [];
  const ext = 260;
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 34; i++) { const xx = -ext + i * (1000 + ext * 2) / 33 + hash(i, 40 + row) * 24; edge.push([xx, 5 - row * 34 + hash(i, 41 + row) * 26 + (hash(i, 49) < .3 ? 30 : 0), row]); edge.push([xx + 14, 622 + row * 30 + hash(i, 42 + row) * 22 - (hash(i, 48) < .3 ? 22 : 0), row]); }
    for (let i = 0; i < 18; i++) { const yy = -40 + i * 38 + hash(i, 45 + row) * 18; edge.push([-6 - row * 40 + hash(i, 43 + row) * 28 + (hash(i, 47) < .3 ? 34 : 0), yy, row]); edge.push([1008 + row * 40 + hash(i, 44 + row) * 26 - (hash(i, 46) < .3 ? 30 : 0), yy + 18, row]); }
  }
  edge.sort((a, b) => a[1] - b[1]);
  for (const [ex, ey, row] of edge) { const [x, y] = P(ex, ey); if (x < -80 || x > W + 80 || y < -40 || y > H + 120) continue; tree(g, x, y, (28 + hash(ex | 0, ey | 0) * 14 + row * 3) * k, (ex * 7 + ey) | 0, hash(ey | 0, ex | 0) < .4 ? 1 : 0); }
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
type BeastDef = { body: string; body2: string; kind: string; ears?: string; horns?: boolean; tail?: string; snout?: number; size: number; id: string };
/* forma de cada quadrúpede (medidas em "sz") */
const QUAD: { [id: string]: { len: number; h: number; leg: number; lw: number; hump: number; head: number; snout: number; sw: number; neck: number } } = {
  lobo: { len: .42, h: .3, leg: .34, lw: .085, hump: .06, head: .17, snout: .2, sw: .1, neck: .12 },
  raposa: { len: .4, h: .26, leg: .28, lw: .07, hump: .02, head: .16, snout: .19, sw: .085, neck: .1 },
  javali: { len: .44, h: .36, leg: .22, lw: .1, hump: .22, head: .2, snout: .17, sw: .13, neck: .02 },
  cabra: { len: .38, h: .3, leg: .4, lw: .07, hump: .04, head: .15, snout: .15, sw: .1, neck: .16 },
  camelo: { len: .42, h: .32, leg: .62, lw: .08, hump: 0, head: .14, snout: .16, sw: .1, neck: 0 },
  lontra: { len: .5, h: .2, leg: .13, lw: .08, hump: 0, head: .13, snout: .08, sw: .1, neck: .06 },
  urso: { len: .46, h: .42, leg: .3, lw: .14, hump: .2, head: .19, snout: .1, sw: .12, neck: .04 },
};
/** traço com contorno escuro (pernas, pescoço, rabo) */
function limb(g: Ctx2D, pts: number[], w: number, col: string, out: string, L: number) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  const path = () => { g.beginPath(); g.moveTo(pts[0], pts[1]); if (pts.length === 6) g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); else for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); };
  path(); g.lineWidth = w + L * 2; g.strokeStyle = out; g.stroke();
  path(); g.lineWidth = w; g.strokeStyle = col; g.stroke();
}
function eye(g: Ctx2D, x: number, y: number, r: number, iris = '#2a1c10') {
  circ(g, x, y, r, iris); circ(g, x + r * .32, y - r * .35, r * .38, '#fff'); circ(g, x - r * .3, y + r * .35, r * .15, 'rgba(255,255,255,.7)');
}
/** caixa do desenho (para caber certinho nos cartões) */
export function beastBox(b: BeastDef, stage: number) {
  const k = b.size * (.7 + stage * .2);
  if (b.kind === 'ave') return { w: .8 * k, h: (b.id === 'coruja' ? 1.15 : 1.05) * k, cx: 0 };
  if (b.kind === 'casco') return { w: 1.5 * k, h: .78 * k, cx: .12 };
  const q = QUAD[b.id] || QUAD.lobo, hs = [1.3, 1.12, 1][stage];
  const top = b.id === 'camelo' ? q.leg + q.h + .5 : q.leg * [.8, .92, 1][stage] + q.h * (1 + q.hump) + q.head * hs * 1.2 + (b.horns ? .12 * (1 + stage * .5) : 0);
  return { w: q.len * 2 + q.head * hs * 2 + q.snout + .3, h: top + .05, cx: .1 };
}
export function beast(g: Ctx2D, b: BeastDef, x: number, y: number, s: number, t: number, stage: number, face: number, walking: boolean) {
  const sz = s * b.size * (.7 + stage * .2), L = Math.max(1, sz * .028);
  const out = sh(b.body, -.55), step = walking ? Math.sin(t * 10) : 0, breathe = Math.sin(t * 2.2) * .012;
  g.save(); g.translate(x, y); g.scale(face, 1);
  ell(g, sz * .02, 0, sz * (b.kind === 'ave' ? .32 : .6), sz * .12, 'rgba(20,30,10,.25)');
  if (b.kind === 'ave') { bird(g, b, sz, L, out, t, stage, walking); g.restore(); return; }
  if (b.kind === 'casco') { turtle(g, b, sz, L, out, t, stage, walking); g.restore(); return; }
  const q = QUAD[b.id] || QUAD.lobo;
  const hs = [1.3, 1.12, 1][stage], legH = sz * q.leg * [.8, .92, 1][stage];
  const Lx = sz * q.len, H = sz * q.h * (1 + breathe), by = -legH, lw = sz * q.lw;
  const dark = sh(b.body, -.22), far = sh(b.body, -.3);
  const leg = (hx: number, ph: number, col: string, back: boolean) => {
    const a = step * ph * .38, top = by - H * .5;
    g.save(); g.translate(hx, top); g.rotate(a); g.translate(-hx, -top);
    const kx = back ? hx - lw * .55 : hx + lw * .15, ky = by + legH * (back ? .45 : .5), fx = kx + (back ? lw * .35 : 0);
    limb(g, [hx, top, hx + (back ? lw * .2 : 0), by + legH * .05, kx, ky, fx, -lw * .35], lw * 1.2, col, out, L);
    g.lineWidth = lw * .5; g.strokeStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(hx - lw * .2, by); g.lineTo(kx - lw * .2, ky); g.stroke();
    const paw = b.id === 'raposa' ? '#3c2a20' : b.id === 'cabra' || b.id === 'camelo' || b.id === 'javali' ? sh(b.body, -.5) : sh(col, -.2);
    g.beginPath(); g.ellipse(fx + lw * .22, -lw * .3, lw * .7, lw * .34, 0, 0, TAU); g.fillStyle = paw; g.fill(); g.lineWidth = L * .8; g.strokeStyle = out; g.stroke();
    g.restore();
  };
  /* pernas (as do outro lado mais escuras); o corpo cobre a parte de cima */
  leg(-Lx * .58 + lw * .7, -1, far, true); leg(Lx * .55 + lw * .7, 1, far, false);
  leg(-Lx * .58, 1, b.body, true); leg(Lx * .55, -1, b.body, false);
  /* rabo */
  const tw = Math.sin(t * 3 + (walking ? t * 4 : 0)) * .25, tx = -Lx * .92, ty = by - H * .72;
  if (b.tail === 'peludo') {
    g.save(); g.translate(tx, ty); g.rotate(.55 + tw * .4);
    g.beginPath(); g.moveTo(0, -sz * .05); g.bezierCurveTo(-sz * .2, -sz * .1, -sz * .42, sz * .02, -sz * .46, sz * .14); g.bezierCurveTo(-sz * .36, sz * .16, -sz * .14, sz * .12, 0, sz * .06); g.closePath();
    g.fillStyle = grad(g, 0, -sz * .1, 0, sz * .15, [[0, sh(b.body, .1)], [1, dark]]); g.fill(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
    g.beginPath(); g.moveTo(-sz * .34, sz * .05); g.bezierCurveTo(-sz * .4, sz * .06, -sz * .44, sz * .1, -sz * .46, sz * .14); g.bezierCurveTo(-sz * .4, sz * .15, -sz * .34, sz * .14, -sz * .3, sz * .12); g.closePath(); g.fillStyle = b.body2; g.fill();
    g.restore();
  } else if (b.tail === 'grosso') {
    g.beginPath(); g.moveTo(tx + sz * .05, ty - sz * .04); g.quadraticCurveTo(tx - sz * .3, ty + sz * (.02 + tw * .1), tx - sz * .5, ty + sz * (.2 + tw * .06)); g.quadraticCurveTo(tx - sz * .26, ty + sz * .15, tx + sz * .05, ty + sz * .1); g.closePath();
    g.fillStyle = dark; g.fill(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  } else if (b.tail === 'curto') { circ(g, tx + sz * .02, ty + sz * .02, sz * .06, dark, 0); g.lineWidth = L; g.strokeStyle = out; g.stroke(); }
  else {
    const up = b.id === 'cabra' ? -1 : 1;
    limb(g, [tx + sz * .04, ty, tx - sz * .12, ty + up * sz * (.02 + tw * .05), tx - sz * .14, ty + up * sz * .18], sz * .035, dark, out, L * .8);
    if (b.id !== 'cabra') ell(g, tx - sz * .14, ty + sz * .2, sz * .035, sz * .06, sh(b.body, -.45));
  }
  /* corcovas do camelo */
  if (b.id === 'camelo') for (let i = 0; i < (stage >= 2 ? 2 : 1); i++) {
    const hx = stage >= 2 ? -Lx * .35 + i * Lx * .6 : -Lx * .05; g.beginPath(); g.ellipse(hx, by - H * .9, Lx * (stage >= 2 ? .3 : .42), H * .55, 0, Math.PI, 0); g.fillStyle = sh(b.body, .08); g.fill(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  }
  /* corpo */
  const wh = q.hump;
  const bodyPath = () => {
    g.beginPath(); g.moveTo(-Lx * .82, by - H * .04);
    g.bezierCurveTo(-Lx * 1.08, by - H * .3, -Lx * 1.06, by - H * .96, -Lx * .68, by - H);
    g.bezierCurveTo(-Lx * .2, by - H * (1.02 + wh * .2), Lx * .35, by - H * (1 + wh), Lx * .72, by - H * (.96 + wh * .8));
    g.bezierCurveTo(Lx * 1.1, by - H * .8, Lx * 1.08, by - H * .1, Lx * .7, by + H * .02);
    g.bezierCurveTo(Lx * .3, by + H * .12, -Lx * .4, by + H * .1, -Lx * .82, by - H * .04); g.closePath();
  };
  bodyPath(); g.fillStyle = grad(g, 0, by - H * (1 + wh), 0, by + H * .1, [[0, sh(b.body, .14)], [.6, b.body], [1, sh(b.body, -.2)]]); g.fill();
  if (g.clip) {
    g.save(); bodyPath(); g.clip();
    if (b.id !== 'urso' && b.id !== 'javali') ell(g, Lx * .1, by + H * .05, Lx * .85, H * .32, b.body2);
    if (b.id === 'raposa' || b.id === 'lobo') ell(g, Lx * .85, by - H * .35, Lx * .32, H * .5, b.body2);
    if (b.id === 'javali') { g.strokeStyle = sh(b.body, -.3); g.lineWidth = L * .8; for (let i = 0; i < 9; i++) { const hx = -Lx * .8 + i * Lx * .2; g.beginPath(); g.moveTo(hx, by - H * .7); g.lineTo(hx + Lx * .05, by - H * .35); g.stroke(); } }
    if (b.id === 'urso' && stage >= 2) { g.beginPath(); g.moveTo(Lx * .7, by - H * .7); g.quadraticCurveTo(Lx * .95, by - H * .6, Lx * .85, by - H * .25); g.quadraticCurveTo(Lx * .75, by - H * .5, Lx * .7, by - H * .7); g.fillStyle = '#f0e0c0'; g.fill(); }
    ell(g, -Lx * .1, by - H * .85, Lx * .7, H * .18, 'rgba(255,255,255,.12)');
    ell(g, -Lx * .62, by - H * .45, Lx * .3, H * .4, 'rgba(0,0,0,.07)'); ell(g, Lx * .55, by - H * .4, Lx * .22, H * .38, 'rgba(0,0,0,.06)');
    g.restore();
  }
  bodyPath(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  /* crina (javali sempre, lobo adulto) */
  if (b.id === 'javali') {
    g.fillStyle = sh(b.body, -.4); g.beginPath();
    const n = 9; for (let i = 0; i <= n; i++) { const f = i / n, xx = -Lx * .5 + f * Lx * 1.15, yy = by - H * (1 + wh * (.3 + f * .6)) + H * .04; g.lineTo(xx, yy + H * .08); g.lineTo(xx + Lx * .06, yy - H * (b.id === 'javali' ? .2 : .12)); }
    g.lineTo(Lx * .65, by - H * .9); g.closePath(); g.fill();
  }
  /* pescoço e cabeça */
  const bob = walking ? Math.abs(Math.sin(t * 10)) * sz * .015 : Math.sin(t * 1.5) * sz * .005;
  let hx: number, hy: number; const hr = sz * q.head * hs;
  if (b.id === 'camelo') {
    hx = Lx * 1.25; hy = by - H * 2.2 + bob;
    limb(g, [Lx * .65, by - H * .6, Lx * 1.25, by - H * .8, hx - hr * .2, hy + hr * .3], sz * .13, b.body, out, L);
  } else { hx = Lx * .95 + sz * q.neck * .5; hy = by - H * (.98 + wh * .5) - sz * q.neck * .7 + bob; if (q.neck > .05) limb(g, [Lx * .6, by - H * .7, hx - hr * .3, hy + hr * .2], sz * q.neck * 1.1, b.body, out, L); }
  if (b.id === 'lobo' && stage >= 1) { g.beginPath(); for (let i = 0; i < 9; i++) { const a = Math.PI * .45 + i / 8 * Math.PI * 1.1, r = hr * (1.15 + (i % 2) * .25); g.lineTo(hx - hr * .25 + Math.cos(a) * r, hy + hr * .25 + Math.sin(a) * r); } g.closePath(); g.fillStyle = b.body2; g.fill(); g.lineWidth = L * .8; g.strokeStyle = out; g.stroke(); }
  head(g, b, hx, hy, hr, sz * q.snout * (stage === 0 ? .8 : 1), L, out, t, stage);
  g.restore();
}
function head(g: Ctx2D, b: BeastDef, hx: number, hy: number, r: number, sl: number, L: number, out: string, t: number, stage: number) {
  const id = b.id, blink = (t % 4.3) > 4.15;
  /* orelhas de trás */
  const earP = () => {
    if (b.ears === 'ponta') { const eh = r * (id === 'raposa' ? 1.25 : id === 'javali' ? .7 : 1.0); for (const [dx, c] of [[-.55, sh(b.body, -.25)], [-.05, b.body]] as [number, string][]) { poly(g, [hx + r * dx - r * .32, hy - r * .55, hx + r * dx - r * .05, hy - r * .55 - eh, hx + r * dx + r * .3, hy - r * .6], c); g.lineWidth = L; g.strokeStyle = out; g.stroke(); poly(g, [hx + r * dx - r * .18, hy - r * .6, hx + r * dx - r * .05, hy - r * .5 - eh * .78, hx + r * dx + r * .16, hy - r * .62], id === 'raposa' ? '#3c2a20' : sh(b.body2, -.05)); } }
    else if (b.ears === 'redonda') { for (const dx of [-.62, .1]) { circ(g, hx + r * dx, hy - r * .75, r * (id === 'camelo' ? .22 : .34), b.body); g.lineWidth = L; g.strokeStyle = out; g.stroke(); circ(g, hx + r * dx, hy - r * .73, r * (id === 'camelo' ? .1 : .17), sh(b.body, -.3)); } }
  };
  earP();
  /* chifres da cabra (crescem com a evolução) */
  if (b.horns) {
    const k = .8 + stage * .45, x0 = hx - r * .1, y0 = hy - r * .6, cx = x0 - r * .9 * k, cy = y0 - r * 1.5 * k, x1 = x0 - r * 1.7 * k, y1 = y0 - r * .2 * k;
    const P = (u: number) => [(1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * cx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * cy + u * u * y1];
    g.lineCap = 'round';
    for (const pass of [0, 1]) for (let i = 0; i < 12; i++) { const u0 = i / 12, u1 = (i + 1) / 12, [ax, ay] = P(u0), [bx2, by2] = P(u1), w = r * .34 * (1 - u0 * .8); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx2, by2); g.lineWidth = pass ? w : w + L * 1.6; g.strokeStyle = pass ? (i % 3 === 2 ? '#a8987c' : '#c8bca0') : '#5c4c38'; g.stroke(); }
  }
  /* crânio + focinho num só contorno */
  const path = () => {
    g.beginPath(); g.moveTo(hx - r * .9, hy);
    g.bezierCurveTo(hx - r * .95, hy - r * .9, hx + r * .3, hy - r * 1.05, hx + r * .6, hy - r * .5);
    g.bezierCurveTo(hx + r * .75, hy - r * .35, hx + r * .7 + sl * .7, hy - r * .3, hx + r * .78 + sl, hy - r * .05);
    g.bezierCurveTo(hx + r * .95 + sl, hy + r * .3, hx + r * .6 + sl, hy + r * .48, hx + r * .3 + sl * .5, hy + r * .5);
    g.bezierCurveTo(hx, hy + r * .9, hx - r * .85, hy + r * .7, hx - r * .9, hy); g.closePath();
  };
  path(); g.fillStyle = grad(g, hx, hy - r, hx, hy + r, [[0, sh(b.body, .15)], [1, sh(b.body, -.15)]]); g.fill();
  if (g.clip) { g.save(); path(); g.clip();
    const muz = id === 'javali' ? '#d8a898' : id === 'urso' ? '#c8a078' : b.body2;
    if (id !== 'cabra' && id !== 'camelo') ell(g, hx + r * .6 + sl * .6, hy + r * .3, r * .55 + sl * .5, r * .42, muz);
    else ell(g, hx + r * .5 + sl * .6, hy + r * .35, r * .5 + sl * .4, r * .3, sh(b.body, -.08));
    if (id === 'raposa' || id === 'lobo') ell(g, hx - r * .2, hy + r * .55, r * .7, r * .35, b.body2);
    g.restore(); }
  path(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  /* nariz */
  if (id === 'javali') { ell(g, hx + r * .82 + sl, hy + r * .12, r * .16, r * .26, '#e8b0a0', L * .8); circ(g, hx + r * .84 + sl, hy + r * .04, r * .05, '#5c3028'); circ(g, hx + r * .84 + sl, hy + r * .2, r * .05, '#5c3028'); }
  else ell(g, hx + r * .78 + sl, hy - r * .04, r * (id === 'urso' ? .2 : .15), r * .11, '#22160e');
  if (id === 'lontra') { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = L * .5; for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(hx + r * .6 + sl, hy + r * .15); g.lineTo(hx + r * 1.3 + sl, hy + r * (.1 + k * .14)); g.stroke(); } }
  /* boca */
  g.strokeStyle = out; g.lineWidth = L * .7; g.beginPath(); g.moveTo(hx + r * .72 + sl, hy + r * .12); g.quadraticCurveTo(hx + r * .55 + sl * .6, hy + r * .32, hx + r * .3 + sl * .3, hy + r * .25); g.stroke();
  /* presas do javali */
  if (id === 'javali') { const tk = 1 + stage * .35; g.beginPath(); g.moveTo(hx + r * .45 + sl * .6, hy + r * .3); g.quadraticCurveTo(hx + r * (.7 + .1 * tk) + sl * .6, hy + r * .25, hx + r * (.62 + .12 * tk) + sl * .6, hy - r * .1 * tk); g.quadraticCurveTo(hx + r * .55 + sl * .6, hy + r * .12, hx + r * .4 + sl * .6, hy + r * .22); g.closePath(); g.fillStyle = '#fff8e8'; g.fill(); g.lineWidth = L * .6; g.strokeStyle = out; g.stroke(); }
  /* barbicha da cabra */
  if (id === 'cabra') poly(g, [hx + r * .5 + sl * .4, hy + r * .42, hx + r * .32 + sl * .3, hy + r * (.85 + stage * .2), hx + r * .12 + sl * .2, hy + r * .5], sh(b.body, -.12), L * .6);
  /* olho */
  const ex = hx + r * .2, ey = hy - r * .2, er = r * (stage === 0 ? .26 : .2);
  if (blink) { g.strokeStyle = '#22160e'; g.lineWidth = L; g.beginPath(); g.moveTo(ex - er, ey); g.quadraticCurveTo(ex, ey + er * .6, ex + er, ey); g.stroke(); }
  else { circ(g, ex, ey, er * 1.25, id === 'lobo' || id === 'raposa' ? '#f8d060' : '#fff8ec'); eye(g, ex + er * .15, ey, er * .9); }
  if (id === 'lobo' || id === 'raposa' || id === 'urso') { g.strokeStyle = out; g.lineWidth = L * .8; g.beginPath(); g.moveTo(ex - er * 1.3, ey - er * 1.2); g.lineTo(ex + er * 1.1, ey - er * 1.5); g.stroke(); }
  /* orelha caída (cabra) por cima */
  if (b.ears === 'caida') { g.save(); g.translate(hx - r * .35, hy - r * .45); g.rotate(-.6); ell(g, -r * .3, 0, r * .42, r * .17, b.body, L); ell(g, -r * .3, 0, r * .28, r * .08, '#e8b0a8'); g.restore(); }
}
function bird(g: Ctx2D, b: BeastDef, sz: number, L: number, out: string, t: number, stage: number, walking: boolean) {
  const flap = walking ? Math.sin(t * 16) : 0, hop = walking ? Math.abs(Math.sin(t * 7)) * sz * .18 : 0, bob = Math.sin(t * 2) * sz * .01;
  g.translate(0, -hop);
  /* patas */
  for (const dx of [-.07, .07]) { g.strokeStyle = '#e0a020'; g.lineWidth = sz * .03; g.lineCap = 'round'; g.beginPath(); g.moveTo(sz * dx, -sz * .14); g.lineTo(sz * dx, -sz * .02); g.stroke(); for (const a of [-.5, 0, .5]) { g.beginPath(); g.moveTo(sz * dx, -sz * .02); g.lineTo(sz * dx + Math.sin(a) * sz * .06, 0); g.stroke(); } }
  if (b.id === 'coruja') {
    const by = -sz * .46 + bob;
    /* corpo em forma de ovo */
    const body = () => { g.beginPath(); g.ellipse(0, by, sz * .3, sz * .36, 0, 0, TAU); };
    body(); g.fillStyle = grad(g, 0, by - sz * .36, 0, by + sz * .36, [[0, sh(b.body, .12)], [1, sh(b.body, -.2)]]); g.fill();
    ell(g, 0, by + sz * .06, sz * .2, sz * .26, b.body2);
    g.strokeStyle = sh(b.body, -.2); g.lineWidth = L * .8; for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) { if (r === 3 && c) continue; const vx = c * sz * .09 + (r % 2) * sz * .045 - sz * .02, vy = by - sz * .06 + r * sz * .08; g.beginPath(); g.moveTo(vx - sz * .03, vy); g.lineTo(vx, vy + sz * .025); g.lineTo(vx + sz * .03, vy); g.stroke(); }
    body(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
    /* asas */
    for (const sd of [-1, 1]) { g.save(); g.translate(sd * sz * .25, by - sz * .1); g.rotate(sd * (.15 + flap * .5)); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(sd * sz * .12, sz * .08, sd * sz * .1, sz * .32, sd * sz * .02, sz * .4); g.bezierCurveTo(-sd * sz * .06, sz * .3, -sd * sz * .05, sz * .1, 0, 0); g.fillStyle = sh(b.body, -.15); g.fill(); g.lineWidth = L; g.strokeStyle = out; g.stroke(); g.strokeStyle = 'rgba(255,240,220,.35)'; g.lineWidth = L * .6; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(sd * sz * .01, sz * (.1 * i)); g.lineTo(sd * sz * .08, sz * (.1 * i + .04)); g.stroke(); } g.restore(); }
    /* cabeça */
    const hy = by - sz * .4, hr = sz * .24 * (stage === 0 ? 1.15 : 1);
    const tuf = hr * (.5 + stage * .15);
    for (const sd of [-1, 1]) poly(g, [sd * hr * .4, hy - hr * .7, sd * hr * .95, hy - hr * .65 - tuf, sd * hr * .85, hy - hr * .25], b.body, L);
    ell(g, 0, hy, hr * 1.05, hr * .9, b.body, L);
    for (const sd of [-1, 1]) circ(g, sd * hr * .45, hy + hr * .05, hr * .48, b.body2);
    g.strokeStyle = sh(b.body, -.25); g.lineWidth = L; g.beginPath(); g.moveTo(-hr * .9, hy - hr * .35); g.quadraticCurveTo(0, hy - hr * .05, hr * .9, hy - hr * .35); g.stroke();
    const blink = (t % 5) > 4.85;
    for (const sd of [-1, 1]) { if (blink) { g.beginPath(); g.moveTo(sd * hr * .45 - hr * .25, hy + hr * .05); g.lineTo(sd * hr * .45 + hr * .25, hy + hr * .05); g.stroke(); } else { circ(g, sd * hr * .45, hy + hr * .05, hr * .3, '#f8a020'); circ(g, sd * hr * .45, hy + hr * .05, hr * .3, 'rgba(0,0,0,0)', L * .7); eye(g, sd * hr * .45, hy + hr * .05, hr * .17, '#1a1008'); } }
    poly(g, [-hr * .12, hy + hr * .25, hr * .12, hy + hr * .25, 0, hy + hr * .55], '#e8a828', L * .7);
    return;
  }
  /* águia (de lado) */
  const by = -sz * .42 + bob;
  /* cauda */
  g.beginPath(); g.moveTo(-sz * .12, by + sz * .1); g.lineTo(-sz * .36, by + sz * .4); g.lineTo(-sz * .2, by + sz * .44); g.lineTo(-sz * .02, by + sz * .2); g.closePath(); g.fillStyle = stage >= 1 ? '#f4f0e8' : sh(b.body, .1); g.fill(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  /* corpo */
  const body = () => { g.beginPath(); g.ellipse(0, by, sz * .27, sz * .3, -.35, 0, TAU); };
  body(); g.fillStyle = grad(g, 0, by - sz * .3, 0, by + sz * .3, [[0, sh(b.body, .15)], [1, sh(b.body, -.2)]]); g.fill(); body(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  /* "calças" de penas */
  ell(g, sz * .02, by + sz * .27, sz * .13, sz * .09, sh(b.body, -.1), L);
  /* asa dobrada cobrindo o lado, com pontas de penas */
  g.save(); g.translate(sz * .08, by - sz * .16); g.rotate(-flap * .9);
  const wing = () => {
    g.beginPath(); g.moveTo(sz * .06, -sz * .04);
    g.bezierCurveTo(-sz * .12, -sz * .08, -sz * .3, sz * .2, -sz * .46, sz * .5);
    for (let i = 0; i < 5; i++) { const f = (i + 1) / 5; g.quadraticCurveTo(-sz * (.42 - f * .1), sz * (.5 - f * .02), -sz * (.4 - f * .12), sz * (.44 - f * .05)); }
    g.bezierCurveTo(-sz * .1, sz * .32, sz * .1, sz * .18, sz * .06, -sz * .04); g.closePath();
  };
  wing(); g.fillStyle = grad(g, 0, -sz * .05, 0, sz * .5, [[0, sh(b.body, .05)], [1, sh(b.body, -.38)]]); g.fill(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  g.strokeStyle = 'rgba(255,230,190,.28)'; g.lineWidth = L * .7; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-sz * (.02 + i * .05), sz * (.06 + i * .07)); g.quadraticCurveTo(-sz * (.15 + i * .05), sz * (.22 + i * .05), -sz * (.3 + i * .02), sz * (.36 + i * .03)); g.stroke(); }
  g.restore();
  /* cabeça branca */
  const hx = sz * .2, hy = by - sz * .3, hr = sz * .15 * (stage === 0 ? 1.2 : 1);
  g.beginPath(); g.moveTo(hx - hr * 1.1, hy + hr * 1.1); g.bezierCurveTo(hx - hr * 1.3, hy - hr * .6, hx - hr * .2, hy - hr * 1.2, hx + hr * .6, hy - hr * .7); g.bezierCurveTo(hx + hr * 1.1, hy - hr * .2, hx + hr * .9, hy + hr * .7, hx + hr * .2, hy + hr * 1.2); g.closePath();
  g.fillStyle = stage === 0 ? '#e8dcc8' : b.body2; g.fill(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  if (stage >= 2) for (let i = 0; i < 3; i++) poly(g, [hx - hr * (.4 + i * .3), hy - hr * (.7 - i * .2), hx - hr * (1 + i * .3), hy - hr * (1 - i * .2), hx - hr * (.6 + i * .3), hy - hr * (.4 - i * .2)], b.body2);
  /* bico curvo */
  g.beginPath(); g.moveTo(hx + hr * .6, hy - hr * .35); g.bezierCurveTo(hx + hr * 1.4, hy - hr * .5, hx + hr * 1.7, hy, hx + hr * 1.35, hy + hr * .5); g.quadraticCurveTo(hx + hr * 1.2, hy + hr * .15, hx + hr * .7, hy + hr * .25); g.closePath(); g.fillStyle = '#f0b830'; g.fill(); g.lineWidth = L * .8; g.strokeStyle = '#7c5410'; g.stroke();
  circ(g, hx + hr * .35, hy - hr * .2, hr * .26, '#f8d050'); eye(g, hx + hr * .4, hy - hr * .2, hr * .17);
  g.strokeStyle = '#3c2a1a'; g.lineWidth = L * 1.1; g.beginPath(); g.moveTo(hx, hy - hr * .5); g.lineTo(hx + hr * .7, hy - hr * .45); g.stroke();
}
function turtle(g: Ctx2D, b: BeastDef, sz: number, L: number, out: string, t: number, stage: number, walking: boolean) {
  const step = walking ? Math.sin(t * 5) : 0, skin = b.body, shell = b.body2, sy = -sz * .14;
  const legC = (x: number, ph: number, c: string) => { const dx = step * ph * sz * .04; g.beginPath(); g.ellipse(x + dx, -sz * .07, sz * .09, sz * .11, 0, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = L; g.strokeStyle = out; g.stroke(); for (const k of [-1, 0, 1]) circ(g, x + dx + k * sz * .04, -sz * .01, sz * .018, '#f4ecd0'); };
  legC(-sz * .28, -1, sh(skin, -.2)); legC(sz * .3, 1, sh(skin, -.2));
  /* cabeça e pescoço */
  const hb = Math.sin(t * 1.3) * sz * .015 + (walking ? Math.sin(t * 5) * sz * .02 : 0), hx = sz * .68 + hb, hy = -sz * .3, hr = sz * .14 * (stage === 0 ? 1.25 : 1);
  limb(g, [sz * .35, sy - sz * .04, sz * .55, hy + sz * .05, hx - hr * .3, hy], sz * .13, skin, out, L);
  ell(g, hx, hy, hr * 1.15, hr * .9, skin, 0); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  ell(g, hx + hr * .1, hy + hr * .4, hr * .8, hr * .3, sh(skin, .25));
  g.strokeStyle = out; g.lineWidth = L * .7; g.beginPath(); g.moveTo(hx + hr * .4, hy + hr * .25); g.quadraticCurveTo(hx + hr * .8, hy + hr * .45, hx + hr * 1.05, hy + hr * .15); g.stroke();
  circ(g, hx + hr * .35, hy - hr * .25, hr * .3, '#fff8ec'); eye(g, hx + hr * .42, hy - hr * .25, hr * .22);
  /* casco */
  const dome = () => { g.beginPath(); g.moveTo(-sz * .58, sy); g.bezierCurveTo(-sz * .56, sy - sz * .55, sz * .52, sy - sz * .58, sz * .56, sy); g.closePath(); };
  dome(); g.fillStyle = grad(g, 0, sy - sz * .5, 0, sy, [[0, sh(shell, .22)], [1, sh(shell, -.22)]]); g.fill();
  if (g.clip) { g.save(); dome(); g.clip();
    g.strokeStyle = sh(shell, -.45); g.lineWidth = L;
    const hex = (cx: number, cy: number, r: number) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.lineTo(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * .75); } g.closePath(); g.fillStyle = sh(shell, .08); g.fill(); g.stroke(); };
    hex(0, sy - sz * .3, sz * .13); hex(-sz * .28, sy - sz * .18, sz * .12); hex(sz * .28, sy - sz * .18, sz * .12);
    ell(g, -sz * .1, sy - sz * .38, sz * .25, sz * .06, 'rgba(255,255,230,.18)');
    g.restore(); }
  dome(); g.lineWidth = L; g.strokeStyle = out; g.stroke();
  /* borda do casco */
  box(g, -sz * .62, sy - sz * .04, sz * 1.22, sz * .09, sz * .045, sh(shell, -.3), L);
  g.strokeStyle = out; g.lineWidth = L * .6; for (let i = 1; i < 8; i++) { const xx = -sz * .62 + i * sz * 1.22 / 8; g.beginPath(); g.moveTo(xx, sy - sz * .04); g.lineTo(xx, sy + sz * .05); g.stroke(); }
  /* adulta: musgo e flor no casco */
  if (stage >= 1) for (const [mx, my] of [[-.2, -.42], [.15, -.46], [.32, -.36]]) circ(g, sz * mx, sy + sz * my + sz * .04, sz * .05, '#5ca040');
  if (stage >= 2) { for (let i = 0; i < 5; i++) circ(g, sz * .05 + Math.cos(i / 5 * TAU) * sz * .03, sy - sz * .5 + Math.sin(i / 5 * TAU) * sz * .03, sz * .025, '#ffd0e0'); circ(g, sz * .05, sy - sz * .5, sz * .018, '#f8c018'); }
}

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
    else if (kind === 'beast' && beastDef) { const bx = beastBox(beastDef, seed), f = Math.min(.9 / bx.w, .82 / bx.h) * size / (beastDef.size * (.7 + seed * .2)); beast(g, beastDef, size * (.5 - bx.cx * f * beastDef.size * (.7 + seed * .2) / size), size * .9, f, 0, seed, 1, false); }
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


/* ---------- mapa ilustrado das regiões ---------- */
export const MAP_W = 1280, MAP_H = 640;
export const mapPos = (x: number, y: number): [number, number] => [(x * .9 + .05) * MAP_W, (y * .84 + .08) * MAP_H];
function terrain(g: Ctx2D, id: number, x: number, y: number, R: number) {
  const rnd = (i: number, k: number) => hash(id * 97 + i, k);
  const scatter = (n: number, f: (px: number, py: number, i: number) => void, rr = .8) => { const pts: [number, number, number][] = []; for (let i = 0; i < n; i++) { const a = rnd(i, 1) * TAU, d = Math.sqrt(rnd(i, 2)) * R * rr; pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d * .7, i]); } pts.sort((p, q) => p[1] - q[1]).forEach(p => f(p[0], p[1], p[2])); };
  if (id === 0) { scatter(14, (px, py) => { g.strokeStyle = '#5ca840'; g.lineWidth = 2; g.beginPath(); g.moveTo(px - 4, py); g.lineTo(px - 6, py - 7); g.moveTo(px, py); g.lineTo(px, py - 9); g.moveTo(px + 4, py); g.lineTo(px + 6, py - 7); g.stroke(); });
    for (const [dx, dy] of [[-18, 4], [8, -8], [20, 10]]) { box(g, x + dx - 9, y + dy - 8, 18, 12, 2, '#f0dcb0', 1.5); poly(g, [x + dx - 12, y + dy - 7, x + dx, y + dy - 18, x + dx + 12, y + dy - 7], '#d0583c', 1.5); } }
  else if (id === 1) scatter(26, (px, py, i) => tree(g, px, py + 10, 13, i + 40, i % 3 === 0 ? 1 : 0), .95);
  else if (id === 2) scatter(9, (px, py, i) => { g.beginPath(); g.ellipse(px, py + 8, 22, 15, 0, Math.PI, 0); g.fillStyle = grad(g, px, py - 8, px, py + 8, [[0, '#d8c494'], [1, '#a8946c']]); g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(60,40,20,.5)'; g.stroke(); if (i % 2) boulder(g, px + 8, py + 10, 9, i); });
  else if (id === 3) { scatter(8, (px, py) => { g.beginPath(); g.moveTo(px - 30, py + 8); g.quadraticCurveTo(px - 4, py - 16, px + 26, py + 8); g.closePath(); g.fillStyle = '#e8b860'; g.fill(); g.beginPath(); g.moveTo(px - 4, py - 4); g.quadraticCurveTo(px + 10, py - 2, px + 26, py + 8); g.lineTo(px + 4, py + 8); g.closePath(); g.fillStyle = 'rgba(160,100,30,.3)'; g.fill(); });
    scatter(4, (px, py) => { g.lineCap = 'round'; g.strokeStyle = '#4c8c3c'; g.lineWidth = 6; g.beginPath(); g.moveTo(px, py + 6); g.lineTo(px, py - 16); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(px, py - 4); g.lineTo(px - 7, py - 6); g.lineTo(px - 7, py - 12); g.moveTo(px, py - 8); g.lineTo(px + 7, py - 10); g.lineTo(px + 7, py - 15); g.stroke(); }, .6); }
  else if (id === 4) { scatter(10, (px, py, i) => { ell(g, px, py, 6, 4, i % 2 ? '#f8d8c8' : '#fff0d8', 1); }); scatter(5, (px, py, i) => tree(g, px, py + 10, 10, i + 70, 0), .5); }
  else if (id === 5) scatter(7, (px, py, i) => { const h = 34 + rnd(i, 5) * 22, w = 30 + rnd(i, 6) * 12; poly(g, [px - w, py + 10, px, py + 10 - h, px + w, py + 10], '#8c8c9c'); poly(g, [px, py + 10 - h, px + w, py + 10, px + w * .2, py + 10], '#6c6c7c'); poly(g, [px - w * .35, py + 10 - h * .65, px, py + 10 - h, px + w * .35, py + 10 - h * .65, px + w * .1, py + 10 - h * .55, px - w * .1, py + 10 - h * .6], '#ffffff'); g.lineWidth = 1.5; g.strokeStyle = 'rgba(40,40,50,.6)'; g.beginPath(); g.moveTo(px - w, py + 10); g.lineTo(px, py + 10 - h); g.lineTo(px + w, py + 10); g.stroke(); }, .9);
  else if (id === 6) scatter(6, (px, py, i) => { g.strokeStyle = '#8c6438'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py + 8); g.quadraticCurveTo(px + 6, py - 8, px + 3, py - 22); g.stroke(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .7; g.strokeStyle = k % 2 ? '#3c9c48' : '#4cb058'; g.lineWidth = 4; g.beginPath(); g.moveTo(px + 3, py - 22); g.quadraticCurveTo(px + 3 + Math.cos(a) * 12, py - 22 + Math.sin(a) * 12 - 4, px + 3 + Math.cos(a) * 18, py - 22 + Math.sin(a) * 18 + 6); g.stroke(); } }, .6);
  else if (id === 7) { scatter(8, (px, py) => { g.strokeStyle = '#5c5478'; g.lineWidth = 2; g.beginPath(); g.moveTo(px - 8, py); g.lineTo(px + 8, py - 3); g.stroke(); });
    for (const [dx, dy, s] of [[-24, -34, 1], [22, -42, .8]]) { for (const [cx, cy, r] of [[-14, 0, 13], [0, -6, 16], [15, 0, 12], [0, 4, 12]]) circ(g, x + dx + cx * s, y + dy + cy * s, r * s, '#5c5470'); for (const [cx, cy, r] of [[-12, -3, 9], [0, -9, 11]]) circ(g, x + dx + cx * s, y + dy + cy * s, r * s, '#7c7494'); poly(g, [x + dx + 2, y + dy + 10, x + dx - 6, y + dy + 26, x + dx + 2, y + dy + 26, x + dx - 4, y + dy + 42, x + dx + 12, y + dy + 20, x + dx + 4, y + dy + 20, x + dx + 10, y + dy + 10], '#ffe040'); } }
  else if (id === 8) { scatter(7, (px, py) => ell(g, px, py, 16, 6, 'rgba(60,90,70,.7)')); scatter(12, (px, py) => { g.strokeStyle = '#4c6c38'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py + 6); g.lineTo(px - 2, py - 10); g.moveTo(px + 3, py + 6); g.lineTo(px + 5, py - 8); g.stroke(); ell(g, px - 2, py - 11, 2, 5, '#6c4c2c'); }); for (let i = 0; i < 3; i++) ell(g, x + (i - 1) * 28, y - 10 + i * 10, 40, 8, 'rgba(230,240,230,.35)'); }
  else if (id === 9) { scatter(5, (px, py, i) => tree(g, px, py + 16, 22, i + 90, 0), .8); scatter(5, (px, py) => { for (const [dx, h, c] of [[-6, 22, '#a8e8f8'], [4, 30, '#c8f4ff'], [12, 18, '#88d0f0']] as [number, number, string][]) { poly(g, [px + dx - 5, py + 6, px + dx, py + 6 - h, px + dx + 5, py + 6], c, 1); } }, .6); }
}
const mapCache: { [k: string]: string } = {};
export function mapImage(regions: { id: number; x: number; y: number; bg: string; bg2: string }[], seen: boolean[], explored: boolean[], routes: [number, number][]): string {
  const key = seen.map(b => b ? 1 : 0).join('') + explored.map(b => b ? 1 : 0).join('');
  if (mapCache[key]) return mapCache[key];
  let out = '';
  try {
    const W = MAP_W, H = MAP_H, c = mk(W, H), g = c.getContext('2d'), R = 112;
    /* mar */
    g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#3c94c8'], [1, '#2c78b0']]); g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; for (let i = 0; i < 70; i++) { const wx = hash(i, 1) * W, wy = hash(i, 2) * H; g.beginPath(); g.moveTo(wx - 10, wy); g.quadraticCurveTo(wx - 5, wy - 5, wx, wy); g.quadraticCurveTo(wx + 5, wy - 5, wx + 10, wy); g.stroke(); }
    const P = regions.map(r => mapPos(r.x, r.y));
    const blob = (x: number, y: number, r: number, seed: number) => { g.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU, w = r * (1 + (hash(seed, i % 28) - .5) * .22 + Math.sin(a * 3 + seed) * .05); g.lineTo(x + Math.cos(a) * w, y + Math.sin(a) * w * .8); } g.closePath(); g.fill(); };
    const main = (i: number) => i !== 6;
    const landAll = (grow: number, col: string) => {
      g.fillStyle = col; for (const r of regions) { const [x, y] = P[r.id]; blob(x, y, (r.id === 6 ? R * .72 : R * 1.12) + grow, r.id * 7 + 3); }
      g.strokeStyle = col; g.lineCap = 'round'; for (const [a, b] of routes) { if (!main(a) || !main(b)) continue; g.lineWidth = R * 1.55 + grow * 2; g.beginPath(); g.moveTo(P[a][0], P[a][1]); g.lineTo(P[b][0], P[b][1]); g.stroke(); }
    };
    /* continente: espuma, areia, grama */
    landAll(30, 'rgba(255,255,255,.22)'); landAll(16, '#e8d49c'); landAll(0, '#78b854');
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 160; i++) circ(g, hash(i, 7) * W, hash(i, 8) * H, 3 + hash(i, 9) * 6, 'rgba(60,110,40,.12)');
    /* chão de cada região (degradê para as bordas) */
    for (const r of regions) { const [x, y] = P[r.id], rr = r.id === 6 ? R * .66 : R * 1.05; const c0 = r.id === 4 ? '#f0e0a8' : r.bg, [cr, cg, cb] = hexRgb(c0), gr = (g as any).createRadialGradient(x, y, rr * .15, x, y, rr); gr.addColorStop(0, c0); gr.addColorStop(.55, c0); gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr, rr * .78, 0, 0, TAU); g.fill(); }
    /* rotas (tracejadas) */
    if (g.setLineDash) g.setLineDash([10, 9]);
    for (const [a, b] of routes) { if (!seen[a] || !seen[b]) continue; g.strokeStyle = explored[a] && explored[b] ? '#7c5028' : 'rgba(124,80,40,.55)'; g.lineWidth = 5; g.beginPath(); g.moveTo(P[a][0], P[a][1]); const mx = (P[a][0] + P[b][0]) / 2, my = (P[a][1] + P[b][1]) / 2 - 18; g.quadraticCurveTo(mx, my, P[b][0], P[b][1]); g.stroke(); }
    if (g.setLineDash) g.setLineDash([]);
    /* desenhos do terreno */
    for (const r of regions) terrain(g, r.id, P[r.id][0], P[r.id][1], r.id === 6 ? R * .5 : R * .78);
    /* neblina sobre o desconhecido */
    for (const r of regions) { if (seen[r.id]) continue; const [x, y] = P[r.id]; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, d = 60 + hash(r.id, i) * 30; circ(g, x + Math.cos(a) * d, y + Math.sin(a) * d * .6, 52 + hash(r.id, i + 9) * 22, 'rgba(225,232,240,.93)'); } circ(g, x, y, 80, 'rgba(235,240,246,.97)'); for (let i = 0; i < 4; i++) circ(g, x - 30 + i * 22, y - 20 - (i % 2) * 14, 26, 'rgba(255,255,255,.6)'); }
    /* moldura de mapa antigo */
    g.lineWidth = 14; g.strokeStyle = '#6c4a2c'; g.strokeRect(7, 7, W - 14, H - 14); g.lineWidth = 3; g.strokeStyle = '#d8b878'; g.strokeRect(18, 18, W - 36, H - 36);
    /* rosa dos ventos */
    const cx = W - 80, cy = H - 80; circ(g, cx, cy, 34, 'rgba(255,248,220,.85)', 2); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 - Math.PI / 2; poly(g, [cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, cx + Math.cos(a + 1.57) * 7, cy + Math.sin(a + 1.57) * 7, cx - Math.cos(a + 1.57) * 7, cy - Math.sin(a + 1.57) * 7], i ? '#6c4a2c' : '#d0402c'); } text(g, 'N', cx, cy - 44, 16, '#6c4a2c');
    out = c.toDataURL ? c.toDataURL('image/jpeg', .86) : '';
  } catch (e) { console.warn('mapImage', e); }
  mapCache[key] = out; return out;
}

/* ---------- vida da vila (desenhada por cima a cada quadro) ---------- */
export function ambience(g: Ctx2D, W: number, H: number, P: (x: number, y: number) => [number, number], k: number, t: number, hour: number, fire: [number, number]) {
  /* brilho no lago */
  const [lx, ly] = P(150, 520);
  for (let i = 0; i < 7; i++) { const a = Math.sin(t * 2 + i * 1.7); if (a < .3) continue; const x = lx + (hash(i, 5) - .5) * 180 * k, y = ly + (hash(i, 6) - .5) * 60 * k; g.globalAlpha = (a - .3) * 1.2; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * k; g.beginPath(); g.moveTo(x - 4 * k, y); g.lineTo(x + 4 * k, y); g.moveTo(x, y - 3 * k); g.lineTo(x, y + 3 * k); g.stroke(); }
  g.globalAlpha = 1;
  /* borboletas */
  for (let i = 0; i < 5; i++) { const [cx, cy] = P(200 + hash(i, 11) * 650, 150 + hash(i, 12) * 380), x = cx + Math.sin(t * .4 + i) * 60 * k, y = cy + Math.sin(t * .7 + i * 2) * 25 * k, f = Math.abs(Math.sin(t * 12 + i)), c = ['#ffe060', '#f8a0d0', '#a0d8ff', '#ffffff', '#ffb050'][i]; ell(g, x - 3 * k * f, y, 3 * k * f + .5, 2.5 * k, c); ell(g, x + 3 * k * f, y, 3 * k * f + .5, 2.5 * k, c); }
  /* sombras de nuvens passando */
  for (let i = 0; i < 3; i++) { const sp = 9 + i * 4, x = ((t * sp * k + hash(i, 21) * W * 1.6) % (W * 1.6)) - W * .3, y = H * (.2 + hash(i, 22) * .6); g.fillStyle = 'rgba(20,40,40,.07)'; for (const [dx, dy, r] of [[0, 0, 70], [60, 10, 55], [-55, 12, 50], [20, -20, 45]]) { g.beginPath(); g.ellipse(x + dx * k, y + dy * k, r * k * 1.4, r * k * .7, 0, 0, TAU); g.fill(); } }
  /* pássaros voando */
  for (let i = 0; i < 4; i++) { const sp = 30 + i * 8, x = ((t * sp * k + hash(i, 31) * W * 1.4) % (W * 1.4)) - W * .2, y = H * (.12 + hash(i, 32) * .3) + Math.sin(t + i) * 10 * k, f = Math.sin(t * 9 + i * 2) * 4 * k; g.strokeStyle = 'rgba(40,40,40,.7)'; g.lineWidth = 1.6 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 7 * k, y - f); g.quadraticCurveTo(x - 3 * k, y - 3 * k, x, y); g.quadraticCurveTo(x + 3 * k, y - 3 * k, x + 7 * k, y - f); g.stroke(); }
  /* luz da hora do dia */
  let tint = '', glow = 0;
  if (hour >= 20 || hour < 5) { tint = 'rgba(24,34,90,.32)'; glow = 1; }
  else if (hour >= 18) { tint = 'rgba(255,120,50,.13)'; glow = .5; }
  else if (hour < 7) { tint = 'rgba(255,200,150,.1)'; glow = .3; }
  if (tint) { g.fillStyle = tint; g.fillRect(0, 0, W, H); }
  if (glow && g.createRadialGradient) { const fl = 1 + Math.sin(t * 9) * .04 + Math.sin(t * 23) * .03, r = 150 * k * fl; const gr = g.createRadialGradient(fire[0], fire[1], 0, fire[0], fire[1], r); gr.addColorStop(0, `rgba(255,190,90,${.42 * glow})`); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(fire[0] - r, fire[1] - r, r * 2, r * 2);
    if (glow >= 1) for (let i = 0; i < 10; i++) { const x = fire[0] + Math.sin(t * .5 + i * 3) * 300 * k, y = fire[1] + Math.cos(t * .37 + i * 2) * 160 * k, a = .5 + .5 * Math.sin(t * 3 + i); circ(g, x, y, 2 * k, `rgba(240,255,140,${a * .8})`); } }
}
