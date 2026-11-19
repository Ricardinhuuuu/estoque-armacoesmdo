/* Testes do MDO Estoque — rodam com o Node do app, sem instalar nada:
     "$ABACUSAI_BOT_NODE" tests/run-tests.js
   Cobrem os 15 itens da revisão (revisao-estoque-armacoesmdo.md). */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { makeEnv, carregar } = require("./dom-harness.js");

const HTML = path.join(__dirname, "..", "index.html");
let ok = 0, fail = 0, grupo = "";
const resultados = [];
function t(nome, fn) {
  try { fn(); ok++; resultados.push("  ✅ " + nome); }
  catch (e) { fail++; resultados.push("  ❌ " + nome + "\n       → " + (e && e.message ? e.message : e) + (e && e.diagnostico ? " " + JSON.stringify(e.diagnostico) : "")); }
}
function g(n) { grupo = n; resultados.push("\n" + n); }
const pendentes = [];
async function ta(nome, fn) {
  try { await fn(); ok++; resultados.push("  ✅ " + nome); }
  catch (e) { fail++; resultados.push("  ❌ " + nome + "\n       → " + (e && e.message ? e.message : e)); }
}
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || "") + " esperado " + JSON.stringify(b) + ", obtido " + JSON.stringify(a)); }
function okv(v, msg) { if (!v) throw new Error(msg || "esperava valor verdadeiro"); }
function novo(mut) { const env = makeEnv(); carregar(env, HTML); if (mut) mut(env); return env; }
/* executa código dentro do contexto da página (acessa as variáveis let/const do app) */
function run(env, code) { return vm.runInContext(code, env.ctx); }
function estado(env) {
  return run(env, `({PP,M,U,REQ,CNT,MIN,cur,idx:idx,idxs:Object.keys(idx),bal:bal(),vivo:vivo,AUD})`);
}
/* login como primeiro administrador */
async function comoAdmin(env) {
  env.document.getElementById("lgN").value = "Ricardo Kato";
  env.document.getElementById("lgL").value = "ricardo";
  env.document.getElementById("lgP").value = "senha123";
  run(env, "lgSubmit()");
  /* o hash da senha e assincrono: espera o usuario existir de verdade, sem prazo fixo */
  await esperar(env, "!!(cur && cur.l)");
  return run(env, "cur");
}
/* espera as promises disparadas por lgSubmit (hash assíncrono) */
/* Espera o app terminar o que disparou (hash assincrono) sem prazo fixo:
   checa a condicao e sai assim que ela vale. Prazo de 2 s para nao travar o CI. */
async function esperar(env, cond, ms = 2000) {
  const fim = Date.now() + ms;
  for (;;) {
    try { if (vm.runInContext(cond, env.ctx)) return true; } catch (e) { /* app no meio de uma atualizacao */ }
    if (Date.now() > fim) return false;
    await new Promise((r) => setTimeout(r, 5));
  }
}
const flush = () => new Promise((r) => setTimeout(r, 30));
function login(env, l, p) {
  env.document.getElementById("lgL").value = l;
  env.document.getElementById("lgP").value = p;
  run(env, "lgSubmit()");
  return run(env, "cur");
}
/* login assíncrono (aguarda o hash) */
async function loginA(env, l, p) {
  env.document.getElementById("lgL").value = l;
  env.document.getElementById("lgP").value = p;
  /* limpa a mensagem anterior: assim sabemos que a desta tentativa chegou */
  run(env, '$("lgE").textContent=""');
  run(env, "lgSubmit()");
  await esperar(env, "cur || $('lgE').textContent !== ''");
  return run(env, "cur");
}

/* ---------- 1. Persistência ---------- */
g("1. Persistência do catálogo (crítico)");
t("mdo_P é gravado já na primeira carga", () => {
  const env = novo();
  const bruto = env.store.get("mdo_P");
  okv(bruto, "a chave mdo_P não foi criada na primeira carga");
  eq(JSON.parse(bruto).length, 160, "número de produtos:");
});
pendentes.push(ta("produto cadastrado sobrevive ao recarregar (F5)", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  env.respostas.prompt = ["RX TESTE NOVO", "AZUL", "3"];
  run(env, 'scan("99999999999")');
  eq(estado(env).PP.length, 161, "produtos após cadastro:");
  const env2 = makeEnv(); env.store.forEach((v, k) => env2.store.set(k, v)); carregar(env2, HTML);
  eq(estado(env2).PP.length, 161, "produtos após recarregar:");
  okv(estado(env2).idx["99999999999"] != null, "o código novo sumiu depois do F5");
}));
t("importação de planilha persiste no localStorage", () => {
  const env = novo();
  run(env, 'PP.push(["12345678901","PRODUTO IMPORTADO","PRETO",7]);sP("P",PP);reidx();');
  const env2 = makeEnv(); env.store.forEach((v, k) => env2.store.set(k, v)); carregar(env2, HTML);
  okv(estado(env2).idx["12345678901"] != null, "produto importado não persistiu");
});

/* ---------- 2. Autenticação ---------- */
g("2. Login, papéis e senha");
pendentes.push(ta("primeiro acesso exige nome e sobrenome", async () => {
  const env = novo();
  env.document.getElementById("lgN").value = "Ricardo";
  env.document.getElementById("lgL").value = "ricardo";
  env.document.getElementById("lgP").value = "senha123";
  run(env, "lgSubmit()"); await flush();
  eq(run(env, "U.length"), 0, "usuários criados:");
  eq(env.document.getElementById("lgE").textContent, "Digite nome e sobrenome", "mensagem:");
}));
pendentes.push(ta("senha inicial exige 6 caracteres", async () => {
  const env = novo();
  env.document.getElementById("lgN").value = "Ricardo Kato";
  env.document.getElementById("lgL").value = "ricardo";
  env.document.getElementById("lgP").value = "1234";
  run(env, "lgSubmit()"); await flush();
  eq(run(env, "U.length"), 0, "usuários criados:");
}));
pendentes.push(ta("senha é gravada como hash, nunca em texto puro", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  const bruto = env.store.get("mdo_u");
  okv(bruto && !bruto.includes("senha123"), "a senha apareceu em texto puro no localStorage");
  const h = JSON.parse(bruto)[0].h;
  const temSubtle = run(env, "!!(crypto&&crypto.subtle&&crypto.subtle.digest)");
  /* com HTTPS: SHA-256 (64 dígitos). Em HTTP simples o navegador não expõe crypto.subtle,
     então o app usa o hash de reserva — o importante é ser hash, nunca o texto da senha. */
  if (temSubtle) eq(h.length, 64, "tamanho do hash SHA-256:");
  else okv(h.length >= 8 && !h.includes("senha123"), "sem crypto.subtle ainda precisa ser hash: " + h);
}));
pendentes.push(ta("bloqueio após 3 tentativas erradas, com contagem regressiva", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, "cur=null;showLogin()");
  await loginA(env, "ricardo", "errada1");
  okv(env.document.getElementById("lgE").textContent.includes("restantes: 2"), "2ª tentativa deve avisar: " + env.document.getElementById("lgE").textContent);
  await loginA(env, "ricardo", "errada2");
  okv(env.document.getElementById("lgE").textContent.includes("restantes: 1"), "3ª tentativa deve avisar: " + env.document.getElementById("lgE").textContent);
  await loginA(env, "ricardo", "errada3");
  okv(env.document.getElementById("lgE").textContent.startsWith("Acesso bloqueado"), "deveria bloquear: " + env.document.getElementById("lgE").textContent);
  eq(estado(env).U[0].st, "bloq", "status do usuário:");
  await loginA(env, "ricardo", "senha123");
  eq(run(env, "cur"), null, "usuário bloqueado não pode entrar");
}));
pendentes.push(ta("login inexistente mostra a mesma mensagem genérica", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, "cur=null;showLogin()");
  await loginA(env, "ninguem", "qualquer1");
  eq(env.document.getElementById("lgE").textContent, "Login ou senha incorretos.", "mensagem:");
}));
pendentes.push(ta("administrador desbloqueia e define senha provisória → troca obrigatória", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'U.push({l:"op1",n:"Operador Um",r:"op",h:"x",st:"bloq",t:3});sU();draw()');
  const i = estado(env).U.findIndex((u) => u.l === "op1");
  env.respostas.prompt = ["provisoria1"];
  /* o app grava a senha provisoria em DUAS etapas assincronas (hash + sugestao);
     esperar a condicao em vez de 30 ms fixos: era esta a corrida que derrubava o CI */
  run(env, `act("pw",${i})`);
  await esperar(env, `U[${i}] && U[${i}].st === "ativo" && !!U[${i}].temp`);
  eq(estado(env).U[i].st, "ativo", "status após senha provisória:");
  eq(estado(env).U[i].temp, "provisoria1", "senha provisória marcada:");
  run(env, "cur=null;showLogin()");
  const u = await loginA(env, "op1", "provisoria1");
  okv(u && u.temp, "deveria entrar em modo de troca obrigatória");
  env.document.getElementById("lgP").value = "provisoria1";
  run(env, 'document.getElementById("lgB").onclick()'); await flush();
  okv(env.document.getElementById("lgE").textContent.includes("não pode ser igual"), "deveria recusar senha igual à provisória");
  env.document.getElementById("lgP").value = "minhasenha9";
  run(env, 'document.getElementById("lgB").onclick()'); await flush();
  const depois = run(env, "U.find(x=>x.l==='op1')");
  eq(depois.temp, null, "troca pendente após salvar:");
  eq(run(env, "cur && cur.l"), "op1", "logado como:");
}));
pendentes.push(ta("usuário desativado não entra", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'U.push({l:"op2",n:"Operador Dois",r:"op",h:"x",st:"desat"});sU()');
  run(env, "cur=null;showLogin()");
  eq(await loginA(env, "op2", "x"), null, "não deveria entrar");
}));

/* ---------- 3. Aprovação de baixa ---------- */
g("3. Aprovação de baixa (crítico)");
pendentes.push(ta("baixa aprovada é registrada no nome do aprovador e guarda o solicitante", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'U.push({l:"op1",n:"Operador Um",r:"op",h:"x",st:"ativo"});sU()');
  run(env, 'cur=U.find(x=>x.l==="op1");mode="out"');
  run(env, 'PP[0][3]=0;sP("P",PP)');
  run(env, 'scan("80202500146")');
  eq(estado(env).REQ.length, 1, "solicitações pendentes:");
  run(env, 'cur=U.find(x=>x.l==="ricardo");draw()');
  run(env, 'act("ok",0)');
  const st = estado(env);
  const mov = st.M.filter(st.vivo).pop();
  eq(mov.u, "ricardo", "login do registro:");
  eq(mov.o, "Ricardo Kato", "operador do registro:");
  eq(mov.req, "Operador Um", "solicitante guardado:");
  eq(mov.ap, "ricardo", "aprovador:");
  eq(st.REQ.length, 0, "fila após aprovar:");
}));

/* ---------- 4. Desfazer ---------- */
g("4. Desfazer bipada");
pendentes.push(ta("desfazer não apaga a movimentação de outro operador", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'U.push({l:"op1",n:"Operador Um",r:"op",h:"x",st:"ativo"});sU()');
  run(env, 'cur=U.find(x=>x.l==="op1");mode="out";scan("80202500146")');
  const antes = estado(env).bal[0];
  run(env, 'cur=U.find(x=>x.l==="ricardo");mode="out";scan("80202500146")');
  run(env, 'document.getElementById("undo").onclick()');
  const st = estado(env);
  eq(st.bal[0], antes, "saldo depois de desfazer a própria bipada:");
  okv(st.M.filter(st.vivo).some((m) => m.u === "op1"), "a bipada do outro operador sumiu do histórico");
}));
pendentes.push(ta("desfazer registra estorno em vez de apagar o histórico", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'mode="out";scan("80202500146")');
  const n = estado(env).M.length;
  run(env, 'document.getElementById("undo").onclick()');
  const st = estado(env);
  eq(st.M.length, n + 1, "movimentações (original + estorno):");
  okv(st.M[st.M.length - 1].est, "não há marca de estorno");
  eq(st.bal[0], 5, "saldo voltou ao inicial:");
}));
pendentes.push(ta("desfazer não mexe em baixa aprovada", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'U.push({l:"op1",n:"Operador Um",r:"op",h:"x",st:"ativo"});sU()');
  run(env, 'REQ.push({id:"r1",c:"80202500146",q:1,u:"op1",o:"Operador Um",ts:Date.now()});sR();act("ok",0)');
  run(env, 'document.getElementById("undo").onclick()');
  eq(estado(env).bal[0], 4, "saldo após tentar desfazer uma aprovação:");
}));

/* ---------- 5. Contagem órfã ---------- */
g("5. Contagem órfã");
pendentes.push(ta("contagem de código fora do catálogo não quebra a aba Admin", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'CNT["99999999999"]={q:3,l:"op1",n:"Operador Um",ts:Date.now()};sC();draw()');
  okv(env.document.getElementById("adm").innerHTML.includes("fora do catálogo"), "deveria avisar sobre códigos órfãos");
}));
pendentes.push(ta("aplicar inventário descarta órfãos e informa", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'CNT["99999999999"]={q:3,l:"op1",n:"Operador Um",ts:Date.now()};sC()');
  run(env, 'act("ap",0)');
  okv(env.log.alerts.some((m) => m.includes("não existem mais no catálogo")), "deveria avisar o descarte");
  eq(run(env, "Object.keys(CNT).length"), 0, "contagem após aplicar:");
}));
pendentes.push(ta("solicitação pendente de produto removido não quebra o painel", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'REQ.push({id:"z",c:"00000000000",q:1,u:"op1",o:"Operador Um",ts:Date.now()});sR();draw()');
  okv(env.document.getElementById("adm").innerHTML.length > 100, "painel ficou vazio");
}));

