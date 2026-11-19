/* Testes da importação de movimentações (Etapa 7).
   Rodar:  node tests/importacao-tests.js
   Extrai do próprio index.html as funções reais normCode, bal e o analisador/aplicador da importação. */
const fs=require("fs"),path=require("path"),assert=require("assert");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8").replace(/\r\n/g,"\n");

function fatia(ini,fim){
 const a=html.indexOf(ini),b=html.indexOf(fim,a);
 assert(a>=0&&b>a,"trecho não encontrado: "+ini);
 return html.slice(a,b);
}
const codigoNormCode=fatia("function normCode(raw){","/* ===== Movimentações com id");
const codigoBal=fatia("function bal(){","\n");
const codigoImp=fatia("/* IMP_INICIO */","/* 3) Relatório");

function ambiente(){
 const fn=new Function(`
  const PP=[["111","ARM A","PRETO",5],["222","ARM B","AZUL",0],["00333","ARM C","DEMI",10]];
  let idx={};PP.forEach((p,i)=>idx[p[0]]=i);
  let M=[],FILA=[];const cur={n:"Admin Teste",l:"admin"};
  let n=0;const uid=()=>"id"+(++n);
  const aparelhoId=()=>"ap_teste",sM=()=>{},sF=()=>{},syncStatus=()=>{},audit=()=>{};
  ${codigoNormCode}
  ${codigoBal}
  ${codigoImp}
  return{impAnalisar,impAplicar,IMP_CFG,IMP_COLS,IMP_TIPOS,M,FILA,bal,PP};
 `);
 return fn();
}
const cab=["codigo_sku","quantidade","tipo_movimentacao","observacao"];
let ok=0,falhas=0;
function teste(nome,f){try{f();ok++;console.log("✔",nome)}catch(e){falhas++;console.log("✖",nome,"\n   ",e.message)}}

