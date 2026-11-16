# 📦 MDO Estoque — Sistema de Contagem e Controle de Estoque

Repositório oficial contendo o código-fonte de referência (`index_versao6.html`), os ativos visuais oficiais e o **Prompt Mestre de Engenharia** para evolução do aplicativo **MDO Estoque** no **Base44**.

---

## 📁 Estrutura do Repositório

```text
mdo-estoque/
├── README.md                        # Visão geral do projeto e instruções de uso
├── index.html                       # Cópia na raiz para deploy rápido (GitHub Pages / Netlify)
├── docs/
│   └── PROMPT_MESTRE_BASE44.md      # Especificação técnica completa e etapas obrigatórias (Base44)
├── src/
│   └── index_versao6.html           # Código-fonte atual de referência do MDO Estoque
└── assets/
    ├── Icone_MDO_1024.png           # Ícone oficial do aplicativo (1024x1024)
    └── Codigo_de_barra.png          # Etiqueta real de armação (Code 128) para testes de leitura
```

---

## 🎯 Principais Diretrizes do Projeto

1. **Preservação da Interface:** Manter integralmente o fluxo, telas, botões e identidade estrutural do MDO Estoque atual, atualizando apenas a paleta de cores (**Azul** principal, **Vermelho** para saídas/alertas e **Branco** para fundo).
2. **Leitura Real de Códigos de Barras:** Decodificação nativa (`BarcodeDetector`) com fallback (`ZXing` / `html5-qrcode`) focada em `Code 128`, `EAN-13` e `QR Code`, com **zoom padrão de 3,4x no iPhone**.
3. **Pesquisa Consultiva na Aba ESTOQUE:** Busca por câmera ao vivo e por foto (com pré-processamento de contraste, nitidez, tons de cinza e rotação) sem alterar o saldo.
4. **Acesso de Operadores Zero E-mail:** Autocadastro direto na tela inicial (Nome completo, Login e Senha), bloqueio após 3 tentativas incorretas, troca de senha imediata no app e controle administrativo protegido no backend.
5. **Gestão e Relatórios:** Inventário com bipagem, sincronização segura entre aparelhos e relatório gerencial interativo estilo Power BI para o administrador.

---

## 🚀 Como Utilizar este Repositório com o Base44

1. Suba todos os arquivos deste repositório para o seu projeto no **GitHub**.
2. Conecte ou importe o repositório no **Base44** (ou anexe `docs/PROMPT_MESTRE_BASE44.md`, `src/index_versao6.html`, `assets/Icone_MDO_1024.png` e `assets/Codigo_de_barra.png`).
3. Instrua a IA a seguir **estritamente a ordem da Seção 2** de `docs/PROMPT_MESTRE_BASE44.md`, validando o **Checklist Obrigatório (Seção 11)** ao final de cada etapa antes de autorizar a próxima.
