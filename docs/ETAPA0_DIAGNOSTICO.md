# ETAPA 0 — Diagnóstico Técnico e Proteção do Projeto

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Data do diagnóstico:** 18/11/2026
**Escopo desta etapa:** análise apenas. **Nenhum código, dado ou estrutura foi alterado nesta etapa.**

> Observação de estado: a análise foi feita sobre o código do branch `revisao-melhorias` (commit
> `be6d71c`), que é a versão com as correções da revisão e está no **PR #1 aberto** para a `main`
> (ainda **não mesclado**). A `main` continua no commit `ddc59ee`. Onde os dois diferem, isso está
> marcado.

---

## 1. Backend identificado

**Não existe backend.**

- `grep` por `fetch(`, `XMLHttpRequest`, `WebSocket`, `supabase`, `firebase` no `index.html`:
  **0 ocorrências**.
- Não há domínio de API, chave, endpoint, servidor ou variável de ambiente no código.
- O aplicativo é um **arquivo HTML único** que roda inteiramente no navegador do aparelho.

O que o README antigo chama de "backend" é o **Base44**, mas ele aparece **apenas como destino futuro**
(o `docs/PROMPT_MESTRE_BASE44.md` é uma especificação para uma IA construir o app lá). Hoje, **nada**
do Base44 está integrado: nenhuma tela, biblioteca ou chamada do Base44 existe no código.

## 2. Banco de dados identificado

**`localStorage` do navegador** — não é um banco de dados de servidor.

| Chave | Conteúdo | Tamanho típico |
|---|---|---|
| `mdo_P` | Catálogo de produtos: `[código, descrição, cor, estoque inicial]` | ~10 KB (160 produtos) |
| `mdo_m` | Movimentações: `{id, t, c, q, o, u, ts, ap, req, est, del, obs}` | cresce ~150 B por bipada |
| `mdo_u` | Usuários: `{l, n, r, h, st, t, temp, ts}` (senha = hash) | ~150 B por usuário |
| `mdo_min` | Estoque mínimo por código | pequeno |
| `mdo_req` | Solicitações de baixa pendentes de aprovação | pequeno |
| `mdo_cnt` | Contagem de inventário em andamento | pequeno |
| `mdo_aud` | Auditoria local (últimos 2.000 eventos) | ~100 KB no limite |
| `mdo_av` | Avisos ao administrador | pequeno |
| `mdo_s`, `mdo_ab`, `mdo_abd` | Sessão, backup automático ligado/desligado, data do último backup | trivial |

**Limite prático:** o `localStorage` tem cerca de **5 MB por origem**. Com ~150 B por movimentação,
isso dá em torno de **20 a 30 mil bipadas** antes de o navegador recusar a gravação — e quando ele
recusa, o app **não perde o dado em silêncio**: mostra o aviso "Armazenamento cheio: exporte um backup
e limpe o histórico antigo" (comportamento do branch `revisao-melhorias`; na `main` a falha era silenciosa).

## 3. Arquitetura atual

```
[ Celular do operador ]
        │  navegador (Safari / Chrome)
        ▼
  index.html  (HTML + CSS + JS num arquivo só, ~197 KB)
   ├── catálogo inicial embutido no código (array P, 160 códigos × 5 un.)
   ├── estado do dia a dia ......... localStorage do aparelho
   ├── câmera ....................... getUserMedia + BarcodeDetector (nativo)
   │                                  fallback html5-qrcode (CDN)
   ├── planilha (.xlsx/.csv) ......... SheetJS/XLSX (CDN)
   ├── leitura por foto .............. BarcodeDetector + html5-qrcode scanFile
   └── exportações ................... CSV (Blob) e backup JSON (Blob)
```

Não há servidor, banco, fila, sincronização automática nem autenticação de servidor. A "sincronização"
entre aparelhos é **manual**: exporta-se o backup JSON em um aparelho e importa-se no outro.

## 4. Bibliotecas existentes

| Biblioteca | Versão | Uso | Origem |
|---|---|---|---|
| `BarcodeDetector` | nativa do navegador | leitura ao vivo (Android/Chrome) | motor do navegador |
| `html5-qrcode` | 2.3.8 | leitura ao vivo (iPhone/Safari) e leitura por foto | CDN (3 fontes, com nova tentativa) |
| `xlsx` (SheetJS) | 0.18.5 | importar planilha de produtos | CDN (3 fontes) |
| `crypto.subtle` | nativa | hash SHA-256 da senha | motor do navegador |

Não há gerenciador de pacotes, build, framework nem dependências instaladas. **Nada precisa ser
instalado para rodar.**

## 5. Funcionalidades existentes

Legenda: ✅ funcionando · 🟡 parcial · ❌ com erro · ⛔ não implementado

