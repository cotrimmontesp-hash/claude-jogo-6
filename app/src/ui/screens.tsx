/* Telas do Base Zumbi em React Native: barra de cima (moedas, onda, vida), botões da onda
   e da granada, loja (armas, melhorias, base), sala online e a tela de quando a base cai. */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Btn, C, FONT, OText, Pix, useGame, useInfo, useLay } from './kit';
import { TOP_H } from '../engine/game';

export function Screens() {
  const game = useGame();
  const S = useInfo(() => ({ ...game.ui.show }));
  return (
    <>
      <Hud />
      {S.shop && <Shop />}
      {S.lost && <Lost />}
      {S.online && <Online />}
      <Toast />
    </>
  );
}

const T = ({ children, size = 15, color = '#fff', stroke = 0, style, lines, center }: any) => stroke
  ? <OText stroke={stroke} lines={lines} style={[{ fontFamily: FONT.display, fontSize: size, lineHeight: size * 1.18, color, textAlign: center ? 'center' : 'left' }, style]}>{children}</OText>
  : <Text numberOfLines={lines} style={[{ fontFamily: FONT.display, fontSize: size, lineHeight: size * 1.2, color, textAlign: center ? 'center' : 'left' }, style]}>{children}</Text>;
const B = ({ children, size = 13, color = C.ink, style, lines, center, w = 'bold' }: any) => <Text numberOfLines={lines} style={[{ fontFamily: w === 'black' ? FONT.black : w === 'bold' ? FONT.bold : FONT.body, fontSize: size, lineHeight: size * 1.3, color, textAlign: center ? 'center' : 'left' }, style]}>{children}</Text>;
const panel = { borderRadius: 14, borderWidth: 3, borderColor: C.ink, backgroundColor: '#fff8ea' } as const;
const dark = { borderRadius: 12, borderWidth: 3, borderColor: '#1c1408', backgroundColor: 'rgba(28,24,16,.82)' } as const;

