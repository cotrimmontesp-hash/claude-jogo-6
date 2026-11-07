# Base Zumbi

Jogo de ação e estratégia para celular: defenda a base dos zumbis e use as moedas que eles soltam para
deixar a base cada vez mais forte.

- **Você** anda com o joystick (arraste o dedo em qualquer lugar da tela) e segura ATIRAR: a mira vai
  sozinha no zumbi mais perto. A granada explode vários de uma vez. Toque no + do chão para pôr torres.
- **As ondas** ficam mais difíceis a cada vez: zumbis comuns, corredores, grandões e, a cada 5 ondas, um
  chefão. Eles batem nos muros e tentam derrubar o abrigo no meio da base.
- **As moedas** caem dos zumbis; passe perto para pegar (o ímã puxa de mais longe).
- **A loja** (entre as ondas) tem armas (pistola, espingarda, metralhadora e rifle de raio), melhorias
  (dano, rapidez, vida, ímã, abrigo, granada), muros de madeira, pedra e metal e 4 torres que atiram
  sozinhas.
- **Pessoas pedem SOCORRO** fora da base (uma seta mostra onde): chegue perto, elas te seguem, e quando
  entram na base dão moedas e (até 2) viram ajudantes que atiram nos zumbis. Isso só existe jogando sozinho.
- **O centro** tem 4 níveis (Acampamento, Posto Avançado, Forte e Cidadela): a base fica maior e mais
  bonita, com mais lugares de torre.
- **Online**: crie uma sala e passe o código de 4 números; até 4 pessoas defendem a base de quem criou.
  Cada um fica com as moedas que pega (conexão direta entre os aparelhos, WebRTC).
- Se a base cair, você tenta a onda de novo e fica com as moedas.

App em **React Native + Expo + TypeScript** (pasta `app/`): site/PWA na Vercel (React Native Web) e apps
pelo EAS (APK/AAB e IPA): o workflow "Build EAS" roda a cada envio quando o segredo `EXPO_TOKEN` está no
repositório e publica o APK. Sem o token, o workflow "Gerar APK" monta o APK. Os dois testam num Android virtual
ou deixam o link de sempre: releases/latest/download/BaseZumbi.apk.
