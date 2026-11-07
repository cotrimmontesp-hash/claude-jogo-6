/* Desenhos estilo desenho animado (vetor no canvas): a criatura vista de cima com a cidade
   no casco, as construções, os materiais, os moradores e o chão de cada região. */
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

/* ---------- chão da região (rola quando a criatura anda) ---------- */
export function ground(g: Ctx2D, W: number, H: number, region: number, bg: string, bg2: string, off: number, t: number) {
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const T = 90, ox = off % T, c0 = Math.floor(off / T);
  for (let cx = -1; cx <= Math.ceil(W / T) + 1; cx++) for (let cy = -1; cy <= Math.ceil(H / T) + 1; cy++) {
    const gx = cx + c0, h1 = hash(gx, cy), h2 = hash(gx * 7 + 3, cy * 5 + 1), x = cx * T - ox + h1 * T, y = cy * T + h2 * T;
    const k = hash(gx * 13, cy * 17);
    if (region === 1 || (region === 8 && k < .4) || (region === 6 && k < .25)) { /* árvores / moitas */
      if (k < .55) { circ(g, x + 4, y + 6, 26 * (.6 + h1 * .6), 'rgba(0,0,0,.15)'); circ(g, x, y, 24 * (.6 + h1 * .6), sh(bg2, -.1 + h2 * .2), 2.5); circ(g, x - 6, y - 7, 9 * (.6 + h1 * .6), sh(bg2, .25)); }
    } else if (region === 2 || region === 5) { if (k < .35) { poly(g, [x - 16, y + 8, x - 8, y - 10, x + 10, y - 12, x + 18, y + 6], sh(bg2, -.1 + h2 * .15), 2.5); poly(g, [x - 8, y - 6, x + 6, y - 9, x + 2, y], sh(bg2, .3)); } }
    else if (region === 3) { if (k < .5) { g.strokeStyle = sh(bg2, -.08); g.lineWidth = 4; g.beginPath(); g.moveTo(x - 30, y); g.quadraticCurveTo(x, y - 14, x + 30, y); g.stroke(); } if (k > .93) { circ(g, x, y, 6, '#4c9c4c', 2); } }
    else if (region === 4 || region === 6) { if (k < .3) { ell(g, x, y, 40 + h1 * 30, 16 + h2 * 10, bg2); ell(g, x - 8, y - 3, 14, 4, 'rgba(255,255,255,.45)'); } else if (k < .38) { circ(g, x, y, 5, '#f8c0c8', 1.5); } }
    else if (region === 7) { if (k < .3) { circ(g, x, y, 20 + h1 * 12, sh(bg2, -.05)); } }
    else if (region === 8) { if (k < .7) { ell(g, x, y, 26, 12, sh(bg2, -.1)); } }
    else { /* campina e gigantes: tufos e flores */
      if (k < .4) { g.strokeStyle = sh(bg2, -.15); g.lineWidth = 3; g.beginPath(); for (const d of [-6, 0, 6]) { g.moveTo(x + d, y + 6); g.lineTo(x + d * 1.4, y - 7); } g.stroke(); }
      else if (k < .5) { circ(g, x, y, 4, region === 9 ? '#fff4b0' : ['#fff', '#ffd040', '#ff80a8'][Math.floor(h1 * 3)], 1.5); }
    }
  }
  if (region === 7) { /* chuva e raios */
    g.strokeStyle = 'rgba(220,230,255,.6)'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < 60; i++) { const x = (hash(i, 9) * W + t * 160) % W, y = (hash(i, 3) * H + t * 520) % H; g.moveTo(x, y); g.lineTo(x - 6, y + 16); } g.stroke();
    if (Math.sin(t * 1.7) > .985) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, W, H); }
  }
  if (region === 8) { g.fillStyle = 'rgba(230,240,230,.18)'; for (let i = 0; i < 5; i++) { ell(g, (hash(i, 1) * W + t * 12 * (i + 1)) % (W + 300) - 150, hash(i, 2) * H, 220, 60, 'rgba(230,240,230,.16)'); } }
}