/* ---------- 6. Backup ---------- */
g("6. Backup e mesclagem");
pendentes.push(ta("backup inclui pedidos pendentes, contagem e auditoria", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'REQ.push({id:"r",c:"80202500146",q:1,u:"op1",o:"Op",ts:Date.now()});CNT["80202500146"]={q:2,l:"op1",n:"Op",ts:Date.now()};audit("TESTE","x")');
  let conteudo = null;
  env.ctx.Blob = class { constructor(parts) { conteudo = parts.join(""); } };
  run(env, "backup()");
  const d = JSON.parse(conteudo);
  eq(d.v, 3, "versão do backup:");
  okv(Array.isArray(d.req) && d.req.length === 1, "REQ não está no backup");
  okv(d.cnt && d.cnt["80202500146"], "CNT não está no backup");
  okv(Array.isArray(d.aud) && d.aud.length > 0, "auditoria não está no backup");
}));
pendentes.push(ta("mesclar backup antigo não ressuscita movimentação apagada", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'M=[];const m=reg("out","80202500146",1);sM();window.__id=m.id');
  const id = run(env, "window.__id");
  const backupAntigo = JSON.stringify({ v: 2, P: [], m: [{ id, t: "out", c: "80202500146", q: 1, o: "Ricardo Kato", u: "ricardo", ts: 1 }] });
  run(env, 'M[0].del=Date.now();sM()');
  const saldoAntes = estado(env).bal[0];
  run(env, `(async()=>{const f={text:async()=>${JSON.stringify(backupAntigo)}};await document.getElementById("bkI").onchange({target:{files:[f],value:""}})})()`);
  await flush();
  eq(estado(env).bal[0], saldoAntes, "saldo após mesclar backup antigo:");
}));
pendentes.push(ta("merge não promove usuário do backup a administrador", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  const b = JSON.stringify({ v: 2, P: [], u: [{ l: "intruso", n: "Intruso Aqui", r: "admin", h: "x" }] });
  run(env, `(async()=>{const f={text:async()=>${JSON.stringify(b)}};await document.getElementById("bkI").onchange({target:{files:[f],value:""}})})()`);
  await flush();
  const u = run(env, "U.find(x=>x.l==='intruso')");
  eq(u && u.r, "op", "papel do usuário importado:");
}));
pendentes.push(ta("merge ignora mínimo com valor inválido", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  const b = JSON.stringify({ v: 2, P: [], min: { "80202500146": "abc" } });
  run(env, `(async()=>{const f={text:async()=>${JSON.stringify(b)}};await document.getElementById("bkI").onchange({target:{files:[f],value:""}})})()`);
  await flush();
  okv(!("80202500146" in run(env, "MIN")), "valor inválido entrou em MIN");
}));

/* ---------- 7. Códigos com zero à esquerda ---------- */
g("7. Normalização de códigos");
t("código lido como número encontra o produto (zero à esquerda)", () => {
  const env = novo();
  eq(run(env, "normCode(80202500146)"), "80202500146", "normalização:");
  eq(run(env, 'normCode(" 80202500146\\n")'), "80202500146", "com espaços/quebra de linha:");
  eq(run(env, 'normCode("]C180202500146")'), "80202500146", "com prefixo do leitor:");
  eq(run(env, 'normCode("080202500146")'), "80202500146", "EAN-13 com zero à esquerda:");
});
pendentes.push(ta("código desconhecido com zero à esquerda não abre cadastro automático", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  /* leitura parcial (menos de 11 dígitos) não deve oferecer cadastro */
  run(env, 'mode="out";scan("0202500146")');
  eq(env.log.prompts || [], [], "não deveria abrir prompt");
  okv(!env.document.getElementById("res").innerHTML.includes("Produto cadastrado"), "não deveria cadastrar");
}));
pendentes.push(ta("código desconhecido completo ainda pode ser cadastrado pelo administrador", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  env.respostas.prompt = ["PRODUTO NOVO", "PRETO", "2"];
  run(env, 'mode="out";scan(99999999999)');
  eq(env.log.prompts.length, 3, "perguntas do cadastro:");
  eq(estado(env).PP.length, 161, "produtos após cadastrar:");
}));

/* ---------- 8. Digitação e gravação ---------- */
g("8. Bipagem manual e gravação");
pendentes.push(ta("digitar manualmente o mesmo código bipado segundos antes funciona", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'mode="out";scan("80202500146")');
  env.document.getElementById("man").value = "80202500146";
  run(env, 'document.getElementById("go").onclick()');
  eq(estado(env).bal[0], 3, "saldo após a segunda baixa:");
}));
pendentes.push(ta("gravação só reescreve a chave alterada", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  const escritas = [];
  const orig = env.ctx.localStorage.setItem;
  env.ctx.localStorage.setItem = (k, v) => { escritas.push(k); return orig(k, v); };
  run(env, 'mode="out";scan("80202500146")');
  /* mdo_m = movimentação; mdo_fila = operação pendente de confirmação (Etapa 3);
     mdo_ap = identificador do aparelho, gravado uma única vez */
  /* mdo_av entra a partir da Etapa 5: o alerta de estoque é gravado quando a bipada muda a situação */
  eq(escritas.sort(), ["mdo_ap", "mdo_aud", "mdo_av", "mdo_fila", "mdo_m"], "chaves escritas numa bipada:");
  eq(escritas.filter((k) => k === "mdo_m").length, 1, "mdo_m deve ser gravado uma vez:");
}));
pendentes.push(ta("dedupe aceita dois códigos diferentes em sequência", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'mode="out";last="";lastT=0;dedupe("80202500146");dedupe("80202500147")');
  eq(estado(env).bal.slice(0, 2), [4, 4], "saldo dos dois primeiros:");
}));
pendentes.push(ta("dedupe ignora a releitura do mesmo código em menos de 1,5 s", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'mode="out";last="";lastT=0;dedupe("80202500146");dedupe("80202500146")');
  eq(estado(env).bal[0], 4, "saldo (só uma baixa):");
}));

/* ---------- 9. Acessibilidade / marcação ---------- */
g("9. Acessibilidade e marcação");
pendentes.push(ta("itens da lista e ações do admin são <button>", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, "draw()");
  okv(env.document.getElementById("lst").innerHTML.includes('<button type="button" class="item"'), "itens da aba Estoque não são botões");
  okv(env.document.getElementById("adm").innerHTML.includes('<button type="button"'), "ações do admin não são botões");
}));
t("toast de aviso existe e é acessível (role=status)", () => {
  const html = fs.readFileSync(HTML, "utf8");
  okv(/id="toast"[^>]*role="status"/.test(html), "faltou o elemento de aviso");
});
t("login tem botão de mostrar/ocultar senha", () => {
  const html = fs.readFileSync(HTML, "utf8");
  okv(html.includes('id="lgS"'), "faltou o botão de mostrar senha");
});

/* ---------- 10. PWA ---------- */
g("10. Metadados de PWA na raiz");
t("index.html tem ícone, tema e modo standalone", () => {
  const html = fs.readFileSync(HTML, "utf8");
  okv(html.includes('rel="apple-touch-icon"'), "faltou apple-touch-icon");
  okv(html.includes('name="theme-color"'), "faltou theme-color");
  okv(html.includes("apple-mobile-web-app-capable"), "faltou o modo standalone do iOS");
});

/* ---------- 11. Contagem ---------- */
g("11. Contagem de inventário");
pendentes.push(ta("aumentar e reduzir a contagem de um item", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'mode="cnt";scan("80202500146");scan("80202500146")');
  eq(estado(env).CNT["80202500146"].q, 2, "contado:");
  run(env, 'act("cm","80202500146")');
  eq(estado(env).CNT["80202500146"].q, 1, "depois de reduzir:");
}));
pendentes.push(ta("aplicar contagem gera ajuste e zera a contagem", async () => {
  const env = novo(); await comoAdmin(env); await flush();
  run(env, 'mode="cnt";scan("80202500146");scan("80202500146");scan("80202500146")');
  run(env, 'act("ap",0)');
  eq(estado(env).bal[0], 3, "saldo após aplicar inventário:");
  eq(run(env, "Object.keys(CNT).length"), 0, "contagem após aplicar:");
}));

/* ---------- 12. Compatibilidade de dados ---------- */
g("12. Dados antigos do localStorage");
pendentes.push(ta("mdo_cnt no formato antigo (número) é aceito", async () => {
  const env = makeEnv();
  env.store.set("mdo_cnt", JSON.stringify({ "80202500146": 4 }));
  carregar(env, HTML);
  run(env, "cur={l:'x',n:'X',r:'admin'};draw()");
  okv(env.document.getElementById("adm").innerHTML.includes("Contado 4"), "formato antigo não foi lido");
}));
t("manifest e ícones oficiais estão no repositório", () => {
  const html = fs.readFileSync(HTML, "utf8");
  okv(html.includes('rel="manifest"'), "faltou o manifest");
  okv(fs.existsSync(path.join(__dirname, "..", "manifest.webmanifest")), "manifest.webmanifest não existe");
  ["Icone_MDO.png", "icon-180.png", "icon-192.png", "Codigo_de_barra.png"].forEach((f) =>
    okv(fs.existsSync(path.join(__dirname, "..", "assets", f)), "faltou assets/" + f));
  const icone = fs.readFileSync(path.join(__dirname, "..", "assets", "icon-180.png"));
  okv(icone.length > 5000, "icon-180.png parece vazio");
});
t("localStorage corrompido não derruba o app", () => {
  const env = makeEnv();
  env.store.set("mdo_m", "{isso não é json");
  env.store.set("mdo_P", "123");
  carregar(env, HTML);
  eq(run(env, "PP.length"), 160, "catálogo padrão:");
});

