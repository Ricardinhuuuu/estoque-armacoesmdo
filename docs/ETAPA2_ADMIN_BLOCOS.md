# Etapa 2 — Fluxo de usuários/admin e limpeza de telas

## O que foi feito: a tela Admin em blocos

Antes era **um rolo de 13 cartões**, na ordem em que foram sendo feitos. Para achar
"desbloquear usuário" era preciso rolar por inventário e sincronização.

Barra **"Mostrar"** no topo, com cinco assuntos:

| Bloco | Cartões |
|---|---|
| 📌 **Dia a dia** | Aprovações pendentes · Avisos |
| 👥 **Pessoas** | Usuários · Contas no servidor |
| 📦 **Estoque e inventário** | Abaixo do mínimo · Inventário · Contagem · Importar movimentações |
| ⚙️ **Sistema** | Quais alertas avisar · Sincronização · Diagnóstico · Dados |
| 📜 **Registro e auditoria** | Auditoria · Conferência das leituras |

Mais **Tudo** (padrão), que mostra os 13 cartões como antes. **Nenhuma função foi removida.**

### Contagem conferida no harness

| Bloco | Cartões |
|---|---|
| Tudo | 13 |
| Dia a dia | 2 |
| Pessoas | 1 |
| Estoque | 4 |
| Sistema | 4 |
| Registro | 2 |

## Dois erros meus, achados rodando o app

1. **A tela não filtrava.** `admBloco()` lia `ls("mdo_admbl")` — mas `ls()` **já prefixa**
   `mdo_`, então ele procurava `mdo_mdo_admbl`. Corrigido para `ls("admbl")`.
2. **A escolha se perdia.** O filtro relia o `localStorage` a cada redesenho, então a tela
   voltava para "Tudo" sozinha. Agora fica numa variável de sessão (`ADMABA`) **e** no
   `localStorage`.

**A lição:** os testes passavam e a tela não funcionava. O erro só apareceu ao **desenhar a
tela de verdade**. Os dois agora têm teste.

## Prova

- `166 passaram, 0 falharam` — local, com e sem `crypto.subtle`, e **verde no CI** (PR e push).
- 2 testes novos: os 13 cartões continuam existindo; o filtro funciona e sobrevive ao redesenho.

## O que falta da Etapa 2

### Fluxo de usuários ponta a ponta

A base existe em `api/contas.js` com 9 ações:

```
entrar · trocarSenha · criar · listar · desbloquear · desativar · reativar
senhaProvisoria · sair
```

O caminho a revisar: **criar → senha provisória → primeiro acesso → troca obrigatória →
bloqueio por tentativas → desbloqueio**. Precisa ser conferido na ligação com a tela, porque
hoje a tela também guarda usuários localmente (`U`), e é preciso garantir que, **com servidor
ligado, quem decide papel, bloqueio e senha é o servidor** — nunca o aparelho.

### Limpeza das telas Bipar e Estoque

Revisar o que cada papel vê:

- **operador** não deve ver abas ou botões que não pode usar (hoje a aba Admin já fica oculta);
- o modo **Contagem** e **Ajuste** são de administrador;
- conferir se sobra botão sem função na tela Bipar depois de todas as mudanças de câmera.

## Sobre a etiqueta enviada

A imagem (`80202503194` / `R$ 349,90` / `5CL661045417140C4`) é **Code 128** linear, como eu já
esperava. O código que interessa ao app é o **`80202503194`**; o `5CL…` é serial do fabricante.

Ela confirma que o leitor precisa de Code 128 bem resolvido — é o caso do **item 2** da
Etapa 1, que ainda depende de uma medição no seu celular (**📷 Diagnóstico**) para eu decidir
se troco ou somo motor de leitura.
