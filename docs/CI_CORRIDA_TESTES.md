# CI — por que o build falhou e como foi corrigido

Registro honesto do que aconteceu, porque o mesmo sintoma pode voltar.

## O sintoma

O PR #14 (versão 6.6.0, relatório Power BI) passou no CI **do pull request** e **falhou no push
do merge**, com 2 testes de login vermelhos:

```
❌ bloqueio após 3 tentativas erradas, com contagem regressiva
     → 2ª tentativa deve avisar:
❌ administrador desbloqueia e define senha provisória → troca obrigatória
     → status após senha provisória: esperado "ativo", obtido "bloq"
❌ 158 passaram, 2 falharam
```

Na máquina local os mesmos testes passavam. Não era o relatório — era **corrida**.

## A causa

A senha é guardada como hash. `H(s)` usa `crypto.subtle.digest` quando existe, e é
**assíncrono**. Os testes de login faziam:

```js
run(env, "lgSubmit()");   // dispara o hash, que termina depois
await flush();            // espera 30 ms fixos
```

No runner do GitHub o hash às vezes levava mais que 30 ms (e ali `crypto.subtle` **não existe**,
então o app cai no hash de reserva, com outro custo). A asserção rodava antes de o app ter
gravado o usuário:

- `cur` ainda era `null` e a mensagem de erro ainda era a **da tentativa anterior**;
- o teste lia a mensagem velha, ou nenhuma, e falhava;
- no segundo teste, a tentativa que devia desbloquear chegava antes do bloqueio estar gravado,
  e o status continuava `bloq`.

O defeito estava no **teste**, não no app: esperar um tempo fixo é sempre uma aposta.

## A correção

Os testes passaram a esperar a **condição**, não o relógio:

```js
async function esperar(env, cond, ms = 2000) {
  const fim = Date.now() + ms;
  for (;;) {
    try { if (vm.runInContext(cond, env.ctx)) return true; } catch (e) {}
    if (Date.now() > fim) return false;
    await new Promise((r) => setTimeout(r, 5));
  }
}
```

| Antes | Agora |
|---|---|
| `comoAdmin()` disparava o login e seguia | espera o usuário existir (`cur && cur.l`) |
| `loginA()` esperava 30 ms fixos | espera `cur` **ou** a mensagem de erro aparecer |
| podia ler a mensagem da tentativa anterior | `loginA()` limpa a mensagem antes de tentar |

**Nenhuma asserção foi afrouxada.** Continuam verificando "restantes: 2", "restantes: 1",
"Acesso bloqueado", status `bloq` e que usuário bloqueado não entra. Mudou só a espera.

## Prova

- `160 passaram, 0 falharam` em **3 execuções seguidas** na máquina local.
- `160 passaram, 0 falharam` com `crypto.subtle` removido — que é a situação do runner.
- CI do PR #15: verde no `pull_request` **e** no `push` (`d4b8029f`).
- CI do push do merge na `main` (`8de4afe7`): **verde**, `160 passaram, 0 falharam`.

## Regra para não repetir

Em teste com operação assíncrona, **nunca** esperar tempo fixo: esperar a condição com prazo.
E quando **muitos** testes caem de uma vez, suspeitar de sintaxe (o script inteiro parou de
rodar) antes de suspeitar da lógica — foi o que aconteceu na 6.6.0 com uma linha de HTML com
número ímpar de aspas.
