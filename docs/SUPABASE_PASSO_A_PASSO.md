# Ligar o Supabase (Postgres) no app — passo a passo

O app funciona sozinho no celular. O banco só serve para **um celular ver o que o outro fez** e
para o **login de verdade** (senha no servidor, bloqueio, papel).

## O que o servidor precisa (só duas variáveis)

| Variável | O que é |
|---|---|
| `DATABASE_URL` | a string de conexão do Postgres |
| `SYNC_TOKEN` | um segredo longo, inventado por você |

Nada mais. As tabelas (`mdo_produtos`, `mdo_movimentos`, `mdo_contas`) o próprio servidor cria na
primeira chamada.

> `SYNC_TOKEN` **já está configurado** na Vercel — é por isso que `/api/estado` responde `401`.
> Falta só o `DATABASE_URL`.

## Passo 1 — criar o banco no Supabase

1. Entre em **supabase.com** e abra seu projeto.
2. **Project Settings → Database** (ou o botão **Connect**).
3. Escolha **Connection string → URI** e copie.
4. Use a porta **6543** (pooler, modo *Transaction*) — a 5432 não funciona bem na Vercel.
5. No fim da string, deixe **`?sslmode=require`**.

O formato é:

```
postgresql://postgres.xxxxxxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

> Se a sua senha tiver `@ : / ? #`, ela precisa ir codificada (`@` → `%40`). Se não tiver certeza,
> **troque a senha** em *Settings → Database → Reset database password* e use a nova.

## Passo 2 — colocar na Vercel

1. Vercel → seu projeto **estoque-armacoesmdo**.
2. **Settings → Environment Variables**.
3. **New**: nome `DATABASE_URL`, valor a string do passo 1.
   Marque **Production**, **Preview** e **Development**.
4. **Save**.
5. **Deployments → o último → ⋯ → Redeploy** (sem redeploy a variável nova não entra).

## Passo 3 — conferir (sem abrir o app)

No navegador, trocando `SEGREDO` pelo seu `SYNC_TOKEN`:

```
https://estoque-armacoesmdo.vercel.app/api/estado?desde=0
```

| Resposta | Significa |
|---|---|
| `401 credencial inválida` | falta o cabeçalho — normal, o teste é no app |
| `503 banco não configurado` | `DATABASE_URL` não chegou: refaça o passo 2 e o redeploy |
| `200 {"ok":true,...}` | **banco ligado** |

## Passo 4 — ligar no app

**Admin › 🔄 Sincronização** → colar o endereço (`https://estoque-armacoesmdo.vercel.app`) e o
`SYNC_TOKEN` → **Salvar configuração**. O aviso deve passar a 🟢 *Tudo confirmado pelo servidor*.

## Passo 5 — o teste que importa

1. Bipa uma peça em um celular.
2. Abre o app no outro e toca em **🔄 Sincronizar agora**.
3. O movimento tem de aparecer, e o saldo dos dois tem de ser **o mesmo número**.

Se divergir, me mande: o saldo no celular A, o saldo no celular B e a linha de status da
sincronização.

## Segurança — leia uma vez

- A senha do banco **nunca** vai no app nem no código; fica só na Vercel.
- Se a senha do Supabase foi digitada em qualquer chat, **troque agora** (Settings → Database →
  Reset database password) e atualize o `DATABASE_URL` na Vercel.
- O `SYNC_TOKEN` é a chave que autoriza a gravação: não compartilhe fora do app.
