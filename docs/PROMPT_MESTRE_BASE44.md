# PROMPT MESTRE — APLICATIVO CONTAGEM DE ESTOQUE MDO (Base44)

> **MDO Estoque — Prompt Único** (Preservação de interface, câmera com zoom 3,4x no iPhone, pesquisa por foto na aba ESTOQUE, acesso/autocadastro de operadores sem e-mail e melhorias em etapas)  
> **Atualizado em:** 16/11/2026

---

## ⚠️ INSTRUÇÃO DE EXECUÇÃO OBRIGATÓRIA

Leia este documento inteiro antes de escrever qualquer código.  
Trabalhe **estritamente por etapas**, na ordem da **Seção 2**, e **PARE ao fim de cada etapa** aguardando minha aprovação (`"pode aplicar"` / `"aprovado"`) antes de avançar.  
Nunca pule etapas, nunca invente dados e nunca marque algo como concluído sem testar.

### Arquivos de Referência no Repositório
* `src/index_versao6.html` (e `index.html` na raiz): versão atual do MDO Estoque e referência principal para todo o desenvolvimento.
* `assets/Icone_MDO_1024.png`: ícone oficial do aplicativo.
* `assets/Codigo_de_barra.png`: foto de uma etiqueta real, usada como referência nos testes de leitura.

---

## 0. Regras de Execução Reforçadas (Valem para TODAS as Etapas)

Estas regras têm prioridade sobre qualquer pressa ou atalho. Em caso de dúvida, pare e pergunte.

### 0.1 Atenção máxima em comandos, instalações e alterações
* Antes de executar qualquer comando, instalação, alteração de código, alteração de banco de dados ou mudança de configuração, **explicar em uma frase o que será feito e por quê**.
* Depois de executar, **conferir o resultado real** (mensagem de erro, aviso, saída do comando, comportamento na tela) e informar se deu certo. Nunca presumir que funcionou.
* Instalar ou adicionar somente o que for realmente necessário. Após cada instalação ou inclusão de biblioteca, testar com um exemplo simples antes de usá-la no app.
* Antes de qualquer mudança que possa afetar dados (produtos, usuários, movimentações, históricos), garantir que existe cópia de segurança ou forma segura de desfazer. **Nunca apagar nem sobrescrever dados existentes.**
* Se um comando, instalação ou teste falhar, parar, explicar o erro com clareza, corrigir a causa e repetir o teste. Não contornar o erro escondendo-o nem seguir adiante com algo quebrado.

### 0.2 Etapa por etapa, testando e validando
* Dividir cada etapa em passos pequenos. Fazer um passo, testar, validar e só então fazer o próximo. Nunca implementar vários recursos de uma vez para testar tudo no final.
* A cada passo, validar três coisas:
  1. **(a)** o recurso novo funciona;
  2. **(b)** nada do que já existia deixou de funcionar;
  3. **(c)** a interface continua igual à original (exceto a paleta de cores autorizada).
* Testar com dados reais do banco e com a etiqueta real (`assets/Codigo_de_barra.png`). Nunca usar dados fixos ou demonstrativos para dar um teste como aprovado.
* Testar também os casos de erro (sem internet, código não cadastrado, permissão negada, senha errada), não apenas o caminho feliz.

### 0.3 Zero erros
* O resultado entregue em cada etapa não pode conter erros conhecidos: nem de funcionamento, nem de cálculo de saldo, nem de sincronização, nem de permissão, nem de layout.
* Se houver qualquer erro ou limitação que não possa ser resolvido, informar claramente na entrega, sem esconder e sem apresentar como concluído.

### 0.4 Tudo que está no prompt, do início ao fim
* Cumprir todos os itens deste prompt, sem deixar nada para trás: nenhuma etapa, seção, regra, teste ou melhoria pode ser ignorada, resumida ou adiada sem minha autorização.
* Não usar frases como `"o restante segue o mesmo padrão"` nem entregar parcialmente como se estivesse completo. Se algo não ficou pronto, listar exatamente o que falta.
* Antes de encerrar cada etapa, revisar o texto da etapa linha por linha e confirmar item por item o que foi feito e testado.

