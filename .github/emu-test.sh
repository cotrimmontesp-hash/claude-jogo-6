#!/bin/bash
# Teste do APK no Android virtual: abre o jogo, toca nas telas e tira fotos (vão para o ramo ci-shots).
mkdir -p shots
adb install -r BaseZumbi.apk
adb logcat -c
adb shell settings put secure immersive_mode_confirmations confirmed
adb shell monkey -p com.claude.basezumbi -c android.intent.category.LAUNCHER 1
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
adb shell input swipe 900 600 700 600 1500; sleep 1; shot andar
tap "LOJA" 1700 960; sleep 2; shot loja
tap "MELHORIAS" 1500 120; sleep 1; shot loja-melhorias
tap "BASE" 1700 120; sleep 1; shot loja-base
back; sleep 1
tap "COMEÇAR ONDA 1" 2050 960; sleep 15; shot onda
adb shell input tap 2205 946; sleep 2; shot granada
adb shell input swipe 1200 600 1500 600 3000; sleep 20; shot onda2
sleep 30; shot fim
adb logcat -d > shots/logcat.txt
true
