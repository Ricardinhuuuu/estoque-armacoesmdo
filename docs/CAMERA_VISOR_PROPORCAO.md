# Visor da câmera: por que havia tarja preta e como foi resolvido

## O sintoma (visto no iPhone)

O visor aparece como um retângulo largo, mas a imagem da câmera ocupa só uma faixa vertical
no centro — **duas tarjas pretas grandes nas laterais**. Alargar o visor não muda nada.

## A causa

O diagnóstico do próprio app no aparelho mostrou:

```
Aparelho: iPhone · Safari
leitor: biblioteca
zoom de câmera: 10.0x
```

Duas descobertas:

1. **O iOS não permite pedir vídeo em paisagem.** Ele entrega o vídeo em retrato. O app pedia
   `aspectRatio:1.777` (16:9) e fixava o `<video>` em `aspect-ratio:16/9`. Vídeo retrato dentro
   de caixa 16:9 = tarja preta nas laterais e imagem em ~28% da largura.
2. **O Safari expõe zoom nativo até 10x** — e o app estava usando ampliação digital
   (`transform:scale`), que estica pixel e atrapalha a leitura do código.

Ou seja: o problema nunca foi a largura do visor. Era a **proporção forçada**.

## A solução

### A — imagem preenche o visor
`object-fit:cover` nos dois visores (`#cam` do Bipar e `#qCamBox` da consulta por foto).

### B — o visor segue a proporção REAL do vídeo

```js
function ajustarProporcao(box){
  const w = v.videoWidth, h = v.videoHeight;
  if (!w || !h) return;
  const p = Math.max(0.75, Math.min(4/3, h/w));   /* limite: 3/4 até 4/3 */
  box.style.aspectRatio = String(1/p);
  box.style.maxHeight = "56vh";
}
```

- roda no `loadedmetadata` **e** 400 ms depois (o tamanho só existe depois de o vídeo tocar);
- se ainda não há tamanho, o CSS deixa **4:3** como padrão;

```css
#cam{aspect-ratio:4/3;height:auto;max-height:46vh}
```

- o `16/9` e o `aspectRatio:1.777` foram **removidos de todo o arquivo**.

### C — zoom da lente, não do pixel

Quando o aparelho tem zoom nativo, **nenhuma** ampliação digital é aplicada:

```js
v.style.transform = (zNativo && max >= ZOOMATUAL) ? "" : (zNativo ? "" : ("scale(" + digitalFalta + ")"));
```

O digital fica só para aparelho que não expõe zoom (aí não há alternativa).

## Diagnóstico melhorado

O texto do 📷 Diagnóstico agora traz **vídeo** (resolução entregue) e **visor** (tamanho real na
tela) — é assim que se confirma no aparelho que a proporção foi aplicada.

## Como conferir no celular

1. Abra o app e ligue a câmera.
2. A imagem deve preencher **a largura toda**, sem tarja preta.
3. Toque em 📷 Diagnóstico → 📋 Copiar. Deve aparecer algo como:
   `vídeo: 1080×1440 · visor: 393×524` — proporção parecida, visor mais alto que largo.
4. Antes da correção o visor era 16:9 (largo e baixo) com a imagem estreita no meio.

## Testes

`161 passaram, 0 falharam` (local, duas execuções) e **verde no CI** do PR e do push do merge.

O teste do visor passou a exigir `aspect-ratio:4/3` e a **proibir** o retorno do 16:9 fixo.

## Pendente

Confirmar no iPhone e no Android com etiqueta real. O ambiente de desenvolvimento não tem
câmera — este ajuste foi provado por teste, não por imagem.