### 0.5 Não inventar e perguntar quando houver dúvida
* Nunca inventar dados, códigos, funções, resultados de teste ou confirmações.
* Se uma informação estiver faltando ou houver ambiguidade que impeça fazer algo com segurança, parar e perguntar antes de alterar o que for afetado.
* Qualquer mudança estrutural na interface segue a **Seção 1.3** (explicar, justificar, mostrar e aguardar minha autorização).

---

## 1. Regras Gerais, Preservação da Interface e Identidade Visual

**Regra fundamental:** não recriar o sistema do zero e não modificar a interface original sem a minha autorização.

1. Implementar tudo no **MDO Estoque atual** (`src/index_versao6.html`). Antes de desenvolver, analisar telas, funcionalidades, banco de dados e componentes existentes.
2. Não remover, substituir ou simplificar funcionalidades existentes. Não apagar produtos, usuários, movimentações ou históricos.
3. Preservar as regras de negócio, as configurações e os comportamentos já implementados, e o fluxo de uso a que os usuários estão acostumados.
4. Fazer as melhorias técnicas nos bastidores (leitor de códigos, banco de dados, sincronização, segurança e desempenho) sem comprometer a experiência visual atual.
5. Trabalhar em etapas pequenas, na ordem da **Seção 2**. Ao final de cada etapa, informar o que foi feito, o que foi testado e o que ainda não funciona.
6. Nunca apresentar como concluído algo que não foi testado, e nunca mostrar como movimentação concluída uma operação que falhou.

### 1.1 Preservação da interface
* Manter a mesma interface visual: organização das telas, menus, botões, abas, painéis, campos e tabelas, e a disposição e a localização de cada recurso.
* Não criar um layout diferente por iniciativa própria. Não mudar tamanhos, posicionamentos, formatos de botões ou estrutura das telas por preferência estética.
* O resultado deve parecer o mesmo aplicativo que já usamos, com os mesmos recursos e a mesma identidade estrutural, porém com mais desempenho, estabilidade, segurança, leitura de códigos de barras e sincronização.
* Já fazem parte do app e devem ser mantidos: o **ícone do aplicativo (MDO Estoque)** e a **linha verde de leitor que sobe e desce no visor da câmera**.

### 1.2 Identidade visual (única alteração visual autorizada)
Atualizar apenas a paleta de cores, mantendo estrutura, proporções e disposição dos elementos:
* **Azul:** cor principal, usada em menus, cabeçalhos, botões principais e elementos de navegação.
* **Vermelho:** cor de destaque, usada em alertas, indicadores de atenção, saídas de estoque e ações que exigem cuidado.
* **Branco:** fundo predominante, para garantir boa leitura, organização e contraste.

### 1.3 Mudanças estruturais exigem autorização
Se a IA identificar necessidade de mudança estrutural na interface (usabilidade, compatibilidade com celular ou funcionamento de determinada ferramenta), deve:
1. explicar qual alteração considera necessária;
2. justificar o motivo técnico ou funcional;
3. mostrar como ficará a alteração proposta;
4. aguardar minha autorização expressa antes de implementar.

A prioridade é aprimorar o MDO Estoque existente, e não substituí-lo por outro sistema.

---

## 2. Ordem de Execução (Passo a Passo Obrigatório)

A prioridade é o que melhora diretamente o trabalho diário dos operadores: primeiro fazer funcionar a leitura real dos códigos e a pesquisa por foto na aba ESTOQUE. Não começar pelo painel nem pelos relatórios.

