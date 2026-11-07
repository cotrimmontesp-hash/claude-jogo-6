#!/bin/bash
# Teste do APK no Android virtual: abre o jogo, toca nas telas e tira fotos (vão para o ramo ci-shots).
mkdir -p shots
adb install -r ColmeiaDeGuerra.apk
adb logcat -c
adb shell settings put secure immersive_mode_confirmations confirmed
adb shell monkey -p com.claude.colmeiaguerra -c android.intent.category.LAUNCHER 1
sleep 30
n=0
shot(){ n=$((n+1)); adb exec-out screencap -p > "shots/$(printf %02d $n)-$1.png"; }
tap(){
  adb shell uiautomator dump /sdcard/u.xml >> shots/dump.txt 2>&1; adb pull /sdcard/u.xml u.xml >/dev/null 2>&1
  B=$(grep -o "text=\"$1\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" u.xml 2>/dev/null | tail -1 | grep -o '[0-9][0-9]*' | tail -4 | tr '\n' ' ')
  if [ -n "$B" ]; then set -- $B; adb shell input tap $(( ($1+$3)/2 )) $(( ($2+$4)/2 )); echo "achei: $1" >> shots/toques.txt
  else adb shell input tap $2 $3; echo "posição: $1 $2 $3" >> shots/toques.txt; fi
  rm -f u.xml
}
back(){ adb shell input keyevent 4; sleep 2; }
shot inicio-premio
tap "PEGAR PRÊMIO" 1100 800; sleep 2; shot premio-pego
tap "DEPOIS" 1400 800; tap "FECHAR" 1400 800; sleep 2; shot menu
tap "JOGAR" 400 500; sleep 3; shot fases
tap "Primeira Flor" 420 200; sleep 4; shot partida
tap "Operária" 1900 150; sleep 1; shot carta
adb shell input tap 1248 540; sleep 2; shot colocou
tap "FIM DO TURNO" 2000 980; sleep 5; shot turno2
tap "FIM DO TURNO" 2000 980; sleep 5; shot turno3
back; shot pausa
tap "SAIR" 1170 700; sleep 3
tap "CARTAS" 300 700; sleep 3; shot cartas; back
tap "VISUAIS" 600 700; sleep 3; shot visuais; back
tap "MISSÕES" 300 860; sleep 3; shot missoes; back
adb logcat -d > shots/logcat.txt
true
