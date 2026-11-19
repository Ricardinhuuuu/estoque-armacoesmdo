# Seção 7.6 — os cartões do topo e o detalhe da movimentação

Complemento do `SECAO7_6_RELATORIO_POWERBI.md`. Aqui estão os dois itens que faltavam do
visual 1 e da regra de interação.

## Visual 1 — os dez cartões numéricos

O relatório abria direto nos gráficos. Agora começa pelos dez indicadores que o prompt lista:

| Cartão | Fonte no código |
|---|---|
| Total de produtos | `PP.length` |
| Unidades em estoque | soma de `bal()` |
| Entradas | soma do recorte por dia |
| Saídas | soma do recorte por dia |
| **Saldo líquido** | `saldoLiquido` = entradas − saídas (novo) |
| Estoque baixo | `d.baixo.length` |
| Zerados | `d.zerados.length` |
| **Sem movimentação** | `semMov` = produtos sem nenhum movimento no recorte (novo) |
| Pendentes | `REQ.length` |
| **Divergências** | `diverg` = inventários concluídos com diferença (novo) |

Cores conforme o prompt:

- **azul** — entradas, saldo positivo e destaques;
- **vermelho** — saídas, zerados e divergências;
- **vermelho claro** — estoque baixo, sem movimentação e pendentes.

Grade: **2 colunas no celular, 5 no computador**.

## Interação — até a movimentação individual

O prompt diz: *"clicar em um item abre os detalhes, até chegar à movimentação individual"*.
Antes o clique só filtrava. Agora há dois comportamentos distintos:

| Onde clicar | O que acontece |
|---|---|
| Barra do dia, produto, operador | **filtro cruzado** (clicar de novo remove) |
| Item da tabela **Detalhe** | **abre a movimentação completa** |

A movimentação mostra: produto, código, data e hora, tipo, quantidade, operador (com login),
aparelho e observação.

## Um erro que só apareceu rodando o app

A primeira versão usava `INVH.filter(...)`. **`INVH` não existe**: o histórico de inventário
fica em `localStorage`, na chave `mdo_invh`, e cada item tem `itens:[{dif}]`.

O app quebrava ao abrir a aba do administrador:

```
ReferenceError: INVH is not defined
    at pbiDados (index.html:848)
```

Corrigido para a mesma leitura que a Seção 7.5 já usava:

```js
diverg: ls("mdo_invh",[]).filter(inv => (inv.itens||[]).some(x => x.dif !== 0)).length
```

**Lição:** teste unitário não pega isso — ele chamou `pbiDados()` num caminho que não passava
pela linha nova. Só rodar a tela abriu o erro.

## Prova

- `163 passaram, 0 falharam` — local, com e sem `crypto.subtle`, e **verde no CI** (PR e push).
- Conferido no harness com dados reais: saldo `+4`, sem movimentação `["222"]`, pendentes `1`,
  estoque baixo `1`, zerados `0`, **10 cartões renderizados**.
- 2 testes novos: os dez cartões e o detalhe da movimentação.

## Ainda falta do 7.6

- **Estoque por modelo e cor** é barra de progresso, e o prompt pede **rosca ou mapa de árvore**.
- **Cálculo no servidor**: o relatório calcula no aparelho. Com dois celulares, cada um mostra o
  seu — o prompt quer os números do banco. Depende de ligar a sincronização (Etapa 3) no Postgres.
