# Seção 10.1 — Cadastro de produto pela foto da etiqueta

**Projeto:** MDO Estoque (`Ricardinhuuuu/estoque-armacoesmdo`)
**Branch:** `secao10-1-cadastro-foto` (sobre `etapa6-final`, PR #7)
**Testes:** **114 passando, 0 falhando** (4 novos)

---

## O que foi feito

Novo botão na aba **Bipar**:

```
🏷 Cadastrar produto por foto da etiqueta
```

Fluxo:

1. **Só o administrador** vê o resultado — quem não tem permissão de cadastro recebe o aviso e nada é criado.
2. A foto é lida com o mesmo leitor já usado no app (`BarcodeDetector` nativo e, se falhar, a biblioteca
   empacotada). A foto serve **apenas para descobrir o código**.
3. O código é conferido:
   - **já existe** → o app informa o produto e o saldo, e pergunta o estoque correto. A diferença entra
     como **ajuste** registrado na auditoria (“Ajuste pelo cadastro por foto”). O produto **não é duplicado**.
   - **não existe** → abre o cadastro com a descrição (modelo), a cor e o estoque inicial, **digitados por
     uma pessoa**. Campo de descrição vazio **cancela** o cadastro.
4. Cada leitura feita por foto fica registrada em `mdo_cads` (código, quem leu, quando, se já existia) para
   o administrador conferir depois.

## Regras respeitadas (Seção 10.1 do prompt)

- Código já preenchido a partir da foto ✅
- Verifica se o código existe **antes** de abrir o cadastro ✅
- Demais campos preenchidos ou confirmados por uma pessoa ✅
- **Nenhuma IA inventa descrição**: não há sugestão automática de texto; a descrição vem sempre digitada ✅
- Restrito a quem tem permissão de cadastro ✅

## Como foi testado

### Automatizados — 4 novos, todos passando
1. código lido na foto abre o cadastro já preenchido (descrição, cor e estoque inicial digitados, e a leitura fica registrada)
2. código já cadastrado não duplica o produto (vira ajuste de estoque)
3. operador não cadastra produto pela foto
4. nenhuma descrição é inventada: campo vazio cancela o cadastro

### Não testado aqui — depende de aparelho real
| Teste | Precisa de |
|---|---|
| foto real de etiqueta (Code 128) gerando o cadastro | celular com câmera |
| foto desfocada / pouca luz | celular |
| leitura pela biblioteca quando o aparelho não tem `BarcodeDetector` | iPhone |

Não simulei esses casos: os testes cobrem a regra do cadastro, não a câmera.

## Arquivos

| Arquivo | O que muda |
|---|---|
| `index.html` | botão 🏷, `cadAbrir()`, `cadPorFoto()`, chave `mdo_cads`; idêntico a `src/index_versao6.html` |
| `tests/run-tests.js` | 4 testes novos |

## Pendente da Seção 10

- **10.2** Consulta de movimentações por operador, com identificação de divergências
- **10.3** Aviso de produto sem movimentação, com período configurável pelo administrador

**PARADO aguardando aprovação da 10.1** antes de seguir para a 10.2.
