# Como publicar na Vercel — passo a passo

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Situação:** **tudo já está na `main`.** O trabalho foi entregue em dois PRs e ambos foram mesclados.

| PR | O que trouxe | Estado |
|---|---|---|
| [#1](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/1) | Revisão dos 15 itens | mesclado |
| [#12](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/12) | Etapas 1 a 6, Seções 9, 10.1–10.3 e 11 (versão 6.4.0) | mesclado |
| [#13](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/13) | Câmera: visor compacto, botões de zoom, bipagem contínua, foto em ondas (versão 6.5.0) | mesclado |

Os PRs #2 a #9 foram fechados **sem** merge: o conteúdo deles já estava nos PRs acima.
Não há nada a mesclar — a `main` é a versão completa.

> Se você já mesclou tudo, pule direto para **“Depois de mesclar: a Vercel publica sozinha”**.

---

## Depois de mesclar: a Vercel publica sozinha

Se o projeto na Vercel já está ligado ao repositório, **cada merge na `main` dispara uma publicação**:

1. Vercel → seu projeto → aba **Deployments**
2. O primeiro item da lista deve ser um deploy novo, com estado **Ready** (🟢)
3. Abra o endereço `https://seu-app.vercel.app`

### Se não publicar sozinho
- **Deployments → ⋯ (menu do último deploy) → Redeploy**
- Ou **Deployments → Create Deployment → Branch: `main`**

---

## Como saber se o celular está com a versão nova

Coloquei a **versão no rodapé do app**: role até o fim e leia

```
MDO Estoque · versão 6.5.0
```

- Se **aparecer** isso → a publicação está atualizada.
- Se **não aparecer** → você está vendo a versão antiga (cache do navegador ou deploy não publicado).

### Para forçar a atualização no celular
- **iPhone/Safari:** fechar a aba do app e abrir de novo; ou Ajustes › Safari › Limpar histórico e dados.
- **Android/Chrome:** puxar a página para baixo (recarregar); ou menu ⋮ › Recarregar.
- Se instalou na tela de início: **remover o ícone e adicionar de novo** depois do deploy.

---

## Se a Vercel ainda não está ligada ao projeto

1. Vercel → **Add New… → Project**
2. **Import Git Repository** → escolha `Ricardinhuuuu/estoque-armacoesmdo`
3. Framework Preset: **Other** · Build Command: **vazio** · Output Directory: **vazio** (é site estático + funções)
4. **Storage → Postgres** (cria o banco e a variável `DATABASE_URL`)
5. **Settings → Environment Variables** → `SYNC_TOKEN` com um segredo longo seu
6. **Deploy**
7. No app: **Admin › 🔄 Sincronização** → colar o endereço e o `SYNC_TOKEN` → *Salvar configuração*

---

## Depois de publicar, o teste que importa

1. Abrir o app no celular → conferir a **versão no rodapé**
2. Aba **Bipar** → *Ligar câmera* → a **barra de zoom** aparece embaixo do visor
3. Bipar a etiqueta `80202503194` com o zoom em **1x** (para ver o código inteiro) e depois em 3,4x
4. **Admin › 📷 Diagnóstico da câmera** → **📋 Copiar diagnóstico** → me mandar o texto

Com esse texto eu sei exatamente o que o aparelho conseguiu fazer, sem adivinhar.

---

## Resumo de uma linha

**Mescle #1 até #10 na ordem → a Vercel publica sozinha → confira a versão 6.3.0 no rodapé do app.**