1. **Etapa 1:** corrigir câmera, leitura ao vivo, leitura por foto e bipagem.
2. **Etapa 2:** pesquisa por câmera e por foto na aba ESTOQUE.
3. **Etapa 3:** validar entradas, saídas, saldo e sincronização.
4. **Etapa 4:** entrada na tela inicial, autocadastro de operadores sem e-mail, gestão pelo administrador, troca de senha no app e auditoria.
5. **Etapa 5:** inventário, painel, histórico, relatórios (incluindo relatório estilo Power BI), alertas e automações.
6. **Etapa 6:** testes finais (Seção 9), melhorias pós-câmera estável (Seção 10), segurança e publicação.

> **Como trabalhar:** ao receber este prompt, **NÃO implemente tudo de uma vez**. Comece pela **Etapa 1**: apresente primeiro o plano (o que será alterado e como será testado) e aguarde o meu `"pode aplicar"`. Ao terminar cada etapa, informe o que foi implementado, o que foi testado e o que ainda não funciona, e **PARE**: só avance para a etapa seguinte depois da minha aprovação.

---

## 3. Etapa 1 — Câmera, Leitura por Foto e Bipagem

### 3.1 Princípio: decodificação real, não reconhecimento por IA
* A leitura por câmera e por foto deve ser **decodificação de código de barras feita por biblioteca ou mecanismo próprio para isso**.
* Não usar IA de reconhecimento visual para "adivinhar" o código: isso aumenta o risco de interpretar errado. A IA pode ajudar em descrições e organização, mas todo código identificado deve ser validado contra o cadastro de produtos. Nunca inventar um código nem associar uma imagem a um produto sem confirmação.

### 3.2 Etiqueta de referência
* As etiquetas das armações têm um código de barras de aparência **Code 128** (confirmar na primeira leitura real; a foto de exemplo está em `assets/Codigo_de_barra.png`).
* Abaixo das barras aparecem o código interno de 11 dígitos (exemplo: `80202503194`), o preço e um código alfanumérico do modelo.
* O texto decodificado pode vir com caracteres extras; nesse caso, procurar o código cadastrado dentro do texto lido e sempre confirmar contra o cadastro.
* **Formatos prioritários:** `Code 128`, `EAN-13` e `QR Code`.

### 3.3 Requisitos técnicos da câmera ao vivo
* A bipagem deve ser praticamente instantânea.
* Usar o leitor nativo do navegador (`BarcodeDetector`) quando existir, e uma biblioteca de decodificação (`ZXing` ou `html5-qrcode`) como alternativa, principalmente no iPhone/Safari.
* Restringir a leitura aos formatos usados (`Code 128`, `EAN-13`, `QR Code`): isso acelera muito a decodificação.
* Usar área de leitura larga e baixa, adequada a código de barras em linha; cerca de 25 a 30 leituras por segundo; resolução ideal por volta de `1280x720`; foco contínuo.
* Não depender de um único endereço da internet para carregar a biblioteca. Incluir mais de uma fonte, com nova tentativa, ou empacotar a biblioteca junto do app. Se ela não carregar, mostrar mensagem clara e oferecer a foto ou a digitação.
* Mensagens de erro específicas e com orientação: permissão da câmera negada, câmera em uso por outro aplicativo, aparelho sem câmera, página sem `https`, internet fraca.
* Manter a linha verde de leitor no visor.

