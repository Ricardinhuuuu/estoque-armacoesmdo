# Câmera — Etapa 1: zoom (item 3) e lanterna (item 4)

Complemento de `ETAPA1_CAMERA_ITENS.md`. Situação dos cinco itens do pedido:

| Item | O que era | Situação |
|---|---|---|
| 1 — visor acompanhando a tela | faixa fixa no topo, cobrindo conteúdo | **falta** |
| 2 — motores de leitura | Code 128 lido pela biblioteca no iPhone | **falta** |
| 3 — zoom | abria em **3,4x** | ✅ **feito** |
| 4 — lanterna | **não existia** | ✅ **feito** |
| 5 — anti-duplicidade | 1 bip dava até 5 baixas no iOS | ✅ **feito** |

## Item 3 — abre em 1x

```js
const ZOOM = 1;          // era 3.4
let ZOOMATUAL = ZOOM;    // não lê mais o zoom salvo
```

- `localStorage.mdo_zoom` **deixa de ser gravado** e é apagado — senão a próxima abertura
  voltaria ampliada;
- slider e rótulo começam em **1x**;
- a barra continua aplicando o zoom escolhido **na hora**, sem reabrir a câmera.

## Item 4 — lanterna

Antes não havia **nenhuma** chamada a `torch`. Agora:

| Situação | Comportamento |
|---|---|
| Aparelho suporta | botão **🔦 Lanterna** aparece na barra inferior |
| Aparelho não suporta | botão **escondido**; ao tocar, o app **explica** em vez de fingir |
| Câmera desligada | lanterna apaga e o botão é escondido |

Estado do botão: `🔦 Lanterna` ↔ `🔦 Lanterna ligada`, com `aria-pressed`.

### Limitação real, dita com clareza

No **iPhone com Safari** a API de câmera normalmente **não expõe `torch`**. Ali o botão não
aparece — e o app avisa. Não é falha da implementação: o navegador não oferece o controle.
No **Android/Chrome** a lanterna funciona.

## Prova

- `164 passaram, 0 falharam` — local, com e sem `crypto.subtle`, e **verde no CI** (PR e push).
- **2 testes novos**: zoom 1x (e nada salvo) e lanterna (sem suporte → escondida; com suporte →
  liga e desliga de verdade, conferindo `torch:true` / `torch:false` na trilha).
- **1 teste trocado de propósito**: ele exigia o zoom de abertura em **3,4x** — justamente o que
  o cliente pediu para remover. Teste mudou porque a regra mudou, não para o teste passar.
- **2 testes de zoom** pediam o valor por padrão; agora pedem 3,4x explicitamente.

## O que falta

### Item 1 — visor acompanhando a tela

Hoje o visor é `position:fixed` no topo e **cobre o conteúdo** quando o operador rola. Precisa
seguir a rolagem e voltar ao lugar natural. Muda só CSS + o listener de scroll.

### Item 2 — motores de leitura (o mais fundo)

A etiqueta das armações é **Code 128**. No iPhone o leitor nativo não é usado (o diagnóstico
mostrou `leitor: biblioteca`). Caminho, **nesta ordem**:

1. medir quantas leituras a biblioteca atual perde com a etiqueta real (`80202503194`);
2. só se perder muito, avaliar um segundo motor (ex.: ZXing empacotado) focado em Code 128;
3. manter a biblioteca **empacotada** em `vendor/` para funcionar offline.

Este é o único item que pode pedir **nova biblioteca** — e a regra do projeto é não instalar sem
necessidade comprovada.