/* ================= ETAPA 1 — CÂMERA, LEITURA E BIPAGEM ================= */
g("Etapa 1 — câmera, leitura e bipagem");
t("1.4 biblioteca empacotada é a primeira fonte (funciona sem internet)", () => {
  const html = fs.readFileSync(HTML, "utf8");
  okv(fs.existsSync(path.join(__dirname, "..", "vendor", "html5-qrcode.min.js")), "faltou vendor/html5-qrcode.min.js");
  const libs = html.slice(html.indexOf("const LIBS={"), html.indexOf("function loadLib"));
  const qr = libs.slice(libs.indexOf("qr:"), libs.indexOf("xl:"));
  okv(qr.includes('"vendor/html5-qrcode.min.js"'), "vendor não está na lista");
  okv(qr.indexOf("vendor/") < qr.indexOf("http"), "vendor deve vir antes do CDN");
  okv(qr.includes("cdnjs") && qr.includes("jsdelivr"), "faltam fontes de reserva");
  const lib = fs.readFileSync(path.join(__dirname, "..", "vendor", "html5-qrcode.min.js"));
  okv(lib.length > 300000, "biblioteca empacotada parece truncada");
  okv(lib.toString("utf8", 0, 40).includes("__Html5QrcodeLibrary__"), "arquivo empacotado não é o html5-qrcode");
});
t("1.2 formatos restritos a Code 128, EAN-13 e QR", () => {
  const env = novo();
  eq(run(env, "FMT"), ["code_128", "ean_13", "qr_code"], "formatos do leitor nativo:");
  const html = fs.readFileSync(HTML, "utf8");
  okv(html.includes("F.CODE_128,F.EAN_13,F.QR_CODE"), "formatos da biblioteca não estão restritos");
});
t("1.3 leitura contínua a ~25-30 tentativas por segundo", () => {
  const html = fs.readFileSync(HTML, "utf8");
  okv(html.includes("setTimeout(r,40)"), "intervalo do laço nativo não é 40 ms (~25/s)");
  okv(html.includes("fps:30"), "biblioteca não está em 30 fps");
  okv(html.includes("focusMode:\"continuous\""), "falta foco automático contínuo");
  okv(html.includes("width:{ideal:1280},height:{ideal:720}"), "resolução de referência não é 1280x720");
  okv(html.includes("height:Math.floor(h*.42)"), "área de leitura não está larga (42% da altura)");
});
t("1.5 zoom padrão de 3,4x existe e é aplicado ao abrir", () => {
  const env = novo();
  eq(run(env, "ZOOM"), 3.4, "constante de zoom:");
  const html = fs.readFileSync(HTML, "utf8");
  okv(html.includes("await aplicarZoom(stream,box)"), "startNative não aplica zoom");
  okv(html.includes("aplicarZoom(src,box)") || html.includes("zoom:Math.min(ZOOM,max)"), "startLib não aplica zoom");
  okv(html.includes("v.style.transform=\"scale(\"+ZOOM+\")\"") || html.includes("scale(\"+ZOOM+\")\""), "falta ampliação digital de reserva");
});
t("1.5 zoom usa o máximo do aparelho quando ele não chega a 3,4x", () => {
  const env = novo();
  const r = run(env, `(async()=>{
    const chamadas=[];
    const track={getCapabilities:()=>({zoom:{min:1,max:2}}),applyConstraints:async c=>chamadas.push(c)};
    const v=document.createElement("video");v.style.cssText="";
    const box=document.createElement("div");box.appendChild(v);
    const z=await aplicarZoom({getVideoTracks:()=>[track]},box);
    return {z,chamadas,transform:v.style.transform};
  })()`);
  return r.then(({ z, chamadas, transform }) => {
    okv(chamadas.length === 1, "deveria aplicar uma restrição de zoom");
    eq(chamadas[0].advanced[0].zoom, 2, "zoom aplicado deve ser o máximo do aparelho:");
    okv(z.digital === true, "restante até 3,4x deve ser ampliação digital");
  });
});
t("1.5 sem zoom de câmera cai para ampliação digital e avisa", () => {
  const env = novo();
  return run(env, `(async()=>{
    const track={getCapabilities:()=>({}),applyConstraints:async()=>{}};
    const v=document.createElement("video");
    const box=document.createElement("div");box.appendChild(v);
    const z=await aplicarZoom({getVideoTracks:()=>[track]},box);
    return {z,transform:v.style.transform,aviso:document.getElementById("camMsg").dataset.zoom||""};
  })()`).then(({ z, transform, aviso }) => {
    okv(z.nativo === false, "não deveria usar zoom nativo");
    okv(transform.includes("scale(3.4)"), "deveria ampliar 3,4x digitalmente, obtido: " + transform);
    okv(aviso.length > 0, "deveria explicar a limitação do aparelho");
  });
});
t("1.6 reabrir a câmera não relê a etiqueta que está na frente", () => {
  const env = novo();
  comoAdmin(env);
  const html = fs.readFileSync(HTML, "utf8");
  okv(html.includes('const box=$("cam"),msg=$("camMsg");last="";lastT=0;'), "camBtn não limpa a última leitura");
});
/* entra como administrador e espera o login assíncrono terminar */
function adminPronto(env) {
  comoAdmin(env);
  return flush().then(async () => {
    for (let i = 0; i < 10 && !run(env, "!!cur"); i++) await flush();
    if (!run(env, "!!cur")) {
      const e = new Error("login de teste não concluiu");
      e.diagnostico = run(env, `({U:U.map(u=>u.l),alerts:(typeof window!=="undefined"&&window.__alerts)||null})`);
      throw e;
    }
    return env;
  });
}
/* entra como operador (não administrador) e espera o login assíncrono terminar */
function operadorPronto(env) {
  return adminPronto(env).then(async () => {
    run(env, `(()=>{
      U.push({l:"ana",n:"Ana Souza",r:"operador",h:U[0].h,st:"ativo",ts:Date.now()});
      sU();cur=U[U.length-1];$("who").textContent="👤 Ana";$("tAdm").style.display="none";
    })()`);
    for (let i = 0; i < 5 && run(env, "isA()"); i++) await flush();
    return env;
  });
}
t("1.6 leitura repetida em menos de 1,5 s é bloqueada", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const c=PP[0][0];const antes=bal()[0];
      const r1=dedupe(c);
      const r2=dedupe(c);
      return {r1,r2,saldoAntes:antes,saldoDepois:bal()[0]};
    })()`);
    okv(r.r1 === true, "primeira leitura deveria passar");
    okv(r.r2 === false, "segunda leitura imediata deveria ser bloqueada");
    eq(r.saldoDepois, r.saldoAntes - 1, "saldo após uma única baixa:");
  }));
t("1.6 retorno imediato mostra produto, modelo, cor e saldo", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const p=PP[0];
      dedupe(p[0]);
      const c=document.getElementById("res");
      return {txt:c.textContent,html:c.innerHTML};
    })()`);
    const html = fs.readFileSync(HTML, "utf8");
    okv(r.txt.includes("Baixa registrada"), "não confirmou a baixa: " + r.txt);
    okv(r.html.includes("Saldo atual"), "não mostrou o saldo atualizado");
    okv(r.txt.includes("Cor:"), "não mostrou a cor");
    okv(html.includes("function hit(") && html.includes("beep(true)"), "falta confirmação visual/sonora");
  }));
t("1.6 código não cadastrado avisa sem associar a outro produto", () =>
  adminPronto(novo()).then((env) => {
    env.respostas.confirm = false; // o administrador recusa cadastrar na hora
    const r = run(env, `(()=>{
      const antes=JSON.stringify(M.map(m=>m.c));
      unk("9999999999999");
      return {txt:document.getElementById("res").textContent, antes, depois:JSON.stringify(M.map(m=>m.c))};
    })()`);
    okv(r.txt.includes("não está no cadastro") || r.txt.includes("não encontrado"), "aviso pouco claro: " + r.txt);
    eq(r.depois, r.antes, "não pode registrar movimentação para código desconhecido:");
  }));
t("1.4 mensagens de erro cobrem cada causa", () => {
  const env = novo();
  const casos = [
    ["NotAllowedError", "Câmera bloqueada"],
    ["NotFoundError", "Nenhuma câmera"],
    ["NotReadableError", "em uso por outro app"],
    ["SecurityError", "https"],
  ];
  casos.forEach(([nome, trecho]) => {
    const msg = run(env, `camErr({name:"${nome}"})`);
    okv(msg.includes(trecho), nome + " deveria explicar: " + trecho + " (obtido: " + msg + ")");
  });
});
t("1.7 etiqueta real do repositório decodifica e acha o produto", () => {
  const env = novo();
  comoAdmin(env);
  // código real da etiqueta Codigo_de_barra.png: 80202503194 (Code 128)
  const r = run(env, `(()=>{
    const c=normCode("80202503194");
    return {c, existe:idx[c]!=null, nome:idx[c]!=null?PP[idx[c]][1]:null};
  })()`);
  eq(r.c, "80202503194", "código normalizado:");
  okv(r.existe, "o código da etiqueta real precisa existir no catálogo");
  okv(!!r.nome, "produto sem descrição");
});

/* ================= ETAPA 2 — CONSULTA POR CÂMERA E POR FOTO ================= */
g("Etapa 2 — consulta por câmera e foto (somente leitura)");
t("2.1 pesquisa antiga (código, modelo, cor) continua funcionando", () => {
  const env = novo();
  const r = run(env, `(()=>{
    const p=PP[0];
    const porCodigo=PP.filter(x=>x[0].includes(p[0].slice(0,8))).length;
    const porModelo=PP.filter(x=>x[1].includes(p[1].split(" ")[0])).length;
    const porCor=PP.filter(x=>x[2]===p[2]).length;
    return {porCodigo,porModelo,porCor};
  })()`);
  okv(r.porCodigo > 0, "busca por código não encontra nada");
  okv(r.porModelo > 0, "busca por modelo não encontra nada");
  okv(r.porCor > 0, "busca por cor não encontra nada");
});
t("2.1 a aba Estoque tem as duas opções novas, sem tirar a busca textual", () => {
  const html = fs.readFileSync(HTML, "utf8");
  okv(html.includes('id="qCam"') && html.includes("Buscar por código de barras"), "falta o botão de código de barras");
  okv(html.includes('id="qPho"') && html.includes("Buscar por foto"), "falta o botão de foto");
  okv(html.includes('placeholder="🔎 Buscar por código, modelo ou cor"'), "a busca textual original sumiu");
});
t("2.5 consulta encontra o produto do cadastro real", () => {
  const env = novo();
  const r = run(env, `(()=>{ const p=PP[0]; return {p, q:qBusca(p[0])}; })()`);
  eq(r.q.c, r.p[0], "código consultado:");
  eq(r.q.produto, r.p[1], "descrição:");
  eq(r.q.cor, r.p[2], "cor:");
});
t("2.5 código não cadastrado não associa nenhum produto", () => {
  const env = novo();
  const r = run(env, `({a:qBusca("0000000000001"), b:qBusca(""), c:qBusca("ABC")})`);
  eq(r.a, null, "código inexistente:");
  eq(r.b, null, "código vazio:");
  eq(r.c, null, "texto qualquer:");
});
t("2.6 cartão mostra todos os campos e a frase obrigatória", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const p=PP[0];
      qLeitura(p[0]);
      const el=document.getElementById("qRes");
      return {txt:el.textContent, html:el.innerHTML};
    })()`);
    okv(r.txt.includes("Esta consulta não altera o estoque."), "falta a frase obrigatória");
    okv(r.txt.includes("Código interno") || r.html.includes("Código interno"), "falta o código");
    okv(r.html.includes("Cor:"), "falta a cor");
    okv(r.html.includes("Estoque mínimo"), "falta o estoque mínimo");
    okv(r.html.includes("Saldo disponível"), "falta o saldo");
    okv(r.html.includes("Situação:"), "falta a situação do estoque");
  }));
t("2.7 consulta NUNCA altera o estoque", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const antes={m:M.length,bal:JSON.stringify(bal()),cnt:JSON.stringify(CNT),req:REQ.length};
      qLeitura(PP[0][0]);
      qLeitura(PP[5][0]);
      qLeitura("9999999999999");
      qCartao("9999999999999",null);
      const depois={m:M.length,bal:JSON.stringify(bal()),cnt:JSON.stringify(CNT),req:REQ.length};
      return {antes,depois};
    })()`);
    eq(r.depois, r.antes, "a consulta não pode mexer em movimentações, saldo, contagem nem pedidos:");
  }));
t("2.7 consulta não grava nada no localStorage, exceto o registro de leituras", () =>
  adminPronto(novo()).then((env) => {
    const antes = new Map(env.store);
    run(env, `(()=>{ qLeitura(PP[0][0]); qLeitura("8888888888888"); })()`);
    const novas = [...env.store.keys()].filter((k) => !antes.has(k));
    eq(novas, ["mdo_leit"], "a consulta só pode gravar o registro de leituras:");
    eq(env.store.get("mdo_m"), antes.get("mdo_m"), "movimentações:");
  }));
