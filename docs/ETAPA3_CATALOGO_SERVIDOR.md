# Etapa 3 — o catálogo chega ao servidor

## O problema (a sincronização não funcionava de verdade)

O servidor recusa movimento de produto que não conhece:

```js
const produto = (produtos || []).find((p) => p.codigo === c);
if (!produto) return { ok: false, erro: "produto não cadastrado" };
```

Mas **nada enviava o cadastro**. O app só consultava `/api/produtos` (GET, busca paginada).

O que acontecia de verdade:

1. o operador bipa uma peça;
2. o lote vai para `/api/movimentos`;
3. o servidor **recusa** — o produto só existe no celular dele;
4. o app joga a operação para "avisos" e a fila anda para a próxima... que também é recusada.

**Com dois celulares, nada se juntava.** E o operador não tem como cadastrar produto.

## A correção

**No app** — o lote leva o catálogo:

```js
body: JSON.stringify({ movimentos: movs, produtos: produtosParaServidor() })
```

**No servidor** — cadastra os produtos novos **antes** de validar:

```js
insert into mdo_produtos (codigo, descricao, cor, inicial)
values ($1,$2,$3,$4) on conflict (codigo) do nothing
```

`do nothing` é de propósito: **produto existente nunca é sobrescrito**. Um celular atrasado não
desfaz um cadastro. O saldo inicial só vale no cadastro novo.

**Na recepção** — `receberNovidades()` devolvia `j.produtos` e o app **ignorava**. Agora
`juntarProdutosDoServidor()` acrescenta os que faltam, sem duplicar e sem tocar no que existe.

## Prova

```
servidor com o produto cadastrado + baixa de 2 → aceitos: 1, recusados: []
servidor SEM o produto                         → recusados: [{"motivo":"produto não cadastrado"}]
app recebendo 2 produtos (1 repetido)          → entra 1, total 2, o antigo não é sobrescrito
rodando de novo                                → entra 0 (sem duplicar)
```

`169 passaram, 0 falharam` — local, com e sem `crypto.subtle`, e verde no CI.

## O que falta da Etapa 3

1. **Saldo inicial × movimentos.** Ao cadastrar o produto no servidor com o saldo *atual* do
   celular, um segundo aparelho que chegue depois pode contar o inicial duas vezes. Precisa de
   regra explícita — o mais seguro é o servidor recalcular pelo histórico de movimentos.
   **Este é o próximo item, e é o mais importante que resta.**
2. **Envio do catálogo em lote separado**, para não pesar cada envio quando o cadastro crescer.
3. **Conferir o ciclo na prática**, com o Postgres ligado: bipar em um celular e ver aparecer no
   outro.