teste("lê as 4 operações e calcula movimentos corretos",()=>{
 const A=ambiente();
 const r=A.impAnalisar([cab,["111",3,"ENTRADA","nf"],["111",2,"AJUSTE",""],["222",0,"CONTAGEM",""],["00333",4,"BAIXA",""]].map(l=>l.map(String)).slice(0,5));
 /* 111 aparece duas vezes => 2ª linha rejeitada */
 assert.strictEqual(r.rej.length,1);assert.match(r.rej[0].motivo,/repetido/);
 assert.strictEqual(r.ok.length,2);          /* 111 entrada e 00333 baixa; 222 contagem 0 = sem alteração */
 assert.strictEqual(r.sem.length,1);
 const e=r.ok.find(x=>x.c==="111"),b=r.ok.find(x=>x.c==="00333");
 assert.deepStrictEqual([e.t,e.q,e.de,e.para],["in",3,5,8]);
 assert.deepStrictEqual([b.t,b.q,b.de,b.para],["out",4,10,6]);
});
teste("CONTAGEM vira AJUSTE só com a diferença",()=>{
 const A=ambiente();
 const r=A.impAnalisar([cab,["111","12","CONTAGEM","prateleira"]]);
 assert.strictEqual(r.ok[0].t,"adj");assert.strictEqual(r.ok[0].q,7);assert.match(r.ok[0].obs,/saldo 5 → 12/);
});
teste("rejeita linhas inválidas com motivo claro e mantém as válidas",()=>{
 const A=ambiente();
 const r=A.impAnalisar([cab,["","1","ENTRADA",""],["999","1","ENTRADA",""],["111","1","TROCA",""],["111","1,5","ENTRADA",""],
  ["222","1.000","ENTRADA",""],["222","-3","ENTRADA",""],["222","0","AJUSTE",""],["222","-1","CONTAGEM",""],["222","abc","BAIXA",""],["222","7","ENTRADA","ok"]]);
 assert.strictEqual(r.ok.length,1);assert.strictEqual(r.rej.length,9);
 const m=r.rej.map(x=>x.motivo).join("|");
 ["codigo_sku vazio","não existe","tipo_movimentacao inválido","quantidade inválida","maior que zero","AJUSTE não pode","CONTAGEM não pode"].forEach(t=>assert(m.includes(t),t));
 assert.strictEqual(r.rej[0].linha,2);          /* número da linha como no Excel */
});
teste("linhas em branco e de exemplo são ignoradas (não são erro)",()=>{
 const A=ambiente();
 const r=A.impAnalisar([cab,["","","",""],["EXEMPLO-1","10","ENTRADA","x"],["111","1","ENTRADA",""]]);
 assert.deepStrictEqual([r.brancas,r.exemplos,r.ok.length,r.rej.length],[1,1,1,0]);
});
teste("baixa que deixa saldo negativo é rejeitada; permitirNegativo libera",()=>{
 let A=ambiente();
 let r=A.impAnalisar([cab,["111","6","BAIXA",""]]);
 assert.strictEqual(r.rej.length,1);assert.match(r.rej[0].motivo,/saldo negativo/);
 A=ambiente();A.IMP_CFG.permitirNegativo=true;
 r=A.impAnalisar([cab,["111","6","BAIXA",""]]);assert.strictEqual(r.ok.length,1);
});
teste("duplicados: 'somar' junta mesmo SKU e tipo, mas nunca CONTAGEM",()=>{
 const A=ambiente();A.IMP_CFG.duplicados="somar";
 let r=A.impAnalisar([cab,["111","2","ENTRADA","a"],["111","3","ENTRADA","b"]]);
 assert.strictEqual(r.ok.length,1);assert.strictEqual(r.ok[0].q,5);assert.deepStrictEqual(r.ok[0].linhas,[2,3]);
 r=A.impAnalisar([cab,["111","2","CONTAGEM",""],["111","3","CONTAGEM",""]]);
 assert.strictEqual(r.rej.length,1);
 r=A.impAnalisar([cab,["111","2","ENTRADA",""],["111","1","BAIXA",""]]);
 assert.strictEqual(r.rej.length,1);
});
teste("cabeçalho tolerante (acento, caixa, espaço) e erro se faltar coluna obrigatória",()=>{
 const A=ambiente();
 let r=A.impAnalisar([["Código SKU","Quantidade","Tipo Movimentação","Observação","descricao_informativo"],["111","1","entrada","","x"]]);
 assert.strictEqual(r.ok.length,1);
 r=A.impAnalisar([["codigo_sku","quantidade"],["111","1"]]);assert.match(r.erro,/tipo_movimentacao/);
 r=A.impAnalisar([]);assert.match(r.erro,/vazia/);
});
teste("SKU com zero à esquerda é encontrado",()=>{
 const A=ambiente();
 const r=A.impAnalisar([cab,["00333","1","ENTRADA",""]]);assert.strictEqual(r.ok[0].c,"00333");
});
teste("baixa do saldo exato é aceita; baixa em produto zerado é rejeitada",()=>{
 const A=ambiente();
 const r=A.impAnalisar([cab,["222","5","ENTRADA",""],["111","5","BAIXA",""]]);
 assert.strictEqual(r.ok.length,2);
 assert.strictEqual(r.ok.find(x=>x.c==="111").para,0);
 const B=ambiente();
 const r2=B.impAnalisar([cab,["222","1","BAIXA",""]]);
 assert.strictEqual(r2.ok.length,0);assert.strictEqual(r2.rej.length,1);
});
teste("aplicar grava movimentos com id único, fila e marca 'Importação Excel'",()=>{
 const A=ambiente();
 const r=A.impAnalisar([cab,["111","3","ENTRADA","nf 10"],["00333","4","BAIXA",""],["111x","1","ENTRADA",""]]);
 const n=A.impAplicar(r,"teste.xlsx");
 assert.strictEqual(n,2);assert.strictEqual(A.M.length,2);assert.strictEqual(A.FILA.length,2);
 assert.strictEqual(new Set(A.M.map(m=>m.id)).size,2);
 assert.strictEqual(new Set(A.M.map(m=>m.ts)).size,2);
 assert(A.M.every(m=>/^Importação Excel teste\.xlsx · linha/.test(m.obs)));
 assert(A.M.every(m=>m.o==="Admin Teste"&&m.u==="admin"));
 const b=A.bal();assert.strictEqual(b[0],8);assert.strictEqual(b[2],6);
});
teste("modelo e leitura usam os mesmos nomes de coluna",()=>{
 const A=ambiente();
 assert.deepStrictEqual(A.IMP_COLS,["codigo_sku","quantidade","tipo_movimentacao","observacao"]);
 const r=A.impAnalisar([A.IMP_COLS,["111","1","ENTRADA",""]]);assert.strictEqual(r.ok.length,1);
 /* o modelo 'estoque atual' (CONTAGEM = saldo atual) reimportado sem edição não muda nada */
 const b=A.bal(),linhas=[A.IMP_COLS.concat(["descricao_informativo","cor_informativo","saldo_atual_informativo"])]
  .concat(A.PP.map((p,i)=>[p[0],String(b[i]),"CONTAGEM","",p[1],p[2],String(b[i])]));
 const r2=A.impAnalisar(linhas);assert.strictEqual(r2.ok.length,0);assert.strictEqual(r2.rej.length,0);assert.strictEqual(r2.sem.length,3);
});
console.log("\n"+ok+" ok, "+falhas+" falha(s)");process.exit(falhas?1:0);