#### Zoom padrão no iPhone: 3,4x
* No iPhone, a leitura da etiqueta funciona melhor com **zoom de 3,4x**. Esse deve ser o zoom padrão da câmera ao vivo toda vez que ela abrir, na bipagem, na pesquisa por código de barras e no inventário.
* Aplicar o zoom pelo controle de zoom da própria câmera, quando o navegador e o aparelho permitirem, respeitando o mínimo e o máximo que o aparelho informar. Se o aparelho não chegar a 3,4x, usar o maior zoom disponível, sem mostrar erro.
* Se o aparelho ou o navegador não permitir controlar o zoom, **não criar controles novos por conta própria**: avisar na entrega e propor uma alternativa (por exemplo, ampliar digitalmente a área central do quadro usada na leitura) para a minha autorização.
* Manter esse zoom ao trocar de tela e ao reabrir a câmera. Em Android e outros aparelhos, manter o zoom automático, a menos que os testes mostrem ganho com outro valor.
* Com zoom alto é preciso afastar o celular da etiqueta e manter o foco contínuo. Ajustar a mensagem de orientação da câmera à distância que realmente funcionar com esse zoom.
* Testar com a etiqueta real no iPhone, comparando a velocidade de leitura com zoom `1x` e com `3,4x`, e informar o resultado na entrega.

### 3.4 Bipagem com retorno imediato
Após cada leitura válida, sem trocar de tela e sem fechar a câmera, mostrar:
* produto, modelo e cor;
* saldo atualizado;
* confirmação sonora e visual (verde para sucesso, vermelho para erro ou código não cadastrado).

Permitir continuar lendo em seguida. Bloquear a leitura duplicada acidental do mesmo código em sequência muito curta (cerca de `1,5 segundo`), mas permitir repetir a leitura de propósito: tirar a etiqueta do visor e voltar, ou aguardar o intervalo, conta como nova leitura.

---

## 4. Etapa 2 — Pesquisa por Código de Barras e por Foto na Aba ESTOQUE

Integrar diretamente à aba **ESTOQUE**. Manter a pesquisa atual por código, modelo e cor e acrescentar duas possibilidades:

### 4.1 `BUSCAR POR CÓDIGO DE BARRAS` (câmera)
Botão com esse nome. Ao clicar:
1. abrir a câmera traseira, quando disponível;
2. ativar o leitor, com leitura contínua;
3. identificar o código automaticamente;
4. pesquisar o código no banco de dados;
5. apresentar o produto encontrado e o saldo atual;
6. permitir nova pesquisa sem sair da aba ESTOQUE.

### 4.2 `BUSCAR POR FOTO`
Botão com esse nome. Permitir:
1. abrir a câmera para fotografar a etiqueta;
2. selecionar uma imagem da galeria do celular;
3. selecionar uma imagem dos arquivos, quando disponível.

Depois: processar a imagem, decodificar o código de barras presente nela, pesquisar no cadastro e apresentar o resultado.

### 4.3 Requisitos da leitura por foto
* Não basta permitir o envio de uma fotografia: é obrigatório **decodificar de verdade o código da imagem**.
* Usar mecanismo compatível com imagens estáticas.
* Quando a primeira tentativa falhar, tentar de novo com:
  * melhoria de contraste e nitidez;
  * ajuste de tamanho (cerca de `1600 px` no lado maior);
  * conversão para tons de cinza;
  * rotação (`90°`, `180°`, `270°`);
  * recortes da região do código.
* Se não conseguir ler, informar o motivo provável (foto desfocada, pouca luz, código cortado, formato não suportado) e permitir nova tentativa com orientação: chegar mais perto, boa iluminação, código inteiro no quadro.
* Se o código for lido mas não estiver cadastrado, dizer isso claramente e permitir copiar ou digitar o código identificado.

### 4.4 Como o resultado deve aparecer
Um cartão simples, no estilo do app atual, com:
* **Situação:** Produto encontrado (ou Não cadastrado);
* **Código do produto e código de barras identificado**;
* **Descrição ou modelo e cor**;
* **Outras informações relevantes do cadastro**;
* **Saldo disponível e situação do estoque mínimo**;
* **A frase fixa:** `"Esta consulta não altera o estoque."`

*(Nota: nunca usar dados fixos ou demonstrativos; tudo deve vir do banco de dados).*

### 4.5 A pesquisa é exclusivamente consultiva
* A pesquisa **não realiza entradas, saídas ou ajustes de estoque em nenhuma hipótese**.
* Entrada e saída continuam apenas nas telas e fluxos de movimentação já existentes.

