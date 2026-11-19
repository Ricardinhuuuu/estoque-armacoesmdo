# Seções 10.2 e 10.3 — Operador/divergências e produto sem movimentação

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch:** `secao10-2-3-operador-parados` (sobre `secao10-1-cadastro-foto`, PR #8)
**Testes:** **124 passando, 0 falhando** (10 novos: 5 da 10.2 e 5 da 10.3)

---

## 10.2 — Consulta de movimentações por operador ✅

Cartão **🔍 Por operador e divergências** no Admin (só administrador).

- **Quem movimentou cada produto:** lista os operadores do período (7 / 30 / 90 dias), com total de
  movimentações; o botão *Ver produtos* abre a lista de cada operador com entradas, saídas, ajustes e a
  data da última movimentação de cada peça.
- **Divergências apontadas** (calculadas dos registros reais, sem estimativa):
  - **saldo negativo** — a conta do estoque ficou abaixo de zero;
  - **baixa maior que o estoque inicial** — saída acima do que entrou como inicial;
  - **estorno feito por outro operador** — quem estornou não foi quem lançou.
- Repetição do mesmo aviso é deduplicada; mostra até 40 linhas e informa o total.
- Operador **não vê** este cartão (fica vazio, como o Power BI).
- Somente leitura: nada altera estoque.

## 10.3 — Aviso de produto sem movimentação ✅

Cartão **😴 Produtos sem movimentação** no Admin, com período **configurável** pelo administrador:
**Desligado / 30 / 60 / 90 / 180 dias**. A escolha fica salva (`mdo_parado`).

- Lista os produtos **sem nenhuma movimentação** dentro do período, com a data da última ou “sem registro”.
- Produto **nunca movimentado e sem estoque inicial** não entra na lista — é produto vazio, não “parado”.
- O mesmo critério entra no **painel de alertas** (uma vez por dia, sem repetir), como pedido.
- Período **desligado** por padrão: só começa a avisar depois que o administrador escolher.
- Operador **não vê** o cartão.

---

## Como foi testado

### 10.2 — 5 testes automáticos, todos passando
1. mostra quem movimentou cada produto (dois operadores, produtos distintos, contagem correta)
2. divergência de saldo negativo aparece
3. divergência de estorno feito por outro operador
4. operador não vê o painel de operadores
5. período sem movimentação não inventa operador

### 10.3 — 5 testes automáticos, todos passando
1. desligado por padrão não lista nada
2. lista só quem não movimentou no período escolhido (100 dias sem movimento aparece em 30, não aparece quem moveu hoje)
3. período configurável e salvo em `mdo_parado`
4. o aviso entra no painel de alertas e não repete no mesmo dia
5. operador não vê o cartão de produtos parados

### Não testado aqui — depende de uso real
| Teste | Precisa de |
|---|---|
| volume grande de movimentações (desempenho dos cartões) | uso real / Vercel com dados |
| divergências em dados sincronizados de dois aparelhos | Vercel + Postgres configurados |

Não simulei esses casos.

## Arquivos

| Arquivo | O que muda |
|---|---|
| `index.html` | `opDados()`, `drawOperadores()`, `PARADO`, `parados()`, `drawParados()`, aviso em `alertas()`; idêntico a `src/index_versao6.html` |
| `tests/run-tests.js` | 10 testes novos |

## Seção 10 — situação final

| Item | Situação |
|---|---|
| 10.1 Cadastro por foto | ✅ PR #8 |
| 10.2 Movimentações por operador e divergências | ✅ este PR |
| 10.3 Aviso de produto sem movimentação | ✅ este PR |

Com isso, **todo o prompt mestre (Etapas 0–6 e Seção 10) está implementado e testado** no que é
automatizável. O que resta é validação no ambiente real: celular, câmera, Vercel + Postgres.
