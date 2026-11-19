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
  catch (e) { fail++; resultados.push("  ❌ " + nome + "\n       → " + (e && e.message ? e.message : e)); }
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
function comoAdmin(env) {
  env.document.getElementById("lgN").value = "Ricardo Kato";
  env.document.getElementById("lgL").value = "ricardo";
  env.document.getElementById("lgP").value = "senha123";
  run(env, "lgSubmit()");
  return run(env, "cur");
}
/* espera as promises disparadas por lgSubmit (hash assíncrono) */
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
  run(env, "lgSubmit()");
  await flush();
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
  eq(JSON.parse(bruto)[0].h.length, 64, "tamanho do hash:");
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
  run(env, `act("pw",${i})`); await flush();
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
  eq(escritas, ["mdo_m"], "chaves escritas numa bipada:");
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
  return flush().then(() => {
    okv(run(env, "!!cur"), "login de teste não concluiu");
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

(async () => {
  await Promise.all(pendentes);
  console.log(resultados.join("\n"));
  console.log("\n" + (fail ? "❌ " : "✅ ") + ok + " passaram, " + fail + " falharam");
  process.exit(fail ? 1 : 0);
})();