---

## 5. Etapa 3 — Movimentações, Saldo e Sincronização

* Validar entradas e saídas, o cálculo do saldo e a sincronização entre aparelhos.
* Indicação clara de **ENTRADA** ou **SAÍDA** selecionada antes de bipar.
* Confirmação visual do produto identificado antes da operação, quando necessária.
* Aviso quando o código não estiver cadastrado.
* Aviso quando houver falha de conexão. **Uma falha de comunicação nunca pode aparecer como movimentação concluída.**
* Registro de falhas e de operações pendentes, com nova tentativa segura (sem duplicar a movimentação).
* Identificar o usuário responsável por cada operação.

---

## 6. Etapa 4 — Usuários, Permissões e Auditoria

* Controle de permissões por tipo de usuário (`administrador` e `operador`, no mínimo).
* Todas as funções administrativas protegidas no backend: um operador não pode executar ações administrativas alterando parâmetros no navegador.
* Confirmação antes de qualquer ajuste administrativo.
* Rastreabilidade: cada movimentação guarda **quem fez, quando, o quê e em qual aparelho**.
* Não expor senhas, credenciais ou dados sensíveis no código público. Aplicar permissões adequadas de leitura e gravação aos registros e arquivos.

### 6.1 Entrada e cadastro de operadores direto na tela de início (SEM E-MAIL)
Este recurso é um acréscimo autorizado: o acesso e o cadastro ficam diretamente na tela de início/entrada e a gestão na aba do administrador, sem alterar o restante da interface (**Seções 1.1 e 1.3**).

#### Zero e-mail (nem no cadastro, nem na entrada, nem na troca de senha)
* O operador/colaborador **NUNCA digita e-mail** e **NUNCA precisa esperar e-mail** para confirmar cadastro ou para trocar/redefinir senha.
* Toda autenticação e troca de senha acontecem **100% dentro do aplicativo**.
* Se a plataforma/backend exigir um campo de e-mail internamente para criar a conta, gerar automaticamente um identificador interno fictício a partir do login (por exemplo, `login@mdo.local`), totalmente invisível para o usuário, sem disparar envio de e-mail.

#### Cadastro de operador direto na tela de início
Na própria tela inicial de entrada (login), disponibilizar de forma direta e visível a opção para o novo operador se cadastrar na hora, contendo apenas **3 campos**:
1. **Nome completo:** obrigatório informar no mínimo nome e sobrenome (pelo menos duas palavras, cada uma com no mínimo 2 letras, ignorando espaços extras). Se o usuário digitar apenas um nome ou deixar incompleto, bloquear o envio e exibir a mensagem de erro clara: `"Digite nome e sobrenome"`.
2. **Login:** escolhido livremente a critério do operador (único, sem espaços). Se o login já estiver em uso, avisar e pedir que escolha outro.
3. **Senha:** escolhida livremente a critério do colaborador (respeitando apenas um mínimo básico de segurança, como 6 caracteres) com ícone/botão para mostrar ou ocultar a senha digitada.

* O autocadastro cria sempre um perfil de **operador**, nunca de administrador (regra garantida no backend).
* Assim que concluir o cadastro na tela inicial, o operador já pode entrar imediatamente no sistema com o login e a senha que escolheu, sem depender de ativação por e-mail.

#### Alerta ao administrador no novo cadastro
* Sempre que um novo operador se cadastrar pela tela de início, o administrador recebe um aviso dentro do aplicativo: `"Novo operador cadastrado: [nome] ([login])"`, com data e hora, uma única vez por cadastro. O aviso fica visível até ser aberto e leva diretamente à tela de operadores.

