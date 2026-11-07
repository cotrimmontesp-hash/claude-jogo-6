/* Contratos entre o motor do jogo e a plataforma (web/PWA ou WebView do app). */

export interface Ctx2D {
  fillStyle: any;
  strokeStyle: any;
  globalAlpha: number;
  globalCompositeOperation: string;
  imageSmoothingEnabled: boolean;
  lineWidth: number;
  save(): void;
  restore(): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw?: boolean): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void; bezierCurveTo(a: number, b: number, c: number, d: number, e: number, f: number): void;
  rotate(a: number): void;
  clip?(): void;
  setLineDash?(d: number[]): void;
  createRadialGradient?(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): any;
  strokeRect?(x: number, y: number, w: number, h: number): void;
  lineJoin: string; lineCap: string; font: string; textAlign: string; textBaseline: string;
  fillText(s: string, x: number, y: number): void;
  strokeText(s: string, x: number, y: number): void;
  measureText(s: string): { width: number };
  clearRect(x: number, y: number, w: number, h: number): void;
  drawImage(img: any, ...a: number[]): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): any;
}

export interface OffCanvas { width: number; height: number; getContext(kind: '2d'): Ctx2D; toDataURL?(type?: string, q?: number): string }

export interface Insets { t: number; r: number; b: number; l: number }

/** Toque ou mouse já em coordenadas da tela (deitada). */
export interface PtrEv { id: number | string; x: number; y: number; type: 'touch' | 'mouse' | 'pen'; button?: number }

export interface Platform {
  isTouch: boolean;
  /** "?sala=1234" quando aberto por um link (só na web) */
  query: string;
  now(): number;
  storage: { load(): string | null; save(s: string): void };
  createCanvas(w: number, h: number): OffCanvas;
  audio: {
    play(name: string, vol?: number): void;
    /** música que deve estar tocando (null = nenhuma); chamado a cada quadro */
    music(mode: string | null): void;
      setVolumes(sfxOn: boolean, musOn: boolean): void;
  };
  /** compartilhar texto: 'shared', 'copied' ou 'fail' */
  share(text: string): Promise<'shared' | 'copied' | 'fail'>;
  /** vibrar (ms) quando bate */
  vibrate?(ms: number): void;
}
