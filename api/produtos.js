/*
 * Produtos — GET /api/produtos?q=&pagina=1&tamanho=20
 *
 * Busca eficiente no banco, com filtro e paginação: o aplicativo nunca precisa
 * carregar o catálogo inteiro para procurar uma peça.
 *
 * Variáveis de ambiente: DATABASE_URL e SYNC_TOKEN (as mesmas das outras rotas).
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

  if (req.method !== "GET") { res.status(405).json({ ok: false, erro: "use GET" }); return; }

  const segredo = process.env.SYNC_TOKEN;
  const enviado = (req.headers && (req.headers["x-mdo-token"] || req.headers.authorization || "")).replace(/^Bearer\s+/i, "");
  if (!segredo) { res.status(503).json({ ok: false, erro: "servidor sem SYNC_TOKEN configurado", modo: "local" }); return; }
  if (enviado !== segredo) { res.status(401).json({ ok: false, erro: "credencial inválida" }); return; }

  const db = await conectar();
  if (!db) { res.status(503).json({ ok: false, erro: "banco não configurado (DATABASE_URL)", modo: "local" }); return; }

  const q = String((req.query && req.query.q) || "").trim();
  const tamanho = Math.min(100, Math.max(1, Number((req.query && req.query.tamanho) || 20) || 20));
  const pagina = Math.max(1, Number((req.query && req.query.pagina) || 1) || 1);
  const inicio = (pagina - 1) * tamanho;

  try {
    await db.query(`create table if not exists mdo_produtos (
      codigo text primary key, descricao text, cor text, inicial integer not null default 0)`);
    await db.query(`create index if not exists mdo_prod_codigo on mdo_produtos (codigo)`);

    const filtro = q ? "where codigo ilike $1 or descricao ilike $1 or cor ilike $1" : "";
    const params = q ? [`%${q}%`] : [];

    const total = await db.query(`select count(*)::int as n from mdo_produtos ${filtro}`, params);
    const linhas = await db.query(
      `select codigo, descricao, cor, inicial from mdo_produtos ${filtro} order by descricao asc, cor asc
       limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, tamanho, inicio]);

    const n = Number((total.rows && total.rows[0] && total.rows[0].n) || 0);
    res.status(200).json({
      ok: true,
      pagina,
      tamanho,
      total: n,
      paginas: Math.max(1, Math.ceil(n / tamanho)),
      produtos: (linhas.rows || []).map((p) => ({
        codigo: p.codigo, descricao: p.descricao, cor: p.cor, inicial: Number(p.inicial) || 0,
      })),
      servidorEm: Date.now(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, erro: "falha na busca: " + (e && e.message ? e.message : String(e)) });
  }
};
