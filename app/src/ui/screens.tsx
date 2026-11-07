/* Telas da Vila Selvagem em React Native: barra de materiais, botões, construir/melhorar,
   bichos, moradores, mapa das expedições, expedição, prêmio diário e "enquanto você estava fora". */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Btn, C, Card, FONT, OText, Ov, Pix, XpBar, useGame, useInfo, useLay } from './kit';
import { TOP_H, LEFT_W, BOTTOM_H } from '../engine/game';

export function Screens() {
  const game = useGame();
  const S = useInfo(() => ({ ...game.ui.show }));
  return (
    <>
      <Hud />
      {S.build && <BuildSheet />}
      {S.beasts && <Beasts />}
      {S.people && <People />}
      {S.exped && <Exped />}
      {S.map && <MapScreen />}
      {S.away && <Away />}
      {!S.away && S.daily && <Daily />}
      <Toast />
    </>
  );
}

const T = ({ children, size = 15, color = '#fff', stroke = 0, style, lines, center }: any) => stroke
  ? <OText stroke={stroke} lines={lines} style={[{ fontFamily: FONT.display, fontSize: size, lineHeight: size * 1.18, color, textAlign: center ? 'center' : 'left' }, style]}>{children}</OText>
  : <Text numberOfLines={lines} style={[{ fontFamily: FONT.display, fontSize: size, lineHeight: size * 1.2, color, textAlign: center ? 'center' : 'left' }, style]}>{children}</Text>;
const B = ({ children, size = 13, color = C.ink, style, lines, center, w = 'bold' }: any) => <Text numberOfLines={lines} style={[{ fontFamily: w === 'black' ? FONT.black : w === 'bold' ? FONT.bold : FONT.body, fontSize: size, lineHeight: size * 1.3, color, textAlign: center ? 'center' : 'left' }, style]}>{children}</Text>;
const panel = { borderRadius: 14, borderWidth: 3, borderColor: C.ink, backgroundColor: '#fff8ea' } as const;
const dark = { borderRadius: 12, borderWidth: 3, borderColor: C.ink, backgroundColor: 'rgba(46,36,24,.82)' } as const;

