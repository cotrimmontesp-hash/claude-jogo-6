# Vila Selvagem

Jogo de estratégia para celular: você cuida de uma vila no meio da mata, constrói, abre espaço e doma
bichos que crescem e evoluem.

- **A vila** tem terrenos livres em volta da praça com a fogueira. Corte árvores e quebre pedras para
  abrir terrenos novos. Cada construção sobe até o nível 3; dá para mover e desmontar.
- **Os bichos** (lobo, javali, raposa, cabra, camelo, lontra, tartaruga, urso, coruja e águia) comem,
  ganham experiência, sobem até o nível 10 e evoluem nos níveis 4 e 8 (filhote → jovem → adulto). Cada um
  dá um bônus e tem habilidades: nadar, escalar, voar, aguentar o deserto.
- **O mapa** tem 10 regiões. Algumas só abrem com o bicho certo (a ilha pede quem nade, a montanha pede
  quem escale…). Nas expedições você leva até 3 moradores e 2 bichos, faz escolhas nos eventos e pode
  domar bichos novos.
- A vila **continua produzindo enquanto você está fora** (até 12 horas) e tem **prêmio diário** de 7 dias.

App em **React Native + Expo + TypeScript** (pasta `app/`): site/PWA na Vercel (React Native Web) e apps
pelo EAS (APK/AAB e IPA). O workflow "Gerar APK" monta um APK a cada envio e testa num Android virtual.