### Bipagem e câmera (aba Bipar)
| Funcionalidade | Estado |
|---|---|
| Modos Baixa / Entrada / Contagem | ✅ |
| Quantidade por bipada | ✅ |
| Câmera ao vivo com faixa verde e linha animada | ✅ |
| Motor nativo `BarcodeDetector` + fallback `html5-qrcode` | ✅ |
| Leitura por foto (câmera ou galeria) | ✅ |
| Digitação manual do código | ✅ |
| Apito/vibração de sucesso e erro, luz verde de confirmação | ✅ |
| Bloqueio de leitura duplicada | ✅ (1,5 s por código) |
| Baixa bloqueada por saldo insuficiente, com pedido de aprovação | ✅ |
| Desfazer última bipada (agora como estorno) | ✅ |
| Mensagens específicas de erro de câmera (permissão, uso, HTTPS, sem câmera, lib) | ✅ |
| **Zoom padrão 3,4x no iPhone** | ⛔ (não existe controle de zoom no código) |

### Estoque (aba Estoque)
| Funcionalidade | Estado |
|---|---|
| Lista com saldo por produto, cor e mínimo | ✅ |
| Busca por código, modelo e cor | ✅ |
| Alerta de estoque negativo / zerado / abaixo do mínimo | ✅ |
| Definir estoque mínimo (administrador) | ✅ |
| **Busca por câmera na aba Estoque** | ⛔ |
| **Busca por foto na aba Estoque** | ⛔ |

### Log e administração
| Funcionalidade | Estado |
|---|---|
| Log de movimentações (últimas 100) | ✅ |
| Aprovações pendentes (aprovar/recusar) | ✅ |
| Usuários: criar, senha provisória, desbloquear, desativar/reativar | ✅ (no cliente) |
| Bloqueio após 3 tentativas + contagem regressiva | ✅ (no cliente) |
| Troca obrigatória de senha provisória no app | ✅ (no cliente) |
| Contagem de inventário (aplicar ajustes, reduzir item, limpar) | ✅ |
| Importar planilha, exportar log/estoque CSV, backup JSON, mesclar backup | ✅ |
| Auditoria local (30 últimos + exportação CSV) | ✅ |
| Avisos ao administrador | ✅ |
| **Relatório gerencial estilo Power BI** | ⛔ (Etapa 5 do prompt mestre) |
| **Sincronização automática entre aparelhos** | ⛔ |

### Diferença entre `main` e PR #1 (o que a revisão corrigiu)
A `main` tem 4 defeitos que o PR #1 corrige e que **mudam este diagnóstico**:
1. `mdo_P` nunca era criada na carga → cadastro de produto e importação de planilha **não persistiam**.
2. Aprovação de baixa era gravada no nome do operador, sem registro de quem aprovou.
3. Desfazer apagava a última movimentação de qualquer usuário, inclusive ajustes de inventário.
4. Backup não tinha pedidos/contagem e o merge ressuscitava movimentações apagadas.

## 6. Problemas encontrados

### Críticos
1. **Sem backend:** não há servidor, banco nem sincronização automática. Dois aparelhos trabalhando ao
   mesmo tempo **divergem** e só se acertam por backup manual.
2. **Autenticação só no cliente:** usuários, hashes e papéis ficam no `localStorage`. Qualquer pessoa
   com o aparelho pode abrir o DevTools e se tornar administrador (`U[0].r="admin"`). Sem salt no hash.
3. **Permissões não são validadas em servidor:** todas as operações administrativas são funções JS
   (`act("ok")`, `act("pw")`…) que qualquer um pode chamar pelo console.

### Importantes
4. **Zoom 3,4x não implementado** (requisito da Etapa 1).
5. **Busca por câmera/foto na aba Estoque não existe** (requisito da Etapa 2).
6. **Bibliotecas vêm de CDN** (`html5-qrcode`, `xlsx`): sem internet, a leitura no iPhone e a importação
   de planilha não funcionam. No Android o `BarcodeDetector` cobre a leitura ao vivo offline.
7. **Limite de ~5 MB do `localStorage`** e histórico crescendo sem compactação.
8. **Duas cópias do mesmo arquivo** (`index.html` e `src/index_versao6.html`) — já divergiram antes e
   divergirão de novo se não houver processo.

### Menores
9. Tela de Estoque não tem nenhum acesso à câmera (só busca textual).
10. Sem relatório gerencial (Power BI) e sem painel de indicadores.

## 7. Riscos técnicos

| Risco | Impacto | Mitigação proposta |
|---|---|---|
| Limpar dados do navegador / trocar de aparelho | **perda de todo o histórico** | backup JSON diário (já existe) + exportação CSV periódica |
| `localStorage` cheio | novas bipadas não gravam | aviso já implementado; compactar histórico |
| Aparelho compartilhado / DevTools | escalada para administrador | mover auth para backend (Etapa 4) |
| Dois aparelhos em uso simultâneo | saldos divergentes | backend com IDs únicos e reenvio (Etapa 3) |
| CDN fora do ar | leitura no iPhone e importação param | empacotar as bibliotecas no repositório (Etapa 1.4) |
| Navegador não suporta `BarcodeDetector` | depende do fallback de CDN | manter as 3 fontes + foto/digitação |
| Alteração no `index.html` sem backup | perda de código | branch + tag de versão (abaixo) |

