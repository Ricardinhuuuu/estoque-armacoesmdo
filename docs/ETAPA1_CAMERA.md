# ETAPA 1 — Câmera, Leitura de Códigos e Bipagem

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch desta etapa:** `etapa1-camera` (parte do PR #1)
**Testes automatizados:** 49 passando, 0 falhando

> Regra 10 respeitada: os itens que dependem de aparelho físico estão marcados como **pendente de teste real**
> e não são apresentados como concluídos.

---

## 1.1 — Preservação da câmera atual ✅

Nada da interface da câmera foi redesenhado. Continuam iguais:

- O botão "📷 Ligar câmera (Leitura Automática)" e o "📸 Ler por foto (alternativa)".
- A moldura verde (`#gl`) e a **linha verde que sobe e desce** (`#lz .ln`).
- O ícone oficial do MDO Estoque e a paleta atual.
- O fluxo: ligar → bipar → continuar bipando → desligar.

Nenhuma tela, botão ou controle novo foi criado.

## 1.2 — Tecnologia de leitura ✅

Ordem mantida, com decodificação real (nunca reconhecimento visual por IA):

1. **`BarcodeDetector` nativo** — Android/Chrome, mais rápido e sem internet.
2. **`html5-qrcode` 2.3.8** — iPhone/Safari e demais navegadores.

Formatos restritos aos três pedidos, tanto no nativo quanto na biblioteca:

```
code_128 · ean_13 · qr_code
```

## 1.3 — Desempenho ✅

| Requisito | Como ficou |
|---|---|
| Leitura contínua | laço nativo com intervalo de **40 ms (~25 tentativas/s)**; biblioteca em **fps: 30** |
| Área de leitura horizontal e larga | `qrbox` com **92% da largura × 42% da altura** |
| Resolução de referência | `width: 1280, height: 720` |
| Foco automático contínuo | `focusMode: "continuous"` quando o aparelho oferece |
| Baixa latência / inicialização rápida | motor nativo antes do fallback; biblioteca só é carregada se precisar |
| Evitar processar todo quadro | laço só decodifica quando `readyState >= 2` |

## 1.4 — Compatibilidade e biblioteca empacotada ✅

- **`vendor/html5-qrcode.min.js`** (375 KB) agora está **dentro do repositório** e é a **primeira fonte**.
  Os três CDNs (cdnjs, jsDelivr, unpkg) continuam como reserva. Licença Apache-2.0 preservada em
  `vendor/html5-qrcode.LICENSE`.
- Efeito prático: **no iPhone a leitura passa a funcionar sem internet**.

Mensagens específicas já existentes, agora cobertas por teste:

| Situação | Mensagem |
|---|---|
| Permissão negada | "Câmera bloqueada. No iPhone: Ajustes › Safari › Câmera › Permitir…" |
| Câmera em uso | "A câmera está em uso por outro app…" |
| Aparelho sem câmera | "Nenhuma câmera encontrada neste aparelho…" |
| Página sem HTTPS | "A câmera só funciona em página segura (https)…" |
| Biblioteca não carregou | "Não consegui carregar o leitor (internet fraca ou bloqueada)…" |
| Internet indisponível | cai no motor nativo (Android) ou na foto/digitação |

Alternativas sempre oferecidas: **foto** e **digitação**.

## 1.5 — Zoom padrão 3,4x ✅ (com uma limitação técnica declarada)

Implementado em `aplicarZoom()`, aplicado automaticamente **ao abrir a câmera**, nos dois motores:

1. Se o aparelho expõe **zoom de câmera** (`getCapabilities().zoom`), aplica **3,4x**.
2. Se o máximo do aparelho for menor que 3,4x, aplica **o maior possível** e completa com
   **ampliação digital da região central** (`transform: scale()`), mantendo o centro da moldura verde.
3. Se o aparelho **não expõe zoom** (caso do Safari no iPhone), usa **ampliação digital 3,4x**.

O aviso aparece na mesma linha de mensagem que já existia (`#camMsg`), **sem criar controle novo na tela**.
O zoom é reaplicado a cada abertura da câmera.

> **Limitação real:** o Safari no iPhone **não expõe** controle de zoom para páginas web. Portanto, no
> iPhone o 3,4x é **ampliação digital**, não óptica. Isso está implementado, mas **depende do seu teste
> no aparelho** para eu confirmar qualidade. Se o resultado não ficar bom, a alternativa é abrir a câmera
> no app nativo do iPhone — o que sai do escopo deste app web.

## 1.6 — Bipagem e retorno imediato ✅

- Cartão com **produto, modelo, cor e saldo atualizado**.
- Confirmação **visual** (cartão verde/vermelho + luz `#gl`) e **sonora** (`beep`/vibração).
- A câmera **permanece aberta** para leituras consecutivas.
- **Bloqueio de leitura duplicada em 1,5 s** por código.
- **Novo nesta etapa:** ao reabrir a câmera, a última etiqueta lida é esquecida — senão a etiqueta que
  ainda está na frente da lente contava como "duplicada" e a bipagem era ignorada.
- Código não cadastrado: aviso claro ("Esse código não está no cadastro"), **sem associar a outro produto**.

## 1.7 — Testes

### Automatizados (12 novos, todos passando)
1. biblioteca empacotada é a primeira fonte e não está truncada
2. formatos restritos a Code 128 / EAN-13 / QR
3. leitura contínua a ~25-30 tentativas por segundo, foco contínuo, 1280×720, área larga
4. zoom 3,4x existe e é aplicado ao abrir (nativo e biblioteca)
5. zoom usa o máximo do aparelho quando não chega a 3,4x
6. sem zoom de câmera, cai para ampliação digital e explica
7. reabrir a câmera não relê a etiqueta que está na frente
8. leitura repetida em menos de 1,5 s é bloqueada
9. retorno imediato mostra produto, modelo, cor e saldo
10. código não cadastrado avisa sem associar a outro produto
11. mensagens de erro cobrem cada causa
12. **código real da etiqueta `80202503194` existe no catálogo e é encontrado**

### Testes que dependem de aparelho real — **pendentes**
Não consigo executá-los neste ambiente (sem câmera, sem iPhone/Android). Ficam para você:

| Teste | Como fazer |
|---|---|
| Code 128 com a etiqueta física | abrir a câmera e bipar `Codigo_de_barra.png` impresso ou na tela |
| EAN-13 | bipar qualquer produto de supermercado |
| QR Code | gerar um QR com um código do catálogo |
| Vários produtos em sequência | bipar 5 etiquetas diferentes sem desligar a câmera |
| Código não cadastrado | bipar um código inventado |
| Permissão negada | negar a permissão de câmera no primeiro acesso |
| Sem internet | ativar modo avião e tentar ler no iPhone e no Android |
| Zoom 1x vs 3,4x | comparar a distância necessária para ler |
| Velocidade observada | cronometrar 10 bipadas |

## Funcionalidades anteriores preservadas

Modos Baixa/Entrada/Contagem, quantidade por bipada, aprovação de baixa, desfazer como estorno,
contagem de inventário, busca, estoque mínimo, importação de planilha, exportações CSV, backup/merge JSON,
login com bloqueio e troca de senha provisória, auditoria, avisos ao administrador — **nada foi removido**.
A suíte completa (49 testes) cobre esses fluxos e continua verde.

## Bibliotecas utilizadas

| Biblioteca | Versão | Onde | Mudança nesta etapa |
|---|---|---|---|
| `BarcodeDetector` | nativa | navegador | — |
| `html5-qrcode` | 2.3.8 | `vendor/` + 3 CDNs | **empacotada no repositório** |
| `xlsx` (SheetJS) | 0.18.5 | CDN | inalterada |

Nenhuma biblioteca nova foi instalada.

## Checklist da Etapa 1

- [x] 1.1 Interface original da câmera preservada (linha verde, ícone, botões)
- [x] 1.2 Decodificação real, formatos restritos
- [x] 1.3 Leitura contínua ~25-30/s, foco contínuo, 1280×720, área larga
- [x] 1.4 Biblioteca empacotada + mensagens de erro por causa
- [x] 1.5 Zoom 3,4x automático ao abrir, com máximo do aparelho e ampliação digital
- [x] 1.6 Retorno imediato, som/cor, bloqueio de 1,5 s, código desconhecido avisado
- [x] 1.7 12 testes automatizados novos — **49 passando, 0 falhando**
- [ ] Teste em iPhone e Android reais — **depende de você**
- [x] Nenhuma funcionalidade anterior removida
- [x] `index.html` = `src/index_versao6.html`

## Erros encontrados e corrigidos durante a etapa

1. `const box` duplicado em `startLib` quebrava o script inteiro (o app não carregava). Corrigido e coberto
   pelos testes — a suíte foi de 4/37 para 49/49 depois da correção.
2. O harness de teste não tinha `querySelector`, `style.transform` nem `textContent` refletindo o HTML;
   os testes de zoom e de retorno imediato não conseguiam medir nada. Corrigido no `tests/dom-harness.js`.
3. A etiqueta que fica na frente da lente era relida como duplicada ao reabrir a câmera. Corrigido
   (`last=""` ao ligar).

---

**PARADO aguardando aprovação.** Nada avança para a Etapa 2 até você responder **"PODE APLICAR"** ou
**"APROVADO"**, e o resultado do teste real no celular.
