/* Desenhos estilo desenho animado: hexágonos do favo, abelhas, peças e vespas.
   Tudo em vetor no canvas (contorno escuro grosso, cores vivas). */
import type { Ctx2D, OffCanvas } from './types';
import { WASPS } from './data';

export const INK = '#3a2410';
export function hexRgb(h: string): [number, number, number] { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function sh(h: string, k: number) { const [r, g, b] = hexRgb(h); const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }

let FONT = (s: number) => s + 'px "Lilita One","Arial Black",sans-serif';
export function setFont(f: (s: number) => string) { FONT = f; }
export const font = (s: number) => FONT(s);

/* ---------- formas ---------- */
export function hexPath(g: Ctx2D, x: number, y: number, s: number) {
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); const px = x + s * Math.cos(a), py = y + s * Math.sin(a); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.closePath();
}
function circ(g: Ctx2D, x: number, y: number, r: number, c: string, line = 0) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = c; g.fill(); if (line) { g.lineWidth = line; g.strokeStyle = INK; g.stroke(); } }
function ell(g: Ctx2D, x: number, y: number, rx: number, ry: number, c: string, line = 0, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fillStyle = c; g.fill(); if (line) { g.lineWidth = line; g.strokeStyle = INK; g.stroke(); } }
export function text(g: Ctx2D, s: string, x: number, y: number, size: number, col: string, line = 0, align = 'center') {
  g.font = FONT(size); g.textAlign = align; g.textBaseline = 'middle';
  if (line) { g.lineWidth = line; g.lineJoin = 'round'; g.strokeStyle = INK; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
}

/* ---------- abelha (operária, guarda, rainha) ---------- */
function bee(g: Ctx2D, x: number, y: number, s: number, t: number, kind: 'op' | 'guard' | 'queen', queenCol = '#f8c020') {
  const L = Math.max(1.5, s * .09);
  const flap = Math.sin(t * 22) * .25;
  g.save(); g.translate(x, y);
  /* asas */
  g.globalAlpha = .85;
  ell(g, -s * .18, -s * .32, s * .2, s * .32, '#e8f6ff', L * .8, -.5 + flap);
  ell(g, s * .18, -s * .32, s * .2, s * .32, '#e8f6ff', L * .8, .5 - flap);
  g.globalAlpha = 1;
  /* corpo com listras */
  const body = kind === 'queen' ? queenCol : '#f8c020';
  ell(g, 0, s * .08, s * .34, s * .42, body, L);
  g.save(); g.beginPath(); g.ellipse(0, s * .08, s * .34, s * .42, 0, 0, Math.PI * 2); g.clip?.();
  g.fillStyle = INK; for (const k of [-.02, .2, .4]) g.fillRect(-s * .4, s * k, s * .8, s * .09);
  g.restore();
  /* cabeça */
  circ(g, 0, -s * .3, kind === 'queen' ? s * .2 : s * .22, kind === 'queen' ? '#9c6834' : '#4a3020', L);
  circ(g, -s * .08, -s * .32, s * .06, '#fff'); circ(g, s * .08, -s * .32, s * .06, '#fff');
  circ(g, -s * .07, -s * .31, s * .03, INK); circ(g, s * .09, -s * .31, s * .03, INK);
  g.lineWidth = L * .7; g.strokeStyle = INK; g.beginPath(); g.moveTo(-s * .08, -s * .48); g.quadraticCurveTo(-s * .16, -s * .62, -s * .2, -s * .6); g.moveTo(s * .08, -s * .48); g.quadraticCurveTo(s * .16, -s * .62, s * .2, -s * .6); g.stroke();
  if (kind === 'guard') {
    g.beginPath(); g.arc(0, -s * .34, s * .24, Math.PI, 0); g.closePath(); g.fillStyle = '#3c8cf0'; g.fill(); g.lineWidth = L; g.strokeStyle = INK; g.stroke();
    g.fillStyle = '#9cd0ff'; g.fillRect(-s * .03, -s * .58, s * .06, s * .12);
    g.lineWidth = L; g.strokeStyle = INK; g.beginPath(); g.moveTo(s * .34, -s * .1); g.lineTo(s * .52, -s * .62); g.stroke();
    g.beginPath(); g.moveTo(s * .52, -s * .7); g.lineTo(s * .46, -s * .56); g.lineTo(s * .58, -s * .56); g.closePath(); g.fillStyle = '#d8e0f0'; g.fill(); g.stroke();
  }
  if (kind === 'queen') {
    g.beginPath(); g.moveTo(-s * .2, -s * .46); g.lineTo(-s * .22, -s * .68); g.lineTo(-s * .1, -s * .56); g.lineTo(0, -s * .72); g.lineTo(s * .1, -s * .56); g.lineTo(s * .22, -s * .68); g.lineTo(s * .2, -s * .46); g.closePath();
    g.fillStyle = '#ffd820'; g.fill(); g.lineWidth = L * .8; g.strokeStyle = INK; g.stroke();
    circ(g, 0, -s * .62, s * .04, '#ff4060');
  }
  g.restore();
}

/* ---------- vespa ---------- */
export function wasp(g: Ctx2D, x: number, y: number, s: number, t: number, id: string, hurt = 0, stuck = 0) {
  const W = WASPS[id] || WASPS.vespa, L = Math.max(1.5, s * .09);
  const flap = Math.sin(t * 28 + x) * .3, bob = Math.sin(t * 6 + x * .1) * s * .04;
  g.save(); g.translate(x, y + bob);
  g.globalAlpha = .8;
  ell(g, -s * .22, -s * .28, s * .22, s * .3, '#f4fbff', L * .8, -.8 + flap);
  ell(g, s * .22, -s * .28, s * .22, s * .3, '#f4fbff', L * .8, .8 - flap);
  g.globalAlpha = 1;
  const col = hurt > 0 ? '#ffffff' : W.col;
  /* ferrão */
  g.beginPath(); g.moveTo(-s * .07, s * .42); g.lineTo(0, s * .62); g.lineTo(s * .07, s * .42); g.closePath(); g.fillStyle = INK; g.fill();
  ell(g, 0, s * .14, s * .26, s * .34, col, L);
  g.fillStyle = INK; for (const k of [.04, .22]) g.fillRect(-s * .25, s * k, s * .5, s * .08);
  circ(g, 0, -s * .24, s * .2, sh(W.col, -.3), L);
  /* olhos bravos */
  circ(g, -s * .08, -s * .24, s * .06, '#fff'); circ(g, s * .08, -s * .24, s * .06, '#fff');
  circ(g, -s * .07, -s * .22, s * .03, INK); circ(g, s * .07, -s * .22, s * .03, INK);
  g.lineWidth = L * .9; g.strokeStyle = INK; g.beginPath(); g.moveTo(-s * .16, -s * .36); g.lineTo(-s * .03, -s * .3); g.moveTo(s * .16, -s * .36); g.lineTo(s * .03, -s * .3); g.stroke();
  if (id === 'rainha') { g.beginPath(); g.moveTo(-s * .16, -s * .4); g.lineTo(-s * .18, -s * .58); g.lineTo(-s * .06, -s * .48); g.lineTo(0, -s * .62); g.lineTo(s * .06, -s * .48); g.lineTo(s * .18, -s * .58); g.lineTo(s * .16, -s * .4); g.closePath(); g.fillStyle = '#20202c'; g.fill(); g.lineWidth = L * .7; g.stroke(); }
  if (id === 'bruto') { g.fillStyle = INK; g.fillRect(-s * .2, -s * .44, s * .08, s * .1); g.fillRect(s * .12, -s * .44, s * .08, s * .1); }
  if (stuck) { g.globalAlpha = .7; ell(g, 0, s * .4, s * .36, s * .14, '#f8a020', 0); g.globalAlpha = 1; }
  g.restore();
}

/* ---------- peças ---------- */
export function piece(g: Ctx2D, id: string, x: number, y: number, s: number, t: number, queenCol?: string) {
  const L = Math.max(1.5, s * .09);
  if (id === 'operaria') bee(g, x, y + s * .05, s * .82, t, 'op');
  else if (id === 'guarda') bee(g, x, y + s * .08, s * .82, t, 'guard');
  else if (id === 'rainha') bee(g, x, y + s * .1, s * 1.05, t * .6, 'queen', queenCol);
  else if (id === 'flor') {
    const sw = Math.sin(t * 2 + x) * .08;
    g.save(); g.translate(x, y); g.rotate(sw);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; ell(g, Math.cos(a) * s * .26, Math.sin(a) * s * .26, s * .2, s * .16, '#f06aa8', L * .8, a); }
    circ(g, 0, 0, s * .17, '#ffd820', L * .8); circ(g, -s * .05, -s * .05, s * .05, '#fff8c0');
    g.restore();
  } else if (id === 'cera') {
    hexPath(g, x, y, s * .62); g.fillStyle = '#f4e0a0'; g.fill(); g.lineWidth = L; g.strokeStyle = INK; g.stroke();
    hexPath(g, x, y - s * .06, s * .42); g.fillStyle = '#fff4cc'; g.fill();
    g.lineWidth = L * .6; g.strokeStyle = '#c8a050'; hexPath(g, x, y, s * .62); g.stroke();
  } else if (id === 'ferrao') {
    ell(g, x, y + s * .34, s * .36, s * .12, '#8c4c20', L);
    g.beginPath(); g.moveTo(x - s * .26, y + s * .32); g.lineTo(x, y - s * .56); g.lineTo(x + s * .26, y + s * .32); g.closePath(); g.fillStyle = '#e05a2a'; g.fill(); g.lineWidth = L; g.strokeStyle = INK; g.stroke();
    g.fillStyle = INK; g.fillRect(x - s * .16, y, s * .32, s * .08); g.fillRect(x - s * .1, y - s * .22, s * .2, s * .07);
    circ(g, x, y - s * .56, s * .05, '#fff');
  } else if (id === 'grude') {
    g.beginPath(); g.moveTo(x - s * .4, y + s * .2); g.quadraticCurveTo(x - s * .44, y - s * .36, x, y - s * .38); g.quadraticCurveTo(x + s * .44, y - s * .36, x + s * .4, y + s * .2);
    g.quadraticCurveTo(x + s * .3, y + s * .44, x + s * .18, y + s * .26); g.quadraticCurveTo(x + s * .1, y + s * .5, x, y + s * .3); g.quadraticCurveTo(x - s * .14, y + s * .48, x - s * .2, y + s * .28); g.quadraticCurveTo(x - s * .34, y + s * .42, x - s * .4, y + s * .2); g.closePath();
    g.fillStyle = '#f8a020'; g.fill(); g.lineWidth = L; g.strokeStyle = INK; g.stroke();
    ell(g, x - s * .14, y - s * .14, s * .1, s * .06, '#ffe8a0', 0, -.5);
  } else if (id === 'bercario') {
    for (const [dx, dy] of [[-.2, .1], [.2, .1], [0, -.18]]) { ell(g, x + dx * s, y + dy * s, s * .16, s * .22, '#fdf6ff', L * .8); ell(g, x + dx * s - s * .04, y + dy * s - s * .06, s * .04, s * .06, '#e8d8f8'); }
    g.globalAlpha = .5; circ(g, x, y, s * .5, '#c8a0f0'); g.globalAlpha = 1;
  } else if (id === 'cardo') {
    g.lineWidth = L; g.strokeStyle = '#3c8c3c'; g.beginPath(); g.moveTo(x, y + s * .5); g.lineTo(x, y); g.stroke();
    ell(g, x - s * .18, y + s * .28, s * .16, s * .07, '#5cb84c', L * .7, .5); ell(g, x + s * .18, y + s * .28, s * .16, s * .07, '#5cb84c', L * .7, -.5);
    g.fillStyle = '#5cb84c'; g.beginPath(); for (let i = 0; i < 12; i++) { const a = Math.PI + i / 11 * Math.PI; const r = i % 2 ? s * .32 : s * .2; g.lineTo(x + Math.cos(a) * r, y - s * .02 + Math.sin(a) * r * .4 + s * .06); } g.closePath(); g.fill();
    ell(g, x, y - s * .14, s * .24, s * .2, '#8c5cd8', L);
    g.lineWidth = L * .7; g.strokeStyle = '#c8a0ff'; for (let i = 0; i < 7; i++) { const a = -Math.PI + i / 6 * Math.PI; g.beginPath(); g.moveTo(x + Math.cos(a) * s * .18, y - s * .18 + Math.sin(a) * s * .14); g.lineTo(x + Math.cos(a) * s * .36, y - s * .2 + Math.sin(a) * s * .3); g.stroke(); }
  } else if (id === 'bomba') {
    circ(g, x, y + s * .06, s * .34, '#ffe040', L);
    for (const [dx, dy] of [[-.12, -.04], [.1, .12], [.14, -.12], [-.08, .18]]) circ(g, x + dx * s, y + dy * s + s * .06, s * .05, '#f8a020');
    g.lineWidth = L; g.strokeStyle = INK; g.beginPath(); g.moveTo(x + s * .18, y - s * .22); g.quadraticCurveTo(x + s * .3, y - s * .44, x + s * .44, y - s * .4); g.stroke();
    circ(g, x + s * .46, y - s * .42, s * .08, Math.sin(t * 20) > 0 ? '#ff6020' : '#ffd020');
  } else if (id === 'geleia') {
    g.fillStyle = '#fff0c0'; g.strokeStyle = INK; g.lineWidth = L;
    g.beginPath(); g.moveTo(x - s * .26, y - s * .2); g.lineTo(x - s * .28, y + s * .34); g.quadraticCurveTo(x, y + s * .46, x + s * .28, y + s * .34); g.lineTo(x + s * .26, y - s * .2); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#f8d8f0'; g.fillRect(x - s * .25, y, s * .5, s * .3);
    g.fillStyle = '#c87cc8'; g.fillRect(x - s * .3, y - s * .34, s * .6, s * .14); g.strokeRect?.(x - s * .3, y - s * .34, s * .6, s * .14);
    circ(g, x - s * .1, y + s * .1, s * .05, '#fff');
  } else if (id === 'pedra') {
    g.beginPath(); g.moveTo(x - s * .48, y + s * .3); g.lineTo(x - s * .4, y - s * .1); g.lineTo(x - s * .14, y - s * .34); g.lineTo(x + s * .24, y - s * .28); g.lineTo(x + s * .48, y + s * .04); g.lineTo(x + s * .42, y + s * .32); g.closePath();
    g.fillStyle = '#9c9cac'; g.fill(); g.lineWidth = L; g.strokeStyle = INK; g.stroke();
    g.fillStyle = '#c4c4d0'; g.beginPath(); g.moveTo(x - s * .32, y - s * .06); g.lineTo(x - s * .12, y - s * .26); g.lineTo(x + s * .14, y - s * .2); g.lineTo(x - s * .04, y); g.closePath(); g.fill();
  }
}

