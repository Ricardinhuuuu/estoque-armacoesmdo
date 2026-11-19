# Seção 9 — Conferência das Leituras (teste da pesquisa)

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch:** `camera-correcoes-diagnostico` (PR #10)
**Testes:** **134 passando, 0 falhando** (3 novos)

---

## Por que esta etapa existe

A Seção 9 do prompt mestre exige testar **16 itens** de pesquisa na aba Estoque — digitar código, modelo e
cor, câmera, foto na hora, galeria, Code 128, EAN-13, QR, código não cadastrado, foto desfocada, pouca luz,
nova tentativa, vários produtos em sequência, saldo exibido e **confirmação de que a pesquisa não altera o
estoque**.

Até agora esses testes só existiam na sua mão: você teria que anotar tudo no papel. Agora **o app registra
cada leitura sozinho**, com origem, código, produto, saldo e se encontrou — e você exporta em CSV para me
mandar ou para anexar à aprovação da etapa.

## O que foi feito

### Registro automático (`mdo_leit`, no aparelho)
Toda leitura feita pelo app fica gravada com:

| Campo | Exemplo |
|---|---|
| Data e hora | 18/02/2026 14:32 |
| **Origem** | `câmera (Bipar)` · `câmera (aba Estoque)` · `foto/galeria` · `foto/galeria (reprocessada)` · `foto/galeria (falhou)` |
| Código lido | 80202503194 |
| Código do cadastro | o mesmo, quando o código da etiqueta difere do interno |
| Produto e cor | RX CLOTE ACETATO… · C1 PRETO |
| Saldo no momento | 3 |
| Encontrou? | sim / não |
| Usuário | ricardo |

Ficam as **500 leituras mais recentes**. Nada vai para o servidor.

### Cartão **🧪 Conferência das leituras** (Admin)
- Resumo por origem: `12 leitura(s) · câmera (Bipar): 10/12 encontrada(s) · foto/galeria: 2/2 encontrada(s)`
- **⬇ Exportar leituras (CSV)** — arquivo pronto para o Excel, com uma linha por leitura
- **🗑 Limpar registro de leituras** — limpa só o registro; **não** mexe em estoque nem em movimentações

## Como isso responde à Seção 9

| Item do prompt | Como fica comprovado |
|---|---|
| 1–3 digitar código / modelo / cor | teste automático da Etapa 2 + conferência na tela |
| 4 leitura por câmera | registrado com origem `câmera` |
| 5 foto tirada na hora | origem `foto/galeria` |
| 6 imagem da galeria | origem `foto/galeria` |
| 7 Code 128 | etiqueta `80202503194` |
| 8 EAN-13 / 9 QR Code | registrados com o código lido |
| 10 código não cadastrado | `Encontrou: não`, sem alterar nada |
| 11 foto desfocada | origem `foto/galeria (falhou)` |
| 12 pouca luz | mesma origem, quando a foto não é lida |
| 13 nova tentativa | aparece como `(reprocessada)` |
| 14 vários produtos em sequência | uma linha por produto, na ordem |
| 15 saldo exibido | saldo gravado junto da leitura |
| 16 pesquisa não altera o estoque | teste automático: nenhuma movimentação criada e saldo idêntico |

## Como foi testado (automático)

1. o registro guarda código lido, origem e se encontrou o produto
2. o registro **não altera estoque nem movimentações** (comparação antes/depois)
3. as leituras podem ser exportadas e limpas

### Não testado aqui
Leitura real com câmera e foto em cada aparelho — depende do celular. O registro apenas grava o que
aconteceu; ele não inventa leitura.

## Como usar no teste

1. Aba **Estoque** → faça as leituras do roteiro (câmera, foto, galeria, desfocada, outro produto…)
2. **Admin › 🧪 Conferência das leituras** → confira o resumo
3. **⬇ Exportar leituras (CSV)** → me mande o arquivo, ou guarde como prova do teste da Seção 9

## Arquivos

| Arquivo | O que muda |
|---|---|
| `index.html` | `LEIT`, `leitRegistrar()`, `leitResumo()`, cartão de conferência e exportação; idêntico a `src/index_versao6.html` |
| `tests/run-tests.js` | 3 testes novos; o teste 2.7 agora reconhece `mdo_leit` como registro permitido |