/* ---------- a criatura (vista de cima, cabeça para a direita) ---------- */
export interface CreatureLook { lvl: number; patas: boolean; nadadeiras: boolean; carapaca: boolean; walk: boolean }
/** desenha a criatura e devolve o retângulo do convés (onde fica a cidade) */
export function creature(g: Ctx2D, cx: number, cy: number, w: number, h: number, t: number, L: CreatureLook) {
  const lw = Math.max(2, w * .012);
  const step = L.walk ? Math.sin(t * 5) : 0, breathe = 1 + Math.sin(t * 1.6) * .008;
  const skin = '#8cc070', skinD = '#6ca054', shell = '#a07c4c', shellD = '#7c5c34';
  /* sombra */
  ell(g, cx + w * .04, cy + h * .1, w * .62, h * .62, 'rgba(0,0,0,.18)');
  /* rabo */
  const tw = Math.sin(t * 2.2) * h * .06;
  poly(g, [cx - w * .44, cy - h * .16, cx - w * .7, cy + tw, cx - w * .44, cy + h * .16], skin, lw);
  /* pernas */
  const legs: [number, number, number][] = [[.3, -.5, 1], [-.28, -.5, -1], [.3, .5, -1], [-.28, .5, 1]];
  for (const [lx, ly, ph] of legs) {
    const sx = cx + w * lx + step * ph * w * .035, sy = cy + h * ly * 1.02;
    const big = L.patas ? 1.25 : 1;
    ell(g, sx, sy, w * .075 * big, h * .17 * big, L.patas ? '#7cb064' : skin, lw);
    if (L.patas) for (const d of [-1, 0, 1]) poly(g, [sx + d * w * .03 - w * .012, sy + Math.sign(ly) * h * .16 * big, sx + d * w * .03, sy + Math.sign(ly) * h * .25 * big, sx + d * w * .03 + w * .012, sy + Math.sign(ly) * h * .16 * big], '#f4f0e0', lw * .7);
  }
  /* nadadeiras */
  if (L.nadadeiras) for (const s of [-1, 1]) {
    const fx = cx + w * .05, fy = cy + s * h * .5, fl = Math.sin(t * 3 + s) * .12;
    g.save(); g.translate(fx, fy); g.rotate(s * (.5 + fl));
    poly(g, [0, 0, -w * .18, s * h * .1, -w * .26, s * h * .32, -w * .08, s * h * .22], '#40c0b0', lw);
    g.lineWidth = lw * .6; g.strokeStyle = '#2c9488'; g.beginPath(); g.moveTo(-w * .05, s * h * .05); g.lineTo(-w * .2, s * h * .25); g.stroke();
    g.restore();
  }
  /* cabeça */
  const hx = cx + w * .52 + (L.walk ? Math.sin(t * 2.5) * w * .008 : 0), hy = cy + Math.sin(t * 1.2) * h * .02, hr = h * .3;
  ell(g, hx - hr * .3, hy, hr * 1.05, hr * .7, skinD, lw);
  ell(g, hx, hy, hr * .95, hr * .82, skin, lw);
  const blink = (t % 4.3) < .12;
  for (const s of [-1, 1]) {
    const ex = hx + hr * .38, ey = hy + s * hr * .38;
    if (blink) { g.lineWidth = lw; g.strokeStyle = INK; g.beginPath(); g.moveTo(ex - hr * .16, ey); g.lineTo(ex + hr * .16, ey); g.stroke(); }
    else { circ(g, ex, ey, hr * .2, '#fff', lw * .8); circ(g, ex + hr * .07, ey, hr * .11, INK); circ(g, ex + hr * .1, ey - hr * .04, hr * .04, '#fff'); }
    ell(g, hx + hr * .1, hy + s * hr * .62, hr * .14, hr * .08, '#f8a0a0');
  }
  ell(g, hx + hr * .78, hy, hr * .08, hr * .2, skinD);
  /* casco */
  const W2 = w * .5 * breathe, H2 = h * .5 * breathe;
  ell(g, cx, cy, W2 * 1.06, H2 * 1.08, shellD, lw);
  if (L.carapaca) { const n = 22; for (let i = 0; i < n; i++) { const a = i / n * TAU; const r1x = W2 * 1.04, r1y = H2 * 1.06, r2x = W2 * 1.2, r2y = H2 * 1.24; const a2 = a + TAU / n / 2, a3 = a + TAU / n; poly(g, [cx + Math.cos(a) * r1x, cy + Math.sin(a) * r1y, cx + Math.cos(a2) * r2x, cy + Math.sin(a2) * r2y, cx + Math.cos(a3) * r1x, cy + Math.sin(a3) * r1y], '#8c7ca8', lw * .7); } }
  ell(g, cx, cy, W2, H2, shell, lw);
  ell(g, cx - W2 * .1, cy - H2 * .12, W2 * .8, H2 * .7, sh(shell, .12));
  /* convés: área retangular arredondada dentro do casco */
  const dw = W2 * 1.5, dh = H2 * 1.42;
  const dx = cx - dw / 2, dy = cy - dh / 2;
  box(g, dx - 4, dy - 4, dw + 8, dh + 8, 14, shellD);
  box(g, dx, dy, dw, dh, 12, '#d8b884', lw * .8);
  return { x: dx, y: dy, w: dw, h: dh };
}

