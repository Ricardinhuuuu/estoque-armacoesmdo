# Câmera e leitura de código de barras — melhorias (versão 6.5.0)

Este documento registra o que mudou, por quê, e como conferir em cada aparelho.

## 1. Visor e barra de zoom

| Antes | Agora |
|---|---|
| `height:min(38vh,260px)` — visor alto, comia a tela | `height:min(26vh,190px)` — compacto na vertical |
| largura 100% | **largura 100% mantida**, sem reduzir as laterais |
| imagem `object-fit:contain` | mantido: a imagem inteira aparece, sem corte |

A barra **continua logo abaixo do visor** e ganhou **botões rápidos**: `1x · 2x · 3,4x · 6x`.
O botão do nível atual fica destacado; o controle deslizante continua funcionando e os dois
andam juntos.

O zoom é aplicado **em tempo real**:
1. **zoom da câmera** (`track.applyConstraints({advanced:[{zoom}]})`) quando o aparelho expõe;
2. **ampliação digital** (`transform: scale`) quando o aparelho não expõe, ou para o que
   passa do máximo da lente.

O nível escolhido fica salvo em `localStorage["mdo_zoom"]` e é usado na próxima abertura.

## 2. Bipagem instantânea

- **Formatos**: o app pede `code_128, ean_13, ean_8, upc_a, upc_e, code_39, code_93, itf,
  codabar, qr_code, data_matrix` e usa só os que o aparelho declara suportar
  (`BarcodeDetector.getSupportedFormats()`). Se o aparelho não declarar nada, volta à lista
  curta de antes — nunca fica sem leitor.
- **Velocidade**: a detecção não espera mais a anterior terminar para agendar a próxima.
  Antes era `await det.detect(v)` dentro do laço (uma leitura por vez, fila travada);
  agora um quadro é lido enquanto o próximo já é preparado.
- **Biblioteca (iPhone)**: `fps` de 30 → 40 e caixa de leitura de 92%×42% → **94%×60%**,
  o que aceita o código mais longe e mais baixo no quadro.
- **Anti-duplicado**: o mesmo código é ignorado por **700 ms** (antes 1,5 s). O **próximo**
  código entra imediatamente. Leitura de confiança baixa (< 0,45) logo depois de outra é
  descartada, para não gerar bipagem falsa.

## 3. Captura por foto

Duas mudanças de fundo:

**a) A foto tenta primeiro o quadro da câmera.** Ao tocar em *📸 Ler por foto*, o app pega o
último quadro que a câmera viu (guardado há menos de 20 s) e tenta decodificar. Isso resolve o
caso mais comum: o código **está na frente da câmera**, mas o reflexo na etiqueta atrapalha a
leitura ao vivo. Se não conseguir, aí sim abre a câmera do aparelho.

**b) Tentativas em ordem de custo**, da mais provável para a mais agressiva:

1. foto como veio (2000 px no maior lado);
2. tons de cinza + contraste 1,8;
3. tons de cinza + contraste 2,4 + nitidez;
4. recorte central 90%×60% (código pequeno no meio da etiqueta fica grande);
5. recorte central 70%×44% com nitidez;
6. ampliação para 2600 px com contraste;
7. girada 90° e 270° (foto tirada de lado), cada uma crua e em cinza;
8. girada 180° com contraste forte.

A foto comum costuma sair nas **três primeiras** tentativas — a foto não fica mais lenta.

Quando nada funciona, a mensagem diz **que a foto não tinha código legível** e o que tentar
(aproximar, enquadrar o código inteiro, mais luz), além de oferecer digitar o código.

## Como conferir no aparelho

1. Abra o app e ligue a câmera: o visor deve ficar **mais baixo**, ocupando a largura toda.
2. A barra de zoom aparece **abaixo** do visor. Toque em `2x` e `6x` e veja a imagem mudar
   na hora.
3. Bipe a etiqueta `80202503194`: deve entrar quase instantaneamente.
4. Bipe a mesma etiqueta duas vezes seguidas: a segunda só entra depois de ~0,7 s
   (proteção contra duplicidade).
5. Bipe duas etiquetas diferentes em sequência rápida: as duas devem entrar.
6. Aponte para uma etiqueta com reflexo, sem conseguir bipar, e toque em *📸 Ler por foto*:
   o app deve tentar o quadro da câmera primeiro.
7. Toque em *📷 Diagnóstico da câmera* e me envie o texto: ele mostra leitor usado, zoom de
   câmera, ampliação digital, tempo de abertura e quantas leituras falharam.

## Testes automáticos

```
node tests/run-tests.js
✅ 155 passaram, 0 falharam
```

Quatro testes novos cobrem: altura/largura do visor e botões de zoom; lista de formatos;
janela de anti-duplicado; e a ordem das tentativas da foto.

## O que só o aparelho pode provar

A leitura real de uma etiqueta com reflexo, o tempo de bipagem sentido na mão e a taxa de
acerto da foto **dependem do hardware e da câmera**. O código está preparado, mas a prova
final é o teste com a etiqueta `80202503194` no iPhone e no Android.
