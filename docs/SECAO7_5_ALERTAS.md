# Seção 7.5 — Alertas e Automações

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch:** `camera-correcoes-diagnostico` (PR #10)
**Testes:** **147 passando, 0 falhando** (6 novos)

---

## O que a Seção 7.5 pede, item por item

| Pedido | Situação |
|---|---|
| Avisar quando o produto atingir o estoque mínimo ou chegar a zero | ✅ já existia (`zerado` / `baixo`) |
| Atualizar o alerta após a reposição | ✅ **novo** — o aviso é marcado como **resolvido** ao repor |
| Informar movimentações pendentes de aprovação | ✅ já existia |
| Identificar falhas de sincronização e movimentações não concluídas | ✅ já existia, e agora **some** quando a fila zera |
| Avisar o administrador sobre divergências de inventário | ✅ **novo** |
| Evitar notificações repetitivas | ✅ já existia (1× por dia), e agora também não volta depois de resolvido |
| O administrador pode configurar os alertas | ✅ **novo** — cartão com liga/desliga por alerta |
| Notificações dentro do aplicativo | ✅ cartão **🔔 Avisos**, só com o que ainda vale |

---

## O que foi feito

### 1. Cada alerta tem um código fixo
Antes o aviso era só um texto. Agora carrega `cod` (`zerado`, `baixo`, `pendente`, `sync`, `parado`,
`inventario`) e o `alvo` (o código do produto). Com isso o app consegue **saber quando a situação melhorou**.

### 2. Alerta resolvido deixa de incomodar
- Produto foi reposto acima do mínimo → o aviso de `zerado`/`baixo` daquele produto vira **resolvido**
- Fila de sincronização zerou → o aviso de `sync` vira resolvido
- Todas as pendências foram aprovadas → o aviso de `pendente` vira resolvido

Os avisos resolvidos **não aparecem** na lista, mas continuam no histórico. O cartão mostra uma linha
discreta: *“3 aviso(s) já resolvido(s) pela reposição ou pela sincronização.”*

### 3. Divergência de inventário passa a avisar
Ao concluir um inventário com diferenças, o administrador recebe:
`Divergências de inventário: 4 produto(s) com diferença no inventário de Ricardo Kato`

### 4. O administrador escolhe o que quer receber
Novo cartão **⚙️ Quais alertas avisar**, com os 6 alertas e um botão **Ligar / Desligar** em cada:

| Alerta | Padrão |
|---|---|
| Produto zerado | ligado |
| Estoque baixo (no mínimo) | ligado |
| Movimentações pendentes de aprovação | ligado |
| Falhas de sincronização e operações não confirmadas | ligado |
| Produtos parados (sem movimentação) | ligado |
| Divergências de inventário | ligado |

A escolha fica **salva no aparelho** (chave `mdo_alcfg`), grava **só o que foi mudado** e vai para a
auditoria (`ALERTAS · ligado/desligado`). Desligar para de criar avisos novos; os antigos ficam no histórico.

---

## Como foi testado (automático)

1. produto zerado gera **um** aviso e não repete no mesmo dia
2. reposição **resolve** o aviso de estoque
3. pendências de aprovação avisam e o aviso **some** quando não há pendência
4. divergência de inventário avisa e conta quantos produtos divergiram
5. ligar/desligar cada alerta funciona e a escolha é guardada
6. a configuração fica salva no aparelho e vale ao reabrir

### Não testado aqui
O toque real no celular e o comportamento com o servidor de produção — dependem do deploy. Os alertas
são avaliados na abertura do app e a cada movimentação, como antes.

## Como testar no celular

1. Como administrador, dê baixa até zerar um produto → aba **Admin** deve mostrar **🔔 Avisos**
   com *Estoque zerado: …*
2. Registre uma entrada nesse produto → o aviso **sai** da lista
3. Em **⚙️ Quais alertas avisar**, desligue *Produto zerado* → zere outro produto → **não** deve avisar
4. Ligue de novo → o aviso volta
5. Conclua um inventário com diferença → deve aparecer o aviso de **divergências de inventário**

## Arquivos

| Arquivo | O que muda |
|---|---|
| `index.html` | `ALERTAS`, `alertaCfg()`, `alertaConfigurar()`, `alertaLigado()`, `alertasAbertos()`; `alertas()` com códigos, resolução e inventário; cartões 🔔 e ⚙️ no Admin; idêntico a `src/index_versao6.html` |
| `tests/run-tests.js` | 6 testes novos da Seção 7.5 |