/* ---------- construções ---------- */
export function building(g: Ctx2D, id: string, x: number, y: number, s: number, t: number, ready = 0) {
  const L = Math.max(1.5, s * .045), u = s / 100;
  const X = (v: number) => x + v * u, Y = (v: number) => y + v * u;
  ell(g, X(0), Y(36), 40 * u, 12 * u, 'rgba(0,0,0,.18)');
  if (id === 'casa') {
    box(g, X(-30), Y(-6), 60 * u, 40 * u, 4 * u, '#f4e4c4', L);
    poly(g, [X(-38), Y(-4), X(0), Y(-38), X(38), Y(-4)], '#e05a3c', L);
    box(g, X(-8), Y(12), 16 * u, 22 * u, 3 * u, '#8c5c34', L); box(g, X(12), Y(4), 12 * u, 12 * u, 2 * u, '#80c8f0', L * .8);
  } else if (id === 'roca') {
    box(g, X(-38), Y(-30), 76 * u, 64 * u, 8 * u, '#9c6c3c', L);
    for (let i = 0; i < 4; i++) { const yy = Y(-20 + i * 16); g.strokeStyle = '#7c5428'; g.lineWidth = L * .8; g.beginPath(); g.moveTo(X(-32), yy + 6 * u); g.lineTo(X(32), yy + 6 * u); g.stroke(); for (let j = 0; j < 5; j++) { const xx = X(-28 + j * 14), sw = Math.sin(t * 2 + i + j) * 2 * u; circ(g, xx + sw, yy, 5 * u, i % 2 ? '#5cc048' : '#f0b030', L * .5); } }
  } else if (id === 'serraria') {
    for (let i = 0; i < 3; i++) box(g, X(-36 + i * 4), Y(10 - i * 12), 52 * u, 12 * u, 6 * u, '#b07840', L);
    for (let i = 0; i < 3; i++) circ(g, X(18 + i * 4), Y(16 - i * 12), 5 * u, '#e8c890', L * .6);
    const a = t * 6; g.save(); g.translate(X(22), Y(-20)); g.rotate(a); circ(g, 0, 0, 16 * u, '#d8dce4', L); for (let k = 0; k < 8; k++) { g.rotate(TAU / 8); poly(g, [14 * u, -3 * u, 20 * u, 0, 14 * u, 3 * u], '#d8dce4', L * .5); } circ(g, 0, 0, 4 * u, INK); g.restore();
  } else if (id === 'poco') {
    circ(g, X(0), Y(0), 34 * u, '#9ca0ac', L); circ(g, X(0), Y(0), 22 * u, '#3ca8f0', L);
    ell(g, X(-7), Y(-6), 8 * u, 4 * u, 'rgba(255,255,255,.6)');
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; circ(g, X(Math.cos(a) * 28), Y(Math.sin(a) * 28), 4 * u, '#b8bcc8'); }
  } else if (id === 'armazem') {
    box(g, X(-38), Y(-24), 76 * u, 56 * u, 6 * u, '#c0703c', L);
    poly(g, [X(-42), Y(-22), X(0), Y(-44), X(42), Y(-22)], '#8c4c28', L);
    box(g, X(-14), Y(4), 28 * u, 28 * u, 3 * u, '#f4e4c4', L); g.strokeStyle = INK; g.lineWidth = L * .8; g.beginPath(); g.moveTo(X(-14), Y(4)); g.lineTo(X(14), Y(32)); g.moveTo(X(14), Y(4)); g.lineTo(X(-14), Y(32)); g.stroke();
  } else if (id === 'pedreira') {
    poly(g, [X(-36), Y(30), X(-28), Y(-10), X(-6), Y(-30), X(22), Y(-22), X(38), Y(8), X(30), Y(30)], '#9ca0ac', L);
    poly(g, [X(-20), Y(-6), X(-4), Y(-22), X(14), Y(-16), X(0), Y(-2)], '#c8ccd4');
    g.lineWidth = L * 1.2; g.strokeStyle = '#8c5c34'; g.beginPath(); g.moveTo(X(10), Y(28)); g.lineTo(X(30), Y(-4)); g.stroke();
    poly(g, [X(22), Y(-10), X(40), Y(0), X(34), Y(-8)], '#d8dce4', L * .7);
  } else if (id === 'oficina') {
    box(g, X(-36), Y(-20), 72 * u, 54 * u, 6 * u, '#6c8cc8', L);
    poly(g, [X(-40), Y(-18), X(-20), Y(-38), X(20), Y(-38), X(40), Y(-18)], '#4c6ca0', L);
    g.save(); g.translate(X(0), Y(8)); g.rotate(t * 1.5); for (let k = 0; k < 8; k++) { g.rotate(TAU / 8); box(g, -4 * u, -20 * u, 8 * u, 10 * u, 2 * u, '#f8d040', L * .5); } circ(g, 0, 0, 14 * u, '#f8d040', L); circ(g, 0, 0, 5 * u, '#6c8cc8', L * .6); g.restore();
  } else if (id === 'torre') {
    box(g, X(-16), Y(-30), 32 * u, 64 * u, 4 * u, '#b8a080', L);
    box(g, X(-24), Y(-42), 48 * u, 16 * u, 4 * u, '#8c6c48', L);
    g.lineWidth = L; g.strokeStyle = INK; g.beginPath(); g.moveTo(X(0), Y(-42)); g.lineTo(X(0), Y(-62)); g.stroke();
    poly(g, [X(0), Y(-62), X(22 + Math.sin(t * 4) * 3), Y(-56), X(0), Y(-50)], '#e05a3c', L * .6);
  } else if (id === 'estufa') {
    box(g, X(-36), Y(-6), 72 * u, 38 * u, 6 * u, '#9ca0ac', L);
    g.beginPath(); g.arc(X(0), Y(-2), 34 * u, Math.PI, 0); g.closePath(); g.fillStyle = 'rgba(180,230,255,.75)'; g.fill(); g.lineWidth = L; g.strokeStyle = INK; g.stroke();
    for (const d of [-16, 0, 16]) circ(g, X(d), Y(-6), 7 * u, '#5cc048', L * .5);
    ell(g, X(-12), Y(-20), 8 * u, 4 * u, 'rgba(255,255,255,.7)');
  } else if (id === 'forja') {
    box(g, X(-36), Y(-16), 72 * u, 50 * u, 6 * u, '#5c5c6c', L);
    box(g, X(12), Y(-44), 16 * u, 32 * u, 3 * u, '#7c5c48', L);
    for (let k = 0; k < 3; k++) { const p = (t * .8 + k / 3) % 1; circ(g, X(20 + Math.sin(p * 6) * 4), Y(-48 - p * 30), (4 + p * 6) * u, `rgba(200,200,210,${.7 - p * .6})`); }
    box(g, X(-24), Y(4), 26 * u, 20 * u, 4 * u, '#f87818', L); box(g, X(-20), Y(8), 18 * u, 12 * u, 3 * u, '#ffd040');
  } else if (id === 'farol') {
    poly(g, [X(-16), Y(34), X(-9), Y(-34), X(9), Y(-34), X(16), Y(34)], '#f4f4f4', L);
    for (const yy of [-16, 8]) poly(g, [X(-12), Y(yy + 10), X(-10), Y(yy), X(10), Y(yy), X(12), Y(yy + 10)], '#e05a3c');
    box(g, X(-12), Y(-48), 24 * u, 16 * u, 4 * u, '#ffe880', L);
    g.globalAlpha = .35 + .25 * Math.sin(t * 3); poly(g, [X(0), Y(-40), X(60), Y(-60), X(60), Y(-20)], '#fff8a0'); g.globalAlpha = 1;
  } else if (id === 'jardim') {
    box(g, X(-36), Y(-12), 72 * u, 44 * u, 8 * u, '#8c7c6c', L);
    for (const [dx, hh, c] of [[-20, 36, '#c070f0'], [0, 50, '#e0a0ff'], [20, 32, '#a050e0']] as [number, number, string][]) poly(g, [X(dx - 9), Y(14), X(dx - 6), Y(14 - hh * .7), X(dx), Y(14 - hh), X(dx + 6), Y(14 - hh * .7), X(dx + 9), Y(14)], c, L);
  }
  if (ready > 0) { const b = Math.sin(t * 5) * 3 * u; circ(g, X(30), Y(-36) + b, 13 * u, '#fff', L); text(g, '!', X(30), Y(-35) + b, 18 * u, '#f08030'); }
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

/* ---------- imagens para as telas ---------- */
type MkCanvas = (w: number, h: number) => OffCanvas;
let mk: MkCanvas = null as any;
export function setCanvasMaker(f: MkCanvas) { mk = f; }
const imgCache: { [k: string]: string } = {};
/** PNG de um desenho: kind = 'build' | 'res' | 'role' */
export function iconImage(kind: string, id: string, size = 96, seed = 0): string {
  const key = kind + id + size + '-' + seed; if (imgCache[key] != null) return imgCache[key];
  let out = '';
  try {
    const c = mk(size, size), g = c.getContext('2d');
    if (kind === 'build') building(g, id, size / 2, size * .54, size * .9, 0);
    else if (kind === 'res') resIcon(g, id, size / 2, size / 2, size * .86);
    else if (kind === 'role') person(g, size / 2, size * .46, size * .78, id, seed);
    out = c.toDataURL ? c.toDataURL('image/png') : '';
  } catch (e) { console.warn('iconImage', kind, id, e); out = ''; }
  imgCache[key] = out;
  return out;
}
