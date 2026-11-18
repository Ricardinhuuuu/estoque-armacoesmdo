# ETAPA 2 — Pesquisa por Câmera e Foto na Aba Estoque

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch desta etapa:** `etapa2-busca-camera-foto` (parte do PR #1 → #2)
**Testes automatizados:** **62 passando, 0 falhando** (13 novos desta etapa)

> Regra 10: a pesquisa por foto **só será considerada concluída quando uma fotografia real for
> decodificada no aparelho**. Isso **depende do seu teste** e está marcado como pendente abaixo.

---

## 2.1 — Pesquisa atual preservada ✅

A busca por **código, modelo e cor** continua exatamente como era (`#q` + lista `#lst`).
Foram **acrescentados dois botões** acima da lista, no mesmo cartão, com o mesmo estilo dos botões
que já existiam (`.btn.ghost`):

- **📷 Buscar por código de barras**
- **📸 Buscar por foto**

Nenhuma outra tela, aba ou campo foi alterado.

## 2.2 — Busca por código de barras ✅

1. Abre a câmera traseira (`facingMode: environment`).
2. Leitura contínua, com os mesmos motores da Etapa 1 (nativo → html5-qrcode), mesmos formatos
   (Code 128, EAN-13, QR), mesmo zoom 3,4x e mesma área larga de leitura.
3. Identifica o código e consulta o cadastro.
4. Mostra o produto e o saldo.
5. **Continua na aba Estoque** e aceita a próxima consulta sem sair — só bloqueia a repetição do
   mesmo código por 1,5 s.

O botão vira **"⏹ Parar busca"** enquanto a câmera está aberta.

## 2.3 — Busca por foto ✅

- Fotografar a etiqueta, escolher da galeria ou dos arquivos (`accept="image/*"`, sem `capture`).
- A imagem é processada por **decodificação real** (`BarcodeDetector` e/ou `html5-qrcode`), nunca por
  reconhecimento visual.

## 2.4 — Processamento avançado da imagem ✅

Cada foto passa por **21 estratégias em sequência**, da mais provável à mais agressiva:

| Ajuste | Implementação |
|---|---|
| Redimensionar para 1600 px no maior lado | `qCanvas` (mantém proporção) |
| Tons de cinza | luminância 0.299 / 0.587 / 0.114 |
| Contraste | fator 1.6 e 2.2 |
| Nitidez | unsharp simples (pixel + (pixel − média dos 4 vizinhos)) |
| Rotação 90°, 180°, 270° | 12 combinações de rotação × tratamento |
| Recorte de regiões | faixa central, centro 70%×40%, faixa larga 70% |
| Nova tentativa | para na primeira leitura bem-sucedida |

Cada tentativa tem **tempo limite de 3 s** no detector nativo, para uma foto ruim nunca deixar a
consulta sem resposta.

Se nada for lido, a mensagem diz a **causa provável** — foto desfocada, pouca luz, código cortado,
baixa resolução ou formato não suportado — e oferece **nova tentativa** ou **digitação**.

## 2.5 — Consulta ao cadastro ✅

`qBusca()` normaliza o código (preservando zeros à esquerda), procura **só no cadastro real** e
devolve `null` quando não existe. **Não inventa código e não associa por semelhança.**

## 2.6 — Resultado da pesquisa ✅

Cartão com todos os campos pedidos:

- Situação do produto (Em estoque / Zerado / Abaixo do mínimo / Saldo negativo)
- Código interno / de barras (e o que foi lido na etiqueta, quando diferente)
- Descrição/modelo
- Cor
- Saldo disponível
- Estoque mínimo
- Situação do estoque

E, sempre, em negrito: **"Esta consulta não altera o estoque."**

Produto não encontrado: **"❌ Produto não cadastrado"** com o código lido e o aviso de que nada mudou.

## 2.7 — Regra fundamental: consulta é só consultiva ✅

A consulta **não chama** nenhuma função de movimentação. Comprovado por teste:

- movimentações (`M`), saldo (`bal()`), contagem (`CNT`) e pedidos (`REQ`) **idênticos** antes e depois;
- **nenhuma chave nova** gravada no `localStorage`.

## 2.8 — Testes

### Automatizados — 13 novos, todos passando
1. pesquisa antiga (código, modelo, cor) continua funcionando
2. aba Estoque tem as duas opções novas sem tirar a busca textual
3. consulta encontra o produto do cadastro real
4. código não cadastrado não associa nenhum produto
5. cartão mostra todos os campos e a frase obrigatória
6. **consulta nunca altera o estoque** (M, saldo, contagem, pedidos)
7. **consulta não grava nada no localStorage**
8. produto não cadastrado mostra aviso e nada muda
9. estratégias de foto cobrem rotação, cinza, contraste, nitidez e recorte
10. pré-processamento reduz para 1600 px no maior lado
11. recorte devolve só a região pedida
12. foto com código legível devolve o código e não altera o saldo
13. foto ilegível explica a causa provável

### Pendentes — dependem de aparelho real

| Teste | Observação |
|---|---|
| Câmera na aba Estoque (Android e iPhone) | precisa de celular |
| Fotografia na hora, galeria e arquivos | precisa de celular |
| **Fotografia real da etiqueta `Codigo_de_barra.png` decodificada** | é a condição da regra 10 |
| Imagem desfocada / pouca luz / código cortado | precisa de fotos reais |
| Code 128, EAN-13 e QR por foto | precisa de fotos reais |
| Várias pesquisas consecutivas | precisa de celular |
| Conferência do saldo depois das consultas | pode ser conferido no celular |

## Funcionalidades anteriores preservadas

Bipagem, entrada/saída, contagem, aprovação, desfazer/estorno, log, admin, usuários, backup, importação
e exportação — **nada foi removido**. A suíte completa (62 testes) cobre tudo e está verde.

## Erros encontrados e corrigidos nesta etapa

1. `BarcodeDetector` travado deixaria a foto sem resposta → adicionado **tempo limite de 3 s**.
2. O harness de teste simulava `setTimeout` executando na hora, o que **nunca deixava uma corrida
   Promise.race resolver**. Trocado por timers reais do Node — é o mesmo comportamento do navegador.
3. O teste de login passou a esperar de forma tolerante (até 10 ciclos), eliminando falha intermitente
   causada pela ordem das promises.
4. O harness não tinha canvas 2D, `FileReader`, `Image` nem `createImageBitmap`; sem isso o
   pré-processamento da foto não podia ser testado.

## Checklist da Etapa 2

- [x] 2.1 Busca atual preservada + duas opções novas
- [x] 2.2 Busca por código de barras na aba Estoque, sem sair da aba
- [x] 2.3 Busca por foto (câmera, galeria, arquivos)
- [x] 2.4 Pré-processamento em 21 estratégias com causa provável quando falha
- [x] 2.5 Consulta só ao cadastro real
- [x] 2.6 Cartão completo + frase obrigatória
- [x] 2.7 Consulta comprovadamente sem efeito no estoque
- [x] 2.8 13 testes automatizados novos — **62 passando, 0 falhando**
- [ ] Teste real de fotografia no aparelho — **depende de você**
- [x] `index.html` = `src/index_versao6.html`

---

**PARADO aguardando aprovação.** A Etapa 3 só começa com **"PODE APLICAR"** ou **"APROVADO"** — e ela
exige a decisão sobre o backend (Base44 ou outro), porque sincronização real não existe só no navegador.