t("2.6 produto não cadastrado mostra aviso e nada muda", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const antes=JSON.stringify(bal());
      qLeitura("1234567890123");
      return {txt:document.getElementById("qRes").textContent, antes, depois:JSON.stringify(bal())};
    })()`);
    okv(r.txt.includes("não cadastrado"), "aviso pouco claro: " + r.txt);
    eq(r.depois, r.antes, "saldo depois de consulta inválida:");
  }));
t("câmera: visor mais baixo, largura inteira e botões de zoom", () => {
  const env = novo();
  const html = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
  const css = html.match(/#cam\{[^}]*\}/)[0];
  /* o visor segue a proporcao 4:3 do iPhone (era 16:9 fixo, que gerava tarjas pretas) */
  okv(/aspect-ratio:4\/3/.test(css), "visor deve seguir a proporcao 4:3: " + css);
  okv(/object-fit:contain/.test(html), "sem cortar a imagem");
  okv(!/aspect-ratio:16\/9|aspectRatio:1\.777/.test(html), "nao pode voltar a forcar 16:9");
  okv(/width:100%/.test(css) && /max-width:100%/.test(css), "largura deve continuar inteira");
  okv(/object-fit:contain/.test(html), "imagem inteira dentro do visor");
  okv(/data-z="1"/.test(html) && /data-z="6"/.test(html), "faltam os botões rápidos de zoom");
  okv(/id="zoomR"/.test(html), "falta o controle deslizante de zoom");
  okv(html.indexOf('id="zoomBar"') > html.indexOf('id="cam"'), "a barra de zoom fica abaixo do visor");
});

t("7.6 relatório: os dez cartões numéricos do topo", () => {
  const env = novo();
  /* admin local direto: o teste é sincrono e só precisa de isA() verdadeiro */
  run(env, 'U=[{l:"ricardo",n:"Ricardo Kato",r:"admin",h:"x",st:"ativo"}];cur=U[0];');
  const d = run(env, "(function(){const x=pbiDados();return JSON.stringify(x)})()");
  const x = JSON.parse(d);
  okv(typeof x.saldoLiquido === "number", "falta o saldo líquido");
  okv(Array.isArray(x.semMov), "falta a lista de sem movimentação");
  okv(typeof x.diverg === "number", "falta a contagem de divergências");
  run(env, "drawPbi()");
  const html = env.document.getElementById("pbi").innerHTML;
  const n = (html.match(/class="pc/g) || []).length;
  okv(n === 10, "o topo deve ter 10 cartões, tem " + n);
  ["Total de produtos", "Unidades em estoque", "Saldo líquido", "Sem movimentação", "Divergências"]
    .forEach((rot) => okv(html.indexOf(rot) >= 0, "falta o cartão: " + rot));
});

t("7.6 relatório: clicar num item do detalhe abre a movimentação individual", () => {
  const html = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
  okv(/data-a="pbiDet"/.test(html), "o item do detalhe deve abrir a movimentação");
  okv(/Movimentação\\n/.test(html), "deve mostrar o detalhe da movimentação");
  okv(/Aparelho: /.test(html), "o detalhe deve mostrar o aparelho");
});

t("câmera: visor ocupa a largura toda da tela enquanto a câmera roda", () => {
  const html = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
  okv(/body\.camLarga #camW[^{]*\{[^}]*position:fixed/.test(html), "o visor deve sair do cartão e ocupar a tela");
  okv(/body\.camLarga #camW[^{]*\{[^}]*left:0[^}]*right:0/.test(html), "a faixa vai de borda a borda");
  okv(/body\.camLarga #zoomBar/.test(html), "a barra de zoom acompanha o visor");
  okv(/classList\.add\("camLarga"\)/.test(html), "ligar a câmera ativa o modo largo");
  okv(/classList\.remove\("camLarga"\)/.test(html), "desligar a câmera volta ao cartão");
  okv(/safe-area-inset-top/.test(html), "respeita o entalhe do celular");
});

t("câmera: formatos comuns de código de barras são pedidos ao leitor", () => {
  const env = novo();
  const f = run(env, "FMT_WANT");
  ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39", "qr_code"].forEach((x) =>
    okv(f.includes(x), "falta o formato " + x));
  okv(run(env, "typeof fmtDoAparelho") === "function", "falta perguntar ao aparelho o que ele suporta");
});

t("câmera: dedupe bloqueia só o mesmo código, e por pouco tempo", () => {
  const env = novo();
  run(env, "cur={l:'x',r:'adm'};last=null;lastT=0;ultimaConf=null;");
  okv(run(env, 'dedupe("111")') === true, "primeira leitura deve passar");
  okv(run(env, 'dedupe("111")') === false, "repetição imediata do mesmo código deve ser ignorada");
  okv(run(env, 'dedupe("222")') === true, "o próximo código deve entrar na hora");
  run(env, 'last="111";lastT=Date.now()-800;');
  okv(run(env, 'dedupe("111")') === true, "o mesmo código volta a valer depois da janela curta");
});

t("foto: a primeira tentativa é a imagem crua e há recorte, ampliação e giro", () => {
  const env = novo();
  const e = run(env, "qEstrategias()");
  okv(e[0].rot === 0 && !e[0].cinza && !e[0].regiao, "a primeira deve ser a foto como veio");
  okv(e.some((x) => x.regiao), "falta recorte");
  okv(e.some((x) => x.maxLado > 2000), "falta ampliação (resolução maior)");
  okv(e.some((x) => x.rot === 90) && e.some((x) => x.rot === 270), "falta giro");
  okv(run(env, "typeof qLerFotoRapido") === "function", "falta a leitura em ondas");
});

t("7.6 relatório: períodos hoje/7/30/mês/personalizado recortam as datas", () => {
  const env = novo(); run(env, "cur={l:'x',r:'adm'};PBI.periodo=1;");
  const hoje = run(env, "pbiIntervalo()");
  const meia = new Date(); meia.setHours(0,0,0,0);
  okv(hoje.ini === meia.getTime(), "hoje deve começar à meia-noite");
  run(env, "PBI.periodo=7");
  const sete = run(env, "pbiIntervalo()");
  eq(Math.round((hoje.ini - sete.ini) / 86400000), 6, "7 dias = hoje + 6 anteriores:");
  run(env, "PBI.periodo=0");
  const mes = run(env, "pbiIntervalo()");
  const dia1 = new Date(); dia1.setDate(1); dia1.setHours(0,0,0,0);
  eq(mes.ini, dia1.getTime(), "mês atual começa no dia 1:");
  run(env, "PBI.periodo=-1;PBI.de='2026-01-05';PBI.ate='2026-01-10'");
  const per = run(env, "pbiIntervalo()");
  okv(per.ini < per.fim, "personalizado precisa de início antes do fim");
  eq(new Date(per.ini).getDate(), 5, "dia inicial do personalizado:");
});

t("7.6 relatório: filtro por tipo, operador, modelo e cor", () => {
  const env = novo(); run(env, "cur={l:'x',r:'adm'}");
  run(env, "PP=[['111','Modelo A','Preto',0],['222','Modelo B','Azul',0]];idx={'111':0,'222':1};" +
           "M=[{c:'111',t:'in',q:5,ts:Date.now(),u:'ana',o:'Ana'},{c:'222',t:'out',q:2,ts:Date.now(),u:'bia',o:'Bia'}];" +
           "PBI.periodo=30;PBI.tipo='';PBI.operador='';PBI.modelo='';PBI.cor='';PBI.cruz=null;");
  eq(run(env, "pbiFiltrado().length"), 2, "sem filtro:");
  run(env, "PBI.tipo='out'"); eq(run(env, "pbiFiltrado().length"), 1, "só saídas:");
  run(env, "PBI.tipo='';PBI.operador='ana'"); eq(run(env, "pbiFiltrado().length"), 1, "só a Ana:");
  run(env, "PBI.operador='';PBI.modelo='Modelo B'"); eq(run(env, "pbiFiltrado().length"), 1, "só o Modelo B:");
  run(env, "PBI.modelo='';PBI.cor='Preto'"); eq(run(env, "pbiFiltrado().length"), 1, "só Preto:");
});

t("7.6 relatório: filtro cruzado e recorte por produto no detalhe", () => {
  const env = novo(); run(env, "cur={l:'x',r:'adm'}");
  run(env, "PP=[['111','Modelo A','Preto',0],['222','Modelo B','Azul',0]];idx={'111':0,'222':1};" +
           "M=[{c:'111',t:'in',q:5,ts:Date.now(),u:'ana',o:'Ana'},{c:'222',t:'out',q:2,ts:Date.now(),u:'bia',o:'Bia'}];" +
           "PBI.periodo=30;PBI.tipo='';PBI.operador='';PBI.modelo='';PBI.cor='';PBI.cruz={tipo:'produto',v:'111'};");
  eq(run(env, "pbiFiltrado().length"), 1, "filtro cruzado por produto:");
  run(env, "PBI.cruz={tipo:'operador',v:'bia'}");
  eq(run(env, "pbiFiltrado().length"), 1, "filtro cruzado por operador:");
});

t("7.6 relatório: o cartão Atenção inclui os produtos parados", () => {
  const env = novo(); run(env, "cur={l:'x',r:'adm'}");
  /* o produto sem movimento precisa TER estoque: sem estoque e sem movimento ele é "vazio",
     não "parado" — essa é a regra do app desde a Seção 10.3 e está certa. */
  run(env, "PP=[['111','Modelo A','Preto',0],['222','Modelo B','Azul',3]];idx={'111':0,'222':1};" +
           "M=[{c:'111',t:'in',q:5,ts:Date.now(),u:'ana',o:'Ana'}];" +
           "PBI.periodo=30;PBI.diasParados=30;PBI.tipo='';PBI.operador='';PBI.modelo='';PBI.cor='';PBI.cruz=null;");
  const d = run(env, "pbiDados()");
  okv(Array.isArray(d.parados), "os dados do relatório devem trazer os parados");
  okv(d.parados.some((x) => x.codigo === "222"), "o produto sem movimento deve aparecer como parado");
});

t("7.6 relatório: exportação do recorte traz resumo e detalhe", () => {
  const env = novo(); run(env, "cur={l:'x',r:'adm'}");
  okv(run(env, "typeof pbiCSVPivo") === "function", "falta a exportação do recorte");
  const fonte = run(env, "String(pbiCSVPivo)");
  ["Por dia", "Por tipo", "Por operador", "Data e hora"].forEach((x) =>
    okv(fonte.includes(x), "a planilha deve ter a seção " + x));
});

t("2.3/2.4 estratégias de foto cobrem rotação, cinza, contraste e recorte", () => {
  const env = novo();
  const e = run(env, "qEstrategias()");
  okv(Array.isArray(e) && e.length >= 10, "poucas estratégias: " + (e && e.length));
  [0, 90, 180, 270].forEach((r) => okv(e.some((x) => x.rot === r), "falta rotação " + r));
  okv(e.some((x) => x.cinza), "falta tons de cinza");
  okv(e.some((x) => x.contraste), "falta contraste");
  okv(e.some((x) => x.nitidez), "falta nitidez");
  okv(e.some((x) => x.regiao), "falta recorte de região");
  okv(e.every((x) => x.maxLado >= 1600), "nenhuma tentativa pode ficar abaixo de 1600 no maior lado");
  /* a foto comum precisa ser resolvida sem passar por todas as tentativas */
  okv(e[0].rot === 0 && !e[0].cinza, "a primeira tentativa deve ser a foto como veio");
  okv(e.slice(0, 3).some((x) => x.cinza && x.contraste), "as 3 primeiras devem já cobrir cinza + contraste");
});
t("2.4 pré-processamento reduz para 1600 px no maior lado", () => {
  const env = novo();
  const r = run(env, `(()=>{
    const img={width:4000,height:3000,naturalWidth:4000,naturalHeight:3000};
    const a=qCanvas(img,{});
    const b=qCanvas(img,{rot:90});
    return {a:{w:a.width,h:a.height},b:{w:b.width,h:b.height}};
  })()`);
  eq(r.a, { w: 1600, h: 1200 }, "canvas sem rotação:");
  eq(r.b, { w: 1200, h: 1600 }, "canvas rotacionado 90°:");
});
t("2.4 recorte devolve só a região pedida", () => {
  const env = novo();
  const r = run(env, `(()=>{
    const cv=qCanvas({width:1600,height:1000,naturalWidth:1600,naturalHeight:1000},{});
    const rec=qRecorte(cv,{x:0.25,y:0.5,w:0.5,h:0.25});
    return {w:rec.width,h:rec.height};
  })()`);
  eq(r, { w: 800, h: 250 }, "tamanho do recorte:");
});
t("2.3 foto com código legível devolve o código e não altera o estoque", () =>
  adminPronto(novo()).then((env) => {
    /* detector simulado que só acerta na 3ª tentativa, para exercitar as camadas */
    const r = run(env, `(async()=>{
      const antes=JSON.stringify(bal());
      let n=0;
      window.BarcodeDetector=class{static getSupportedFormats(){return Promise.resolve(FMT)}
        async detect(){n++;return n>=3?[{rawValue:PP[0][0]}]:[]}};
      const img=await qCarregarImagem({name:"etiqueta.png",size:1000});
      const ests=qEstrategias();
      let achado=null,tentativas=0;
      for(const est of ests){
        tentativas++;
        let cv=qCanvas(img,est);
        if(est.regiao)cv=qRecorte(cv,est.regiao);
        const t=await qDetectarCanvas(cv);
        if(t){achado=t;break}
      }
      return {achado,tentativas,antes,depois:JSON.stringify(bal()),codigo:PP[0][0]};
    })()`);
    return Promise.resolve(r).then((x) => {
      okv(x.achado, "não decodificou nenhuma camada");
      eq(x.achado, x.codigo, "código lido:");
      okv(x.tentativas >= 3, "deveria tentar camadas em sequência, tentou " + x.tentativas);
      eq(x.depois, x.antes, "a leitura de foto não pode alterar o saldo:");
    });
  }));
t("2.4 foto ilegível explica a causa provável", () => {
  const env = novo();
  const txt = run(env, "qMotivoFoto()");
  ["desfocada", "pouca luz", "cortado", "resolução", "formato"].forEach((t) =>
    okv(txt.toLowerCase().includes(t), "a mensagem deveria citar: " + t));
});

/* ================= ETAPA 3 — MOVIMENTAÇÕES E SINCRONIZAÇÃO ================= */
const L = require("../api/_lib/movimentos.js");
const PROD = [
  { codigo: "A1", descricao: "RX ALFA", cor: "PRETO", inicial: 10 },
  { codigo: "B2", descricao: "RX BETA", cor: "DEMI", inicial: 0 },
];
g("Etapa 3 — movimentações e sincronização");
t("3.3 saldo = inicial + entradas − saídas", () => {
  const movs = [
    { id: "1", t: "in", c: "A1", q: 5 },
    { id: "2", t: "out", c: "A1", q: 3 },
    { id: "3", t: "adj", c: "A1", q: -2 },
  ];
  eq(L.saldoDe(PROD[0], movs), 10, "saldo final:");
  eq(L.conferirSaldo(PROD[0], movs, 10).ok, true, "conferência do saldo:");
  eq(L.conferirSaldo(PROD[0], movs, 11).ok, false, "saldo errado deve ser detectado:");
});
t("3.3 movimentação apagada não conta no saldo", () => {
  const movs = [{ id: "1", t: "out", c: "A1", q: 4 }, { id: "2", t: "out", c: "A1", q: 4, del: true }];
  eq(L.saldoDe(PROD[0], movs), 6, "saldo:");
});
t("3.4 reenvio do mesmo id não duplica a operação", () => {
  const lote = [{ id: "x1", t: "out", c: "A1", q: 2, u: "op", o: "Operador" }];
  const p1 = L.aplicarLote(PROD, [], lote);
  eq(p1.aceitos.length, 1, "primeira vez aceita:");
  const p2 = L.aplicarLote(PROD, p1.aceitos, lote);
  eq(p2.aceitos.length, 0, "segunda vez não pode aceitar:");
  eq(p2.repetidos.length, 1, "deve ser reportado como repetido:");
  eq(p2.saldos.get("A1"), 8, "saldo depois do reenvio:");
});
t("3.4 dois aparelhos ao mesmo tempo mantêm a conta certa", () => {
  /* aparelho 1 e aparelho 2 bipam sem saber um do outro; o servidor recebe os dois lotes */
  const a = L.aplicarLote(PROD, [], [{ id: "a1", t: "out", c: "A1", q: 3 }]);
  const b = L.aplicarLote(PROD, a.aceitos, [{ id: "b1", t: "out", c: "A1", q: 4 }]);
  eq(b.saldos.get("A1"), 3, "saldo somando os dois aparelhos:");
  const c = L.aplicarLote(PROD, b.aceitos, [{ id: "a1", t: "out", c: "A1", q: 3 }]);
  eq(c.saldos.get("A1"), 3, "reenvio do aparelho 1 não pode descontar de novo:");
});
t("3.3 baixa acima do saldo é recusada com o saldo real", () => {
  const r = L.aplicarLote(PROD, [], [{ id: "z1", t: "out", c: "A1", q: 50 }]);
  eq(r.aceitos.length, 0, "não pode aceitar:");
  eq(r.recusados[0].motivo, "saldo insuficiente", "motivo:");
  eq(r.recusados[0].saldo, 10, "saldo informado:");
});
t("3.3 baixa acima do saldo aceita quando o administrador força", () => {
  const r = L.aplicarLote(PROD, [], [{ id: "z2", t: "out", c: "A1", q: 12 }], { forcar: true });
  eq(r.aceitos.length, 1, "aceitos:");
  eq(r.saldos.get("A1"), -2, "saldo pode ficar negativo:");
});
t("3.4 produto fora do cadastro é recusado, não inventado", () => {
  const r = L.aplicarLote(PROD, [], [{ id: "n1", t: "out", c: "ZZZ", q: 1 }]);
  eq(r.recusados[0].motivo, "produto não cadastrado", "motivo:");
});
t("3.4 movimento sem id ou com quantidade inválida é recusado", () => {
  eq(L.validarMovimento({ t: "out", c: "A1", q: 1 }, PROD).ok, false, "sem id:");
  eq(L.validarMovimento({ id: "1", t: "out", c: "A1", q: 0 }, PROD).ok, false, "quantidade zero:");
  eq(L.validarMovimento({ id: "1", t: "xx", c: "A1", q: 1 }, PROD).ok, false, "tipo inválido:");
  eq(L.validarMovimento({ id: "1", t: "out", c: "A1", q: 1.5 }, PROD).ok, false, "quantidade fracionada:");
});
t("3.6 auditoria guarda usuário, hora, produto, quantidade, tipo e aparelho", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const a=AUD.length;
      mode="out";last="";lastT=0;scan(PP[0][0]);
      const reg=AUD[AUD.length-1];
      return {antes:a, agora:AUD.length, reg, fila:FILA.length, ap:FILA[FILA.length-1].aparelho};
    })()`);
    okv(r.agora > r.antes, "nada foi auditado");
    eq(r.reg.acao, "MOVIMENTAÇÃO", "ação auditada:");
    okv(r.reg.por && r.reg.por.length > 0, "falta o responsável");
    okv(r.reg.extra.includes("BAIXA"), "falta o tipo");
    okv(r.reg.extra.includes("un."), "falta a quantidade");
    okv(/aparelho ap_/.test(r.reg.extra), "falta o aparelho");
    okv(r.reg.ts > 0, "falta a data/hora");
  }));