#### Gestão de operadores pelo administrador
Na aba do administrador, manter a tela **Operadores** com a lista e o status de cada um (`ativo`, `bloqueado`, `desativado` ou `com troca de senha pendente`). O administrador pode:
* cadastrar um operador manualmente (nome completo, login e senha provisória);
* redefinir a senha de um operador, digitando uma senha provisória ou usando um botão que sugere uma (sem enviar e-mail);
* desbloquear um operador bloqueado;
* desativar e reativar um operador.
* **O administrador nunca vê a senha atual de ninguém:** apenas define uma nova senha provisória quando necessário.

#### Troca de senha imediata no app (sem esperar e-mail)
* Não há envio de e-mail para troca ou recuperação de senha. Se o operador esquecer a senha ou for bloqueado, ele solicita ao administrador, que define uma senha provisória na tela Operadores.
* Quando o administrador cadastra um operador com senha provisória ou redefine a senha de um operador, esse usuário fica marcado com **troca de senha pendente**.
* No próximo acesso dentro do aplicativo usando essa senha provisória, o app abre imediatamente uma tela interna para o colaborador cadastrar a nova senha de sua escolha, liberando o uso do sistema logo após salvar. A nova senha não pode ser igual à provisória.

#### Bloqueio após 3 tentativas erradas
* Depois de **3 tentativas seguidas** com a senha errada na tela de início, o acesso daquele login é **bloqueado automaticamente**. A contagem volta a zero quando o operador entra com a senha correta.
* Aviso ao operador: `"Acesso bloqueado: mais de 3 tentativas com senha incorreta. Entre em contato com o administrador."`
* A partir da segunda tentativa errada, informar quantas tentativas ainda restam.
* Quando o bloqueio acontecer, o administrador recebe na hora um aviso dentro do aplicativo: `"O operador [nome] ([login]) bloqueou o acesso por tentativas de senha incorreta"`, com data e hora.
* Para desbloquear, o administrador usa a tela Operadores e define uma nova senha provisória, e o operador troca a senha diretamente no app ao entrar (sem e-mail).
* Se o login digitado não existir, mostrar a mesma mensagem genérica de `"login ou senha incorretos"`, sem revelar se o login existe.

#### Segurança e registro de auditoria
* A contagem de tentativas, o bloqueio, as senhas provisórias e as permissões ficam no backend, e não apenas na tela.
* Senhas sempre armazenadas de forma criptografada (hash), nunca em texto puro, no código público ou nos logs.
* Registrar na auditoria, com data, hora e responsável: autocadastro de operador, cadastro pelo administrador, redefinição de senha, troca de senha pelo operador, bloqueio, desbloqueio, desativação e reativação.

---

## 7. Etapa 5 — Inventário, Painel, Histórico, Relatórios e Alertas

### 7.1 Inventário com bipagem automática
* Iniciar um inventário, identificar o responsável e contar usando a câmera.
* Cada leitura válida soma exatamente uma unidade ao produto; permitir continuar bipando o mesmo produto de propósito (mesma regra da **Seção 3.4**).
* Exibir código, modelo, cor, quantidade contada, quantidade no sistema e diferença.
* Ao concluir, mostrar o resumo das divergências e gerar relatório para conferência.
* **Não alterar o estoque automaticamente:** o ajuste exige confirmação e autorização do administrador. Manter o histórico de cada inventário.

### 7.2 Painel inteligente (preservando o layout existente)
* Total de produtos, produtos disponíveis, estoque baixo, estoque zerado, entradas e saídas do dia, movimentações pendentes de aprovação e últimas movimentações.
* Cada indicador deve abrir a lista correspondente. Dados reais do banco, nunca valores fixos.

### 7.3 Histórico de movimentações
* Filtros por período, produto, código de barras, modelo, cor, operador e tipo (`entrada`, `saída`, `ajuste`, `estorno`), em ordem cronológica, com detalhes de cada movimentação, identificação de quem operou e exportação conforme a permissão do usuário.

