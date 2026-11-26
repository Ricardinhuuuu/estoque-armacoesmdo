/*
 * Sincronização de movimentações — POST /api/movimentos
 *
 * Recebe um lote do aplicativo e devolve o que foi aceito, recusado ou já registrado.
 * Só responde "ok" depois de a gravação ter sido confirmada; o app usa essa resposta
 * para tirar a operação da fila de pendentes.
 *
 * Variáveis de ambiente (Vercel › Project › Settings › Environment Variables):
 *   POSTGRES_URL   string de conexão do Postgres (criada pela integração Supabase;
 *                  DATABASE_URL funciona como alternativa)
 *   SYNC_TOKEN     segredo compartilhado com o aplicativo
 *
 * Sem essas variáveis a API responde 503 e o app continua funcionando no modo local:
 * nada é mostrado como sincronizado sem confirmação real do servidor.
 */

const { Pool } = require("pg");
const { aplicarLote } = require("./_lib/movimentos.js");
const { notificarSincronizacao } = require("./_lib/firestore-sync");

async function sql(cliente, texto, params) {
  return cliente.query(texto, params);
}

let pool = null;

async function conectar() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) return null;
  try {
    if (!pool) {
      pool = new Pool({
        /* tira o "?sslmode=..." da URL para valer a configuração de ssl abaixo */
        connectionString: url.replace(/\?.*$/, ""),
        ssl: { rejectUnauthorized: false },
        max: 3,
      });
    }
    return pool;
  } catch (e) {
    return null;
  }
}

async function garantirTabelas(db) {
  await sql(db, `create table if not exists mdo_movimentos (
    id text primary key,
    tipo text not null,
    codigo text not null,
    qtd integer not null,
    operador text not null,
    nome_operador text,
    ts bigint not null,
    recebido_em bigint not null,
    aparelho text,
    estorno_de text,
    obs text
  )`);
  await sql(db, `create index if not exists mdo_mov_codigo on mdo_movimentos (codigo)`);
  await sql(db, `create table if not exists mdo_produtos (
    codigo text primary key,
    descricao text,
    cor text,
    inicial integer not null default 0
  )`);
  /* Supabase: impede o acesso a essas tabelas pela chave pública (anon) */
  await sql(db, "alter table mdo_movimentos enable row level security");
  await sql(db, "alter table mdo_produtos enable row level security");
}

/* ETAPA 3 — o aparelho manda o catálogo junto com o lote.
   Sem isso o servidor recusava toda baixa com "produto não cadastrado": o operador não tem
   como cadastrar produto, então a primeira bipagem dele nunca chegava ao banco.
   Aqui os produtos novos são gravados ANTES da validação dos movimentos.
   Produto que já existe NÃO é sobrescrito: o servidor nunca desfaz um cadastro por causa de um
   aparelho antigo. O saldo inicial só é usado no cadastro novo.                            */
async function cadastrarProdutosDoLote(db, produtos, historico) {
  if (!Array.isArray(produtos) || !produtos.length) return 0;
  const hist = historico && typeof historico === "object" ? historico : {};
  let novos = 0;
  for (const p of produtos.slice(0, 2000)) {
    if (!p) continue;
    const codigo = String(p.codigo || p.c || "").trim();
    if (!codigo) continue;
    const descricao = String(p.descricao || p.nome || codigo).slice(0, 300);
    const cor = String(p.cor || "").slice(0, 80);
    /* ETAPA 3 — contagem dupla: o "inicial" que o aparelho manda é o saldo ATUAL dele, que já é
       o inicial menos os movimentos que ele tem. O servidor recalcula o saldo pelo histórico
       (inicial + movimentos), então esse número só pode ser gravado UMA vez, no cadastro NOVO —
       o que o "on conflict do nothing" abaixo garante. Produto que já existe mantém o inicial do
       servidor e recebe apenas os movimentos que faltavam. O histórico vai no JSON para o
       diagnóstico e não entra na conta.                                                    */
    const inicial = Number(p.inicial) || 0;
    try {
      const r = await sql(
        db,
        "insert into mdo_produtos (codigo, descricao, cor, inicial) values ($1,$2,$3,$4) on conflict (codigo) do nothing returning codigo",
        [codigo, descricao, cor, Math.trunc(inicial)]
      );
      if ((r.rows || []).length) novos++;
    } catch (e) {
      /* um produto com problema não pode derrubar o lote inteiro */
    }
  }
  return novos;
}

