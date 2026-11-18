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
│   └── PROMPT_MESTRE_BASE44.md      # Especificação técnica completa e etapas obrigatórias (Base44)
├── tests/
│   ├── run-tests.js                 # 49 testes automatizados (revisão + Etapa 1)
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

- **Publicar:** qualquer hospedagem estática (GitHub Pages, Netlify, Base44) apontando para `index.html`.
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

## 🔐 O que ainda depende do backend (Base44)

O app é 100% cliente. Isso resolve o uso diário no aparelho, mas **não** substitui autenticação de
servidor: quem tiver o aparelho pode alterar o `localStorage`. Antes de virar produto multiusuário de
verdade, precisam ir para o backend (Seção 6.1 de `docs/PROMPT_MESTRE_BASE44.md`):

- usuários, senhas (hash com salt) e papéis;
- contagem de tentativas, bloqueio e desbloqueio;
- auditoria com data, hora e responsável;
- sincronização entre aparelhos (hoje é manual, pelo backup JSON).

---

## 🚀 Como Utilizar este Repositório com o Base44

1. Suba os arquivos deste repositório no **GitHub**.
2. Conecte ou importe o repositório no **Base44** (ou anexe `docs/PROMPT_MESTRE_BASE44.md`,
   `src/index_versao6.html`, `assets/Icone_MDO.png` e `assets/Codigo_de_barra.png`).
3. Instrua a IA a seguir **estritamente a ordem da Seção 2** de `docs/PROMPT_MESTRE_BASE44.md`, validando
   o **Checklist Obrigatório (Seção 11)** ao final de cada etapa antes de autorizar a próxima.

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
