# Seção 7.6 — Relatório estilo Power BI (versão 6.6.0)

O relatório já existia desde a Etapa 5. Esta passagem fechou o que faltava do item **7.6** do
prompt mestre, sem mexer no que já funcionava.

## O que foi acrescentado

### Filtro de período completo

| Antes | Agora |
|---|---|
| Hoje · 7 dias · 30 dias | Hoje · 7 dias · 30 dias · **Mês atual** · **Personalizado** |

O período personalizado abre dois campos de data (**De** e **Até**). O recorte vale para todos
os visuais ao mesmo tempo, e o botão **Limpar** zera período, datas e todos os filtros.

O cálculo fica em `pbiIntervalo()`, que devolve início e fim. `pbiBase()` usa esse intervalo —
nada mais no relatório precisa saber de que período se trata.

### Produtos parados dentro do relatório

O prompt pede que o cartão **Atenção** traga "produtos com estoque baixo, zerados **e parados**".
Faltavam os parados. Agora:

- a lista vem de `parados(dias)`, a mesma função da Seção 10.3 — não há duas regras;
- o período dos parados é configurável no topo do relatório (Sem parados · 30d · 60d · 90d · 180d);
- se estiver desligado, usa o período do próprio relatório;
- os parados aparecem no cartão **Atenção** com a marca `parado`.

> **Regra preservada:** produto **sem estoque e sem nenhum movimento** é "vazio", não "parado".
> Senão todo produto recém-cadastrado apareceria como parado. Isso está documentado em
> `SECAO10_2_3_OPERADOR_PARADOS.md` e continua valendo.

### Exportação do recorte: resumo + detalhe

O botão virou **⬇ Planilha (resumo + detalhe)** e exporta, num único arquivo:

1. cabeçalho com data de geração e todos os filtros aplicados;
2. **por dia** — entradas, saídas e saldo;
3. **por tipo** — quantidade de movimentos e unidades;
4. **por operador** — entradas, saídas e movimentos;
5. **por modelo e cor** — unidades em estoque;
6. **detalhe** — data e hora, produto, código, cor, operador, login, tipo, quantidade, aparelho.

O botão **🖨 PDF** (impressão do navegador) continua igual.

### Filtro cruzado no cartão Detalhe

Agora o clique funciona em todos os visuais: barra de dia, produto, operador **e item da
tabela de detalhe**. Tocar de novo remove o filtro. O item mostra data, tipo e quantidade ao
passar o mouse ou tocar (atributo `title`).

### Responsividade

| Celular | Computador (≥ 760 px) |
|---|---|
| visuais em uma coluna | **grade de duas colunas** |
| filtros recolhidos em "⚙️ Filtros" | filtros abertos |

Os gráficos são barras e números em HTML, então ficam legíveis em qualquer tela sem biblioteca
de gráficos.

## Conferência com o histórico (7.3)

O cartão **Detalhe** usa exatamente o mesmo recorte (`pbiFiltrado()`) dos outros visuais. Para o
mesmo filtro, a soma das quantidades do Detalhe é a soma das colunas do gráfico por dia — não há
um segundo cálculo. Quando não há movimentação, aparece **"Sem movimentação no recorte"**, e
nunca um valor estimado.

## Um erro no caminho (registrado)

Ao montar o filtro de período, a linha que gera os campos de data ficou com **11 aspas simples**
(número ímpar), o que quebrou o script inteiro do app — 122 testes caíram de uma vez. O defeito
não estava na lógica, e sim numa linha de HTML quebrada em duas strings.

Corrigido separando a linha em duas strings independentes. A lição prática: quando **muitos**
testes falham ao mesmo tempo, o problema é sintaxe, não lógica — o script inteiro deixou de rodar.

Depois disso apareceu um teste falhando (produto nunca movimentado não sendo listado como
parado). **Era o teste que estava errado**, não o app: ele criava um produto sem estoque e sem
movimento, que pela regra é "vazio". Ajustado para dar estoque ao produto.

## Testes

```
node tests/run-tests.js
✅ 160 passaram, 0 falharam
```

Cinco testes novos:

1. os cinco períodos recortam as datas corretamente (hoje, 7, 30, mês atual, personalizado);
2. filtros por tipo, operador, modelo e cor;
3. filtro cruzado por produto e por operador;
4. o cartão Atenção inclui os parados;
5. a exportação do recorte traz as seções de resumo e de detalhe.

## O que continua pendente

- **Prova em aparelho real**: a grade no computador e o empilhamento no celular precisam ser
  vistos numa tela de verdade.
- **Dados reais**: o relatório só mostra algo depois que houver movimentações. Com o banco
  vazio ele diz "Sem movimentação no recorte" — que é o comportamento correto, mas não prova
  número nenhum.