async function carregarProdutos(db) {
  const r = await sql(db, "select codigo, descricao, cor, inicial from mdo_produtos");
  return (r.rows || []).map((p) => ({ codigo: p.codigo, descricao: p.descricao, cor: p.cor, inicial: Number(p.inicial) || 0 }));
}

async function carregarMovimentos(db) {
  const r = await sql(db, "select id, tipo, codigo, qtd, operador, nome_operador, ts, recebido_em, aparelho, estorno_de, obs from mdo_movimentos order by ts asc");
  return (r.rows || []).map((m) => ({
    id: m.id, t: m.tipo, c: m.codigo, q: Number(m.qtd),
    u: m.operador, o: m.nome_operador, ts: Number(m.ts), recebidoEm: Number(m.recebido_em),
    aparelho: m.aparelho, est: m.estorno_de || undefined, obs: m.obs || undefined,
  }));
}

async function gravarAceitos(db, aceitos) {
  for (const m of aceitos) {
    await sql(db,
      `insert into mdo_movimentos (id, tipo, codigo, qtd, operador, nome_operador, ts, recebido_em, aparelho, estorno_de, obs)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (id) do nothing`,
      [m.id, m.t, m.c, m.q, m.u, m.o, m.ts, m.recebidoEm, m.aparelho, m.est || null, m.obs || null]);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, erro: "use POST" });
    return;
  }

  const segredo = process.env.SYNC_TOKEN;
  const enviado = (req.headers && (req.headers["x-mdo-token"] || req.headers.authorization || "")).replace(/^Bearer\s+/i, "");
  if (!segredo) {
    res.status(503).json({ ok: false, erro: "servidor sem SYNC_TOKEN configurado", modo: "local" });
    return;
  }
  if (enviado !== segredo) {
    res.status(401).json({ ok: false, erro: "credencial inválida" });
    return;
  }

  let corpo = req.body;
  if (typeof corpo === "string") {
    try { corpo = JSON.parse(corpo); } catch (e) { corpo = null; }
  }
  if (!corpo || !Array.isArray(corpo.movimentos)) {
    res.status(400).json({ ok: false, erro: "envie { movimentos: [...] }" });
    return;
  }

  const db = await conectar();
  if (!db) {
    res.status(503).json({ ok: false, erro: "banco não configurado (POSTGRES_URL)", modo: "local" });
    return;
  }

  try {
    await garantirTabelas(db);
    /* ETAPA 3 — grava o catálogo que veio no lote antes de validar os movimentos */
    const produtosNovos = await cadastrarProdutosDoLote(db, corpo.produtos, corpo.historico);
    const produtos = await carregarProdutos(db);
    const existentes = await carregarMovimentos(db);

    const resultado = aplicarLote(produtos, existentes, corpo.movimentos, {
      forcar: !!corpo.forcar,
      agora: Date.now(),
    });

    await gravarAceitos(db, resultado.aceitos);

    if (resultado.aceitos.length > 0 || produtosNovos > 0) {
      await notificarSincronizacao("movimentos", {
        aceitos: resultado.aceitos.length,
        produtosNovos,
      });
    }

    res.status(200).json({
      ok: true,
      confirmados: resultado.aceitos.map((m) => m.id),
      repetidos: resultado.repetidos,
      recusados: resultado.recusados,
      saldos: Object.fromEntries(resultado.saldos),
      produtosNovos,
      servidorEm: Date.now(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, erro: "falha ao gravar: " + (e && e.message ? e.message : String(e)) });
  }
};
