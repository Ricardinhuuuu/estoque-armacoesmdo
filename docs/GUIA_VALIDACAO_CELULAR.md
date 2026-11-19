# Guia de Validação no Celular — MDO Estoque

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Para que serve:** marcar, item por item, o que só o aparelho real e a Vercel podem provar.
Os **124 testes automáticos** já cobrem regra e comportamento; este guia cobre **câmera, rede, toque e impressão**.

Como usar: marque `[x]` no que passar, escreva no campo **Anotação** o que falhou (aparelho, hora, o que
aconteceu). O que falhar vira correção numa próxima etapa.

---

## Antes de começar — preparação

| # | Passo | ✓ |
|---|---|---|
| P1 | Mesclar os PRs na ordem: **#1 → #2 → #3 → #4 → #5 → #6 → #7 → #8 → #9** | [ ] |
| P2 | Vercel → **Add New Project** → importar o repositório (framework *Other*, sem build) | [ ] |
| P3 | Vercel → **Storage → Postgres** (cria `DATABASE_URL`) | [ ] |
| P4 | Vercel → **Settings → Environment Variables** → `SYNC_TOKEN` com um segredo longo | [ ] |
| P5 | **Redeploy** | [ ] |
| P6 | Abrir o endereço `https://seu-app.vercel.app` no celular e **adicionar à tela de início** | [ ] |
| P7 | No app: **Admin › 🔄 Sincronização** → colar endereço e `SYNC_TOKEN` → *Salvar configuração* | [ ] |
| P8 | Conferir o indicador de sincronização: precisa ficar **🟢** | [ ] |

> Se o P8 não ficar 🟢, pare aqui e me mande a mensagem de erro que aparece em **Admin › 🔄 Sincronização**.

**Aparelhos sugeridos:** um iPhone (Safari) e um Android (Chrome). Os testes de câmera são diferentes nos dois.

---

## A. Primeiro acesso e contas

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| A1 | Abrir o app pela primeira vez | Pede **nome completo, login e senha**; o primeiro usuário vira administrador | [ ] |
| A2 | Tentar entrar só com o primeiro nome | Recusa e explica que precisa nome e sobrenome | [ ] |
| A3 | Sair e entrar de novo com o login criado | Entra normalmente | [ ] |
| A4 | Admin › 👥 Usuários → criar um **operador** | Operador aparece na lista | [ ] |
| A5 | Entrar como operador | Não vê a aba **Admin** | [ ] |
| A6 | Errar a senha 3 vezes | Bloqueia com contagem regressiva; a mensagem é **genérica** (não diz se o login existe) | [ ] |
| A7 | Admin → **Desbloquear** esse operador | Operador volta a entrar | [ ] |
| A8 | Admin → **Senha provisória** | Mostra a senha uma vez; ao entrar, o operador é **obrigado a trocar** | [ ] |
| A9 | Deixar o app fechado mais de 12 horas e reabrir | Sessão do servidor expira e pede login de novo | [ ] |
| A10 | Entrar em **dois aparelhos** com o mesmo usuário | Cada aparelho tem sua sessão, sem derrubar o outro | [ ] |

---

## B. Câmera e leitura (o ponto mais crítico)

Etiqueta de teste real: **`80202503194 · 5CL661045417140C4`** (Code 128).

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| B1 | Aba **Bipar** → liberar a câmera | Pede permissão **uma vez** e abre a imagem ao vivo | [ ] |
| B2 | Bipar a etiqueta de teste | Lê e mostra o produto; o som confirma | [ ] |
| B3 | Aproximar e afastar a etiqueta | O **zoom digital 3,4x** deixa ler de longe | [ ] |
| B4 | Bipar com pouca luz | Lê ou avisa que não conseguiu, **sem travar a tela** | [ ] |
| B5 | Bipar um código **não cadastrado** | Avisa que não está no catálogo, sem inventar produto | [ ] |
| B6 | Bipar um **QR Code** qualquer | Lê o código (quando for código de produto) | [ ] |
| B7 | Bipar um **EAN-13** de produto comum | Lê o código | [ ] |
| B8 | **iPhone:** repetir B2 | Deve funcionar com a biblioteca empacotada (o iPhone não tem `BarcodeDetector`) | [ ] |
| B9 | **Android:** repetir B2 | Usa o leitor nativo do aparelho | [ ] |
| B10 | Girar o celular na horizontal e bipar | Continua lendo | [ ] |
| B11 | Foto da etiqueta pela **galeria** (📸 Ler por foto) | Lê o código da foto | [ ] |
| B12 | Foto **desfocada** de propósito | Mensagem clara com as causas prováveis; nada é lançado | [ ] |
| B13 | Foto com o código **cortado** | Mensagem clara; nada é lançado | [ ] |
| B14 | Bipar em modo **Contagem** (inventário) | Soma na contagem, não mexe no estoque | [ ] |

