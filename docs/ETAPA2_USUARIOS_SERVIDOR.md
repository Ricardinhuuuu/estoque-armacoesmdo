# Etapa 2 — o fluxo de usuários valendo no servidor

Complemento de `ETAPA2_ADMIN_BLOCOS.md`.

## O problema (grave)

Com o servidor ligado, o **login** já era validado na API. Mas os **botões da lista de usuários**
continuavam agindo **só no aparelho**:

| Botão | Antes | Resultado real |
|---|---|---|
| Senha | trocava `u.h`/`u.temp` no `localStorage` | servidor **não** mudava; o operador não conseguia entrar |
| Desbloquear | `u.st="ativo"` local | conta **continuava bloqueada** no servidor |
| Desativar / Reativar | `u.st="desat"` local | servidor **não sabia**; a pessoa seguia entrando em outro celular |
| Criar usuário | hash local `H(l+p)` | conta **não existia** no servidor |
| Listar | `apiContas("listar")` | ✅ já estava certo |

**A tela mentia:** o administrador "desbloqueava" e a conta seguia bloqueada.

## A correção

Com `contasAtivas()` verdadeiro, cada botão fala com a API que **já existia**:

```js
apiContas("criar",           { login, nome, senha, papel })
apiContas("senhaProvisoria", { login })
apiContas("desbloquear" | "desativar" | "reativar", { login })
```

Sem servidor, o caminho **local continua igual** — o app não deixa de funcionar offline.

Também entrou:

- **aviso na tela** do modo em que está: 🔒 "quem decide é o servidor" / 📴 "modo local";
- **trava de toque duplo** ao criar conta (`__criandoConta`).

## Prova — a chamada acontecendo, não só o teste

Com a API de contas substituída por uma espiã no harness:

```
criar        → ["criar",{"login":"maria","nome":"Maria Souza","senha":"…","papel":"operador"}]
senha        → ["senhaProvisoria",{"login":"maria"}]
desativar    → ["desativar",{"login":"maria"}]
desbloquear  → ["desbloquear",{"login":"maria"}]
toque duplo em criar → 1 conta criada (e não 2)
```

`167 passaram, 0 falharam` — local, com e sem `crypto.subtle`, e verde no CI.

## O ciclo completo, como ficou

```
administrador cria conta  → servidor guarda o hash (PBKDF2) e marca senha provisória
operador entra            → servidor valida, conta tentativas e bloqueia
primeiro acesso           → app obriga a trocar a senha antes de liberar as telas
esqueceu a senha          → administrador define senha provisória NO SERVIDOR
conta bloqueada           → administrador desbloqueia NO SERVIDOR
funcionário saiu          → administrador desativa NO SERVIDOR (para de entrar em qualquer celular)
```

O servidor decide papel, bloqueio e senha. O aparelho **nunca** guarda senha.

## Pendente da Etapa 2

1. **Limpeza das telas Bipar e Estoque por papel** — o que o operador vê. A aba Admin já fica
   oculta; falta revisar Contagem/Ajuste e botões sem função que sobraram das mudanças de câmera.
2. **Conferir o ciclo na prática** no seu ambiente: depende do Postgres ligado e de você fazer o
   caminho uma vez (criar operador → entrar → trocar senha → errar a senha até bloquear →
   desbloquear). Isso eu não consigo provar sem o banco.
