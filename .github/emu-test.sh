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
adb shell input tap 630 449; sleep 7; shot coleta
adb shell input tap 1553 400; sleep 2; shot plantar
adb shell input swipe 1500 650 700 520 700; sleep 2; shot arrastar
tap "BICHOS" 324 306; sleep 2; shot bichos; back
tap "EXPEDIÇÃO" 324 189; sleep 3; shot regiao
tap "MONTAR EXPEDIÇÃO" 1840 817; sleep 2; shot expedicao
tap "Lia" 238 701; sleep 1; tap "Lobo 1" 998 701; sleep 1; shot equipe
tap "PARTIR!" 1330 906; sleep 2; shot evento
for k in 1 2 3 4; do adb shell input tap 638 762; sleep 1; done; shot fim
tap "OK" 1170 900; sleep 2; shot volta
adb logcat -d > shots/logcat.txt
true