---

## C. Consulta por código e por foto (somente leitura)

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| C1 | Aba **Estoque** → digitar parte do modelo | Filtra a lista na hora | [ ] |
| C2 | Buscar por **cor** | Filtra corretamente | [ ] |
| C3 | Buscar por **código** | Encontra o produto | [ ] |
| C4 | 📷 Buscar por código de barras | Mostra o produto e o **saldo**, sem alterar nada | [ ] |
| C5 | 📸 Buscar por foto | Mesma coisa, pela foto | [ ] |
| C6 | Conferir o estoque antes e depois de C4/C5 | **Não muda** (é só consulta) | [ ] |
| C7 | Foto de um produto **não cadastrado** | Diz que não encontrou; não cria nada | [ ] |
| C8 | **Buscar no servidor** (com sincronização ligada) | Lista paginada com *Próxima* e *Anterior* | [ ] |

---

## D. Movimentações, aprovação e estorno

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| D1 | Entrada de 5 unidades | Saldo sobe 5; aparece no Log | [ ] |
| D2 | Saída de 2 unidades | Saldo desce 2 | [ ] |
| D3 | Saída maior que o saldo | Avisa e não deixa o saldo negativo sem confirmação | [ ] |
| D4 | **Desfazer última bipada** | Reverte exatamente o último lançamento | [ ] |
| D5 | Operador pede uma saída que exige aprovação | Fica **pendente**, sem baixar o estoque | [ ] |
| D6 | Admin → **Aprovar** | Baixa o estoque e registra quem aprovou | [ ] |
| D7 | Admin → **Recusar** | Nada muda no estoque | [ ] |
| D8 | **Estornar** uma movimentação | Cria o estorno, com rastro de quem estornou | [ ] |
| D9 | Estornar algo lançado por **outro** operador | É permitido, mas aparece em **divergências** (Admin) | [ ] |
| D10 | Definir **estoque mínimo** (tocar no produto na aba Estoque) | Alerta quando o saldo chega ao mínimo | [ ] |

---

## E. Sincronização entre dois aparelhos

Use **dois celulares** com o mesmo endereço e o mesmo `SYNC_TOKEN`.

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| E1 | Aparelho A lança uma entrada | Aparelho B recebe ao abrir ou em até 30 s | [ ] |
| E2 | Aparelho B lança uma saída | Aparelho A recebe | [ ] |
| E3 | Os dois biparem **ao mesmo tempo** | Nenhum lançamento é perdido nem duplicado | [ ] |
| E4 | Abrir o app **sem internet** e bipar | Fica na fila: *Pendentes neste aparelho: 1* | [ ] |
| E5 | Voltar a internet | Envia sozinho e zera a fila | [ ] |
| E6 | **Fechar o app** sem internet depois de bipar e reabrir | A bipada continua lá (não se perde) | [ ] |
| E7 | Bipar com internet caindo no meio | O item só sai da fila com confirmação do servidor | [ ] |
| E8 | Abrir o app no avião (modo avião) | Funciona em **modo local** e diz isso claramente | [ ] |
| E9 | Desligar a variável `SYNC_TOKEN` na Vercel e tentar sincronizar | Mensagem clara de erro; o app continua utilizável | [ ] |

---

## F. Inventário

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| F1 | Admin → **Iniciar inventário** (informa o responsável) | Inventário em andamento, com responsável | [ ] |
| F2 | Contar 3 produtos no modo **Contagem** | Aparecem com contado × sistema × diferença | [ ] |
| F3 | **Concluir e ver divergências** | Mostra o resumo e grava no histórico | [ ] |
| F4 | Conferir o estoque depois de concluir | **Não muda** sem confirmação do administrador | [ ] |
| F5 | Operador tenta iniciar inventário | Não consegue (só administrador) | [ ] |
| F6 | **Histórico de inventários** | Lista os inventários concluídos com data e divergências | [ ] |

---

## G. Painel, histórico e relatórios

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| G1 | Aba **Estoque** → tocar nos números do painel | Abre a lista daquele número (produtos, zerados, peças) | [ ] |
| G2 | Aba **Log** → filtros de período, tipo e texto | Filtra corretamente | [ ] |
| G3 | Operador abre o Log | Vê **só as próprias** movimentações | [ ] |
| G4 | **⬇ Exportar o que está filtrado (CSV)** | Abre/baixa o arquivo com o que está na tela | [ ] |
| G5 | Admin → **📊 Relatórios** | Números conferem com o Log | [ ] |
| G6 | Trocar o período do relatório | Os números mudam de acordo | [ ] |

---