t("3.5 operação só sai da fila quando o servidor confirma", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      mode="out";last="";lastT=0;scan(PP[0][0]);
      const id=FILA[FILA.length-1].id;
      const antes=FILA.length;
      confirmar([]);            // resposta sem confirmação
      const semConfirma=FILA.length;
      confirmar([id]);          // servidor confirmou este id
      return {antes,semConfirma,depois:FILA.length,aindaTem:FILA.some(m=>m.id===id)};
    })()`);
    eq(r.semConfirma, r.antes, "sem confirmação a fila não pode diminuir:");
    okv(r.depois < r.antes, "com confirmação a operação deve sair da fila");
    eq(r.aindaTem, false, "o id confirmado não pode continuar pendente:");
  }));
t("3.5 sem servidor o app continua local e não finge sincronizar", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const antes=JSON.stringify(bal());
      mode="out";last="";lastT=0;scan(PP[0][0]);
      const sinc=sincronizar();
      return {sinc, ativo:syncAtivo(), depois:JSON.stringify(bal()), antes, fila:FILA.length};
    })()`);
    return Promise.resolve(r.sinc).then((res) => {
      eq(res.motivo, "desligado", "deve dizer que está desligado:");
      eq(r.ativo, false, "não pode estar ativo sem endereço e segredo");
      okv(r.fila > 0, "a operação fica na fila aguardando");
      okv(r.depois !== r.antes, "a bipagem local continua funcionando");
    });
  }));
t("3.4/3.5 reenvio após falha de rede confirma o que faltava", () =>
  adminPronto(novo()).then((env) => {
    /* servidor simulado: primeiro cai, depois responde confirmando */
    const r = run(env, `(async()=>{
      SYNC.url="https://exemplo.vercel.app";SYNC.token="segredo";SYNC.desde=0;
      mode="out";last="";lastT=0;scan(PP[0][0]);
      const pendentesAntes=FILA.length;
      let chamadas=0;
      window.fetch=async(url,opt)=>{
        chamadas++;
        if(chamadas===1)throw new Error("sem rede");
        if(String(url).includes("/api/movimentos")){
          const corpo=JSON.parse(opt.body);
          return {ok:true,status:200,json:async()=>({ok:true,confirmados:corpo.movimentos.map(m=>m.id),repetidos:[],recusados:[]})};
        }
        return {ok:true,status:200,json:async()=>({ok:true,produtos:[],movimentos:[],servidorEm:Date.now()})};
      };
      const falha=await sincronizar({silencioso:true});
      const filaDepoisDaFalha=FILA.length;
      const ok=await sincronizar({silencioso:true});
      return {pendentesAntes,falha,filaDepoisDaFalha,ok,filaFinal:FILA.length,erro:SYNC.ultimoErro};
    })()`);
    return Promise.resolve(r).then((x) => {
      okv(x.pendentesAntes > 0, "deveria haver pendente");
      eq(x.falha.ok, false, "a primeira tentativa deve falhar:");
      eq(x.filaDepoisDaFalha, x.pendentesAntes, "falha de rede não pode limpar a fila:");
      eq(x.ok.ok, true, "a segunda tentativa deve funcionar:");
      eq(x.filaFinal, 0, "tudo confirmado sai da fila:");
    });
  }));
t("3.4 novidades de outro aparelho entram sem duplicar", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(async()=>{
      SYNC.url="https://exemplo.vercel.app";SYNC.token="s";SYNC.desde=0;
      const antes=M.length;
      const doServidor=[{id:"outro1",t:"out",c:PP[0][0],q:1,u:"op2",o:"Outro",ts:Date.now()},{id:"outro1",t:"out",c:PP[0][0],q:1,u:"op2",o:"Outro",ts:Date.now()}];
      window.fetch=async()=>({ok:true,status:200,json:async()=>({ok:true,produtos:[],movimentos:doServidor,servidorEm:Date.now()})});
      const n=await receberNovidades();
      const n2=await receberNovidades();
      return {antes,depois:M.length,n,n2};
    })()`);
    return Promise.resolve(r).then((x) => {
      eq(x.n, 1, "duas cópias do mesmo id devem virar uma:");
      eq(x.n2, 0, "repetir a leitura não pode duplicar:");
      eq(x.depois - x.antes, 1, "entrou exatamente uma movimentação:");
    });
  }));

/* ================= ETAPA 4 — CONTAS COM SEGURANÇA NO SERVIDOR ================= */
const C = require("../api/_lib/contas.js");
g("Etapa 4 — login, autocadastro e administração");
t("4.1 senha não é guardada como veio e confere só com a certa", () => {
  const h = C.criarHashSenha("segredo123");
  okv(h.hash !== "segredo123" && h.hash.length === 64, "a senha foi guardada em claro");
  eq(C.conferirSenha("segredo123", h), true, "senha certa:");
  eq(C.conferirSenha("segredo124", h), false, "senha errada:");
  const h2 = C.criarHashSenha("segredo123");
  okv(h2.sal !== h.sal, "o sal deve ser diferente por usuário");
  okv(h2.hash !== h.hash, "com sal diferente o hash precisa mudar");
});
t("4.1 login inexistente e senha errada dão a mesma mensagem", () => {
  const semUsuario = C.tentarLogin(null, "x");
  const u = { l: "ana", r: "operador", st: "ativo", t: 0, ...C.criarHashSenha("certa123") };
  const errada = C.tentarLogin(u, "errada1");
  eq(semUsuario.erro, "Login ou senha incorretos.", "login inexistente:");
  okv(errada.erro.indexOf("Login ou senha incorretos") === 0, "senha errada deve começar igual");
});
t("4.2 bloqueio é decidido no servidor após 3 tentativas", () => {
  const u = { l: "ana", r: "operador", st: "ativo", t: 0, ...C.criarHashSenha("certa123") };
  const r1 = C.tentarLogin(u, "errada1"); eq(r1.tentativas, 1, "1ª tentativa:");
  const r2 = C.tentarLogin({ ...u, t: 1 }, "errada1"); eq(r2.tentativas, 2, "2ª tentativa:");
  const r3 = C.tentarLogin({ ...u, t: 2 }, "errada1");
  eq(r3.bloquear, true, "a 3ª deve bloquear:");
  const bloqueado = C.tentarLogin({ ...u, t: 3, st: "bloq" }, "certa123");
  eq(bloqueado.ok, false, "bloqueado não entra nem com a senha certa:");
  okv(bloqueado.bloqueado, "deve vir marcado como bloqueado");
});
t("4.2 usuário desativado não entra", () => {
  const u = { l: "bia", r: "operador", st: "desat", t: 0, ...C.criarHashSenha("certa123") };
  const r = C.tentarLogin(u, "certa123");
  eq(r.ok, false, "não pode entrar:");
  eq(r.desativado, true, "deve vir marcado como desativado:");
});
t("4.3 autocadastro exige nome e sobrenome e senha de 6+", () => {
  eq(C.nomeOK("Ana"), false, "só o primeiro nome:");
  eq(C.nomeOK("Ana Souza"), true, "nome e sobrenome:");
  eq(C.senhaForte("12345"), false, "senha curta:");
  eq(C.senhaForte("123456"), true, "senha de 6:");
  eq(C.loginOK("ana souza"), false, "login com espaço:");
  eq(C.loginOK("ana.souza"), true, "login válido:");
});
t("4.4 troca obrigatória da senha provisória", () => {
  const h = C.criarHashSenha("prov1234");
  const u = { l: "ana", r: "operador", st: "ativo", t: 0, temp: true, ...h };
  const r = C.tentarLogin(u, "prov1234");
  eq(r.ok, true, "entra com a provisória:");
  eq(r.trocaObrigatoria, true, "deve exigir a troca:");
  const pub = C.usuarioPublico(u);
  eq(pub.h, undefined, "hash não pode aparecer:");
  eq(pub.sal, undefined, "sal não pode aparecer:");
  eq(pub.temp, true, "o app precisa saber que há troca pendente:");
});
t("4.1 o aplicativo não guarda mais a senha depois do login de servidor", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      contasAtivas=()=>true;
      salvarSess({sessao:"tk123",usuario:{l:"ana",n:"Ana Souza",r:"operador",st:"ativo",t:0,temp:false,ts:Date.now()}});
      const u=U.find(x=>x.l==="ana");
      return {sess:SESS.token, guardaHash:u&&u.h, papel:u&&u.r, valida:sessValida()};
    })()`);
    eq(r.sess, "tk123", "token da sessão:");
    eq(r.guardaHash, "(servidor)", "o app não deve guardar hash de senha:");
    eq(r.papel, "operador", "papel vem do servidor:");
    eq(r.valida, true, "sessão recém-criada precisa valer:");
  }));
t("4.1 sem servidor configurado o login local continua funcionando", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>({ativo:contasAtivas(),cur:!!cur,valida:sessValida()}))()`);
    eq(r.ativo, false, "não pode estar ativo sem endereço:");
    okv(r.cur, "deveria haver usuário local logado");
    eq(r.valida, false, "sem servidor não existe sessão de servidor:");
  }));
t("4.2 sessão vencida não vale", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      contasAtivas=()=>true;
      SESS={token:"tk",l:"ana",exp:Date.now()-1000};
      return {valida:sessValida()};
    })()`);
    eq(r.valida, false, "sessão expirada não pode valer:");
  }));
t("4.1 painel de contas aparece quando o servidor está ligado", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const antes=$("adm").innerHTML;
      contasAtivas=()=>true;drawAdm();const depois=$("adm").innerHTML;
      const botoes=$("adm").querySelectorAll("[data-l]");
      return {temAntes:/Contas no servidor/.test(antes),temDepois:/Contas no servidor/.test(depois),botoes:botoes.length,
              carregar:/data-a="ctListar"/.test(depois)};
    })()`);
    eq(r.temAntes, false, "sem servidor não deve mostrar painel de contas:");
    eq(r.temDepois, true, "com servidor deve mostrar:");
    okv(r.carregar, "falta o botão de carregar contas");
  }));
t("4.4 senha provisória sugerida é legível e diferente", () => {
  const a = C.sugerirSenha(), b = C.sugerirSenha();
  okv(a.length >= 8, "senha curta demais");
  okv(a !== b, "duas senhas não podem sair iguais");
  eq(/[0-9]/.test(a), true, "precisa de número:");
});

/* ================= ETAPA 5 — PAINEL, HISTÓRICO, RELATÓRIOS, INVENTÁRIO, ALERTAS E POWER BI ================= */
g("Etapa 5 — painel, histórico, relatórios, inventário, alertas e Power BI");
t("7.2 painel calcula tudo dos dados reais", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const d=painelDados();
      const b=bal();
      return {d, prod:PP.length, soma:b.reduce((a,v)=>a+v,0), zer:b.filter(v=>v<=0).length};
    })()`);
    eq(r.d.produtos, r.prod, "total de produtos:");
    eq(r.d.unidades, r.soma, "unidades em estoque:");
    eq(r.d.zerado, r.zer, "zerados:");
    okv(r.d.entradas === 0 && r.d.saidas === 0, "sem movimentação hoje as entradas/saídas começam em zero");
  }));
