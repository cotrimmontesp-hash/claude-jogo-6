/* No celular o motor roda na WebView da tela do jogo (src/webgame).
   Este "jogo remoto" tem a mesma cara do motor para as telas em React Native:
   guarda o último estado que a WebView mandou e repassa os botões para ela. */
import { AppState, Share } from 'react-native';
import type { Game } from '../engine/game';
import { getSaved, storeSave } from '../platform/make';

export function createRemoteGame(): Game {
  const subs = new Set<() => void>();
  const ui: any = { v: 0, show: { menu: true, map: false, deck: false, shop: false, missions: false, daily: false, play: false, pause: false, res: false }, toast: null };
  const E0 = { menu: { coins: 0, gems: 0, lvl: 1, xp: 0, need: 100, stars: 0, maxStars: 45, bestWave: 0, dailyCan: false, missReady: 0, sfx: true, mus: true, queen: '', nextUnlock: null },
    play: { honey: 0, turn: 1, maxTurns: 10, queenHp: 12, queenMax: 12, phase: 'player', mode: 'camp', kills: 0, hint: '', sel: -1, hand: [], selDesc: '', canRecycle: false, next: [], onBoard: 0, pile: 0 },
    map: { coins: 0, gems: 0, lvl: 1, xp: 0, need: 100, regions: [], bestWave: 0 }, deck: { coins: 0, lvl: 1, xp: 0, need: 100, cards: [] }, shop: { gems: 0, coins: 0, skins: [] },
    missions: { list: [], allClaimed: false, bonus: false, bonusGems: 3, coins: 0, gems: 0 }, daily: { can: false, day: 0, streak: 0, days: [] }, res: { title: '', lines: [] } };
  let info: any = { ...E0 };
  let sendRaw: ((o: any) => void) | null = null;
  const queue: any[] = [];
  let ready = false;
  const post = (o: any) => { if (ready && sendRaw) sendRaw(o); else queue.push(o); };
  const emit = () => { ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); };
  /* respostas imediatas (o campo de texto não pode esperar a volta da WebView) */
  const optimistic: { [k: string]: (...a: any[]) => void } = {};
  const back = () => {
    const S = ui.show;
    if (S.daily || S.pause || S.play || S.res || S.map || S.deck || S.shop || S.missions) { post({ t: 'act', k: 'back', a: [] }); return true; }
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
    input: { keyDown: () => false, keyUp() { }, ptrDown: () => false, ptrMove() { }, ptrUp() { } },
    info: {
      menu: () => info.menu, play: () => info.play, map: () => info.map, deck: () => info.deck, shop: () => info.shop,
      missions: () => info.missions, daily: () => info.daily, res: () => info.res, isTouch: () => true,
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
        info = { ...info, ...(m.info || {}) };
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
