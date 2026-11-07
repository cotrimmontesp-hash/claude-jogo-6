/* Telas do Cidade nas Costas em React Native: barra de materiais, botões da cidade,
   construir, criatura, moradores, expedição, mapa, prêmio diário e "enquanto você estava fora". */
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
      {S.creature && <Creature />}
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
        <View style={[dark, { paddingHorizontal: 10, paddingVertical: 3 }]}><B size={10} w="black" color={C.hint}>{'NÍVEL ' + c.lvl}</B><T size={13} lines={1}>{c.region}</T></View>
        <Btn label={c.sfx ? '🔊' : '🔇'} size="sm" kind="brown" padH={7} padV={4} onPress={() => game.act.toggleSfx()} a11y="Som" />
      </View>
      <View style={{ position: 'absolute', left: 6 + lay.ins.l, top: TOP_H + lay.ins.t + 2, width: LEFT_W - 12, gap: lay.short ? 3 : 6 }} pointerEvents="box-none">
        <Btn label="MAPA" kind="blue" size="sm" onPress={() => game.act.open('map')} />
        <View><Btn label="EXPEDIÇÃO" kind="red" size="sm" fontSize={13} padH={6} onPress={() => game.act.open('exped')} />{c.free > 0 && !c.traveling && <Badge n={c.free} />}</View>
        <Btn label="CRIATURA" kind="green" size="sm" fontSize={13} padH={6} onPress={() => game.act.open('creature')} />
        <Btn label="MORADORES" kind="purple" size="sm" fontSize={13} padH={6} onPress={() => game.act.open('people')} />
        <View><Btn label="PRÊMIO" kind="gold" size="sm" onPress={() => game.act.openDaily()} />{c.dailyCan && <Badge />}</View>
      </View>
      <View style={{ position: 'absolute', left: LEFT_W + lay.ins.l, right: 6 + lay.ins.r, bottom: 6 + lay.ins.b, height: BOTTOM_H - 10, flexDirection: 'row', alignItems: 'center', gap: 8 }} pointerEvents="box-none">
        <View style={[panel, { flex: 1, paddingHorizontal: 10, paddingVertical: 4, justifyContent: 'center', minHeight: 40 }]} pointerEvents="none">
          <B size={12} w="black" lines={2} color={c.hungry ? C.coral : C.ink}>{c.hungry ? 'Falta comida ou água! A cidade produz pela metade.' : c.moving ? 'Toque no espaço para onde quer levar a construção.' : c.goal}</B>
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
        <Head title={b.mode === 'info' ? b.name : 'CONSTRUIR'} onClose={() => game.act.closeBuild()} />
        {b.mode === 'info' ? (
          <ScrollView contentContainerStyle={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Pix uri={b.img} w={80} />
              <B style={{ flex: 1 }}>{b.desc}</B>
            </View>
            {b.rate.length > 0 && <View style={{ gap: 3 }}><B size={11} w="black" color={C.sub}>PRODUZ POR HORA AQUI</B><Bag list={b.rate} /></View>}
            {b.adj && <B size={12} w="black" color={b.adj.ok ? '#3c8c2c' : C.sub}>{(b.adj.ok ? '✓ ' : '• ') + b.adj.txt}</B>}
            {b.stock.length > 0 && <View style={{ gap: 3 }}><B size={11} w="black" color={C.sub}>PRONTO PARA RECOLHER</B><Bag list={b.stock} /></View>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Btn label="MOVER" size="sm" kind="alt" onPress={() => game.act.startMove()} />
              <Btn label="DESMONTAR" size="sm" kind="red" onPress={() => game.act.demolish()} />
            </View>
            <B size={11} color={C.sub}>O espaço no casco é pouco: escolha bem o que levar. Desmontar devolve metade do material.</B>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ gap: 6 }}>
            {b.discount > 0 && <B size={11} w="black" color="#3c8c2c">{'Engenheiros: ' + b.discount + '% mais barato'}</B>}
            {b.list.map((x: any) => (
              <Pressable key={x.id} onPress={() => game.act.build(x.id)} accessibilityLabel={'Construir ' + x.name}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, borderWidth: 2.5, borderColor: C.ink, backgroundColor: x.ok ? '#fff' : '#efe2c8', padding: 5 }}>
                  <Pix uri={x.img} w={50} />
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

/* ---------- criatura ---------- */
function Creature() {
  const game = useGame();
  const c = useInfo(() => game.info.creature());
  return (
    <Ov dim>
      <Card maxW={720} scroll={false}>
        <Head title="A CRIATURA" onClose={() => game.act.closeScreen('creature')} />
        <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'stretch' }}>
          <View style={[panel, { flex: 1, padding: 10, gap: 6, backgroundColor: '#f2f8e4' }]}>
            <T size={18} color={C.ink}>{'Nível ' + c.lvl + ' de ' + c.max}</T>
            {c.need > 0 ? <>
              <XpBar pct={c.xp / c.need * 100} />
              <B size={12}>{c.xp + ' / ' + c.need + ' para crescer · casco ' + c.grid + ' → ' + c.nextGrid}</B>
              <Btn label={'ALIMENTAR (' + c.feed + ' de comida)'} kind="green" size="sm" fontSize={14} onPress={() => game.act.feed()} disabled={c.food < c.feed} />
              <B size={11} color={C.sub}>Cuidadores fazem ela crescer mais rápido. Crescer abre mais espaço no casco e caminhos novos.</B>
            </> : <B w="black" color="#3c8c2c">Tamanho máximo! Casco {c.grid}.</B>}
          </View>
          <View style={{ flex: 1.3, gap: 6 }}>
            {!c.oficina && <B size={12} w="black" color={C.coral}>Habilidades precisam de uma Oficina na cidade.</B>}
            {c.abilities.map((a: any) => (
              <View key={a.id} style={[panel, { padding: 7, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: a.have ? '#d8f0c0' : '#fff' }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T size={15} color={C.ink}>{a.name}</T>
                  <B size={11}>{a.desc}</B>
                  {!a.have && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Bag list={a.cost} size={18} /><B size={10} w="black" color={C.sub}>{'· nível ' + a.lvl}</B></View>}
                </View>
                {a.have ? <T size={16} color="#3c8c2c">✓</T> : <Btn label="APRENDER" size="sm" fontSize={13} kind={a.ok ? 'play' : 'brown'} onPress={() => game.act.learn(a.id)} />}
              </View>
            ))}
          </View>
        </View>
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
          {p.roles.map((r: any) => <View key={r.k} style={{ flex: 1, borderRadius: 10, borderWidth: 2.5, borderColor: C.ink, backgroundColor: r.col, padding: 5 }}><T size={13}>{r.name.replace(/or$/, 'ore') + 's: ' + r.n}</T><B size={10} color="#fff">{r.desc}</B></View>)}
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
  const toggle = (id: number) => setTeam(t => t.includes(id) ? t.filter(x => x !== id) : t.length >= 3 ? t : [...t, id]);
  return (
    <Ov dim>
      <Card maxW={760} scroll={false}>
        <Head title={'EXPEDIÇÃO · ' + e.region} onClose={() => game.act.closeScreen('exped')} />
        {e.traveling ? <B w="black">A criatura está viajando. Espere chegar para sair em expedição.</B>
          : e.stage === 'pick' ? <>
            <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
              {e.types.map((t: any) => (
                <Pressable key={t.id} style={{ flex: 1 }} onPress={() => { game.act.btnSound('click'); setType(t.id); }}>
                  <View style={{ borderRadius: 12, borderWidth: 3, borderColor: type === t.id ? C.coral : C.ink, backgroundColor: type === t.id ? '#ffe8c8' : '#fff', padding: 6, minHeight: 64 }}>
                    <T size={15} color={C.ink}>{t.name}</T><B size={10}>{t.desc}</B>
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' }}>
              <B size={11} w="black" color={C.sub}>A REGIÃO TEM:</B><Bag list={e.loot} size={20} />
              <View style={{ flex: 1 }} />
              <B size={11} w="black" color={e.danger > 10 ? C.coral : C.sub}>{'Perigo ' + e.danger + '%' + (e.torre ? ' · Torre +10%' : '')}</B>
            </View>
            <B size={11} w="black" color={C.sub} style={{ alignSelf: 'flex-start' }}>ESCOLHA ATÉ 3 MORADORES</B>
            <ScrollView horizontal style={{ alignSelf: 'stretch', flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
              {e.people.map((v: any) => {
                const on = team.includes(v.id), busy = v.rest > 0;
                return (
                  <Pressable key={v.id} disabled={busy} onPress={() => { game.act.btnSound('click'); toggle(v.id); }}>
                    <View style={{ width: 86, borderRadius: 12, borderWidth: 3, borderColor: on ? C.coral : C.ink, backgroundColor: busy ? '#ddd0b8' : on ? '#ffe8c8' : '#fff', padding: 4, alignItems: 'center', opacity: busy ? .6 : 1 }}>
                      <Pix uri={v.img} w={40} />
                      <T size={12} color={C.ink} lines={1}>{v.name}</T>
                      <B size={9} w="black" color={v.col}>{v.roleName + ' ' + v.lvl}</B>
                      {busy && <B size={9} color={C.coral}>{v.rest + 's'}</B>}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Btn label="PARTIR!" kind="play" disabled={!team.length} onPress={() => { game.act.expStart(type, team); setTeam([]); }} start />
          </>
            : e.stage === 'event' ? <>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {e.team.map((m: any) => <Pix key={m.name} uri={m.img} w={34} />)}
                <B w="black" color={C.sub}>{'Evento ' + (e.i + 1) + ' de ' + e.n}</B>
              </View>
              <View style={[panel, { alignSelf: 'stretch', padding: 10, backgroundColor: e.fera ? '#ffe4dc' : '#fff' }]}><T size={19} color={C.ink} center>{e.txt}</T></View>
              <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
                {[e.a, e.b].map((o: any, k: number) => (
                  <Pressable key={k} style={{ flex: 1 }} onPress={() => game.act.expChoose(k)} accessibilityLabel={o.txt}>
                    <View style={{ borderRadius: 14, borderWidth: 3, borderColor: C.ink, backgroundColor: k ? '#d8ecff' : '#fff0c8', padding: 8, gap: 3, minHeight: 74 }}>
                      <T size={16} color={C.ink}>{o.txt}</T>
                      {!!o.role && <B size={11} w="black" color={o.has ? '#3c8c2c' : C.sub}>{(o.has ? '✓ ' : '') + 'melhor com ' + o.role}</B>}
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
                {e.reward.loot.length > 0 && <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><B w="black">Trouxeram:</B><Bag list={e.reward.loot} size={26} /></View>}
                {e.reward.full && <B size={11} w="black" color={C.coral}>Parte ficou para trás: os depósitos estavam cheios.</B>}
                {!!e.reward.person && <B w="black" color="#3c8c2c">{'Encontraram alguém: um ' + e.reward.person.toLowerCase() + '!'}</B>}
                {e.reward.crXP > 0 && <B w="black" color="#3c8c2c">{'A criatura ganhou +' + e.reward.crXP + ' de crescimento com o que acharam.'}</B>}
                {e.reward.ups.map((u: string) => <B key={u} w="black" color={C.blue}>{u}</B>)}
                <Btn label="OK" kind="play" onPress={() => game.act.expEnd()} />
              </>}
      </Card>
    </Ov>
  );
}

/* ---------- mapa ---------- */
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
        <Head title="MAPA DO MUNDO" onClose={() => game.act.closeScreen('map')} />
      </View>
      <View style={{ position: 'absolute', left: 20 + lay.ins.l, top: 56 + lay.ins.t, width: mw, height: mh }}>
        {m.lines.map((l: any, i: number) => {
          if (!l.seen) return null;
          const a = P(m.nodes[l.a]), b = P(m.nodes[l.b]); const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
          return <View key={i} style={{ position: 'absolute', left: (a.x + b.x) / 2 - len / 2, top: (a.y + b.y) / 2 - 2, width: len, height: 4, backgroundColor: 'rgba(255,255,255,.55)', borderRadius: 2, transform: [{ rotate: ang + 'rad' }] }} />;
        })}
        {m.nodes.map((n: any) => {
          const p = P(n); const sz = n.here ? 58 : 48;
          return (
            <Pressable key={n.id} onPress={() => { game.act.btnSound('click'); setPick(n.id); }} style={{ position: 'absolute', left: p.x - sz / 2, top: p.y - sz / 2, alignItems: 'center', width: sz }} accessibilityLabel={n.name}>
              <View style={{ width: sz, height: sz, borderRadius: sz / 2, borderWidth: 3, borderColor: n.here ? C.gold : pick === n.id ? '#fff' : C.ink, backgroundColor: n.seen ? n.col : '#8c9cac', alignItems: 'center', justifyContent: 'center', opacity: n.seen ? 1 : .7 }}>
                <View style={{ width: sz * .5, height: sz * .5, borderRadius: sz, backgroundColor: n.seen ? n.col2 : '#6c7c8c' }} />
                {n.here && <View style={{ position: 'absolute' }}><T size={20} stroke={4}>🐢</T></View>}
                {!n.visited && n.seen && n.miss.length > 0 && <View style={{ position: 'absolute', right: -6, top: -6 }}><T size={14}>🔒</T></View>}
                {n.target && <View style={{ position: 'absolute', right: -6, top: -6 }}><T size={14}>⏳</T></View>}
              </View>
              <View style={{ width: 120, alignItems: 'center', marginTop: 2 }}><T size={11} stroke={3} center lines={1}>{n.name}</T></View>
            </Pressable>
          );
        })}
      </View>
      {sel && (
        <View style={[panel, { position: 'absolute', right: 12 + lay.ins.r, bottom: 10 + lay.ins.b, width: Math.min(330, lay.W * .42), padding: 10, gap: 4 }]}>
          <T size={17} color={C.ink}>{sel.name}</T>
          <B size={12}>{sel.desc}</B>
          {sel.here ? <B w="black" color="#3c8c2c">A criatura está aqui.</B>
            : m.traveling ? <B w="black" color={C.sub}>Já estamos viajando.</B>
              : !sel.adj ? <B w="black" color={C.sub}>{sel.seen ? 'Não tem caminho direto de onde estamos.' : 'Explore regiões vizinhas para descobrir.'}</B>
                : sel.miss.length ? <B w="black" color={C.coral}>{'Falta: ' + sel.miss.join(', ')}</B>
                  : <>
                    <B size={12} w="black">{'Viagem: ' + sel.cost.dur + 's · gasta ' + sel.cost.food + ' de comida e ' + sel.cost.water + ' de água'}</B>
                    <Btn label="VIAJAR" kind={sel.okCost ? 'play' : 'brown'} onPress={() => game.act.travel(sel.id)} />
                  </>}
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