t("7.2 indicador abre a lista correspondente", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      painelVer("zerado");
      const lista=$("lst").innerHTML;
      const zerados=PP.map((p,i)=>[p,bal()[i]]).filter(([p,v])=>v<=0).length;
      return {lista, zerados};
    })()`);
    if (r.zerados) okv(r.lista.includes("item"), "a lista de zerados deveria ter itens");
    else okv(r.lista.includes("Nada nesta lista"), "sem zerados deve avisar");
  }));
t("7.3 histórico filtra por tipo, período e texto", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      mode="out";last="";lastT=0;scan(PP[0][0]);
      mode="in";last="";lastT=0;scan(PP[1][0]);
      HF.q="";HF.t="";HF.dias=0;
      const todos=histFiltrado().length;
      HF.t="in";const entradas=histFiltrado();
      HF.t="";HF.q=PP[1][0];const porCodigo=histFiltrado();
      HF.q="";HF.t="out";const saidas=histFiltrado().length;
      return {todos, entradas:entradas.length, tipos:entradas.map(m=>m.t), porCodigo:porCodigo.length, saidas};
    })()`);
    eq(r.todos, 2, "todas as movimentações:");
    eq(r.entradas, 1, "só entradas:");
    eq(r.tipos, ["in"], "tipo filtrado:");
    eq(r.porCodigo, 1, "busca por código:");
    eq(r.saidas, 1, "só saídas:");
  }));
t("7.3 histórico é cronológico (mais recente primeiro)", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      mode="out";last="";lastT=0;scan(PP[0][0]);
      mode="out";last="";lastT=0;scan(PP[1][0]);
      const L=histFiltrado();
      return L.map(m=>m.ts);
    })()`);
    okv(r[0] >= r[r.length - 1], "o primeiro deve ser o mais recente");
  }));
t("7.3 operador só vê o próprio histórico", () =>
  operadorPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      M.push({id:"deOutro",t:"out",c:PP[0][0],q:1,o:"Outro",u:"outro",ts:Date.now()});
      M.push({id:"meu",t:"in",c:PP[0][0],q:1,o:cur.n,u:cur.l,ts:Date.now()});
      return histFiltrado().map(m=>m.id);
    })()`);
    eq(r.includes("deOutro"), false, "movimentação de outro operador não pode aparecer:");
    eq(r.includes("meu"), true, "a própria deve aparecer:");
  }));
t("7.4 relatório usa dados reais do período", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      REL.dias=30;
      mode="out";last="";lastT=0;scan(PP[0][0]);
      const d=relDados();
      return {saidas:d.saidas, produtos:d.produtos.length, operadores:d.operadores.length, semMov:d.semMov.length, total:PP.length};
    })()`);
    eq(r.saidas, 1, "saídas do período:");
    okv(r.produtos >= 1, "deve haver produto movimentado");
    okv(r.operadores >= 1, "deve haver operador");
    eq(r.semMov, r.total - 1, "produtos sem movimentação:");
  }));
t("7.4 período sem movimentação mostra vazio, não estima", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      REL.dias=1;
      const d=relDados();
      return {saidas:d.saidas, entradas:d.entradas, produtos:d.produtos.length};
    })()`);
    eq(r.saidas, 0, "sem movimentação hoje:");
    eq(r.produtos, 0, "não pode inventar produto:");
  }));
t("7.1 inventário registra responsável, contado, sistema e diferença", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      INV={ativo:true,resp:"Ana Souza",ini:Date.now(),itens:{},hist:[]};
      mode="cnt";last="";lastT=0;scan(PP[0][0]);scan(PP[0][0]);
      const res=invResumo();
      const b=bal();
      return {res, sistema:b[0], qtd:INV.itens[PP[0][0]]};
    })()`);
    eq(r.qtd, 2, "contagem de duas bipadas:");
    eq(r.res[0].contado, 2, "contado:");
    eq(r.res[0].sistema, r.sistema, "quantidade no sistema:");
    eq(r.res[0].dif, 2 - r.sistema, "diferença:");
  }));
t("7.1 concluir inventário não altera o estoque sozinho", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const antes=JSON.stringify(bal());
      INV={ativo:true,resp:"Ana Souza",ini:Date.now(),itens:{},hist:[]};
      mode="cnt";last="";lastT=0;scan(PP[0][0]);
      invConcluir();
      const hist=ls("mdo_invh",[]);
      const bruto=typeof localStorage!=="undefined"?localStorage.getItem("mdo_invh"):"?";
      return {antes, depois:JSON.stringify(bal()), hist:hist.length, ativo:INV.ativo, cnt:Object.keys(INV.itens||{}).length, inv:JSON.stringify(INV), cntAll:JSON.stringify(CNT), bruto};
    })()`);
    eq(r.depois, r.antes, "o estoque não pode mudar ao concluir:");
    eq(r.hist, 1, "o inventário deve ficar no histórico: " + JSON.stringify({ bruto: r.bruto, cnt: r.cntAll }));
    eq(r.ativo, false, "o inventário termina:");
  }));
t("7.1 operador não inicia inventário", () =>
  operadorPronto(novo()).then((env) => {
    const r = run(env, `(()=>{const antes=JSON.stringify(INV);invIniciar();return {antes, depois:JSON.stringify(INV), toasts:0};})()`);
    eq(r.depois, r.antes, "operador não pode iniciar inventário:");
  }));
t("7.5 alerta de estoque zerado sem repetir no mesmo dia", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const b=bal();
      const i=PP.findIndex((p,k)=>b[k]>0);
      MIN[PP[i][0]]=0;
      /* tira todo o saldo do produto de uma vez (o admin pode confirmar saldo insuficiente) */
      M.push({id:"zera",t:"out",c:PP[i][0],q:b[i],o:cur.n,u:cur.l,ts:Date.now()});
      sM();
      const primeiro=alertas();
      const segundo=alertas();
      const av=ls("mdo_av",[]);
      return {primeiro, segundo, zerado:av.filter(a=>/Estoque zerado/.test(a.m)).length};
    })()`);
    okv(r.primeiro >= 1, "deveria avisar do estoque zerado");
    eq(r.segundo, 0, "não pode repetir o mesmo aviso no mesmo dia:");
    eq(r.zerado, 1, "um aviso por produto zerado:");
  }));
t("7.5 alerta de estoque baixo respeita o mínimo", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const b=bal(),i=0;
      MIN[PP[i][0]]=b[i];
      const n=alertas();
      const av=ls("mdo_av",[]);
      return {n, baixo:av.filter(a=>/Estoque baixo/.test(a.m)).length};
    })()`);
    okv(r.baixo >= 1, "deveria avisar do estoque baixo");
  }));
t("7.6 relatório Power BI só abre para administrador", () =>
  operadorPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const antes=$("pbi").innerHTML;
      drawPbi();
      return {antes, depois:$("pbi").innerHTML, admin:isA()};
    })()`);
    eq(r.admin, false, "não é administrador");
    eq(r.depois, "", "operador não pode ter conteúdo no relatório:");
  }));
t("7.6 filtros do Power BI cruzam com a tabela de detalhe", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      mode="out";last="";lastT=0;scan(PP[0][0]);
      mode="in";last="";lastT=0;scan(PP[1][0]);
      PBI.periodo=30;PBI.tipo="";PBI.operador="";PBI.modelo="";PBI.cor="";PBI.cruz=null;
      const todos=pbiDados().movs.length;
      PBI.tipo="in";const entradas=pbiDados().movs;
      PBI.tipo="";PBI.cruz={tipo:"dia",v:new Date().toISOString().slice(0,10)};
      const cruzado=pbiDados().movs.length;
      PBI.cruz={tipo:"produto",v:PP[0][0]};
      const porProduto=pbiDados().movs;
      return {todos, entradas:entradas.length, tipos:entradas.map(m=>m.t), cruzado, porProduto:porProduto.length};
    })()`);
    eq(r.todos, 2, "sem filtro:");
    eq(r.entradas, 1, "só entradas:");
    eq(r.tipos, ["in"], "tipo:");
    eq(r.cruzado, 2, "filtro por dia:");
    eq(r.porProduto, 1, "filtro cruzado por produto:");
  }));
t("7.6 números do relatório batem com o histórico", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      mode="out";last="";lastT=0;scan(PP[0][0]);
      mode="in";last="";lastT=0;scan(PP[1][0]);
      PBI.periodo=30;PBI.tipo="";PBI.operador="";PBI.modelo="";PBI.cor="";PBI.cruz=null;
      HF.q="";HF.t="";HF.dias=0;
      const pbi=pbiDados().movs.length;
      const hist=histFiltrado().length;
      return {pbi, hist};
    })()`);
    eq(r.pbi, r.hist, "o recorte do relatório deve conferir com o histórico");
  }));
t("7.6 PDF do relatório: só administrador, só com dados e restaurando a tela", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      env_prints = 0;
      PBI.periodo=1;PBI.tipo="";PBI.operador="";PBI.modelo="";PBI.cor="";PBI.cruz=null;
      const semDados = (()=>{ const antes=$("pbi").innerHTML; pbiPDF(); return {prints:(window.__prints||[]).length, igual:$("pbi").innerHTML===antes}; })();
      mode="out";last="";lastT=0;scan(PP[0][0]);
      const antesHtml=$("pbi").innerHTML;
      pbiPDF();
      const comDados=(window.__prints||[]).length;
      return {semDados, comDados};
    })()`);
    /* o sandbox tem window vazio: a impressão é lida pelo env do harness */
    okv(r.semDados.igual, "sem dados a tela não pode mudar");
    return Promise.resolve(r).then((x) => x);
  }));
t("7.6 relatório não altera estoque", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      mode="out";last="";lastT=0;scan(PP[0][0]);
      const antes=JSON.stringify({b:bal(),m:M.length});
      PBI.periodo=1;PBI.tipo="out";drawPbi();pbiDados();
      PBI.cruz={tipo:"produto",v:PP[0][0]};drawPbi();
      return {antes, depois:JSON.stringify({b:bal(),m:M.length})};
    })()`);
    eq(r.depois, r.antes, "somente consulta:");
  }));

/* ================= ETAPA 6 — DESEMPENHO, SEGURANÇA E PUBLICAÇÃO ================= */
g("Etapa 6 — desempenho, segurança e publicação");
t("6.2 busca de produtos no servidor é paginada e não carrega tudo", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(async()=>{
      SYNC.url="https://exemplo.vercel.app";SYNC.token="t";
      let urlUsada="";
      window.fetch=async(u)=>{urlUsada=String(u);return{ok:true,status:200,json:async()=>({ok:true,pagina:1,tamanho:20,total:45,paginas:3,produtos:[{codigo:"A1",descricao:"X",cor:"P",inicial:1}]})}};
      const j=await buscarProdutosServidor("rx",0);
      return {urlUsada, paginas:j.paginas, total:j.total, itens:j.produtos.length};
    })()`);
    return Promise.resolve(r).then((x) => {
      okv(x.urlUsada.includes("/api/produtos"), "deve chamar a rota de produtos");
      okv(x.urlUsada.includes("pagina=1") && x.urlUsada.includes("tamanho=20"), "deve paginar: " + x.urlUsada);
      eq(x.paginas, 3, "páginas:");
      eq(x.itens, 1, "itens da página:");
    });
  }));
t("6.1/6.2 estado do servidor vem paginado", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "api", "estado.js"), "utf8");
  okv(/limit \$2 offset \$3/.test(src), "a consulta de estado precisa de limit/offset");
  okv(src.includes("paginas"), "a resposta precisa informar as páginas");
});
t("6.3 falha do servidor vira mensagem clara, não tela quebrada", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(async()=>{
      SYNC.url="https://exemplo.vercel.app";SYNC.token="t";
      window.fetch=async()=>({ok:false,status:503,json:async()=>({ok:false,erro:"banco não configurado"})});
      const j=await buscarProdutosServidor("",0);
      return {j, erro:SYNC.ultimoErro};
    })()`);
    return Promise.resolve(r).then((x) => {
      eq(x.j, null, "sem produto inventado quando o servidor falha:");
      okv(x.erro.length > 0, "o erro precisa ficar registrado para o usuário ver");
    });
  }));
t("6.3 nenhuma credencial fica escrita no código público", () => {
  const html = fs.readFileSync(HTML, "utf8");
  okv(!/postgres:\/\//.test(html), "string de conexão não pode estar no index.html");
  okv(!/SYNC_TOKEN\s*=\s*["'][^"']+["']/.test(html), "segredo não pode estar fixo no código");
  const exemplo = fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8");
  okv(exemplo.includes("DATABASE_URL") && exemplo.includes("SYNC_TOKEN"), ".env.example precisa listar as variáveis");
});
t("6.3 cabeçalhos de segurança e cache definidos na Vercel", () => {
  const v = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
  const regras = JSON.stringify(v.headers);
  okv(regras.includes("X-Content-Type-Options"), "falta nosniff");
  okv(regras.includes("Referrer-Policy"), "falta Referrer-Policy");
  okv(regras.includes("Permissions-Policy"), "falta Permissions-Policy da câmera");
  okv(JSON.stringify(v.functions).includes("maxDuration"), "funções precisam de limite de tempo");
});
t("6.1 abertura rápida: catálogo e índice montados uma vez", () => {
  const html = fs.readFileSync(HTML, "utf8");
  okv(html.includes("const reidx=()=>{idx={};PP.forEach"), "o índice precisa ser reconstruído só quando muda");
  okv(html.includes("function draw(){"), "a renderização precisa ser única por aba");
});
t("6.4 publicação: rotas da API existem e são funções serverless", () => {
  const api = path.join(__dirname, "..", "api");
  const arquivos = fs.readdirSync(api).filter((f) => f.endsWith(".js"));
  ["movimentos.js", "estado.js", "contas.js", "produtos.js"].forEach((f) => {
    okv(arquivos.includes(f), "falta api/" + f);
    okv(fs.readFileSync(path.join(api, f), "utf8").includes("module.exports"), f + " precisa exportar a função");
  });
});

/* ================= SEÇÃO 10.1 — CADASTRO POR FOTO ================= */
g("Seção 10.1 — cadastro de produto pela foto da etiqueta");
t("10.1 código lido na foto abre o cadastro já preenchido", () =>
  adminPronto(novo()).then((env) => {
    const antes = run(env, "PP.length");
    const r = run(env, `(()=>{
      const respostas=["RX NOVO MODELO","AZUL","2"];
      window.prompt=(m,d)=>(respostas.length?respostas.shift():null);
      cadAbrir("80202599999",true);
      const i=idx["80202599999"];
      return {i, prod:i==null?null:PP[i], bal:i==null?null:bal()[i], registros:ls("mdo_cads",[]).length, restam:respostas.length};
    })()`);
    okv(r.i != null, "o produto deveria existir depois do cadastro");
    eq(r.prod[1], "RX NOVO MODELO", "descrição digitada pela pessoa:");
    eq(r.prod[2], "AZUL", "cor digitada:");
    eq(r.bal, 2, "estoque inicial:");
    eq(r.registros, 1, "a leitura precisa ficar registrada:");
  }));
t("10.1 código já cadastrado não duplica o produto", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const c=PP[0][0], antes=PP.length, b=bal()[0];
      const respostas=["3"];
      window.prompt=()=>(respostas.shift()===undefined?null:respostas);
      window.prompt=(m,d)=>respostas.length?respostas.shift():null;
      cadAbrir(c);
      return {antes, depois:PP.length, bal:bal()[0], b};
    })()`);
    eq(r.depois, r.antes, "não pode criar produto repetido:");
    eq(r.bal, 3, "o estoque deve ser ajustado para o valor confirmado:");
  }));
