#!/bin/bash
# Teste do APK no Android virtual: abre o jogo, toca nas telas e tira fotos (vão para o ramo ci-shots).
mkdir -p shots
adb install -r VilaSelvagem.apk
adb logcat -c
adb shell settings put secure immersive_mode_confirmations confirmed
adb shell monkey -p com.claude.vilaselvagem -c android.intent.category.LAUNCHER 1
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
tap "PEGAR PRÊMIO" 1100 800; sleep 2; tap "FECHAR" 1400 800; sleep 2; shot vila
tap "RECOLHER" 2100 980; sleep 2; shot recolher
adb shell input tap 1250 560; sleep 2; shot construcao
back
tap "BICHOS" 160 560; sleep 2; shot bichos; back
tap "MORADORES" 160 700; sleep 2; shot moradores; back
tap "EXPEDIÇÃO" 160 420; sleep 2; shot mapa
tap "Floresta Antiga" 800 380; sleep 2; shot mapa-floresta
tap "MONTAR EXPEDIÇÃO" 2000 900; sleep 2; shot expedicao
tap "Lia" 400 650; sleep 1; tap "Lobo 1" 900 650; sleep 1; shot equipe
tap "PARTIR!" 1150 950; sleep 2; shot evento
for k in 1 2 3 4; do adb shell input tap 800 640; sleep 1; done; shot fim
tap "OK" 1170 900; sleep 2; shot volta
adb logcat -d > shots/logcat.txt
true