/* ---------- imagens das cartas para as telas ---------- */
type MkCanvas = (w: number, h: number) => OffCanvas;
let mk: MkCanvas = null as any;
export function setCanvasMaker(f: MkCanvas) { mk = f; }
const imgCache: { [k: string]: string } = {};
export function iconImage(id: string, size = 120, bg?: string, kind: 'piece' | 'wasp' = 'piece'): string {
  const k = id + size + (bg || '') + kind; if (imgCache[k] != null) return imgCache[k];
  try {
    const c = mk(size, size), g = c.getContext('2d');
    if (bg) { hexPath(g, size / 2, size / 2, size * .48); g.fillStyle = bg; g.fill(); g.lineWidth = size * .04; g.strokeStyle = INK; g.stroke(); }
    const sc = ['operaria', 'guarda', 'rainha'].includes(id) ? .66 : id === 'cera' || id === 'pedra' ? .6 : .56;
    if (kind === 'wasp') wasp(g, size / 2, size * .54, size * .62, 0, id); else piece(g, id, size / 2, size * (id === 'ferrao' ? .5 : .54), size * sc, 0, '#f8c020');
    imgCache[k] = c.toDataURL ? c.toDataURL('image/png') : '';
  } catch (e) { console.warn('iconImage', id, e); imgCache[k] = ''; }
  return imgCache[k];
}