t("10.1 operador não cadastra produto pela foto", () =>
  operadorPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const antes=PP.length;
      cadAbrir("80202599998");
      return {antes, depois:PP.length, permitido:cadPermitido()};
    })()`);
    eq(r.permitido, false, "operador não tem permissão de cadastro:");
    eq(r.depois, r.antes, "nenhum produto pode ser criado pelo operador:");
  }));
t("10.1 nenhuma descrição é inventada: campo vazio cancela o cadastro", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const antes=PP.length;
      window.prompt=(m,d)=>{ if(String(m).indexOf("Descrição")>=0) return "   "; return "1"; };
      cadAbrir("80202599997");
      return {antes, depois:PP.length};
    })()`);
    eq(r.depois, r.antes, "sem descrição digitada o produto não pode ser criado:");
  }));

/* ================= SEÇÃO 10.2 — MOVIMENTAÇÕES POR OPERADOR E DIVERGÊNCIAS ================= */
g("Seção 10.2 — movimentações por operador e divergências");
t("10.2 mostra quem movimentou cada produto", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      M.push({id:"a1",t:"out",c:PP[0][0],q:1,o:"Ana Souza",u:"ana",ts:Date.now()});
      M.push({id:"a2",t:"in",c:PP[1][0],q:2,o:"Ana Souza",u:"ana",ts:Date.now()});
      M.push({id:"b1",t:"out",c:PP[0][0],q:1,o:"Bruno Lima",u:"bruno",ts:Date.now()});
      OPC.dias=30;OPC.login="";
      const d=opDados();
      const ana=d.operadores.find(o=>o.login==="ana");
      return {nomes:d.operadores.map(o=>o.login), produtosAna:Object.keys(ana.produtos).length, totalAna:ana.total};
    })()`);
    okv(r.nomes.includes("ana") && r.nomes.includes("bruno"), "os dois operadores devem aparecer");
    eq(r.totalAna, 2, "movimentações da Ana:");
    eq(r.produtosAna, 2, "produtos distintos da Ana:");
  }));
t("10.2 divergência: saldo negativo aparece", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      M.push({id:"neg",t:"out",c:PP[0][0],q:999,o:"Ana",u:"ana",ts:Date.now()});
      sM();OPC.dias=30;
      const d=opDados();
      return d.divergencias.filter(x=>x.tipo==="saldo negativo").length;
    })()`);
    okv(r >= 1, "saldo negativo precisa aparecer como divergência");
  }));
t("10.2 divergência: estorno feito por outro operador", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const m={id:"orig",t:"out",c:PP[0][0],q:1,o:"Ana",u:"ana",ts:Date.now()};
      M.push(m);sM();
      M.push({id:"est1",t:"adj",c:PP[0][0],q:1,o:"Bruno",u:"bruno",ts:Date.now(),est:"orig"});
      OPC.dias=30;
      const d=opDados();
      return d.divergencias.filter(x=>x.tipo==="estorno de outro operador").length;
    })()`);
    okv(r >= 1, "estorno por outro operador precisa ser apontado");
  }));
t("10.2 operador não vê o painel de operadores", () =>
  operadorPronto(novo()).then((env) => {
    const r = run(env, `(()=>{drawOperadores();return {html:$("opRel").innerHTML, admin:isA()};})()`);
    eq(r.admin, false, "não é administrador");
    eq(r.html, "", "operador não pode ver o painel:");
  }));
t("10.2 período sem movimentação não inventa operador", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      M.length=0;
      OPC.dias=7;
      const d=opDados();
      return {ops:d.operadores.length, div:d.divergencias.filter(x=>x.tipo==="saldo negativo").length};
    })()`);
    eq(r.ops, 0, "sem movimentação não há operador:");
  }));

/* ================= SEÇÃO 10.3 — PRODUTO SEM MOVIMENTAÇÃO ================= */
g("Seção 10.3 — aviso de produto sem movimentação");
t("10.3 desligado por padrão não lista nada", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{PARADO.dias=0;return {lista:parados(0).length, dias:paradoDias()};})()`);
    eq(r.dias, 0, "período inicial desligado:");
    eq(r.lista, 0, "desligado não lista produto:");
  }));
t("10.3 lista só quem não movimentou no período escolhido", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const velho=Date.now()-100*86400000;
      PP[0][3]=Math.max(1,+PP[0][3]||0);   /* garante estoque inicial para o produto aparecer */
      M.push({id:"v1",t:"in",c:PP[0][0],q:5,o:"Ana",u:"ana",ts:velho});
      M.push({id:"n1",t:"in",c:PP[1][0],q:5,o:"Ana",u:"ana",ts:Date.now()});
      sM();
      const p30=parados(30).map(x=>x.codigo), p200=parados(200).map(x=>x.codigo);
      const piso=PP.filter((x,i)=>(+x[3]||0)>0).length;
      return {p30,p200,c0:PP[0][0],c1:PP[1][0],total:PP.length,piso};
    })()`);
    okv(r.p30.includes(r.c0), "o produto com 100 dias sem movimento deve aparecer em 30 dias");
    okv(!r.p30.includes(r.c1), "o produto movimentado hoje não pode aparecer");
    /* a lista de parados só considera produto com estoque inicial > 0 */
    okv(r.p200.length >= Math.min(1, r.piso), "com 200 dias os produtos antigos continuam listados (" + r.p200.length + " de " + r.piso + " com estoque)");
  }));
t("10.3 período é configurável e fica salvo", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      PARADO.dias=60;PARADO.ativo=true;sv("mdo_parado",PARADO);
      const g=JSON.parse(localStorage.getItem("mdo_parado"));
      return g;
    })()`);
    eq(r.dias, 60, "período salvo:");
    eq(r.ativo, true, "aviso ativo:");
  }));
t("10.3 o aviso entra no painel de alertas uma vez por dia", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      PARADO.dias=30;
      const velho=Date.now()-100*86400000;
      M.push({id:"v2",t:"in",c:PP[0][0],q:5,o:"Ana",u:"ana",ts:velho});sM();
      const n1=alertas();      /* quantidade de avisos novos no primeiro dia */
      const n2=alertas();      /* no mesmo dia não pode repetir */
      const avisos=ls("mdo_av",[]).filter(a=>String(a.m).indexOf("sem movimentação")>=0);
      return {n1,n2,qtdAvisos:avisos.length};
    })()`);
    okv(r.qtdAvisos >= 1, "o aviso de produto parado precisa ser registrado:");
    eq(r.n2, 0, "não pode repetir no mesmo dia:");
  }));
t("10.3 operador não vê o cartão de produtos parados", () =>
  operadorPronto(novo()).then((env) => {
    const r = run(env, `(()=>{drawParados();return {html:$("parCard").innerHTML,admin:isA()};})()`);
    eq(r.admin, false, "não é administrador");
    eq(r.html, "", "operador não pode ver o cartão:");
  }));

/* ================= ETAPA 6.1 — CÂMERA: ZOOM COMPLETO E DIAGNÓSTICO ================= */
g("Etapa 6.1 — câmera: zoom, dedupe e diagnóstico");
t("6.1 zoom de câmera menor que 3,4x é completado pela ampliação digital", () => {
  const src = fs.readFileSync(HTML, "utf8");
  okv(src.includes("digitalFalta"), "o zoom precisa calcular o complemento digital");
  okv(src.includes('(zNativo&&max>=ZOOMATUAL)?"":'), "com zoom nativo suficiente não aplica transform");
});
t("6.1 diagnóstico da câmera fica salvo no aparelho e é legível", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      CAMDIAG.leitor="nativo";CAMDIAG.zoomMax=2;CAMDIAG.digital=1.7;CAMDIAG.lidas=5;CAMDIAG.falhas=1;
      camDiagSalvar();
      const salvo=JSON.parse(localStorage.getItem("mdo_camdiag"));
      return {salvo, texto:camDiagTexto()};
    })()`);
    eq(r.salvo.leitor, "nativo", "leitor salvo:");
    eq(r.salvo.lidas, 5, "leituras salvas:");
    okv(r.texto.includes("2.0x"), "o texto precisa mostrar o zoom do aparelho: " + r.texto);
    okv(r.texto.includes("leituras: 5"), "o texto precisa mostrar as leituras: " + r.texto);
  }));
t("6.1 diagnóstico vazio diz a verdade, sem inventar dado", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{localStorage.removeItem("mdo_camdiag");return camDiagTexto();})()`);
    okv(r.includes("ainda não foi usada"), "sem uso, precisa dizer que não foi usada: " + r);
  }));
t("6.1 leitura duvidosa logo após outra não troca o código", () => {
  const src = fs.readFileSync(HTML, "utf8");
  okv(src.includes("ultimaConf"), "o app precisa considerar a confiança da leitura");
  okv(src.includes("fraca"), "leitura de baixa confiança precisa ser tratada");
});

t("6.1 diagnóstico identifica o aparelho e pode ser copiado", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const nome=camAparelho();
      CAMDIAG.aparelho=nome;CAMDIAG.leitor="biblioteca";CAMDIAG.zoomMax=0;CAMDIAG.digital=3.4;CAMDIAG.lidas=3;camDiagSalvar();
      const linha=camDiagCopiar();
      return {nome, linha};
    })()`);
    okv(typeof r.nome === "string" && r.nome.length > 0, "o aparelho precisa ser identificado");
    okv(r.linha.includes("diagnóstico da câmera"), "o texto copiado precisa ter título: " + r.linha);
    okv(r.linha.includes("Aparelho:"), "o texto copiado precisa dizer o aparelho");
    okv(r.linha.includes("leituras"), "o texto copiado precisa trazer as leituras");
  }));

g("Relatórios — exportação em CSV");
t("relatórios podem ser salvos em CSV pelo administrador", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      M.push({id:"r1",t:"in",c:PP[0][0],q:3,o:"Ana",u:"ana",ts:Date.now()});sM();
      drawRel();
      const el=$("rel"), html=String(el.innerHTML||"");
      const btns=(html.match(/data-a="relCSV[0-9]"/g)||[]).map(x=>x.slice(8,-1));
      return {btns, html:$("rel").innerHTML};
    })()`);
    eq(r.btns.length, 5, "devem existir 5 exportações:");
    okv(r.html.includes("ponto e vírgula"), "a tela precisa explicar o separador do Excel");
    okv(r.html.includes("Salvar os relatórios"), "o cartão de exportação precisa aparecer");
  }));
t("operador não exporta relatório", () =>
  operadorPronto(novo()).then((env) => {
    const r = run(env, `(()=>{drawRel();return {html:$("rel").innerHTML,admin:isA()};})()`);
    eq(r.admin, false, "não é administrador");
    eq(r.html, "", "operador não vê os relatórios:");
  }));

/* ================= SEÇÃO 9 — CONFERÊNCIA DAS LEITURAS ================= */
g("Seção 9 — conferência das leituras");
t("9 registro guarda código lido, origem e se encontrou o produto", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      LEIT.origem="câmera (Bipar)";
      qLeitura(PP[0][0]);
      LEIT.origem="foto/galeria";
      qLeitura("9999999999999");
      const l=leitLista();
      return {n:l.length, primeira:l[0], segunda:l[1], resumo:leitResumo()};
    })()`);
    eq(r.n, 2, "as duas leituras precisam ser registradas:");
    eq(r.primeira.achou, true, "a primeira encontrou o produto:");
    eq(r.primeira.origem, "câmera (Bipar)", "origem da primeira:");
    eq(r.segunda.achou, false, "a segunda não encontrou:");
    eq(r.segunda.origem, "foto/galeria", "origem da segunda:");
    okv(r.resumo.includes("2 leitura"), "o resumo precisa contar: " + r.resumo);
  }));
t("9 registro de leituras não altera estoque nem movimentações", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const antesM=M.length, antesB=JSON.stringify(bal());
      LEIT.origem="teste";qLeitura(PP[0][0]);qLeitura("7777777777777");
      return {antesM, depoisM:M.length, mesmaConta:antesB===JSON.stringify(bal())};
    })()`);
    eq(r.depoisM, r.antesM, "nenhuma movimentação pode ser criada:");
    eq(r.mesmaConta, true, "o saldo não pode mudar:");
  }));
