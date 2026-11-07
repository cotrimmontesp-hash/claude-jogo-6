/* Receita de cada som (sintetizado na hora). */
export interface ToneOpt { f: number; f2?: number; t: number; type?: string; v?: number; a?: number; dl?: number; dest?: any }
export interface NoiseOpt { t: number; v?: number; fq?: number; f2?: number; type?: string; q?: number; a?: number; dl?: number }
export interface Synth { tone(o: ToneOpt): void; noise(o: NoiseOpt): void }

export const SFX: { [name: string]: (s: Synth, v: number) => void } = {
  click: (s) => s.tone({ f: 660, f2: 880, t: .06, type: 'triangle', v: .2 }),
  back: (s) => s.tone({ f: 520, f2: 360, t: .07, type: 'triangle', v: .16 }),
  select: (s) => s.tone({ f: 880, t: .05, type: 'triangle', v: .14 }),
  nope: (s) => { s.tone({ f: 220, t: .09, type: 'square', v: .1 }); s.tone({ f: 175, t: .12, type: 'square', v: .1, dl: .08 }); },
  place: (s) => { s.tone({ f: 330, f2: 520, t: .09, type: 'triangle', v: .22 }); s.noise({ t: .06, v: .12, fq: 1800, type: 'bandpass' }); },
  build: (s) => { for (let i = 0; i < 3; i++) { s.noise({ t: .05, v: .22, fq: 1400, type: 'bandpass', q: 3, dl: i * .11 }); s.tone({ f: 220 + i * 60, t: .06, type: 'square', v: .08, dl: i * .11 }); } s.tone({ f: 784, t: .2, type: 'triangle', v: .15, dl: .36 }); },
  break: (s) => s.noise({ t: .35, v: .35, fq: 900, f2: 200, type: 'lowpass' }),
  collect: (s) => { [988, 1175, 1319, 1568].forEach((f, i) => s.tone({ f, t: .08, type: 'triangle', v: .13, dl: i * .05 })); },
  eat: (s) => { for (let i = 0; i < 3; i++) s.noise({ t: .06, v: .2, fq: 700, type: 'lowpass', dl: i * .12 }); s.tone({ f: 300, f2: 500, t: .2, type: 'sine', v: .15, dl: .36 }); },
  grow: (s) => { [392, 523, 659, 784, 1046].forEach((f, i) => s.tone({ f, t: .25, type: 'triangle', v: .18, dl: i * .1 })); s.tone({ f: 110, f2: 80, t: .6, type: 'sine', v: .25 }); },
  travel: (s) => { s.tone({ f: 98, f2: 147, t: .8, type: 'sawtooth', v: .12 }); s.tone({ f: 147, f2: 196, t: .8, type: 'sine', v: .12, dl: .3 }); },
  arrive: (s) => { [523, 659, 784, 1046, 1318].forEach((f, i) => s.tone({ f, t: .22, type: 'triangle', v: .17, dl: i * .09 })); },
  join: (s) => { [659, 880, 1046].forEach((f, i) => s.tone({ f, t: .15, type: 'triangle', v: .16, dl: i * .07 })); },
  good: (s) => { s.tone({ f: 784, t: .08, type: 'triangle', v: .15 }); s.tone({ f: 1046, t: .14, type: 'triangle', v: .15, dl: .08 }); },
  bad: (s) => { s.tone({ f: 330, f2: 220, t: .25, type: 'square', v: .1 }); },
  win: (s) => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => s.tone({ f, t: .2, type: 'triangle', v: .18, dl: i * .1 })); },
  level: (s) => { [523, 784, 1046].forEach((f, i) => s.tone({ f, t: .16, type: 'triangle', v: .16, dl: i * .08 })); },
  prize: (s) => { [659, 784, 988, 1319, 1568].forEach((f, i) => s.tone({ f, t: .2, type: 'triangle', v: .2, dl: i * .08 })); s.noise({ t: .4, v: .1, fq: 6000, type: 'highpass', dl: .35 }); },
};

export const SONGS: { [k: string]: { bpm: number; bass: number[]; lead: number[]; drum?: boolean } } = {
  city: { bpm: 92, bass: [53, 0, 60, 0, 58, 0, 57, 0, 55, 0, 62, 0, 60, 0, 57, 0], lead: [77, 0, 76, 77, 79, 0, 77, 0, 74, 0, 72, 74, 76, 0, 0, 0] },
  travel: { bpm: 108, bass: [50, 0, 57, 50, 53, 0, 57, 0, 48, 0, 55, 48, 52, 0, 55, 0], lead: [0, 74, 0, 72, 0, 69, 0, 0, 0, 72, 0, 74, 0, 76, 0, 0], drum: true },
};
export const midiHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
export function songStep(mode: string, i: number, tone: (o: ToneOpt) => void, noise: (o: NoiseOpt) => void, dl: number) {
  const S = SONGS[mode], sp = 60 / S.bpm / 2, b = S.bass[i % 16], l = S.lead[i % 16];
  if (b) tone({ f: midiHz(b), t: sp * .8, type: 'triangle', v: .12, dl });
  if (l) tone({ f: midiHz(l), t: sp * 1.4, type: 'square', v: .035, dl });
  if (S.drum) { if (i % 4 === 0) tone({ f: 120, f2: 50, t: .1, type: 'sine', v: .14, dl }); if (i % 4 === 2) noise({ t: .05, v: .05, fq: 7000, type: 'highpass', dl }); }
}
