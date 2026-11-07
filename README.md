# Colmeia de Guerra

Estratégia por turnos num tabuleiro de hexágonos: monte a colmeia com cartas (operárias, flores, guardas,
ferrões, cera, mel grudento…) para proteger a Rainha das vespas. Cada carta custa mel.

- **Campanha**: 15 fases em 3 regiões (Jardim, Pântano e Montanha), com estrelas e chefes.
- **Enxame sem fim**: até onde você aguenta?
- **Recompensas**: moedas e experiência a cada partida; subir de nível libera cartas novas; melhore as cartas
  e compre visuais para a colmeia.
- **Prêmio diário**: calendário de 7 dias (baú no 7º) e 3 missões novas por dia.

## Como é feito
App em **React Native + Expo + TypeScript** (pasta `app/`). Do mesmo código saem o **site/PWA** na Vercel
(React Native Web: `npx expo export -p web`) e os apps pelo **EAS** (APK/AAB e IPA, `app/eas.json`).
O workflow "Gerar APK" também monta um APK a cada envio para a `main` e testa num Android virtual.