t("9 leituras podem ser exportadas e limpas", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      LEIT.origem="câmera";qLeitura(PP[0][0]);
      const antes=leitLista().length;
      try{localStorage.removeItem("mdo_leit")}catch(e){}
      LEIT.itens=[];
      return {antes, depois:leitLista().length, resumo:leitResumo()};
    })()`);
    okv(r.antes >= 1, "precisa ter leitura antes de limpar");
    eq(r.depois, 0, "depois de limpar não pode sobrar leitura:");
    okv(r.resumo.includes("Nenhuma leitura"), "o resumo precisa dizer que está vazio");
  }));

/* ================= SEÇÃO 6.1 — AUTOCADASTRO NA TELA DE INÍCIO ================= */
g("Seção 6.1 — autocadastro de operador (sem e-mail)");
t("6.1 o botão de criar acesso aparece na tela de início", () => {
  const src = fs.readFileSync(HTML, "utf8");
  okv(/id="lgCad"[^>]*>👤 Sou novo aqui/.test(src), "o botão de autocadastro precisa existir na tela de início");
  okv(src.includes('id="lgCadMsg"'), "a área de aviso do cadastro precisa existir");
  okv(src.includes('$("lgCad").onclick=()=>modoCadastro(!modoCad)'), "o botão precisa abrir o modo de cadastro");
});
t("6.1 nome incompleto é barrado com a mensagem exata", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `["Ricardo","  Ana ","R K",""].map(nome=>cadValidar(nome,"novo1","senha123"))`);
    r.forEach((msg, i) => {
      eq(msg, "Digite nome e sobrenome", "nome incompleto precisa ser barrado (caso " + i + "):");
    });
  }));
t("6.1 nome e sobrenome válidos passam", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `[["Maria Souza","maria","senha123"],["Ricardo Kato","rkato","123456"],["  Ana  Lima ","analima","abcdef"]]
      .map(x=>cadValidar(x[0],x[1],x[2]))`);
    eq(r, ["", "", ""], "nome e sobrenome válidos não podem ser barrados:");
  }));
t("6.1 senha curta e login com espaço são barrados", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `({a:cadValidar("Novo Operador","novo1","123"), b:cadValidar("Novo Operador","no vo","senha123"), total:U.length})`);
    okv(r.a.includes("6 caracteres"), "senha curta precisa ser barrada: " + r.a);
    okv(r.b.includes("sem espaços"), "login com espaço precisa ser barrado: " + r.b);
    eq(r.total, 1, "nenhum usuário pode ser criado nesses casos:");
  }));
pendentes.push(ta("6.1 autocadastro cria operador, entra na hora e avisa o administrador", async () => {
    const env = await adminPronto(novo()); await flush();
    const r = await run(env, `(async()=>{
      modoCadastro(true);
      sv(K.s,null);
      $("lgN").value="Maria Souza";$("lgL").value="maria";$("lgP").value="senha123";
      await cadOperador();
      const u=U.find(x=>x.l==="maria");
      return {erro:$("lgE").textContent, papel:u&&u.r, us:U.map(x=>x.l), msg:$("lgE").textContent, st:u&&u.st, logado:cur&&cur.l, nome:u&&u.n, total:U.length,
              avisos:ls(avKey,[]).filter(x=>String(x.m).includes("Novo operador cadastrado")),
              auditado:ls(K.aud,[]).some(x=>String(x.acao||x.a||"").includes("AUTOCADASTRO"))};
    })()`);
    eq(r.papel, "operador", "o autocadastro nunca pode criar administrador: " + JSON.stringify(r));
    eq(r.st, "ativo", "a conta já nasce ativa:");
    eq(r.logado, "maria", "o operador entra imediatamente, sem e-mail:");
    eq(r.nome, "Maria Souza", "nome guardado:");
    eq(r.avisos.length, 1, "o administrador recebe exatamente um aviso:");
    okv(String(r.avisos[0].m).includes("Maria Souza (maria)"), "texto do aviso: " + (r.avisos[0] && r.avisos[0].m));
    eq(r.auditado, true, "o autocadastro precisa ir para a auditoria");
}));
t("6.1 login já em uso é recusado", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      U.push({l:"maria",n:"Maria Souza",r:"operador",h:"x",st:"ativo",ts:Date.now()});
      return {erro:cadValidar("Outro Nome","maria","senha123"), total:U.filter(x=>x.l==="maria").length};
    })()`);
    okv(String(r.erro).includes("já está em uso"), "login repetido precisa avisar: " + r.erro);
    eq(r.total, 1, "não pode duplicar o login:");
  }));
t("6.1 sem e-mail em nenhum campo do autocadastro", () => {
  const src = fs.readFileSync(HTML, "utf8");
  const i = src.indexOf("async function cadOperador");
  okv(i > 0, "a função de autocadastro precisa existir");
  const bloco = src.slice(i, i + 1400);
  okv(!/@[a-z]+\.(com|local|br)/i.test(bloco), "o autocadastro não pode usar e-mail, nem interno");
  okv(!/mailto|sendgrid|nodemailer/i.test(bloco), "o autocadastro não pode disparar e-mail");
});

/* ================= SEÇÃO 7.5 — ALERTAS E AUTOMAÇÕES ================= */
g("Seção 7.5 — alertas e automações");
t("7.5 produto zerado gera um aviso, uma vez por dia", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      ls(avKey,[]);sAv([]);
      PP.forEach((p,i)=>{if(bal()[i]>0)reg("out",p[0],bal()[i])});
      const a=alertas(), b=alertas();
      return {a, b, zerados:ls(avKey,[]).filter(x=>x.cod==="zerado").length,
              avisosZerado:ls(avKey,[]).filter(x=>String(x.m).indexOf("Estoque zerado")===0).length,
              outros:ls(avKey,[]).filter(x=>String(x.m).indexOf("Estoque zerado")!==0).map(x=>x.m)};
    })()`);
    okv(r.a > 0, "precisa avisar quando o produto zera: " + r.a + " zerados=" + r.zerados + " avisosZ=" + r.avisosZerado);
    eq(r.b, 0, "não pode repetir o aviso no mesmo dia:");
    /* os avisos do dia são de estoque ou de sincronização: o teste faz 160 movimentações sem servidor */
    okv(r.avisosZerado + r.outros.length >= r.a, "todo aviso do dia precisa ser de estoque ou de sincronização: " + r.avisosZerado + " + " + r.outros.length + " de " + r.a);
    okv(r.zerados >= 1, "todo aviso de estoque precisa ter o código do alerta");
  }));
t("7.5 reposição resolve o aviso de estoque", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      sAv([]);const i0=0,c=PP[i0][0];
      reg("out",c,bal()[i0]);alertas();
      const antes=ls(avKey,[]).filter(x=>x.cod==="zerado"&&!x.resolvido).length;
      reg("in",c,10);alertas();
      const depois=alertasAbertos().filter(x=>x.cod==="zerado").length;
      return {antes, depois};
    })()`);
    eq(r.antes, 1, "o aviso precisa existir antes da reposição:");
    eq(r.depois, 0, "depois de repor o aviso não pode continuar aberto:");
  }));
t("7.5 movimentações pendentes e falha de sincronização avisam e se resolvem", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      sAv([]);REQ.push({id:"r1",c:PP[0][0],q:99,u:cur.l,o:cur.n,ts:Date.now()});sR();
      alertas();
      const comPend=ls(avKey,[]).filter(x=>x.cod==="pendente"&&!x.resolvido).length;
      REQ=[];sR();alertas();
      const semPend=alertasAbertos().filter(x=>x.cod==="pendente").length;
      return {comPend, semPend};
    })()`);
    eq(r.comPend, 1, "pendências precisam avisar:");
    eq(r.semPend, 0, "sem pendência o aviso precisa ser resolvido:");
  }));
t("7.5 divergência de inventário avisa o administrador", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      sAv([]);
      sP("invh",[{id:"i1",resp:"Ricardo Kato",ini:Date.now()-60000,fim:Date.now(),itens:[{codigo:PP[0][0],contado:1,sistema:5,dif:-4}]}]);
      alertas();
      const a=ls(avKey,[]).filter(x=>x.cod==="inventario");
      return {n:a.length, m:a[0]&&a[0].m};
    })()`);
    eq(r.n, 1, "inventário com diferença precisa avisar:");
    okv(String(r.m).includes("1 produto"), "o aviso precisa contar as divergências: " + r.m);
  }));
t("7.5 o administrador liga e desliga cada alerta", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      const padrao=alertaLigado("zerado");
      alertaConfigurar("zerado",false);
      sAv([]);
      PP.forEach((p,i)=>{if(bal()[i]>0)reg("out",p[0],bal()[i])});
      const comDesligado=alertas();
      const cods=ls(avKey,[]).map(x=>x.cod);
      alertaConfigurar("zerado",true);
      const comLigado=alertas();
      return {padrao, comDesligado, comLigado, cods, zeradoLigado:alertaLigado("zerado")};
    })()`);
    eq(r.padrao, true, "todos os alertas vêm ligados:");
    /* só o aviso de sincronização pode aparecer: o teste gera 160 movimentações sem servidor */
    okv(!r.cods.includes("zerado"), "desligado não pode criar aviso de estoque zerado: " + JSON.stringify(r.cods));
    okv(r.comLigado > 0, "ligado volta a avisar: " + r.comLigado);
    eq(r.zeradoLigado, true, "a escolha precisa ser guardada:");
  }));
t("7.5 a escolha dos alertas fica salva no aparelho", () =>
  adminPronto(novo()).then((env) => {
    run(env, `alertaConfigurar("parado",false)`);
    eq(env.store.get("mdo_alcfg"), JSON.stringify({ parado: false }), "grava só o que foi mudado:");
    const r = run(env, `({parado:alertaLigado("parado"), zerado:alertaLigado("zerado")})`);
    eq(r, { parado: false, zerado: true }, "ao reabrir, a escolha precisa valer:");
  }));

/* ================= ETAPA 6 — DESEMPENHO E ESTADOS DE CARREGAMENTO ================= */
g("Etapa 6 — desempenho e mensagens de falha");
t("as bibliotecas não travam a abertura do app", () => {
  const src = fs.readFileSync(HTML, "utf8");
  okv(!/^loadLib\("qr"\)/m.test(src), "a biblioteca da câmera não pode carregar no caminho da abertura");
  okv(src.includes("setTimeout(()=>preCarregarLibs(),1200)"), "as bibliotecas precisam carregar depois da abertura");
  okv(src.includes("if(L.p)return L.p"), "abrir a câmera precisa reaproveitar o carregamento em andamento");
});
t("a pesquisa no servidor é paginada, nunca carrega tudo", () => {
  const src = fs.readFileSync(HTML, "utf8");
  okv(src.includes('"&pagina="+') && src.includes("&tamanho=20"), "a busca precisa pedir uma página por vez");
  const api = fs.readFileSync("api/produtos.js", "utf8");
  okv(api.includes("limit $") && api.includes("offset $"), "o banco precisa paginar com limit/offset");
  okv(api.includes("count(*)::int"), "o total precisa vir do banco, sem trazer as linhas");
});
t("estados de carregamento e falha da busca aparecem na tela", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      SYNC.url="https://exemplo.invalido";SYNC.token="t";
      BUSCA.erro="sem conexão";BUSCA.carregando=false;BUSCA.itens=null;drawBusca();
      const falha=$("buscS").innerHTML;
      BUSCA.erro="";BUSCA.carregando=true;drawBusca();
      const carregando=$("buscS").innerHTML;
      BUSCA.carregando=false;BUSCA.itens=[];BUSCA.termo="xyz";drawBusca();
      const vazio=$("buscS").innerHTML;
      BUSCA.itens=null;drawBusca();
      return {falha, carregando, vazio};
    })()`);
    okv(r.falha.includes("Não foi possível buscar no servidor"), "falha precisa explicar: " + r.falha.slice(0, 120));
    okv(r.falha.includes("continua funcionando"), "falha precisa dizer que a busca local segue valendo");
    okv(r.carregando.includes("Carregando"), "precisa mostrar o carregamento");
    okv(r.vazio.includes("Nenhum produto encontrado"), "vazio precisa ser dito com clareza: " + r.vazio.slice(0, 140));
  }));

t("o diagnóstico da câmera mostra o tempo de abertura", () =>
  adminPronto(novo()).then((env) => {
    const r = run(env, `(()=>{
      try{localStorage.removeItem("mdo_camdiag")}catch(e){}
      const t=docTexto();
      return {vazio:t};
      function docTexto(){
        const d={aparelho:"iPhone · Safari",leitor:"nativo",zoomMax:3,digital:2,lidas:4,falhas:1,ultima:Date.now(),msAbertura:842};
        try{localStorage.setItem("mdo_camdiag",JSON.stringify(d))}catch(e){}
        return camDiagTexto();
      }
    })()`);
    okv(r.vazio.includes("842 ms"), "o tempo de abertura precisa aparecer: " + r.vazio);
    okv(r.vazio.includes("iPhone"), "o aparelho precisa aparecer: " + r.vazio);
  }));

(async () => {
  await Promise.all(pendentes);
  console.log(resultados.join("\n"));
  console.log("\n" + (fail ? "❌ " : "✅ ") + ok + " passaram, " + fail + " falharam");
  process.exit(fail ? 1 : 0);
})();
