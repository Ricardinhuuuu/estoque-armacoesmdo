/*
 * Contas — POST /api/contas
 *
 * Ações (campo "acao" no corpo):
 *   entrar          { login, senha }                  → valida no servidor, conta tentativas e bloqueia
 *   trocarSenha     { login, senhaAtual, novaSenha }  → troca obrigatória da senha provisória
 *   criar           { login, nome, papel, senha }     → administrador cria operador
 *   listar          {}                                → administrador lista usuários (sem hash)
 *   desbloquear     { login }                         → administrador desbloqueia
 *   desativar       { login } / reativar { login }    → administrador
 *   senhaProvisoria { login }                         → administrador define senha provisória
 *   sair            {}                                → encerra a sessão
 *
 * Ação de administrador exige o cabeçalho X-MDO-Sessao com um token válido de administrador
 * ativo. Quem decide papel, bloqueio e senha é o servidor — nunca o aplicativo.
 *
 * Variáveis de ambiente: POSTGRES_URL (criada pela integração Supabase; DATABASE_URL como
 * alternativa) e SYNC_TOKEN (as mesmas de /api/movimentos).
 */

const { Pool } = require("pg");
const C = require("./_lib/contas.js");

const VALIDADE_SESSAO = 12 * 60 * 60 * 1000; /* 12 horas */

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
  await db.query(`create table if not exists mdo_usuarios (
    login text primary key,
    nome text not null,
    papel text not null default 'operador',
    hash text not null,
    sal text not null,
    iteracoes integer not null,
    tentativas integer not null default 0,
    status text not null default 'ativo',
    provisoria boolean not null default false,
    criado_em bigint not null,
    alterado_em bigint not null
  )`);
  await db.query(`create table if not exists mdo_sessoes (
    token_hash text primary key,
    login text not null,
    criado_em bigint not null,
    expira_em bigint not null
  )`);
  /* Supabase: impede o acesso a essas tabelas pela chave pública (anon) */
  await db.query("alter table mdo_usuarios enable row level security");
  await db.query("alter table mdo_sessoes enable row level security");
}

function daLinha(r) {
  return {
    l: r.login, n: r.nome, r: r.papel, hash: r.hash, sal: r.sal, iteracoes: Number(r.iteracoes),
    t: Number(r.tentativas) || 0, st: r.status, temp: !!r.provisoria,
    ts: Number(r.criado_em) || 0, alteradoEm: Number(r.alterado_em) || 0,
  };
}

async function buscarUsuario(db, login) {
  const r = await db.query("select * from mdo_usuarios where login = $1", [login]);
  return r.rows && r.rows[0] ? daLinha(r.rows[0]) : null;
}

async function contarUsuarios(db) {
  const r = await db.query("select count(*)::int as n from mdo_usuarios");
  return Number((r.rows && r.rows[0] && r.rows[0].n) || 0);
}

async function salvarUsuario(db, u) {
  const agora = Date.now();
  await db.query(
    `insert into mdo_usuarios (login, nome, papel, hash, sal, iteracoes, tentativas, status, provisoria, criado_em, alterado_em)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (login) do update set
       nome = excluded.nome, papel = excluded.papel, hash = excluded.hash, sal = excluded.sal,
       iteracoes = excluded.iteracoes, tentativas = excluded.tentativas, status = excluded.status,
       provisoria = excluded.provisoria, alterado_em = excluded.alterado_em`,
    [u.l, u.n, u.r, u.hash, u.sal, u.iteracoes || C.ITERACOES, Number(u.t) || 0, u.st || "ativo",
     !!u.temp, Number(u.ts) || agora, agora]);
}

/* cria a sessão e devolve o token (o banco guarda só o hash) */
async function abrirSessao(db, login) {
  const token = C.novoToken();
  const agora = Date.now();
  await db.query("insert into mdo_sessoes (token_hash, login, criado_em, expira_em) values ($1,$2,$3,$4)",
    [C.hashToken(token), login, agora, agora + VALIDADE_SESSAO]);
  return token;
}

/* devolve o usuário da sessão, ou null */
async function sessao(db, token) {
  if (!token) return null;
  const r = await db.query(
    "select s.login, s.expira_em from mdo_sessoes s where s.token_hash = $1", [C.hashToken(token)]);
  const linha = r.rows && r.rows[0];
  if (!linha) return null;
  if (Number(linha.expira_em) < Date.now()) return null;
  return buscarUsuario(db, linha.login);
}

