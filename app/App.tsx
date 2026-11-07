/* Colmeia de Guerra — app em React Native + Expo + TypeScript.
   Do mesmo código saem o site/PWA (React Native Web, na Vercel) e os apps (EAS: APK/AAB e IPA). */
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import { Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';
import type { Game } from './src/engine/game';
import { makeGame } from './src/makeGame';
import { preload } from './src/platform/preload';
import { GameRoot } from './src/ui/GameRoot';
import { KeepAwake, Orientation } from './src/ui/device';

export default function App() {
  const [fontsLoaded, fontErr] = useFonts({ 'Lilita One': LilitaOne_400Regular, Nunito: Nunito_800ExtraBold, 'Nunito-Black': Nunito_900Black, 'Nunito-Bold': Nunito_700Bold });
  const [ready, setReady] = useState(false);
  const [late, setLate] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  useEffect(() => { const t = setTimeout(() => setLate(true), 12000); return () => clearTimeout(t); }, []);
  useEffect(() => { preload().finally(() => setReady(true)); }, []);
  const fontsOk = Platform.OS !== 'web' || fontsLoaded || !!fontErr || late;
  useEffect(() => { if (ready && fontsOk && !game) setGame(makeGame()); }, [ready, fontsOk, game]);
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <KeepAwake />
      <Orientation />
      {game ? <GameRoot game={game} /> : <View style={{ flex: 1, backgroundColor: '#2a1a0c' }} />}
    </SafeAreaProvider>
  );
}
