# 📦 MDO Estoque — Sistema de Contagem e Controle de Estoque

Aplicativo de contagem e controle de estoque de armações MDO. Funciona no navegador do celular
(Safari/iPhone e Chrome/Android), sem instalação e sem servidor: os dados ficam no aparelho
(`localStorage`) e podem ser levados de um aparelho para outro pelo backup JSON.

---

## 📁 Estrutura do Repositório

```text
mdo-estoque/
├── README.md                        # Este arquivo
├── index.html                       # Aplicativo (arquivo único) — é este que vai para o deploy
├── manifest.webmanifest             # Nome, ícone e modo standalone ao instalar na tela de início
├── vendor/
│   ├── html5-qrcode.min.js          # Leitor de código de barras empacotado (funciona sem internet)
│   └── html5-qrcode.LICENSE         # Licença Apache-2.0 da biblioteca
├── src/
│   └── index_versao6.html           # Cópia idêntica de index.html (referência do prompt mestre)
├── docs/
│   ├── ETAPA0_DIAGNOSTICO.md        # Diagnóstico técnico: backend, banco, riscos, plano de backup
│   ├── ETAPA1_CAMERA.md             # Câmera: zoom 3,4x, desempenho, biblioteca empacotada
│   ├── ETAPA2_BUSCA_FOTO.md         # Consulta por código de barras e foto na aba Estoque
│   ├── PROMPT_MESTRE_BASE44.md      # Especificação herdada (legado: o Base44 não é mais usado)
│   ├── ETAPA3_SINCRONIZACAO.md      # Como ligar a sincronização na Vercel + Postgres
│   └── ETAPA4_CONTAS_SERVIDOR.md    # Login, autocadastro e admin com segurança no servidor
├── tests/
│   ├── run-tests.js                 # 62 testes automatizados (revisão + Etapas 1 e 2)
│   └── dom-harness.js               # Mini-DOM para rodar os testes no Node
└── assets/
    ├── Icone_MDO.png                # Ícone oficial do aplicativo (617x617, original)
    ├── icon-180.png                 # Ícone 180x180 (apple-touch-icon, embutido no index.html)
    ├── icon-192.png                 # Ícone 192x192 (manifest)
    └── Codigo_de_barra.png          # Etiqueta real de armação (80202503194 · 5CL661045417140C4)
```

> `index.html` e `src/index_versao6.html` devem ser **sempre iguais**. Depois de qualquer alteração:
> `cp index.html src/index_versao6.html`.
>
> Os ícones do app ficam **embutidos** no `index.html` (base64) para funcionarem em qualquer hospedagem.
> Se trocar o ícone, gere `assets/icon-180.png` e `assets/icon-192.png` a partir do novo arquivo e
> substitua os dois blocos `data:image/png;base64,...` no topo do `index.html`.

---

## ▶️ Como rodar

- **Publicar:** **Vercel** (a pasta `api/` sobe junto como funções serverless).
  A câmera só funciona em `https://` (ou em `localhost`).
- **Testar localmente:** abra o `index.html` no navegador. Sem `https`, use a digitação manual ou a foto.

## 🧪 Testes

```bash
"$ABACUSAI_BOT_NODE" tests/run-tests.js
```

Cobrem: persistência do catálogo, login/bloqueio/senha provisória, aprovação de baixa, desfazer com
estorno, contagem órfã, backup e mesclagem, códigos com zero à esquerda, digitação manual, acessibilidade
dos botões, metadados de PWA, contagem de inventário e dados antigos do `localStorage`.

---

## 🎯 Principais Diretrizes do Projeto

1. **Preservação da Interface:** manter o fluxo, as telas, os botões e a identidade estrutural do MDO
   Estoque, atualizando apenas a paleta (Azul principal, Vermelho para saídas/alertas, Branco de fundo).
2. **Leitura Real de Códigos de Barras:** decodificação nativa (`BarcodeDetector`) com fallback
   (`html5-qrcode`) focada em `Code 128`, `EAN-13` e `QR Code`.
