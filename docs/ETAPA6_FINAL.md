# ETAPA 6 — Desempenho, Testes Finais, Segurança e Publicação

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch:** `etapa6-final` (sobre `etapa5-painel-relatorios`, PR #6)
**Testes:** **110 passando, 0 falhando** (7 novos desta etapa + 1 de PDF na 5)

---

## 6.1 — Desempenho ✅

| Ponto | O que foi feito |
|---|---|
| Abertura | `index.html` único de 257 KB, sem build e sem dependência de servidor para abrir |
| Catálogo | índice (`idx`) reconstruído só quando o catálogo muda (`reidx()`), não a cada render |
| Renderização | uma passada por troca de aba; painel, busca e relatórios só desenham quando a aba está visível |
| Câmera | zoom aplicado na abertura, biblioteca empacotada local (sem download na 1ª bipagem) |
| Sincronização | envio em lote; reenvio a cada 30 s **só quando há pendente** |
| Histórico | hoje filtra em memória; com muitos registros o recorte já é feito por período antes de formatar |

## 6.2 — Não carregar tudo de uma vez ✅

- **Nova rota `api/produtos.js`**: busca no banco com `ilike` em código, descrição e cor, com
  **`limit`/`offset`** e `total`/`paginas` na resposta.
- **`api/estado.js` agora pagina**: `pagina` e `tamanho` (até 500) com `limit/offset`, devolvendo
  `totalMovimentos`, `totalProdutos` e `paginas`.
- **No app**: card “Buscar no servidor” na aba Estoque com anterior/próxima — a lista local continua
  funcionando normalmente, mesmo sem servidor.
- **Índice** `mdo_prod_codigo` criado na tabela de produtos.

## 6.3 — Segurança e mensagens de falha ✅

- **Nenhuma credencial no código público**: teste verifica que não há string `postgres://` nem segredo
  fixo no `index.html`; as variáveis ficam só em `DATABASE_URL` e `SYNC_TOKEN` na Vercel.
- **Cabeçalhos na Vercel**: `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`,
  `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` liberando **só a câmera** e `Cache-Control: no-store`
  em `/api`.
- **Limite de execução** das funções: 512 MB e `maxDuration` 15 s.
- **Falha do servidor** vira mensagem clara (`SYNC.ultimoErro`, aviso ao administrador) — nunca produto
  inventado nem tela quebrada (testado).
- Credenciais de API exigidas em **todas** as rotas (`X-MDO-Token`), e ações de administrador com
  sessão válida (`X-MDO-Sessao`).

## 6.4 — Testes finais da Seção 9

### Feitos e verificados automaticamente ✅
| Item | Onde |
|---|---|
| pesquisa por código, modelo e cor | 7.3 e testes da Etapa 2 |
| leitura por câmera, foto na hora e galeria | Etapa 2 (11 testes) |
| Code 128, EAN-13, QR e código não cadastrado | Etapa 1 e 2 |
| pesquisa não altera estoque | teste “consulta não altera estoque” |
| saldo exibido confere | Etapas 2 e 3 |
| movimentações, saldo e sincronização | Etapa 3 (13 testes) |
| login, autocadastro, bloqueio e troca de senha | Etapa 4 (11 testes) |
| inventário, painel, histórico, relatórios e Power BI | Etapa 5 (16 testes) |
| filtros cruzados e bloqueio para operador | Etapa 5 (testes 13 e 14) |
| exportação em PDF e CSV do relatório | Etapa 5 (teste de PDF) |

### Ainda dependem de ambiente real — **não testados aqui, declarados**
| Teste | Precisa de |
|---|---|
| câmera ao vivo no iPhone (zoom 3,4x) e no Android | aparelho real |
| foto desfocada / com pouca luz | aparelho real |
| bipagem com internet caindo | aparelho real |
| dois aparelhos sincronizando | Vercel + Postgres configurados |
| login, bloqueio e sessão reais | Vercel + Postgres configurados |
| impressão/PDF no celular | navegador real |

Nada disso foi simulado: os testes automáticos cobrem regra e comportamento, não câmera nem servidor.

## 6.5 — Publicação ✅ (pronta para você)

1. Mesclar os PRs na ordem: **#1 → #2 → #3 → #4 → #5 → #6**.
2. Vercel → **Add New Project** → importar `estoque-armacoesmdo` (framework *Other*, sem build).
3. Vercel → **Storage → Postgres** (cria `DATABASE_URL`).
4. **Settings → Environment Variables**: `SYNC_TOKEN` com um segredo longo.
5. **Redeploy**.
6. No app: **Admin › 🔄 Sincronização** → endereço + segredo → salvar. Deve mostrar 🟢.

Pastas publicadas: `index.html`, `assets/`, `vendor/`, `manifest.webmanifest`, `api/`.

---

## Arquivos desta etapa

| Arquivo | O que muda |
|---|---|
| `api/produtos.js` | **novo** — busca paginada de produtos |
| `api/estado.js` | paginação com `limit/offset` e totais |
| `index.html` | busca no servidor, PDF do relatório, CSS de impressão |
| `tests/run-tests.js` | 7 testes novos |
| `tests/dom-harness.js` | `print` registrado no sandbox |

## Limites declarados

- O **PDF** usa a impressão do navegador (sem instalar biblioteca, como você escolheu). Em alguns
  aparelhos o “salvar como PDF” fica no menu de compartilhamento da impressão.
- O app **continua local por padrão**: sem servidor configurado, catálogo e histórico ficam no aparelho.
  A leitura paginada só é usada quando a sincronização está ligada.
- **Cache/offline** avançado (service worker) não foi implementado nesta etapa; hoje o app abre rápido
  porque é um único arquivo com a biblioteca local.

## Checklist obrigatório da Etapa 6

- [x] 6.1 Tempo de abertura, decodificação, pesquisa, saldo e sincronização revistos
- [x] 6.2 Busca no servidor com filtro e paginação (produtos e estado)
- [x] 6.3 Indicadores de carregamento e mensagens claras de falha
- [x] 6.3 Revisão de permissões, cabeçalhos e ausência de credenciais no código
- [x] 6.4 Testes da Seção 9: todos os automatizáveis passando; os de aparelho/servidor declarados
- [ ] Publicação: depende de você conectar a Vercel
- [x] 110 testes passando, 0 falhando
- [x] `index.html` = `src/index_versao6.html`

---

O prompt mestre (Etapas 0 a 6) está **completo em código e testes automáticos**. O que falta é a
validação no ambiente real: Vercel + Postgres + celular.
