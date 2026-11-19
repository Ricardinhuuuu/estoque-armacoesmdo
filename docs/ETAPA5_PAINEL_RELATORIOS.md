# ETAPA 5 — Inventário, Painel, Histórico, Relatórios, Alertas e Power BI

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch:** `etapa5-painel-relatorios` (sobre `etapa4-contas-servidor`, PR #5)
**Testes:** **102 passando, 0 falhando** (16 novos desta etapa)

> Sem Base44. Tudo roda no app (HTML único) sobre os dados reais do aparelho, e continua
> compatível com a sincronização da Vercel das Etapas 3 e 4.

---

## 7.1 — Inventário com bipagem ✅

- **Iniciar inventário** na aba Admin: pede o responsável e marca o início (data e hora).
- A contagem usa o modo **📋 Contagem** da aba Bipar; cada leitura soma uma unidade e alimenta o inventário.
- Mostra **código, modelo, cor, quantidade contada, quantidade no sistema e a diferença**.
- **Concluir** mostra o resumo das divergências e **não altera o estoque**: o ajuste continua exigindo
  a confirmação do administrador em “Aplicar ajustes ao estoque”.
- Cada inventário fica no **histórico** (`mdo_invh`) com responsável, início, fim e os itens contados.
- Ao concluir, a contagem corrente é zerada — o próximo inventário começa limpo.
- **Operador não inicia nem conclui inventário** (testado).

## 7.2 — Painel inteligente ✅

Card no topo da aba **Estoque** com sete indicadores calculados dos dados reais, nunca fixos:

produtos · disponíveis · estoque baixo · zerados · entradas hoje · saídas hoje · pendentes de aprovação

Cada número é um botão que abre a lista correspondente; “entradas hoje” e “saídas hoje” levam à aba
Log já filtrada. Abaixo, a linha das últimas movimentações.

## 7.3 — Histórico de movimentações ✅

A aba **Log** ganhou filtros no topo:

- busca por produto, código, cor ou **operador**;
- tipo: entrada, saída, ajuste ou **estorno**;
- período: todos, hoje, 7, 30 ou 90 dias;
- botão **Limpar** e **Exportar o que está filtrado (CSV)** com data, hora, tipo, código, produto, cor,
  quantidade, operador, login e aparelho.

Ordem cronológica (mais recente primeiro). **O operador só vê o próprio histórico** (testado).

## 7.4 — Relatórios automáticos ✅

Card **📊 Relatórios** na aba Admin, com período de 7, 30 ou 90 dias:

- mais movimentados (top 10) com saídas;
- movimentações por operador, separando entradas e saídas;
- estoque baixo, zerados e produtos **sem movimentação** no período;
- totais de entradas, saídas e ajustes.

Só dados reais: período sem movimentação mostra vazio, nunca estimativa (testado).

## 7.5 — Alertas e automações ✅

`alertas()` avalia na abertura do app e a cada movimentação gravada:

- **estoque zerado** e **estoque baixo** (respeitando o mínimo de cada produto);
- **falha de sincronização** (quantas operações não foram confirmadas);
- **movimentações pendentes de aprovação**.

**Sem repetição no mesmo dia**: o aviso guarda o dia em que foi gerado e não volta a aparecer naquele
dia (testado). O mínimo continua configurável produto a produto na aba Estoque, e o admin pode zerar o
mínimo para desligar o alerta daquele item.

## 7.6 — Relatório estilo Power BI ✅

Card **📈 Relatório (Power BI)** na aba Admin, **exclusivo do administrador** (o operador recebe o card
vazio, testado), **somente consulta** (testado: estoque e movimentações não mudam).

- **Filtros no topo**: período (hoje, 7, 30, 90 dias), tipo, operador, modelo e cor — valem para todos os
  visuais ao mesmo tempo — mais **Limpar**, **🔄 Atualizar** e **⬇ CSV**.
- **“Atualizado em hh:mm”** com a hora da última movimentação do recorte.
- **Indicadores**: produtos, unidades em estoque, entradas, saídas, baixo, zerados, pendentes.
- **Entradas e saídas por dia**: barras azuis (entradas) e vermelhas (saídas).
- **Top 10 mais movimentados**, **por operador**, **estoque por modelo e cor** (com percentual),
  **⚠ Atenção** (zerados em vermelho, baixo em vermelho claro) e **Detalhe** com data, hora, produto,
  operador, tipo e quantidade.
- **Filtro cruzado**: tocar numa barra, num produto ou num operador filtra os outros visuais; tocar de
  novo remove.
- **Conferência**: o número de movimentações do recorte bate com o histórico filtrado (testado).
- **Responsivo**: no celular tudo empilha em uma coluna, com os filtros no topo.

Cores seguem o pedido: fundo branco, azul para entradas e destaques, vermelho para saídas, zerado e alertas.

---

## Limites declarados

| O que | Situação |
|---|---|
| Exportar o relatório em **PDF** | **não implementado**: só CSV. O PDF depende de biblioteca extra (a regra do prompt é não instalar sem necessidade); posso fazer via impressão do navegador ou empacotar uma lib se você autorizar |
| Power BI com dados do **Postgres** | hoje lê o que está no aparelho; com a sincronização ligada o app recebe as movimentações de todos os aparelhos, mas o recorte continua sendo o que já foi baixado |
| **Paginação** real no detalhe | mostra os 50 mais recentes do recorte (não pagina por página) |
| Tamanho do `index.html` | 252 KB — cabe bem; se crescer muito, carrego os visuais sob demanda |
| Teste visual no celular e impressão | **não testado aqui**: o ambiente não tem navegador nem celular |

## Testes

### Automatizados — 16 novos, todos passando
1. painel calcula tudo dos dados reais
2. indicador abre a lista correspondente
3. histórico filtra por tipo, período e texto
4. histórico é cronológico (mais recente primeiro)
5. operador só vê o próprio histórico
6. relatório usa dados reais do período
7. período sem movimentação mostra vazio, não estima
8. inventário registra responsável, contado, sistema e diferença
9. concluir inventário não altera o estoque sozinho
10. operador não inicia inventário
11. alerta de estoque zerado sem repetir no mesmo dia
12. alerta de estoque baixo respeita o mínimo
13. relatório Power BI só abre para administrador
14. filtros do Power BI cruzam com a tabela de detalhe
15. números do relatório batem com o histórico
16. relatório não altera estoque

### Pendentes — dependem de ambiente real
Visual no celular e no computador, impressão/PDF e o Power BI rodando sobre a sincronização ligada —
precisa de navegador real e da Vercel configurada. Não simulei nenhum desses.

## Checklist da Etapa 5

- [x] 7.1 Inventário com responsável, divergências e histórico, sem alterar o estoque sozinho
- [x] 7.2 Painel com os indicadores pedidos, cada um abrindo a lista
- [x] 7.3 Histórico com todos os filtros, detalhe e exportação
- [x] 7.4 Relatórios automáticos com dados reais e período selecionável
- [x] 7.5 Alertas sem repetição, respeitando o mínimo configurado
- [x] 7.6 Power BI só para administrador, somente consulta, filtros cruzados e CSV
- [x] 102 testes passando, 0 falhando
- [x] `index.html` = `src/index_versao6.html`
- [ ] Exportação em PDF do Power BI — **não feita, aguardando sua decisão**

---

**PARADO aguardando aprovação.** A Etapa 6 (desempenho, testes finais, segurança e publicação) é a última.
