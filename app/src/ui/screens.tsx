/* Telas da Colmeia de Guerra em React Native: início, prêmio diário, mapa das fases,
   cartas (melhorias), visuais, missões, a partida (mão de cartas e painel), pausa e resultado. */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Btn, C, Card, FONT, OText, Ov, Pill, Pix, Stars, XpBar, useGame, useInfo, useLay } from './kit';
import { LEFT_W, RIGHT_W } from '../engine/game';

export function Screens() {
  const game = useGame();
  const S = useInfo(() => ({ ...game.ui.show }));
  return (
    <>
      {S.menu && <Home />}
      {S.map && <MapScreen />}
      {S.deck && <Deck />}
      {S.shop && <Shop />}
      {S.missions && <Missions />}
      {S.play && <PlayHud />}
      {S.pause && <Pause />}
      {S.res && <Result />}
      {S.daily && <Daily />}
      <Toast />
    </>
  );
}

const T = ({ children, size = 15, color = '#fff', stroke = 0, style, lines, center }: any) => stroke
  ? <OText stroke={stroke} lines={lines} style={[{ fontFamily: FONT.display, fontSize: size, lineHeight: size * 1.18, color, textAlign: center ? 'center' : 'left' }, style]}>{children}</OText>
  : <Text numberOfLines={lines} style={[{ fontFamily: FONT.display, fontSize: size, lineHeight: size * 1.2, color, textAlign: center ? 'center' : 'left' }, style]}>{children}</Text>;
const B = ({ children, size = 13, color = C.ink, style, lines, center }: any) => <Text numberOfLines={lines} style={[{ fontFamily: FONT.body, fontSize: size, lineHeight: size * 1.3, color, textAlign: center ? 'center' : 'left' }, style]}>{children}</Text>;

/* topo das telas */
function Top({ title, right }: { title: string; right?: any }) {
  const game = useGame();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <Btn label="◄" size="sm" kind="brown" onPress={() => game.act.back()} a11y="Voltar" />
      <View style={{ flex: 1 }}><T size={26} stroke={6} color={C.gold}>{title}</T></View>
      {right}
    </View>
  );
}
function LevelChip({ lvl, xp, need }: { lvl: number; xp: number; need: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(58,36,16,.78)', borderWidth: 3, borderColor: C.ink, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 8 }}>
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: C.gold, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><T size={16} color={C.ink}>{lvl}</T></View>
      <View style={{ width: 90, gap: 3 }}>
        <B size={11} color="#fff" style={{ fontFamily: FONT.black }}>{'Nível ' + lvl}</B>
        <XpBar pct={xp / need * 100} />
      </View>
    </View>
  );
}

