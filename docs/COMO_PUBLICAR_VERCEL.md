# Como publicar na Vercel — passo a passo

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Situação:** todo o trabalho está no GitHub em **9 PRs encadeados**. A `main` está **intacta** (versão antiga).
A Vercel publica a **`main`** — por isso, enquanto os PRs não forem mesclados, você continua vendo a versão antiga.

---

## O caminho mais simples (recomendado)

Cada PR foi feito **em cima do anterior**, então eles precisam ser mesclados **na ordem**:

**#1 → #2 → #3 → #4 → #5 → #6 → #7 → #8 → #9 → #10**

| Ordem | PR | O que traz |
|---|---|---|
| 1º | [#1](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/1) | Revisão dos 15 itens |
| 2º | [#2](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/2) | Etapa 1 — câmera |
| 3º | [#3](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/3) | Etapa 2 — busca por código e foto |
| 4º | [#4](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/4) | Etapa 3 — sincronização |
| 5º | [#5](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/5) | Etapa 4 — contas no servidor |
| 6º | [#6](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/6) | Etapa 5 — painel, relatórios, Power BI |
| 7º | [#7](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/7) | Etapa 6 — desempenho, segurança, publicação |
| 8º | [#8](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/8) | 10.1 — cadastro por foto |
| 9º | [#9](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/9) | 10.2 e 10.3 — operador e produtos parados |
| 10º | [#10](https://github.com/Ricardinhuuuu/estoque-armacoesmdo/pull/10) | Câmera: visor menor, imagem inteira, barra de zoom |

### Para cada PR, um por um
1. Abra o PR no GitHub.
2. Confira o rodapé: deve dizer **“Able to merge”** (sem conflito).
3. Clique em **Merge pull request** → **Confirm merge**.
4. Só então abra o próximo da lista.

> **Por que nesta ordem:** cada PR contém o anterior. Mesclar fora de ordem gera conflito e você teria
> que resolver à mão. Se algum disser “conflito”, **pare** e me avise qual — não tente resolver sozinho.

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
MDO Estoque · versão 6.3.0 · 2026-02
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
