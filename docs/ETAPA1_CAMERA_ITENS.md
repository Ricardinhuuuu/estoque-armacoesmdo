# Câmera — Etapa 1: o que foi feito e o que falta

## Situação do repositório (importante)

Os dois últimos commits da `main` são **"Add files via upload"** — arquivos subidos pelo
navegador. Consequência real:

| Onde | Versão | Tem os cartões do 7.6? |
|---|---|---|
| GitHub `main` | 6.7.0 | **não** |
| Vercel (produção) | 6.7.0 | **não** |
| Pasta local (antes) | 6.6.0 | — |

O PR #17 (cartões do topo + detalhe da movimentação) **se perdeu no upload**. Vai ser reaplicado
depois, em cima da 6.7.0.

A API está protegida: `/api/estado` responde **401** sem token, o que confirma `SYNC_TOKEN`
configurado na Vercel.

## Item 5 — trava anti-duplicidade (FEITO)

### O bug

No iPhone, **uma leitura gerou 5 baixas seguidas**. O leitor devolve o mesmo código em todos os
quadros enquanto a etiqueta fica na frente da câmera; o bloqueio era de só **700 ms**, então o
mesmo código voltava a entrar.

### A correção — três camadas

```js
const TRAVA = { cod:"", desde:0, limpos:0 };
const TRAVA_MS = 1200;      // tempo mínimo entre dois bips do mesmo código
const TRAVA_QUADROS = 4;    // quadros seguidos SEM o código para liberar
```

1. **Trava imediata** — aceitou, travou. Nada mais entra.
2. **Exige quadro limpo** — só cai quando o leitor passa quadros seguidos **sem achar** aquele
   código (o operador afastou a etiqueta). Só o tempo passar **não** libera.
3. **Tempo mínimo de 1,2 s** — mesmo com quadro limpo.

Durante a trava o visor mostra: **"✅ Lido. Afaste a etiqueta para bipar de novo."**

Ligado nos dois motores:

- `startNative` (Android/Chrome): chama `travaQuadroLimpo()` quando não acha código;
- biblioteca (iPhone/Safari): tique de 120 ms faz o mesmo, e é parado junto com a câmera.

### Prova

```
30 quadros seguidos do mesmo código → 1 baixa        (era 5+)
5 s com a etiqueta na frente        → continua 1     (trava não solta só com o tempo)
afastar a etiqueta e bipar de novo  → 2 baixas       (volta a funcionar)
```

`162 passaram, 0 falharam` — local, com e sem `crypto.subtle`, e verde no CI (PR e push).

2 testes antigos foram **atualizados de propósito** (a regra mudou: outro código também espera a
trava) e 1 teste novo reproduz o bug do iPhone.

---

## O que falta da Etapa 1

### Item 3 — Zoom (fácil)

Hoje a câmera abre em **3,4x**. O pedido é abrir **sem zoom**. A barra já fica abaixo do visor;
precisa garantir que ela fique sempre visível e legível.

### Item 4 — Lanterna (médio)

**Não existe** nenhuma chamada a `torch` no código. Precisa:

- `track.getCapabilities().torch` para saber se o aparelho suporta;
- `applyConstraints({advanced:[{torch:true}]})` para ligar;
- botão que **só aparece** quando há suporte, e aviso claro quando não há (iPhone com Safari
  costuma não expor `torch`).

### Item 1 — Visor acompanhando a tela (médio)

Hoje o visor vira uma **faixa fixa no topo** (`position:fixed`), que cobre conteúdo quando o
operador rola. Precisa seguir a rolagem e voltar ao lugar natural.

### Item 2 — Motores de leitura (o mais fundo)

O formato das armações é **Code 128**. O app já pede 11 formatos, mas no iPhone o leitor nativo
não é usado (o diagnóstico mostrou `leitor: biblioteca`). Caminho:

- usar `BarcodeDetector` quando existir (Android/Chrome) — já acontece;
- no Safari, avaliar um segundo motor (ex.: ZXing empacotado) com foco em Code 128;
- sempre mantendo a biblioteca empacotada para funcionar offline.

Este é o único item que pode exigir **nova biblioteca** — e a regra do projeto é não instalar sem
necessidade, então só depois de medir se a atual realmente perde leituras.