function Bar({ f, col, w = 120, label }: { f: number; col: string; w?: number; label: string }) {
  return (
    <View style={{ width: w }}>
      <View style={{ height: 14, borderRadius: 7, backgroundColor: '#1c1408', borderWidth: 2, borderColor: '#1c1408', overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(0, Math.min(1, f)) * 100}%`, height: '100%', backgroundColor: col, borderRadius: 5 }} />
      </View>
      <B size={9} w="black" color="#fff" style={{ marginTop: -1 }}>{label}</B>
    </View>
  );
}
function Coins({ n, img, size = 16 }: { n: number; img: string; size?: number }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Pix uri={img} w={size + 8} /><T size={size} color={C.gold} stroke={3}>{String(n)}</T></View>;
}

/* ---------- barra de cima e botões ---------- */
function Hud() {
  const game = useGame(), lay = useLay();
  const h = useInfo(() => game.info.hud());
  const S = useInfo(() => ({ ...game.ui.show }));
  if (S.shop || S.lost || S.online) return null;
  const prep = h.phase === 'prep';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={{ position: 'absolute', left: 8 + lay.ins.l, right: 8 + lay.ins.r, top: 6 + lay.ins.t, height: TOP_H - 8, flexDirection: 'row', alignItems: 'center', gap: 8 }} pointerEvents="box-none">
        <View style={[dark, { paddingHorizontal: 10, paddingVertical: 3 }]}><Coins n={h.coins} img={h.coinImg} /></View>
        <View style={[dark, { paddingHorizontal: 10, paddingVertical: 3 }]}>
          <T size={15} color={h.boss && prep ? '#ff9cff' : '#fff'}>{'ONDA ' + h.wave + (h.boss && prep ? ' · CHEFÃO' : '')}</T>
          <B size={10} w="black" color="#ffd8a0" style={{ marginTop: -2 }}>{prep ? h.next + ' zumbis vindo' : h.left + ' zumbis restantes'}</B>
        </View>
        {!lay.narrow && <View style={[dark, { paddingHorizontal: 8, paddingVertical: 3 }]} pointerEvents="none">
          <T size={12} color="#9cf080">{h.baseName}</T>
          <B size={10} w="black" color="#fff" style={{ marginTop: -2 }}>{h.online ? 'Online' : 'Ajudantes: ' + h.allies + '/2'}</B>
        </View>}
        <Btn label={h.online ? (h.host ? 'SALA ' + h.code + ' · ' + h.people : 'ONLINE · ' + h.people) : 'ONLINE'} size="sm" kind={h.online ? 'blue' : 'purple'} fontSize={13} padH={8} padV={4} onPress={() => game.act.openOnline()} />
        <View style={{ flex: 1 }} />
        <View style={[dark, { flexDirection: 'row', gap: 10, paddingHorizontal: 10, paddingVertical: 4 }]} pointerEvents="none">
          <Bar f={h.hp / h.maxHp} col="#4cd060" w={lay.narrow ? 80 : 110} label={'VOCÊ ' + h.hp + '/' + h.maxHp} />
          <Bar f={h.hq / h.hqMax} col="#5ca8f0" w={lay.narrow ? 80 : 110} label={'CENTRO ' + h.hq + '/' + h.hqMax} />
        </View>
        <Btn label={h.sfx ? '🔊' : '🔇'} size="sm" kind="brown" padH={7} padV={4} onPress={() => game.act.toggleSfx()} a11y="Som" />
      </View>
      <View style={{ position: 'absolute', right: 10 + lay.ins.r, bottom: 10 + lay.ins.b, flexDirection: 'row', gap: 10, alignItems: 'flex-end' }} pointerEvents="box-none">
        {prep && <>
          <Btn label="LOJA" kind="green" onPress={() => game.act.openShop()} />
          {h.guest ? <View style={[dark, { paddingHorizontal: 12, paddingVertical: 8 }]}><T size={14}>Esperando quem criou a sala começar…</T></View>
            : <Btn label={'COMEÇAR ONDA ' + h.wave} kind="red" onPress={() => game.act.startWave()} start />}
        </>}
        {!prep && (
          <Pressable onPress={() => game.act.grenade()} accessibilityLabel="Granada" style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: '#1c1408', backgroundColor: h.nade ? 'rgba(90,90,90,.85)' : '#5c8c3c', alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
            <T size={26}>💣</T>
            {h.nade > 0 && <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}><T size={22} stroke={4}>{String(h.nade)}</T></View>}
          </Pressable>
        )}
        {!prep && <FireBtn />}
      </View>
      {prep && h.wave === 1 && h.kills === 0 && (
        <View style={[panel, { position: 'absolute', left: 10 + lay.ins.l, bottom: 10 + lay.ins.b, maxWidth: Math.min(330, lay.W * .4), padding: 8 }]} pointerEvents="none">
          <B size={12} w="black">Arraste o dedo para andar e segure ATIRAR (a mira vai sozinha no zumbi mais perto). Toque no + do chão para pôr uma torre e salve quem pede SOCORRO (até 2 viram ajudantes)!</B>
        </View>
      )}
    </View>
  );
}

/** segure para atirar (a mira vai sozinha no zumbi mais perto) */
function FireBtn() {
  const game = useGame();
  const [on, setOn] = React.useState(false);
  const set = (v: boolean) => { setOn(v); game.act.fire(v); };
  return (
    <Pressable onPressIn={() => set(true)} onPressOut={() => set(false)} accessibilityLabel="Atirar"
      style={{ width: 104, height: 104, borderRadius: 52, borderWidth: 5, borderColor: '#1c1408', backgroundColor: on ? '#c03030' : '#e04848', alignItems: 'center', justifyContent: 'center', transform: [{ scale: on ? .93 : 1 }] }}>
      <View style={{ position: 'absolute', left: 8, right: 8, top: 6, height: 36, borderRadius: 30, backgroundColor: 'rgba(255,255,255,.22)' }} />
      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 4, borderColor: '#fff' }} />
        <View style={{ position: 'absolute', width: 4, height: 48, backgroundColor: '#fff', borderRadius: 2 }} />
        <View style={{ position: 'absolute', width: 48, height: 4, backgroundColor: '#fff', borderRadius: 2 }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffe060', borderWidth: 2, borderColor: '#1c1408' }} />
      </View>
      <T size={14} stroke={3} style={{ marginTop: 2 }}>ATIRAR</T>
    </Pressable>
  );
}

/* ---------- loja ---------- */
function Shop() {
  const game = useGame(), lay = useLay();
  const s = useInfo(() => game.info.shop());
  const tabs = [['arma', 'ARMAS'], ['melhorias', 'MELHORIAS'], ['base', 'BASE']];
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,4,.55)', paddingTop: 8 + lay.ins.t, paddingBottom: 8 + lay.ins.b, paddingLeft: 12 + lay.ins.l, paddingRight: 12 + lay.ins.r }]}>
      <View style={[panel, { flex: 1, padding: 10, gap: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T size={24} stroke={6} color={C.gold}>LOJA</T>
          <View style={[dark, { paddingHorizontal: 10, paddingVertical: 2 }]}><Coins n={s.coins} img={s.coinImg} /></View>
          <View style={{ flex: 1 }} />
          {tabs.map(([k, n]) => <Btn key={k} label={n} size="sm" kind={s.tab === k ? 'gold' : 'brown'} fontSize={14} padH={10} onPress={() => game.act.tab(k)} />)}
          <Btn label="✕" size="sm" kind="red" padH={10} onPress={() => game.act.closeShop()} a11y="Fechar" />
        </View>
        <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6 }}>
          {s.tab === 'arma' && s.guns.map((g: any) => (
            <Item key={g.id} img={g.img} title={g.name + (g.on ? '  ✓' : '')} desc={g.desc} sub={g.stats}
              btn={g.on ? 'EQUIPADA' : g.owned ? 'USAR' : String(g.price)} coin={!g.owned} ok={g.owned || g.ok} on={g.on} coinImg={s.coinImg}
              onPress={() => game.act.buyGun(g.id)} w={lay.W} />
          ))}
          {s.tab === 'melhorias' && s.upg.map((u: any) => (
            <Item key={u.id} img={u.img} title={u.name + '  ' + u.lvl + '/' + u.max} desc={u.desc}
              btn={u.lvl >= u.max ? 'MÁXIMO' : String(u.price)} coin={u.lvl < u.max} ok={u.ok} on={u.lvl >= u.max} coinImg={s.coinImg}
              onPress={() => game.act.buyUpg(u.id)} w={lay.W} />
          ))}
          {s.tab === 'base' && <>
            <Item img={s.centro.img} title={'Centro: ' + s.centro.name} desc={s.centro.next ? 'Vira ' + s.centro.next.name + ': base maior e mais bonita, ' + s.centro.next.slots + ' lugares de torre e muro mais comprido.' : 'O centro está no máximo!'}
              btn={s.centro.next ? String(s.centro.next.price) : 'MÁXIMO'} coin={!!s.centro.next} ok={!!s.centro.next && s.centro.next.ok} on={!s.centro.next} coinImg={s.coinImg}
              onPress={() => game.act.centroUp()} w={lay.W} />
            <Item img={s.wall.img} title={'Muros de ' + s.wall.name.toLowerCase()} desc={'Cada pedaço aguenta ' + s.wall.hp + ' de dano.' + (s.wall.next ? ' Próximo: ' + s.wall.next.name.toLowerCase() + ' (' + s.wall.next.hp + ').' : '')}
              btn={s.wall.next ? String(s.wall.next.price) : 'MÁXIMO'} coin={!!s.wall.next} ok={!!s.wall.next && s.wall.next.ok} on={!s.wall.next} coinImg={s.coinImg}
              onPress={() => game.act.wallUp()} w={lay.W} />
            {s.turrets.map((t: any) => (
              <Item key={t.i} img={t.img} title={'Torre ' + (t.i + 1) + (t.lvl ? '  ' + t.lvl + '/' + t.max : '')}
                desc={t.lvl ? (t.lvl < t.max ? 'Melhorar: dano ' + t.dmg + ' e atira mais rápido.' : 'Nível máximo!') : 'Atira sozinha nos zumbis que chegam perto.'}
                btn={t.lvl >= t.max ? 'MÁXIMO' : String(t.price)} coin={t.lvl < t.max} ok={t.ok} on={t.lvl >= t.max} coinImg={s.coinImg}
                onPress={() => game.act.turretUp(t.i)} w={lay.W} />
            ))}
          </>}
        </ScrollView>
      </View>
    </View>
  );
}
function Item({ img, title, desc, sub, btn, coin, ok, on, onPress, coinImg, w }: any) {
  const cw = w > 900 ? '32%' : '48.5%';
  return (
    <View style={{ width: cw as any, flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, borderWidth: 2.5, borderColor: C.ink, backgroundColor: on ? '#e8f6d8' : '#fff', padding: 6 }}>
      <Pix uri={img} w={60} />
      <View style={{ flex: 1, gap: 1 }}>
        <T size={15} color={C.ink} lines={1}>{title}</T>
        <B size={10} lines={2}>{desc}</B>
        {!!sub && <B size={10} w="black" color={C.sub}>{sub}</B>}
      </View>
      <Btn size="sm" kind={on ? 'green' : ok ? 'play' : 'brown'} disabled={on} padH={8} onPress={onPress} a11y={title}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          {coin && <Pix uri={coinImg} w={18} />}
          <OText stroke={3} style={{ fontFamily: FONT.display, fontSize: 14, lineHeight: 17, color: '#fff' }}>{btn}</OText>
        </View>
      </Btn>
    </View>
  );
}

/* ---------- a base caiu ---------- */
function Lost() {
  const game = useGame();
  const l = useInfo(() => game.info.lost());
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(40,0,0,.6)', alignItems: 'center', justifyContent: 'center' }]}>
      <View style={[panel, { padding: 16, alignItems: 'center', gap: 8, maxWidth: 420 }]}>
        <T size={30} stroke={7} color={C.coral}>A BASE CAIU!</T>
        <B center w="black">{'Os zumbis derrubaram o centro na onda ' + l.wave + '. As moedas que você pegou ficam com você: melhore a base e tente de novo!'}</B>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {l.guest ? <B w="black" color={C.sub}>Esperando quem criou a sala tentar de novo…</B> : <Btn label="TENTAR DE NOVO" kind="play" onPress={() => game.act.retry()} />}
        </View>
      </View>
    </View>
  );
}

/* ---------- online: criar ou entrar numa sala ---------- */
function Online() {
  const game = useGame(), lay = useLay();
  const o = useInfo(() => game.info.online());
  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState(o.name);
  const inRoom = o.host || o.guest;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,4,.6)', alignItems: 'center', justifyContent: 'center', padding: 12 }]}>
      <View style={[panel, { padding: 14, gap: 10, width: Math.min(560, lay.W - 40) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T size={24} stroke={6} color={C.gold} style={{ flex: 1 }}>JOGAR ONLINE</T>
          <Btn label="✕" size="sm" kind="red" padH={10} onPress={() => game.act.closeOnline()} a11y="Fechar" />
        </View>
        {!inRoom ? <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <B w="black">Seu nome:</B>
            <TextInput value={name} onChangeText={setName} onBlur={() => game.act.setName(name)} onSubmitEditing={() => game.act.setName(name)} maxLength={14}
              style={{ flex: 1, borderWidth: 2.5, borderColor: C.ink, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontFamily: FONT.bold, fontSize: 15, backgroundColor: '#fff', color: C.ink }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn label="CRIAR SALA" kind="play" disabled={o.busy} onPress={() => { game.act.setName(name); game.act.createRoom(); }} />
            <B w="black">ou</B>
            <TextInput value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 4))} placeholder="código" keyboardType="number-pad" maxLength={4}
              style={{ width: 110, borderWidth: 2.5, borderColor: C.ink, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontFamily: FONT.display, fontSize: 20, backgroundColor: '#fff', color: C.ink, textAlign: 'center' }} />
            <Btn label="ENTRAR" kind="blue" disabled={o.busy || code.length !== 4} onPress={() => { game.act.setName(name); game.act.joinRoom(code); }} />
          </View>
          <B size={12} color={C.sub}>Quem cria a sala recebe os outros na base dela (até 4 pessoas). Cada um fica com as moedas que pega.</B>
        </> : <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <B w="black">Código da sala:</B>
            <T size={34} stroke={6} color={C.gold}>{o.code}</T>
          </View>
          <B size={12} color={C.sub}>{o.host ? 'Passe esse código para os amigos tocarem em ONLINE e ENTRAR. Você começa as ondas.' : 'Você está na base de quem criou a sala.'}</B>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {o.players.map((p: any) => <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 2.5, borderColor: C.ink, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4 }}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.col, borderWidth: 2, borderColor: C.ink }} /><B w="black">{p.name}</B></View>)}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn label="JOGAR" kind="play" onPress={() => game.act.closeOnline()} />
            <Btn label="SAIR DA SALA" kind="red" onPress={() => game.act.leaveRoom()} />
          </View>
        </>}
        {!!o.status && <B w="black" color={C.coral}>{o.status}</B>}
      </View>
    </View>
  );
}

function Toast() {
  const game = useGame(), lay = useLay();
  const t = useInfo(() => game.ui.toast);
  if (!t) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-start', alignItems: 'center', paddingTop: TOP_H + 8 + lay.ins.t, zIndex: 30 }]}>
      <View style={[panel, { paddingHorizontal: 14, paddingVertical: 8, maxWidth: Math.min(560, lay.W - 160) }]}>
        <B center w="black">{t.s}</B>
      </View>
    </View>
  );
}