### 7.4 Relatórios automáticos (dados reais)
* Produtos mais movimentados, maior saída, maior entrada, sem movimentação em um período, estoque baixo, zerados, movimentações por operador, entradas e saídas por período, ajustes realizados e divergências de inventário.
* Períodos selecionáveis e exportação. Não apresentar estimativas como se fossem movimentações reais.

### 7.5 Alertas e automações
* Avisar quando um produto atingir o estoque mínimo ou chegar a zero; atualizar o alerta após a reposição; informar movimentações pendentes de aprovação; identificar falhas de sincronização e movimentações não concluídas; avisar o administrador sobre divergências de inventário.
* Evitar notificações repetitivas. O administrador pode configurar os alertas, respeitando o limite mínimo padrão já definido no projeto. Notificações dentro do aplicativo quando houver suporte.

### 7.6 Relatório estilo Power BI na aba do administrador
Criar, dentro da aba do administrador que já existe, um relatório interativo no estilo Power BI, com dados reais do banco. Este recurso é um acréscimo autorizado: o restante da interface continua como está (**Seções 1.1 e 1.3**).

#### Regras gerais
* Acesso exclusivo do administrador, protegido no backend: o operador não acessa nem alterando o endereço ou parâmetros no navegador.
* Somente consulta: o relatório não altera o estoque.
* Cores: fundo branco; azul para entradas e destaques principais; vermelho para saídas, estoque zerado e alertas.
* Dados reais, com a indicação `"Atualizado em hh:mm"` e um botão **Atualizar**. Nunca usar valores de exemplo.
* Cálculos feitos no banco ou no servidor, com paginação, indicador de carregamento e mensagem clara quando não houver dados no período.

#### Filtros no topo
* Período (`hoje`, `7 dias`, `30 dias`, `mês atual` e `personalizado`), operador, modelo, cor e tipo de movimentação (`entrada`, `saída`, `ajuste` e `estorno`).
* Os filtros valem para todos os visuais ao mesmo tempo, e há um botão **Limpar filtros**.

#### Interação
* Clicar em uma barra, fatia ou linha filtra os demais visuais (filtro cruzado); clicar de novo remove o filtro. Passar o mouse ou tocar mostra o valor. Clicar em um item abre os detalhes, até chegar à movimentação individual.

#### Visuais
1. **Indicadores (Cartões numéricos no topo):** Total de produtos, unidades em estoque, entradas e saídas do período, saldo líquido, estoque baixo, zerados, sem movimentação, pendentes de aprovação e divergências de inventário.
2. **Entradas e saídas (Colunas agrupadas ou linhas — azul para entradas, vermelho para saídas):** Evolução por dia ou por semana no período.
3. **Mais movimentados (Barras horizontais):** Os 10 produtos com mais movimentação, com opção de ver só maior saída ou maior entrada.
4. **Por operador (Barras):** Movimentações de cada operador, separando entradas e saídas.
5. **Estoque por modelo e cor (Rosca ou mapa de árvore):** Distribuição das unidades em estoque.
6. **Atenção (Tabela com destaque em vermelho para zerado e em vermelho claro para baixo):** Produtos com estoque baixo, zerados e parados (sem movimentação no período configurado).
7. **Detalhe (Tabela paginada com busca):** Movimentações do recorte filtrado: data, hora, produto, código, operador, tipo e quantidade.

#### Exportação e responsividade
* Exportar o recorte atual em **PDF** (para impressão) e em **planilha ou CSV**, conforme a permissão do administrador.
* No celular, os visuais ficam empilhados em uma coluna, com rolagem vertical e filtros recolhíveis. No computador, ficam em grade, vários lado a lado. Os gráficos precisam ser legíveis em tela pequena.
* **Conferência:** os números do relatório devem bater com o histórico de movimentações (**Seção 7.3**) para o mesmo filtro. Quando faltar dado, mostrar vazio, nunca estimar.

---