## 8. Plano de backup e recuperação

### Código
- **Estado atual:** `main` em `ddc59ee` (versão em produção) e `revisao-melhorias` em `be6d71c` (PR #1).
- **Backup já existente:** todo commit anterior é recuperável pelo GitHub. O PR #1 **não foi mesclado**,
  então a versão em uso continua intacta.
- **Ação proposta nesta etapa:** criar uma **tag de versão** (`v6.0-main-antes-etapa1`) apontando para
  `ddc59ee`, para ter um ponto de restauração nomeado antes de qualquer alteração.
  Restaurar = `git checkout v6.0-main-antes-etapa1` (ou baixar o ZIP da tag no GitHub).
- **Regra de trabalho:** cada etapa em um branch próprio e um PR; nada entra na `main` sem aprovação.

### Dados do estoque
- **Backup do app:** aba Admin → **"Baixar backup (JSON)"** (inclui produtos, mínimo, movimentações,
  usuários, pedidos, contagem e auditoria). Fazer **antes** de qualquer atualização.
- **Backup automático diário** ao entrar como administrador (opção já ligada por padrão).
- **Exportações:** Log (CSV), Estoque atual (CSV) e Auditoria (CSV).
- **Restauração:** aba Admin → "Importar/mesclar backup de outro aparelho". O merge não duplica e
  respeita movimentações apagadas.
- **Recomendação:** manter uma cópia do JSON fora do celular (Drive/e-mail) a cada semana.

### Banco de dados
Não há banco a alterar nesta etapa. Nenhuma migração será executada.

## 9. Plano de desenvolvimento proposto

| Etapa | Entrega | Depende de |
|---|---|---|
| **0** | Este diagnóstico (feito) | — |
| **1** | Câmera: zoom 3,4x no iPhone, desempenho, bibliotecas empacotadas, mensagens de erro | aprovação |
| **2** | Busca por câmera e foto **na aba Estoque**, com pré-processamento da imagem | aprovação da 1 |
| **3** | Movimentações, cálculo de saldo e sincronização confiável | **backend** (ver item 10) |
| **4** | Login/autocadastro/administração com segurança no backend | **backend** |

## 10. Recomendações técnicas

1. **Decidir agora onde o backend será feito** (Base44, ou outro). As Etapas 3 e 4 **não têm como ser
   concluídas só no cliente**: sincronização real e permissão real exigem servidor. Tudo o que está no
   navegador hoje pode ser manipulado.
2. **Mesclar o PR #1 antes da Etapa 1.** Ele corrige os 4 defeitos da seção 5 e traz 37 testes
   automatizados. Sem ele, a Etapa 1 seria construída em cima de um app que perde cadastro de produto.
3. **Empacotar `html5-qrcode` e `xlsx` no repositório** na Etapa 1.4, como o próprio prompt pede
   ("priorizar bibliotecas empacotadas"), para funcionar sem internet.
4. **Versionar o `index.html` com tag a cada etapa** e manter `index.html` = `src/index_versao6.html`.
5. **Antes de qualquer teste real de câmera:** fazer o backup JSON do aparelho que será usado.

---

## Checklist da Etapa 0

- [x] 0.1 Arquivos analisados (`index.html`, `src/index_versao6.html`, ícone e etiqueta em `assets/`,
      `docs/PROMPT_MESTRE_BASE44.md`)
- [x] 0.2 Backend, banco, armazenamento, autenticação, entradas/saídas, comunicação, hospedagem,
      sincronização, APIs/bibliotecas e limitações identificados
- [x] 0.3 Verificação de segurança
- [x] 0.4 Funcionalidades classificadas
- [x] 0.5 Plano de backup e restauração
- [x] Relatório técnico com os 10 itens pedidos
- [x] **Nenhuma alteração de código ou de dados nesta etapa**

## Limitações encontradas (não inventar resultados)

- **Não é possível medir "velocidade observada" de leitura** sem um aparelho real: os testes deste
  ambiente são em Node, sem câmera. A Etapa 1 terá testes automatizados do que é lógica e **depende de
  você** para validar câmera, zoom e leitura física em iPhone e Android.
- **Não há relatório gerencial nem sincronização** para diagnosticar: não existem no código.
- **Zoom 3,4x** depende de `zoom` na `MediaStreamTrack`: no iOS/Safari esse controle **não é exposto**
  hoje; será necessário aplicar ampliação digital da região central, o que **exige sua autorização**
  por ser mudança visual.

---

**PARADO aguardando aprovação.** Nada será alterado até você responder **"PODE APLICAR"** ou **"APROVADO"**.