## H. Power BI e PDF

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| H1 | Admin → **Power BI** com dados | 7 cartões com barras e totais | [ ] |
| H2 | Trocar o período | Cartões e barras acompanham | [ ] |
| H3 | Tocar numa barra de **dia** | Filtra cruzado com o resto | [ ] |
| H4 | Tocar numa barra de **produto** ou **operador** | Filtra cruzado | [ ] |
| H5 | **⬇ CSV** | Baixa o recorte atual | [ ] |
| H6 | **🖨 PDF** no iPhone | Abre a folha de impressão; *Salvar em Arquivos* gera o PDF | [ ] |
| H7 | **🖨 PDF** no Android | Abre a impressão; *Salvar como PDF* gera o arquivo | [ ] |
| H8 | Conferir o PDF gerado | Só o relatório aparece, com **título, hora e filtros** no topo; menu e botões **não** aparecem | [ ] |
| H9 | Fechar a impressão sem salvar | A tela volta ao normal, com o menu e os botões de volta | [ ] |
| H10 | Operador abre a aba Admin | Não vê Power BI (cartão vazio) | [ ] |

---

## I. Seção 10 — melhorias

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| I1 | **🏷 Cadastrar produto por foto da etiqueta** com código **novo** | Pede descrição, cor e estoque inicial — **você digita** | [ ] |
| I2 | Cancelar a descrição (deixar vazio) | Cadastro cancelado, nenhum produto criado | [ ] |
| I3 | Fotografar código **já cadastrado** | Mostra o produto e o saldo, e pede o estoque correto — **não duplica** | [ ] |
| I4 | Operador tenta o 🏷 | Aviso de permissão; nada é criado | [ ] |
| I5 | Admin → **🔍 Por operador e divergências** | Lista operadores; *Ver produtos* abre entradas/saídas/ajustes | [ ] |
| I6 | Provocar uma divergência (saldo negativo ou baixa acima do inicial) | Aparece na lista de **Divergências** | [ ] |
| I7 | Admin → **😴 Produtos sem movimentação** → escolher **30 dias** | Lista quem não movimentou no período | [ ] |
| I8 | Fechar e reabrir o app | O período escolhido **continua salvo** | [ ] |
| I9 | Escolher **Desligado** | A lista some e o aviso para | [ ] |
| I10 | Painel de **Avisos** | O aviso de produto parado aparece **uma vez no dia**, sem repetir | [ ] |

---

## J. Backup, importação e dados

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| J1 | **💾 Baixar backup (JSON)** | Baixa o arquivo; abrir mostra os dados reais | [ ] |
| J2 | **♻ Importar/mesclar backup** de outro aparelho | Junta sem duplicar movimentação | [ ] |
| J3 | Importar backup antigo com usuário desativado | **Não** reativa e **não** promove ninguém a administrador | [ ] |
| J4 | **📥 Importar planilha** (.xlsx/.csv) de produtos | Cadastra os produtos da planilha | [ ] |
| J5 | **⬇ Exportar Estoque atual (CSV)** | Abre no Excel com saldo correto | [ ] |
| J6 | **⬇ Exportar auditoria (CSV)** | Lista as ações com nome, data e hora | [ ] |

---

## K. Uso no dia a dia (celular)

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| K1 | Instalar na tela de início e abrir pelo ícone | Abre em tela cheia, com o ícone da MDO | [ ] |
| K2 | Usar com o celular na vertical e na horizontal | Layout continua utilizável | [ ] |
| K3 | Usar com uma mão, em pé, com pressa | Botões grandes, sem toque acidental | [ ] |
| K4 | Bipar 20 peças seguidas | Sem travamento, sem perder leitura | [ ] |
| K5 | Ficar 10 minutos bipando | Bateria e aquecimento aceitáveis | [ ] |
| K6 | Abrir o app no 4G e no Wi-Fi | Funciona nos dois | [ ] |

---

## Como me reportar o que falhou

Para cada item que falhar, mande:

1. **Número do item** (ex.: B12)
2. **Aparelho e navegador** (ex.: iPhone 13, Safari)
3. **O que você fez**, o que **esperava** e o que **aconteceu**
4. **Print da tela**, se der

Com isso eu corrijo e trago o item de volta para você testar. O que passou fica registrado como validado.

---

## Situação do projeto

| Entrega | PR |
|---|---|
| Etapa 0 e 1 — diagnóstico e câmera | #1, #2 |
| Etapa 2 — busca por código e foto | #3 |
| Etapa 3 — sincronização | #4 |
| Etapa 4 — contas no servidor | #5 |
| Etapa 5 — painel, relatórios e Power BI | #6 |
| Etapa 6 — desempenho, segurança e publicação | #7 |
| Seção 10.1 — cadastro por foto | #8 |
| Seção 10.2 e 10.3 — operador e produtos parados | #9 |

**124 testes automáticos passando, 0 falhando.** `main` preservada; todos os PRs são encadeados.