## 8. Etapa 6 — Desempenho, Testes Finais, Segurança e Publicação

* Otimizar o tempo de abertura da câmera, de decodificação, de pesquisa, de atualização do saldo, de carregamento de produtos, de atualização dos históricos e de sincronização entre dispositivos.
* Não carregar todos os produtos de uma só vez: usar pesquisa eficiente no banco de dados, com filtros e paginação.
* Indicadores de carregamento e mensagens claras em caso de falha.
* Revisar permissões e segurança, executar os testes da **Seção 9**, aplicar as melhorias da **Seção 10** e só então publicar.

---

## 9. Testes Obrigatórios

### Pesquisa na aba ESTOQUE:
1. digitando código;
2. digitando modelo;
3. digitando cor;
4. leitura por câmera;
5. foto tirada na hora;
6. imagem da galeria;
7. Code 128;
8. EAN-13;
9. QR Code;
10. código não cadastrado;
11. foto desfocada;
12. imagem com pouca luz;
13. nova tentativa de leitura;
14. vários produtos em sequência;
15. conferência do saldo exibido;
16. confirmação de que a pesquisa não altera o estoque.

### Testar também:
* câmera ao vivo no iPhone (com o zoom padrão de `3,4x`) e no Android;
* bipagem instantânea e falha de internet;
* movimentações, relatórios e relatório estilo Power BI (números conferindo com o histórico, filtros cruzados e bloqueio para operadores);
* filtros, alertas e inventário;
* entrada e cadastro de operadores direto na tela inicial (validação de erro ao digitar apenas um nome sem sobrenome, escolha livre de login e senha, entrada imediata sem e-mail, alerta ao administrador, redefinição de senha provisória pelo administrador e troca obrigatória direto no app sem e-mail, bloqueio na 3ª tentativa errada e bloqueio de ações administrativas para operadores).

---

## 10. Melhorias para Depois da Câmera Estável

1. **Cadastro de produto por foto:** fotografar a etiqueta e usar o código identificado para iniciar o cadastro, com o campo de código já preenchido. Antes de abrir, verificar se o código já existe. Os demais campos continuam sendo preenchidos ou confirmados por uma pessoa; qualquer sugestão de descrição feita por IA deve vir marcada como sugestão editável. Restrito a quem tem permissão de cadastro.
2. **Consulta de movimentações por operador:** ver quem movimentou cada produto e identificar divergências rapidamente (usa o histórico da **Seção 7.3**).
3. **Aviso de produto sem movimentação:** identificar itens parados no estoque, com período configurável pelo administrador, e incluir no painel e nos relatórios.

---

## 11. Entrega e Critério de Conclusão

Ao final de cada etapa, apresentar: **o que foi implementado**, **o que foi testado (e como)** e **o que ainda não está disponível**.

### Checklist obrigatório ao fim de cada etapa (responder item por item, antes de pedir minha aprovação):
* Todos os itens da etapa foram feitos? Listar um por um, sem deixar nenhum de fora.
* Cada comando, instalação e alteração foi executado com atenção e o resultado foi conferido?
* Cada recurso foi testado e validado, inclusive os casos de erro? Informar como foi testado e o resultado real.
* Algum erro, aviso ou comportamento estranho apareceu? Foi corrigido e testado de novo?
* As funcionalidades existentes continuam funcionando e a interface continua igual à original (exceto a paleta autorizada)?
* Há algo pendente, limitado ou que não funcionou? Se sim, dizer claramente, sem esconder.
* Só então **PARE** e aguarde meu `"pode aplicar"` / `"aprovado"` para a próxima etapa.

> **Nota final:** A pesquisa por foto só é considerada concluída quando uma fotografia real de uma etiqueta for processada, o código correto for identificado e o produto correspondente for localizado no banco de dados. Existir um botão de envio de imagem não conta como conclusão. Preservar todas as funcionalidades existentes do MDO Estoque.
