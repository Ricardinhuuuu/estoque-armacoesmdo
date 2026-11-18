# ETAPA 4 — Login, Autocadastro e Administração com Segurança no Servidor

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch:** `etapa4-contas-servidor` (sobre `etapa3-sincronizacao`, PR #4)
**Testes:** **86 passando, 0 falhando** (11 novos desta etapa)

> Sem Base44. Backend na **Vercel** (`api/_lib/contas.js` + `api/contas.js`), banco **Postgres**
> da própria Vercel. É a continuação direta da Etapa 3.

---

## O problema que esta etapa resolve

Até a Etapa 3 a senha vivia no `localStorage` do aparelho. Qualquer pessoa com o celular na mão
podia abrir as ferramentas do navegador e mudar o próprio papel para administrador.
Agora **quem decide é o servidor**.

## 4.1 — Segurança do login ✅

- Senha guardada como **PBKDF2-SHA256, 120.000 iterações, sal aleatório por usuário**.
- A senha **nunca volta** do servidor: a resposta leva apenas `login, nome, papel, status, tentativas`.
- Comparação em **tempo constante** (`timingSafeEqual`).
- **Sessão por token** aleatório de 32 bytes; o banco guarda só o `sha256` do token, com validade de 12 h.
- O aplicativo guarda o token — **nunca mais o hash da senha** (`h:"(servidor)"`).
- **Login inexistente e senha errada dão a mesma mensagem**: não é possível descobrir quem existe.

## 4.2 — Bloqueio e desativação decididos no servidor ✅

- Tentativas contadas **na tabela `mdo_usuarios`**, não no aparelho.
- **3 tentativas erradas → `status='bloq'`**: o acesso é recusado **mesmo com a senha correta**
  até um administrador desbloquear.
- Desativado (`desat`) não entra nem com senha certa.
- Desbloquear, reativar e desativar exigem **sessão de administrador válida** (`X-MDO-Sessao`).
- O administrador **não pode desativar a si mesmo**.
- Trocar de aparelho não zera tentativas: a contagem é do usuário, não do navegador.

## 4.3 — Autocadastro ✅

- O **primeiro acesso** cria o administrador — e só é aceito quando o banco está vazio
  (`count(*) = 0`), servidor decide. Depois disso, `criarAdmin` é ignorado.
- Nome e sobrenome obrigatórios; login de 3 a 40 caracteres sem espaço; senha com 6 ou mais.
- Operadores são criados **pelo administrador** (`criar`), já com **senha provisória**.

## 4.4 — Senha provisória com troca obrigatória ✅

- O administrador define (ou o servidor sugere) uma senha provisória; `provisoria=true`.
- No próximo acesso o app entra no modo **“Troca de senha obrigatória”** e chama `trocarSenha`.
- A troca exige a senha atual, recusa senha igual à provisória e **limpa** `provisoria` no banco.

## 4.5 — Administração ✅

Novo card **Admin › 👥 Contas no servidor** (aparece quando a sincronização está ligada):

- **Carregar contas do servidor** — lista nome, login, papel, status e se há senha provisória;
- **Desbloquear / Reativar / Desativar / Senha provisória** por conta;
- toda ação é recusada se a sessão não for de administrador.

## 4.6 — Compatibilidade (nada quebrado) ✅

- **Sem servidor configurado**, o login local continua exatamente como era (usuários em `mdo_u`),
  e o app avisa que está em modo local — não finge ter validado no servidor.
- Bipagem, câmera, photo, contagem, aprovação, estorno, auditoria, backup, importação e exportação
  seguem intactos: suíte completa **86 testes verdes**.

## Tabelas criadas automaticamente

```sql
mdo_usuarios (login pk, nome, papel, hash, sal, iteracoes, tentativas, status, provisoria, criado_em, alterado_em)
mdo_sessoes  (token_hash pk, login, criado_em, expira_em)
```

## Ações da API (POST `/api/contas`)

| Ação | Quem pode | Para que serve |
|---|---|---|
| `entrar` | todos | valida senha, conta tentativa, bloqueia, abre sessão |
| `trocarSenha` | o próprio | troca obrigatória da provisória |
| `sair` | sessão | encerra a sessão |
| `listar` | administrador | lista contas sem dados sensíveis |
| `criar` | administrador | cria operador ou administrador |
| `desbloquear` / `reativar` / `desativar` | administrador | status da conta |
| `senhaProvisoria` | administrador | define (ou sugere) senha provisória |

---

## Testes

### Automatizados — 11 novos, todos passando
1. senha não é guardada em claro e só confere com a certa (sal diferente por usuário)
2. login inexistente e senha errada dão a mesma mensagem
3. bloqueio decidido no servidor após 3 tentativas (não entra nem com a senha certa)
4. usuário desativado não entra
5. autocadastro exige nome e sobrenome e senha de 6+
6. troca obrigatória da senha provisória (hash e sal não aparecem na resposta)
7. o aplicativo não guarda hash de senha depois do login de servidor
8. sem servidor configurado o login local continua funcionando
9. sessão vencida não vale
10. painel de contas aparece só com servidor ligado
11. senha provisória sugerida é legível e diferente

### Pendentes — dependem de ambiente real
| Teste | Precisa de |
|---|---|
| login real na Vercel (Postgres) | deploy + `DATABASE_URL` + `SYNC_TOKEN` |
| sessão persistida entre recarregamentos | aparelho real |
| bloqueio real com troca de aparelho | dois aparelhos + servidor |
| expiração de sessão após 12 h | espera real |

Não executo nada disso daqui: **não tenho credenciais da sua Vercel**. Declarado, não simulado.

## Checklist da Etapa 4

- [x] 4.1 Senha nunca em claro, nunca devolvida; sessão por token
- [x] 4.2 Tentativas e bloqueio no servidor; desativação no servidor
- [x] 4.3 Autocadastro só com o banco vazio; regras de nome, login e senha
- [x] 4.4 Senha provisória com troca obrigatória
- [x] 4.5 Painel de administração de contas para o administrador
- [x] 4.6 Nada removido; modo local preservado
- [x] 86 testes automatizados passando
- [ ] Teste real na Vercel com Postgres — **depende de você**
- [x] `index.html` = `src/index_versao6.html`

---

Com esta etapa, o prompt mestre (0 → 4) está **completo em código e testes automáticos**.
O que resta é a sua validação no ambiente real: Vercel + Postgres + dois aparelhos.