function exigirAdmin(usuario) {
  return !!usuario && usuario.r === "admin" && usuario.st === "ativo";
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") { res.status(405).json({ ok: false, erro: "use POST" }); return; }

  const segredo = process.env.SYNC_TOKEN;
  if (!segredo) { res.status(503).json({ ok: false, erro: "servidor sem SYNC_TOKEN configurado", modo: "local" }); return; }

  let corpo = req.body;
  if (typeof corpo === "string") { try { corpo = JSON.parse(corpo); } catch (e) { corpo = null; } }
  if (!corpo || !corpo.acao) { res.status(400).json({ ok: false, erro: "informe acao" }); return; }

  const db = await conectar();
  if (!db) { res.status(503).json({ ok: false, erro: "banco não configurado (POSTGRES_URL)", modo: "local" }); return; }

  const token = (req.headers && (req.headers["x-mdo-sessao"] || "")).toString();
  const agora = Date.now();

  try {
    await garantirTabelas(db);
    const acao = String(corpo.acao);

    /* ---------- entrar ---------- */
    if (acao === "entrar") {
      const login = C.normLogin(corpo.login);
      const senha = String(corpo.senha || "");
      if (!login || !senha) { res.status(400).json({ ok: false, erro: "Preencha login e senha." }); return; }

      const total = await contarUsuarios(db);

      /* primeiro acesso: cria o administrador (só quando o banco está vazio) */
      if (total === 0 && corpo.criarAdmin) {
        const nome = String(corpo.nome || "").trim();
        if (!C.nomeOK(nome)) { res.status(400).json({ ok: false, erro: "Digite nome e sobrenome" }); return; }
        if (!C.senhaForte(senha)) { res.status(400).json({ ok: false, erro: "A senha precisa ter pelo menos 6 caracteres." }); return; }
        const h = C.criarHashSenha(senha);
        const u = { l: login, n: nome, r: "admin", hash: h.hash, sal: h.sal, iteracoes: h.iteracoes, t: 0, st: "ativo", temp: false, ts: agora };
        await salvarUsuario(db, u);
        const tk = await abrirSessao(db, login);
        res.status(200).json({ ok: true, sessao: tk, usuario: C.usuarioPublico(u), criado: true });
        return;
      }

      const u = await buscarUsuario(db, login);
      const r = C.tentarLogin(u, senha);
      if (!r.ok) {
        if (u && r.tentativas) {
          u.t = r.tentativas;
          if (r.bloquear) u.st = "bloq";
          await salvarUsuario(db, u);
        }
        res.status(401).json({ ok: false, erro: r.erro, tentativas: r.tentativas || 0, bloqueado: !!r.bloqueado || !!r.bloquear, desativado: !!r.desativado });
        return;
      }
      if (u.t) { u.t = 0; await salvarUsuario(db, u); }
      const tk = await abrirSessao(db, u.l);
      res.status(200).json({ ok: true, sessao: tk, usuario: C.usuarioPublico(u), trocaObrigatoria: !!u.temp });
      return;
    }

    /* ---------- cadastrar (autocadastro na tela de início, sem e-mail) ---------- */
    if (acao === "cadastrar") {
      const login = C.normLogin(corpo.login);
      const nome = String(corpo.nome || "").trim();
      const senha = String(corpo.senha || "");
      if (!C.nomeOK(nome)) { res.status(400).json({ ok: false, erro: "Digite nome e sobrenome" }); return; }
      if (!C.loginOK(login)) { res.status(400).json({ ok: false, erro: "Escolha um login sem espaços, de 3 a 40 caracteres." }); return; }
      if (!C.senhaForte(senha)) { res.status(400).json({ ok: false, erro: "A senha precisa ter pelo menos 6 caracteres." }); return; }
      if (await buscarUsuario(db, login)) { res.status(409).json({ ok: false, erro: "Este login já está em uso. Escolha outro." }); return; }
      const h = C.criarHashSenha(senha);
      /* o autocadastro cria sempre operador, nunca administrador */
      const u = { l: login, n: nome, r: "operador", hash: h.hash, sal: h.sal, iteracoes: h.iteracoes, t: 0, st: "ativo", temp: false, ts: agora };
      await salvarUsuario(db, u);
      const tk = await abrirSessao(db, login);
      res.status(200).json({ ok: true, sessao: tk, usuario: C.usuarioPublico(u), criado: true,
        aviso: "Novo operador cadastrado: " + nome + " (" + login + ")" });
      return;
    }

    /* ---------- trocarSenha (não exige sessão de admin: é a troca obrigatória) ---------- */
    if (acao === "trocarSenha") {
      const login = C.normLogin(corpo.login);
      const atual = String(corpo.senhaAtual || "");
      const nova = String(corpo.novaSenha || "");
      const u = await buscarUsuario(db, login);
      if (!u || !C.conferirSenha(atual, u)) { res.status(401).json({ ok: false, erro: "Login ou senha incorretos." }); return; }
      if (!C.senhaForte(nova)) { res.status(400).json({ ok: false, erro: "A senha precisa ter pelo menos 6 caracteres." }); return; }
      if (nova === atual) { res.status(400).json({ ok: false, erro: "A nova senha não pode ser igual à provisória." }); return; }
      const h = C.criarHashSenha(nova);
      u.hash = h.hash; u.sal = h.sal; u.iteracoes = h.iteracoes; u.temp = false; u.t = 0; u.st = "ativo";
      await salvarUsuario(db, u);
      const tk = await abrirSessao(db, u.l);
      res.status(200).json({ ok: true, sessao: tk, usuario: C.usuarioPublico(u) });
      return;
    }

    /* ---------- daqui para baixo, só administrador ---------- */
    const quem = await sessao(db, token);
    if (acao === "sair") {
      if (token) await db.query("delete from mdo_sessoes where token_hash = $1", [C.hashToken(token)]);
      res.status(200).json({ ok: true });
      return;
    }
    if (!exigirAdmin(quem)) { res.status(403).json({ ok: false, erro: "Só o administrador pode fazer isso." }); return; }

    if (acao === "listar") {
      const r = await db.query("select * from mdo_usuarios order by criado_em asc");
      res.status(200).json({ ok: true, usuarios: (r.rows || []).map(daLinha).map(C.usuarioPublico) });
      return;
    }

    if (acao === "criar") {
      const login = C.normLogin(corpo.login);
      const nome = String(corpo.nome || "").trim();
      const papel = corpo.papel === "admin" ? "admin" : "operador";
      const senha = String(corpo.senha || "");
      if (!C.nomeOK(nome)) { res.status(400).json({ ok: false, erro: "Digite nome e sobrenome" }); return; }
      if (!C.loginOK(login)) { res.status(400).json({ ok: false, erro: "Login inválido: use 3 a 40 caracteres, sem espaço." }); return; }
      if (!C.senhaForte(senha)) { res.status(400).json({ ok: false, erro: "A senha provisória precisa ter pelo menos 6 caracteres." }); return; }
      if (await buscarUsuario(db, login)) { res.status(409).json({ ok: false, erro: "Esse login já existe." }); return; }
      const h = C.criarHashSenha(senha);
      const u = { l: login, n: nome, r: papel, hash: h.hash, sal: h.sal, iteracoes: h.iteracoes, t: 0, st: "ativo", temp: true, ts: agora };
      await salvarUsuario(db, u);
      res.status(200).json({ ok: true, usuario: C.usuarioPublico(u) });
      return;
    }

    const alvo = await buscarUsuario(db, C.normLogin(corpo.login));
    if (!alvo) { res.status(404).json({ ok: false, erro: "Usuário não encontrado." }); return; }

    if (acao === "desbloquear") { alvo.st = "ativo"; alvo.t = 0; }
    else if (acao === "desativar") {
      if (alvo.l === quem.l) { res.status(400).json({ ok: false, erro: "Você não pode desativar a si mesmo." }); return; }
      alvo.st = "desat";
    }
    else if (acao === "reativar") { alvo.st = "ativo"; alvo.t = 0; }
    else if (acao === "senhaProvisoria") {
      const nova = String(corpo.senha || "") || C.sugerirSenha();
      const h = C.criarHashSenha(nova);
      alvo.hash = h.hash; alvo.sal = h.sal; alvo.iteracoes = h.iteracoes; alvo.temp = true; alvo.t = 0; alvo.st = "ativo";
      await salvarUsuario(db, alvo);
      res.status(200).json({ ok: true, usuario: C.usuarioPublico(alvo), senhaProvisoria: nova });
      return;
    }
    else { res.status(400).json({ ok: false, erro: "ação desconhecida: " + acao }); return; }

    await salvarUsuario(db, alvo);
    res.status(200).json({ ok: true, usuario: C.usuarioPublico(alvo) });
  } catch (e) {
    res.status(500).json({ ok: false, erro: "falha no servidor: " + (e && e.message ? e.message : String(e)) });
  }
};
