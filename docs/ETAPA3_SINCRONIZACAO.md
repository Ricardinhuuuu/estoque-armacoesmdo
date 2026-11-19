# ETAPA 3 — Entradas, Saídas, Saldo e Sincronização

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch desta etapa:** `etapa3-sincronizacao` (parte do PR #1 → #2 → #3)
**Testes automatizados:** **75 passando, 0 falhando** (13 novos desta etapa)

> Você informou que **não usa mais o Base44** e que trabalha com **Claude, GitHub, Vercel e AbacusAI**.
> Por isso esta etapa foi feita para **Vercel**: funções serverless na própria Vercel + Postgres
> (Vercel Postgres ou Neon, o que você já tiver na conta Vercel). Nada aqui depende de Base44.

---

## 3.1 — Movimentações preservadas ✅

Os fluxos de **Baixa, Entrada e Contagem** continuam como eram. O modo selecionado continua visível
na tela e agora é **repetido na confirmação** antes de efetivar.

## 3.2 — Confirmação antes de efetivar ✅

Antes de gravar, o app pede confirmação mostrando:

```
Confirmar BAIXA?

Produto: RX CLOTE ACETATO ...
Código: 80202500146
Modelo: RX CLOTE ACETATO ...
Cor: PRETO
Quantidade: 1
Saldo atual: 5
```

Cancelar não grava nada (nem movimentação, nem fila, nem auditoria).

## 3.3 — Cálculo do saldo ✅

O saldo é **sempre recalculado** como `saldo inicial + entradas − saídas (+ ajustes)`, tanto no app
quanto no servidor (`api/_lib/movimentos.js`). Nunca é um número somado por cima de outro.

- Baixa acima do saldo é **recusada pelo servidor** com o saldo real na resposta.
- O administrador pode **forçar** (comportamento que já existia) — o servidor aceita e registra.
- `conferirSaldo()` permite auditar: se a conta não fechar, o erro aparece.

## 3.4 — Sincronização ✅

Arquitetura (toda na sua stack: GitHub + Vercel):

```
Aparelho A ──POST /api/movimentos──► Vercel Function ──► Postgres
Aparelho B ──GET  /api/estado──────► Vercel Function ──► Postgres
```

- **ID único por operação** (`uid()` gerado no aparelho) — é o que impede duplicidade no reenvio.
- **Fila local** (`mdo_fila`): toda bipada entra nela.
- **Reenvio automático**: ao voltar a internet (`online`) e a cada 30 s enquanto houver pendente.
- **Internet instável / perda de conexão**: a fila **não é limpa**; nada é perdido.
- **Novidades de outro aparelho** entram sem duplicar (`receberNovidades()`), por `id`.
- **Recusa do servidor** (saldo insuficiente, produto fora do cadastro) sai da fila e vira **aviso ao
  administrador** — não fica presa para sempre.

## 3.5 — Confirmação real ✅

Uma operação **só sai da fila** com `confirmados` na resposta do servidor. Testado:

- resposta sem confirmação → fila **não diminui**;
- resposta confirmando o id → a operação **sai** da fila;
- falha de rede → operação **continua pendente** e é reenviada depois.

**Sem servidor configurado**, o app continua funcionando local e o painel diz com todas as letras:
*"Sincronização desligada — tudo fica neste aparelho."* Nada é exibido como sincronizado sem confirmação.

## 3.6 — Auditoria ✅

Cada movimentação registra em `mdo_aud`:

```
MOVIMENTAÇÃO · BAIXA 1 un. · <produto> · <cor> · aparelho ap_xxxx
```

com **responsável** (`por`/`nome`), **data e hora** (`ts`), **código**, **quantidade**, **tipo** e **aparelho**.
No servidor, cada linha guarda também `recebido_em`, `aparelho` e o operador.

## Arquivos novos

| Arquivo | Para que serve |
|---|---|
| `vercel.json` | cabeçalhos de segurança, cache e duração das funções |
| `api/_lib/movimentos.js` | saldo, validação, lote idempotente e conferência (sem framework) |
| `api/movimentos.js` | `POST /api/movimentos` — recebe o lote, grava e confirma |
| `api/estado.js` | `GET /api/estado?desde=` — devolve o que outros aparelhos registraram |

## Como ligar a sincronização (passo a passo)

1. **Vercel › seu projeto › Storage** → crie um **Postgres** (Vercel Postgres/Neon) e copie a `DATABASE_URL`.
2. **Vercel › Settings › Environment Variables**:
   - `DATABASE_URL` = a string copiada
   - `SYNC_TOKEN` = um segredo seu (invente uma sequência longa)
3. **Deploy** (a Vercel detecta a pasta `api/` automaticamente).
4. **No app**, aba **Admin › 🔄 Sincronização**: cole o endereço `https://seu-app.vercel.app` e o mesmo
   `SYNC_TOKEN`, toque em **Salvar configuração**.
5. Repita o passo 4 em cada aparelho. O painel mostra `🟢 Tudo confirmado pelo servidor`.

> As tabelas `mdo_produtos` e `mdo_movimentos` são criadas automaticamente na primeira chamada.
> **Nada do seu estoque atual é enviado nem apagado** por esta etapa.

## 3.7 — Testes

### Automatizados — 13 novos, todos passando
1. saldo = inicial + entradas − saídas
2. movimentação apagada não conta no saldo
3. reenvio do mesmo id não duplica
4. dois aparelhos ao mesmo tempo mantêm a conta certa
5. baixa acima do saldo recusada com o saldo real
6. baixa acima do saldo aceita quando o administrador força
7. produto fora do cadastro recusado, não inventado
8. movimento sem id ou com quantidade inválida recusado
9. auditoria guarda usuário, hora, produto, quantidade, tipo e aparelho
10. operação só sai da fila com confirmação do servidor
11. sem servidor o app continua local e não finge sincronizar
12. reenvio após falha de rede confirma o que faltava
13. novidades de outro aparelho entram sem duplicar

### Pendentes — dependem de servidor real
| Teste | Precisa de |
|---|---|
| POST/GET reais na Vercel | deploy com `DATABASE_URL` e `SYNC_TOKEN` |
| Dois celulares bipando ao mesmo tempo | dois aparelhos + servidor ligado |
| Queda de internet no meio do envio | aparelho real |
| Postgres fora do ar | ambiente Vercel |

Não consigo executar nada disso daqui: **não há credenciais da sua Vercel nem banco provisionado**.
Isso está declarado, não simulado.

## Funcionalidades anteriores preservadas

Bipagem, câmera, zoom, consulta por foto, contagem, aprovação, desfazer/estorno, log, admin, usuários,
backup, importação e exportação — **nada removido**. A suíte completa (75 testes) está verde.

## Checklist da Etapa 3

- [x] 3.1 Fluxos de entrada/saída preservados, com operação indicada
- [x] 3.2 Confirmação com produto, código, modelo, cor, tipo e quantidade
- [x] 3.3 Saldo validado dos dois lados (app e servidor)
- [x] 3.4 Sincronização com ID único, fila, reenvio e tratamento de falha
- [x] 3.5 Só conclui com confirmação real do backend
- [x] 3.6 Auditoria completa (usuário, data, hora, produto, quantidade, tipo, aparelho)
- [x] 3.7 13 testes automatizados novos — **75 passando, 0 falhando**
- [ ] Teste real com Vercel + Postgres e dois aparelhos — **depende de você**
- [x] `index.html` = `src/index_versao6.html`

---

**PARADO aguardando aprovação.** A Etapa 4 (login, autocadastro e administração com segurança no
servidor) usa exatamente esta mesma base da Vercel — é a continuação natural.