/* ---------- início ---------- */
function Home() {
  const game = useGame(), lay = useLay();
  const m = useInfo(() => game.info.menu());
  const bw = Math.min(290, lay.W * .38), sh = lay.short;
  return (
    <Ov center={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <LevelChip lvl={m.lvl} xp={m.xp} need={m.need} />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pill n={m.coins} kind="coin" /><Pill n={m.gems} kind="gem" />
          <Btn label={m.sfx ? '🔊' : '🔇'} size="sm" kind="brown" padH={8} onPress={() => game.act.toggleSfx()} a11y="Som" />
          <Btn label={m.mus ? '🎵' : '🎵×'} size="sm" kind="brown" padH={8} onPress={() => game.act.toggleMus()} a11y="Música" />
        </View>
      </View>
      <View style={{ flex: 1, width: bw, justifyContent: 'center', gap: sh ? 4 : 8 }}>
        <View style={{ marginBottom: sh ? 2 : 8 }}>
          <T size={sh ? 30 : 38} stroke={8} color={C.gold}>COLMEIA</T>
          <T size={sh ? 20 : 26} stroke={6} color="#fff" style={{ marginTop: -4 }}>DE GUERRA</T>
        </View>
        <Btn label="JOGAR" kind="play" size={sh ? 'md' : 'big'} onPress={() => game.act.openMap()} start />
        <Btn label="ENXAME SEM FIM" kind="red" size="sm" onPress={() => game.act.playEndless()} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn label="CARTAS" kind="alt" size="sm" style={{ flex: 1 }} onPress={() => game.act.openDeck()} />
          <Btn label="VISUAIS" kind="purple" size="sm" style={{ flex: 1 }} onPress={() => game.act.openShop()} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Btn label="MISSÕES" kind="green" size="sm" onPress={() => game.act.openMissions()} />
            {m.missReady > 0 && <Badge n={m.missReady} />}
          </View>
          <View style={{ flex: 1 }}>
            <Btn label="PRÊMIO" kind="gold" size="sm" onPress={() => game.act.openDaily()} />
            {m.dailyCan && <Badge />}
          </View>
        </View>
        {m.nextUnlock && <B size={11} color="#fff" style={{ fontFamily: FONT.black, marginTop: 2 }}>{'Próxima carta: ' + m.nextUnlock.name + ' (nível ' + m.nextUnlock.lvl + ')'}</B>}
      </View>
    </Ov>
  );
}

/* ---------- prêmio diário ---------- */
function Daily() {
  const game = useGame(), lay = useLay();
  const d = useInfo(() => game.info.daily());
  const bw = Math.min(86, (lay.W - 120) / 7 - 6);
  return (
    <Ov dim>
      <Card maxW={720} scroll={false}>
        <T size={28} stroke={6} color={C.gold} center>PRÊMIO DIÁRIO</T>
        <B center style={{ fontFamily: FONT.bold }}>{d.can ? 'Entre todo dia para ganhar mais! No 7º dia tem baú.' : 'Você já pegou o prêmio de hoje. Volte amanhã!'}</B>
        <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
          {d.days.map((x: any) => (
            <View key={x.i} style={{ width: bw, minHeight: 92, borderRadius: 14, borderWidth: 3, borderColor: x.today ? C.coral : C.ink, backgroundColor: x.done ? '#d8f0c0' : x.i === 6 ? '#ffe8a0' : '#fff4dc', alignItems: 'center', justifyContent: 'space-between', padding: 5 }}>
              <B size={11} style={{ fontFamily: FONT.black }}>{'DIA ' + (x.i + 1)}</B>
              <View style={{ alignItems: 'center', gap: 2 }}>
                {x.coins > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.gold, borderWidth: 2, borderColor: C.ink }} /><T size={14} color={C.ink}>{x.coins}</T></View>}
                {x.gems > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#ff80c0', borderWidth: 2, borderColor: C.ink, transform: [{ rotate: '45deg' }] }} /><T size={14} color={C.ink}>{x.gems}</T></View>}
              </View>
              <B size={10} style={{ fontFamily: FONT.black, color: x.done ? '#3c8c2c' : x.today ? C.coral : C.sub }}>{x.done ? '✓ PEGO' : x.today ? 'HOJE' : x.i === 6 ? 'BAÚ' : ''}</B>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {d.can && <Btn label="PEGAR PRÊMIO" kind="play" onPress={() => { game.act.claimDaily(); }} start />}
          <Btn label={d.can ? 'DEPOIS' : 'FECHAR'} kind="brown" size="sm" onPress={() => game.act.closeDaily()} style={{ alignSelf: 'center' }} />
        </View>
      </Card>
    </Ov>
  );
}

/* ---------- mapa das fases ---------- */
function MapScreen() {
  const game = useGame(), lay = useLay();
  const m = useInfo(() => game.info.map());
  const cw = Math.floor((lay.W - lay.ins.l - lay.ins.r - 32 - 90 - 4 * 8) / 5);
  return (
    <Ov dim center={false}>
      <Top title="FASES" right={<View style={{ flexDirection: 'row', gap: 8 }}><LevelChip lvl={m.lvl} xp={m.xp} need={m.need} /><Pill n={m.coins} kind="coin" /></View>} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {m.regions.map((rg: any) => (
          <View key={rg.name} style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
            <View style={{ width: 86, borderRadius: 14, borderWidth: 3, borderColor: C.ink, backgroundColor: rg.col, alignItems: 'center', justifyContent: 'center' }}><T size={15} stroke={4} center>{rg.name}</T></View>
            {rg.levels.map((l: any) => (
              <Pressable key={l.i} onPress={() => { game.act.btnSound('click'); game.act.playLevel(l.i); }} accessibilityLabel={'Fase ' + (l.i + 1) + ' ' + l.name}>
                <View style={{ width: cw, minHeight: 74, borderRadius: 14, borderWidth: 3, borderColor: C.ink, backgroundColor: l.locked ? '#c8b89c' : l.boss ? '#ffd8d8' : '#fff8ea', padding: 6, alignItems: 'center', justifyContent: 'space-between', opacity: l.locked ? .7 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: l.locked ? '#9c8c74' : l.boss ? C.coral : C.gold, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><T size={12} color={C.ink}>{l.i + 1}</T></View>
                    {l.boss && <B size={10} style={{ fontFamily: FONT.black, color: C.coral }}>CHEFE</B>}
                  </View>
                  <B size={11} center lines={1} style={{ fontFamily: FONT.black }}>{l.name}</B>
                  {l.locked ? <B size={11} center>🔒</B> : <Stars n={l.stars} size={15} />}
                </View>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <Btn label="ENXAME SEM FIM" kind="red" size="sm" onPress={() => game.act.playEndless()} />
          <T size={14} stroke={4}>{'Recorde: onda ' + m.bestWave}</T>
        </View>
      </ScrollView>
    </Ov>
  );
}

/* ---------- cartas e melhorias ---------- */
function Deck() {
  const game = useGame(), lay = useLay();
  const d = useInfo(() => game.info.deck());
  const cw = Math.floor((lay.W - lay.ins.l - lay.ins.r - 32 - 4 * 8) / 5);
  return (
    <Ov dim center={false}>
      <Top title="CARTAS" right={<View style={{ flexDirection: 'row', gap: 8 }}><LevelChip lvl={d.lvl} xp={d.xp} need={d.need} /><Pill n={d.coins} kind="coin" /></View>} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {d.cards.map((c: any) => (
          <View key={c.id} style={{ width: cw, borderRadius: 14, borderWidth: 3, borderColor: C.ink, backgroundColor: c.locked ? '#c8b89c' : '#fff8ea', padding: 6, gap: 3, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.honey, borderRadius: 8, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 5 }}><T size={13} color={C.ink}>{c.cost}</T><B size={9} style={{ fontFamily: FONT.black }}>mel</B></View>
              <B size={10} style={{ fontFamily: FONT.black, color: C.sub }}>{c.locked ? 'nível ' + c.unlock : 'Nv ' + c.lvl + '/' + c.max}</B>
            </View>
            <Pix uri={c.img} w={Math.min(60, cw * .5)} style={{ opacity: c.locked ? .4 : 1 }} />
            <T size={13} color={C.ink} center lines={1}>{c.name}</T>
            <B size={10} center style={{ minHeight: 39 }} lines={3}>{c.desc}</B>
            {!c.locked && c.hp > 0 && <B size={10} style={{ fontFamily: FONT.black, color: '#3c8c2c' }}>{'Vida ' + c.hp}</B>}
            {c.locked ? <B size={10} center style={{ fontFamily: FONT.black, color: C.sub }}>{'Libera no nível ' + c.unlock}</B>
              : c.lvl >= c.max ? <B size={11} style={{ fontFamily: FONT.black, color: '#3c8c2c' }}>NÍVEL MÁXIMO</B>
                : <Btn label={'MELHORAR ' + c.price} size="sm" fontSize={12} padH={8} padV={4} kind={d.coins >= c.price ? 'gold' : 'brown'} onPress={() => game.act.upgrade(c.id)} />}
          </View>
        ))}
      </ScrollView>
    </Ov>
  );
}

/* ---------- visuais ---------- */
function Shop() {
  const game = useGame(), lay = useLay();
  const s = useInfo(() => game.info.shop());
  const cw = Math.floor((lay.W - lay.ins.l - lay.ins.r - 32 - 4 * 10) / 5);
  return (
    <Ov dim center={false}>
      <Top title="VISUAIS DA COLMEIA" right={<Pill n={s.gems} kind="gem" />} />
      <B color="#fff" style={{ fontFamily: FONT.black, marginBottom: 8 }}>Ganhe geleias no prêmio diário, nas missões e vencendo os chefes.</B>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {s.skins.map((k: any) => (
          <View key={k.id} style={{ width: cw, borderRadius: 14, borderWidth: 3, borderColor: k.using ? C.coral : C.ink, backgroundColor: '#fff8ea', padding: 8, gap: 6, alignItems: 'center' }}>
            <View style={{ width: cw - 22, height: 70, borderRadius: 10, borderWidth: 2.5, borderColor: C.ink, backgroundColor: k.bg[1], alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 3, padding: 6, overflow: 'hidden' }}>
              {[0, 1, 2, 3, 4, 5].map(i => <View key={i} style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: k.hex[i % 2], borderWidth: 2, borderColor: C.ink, transform: [{ rotate: '30deg' }] }} />)}
              <View style={{ position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: k.queen, borderWidth: 2.5, borderColor: C.ink }} />
            </View>
            <T size={14} color={C.ink} center lines={1}>{k.name}</T>
            {k.using ? <B size={11} style={{ fontFamily: FONT.black, color: C.coral }}>USANDO</B>
              : k.owned ? <Btn label="USAR" size="sm" kind="alt" onPress={() => game.act.buySkin(k.id)} />
                : <Btn label={k.price + ' geleias'} size="sm" fontSize={13} kind={s.gems >= k.price ? 'purple' : 'brown'} onPress={() => game.act.buySkin(k.id)} />}
          </View>
        ))}
      </View>
    </Ov>
  );
}

/* ---------- missões ---------- */
function Missions() {
  const game = useGame();
  const m = useInfo(() => game.info.missions());
  return (
    <Ov dim center={false}>
      <Top title="MISSÕES DO DIA" right={<View style={{ flexDirection: 'row', gap: 8 }}><Pill n={m.coins} kind="coin" /><Pill n={m.gems} kind="gem" /></View>} />
      <View style={{ gap: 8, maxWidth: 620, alignSelf: 'center', width: '100%' }}>
        {m.list.map((x: any) => (
          <View key={x.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 3, borderColor: C.ink, backgroundColor: x.claimed ? '#d8f0c0' : '#fff8ea', padding: 8 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <T size={16} color={C.ink}>{x.txt}</T>
              <XpBar pct={x.prog / x.n * 100} />
              <B size={11} style={{ fontFamily: FONT.black, color: C.sub }}>{x.prog + ' / ' + x.n + '  ·  prêmio: ' + x.coins + ' moedas'}</B>
            </View>
            {x.claimed ? <T size={16} color="#3c8c2c">✓</T> : <Btn label="PEGAR" size="sm" kind={x.done ? 'play' : 'brown'} disabled={!x.done} onPress={() => game.act.claimMission(x.k)} />}
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <B color="#fff" style={{ fontFamily: FONT.black }}>{'Complete as 3: +' + m.bonusGems + ' geleias'}</B>
          {m.bonus ? <T size={15} stroke={4} color={C.green}>PEGO ✓</T> : <Btn label="BÔNUS" size="sm" kind={m.allClaimed ? 'purple' : 'brown'} disabled={!m.allClaimed} onPress={() => game.act.claimBonus()} />}
        </View>
        <B center color="#fff" style={{ fontFamily: FONT.bold }}>Missões novas todo dia.</B>
      </View>
    </Ov>
  );
}

/* ---------- a partida ---------- */
function PlayHud() {
  const game = useGame(), lay = useLay();
  const p = useInfo(() => game.info.play());
  const cardW = (RIGHT_W - 14) / 2 - 4;
  const player = p.phase === 'player';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* painel esquerdo */}
      <View style={{ position: 'absolute', left: 6 + lay.ins.l, top: 6 + lay.ins.t, bottom: 6 + lay.ins.b, width: LEFT_W - 10, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Btn label="II" size="sm" kind="brown" padH={10} onPress={() => game.act.pause()} a11y="Pausa" />
          <View style={{ flex: 1, borderRadius: 12, borderWidth: 3, borderColor: C.ink, backgroundColor: 'rgba(58,36,16,.82)', alignItems: 'center', justifyContent: 'center' }}>
            <B size={10} color={C.hint} style={{ fontFamily: FONT.black }}>{p.mode === 'endless' ? 'ONDA' : 'TURNO'}</B>
            <T size={17}>{p.mode === 'endless' ? p.turn : p.turn + '/' + p.maxTurns}</T>
          </View>
        </View>
        <View style={{ borderRadius: 14, borderWidth: 3, borderColor: C.ink, backgroundColor: C.honey, alignItems: 'center', paddingVertical: 4 }}>
          <B size={11} style={{ fontFamily: FONT.black }}>MEL</B>
          <T size={30} stroke={5} color="#fff">{p.honey}</T>
        </View>
        <View style={{ borderRadius: 12, borderWidth: 3, borderColor: C.ink, backgroundColor: 'rgba(58,36,16,.82)', padding: 6, gap: 3 }}>
          <B size={10} color={C.hint} style={{ fontFamily: FONT.black }}>{'RAINHA  ' + p.queenHp + '/' + p.queenMax}</B>
          <View style={{ height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.ink, backgroundColor: '#5c3c2c', overflow: 'hidden' }}><View style={{ width: (p.queenHp / p.queenMax * 100) + '%' as any, height: '100%', backgroundColor: p.queenHp / p.queenMax > .4 ? C.gold : C.coral }} /></View>
        </View>
        <View style={{ borderRadius: 12, borderWidth: 3, borderColor: C.ink, backgroundColor: 'rgba(58,36,16,.82)', padding: 6, gap: 3 }}>
          <B size={10} color={C.hint} style={{ fontFamily: FONT.black }}>PRÓXIMA ONDA</B>
          {p.next.length ? p.next.map((w: any) => (
            <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Pix uri={w.img} w={24} /><B size={11} color="#fff" style={{ fontFamily: FONT.black }}>{w.n + '× ' + w.name}</B></View>
          )) : <B size={11} color="#fff" style={{ fontFamily: FONT.bold }}>nenhuma</B>}
        </View>
        {!!p.hint && <View style={{ borderRadius: 12, borderWidth: 3, borderColor: C.ink, backgroundColor: '#fff8ea', padding: 6 }}><B size={11} style={{ fontFamily: FONT.bold }}>{p.hint}</B></View>}
      </View>
      {/* painel direito: a mão */}
      <View style={{ position: 'absolute', right: 6 + lay.ins.r, top: 6 + lay.ins.t, bottom: 6 + lay.ins.b, width: RIGHT_W - 10, gap: 6 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {p.hand.map((h: any, i: number) => (
            <Pressable key={h.uid} onPress={() => game.act.selCard(i)} accessibilityLabel={h.name + ', custa ' + h.cost}>
              <View style={{ width: cardW, height: lay.short ? 78 : 92, borderRadius: 12, borderWidth: 3, borderColor: h.sel ? C.coral : C.ink, backgroundColor: h.ok ? (h.spell ? '#fff0c8' : '#fff8ea') : '#d8c8a8', alignItems: 'center', justifyContent: 'space-between', padding: 3, transform: [{ translateY: h.sel ? -4 : 0 }] }}>
                <View style={{ position: 'absolute', left: 3, top: 3, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: h.free ? C.green : C.honey, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><T size={13} color={C.ink}>{h.cost}</T></View>
                <Pix uri={h.img} w={lay.short ? 44 : 54} style={{ opacity: h.ok ? 1 : .5 }} />
                <T size={12} color={C.ink} lines={1} center>{h.name}</T>
              </View>
            </Pressable>
          ))}
        </View>
        <View style={{ flex: 1, justifyContent: 'flex-end', gap: 6 }}>
          {!!p.selDesc && <View style={{ borderRadius: 12, borderWidth: 3, borderColor: C.ink, backgroundColor: '#fff8ea', padding: 6, gap: 4 }}>
            <B size={11} style={{ fontFamily: FONT.bold }}>{p.selDesc}</B>
            {p.canRecycle && <Pressable onPress={() => game.act.recycle()}><B size={11} style={{ fontFamily: FONT.black, color: C.sub, textDecorationLine: 'underline' }}>Trocar esta carta por 1 de mel</B></Pressable>}
          </View>}
          <Btn label={player ? 'FIM DO TURNO' : 'VESPAS...'} kind={player ? 'play' : 'brown'} disabled={!player} onPress={() => game.act.endTurn()} />
        </View>
      </View>
    </View>
  );
}

/* ---------- pausa ---------- */
function Pause() {
  const game = useGame();
  const m = useInfo(() => game.info.menu());
  return (
    <Ov dim>
      <Card maxW={340} scroll={false}>
        <T size={30} stroke={6} color={C.gold} center>PAUSA</T>
        <Btn label="CONTINUAR" kind="play" onPress={() => game.act.resume()} style={{ alignSelf: 'stretch' }} />
        <Btn label="RECOMEÇAR" kind="alt" size="sm" onPress={() => game.act.restart()} style={{ alignSelf: 'stretch' }} />
        <Btn label="SAIR" kind="red" size="sm" onPress={() => game.act.quit()} style={{ alignSelf: 'stretch' }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn label={m.sfx ? 'SOM: SIM' : 'SOM: NÃO'} size="sm" kind="brown" fontSize={13} onPress={() => game.act.toggleSfx()} />
          <Btn label={m.mus ? 'MÚSICA: SIM' : 'MÚSICA: NÃO'} size="sm" kind="brown" fontSize={13} onPress={() => game.act.toggleMus()} />
        </View>
      </Card>
    </Ov>
  );
}

/* ---------- resultado ---------- */
function Result() {
  const game = useGame();
  const r = useInfo(() => game.info.res());
  return (
    <Ov dim>
      <Card maxW={440} scroll={false}>
        <T size={32} stroke={7} color={r.win ? C.gold : C.coral} center>{r.title}</T>
        <B center style={{ fontFamily: FONT.black, color: C.sub }}>{r.sub}</B>
        {r.win && r.mode === 'camp' && <Stars n={r.stars} size={34} />}
        <View style={{ alignSelf: 'stretch', gap: 2 }}>
          {(r.lines || []).map((l: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><B style={{ fontFamily: FONT.bold }}>{l[0]}</B><B style={{ fontFamily: FONT.black }}>{l[1]}</B></View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pill n={'+' + (r.coins | 0)} kind="coin" />
          <View style={{ backgroundColor: C.teal, borderRadius: 999, borderWidth: 3, borderColor: C.ink, paddingHorizontal: 10, paddingVertical: 2 }}><T size={16}>{'+' + (r.xp | 0) + ' XP'}</T></View>
          {r.gems > 0 && <Pill n={'+' + r.gems} kind="gem" />}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {r.next && <Btn label="PRÓXIMA FASE" kind="play" onPress={() => game.act.resNext()} />}
          <Btn label={r.win ? 'JOGAR DE NOVO' : 'TENTAR DE NOVO'} kind={r.win ? 'alt' : 'gold'} size="sm" onPress={() => game.act.resRetry()} />
          <Btn label="MENU" kind="brown" size="sm" onPress={() => game.act.resMenu()} />
        </View>
      </Card>
    </Ov>
  );
}

/* ---------- aviso ---------- */
function Toast() {
  const game = useGame(), lay = useLay();
  const t = useInfo(() => game.ui.toast);
  if (!t) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 14 + lay.ins.b, zIndex: 20 }]}>
      <View style={{ backgroundColor: '#fff8ea', borderWidth: 3, borderColor: C.ink, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, maxWidth: Math.min(520, lay.W - LEFT_W - RIGHT_W + 40) }}>
        <B center style={{ fontFamily: FONT.black }}>{t.s}</B>
      </View>
    </View>
  );
}