3. **Pesquisa Consultiva:** busca por câmera/foto sem alterar saldo (Etapa 2 do prompt mestre — **pendente**).
4. **Acesso de Operadores Zero E-mail:** autocadastro na tela inicial, bloqueio após 3 tentativas,
   senha provisória com troca obrigatória no app e auditoria.
5. **Gestão e Relatórios:** inventário com bipagem, backup entre aparelhos e relatório gerencial
   (Etapa 5 do prompt mestre — **pendente**).

---

## 🔐 Backend na Vercel

O app funciona sozinho no aparelho, mas o estoque **compartilhado** depende da API em `api/`
(funções serverless da Vercel + Postgres). Já implementado na Etapa 3:

- sincronização de movimentações entre aparelhos, com ID único (sem duplicar) e fila de reenvio;
- cálculo e validação de saldo **no servidor**;
- auditoria com data, hora, responsável, produto, quantidade, tipo e aparelho.

Configuração (`DATABASE_URL` e `SYNC_TOKEN`) e passo a passo: `docs/ETAPA3_SINCRONIZACAO.md`.
Etapa 4 (já implementada, `api/contas.js`): login validado no servidor, PBKDF2-SHA256 com sal,
bloqueio após 3 tentativas, desativação, senha provisória com troca obrigatória e painel de contas
para o administrador. Ver `docs/ETAPA4_CONTAS_SERVIDOR.md`.

---

## 🚀 Como usar este repositório

1. Suba os arquivos no **GitHub** (ou use a branch/PR em revisão).
2. Conecte o repositório na **Vercel** — o `index.html` é servido na raiz e a pasta `api/` vira funções.
3. Crie o Postgres na Vercel e defina `DATABASE_URL` e `SYNC_TOKEN` (ver `docs/ETAPA3_SINCRONIZACAO.md`).
4. No app: **Admin › 🔄 Sincronização**, cole o endereço e o segredo e salve.

O `docs/PROMPT_MESTRE_BASE44.md` fica no repositório como registro histórico; o Base44 não é mais usado.

---

## 📝 Correções aplicadas na revisão de código

Ver `revisao-estoque-armacoesmdo.md` para o relatório completo (arquivo e linha de cada item):

| # | Correção |
|---|---|
| 1 | `mdo_P` criado na primeira carga: cadastro de produto e importação agora persistem |
| 2 | Senha com mínimo de 6, nome + sobrenome, bloqueio após 3 tentativas, senha provisória com troca obrigatória, status ativo/bloqueado/desativado, auditoria no app |
| 3 | Aprovação de baixa registrada no nome do aprovador, guardando o solicitante |
| 4 | Desfazer vira estorno (não apaga histórico) e não toca em baixa aprovada nem em ajuste |
| 5 | Contagem de código fora do catálogo não quebra mais a aba Admin e é avisada ao aplicar |
| 6 | Backup inclui pedidos, contagem e auditoria; merge não ressuscita movimentação apagada nem promove usuário a administrador |
| 7 | Códigos normalizados sem perder zeros à esquerda (leitura, digitação e planilha) |
| 8 | Digitação manual do mesmo código funciona; gravação só da chave alterada |
| 9 | Ações da lista e do admin são `<button>` (teclado e leitor de tela) |
| 10 | Leitura por foto libera o leitor (`clear`) e separa erro de rede de foto ilegível |
| 11 | Contagem mostra o que foi somado e permite reduzir item a item |
| 12 | `index.html` recuperou ícone, tema e modo standalone do iOS |
| 13 | Regras do prompt mestre de usuários implementadas no cliente (backend ainda pendente) |
| 14 | Vídeo da câmera com `object-fit:contain` (a faixa verde corresponde ao que é lido) |
| 15 | Dedupe: código diferente entra na hora; só a releitura do mesmo código espera 1,5 s |
