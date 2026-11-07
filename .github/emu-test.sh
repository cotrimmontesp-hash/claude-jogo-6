#!/bin/bash
# Teste do APK no Android virtual: abre o jogo, toca nas telas e tira fotos (vão para o ramo ci-shots).
mkdir -p shots
adb install -r CidadeNasCostas.apk
adb logcat -c
adb shell settings put secure immersive_mode_confirmations confirmed
adb shell monkey -p com.claude.cidadenascostas -c android.intent.category.LAUNCHER 1
sleep 30
n=0
shot(){ n=$((n+1)); adb exec-out screencap -p > "shots/$(printf %02d $n)-$1.png"; }
tap(){
  adb shell uiautomator dump /sdcard/u.xml >> shots/dump.txt 2>&1; adb pull /sdcard/u.xml u.xml >/dev/null 2>&1
  B=$(grep -o "text=\"$1\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" u.xml 2>/dev/null | grep -v 'bounds="\[0,0\]' | tail -1 | grep -o '[0-9][0-9]*' | tail -4 | tr '\n' ' ')
  if [ -n "$B" ]; then set -- $B; adb shell input tap $(( ($1+$3)/2 )) $(( ($2+$4)/2 )); echo "achei: $1 ($*)" >> shots/toques.txt
  else adb shell input tap $2 $3; echo "posição: $1 $2 $3" >> shots/toques.txt; fi
  rm -f u.xml
}
back(){ adb shell input keyevent 4; sleep 2; }
shot inicio
tap "PEGAR PRÊMIO" 1100 800; sleep 2; tap "FECHAR" 1400 800; sleep 2; shot cidade
tap "RECOLHER" 2100 980; sleep 2; shot recolher
adb shell input tap 1160 470; sleep 2; shot construir
back
tap "CRIATURA" 160 560; sleep 2; shot criatura; back
tap "MORADORES" 160 700; sleep 2; shot moradores; back
tap "EXPEDIÇÃO" 160 420; sleep 2; shot expedicao
tap "Lia" 400 600; sleep 1; tap "PARTIR!" 1100 900; sleep 2; shot evento
tap "Montar uma ponte" 800 600; tap "Seguir com cuidado" 800 600; tap "Fazer um curativo" 800 600; sleep 1; shot evento2
back; back
tap "MAPA" 160 290; sleep 2; shot mapa
adb shell input tap 750 760; sleep 2; shot mapa-colinas
tap "VIAJAR" 2000 900; sleep 4; shot viajando
adb logcat -d > shots/logcat.txt
true
