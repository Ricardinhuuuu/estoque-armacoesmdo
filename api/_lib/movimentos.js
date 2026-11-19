/*
 * MDO Estoque — lógica de movimentação compartilhada entre a API da Vercel e os testes.
 * Não depende de framework, banco nem rede: recebe dados, devolve decisão.
 *
 * Regra do saldo (Etapa 3.3): saldo = saldo inicial do produto + entradas − saídas (+ ajustes),
 * sempre recalculado a partir das movimentações, nunca somado por cima de um número guardado.
 */

const TIPOS = ["out", "in", "adj"];

/* soma as movimentações vivas de um produto */
function saldoDe(produto, movimentos) {
  let s = Number(produto && produto.inicial) || 0;
  for (const m of movimentos || []) {
    if (!m || m.del || m.c !== produto.codigo) continue;
    const q = Number(m.q) || 0;
    s += m.t === "out" ? -q : q;
  }
  return s;
}

/* saldo de todos os produtos de uma vez (equivale a bal() no app) */
function saldos(produtos, movimentos) {
  const out = new Map();
  for (const p of produtos) out.set(p.codigo, Number(p.inicial) || 0);
  for (const m of movimentos || []) {
    if (!m || m.del) continue;
    if (!out.has(m.c)) continue;
    const q = Number(m.q) || 0;
    out.set(m.c, out.get(m.c) + (m.t === "out" ? -q : q));
  }
  return out;
}

/* valida uma movimentação recebida do aplicativo */
function validarMovimento(m, produtos) {
  if (!m || typeof m !== "object") return { ok: false, erro: "movimento inválido" };
  const id = String(m.id || "").trim();
  if (!id) return { ok: false, erro: "id obrigatório (é o que impede operação duplicada)" };
  const c = String(m.c || "").trim();
  if (!c) return { ok: false, erro: "código do produto obrigatório" };
  if (!TIPOS.includes(m.t)) return { ok: false, erro: "tipo deve ser out, in ou adj" };
  const q = Number(m.q);
  if (!Number.isFinite(q) || q === 0) return { ok: false, erro: "quantidade inválida" };
  if (m.t === "adj" && !Number.isInteger(q)) return { ok: false, erro: "ajuste deve ser inteiro" };
  if (m.t !== "adj" && (!Number.isInteger(q) || q < 0)) return { ok: false, erro: "quantidade deve ser inteiro positivo" };
  const produto = (produtos || []).find((p) => p.codigo === c);
  if (!produto) return { ok: false, erro: "produto não cadastrado" };
  return { ok: true, produto };
}

/*
 * Aplica um lote de movimentações de forma idempotente.
 * Recebe os movimentos já existentes e devolve o que fazer com cada um.
 *
 * - movimento com id já existente .......... ignorado (é reenvio, não duplica)
 * - saldo insuficiente para baixa .......... recusado com o saldo real
 * - baixa acima do saldo com "forcar" ...... aceita e registra o motivo
 */
function aplicarLote(produtos, existentes, lote, opts = {}) {
  const porId = new Map();
  for (const m of existentes || []) porId.set(m.id, m);

  /* saldo corrente começa pelo que já está gravado */
  const saldo = saldos(produtos, existentes || []);
  const aceitos = [], recusados = [], repetidos = [];

  for (const bruto of lote || []) {
    const v = validarMovimento(bruto, produtos);
    if (!v.ok) { recusados.push({ id: bruto && bruto.id, motivo: v.erro }); continue; }

    if (porId.has(bruto.id)) { repetidos.push({ id: bruto.id, motivo: "já registrado" }); continue; }

    const atual = saldo.get(bruto.c) || 0;
    const q = Number(bruto.q);

    if (bruto.t === "out" && q > atual && !opts.forcar) {
      recusados.push({ id: bruto.id, motivo: "saldo insuficiente", saldo: atual });
      continue;
    }

    const m = {
      id: String(bruto.id),
      t: bruto.t,
      c: String(bruto.c),
      q,
      o: String(bruto.o || ""),
      u: String(bruto.u || ""),
      ts: Number(bruto.ts) || Date.now(),
      recebidoEm: opts.agora || Date.now(),
      aparelho: String(bruto.aparelho || ""),
      est: bruto.est ? String(bruto.est) : undefined,
      obs: bruto.obs ? String(bruto.obs) : undefined,
    };
    aceitos.push(m);
    porId.set(m.id, m);
    saldo.set(m.c, atual + (m.t === "out" ? -q : q));
  }

  return { aceitos, recusados, repetidos, saldos: saldo };
}

/* confere a conta do saldo: inicial + entradas − saídas (+ ajustes) = atual */
function conferirSaldo(produto, movimentos, saldoAtual) {
  const esperado = saldoDe(produto, movimentos);
  return { esperado, atual: saldoAtual, ok: esperado === saldoAtual };
}

/* fila de reenvio: mantém a ordem e nunca repete um id */
function juntarFila(fila, novos) {
  const vistos = new Set((fila || []).map((m) => m && m.id));
  const out = (fila || []).slice();
  for (const m of novos || []) {
    if (!m || !m.id || vistos.has(m.id)) continue;
    vistos.add(m.id);
    out.push(m);
  }
  return out;
}

module.exports = { TIPOS, saldoDe, saldos, validarMovimento, aplicarLote, conferirSaldo, juntarFila };