/** lista de materiais (custo ou ganho) */
function Bag({ list, size = 22, color = C.ink }: { list: any[]; size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {list.map((r: any) => (
        <View key={r.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Pix uri={r.img} w={size} />
          <T size={size * .66} color={r.ok === false ? C.coral : color}>{r.n}</T>
        </View>
      ))}
    </View>
  );
}
function Head({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <View style={{ flex: 1 }}><T size={24} stroke={6} color={C.gold}>{title}</T></View>
      <Btn label="✕" size="sm" kind="brown" padH={10} onPress={onClose} a11y="Fechar" />
    </View>
  );
}

/* ---------- barra de cima, botões da esquerda, barra de baixo ---------- */
function Hud() {
  const game = useGame(), lay = useLay();
  const c = useInfo(() => game.info.city());
  const S = useInfo(() => ({ ...game.ui.show }));
  if (!S.city && !S.build) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={{ position: 'absolute', left: 6 + lay.ins.l, right: 6 + lay.ins.r, top: 6 + lay.ins.t, height: TOP_H - 8, flexDirection: 'row', alignItems: 'center', gap: 6 }} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 5, alignItems: 'center' }}>
          {c.res.map((r: any) => (
            <View key={r.k} style={[dark, { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingLeft: 3, paddingRight: 8, borderRadius: 999 }]}>
              <Pix uri={r.img} w={24} />
              <View>
                <T size={14} color={r.n >= r.cap ? C.gold : '#fff'}>{r.n + (r.n >= r.cap ? ' (cheio)' : '')}</T>
                {r.rate !== 0 && <B size={9} w="black" color={r.rate > 0 ? '#9cf080' : '#ff9090'} style={{ marginTop: -3 }}>{(r.rate > 0 ? '+' : '') + r.rate + '/h'}</B>}
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={[dark, { paddingHorizontal: 10, paddingVertical: 3 }]}><B size={10} w="black" color={C.hint}>{'MORADORES ' + c.people + '/' + c.homes}</B><T size={13} lines={1}>{'Bichos ' + c.pets + '/' + c.pens}</T></View>
        <Btn label={c.sfx ? '🔊' : '🔇'} size="sm" kind="brown" padH={7} padV={4} onPress={() => game.act.toggleSfx()} a11y="Som" />
      </View>
      <View style={{ position: 'absolute', left: 6 + lay.ins.l, top: TOP_H + lay.ins.t + 2, width: LEFT_W - 12, gap: lay.short ? 3 : 6 }} pointerEvents="box-none">
        <View><Btn label="EXPEDIÇÃO" kind="red" size="sm" fontSize={13} padH={6} onPress={() => game.act.open('map')} />{c.free > 0 && <Badge n={c.free} />}</View>
        <Btn label="BICHOS" kind="green" size="sm" onPress={() => game.act.open('beasts')} />
        <Btn label="MORADORES" kind="purple" size="sm" fontSize={13} padH={6} onPress={() => game.act.open('people')} />
        <View><Btn label="PRÊMIO" kind="gold" size="sm" onPress={() => game.act.openDaily()} />{c.dailyCan && <Badge />}</View>
      </View>
      <View style={{ position: 'absolute', left: LEFT_W + lay.ins.l, right: 6 + lay.ins.r, bottom: 6 + lay.ins.b, height: BOTTOM_H - 10, flexDirection: 'row', alignItems: 'center', gap: 8 }} pointerEvents="box-none">
        <View style={[panel, { flex: 1, paddingHorizontal: 10, paddingVertical: 4, justifyContent: 'center', minHeight: 40 }]} pointerEvents="none">
          <B size={12} w="black" lines={2} color={c.hungry ? C.coral : C.ink}>{c.hungry ? 'Falta comida ou água! A vila produz pela metade.' : c.moving ? 'Toque no terreno para onde quer levar a construção.' : c.goal}</B>
        </View>
        <View><Btn label="RECOLHER" kind="play" onPress={() => game.act.collect()} />{c.ready > 0 && <Badge n={c.ready} />}</View>
      </View>
    </View>
  );
}

/* ---------- construir / informações de um espaço ---------- */
function BuildSheet() {
  const game = useGame(), lay = useLay();
  const b = useInfo(() => game.info.build());
  const w = Math.min(380, lay.W * .46);
  if (b.mode === 'none') return null;
  return (
    <View style={[StyleSheet.absoluteFill]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={() => game.act.closeBuild()} accessibilityLabel="Fechar" />
      <View style={[panel, { position: 'absolute', right: 8 + lay.ins.r, top: TOP_H + lay.ins.t, bottom: 8 + lay.ins.b, width: w, padding: 10 }]}>
        <Head title={b.mode === 'info' ? b.name : b.mode === 'locked' ? 'TERRENO' : 'CONSTRUIR'} onClose={() => game.act.closeBuild()} />
        {b.mode === 'locked' ? (
          <View style={{ gap: 8 }}>
            <B>{b.block + ' ocupam este terreno. Limpe para poder construir aqui.'}</B>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><B w="black">Custa:</B><Bag list={b.cost} /></View>
            <Btn label="LIMPAR TERRENO" kind={b.ok ? 'play' : 'brown'} onPress={() => game.act.clearPlot()} />
          </View>
        ) : b.mode === 'info' ? (
          <ScrollView contentContainerStyle={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Pix uri={b.img} w={92} />
              <View style={{ flex: 1, gap: 2 }}>
                <T size={16} color={C.gold} stroke={4}>{'★'.repeat(b.lvl) + '  nível ' + b.lvl + '/' + b.max}</T>
                <B>{b.desc}</B>
              </View>
            </View>
            {b.rate.length > 0 && <View style={{ gap: 3 }}><B size={11} w="black" color={C.sub}>PRODUZ POR HORA</B><Bag list={b.rate} /></View>}
            {b.stock.length > 0 && <View style={{ gap: 3 }}><B size={11} w="black" color={C.sub}>PRONTO PARA RECOLHER</B><Bag list={b.stock} /></View>}
            {b.next ? <View style={[panel, { padding: 8, gap: 5, backgroundColor: '#f2f8e4' }]}>
              <B w="black">{'Melhorar para o nível ' + (b.lvl + 1) + (b.nextProd ? ' (+' + b.nextProd + '% de produção)' : '')}</B>
              <Bag list={b.next} />
              <Btn label="MELHORAR" kind={b.nextOk ? 'play' : 'brown'} onPress={() => game.act.upgrade()} />
            </View> : <B w="black" color="#3c8c2c">Nível máximo!</B>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Btn label="MUDAR DE LUGAR" size="sm" fontSize={13} kind="alt" onPress={() => game.act.startMove()} />
              <Btn label="DESMONTAR" size="sm" fontSize={13} kind="red" onPress={() => game.act.demolish()} />
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ gap: 6 }}>
            {b.discount > 0 && <B size={11} w="black" color="#3c8c2c">{'Engenheiros: ' + b.discount + '% mais barato'}</B>}
            {b.list.map((x: any) => (
              <Pressable key={x.id} onPress={() => game.act.build(x.id)} accessibilityLabel={'Construir ' + x.name}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, borderWidth: 2.5, borderColor: C.ink, backgroundColor: x.ok ? '#fff' : '#efe2c8', padding: 5 }}>
                  <Pix uri={x.img} w={56} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T size={15} color={C.ink}>{x.name}</T>
                    <B size={10} lines={2}>{x.desc}</B>
                    <Bag list={x.cost} size={18} />
                  </View>
                </View>
              </Pressable>
            ))}
            {b.locked.length > 0 && <View style={{ gap: 2, marginTop: 4 }}>
              <B size={11} w="black" color={C.sub}>AINDA SEM PLANTA</B>
              {b.locked.map((l: any) => <B key={l.name} size={11} color={C.sub}>{'🔒 ' + l.name + ' — descubra em ' + l.where}</B>)}
            </View>}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

/* ---------- bichos ---------- */
function Beasts() {
  const game = useGame(), lay = useLay();
  const b = useInfo(() => game.info.beasts());
  const cw = Math.floor((Math.min(lay.W - 40, 800) - 64) / 3);
  return (
    <Ov dim>
      <Card maxW={820} scroll={false}>
        <Head title={'BICHOS  ' + b.list.length + '/' + b.pens} onClose={() => game.act.closeScreen('beasts')} />
        <ScrollView style={{ maxHeight: lay.H * .68, alignSelf: 'stretch' }} contentContainerStyle={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {b.list.map((p: any) => (
              <View key={p.uid} style={[panel, { width: cw, padding: 7, gap: 3 }]}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Pix uri={p.img} w={70} />
                  <View style={{ flex: 1 }}>
                    <T size={15} color={C.ink} lines={1}>{p.name}</T>
                    <B size={11} w="black" color={C.sub}>{'Nível ' + p.lvl + ' · ' + p.stage}</B>
                    <B size={10} w="black" color="#3c8c2c">{p.traits.join(' · ')}</B>
                  </View>
                </View>
                {p.lvl < p.max ? <><XpBar pct={p.xp / p.need * 100} style={{ height: 9 }} /><B size={10}>{p.xp + '/' + p.need + (p.next ? '  ·  evolui no nível ' + p.next : '')}</B></> : <B size={11} w="black" color="#3c8c2c">Nível máximo!</B>}
                <B size={10} w="black" color={C.blue}>{p.bonus}</B>
                {p.rest > 0 ? <B size={10} w="black" color={C.coral}>{'Descansando ' + p.rest + 's'}</B> : null}
                {p.lvl < p.max && <Btn label={'ALIMENTAR (' + p.feed + ' comida)'} size="sm" fontSize={12} padV={4} kind={b.food >= p.feed ? 'green' : 'brown'} onPress={() => game.act.feedPet(p.uid)} />}
              </View>
            ))}
          </View>
          {b.wild.length > 0 && <View style={{ gap: 4 }}>
            <B size={11} w="black" color={C.sub}>BICHOS QUE AINDA DÁ PARA DOMAR (expedição "Domar bicho")</B>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {b.wild.map((w: any) => (
                <View key={w.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 2, borderColor: C.ink, backgroundColor: '#efe2c8', padding: 4, width: cw }}>
                  <Pix uri={w.img} w={40} style={{ opacity: .6 }} />
                  <View style={{ flex: 1 }}><T size={12} color={C.ink}>{w.name}</T><B size={9}>{w.traits.join(' · ') + ' — em ' + w.where}</B></View>
                </View>
              ))}
            </View>
          </View>}
        </ScrollView>
      </Card>
    </Ov>
  );
}

/* ---------- moradores ---------- */
function People() {
  const game = useGame(), lay = useLay();
  const p = useInfo(() => game.info.people());
  const cw = Math.floor((Math.min(lay.W - 40, 760) - 60) / 4);
  return (
    <Ov dim>
      <Card maxW={780} scroll={false}>
        <Head title={'MORADORES  ' + p.list.length + '/' + p.homes} onClose={() => game.act.closeScreen('people')} />
        {p.wait > 0 && <B w="black" color={C.coral}>{p.wait + ' pessoa(s) esperando casa: construa uma Casa!'}</B>}
        <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
          {p.roles.map((r: any) => <View key={r.k} style={{ flex: 1, borderRadius: 10, borderWidth: 2.5, borderColor: C.ink, backgroundColor: r.col, padding: 5 }}><T size={13}>{r.name + ': ' + r.n}</T><B size={10} color="#fff">{r.desc}</B></View>)}
        </View>
        <ScrollView style={{ maxHeight: lay.H * .5, alignSelf: 'stretch' }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {p.list.map((v: any) => (
            <View key={v.id} style={[panel, { width: cw, padding: 6, flexDirection: 'row', gap: 6, alignItems: 'center' }]}>
              <Pix uri={v.img} w={42} />
              <View style={{ flex: 1, gap: 1 }}>
                <T size={14} color={C.ink} lines={1}>{v.name}</T>
                <B size={10} w="black" color={v.col}>{v.roleName + ' · nv ' + v.lvl}</B>
                {v.need > 0 && <XpBar pct={v.xp / v.need * 100} style={{ height: 8 }} />}
                <B size={10} color={v.rest ? C.coral : '#3c8c2c'}>{v.rest ? 'descansando ' + v.rest + 's' : 'pronto'}</B>
              </View>
            </View>
          ))}
        </ScrollView>
      </Card>
    </Ov>
  );
}

/* ---------- expedição ---------- */
function Exped() {
  const game = useGame(), lay = useLay();
  const e = useInfo(() => game.info.exped());
  const [type, setType] = useState('coletar');
  const [team, setTeam] = useState<number[]>([]);
  const [pets, setPets] = useState<number[]>([]);
  const toggle = (id: number) => setTeam(t => t.includes(id) ? t.filter(x => x !== id) : t.length >= 3 ? t : [...t, id]);
  const togglePet = (id: number) => setPets(t => t.includes(id) ? t.filter(x => x !== id) : t.length >= 2 ? t : [...t, id]);
  const chip = (on: boolean, busy: boolean) => ({ width: 82, borderRadius: 12, borderWidth: 3, borderColor: on ? C.coral : C.ink, backgroundColor: busy ? '#ddd0b8' : on ? '#ffe8c8' : '#fff', padding: 3, alignItems: 'center' as const, opacity: busy ? .6 : 1 });
  return (
    <Ov dim>
      <Card maxW={800} scroll={false}>
        <Head title={'EXPEDIÇÃO · ' + e.region} onClose={() => game.act.closeScreen('exped')} />
        {e.stage === 'pick' ? <>
          <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'stretch' }}>
            {e.types.map((t: any) => (
              <Pressable key={t.id} style={{ flex: 1 }} onPress={() => { game.act.btnSound('click'); setType(t.id); }}>
                <View style={{ borderRadius: 12, borderWidth: 3, borderColor: type === t.id ? C.coral : C.ink, backgroundColor: type === t.id ? '#ffe8c8' : '#fff', padding: 5, minHeight: 56 }}>
                  <T size={14} color={C.ink}>{t.name}</T><B size={10}>{t.id === 'domar' ? (e.wildHere.length ? 'Aqui vivem: ' + e.wildHere.join(', ') + '.' : 'Nenhum bicho para domar aqui.') : t.desc}</B>
                </View>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch', flexWrap: 'wrap' }}>
            <B size={11} w="black" color={C.sub}>TEM:</B><Bag list={e.loot} size={18} />
            <View style={{ flex: 1 }} />
            <B size={11} w="black" color={C.sub}>{'Gasta ' + e.food + ' comida e ' + e.water + ' água' + (e.waterCamel < e.water ? ' (com camelo: ' + e.waterCamel + ')' : '')}</B>
            <B size={11} w="black" color={e.danger > 10 ? C.coral : C.sub}>{'Perigo ' + e.danger + '%' + (e.torre ? ' · Torre +' + e.torre + '%' : '')}</B>
          </View>
          {(e.need.length > 0 || e.beastLvl > 0) && <B size={11} w="black" color={C.coral} style={{ alignSelf: 'flex-start' }}>{'Precisa levar: ' + e.need.map((n: string) => 'bicho que ' + n.toLowerCase()).concat(e.beastLvl ? ['bicho nível ' + e.beastLvl] : []).join(' + ')}</B>}
          <B size={11} w="black" color={C.sub} style={{ alignSelf: 'flex-start' }}>MORADORES (até 3) E BICHOS (até 2)</B>
          <ScrollView horizontal style={{ alignSelf: 'stretch', flexGrow: 0 }} contentContainerStyle={{ gap: 5 }}>
            {e.people.map((v: any) => (
              <Pressable key={'v' + v.id} disabled={v.rest > 0} onPress={() => { game.act.btnSound('click'); toggle(v.id); }}>
                <View style={chip(team.includes(v.id), v.rest > 0)}>
                  <Pix uri={v.img} w={36} />
                  <T size={11} color={C.ink} lines={1}>{v.name}</T>
                  <B size={9} w="black" color={v.col} lines={1}>{v.roleName + ' ' + v.lvl}</B>
                  {v.rest > 0 && <B size={9} color={C.coral}>{v.rest + 's'}</B>}
                </View>
              </Pressable>
            ))}
            <View style={{ width: 2, backgroundColor: C.ink, marginHorizontal: 3 }} />
            {e.pets.map((p: any) => (
              <Pressable key={'p' + p.uid} disabled={p.rest > 0} onPress={() => { game.act.btnSound('click'); togglePet(p.uid); }}>
                <View style={chip(pets.includes(p.uid), p.rest > 0)}>
                  <Pix uri={p.img} w={40} />
                  <T size={11} color={C.ink} lines={1}>{p.name + ' ' + p.lvl}</T>
                  <B size={8} w="black" color="#3c8c2c" lines={1}>{p.traits}</B>
                  {p.rest > 0 && <B size={9} color={C.coral}>{p.rest + 's'}</B>}
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="◄ MAPA" kind="brown" size="sm" onPress={() => game.act.back()} />
            <Btn label="PARTIR!" kind="play" disabled={!team.length} onPress={() => { game.act.expStart(type, team, pets); setTeam([]); setPets([]); }} start />
          </View>
        </>
          : e.stage === 'event' ? <>
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              {e.team.map((m: any) => <Pix key={m.k} uri={m.img} w={36} />)}
              <B w="black" color={C.sub}>{'  Evento ' + (e.i + 1) + ' de ' + e.n}</B>
            </View>
            <View style={[panel, { alignSelf: 'stretch', padding: 10, backgroundColor: e.fera ? '#ffe4dc' : '#fff' }]}><T size={19} color={C.ink} center>{e.txt}</T></View>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              {[e.a, e.b].map((o: any, k: number) => (
                <Pressable key={k} style={{ flex: 1 }} onPress={() => game.act.expChoose(k)} accessibilityLabel={o.txt}>
                  <View style={{ borderRadius: 14, borderWidth: 3, borderColor: C.ink, backgroundColor: k ? '#d8ecff' : '#fff0c8', padding: 8, gap: 3, minHeight: 74 }}>
                    <T size={16} color={C.ink}>{o.txt}</T>
                    {!!o.who && <B size={11} w="black" color={o.has ? '#3c8c2c' : C.sub}>{(o.has ? '✓ ' : '') + 'melhor com ' + o.who}</B>}
                    <B size={11} w="black" color={C.sub}>{'Chance: ' + o.pct + '%'}</B>
                  </View>
                </Pressable>
              ))}
            </View>
            {e.log.map((l: string, i: number) => <B key={i} size={11} color={l.startsWith('✓') ? '#3c8c2c' : C.coral}>{l}</B>)}
          </>
            : <>
              <T size={22} stroke={5} color={e.reward.score >= 2 ? C.gold : '#fff'} center>{e.reward.score >= 2 ? 'Expedição incrível!' : e.reward.score === 1 ? 'Voltaram com algumas coisas' : 'Foi difícil…'}</T>
              {e.log.map((l: string, i: number) => <B key={i} size={12} color={l.startsWith('✓') ? '#3c8c2c' : C.coral}>{l}</B>)}
              {!!e.reward.discovered && <View style={[panel, { padding: 8, backgroundColor: '#fff4c8', alignSelf: 'stretch', gap: 2 }]}>
                <T size={15} color={C.ink}>{'Descobriram ' + e.reward.discovered.name + '!'}</T>
                {e.reward.discovered.blue.length > 0 && <B w="black" color="#3c8c2c">{'Planta nova: ' + e.reward.discovered.blue.join(', ')}</B>}
                {e.reward.discovered.beasts.length > 0 && <B w="black" color={C.blue}>{'Bichos da região: ' + e.reward.discovered.beasts.join(', ')}</B>}
              </View>}
              {e.reward.loot.length > 0 && <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><B w="black">Trouxeram:</B><Bag list={e.reward.loot} size={26} /></View>}
              {e.reward.full && <B size={11} w="black" color={C.coral}>Parte ficou para trás: os depósitos estavam cheios.</B>}
              {!!e.reward.newPet && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pix uri={e.reward.petImg} w={60} /><T size={17} color="#3c8c2c">{'Domaram um ' + e.reward.newPet + '!'}</T></View>}
              {!!e.reward.person && <B w="black" color="#3c8c2c">{'Encontraram alguém: um ' + e.reward.person.toLowerCase() + '!'}</B>}
              {e.reward.ups.map((u: string) => <B key={u} w="black" color={C.blue}>{u}</B>)}
              <Btn label="OK" kind="play" onPress={() => game.act.expEnd()} />
            </>}
      </Card>
    </Ov>
  );
}

/* ---------- mapa (escolher para onde ir) ---------- */
function MapScreen() {
  const game = useGame(), lay = useLay();
  const m = useInfo(() => game.info.map());
  const [pick, setPick] = useState<number | null>(null);
  const mw = lay.W - lay.ins.l - lay.ins.r - 40, mh = lay.H - lay.ins.t - lay.ins.b - 70;
  const P = (n: any) => ({ x: 20 + n.x * (mw - 40), y: 10 + n.y * (mh - 50) });
  const sel = pick != null ? m.nodes[pick] : null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#3c8cc8' }]}>
      <View style={{ position: 'absolute', left: 16 + lay.ins.l, right: 16 + lay.ins.r, top: 8 + lay.ins.t }}>
        <Head title="PARA ONDE VAMOS?" onClose={() => game.act.closeScreen('map')} />
      </View>
      <View style={{ position: 'absolute', left: 20 + lay.ins.l, top: 56 + lay.ins.t, width: mw, height: mh }}>
        {m.lines.map((l: any, i: number) => {
          if (!l.seen) return null;
          const a = P(m.nodes[l.a]), b = P(m.nodes[l.b]); const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
          return <View key={i} style={{ position: 'absolute', left: (a.x + b.x) / 2 - len / 2, top: (a.y + b.y) / 2 - 2, width: len, height: 4, backgroundColor: 'rgba(255,255,255,.55)', borderRadius: 2, transform: [{ rotate: ang + 'rad' }] }} />;
        })}
        {m.nodes.map((n: any) => {
          const p = P(n); const sz = n.home ? 58 : 48;
          return (
            <Pressable key={n.id} onPress={() => { game.act.btnSound('click'); setPick(n.id); }} style={{ position: 'absolute', left: p.x - sz / 2, top: p.y - sz / 2, alignItems: 'center', width: sz }} accessibilityLabel={n.name}>
              <View style={{ width: sz, height: sz, borderRadius: sz / 2, borderWidth: 3, borderColor: pick === n.id ? '#fff' : n.home ? C.gold : C.ink, backgroundColor: n.seen ? n.col : '#8c9cac', alignItems: 'center', justifyContent: 'center', opacity: n.seen ? 1 : .7 }}>
                <View style={{ width: sz * .5, height: sz * .5, borderRadius: sz, backgroundColor: n.seen ? n.col2 : '#6c7c8c' }} />
                {n.home && <View style={{ position: 'absolute' }}><T size={20} stroke={4}>🏠</T></View>}
                {n.seen && !n.explored && n.miss.length > 0 && <View style={{ position: 'absolute', right: -6, top: -6 }}><T size={14}>🔒</T></View>}
                {n.seen && !n.explored && !n.miss.length && <View style={{ position: 'absolute', right: -6, top: -6 }}><T size={14}>❓</T></View>}
              </View>
              <View style={{ width: 120, alignItems: 'center', marginTop: 2 }}><T size={11} stroke={3} center lines={1}>{n.name}</T></View>
            </Pressable>
          );
        })}
      </View>
      {sel && (
        <View style={[panel, { position: 'absolute', right: 12 + lay.ins.r, bottom: 10 + lay.ins.b, width: Math.min(340, lay.W * .42), padding: 10, gap: 4 }]}>
          <T size={17} color={C.ink}>{sel.name + (sel.explored ? '' : sel.seen ? '  (inexplorado)' : '')}</T>
          <B size={12}>{sel.desc}</B>
          {sel.seen && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><B size={11} w="black" color={C.sub}>TEM:</B><Bag list={sel.loot} size={18} /></View>}
          {sel.beasts.length > 0 && <B size={11} w="black" color={C.blue}>{'Bichos: ' + sel.beasts.join(', ')}</B>}
          {!sel.seen ? <B w="black" color={C.sub}>Explore as regiões vizinhas para descobrir.</B>
            : sel.miss.length ? <B w="black" color={C.coral}>{'Falta: ' + sel.miss.join(' e ')}</B>
              : <Btn label="MONTAR EXPEDIÇÃO" kind="play" onPress={() => game.act.pickRegion(sel.id)} />}
        </View>
      )}
    </View>
  );
}

/* ---------- prêmio diário ---------- */
function Daily() {
  const game = useGame(), lay = useLay();
  const d = useInfo(() => game.info.daily());
  const bw = Math.min(92, (Math.min(lay.W, 760) - 110) / 7 - 4);
  return (
    <Ov dim>
      <Card maxW={760} scroll={false}>
        <T size={26} stroke={6} color={C.gold} center>PRÊMIO DIÁRIO</T>
        <B center>{d.can ? 'Entre todo dia: o prêmio vai aumentando e no 7º dia tem baú!' : 'Você já pegou o de hoje. Volte amanhã!'}</B>
        <View style={{ flexDirection: 'row', gap: 4, marginVertical: 4 }}>
          {d.days.map((x: any) => (
            <View key={x.i} style={{ width: bw, minHeight: 86, borderRadius: 12, borderWidth: 3, borderColor: x.today ? C.coral : C.ink, backgroundColor: x.done ? '#d8f0c0' : x.i === 6 ? '#ffe8a0' : '#fff4dc', alignItems: 'center', justifyContent: 'space-between', padding: 4 }}>
              <B size={11} w="black">{'DIA ' + (x.i + 1)}</B>
              <B size={10} center lines={4}>{x.txt}</B>
              <B size={9} w="black" color={x.done ? '#3c8c2c' : C.coral}>{x.done ? '✓ PEGO' : x.today ? 'HOJE' : ''}</B>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {d.can && <Btn label="PEGAR PRÊMIO" kind="play" onPress={() => game.act.claimDaily()} start />}
          <Btn label={d.can ? 'DEPOIS' : 'FECHAR'} kind="brown" size="sm" onPress={() => game.act.closeDaily()} style={{ alignSelf: 'center' }} />
        </View>
      </Card>
    </Ov>
  );
}

/* ---------- enquanto você estava fora ---------- */
function Away() {
  const game = useGame();
  const a = useInfo(() => game.info.away());
  const h = Math.floor(a.mins / 60), mn = a.mins % 60;
  return (
    <Ov dim>
      <Card maxW={460} scroll={false}>
        <T size={24} stroke={6} color={C.gold} center>BEM-VINDO DE VOLTA!</T>
        <B center>{'Você ficou fora ' + (h ? h + 'h ' : '') + mn + 'min. A cidade continuou trabalhando' + (a.capped ? ' (guarda até 12 horas).' : '.')}</B>
        {a.got.length ? <><B w="black">Pronto para recolher:</B><Bag list={a.got} size={28} /></> : <B>Nada novo desta vez.</B>}
        <Btn label="RECOLHER TUDO" kind="play" onPress={() => { game.act.collect(); game.act.closeAway(); }} start />
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
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: BOTTOM_H + 6 + lay.ins.b, zIndex: 30 }]}>
      <View style={[panel, { paddingHorizontal: 14, paddingVertical: 8, maxWidth: Math.min(560, lay.W - 160) }]}>
        <B center w="black">{t.s}</B>
      </View>
    </View>
  );
}
