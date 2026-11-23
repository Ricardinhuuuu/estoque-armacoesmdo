# O que mudou no index.html (6.7.0 → atual)

Base da comparação: o `index.html` do commit **"Add files via upload"** (`90c51f10`), que é a
versão **6.7.0**. Total: **+1014 linhas / −184 linhas**.

## As sete mudanças, uma por uma

### 1. Visor da câmera — +18 / −10
| Antes (6.7.0) | Agora |
|---|---|
| "dock" fixo no topo (`camDock`), empurrando a página com `padding-top` calculado em `camDockAjusta()` | `position:sticky` no topo (`camLarga`), acompanha a rolagem |
| proporção = a do vídeo, limitada entre 0,75 e 1,33 | **16:9 fixo**, altura máxima 34vh, vídeo em `cover` |
| — | `camTopo()` mede a altura e alimenta `--camTop` da barra de zoom |

**O `camDock`/`camDockAjusta` foi removido.** Foi trocado pelo sticky — é a mudança que mais
mexeu no layout da tela de bipar.

### 2. Trava de bipagem (1 bip = 1 baixa) — +19 / −1
Antes: `if(c===last){if(agora-lastT<700)return false}` — só tempo, 700 ms.
Agora: `TRAVA` por código, 900 ms, mais quadros limpos (`travaVerificar`, `travaQuadroLimpo`,
`travaAviso`, `travaSoltar`). **Código diferente entra na hora.**

### 3. Lanterna — +24 / −0
**Não existia.** `torchTrilha`, `torchSuportada`, `torchBotao`, `torchAplicar`, `torchAlternar`,
`torchAviso` e o botão `#torchBtn` (aparece só quando o aparelho tem lanterna).

### 4. Zoom — +2 / −2
`const ZOOM=3.4` → **`const ZOOM=1`** (abre em 1x). `ZOOMATUAL`, `localStorage.removeItem("mdo_zoom")`
— não guarda mais o zoom entre aberturas.

### 5. Admin em blocos — +24 / −0
**Novo.** `ADM_BLOCOS` (dia/pessoas/estoque/sistema/registro), `admGrupo`, `admMostra`,
`admAbrirCartao`, `ADMABA`. Os 13 cartões continuam, agrupados.

### 6. Contagem só para administrador — +6 / −0
**Novo.** `podeContar()`, `ajustarBotoesPorPapel()`; o botão 📋 Contagem some para operador.

### 7. Sincronização — +7 / −4
`produtosParaServidor()`, `juntarProdutosDoServidor()`, `historicoDoAparelho()`: o catálogo vai
junto do lote e o servidor cadastra antes de validar.

## A reescrita que explica as "remoções"

Boa parte das −184 linhas **não é remoção de funcionalidade**: é o bloco de sincronização e o
`drawAdm()` **reescritos** (as linhas antigas saíram e as novas entraram em outro formato). Exemplos:

- `sincronizar()`: de um envio único (`enviarLote(FILA.map(...))`) para laço de lotes de 200 com recusa tratada;
- `drawAdm()`: cada cartão passou a declarar seu bloco;
- `mode_()`: ganhou a checagem de papel.

## O que dá para desfazer, e o custo

| Mudança | Desfazer é fácil? | Consequência |
|---|---|---|
| 3. Lanterna | **Sim** — é acréscimo isolado | só o botão de lanterna desaparece |
| 6. Contagem só admin | **Sim** | o operador volta a poder contar (e perder o trabalho no fim) |
| 5. Admin em blocos | **Sim** | a tela Admin volta a ser uma lista corrida de 13 cartões |
| 2. Trava de bipagem | **Médio** | volta ao risco de 1 etiqueta = várias baixas |
| 1. Visor | **Médio** — mexe em CSS, JS e no HTML | volta o dock fixo que empurrava a página |
| 4. Zoom 1x | **Sim** | a câmera volta a abrir em 3,4x |
| 7. Sincronização | **Não recomendado** | o servidor volta a recusar toda baixa ("produto não cadastrado") |

## Como pedir o desfazer

Diga **o número** da mudança. Eu desfaço só ela, com o teste correspondente atualizado, e mostro
o diff. Nada mais é tocado.
