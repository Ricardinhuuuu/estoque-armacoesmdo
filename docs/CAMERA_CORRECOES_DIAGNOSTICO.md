# Câmera — Correções e diagnóstico (primeiro passo da validação)

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch:** `camera-correcoes-diagnostico` (sobre `secao10-2-3-operador-parados`, PR #9)
**Testes:** **131 passando, 0 falhando** (7 novos)

Comecei pela câmera, como você pediu. Antes de você testar no celular, corrigi três coisas e criei uma
medição que mostra, sem adivinhar, o que cada aparelho consegue fazer.

---

## 1. Zoom de câmera incompleto — corrigido

**O que estava errado:** quando o aparelho expõe zoom de câmera mas o máximo é **menor que 3,4x**
(acontece em muitos Androids), o app aplicava só o zoom do aparelho e **não completava** com a ampliação
digital. A imagem ficava com menos zoom do que o prometido.

**Agora:** o zoom digital complementa exatamente o que falta (`3,4 ÷ zoom do aparelho`). Exemplo: aparelho
com zoom máximo 2x → imagem ampliada mais 1,7x, chegando aos 3,4x.

## 2. Leitura errada logo depois de outra — tratada

**O que estava errado:** se a câmera lesse um código duvidoso menos de 1,5 s depois de outro código, o app
trocava o produto na tela — e, no modo de entrada/saída, lançava no produto errado.

**Agora:** a confiança da leitura é considerada. Leitura de baixa confiança que aparece menos de 0,35 s
depois de outro código é **ignorada**. Leituras boas continuam funcionando igual.

## 3. Diagnóstico da câmera — novo

Cartão **📷 Diagnóstico da câmera** no Admin, logo abaixo da Sincronização:

```
Leitor: nativo · zoom de câmera: 2.0x · ampliação digital: 1.7x · leituras: 5 · não lidas: 1 · último uso: ...
```

- **Leitor:** `nativo` (Android/Chrome) ou `biblioteca` (iPhone e navegadores sem `BarcodeDetector`).
- **zoom de câmera:** o máximo que o aparelho informa, ou “não exposto”.
- **ampliação digital:** quanto foi aplicado por ampliação da imagem.
- **leituras / não lidas:** contagem real do que aconteceu neste aparelho.
- Botão **🔄 Recomeçar medição** zera os números para você medir um teste limpo.

Sem uso, o cartão diz **“A câmera ainda não foi usada neste aparelho.”** — nunca inventa dado.

O diagnóstico fica **no aparelho** (`mdo_camdiag`), não vai para o servidor.

## 4. Texto do diagnóstico para copiar e enviar

O cartão mostra o **nome do aparelho** (ex.: `iPhone · Safari`, `Android 13 · Chrome`) e tem o botão
**📋 Copiar diagnóstico**, que copia um texto pronto para colar no WhatsApp e me mandar:

```
📷 MDO Estoque — diagnóstico da câmera
Aparelho: iPhone · Safari
Leitor: biblioteca
zoom de câmera: não exposto
ampliação digital: 3.4x
leituras: 5
não lidas: 1
último uso: 18/02/2026 14:32
```

Se o navegador não permitir copiar, o texto aparece numa janela para você copiar à mão. Nada é enviado
sozinho para lugar nenhum.

## 5. Relatórios em CSV

Na aba **Admin › 📊 Relatórios** agora existe o cartão **⬇ Salvar os relatórios**:

- Resumo do período · Mais movimentados · Por operador · Sem movimentação · **Tudo num arquivo**
- Arquivo com **ponto e vírgula**, que é o que o Excel em português espera (abre direto, sem configurar)
- Cada exportação fica registrada na auditoria
- **Só o administrador** vê e exporta relatórios — o operador tem o cartão vazio

---

## O que testar no celular agora

Use a etiqueta real `80202503194 · 5CL661045417140C4`.

| # | O que fazer | O que deve acontecer | ✓ |
|---|---|---|---|
| 1 | Abrir o app, aba **Bipar** → *Ligar câmera* | Pede permissão uma vez e abre a imagem | [ ] |
| 2 | Aba **Admin → 📷 Diagnóstico da câmera** | Mostra leitor, zoom e ampliação — **antes de qualquer bipagem** | [ ] |
| 3 | Bipar a etiqueta de longe (~25–30 cm) | Lê por causa do zoom 3,4x | [ ] |
| 4 | Voltar ao diagnóstico | “leituras” aumentou em 1 | [ ] |
| 5 | Bipar um código **que não é do catálogo** | Avisa que não está cadastrado; não inventa produto | [ ] |
| 6 | Bipar duas peças diferentes em sequência rápida | Cada uma entra no produto certo, sem trocar | [ ] |
| 7 | Bipar com pouca luz | Lê ou avisa claramente; a tela não trava | [ ] |
| 8 | Foto da etiqueta (📸) | Lê; “leituras” aumenta | [ ] |
| 9 | Foto desfocada | Aviso com as causas; “não lidas” aumenta | [ ] |
| 10 | 📷 **Recomeçar medição** | Zera os números e volta a “ainda não foi usada” | [ ] |

**Me mande o texto do cartão de diagnóstico de cada aparelho** (iPhone e Android, se tiver os dois). Com
esse texto eu sei exatamente o que cada aparelho entrega — sem chutar.

---

## Não testado aqui — depende do celular

Zoom real, leitura ao vivo, pouca luz, leitor nativo × biblioteca, leitura dupla em sequência e
desempenho em 20 bipadas seguidas. Nada disso foi simulado; os 4 testes automáticos cobrem a regra.

## Arquivos

| Arquivo | O que muda |
|---|---|
| `index.html` | zoom completo, confiança na troca de código, `CAMDIAG`/`camDiagTexto()`, cartão de diagnóstico; idêntico a `src/index_versao6.html` |
| `tests/run-tests.js` | 4 testes novos |
