# Seção 6.1 — Autocadastro de operador na tela de início (sem e-mail)

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch:** `camera-correcoes-diagnostico` (PR #10)
**Testes:** **141 passando, 0 falhando** (7 novos)

---

## O que já existia e o que faltava

A Etapa 4 já tinha: bloqueio após 3 tentativas, troca obrigatória de senha provisória, desbloqueio,
desativar/reativar, auditoria, aviso ao administrador, senha nunca visível, PBKDF2 no servidor.

**Faltava o que a Seção 6.1 pede explicitamente:** uma opção **visível na tela de início** para o
colaborador **criar o próprio acesso** — só nome, login e senha, sem e-mail, e já entrando no sistema.
Antes, o único caminho era o administrador cadastrar pela aba dele.

## O que foi feito

### Na tela de início
Novo botão: **👤 Sou novo aqui — criar meu acesso**

Ao tocar, a tela muda para o modo de cadastro:
- **Nome completo** (aparece só nesse modo) — exige **nome e sobrenome**; se faltar, a mensagem é exatamente
  `Digite nome e sobrenome`
- **Login** — livre, sem espaços; se já existir, avisa `Este login já está em uso. Escolha outro.`
- **Senha** — mínimo 6 caracteres, com o botão 👁 para **mostrar ou ocultar** o que foi digitado

O aviso na tela diz: *“Seu acesso será de operador. O administrador é avisado do novo cadastro.”*
O botão volta para **↩ Voltar para a entrada**.

### Ao criar
- O perfil é **sempre `operador`** — regra garantida também no servidor (`api/contas.js`, ação `cadastrar`)
- Entra **imediatamente** no sistema, sem ativação e sem e-mail
- O administrador recebe **um aviso** dentro do app: `Novo operador cadastrado: [nome] ([login])`, com data e hora
- Vai para a **auditoria**: `AUTOCADASTRO`

### Sem e-mail em lugar nenhum
Nenhum campo de e-mail, nenhum identificador interno tipo `login@mdo.local`, nenhum envio.
O teste automático verifica que o bloco do autocadastro não contém `@dominio`, `mailto`, `sendgrid` nem `nodemailer`.

### Dois caminhos, o mesmo resultado
| Situação | Quem cria a conta |
|---|---|
| Com servidor configurado | `api/contas.js`, ação `cadastrar` — hash PBKDF2, sessão no servidor |
| Sem servidor (modo local) | no próprio aparelho, com a mesma regra: só operador |

## Como foi testado (automático)

1. o botão de criar acesso existe na tela de início e abre o modo de cadastro
2. nome incompleto é barrado com a mensagem exata (`Ricardo`, `  Ana `, `R K`, vazio)
3. nome e sobrenome válidos passam
4. senha curta e login com espaço são barrados
5. autocadastro cria **operador**, entra na hora, grava o nome, avisa o administrador **uma vez** e vai para a auditoria
6. login já em uso é recusado, sem duplicar
7. o autocadastro não usa e-mail, nem interno

### Não testado aqui
O toque real no celular e o cadastro contra o Postgres de produção — dependem do deploy. A regra de
“operador, nunca administrador” está escrita e testada **nos dois lados** (app e `api/contas.js`).

## Como testar no celular (bloco da Seção 6.1)

1. Tela de início → **👤 Sou novo aqui — criar meu acesso**
2. Digite só `Maria` → precisa aparecer **Digite nome e sobrenome**
3. Complete `Maria Souza`, login `maria`, senha `123` → precisa pedir **6 caracteres**
4. Senha `senha123` → cria e **entra direto**, com o rótulo *Operador*
5. Saia e entre de novo com `maria` / `senha123` → entra
6. Entre como administrador → deve haver o aviso **Novo operador cadastrado: Maria Souza (maria)**
7. Tente criar outro acesso com o login `maria` → **Este login já está em uso**

## Arquivos

| Arquivo | O que muda |
|---|---|
| `index.html` | botão `lgCad`, `modoCadastro()`, `cadValidar()`, `cadOperador()`, `cadastroNoServidor()`, `nomeOK()`; idêntico a `src/index_versao6.html` |
| `api/contas.js` | nova ação `cadastrar` (autocadastro sem sessão, sempre operador, com validações e sessão) |
| `tests/run-tests.js` | 7 testes novos da Seção 6.1 |
