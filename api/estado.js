/*
 * Leitura de estado — GET /api/estado?desde=<timestamp>
 *
 * Devolve os produtos e as movimentações confirmadas no servidor, para um aparelho
 * receber o que outro aparelho registrou. Só leitura: nunca altera nada.
 *
 * Variáveis de ambiente: DATABASE_URL e SYNC_TOKEN (as mesmas de /api/movimentos).
 */

async function conectar() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return require("@neondatabase/serverless")(url);
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.status(405).json({ ok: false, erro: "use GET" });
    return;
  }

  const segredo = process.env.SYNC_TOKEN;
  const enviado = (req.headers && (req.headers["x-mdo-token"] || req.headers.authorization || "")).replace(/^Bearer\s+/i, "");
  if (!segredo) { res.status(503).json({ ok: false, erro: "servidor sem SYNC_TOKEN configurado", modo: "local" }); return; }
  if (enviado !== segredo) { res.status(401).json({ ok: false, erro: "credencial inválida" }); return; }

  const db = await conectar();
  if (!db) { res.status(503).json({ ok: false, erro: "banco não configurado (DATABASE_URL)", modo: "local" }); return; }

  const desde = Number((req.query && req.query.desde) || 0) || 0;

  try {
    await db.query(`create table if not exists mdo_movimentos (
      id text primary key, tipo text not null, codigo text not null, qtd integer not null,
      operador text not null, nome_operador text, ts bigint not null, recebido_em bigint not null,
      aparelho text, estorno_de text, obs text)`);
    await db.query(`create table if not exists mdo_produtos (
      codigo text primary key, descricao text, cor text, inicial integer not null default 0)`);

    const produtos = (await db.query("select codigo, descricao, cor, inicial from mdo_produtos")).rows || [];
    const movs = (await db.query(
      "select id, tipo, codigo, qtd, operador, nome_operador, ts, recebido_em, aparelho, estorno_de, obs from mdo_movimentos where recebido_em >= $1 order by ts asc",
      [desde])).rows || [];

    res.status(200).json({
      ok: true,
      produtos: produtos.map((p) => ({ codigo: p.codigo, descricao: p.descricao, cor: p.cor, inicial: Number(p.inicial) || 0 })),
      movimentos: movs.map((m) => ({
        id: m.id, t: m.tipo, c: m.codigo, q: Number(m.qtd), u: m.operador, o: m.nome_operador,
        ts: Number(m.ts), recebidoEm: Number(m.recebido_em), aparelho: m.aparelho,
        est: m.estorno_de || undefined, obs: m.obs || undefined,
      })),
      servidorEm: Date.now(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, erro: "falha ao ler: " + (e && e.message ? e.message : String(e)) });
  }
};
