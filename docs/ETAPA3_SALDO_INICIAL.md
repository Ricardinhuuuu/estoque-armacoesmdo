# Etapa 3 — o saldo inicial não conta duas vezes

## O defeito

O servidor calcula `saldo = inicial + movimentos`. O app mandava o saldo **atual** como `inicial` e
mandava junto os movimentos que já estavam dentro desse saldo. **O mesmo histórico entrava duas
vezes.**

Provado com números — cadastro 13, três baixas já feitas, saldo no celular 10:

| inicial enviado | conta no servidor | resultado |
|---|---|---|
| saldo atual (10) | 10 − 3 | **7 — errado** |
| estado antes (13) | 13 − 3 | **10 — certo** |

Esse erro não aparecia na tela do celular: só no servidor, e só quando dois aparelhos se
encontravam.

## A correção

O app manda o inicial como **o estado anterior aos movimentos que ele envia**:

```js
inicial = saldoAtual + (saídas − entradas do que está no aparelho)
```

E o `on conflict (codigo) do nothing` garante que esse número só é gravado **uma vez**, no cadastro
novo. Um segundo aparelho que chegue depois mantém o inicial do servidor e recebe apenas os
movimentos que faltavam. O `historico` (quantos movimentos o aparelho tem por produto) vai junto
para diagnóstico.

## Prova

```
app:      saldo 10 · inicial enviado 13 · histórico {"P1":3}
servidor: 13 + 3 baixas = 10  → bate com o app
mais uma baixa de 2 → servidor 8
```

`170 passaram, 0 falharam` — local, com e sem `crypto.subtle`, e verde no CI.

## Etapa 3 — como está

| Item | Situação |
|---|---|
| Catálogo chega ao servidor antes de validar | ✅ |
| Produto existente não é sobrescrito | ✅ |
| Saldo inicial sem contar duas vezes | ✅ |
| Movimento repetido reconhecido pelo id | ✅ |
| Conferir na prática, com Postgres ligado | ⏳ só você pode |

## O que ainda falta (e o que precisa de você)

1. **Teste na prática.** Bipar em um celular e ver o número no outro. Sem o banco ligado, isso
   está provado pela regra e pelos testes — não pela prática, e eu não digo que está provado o
   que não vi funcionar.
2. **Catálogo em lote separado**, para não pesar cada envio quando o cadastro crescer.
3. **📷 Diagnóstico** do seu celular, que continua pendente desde o item 2 da câmera.
