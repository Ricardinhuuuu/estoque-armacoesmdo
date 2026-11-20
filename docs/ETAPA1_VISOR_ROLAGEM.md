# Câmera — Etapa 1: item 1 (o visor acompanha a tela)

## Situação dos cinco itens

| Item | Situação |
|---|---|
| 1 — visor acompanhando a tela | ✅ **feito** |
| 2 — motores de leitura | **falta** |
| 3 — zoom abre em 1x | ✅ feito |
| 4 — lanterna | ✅ feito |
| 5 — anti-duplicidade | ✅ feito |

## O problema

O visor e a barra de zoom eram `position:fixed` no topo. Isso resolvia a **largura** (o problema
da tarja preta), mas criava outro: **presos por cima da tela**, tampavam o conteúdo ao rolar —
inclusive o resultado da bipagem e o botão de desligar a câmera.

## A correção

`fixed` → **`sticky`**:

```css
body.camLarga #camW,body.camLarga #zoomBar{position:sticky;left:0;right:0;z-index:60}
body.camLarga #camW{top:0;padding-top:env(safe-area-inset-top)}
body.camLarga #zoomBar{top:var(--camTop,0px)}
```

- continua **de borda a borda** — a correção da tarja preta fica de pé;
- **acompanha a rolagem** dentro da área da câmera, em vez de flutuar por cima;
- nunca tampa os cartões abaixo.

A barra de zoom cola **logo abaixo do visor**, com a altura medida na hora:

```js
function camTopo(){
  const h = camW.getBoundingClientRect().height;
  document.body.style.setProperty("--camTop", h + "px");
}
```

`camTopo()` roda ao abrir a câmera e sempre que a **proporção do vídeo muda** (o visor troca de
altura — no iPhone ele nasce em retrato). Ao desligar, a medida é limpa.

## Prova

- `165 passaram, 0 falharam` — local, com e sem `crypto.subtle`, e **verde no CI** (PR e push).
- **1 teste novo**: exige `position:sticky` no visor, **proíbe** `position:fixed`, e confere a
  medida que posiciona a barra.
- **1 teste antigo ajustado**: ele exigia `position:fixed` como prova de "visão larga". O
  requisito mudou (agora é largura **e** rolagem), então ele aceita `sticky` — a largura de
  borda a borda continua verificada nas linhas seguintes.

## O que ainda precisa do seu celular

Nada disso foi visto numa tela real: aqui não há navegador com câmera. O que **está provado** é a
regra (testes) e a sintaxe. O que **só você pode confirmar**:

1. abrir a câmera e **rolar a tela** — o visor deve subir junto e não cobrir os cartões;
2. a barra de zoom deve ficar **colada abaixo** do vídeo;
3. **🔦 Lanterna** aparece no seu aparelho? (no Android deve; no iPhone com Safari, não);
4. abrir a câmera: deve estar em **1x**, sem ampliação.

## Próximo — item 2, motores de leitura

A etiqueta das armações é **Code 128**. Antes de trocar ou somar biblioteca, o caminho é
**medir** quantas leituras a atual perde com a etiqueta real (`80202503194`), porque a regra do
projeto é não instalar biblioteca sem necessidade comprovada.

Para isso uso o **📷 Diagnóstico** que já existe no app: ele informa `leitor:` (nativo ou
biblioteca) e quantas leituras foram feitas.
