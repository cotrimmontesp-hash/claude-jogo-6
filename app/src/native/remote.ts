/* No celular o motor roda na WebView da tela do jogo (src/webgame).
   Este "jogo remoto" tem a mesma cara do motor para as telas em React Native:
   guarda o último estado que a WebView mandou e repassa os botões para ela. */
import { AppState, Share } from 'react-native';
import type { Game } from '../engine/game';
import { getSaved, storeSave } from '../platform/make';

export function createRemoteGame(): Game {
  const subs = new Set<() => void>();
  const ui: any = { v: 0, show: { city: true, build: false, beasts: false, people: false, exped: false, region: false, daily: false, away: false }, toast: null };
  let info: any = {
    city: { res: [], ready: 0, goal: '', moving: false, hungry: false, people: 3, homes: 5, pets: 1, pens: 2, free: 3, dailyCan: false, sfx: true, mus: true, explored: 1 },
    build: { mode: 'none' }, beasts: { pens: 2, food: 0, list: [], wild: [] },
    people: { homes: 5, wait: 0, list: [], roles: [] }, exped: { region: '', danger: 0, types: [], loot: [], torre: 0, need: [], beastLvl: 0, wildHere: [], people: [], pets: [], food: 0, water: 0, waterCamel: 0, stage: 'pick' },
    region: { id: -1 }, daily: { can: false, day: 0, days: [] }, away: { mins: 0, got: [] },
  };
  let sendRaw: ((o: any) => void) | null = null;
  const queue: any[] = [];
  let ready = false;
  const post = (o: any) => { if (ready && sendRaw) sendRaw(o); else queue.push(o); };
  const emit = () => { ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); };
  /* respostas imediatas (o campo de texto não pode esperar a volta da WebView) */
  const optimistic: { [k: string]: (...a: any[]) => void } = {};
  const back = () => {
    const S = ui.show;
    if (S.away || S.daily || S.build || S.beasts || S.people || S.exped || S.region) { post({ t: 'act', k: 'back', a: [] }); return true; }
    return false;
  };
  const act: any = new Proxy({}, {
    get: (_t, k: string) => {
      if (k === 'back') return back;
      return (...a: any[]) => { const o = optimistic[k]; if (o) { o(...a); emit(); } post({ t: 'act', k, a }); };
    },
  });
  AppState.addEventListener('change', st => { post({ t: st === 'active' ? 'show' : 'hide' }); });
  let lay: any = { ins: { t: 0, r: 0, b: 0, l: 0 } };
  const game: any = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout(_W: number, _H: number, _dpr: number, ins: any) { lay = { ins }; post({ t: 'layout', ins }); },
    tick() { }, draw() { },
    input: { keyDown: () => false, keyUp() { }, ptrDown: () => false, ptrMove() { }, ptrUp() { }, wheel() { } },
    info: {
      city: () => info.city, build: () => info.build, beasts: () => info.beasts, people: () => info.people, exped: () => info.exped,
      region: () => info.region, daily: () => info.daily, away: () => info.away, isTouch: () => true,
    },
    act,
    /* ligação com a WebView (usado pela tela do jogo) */
    __init: () => ({ save: getSaved(), ins: lay.ins }),
    __attach(fn: (o: any) => void) { sendRaw = fn; },
    __onMessage(data: string) {
      let m: any; try { m = JSON.parse(data); } catch (e) { return; }
      if (m.t === 'ready') { ready = true; const q = queue.splice(0); for (const o of q) sendRaw && sendRaw(o); }
      else if (m.t === 'snap') {
        const u = m.ui || {};
        ui.show = u.show || ui.show; ui.toast = u.toast || null;
        const ni = m.info || {};
        info = { ...info, ...ni };
        emit();
      }
      else if (m.t === 'save') storeSave(String(m.s || ''));
      else if (m.t === 'share') {
        Share.share({ message: String(m.text || '') }).then(() => post({ t: 'shareRes', id: m.id, r: 'shared' }), () => post({ t: 'shareRes', id: m.id, r: 'fail' }));
      }
    },
  };
  return game as Game;
}
